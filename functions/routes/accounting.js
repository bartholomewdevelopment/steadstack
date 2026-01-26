const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const {
  Account,
  Customer,
  Vendor,
  Invoice,
  Bill,
  Check,
  Receipt,
  Deposit,
  BankReconciliation,
  LedgerTransaction,
  LedgerEntry,
} = require('../models');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all accounting routes
router.use(verifyToken);

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// Get tenantId from authenticated user (handle both ObjectId and string)
const getTenantId = (req) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return null;
  // Handle populated ObjectId or plain string
  return tenantId._id ? tenantId._id.toString() : tenantId.toString();
};
const getSiteId = (req) => req.query.siteId || req.body.siteId || null;

// ============================================
// CHART OF ACCOUNTS
// ============================================

// Get all accounts
router.get('/accounts', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { type, isActive } = req.query;

    const filter = { tenantId };
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const accounts = await Account.find(filter).sort({ code: 1 });
    res.json({ success: true, data: accounts });
  } catch (error) {
    next(error);
  }
});

// Get single account
router.get('/accounts/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const account = await Account.findOne({ _id: req.params.id, tenantId });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    res.json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
});

// Create account
router.post('/accounts', [
  body('code').notEmpty().trim(),
  body('name').notEmpty().trim(),
  body('type').isIn(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE', 'COGS']),
], validate, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);

    // Auto-calculate normalBalance based on account type
    const debitTypes = ['ASSET', 'EXPENSE', 'COGS'];
    const normalBalance = req.body.normalBalance ||
      (debitTypes.includes(req.body.type) ? 'DEBIT' : 'CREDIT');

    const account = new Account({ ...req.body, tenantId, normalBalance });
    await account.save();
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Account code already exists' });
    }
    next(error);
  }
});

// Update account
router.put('/accounts/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    res.json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
});

// Delete account
router.delete('/accounts/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const account = await Account.findOne({ _id: req.params.id, tenantId });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    if (account.isSystem) {
      return res.status(400).json({ success: false, message: 'Cannot delete system account' });
    }
    await account.deleteOne();
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    next(error);
  }
});

