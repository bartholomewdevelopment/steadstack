const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const firestoreService = require('../services/firestore');
const accountingService = require('../services/accounting');
const { LedgerTransaction, LedgerEntry } = require('../models');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * POST /api/posting/process-event
 * Process an event and create ledger entries
 *
 * SECURITY: tenantId is derived from the event document, not from client
 */
router.post(
  '/process-event',
  [
    body('eventId').notEmpty().withMessage('eventId is required'),
    body('tenantId').notEmpty().withMessage('tenantId is required for event lookup'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { eventId, tenantId } = req.body;

      // SECURITY: Verify the event exists and get tenantId from Firestore
      const event = await firestoreService.getEvent(tenantId, eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found',
        });
      }

      // Verify caller has access to this tenant
      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData || userData.tenantId !== tenantId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this tenant',
        });
      }

      // Process the event
      const lockerId = `api-${uuidv4()}`;
      const result = await accountingService.processEvent(tenantId, eventId, lockerId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Process event error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to process event',
      });
    }
  }
);

/**
 * POST /api/posting/create-event
 * Create a new event and optionally process it immediately
 */
router.post(
  '/create-event',
  [
    body('type').notEmpty().withMessage('Event type is required'),
    body('payload').isObject().withMessage('Payload must be an object'),
    body('siteId').optional().isString(),
    body('processImmediately').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { type, payload, siteId, processImmediately } = req.body;

      // Get user's tenant from Firestore
      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({
          success: false,
          message: 'User not found',
        });
      }

      const { tenantId } = userData;

      // Generate idempotency key
      const idempotencyKey = accountingService.generateIdempotencyKey(
        tenantId,
        `${type}-${Date.now()}`,
        payload
      );

      // Create the event
      const event = await firestoreService.createEvent(
        tenantId,
        {
          siteId,
          type,
          occurredAt: new Date(),
          sourceType: 'API',
          payload,
          idempotencyKey,
        },
        req.firebaseUser.uid
      );

      let processingResult = null;

      // Optionally process immediately
      if (processImmediately) {
        try {
          const lockerId = `api-${uuidv4()}`;
          processingResult = await accountingService.processEvent(
            tenantId,
            event.id,
            lockerId
          );
        } catch (postingError) {
          console.error('Immediate posting failed:', postingError);
          processingResult = {
            success: false,
            error: postingError.message,
          };
        }
      }

      res.status(201).json({
        success: true,
        data: {
          event,
          processing: processingResult,
        },
      });
    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create event',
      });
    }
  }
);

/**
 * GET /api/posting/accounts
 * Get Chart of Accounts for the current tenant
 */
router.get('/accounts', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({
        success: false,
        message: 'User not found',
      });
    }

    const accounts = await accountingService.getAccounts(userData.tenantId);

    res.json({
      success: true,
      data: { accounts },
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get accounts',
    });
  }
});

/**
 * GET /api/posting/transactions
 * Get ledger transactions for the current tenant
 */
router.get('/transactions', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({
        success: false,
        message: 'User not found',
      });
    }

    const { limit = 50, offset = 0, status } = req.query;

    const query = { tenantId: userData.tenantId };
    if (status) {
      query.status = status;
    }

    const transactions = await LedgerTransaction.find(query)
      .sort({ occurredAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    const total = await LedgerTransaction.countDocuments(query);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transactions',
    });
  }
});

/**
 * GET /api/posting/transactions/:id
 * Get a single transaction with its entries
 */
router.get(
  '/transactions/:id',
  [param('id').isMongoId().withMessage('Invalid transaction ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({
          success: false,
          message: 'User not found',
        });
      }

      const transaction = await LedgerTransaction.findOne({
        _id: req.params.id,
        tenantId: userData.tenantId,
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found',
        });
      }

      const entries = await LedgerEntry.find({
        transactionId: transaction._id,
      }).populate('accountId');

      res.json({
        success: true,
        data: {
          transaction,
          entries,
        },
      });
    } catch (error) {
      console.error('Get transaction error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get transaction',
      });
    }
  }
);

/**
 * POST /api/posting/transactions/:id/reverse
 * Reverse a posted transaction
 */
router.post(
  '/transactions/:id/reverse',
  [
    param('id').isMongoId().withMessage('Invalid transaction ID'),
    body('reason').notEmpty().withMessage('Reversal reason is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({
          success: false,
          message: 'User not found',
        });
      }

      // Check user has manager+ role
      if (!['owner', 'admin', 'manager'].some((r) => userData.user.roles?.includes(r))) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to reverse transactions',
        });
      }

      const reversalTxn = await accountingService.reverseTransaction(
        userData.tenantId,
        req.params.id,
        req.body.reason
      );

      res.json({
        success: true,
        data: {
          reversalTransaction: reversalTxn,
        },
      });
    } catch (error) {
      console.error('Reverse transaction error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to reverse transaction',
      });
    }
  }
);

/**
 * GET /api/posting/account-balances
 * Get account balances (trial balance style)
 */
router.get('/account-balances', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({
        success: false,
        message: 'User not found',
      });
    }

    const { tenantId } = userData;
    const { asOfDate } = req.query;

    const dateFilter = asOfDate ? { occurredAt: { $lte: new Date(asOfDate) } } : {};

    // Aggregate balances by account
    const balances = await LedgerEntry.aggregate([
      {
        $match: {
          tenantId,
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: '$accountId',
          totalDebits: { $sum: '$debit' },
          totalCredits: { $sum: '$credit' },
        },
      },
      {
        $lookup: {
          from: 'accounts',
          localField: '_id',
          foreignField: '_id',
          as: 'account',
        },
      },
      {
        $unwind: '$account',
      },
      {
        $project: {
          accountId: '$_id',
          code: '$account.code',
          name: '$account.name',
          type: '$account.type',
          normalBalance: '$account.normalBalance',
          totalDebits: 1,
          totalCredits: 1,
          balance: { $subtract: ['$totalDebits', '$totalCredits'] },
        },
      },
      {
        $sort: { code: 1 },
      },
    ]);

    res.json({
      success: true,
      data: { balances },
    });
  } catch (error) {
    console.error('Get account balances error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get account balances',
    });
  }
});

module.exports = router;
