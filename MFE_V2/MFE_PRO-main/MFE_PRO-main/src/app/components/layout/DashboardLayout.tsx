import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useLiveEvents } from '../../lib/useLiveEvents';
import { useTenant } from '../../contexts/TenantContext';
import { ErrorBoundary } from '../ErrorBoundary';
import { OfflineBanner } from '../dashboard/OfflineBanner';

export function DashboardLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const { currentUser, currentTenant } = useTenant();

  // Super-admins see events from all tenants; everyone else only sees their own.
  const filterTenantId = currentUser?.role !== 'super_admin' ? (currentTenant?.id ?? undefined) : undefined;
  useLiveEvents(undefined, filterTenantId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 transition-colors duration-300 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <OfflineBanner />
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
      />
      <Header onMenuClick={() => setMobileSidebarOpen(true)} />
      <main className="mt-16 p-4 md:ml-64 md:p-6">
        <ErrorBoundary>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </main>
      <footer className="md:ml-64 px-6 py-3 text-center text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800 dark:text-gray-600">
        © 2026 EV Charge DZ. All rights reserved.
      </footer>
    </div>
  );
}