// Bulk import accounts from CSV
router.post('/accounts/import', [
  body('accounts').isArray({ min: 1 }).withMessage('At least one account is required'),
  body('accounts.*.code').notEmpty().trim().withMessage('Account code is required'),
  body('accounts.*.name').notEmpty().trim().withMessage('Account name is required'),
  body('accounts.*.type').isIn(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE', 'COGS']).withMessage('Invalid account type'),
], validate, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { accounts, skipDuplicates = true } = req.body;

    const results = {
      success: [],
      errors: [],
      skipped: [],
    };

    const debitTypes = ['ASSET', 'EXPENSE', 'COGS'];
    const validSubtypes = [
      'CASH', 'BANK', 'AR', 'INVENTORY', 'PREPAID', 'FIXED_ASSET', 'LIVESTOCK', 'EQUIPMENT', 'LAND',
      'AP', 'CREDIT_CARD', 'LOAN',
      'OWNER_EQUITY', 'RETAINED_EARNINGS',
      'SALES', 'SERVICE_INCOME', 'OTHER_INCOME',
      'FEED', 'MEDICAL', 'LABOR', 'FUEL', 'REPAIRS', 'UTILITIES', 'INSURANCE', 'DEPRECIATION', 'INTEREST', 'OTHER',
    ];

    for (let i = 0; i < accounts.length; i++) {
      const row = accounts[i];
      const rowNum = i + 1;

      try {
        // Validate subtype if provided
        if (row.subtype && !validSubtypes.includes(row.subtype.toUpperCase())) {
          results.errors.push({ row: rowNum, code: row.code, error: `Invalid subtype: ${row.subtype}` });
          continue;
        }

        // Check if account code already exists
        const existing = await Account.findOne({ tenantId, code: row.code.trim() });
        if (existing) {
          if (skipDuplicates) {
            results.skipped.push({ row: rowNum, code: row.code, reason: 'Account code already exists' });
            continue;
          } else {
            results.errors.push({ row: rowNum, code: row.code, error: 'Account code already exists' });
            continue;
          }
        }

        // Auto-calculate normalBalance based on account type
        const normalBalance = debitTypes.includes(row.type.toUpperCase()) ? 'DEBIT' : 'CREDIT';

        const account = new Account({
          tenantId,
          code: row.code.trim(),
          name: row.name.trim(),
          type: row.type.toUpperCase(),
          subtype: row.subtype ? row.subtype.toUpperCase() : undefined,
          description: row.description?.trim() || '',
          normalBalance,
          isActive: row.isActive !== false,
          isSystem: false,
        });

        await account.save();
        results.success.push({ row: rowNum, code: row.code, id: account._id.toString() });
      } catch (err) {
        results.errors.push({ row: rowNum, code: row.code, error: err.message });
      }
    }

    res.json({
      success: true,
      data: results,
      summary: {
        total: accounts.length,
        imported: results.success.length,
        skipped: results.skipped.length,
        failed: results.errors.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get account balance
router.get('/accounts/:id/balance', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { startDate, endDate } = req.query;

    const filter = { tenantId, accountId: req.params.id };
    if (startDate || endDate) {
      filter.occurredAt = {};
      if (startDate) filter.occurredAt.$gte = new Date(startDate);
      if (endDate) filter.occurredAt.$lte = new Date(endDate);
    }

    const entries = await LedgerEntry.aggregate([
      { $match: filter },
      { $group: {
        _id: null,
        totalDebit: { $sum: '$debit' },
        totalCredit: { $sum: '$credit' },
      }},
    ]);

    const result = entries[0] || { totalDebit: 0, totalCredit: 0 };
    const account = await Account.findById(req.params.id);
    const balance = account?.normalBalance === 'DEBIT'
      ? result.totalDebit - result.totalCredit
      : result.totalCredit - result.totalDebit;

    res.json({
      success: true,
      data: {
        accountId: req.params.id,
        totalDebit: result.totalDebit,
        totalCredit: result.totalCredit,
        balance,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// CUSTOMERS (A/R)
// ============================================

router.get('/customers', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { isActive } = req.query;
    const filter = { tenantId };
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const customers = await Customer.find(filter).sort({ name: 1 });
    res.json({ success: true, data: customers });
  } catch (error) {
    next(error);
  }
});

router.get('/customers/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const customer = await Customer.findOne({ _id: req.params.id, tenantId });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
});

router.post('/customers', [
  body('name').notEmpty().trim(),
], validate, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const customer = new Customer({ ...req.body, tenantId, siteId: getSiteId(req) });
    await customer.save();
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
});

router.put('/customers/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
});

router.delete('/customers/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const customer = await Customer.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, message: 'Customer deleted' });
  } catch (error) {
    next(error);
  }
});

// A/R Aging
router.get('/ar/aging', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const today = new Date();

    const invoices = await Invoice.find({
      tenantId,
      status: { $in: ['SENT', 'PARTIAL', 'OVERDUE'] },
      balance: { $gt: 0 },
    }).populate('customerId');

    const aging = {
      current: 0,
      days1to30: 0,
      days31to60: 0,
      days61to90: 0,
      over90: 0,
      total: 0,
    };

    const details = invoices.map((inv) => {
      const daysPastDue = Math.floor((today - inv.dueDate) / (1000 * 60 * 60 * 24));
      let bucket = 'current';
      if (daysPastDue > 90) bucket = 'over90';
      else if (daysPastDue > 60) bucket = 'days61to90';
      else if (daysPastDue > 30) bucket = 'days31to60';
      else if (daysPastDue > 0) bucket = 'days1to30';

      aging[bucket] += inv.balance;
      aging.total += inv.balance;

      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customer: inv.customerId?.name,
        dueDate: inv.dueDate,
        balance: inv.balance,
        daysPastDue: Math.max(0, daysPastDue),
        bucket,
      };
    });

    res.json({ success: true, data: { summary: aging, details } });
  } catch (error) {
    next(error);
  }
});

// ============================================
// VENDORS (A/P)
// ============================================

router.get('/vendors', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { isActive } = req.query;
    const filter = { tenantId };
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const vendors = await Vendor.find(filter).sort({ name: 1 });
    res.json({ success: true, data: vendors });
  } catch (error) {
    next(error);
  }
});

