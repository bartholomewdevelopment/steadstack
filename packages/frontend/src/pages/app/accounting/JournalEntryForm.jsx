import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { accountingApi } from '../../../services/api';
import { HelpTooltip } from '../../../components/ui/Tooltip';

const emptyLine = {
  accountId: '',
  description: '',
  debit: '',
  credit: '',
};

export default function JournalEntryForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id && id !== 'new';

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    reference: '',
    memo: '',
    lines: [{ ...emptyLine }, { ...emptyLine }],
  });

  const [existingEntry, setExistingEntry] = useState(null);

  useEffect(() => {
    fetchAccounts();
    if (isEdit) {
      fetchEntry();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchAccounts = async () => {
    try {
      const response = await accountingApi.getAccounts({ isActive: true });
      setAccounts(response.data || []);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  };

  const fetchEntry = async () => {
    try {
      setLoading(true);
      const response = await accountingApi.getJournalEntry(id);
      const entry = response.data;
      setExistingEntry(entry);

      if (entry.status !== 'DRAFT') {
        setError('Only draft entries can be edited');
        return;
      }

      setFormData({
        entryDate: entry.entryDate ? new Date(entry.entryDate).toISOString().split('T')[0] : '',
        reference: entry.reference || '',
        memo: entry.memo || '',
        lines: entry.lines.map((line) => ({
          accountId: line.accountId?._id || line.accountId || '',
          description: line.description || '',
          debit: line.debit > 0 ? line.debit.toString() : '',
          credit: line.credit > 0 ? line.credit.toString() : '',
        })),
      });
    } catch (err) {
      setError(err.message || 'Failed to load entry');
    } finally {
      setLoading(false);
    }
  };

  const totalDebits = formData.lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
  const totalCredits = formData.lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
  const difference = totalDebits - totalCredits;

  const handleLineChange = (index, field, value) => {
    const newLines = [...formData.lines];

    // If entering debit, clear credit and vice versa
    if (field === 'debit' && value) {
      newLines[index] = { ...newLines[index], debit: value, credit: '' };
    } else if (field === 'credit' && value) {
      newLines[index] = { ...newLines[index], credit: value, debit: '' };
    } else {
      newLines[index] = { ...newLines[index], [field]: value };
    }

    setFormData({ ...formData, lines: newLines });
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { ...emptyLine }],
    });
  };

  const removeLine = (index) => {
    if (formData.lines.length <= 2) {
      alert('Journal entries require at least 2 lines');
      return;
    }
    const newLines = formData.lines.filter((_, i) => i !== index);
    setFormData({ ...formData, lines: newLines });
  };

  const validateForm = () => {
    if (!formData.entryDate) {
      setError('Entry date is required');
      return false;
    }

    const validLines = formData.lines.filter(
      (line) => line.accountId && (parseFloat(line.debit) > 0 || parseFloat(line.credit) > 0)
    );

    if (validLines.length < 2) {
      setError('At least 2 lines with amounts are required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e, shouldPost = false) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = {
        entryDate: formData.entryDate,
        reference: formData.reference || undefined,
        memo: formData.memo || undefined,
        lines: formData.lines
          .filter((line) => line.accountId && (parseFloat(line.debit) > 0 || parseFloat(line.credit) > 0))
          .map((line) => ({
            accountId: line.accountId,
            description: line.description,
            debit: parseFloat(line.debit) || 0,
            credit: parseFloat(line.credit) || 0,
          })),
      };

      let entryId = id;

      if (isEdit) {
        await accountingApi.updateJournalEntry(id, payload);
      } else {
        const response = await accountingApi.createJournalEntry(payload);
        entryId = response.data.id;
      }

      if (shouldPost && isBalanced) {
        setPosting(true);
        await accountingApi.postJournalEntry(entryId);
      }

      navigate('/app/accounting/journal-entries');
    } catch (err) {
      setError(err.message || 'Failed to save entry');
    } finally {
      setSaving(false);
      setPosting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  // Group accounts by type for easier selection
  const accountsByType = accounts.reduce((acc, account) => {
    if (!acc[account.type]) acc[account.type] = [];
    acc[account.type].push(account);
    return acc;
  }, {});

  const accountTypeOrder = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'COGS', 'EXPENSE'];

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <p className="mt-2 text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error && existingEntry?.status !== 'DRAFT') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600">{error}</p>
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
          <div className="flex items-center gap-2">
            <Link to="/app/accounting/journal-entries" className="text-gray-500 hover:text-gray-700">
              Journal Entries
            </Link>
            <span className="text-gray-400">/</span>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? `Edit ${existingEntry?.entryNumber || 'Entry'}` : 'New Journal Entry'}
            </h1>
            <HelpTooltip
              content="Create balanced debit and credit entries. Total debits must equal total credits before posting."
              position="right"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)}>
        {/* Entry Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Entry Details</h2>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entry Date *
              </label>
              <input
                type="date"
                value={formData.entryDate}
                onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                className="input"
                placeholder="Optional reference #"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Memo
              </label>
              <input
                type="text"
                value={formData.memo}
                onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                className="input"
                placeholder="Description of this entry"
              />
            </div>
          </div>
        </div>

        {/* Entry Lines */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Entry Lines</h2>
            <button
              type="button"
              onClick={addLine}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              + Add Line
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/3">Account</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">Debit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">Credit</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {formData.lines.map((line, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3">
                      <select
                        value={line.accountId}
                        onChange={(e) => handleLineChange(index, 'accountId', e.target.value)}
                        className="input py-2 text-sm"
                      >
                        <option value="">Select account...</option>
                        {accountTypeOrder.map((type) =>
                          accountsByType[type]?.length > 0 && (
                            <optgroup key={type} label={type}>
                              {accountsByType[type]
                                .sort((a, b) => a.code.localeCompare(b.code))
                                .map((account) => (
                                  <option key={account.id} value={account.id}>
                                    {account.code} - {account.name}
                                  </option>
                                ))}
                            </optgroup>
                          )
                        )}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                        className="input py-2 text-sm"
                        placeholder="Line description"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.debit}
                        onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                        className="input py-2 text-sm text-right font-mono"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.credit}
                        onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                        className="input py-2 text-sm text-right font-mono"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="text-red-500 hover:text-red-700"
                        title="Remove line"
                      >
                        X
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-medium">
                <tr>
                  <td className="px-4 py-3 text-right" colSpan="2">
                    Totals:
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatCurrency(totalDebits)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatCurrency(totalCredits)}
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-right" colSpan="2">
                    Difference:
                  </td>
                  <td className="px-4 py-3 text-right font-mono" colSpan="2">
                    <span className={isBalanced ? 'text-green-600' : 'text-red-600'}>
                      {isBalanced ? 'Balanced' : formatCurrency(Math.abs(difference))}
                      {!isBalanced && (difference > 0 ? ' (more debits)' : ' (more credits)')}
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Balance Indicator */}
        <div className={`rounded-xl p-4 mb-6 ${isBalanced ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <div className="flex items-center gap-2">
            <span className={`text-2xl ${isBalanced ? 'text-green-600' : 'text-yellow-600'}`}>
              {isBalanced ? '=' : 'X'}
            </span>
            <div>
              <p className={`font-medium ${isBalanced ? 'text-green-700' : 'text-yellow-700'}`}>
                {isBalanced ? 'Entry is balanced!' : 'Entry is not balanced'}
              </p>
              <p className={`text-sm ${isBalanced ? 'text-green-600' : 'text-yellow-600'}`}>
                {isBalanced
                  ? 'You can save as draft or post this entry.'
                  : 'Debits and credits must be equal before posting.'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <Link to="/app/accounting/journal-entries" className="btn-secondary">
            Cancel
          </Link>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || posting}
              className="btn-secondary"
            >
              {saving ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={!isBalanced || saving || posting}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {posting ? 'Posting...' : 'Save & Post'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
