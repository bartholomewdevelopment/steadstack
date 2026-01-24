/**
 * P2P (Purchase-to-Pay) API Routes
 * Handles requisitions, POs, receipts, bills, and payments
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const firestoreService = require('../services/firestore');
const p2pService = require('../services/p2p-service');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Helper to get user data and validate tenant access
const getUserContext = async (req) => {
  const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
  if (!userData) {
    throw new Error('User not found');
  }
  return userData;
};

// ============================================
// VENDORS
// ============================================

/**
 * GET /api/purchasing/vendors
 * List all vendors
 */
router.get('/vendors', async (req, res) => {
  try {
    const { tenantId } = await getUserContext(req);
    const { activeOnly } = req.query;

    const vendors = await p2pService.getVendors(tenantId, {
      activeOnly: activeOnly !== 'false',
    });

    res.json({ success: true, data: { vendors } });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/purchasing/vendors/:id
 * Get a single vendor
 */
router.get('/vendors/:id', async (req, res) => {
  try {
    const { tenantId } = await getUserContext(req);
    const vendor = await p2pService.getVendor(tenantId, req.params.id);

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    res.json({ success: true, data: { vendor } });
  } catch (error) {
    console.error('Error fetching vendor:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/purchasing/vendors
 * Create a new vendor
 */
router.post(
  '/vendors',
  [body('name').notEmpty().withMessage('Vendor name is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { tenantId } = await getUserContext(req);
      const vendor = await p2pService.createVendor(tenantId, req.body, req.firebaseUser.uid);

      res.status(201).json({ success: true, data: { vendor } });
    } catch (error) {
      console.error('Error creating vendor:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ============================================
// REQUISITIONS
// ============================================

/**
 * GET /api/purchasing/requisitions
 * List requisitions
 */
router.get('/requisitions', async (req, res) => {
  try {
    const { tenantId } = await getUserContext(req);
    const { siteId, status, limit } = req.query;

    const requisitions = await p2pService.getRequisitions(tenantId, {
      siteId,
      status,
      limit: limit ? parseInt(limit) : 50,
    });

    res.json({ success: true, data: { requisitions } });
  } catch (error) {
    console.error('Error fetching requisitions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/purchasing/requisitions/:id
 * Get a single requisition
 */
router.get('/requisitions/:id', async (req, res) => {
  try {
    const { tenantId } = await getUserContext(req);
    const requisition = await p2pService.getRequisition(tenantId, req.params.id);

    if (!requisition) {
      return res.status(404).json({ success: false, message: 'Requisition not found' });
    }

    res.json({ success: true, data: { requisition } });
  } catch (error) {
    console.error('Error fetching requisition:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/purchasing/requisitions
 * Create a new requisition
 */
router.post(
  '/requisitions',
  [
    body('siteId').notEmpty().withMessage('Site ID is required'),
    body('lineItems').isArray({ min: 1 }).withMessage('At least one line item is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { tenantId } = await getUserContext(req);
      const requisition = await p2pService.createRequisition(tenantId, req.body, req.firebaseUser.uid);

      res.status(201).json({ success: true, data: { requisition } });
    } catch (error) {
      console.error('Error creating requisition:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * POST /api/purchasing/requisitions/:id/submit
 * Submit a requisition for approval
 */
router.post('/requisitions/:id/submit', async (req, res) => {
  try {
    const { tenantId } = await getUserContext(req);
    const result = await p2pService.submitRequisition(tenantId, req.params.id, req.firebaseUser.uid);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error submitting requisition:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/purchasing/requisitions/:id/approve
 * Approve a requisition
 */
router.post('/requisitions/:id/approve', async (req, res) => {
  try {
    const userData = await getUserContext(req);
    const result = await p2pService.approveRequisition(
      userData.tenantId,
      req.params.id,
      req.firebaseUser.uid,
      userData.user.roles || []
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error approving requisition:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/purchasing/requisitions/:id/reject
 * Reject a requisition
 */
router.post(
  '/requisitions/:id/reject',
  [body('reason').notEmpty().withMessage('Rejection reason is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await getUserContext(req);
      const result = await p2pService.rejectRequisition(
        userData.tenantId,
        req.params.id,
        req.firebaseUser.uid,
        userData.user.roles || [],
        req.body.reason
      );

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error rejecting requisition:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * POST /api/purchasing/requisitions/:id/convert
 * Convert requisition to Purchase Order
 */
router.post(
  '/requisitions/:id/convert',
  [body('vendorId').notEmpty().withMessage('Vendor ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { tenantId } = await getUserContext(req);
      const po = await p2pService.convertRequisitionToPO(
        tenantId,
        req.params.id,
        req.body.vendorId,
        req.firebaseUser.uid
      );

      res.status(201).json({ success: true, data: { purchaseOrder: po } });
    } catch (error) {
      console.error('Error converting requisition:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// ============================================
// PURCHASE ORDERS
// ============================================

/**
 * GET /api/purchasing/purchase-orders
 * List purchase orders
 */
router.get('/purchase-orders', async (req, res) => {
  try {
    const { tenantId } = await getUserContext(req);
    const { siteId, vendorId, status, limit } = req.query;

    const purchaseOrders = await p2pService.getPurchaseOrders(tenantId, {
      siteId,
      vendorId,
      status,
      limit: limit ? parseInt(limit) : 50,
    });

    res.json({ success: true, data: { purchaseOrders } });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/purchasing/purchase-orders/:id
 * Get a single purchase order
 */
router.get('/purchase-orders/:id', async (req, res) => {
  try {
    const { tenantId } = await getUserContext(req);
    const purchaseOrder = await p2pService.getPurchaseOrder(tenantId, req.params.id);

    if (!purchaseOrder) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    // Get related data
    const [vendor, receipts] = await Promise.all([
      p2pService.getVendor(tenantId, purchaseOrder.vendorId),
      p2pService.getReceipts(tenantId, { poId: req.params.id }),
    ]);

    res.json({
      success: true,
      data: {
        purchaseOrder,
        vendor,
        receipts,
      },
    });
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/purchasing/purchase-orders
 * Create a new purchase order
 */
router.post(
  '/purchase-orders',
  [
    body('siteId').notEmpty().withMessage('Site ID is required'),
    body('vendorId').notEmpty().withMessage('Vendor ID is required'),
    body('lineItems').isArray({ min: 1 }).withMessage('At least one line item is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { tenantId } = await getUserContext(req);
      const purchaseOrder = await p2pService.createPurchaseOrder(tenantId, req.body, req.firebaseUser.uid);

      res.status(201).json({ success: true, data: { purchaseOrder } });
    } catch (error) {
      console.error('Error creating purchase order:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * POST /api/purchasing/purchase-orders/:id/send
 * Mark PO as sent
 */
router.post('/purchase-orders/:id/send', async (req, res) => {
  try {
    const { tenantId } = await getUserContext(req);
    const result = await p2pService.sendPurchaseOrder(tenantId, req.params.id, req.firebaseUser.uid);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error sending purchase order:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// RECEIPTS
// ============================================

/**
 * GET /api/purchasing/receipts
 * List receipts
 */
router.get('/receipts', async (req, res) => {
  try {
    const { tenantId } = await getUserContext(req);
    const { siteId, poId, status, limit } = req.query;

    const receipts = await p2pService.getReceipts(tenantId, {
      siteId,
      poId,
      status,
      limit: limit ? parseInt(limit) : 50,
    });

    res.json({ success: true, data: { receipts } });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/purchasing/receipts/:id
 * Get a single receipt
 */
router.get('/receipts/:id', async (req, res) => {
  try {
    const { tenantId } = await getUserContext(req);
    const receipt = await p2pService.getReceipt(tenantId, req.params.id);

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    res.json({ success: true, data: { receipt } });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/purchasing/receipts
 * Create a new receipt (goods receipt)
 */
router.post(
  '/receipts',
  [
    body('poId').notEmpty().withMessage('PO ID is required'),
    body('lines').isArray({ min: 1 }).withMessage('At least one line is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await getUserContext(req);
      const receipt = await p2pService.createReceipt(
        userData.tenantId,
        req.body,
        req.firebaseUser.uid,
        userData.user.roles || []
      );

      res.status(201).json({ success: true, data: { receipt } });
    } catch (error) {
      console.error('Error creating receipt:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * POST /api/purchasing/receipts/:id/post
 * Post a receipt (updates inventory and creates ledger event)
 */
router.post('/receipts/:id/post', async (req, res) => {
  try {
    const { tenantId } = await getUserContext(req);
    const result = await p2pService.postReceipt(tenantId, req.params.id, req.firebaseUser.uid);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error posting receipt:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// VENDOR BILLS
// ============================================

/**
 * GET /api/purchasing/bills
 * List vendor bills
 */
router.get('/bills', async (req, res) => {
  try {
    const { tenantId } = await getUserContext(req);
    const { siteId, vendorId, status, unpaidOnly, limit } = req.query;

    const bills = await p2pService.getVendorBills(tenantId, {
      siteId,
      vendorId,
      status,
      unpaidOnly: unpaidOnly === 'true',
      limit: limit ? parseInt(limit) : 50,
    });

    res.json({ success: true, data: { bills } });
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/purchasing/bills/:id
 * Get a single vendor bill
 */
router.get('/bills/:id', async (req, res) => {
  try {
    const { tenantId } = await getUserContext(req);
    const bill = await p2pService.getVendorBill(tenantId, req.params.id);

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    // Get related data
    const vendor = await p2pService.getVendor(tenantId, bill.vendorId);
    let purchaseOrder = null;
    let receipts = [];

    if (bill.match.poId) {
      purchaseOrder = await p2pService.getPurchaseOrder(tenantId, bill.match.poId);
    }

    if (bill.match.receiptIds?.length) {
      receipts = await Promise.all(
        bill.match.receiptIds.map(id => p2pService.getReceipt(tenantId, id))
      );
    }

    res.json({
      success: true,
      data: {
        bill,
        vendor,
        purchaseOrder,
        receipts,
      },
    });
  } catch (error) {
    console.error('Error fetching bill:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/purchasing/bills
 * Create a new vendor bill
 */
router.post(
  '/bills',
  [
    body('billNumber').notEmpty().withMessage('Bill/Invoice number is required'),
    body('vendorId').notEmpty().withMessage('Vendor ID is required'),
    body('siteId').notEmpty().withMessage('Site ID is required'),
    body('dueDate').notEmpty().withMessage('Due date is required'),
    body('lines').isArray({ min: 1 }).withMessage('At least one line is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { tenantId } = await getUserContext(req);
      const bill = await p2pService.createVendorBill(tenantId, req.body, req.firebaseUser.uid);

      res.status(201).json({ success: true, data: { bill } });
    } catch (error) {
      console.error('Error creating bill:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * POST /api/purchasing/bills/:id/match
 * Match bill to PO and receipts
 */
router.post(
  '/bills/:id/match',
  [
    body('poId').notEmpty().withMessage('PO ID is required'),
    body('receiptIds').isArray().withMessage('Receipt IDs must be an array'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { tenantId } = await getUserContext(req);
      const result = await p2pService.matchBillToPO(
        tenantId,
        req.params.id,
        req.body.poId,
        req.body.receiptIds,
        req.firebaseUser.uid
      );

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error matching bill:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * POST /api/purchasing/bills/:id/approve
 * Approve a vendor bill for payment
 */
router.post('/bills/:id/approve', async (req, res) => {
  try {
    const userData = await getUserContext(req);
    const result = await p2pService.approveBill(
      userData.tenantId,
      req.params.id,
      req.firebaseUser.uid,
      userData.user.roles || []
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error approving bill:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// PAYMENTS
// ============================================

/**
 * GET /api/purchasing/payments
 * List payments
 */
router.get('/payments', async (req, res) => {
  try {
    const { tenantId } = await getUserContext(req);
    const { siteId, vendorId, status, limit } = req.query;

    const payments = await p2pService.getPayments(tenantId, {
      siteId,
      vendorId,
      status,
      limit: limit ? parseInt(limit) : 50,
    });

    res.json({ success: true, data: { payments } });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/purchasing/payments/:id
 * Get a single payment
 */
router.get('/payments/:id', async (req, res) => {
  try {
    const { tenantId } = await getUserContext(req);
    const payment = await p2pService.getPayment(tenantId, req.params.id);

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Get vendor
    const vendor = await p2pService.getVendor(tenantId, payment.vendorId);

    // Get allocated bills
    const bills = await Promise.all(
      payment.allocations.map(a => p2pService.getVendorBill(tenantId, a.billId))
    );

    res.json({
      success: true,
      data: {
        payment,
        vendor,
        bills,
      },
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/purchasing/payments
 * Create a new payment
 */
router.post(
  '/payments',
  [
    body('amount').isNumeric().withMessage('Amount is required'),
    body('method').notEmpty().withMessage('Payment method is required'),
    body('bankAccountId').notEmpty().withMessage('Bank account is required'),
    body('allocations').isArray({ min: 1 }).withMessage('At least one bill allocation is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await getUserContext(req);
      const payment = await p2pService.createPayment(
        userData.tenantId,
        req.body,
        req.firebaseUser.uid,
        userData.user.roles || []
      );

      res.status(201).json({ success: true, data: { payment } });
    } catch (error) {
      console.error('Error creating payment:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * POST /api/purchasing/payments/:id/send
 * Send/process a payment (posts to ledger)
 */
router.post('/payments/:id/send', async (req, res) => {
  try {
    const { tenantId } = await getUserContext(req);
    const result = await p2pService.sendPayment(tenantId, req.params.id, req.firebaseUser.uid);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error sending payment:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/purchasing/payments/:id/clear
 * Mark payment as cleared (bank reconciliation)
 */
router.post('/payments/:id/clear', async (req, res) => {
  try {
    const { tenantId } = await getUserContext(req);
    const result = await p2pService.clearPayment(tenantId, req.params.id, req.firebaseUser.uid);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error clearing payment:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// REPORTS
// ============================================

/**
 * GET /api/purchasing/reports/ap-aging
 * Get Accounts Payable aging report
 */
router.get('/reports/ap-aging', async (req, res) => {
  try {
    const { tenantId } = await getUserContext(req);
    const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate) : new Date();

    const aging = await p2pService.getAPAging(tenantId, asOfDate);

    // Get vendor names
    const vendors = await p2pService.getVendors(tenantId, { activeOnly: false });
    const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v.name]));

    // Add vendor names to aging data
    const agingByVendor = Object.entries(aging.byVendor).map(([vendorId, data]) => ({
      vendorId,
      vendorName: vendorMap[vendorId] || 'Unknown',
      ...data,
    }));

    res.json({
      success: true,
      data: {
        asOfDate: asOfDate.toISOString(),
        summary: {
          current: aging.current,
          days31to60: aging.days31to60,
          days61to90: aging.days61to90,
          over90: aging.over90,
          total: aging.total,
        },
        byVendor: agingByVendor,
      },
    });
  } catch (error) {
    console.error('Error generating AP aging:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/purchasing/check-reorder
 * Check inventory reorder points and create requisitions
 */
router.post('/check-reorder', async (req, res) => {
  try {
    const { tenantId } = await getUserContext(req);
    const { siteId } = req.body;

    if (!siteId) {
      return res.status(400).json({ success: false, message: 'Site ID is required' });
    }

    const itemsToReorder = await p2pService.checkReorderPoints(tenantId, siteId);

    // Create requisitions for items below reorder point
    const createdRequisitions = [];
    for (const reqData of itemsToReorder) {
      const requisition = await p2pService.createRequisition(tenantId, reqData, req.firebaseUser.uid);
      createdRequisitions.push(requisition);
    }

    res.json({
      success: true,
      data: {
        itemsChecked: itemsToReorder.length,
        requisitionsCreated: createdRequisitions,
      },
    });
  } catch (error) {
    console.error('Error checking reorder points:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
