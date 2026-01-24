const mongoose = require('mongoose');

/**
 * BankReconciliation - Monthly bank statement reconciliation
 */
const reconciliationItemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['CHECK', 'DEPOSIT', 'ADJUSTMENT'],
    required: true,
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'items.refModel',
  },
  refModel: {
    type: String,
    enum: ['Check', 'Deposit'],
  },
  date: Date,
  description: String,
  amount: Number,
  cleared: {
    type: Boolean,
    default: false,
  },
});

const bankReconciliationSchema = new mongoose.Schema(
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
    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    statementDate: {
      type: Date,
      required: true,
    },
    statementEndingBalance: {
      type: Number,
      required: true,
    },
    beginningBalance: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'COMPLETED'],
      default: 'IN_PROGRESS',
    },
    // Items being reconciled
    items: [reconciliationItemSchema],
    // Calculated values
    clearedDeposits: {
      type: Number,
      default: 0,
    },
    clearedChecks: {
      type: Number,
      default: 0,
    },
    adjustments: {
      type: Number,
      default: 0,
    },
    calculatedEndingBalance: {
      type: Number,
      default: 0,
    },
    difference: {
      type: Number,
      default: 0,
    },
    completedAt: Date,
    completedBy: String,
    notes: String,
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

bankReconciliationSchema.index({ tenantId: 1, bankAccountId: 1, statementDate: 1 });
bankReconciliationSchema.index({ tenantId: 1, status: 1 });

// Calculate balances before save
bankReconciliationSchema.pre('save', function (next) {
  this.clearedDeposits = this.items
    .filter(i => i.type === 'DEPOSIT' && i.cleared)
    .reduce((sum, i) => sum + i.amount, 0);

  this.clearedChecks = this.items
    .filter(i => i.type === 'CHECK' && i.cleared)
    .reduce((sum, i) => sum + Math.abs(i.amount), 0);

  this.adjustments = this.items
    .filter(i => i.type === 'ADJUSTMENT')
    .reduce((sum, i) => sum + i.amount, 0);

  this.calculatedEndingBalance = this.beginningBalance + this.clearedDeposits - this.clearedChecks + this.adjustments;
  this.difference = this.statementEndingBalance - this.calculatedEndingBalance;

  next();
});

module.exports = mongoose.model('BankReconciliation', bankReconciliationSchema);
