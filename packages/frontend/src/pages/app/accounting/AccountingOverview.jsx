import { Link } from 'react-router-dom';
import AccountingNav from '../../../components/accounting/AccountingNav';
import { HelpTooltip } from '../../../components/ui/Tooltip';

const modules = [
  {
    title: 'Chart of Accounts',
    description: 'Manage your general ledger accounts',
    href: '/app/accounting/chart-of-accounts',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    ),
    color: 'bg-blue-50 text-blue-600',
  },
  {
    title: 'Journal Entries',
    description: 'Create manual adjusting entries',
    href: '/app/accounting/journal-entries',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
    color: 'bg-purple-50 text-purple-600',
  },
  {
    title: 'Accounts Receivable',
    description: 'Track customer invoices and payments',
    href: '/app/accounting/ar',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    color: 'bg-green-50 text-green-600',
    badge: 'A/R',
  },
  {
    title: 'Accounts Payable',
    description: 'Manage vendor bills and payments',
    href: '/app/accounting/ap',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    color: 'bg-red-50 text-red-600',
    badge: 'A/P',
  },
];

const bankingModules = [
  {
    title: 'Write Checks',
    description: 'Create checks to pay vendors',
    href: '/app/accounting/checks',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
  },
  {
    title: 'Bank Deposits',
    description: 'Record deposits to bank',
    href: '/app/accounting/deposits',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    ),
  },
  {
    title: 'Bank Reconciliation',
    description: 'Match transactions to bank statements',
    href: '/app/accounting/reconciliation',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Account Analysis',
    description: 'View account activity and trends',
    href: '/app/accounting/analysis',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    title: 'Transaction Inquiry',
    description: 'Search and drill into transactions',
    href: '/app/accounting/inquiry',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
];

export default function AccountingOverview() {
  return (
    <div>
      <AccountingNav />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-bold text-gray-900">Accounting</h1>
          <HelpTooltip
            content="Manage your finances with double-entry accounting. All transactions are automatically posted from operations."
            position="right"
          />
        </div>
        <p className="text-gray-600">
          Financial management, accounts receivable, accounts payable, and banking
        </p>
      </div>

      {/* Main Modules */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {modules.map((module) => (
          <Link
            key={module.href}
            to={module.href}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-primary-300 transition-all group"
          >
            <div className={`w-14 h-14 rounded-xl ${module.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              {module.icon}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{module.title}</h3>
              {module.badge && (
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                  {module.badge}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{module.description}</p>
          </Link>
        ))}
      </div>

      {/* Banking & Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Banking & Analysis</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {bankingModules.map((module) => (
            <Link
              key={module.href}
              to={module.href}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="text-gray-400 group-hover:text-primary-600">
                {module.icon}
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">{module.title}</p>
                <p className="text-xs text-gray-500">{module.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/app/accounting/journal-entries/new"
            className="btn-primary"
          >
            + New Journal Entry
          </Link>
          <Link
            to="/app/accounting/ar"
            className="btn-secondary"
          >
            Create Invoice
          </Link>
          <Link
            to="/app/accounting/ap"
            className="btn-secondary"
          >
            Enter Bill
          </Link>
          <Link
            to="/app/accounting/checks"
            className="btn-secondary"
          >
            Write Check
          </Link>
        </div>
      </div>
    </div>
  );
}