router.get('/vendors/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const vendor = await Vendor.findOne({ _id: req.params.id, tenantId });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }
    res.json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
});

router.post('/vendors', [
  body('name').notEmpty().trim(),
], validate, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const vendor = new Vendor({ ...req.body, tenantId, siteId: getSiteId(req) });
    await vendor.save();
    res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
});

router.put('/vendors/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const vendor = await Vendor.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }
    res.json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
});

router.delete('/vendors/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const vendor = await Vendor.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }
    res.json({ success: true, message: 'Vendor deleted' });
  } catch (error) {
    next(error);
  }
});

// A/P Aging
router.get('/ap/aging', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const today = new Date();

    const bills = await Bill.find({
      tenantId,
      status: { $in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
      balance: { $gt: 0 },
    }).populate('vendorId');

    const aging = {
      current: 0,
      days1to30: 0,
      days31to60: 0,
      days61to90: 0,
      over90: 0,
      total: 0,
    };

    const details = bills.map((bill) => {
      const daysPastDue = Math.floor((today - bill.dueDate) / (1000 * 60 * 60 * 24));
      let bucket = 'current';
      if (daysPastDue > 90) bucket = 'over90';
      else if (daysPastDue > 60) bucket = 'days61to90';
      else if (daysPastDue > 30) bucket = 'days31to60';
      else if (daysPastDue > 0) bucket = 'days1to30';

      aging[bucket] += bill.balance;
      aging.total += bill.balance;

      return {
        billId: bill.id,
        billNumber: bill.billNumber,
        vendor: bill.vendorId?.name,
        dueDate: bill.dueDate,
        balance: bill.balance,
        daysPastDue: Math.max(0, daysPastDue),
        bucket,
      };
    });

    res.json({ success: true, data: { summary: aging, details } });
  } catch (error) {
    next(error);
  }
});

// ============================================
// INVOICES
// ============================================

router.get('/invoices', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { status, customerId, startDate, endDate } = req.query;
    const filter = { tenantId };
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;
    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) filter.invoiceDate.$gte = new Date(startDate);
      if (endDate) filter.invoiceDate.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(filter)
      .populate('customerId')
      .sort({ invoiceDate: -1 });
    res.json({ success: true, data: invoices });
  } catch (error) {
    next(error);
  }
});

router.get('/invoices/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const invoice = await Invoice.findOne({ _id: req.params.id, tenantId })
      .populate('customerId');
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
});

router.post('/invoices', [
  body('customerId').notEmpty(),
  body('lines').isArray({ min: 1 }),
], validate, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);

    // Generate invoice number
    const count = await Invoice.countDocuments({ tenantId });
    const invoiceNumber = `INV-${String(count + 1).padStart(5, '0')}`;

    // Calculate due date based on customer terms
    const customer = await Customer.findById(req.body.customerId);
    let dueDate = req.body.dueDate;
    if (!dueDate && customer) {
      const days = {
        NET_15: 15, NET_30: 30, NET_45: 45, NET_60: 60, DUE_ON_RECEIPT: 0,
      }[customer.paymentTerms] || 30;
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + days);
    }

    const invoice = new Invoice({
      ...req.body,
      tenantId,
      siteId: getSiteId(req),
      invoiceNumber,
      dueDate,
    });
    await invoice.save();
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
});

router.put('/invoices/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
});

router.delete('/invoices/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const invoice = await Invoice.findOne({ _id: req.params.id, tenantId });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    if (invoice.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Can only delete draft invoices' });
    }
    await invoice.deleteOne();
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// BILLS
// ============================================

router.get('/bills', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { status, vendorId, startDate, endDate } = req.query;
    const filter = { tenantId };
    if (status) filter.status = status;
    if (vendorId) filter.vendorId = vendorId;
    if (startDate || endDate) {
      filter.billDate = {};
      if (startDate) filter.billDate.$gte = new Date(startDate);
      if (endDate) filter.billDate.$lte = new Date(endDate);
    }

    const bills = await Bill.find(filter)
      .populate('vendorId')
      .sort({ billDate: -1 });
    res.json({ success: true, data: bills });
  } catch (error) {
    next(error);
  }
});

