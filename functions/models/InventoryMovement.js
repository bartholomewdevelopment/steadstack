const mongoose = require('mongoose');

/**
 * InventoryMovement - Records every inventory change
 *
 * Every time inventory goes up or down, a movement is recorded.
 * This creates a full audit trail and links back to the source Event.
 */
const inventoryMovementSchema = new mongoose.Schema(
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

    // What item moved
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
      index: true,
    },
    itemName: String,  // Denormalized for display

    // Movement type
    movementType: {
      type: String,
      required: true,
      enum: [
        'in',           // Inventory increased (purchase, return, adjustment+)
        'out',          // Inventory decreased (usage, sale, adjustment-)
        'transfer_in',  // Received from another site
        'transfer_out', // Sent to another site
      ],
    },

    // Quantity (always positive, direction determined by movementType)
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: String,

    // Cost tracking
    unitCost: {
      type: Number,
      default: 0,
    },
    totalCost: {
      type: Number,
      default: 0,
    },

    // Running balance after this movement (at this site)
    balanceAfter: {
      type: Number,
      default: 0,
    },

    // Source event - the reason this movement happened
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      index: true,
    },
    eventType: String,  // Denormalized for quick filtering

    // For transfers, link to the other site
    relatedSiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
    },
    relatedMovementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryMovement',
    },

    // Movement date (usually same as event date)
    movementDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    // Notes
    notes: String,

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
inventoryMovementSchema.index({ tenantId: 1, siteId: 1, movementDate: -1 });
inventoryMovementSchema.index({ tenantId: 1, itemId: 1, movementDate: -1 });
inventoryMovementSchema.index({ tenantId: 1, eventId: 1 });

module.exports = mongoose.model('InventoryMovement', inventoryMovementSchema);
