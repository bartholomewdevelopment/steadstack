import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { accountingApi } from '../../../services/api';

const accountTypeColors = {
  ASSET: 'bg-blue-100 text-blue-700',
  LIABILITY: 'bg-red-100 text-red-700',
  EQUITY: 'bg-purple-100 text-purple-700',
  INCOME: 'bg-green-100 text-green-700',
  EXPENSE: 'bg-orange-100 text-orange-700',
  COGS: 'bg-yellow-100 text-yellow-700',
};

const accountTypeOrder = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'COGS', 'EXPENSE'];

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccount, setNewAccount] = useState({
    code: '',
    name: '',
    type: 'EXPENSE',
    subtype: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, [filterType, filterStatus]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filterType) params.type = filterType;
      if (filterStatus === 'active') params.isActive = true;
      if (filterStatus === 'inactive') params.isActive = false;

      const response = await accountingApi.getAccounts(params);
      setAccounts(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await accountingApi.createAccount(newAccount);
      setShowAddModal(false);
      setNewAccount({ code: '', name: '', type: 'EXPENSE', subtype: '', description: '' });
      fetchAccounts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Group accounts by type
  const groupedAccounts = accounts.reduce((acc, account) => {
    if (!acc[account.type]) acc[account.type] = [];
    acc[account.type].push(account);
    return acc;
  }, {});

  // Sort groups by accounting order
  const sortedTypes = accountTypeOrder.filter((type) => groupedAccounts[type]);

  const subtypeOptions = {
    ASSET: ['CASH', 'BANK', 'AR', 'INVENTORY', 'PREPAID', 'FIXED_ASSET', 'LIVESTOCK', 'EQUIPMENT', 'LAND'],
    LIABILITY: ['AP', 'CREDIT_CARD', 'LOAN'],
    EQUITY: ['OWNER_EQUITY', 'RETAINED_EARNINGS'],
    INCOME: ['SALES', 'SERVICE_INCOME', 'OTHER_INCOME'],
    EXPENSE: ['FEED', 'MEDICAL', 'LABOR', 'FUEL', 'REPAIRS', 'UTILITIES', 'INSURANCE', 'DEPRECIATION', 'INTEREST', 'OTHER'],
    COGS: ['OTHER'],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
          <p className="text-gray-600">Manage your general ledger accounts</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          + Add Account
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {accountTypeOrder.map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(filterType === type ? '' : type)}
            className={`p-3 rounded-xl border text-left transition-colors ${
              filterType === type
                ? 'bg-primary-50 border-primary-200'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${accountTypeColors[type]}`}>
              {type}
            </span>
            <p className="text-lg font-semibold mt-1">
              {groupedAccounts[type]?.length || 0}
            </p>
            <p className="text-xs text-gray-500">accounts</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input py-2 min-w-[150px]"
            >
              <option value="">All Types</option>
              {accountTypeOrder.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input py-2 min-w-[120px]"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="">All</option>
            </select>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading accounts...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchAccounts} className="mt-2 text-red-700 underline">
            Try again
          </button>
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">$</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts found</h3>
          <p className="text-gray-500 mb-4">
            {filterType ? 'Try adjusting your filters' : 'Start by adding accounts to your chart'}
          </p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            + Add Account
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedTypes.map((type) => (
            <div key={type} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${accountTypeColors[type]}`}>
                    {type}
                  </span>
                  <span className="text-gray-500 font-normal">
                    ({groupedAccounts[type].length} accounts)
                  </span>
                </h3>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtype</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Normal Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {groupedAccounts[type]
                    .sort((a, b) => a.code.localeCompare(b.code))
                    .map((account) => (
                      <tr key={account.id} className={`hover:bg-gray-50 ${!account.isActive ? 'opacity-60' : ''}`}>
                        <td className="px-6 py-4 font-mono text-sm text-gray-900">{account.code}</td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{account.name}</p>
                          {account.description && (
                            <p className="text-sm text-gray-500">{account.description}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {account.subtype?.replace(/_/g, ' ') || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                            account.normalBalance === 'DEBIT' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {account.normalBalance}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                            account.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {account.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {account.isSystem && (
                            <span className="ml-1 inline-flex px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-700">
                              System
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            to={`/app/accounting/accounts/${account.id}`}
                            className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Account</h2>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Code *
                  </label>
                  <input
                    type="text"
                    value={newAccount.code}
                    onChange={(e) => setNewAccount({ ...newAccount, code: e.target.value })}
                    className="input"
                    placeholder="1000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Type *
                  </label>
                  <select
                    value={newAccount.type}
                    onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value, subtype: '' })}
                    className="input"
                    required
                  >
                    {accountTypeOrder.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  className="input"
                  placeholder="Cash"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subtype
                </label>
                <select
                  value={newAccount.subtype}
                  onChange={(e) => setNewAccount({ ...newAccount, subtype: e.target.value })}
                  className="input"
                >
                  <option value="">Select subtype...</option>
                  {subtypeOptions[newAccount.type]?.map((subtype) => (
                    <option key={subtype} value={subtype}>{subtype.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newAccount.description}
                  onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
                  className="input"
                  rows={2}
                  placeholder="Optional description..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
