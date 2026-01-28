const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const { checkPlanLimit, incrementUsageAfterCreate } = require('../middleware/planLimits');
const firestoreService = require('../services/firestore');
const accountingService = require('../services/accounting');
const taskInventoryService = require('../services/task-inventory-service');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// ============================================
// TASK TEMPLATES
// ============================================

/**
 * GET /api/tasks/templates
 * List all task templates for the tenant
 */
router.get('/templates', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { category, activeOnly, siteId } = req.query;

    const templates = await firestoreService.getTaskTemplates(userData.tenantId, {
      category,
      activeOnly: activeOnly !== 'false',
      siteId,
    });

    res.json({
      success: true,
      data: { templates },
    });
  } catch (error) {
    console.error('Error fetching task templates:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch task templates' });
  }
});

/**
 * GET /api/tasks/templates/:id
 * Get a single task template
 */
router.get(
  '/templates/:id',
  [param('id').notEmpty().withMessage('Template ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      const template = await firestoreService.getTaskTemplate(userData.tenantId, req.params.id);

      if (!template) {
        return res.status(404).json({ success: false, message: 'Template not found' });
      }

      res.json({
        success: true,
        data: { template },
      });
    } catch (error) {
      console.error('Error fetching task template:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch task template' });
    }
  }
);

/**
 * POST /api/tasks/templates
 * Create a new task template
 */
router.post(
  '/templates',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('category').optional().isIn(Object.values(firestoreService.TaskCategory)),
    body('priority').optional().isIn(Object.values(firestoreService.TaskPriority)),
    body('estimatedDurationMinutes').optional().isNumeric(),
    body('recurrence.pattern').optional().isIn(Object.values(firestoreService.RecurrencePattern)),
  ],
  checkPlanLimit('activeTasks'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      // Use tenant from middleware if available
      const tenantId = req.userData?.tenantId || (await firestoreService.findUserByAuthUid(req.firebaseUser.uid))?.tenantId;
      if (!tenantId) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      // Check user has admin role for creating templates
      const userData = req.userData || await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!['owner', 'admin'].some((r) => userData.user.roles?.includes(r))) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to create task templates',
        });
      }

      const template = await firestoreService.createTaskTemplate(
        tenantId,
        req.body,
        req.firebaseUser.uid
      );

      // Increment usage counter
      await incrementUsageAfterCreate(tenantId, 'activeTasks');

      res.status(201).json({
        success: true,
        data: { template },
      });
    } catch (error) {
      console.error('Error creating task template:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create task template',
      });
    }
  }
);

/**
 * PATCH /api/tasks/templates/:id
 * Update a task template
 */
router.patch(
  '/templates/:id',
  [param('id').notEmpty().withMessage('Template ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      // Check user has admin role
      if (!['owner', 'admin'].some((r) => userData.user.roles?.includes(r))) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update task templates',
        });
      }

      const template = await firestoreService.updateTaskTemplate(
        userData.tenantId,
        req.params.id,
        req.body
      );

      res.json({
        success: true,
        data: { template },
      });
    } catch (error) {
      console.error('Error updating task template:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update task template',
      });
    }
  }
);

/**
 * DELETE /api/tasks/templates/:id
 * Deactivate a task template
 */
router.delete(
  '/templates/:id',
  [param('id').notEmpty().withMessage('Template ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      // Check user has admin role
      if (!['owner', 'admin'].some((r) => userData.user.roles?.includes(r))) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to delete task templates',
        });
      }

      await firestoreService.deleteTaskTemplate(userData.tenantId, req.params.id);

      res.json({
        success: true,
        message: 'Template deactivated successfully',
      });
    } catch (error) {
      console.error('Error deleting task template:', error);
      res.status(500).json({ success: false, message: 'Failed to delete task template' });
    }
  }
);

// ============================================
// RUNLISTS
// ============================================

/**
 * GET /api/tasks/runlists
 * List all runlists for the tenant
 */
router.get('/runlists', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { status, siteId, limit } = req.query;

    const runlists = await firestoreService.getRunlists(userData.tenantId, {
      status,
      siteId,
      limit: limit ? parseInt(limit) : undefined,
    });

    res.json({
      success: true,
      data: { runlists },
    });
  } catch (error) {
    console.error('Error fetching runlists:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch runlists' });
  }
});

