import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import { SiteProvider } from '../contexts/SiteContext';
import { PlanLimitsProvider } from '../contexts/PlanLimitsContext';
import UpgradeModal from '../components/ui/UpgradeModal';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Upgrade modal state
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeModalData, setUpgradeModalData] = useState(null);

  // Listen for plan limit errors
  useEffect(() => {
    const handlePlanLimitError = (event) => {
      setUpgradeModalData(event.detail);
      setUpgradeModalOpen(true);
    };

    window.addEventListener('plan-limit-error', handlePlanLimitError);
    return () => {
      window.removeEventListener('plan-limit-error', handlePlanLimitError);
    };
  }, []);

  return (
    <SiteProvider>
      <PlanLimitsProvider>
        <div className="min-h-screen bg-gray-50">
          {/* Mobile sidebar backdrop */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <Sidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />

          {/* Main content area */}
          <div
            className={`transition-all duration-300 ${
              sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
            }`}
          >
            {/* Header */}
            <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />

            {/* Page content */}
            <main className="p-4 md:p-6 lg:p-8">
              <Outlet />
            </main>
          </div>

          {/* Upgrade Modal */}
          <UpgradeModal
            isOpen={upgradeModalOpen}
            onClose={() => setUpgradeModalOpen(false)}
            limitData={upgradeModalData}
          />
        </div>
      </PlanLimitsProvider>
    </SiteProvider>
  );
}
