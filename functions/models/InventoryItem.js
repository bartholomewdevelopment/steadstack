const mongoose = require('mongoose');

/**
 * InventoryItem - Tracks what you have in stock
 *
 * Represents a type of item (feed, medicine, supplies, equipment)
 * that can be tracked across one or more sites.
 */
const inventoryItemSchema = new mongoose.Schema(
  {
    // Multi-tenant fields
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },

    // Item identification
    name: {
      type: String,
      required: true,
      maxlength: 200,
    },
    sku: {
      type: String,
      maxlength: 50,
    },
    barcode: {
      type: String,
      maxlength: 50,
    },

    // Classification
    category: {
      type: String,
      required: true,
      enum: [
        'feed',           // Animal feed, hay, grain
        'medicine',       // Medications, vaccines, supplements
        'supplies',       // General farm supplies
        'equipment',      // Tools, machinery parts
        'seed',           // Seeds for planting
        'fertilizer',     // Fertilizers, soil amendments
        'fuel',           // Diesel, gas, propane
        'other',          // Miscellaneous
      ],
      index: true,
    },
    subcategory: String,  // User-defined subcategory

    // Unit of measure
    unit: {
      type: String,
      required: true,
      enum: [
        'lbs', 'kg', 'oz', 'g',           // Weight
        'gallons', 'liters', 'ml', 'oz',  // Volume
        'bags', 'bales', 'boxes',         // Packaging
        'doses', 'units', 'each',         // Count
      ],
    },

    // Pricing
    defaultUnitCost: {
      type: Number,
      default: 0,
    },
    lastPurchasePrice: {
      type: Number,
      default: 0,
    },

    // Stock levels (aggregate across all sites, or per-site in SiteInventory)
    // This is the total quantity across all sites
    totalQuantity: {
      type: Number,
      default: 0,
    },

    // Reorder settings
    reorderPoint: {
      type: Number,
      default: 0,
    },
    reorderQuantity: {
      type: Number,
      default: 0,
    },

    // Preferred vendor
    preferredVendor: {
      name: String,
      contactInfo: String,
      vendorSku: String,
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Notes
    notes: String,

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

// Indexes
inventoryItemSchema.index({ tenantId: 1, name: 1 });
inventoryItemSchema.index({ tenantId: 1, category: 1 });
inventoryItemSchema.index({ tenantId: 1, sku: 1 });
inventoryItemSchema.index({ tenantId: 1, isActive: 1 });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