router.get('/bills/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const bill = await Bill.findOne({ _id: req.params.id, tenantId })
      .populate('vendorId');
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    res.json({ success: true, data: bill });
  } catch (error) {
    next(error);
  }
});

router.post('/bills', [
  body('vendorId').notEmpty(),
  body('lines').isArray({ min: 1 }),
], validate, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);

    const count = await Bill.countDocuments({ tenantId });
    const billNumber = `BILL-${String(count + 1).padStart(5, '0')}`;

    const vendor = await Vendor.findById(req.body.vendorId);
    let dueDate = req.body.dueDate;
    if (!dueDate && vendor) {
      const days = {
        NET_15: 15, NET_30: 30, NET_45: 45, NET_60: 60, DUE_ON_RECEIPT: 0,
      }[vendor.paymentTerms] || 30;
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + days);
    }

    const bill = new Bill({
      ...req.body,
      tenantId,
      siteId: getSiteId(req),
      billNumber,
      dueDate,
    });
    await bill.save();
    res.status(201).json({ success: true, data: bill });
  } catch (error) {
    next(error);
  }
});

router.put('/bills/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const bill = await Bill.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    res.json({ success: true, data: bill });
  } catch (error) {
    next(error);
  }
});

router.delete('/bills/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const bill = await Bill.findOne({ _id: req.params.id, tenantId });
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    if (bill.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Can only delete draft bills' });
    }
    await bill.deleteOne();
    res.json({ success: true, message: 'Bill deleted' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// CHECKS
// ============================================

router.get('/checks', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { status, vendorId, bankAccountId } = req.query;
    const filter = { tenantId };
    if (status) filter.status = status;
    if (vendorId) filter.vendorId = vendorId;
    if (bankAccountId) filter.bankAccountId = bankAccountId;

    const checks = await Check.find(filter)
      .populate('vendorId')
      .populate('bankAccountId')
      .sort({ checkDate: -1 });
    res.json({ success: true, data: checks });
  } catch (error) {
    next(error);
  }
});

router.get('/checks/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const check = await Check.findOne({ _id: req.params.id, tenantId })
      .populate('vendorId')
      .populate('bankAccountId');
    if (!check) {
      return res.status(404).json({ success: false, message: 'Check not found' });
    }
    res.json({ success: true, data: check });
  } catch (error) {
    next(error);
  }
});

router.post('/checks', [
  body('bankAccountId').notEmpty(),
  body('amount').isNumeric(),
], validate, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);

    // Get next check number for this bank account
    const lastCheck = await Check.findOne({ tenantId, bankAccountId: req.body.bankAccountId })
      .sort({ checkNumber: -1 });
    const nextNum = lastCheck ? parseInt(lastCheck.checkNumber) + 1 : 1001;
    const checkNumber = req.body.checkNumber || String(nextNum);

    const check = new Check({
      ...req.body,
      tenantId,
      siteId: getSiteId(req),
      checkNumber,
    });
    await check.save();
    res.status(201).json({ success: true, data: check });
  } catch (error) {
    next(error);
  }
});

router.put('/checks/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const check = await Check.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!check) {
      return res.status(404).json({ success: false, message: 'Check not found' });
    }
    res.json({ success: true, data: check });
  } catch (error) {
    next(error);
  }
});

router.post('/checks/:id/void', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const check = await Check.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { status: 'VOID' },
      { new: true }
    );
    if (!check) {
      return res.status(404).json({ success: false, message: 'Check not found' });
    }
    res.json({ success: true, data: check });
  } catch (error) {
    next(error);
  }
});

// ============================================
// RECEIPTS
// ============================================

router.get('/receipts', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { status, customerId } = req.query;
    const filter = { tenantId };
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;

    const receipts = await Receipt.find(filter)
      .populate('customerId')
      .sort({ receiptDate: -1 });
    res.json({ success: true, data: receipts });
  } catch (error) {
    next(error);
  }
});

router.get('/receipts/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const receipt = await Receipt.findOne({ _id: req.params.id, tenantId })
      .populate('customerId');
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }
    res.json({ success: true, data: receipt });
  } catch (error) {
    next(error);
  }
});

