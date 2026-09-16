import React, { useState, useEffect } from 'react';
import {
  Menu,
  Search,
  Bell,
  HelpCircle,
  Shield,
  X,
  Smartphone,
  ShieldCheck,
  CheckCheck,
  ExternalLink,
} from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LanguageSelector } from '../common/LanguageSelector';
import { ConnectionStatusBadge } from '../common/ConnectionStatusBadge';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../auth/AuthContext';
import { notificationsApi, NotificationItem } from '../../services/api/notificationsApi';
import { dashboardApi, SearchResultItem } from '../../services/api/dashboardApi';

interface TopHeaderProps {
  onMenuClick: () => void;
  pageTitle?: string;
  breadcrumbs?: React.ReactNode;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onMenuClick,
  pageTitle,
  breadcrumbs,
}) => {
  const { user, isOfficer, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
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

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await dashboardApi.search(searchQuery.trim());
        setSearchResults(res);
      } catch (err) {
        console.warn('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = async (notif: NotificationItem) => {
    await notificationsApi.markAsRead(notif.id);
    setNotifications(prev =>
      prev.map(n => (n.id === notif.id ? { ...n, is_read: true } : n))
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
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setShowNotifications(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/inspections?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchResults([]);
    }
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-institutional-border px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-subtle">
        {/* Left: Mobile Menu Trigger + Title / Breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="p-2 -ml-1 text-govink-secondary hover:text-govink-primary rounded-lg lg:hidden hover:bg-institutional-subtle transition-colors focus:outline-none cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            {breadcrumbs ? (
              breadcrumbs
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-govink-primary truncate tracking-tight">
                  {pageTitle || (isConsumerMode ? t('consumer.checkTitle', 'Check your packaged product') : t('brand.name', 'NIRIKSHAK AI'))}
                </h1>
                {isConsumerMode && (
                  <span className="hidden sm:inline-block text-[10px] font-mono font-bold bg-govteal-100 text-govteal-700 px-2 py-0.5 rounded border border-govteal-200">
                    PUBLIC
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Global Search Bar with live autocomplete suggestions */}
        {!isConsumerMode && (
          <div className="hidden md:flex items-center flex-1 max-w-sm lg:max-w-md mx-4 relative">
            <form onSubmit={handleSearchSubmit} className="w-full relative">
              <Search className="w-3.5 h-3.5 text-govink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search inspection, complaint, brand, or rule..."
                className="w-full bg-institutional-subtle border border-institutional-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-govink-primary placeholder:text-govink-muted focus:outline-none focus:ring-2 focus:ring-govgreen-700 focus:bg-white transition-all"
              />
            </form>

            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-modal border border-institutional-border z-50 overflow-hidden text-xs max-h-60 overflow-y-auto">
                <div className="p-2 bg-institutional-subtle border-b border-institutional-border font-mono text-[10px] text-govink-muted uppercase">
                  Registry Search Results
                </div>
                {searchResults.map(item => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    to={item.url}
                    onClick={() => setSearchResults([])}
                    className="p-2.5 hover:bg-institutional-subtle block border-b border-institutional-border/50 last:border-0 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-govink-primary">{item.title}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                        item.type === 'COMPLAINT' ? 'bg-amber-100 text-amber-900' : 'bg-govgreen-100 text-govgreen-900'
                      }`}>
                        {item.type}
                      </span>
                    </div>
                    <div className="text-[11px] text-govink-secondary mt-0.5">{item.subtitle}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Right Section: Role Pill, Language Selector, Alerts, Help & Avatar Menu */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
          {/* Role Portal Indicator */}
          {isOfficer ? (
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-govgreen-100/70 border border-govgreen-200 text-govgreen-950 text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-govgreen-800" />
                <span>Officer Portal</span>
              </span>

              {/* Quick Consumer Preview for Officers */}
              <Link
                to={isConsumerMode ? '/dashboard' : '/check'}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-institutional-subtle hover:bg-institutional-border text-govink-secondary hover:text-govink-primary transition-colors text-xs font-semibold"
                title={isConsumerMode ? 'Back to Officer Dashboard' : 'Preview Consumer View'}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{isConsumerMode ? 'Officer View' : 'Consumer View'}</span>
              </Link>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-govteal-100/70 border border-govteal-200 text-govteal-950 text-[11px] font-bold">
              <Smartphone className="w-3.5 h-3.5 text-govteal-800" />
              <span>Consumer Portal</span>
            </span>
          )}

          {/* Resilience Connection Status */}
          <ConnectionStatusBadge />

          {/* Language Selector */}
          <LanguageSelector />

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-govink-secondary hover:text-govink-primary hover:bg-institutional-subtle rounded-lg relative transition-colors focus:outline-none cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-govred-600 rounded-full ring-2 ring-white animate-pulse" />
              )}
            </button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-xl shadow-modal border border-institutional-border z-50 overflow-hidden animate-page-enter">
                  <div className="px-4 py-2.5 border-b border-institutional-border bg-institutional-subtle flex items-center justify-between">
                    <div className="font-bold text-xs text-govink-primary uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-govgreen-800" />
                      <span>Notifications</span>
                    </div>
                    {unreadCount > 0 ? (
                      <span className="text-[10px] bg-govred-100 text-govred-800 px-1.5 py-0.5 rounded-full font-bold">
                        {unreadCount} New
                      </span>
                    ) : (
                      <span className="text-[10px] text-govink-muted font-mono">
                        All read
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-institutional-border max-h-72 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-3 hover:bg-institutional-subtle transition-colors text-xs cursor-pointer ${
                            !n.is_read ? 'bg-govgreen-50/30' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-semibold text-govink-primary flex items-center gap-1">
                              {!n.is_read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-govgreen-700 flex-shrink-0" />
                              )}
                              {n.title}
                            </span>
                            <span className="text-[10px] text-govink-muted font-mono">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-govink-secondary text-[11px] leading-relaxed line-clamp-2">
                            {n.message}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-govink-muted">
                        No notifications currently active.
                      </div>
                    )}
                  </div>

                  <div className="p-2 border-t border-institutional-border bg-institutional-subtle/50 flex items-center justify-between">
                    <button
                      onClick={handleDismissAll}
                      className="text-xs text-govgreen-800 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all as read
                    </button>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-govink-muted hover:text-govink-primary"
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
            onClick={() => setShowHelpModal(true)}
            className="p-2 text-govink-secondary hover:text-govink-primary hover:bg-institutional-subtle rounded-lg transition-colors focus:outline-none cursor-pointer"
            title="Legal Metrology Help"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-institutional-border mx-0.5" />

          {/* Profile Dropdown Menu Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-institutional-subtle transition-colors focus:outline-none cursor-pointer"
              aria-label="User profile menu"
            >
              <div
                className={`w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center border shadow-subtle flex-shrink-0 ${
                  isOfficer
                    ? 'bg-govgreen-900 border-govgreen-950'
                    : 'bg-govteal-700 border-govteal-800'
                }`}
              >
                {user?.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'US'}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-bold text-govink-primary leading-tight truncate max-w-[120px]">
                  {user?.displayName || 'User Account'}
                </span>
                <span className="text-[10px] text-govink-secondary leading-tight font-medium">
                  {isOfficer ? 'Officer' : 'Consumer'}
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
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-modal border border-institutional-border z-50 overflow-hidden animate-page-enter">
                  <div className="p-3.5 border-b border-institutional-border bg-institutional-subtle/50">
                    <div className="font-bold text-xs text-govink-primary truncate">
                      {user?.displayName || 'NIRIKSHAK User'}
                    </div>
                    <div className="text-[11px] text-govink-muted font-mono truncate">
                      {user?.email || 'user@portal.demo'}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isOfficer
                            ? 'bg-govgreen-100 text-govgreen-900 border-govgreen-200'
                            : 'bg-govteal-100 text-govteal-900 border-govteal-200'
                        }`}
                      >
                        {isOfficer ? 'Inspection Officer' : 'Consumer'}
                      </span>
                      {isOfficer && user?.cadreCode && (
                        <span className="text-[9px] font-mono text-govink-muted">
                          {user.cadreCode}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-1 text-xs">
                    <Link
                      to="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-govink-secondary hover:text-govink-primary hover:bg-institutional-subtle transition-colors"
                    >
                      <span>My Profile &amp; Settings</span>
                    </Link>

                    {isOfficer ? (
                      <Link
                        to="/complaints"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-govink-secondary hover:text-govink-primary hover:bg-institutional-subtle transition-colors"
                      >
                        <span>Grievance Complaints Inbox</span>
                      </Link>
                    ) : (
                      <Link
                        to="/complaint"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-govink-secondary hover:text-govink-primary hover:bg-institutional-subtle transition-colors"
                      >
                        <span>Report a Packaging Concern</span>
                      </Link>
                    )}
                  </div>

                  <div className="p-1 border-t border-institutional-border">
                    <button
                      onClick={async () => {
                        setShowUserMenu(false);
                        await logout();
                        navigate('/login');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-govred-700 hover:bg-govred-50 text-xs font-bold transition-colors cursor-pointer text-left"
                    >
                      <span>Sign Out</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-govink-primary/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-institutional-border shadow-modal overflow-hidden animate-page-enter">
            <div className="px-5 py-4 border-b border-institutional-border flex items-center justify-between bg-govgreen-900 text-white">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-govgreen-200" />
                <h3 className="font-bold text-sm sm:text-base">NIRIKSHAK AI Inspection Guide</h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-govgreen-200 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3.5 text-xs text-govink-primary leading-relaxed max-h-[70vh] overflow-y-auto">
              <div className="p-3 bg-[#FEF3C7] border border-[#FDE68A] rounded-lg text-[#B45309]">
                <strong className="block mb-1 font-bold text-xs">Statutory Notice:</strong>
                NIRIKSHAK AI provides AI-assisted compliance analysis. All OCR findings and potential non-compliances require authorized officer verification before statutory proceedings.
              </div>

              <div>
                <h4 className="font-bold text-govink-primary text-xs uppercase font-mono mb-1">
                  5 Core Mandatory Declarations (Rule 6):
                </h4>
                <ol className="list-decimal pl-5 space-y-1 text-govink-secondary">
                  <li><strong>Product Name</strong>: Generic commodity description on PDP.</li>
                  <li><strong>Manufacturer Details</strong>: Registered name and physical address.</li>
                  <li><strong>Net Quantity</strong>: Standard metric units (Rule 11 &amp; 13).</li>
                  <li><strong>Maximum Retail Price</strong>: MRP inclusive of all taxes and Unit Sale Price.</li>
                  <li><strong>Consumer Care Cell</strong>: Grievance officer contact, telephone &amp; email.</li>
                </ol>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-institutional-border bg-institutional-subtle flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-1.5 bg-govgreen-900 text-white rounded-lg text-xs font-semibold hover:bg-govgreen-800 cursor-pointer shadow-subtle"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
