import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/app/assets', label: 'Overview', end: true },
  { path: '/app/assets/animals', label: 'Livestock' },
  { path: '/app/assets/land', label: 'Land' },
  { path: '/app/assets/buildings', label: 'Buildings' },
  { path: '/app/assets/vehicles', label: 'Vehicles' },
  { path: '/app/assets/equipment', label: 'Equipment' },
  { path: '/app/assets/infrastructure', label: 'Infrastructure' },
  { path: '/app/assets/tools', label: 'Tools' },
  { path: '/app/assets/other', label: 'Other' },
];

export default function AssetsNav() {
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
