const mongoose = require('mongoose');

const animalGroupSchema = new mongoose.Schema(
  {
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

    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['herd', 'flock', 'pen', 'pasture', 'barn', 'coop', 'other'],
    },
    species: {
      type: String,
      enum: ['cattle', 'sheep', 'goat', 'pig', 'horse', 'poultry', 'mixed', 'other'],
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },

    // Location within site
    location: {
      type: String,
    },

    // Capacity tracking
    capacity: {
      type: Number,
    },

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique group names per tenant
animalGroupSchema.index({ tenantId: 1, name: 1 }, { unique: true });

// Virtual for animal count
animalGroupSchema.virtual('animalCount', {
  ref: 'Animal',
  localField: '_id',
  foreignField: 'groupId',
  count: true,
  match: { status: 'active' },
});

animalGroupSchema.set('toJSON', { virtuals: true });
animalGroupSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('AnimalGroup', animalGroupSchema);
