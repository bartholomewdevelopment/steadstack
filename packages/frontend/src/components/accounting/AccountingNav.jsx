import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/app/accounting', label: 'Overview', end: true },
  { path: '/app/accounting/chart-of-accounts', label: 'Chart of Accounts' },
  { path: '/app/accounting/journal-entries', label: 'Journal Entries' },
  { path: '/app/accounting/ar', label: 'A/R' },
  { path: '/app/accounting/ap', label: 'A/P' },
  { path: '/app/accounting/checks', label: 'Checks' },
  { path: '/app/accounting/deposits', label: 'Deposits' },
  { path: '/app/accounting/reconciliation', label: 'Bank Recon' },
];

export default function AccountingNav() {
  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex gap-1 overflow-x-auto pb-px">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'text-primary-600 border-primary-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
