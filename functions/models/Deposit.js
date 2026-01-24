const mongoose = require('mongoose');

/**
 * Deposit - Bank deposit grouping multiple receipts
 */
const depositSchema = new mongoose.Schema(
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
    depositNumber: {
      type: String,
      required: true,
    },
    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    depositDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // Receipts included in this deposit
    receipts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Receipt',
    }],
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    memo: String,
    status: {
      type: String,
      enum: ['PENDING', 'DEPOSITED', 'CLEARED', 'RECONCILED'],
      default: 'PENDING',
    },
    clearedDate: Date,
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

depositSchema.index({ tenantId: 1, depositNumber: 1 }, { unique: true });
depositSchema.index({ tenantId: 1, bankAccountId: 1 });
depositSchema.index({ tenantId: 1, status: 1 });
depositSchema.index({ tenantId: 1, depositDate: 1 });

module.exports = mongoose.model('Deposit', depositSchema);
