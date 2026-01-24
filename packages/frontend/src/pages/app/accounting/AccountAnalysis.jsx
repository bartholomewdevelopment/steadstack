import { useState, useEffect } from 'react';
import { accountingApi } from '../../../services/api';

export default function AccountAnalysis() {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportType, setReportType] = useState('trial_balance');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchReport();
  }, [reportType, dateRange]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await accountingApi.getAccountBalances({
        ...dateRange,
        reportType,
      });

      setBalances(response.balances || []);
    } catch (err) {
      setError(err.message);
      setBalances([]);
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

  // Group balances by account type
  const groupedBalances = balances.reduce((acc, balance) => {
    if (!acc[balance.accountType]) acc[balance.accountType] = [];
    acc[balance.accountType].push(balance);
    return acc;
  }, {});

  // Calculate totals
  const totalDebits = balances.reduce((sum, b) => sum + (b.debitBalance || 0), 0);
  const totalCredits = balances.reduce((sum, b) => sum + (b.creditBalance || 0), 0);

  // Calculate category totals for Balance Sheet / Income Statement
  const assetTotal = (groupedBalances.ASSET || []).reduce((sum, b) => sum + (b.balance || 0), 0);
  const liabilityTotal = (groupedBalances.LIABILITY || []).reduce((sum, b) => sum + (b.balance || 0), 0);
  const equityTotal = (groupedBalances.EQUITY || []).reduce((sum, b) => sum + (b.balance || 0), 0);
  const incomeTotal = (groupedBalances.INCOME || []).reduce((sum, b) => sum + (b.balance || 0), 0);
  const cogsTotal = (groupedBalances.COGS || []).reduce((sum, b) => sum + (b.balance || 0), 0);
  const expenseTotal = (groupedBalances.EXPENSE || []).reduce((sum, b) => sum + (b.balance || 0), 0);

  const netIncome = incomeTotal - cogsTotal - expenseTotal;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Analysis</h1>
          <p className="text-gray-600">Financial reports and account balances</p>
        </div>
        <button
          onClick={() => window.print()}
          className="btn-secondary"
        >
          Print Report
        </button>
      </div>

      {/* Report Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="input py-2 min-w-[180px]"
            >
              <option value="trial_balance">Trial Balance</option>
              <option value="balance_sheet">Balance Sheet</option>
              <option value="income_statement">Income Statement</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="input py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="input py-2"
            />
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setReportType('trial_balance')}
          className={`p-4 rounded-xl border text-left transition-colors ${
            reportType === 'trial_balance' ? 'bg-primary-50 border-primary-200' : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <h3 className="font-medium text-gray-900">Trial Balance</h3>
          <p className="text-sm text-gray-500">All accounts with balances</p>
        </button>
        <button
          onClick={() => setReportType('balance_sheet')}
          className={`p-4 rounded-xl border text-left transition-colors ${
            reportType === 'balance_sheet' ? 'bg-primary-50 border-primary-200' : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <h3 className="font-medium text-gray-900">Balance Sheet</h3>
          <p className="text-sm text-gray-500">Assets, Liabilities, Equity</p>
        </button>
        <button
          onClick={() => setReportType('income_statement')}
          className={`p-4 rounded-xl border text-left transition-colors ${
            reportType === 'income_statement' ? 'bg-primary-50 border-primary-200' : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <h3 className="font-medium text-gray-900">Income Statement</h3>
          <p className="text-sm text-gray-500">Revenue and Expenses</p>
        </button>
        <button
          onClick={() => window.location.href = '/app/accounting/inquiry'}
          className="p-4 rounded-xl border bg-white border-gray-200 hover:bg-gray-50 text-left transition-colors"
        >
          <h3 className="font-medium text-gray-900">Account Inquiry</h3>
          <p className="text-sm text-gray-500">Search transactions</p>
        </button>
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Generating report...</p>
        </div>
      ) : error ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-yellow-700">Unable to load report. Make sure you have posted transactions.</p>
          <button onClick={fetchReport} className="mt-2 text-yellow-800 underline">Try again</button>
        </div>
      ) : (
        <>
          {/* Trial Balance */}
          {reportType === 'trial_balance' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden print:shadow-none">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 print:bg-white">
                <h2 className="text-lg font-semibold text-gray-900 text-center">Trial Balance</h2>
                <p className="text-sm text-gray-500 text-center">
                  As of {new Date(dateRange.endDate).toLocaleDateString()}
                </p>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {balances.map((balance) => (
                    <tr key={balance.accountId} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <span className="font-mono text-sm text-gray-500 mr-2">{balance.accountCode}</span>
                        <span className="text-gray-900">{balance.accountName}</span>
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-gray-900">
                        {balance.debitBalance > 0 ? formatCurrency(balance.debitBalance) : ''}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-gray-900">
                        {balance.creditBalance > 0 ? formatCurrency(balance.creditBalance) : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                  <tr>
                    <td className="px-6 py-3 font-semibold text-gray-900">TOTALS</td>
                    <td className="px-6 py-3 text-right font-mono font-semibold text-gray-900">
                      {formatCurrency(totalDebits)}
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-semibold text-gray-900">
                      {formatCurrency(totalCredits)}
                    </td>
                  </tr>
                  {Math.abs(totalDebits - totalCredits) > 0.01 && (
                    <tr className="bg-red-50">
                      <td className="px-6 py-2 text-red-700" colSpan={3}>
                        Warning: Trial balance is out of balance by {formatCurrency(Math.abs(totalDebits - totalCredits))}
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          )}

          {/* Balance Sheet */}
          {reportType === 'balance_sheet' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 text-center">Balance Sheet</h2>
                <p className="text-sm text-gray-500 text-center">
                  As of {new Date(dateRange.endDate).toLocaleDateString()}
                </p>
              </div>
              <div className="grid md:grid-cols-2 divide-x divide-gray-200">
                {/* Assets */}
                <div className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">ASSETS</h3>
                  {(groupedBalances.ASSET || []).map((balance) => (
                    <div key={balance.accountId} className="flex justify-between py-1">
                      <span className="text-gray-700">{balance.accountName}</span>
                      <span className="font-mono text-gray-900">{formatCurrency(balance.balance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 mt-2 border-t border-gray-200 font-semibold">
                    <span>Total Assets</span>
                    <span className="font-mono">{formatCurrency(assetTotal)}</span>
                  </div>
                </div>

                {/* Liabilities & Equity */}
                <div className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">LIABILITIES</h3>
                  {(groupedBalances.LIABILITY || []).map((balance) => (
                    <div key={balance.accountId} className="flex justify-between py-1">
                      <span className="text-gray-700">{balance.accountName}</span>
                      <span className="font-mono text-gray-900">{formatCurrency(balance.balance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 mt-2 border-t border-gray-200 font-semibold">
                    <span>Total Liabilities</span>
                    <span className="font-mono">{formatCurrency(liabilityTotal)}</span>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-4 mt-6">EQUITY</h3>
                  {(groupedBalances.EQUITY || []).map((balance) => (
                    <div key={balance.accountId} className="flex justify-between py-1">
                      <span className="text-gray-700">{balance.accountName}</span>
                      <span className="font-mono text-gray-900">{formatCurrency(balance.balance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1">
                    <span className="text-gray-700">Net Income (Current Period)</span>
                    <span className="font-mono text-gray-900">{formatCurrency(netIncome)}</span>
                  </div>
                  <div className="flex justify-between py-2 mt-2 border-t border-gray-200 font-semibold">
                    <span>Total Equity</span>
                    <span className="font-mono">{formatCurrency(equityTotal + netIncome)}</span>
                  </div>

                  <div className="flex justify-between py-3 mt-4 border-t-2 border-gray-300 font-bold text-lg">
                    <span>Total Liabilities & Equity</span>
                    <span className="font-mono">{formatCurrency(liabilityTotal + equityTotal + netIncome)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Income Statement */}
          {reportType === 'income_statement' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 text-center">Income Statement</h2>
                <p className="text-sm text-gray-500 text-center">
                  {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}
                </p>
              </div>
              <div className="p-6 max-w-2xl mx-auto">
                {/* Revenue */}
                <h3 className="font-semibold text-gray-900 mb-3">REVENUE</h3>
                {(groupedBalances.INCOME || []).map((balance) => (
                  <div key={balance.accountId} className="flex justify-between py-1 pl-4">
                    <span className="text-gray-700">{balance.accountName}</span>
                    <span className="font-mono text-gray-900">{formatCurrency(balance.balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 mt-2 border-t border-gray-200 font-semibold">
                  <span>Total Revenue</span>
                  <span className="font-mono">{formatCurrency(incomeTotal)}</span>
                </div>

                {/* Cost of Goods Sold */}
                <h3 className="font-semibold text-gray-900 mb-3 mt-6">COST OF GOODS SOLD</h3>
                {(groupedBalances.COGS || []).map((balance) => (
                  <div key={balance.accountId} className="flex justify-between py-1 pl-4">
                    <span className="text-gray-700">{balance.accountName}</span>
                    <span className="font-mono text-gray-900">{formatCurrency(balance.balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 mt-2 border-t border-gray-200 font-semibold">
                  <span>Total COGS</span>
                  <span className="font-mono">{formatCurrency(cogsTotal)}</span>
                </div>

                {/* Gross Profit */}
                <div className="flex justify-between py-3 mt-4 bg-gray-50 -mx-6 px-6 font-semibold">
                  <span>Gross Profit</span>
                  <span className="font-mono">{formatCurrency(incomeTotal - cogsTotal)}</span>
                </div>

                {/* Operating Expenses */}
                <h3 className="font-semibold text-gray-900 mb-3 mt-6">OPERATING EXPENSES</h3>
                {(groupedBalances.EXPENSE || []).map((balance) => (
                  <div key={balance.accountId} className="flex justify-between py-1 pl-4">
                    <span className="text-gray-700">{balance.accountName}</span>
                    <span className="font-mono text-gray-900">{formatCurrency(balance.balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 mt-2 border-t border-gray-200 font-semibold">
                  <span>Total Expenses</span>
                  <span className="font-mono">{formatCurrency(expenseTotal)}</span>
                </div>

                {/* Net Income */}
                <div className={`flex justify-between py-4 mt-6 border-t-2 border-gray-300 font-bold text-lg ${
                  netIncome >= 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  <span>Net Income</span>
                  <span className="font-mono">{formatCurrency(netIncome)}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
