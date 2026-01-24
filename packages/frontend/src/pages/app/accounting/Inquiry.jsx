import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { accountingApi } from '../../../services/api';

export default function Inquiry() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({
    accountId: '',
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    search: '',
    status: '',
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await accountingApi.getAccounts({});
      setAccounts(response.accounts || []);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  const handleSearch = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      setSearched(true);

      const params = {
        page,
        limit: 25,
        ...filters,
      };

      // Remove empty params
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await accountingApi.getTransactions(params);
      setTransactions(response.transactions || []);
      setPagination(response.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      setError(err.message);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transaction Inquiry</h1>
          <p className="text-gray-600">Search and view ledger transactions</p>
        </div>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
            <select
              value={filters.accountId}
              onChange={(e) => handleFilterChange('accountId', e.target.value)}
              className="input"
            >
              <option value="">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="input"
            >
              <option value="">All Statuses</option>
              <option value="POSTED">Posted</option>
              <option value="REVERSED">Reversed</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search (memo, reference)</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="input"
              placeholder="Search transactions..."
            />
          </div>
          <button onClick={() => handleSearch(1)} className="btn-primary">
            Search
          </button>
        </div>
      </div>

      {/* Quick Inquiry Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => {
            setFilters({
              ...filters,
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date().toISOString().split('T')[0],
            });
            setTimeout(() => handleSearch(1), 100);
          }}
          className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors text-left"
        >
          <h3 className="font-medium text-gray-900">Today's Activity</h3>
          <p className="text-sm text-gray-500">Transactions posted today</p>
        </button>
        <button
          onClick={() => {
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            setFilters({
              ...filters,
              startDate: startOfMonth.toISOString().split('T')[0],
              endDate: new Date().toISOString().split('T')[0],
            });
            setTimeout(() => handleSearch(1), 100);
          }}
          className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors text-left"
        >
          <h3 className="font-medium text-gray-900">This Month</h3>
          <p className="text-sm text-gray-500">Month-to-date transactions</p>
        </button>
        <button
          onClick={() => {
            setFilters({
              ...filters,
              status: 'REVERSED',
              startDate: '',
              endDate: '',
            });
            setTimeout(() => handleSearch(1), 100);
          }}
          className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors text-left"
        >
          <h3 className="font-medium text-gray-900">Reversed</h3>
          <p className="text-sm text-gray-500">View reversed transactions</p>
        </button>
        <Link
          to="/app/accounting/analysis"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
        >
          <h3 className="font-medium text-gray-900">Reports</h3>
          <p className="text-sm text-gray-500">Account analysis reports</p>
        </Link>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Searching...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={() => handleSearch(1)} className="mt-2 text-red-700 underline">Try again</button>
        </div>
      ) : !searched ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">?</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Search Transactions</h3>
          <p className="text-gray-500">Use the filters above to search for ledger transactions</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">0</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
          <p className="text-gray-500">Try adjusting your search filters</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <span className="text-sm text-gray-500">
                {pagination.total} transaction{pagination.total !== 1 ? 's' : ''} found
              </span>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Memo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((tx) => (
                  <tr key={tx.id} className={`hover:bg-gray-50 ${tx.status === 'REVERSED' ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(tx.occurredAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-mono text-sm text-gray-900">{tx.id.substring(0, 8)}...</p>
                      {tx.eventId && (
                        <Link to={`/app/events/${tx.eventId}`} className="text-xs text-primary-600 hover:text-primary-700">
                          View Event
                        </Link>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{tx.memo || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                        tx.status === 'POSTED' ? 'bg-green-100 text-green-700' :
                        tx.status === 'REVERSED' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/app/accounting/transactions/${tx.id}`}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Page {pagination.page} of {pagination.pages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSearch(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handleSearch(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Transaction Entry Details */}
          {transactions.length > 0 && transactions[0].entries && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Entry Details for Most Recent Transaction</h3>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions[0].entries.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <span className="font-mono text-sm text-gray-500 mr-2">{entry.accountCode}</span>
                        <span className="text-gray-900">{entry.accountName}</span>
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-gray-900">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : ''}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-gray-900">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : ''}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {entry.entityType ? `${entry.entityType}: ${entry.entityId}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
