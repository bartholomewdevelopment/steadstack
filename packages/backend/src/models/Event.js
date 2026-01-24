const mongoose = require('mongoose');

/**
 * Event - The source of truth for all operational activities
 *
 * Every farm activity is logged as an Event. Events can trigger:
 * - Inventory movements (deductions or additions)
 * - Ledger entries (expenses, revenue, asset changes)
 *
 * The event type determines what fields are relevant and what
 * automatic postings occur.
 */
const eventSchema = new mongoose.Schema(
  {
    // Multi-tenant fields
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      required: true,
      index: true,
    },

    // Event classification
    type: {
      type: String,
      required: true,
      enum: [
        'feeding',      // Feed animals - decreases feed inventory, increases animal cost basis
        'treatment',    // Medical treatment - decreases med inventory, expense or animal cost
        'purchase',     // Buy supplies - increases inventory, records expense/payable
        'sale',         // Sell animals/products - decreases inventory, records revenue
        'transfer',     // Move inventory between sites
        'adjustment',   // Manual inventory adjustment
        'maintenance',  // Equipment/facility maintenance
        'labor',        // Labor/work hours logged
        'breeding',     // Breeding event
        'birth',        // Animal birth
        'death',        // Animal death/loss
        'harvest',      // Harvest crops/products
        'custom',       // User-defined event type
      ],
      index: true,
    },

    // When did this happen
    eventDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    // Human-readable description
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },

    // Status for workflow
    status: {
      type: String,
      enum: ['draft', 'pending', 'completed', 'cancelled'],
      default: 'completed',
    },

    // ===== Type-specific data =====

    // For feeding/treatment events - what was used
    inventoryUsed: [{
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
      itemName: String,        // Denormalized for display
      quantity: Number,
      unit: String,            // lbs, gallons, doses, etc.
      unitCost: Number,        // Cost per unit at time of use
      totalCost: Number,       // quantity * unitCost
    }],

    // For purchase events - what was bought
    inventoryReceived: [{
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
      itemName: String,
      quantity: Number,
      unit: String,
      unitCost: Number,
      totalCost: Number,
    }],

    // Animals involved (for feeding, treatment, sale, etc.)
    animals: [{
      animalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal' },
      animalName: String,      // Denormalized
      tag: String,             // Tag/ID number
    }],

    // Financial summary
    totalCost: {
      type: Number,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },

    // For purchases - vendor info
    vendor: {
      name: String,
      invoiceNumber: String,
    },

    // For labor events
    labor: {
      hours: Number,
      rate: Number,
      workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      workerName: String,
    },

    // Notes and attachments
    notes: String,
    attachments: [{
      name: String,
      url: String,
      type: String,
    }],

    // Weather conditions (optional, useful for some events)
    weather: {
      temperature: Number,
      conditions: String,      // sunny, rainy, etc.
    },

    // ===== Audit trail =====

    // Who created/modified
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Links to generated records (for traceability)
    inventoryMovements: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryMovement',
    }],
    ledgerEntries: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LedgerEntry',
    }],

    // Was this event auto-posted to inventory/ledger?
    posted: {
      type: Boolean,
      default: false,
    },
    postedAt: Date,
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

// Compound indexes for common queries
eventSchema.index({ tenantId: 1, siteId: 1, eventDate: -1 });
eventSchema.index({ tenantId: 1, type: 1, eventDate: -1 });
eventSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('Event', eventSchema);
