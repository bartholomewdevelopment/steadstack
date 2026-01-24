import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { accountingApi } from '../../../services/api';

export default function BankDeposit() {
  const [deposits, setDeposits] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [undeposited, setUndeposited] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterAccount, setFilterAccount] = useState('');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [newDeposit, setNewDeposit] = useState({
    bankAccountId: '',
    depositDate: new Date().toISOString().split('T')[0],
    memo: '',
    selectedItems: [],
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

      const [depositsRes, accountsRes, undepositedRes] = await Promise.all([
        accountingApi.getDeposits(params),
        accountingApi.getBankAccounts(),
        accountingApi.getUndepositedFunds(),
      ]);

      setDeposits(depositsRes.deposits || []);
      setBankAccounts(accountsRes.accounts || []);
      setUndeposited(undepositedRes.items || []);
    } catch (err) {
      setError(err.message);
      setDeposits([]);
      setBankAccounts([]);
      setUndeposited([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeposit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await accountingApi.createDeposit(newDeposit);
      setShowDepositModal(false);
      setNewDeposit({
        bankAccountId: '',
        depositDate: new Date().toISOString().split('T')[0],
        memo: '',
        selectedItems: [],
      });
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = (itemId) => {
    const items = newDeposit.selectedItems.includes(itemId)
      ? newDeposit.selectedItems.filter(id => id !== itemId)
      : [...newDeposit.selectedItems, itemId];
    setNewDeposit({ ...newDeposit, selectedItems: items });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const undepositedTotal = undeposited.reduce((sum, item) => sum + item.amount, 0);
  const selectedTotal = undeposited
    .filter(item => newDeposit.selectedItems.includes(item.id))
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Deposits</h1>
          <p className="text-gray-600">Manage bank deposits from receipts</p>
        </div>
        <button onClick={() => setShowDepositModal(true)} className="btn-primary">
          + Make Deposit
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Undeposited Funds</p>
          <p className="text-2xl font-bold text-yellow-600">{formatCurrency(undepositedTotal)}</p>
          <p className="text-sm text-gray-500 mt-1">{undeposited.length} items pending</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Deposits</p>
          <p className="text-2xl font-bold text-gray-900">{deposits.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">This Month</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(
              deposits
                .filter(d => new Date(d.depositDate).getMonth() === new Date().getMonth())
                .reduce((sum, d) => sum + d.totalAmount, 0)
            )}
          </p>
        </div>
      </div>

      {/* Undeposited Funds Alert */}
      {undeposited.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">!</span>
              <div>
                <p className="font-medium text-yellow-800">Undeposited Funds</p>
                <p className="text-sm text-yellow-700">
                  You have {formatCurrency(undepositedTotal)} in {undeposited.length} items ready to deposit
                </p>
              </div>
            </div>
            <button onClick={() => setShowDepositModal(true)} className="btn-primary">
              Make Deposit
            </button>
          </div>
        </div>
      )}

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

      {/* Deposits List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      ) : error ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-yellow-700">Bank deposits module is being set up. Create your first deposit to get started.</p>
          <button onClick={() => setShowDepositModal(true)} className="btn-primary mt-4">Make Deposit</button>
        </div>
      ) : deposits.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">$</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No deposits found</h3>
          <p className="text-gray-500 mb-4">Create your first bank deposit to get started</p>
          <button onClick={() => setShowDepositModal(true)} className="btn-primary">+ Make Deposit</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deposit #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bank Account</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {deposits.map((deposit) => (
                <tr key={deposit.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link to={`/app/accounting/deposits/${deposit.id}`} className="text-primary-600 hover:text-primary-700 font-medium">
                      {deposit.depositNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(deposit.depositDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-gray-900">{deposit.bankAccountName}</td>
                  <td className="px-6 py-4 text-center text-gray-600">{deposit.itemCount}</td>
                  <td className="px-6 py-4 text-right font-medium text-green-600">{formatCurrency(deposit.totalAmount)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      deposit.reconciled ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {deposit.reconciled ? 'Reconciled' : 'Unreconciled'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Make Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Make Deposit</h2>
            <form onSubmit={handleCreateDeposit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account *</label>
                  <select
                    value={newDeposit.bankAccountId}
                    onChange={(e) => setNewDeposit({ ...newDeposit, bankAccountId: e.target.value })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Date *</label>
                  <input
                    type="date"
                    value={newDeposit.depositDate}
                    onChange={(e) => setNewDeposit({ ...newDeposit, depositDate: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>

              {/* Undeposited Items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Items to Deposit</label>
                {undeposited.length === 0 ? (
                  <p className="text-gray-500 text-sm">No undeposited funds available</p>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500"></th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Reference</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {undeposited.map((item) => (
                          <tr
                            key={item.id}
                            className={`cursor-pointer hover:bg-gray-50 ${
                              newDeposit.selectedItems.includes(item.id) ? 'bg-primary-50' : ''
                            }`}
                            onClick={() => toggleItem(item.id)}
                          >
                            <td className="px-4 py-2">
                              <input
                                type="checkbox"
                                checked={newDeposit.selectedItems.includes(item.id)}
                                onChange={() => toggleItem(item.id)}
                                className="rounded border-gray-300 text-primary-600"
                              />
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {new Date(item.date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.type}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{item.reference}</td>
                            <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center py-3 border-t border-gray-200">
                <span className="font-medium text-gray-700">Deposit Total:</span>
                <span className="text-xl font-bold text-green-600">{formatCurrency(selectedTotal)}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Memo</label>
                <input
                  type="text"
                  value={newDeposit.memo}
                  onChange={(e) => setNewDeposit({ ...newDeposit, memo: e.target.value })}
                  className="input"
                  placeholder="Optional memo"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || newDeposit.selectedItems.length === 0}
                  className="btn-primary"
                >
                  {saving ? 'Creating...' : 'Create Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
