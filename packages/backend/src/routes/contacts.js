const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const { checkPlanLimit, incrementUsageAfterCreate } = require('../middleware/planLimits');
const Contact = require('../models/Contact');
const { ContactType } = require('../models/Contact');
const firestoreService = require('../services/firestore');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Helper to get user context
const getUserContext = async (req) => {
  const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
  if (!userData) {
    throw new Error('User not found');
  }
  return userData;
};

/**
 * GET /api/contacts
 * List contacts with optional type filter
 */
router.get('/', async (req, res) => {
  try {
    const { tenantId } = await getUserContext(req);
    const { type, activeOnly = 'true', limit = 100, search } = req.query;

    const filter = { tenantId };

    if (type && Object.values(ContactType).includes(type)) {
      filter.type = type;
    }

    if (activeOnly === 'true') {
      filter.isActive = true;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    const contacts = await Contact.find(filter)
      .sort({ name: 1 })
      .limit(parseInt(limit))
      .lean();

    // Transform for JSON
    const transformedContacts = contacts.map(c => ({
      ...c,
      id: c._id.toString(),
      _id: undefined,
      __v: undefined,
    }));

    res.json({ success: true, data: { contacts: transformedContacts } });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/contacts/:id
 * Get a single contact
 */
router.get('/:id', async (req, res) => {
  try {
    const { tenantId } = await getUserContext(req);
    const contact = await Contact.findOne({
      _id: req.params.id,
      tenantId,
    }).lean();

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    res.json({
      success: true,
      data: {
        contact: {
          ...contact,
          id: contact._id.toString(),
          _id: undefined,
          __v: undefined,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/contacts
 * Create a new contact
 */
router.post(
  '/',
  [
    body('type')
      .notEmpty()
      .withMessage('Contact type is required')
      .isIn(Object.values(ContactType))
      .withMessage('Invalid contact type'),
    body('name').notEmpty().withMessage('Name is required'),
  ],
  checkPlanLimit('contacts'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      // Use tenant from middleware if available, otherwise fetch
      const tenantId = req.userData?.tenantId || (await getUserContext(req)).tenantId;

      const contactData = {
        tenantId,
        type: req.body.type,
        name: req.body.name,
        code: req.body.code || null,
        email: req.body.email || null,
        phone: req.body.phone || null,
        address: req.body.address || {},
        laborRate: req.body.laborRate || 0,
        notes: req.body.notes || null,
        isActive: req.body.isActive !== false,
      };

      // Add type-specific fields
      if (req.body.type === ContactType.VENDOR) {
        contactData.vendorFields = {
          paymentTerms: req.body.paymentTerms || 'NET_30',
          customTermsDays: req.body.customTermsDays,
          taxId: req.body.taxId,
          defaultExpenseAccountId: req.body.defaultExpenseAccountId,
          balance: 0,
        };
      }

      if (req.body.type === ContactType.CUSTOMER) {
        contactData.customerFields = {
          paymentTerms: req.body.paymentTerms || 'NET_30',
          customTermsDays: req.body.customTermsDays,
          creditLimit: req.body.creditLimit || 0,
          balance: 0,
        };
      }

      if (req.body.type === ContactType.EMPLOYEE || req.body.type === ContactType.CONTRACTOR) {
        contactData.employeeFields = {
          userId: req.body.userId || null,
          role: req.body.role || null,
          hireDate: req.body.hireDate || null,
          department: req.body.department || null,
        };
      }

      if (req.body.type === ContactType.COMPANY) {
        contactData.companyFields = {
          contactName: req.body.contactName || null,
          website: req.body.website || null,
          industry: req.body.industry || null,
        };
      }

      const contact = await Contact.create(contactData);

      // Increment usage counter
      await incrementUsageAfterCreate(tenantId, 'contacts');

      res.status(201).json({
        success: true,
        data: {
          contact: {
            ...contact.toJSON(),
            id: contact._id.toString(),
          },
        },
      });
    } catch (error) {
      console.error('Error creating contact:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * PATCH /api/contacts/:id
 * Update a contact
 */
router.patch('/:id', async (req, res) => {
  try {
    const { tenantId } = await getUserContext(req);

    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { $set: req.body },
      { new: true, runValidators: true }
    ).lean();

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    res.json({
      success: true,
      data: {
        contact: {
          ...contact,
          id: contact._id.toString(),
          _id: undefined,
          __v: undefined,
        },
      },
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/contacts/:id
 * Soft delete (deactivate) a contact
 */
router.delete('/:id', async (req, res) => {
  try {
    const { tenantId } = await getUserContext(req);

    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    res.json({ success: true, message: 'Contact deactivated' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