router.post('/receipts', [
  body('depositAccountId').notEmpty(),
  body('amount').isNumeric(),
], validate, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);

    const count = await Receipt.countDocuments({ tenantId });
    const receiptNumber = `RCP-${String(count + 1).padStart(5, '0')}`;

    const receipt = new Receipt({
      ...req.body,
      tenantId,
      siteId: getSiteId(req),
      receiptNumber,
    });
    await receipt.save();

    // Update invoice payments if specified
    if (req.body.invoicePayments?.length) {
      for (const payment of req.body.invoicePayments) {
        await Invoice.findByIdAndUpdate(payment.invoiceId, {
          $inc: { amountPaid: payment.amount },
        });
      }
    }

    res.status(201).json({ success: true, data: receipt });
  } catch (error) {
    next(error);
  }
});

router.put('/receipts/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const receipt = await Receipt.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }
    res.json({ success: true, data: receipt });
  } catch (error) {
    next(error);
  }
});

// ============================================
// DEPOSITS
// ============================================

router.get('/deposits', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { status, bankAccountId } = req.query;
    const filter = { tenantId };
    if (status) filter.status = status;
    if (bankAccountId) filter.bankAccountId = bankAccountId;

    const deposits = await Deposit.find(filter)
      .populate('bankAccountId')
      .populate('receipts')
      .sort({ depositDate: -1 });
    res.json({ success: true, data: deposits });
  } catch (error) {
    next(error);
  }
});

router.get('/deposits/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const deposit = await Deposit.findOne({ _id: req.params.id, tenantId })
      .populate('bankAccountId')
      .populate('receipts');
    if (!deposit) {
      return res.status(404).json({ success: false, message: 'Deposit not found' });
    }
    res.json({ success: true, data: deposit });
  } catch (error) {
    next(error);
  }
});

router.post('/deposits', [
  body('bankAccountId').notEmpty(),
  body('receipts').isArray({ min: 1 }),
], validate, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);

    const count = await Deposit.countDocuments({ tenantId });
    const depositNumber = `DEP-${String(count + 1).padStart(5, '0')}`;

    // Calculate total from receipts
    const receipts = await Receipt.find({ _id: { $in: req.body.receipts } });
    const totalAmount = receipts.reduce((sum, r) => sum + r.amount, 0);

    const deposit = new Deposit({
      ...req.body,
      tenantId,
      siteId: getSiteId(req),
      depositNumber,
      totalAmount,
    });
    await deposit.save();

    // Update receipts to mark as deposited
    await Receipt.updateMany(
      { _id: { $in: req.body.receipts } },
      { status: 'DEPOSITED', depositId: deposit._id }
    );

    res.status(201).json({ success: true, data: deposit });
  } catch (error) {
    next(error);
  }
});

router.put('/deposits/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const deposit = await Deposit.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!deposit) {
      return res.status(404).json({ success: false, message: 'Deposit not found' });
    }
    res.json({ success: true, data: deposit });
  } catch (error) {
    next(error);
  }
});

// ============================================
// BANK RECONCILIATION
// ============================================

router.get('/reconciliations', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { bankAccountId, status } = req.query;
    const filter = { tenantId };
    if (bankAccountId) filter.bankAccountId = bankAccountId;
    if (status) filter.status = status;

    const reconciliations = await BankReconciliation.find(filter)
      .populate('bankAccountId')
      .sort({ statementDate: -1 });
    res.json({ success: true, data: reconciliations });
  } catch (error) {
    next(error);
  }
});

router.get('/reconciliations/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const reconciliation = await BankReconciliation.findOne({ _id: req.params.id, tenantId })
      .populate('bankAccountId');
    if (!reconciliation) {
      return res.status(404).json({ success: false, message: 'Reconciliation not found' });
    }
    res.json({ success: true, data: reconciliation });
  } catch (error) {
    next(error);
  }
});

