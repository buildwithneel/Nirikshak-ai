import React, { useState, useEffect } from 'react';
import {
  Bell,
  HelpCircle,
  Shield,
  X,
  Smartphone,
  ShieldCheck,
  CheckCheck,
  Server,
  Layers,
} from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LanguageSelector } from '../common/LanguageSelector';
import { ConnectionStatusBadge } from '../common/ConnectionStatusBadge';
import { SystemStatusModal } from '../common/SystemStatusModal';
import { ThemeToggle } from '../common/ThemeToggle';
import { AnimatedSearchBar } from '../common/AnimatedSearchBar';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../auth/AuthContext';
import { notificationsApi, NotificationItem } from '../../services/api/notificationsApi';

interface TopHeaderProps {
  onMenuClick?: () => void;
  pageTitle?: string;
  breadcrumbs?: React.ReactNode;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  pageTitle,
  breadcrumbs,
}) => {
  const { user, isOfficer, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const isConsumerMode =
    location.pathname.startsWith('/check') ||
    location.pathname.startsWith('/complaint') ||
    location.pathname.startsWith('/my-complaints');

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    try {
      const data = await notificationsApi.getNotifications();
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleNotificationClick = async (notif: NotificationItem) => {
    await notificationsApi.markAsRead(notif.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
    );
    setShowNotifications(false);
    if (notif.reference_type === 'COMPLAINT' && notif.reference_id) {
      navigate(isOfficer ? `/complaints/${notif.reference_id}` : `/my-complaints/${notif.reference_id}`);
    } else if (notif.reference_type === 'INSPECTION' && notif.reference_id) {
      navigate(`/inspections/${notif.reference_id}/workspace`);
    }
  };

  const handleDismissAll = async () => {
    await notificationsApi.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setShowNotifications(false);
  };

  return (
    <>
      <header className="min-h-16 h-[calc(4rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] bg-white/90 dark:bg-[#131B17]/90 backdrop-blur-md border-b border-institutional-200 dark:border-institutional-800 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-subtle transition-colors">
        {/* Left Section: Emblem / Branding / Page Title */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <Link
            to={isOfficer ? '/dashboard' : '/check'}
            className="flex items-center gap-2.5 group focus:outline-none"
            aria-label="Nirikshak-AI Home"
          >
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#15201A] p-0.5 shadow-sm border border-institutional-200/80 dark:border-institutional-800 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
              <img
                src="/logo-icon.png"
                alt="Nirikshak-AI Logo"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div className="hidden sm:flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-[#0B2545] dark:text-white font-display">
                  Nirikshak<span className="text-[#16A34A] dark:text-[#22C55E] font-black ml-0.5">-AI</span>
                </span>
                <span className="text-[9px] font-mono font-bold bg-govgreen-50 dark:bg-govgreen-950 text-govgreen-800 dark:text-govgreen-300 px-1.5 py-0.2 rounded border border-govgreen-200/80 dark:border-govgreen-800/80">
                  PCR 2011
                </span>
              </div>
              <span className="text-[10px] text-institutional-700 dark:text-institutional-300 font-medium tracking-tight">
                Legal Metrology Enforcement
              </span>
            </div>
          </Link>

          {/* Breadcrumbs or Page Title */}
          <div className="min-w-0 border-l border-institutional-200 dark:border-institutional-800 pl-3 sm:pl-4 hidden md:block">
            {breadcrumbs ? (
              breadcrumbs
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-semibold text-institutional-800 dark:text-institutional-200 truncate tracking-tight">
                  {pageTitle || (isConsumerMode ? t('consumer.checkTitle', 'Packaged Commodity Verification') : 'Statutory Enforcement Command')}
                </h1>
                {isConsumerMode && (
                  <span className="text-[9px] font-mono font-bold bg-govteal-50 dark:bg-govteal-950 text-govteal-700 dark:text-govteal-300 px-1.5 py-0.2 rounded border border-govteal-200 dark:border-govteal-800">
                    PUBLIC TIER
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Universal Animated Search Bar with Ctrl+K */}
        {!isConsumerMode && (
          <div className="hidden lg:flex items-center flex-1 max-w-sm xl:max-w-md mx-4">
            <AnimatedSearchBar />
          </div>
        )}

        {/* Right Section: Role Preview, Theme Toggle, Language, Notifications, Avatar */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Role Preview Pill for Officers */}
          {isOfficer ? (
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-govgreen-50 dark:bg-govgreen-950/60 border border-govgreen-200/80 dark:border-govgreen-800/80 text-govgreen-900 dark:text-govgreen-300 text-[11px] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-govgreen-700 dark:text-govgreen-400" />
                <span>Officer</span>
              </span>

              {/* View Switcher Toggle */}
              <Link
                to={isConsumerMode ? '/dashboard' : '/check'}
                className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-institutional-100 dark:bg-[#1C2721] hover:bg-institutional-200 dark:hover:bg-[#25332B] text-institutional-700 dark:text-institutional-300 text-xs font-medium transition-colors"
                title={isConsumerMode ? 'Back to Officer Dashboard' : 'Preview Consumer Verification View'}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{isConsumerMode ? 'Officer View' : 'Citizen View'}</span>
              </Link>
            </div>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-govteal-50 dark:bg-govteal-950/60 border border-govteal-200/80 dark:border-govteal-800/80 text-govteal-900 dark:text-govteal-300 text-[11px] font-semibold">
              <Smartphone className="w-3.5 h-3.5 text-govteal-700 dark:text-govteal-400" />
              <span>Public Portal</span>
            </span>
          )}

          {/* Connection Status Indicator */}
          <ConnectionStatusBadge />

          {/* Animated Visual Theme Toggle (Sun / Moon / System) */}
          <ThemeToggle />

          {/* Trilingual Language Selector (EN, HI, GU) */}
          <LanguageSelector />

          {/* Notifications Center */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-institutional-600 dark:text-institutional-300 hover:text-institutional-900 dark:hover:text-white hover:bg-institutional-100 dark:hover:bg-[#1A2420] rounded-lg relative transition-colors focus:outline-none cursor-pointer"
              aria-label="Statutory Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-govred-600 rounded-full ring-2 ring-white dark:ring-[#131B17] animate-pulse" />
              )}
            </button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white dark:bg-[#131B17] rounded-2xl shadow-modal border border-institutional-200 dark:border-institutional-800 z-50 overflow-hidden animate-scale-in">
                  <div className="px-4 py-2.5 border-b border-institutional-200 dark:border-institutional-800 bg-institutional-50 dark:bg-[#19241F] flex items-center justify-between">
                    <div className="font-bold text-xs text-institutional-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-govgreen-700 dark:text-govgreen-400" />
                      <span>Regulatory Notifications</span>
                    </div>
                    {unreadCount > 0 ? (
                      <span className="text-[10px] bg-govred-100 dark:bg-govred-950/80 text-govred-800 dark:text-govred-300 px-2 py-0.5 rounded-full font-bold">
                        {unreadCount} New
                      </span>
                    ) : (
                      <span className="text-[10px] text-institutional-400 font-mono">
                        Up to date
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-institutional-100 dark:divide-institutional-800/80 max-h-72 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-3 hover:bg-institutional-50 dark:hover:bg-[#1A2420] transition-colors text-xs cursor-pointer ${
                            !n.is_read ? 'bg-govgreen-50/40 dark:bg-govgreen-950/20' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-semibold text-institutional-900 dark:text-white flex items-center gap-1">
                              {!n.is_read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-govgreen-600 dark:bg-govgreen-400 shrink-0" />
                              )}
                              {n.title}
                            </span>
                            <span className="text-[10px] text-institutional-400 font-mono">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-institutional-600 dark:text-institutional-300 text-[11px] leading-relaxed line-clamp-2">
                            {n.message}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-institutional-400">
                        No notifications currently active.
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 border-t border-institutional-200 dark:border-institutional-800 bg-institutional-50/50 dark:bg-[#19241F]/50 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleDismissAll}
                      className="text-xs text-govgreen-700 dark:text-govgreen-400 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-institutional-500 hover:text-institutional-800 dark:hover:text-institutional-200"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Help Button */}
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="p-2 text-institutional-600 dark:text-institutional-300 hover:text-institutional-900 dark:hover:text-white hover:bg-institutional-100 dark:hover:bg-[#1A2420] rounded-lg transition-colors focus:outline-none cursor-pointer"
            title="Legal Metrology PCR 2011 Guide"
            aria-label="PCR 2011 Help Guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Production Diagnostics Modal Trigger */}
          <button
            type="button"
            onClick={() => setShowStatusModal(true)}
            className="p-2 text-institutional-600 dark:text-institutional-300 hover:text-govgreen-700 dark:hover:text-govgreen-400 hover:bg-institutional-100 dark:hover:bg-[#1A2420] rounded-lg transition-colors focus:outline-none cursor-pointer"
            title="System Diagnostics & Cloud Status"
            aria-label="System Diagnostics"
          >
            <Server className="w-4 h-4" />
          </button>

          <SystemStatusModal
            isOpen={showStatusModal}
            onClose={() => setShowStatusModal(false)}
          />

          <div className="h-5 w-px bg-institutional-200 dark:bg-institutional-800 mx-0.5" />

          {/* User Profile Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-institutional-100 dark:hover:bg-[#1A2420] transition-colors focus:outline-none cursor-pointer"
              aria-label="User Account Menu"
              aria-expanded={showUserMenu}
            >
              <div
                className={`w-8 h-8 rounded-xl text-white font-bold text-xs flex items-center justify-center border shadow-subtle shrink-0 ${
                  isOfficer
                    ? 'bg-govgreen-800 border-govgreen-900 text-govgreen-100'
                    : 'bg-govteal-700 border-govteal-800 text-govteal-100'
                }`}
              >
                {user?.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'US'}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-semibold text-institutional-900 dark:text-white leading-tight truncate max-w-[120px]">
                  {user?.displayName || 'Authorized User'}
                </span>
                <span className="text-[10px] text-institutional-500 dark:text-institutional-400 leading-tight">
                  {isOfficer ? 'Statutory Officer' : 'Verified Citizen'}
                </span>
              </div>
            </button>

            {/* Profile Dropdown */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#131B17] rounded-2xl shadow-modal border border-institutional-200 dark:border-institutional-800 z-50 overflow-hidden animate-scale-in">
                  <div className="p-3.5 border-b border-institutional-200 dark:border-institutional-800 bg-institutional-50/60 dark:bg-[#19241F]/60">
                    <div className="font-bold text-xs text-institutional-900 dark:text-white truncate">
                      {user?.displayName || 'NIRIKSHAK User'}
                    </div>
                    <div className="text-[11px] text-institutional-500 dark:text-institutional-400 font-mono truncate">
                      {user?.email || 'user@portal.gov.in'}
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isOfficer
                            ? 'bg-govgreen-100 dark:bg-govgreen-950 text-govgreen-900 dark:text-govgreen-300 border-govgreen-200 dark:border-govgreen-800'
                            : 'bg-govteal-100 dark:bg-govteal-950 text-govteal-900 dark:text-govteal-300 border-govteal-200 dark:border-govteal-800'
                        }`}
                      >
                        {isOfficer ? 'Inspection Officer' : 'Citizen Consumer'}
                      </span>
                      {isOfficer && user?.cadreCode && (
                        <span className="text-[9px] font-mono text-institutional-400">
                          {user.cadreCode}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-1.5 text-xs space-y-0.5">
                    <Link
                      to="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-institutional-700 dark:text-institutional-300 hover:text-institutional-900 dark:hover:text-white hover:bg-institutional-100 dark:hover:bg-[#1A2420] transition-colors"
                    >
                      <span>My Profile &amp; Credentials</span>
                    </Link>

                    {isOfficer ? (
                      <Link
                        to="/complaints"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-institutional-700 dark:text-institutional-300 hover:text-institutional-900 dark:hover:text-white hover:bg-institutional-100 dark:hover:bg-[#1A2420] transition-colors"
                      >
                        <span>Grievance Complaints Inbox</span>
                      </Link>
                    ) : (
                      <Link
                        to="/complaint"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-institutional-700 dark:text-institutional-300 hover:text-institutional-900 dark:hover:text-white hover:bg-institutional-100 dark:hover:bg-[#1A2420] transition-colors"
                      >
                        <span>Report a Packaging Concern</span>
                      </Link>
                    )}
                  </div>

                  <div className="p-1.5 border-t border-institutional-200 dark:border-institutional-800">
                    <button
                      type="button"
                      onClick={async () => {
                        setShowUserMenu(false);
                        await logout();
                        navigate('/login');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-govred-700 dark:text-govred-400 hover:bg-govred-50 dark:hover:bg-govred-950/40 text-xs font-semibold transition-colors cursor-pointer text-left"
                    >
                      <span>Sign Out from NIRIKSHAK</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-blur-in">
          <div className="bg-white dark:bg-[#131B17] rounded-2xl max-w-lg w-full border border-institutional-200 dark:border-institutional-800 shadow-modal overflow-hidden animate-scale-in">
            <div className="px-5 py-4 border-b border-institutional-200 dark:border-institutional-800 flex items-center justify-between bg-govgreen-900 dark:bg-govgreen-950 text-white">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-govgreen-200" />
                <h3 className="font-bold text-sm sm:text-base">NIRIKSHAK AI Inspection Guide</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-govgreen-200 hover:text-white p-1 rounded-lg hover:bg-govgreen-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3.5 text-xs text-institutional-800 dark:text-institutional-200 leading-relaxed max-h-[70vh] overflow-y-auto">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-900 dark:text-amber-300">
                <strong className="block mb-1 font-bold text-xs">Statutory Notice:</strong>
                NIRIKSHAK AI provides AI-assisted compliance analysis. All OCR findings and potential non-compliances require authorized officer verification before statutory proceedings.
              </div>

              <div>
                <h4 className="font-bold text-institutional-900 dark:text-white text-xs uppercase font-mono mb-1.5">
                  5 Mandatory Declarations (PCR Rule 6):
                </h4>
                <ol className="list-decimal pl-5 space-y-1 text-institutional-700 dark:text-institutional-300 font-medium">
                  <li><strong>Product Identity</strong>: Generic commodity description on PDP.</li>
                  <li><strong>Manufacturer Details</strong>: Registered name and complete physical address.</li>
                  <li><strong>Net Quantity</strong>: Standard metric units per Rule 11 &amp; 13.</li>
                  <li><strong>Maximum Retail Price</strong>: MRP inclusive of all taxes and Unit Sale Price.</li>
                  <li><strong>Consumer Care Cell</strong>: Grievance officer name, telephone &amp; email.</li>
                </ol>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-institutional-200 dark:border-institutional-800 bg-institutional-50 dark:bg-[#19241F] flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-1.5 bg-govgreen-800 hover:bg-govgreen-900 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-subtle transition-colors"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
