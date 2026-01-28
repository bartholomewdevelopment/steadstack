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
  JournalEntry,
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

// Send/Post an invoice to the ledger
// Dr. Accounts Receivable
// Cr. Revenue accounts (from line items)
router.post('/invoices/:id/send', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const invoice = await Invoice.findOne({ _id: req.params.id, tenantId }).populate('customerId');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Only draft invoices can be sent/posted',
      });
    }

    if (invoice.ledgerTransactionId) {
      return res.status(400).json({ success: false, message: 'Invoice has already been posted' });
    }

    // Validate all lines have accountId for posting
    const invalidLines = invoice.lineItems.filter(line => !line.accountId);
    if (invalidLines.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'All invoice line items must have a revenue account assigned before sending',
      });
    }

    // Get the default A/R account
    const arAccount = await Account.findOne({
      tenantId,
      isActive: true,
      $or: [{ subtype: 'AR' }, { code: { $regex: /receivable/i } }],
    });

    if (!arAccount) {
      return res.status(400).json({
        success: false,
        message: 'No Accounts Receivable account found. Please set up an A/R account first.',
      });
    }

    // Create ledger transaction
    const transaction = new LedgerTransaction({
      tenantId,
      siteId: invoice.siteId,
      transactionDate: invoice.invoiceDate,
      description: `Invoice: ${invoice.invoiceNumber} - ${invoice.customerId?.name || 'Customer'}`,
      sourceType: 'INVOICE',
      sourceId: invoice._id.toString(),
      reference: invoice.invoiceNumber,
      status: 'POSTED',
      idempotencyKey: `invoice-${invoice._id.toString()}`,
    });

    await transaction.save();

    const ledgerEntries = [];

    // Debit A/R for the total
    ledgerEntries.push({
      tenantId,
      transactionId: transaction._id,
      accountId: arAccount._id,
      occurredAt: invoice.invoiceDate,
      debit: invoice.total,
      credit: 0,
      memo: `Invoice ${invoice.invoiceNumber} - ${invoice.customerId?.name || ''}`,
      entityType: 'CUSTOMER',
      entityId: invoice.customerId?._id?.toString() || invoice.customerId?.toString(),
      idempotencyKey: `invoice-${invoice._id.toString()}-ar`,
    });

    // Credit revenue accounts for each line item
    for (const line of invoice.lineItems) {
      ledgerEntries.push({
        tenantId,
        transactionId: transaction._id,
        accountId: line.accountId,
        occurredAt: invoice.invoiceDate,
        debit: 0,
        credit: line.amount || (line.quantity * line.unitPrice),
        memo: line.description || invoice.invoiceNumber,
        entityType: 'CUSTOMER',
        entityId: invoice.customerId?._id?.toString() || invoice.customerId?.toString(),
        idempotencyKey: `invoice-${invoice._id.toString()}-line-${line._id || Math.random()}`,
      });
    }

    await LedgerEntry.insertMany(ledgerEntries);

    // Update invoice status
    invoice.status = 'SENT';
    invoice.ledgerTransactionId = transaction._id;
    invoice.sentAt = new Date();
    invoice.sentBy = req.user?.uid || req.user?.userId;
    await invoice.save();

    res.json({
      success: true,
      data: invoice,
      ledgerTransactionId: transaction._id.toString(),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This invoice has already been posted',
      });
    }
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

