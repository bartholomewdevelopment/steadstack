const mongoose = require('mongoose');

/**
 * Vendor - For Accounts Payable tracking
 */
const vendorSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: true,
      maxlength: 200,
    },
    code: {
      type: String,
      maxlength: 20,
    },
    contactName: String,
    email: String,
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: { type: String, default: 'USA' },
    },
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
    notes: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    // Running balance (what we owe)
    balance: {
      type: Number,
      default: 0,
    },
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

vendorSchema.index({ tenantId: 1, name: 1 });
vendorSchema.index({ tenantId: 1, code: 1 });
vendorSchema.index({ tenantId: 1, isActive: 1 });

module.exports = mongoose.model('Vendor', vendorSchema);
