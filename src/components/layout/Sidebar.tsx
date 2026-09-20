import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanLine,
  History,
  Boxes,
  BookOpen,
  FileText,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Award,
  Layers,
  X,
  Inbox,
  Smartphone,
  AlertCircle,
  User as UserIcon,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../auth/AuthContext';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const location = useLocation();
  const { t } = useLanguage();
  const { user, isOfficer } = useAuth();

  const officerSections = [
    {
      title: 'OVERVIEW',
      items: [
        { name: t('nav.dashboard', 'Dashboard'), path: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'INSPECTION',
      items: [
        { name: t('nav.newInspection', 'New Inspection'), path: '/scan', icon: ScanLine, highlight: true },
        { name: t('nav.history', 'Inspection History'), path: '/inspections', icon: History },
      ],
    },
    {
      title: 'GRIEVANCES',
      items: [
        { name: 'Complaints Inbox', path: '/complaints', icon: Inbox },
      ],
    },
    {
      title: 'PRODUCTS',
      items: [
        { name: t('nav.products', 'Product Repository'), path: '/products', icon: Boxes },
      ],
    },
    {
      title: 'COMPLIANCE',
      items: [
        { name: t('nav.rules', 'Compliance Rules'), path: '/rules', icon: BookOpen },
        { name: t('nav.reports', 'Reports'), path: '/reports', icon: FileText },
      ],
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { name: t('nav.analytics', 'Analytics'), path: '/analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { name: t('nav.settings', 'Settings'), path: '/settings', icon: Settings },
      ],
    },
  ];

  const consumerSections = [
    {
      title: 'CONSUMER PORTAL',
      items: [
        { name: t('consumer.checkTitle', 'Check Product'), path: '/check', icon: Smartphone, highlight: true },
        { name: t('consumer.reportConcern', 'Report Concern'), path: '/complaint', icon: AlertCircle },
        { name: 'My Complaints', path: '/my-complaints', icon: Inbox },
      ],
    },
    {
      title: 'ACCOUNT',
      items: [
        { name: 'My Profile', path: '/profile', icon: UserIcon },
        { name: t('nav.settings', 'Settings'), path: '/settings', icon: Settings },
      ],
    },
  ];

  const navigationSections = isOfficer ? officerSections : consumerSections;


  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-govink-primary/50 z-40 lg:hidden backdrop-blur-xs transition-opacity duration-200"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-white text-govink-primary flex flex-col border-r border-institutional-border transition-all duration-250 ease-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-institutional-border bg-institutional-subtle/50">
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2.5 overflow-hidden focus:outline-none"
            onClick={() => setIsMobileOpen(false)}
          >
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#15201A] p-0.5 shadow-subtle border border-institutional-200/80 dark:border-institutional-800 flex items-center justify-center shrink-0">
              <img
                src="/logo-icon.png"
                alt="Nirikshak-AI"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>

            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-tight text-[#0B2545] dark:text-white truncate font-display">
                    Nirikshak<span className="text-[#16A34A] dark:text-[#22C55E] font-black ml-0.5">-AI</span>
                  </span>
                  <span className="text-[9px] font-mono font-bold bg-govgreen-50 dark:bg-govgreen-950 text-govgreen-800 dark:text-govgreen-300 px-1 py-0.2 rounded border border-govgreen-200 dark:border-govgreen-800">
                    PCR
                  </span>
                </div>
                <span className="text-[9px] font-bold text-govink-secondary tracking-wider uppercase truncate">
                  LEGAL METROLOGY
                </span>
              </div>
            )}
          </NavLink>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-govink-secondary hover:text-govink-primary hover:bg-institutional-subtle transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-govink-secondary hover:text-govink-primary hover:bg-institutional-subtle cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
          {navigationSections.map((section, idx) => (
            <div key={idx}>
              {!isCollapsed && (
                <div className="px-3 mb-1.5 text-[10px] font-bold text-govink-muted tracking-wider uppercase font-mono">
                  {section.title}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const isActive =
                    item.path === '/scan'
                      ? location.pathname === '/scan' || location.pathname === '/scan/result'
                      : location.pathname === item.path;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileOpen(false)}
                      title={isCollapsed ? item.name : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 min-h-[42px] cursor-pointer ${
                        isActive
                          ? 'bg-govgreen-900 text-white shadow-subtle'
                          : 'text-govink-secondary hover:text-govink-primary hover:bg-institutional-subtle'
                      } ${item.highlight && !isActive ? 'border border-govgreen-200 bg-govgreen-50/70 text-govgreen-900' : ''}`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-govgreen-900'}`} />
                      {!isCollapsed && (
                        <span className="truncate flex-1">{item.name}</span>
                      )}
                      {!isCollapsed && item.highlight && !isActive && (
                        <span className="text-[9px] bg-govgreen-900 text-white font-bold px-1.5 py-0.5 rounded">
                          Scan
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Consumer Mode Quick Preview for Officers Only */}
          {!isCollapsed && isOfficer && (
            <div className="mx-1 pt-2">
              <NavLink
                to="/check"
                onClick={() => setIsMobileOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-lg bg-govteal-50/80 border border-govteal-200 hover:bg-govteal-100 transition-colors text-xs font-semibold text-govteal-900"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-govteal-600" />
                  <span>{t('consumer.modeConsumer', 'Consumer View')}</span>
                </div>
                <span className="text-[10px] font-bold text-govteal-700 uppercase font-mono">Public</span>
              </NavLink>
            </div>
          )}

          {/* Statutory Authority Reference Box */}
          {!isCollapsed && (
            <div className="mx-1 mt-3 p-3 rounded-lg bg-institutional-subtle/80 border border-institutional-border text-[11px] text-govink-secondary">
              <div className="flex items-center gap-1.5 text-govgreen-900 font-bold mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-govgreen-800" />
                <span>Statutory Authority</span>
              </div>
              <p className="text-[10px] text-govink-muted leading-relaxed">
                Legal Metrology (Packaged Commodities) Rules, 2011 &amp; Act, 2009.
              </p>
            </div>
          )}
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-institutional-border bg-institutional-subtle/60">
          <NavLink
            to="/profile"
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
            title="View Profile"
          >
            <div
              className={`w-9 h-9 rounded-lg border text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-subtle ${
                isOfficer ? 'bg-govgreen-900 border-govgreen-950' : 'bg-govteal-700 border-govteal-800'
              }`}
            >
              {user?.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'US'}
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-govink-primary truncate">
                  {user?.displayName || (isOfficer ? 'Inspector R. Varma' : 'Consumer')}
                </div>
                <div className="text-[10px] text-govink-secondary truncate">
                  {isOfficer ? t('officer.title', 'Legal Metrology Officer') : 'Citizen Consumer'}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOfficer ? 'bg-govgreen-600 animate-pulse' : 'bg-govteal-600'
                    }`}
                  />
                  <span
                    className={`text-[9px] font-mono font-bold ${
                      isOfficer ? 'text-govgreen-900' : 'text-govteal-800'
                    }`}
                  >
                    {isOfficer ? t('officer.activeDuty', 'ON ACTIVE DUTY') : 'VERIFIED CITIZEN'}
                  </span>
                </div>
              </div>
            )}
          </NavLink>
        </div>
      </aside>
    </>
  );
};

