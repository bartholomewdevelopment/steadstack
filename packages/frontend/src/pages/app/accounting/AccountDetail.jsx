import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { accountingApi } from '../../../services/api';

const accountTypeColors = {
  ASSET: 'bg-blue-100 text-blue-700',
  LIABILITY: 'bg-red-100 text-red-700',
  EQUITY: 'bg-purple-100 text-purple-700',
  INCOME: 'bg-green-100 text-green-700',
  EXPENSE: 'bg-orange-100 text-orange-700',
  COGS: 'bg-yellow-100 text-yellow-700',
};

export default function AccountDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAccount();
  }, [id]);

  const fetchAccount = async () => {
    try {
      setLoading(true);
      setError(null);
      const [accountRes, balanceRes] = await Promise.all([
        accountingApi.getAccount(id),
        accountingApi.getAccountBalance(id),
      ]);
      setAccount(accountRes.data);
      setBalance(balanceRes.data);
      setFormData(accountRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await accountingApi.updateAccount(id, formData);
      setAccount(formData);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this account?')) return;
    try {
      await accountingApi.deleteAccount(id);
      navigate('/app/accounting');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
        <Link to="/app/accounting" className="text-primary-600 hover:underline mt-2 inline-block">
          Back to Chart of Accounts
        </Link>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Account not found</p>
        <Link to="/app/accounting" className="text-primary-600 hover:underline mt-2 inline-block">
          Back to Chart of Accounts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/app/accounting"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {account.code} - {account.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${accountTypeColors[account.type]}`}>
                {account.type}
              </span>
              {account.subtype && (
                <span className="text-gray-500 text-sm">{account.subtype}</span>
              )}
              <span className={`text-sm ${account.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                {account.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <>
              <button
                onClick={() => setEditing(true)}
                className="btn-secondary"
                disabled={account.isSystem}
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="btn-danger"
                disabled={account.isSystem}
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleSave} className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Account Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Info Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h2>
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Code</label>
                <input
                  type="text"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
              </div>
            </div>
          ) : (
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-500">Code</dt>
                <dd className="text-gray-900 font-medium">{account.code}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Name</dt>
                <dd className="text-gray-900">{account.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Type</dt>
                <dd className="text-gray-900">{account.type}</dd>
              </div>
              {account.subtype && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Subtype</dt>
                  <dd className="text-gray-900">{account.subtype}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">Normal Balance</dt>
                <dd className="text-gray-900">{account.normalBalance}</dd>
              </div>
              {account.description && (
                <div className="pt-2 border-t">
                  <dt className="text-gray-500 mb-1">Description</dt>
                  <dd className="text-gray-900">{account.description}</dd>
                </div>
              )}
            </dl>
          )}
        </div>

        {/* Balance Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Balance</h2>
          {balance ? (
            <div className="space-y-4">
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Current Balance</p>
                <p className={`text-3xl font-bold ${balance.balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                  ${Math.abs(balance.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  {balance.balance < 0 && ' CR'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 mb-1">Total Debits</p>
                  <p className="text-xl font-semibold text-green-700">
                    ${(balance.totalDebit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600 mb-1">Total Credits</p>
                  <p className="text-xl font-semibold text-red-700">
                    ${(balance.totalCredit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6">No transactions yet</p>
          )}
        </div>
      </div>

      {/* System Account Notice */}
      {account.isSystem && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-purple-700 text-sm">
            This is a system account and cannot be edited or deleted.
          </p>
        </div>
      )}
    </div>
  );
}
