const mongoose = require('mongoose');

/**
 * Contact - Unified contacts for employees, contractors, vendors, customers, companies
 */

const ContactType = {
  EMPLOYEE: 'employee',
  CONTRACTOR: 'contractor',
  VENDOR: 'vendor',
  CUSTOMER: 'customer',
  COMPANY: 'company',
};

const contactSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    siteId: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(ContactType),
      index: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 200,
    },
    code: {
      type: String,
      maxlength: 20,
    },
    email: String,
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: { type: String, default: 'USA' },
    },

    // Labor rate for all people types (employees, contractors)
    laborRate: {
      type: Number,
      default: 0,
    },

    // Vendor-specific fields
    vendorFields: {
      paymentTerms: {
        type: String,
        enum: ['NET_15', 'NET_30', 'NET_45', 'NET_60', 'DUE_ON_RECEIPT', 'CUSTOM'],
        default: 'NET_30',
      },
      customTermsDays: Number,
      taxId: String,
      defaultExpenseAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
      },
      balance: {
        type: Number,
        default: 0,
      },
    },

    // Customer-specific fields
    customerFields: {
      paymentTerms: {
        type: String,
        enum: ['NET_15', 'NET_30', 'NET_45', 'NET_60', 'DUE_ON_RECEIPT', 'CUSTOM'],
        default: 'NET_30',
      },
      customTermsDays: Number,
      creditLimit: {
        type: Number,
        default: 0,
      },
      balance: {
        type: Number,
        default: 0,
      },
    },

    // Employee-specific fields
    employeeFields: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      role: String, // 'owner', 'manager', 'farmhand', etc.
      hireDate: Date,
      department: String,
    },

    // Company-specific fields
    companyFields: {
      contactName: String,
      website: String,
      industry: String,
    },

    notes: String,
    isActive: {
      type: Boolean,
      default: true,
    },

    // Migration tracking from legacy collections
    legacyVendorId: String,
    legacyCustomerId: String,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

contactSchema.index({ tenantId: 1, type: 1 });
contactSchema.index({ tenantId: 1, name: 1 });
contactSchema.index({ tenantId: 1, code: 1 });
contactSchema.index({ tenantId: 1, isActive: 1 });
contactSchema.index({ tenantId: 1, 'employeeFields.userId': 1 });

module.exports = mongoose.model('Contact', contactSchema);
module.exports.ContactType = ContactType;
