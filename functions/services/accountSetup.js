const { Account } = require('../models');

/**
 * Default Chart of Accounts for Farm Operations
 *
 * This creates a standard set of accounts when a new tenant is created.
 * Accounts are numbered using a common pattern:
 * - 1xxx: Assets
 * - 2xxx: Liabilities
 * - 3xxx: Equity
 * - 4xxx: Revenue
 * - 5xxx: Expenses
 */
const defaultAccounts = [
  // Assets (1xxx) - Normal Balance: Debit
  { code: '1000', name: 'Cash', type: 'asset', subtype: 'cash', normalBalance: 'debit', isSystem: true },
  { code: '1010', name: 'Checking Account', type: 'asset', subtype: 'bank', normalBalance: 'debit', isSystem: true },
  { code: '1020', name: 'Savings Account', type: 'asset', subtype: 'bank', normalBalance: 'debit', isSystem: false },
  { code: '1100', name: 'Accounts Receivable', type: 'asset', subtype: 'accounts_receivable', normalBalance: 'debit', isSystem: true },
  { code: '1200', name: 'Feed Inventory', type: 'asset', subtype: 'inventory', normalBalance: 'debit', isSystem: true },
  { code: '1210', name: 'Supply Inventory', type: 'asset', subtype: 'inventory', normalBalance: 'debit', isSystem: true },
  { code: '1220', name: 'Medicine Inventory', type: 'asset', subtype: 'inventory', normalBalance: 'debit', isSystem: true },
  { code: '1300', name: 'Livestock', type: 'asset', subtype: 'livestock', normalBalance: 'debit', isSystem: true },
  { code: '1400', name: 'Equipment', type: 'asset', subtype: 'equipment', normalBalance: 'debit', isSystem: true },
  { code: '1410', name: 'Accumulated Depreciation - Equipment', type: 'asset', subtype: 'equipment', normalBalance: 'credit', isSystem: true },
  { code: '1500', name: 'Land', type: 'asset', subtype: 'land', normalBalance: 'debit', isSystem: false },
  { code: '1510', name: 'Buildings', type: 'asset', subtype: 'fixed_asset', normalBalance: 'debit', isSystem: false },

  // Liabilities (2xxx) - Normal Balance: Credit
  { code: '2000', name: 'Accounts Payable', type: 'liability', subtype: 'accounts_payable', normalBalance: 'credit', isSystem: true },
  { code: '2100', name: 'Credit Card', type: 'liability', subtype: 'credit_card', normalBalance: 'credit', isSystem: false },
  { code: '2200', name: 'Equipment Loan', type: 'liability', subtype: 'loan', normalBalance: 'credit', isSystem: false },
  { code: '2300', name: 'Operating Loan', type: 'liability', subtype: 'loan', normalBalance: 'credit', isSystem: false },

  // Equity (3xxx) - Normal Balance: Credit
  { code: '3000', name: 'Owner\'s Equity', type: 'equity', subtype: 'owner_equity', normalBalance: 'credit', isSystem: true },
  { code: '3100', name: 'Retained Earnings', type: 'equity', subtype: 'retained_earnings', normalBalance: 'credit', isSystem: true },
  { code: '3200', name: 'Owner\'s Draw', type: 'equity', subtype: 'owner_draw', normalBalance: 'debit', isSystem: false },

  // Revenue (4xxx) - Normal Balance: Credit
  { code: '4000', name: 'Livestock Sales', type: 'revenue', subtype: 'sales', normalBalance: 'credit', isSystem: true },
  { code: '4100', name: 'Product Sales', type: 'revenue', subtype: 'sales', normalBalance: 'credit', isSystem: true },
  { code: '4200', name: 'Crop Sales', type: 'revenue', subtype: 'sales', normalBalance: 'credit', isSystem: false },
  { code: '4300', name: 'Service Income', type: 'revenue', subtype: 'service_income', normalBalance: 'credit', isSystem: false },
  { code: '4900', name: 'Other Income', type: 'revenue', subtype: 'other_income', normalBalance: 'credit', isSystem: false },

  // Expenses (5xxx) - Normal Balance: Debit
  { code: '5000', name: 'Cost of Goods Sold', type: 'expense', subtype: 'cost_of_goods', normalBalance: 'debit', isSystem: true },
  { code: '5100', name: 'Feed Expense', type: 'expense', subtype: 'feed_expense', normalBalance: 'debit', isSystem: true },
  { code: '5200', name: 'Veterinary & Medical', type: 'expense', subtype: 'medical_expense', normalBalance: 'debit', isSystem: true },
  { code: '5300', name: 'Labor Expense', type: 'expense', subtype: 'labor_expense', normalBalance: 'debit', isSystem: true },
  { code: '5400', name: 'Fuel & Oil', type: 'expense', subtype: 'fuel_expense', normalBalance: 'debit', isSystem: true },
  { code: '5500', name: 'Repairs & Maintenance', type: 'expense', subtype: 'repair_expense', normalBalance: 'debit', isSystem: true },
  { code: '5600', name: 'Utilities', type: 'expense', subtype: 'utility_expense', normalBalance: 'debit', isSystem: false },
  { code: '5700', name: 'Insurance', type: 'expense', subtype: 'insurance_expense', normalBalance: 'debit', isSystem: false },
  { code: '5800', name: 'Depreciation Expense', type: 'expense', subtype: 'depreciation', normalBalance: 'debit', isSystem: true },
  { code: '5900', name: 'Interest Expense', type: 'expense', subtype: 'interest_expense', normalBalance: 'debit', isSystem: false },
  { code: '5990', name: 'Other Expense', type: 'expense', subtype: 'other_expense', normalBalance: 'debit', isSystem: false },
];

/**
 * Create default chart of accounts for a tenant
 * @param {ObjectId} tenantId - The tenant's ID
 * @param {ObjectId} userId - The user creating the accounts
 */
async function createDefaultAccounts(tenantId, userId) {
  const accounts = defaultAccounts.map((account) => ({
    ...account,
    tenantId,
    createdBy: userId,
    currentBalance: 0,
    isActive: true,
  }));

  // Use insertMany with ordered: false to continue on duplicates
  try {
    const result = await Account.insertMany(accounts, { ordered: false });
    console.log(`Created ${result.length} default accounts for tenant ${tenantId}`);
    return result;
  } catch (error) {
    // If some accounts already exist, that's ok
    if (error.code === 11000) {
      console.log(`Some accounts already existed for tenant ${tenantId}`);
      return await Account.find({ tenantId });
    }
    throw error;
  }
}

/**
 * Get the standard chart of accounts (for documentation/display)
 */
function getDefaultAccountsList() {
  return defaultAccounts;
}

module.exports = {
  createDefaultAccounts,
  getDefaultAccountsList,
  defaultAccounts,
};
