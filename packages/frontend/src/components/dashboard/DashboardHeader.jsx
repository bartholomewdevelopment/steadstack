import { useSite } from '../../contexts/SiteContext';
import { useAuth } from '../../contexts/AuthContext';

export default function DashboardHeader({ onMenuClick }) {
  const { currentSite } = useSite();
  const { userProfile } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 md:px-6 lg:px-8">
        {/* Left side - menu button and breadcrumb */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {/* Current site indicator - mobile */}
          {currentSite && (
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-medium">
                {currentSite.code || currentSite.name.charAt(0)}
              </div>
              <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">
                {currentSite.name}
              </span>
            </div>
          )}
        </div>

        {/* Right side - tenant info and quick actions */}
        <div className="flex items-center gap-4">
          {/* Tenant/Plan info */}
          {userProfile?.tenant && (
            <div className="hidden md:flex items-center gap-2 text-sm">
              <span className="text-gray-500">{userProfile.tenant.name}</span>
              <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs font-medium capitalize">
                {userProfile.tenant.plan}
              </span>
            </div>
          )}

          {/* Quick action - add button */}
          <button className="p-2 rounded-lg text-gray-600 hover:bg-gray-100" title="Quick add">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>

          {/* Notifications */}
          <button className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 relative" title="Notifications">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {/* Notification badge */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  );
}
