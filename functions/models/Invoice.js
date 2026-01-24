const mongoose = require('mongoose');

/**
 * Invoice - Sales invoices for Accounts Receivable
 */
const invoiceLineSchema = new mongoose.Schema({
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

const invoiceSchema = new mongoose.Schema(
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
    invoiceNumber: {
      type: String,
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    invoiceDate: {
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
      enum: ['DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE', 'VOID'],
      default: 'DRAFT',
    },
    lines: [invoiceLineSchema],
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
    terms: String,
    // Ledger transaction when posted
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

invoiceSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ tenantId: 1, customerId: 1 });
invoiceSchema.index({ tenantId: 1, status: 1 });
invoiceSchema.index({ tenantId: 1, dueDate: 1 });

// Calculate totals before save
invoiceSchema.pre('save', function (next) {
  this.subtotal = this.lines.reduce((sum, line) => sum + line.amount, 0);
  this.taxAmount = this.subtotal * (this.taxRate / 100);
  this.total = this.subtotal + this.taxAmount;
  this.balance = this.total - this.amountPaid;
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