// Post a bill to the ledger
// Dr. Expense/Inventory accounts (from line items)
// Cr. Accounts Payable
router.post('/bills/:id/post', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const bill = await Bill.findOne({ _id: req.params.id, tenantId }).populate('vendorId');

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    if (bill.status === 'POSTED' || bill.ledgerTransactionId) {
      return res.status(400).json({ success: false, message: 'Bill has already been posted' });
    }

    // Validate all lines have accountId for posting
    const invalidLines = bill.lineItems.filter(line => !line.accountId);
    if (invalidLines.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'All bill line items must have an expense account assigned before posting',
      });
    }

    // Get the default A/P account (by subtype or code)
    const apAccount = await Account.findOne({
      tenantId,
      isActive: true,
      $or: [{ subtype: 'AP' }, { code: { $regex: /payable/i } }],
    });

    if (!apAccount) {
      return res.status(400).json({
        success: false,
        message: 'No Accounts Payable account found. Please set up an A/P account first.',
      });
    }

    // Create ledger transaction
    const transaction = new LedgerTransaction({
      tenantId,
      siteId: bill.siteId,
      transactionDate: bill.billDate,
      description: `Vendor Bill: ${bill.billNumber} - ${bill.vendorId?.name || 'Unknown Vendor'}`,
      sourceType: 'BILL',
      sourceId: bill._id.toString(),
      reference: bill.billNumber,
      status: 'POSTED',
      idempotencyKey: `bill-${bill._id.toString()}`,
    });

    await transaction.save();

    // Create ledger entries - debits for expense accounts
    const ledgerEntries = [];

    for (const line of bill.lineItems) {
      ledgerEntries.push({
        tenantId,
        transactionId: transaction._id,
        accountId: line.accountId,
        occurredAt: bill.billDate,
        debit: line.amount || (line.quantity * line.unitPrice),
        credit: 0,
        memo: line.description || bill.billNumber,
        entityType: 'VENDOR',
        entityId: bill.vendorId?._id?.toString() || bill.vendorId?.toString(),
        idempotencyKey: `bill-${bill._id.toString()}-line-${line._id || Math.random()}`,
      });
    }

    // Credit A/P for the total
    ledgerEntries.push({
      tenantId,
      transactionId: transaction._id,
      accountId: apAccount._id,
      occurredAt: bill.billDate,
      debit: 0,
      credit: bill.total,
      memo: `Bill ${bill.billNumber} - ${bill.vendorId?.name || ''}`,
      entityType: 'VENDOR',
      entityId: bill.vendorId?._id?.toString() || bill.vendorId?.toString(),
      idempotencyKey: `bill-${bill._id.toString()}-ap`,
    });

    await LedgerEntry.insertMany(ledgerEntries);

    // Update bill status
    bill.status = 'POSTED';
    bill.ledgerTransactionId = transaction._id;
    bill.postedAt = new Date();
    bill.postedBy = req.user?.uid || req.user?.userId;
    await bill.save();

    res.json({
      success: true,
      data: bill,
      ledgerTransactionId: transaction._id.toString(),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This bill has already been posted',
      });
    }
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

