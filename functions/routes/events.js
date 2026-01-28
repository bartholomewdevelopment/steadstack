const express = require('express');
const router = express.Router();
const { Event, InventoryItem, Site } = require('../models');
const { verifyToken, requireTenantAccess } = require('../middleware/auth');
const { checkPlanLimit, incrementUsageAfterCreate } = require('../middleware/planLimits');
const firestoreService = require('../services/firestore');
const eventPostingService = require('../services/eventPosting');

// All routes require authentication
router.use(verifyToken);

/**
 * GET /api/events
 * List events for the current tenant/site
 */
router.get('/', async (req, res) => {
  try {
    const {
      siteId,
      type,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const query = { tenantId: req.user.tenantId };

    if (siteId) {
      query.siteId = siteId;
    }

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.eventDate = {};
      if (startDate) query.eventDate.$gte = new Date(startDate);
      if (endDate) query.eventDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [events, total] = await Promise.all([
      Event.find(query)
        .sort({ eventDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('siteId', 'name code')
        .populate('createdBy', 'displayName email')
        .lean(),
      Event.countDocuments(query),
    ]);

    res.json({
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

/**
 * GET /api/events/:id
 * Get a single event with full details
 */
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    })
      .populate('siteId', 'name code')
      .populate('createdBy', 'displayName email')
      .populate('updatedBy', 'displayName email')
      .populate('inventoryMovements')
      .populate('ledgerEntries');

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ event });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

/**
 * POST /api/events
 * Create a new event (and optionally auto-post)
 */
router.post('/', checkPlanLimit('eventsPerMonth'), async (req, res) => {
  try {
    // Get Firestore tenant ID for usage tracking
    const firestoreTenantId = req.userData?.tenantId;
    const {
      siteId,
      type,
      eventDate,
      description,
      status = 'completed',
      inventoryUsed,
      inventoryReceived,
      animals,
      totalCost,
      totalRevenue,
      vendor,
      labor,
      notes,
      weather,
      autoPost = true,
    } = req.body;

    // Validate required fields
    if (!siteId || !type || !description) {
      return res.status(400).json({
        error: 'siteId, type, and description are required',
      });
    }

    // Verify site belongs to tenant
    const site = await Site.findOne({
      _id: siteId,
      tenantId: req.user.tenantId,
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Calculate totals if not provided
    let calculatedTotalCost = totalCost || 0;
    let calculatedTotalRevenue = totalRevenue || 0;

    if (inventoryUsed && inventoryUsed.length > 0) {
      calculatedTotalCost = inventoryUsed.reduce(
        (sum, item) => sum + (item.totalCost || item.quantity * item.unitCost || 0),
        0
      );
    }

    if (inventoryReceived && inventoryReceived.length > 0 && type === 'purchase') {
      calculatedTotalCost = inventoryReceived.reduce(
        (sum, item) => sum + (item.totalCost || item.quantity * item.unitCost || 0),
        0
      );
    }

    if (labor && labor.hours && labor.rate) {
      calculatedTotalCost = labor.hours * labor.rate;
    }

    // Create event
    const event = new Event({
      tenantId: req.user.tenantId,
      siteId,
      type,
      eventDate: eventDate || new Date(),
      description,
      status,
      inventoryUsed: inventoryUsed || [],
      inventoryReceived: inventoryReceived || [],
      animals: animals || [],
      totalCost: calculatedTotalCost,
      totalRevenue: calculatedTotalRevenue,
      vendor,
      labor,
      notes,
      weather,
      createdBy: req.user._id,
    });

    await event.save();

    // Auto-post to inventory and ledger if requested and status is completed
    if (autoPost && status === 'completed') {
      try {
        await eventPostingService.postEvent(event, req.user._id);
      } catch (postError) {
        console.error('Error auto-posting event:', postError);
        // Event is created but posting failed - return warning
        return res.status(201).json({
          event,
          warning: 'Event created but auto-posting failed. Please review manually.',
        });
      }
    }

    // Fetch the event with populated fields
    const populatedEvent = await Event.findById(event._id)
      .populate('siteId', 'name code')
      .populate('createdBy', 'displayName email');

    // Increment usage counter
    if (firestoreTenantId) {
      await incrementUsageAfterCreate(firestoreTenantId, 'eventsPerMonth');
    }

    res.status(201).json({ event: populatedEvent });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

/**
 * PATCH /api/events/:id
 * Update an event (limited if already posted)
 */
router.patch('/:id', async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // If event is already posted, only allow certain updates
    if (event.posted) {
      const allowedUpdates = ['notes', 'attachments', 'weather'];
      const attemptedUpdates = Object.keys(req.body);
      const disallowedUpdates = attemptedUpdates.filter(
        (key) => !allowedUpdates.includes(key)
      );

      if (disallowedUpdates.length > 0) {
        return res.status(400).json({
          error: `Cannot modify ${disallowedUpdates.join(', ')} on a posted event. Void and recreate instead.`,
        });
      }
    }

    // Update allowed fields
    const updates = req.body;
    updates.updatedBy = req.user._id;

    Object.assign(event, updates);
    await event.save();

    const populatedEvent = await Event.findById(event._id)
      .populate('siteId', 'name code')
      .populate('createdBy', 'displayName email')
      .populate('updatedBy', 'displayName email');

    res.json({ event: populatedEvent });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

/**
 * POST /api/events/:id/post
 * Manually post an event to inventory/ledger
 */
router.post('/:id/post', async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.posted) {
      return res.status(400).json({ error: 'Event is already posted' });
    }

    if (event.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot post a cancelled event' });
    }

    const result = await eventPostingService.postEvent(event, req.user._id);

    res.json({
      message: 'Event posted successfully',
      inventoryMovements: result.inventoryMovements.length,
      ledgerEntries: result.ledgerEntries.length,
    });
  } catch (error) {
    console.error('Error posting event:', error);
    res.status(500).json({ error: 'Failed to post event' });
  }
});

/**
 * POST /api/events/:id/void
 * Void an event and reverse its postings
 */
router.post('/:id/void', async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.status === 'cancelled') {
      return res.status(400).json({ error: 'Event is already cancelled' });
    }

    await eventPostingService.reverseEvent(event, req.user._id);

    res.json({ message: 'Event voided successfully' });
  } catch (error) {
    console.error('Error voiding event:', error);
    res.status(500).json({ error: 'Failed to void event' });
  }
});

/**
 * DELETE /api/events/:id
 * Delete an event (only if draft/not posted)
 */
router.delete('/:id', async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.posted) {
      return res.status(400).json({
        error: 'Cannot delete a posted event. Void it instead.',
      });
    }

    await event.deleteOne();

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

/**
 * GET /api/events/types
 * Get available event types
 */
router.get('/meta/types', async (req, res) => {
  const types = [
    { value: 'feeding', label: 'Feeding', description: 'Feed animals' },
    { value: 'treatment', label: 'Treatment', description: 'Medical treatment' },
    { value: 'purchase', label: 'Purchase', description: 'Buy supplies' },
    { value: 'sale', label: 'Sale', description: 'Sell animals/products' },
    { value: 'transfer', label: 'Transfer', description: 'Move inventory between sites' },
    { value: 'adjustment', label: 'Adjustment', description: 'Manual inventory adjustment' },
    { value: 'maintenance', label: 'Maintenance', description: 'Equipment/facility maintenance' },
    { value: 'labor', label: 'Labor', description: 'Labor/work hours' },
    { value: 'breeding', label: 'Breeding', description: 'Breeding event' },
    { value: 'birth', label: 'Birth', description: 'Animal birth' },
    { value: 'death', label: 'Death', description: 'Animal death/loss' },
    { value: 'harvest', label: 'Harvest', description: 'Harvest crops/products' },
    { value: 'custom', label: 'Custom', description: 'User-defined event' },
  ];

  res.json({ types });
});

module.exports = router;
