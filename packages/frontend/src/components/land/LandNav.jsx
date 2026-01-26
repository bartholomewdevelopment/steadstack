import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/app/assets/land', label: 'Overview', end: true },
  { path: '/app/assets/land/sites', label: 'Sites' },
  { path: '/app/assets/land/tracts', label: 'Land Tracts' },
];

export default function LandNav() {
  const location = useLocation();

  // Only show on /assets/land/* routes
  if (!location.pathname.startsWith('/app/assets/land')) {
    return null;
  }

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
