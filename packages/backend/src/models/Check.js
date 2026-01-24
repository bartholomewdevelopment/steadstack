const mongoose = require('mongoose');

/**
 * Check - Outgoing payments by check
 */
const checkSchema = new mongoose.Schema(
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
    checkNumber: {
      type: String,
      required: true,
    },
    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    payeeType: {
      type: String,
      enum: ['VENDOR', 'OTHER'],
      default: 'VENDOR',
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
    },
    payeeName: String, // For non-vendor payees
    checkDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: true,
    },
    memo: String,
    status: {
      type: String,
      enum: ['DRAFT', 'PRINTED', 'CLEARED', 'VOID', 'RECONCILED'],
      default: 'DRAFT',
    },
    clearedDate: Date,
    // Bills being paid by this check
    billPayments: [{
      billId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bill',
      },
      amount: Number,
    }],
    // Expense lines for direct expenses
    expenseLines: [{
      accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
      },
      description: String,
      amount: Number,
    }],
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

checkSchema.index({ tenantId: 1, checkNumber: 1, bankAccountId: 1 }, { unique: true });
checkSchema.index({ tenantId: 1, vendorId: 1 });
checkSchema.index({ tenantId: 1, status: 1 });
checkSchema.index({ tenantId: 1, checkDate: 1 });

module.exports = mongoose.model('Check', checkSchema);
