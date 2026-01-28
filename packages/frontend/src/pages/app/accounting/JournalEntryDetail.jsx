import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { accountingApi } from '../../../services/api';
import { HelpTooltip } from '../../../components/ui/Tooltip';

const statusColors = {
  DRAFT: 'bg-yellow-100 text-yellow-700',
  POSTED: 'bg-green-100 text-green-700',
  REVERSED: 'bg-red-100 text-red-700',
};

export default function JournalEntryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchEntry();
  }, [id]);

  const fetchEntry = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await accountingApi.getJournalEntry(id);
      setEntry(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load entry');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!confirm('Post this journal entry? This will create ledger entries and cannot be undone.')) return;

    try {
      setActionLoading(true);
      await accountingApi.postJournalEntry(id);
      fetchEntry();
    } catch (err) {
      alert(err.message || 'Failed to post entry');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReverse = async () => {
    const reason = prompt('Reason for reversal (optional):');
    if (reason === null) return;

    try {
      setActionLoading(true);
      await accountingApi.reverseJournalEntry(id, reason);
      fetchEntry();
    } catch (err) {
      alert(err.message || 'Failed to reverse entry');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this draft entry? This cannot be undone.')) return;

    try {
      setActionLoading(true);
      await accountingApi.deleteJournalEntry(id);
      navigate('/app/accounting/journal-entries');
    } catch (err) {
      alert(err.message || 'Failed to delete entry');
      setActionLoading(false);
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
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <p className="mt-2 text-gray-500">Loading entry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600">{error}</p>
        <Link to="/app/accounting/journal-entries" className="mt-4 btn-secondary inline-block">
          Back to Journal Entries
        </Link>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <p className="text-gray-600">Entry not found</p>
        <Link to="/app/accounting/journal-entries" className="mt-4 btn-secondary inline-block">
          Back to Journal Entries
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/app/accounting/journal-entries" className="text-gray-500 hover:text-gray-700">
              Journal Entries
            </Link>
            <span className="text-gray-400">/</span>
            <h1 className="text-2xl font-bold text-gray-900">{entry.entryNumber}</h1>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${statusColors[entry.status]}`}>
              {entry.status}
            </span>
          </div>
          <p className="text-gray-600">{formatDate(entry.entryDate)}</p>
        </div>

        <div className="flex gap-2">
          {entry.status === 'DRAFT' && (
            <>
              <Link
                to={`/app/accounting/journal-entries/${id}/edit`}
                className="btn-secondary"
              >
                Edit
              </Link>
              {entry.isBalanced && (
                <button
                  onClick={handlePost}
                  disabled={actionLoading}
                  className="btn-primary"
                >
                  {actionLoading ? 'Posting...' : 'Post Entry'}
                </button>
              )}
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="btn-secondary text-red-600 border-red-300 hover:bg-red-50"
              >
                Delete
              </button>
            </>
          )}
          {entry.status === 'POSTED' && !entry.reversedByEntryId && (
            <button
              onClick={handleReverse}
              disabled={actionLoading}
              className="btn-secondary text-red-600 border-red-300 hover:bg-red-50"
            >
              {actionLoading ? 'Reversing...' : 'Reverse Entry'}
            </button>
          )}
        </div>
      </div>

      {/* Entry Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Entry Details</h2>

        <div className="grid md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500">Entry Number</p>
            <p className="font-mono font-medium">{entry.entryNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Entry Date</p>
            <p className="font-medium">{formatDate(entry.entryDate)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Reference</p>
            <p className="font-medium">{entry.reference || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${statusColors[entry.status]}`}>
              {entry.status}
            </span>
          </div>
        </div>

        {entry.memo && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">Memo</p>
            <p className="text-gray-900">{entry.memo}</p>
          </div>
        )}

        {entry.reversesEntryId && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">
              This entry reverses{' '}
              <Link to={`/app/accounting/journal-entries/${entry.reversesEntryId}`} className="underline">
                another entry
              </Link>
              {entry.reversalReason && `: ${entry.reversalReason}`}
            </p>
          </div>
        )}

        {entry.reversedByEntryId && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              This entry was reversed by{' '}
              <Link to={`/app/accounting/journal-entries/${entry.reversedByEntryId}`} className="underline">
                another entry
              </Link>
            </p>
          </div>
        )}
      </div>

      {/* Entry Lines */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Entry Lines</h2>
        </div>

        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {entry.lines.map((line, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-500">{line.lineNumber || index + 1}</td>
                <td className="px-6 py-4">
                  <p className="font-mono text-sm">{line.accountCode}</p>
                  <p className="text-sm text-gray-600">{line.accountName}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {line.description || '-'}
                </td>
                <td className="px-6 py-4 text-right font-mono text-sm">
                  {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                </td>
                <td className="px-6 py-4 text-right font-mono text-sm">
                  {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 font-medium">
            <tr>
              <td colSpan="3" className="px-6 py-4 text-right">Totals:</td>
              <td className="px-6 py-4 text-right font-mono">{formatCurrency(entry.totalDebits)}</td>
              <td className="px-6 py-4 text-right font-mono">{formatCurrency(entry.totalCredits)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Balance Status */}
      <div className={`rounded-xl p-4 mb-6 ${entry.isBalanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center gap-2">
          <span className={`text-2xl ${entry.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
            {entry.isBalanced ? '=' : 'X'}
          </span>
          <p className={`font-medium ${entry.isBalanced ? 'text-green-700' : 'text-red-700'}`}>
            {entry.isBalanced ? 'Entry is balanced' : 'Entry is NOT balanced'}
          </p>
        </div>
      </div>

      {/* Audit Trail */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Audit Trail</h2>

        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-gray-500">Created</p>
            <p className="text-gray-900">{formatDateTime(entry.createdAt)}</p>
            {entry.createdBy && <p className="text-gray-600">by {entry.createdBy}</p>}
          </div>
          {entry.postedAt && (
            <div>
              <p className="text-gray-500">Posted</p>
              <p className="text-gray-900">{formatDateTime(entry.postedAt)}</p>
              {entry.postedBy && <p className="text-gray-600">by {entry.postedBy}</p>}
            </div>
          )}
          {entry.reversedAt && (
            <div>
              <p className="text-gray-500">Reversed</p>
              <p className="text-gray-900">{formatDateTime(entry.reversedAt)}</p>
              {entry.reversedBy && <p className="text-gray-600">by {entry.reversedBy}</p>}
            </div>
          )}
          {entry.ledgerTransactionId && (
            <div>
              <p className="text-gray-500">Ledger Transaction</p>
              <p className="font-mono text-xs text-gray-600">{entry.ledgerTransactionId}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
