const mongoose = require('mongoose');

const siteSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Site name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    // Short code for quick reference (e.g., "MAIN", "NORTH40")
    code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [10, 'Code cannot exceed 10 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    // Physical location
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'USA' },
    },
    // GPS coordinates for mapping
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
    // Site size
    acreage: {
      type: Number,
      min: 0,
    },
    // Site type for categorization
    type: {
      type: String,
      enum: ['farm', 'ranch', 'pasture', 'barn', 'feedlot', 'greenhouse', 'storage', 'other'],
      default: 'farm',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
    },
    // Site-specific settings
    settings: {
      timezone: String, // Override tenant timezone if needed
      defaultInventoryLocation: String,
    },
    // Primary contact for this site
    primaryContact: {
      name: String,
      phone: String,
      email: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for tenant lookups
siteSchema.index({ tenantId: 1, status: 1 });
siteSchema.index({ tenantId: 1, code: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Site', siteSchema);
