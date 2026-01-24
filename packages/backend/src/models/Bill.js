const mongoose = require('mongoose');

/**
 * Bill - Vendor bills for Accounts Payable
 */
const billLineSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
  },
});

const billSchema = new mongoose.Schema(
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
    billNumber: {
      type: String,
      required: true,
    },
    vendorBillNumber: String, // Vendor's reference number
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    billDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'VOID'],
      default: 'DRAFT',
    },
    lines: [billLineSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    taxRate: {
      type: Number,
      default: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      default: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    notes: String,
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

billSchema.index({ tenantId: 1, billNumber: 1 }, { unique: true });
billSchema.index({ tenantId: 1, vendorId: 1 });
billSchema.index({ tenantId: 1, status: 1 });
billSchema.index({ tenantId: 1, dueDate: 1 });

billSchema.pre('save', function (next) {
  this.subtotal = this.lines.reduce((sum, line) => sum + line.amount, 0);
  this.taxAmount = this.subtotal * (this.taxRate / 100);
  this.total = this.subtotal + this.taxAmount;
  this.balance = this.total - this.amountPaid;
  next();
});

module.exports = mongoose.model('Bill', billSchema);
