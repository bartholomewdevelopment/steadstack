const mongoose = require('mongoose');

/**
 * SiteInventory - Per-site inventory levels
 *
 * Tracks the quantity of each InventoryItem at each Site.
 * Updated whenever an InventoryMovement occurs.
 */
const siteInventorySchema = new mongoose.Schema(
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

    // The item
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
      index: true,
    },

    // Current quantity at this site
    quantity: {
      type: Number,
      default: 0,
    },

    // Site-specific reorder settings (override item defaults)
    reorderPoint: Number,
    reorderQuantity: Number,

    // Location within the site (optional)
    location: {
      building: String,
      area: String,
      bin: String,
    },

    // Last movement date
    lastMovementDate: Date,
    lastMovementType: String,

    // Status flags
    isBelowReorderPoint: {
      type: Boolean,
      default: false,
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

// Unique constraint: one record per item per site
siteInventorySchema.index(
  { tenantId: 1, siteId: 1, itemId: 1 },
  { unique: true }
);

// For finding low-stock items
siteInventorySchema.index({ tenantId: 1, isBelowReorderPoint: 1 });

module.exports = mongoose.model('SiteInventory', siteInventorySchema);