/**
 * GET /api/tasks/runlists/:id
 * Get a single runlist
 */
router.get(
  '/runlists/:id',
  [param('id').notEmpty().withMessage('Runlist ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      const runlist = await firestoreService.getRunlist(userData.tenantId, req.params.id);

      if (!runlist) {
        return res.status(404).json({ success: false, message: 'Runlist not found' });
      }

      // Get template details for the runlist
      const templates = [];
      for (const templateId of runlist.templateIds || []) {
        const template = await firestoreService.getTaskTemplate(userData.tenantId, templateId);
        if (template) {
          templates.push(template);
        }
      }

      res.json({
        success: true,
        data: { runlist, templates },
      });
    } catch (error) {
      console.error('Error fetching runlist:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch runlist' });
    }
  }
);

/**
 * POST /api/tasks/runlists
 * Create a new runlist
 */
router.post(
  '/runlists',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('templateIds').optional().isArray(),
    body('scheduleTime').optional().matches(/^\d{2}:\d{2}$/),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      // Check user has manager+ role
      if (!['owner', 'admin', 'manager'].some((r) => userData.user.roles?.includes(r))) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to create runlists',
        });
      }

      const runlist = await firestoreService.createRunlist(
        userData.tenantId,
        req.body,
        req.firebaseUser.uid
      );

      res.status(201).json({
        success: true,
        data: { runlist },
      });
    } catch (error) {
      console.error('Error creating runlist:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create runlist',
      });
    }
  }
);

/**
 * PATCH /api/tasks/runlists/:id
 * Update a runlist
 */
router.patch(
  '/runlists/:id',
  [param('id').notEmpty().withMessage('Runlist ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      // Check user has manager+ role
      if (!['owner', 'admin', 'manager'].some((r) => userData.user.roles?.includes(r))) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update runlists',
        });
      }

      const runlist = await firestoreService.updateRunlist(
        userData.tenantId,
        req.params.id,
        req.body
      );

      res.json({
        success: true,
        data: { runlist },
      });
    } catch (error) {
      console.error('Error updating runlist:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update runlist',
      });
    }
  }
);

/**
 * POST /api/tasks/runlists/:id/activate
 * Activate a runlist
 */
router.post(
  '/runlists/:id/activate',
  [param('id').notEmpty().withMessage('Runlist ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      // Check user has manager+ role
      if (!['owner', 'admin', 'manager'].some((r) => userData.user.roles?.includes(r))) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to activate runlists',
        });
      }

      const runlist = await firestoreService.activateRunlist(userData.tenantId, req.params.id);

      // Auto-generate today's task occurrences for this runlist
      let generatedOccurrences = [];
      try {
        generatedOccurrences = await firestoreService.generateTaskOccurrencesForDate(
          userData.tenantId,
          new Date(),
          req.firebaseUser.uid
        );
      } catch (genError) {
        console.error('Error auto-generating tasks on activation:', genError);
        // Don't fail the activation if generation fails
      }

      res.json({
        success: true,
        data: {
          runlist,
          generatedTasks: generatedOccurrences.length,
        },
      });
    } catch (error) {
      console.error('Error activating runlist:', error);
      res.status(500).json({ success: false, message: 'Failed to activate runlist' });
    }
  }
);

/**
 * POST /api/tasks/runlists/:id/pause
 * Pause a runlist
 */
router.post(
  '/runlists/:id/pause',
  [param('id').notEmpty().withMessage('Runlist ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      // Check user has manager+ role
      if (!['owner', 'admin', 'manager'].some((r) => userData.user.roles?.includes(r))) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to pause runlists',
        });
      }

      const runlist = await firestoreService.pauseRunlist(userData.tenantId, req.params.id);

      res.json({
        success: true,
        data: { runlist },
      });
    } catch (error) {
      console.error('Error pausing runlist:', error);
      res.status(500).json({ success: false, message: 'Failed to pause runlist' });
    }
  }
);

/**
 * POST /api/tasks/runlists/:id/archive
 * Archive a runlist
 */
