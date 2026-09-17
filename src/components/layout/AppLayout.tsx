import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopHeader } from './TopHeader';
import { BottomNavigationDock } from './BottomNavigationDock';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-institutional-50 dark:bg-[#0B110E] flex flex-col text-institutional-900 dark:text-[#F1F5F3] transition-colors duration-200">
      {/* Full-Width Institutional Top Header */}
      <TopHeader />

      {/* Main Content Area - Full Viewport Width with Ergonomic Clearance */}
      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-28 sm:pb-32 transition-all">
        <Outlet />
      </main>

      {/* Institutional Desktop Footer */}
      <footer className="border-t border-institutional-200 dark:border-institutional-800 bg-white dark:bg-[#131B17] px-6 py-4 text-xs text-institutional-600 dark:text-institutional-400 hidden lg:flex items-center justify-between pb-24 no-print transition-colors">
        <div className="flex items-center gap-2">
          <span className="font-bold text-institutional-900 dark:text-white">NIRIKSHAK AI</span>
          <span>•</span>
          <span>Legal Metrology (Packaged Commodities) Rules, 2011 Compliance Platform</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-institutional-500 dark:text-institutional-400 font-mono">
          <span>Build v2.1.0-INSTITUTIONAL</span>
          <span>•</span>
          <span className="text-govgreen-700 dark:text-govgreen-400 font-semibold">STATUS: OPTIMAL</span>
        </div>
      </footer>

      {/* Modern Animated Global Floating Navigation Dock */}
      <BottomNavigationDock />
    </div>
  );
};
export default AppLayout;

