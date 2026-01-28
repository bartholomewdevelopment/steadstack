const mongoose = require('mongoose');

/**
 * JournalEntry - Manual journal entries for adjusting entries and corrections
 *
 * Allows users to create manual double-entry journal entries that post to the ledger.
 * Uses the same LedgerTransaction/LedgerEntry system as automatic event postings.
 */
const journalEntryLineSchema = new mongoose.Schema({
  lineNumber: {
    type: Number,
    required: true,
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  accountCode: String, // Denormalized for display
  accountName: String, // Denormalized for display
  description: {
    type: String,
    maxlength: 200,
  },
  debit: {
    type: Number,
    default: 0,
    min: 0,
  },
  credit: {
    type: Number,
    default: 0,
    min: 0,
  },
  // Optional entity reference for sub-ledger tracking
  entityType: {
    type: String,
    enum: ['VENDOR', 'CUSTOMER', 'SITE', 'ANIMAL_GROUP', 'INVENTORY_ITEM'],
  },
  entityId: String,
}, { _id: false });

const journalEntrySchema = new mongoose.Schema(
  {
    // Tenant isolation (Firestore tenant ID - string)
    tenantId: {
      type: String,
      required: true,
      index: true,
    },

    // Optional site scope
    siteId: {
      type: String,
      default: null,
    },

    // Entry identification
    entryNumber: {
      type: String,
      required: true,
    },

    entryDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // External reference (e.g., supporting document number)
    reference: {
      type: String,
      maxlength: 100,
    },

    // Description/memo for the entire entry
    memo: {
      type: String,
      maxlength: 500,
    },

    // Entry status
    status: {
      type: String,
      enum: ['DRAFT', 'POSTED', 'REVERSED'],
      default: 'DRAFT',
      index: true,
    },

    // Journal entry lines
    lines: [journalEntryLineSchema],

    // Calculated totals
    totalDebits: {
      type: Number,
      default: 0,
    },
    totalCredits: {
      type: Number,
      default: 0,
    },
    isBalanced: {
      type: Boolean,
      default: false,
    },

    // Link to ledger transaction when posted
    ledgerTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LedgerTransaction',
    },

    // Reversal tracking
    reversedByEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },
    reversesEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },
    reversalReason: String,

    // Posting audit trail
    postedAt: Date,
    postedBy: String,
    reversedAt: Date,
    reversedBy: String,

    // Created by user
    createdBy: String,
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

// Pre-save: Calculate totals and balance check
journalEntrySchema.pre('save', function (next) {
  this.totalDebits = this.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  this.totalCredits = this.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  // Allow small floating point differences
  this.isBalanced = Math.abs(this.totalDebits - this.totalCredits) < 0.01;
  next();
});

// Indexes
journalEntrySchema.index({ tenantId: 1, entryNumber: 1 }, { unique: true });
journalEntrySchema.index({ tenantId: 1, status: 1 });
journalEntrySchema.index({ tenantId: 1, entryDate: -1 });
journalEntrySchema.index({ tenantId: 1, siteId: 1 });

module.exports = mongoose.model('JournalEntry', journalEntrySchema);