router.post(
  '/runlists/:id/archive',
  [param('id').notEmpty().withMessage('Runlist ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      // Check user has manager+ role
      if (!['owner', 'admin', 'manager'].some((r) => userData.user.roles?.includes(r))) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to archive runlists',
        });
      }

      const runlist = await firestoreService.archiveRunlist(userData.tenantId, req.params.id);

      res.json({
        success: true,
        data: { runlist },
      });
    } catch (error) {
      console.error('Error archiving runlist:', error);
      res.status(500).json({ success: false, message: 'Failed to archive runlist' });
    }
  }
);

/**
 * POST /api/tasks/runlists/:id/templates
 * Add templates to a runlist
 */
router.post(
  '/runlists/:id/templates',
  [
    param('id').notEmpty().withMessage('Runlist ID is required'),
    body('templateIds').isArray({ min: 1 }).withMessage('Template IDs array is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      // Check user has manager+ role
      if (!['owner', 'admin', 'manager'].some((r) => userData.user.roles?.includes(r))) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to modify runlists',
        });
      }

      const runlist = await firestoreService.addTemplatesToRunlist(
        userData.tenantId,
        req.params.id,
        req.body.templateIds
      );

      res.json({
        success: true,
        data: { runlist },
      });
    } catch (error) {
      console.error('Error adding templates to runlist:', error);
      res.status(500).json({ success: false, message: 'Failed to add templates to runlist' });
    }
  }
);

/**
 * DELETE /api/tasks/runlists/:id/templates
 * Remove templates from a runlist
 */
router.delete(
  '/runlists/:id/templates',
  [
    param('id').notEmpty().withMessage('Runlist ID is required'),
    body('templateIds').isArray({ min: 1 }).withMessage('Template IDs array is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      // Check user has manager+ role
      if (!['owner', 'admin', 'manager'].some((r) => userData.user.roles?.includes(r))) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to modify runlists',
        });
      }

      const runlist = await firestoreService.removeTemplatesFromRunlist(
        userData.tenantId,
        req.params.id,
        req.body.templateIds
      );

      res.json({
        success: true,
        data: { runlist },
      });
    } catch (error) {
      console.error('Error removing templates from runlist:', error);
      res.status(500).json({ success: false, message: 'Failed to remove templates from runlist' });
    }
  }
);

// ============================================
// TASK OCCURRENCES
// ============================================

/**
 * GET /api/tasks/occurrences
 * List task occurrences with filters
 */
router.get('/occurrences', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const {
      status,
      siteId,
      assignedToUserId,
      runlistId,
      templateId,
      startDate,
      endDate,
      limit,
    } = req.query;

    const occurrences = await firestoreService.getTaskOccurrences(userData.tenantId, {
      status,
      siteId,
      assignedToUserId,
      runlistId,
      templateId,
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : undefined,
    });

    res.json({
      success: true,
      data: { occurrences },
    });
  } catch (error) {
    console.error('Error fetching task occurrences:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch task occurrences' });
  }
});

/**
 * GET /api/tasks/occurrences/my-tasks
 * Get tasks assigned to current user
 */
router.get('/occurrences/my-tasks', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { daysAhead, limit } = req.query;

    const tasks = await firestoreService.getUpcomingTasks(
      userData.tenantId,
      req.firebaseUser.uid,
      {
        daysAhead: daysAhead ? parseInt(daysAhead) : 7,
        limit: limit ? parseInt(limit) : 20,
      }
    );

    res.json({
      success: true,
      data: { tasks },
    });
  } catch (error) {
    console.error('Error fetching my tasks:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
  }
});

/**
 * GET /api/tasks/occurrences/today
 * Get today's tasks
 */
router.get('/occurrences/today', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { siteId, assignedToUserId } = req.query;

    const tasks = await firestoreService.getTodaysTasks(userData.tenantId, {
      siteId,
      assignedToUserId,
    });

    res.json({
      success: true,
      data: { tasks },
    });
  } catch (error) {
    console.error('Error fetching today\'s tasks:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch today\'s tasks' });
  }
});

/**
 * POST /api/tasks/occurrences/reorder
 * Reorder task occurrences (update sortOrder and optionally runlistId)
 */
