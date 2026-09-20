import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanLine,
  History,
  FileText,
  Menu,
  Smartphone,
  AlertCircle,
  ShieldCheck,
  Camera,
  User,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../auth/AuthContext';

interface MobileBottomNavProps {
  onOpenDrawer: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenDrawer }) => {
  const location = useLocation();
  const { t } = useLanguage();
  const { isOfficer } = useAuth();


  const isConsumerMode =
    location.pathname.startsWith('/check') || location.pathname.startsWith('/complaint');
  const isScanActive = location.pathname === '/scan' || location.pathname === '/scan/result';
  const isConsumerCheckActive = location.pathname === '/check' || location.pathname === '/check/result';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-[#131B17] border-t border-institutional-border dark:border-institutional-800 shadow-elevated lg:hidden safe-bottom"
      aria-label="Mobile Bottom Navigation"
    >
      {isConsumerMode ? (
        /* Consumer Mode Bottom Navigation */
        <div className="flex items-center justify-around h-16 px-2">
          {/* Home / Check */}
          <NavLink
            to="/check"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors ${
                isActive
                  ? 'text-govteal-700 font-bold'
                  : 'text-govink-secondary hover:text-govink-primary'
              }`
            }
          >
            <Smartphone className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight truncate max-w-[64px]">
              {t('nav.home', 'Home')}
            </span>
          </NavLink>

          {/* Central Scan Product Button */}
          <div className="flex-1 flex justify-center -mt-5">
            <NavLink
              to="/check"
              className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-lg border-2 border-white transition-transform active:scale-95 ${
                isConsumerCheckActive
                  ? 'bg-govteal-800 text-white ring-4 ring-govteal-500/25'
                  : 'bg-govteal-700 text-white hover:bg-govteal-800'
              }`}
              aria-label="Scan Product"
            >
              <Camera className="w-6 h-6 text-white" />
              <span className="text-[9px] font-black uppercase tracking-tight text-white">
                Scan
              </span>
            </NavLink>
          </div>

          {/* Report Concern */}
          <NavLink
            to="/complaint"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors ${
                isActive
                  ? 'text-govteal-700 font-bold'
                  : 'text-govink-secondary hover:text-govink-primary'
              }`
            }
          >
            <AlertCircle className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight truncate max-w-[64px]">
              {t('consumer.reportConcern', 'Report')}
            </span>
          </NavLink>

          {/* Profile / Officer Portal Switch */}
          {isOfficer ? (
            <NavLink
              to="/dashboard"
              className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center text-govgreen-900 hover:text-govgreen-800 transition-colors font-semibold"
              title="Switch to Officer Portal"
            >
              <ShieldCheck className="w-5 h-5 mb-0.5 text-govgreen-800" />
              <span className="text-[10px] leading-tight truncate max-w-[64px]">
                Officer
              </span>
            </NavLink>
          ) : (
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors ${
                  isActive
                    ? 'text-govteal-700 font-bold'
                    : 'text-govink-secondary hover:text-govink-primary'
                }`
              }
            >
              <User className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight truncate max-w-[64px]">
                Profile
              </span>
            </NavLink>
          )}


          {/* More Drawer */}
          <button
            type="button"
            onClick={onOpenDrawer}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center text-govink-secondary hover:text-govink-primary transition-colors focus:outline-none cursor-pointer"
            aria-label="Open More Menu"
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight truncate max-w-[64px]">
              {t('nav.more', 'More')}
            </span>
          </button>
        </div>
      ) : (
        /* Officer Mode Bottom Navigation */
        <div className="flex items-center justify-around h-16 px-2">
          {/* Home */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors ${
                isActive
                  ? 'text-govgreen-900 font-bold'
                  : 'text-govink-secondary hover:text-govink-primary'
              }`
            }
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight truncate max-w-[64px]">
              {t('nav.home', 'Home')}
            </span>
          </NavLink>

          {/* History */}
          <NavLink
            to="/inspections"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors ${
                isActive
                  ? 'text-govgreen-900 font-bold'
                  : 'text-govink-secondary hover:text-govink-primary'
              }`
            }
          >
            <History className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight truncate max-w-[64px]">
              {t('nav.historyShort', 'History')}
            </span>
          </NavLink>

          {/* Primary Field Inspect Button */}
          <div className="flex-1 flex justify-center -mt-5">
            <NavLink
              to="/scan"
              className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-lg border-2 border-white transition-transform active:scale-95 ${
                isScanActive
                  ? 'bg-govgreen-900 text-white ring-4 ring-govgreen-600/30'
                  : 'bg-govgreen-900 text-white hover:bg-govgreen-800'
              }`}
              aria-label="New Field Inspection"
            >
              <ScanLine className="w-6 h-6 text-white" />
              <span className="text-[9px] font-black uppercase tracking-tight text-white">
                {t('nav.inspect', 'Inspect')}
              </span>
            </NavLink>
          </div>

          {/* Reports */}
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors ${
                isActive
                  ? 'text-govgreen-900 font-bold'
                  : 'text-govink-secondary hover:text-govink-primary'
              }`
            }
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight truncate max-w-[64px]">
              {t('nav.reports', 'Reports')}
            </span>
          </NavLink>

          {/* More Drawer Trigger */}
          <button
            type="button"
            onClick={onOpenDrawer}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center text-govink-secondary hover:text-govink-primary transition-colors focus:outline-none cursor-pointer"
            aria-label="Open More Menu"
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight truncate max-w-[64px]">
              {t('nav.more', 'More')}
            </span>
          </button>
        </div>
      )}
    </nav>
  );
};
