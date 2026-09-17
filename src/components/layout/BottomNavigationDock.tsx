import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanLine,
  History,
  FileText,
  Boxes,
  BookOpen,
  BarChart3,
  Settings,
  Inbox,
  Smartphone,
  AlertCircle,
  User as UserIcon,
  Menu,
  X,
  Sparkles,
  Activity,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../auth/AuthContext';
import { SystemStatusModal } from '../common/SystemStatusModal';

interface DockItem {
  id: string;
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  badge?: string | number;
}

export const BottomNavigationDock: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, isOfficer } = useAuth();

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  // Close more menu on route change
  useEffect(() => {
    setMoreMenuOpen(false);
  }, [location.pathname]);

  // Close more menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(e.target as Node) &&
        moreButtonRef.current &&
        !moreButtonRef.current.contains(e.target as Node)
      ) {
        setMoreMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMoreMenuOpen(false);
      }
    };

    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [moreMenuOpen]);

  // Hover delay logic for desktop labels (600ms dwell delay)
  const handleMouseEnter = (id: string) => {
    const timer = setTimeout(() => {
      setHoveredItem(id);
    }, 600);
    setHoverTimer(timer);
  };

  const handleMouseLeave = () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      setHoverTimer(null);
    }
    setHoveredItem(null);
  };

  // Define Officer primary and secondary items
  const officerPrimaryItems: DockItem[] = [
    { id: 'dashboard', name: t('nav.home', 'Home'), path: '/dashboard', icon: LayoutDashboard },
    { id: 'scan', name: t('nav.inspect', 'Inspect'), path: '/scan', icon: ScanLine, highlight: true },
    { id: 'inspections', name: t('nav.history', 'History'), path: '/inspections', icon: History },
    { id: 'reports', name: t('nav.reports', 'Reports'), path: '/reports', icon: FileText },
  ];

  const officerSecondaryItems = [
    { id: 'complaints', name: 'Complaints Inbox', path: '/complaints', icon: Inbox, desc: 'Public grievance submissions' },
    { id: 'rules', name: t('nav.rules', 'Compliance Rules'), path: '/rules', icon: BookOpen, desc: 'PCR 2011 statutory schedule' },
    { id: 'analytics', name: t('nav.analytics', 'Analytics & Trends'), path: '/analytics', icon: BarChart3, desc: 'Enforcement metrics & charts' },
    { id: 'products', name: t('nav.products', 'Product Repository'), path: '/products', icon: Boxes, desc: 'Commodity database & history' },
    { id: 'settings', name: t('nav.settings', 'Settings'), path: '/settings', icon: Settings, desc: 'System configuration' },
  ];

  // Define Consumer primary and secondary items
  const consumerPrimaryItems: DockItem[] = [
    { id: 'check', name: t('nav.home', 'Check'), path: '/check', icon: Smartphone, highlight: true },
    { id: 'complaints', name: 'My Grievances', path: '/my-complaints', icon: Inbox },
    { id: 'profile', name: 'My Profile', path: '/profile', icon: UserIcon },
  ];

  const consumerSecondaryItems = [
    { id: 'report', name: t('consumer.reportConcern', 'Report Concern'), path: '/complaint', icon: AlertCircle, desc: 'File a statutory grievance' },
    { id: 'settings', name: t('nav.settings', 'Settings'), path: '/settings', icon: Settings, desc: 'Preferences & device status' },
  ];

  const primaryItems = isOfficer ? officerPrimaryItems : consumerPrimaryItems;
  const secondaryItems = isOfficer ? officerSecondaryItems : consumerSecondaryItems;

  const isMoreActive = secondaryItems.some(item => location.pathname.startsWith(item.path));

  return (
    <>
      <nav
        aria-label="Application Navigation Dock"
        className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[95vw] sm:max-w-max select-none no-print transition-all duration-300"
      >
        {/* Floating Dock Container */}
        <div className="relative bg-white/95 dark:bg-[#131B17]/95 backdrop-blur-md border border-institutional-200/90 dark:border-institutional-800/90 shadow-2xl rounded-2xl p-1.5 flex items-center gap-1 sm:gap-1.5 ring-1 ring-black/5 dark:ring-white/5">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && item.path !== '/check' && location.pathname.startsWith(item.path));
            const isHovered = hoveredItem === item.id;

            return (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => handleMouseEnter(item.id)}
                onMouseLeave={handleMouseLeave}
              >
                <NavLink
                  to={item.path}
                  className={`group relative flex flex-col items-center justify-center w-14 sm:w-16 h-12 sm:h-13 rounded-xl transition-all duration-200 ${
                    isActive
                      ? item.highlight
                        ? 'bg-govgreen-800 text-white shadow-sm'
                        : 'bg-govgreen-50 dark:bg-govgreen-950/50 text-govgreen-900 dark:text-govgreen-300 font-semibold'
                      : 'text-institutional-600 dark:text-institutional-400 hover:text-institutional-900 dark:hover:text-institutional-100 hover:bg-institutional-100/70 dark:hover:bg-[#1C2721]'
                  }`}
                  aria-label={item.name}
                >
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 group-active:scale-95 ${
                      isActive && item.highlight ? 'text-white' : ''
                    }`}
                  />
                  <span
                    className={`text-[10px] mt-0.5 font-medium tracking-tight truncate max-w-[54px] ${
                      isActive
                        ? item.highlight
                          ? 'text-white font-semibold'
                          : 'text-govgreen-900 dark:text-govgreen-300'
                        : 'text-institutional-500 dark:text-institutional-400'
                    }`}
                  >
                    {item.name}
                  </span>

                  {/* Highlight pill dot */}
                  {isActive && !item.highlight && (
                    <span className="absolute -bottom-0.5 w-1.5 h-1.5 bg-govgreen-700 dark:bg-govgreen-400 rounded-full" />
                  )}
                </NavLink>

                {/* Delayed Hover Tooltip (Desktop) */}
                {isHovered && (
                  <div className="hidden sm:block absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 pointer-events-none z-50 animate-slide-up">
                    <div className="bg-institutional-900 dark:bg-institutional-100 text-white dark:text-institutional-900 text-xs font-semibold py-1 px-2.5 rounded-lg shadow-elevated whitespace-nowrap">
                      {item.name}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-institutional-900 dark:border-t-institutional-100" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Vertical Divider */}
          <div className="w-[1px] h-7 bg-institutional-200 dark:bg-institutional-800 mx-0.5" />

          {/* More Menu Trigger */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('more')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              ref={moreButtonRef}
              type="button"
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className={`group relative flex flex-col items-center justify-center w-14 sm:w-16 h-12 sm:h-13 rounded-xl transition-all duration-200 cursor-pointer ${
                moreMenuOpen || isMoreActive
                  ? 'bg-govnavy-50 dark:bg-govnavy-950/50 text-govnavy-800 dark:text-govnavy-300 font-semibold'
                  : 'text-institutional-600 dark:text-institutional-400 hover:text-institutional-900 dark:hover:text-institutional-100 hover:bg-institutional-100/70 dark:hover:bg-[#1C2721]'
              }`}
              aria-label="More navigation destinations"
              aria-expanded={moreMenuOpen}
            >
              {moreMenuOpen ? (
                <X className="w-5 h-5 text-govnavy-800 dark:text-govnavy-300 transition-transform duration-200 rotate-90" />
              ) : (
                <Menu className="w-5 h-5 transition-transform duration-200 group-hover:scale-110 group-active:scale-95" />
              )}
              <span className="text-[10px] mt-0.5 font-medium tracking-tight">
                {t('nav.more', 'More')}
              </span>

              {isMoreActive && !moreMenuOpen && (
                <span className="absolute -bottom-0.5 w-1.5 h-1.5 bg-govnavy-700 dark:bg-govnavy-400 rounded-full" />
              )}
            </button>

            {/* Delayed Hover Tooltip */}
            {hoveredItem === 'more' && !moreMenuOpen && (
              <div className="hidden sm:block absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 pointer-events-none z-50 animate-slide-up">
                <div className="bg-institutional-900 dark:bg-institutional-100 text-white dark:text-institutional-900 text-xs font-semibold py-1 px-2.5 rounded-lg shadow-elevated whitespace-nowrap">
                  More Options & System
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-institutional-900 dark:border-t-institutional-100" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Floating More Menu Popover */}
        {moreMenuOpen && (
          <div
            ref={moreMenuRef}
            className="absolute bottom-full mb-3 right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 w-72 sm:w-80 bg-white dark:bg-[#131B17] border border-institutional-200 dark:border-institutional-800 shadow-2xl rounded-2xl p-2 z-50 animate-scale-in"
          >
            <div className="px-3 py-2 border-b border-institutional-100 dark:border-institutional-800/80 mb-1 flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider uppercase text-institutional-500 dark:text-institutional-400">
                {isOfficer ? 'Institutional Modules' : 'Consumer Services'}
              </span>
              <span className="text-[10px] font-mono text-govgreen-700 dark:text-govgreen-400 bg-govgreen-50 dark:bg-govgreen-950/50 px-1.5 py-0.5 rounded border border-govgreen-200/60 dark:border-govgreen-800/60">
                {isOfficer ? 'OFFICER RBAC' : 'CITIZEN TIER'}
              </span>
            </div>

            <div className="space-y-0.5">
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                const isSelected = location.pathname.startsWith(item.path);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      navigate(item.path);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                      isSelected
                        ? 'bg-govgreen-50 dark:bg-govgreen-950/40 text-govgreen-900 dark:text-govgreen-300'
                        : 'hover:bg-institutional-50 dark:hover:bg-[#1C2721] text-institutional-800 dark:text-institutional-200'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-govgreen-800 text-white'
                          : 'bg-institutional-100 dark:bg-[#1E2923] text-institutional-600 dark:text-institutional-400 group-hover:bg-govgreen-100 dark:group-hover:bg-govgreen-950/60 group-hover:text-govgreen-800 dark:group-hover:text-govgreen-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate flex items-center justify-between">
                        <span>{item.name}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-institutional-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-[11px] text-institutional-500 dark:text-institutional-400 truncate">
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Extra System Utilities Footer */}
            <div className="mt-2 pt-2 border-t border-institutional-100 dark:border-institutional-800/80 grid grid-cols-2 gap-1 px-1">
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  setShowDiagnostics(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-institutional-600 dark:text-institutional-400 hover:bg-institutional-100 dark:hover:bg-[#1C2721] transition-colors"
              >
                <Activity className="w-3.5 h-3.5 text-govgreen-600" />
                <span>Diagnostics</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  navigate('/settings');
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-institutional-600 dark:text-institutional-400 hover:bg-institutional-100 dark:hover:bg-[#1C2721] transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-govnavy-600" />
                <span>Security</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Diagnostics Modal Trigger */}
      {showDiagnostics && (
        <SystemStatusModal isOpen={showDiagnostics} onClose={() => setShowDiagnostics(false)} />
      )}
    </>
  );
};