router.post(
  '/occurrences/reorder',
  [
    body('scheduledDate').notEmpty().withMessage('Scheduled date is required'),
    body('orderedTasks').isArray({ min: 1 }).withMessage('Ordered tasks array is required'),
    body('orderedTasks.*.id').notEmpty().withMessage('Task ID is required'),
    body('orderedTasks.*.sortOrder').isNumeric().withMessage('Sort order must be a number'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      const { scheduledDate, orderedTasks } = req.body;

      const result = await firestoreService.reorderTaskOccurrences(
        userData.tenantId,
        scheduledDate,
        orderedTasks
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error reordering tasks:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to reorder tasks',
      });
    }
  }
);

/**
 * GET /api/tasks/occurrences/:id
 * Get a single task occurrence
 */
router.get(
  '/occurrences/:id',
  [param('id').notEmpty().withMessage('Occurrence ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      const occurrence = await firestoreService.getTaskOccurrence(
        userData.tenantId,
        req.params.id
      );

      if (!occurrence) {
        return res.status(404).json({ success: false, message: 'Task occurrence not found' });
      }

      res.json({
        success: true,
        data: { occurrence },
      });
    } catch (error) {
      console.error('Error fetching task occurrence:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch task occurrence' });
    }
  }
);

/**
 * POST /api/tasks/occurrences
 * Create an ad-hoc task occurrence (can be a regular task or an "event" - major task)
 */
router.post(
  '/occurrences',
  [
    body('scheduledDate').notEmpty().withMessage('Scheduled date is required'),
    body('siteId').optional(),
    body('templateId').optional(),
    body('priority').optional().isIn(Object.values(firestoreService.TaskPriority)),
    body('name').optional().isString(),
    body('description').optional().isString(),
    // Event fields
    body('isEvent').optional().isBoolean(),
    body('eventType').optional().isString(),
    body('totalCost').optional().isNumeric(),
    body('totalRevenue').optional().isNumeric(),
    body('inventoryUsed').optional().isArray(),
    body('inventoryReceived').optional().isArray(),
    body('labor').optional().isObject(),
    body('vendor').optional().isObject(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      // Check user has manager+ role for creating tasks
      if (!['owner', 'admin', 'manager'].some((r) => userData.user.roles?.includes(r))) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to create tasks',
        });
      }

      const occurrence = await firestoreService.createTaskOccurrence(
        userData.tenantId,
        req.body,
        req.firebaseUser.uid
      );

      res.status(201).json({
        success: true,
        data: { occurrence },
      });
    } catch (error) {
      console.error('Error creating task occurrence:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create task occurrence',
      });
    }
  }
);

/**
 * POST /api/tasks/occurrences/:id/start
 * Start working on a task
 */
router.post(
  '/occurrences/:id/start',
  [param('id').notEmpty().withMessage('Occurrence ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      const occurrence = await firestoreService.startTaskOccurrence(
        userData.tenantId,
        req.params.id,
        req.firebaseUser.uid
      );

      res.json({
        success: true,
        data: { occurrence },
      });
    } catch (error) {
      console.error('Error starting task:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to start task',
      });
    }
  }
);

/**
 * POST /api/tasks/occurrences/:id/complete
 * Complete a task (or event)
 */