// Post a check to the ledger
// Dr. Accounts Payable (for bill payments) or Expense accounts (for direct expenses)
// Cr. Cash/Bank account
router.post('/checks/:id/post', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const check = await Check.findOne({ _id: req.params.id, tenantId })
      .populate('vendorId')
      .populate('bankAccountId');

    if (!check) {
      return res.status(404).json({ success: false, message: 'Check not found' });
    }

    if (check.status === 'POSTED' || check.ledgerTransactionId) {
      return res.status(400).json({ success: false, message: 'Check has already been posted' });
    }

    if (check.status === 'VOID') {
      return res.status(400).json({ success: false, message: 'Cannot post a voided check' });
    }

    if (!check.bankAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Check must have a bank account assigned',
      });
    }

    // Get the default A/P account
    const apAccount = await Account.findOne({
      tenantId,
      isActive: true,
      $or: [{ subtype: 'AP' }, { code: { $regex: /payable/i } }],
    });

    // Create ledger transaction
    const transaction = new LedgerTransaction({
      tenantId,
      siteId: check.siteId,
      transactionDate: check.checkDate,
      description: `Check #${check.checkNumber} - ${check.vendorId?.name || check.payee || 'Payment'}`,
      sourceType: 'CHECK',
      sourceId: check._id.toString(),
      reference: check.checkNumber,
      status: 'POSTED',
      idempotencyKey: `check-${check._id.toString()}`,
    });

    await transaction.save();

    const ledgerEntries = [];

    // If this check has bill payments, debit A/P for those
    if (check.billPayments && check.billPayments.length > 0 && apAccount) {
      let totalBillPayments = 0;
      for (const payment of check.billPayments) {
        totalBillPayments += payment.amount || 0;

        // Update the bill's paid amount
        if (payment.billId) {
          const bill = await Bill.findById(payment.billId);
          if (bill) {
            bill.amountPaid = (bill.amountPaid || 0) + (payment.amount || 0);
            bill.balance = bill.total - bill.amountPaid;
            if (bill.balance <= 0.01) {
              bill.status = 'PAID';
            } else if (bill.amountPaid > 0) {
              bill.status = 'PARTIALLY_PAID';
            }
            await bill.save();
          }
        }
      }

      if (totalBillPayments > 0) {
        ledgerEntries.push({
          tenantId,
          transactionId: transaction._id,
          accountId: apAccount._id,
          occurredAt: check.checkDate,
          debit: totalBillPayments,
          credit: 0,
          memo: `Check #${check.checkNumber} - Bill Payments`,
          entityType: 'VENDOR',
          entityId: check.vendorId?._id?.toString(),
          idempotencyKey: `check-${check._id.toString()}-ap`,
        });
      }
    }

    // If this check has expense lines (direct expenses), debit those accounts
    if (check.expenseLines && check.expenseLines.length > 0) {
      for (const line of check.expenseLines) {
        if (line.accountId && line.amount > 0) {
          ledgerEntries.push({
            tenantId,
            transactionId: transaction._id,
            accountId: line.accountId,
            occurredAt: check.checkDate,
            debit: line.amount,
            credit: 0,
            memo: line.description || `Check #${check.checkNumber}`,
            idempotencyKey: `check-${check._id.toString()}-exp-${line._id || Math.random()}`,
          });
        }
      }
    }

    // If no bill payments or expense lines, debit A/P for the full amount (generic payment)
    if (ledgerEntries.length === 0 && apAccount) {
      ledgerEntries.push({
        tenantId,
        transactionId: transaction._id,
        accountId: apAccount._id,
        occurredAt: check.checkDate,
        debit: check.amount,
        credit: 0,
        memo: `Check #${check.checkNumber} - Payment`,
        entityType: 'VENDOR',
        entityId: check.vendorId?._id?.toString(),
        idempotencyKey: `check-${check._id.toString()}-ap`,
      });
    }

    // Credit the bank account for the total check amount
    ledgerEntries.push({
      tenantId,
      transactionId: transaction._id,
      accountId: check.bankAccountId._id || check.bankAccountId,
      occurredAt: check.checkDate,
      debit: 0,
      credit: check.amount,
      memo: `Check #${check.checkNumber}`,
      idempotencyKey: `check-${check._id.toString()}-bank`,
    });

    await LedgerEntry.insertMany(ledgerEntries);

    // Update check status
    check.status = 'POSTED';
    check.ledgerTransactionId = transaction._id;
    check.postedAt = new Date();
    check.postedBy = req.user?.uid || req.user?.userId;
    await check.save();

    res.json({
      success: true,
      data: check,
      ledgerTransactionId: transaction._id.toString(),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This check has already been posted',
      });
    }
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

