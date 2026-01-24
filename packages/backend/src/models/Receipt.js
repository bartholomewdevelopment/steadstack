const mongoose = require('mongoose');

/**
 * Receipt - Cash receipts / customer payments
 */
const receiptSchema = new mongoose.Schema(
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
    receiptNumber: {
      type: String,
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    payerName: String, // For non-customer receipts
    receiptDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CHECK', 'CREDIT_CARD', 'BANK_TRANSFER', 'OTHER'],
      default: 'CASH',
    },
    referenceNumber: String, // Check number, transaction ID, etc.
    depositAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    memo: String,
    status: {
      type: String,
      enum: ['PENDING', 'DEPOSITED', 'VOID'],
      default: 'PENDING',
    },
    // Invoices being paid
    invoicePayments: [{
      invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
      },
      amount: Number,
    }],
    // Income lines for non-invoice receipts
    incomeLines: [{
      accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
      },
      description: String,
      amount: Number,
    }],
    depositId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deposit',
    },
    ledgerTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LedgerTransaction',
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

receiptSchema.index({ tenantId: 1, receiptNumber: 1 }, { unique: true });
receiptSchema.index({ tenantId: 1, customerId: 1 });
receiptSchema.index({ tenantId: 1, status: 1 });
receiptSchema.index({ tenantId: 1, receiptDate: 1 });

module.exports = mongoose.model('Receipt', receiptSchema);