router.post('/reconciliations', [
  body('bankAccountId').notEmpty(),
  body('statementDate').notEmpty(),
  body('statementEndingBalance').isNumeric(),
], validate, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);

    // Get last reconciliation for beginning balance
    const lastRecon = await BankReconciliation.findOne({
      tenantId,
      bankAccountId: req.body.bankAccountId,
      status: 'COMPLETED',
    }).sort({ statementDate: -1 });

    const beginningBalance = lastRecon?.statementEndingBalance || 0;

    // Get uncleared checks and deposits
    const unclearedChecks = await Check.find({
      tenantId,
      bankAccountId: req.body.bankAccountId,
      status: { $in: ['PRINTED', 'CLEARED'] },
    });

    const unclearedDeposits = await Deposit.find({
      tenantId,
      bankAccountId: req.body.bankAccountId,
      status: { $in: ['DEPOSITED', 'CLEARED'] },
    });

    const items = [
      ...unclearedChecks.map((c) => ({
        type: 'CHECK',
        referenceId: c._id,
        refModel: 'Check',
        date: c.checkDate,
        description: `Check #${c.checkNumber}`,
        amount: -c.amount,
        cleared: false,
      })),
      ...unclearedDeposits.map((d) => ({
        type: 'DEPOSIT',
        referenceId: d._id,
        refModel: 'Deposit',
        date: d.depositDate,
        description: `Deposit #${d.depositNumber}`,
        amount: d.totalAmount,
        cleared: false,
      })),
    ];

    const reconciliation = new BankReconciliation({
      ...req.body,
      tenantId,
      siteId: getSiteId(req),
      beginningBalance,
      items,
    });
    await reconciliation.save();
    res.status(201).json({ success: true, data: reconciliation });
  } catch (error) {
    next(error);
  }
});

router.put('/reconciliations/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const reconciliation = await BankReconciliation.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!reconciliation) {
      return res.status(404).json({ success: false, message: 'Reconciliation not found' });
    }
    res.json({ success: true, data: reconciliation });
  } catch (error) {
    next(error);
  }
});

router.post('/reconciliations/:id/complete', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const reconciliation = await BankReconciliation.findOne({ _id: req.params.id, tenantId });

    if (!reconciliation) {
      return res.status(404).json({ success: false, message: 'Reconciliation not found' });
    }

    if (Math.abs(reconciliation.difference) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Cannot complete reconciliation with non-zero difference',
      });
    }

    // Mark checks and deposits as reconciled
    const clearedCheckIds = reconciliation.items
      .filter((i) => i.type === 'CHECK' && i.cleared)
      .map((i) => i.referenceId);
    const clearedDepositIds = reconciliation.items
      .filter((i) => i.type === 'DEPOSIT' && i.cleared)
      .map((i) => i.referenceId);

    await Check.updateMany({ _id: { $in: clearedCheckIds } }, { status: 'RECONCILED' });
    await Deposit.updateMany({ _id: { $in: clearedDepositIds } }, { status: 'RECONCILED' });

    reconciliation.status = 'COMPLETED';
    reconciliation.completedAt = new Date();
    await reconciliation.save();

    res.json({ success: true, data: reconciliation });
  } catch (error) {
    next(error);
  }
});

// ============================================
// FINANCIAL REPORTS
// ============================================

// Trial Balance
router.get('/reports/trial-balance', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { asOfDate } = req.query;

    const accounts = await Account.find({ tenantId, isActive: true }).sort({ code: 1 });

    const dateFilter = asOfDate ? { occurredAt: { $lte: new Date(asOfDate) } } : {};

    const balances = await LedgerEntry.aggregate([
      { $match: { tenantId, ...dateFilter } },
      {
        $group: {
          _id: '$accountId',
          totalDebit: { $sum: '$debit' },
          totalCredit: { $sum: '$credit' },
        },
      },
    ]);

    const balanceMap = new Map(balances.map((b) => [b._id.toString(), b]));

    const trialBalance = accounts.map((account) => {
      const balance = balanceMap.get(account._id.toString()) || { totalDebit: 0, totalCredit: 0 };
      const netBalance = account.normalBalance === 'DEBIT'
        ? balance.totalDebit - balance.totalCredit
        : balance.totalCredit - balance.totalDebit;

      return {
        accountId: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        debit: account.normalBalance === 'DEBIT' && netBalance > 0 ? netBalance : 0,
        credit: account.normalBalance === 'CREDIT' && netBalance > 0 ? netBalance : 0,
      };
    });

    const totals = trialBalance.reduce(
      (acc, row) => ({
        debit: acc.debit + row.debit,
        credit: acc.credit + row.credit,
      }),
      { debit: 0, credit: 0 }
    );

    res.json({ success: true, data: { accounts: trialBalance, totals } });
  } catch (error) {
    next(error);
  }
});