// Post a customer receipt to the ledger
// Dr. Cash/Bank account
// Cr. Accounts Receivable (for invoice payments) or Income accounts
router.post('/receipts/:id/post', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const receipt = await Receipt.findOne({ _id: req.params.id, tenantId })
      .populate('customerId')
      .populate('depositAccountId');

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    if (receipt.status === 'POSTED' || receipt.ledgerTransactionId) {
      return res.status(400).json({ success: false, message: 'Receipt has already been posted' });
    }

    if (!receipt.depositAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Receipt must have a deposit account assigned',
      });
    }

    // Get the default A/R account
    const arAccount = await Account.findOne({
      tenantId,
      isActive: true,
      $or: [{ subtype: 'AR' }, { code: { $regex: /receivable/i } }],
    });

    // Create ledger transaction
    const transaction = new LedgerTransaction({
      tenantId,
      siteId: receipt.siteId,
      transactionDate: receipt.receiptDate,
      description: `Receipt - ${receipt.customerId?.name || 'Customer Payment'}`,
      sourceType: 'RECEIPT',
      sourceId: receipt._id.toString(),
      reference: receipt.referenceNumber || receipt._id.toString().slice(-6),
      status: 'POSTED',
      idempotencyKey: `receipt-${receipt._id.toString()}`,
    });

    await transaction.save();

    const ledgerEntries = [];

    // Debit the deposit/cash account for the total
    ledgerEntries.push({
      tenantId,
      transactionId: transaction._id,
      accountId: receipt.depositAccountId._id || receipt.depositAccountId,
      occurredAt: receipt.receiptDate,
      debit: receipt.amount,
      credit: 0,
      memo: `Receipt from ${receipt.customerId?.name || 'Customer'}`,
      idempotencyKey: `receipt-${receipt._id.toString()}-cash`,
    });

    // If this receipt has invoice payments, credit A/R
    if (receipt.invoicePayments && receipt.invoicePayments.length > 0 && arAccount) {
      let totalInvoicePayments = 0;

      for (const payment of receipt.invoicePayments) {
        totalInvoicePayments += payment.amount || 0;

        // Update the invoice's paid amount
        if (payment.invoiceId) {
          const invoice = await Invoice.findById(payment.invoiceId);
          if (invoice) {
            invoice.amountPaid = (invoice.amountPaid || 0) + (payment.amount || 0);
            invoice.balance = invoice.total - invoice.amountPaid;
            if (invoice.balance <= 0.01) {
              invoice.status = 'PAID';
            } else if (invoice.amountPaid > 0) {
              invoice.status = 'PARTIAL';
            }
            await invoice.save();
          }
        }
      }

      if (totalInvoicePayments > 0) {
        ledgerEntries.push({
          tenantId,
          transactionId: transaction._id,
          accountId: arAccount._id,
          occurredAt: receipt.receiptDate,
          debit: 0,
          credit: totalInvoicePayments,
          memo: `Receipt - Invoice Payments`,
          entityType: 'CUSTOMER',
          entityId: receipt.customerId?._id?.toString(),
          idempotencyKey: `receipt-${receipt._id.toString()}-ar`,
        });
      }

      // If there's a difference, it might be income (overpayment, etc.)
      const difference = receipt.amount - totalInvoicePayments;
      if (difference > 0.01) {
        // Get a default income account or use A/R as fallback
        const incomeAccount = await Account.findOne({
          tenantId,
          isActive: true,
          type: 'INCOME',
        });

        if (incomeAccount) {
          ledgerEntries.push({
            tenantId,
            transactionId: transaction._id,
            accountId: incomeAccount._id,
            occurredAt: receipt.receiptDate,
            debit: 0,
            credit: difference,
            memo: `Receipt - Other Income`,
            idempotencyKey: `receipt-${receipt._id.toString()}-income`,
          });
        }
      }
    } else if (arAccount) {
      // No invoice payments specified, credit A/R for the full amount
      ledgerEntries.push({
        tenantId,
        transactionId: transaction._id,
        accountId: arAccount._id,
        occurredAt: receipt.receiptDate,
        debit: 0,
        credit: receipt.amount,
        memo: `Receipt from ${receipt.customerId?.name || 'Customer'}`,
        entityType: 'CUSTOMER',
        entityId: receipt.customerId?._id?.toString(),
        idempotencyKey: `receipt-${receipt._id.toString()}-ar`,
      });
    }

    await LedgerEntry.insertMany(ledgerEntries);

    // Update receipt status
    receipt.status = 'POSTED';
    receipt.ledgerTransactionId = transaction._id;
    receipt.postedAt = new Date();
    receipt.postedBy = req.user?.uid || req.user?.userId;
    await receipt.save();

    res.json({
      success: true,
      data: receipt,
      ledgerTransactionId: transaction._id.toString(),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This receipt has already been posted',
      });
    }
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

