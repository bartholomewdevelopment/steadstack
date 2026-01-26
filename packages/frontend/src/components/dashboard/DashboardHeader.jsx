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
          {/* Tenant name */}
          {userProfile?.tenant && (
            <div className="hidden md:flex items-center text-sm">
              <span className="text-gray-500">{userProfile.tenant.name}</span>
            </div>
          )}

        </div>
      </div>
    </header>
  );
}