router.post(
  '/occurrences/:id/complete',
  [
    param('id').notEmpty().withMessage('Occurrence ID is required'),
    body('notes').optional().isString(),
    body('actualDurationMinutes').optional().isNumeric(),
    body('inventoryConsumed').optional().isArray(),
    body('createLinkedEvent').optional().isBoolean(),
    // Event fields (can be added at completion time for ad-hoc events)
    body('isEvent').optional().isBoolean(),
    body('eventType').optional().isString(),
    body('totalCost').optional().isNumeric(),
    body('totalRevenue').optional().isNumeric(),
    body('inventoryUsed').optional().isArray(),
    body('inventoryReceived').optional().isArray(),
    body('labor').optional().isObject(),
    body('vendor').optional().isObject(),
    body('postToLedger').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      const { tenantId } = userData;
      const {
        notes,
        actualDurationMinutes,
        inventoryConsumed,
        createLinkedEvent,
        // Event fields
        isEvent,
        eventType,
        totalCost,
        totalRevenue,
        inventoryUsed,
        inventoryReceived,
        labor,
        vendor,
        postToLedger,
      } = req.body;

      // Get the occurrence first
      const currentOccurrence = await firestoreService.getTaskOccurrence(
        tenantId,
        req.params.id
      );

      if (!currentOccurrence) {
        return res.status(404).json({ success: false, message: 'Task occurrence not found' });
      }

      // Complete the task with event data if provided
      const occurrence = await firestoreService.completeTaskOccurrence(
        tenantId,
        req.params.id,
        {
          notes,
          actualDurationMinutes,
          inventoryConsumed,
          isEvent,
          eventType,
          totalCost,
          totalRevenue,
          inventoryUsed,
          inventoryReceived,
          labor,
          vendor,
        },
        req.firebaseUser.uid
      );

      // Consume inventory items if the task has inventory requirements
      let inventoryConsumptionResult = null;
      const taskInventoryItems = currentOccurrence.inventoryItems || [];

      if (taskInventoryItems.length > 0 && occurrence.siteId) {
        try {
          // Calculate animal count for PER_ANIMAL allocation
          let animalCount = 0;
          if (currentOccurrence.animalIds && currentOccurrence.animalIds.length > 0) {
            animalCount = currentOccurrence.animalIds.length;
          } else if (currentOccurrence.animalGroupIds && currentOccurrence.animalGroupIds.length > 0) {
            // Get total animal count from all groups
            for (const groupId of currentOccurrence.animalGroupIds) {
              try {
                const group = await firestoreService.getAnimalGroup(tenantId, groupId);
                if (group && group.currentCount) {
                  animalCount += group.currentCount;
                }
              } catch (groupErr) {
                console.warn(`[Task Complete] Could not get animal count for group ${groupId}:`, groupErr.message);
              }
            }
          }

          console.log(`[Task Complete] Consuming inventory for task ${req.params.id}:`, {
            siteId: occurrence.siteId,
            itemCount: taskInventoryItems.length,
            animalCount,
          });

          inventoryConsumptionResult = await taskInventoryService.consumeInventoryForTask(
            tenantId,
            occurrence.siteId,
            { id: req.params.id, templateId: currentOccurrence.templateId },
            taskInventoryItems,
            animalCount
          );

          console.log(`[Task Complete] Inventory consumption result:`, {
            movementCount: inventoryConsumptionResult.movements.length,
            totalCost: inventoryConsumptionResult.totalCost,
          });

          // Update occurrence with consumption info
          await firestoreService.updateTaskOccurrence(tenantId, req.params.id, {
            inventoryConsumed: inventoryConsumptionResult.movements,
            inventoryConsumptionCost: inventoryConsumptionResult.totalCost,
          });

          occurrence.inventoryConsumed = inventoryConsumptionResult.movements;
          occurrence.inventoryConsumptionCost = inventoryConsumptionResult.totalCost;
        } catch (invError) {
          console.error('[Task Complete] Error consuming inventory:', invError);
          // Don't fail task completion, just log the error
          inventoryConsumptionResult = { error: invError.message };
        }
      }

      // Create linked event if requested and template has linkedEventType
      let linkedEvent = null;
      if (createLinkedEvent && currentOccurrence.linkedEventType) {
        try {
          const idempotencyKey = accountingService.generateIdempotencyKey(
            tenantId,
            `task-${occurrence.id}`,
            { completedAt: new Date().toISOString() }
          );

          linkedEvent = await firestoreService.createEvent(
            tenantId,
            {
              siteId: occurrence.siteId,
              type: currentOccurrence.linkedEventType,
              occurredAt: new Date(),
              sourceType: 'TASK',
              sourceId: occurrence.id,
              payload: {
                taskOccurrenceId: occurrence.id,
                animalGroupId: occurrence.animalGroupId,
                animalIds: occurrence.animalIds,
                inventoryConsumed: inventoryConsumed || [],
                notes,
              },
              idempotencyKey,
            },
            req.firebaseUser.uid
          );

          // Update occurrence with linked event ID
          await firestoreService.updateTaskOccurrence(tenantId, req.params.id, {
            linkedEventId: linkedEvent.id,
          });

          // Process the event immediately
          const lockerId = `task-${uuidv4()}`;
          await accountingService.processEvent(tenantId, linkedEvent.id, lockerId);
        } catch (eventError) {
          console.error('Error creating linked event:', eventError);
          // Don't fail the task completion, just log the error
        }
      }

      // Handle posting for event tasks (major tasks with financial tracking)
      let postingResult = null;
      const shouldPost = postToLedger && (occurrence.isEvent || isEvent);
      if (shouldPost) {
        try {
          const finalEventType = occurrence.eventType || eventType;
          const finalTotalCost = occurrence.totalCost || totalCost || 0;
          const finalTotalRevenue = occurrence.totalRevenue || totalRevenue || 0;
          const finalInventoryUsed = occurrence.inventoryUsed || inventoryUsed || [];
          const finalInventoryReceived = occurrence.inventoryReceived || inventoryReceived || [];
          const finalLabor = occurrence.labor || labor;

          // Create a Firestore event for posting
          const idempotencyKey = accountingService.generateIdempotencyKey(
            tenantId,
            `task-event-${occurrence.id}`,
            { completedAt: new Date().toISOString(), eventType: finalEventType }
          );

          // Map eventType to accounting event type
          let accountingEventType = 'TASK_EVENT';
          const costPayload = {
            taskOccurrenceId: occurrence.id,
            eventType: finalEventType,
            totalCost: finalTotalCost,
            totalRevenue: finalTotalRevenue,
          };

          // Handle inventory used (consumption)
          if (finalInventoryUsed.length > 0) {
            accountingEventType = 'FEED_LIVESTOCK'; // Use existing event type for inventory consumption
            const totalInventoryCost = finalInventoryUsed.reduce((sum, item) => sum + (item.totalCost || 0), 0);
            costPayload.feedItemId = finalInventoryUsed[0]?.itemId;
            costPayload.totalCost = totalInventoryCost;
            costPayload.qty = finalInventoryUsed.reduce((sum, item) => sum + (item.quantity || 0), 0);
            costPayload.items = finalInventoryUsed;
          }

          // Handle inventory received (purchases)
          if (finalInventoryReceived.length > 0) {
            accountingEventType = 'RECEIVE_PURCHASE_ORDER';
            costPayload.items = finalInventoryReceived;
            costPayload.totalCost = finalInventoryReceived.reduce((sum, item) => sum + (item.totalCost || 0), 0);
          }

          // Handle labor costs
          if (finalLabor && finalLabor.hours && finalLabor.rate) {
            const laborCost = finalLabor.hours * finalLabor.rate;
            costPayload.laborCost = laborCost;
            costPayload.labor = finalLabor;
          }

          // Create and process the event
          const postingEvent = await firestoreService.createEvent(
            tenantId,
            {
              siteId: occurrence.siteId,
              type: accountingEventType,
              occurredAt: new Date(),
              sourceType: 'TASK_EVENT',
              sourceId: occurrence.id,
              payload: costPayload,
              idempotencyKey,
            },
            req.firebaseUser.uid
          );

          const lockerId = `task-event-${uuidv4()}`;
          postingResult = await accountingService.processEvent(tenantId, postingEvent.id, lockerId);

          // Mark the task occurrence as posted
          await firestoreService.updateTaskOccurrence(tenantId, req.params.id, {
            posted: true,
            postedAt: new Date(),
            ledgerTransactionId: postingResult.transactionId?.toString() || null,
          });

          // Update occurrence object to include posting status
          occurrence.posted = true;
          occurrence.postedAt = new Date();
          occurrence.ledgerTransactionId = postingResult.transactionId?.toString() || null;
        } catch (postingError) {
          console.error('Error posting event task to ledger:', postingError);
          // Don't fail the completion, but include error in response
          postingResult = { error: postingError.message };
        }
      }

      res.json({
        success: true,
        data: { occurrence, linkedEvent, postingResult, inventoryConsumptionResult },
      });
    } catch (error) {
      console.error('Error completing task:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to complete task',
      });
    }
  }
);

