import { useState, useEffect } from 'react';
import { accountingApi } from '../../../services/api';

const reportTypes = [
  {
    id: 'trial-balance',
    name: 'Trial Balance',
    description: 'View debits and credits for all accounts as of a specific date',
    icon: '⚖️',
  },
  {
    id: 'income-statement',
    name: 'Income Statement',
    description: 'Profit & Loss report showing revenue, expenses, and net income',
    icon: '📈',
  },
  {
    id: 'balance-sheet',
    name: 'Balance Sheet',
    description: 'Assets, liabilities, and equity as of a specific date',
    icon: '📊',
  },
];

const accountTypeColors = {
  ASSET: 'text-blue-700',
  LIABILITY: 'text-red-700',
  EQUITY: 'text-purple-700',
  INCOME: 'text-green-700',
  EXPENSE: 'text-orange-700',
  COGS: 'text-yellow-700',
};

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState('trial-balance');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Date filters
  const today = new Date().toISOString().split('T')[0];
  const firstOfYear = `${new Date().getFullYear()}-01-01`;
  const [asOfDate, setAsOfDate] = useState(today);
  const [startDate, setStartDate] = useState(firstOfYear);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    fetchReport();
  }, [selectedReport, asOfDate, startDate, endDate]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);

    try {
      let response;
      switch (selectedReport) {
        case 'trial-balance':
          response = await accountingApi.getTrialBalance({ asOfDate });
          break;
        case 'income-statement':
          response = await accountingApi.getIncomeStatement({ startDate, endDate });
          break;
        case 'balance-sheet':
          response = await accountingApi.getBalanceSheet({ asOfDate });
          break;
        default:
          throw new Error('Unknown report type');
      }
      setReportData(response.data || response);
    } catch (err) {
      setError(err.message);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    const value = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(Math.abs(value));
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderTrialBalance = () => {
    if (!reportData?.accounts) return null;

    const totals = reportData.accounts.reduce(
      (acc, account) => {
        acc.debits += account.debitBalance || 0;
        acc.credits += account.creditBalance || 0;
        return acc;
      },
      { debits: 0, credits: 0 }
    );

    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Trial Balance</h2>
          <p className="text-sm text-gray-500">As of {formatDate(asOfDate)}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Account
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Debit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Credit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reportData.accounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-gray-500">{account.code}</span>
                      <span className={`font-medium ${accountTypeColors[account.type] || ''}`}>
                        {account.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right font-mono">
                    {account.debitBalance > 0 ? formatCurrency(account.debitBalance) : '-'}
                  </td>
                  <td className="px-6 py-3 text-right font-mono">
                    {account.creditBalance > 0 ? formatCurrency(account.creditBalance) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-semibold">
              <tr>
                <td className="px-6 py-3">Total</td>
                <td className="px-6 py-3 text-right font-mono">{formatCurrency(totals.debits)}</td>
                <td className="px-6 py-3 text-right font-mono">{formatCurrency(totals.credits)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {Math.abs(totals.debits - totals.credits) > 0.01 && (
          <div className="px-6 py-3 bg-red-50 border-t border-red-200">
            <p className="text-red-600 text-sm font-medium">
              Warning: Trial balance is out of balance by {formatCurrency(totals.debits - totals.credits)}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderIncomeStatement = () => {
    if (!reportData) return null;

    const { revenue = [], expenses = [], netIncome = 0 } = reportData;

    const totalRevenue = revenue.reduce((sum, item) => sum + (item.balance || 0), 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + (item.balance || 0), 0);

    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Income Statement</h2>
          <p className="text-sm text-gray-500">
            {formatDate(startDate)} - {formatDate(endDate)}
          </p>
        </div>
        <div className="p-6 space-y-6">
          {/* Revenue Section */}
          <div>
            <h3 className="font-semibold text-green-700 mb-3">Revenue</h3>
            <div className="space-y-2">
              {revenue.length > 0 ? (
                revenue.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-1">
                    <span className="text-gray-700">{item.name}</span>
                    <span className="font-mono text-green-600">{formatCurrency(item.balance)}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm">No revenue recorded</p>
              )}
            </div>
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200 font-semibold">
              <span>Total Revenue</span>
              <span className="font-mono text-green-700">{formatCurrency(totalRevenue)}</span>
            </div>
          </div>

          {/* Expenses Section */}
          <div>
            <h3 className="font-semibold text-orange-700 mb-3">Expenses</h3>
            <div className="space-y-2">
              {expenses.length > 0 ? (
                expenses.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-1">
                    <span className="text-gray-700">{item.name}</span>
                    <span className="font-mono text-orange-600">{formatCurrency(item.balance)}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm">No expenses recorded</p>
              )}
            </div>
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200 font-semibold">
              <span>Total Expenses</span>
              <span className="font-mono text-orange-700">{formatCurrency(totalExpenses)}</span>
            </div>
          </div>

          {/* Net Income */}
          <div className="pt-4 border-t-2 border-gray-300">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Net Income</span>
              <span className={`font-mono ${netIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {netIncome < 0 && '('}
                {formatCurrency(netIncome)}
                {netIncome < 0 && ')'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBalanceSheet = () => {
    if (!reportData) return null;

    const { assets = [], liabilities = [], equity = [] } = reportData;

    const totalAssets = assets.reduce((sum, item) => sum + (item.balance || 0), 0);
    const totalLiabilities = liabilities.reduce((sum, item) => sum + (item.balance || 0), 0);
    const totalEquity = equity.reduce((sum, item) => sum + (item.balance || 0), 0);

    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Balance Sheet</h2>
          <p className="text-sm text-gray-500">As of {formatDate(asOfDate)}</p>
        </div>
        <div className="p-6 space-y-6">
          {/* Assets Section */}
          <div>
            <h3 className="font-semibold text-blue-700 mb-3">Assets</h3>
            <div className="space-y-2">
              {assets.length > 0 ? (
                assets.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-1">
                    <span className="text-gray-700">{item.name}</span>
                    <span className="font-mono">{formatCurrency(item.balance)}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm">No assets recorded</p>
              )}
            </div>
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200 font-semibold">
              <span>Total Assets</span>
              <span className="font-mono text-blue-700">{formatCurrency(totalAssets)}</span>
            </div>
          </div>

          {/* Liabilities Section */}
          <div>
            <h3 className="font-semibold text-red-700 mb-3">Liabilities</h3>
            <div className="space-y-2">
              {liabilities.length > 0 ? (
                liabilities.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-1">
                    <span className="text-gray-700">{item.name}</span>
                    <span className="font-mono">{formatCurrency(item.balance)}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm">No liabilities recorded</p>
              )}
            </div>
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200 font-semibold">
              <span>Total Liabilities</span>
              <span className="font-mono text-red-700">{formatCurrency(totalLiabilities)}</span>
            </div>
          </div>

          {/* Equity Section */}
          <div>
            <h3 className="font-semibold text-purple-700 mb-3">Equity</h3>
            <div className="space-y-2">
              {equity.length > 0 ? (
                equity.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-1">
                    <span className="text-gray-700">{item.name}</span>
                    <span className="font-mono">{formatCurrency(item.balance)}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm">No equity recorded</p>
              )}
            </div>
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200 font-semibold">
              <span>Total Equity</span>
              <span className="font-mono text-purple-700">{formatCurrency(totalEquity)}</span>
            </div>
          </div>

          {/* Balance Check */}
          <div className="pt-4 border-t-2 border-gray-300">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total Liabilities + Equity</span>
              <span className="font-mono">{formatCurrency(totalLiabilities + totalEquity)}</span>
            </div>
            {Math.abs(totalAssets - (totalLiabilities + totalEquity)) > 0.01 && (
              <p className="text-red-600 text-sm mt-2">
                Warning: Balance sheet is out of balance
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderReport = () => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading report...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchReport} className="mt-2 text-red-700 underline">
            Try again
          </button>
        </div>
      );
    }

    switch (selectedReport) {
      case 'trial-balance':
        return renderTrialBalance();
      case 'income-statement':
        return renderIncomeStatement();
      case 'balance-sheet':
        return renderBalanceSheet();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600">Generate financial reports for your farm</p>
      </div>

      {/* Report Type Selection */}
      <div className="grid md:grid-cols-3 gap-4">
        {reportTypes.map((report) => (
          <button
            key={report.id}
            onClick={() => setSelectedReport(report.id)}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedReport === report.id
                ? 'bg-primary-50 border-primary-300 ring-2 ring-primary-200'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{report.icon}</span>
              <div>
                <p className="font-semibold text-gray-900">{report.name}</p>
                <p className="text-sm text-gray-500">{report.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Date Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          {selectedReport === 'income-statement' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input py-2"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                As of Date
              </label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="input py-2"
              />
            </div>
          )}
          <div className="flex items-end">
            <button onClick={fetchReport} className="btn-primary">
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      {renderReport()}
    </div>
  );
}