// ============================================
// JOURNAL ENTRIES (Manual Entries)
// ============================================

// Get next journal entry number
const getNextJournalEntryNumber = async (tenantId) => {
  const lastEntry = await JournalEntry.findOne({ tenantId })
    .sort({ entryNumber: -1 })
    .select('entryNumber');

  if (!lastEntry) {
    return 'JE-00001';
  }

  const lastNum = parseInt(lastEntry.entryNumber.replace('JE-', ''), 10);
  return `JE-${String(lastNum + 1).padStart(5, '0')}`;
};

// List journal entries
router.get('/journal-entries', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { status, startDate, endDate, limit = 50, offset = 0 } = req.query;

    const filter = { tenantId };
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.entryDate = {};
      if (startDate) filter.entryDate.$gte = new Date(startDate);
      if (endDate) filter.entryDate.$lte = new Date(endDate);
    }

    const entries = await JournalEntry.find(filter)
      .sort({ entryDate: -1, entryNumber: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    const total = await JournalEntry.countDocuments(filter);

    res.json({
      success: true,
      data: entries,
      pagination: { total, limit: parseInt(limit), offset: parseInt(offset) },
    });
  } catch (error) {
    next(error);
  }
});

// Get single journal entry
router.get('/journal-entries/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const entry = await JournalEntry.findOne({ _id: req.params.id, tenantId })
      .populate('lines.accountId', 'code name type');

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Journal entry not found' });
    }

    res.json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
});

// Create journal entry (draft)
router.post('/journal-entries', [
  body('entryDate').optional().isISO8601(),
  body('lines').isArray({ min: 2 }).withMessage('At least 2 lines required'),
  body('lines.*.accountId').notEmpty().withMessage('Account ID is required'),
], validate, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const siteId = getSiteId(req);

    // Get next entry number
    const entryNumber = await getNextJournalEntryNumber(tenantId);

    // Denormalize account info on lines
    const lines = [];
    for (let i = 0; i < req.body.lines.length; i++) {
      const line = req.body.lines[i];
      const account = await Account.findById(line.accountId);
      if (!account) {
        return res.status(400).json({
          success: false,
          message: `Account not found for line ${i + 1}`,
        });
      }

      lines.push({
        lineNumber: i + 1,
        accountId: line.accountId,
        accountCode: account.code,
        accountName: account.name,
        description: line.description || '',
        debit: parseFloat(line.debit) || 0,
        credit: parseFloat(line.credit) || 0,
        entityType: line.entityType,
        entityId: line.entityId,
      });
    }

    const entry = new JournalEntry({
      tenantId,
      siteId,
      entryNumber,
      entryDate: req.body.entryDate || new Date(),
      reference: req.body.reference,
      memo: req.body.memo,
      lines,
      status: 'DRAFT',
      createdBy: req.user?.uid || req.user?.userId,
    });

    await entry.save();

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
});

// Update journal entry (draft only)
router.put('/journal-entries/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const entry = await JournalEntry.findOne({ _id: req.params.id, tenantId });

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Journal entry not found' });
    }

    if (entry.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Only draft entries can be updated',
      });
    }

    // Update allowed fields
    if (req.body.entryDate) entry.entryDate = new Date(req.body.entryDate);
    if (req.body.reference !== undefined) entry.reference = req.body.reference;
    if (req.body.memo !== undefined) entry.memo = req.body.memo;

    // Update lines if provided
    if (req.body.lines && Array.isArray(req.body.lines)) {
      const lines = [];
      for (let i = 0; i < req.body.lines.length; i++) {
        const line = req.body.lines[i];
        const account = await Account.findById(line.accountId);
        if (!account) {
          return res.status(400).json({
            success: false,
            message: `Account not found for line ${i + 1}`,
          });
        }

        lines.push({
          lineNumber: i + 1,
          accountId: line.accountId,
          accountCode: account.code,
          accountName: account.name,
          description: line.description || '',
          debit: parseFloat(line.debit) || 0,
          credit: parseFloat(line.credit) || 0,
          entityType: line.entityType,
          entityId: line.entityId,
        });
      }
      entry.lines = lines;
    }

    await entry.save();

    res.json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
});

