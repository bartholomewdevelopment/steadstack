const mongoose = require('mongoose');

/**
 * Account - Chart of Accounts for double-entry bookkeeping
 *
 * Stored in MongoDB. tenantId references Firestore tenant ID (string).
 * Standard farm accounts are seeded during tenant creation.
 */
const accountSchema = new mongoose.Schema(
  {
    // Firestore tenant ID (string, not ObjectId)
    tenantId: {
      type: String,
      required: true,
      index: true,
    },

    // Account identification
    code: {
      type: String,
      required: true,
      maxlength: 20,
    },
    name: {
      type: String,
      required: true,
      maxlength: 200,
    },
    description: String,

    // Account classification (matches accounting spec)
    type: {
      type: String,
      required: true,
      enum: ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE', 'COGS'],
      index: true,
    },

    // Sub-type for more specific categorization
    subtype: {
      type: String,
      enum: [
        // Assets
        'CASH',
        'BANK',
        'AR', // Accounts Receivable
        'INVENTORY',
        'PREPAID',
        'FIXED_ASSET',
        'LIVESTOCK',
        'EQUIPMENT',
        'LAND',
        // Liabilities
        'AP', // Accounts Payable
        'CREDIT_CARD',
        'LOAN',
        // Equity
        'OWNER_EQUITY',
        'RETAINED_EARNINGS',
        // Income
        'SALES',
        'SERVICE_INCOME',
        'OTHER_INCOME',
        // Expenses
        'FEED',
        'MEDICAL',
        'LABOR',
        'FUEL',
        'REPAIRS',
        'UTILITIES',
        'INSURANCE',
        'DEPRECIATION',
        'INTEREST',
        'OTHER',
      ],
    },

    // Normal balance (debit or credit increases this account)
    normalBalance: {
      type: String,
      enum: ['DEBIT', 'CREDIT'],
      required: true,
    },

    // Is this account active
    isActive: {
      type: Boolean,
      default: true,
    },

    // Is this a system account (seeded, can't be deleted)
    isSystem: {
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

// Indexes
accountSchema.index({ tenantId: 1, code: 1 }, { unique: true });
accountSchema.index({ tenantId: 1, type: 1 });
accountSchema.index({ tenantId: 1, isActive: 1 });

module.exports = mongoose.model('Account', accountSchema);
