import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { purchasingApi } from '../../../services/api';
import PurchasingNav from '../../../components/purchasing/PurchasingNav';

export default function APAging() {
  const [aging, setAging] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchAging();
  }, [asOfDate]);

  const fetchAging = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await purchasingApi.getAPAging(asOfDate);
      setAging(response.data);
    } catch (err) {
      setError(err.message);
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

  const getPercentage = (part, total) => {
    if (!total) return 0;
    return ((part / total) * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      <PurchasingNav />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AP Aging Report</h1>
          <p className="text-gray-600">Accounts payable aging summary</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">As of Date</label>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="input py-2"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading aging report...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchAging} className="mt-2 text-red-700 underline">
            Try again
          </button>
        </div>
      ) : aging ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500">Current (0-30)</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(aging.summary.current)}
              </p>
              <p className="text-xs text-gray-400">{getPercentage(aging.summary.current, aging.summary.total)}%</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500">31-60 Days</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {formatCurrency(aging.summary.days31to60)}
              </p>
              <p className="text-xs text-gray-400">{getPercentage(aging.summary.days31to60, aging.summary.total)}%</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500">61-90 Days</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {formatCurrency(aging.summary.days61to90)}
              </p>
              <p className="text-xs text-gray-400">{getPercentage(aging.summary.days61to90, aging.summary.total)}%</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500">Over 90 Days</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(aging.summary.over90)}
              </p>
              <p className="text-xs text-gray-400">{getPercentage(aging.summary.over90, aging.summary.total)}%</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-400">Total AP</p>
              <p className="text-2xl font-bold text-white mt-1">
                {formatCurrency(aging.summary.total)}
              </p>
            </div>
          </div>

          {/* Visual Bar */}
          {aging.summary.total > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Aging Distribution</h2>
              <div className="h-8 rounded-lg overflow-hidden flex">
                {aging.summary.current > 0 && (
                  <div
                    className="bg-green-500 h-full"
                    style={{ width: `${getPercentage(aging.summary.current, aging.summary.total)}%` }}
                    title={`Current: ${formatCurrency(aging.summary.current)}`}
                  />
                )}
                {aging.summary.days31to60 > 0 && (
                  <div
                    className="bg-yellow-500 h-full"
                    style={{ width: `${getPercentage(aging.summary.days31to60, aging.summary.total)}%` }}
                    title={`31-60: ${formatCurrency(aging.summary.days31to60)}`}
                  />
                )}
                {aging.summary.days61to90 > 0 && (
                  <div
                    className="bg-orange-500 h-full"
                    style={{ width: `${getPercentage(aging.summary.days61to90, aging.summary.total)}%` }}
                    title={`61-90: ${formatCurrency(aging.summary.days61to90)}`}
                  />
                )}
                {aging.summary.over90 > 0 && (
                  <div
                    className="bg-red-500 h-full"
                    style={{ width: `${getPercentage(aging.summary.over90, aging.summary.total)}%` }}
                    title={`90+: ${formatCurrency(aging.summary.over90)}`}
                  />
                )}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-500"></span> Current
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-yellow-500"></span> 31-60
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-orange-500"></span> 61-90
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-500"></span> 90+
                </span>
              </div>
            </div>
          )}

          {/* By Vendor Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Aging by Vendor</h2>
            </div>
            {aging.byVendor.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No outstanding payables
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendor
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        31-60
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        61-90
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        90+
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {aging.byVendor.map((vendor) => (
                      <tr key={vendor.vendorId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <Link
                            to={`/app/purchasing/bills?vendorId=${vendor.vendorId}`}
                            className="font-medium text-gray-900 hover:text-red-600"
                          >
                            {vendor.vendorName}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900">
                          {vendor.current > 0 ? formatCurrency(vendor.current) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-yellow-600">
                          {vendor.days31to60 > 0 ? formatCurrency(vendor.days31to60) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-orange-600">
                          {vendor.days61to90 > 0 ? formatCurrency(vendor.days61to90) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-red-600">
                          {vendor.over90 > 0 ? formatCurrency(vendor.over90) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                          {formatCurrency(vendor.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-6 py-4 font-semibold text-gray-900">Total</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">
                        {formatCurrency(aging.summary.current)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-yellow-600">
                        {formatCurrency(aging.summary.days31to60)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-orange-600">
                        {formatCurrency(aging.summary.days61to90)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-red-600">
                        {formatCurrency(aging.summary.over90)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">
                        {formatCurrency(aging.summary.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
