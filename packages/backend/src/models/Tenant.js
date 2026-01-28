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
      // Include both legacy and new plan names for migration period
      enum: ['starter', 'professional', 'enterprise', 'free', 'homestead', 'ranchGrowth', 'ranchPro'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['trial', 'active', 'suspended', 'cancelled'],
      default: 'trial',
    },
    trialEndsAt: {
      type: Date,
    },
    // Billing cycle tracking (for monthly limit resets)
    billingCycleStart: {
      type: Date,
    },
    // Stripe integration
    stripeCustomerId: {
      type: String,
      sparse: true,
    },
    stripeSubscriptionId: {
      type: String,
      sparse: true,
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'trialing', 'incomplete', null],
      default: null,
    },
    currentPeriodEnd: {
      type: Date,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    settings: {
      timezone: { type: String, default: 'America/Chicago' },
      currency: { type: String, default: 'USD' },
      dateFormat: { type: String, default: 'MM/DD/YYYY' },
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

// Index for quick lookups (slug is already indexed via unique: true)
tenantSchema.index({ status: 1 });

module.exports = mongoose.model('Tenant', tenantSchema);
