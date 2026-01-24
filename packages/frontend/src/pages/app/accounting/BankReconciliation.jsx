import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { accountingApi } from '../../../services/api';

export default function BankReconciliation() {
  const [reconciliations, setReconciliations] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterAccount, setFilterAccount] = useState('');
  const [showStartModal, setShowStartModal] = useState(false);
  const [newReconciliation, setNewReconciliation] = useState({
    bankAccountId: '',
    statementDate: new Date().toISOString().split('T')[0],
    statementEndingBalance: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filterAccount]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filterAccount) params.bankAccountId = filterAccount;

      const [reconciliationsRes, accountsRes] = await Promise.all([
        accountingApi.getReconciliations(params),
        accountingApi.getBankAccounts(),
      ]);

      setReconciliations(reconciliationsRes.reconciliations || []);
      setBankAccounts(accountsRes.accounts || []);
    } catch (err) {
      setError(err.message);
      setReconciliations([]);
      setBankAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartReconciliation = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const result = await accountingApi.startReconciliation({
        ...newReconciliation,
        statementEndingBalance: parseFloat(newReconciliation.statementEndingBalance),
      });
      setShowStartModal(false);
      // Navigate to reconciliation detail page
      window.location.href = `/app/accounting/reconciliation/${result.id}`;
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

  // Find accounts needing reconciliation (haven't been reconciled in 30+ days)
  const accountsNeedingReconciliation = bankAccounts.filter(acc => {
    const lastReconciliation = reconciliations
      .filter(r => r.bankAccountId === acc.id && r.status === 'completed')
      .sort((a, b) => new Date(b.statementDate) - new Date(a.statementDate))[0];

    if (!lastReconciliation) return true;
    const daysSinceReconciliation = Math.floor(
      (new Date() - new Date(lastReconciliation.statementDate)) / (1000 * 60 * 60 * 24)
    );
    return daysSinceReconciliation > 30;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Reconciliation</h1>
          <p className="text-gray-600">Match your books to bank statements</p>
        </div>
        <button onClick={() => setShowStartModal(true)} className="btn-primary">
          + Start Reconciliation
        </button>
      </div>

      {/* Alerts for accounts needing reconciliation */}
      {accountsNeedingReconciliation.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">!</span>
            <div>
              <p className="font-medium text-yellow-800">Accounts Need Reconciliation</p>
              <p className="text-sm text-yellow-700">
                {accountsNeedingReconciliation.map(a => a.name).join(', ')} - Not reconciled in 30+ days
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Bank Accounts</p>
          <p className="text-2xl font-bold text-gray-900">{bankAccounts.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">
            {reconciliations.filter(r => r.status === 'completed').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">In Progress</p>
          <p className="text-2xl font-bold text-yellow-600">
            {reconciliations.filter(r => r.status === 'in_progress').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Need Attention</p>
          <p className="text-2xl font-bold text-red-600">{accountsNeedingReconciliation.length}</p>
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
        </div>
      </div>

      {/* Bank Accounts Status */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Bank Account Status</h3>
        </div>
        {bankAccounts.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No bank accounts found. Add accounts in Chart of Accounts first.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Reconciled</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Book Balance</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Statement Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bankAccounts.map((account) => {
                const lastReconciliation = reconciliations
                  .filter(r => r.bankAccountId === account.id && r.status === 'completed')
                  .sort((a, b) => new Date(b.statementDate) - new Date(a.statementDate))[0];

                const needsReconciliation = accountsNeedingReconciliation.includes(account);

                return (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{account.name}</p>
                      <p className="text-sm text-gray-500">{account.code}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {lastReconciliation
                        ? new Date(lastReconciliation.statementDate).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {formatCurrency(account.balance || 0)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-600">
                      {lastReconciliation
                        ? formatCurrency(lastReconciliation.statementEndingBalance)
                        : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                        needsReconciliation ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {needsReconciliation ? 'Needs Reconciliation' : 'Up to Date'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setNewReconciliation({
                            ...newReconciliation,
                            bankAccountId: account.id,
                          });
                          setShowStartModal(true);
                        }}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        Reconcile
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Reconciliation History */}
      {reconciliations.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Reconciliation History</h3>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statement Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Statement Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reconciliations.map((rec) => (
                <tr key={rec.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{rec.bankAccountName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(rec.statementDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    {formatCurrency(rec.statementEndingBalance)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      rec.status === 'completed' ? 'bg-green-100 text-green-700' :
                      rec.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {rec.status === 'completed' ? 'Completed' :
                       rec.status === 'in_progress' ? 'In Progress' : rec.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/app/accounting/reconciliation/${rec.id}`}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      {rec.status === 'in_progress' ? 'Continue' : 'View'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Start Reconciliation Modal */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Start Reconciliation</h2>
            <form onSubmit={handleStartReconciliation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account *</label>
                <select
                  value={newReconciliation.bankAccountId}
                  onChange={(e) => setNewReconciliation({ ...newReconciliation, bankAccountId: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Statement Date *</label>
                <input
                  type="date"
                  value={newReconciliation.statementDate}
                  onChange={(e) => setNewReconciliation({ ...newReconciliation, statementDate: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statement Ending Balance *</label>
                <input
                  type="number"
                  step="0.01"
                  value={newReconciliation.statementEndingBalance}
                  onChange={(e) => setNewReconciliation({ ...newReconciliation, statementEndingBalance: e.target.value })}
                  className="input"
                  placeholder="Enter ending balance from bank statement"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowStartModal(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Starting...' : 'Begin Reconciliation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