/**
 * POST /api/tasks/occurrences/:id/skip
 * Skip a task
 */
router.post(
  '/occurrences/:id/skip',
  [
    param('id').notEmpty().withMessage('Occurrence ID is required'),
    body('reason').notEmpty().withMessage('Reason is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      const occurrence = await firestoreService.skipTaskOccurrence(
        userData.tenantId,
        req.params.id,
        req.body.reason,
        req.firebaseUser.uid
      );

      res.json({
        success: true,
        data: { occurrence },
      });
    } catch (error) {
      console.error('Error skipping task:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to skip task',
      });
    }
  }
);

/**
 * POST /api/tasks/occurrences/:id/cancel
 * Cancel a task
 */
router.post(
  '/occurrences/:id/cancel',
  [
    param('id').notEmpty().withMessage('Occurrence ID is required'),
    body('reason').optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      const occurrence = await firestoreService.cancelTaskOccurrence(
        userData.tenantId,
        req.params.id,
        req.body.reason,
        req.firebaseUser.uid
      );

      res.json({
        success: true,
        data: { occurrence },
      });
    } catch (error) {
      console.error('Error cancelling task:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to cancel task',
      });
    }
  }
);

/**
 * POST /api/tasks/occurrences/:id/reassign
 * Reassign a task to another user
 */