// Delete journal entry (draft only)
router.delete('/journal-entries/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const entry = await JournalEntry.findOne({ _id: req.params.id, tenantId });

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Journal entry not found' });
    }

    if (entry.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Only draft entries can be deleted',
      });
    }

    await entry.deleteOne();

    res.json({ success: true, message: 'Journal entry deleted' });
  } catch (error) {
    next(error);
  }
});

// Post journal entry to ledger
router.post('/journal-entries/:id/post', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const entry = await JournalEntry.findOne({ _id: req.params.id, tenantId });

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Journal entry not found' });
    }

    if (entry.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Only draft entries can be posted',
      });
    }

    if (!entry.isBalanced) {
      return res.status(400).json({
        success: false,
        message: `Entry is not balanced. Debits: ${entry.totalDebits}, Credits: ${entry.totalCredits}`,
      });
    }

    // Create ledger transaction
    const transaction = new LedgerTransaction({
      tenantId,
      siteId: entry.siteId,
      transactionDate: entry.entryDate,
      description: entry.memo || `Journal Entry ${entry.entryNumber}`,
      sourceType: 'JOURNAL_ENTRY',
      sourceId: entry._id.toString(),
      reference: entry.reference,
      status: 'POSTED',
      idempotencyKey: `je-${entry._id.toString()}`,
    });

    await transaction.save();

    // Create ledger entries
    const ledgerEntries = entry.lines.map((line) => ({
      tenantId,
      transactionId: transaction._id,
      accountId: line.accountId,
      occurredAt: entry.entryDate,
      debit: line.debit,
      credit: line.credit,
      memo: line.description,
      entityType: line.entityType,
      entityId: line.entityId,
      idempotencyKey: `je-${entry._id.toString()}-${line.lineNumber}`,
    }));

    await LedgerEntry.insertMany(ledgerEntries);

    // Update journal entry status
    entry.status = 'POSTED';
    entry.ledgerTransactionId = transaction._id;
    entry.postedAt = new Date();
    entry.postedBy = req.user?.uid || req.user?.userId;
    await entry.save();

    res.json({
      success: true,
      data: entry,
      ledgerTransactionId: transaction._id.toString(),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This entry has already been posted',
      });
    }
    next(error);
  }
});

