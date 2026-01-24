import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { accountingApi } from '../../../services/api';

export default function CheckWriter() {
  const [checks, setChecks] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterAccount, setFilterAccount] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [newCheck, setNewCheck] = useState({
    bankAccountId: '',
    payee: '',
    amount: '',
    memo: '',
    checkDate: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filterAccount, filterStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filterAccount) params.bankAccountId = filterAccount;
      if (filterStatus) params.status = filterStatus;

      const [checksRes, accountsRes] = await Promise.all([
        accountingApi.getChecks(params),
        accountingApi.getBankAccounts(),
      ]);

      setChecks(checksRes.checks || []);
      setBankAccounts(accountsRes.accounts || []);
    } catch (err) {
      setError(err.message);
      setChecks([]);
      setBankAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleWriteCheck = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await accountingApi.writeCheck({
        ...newCheck,
        amount: parseFloat(newCheck.amount),
      });
      setShowWriteModal(false);
      setNewCheck({
        bankAccountId: '',
        payee: '',
        amount: '',
        memo: '',
        checkDate: new Date().toISOString().split('T')[0],
      });
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const totalWritten = checks.filter(c => c.status === 'written').reduce((sum, c) => sum + c.amount, 0);
  const totalCleared = checks.filter(c => c.status === 'cleared').reduce((sum, c) => sum + c.amount, 0);
  const totalVoided = checks.filter(c => c.status === 'voided').reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Check Writer</h1>
          <p className="text-gray-600">Write and manage checks</p>
        </div>
        <button onClick={() => setShowWriteModal(true)} className="btn-primary">
          + Write Check
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Checks</p>
          <p className="text-2xl font-bold text-gray-900">{checks.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Outstanding</p>
          <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalWritten)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Cleared</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalCleared)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Voided</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalVoided)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="input py-2 min-w-[180px]"
            >
              <option value="">All Accounts</option>
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input py-2 min-w-[140px]"
            >
              <option value="">All Statuses</option>
              <option value="written">Outstanding</option>
              <option value="cleared">Cleared</option>
              <option value="voided">Voided</option>
            </select>
          </div>
        </div>
      </div>

      {/* Checks List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      ) : error ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-yellow-700">Check writer is being set up. Write your first check to get started.</p>
          <button onClick={() => setShowWriteModal(true)} className="btn-primary mt-4">Write Check</button>
        </div>
      ) : checks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">-</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No checks found</h3>
          <p className="text-gray-500 mb-4">Write your first check to get started</p>
          <button onClick={() => setShowWriteModal(true)} className="btn-primary">+ Write Check</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {checks.map((check) => (
                <tr key={check.id} className={`hover:bg-gray-50 ${check.status === 'voided' ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-4 font-mono font-medium text-gray-900">{check.checkNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(check.checkDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-gray-900">{check.payee}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{check.bankAccountName}</td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(check.amount)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      check.status === 'cleared' ? 'bg-green-100 text-green-700' :
                      check.status === 'voided' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {check.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/app/accounting/checks/${check.id}`} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Write Check Modal */}
      {showWriteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Write Check</h2>
            <form onSubmit={handleWriteCheck} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account *</label>
                <select
                  value={newCheck.bankAccountId}
                  onChange={(e) => setNewCheck({ ...newCheck, bankAccountId: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Select account...</option>
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pay to the Order of *</label>
                <input
                  type="text"
                  value={newCheck.payee}
                  onChange={(e) => setNewCheck({ ...newCheck, payee: e.target.value })}
                  className="input"
                  placeholder="Payee name"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newCheck.amount}
                    onChange={(e) => setNewCheck({ ...newCheck, amount: e.target.value })}
                    className="input"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={newCheck.checkDate}
                    onChange={(e) => setNewCheck({ ...newCheck, checkDate: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Memo</label>
                <input
                  type="text"
                  value={newCheck.memo}
                  onChange={(e) => setNewCheck({ ...newCheck, memo: e.target.value })}
                  className="input"
                  placeholder="Optional memo"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowWriteModal(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Writing...' : 'Write Check'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
