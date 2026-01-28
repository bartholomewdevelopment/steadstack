import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { accountingApi } from '../../../services/api';
import { HelpTooltip } from '../../../components/ui/Tooltip';
import AccountingNav from '../../../components/accounting/AccountingNav';

const statusColors = {
  DRAFT: 'bg-yellow-100 text-yellow-700',
  POSTED: 'bg-green-100 text-green-700',
  REVERSED: 'bg-red-100 text-red-700',
};

export default function JournalEntries() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 });

  useEffect(() => {
    fetchEntries();
  }, [filterStatus]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { limit: pagination.limit, offset: pagination.offset };
      if (filterStatus) params.status = filterStatus;

      const response = await accountingApi.getJournalEntries(params);
      setEntries(response.data || []);
      setPagination(response.pagination || { total: 0, limit: 50, offset: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (id) => {
    if (!confirm('Post this journal entry? This action cannot be undone.')) return;

    try {
      await accountingApi.postJournalEntry(id);
      fetchEntries();
    } catch (err) {
      alert(err.message || 'Failed to post entry');
    }
  };

  const handleReverse = async (id) => {
    const reason = prompt('Reason for reversal (optional):');
    if (reason === null) return; // User cancelled

    try {
      await accountingApi.reverseJournalEntry(id, reason);
      fetchEntries();
    } catch (err) {
      alert(err.message || 'Failed to reverse entry');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this draft entry?')) return;

    try {
      await accountingApi.deleteJournalEntry(id);
      fetchEntries();
    } catch (err) {
      alert(err.message || 'Failed to delete entry');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div>
      <AccountingNav />
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Journal Entries</h1>
            <HelpTooltip
              content="Manual journal entries allow you to record adjusting entries, corrections, and transactions not tied to operational events."
              position="right"
            />
          </div>
          <p className="text-gray-600">Create and manage manual journal entries</p>
        </div>
        <Link to="/app/accounting/journal-entries/new" className="btn-primary">
          + New Journal Entry
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input py-2 min-w-[150px]"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="POSTED">Posted</option>
              <option value="REVERSED">Reversed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Entries List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading journal entries...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchEntries} className="mt-2 text-red-700 underline">
            Try again
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">JE</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No journal entries found</h3>
          <p className="text-gray-500 mb-4">
            {filterStatus ? 'Try adjusting your filters' : 'Create your first journal entry'}
          </p>
          <Link to="/app/accounting/journal-entries/new" className="btn-primary">
            + New Journal Entry
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Memo</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debits</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credits</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      to={`/app/accounting/journal-entries/${entry.id}`}
                      className="font-mono text-primary-600 hover:text-primary-700"
                    >
                      {entry.entryNumber}
                    </Link>
                    {entry.reference && (
                      <p className="text-xs text-gray-500">Ref: {entry.reference}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDate(entry.entryDate)}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900 truncate max-w-xs">
                      {entry.memo || '-'}
                    </p>
                    <p className="text-xs text-gray-500">{entry.lines?.length || 0} lines</p>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm">
                    {formatCurrency(entry.totalDebits)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm">
                    {formatCurrency(entry.totalCredits)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${statusColors[entry.status]}`}>
                      {entry.status}
                    </span>
                    {!entry.isBalanced && entry.status === 'DRAFT' && (
                      <span className="ml-1 inline-flex px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-700">
                        Unbalanced
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {entry.status === 'DRAFT' && (
                        <>
                          <button
                            onClick={() => navigate(`/app/accounting/journal-entries/${entry.id}/edit`)}
                            className="text-sm text-gray-600 hover:text-gray-900"
                          >
                            Edit
                          </button>
                          {entry.isBalanced && (
                            <button
                              onClick={() => handlePost(entry.id)}
                              className="text-sm text-green-600 hover:text-green-700 font-medium"
                            >
                              Post
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {entry.status === 'POSTED' && !entry.reversedByEntryId && (
                        <button
                          onClick={() => handleReverse(entry.id)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Reverse
                        </button>
                      )}
                      <Link
                        to={`/app/accounting/journal-entries/${entry.id}`}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <p className="text-sm text-gray-500">
                Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} entries
              </p>
              <div className="flex gap-2">
                <button
                  disabled={pagination.offset === 0}
                  onClick={() => setPagination({ ...pagination, offset: Math.max(0, pagination.offset - pagination.limit) })}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={pagination.offset + pagination.limit >= pagination.total}
                  onClick={() => setPagination({ ...pagination, offset: pagination.offset + pagination.limit })}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
