const mongoose = require('mongoose');

/**
 * LedgerEntry - Individual lines in a ledger transaction
 *
 * Stored in MongoDB. tenantId references Firestore tenant ID.
 * Each entry is either a debit or credit (not both).
 * All entries for a transaction must balance: SUM(debit) = SUM(credit)
 */
const ledgerEntrySchema = new mongoose.Schema(
  {
    // Firestore tenant ID (string)
    tenantId: {
      type: String,
      required: true,
      index: true,
    },

    // Reference to parent transaction
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LedgerTransaction',
      required: true,
      index: true,
    },

    // Firestore site ID (can differ from transaction's siteId for multi-site entries)
    siteId: {
      type: String,
      default: null,
    },

    // When the entry occurred (denormalized from transaction)
    occurredAt: {
      type: Date,
      required: true,
      index: true,
    },

    // The account affected
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },

    // Debit amount (only one of debit/credit should be > 0)
    debit: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Credit amount (only one of debit/credit should be > 0)
    credit: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Optional: entity type for sub-ledger tracking
    // e.g., 'ANIMAL', 'INVENTORY_ITEM', 'VENDOR', 'CUSTOMER'
    entityType: {
      type: String,
      enum: ['ANIMAL', 'ANIMAL_GROUP', 'INVENTORY_ITEM', 'VENDOR', 'CUSTOMER', 'SITE'],
    },

    // Optional: entity ID (Firestore or MongoDB ID depending on entityType)
    entityId: {
      type: String,
    },

    // Optional: category for expense/income classification
    categoryId: {
      type: String,
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

// Indexes for common queries
ledgerEntrySchema.index({ tenantId: 1, transactionId: 1 });
ledgerEntrySchema.index({ tenantId: 1, accountId: 1, occurredAt: -1 });
ledgerEntrySchema.index({ tenantId: 1, entityType: 1, entityId: 1 });

// Virtual for net amount (positive = debit, negative = credit)
ledgerEntrySchema.virtual('netAmount').get(function () {
  return this.debit - this.credit;
});

// Validation: either debit or credit must be > 0, not both
ledgerEntrySchema.pre('save', function (next) {
  if (this.debit > 0 && this.credit > 0) {
    next(new Error('Entry cannot have both debit and credit > 0'));
  } else if (this.debit === 0 && this.credit === 0) {
    next(new Error('Entry must have either debit or credit > 0'));
  } else {
    next();
  }
});

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