// Reverse a posted journal entry
router.post('/journal-entries/:id/reverse', [
  body('reason').optional().isString(),
], validate, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const entry = await JournalEntry.findOne({ _id: req.params.id, tenantId });

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Journal entry not found' });
    }

    if (entry.status !== 'POSTED') {
      return res.status(400).json({
        success: false,
        message: 'Only posted entries can be reversed',
      });
    }

    if (entry.reversedByEntryId) {
      return res.status(400).json({
        success: false,
        message: 'This entry has already been reversed',
      });
    }

    // Create reversing entry with swapped debits/credits
    const reversingEntryNumber = await getNextJournalEntryNumber(tenantId);
    const reversingLines = entry.lines.map((line, idx) => ({
      lineNumber: idx + 1,
      accountId: line.accountId,
      accountCode: line.accountCode,
      accountName: line.accountName,
      description: `Reversal: ${line.description || ''}`.trim(),
      debit: line.credit, // Swap debit and credit
      credit: line.debit,
      entityType: line.entityType,
      entityId: line.entityId,
    }));

    const reversingEntry = new JournalEntry({
      tenantId,
      siteId: entry.siteId,
      entryNumber: reversingEntryNumber,
      entryDate: new Date(),
      reference: `REV-${entry.entryNumber}`,
      memo: `Reversal of ${entry.entryNumber}${req.body.reason ? ': ' + req.body.reason : ''}`,
      lines: reversingLines,
      status: 'DRAFT',
      reversesEntryId: entry._id,
      reversalReason: req.body.reason,
      createdBy: req.user?.uid || req.user?.userId,
    });

    await reversingEntry.save();

    // Post the reversing entry immediately
    const transaction = new LedgerTransaction({
      tenantId,
      siteId: entry.siteId,
      transactionDate: reversingEntry.entryDate,
      description: reversingEntry.memo,
      sourceType: 'JOURNAL_ENTRY',
      sourceId: reversingEntry._id.toString(),
      reference: reversingEntry.reference,
      status: 'POSTED',
      reversesTransactionId: entry.ledgerTransactionId,
      idempotencyKey: `je-${reversingEntry._id.toString()}`,
    });

    await transaction.save();

    const ledgerEntries = reversingEntry.lines.map((line) => ({
      tenantId,
      transactionId: transaction._id,
      accountId: line.accountId,
      occurredAt: reversingEntry.entryDate,
      debit: line.debit,
      credit: line.credit,
      memo: line.description,
      entityType: line.entityType,
      entityId: line.entityId,
      idempotencyKey: `je-${reversingEntry._id.toString()}-${line.lineNumber}`,
    }));

    await LedgerEntry.insertMany(ledgerEntries);

    // Update reversing entry status
    reversingEntry.status = 'POSTED';
    reversingEntry.ledgerTransactionId = transaction._id;
    reversingEntry.postedAt = new Date();
    reversingEntry.postedBy = req.user?.uid || req.user?.userId;
    await reversingEntry.save();

    // Update original entry
    entry.status = 'REVERSED';
    entry.reversedByEntryId = reversingEntry._id;
    entry.reversedAt = new Date();
    entry.reversedBy = req.user?.uid || req.user?.userId;
    await entry.save();

    // Update original transaction
    await LedgerTransaction.findByIdAndUpdate(entry.ledgerTransactionId, {
      status: 'REVERSED',
      reversedByTransactionId: transaction._id,
    });

    res.json({
      success: true,
      data: {
        originalEntry: entry,
        reversingEntry: reversingEntry,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// ACCOUNTING SETTINGS
// ============================================

// Get accounting settings for tenant
router.get('/settings', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);

    // For now, store settings in a simple structure
    // In future, could be a separate collection
    const settings = await Account.aggregate([
      { $match: { tenantId, isActive: true } },
      { $group: {
        _id: null,
        accounts: { $push: { id: '$_id', code: '$code', name: '$name', type: '$type', subtype: '$subtype' } }
      }}
    ]);

    // Find default accounts by subtype
    const accounts = settings[0]?.accounts || [];
    const apAccount = accounts.find(a => a.subtype === 'AP');
    const arAccount = accounts.find(a => a.subtype === 'AR');
    const cashAccount = accounts.find(a => a.subtype === 'CASH' || a.subtype === 'BANK');

    res.json({
      success: true,
      data: {
        defaultAPAccountId: apAccount?.id?.toString() || null,
        defaultARAccountId: arAccount?.id?.toString() || null,
        defaultCashAccountId: cashAccount?.id?.toString() || null,
        // Return available accounts for selection
        availableAccounts: {
          ap: accounts.filter(a => a.type === 'LIABILITY'),
          ar: accounts.filter(a => a.type === 'ASSET'),
          cash: accounts.filter(a => a.subtype === 'CASH' || a.subtype === 'BANK'),
          revenue: accounts.filter(a => a.type === 'INCOME'),
          expense: accounts.filter(a => a.type === 'EXPENSE' || a.type === 'COGS'),
        }
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
