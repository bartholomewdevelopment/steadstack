import { NavLink } from 'react-router-dom';

const navItems = [
  { name: 'Requisitions', href: '/app/purchasing/requisitions' },
  { name: 'Purchase Orders', href: '/app/purchasing/purchase-orders' },
  { name: 'Bills', href: '/app/purchasing/bills' },
  { name: 'Vendors', href: '/app/purchasing/vendors' },
  { name: 'AP Aging', href: '/app/purchasing/ap-aging' },
];

export default function PurchasingNav() {
  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-6 overflow-x-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                isActive
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`
            }
          >
            {item.name}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
