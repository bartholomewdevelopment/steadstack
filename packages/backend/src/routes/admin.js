const express = require('express');
const router = express.Router();
const { Tenant, User, Site, ContactInquiry, Event, Account } = require('../models');
const { verifyToken, requireSuperAdmin } = require('../middleware/auth');

// All admin routes require authentication and superadmin status
router.use(verifyToken);
router.use(requireSuperAdmin);

// ==================== DASHBOARD STATS ====================

/**
 * GET /api/admin/stats
 * Get platform-wide statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const [
      totalTenants,
      activeTenants,
      trialTenants,
      totalUsers,
      totalSites,
      totalEvents,
      recentInquiries,
    ] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ status: 'active' }),
      Tenant.countDocuments({ status: 'trial' }),
      User.countDocuments(),
      Site.countDocuments(),
      Event.countDocuments(),
      ContactInquiry.countDocuments({ status: 'new' }),
    ]);

    // Get tenants by plan
    const tenantsByPlan = await Tenant.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } },
    ]);

    // Get recent signups (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentSignups = await User.countDocuments({
      createdAt: { $gte: weekAgo },
    });

    res.json({
      tenants: {
        total: totalTenants,
        active: activeTenants,
        trial: trialTenants,
        byPlan: tenantsByPlan.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
      users: {
        total: totalUsers,
        recentSignups,
      },
      sites: totalSites,
      events: totalEvents,
      inquiries: {
        new: recentInquiries,
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ==================== TENANTS ====================

/**
 * GET /api/admin/tenants
 * List all tenants with filtering
 */
router.get('/tenants', async (req, res) => {
  try {
    const { status, plan, search, page = 1, limit = 20 } = req.query;

    const query = {};

    if (status) query.status = status;
    if (plan) query.plan = plan;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [tenants, total] = await Promise.all([
      Tenant.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Tenant.countDocuments(query),
    ]);

    // Get user counts for each tenant
    const tenantIds = tenants.map((t) => t._id);
    const userCounts = await User.aggregate([
      { $match: { tenantId: { $in: tenantIds } } },
      { $group: { _id: '$tenantId', count: { $sum: 1 } } },
    ]);
    const userCountMap = userCounts.reduce((acc, item) => {
      acc[item._id.toString()] = item.count;
      return acc;
    }, {});

    // Add user count to each tenant
    const tenantsWithCounts = tenants.map((tenant) => ({
      ...tenant,
      userCount: userCountMap[tenant._id.toString()] || 0,
    }));

    res.json({
      tenants: tenantsWithCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

/**
 * GET /api/admin/tenants/:id
 * Get single tenant with details
 */
router.get('/tenants/:id', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Get related data
    const [users, sites, eventCount] = await Promise.all([
      User.find({ tenantId: tenant._id }).select('-__v').lean(),
      Site.find({ tenantId: tenant._id }).select('-__v').lean(),
      Event.countDocuments({ tenantId: tenant._id }),
    ]);

    res.json({
      tenant,
      users,
      sites,
      stats: {
        eventCount,
        userCount: users.length,
        siteCount: sites.length,
      },
    });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

/**
 * PATCH /api/admin/tenants/:id
 * Update tenant (plan, status, settings)
 */
router.patch('/tenants/:id', async (req, res) => {
  try {
    const { name, plan, status, settings, trialEndsAt } = req.body;

    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Update allowed fields
    if (name) tenant.name = name;
    if (plan) tenant.plan = plan;
    if (status) tenant.status = status;
    if (settings) tenant.settings = { ...tenant.settings, ...settings };
    if (trialEndsAt) tenant.trialEndsAt = trialEndsAt;

    await tenant.save();

    res.json({ tenant });
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

/**
 * POST /api/admin/tenants/:id/suspend
 * Suspend a tenant
 */
router.post('/tenants/:id/suspend', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    tenant.status = 'suspended';
    await tenant.save();

    // Also suspend all users
    await User.updateMany(
      { tenantId: tenant._id },
      { status: 'suspended' }
    );

    res.json({ message: 'Tenant suspended', tenant });
  } catch (error) {
    console.error('Error suspending tenant:', error);
    res.status(500).json({ error: 'Failed to suspend tenant' });
  }
});

/**
 * POST /api/admin/tenants/:id/activate
 * Activate/reactivate a tenant
 */
router.post('/tenants/:id/activate', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    tenant.status = 'active';
    await tenant.save();

    // Also reactivate users
    await User.updateMany(
      { tenantId: tenant._id, status: 'suspended' },
      { status: 'active' }
    );

    res.json({ message: 'Tenant activated', tenant });
  } catch (error) {
    console.error('Error activating tenant:', error);
    res.status(500).json({ error: 'Failed to activate tenant' });
  }
});

// ==================== USERS ====================

/**
 * GET /api/admin/users
 * List all users across all tenants
 */
router.get('/users', async (req, res) => {
  try {
    const { tenantId, role, status, search, page = 1, limit = 20 } = req.query;

    const query = {};

    if (tenantId) query.tenantId = tenantId;
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .populate('tenantId', 'name slug plan')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/admin/users/:id
 * Get single user details
 */
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('tenantId')
      .populate('siteAccess');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * PATCH /api/admin/users/:id
 * Update user (role, status, superadmin)
 */
router.patch('/users/:id', async (req, res) => {
  try {
    const { role, status, isSuperAdmin } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (role) user.role = role;
    if (status) user.status = status;
    if (typeof isSuperAdmin === 'boolean') user.isSuperAdmin = isSuperAdmin;

    await user.save();

    res.json({ user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ==================== CONTACT INQUIRIES ====================

/**
 * GET /api/admin/inquiries
 * List contact inquiries
 */
router.get('/inquiries', async (req, res) => {
  try {
    const { status, source, page = 1, limit = 20 } = req.query;

    const query = {};

    if (status) query.status = status;
    if (source) query.source = source;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [inquiries, total] = await Promise.all([
      ContactInquiry.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ContactInquiry.countDocuments(query),
    ]);

    res.json({
      inquiries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    res.status(500).json({ error: 'Failed to fetch inquiries' });
  }
});

/**
 * PATCH /api/admin/inquiries/:id
 * Update inquiry status
 */
router.patch('/inquiries/:id', async (req, res) => {
  try {
    const { status, notes } = req.body;

    const inquiry = await ContactInquiry.findById(req.params.id);

    if (!inquiry) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }

    if (status) inquiry.status = status;
    if (notes) inquiry.notes = notes;

    await inquiry.save();

    res.json({ inquiry });
  } catch (error) {
    console.error('Error updating inquiry:', error);
    res.status(500).json({ error: 'Failed to update inquiry' });
  }
});

/**
 * DELETE /api/admin/inquiries/:id
 * Delete an inquiry
 */
router.delete('/inquiries/:id', async (req, res) => {
  try {
    const inquiry = await ContactInquiry.findByIdAndDelete(req.params.id);

    if (!inquiry) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }

    res.json({ message: 'Inquiry deleted' });
  } catch (error) {
    console.error('Error deleting inquiry:', error);
    res.status(500).json({ error: 'Failed to delete inquiry' });
  }
});

// ==================== SYSTEM ====================

/**
 * GET /api/admin/system/health
 * System health check
 */
router.get('/system/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');

    res.json({
      status: 'healthy',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

module.exports = router;
