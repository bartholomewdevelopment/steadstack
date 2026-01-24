const mongoose = require('mongoose');

/**
 * LedgerTransaction - Header for a balanced set of ledger entries
 *
 * Stored in MongoDB. tenantId references Firestore tenant ID.
 * Each transaction has multiple LedgerEntry lines that must balance.
 * Linked to Firestore event via eventId.
 */
const ledgerTransactionSchema = new mongoose.Schema(
  {
    // Firestore tenant ID (string)
    tenantId: {
      type: String,
      required: true,
      index: true,
    },

    // Firestore site ID (nullable for tenant-global transactions)
    siteId: {
      type: String,
      default: null,
    },

    // Firestore event ID that triggered this transaction
    eventId: {
      type: String,
      required: true,
      index: true,
    },

    // When the transaction occurred
    occurredAt: {
      type: Date,
      required: true,
      index: true,
    },

    // When posted to the ledger
    postedAt: {
      type: Date,
      default: Date.now,
    },

    // Transaction status
    status: {
      type: String,
      enum: ['POSTED', 'REVERSED'],
      default: 'POSTED',
    },

    // Description/memo
    memo: {
      type: String,
      maxlength: 500,
    },

    // Idempotency key to prevent duplicate postings
    // Format: hash(tenantId + eventId + postingProfileVersion + stablePayload)
    idempotencyKey: {
      type: String,
      required: true,
    },

    // Optional version for schema migrations
    version: {
      type: Number,
      default: 1,
    },

    // If this is a reversal, link to the original transaction
    reversesTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LedgerTransaction',
    },
    reversedByTransactionId: {
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

// Unique idempotency key per tenant
ledgerTransactionSchema.index({ tenantId: 1, idempotencyKey: 1 }, { unique: true });
ledgerTransactionSchema.index({ tenantId: 1, occurredAt: -1 });
ledgerTransactionSchema.index({ tenantId: 1, eventId: 1 });
ledgerTransactionSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('LedgerTransaction', ledgerTransactionSchema);
