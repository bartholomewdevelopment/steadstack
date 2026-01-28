import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { accountingApi } from '../../../services/api';
import { HelpTooltip } from '../../../components/ui/Tooltip';
import AccountingNav from '../../../components/accounting/AccountingNav';

// CSV parsing helper
const parseCSV = (text) => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [], error: 'CSV must have a header row and at least one data row' };

  // Parse header row
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));

  // Validate required columns
  const requiredColumns = ['code', 'name', 'type'];
  const missingColumns = requiredColumns.filter((col) => !headers.includes(col));
  if (missingColumns.length > 0) {
    return { headers: [], rows: [], error: `Missing required columns: ${missingColumns.join(', ')}` };
  }

  // Parse data rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (handles quoted values)
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    // Map values to object
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }

  return { headers, rows, error: null };
};

const accountTypeColors = {
  ASSET: 'bg-blue-100 text-blue-700',
  LIABILITY: 'bg-red-100 text-red-700',
  EQUITY: 'bg-purple-100 text-purple-700',
  INCOME: 'bg-green-100 text-green-700',
  EXPENSE: 'bg-orange-100 text-orange-700',
  COGS: 'bg-yellow-100 text-yellow-700',
};

const accountTypeOrder = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'COGS', 'EXPENSE'];

const accountTypeTooltips = {
  ASSET: 'Things you own: cash, inventory, equipment, land, livestock',
  LIABILITY: 'What you owe: loans, credit cards, accounts payable',
  EQUITY: 'Your ownership stake: owner investment and retained earnings',
  INCOME: 'Money coming in: sales revenue, service income',
  COGS: 'Cost of Goods Sold: direct costs of products you sell',
  EXPENSE: 'Operating costs: feed, fuel, repairs, utilities',
};

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

  // CSV Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState({ headers: [], rows: [] });
  const [importError, setImportError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const fileInputRef = useRef(null);

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

  // CSV Import handlers
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        const { headers, rows, error } = parseCSV(text);
        if (error) {
          setImportError(error);
          setImportData({ headers: [], rows: [] });
        } else {
          setImportData({ headers, rows });
        }
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      const input = fileInputRef.current;
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        handleFileSelect({ target: input });
      }
    } else {
      setImportError('Please drop a CSV file');
    }
  };

  const handleImport = async () => {
    if (importData.rows.length === 0) return;

    try {
      setImporting(true);
      setImportError(null);
      const response = await accountingApi.importAccounts(importData.rows, skipDuplicates);
      setImportResult(response);
      if (response.summary.imported > 0) {
        fetchAccounts();
      }
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const resetImportModal = () => {
    setShowImportModal(false);
    setImportData({ headers: [], rows: [] });
    setImportError(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
    <div>
      <AccountingNav />
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
            <HelpTooltip content="Your chart of accounts is the backbone of your accounting system. Each account tracks a specific type of financial activity." position="right" />
          </div>
          <p className="text-gray-600">Manage your general ledger accounts</p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/accounting/journal-entries/new" className="btn-secondary">
            Journal Entry
          </Link>
          <button onClick={() => setShowImportModal(true)} className="btn-secondary">
            Import CSV
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            + Add Account
          </button>
        </div>
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
            <div className="flex items-center gap-1">
              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${accountTypeColors[type]}`}>
                {type}
              </span>
              <HelpTooltip content={accountTypeTooltips[type]} position="top" />
            </div>
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

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Import Accounts from CSV</h2>
              <p className="text-sm text-gray-500 mt-1">
                Upload a CSV file with columns: code, name, type (required), subtype, description (optional)
              </p>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-4">
              {/* File Upload Area */}
              {!importResult && (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <div className="text-4xl mb-2">📄</div>
                    <p className="text-gray-600 mb-2">
                      Drag and drop a CSV file here, or click to browse
                    </p>
                    <span className="text-primary-600 font-medium">Select CSV File</span>
                  </label>
                </div>
              )}

              {/* Error Message */}
              {importError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                  {importError}
                </div>
              )}

              {/* Import Result */}
              {importResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-green-700">{importResult.summary.imported}</p>
                      <p className="text-sm text-green-600">Imported</p>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-yellow-700">{importResult.summary.skipped}</p>
                      <p className="text-sm text-yellow-600">Skipped</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-red-700">{importResult.summary.failed}</p>
                      <p className="text-sm text-red-600">Failed</p>
                    </div>
                  </div>

                  {/* Error details */}
                  {importResult.data.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-medium text-red-700 mb-2">Errors:</h4>
                      <ul className="text-sm text-red-600 space-y-1">
                        {importResult.data.errors.map((err, i) => (
                          <li key={i}>Row {err.row} ({err.code}): {err.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Skipped details */}
                  {importResult.data.skipped.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-700 mb-2">Skipped (duplicates):</h4>
                      <ul className="text-sm text-yellow-600 space-y-1">
                        {importResult.data.skipped.slice(0, 10).map((skip, i) => (
                          <li key={i}>Row {skip.row}: {skip.code} - {skip.reason}</li>
                        ))}
                        {importResult.data.skipped.length > 10 && (
                          <li>...and {importResult.data.skipped.length - 10} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Preview Table */}
              {importData.rows.length > 0 && !importResult && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">
                      Preview ({importData.rows.length} accounts)
                    </h3>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={skipDuplicates}
                        onChange={(e) => setSkipDuplicates(e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      Skip duplicate codes
                    </label>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-auto max-h-64">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Row</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Code</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Subtype</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {importData.rows.slice(0, 50).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                            <td className="px-3 py-2 font-mono">{row.code}</td>
                            <td className="px-3 py-2">{row.name}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                                accountTypeColors[row.type?.toUpperCase()] || 'bg-gray-100 text-gray-600'
                              }`}>
                                {row.type?.toUpperCase() || '-'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-600">{row.subtype || '-'}</td>
                            <td className="px-3 py-2 text-gray-500 truncate max-w-xs">{row.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importData.rows.length > 50 && (
                      <div className="px-3 py-2 bg-gray-50 text-sm text-gray-500 text-center">
                        Showing first 50 of {importData.rows.length} rows
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CSV Format Help */}
              {!importData.rows.length && !importResult && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">CSV Format Example:</h4>
                  <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto">
{`code,name,type,subtype,description
1000,Cash,ASSET,CASH,Main operating cash account
1100,Accounts Receivable,ASSET,AR,Customer receivables
2000,Accounts Payable,LIABILITY,AP,Vendor payables
4000,Sales Revenue,INCOME,SALES,Revenue from sales
6000,Feed Expense,EXPENSE,FEED,Animal feed costs`}
                  </pre>
                  <p className="text-xs text-gray-500 mt-2">
                    Valid types: ASSET, LIABILITY, EQUITY, INCOME, EXPENSE, COGS
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
              <button
                type="button"
                onClick={resetImportModal}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                {importResult ? 'Close' : 'Cancel'}
              </button>
              {!importResult && importData.rows.length > 0 && (
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="btn-primary"
                >
                  {importing ? 'Importing...' : `Import ${importData.rows.length} Accounts`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
