import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { MobileBottomNav } from './MobileBottomNav';

export const AppLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-institutional-bg flex text-govink-primary">
      {/* Sidebar Navigation */}
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Shell */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <TopHeader onMenuClick={() => setIsMobileOpen(true)} />

        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          <Outlet />
        </main>

        {/* Desktop Institutional Footer */}
        <footer className="border-t border-institutional-border bg-white px-6 py-4 text-xs text-govink-secondary hidden lg:flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <span className="font-bold text-govink-primary">NIRIKSHAK AI</span>
            <span>•</span>
            <span>Legal Metrology (Packaged Commodities) Rules, 2011 Compliance Platform</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-govink-muted font-mono">
            <span>Build v2.1.0-INSTITUTIONAL</span>
            <span>•</span>
            <span className="text-govgreen-900 font-semibold">STATUS: OPTIMAL</span>
          </div>
        </footer>

        {/* Mobile Bottom Navigation Bar (Android & iOS) */}
        <MobileBottomNav onOpenDrawer={() => setIsMobileOpen(true)} />
      </div>
    </div>
  );
};
