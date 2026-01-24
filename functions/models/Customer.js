const mongoose = require('mongoose');

/**
 * Customer - For Accounts Receivable tracking
 */
const customerSchema = new mongoose.Schema(
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
    creditLimit: {
      type: Number,
      default: 0,
    },
    notes: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    // Running balance
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

customerSchema.index({ tenantId: 1, name: 1 });
customerSchema.index({ tenantId: 1, code: 1 });
customerSchema.index({ tenantId: 1, isActive: 1 });

module.exports = mongoose.model('Customer', customerSchema);