router.post(
  '/occurrences/:id/reassign',
  [
    param('id').notEmpty().withMessage('Occurrence ID is required'),
    body('assignedToUserId').notEmpty().withMessage('New assignee ID is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      // Check user has manager+ role for reassigning
      if (!['owner', 'admin', 'manager'].some((r) => userData.user.roles?.includes(r))) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to reassign tasks',
        });
      }

      const occurrence = await firestoreService.reassignTaskOccurrence(
        userData.tenantId,
        req.params.id,
        req.body.assignedToUserId
      );

      res.json({
        success: true,
        data: { occurrence },
      });
    } catch (error) {
      console.error('Error reassigning task:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to reassign task',
      });
    }
  }
);

// ============================================
// TASK GENERATION
// ============================================

/**
 * POST /api/tasks/generate
 * Generate task occurrences for a date
 */
router.post(
  '/generate',
  [body('targetDate').notEmpty().withMessage('Target date is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      // Check user has manager+ role
      if (!['owner', 'admin', 'manager'].some((r) => userData.user.roles?.includes(r))) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to generate tasks',
        });
      }

      const { targetDate } = req.body;

      const occurrences = await firestoreService.generateTaskOccurrencesForDate(
        userData.tenantId,
        new Date(targetDate),
        req.firebaseUser.uid
      );

      res.json({
        success: true,
        data: {
          generated: occurrences.length,
          occurrences,
        },
      });
    } catch (error) {
      console.error('Error generating tasks:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate tasks',
      });
    }
  }
);

// ============================================
// STATISTICS
// ============================================

/**
 * GET /api/tasks/stats
 * Get task statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { siteId, startDate, endDate, assignedToUserId } = req.query;

    const stats = await firestoreService.getTaskStats(userData.tenantId, {
      siteId,
      startDate,
      endDate,
      assignedToUserId,
    });

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    console.error('Error fetching task stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch task statistics' });
  }
});

// ============================================
// METADATA
// ============================================

/**
 * GET /api/tasks/categories
 * Get available task categories
 */
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    data: {
      categories: Object.entries(firestoreService.TaskCategory).map(([key, value]) => ({
        value,
        label: key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, ' '),
      })),
    },
  });
});

/**
 * GET /api/tasks/priorities
 * Get available task priorities
 */
router.get('/priorities', (req, res) => {
  res.json({
    success: true,
    data: {
      priorities: Object.entries(firestoreService.TaskPriority).map(([key, value]) => ({
        value,
        label: key.charAt(0) + key.slice(1).toLowerCase(),
      })),
    },
  });
});

/**
 * GET /api/tasks/recurrence-patterns
 * Get available recurrence patterns
 */
router.get('/recurrence-patterns', (req, res) => {
  res.json({
    success: true,
    data: {
      patterns: Object.entries(firestoreService.RecurrencePattern).map(([key, value]) => ({
        value,
        label: key.charAt(0) + key.slice(1).toLowerCase(),
      })),
    },
  });
});

/**
 * GET /api/tasks/statuses
 * Get available task statuses
 */
router.get('/statuses', (req, res) => {
  res.json({
    success: true,
    data: {
      statuses: Object.entries(firestoreService.TaskOccurrenceStatus).map(([key, value]) => ({
        value,
        label: key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, ' '),
      })),
    },
  });
});

module.exports = router;
