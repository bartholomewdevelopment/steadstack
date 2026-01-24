const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    // Firebase UID - the primary link to Firebase Auth
    firebaseUid: {
      type: String,
      required: [true, 'Firebase UID is required'],
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    photoURL: {
      type: String,
    },
    // Multi-tenant: user belongs to a tenant
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    // Role within the tenant
    role: {
      type: String,
      enum: ['owner', 'admin', 'manager', 'worker'],
      default: 'owner',
    },
    // Site-level access (if empty, has access to all tenant sites)
    siteAccess: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
    }],
    status: {
      type: String,
      enum: ['active', 'invited', 'suspended'],
      default: 'active',
    },
    // Platform-level admin (SteadStack staff)
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
    // Profile settings
    settings: {
      timezone: { type: String, default: 'America/Chicago' },
      dateFormat: { type: String, default: 'MM/DD/YYYY' },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
    },
    lastLoginAt: {
      type: Date,
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

// Compound index for tenant lookups
userSchema.index({ tenantId: 1, role: 1 });

module.exports = mongoose.model('User', userSchema);