// Income Statement
router.get('/reports/income-statement', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const accounts = await Account.find({
      tenantId,
      type: { $in: ['INCOME', 'EXPENSE', 'COGS'] },
      isActive: true,
    }).sort({ code: 1 });

    const filter = { tenantId };
    if (Object.keys(dateFilter).length) filter.occurredAt = dateFilter;

    const balances = await LedgerEntry.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$accountId',
          totalDebit: { $sum: '$debit' },
          totalCredit: { $sum: '$credit' },
        },
      },
    ]);

    const balanceMap = new Map(balances.map((b) => [b._id.toString(), b]));

    const income = [];
    const expenses = [];
    const cogs = [];
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalCogs = 0;

    accounts.forEach((account) => {
      const balance = balanceMap.get(account._id.toString()) || { totalDebit: 0, totalCredit: 0 };
      const amount = account.normalBalance === 'CREDIT'
        ? balance.totalCredit - balance.totalDebit
        : balance.totalDebit - balance.totalCredit;

      const row = {
        accountId: account.id,
        code: account.code,
        name: account.name,
        amount,
      };

      if (account.type === 'INCOME') {
        income.push(row);
        totalIncome += amount;
      } else if (account.type === 'EXPENSE') {
        expenses.push(row);
        totalExpenses += amount;
      } else {
        cogs.push(row);
        totalCogs += amount;
      }
    });

    res.json({
      success: true,
      data: {
        income,
        totalIncome,
        cogs,
        totalCogs,
        grossProfit: totalIncome - totalCogs,
        expenses,
        totalExpenses,
        netIncome: totalIncome - totalCogs - totalExpenses,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Balance Sheet
router.get('/reports/balance-sheet', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { asOfDate } = req.query;

    const dateFilter = asOfDate ? { occurredAt: { $lte: new Date(asOfDate) } } : {};

    const accounts = await Account.find({
      tenantId,
      type: { $in: ['ASSET', 'LIABILITY', 'EQUITY'] },
      isActive: true,
    }).sort({ code: 1 });

    const filter = { tenantId, ...dateFilter };

    const balances = await LedgerEntry.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$accountId',
          totalDebit: { $sum: '$debit' },
          totalCredit: { $sum: '$credit' },
        },
      },
    ]);

    const balanceMap = new Map(balances.map((b) => [b._id.toString(), b]));

    const assets = [];
    const liabilities = [];
    const equity = [];
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    accounts.forEach((account) => {
      const balance = balanceMap.get(account._id.toString()) || { totalDebit: 0, totalCredit: 0 };
      const amount = account.normalBalance === 'DEBIT'
        ? balance.totalDebit - balance.totalCredit
        : balance.totalCredit - balance.totalDebit;

      const row = {
        accountId: account.id,
        code: account.code,
        name: account.name,
        subtype: account.subtype,
        amount,
      };

      if (account.type === 'ASSET') {
        assets.push(row);
        totalAssets += amount;
      } else if (account.type === 'LIABILITY') {
        liabilities.push(row);
        totalLiabilities += amount;
      } else {
        equity.push(row);
        totalEquity += amount;
      }
    });

    res.json({
      success: true,
      data: {
        assets,
        totalAssets,
        liabilities,
        totalLiabilities,
        equity,
        totalEquity,
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Transaction Inquiry
router.get('/transactions', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { accountId, startDate, endDate, limit = 100, offset = 0 } = req.query;

    const filter = { tenantId };
    if (accountId) filter.accountId = accountId;
    if (startDate || endDate) {
      filter.occurredAt = {};
      if (startDate) filter.occurredAt.$gte = new Date(startDate);
      if (endDate) filter.occurredAt.$lte = new Date(endDate);
    }

    const entries = await LedgerEntry.find(filter)
      .populate('accountId')
      .populate('transactionId')
      .sort({ occurredAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    const total = await LedgerEntry.countDocuments(filter);

    res.json({
      success: true,
      data: entries,
      pagination: { total, limit: parseInt(limit), offset: parseInt(offset) },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
