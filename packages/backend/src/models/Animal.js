const mongoose = require('mongoose');

const animalSchema = new mongoose.Schema(
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
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AnimalGroup',
      index: true,
    },

    // Identification
    tagNumber: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      trim: true,
    },
    species: {
      type: String,
      required: true,
      enum: ['cattle', 'sheep', 'goat', 'pig', 'horse', 'poultry', 'other'],
    },
    breed: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      required: true,
      enum: ['male', 'female', 'castrated', 'unknown'],
    },

    // Dates
    dateOfBirth: {
      type: Date,
    },
    acquisitionDate: {
      type: Date,
      default: Date.now,
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'sold', 'deceased', 'transferred', 'culled'],
      default: 'active',
    },
    statusDate: {
      type: Date,
    },
    statusReason: {
      type: String,
    },

    // Physical attributes
    color: {
      type: String,
    },
    markings: {
      type: String,
    },
    weight: {
      value: Number,
      unit: {
        type: String,
        enum: ['lbs', 'kg'],
        default: 'lbs',
      },
      recordedAt: Date,
    },

    // Lineage
    sireId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
    },
    damId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
    },

    // Acquisition details
    acquisition: {
      method: {
        type: String,
        enum: ['born', 'purchased', 'transferred_in', 'gift', 'other'],
      },
      source: String,
      cost: Number,
      notes: String,
    },

    // Additional tracking
    registrationNumber: {
      type: String,
    },
    electronicId: {
      type: String,
    },

    // Notes
    notes: {
      type: String,
    },

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
animalSchema.index({ tenantId: 1, tagNumber: 1 });
animalSchema.index({ tenantId: 1, status: 1 });
animalSchema.index({ tenantId: 1, species: 1 });
animalSchema.index({ siteId: 1, status: 1 });

// Virtual for age
animalSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const now = new Date();
  const birth = new Date(this.dateOfBirth);
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();

  if (months < 0) {
    return { years: years - 1, months: months + 12 };
  }
  return { years, months };
});

// Ensure virtuals are included in JSON
animalSchema.set('toJSON', { virtuals: true });
animalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Animal', animalSchema);
