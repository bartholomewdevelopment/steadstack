const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tenant name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    },
    plan: {
      type: String,
      enum: ['starter', 'professional', 'enterprise'],
      default: 'starter',
    },
    status: {
      type: String,
      enum: ['trial', 'active', 'suspended', 'cancelled'],
      default: 'trial',
    },
    trialEndsAt: {
      type: Date,
    },
    settings: {
      timezone: { type: String, default: 'America/Chicago' },
      currency: { type: String, default: 'USD' },
      dateFormat: { type: String, default: 'MM/DD/YYYY' },
    },
  },
  {
    timestamps: true,
  }
);

// Index for quick lookups (slug is already indexed via unique: true)
tenantSchema.index({ status: 1 });

module.exports = mongoose.model('Tenant', tenantSchema);
