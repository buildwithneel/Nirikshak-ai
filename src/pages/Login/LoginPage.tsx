import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  UserCheck,
  Smartphone,
  Download,
  Monitor,
  Share2,
  PlusSquare,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/ui/Button';
import { LanguageSelector } from '../../components/common/LanguageSelector';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { useLanguage } from '../../i18n/LanguageContext';
import { AppAlreadyInstalledModal } from '../../components/common/AppAlreadyInstalledModal';

// SVG Component for Apple Logo
const AppleLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 170 170" fill="currentColor">
    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.59-7.71-11.66-14-4.88-7.5-8.94-16.14-12.18-25.92-3.23-9.78-4.86-19.46-4.86-29.04 0-14.33 3.65-26.15 10.96-35.47 7.31-9.31 16.5-14.07 27.57-14.28 5.75 0 11.95 1.63 18.6 4.9 6.64 3.26 10.84 4.96 12.6 5.09 1.52-.13 5.92-1.88 13.2-5.26 7.29-3.37 13.43-4.89 18.42-4.56 10.1.65 18.57 4.54 25.42 11.68 6.85 7.13 11.08 15.42 12.7 24.86-8.91 5.38-13.3 12.87-13.16 22.47.14 8.78 3.58 16.18 10.32 22.21 4.56 4.09 9.87 6.94 15.93 8.56-1.52 4.45-3.37 9.17-5.54 14.16zM119.22 31.84c0-7.39 2.65-14.34 7.96-20.85 5.3-6.52 11.83-10.63 19.58-12.33 1.09 7.07.13 14.1-2.88 21.09-3.01 6.99-7.59 12.44-13.74 16.36-2.93 1.95-6.52 3.26-10.77 3.91-.07-2.71-.15-5.43-.15-8.18z" />
  </svg>
);

// SVG Component for Apple Safari Share Icon
const SafariShareIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

import { usePlatform } from '../../hooks/usePlatform';
import { DEMO_PASSWORDS } from '../../config/demoAccounts';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, isAuthenticated, isOfficer } = useAuth();
  const { t } = useLanguage();
  const { platform, appMode, isIOS, isAndroid, isStandalone } = usePlatform();

  const [email, setEmail] = useState('inspector@officer.demo');
  const [password, setPassword] = useState('Officer@2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasErrorShake, setHasErrorShake] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Post-login role confirmation screen state
  const [confirmedRole, setConfirmedRole] = useState<'OFFICER' | 'USER' | null>(null);

  // PWA Install prompt & single-download state
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      const stored = localStorage.getItem('nirikshak_pwa_downloaded') === 'true';
      return isStandaloneMode || stored;
    }
    return false;
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [showAlreadyInstalledDialog, setShowAlreadyInstalledDialog] = useState(false);
  const [showIosInstallModal, setShowIosInstallModal] = useState(false);
  const [installedAt, setInstalledAt] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nirikshak_pwa_installed_at');
    }
    return null;
  });

  // Listen for PWA beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsDownloaded(true);
      const now = new Date().toISOString();
      setInstalledAt(now);
      try {
        localStorage.setItem('nirikshak_pwa_downloaded', 'true');
        localStorage.setItem('nirikshak_pwa_installed_at', now);
      } catch (_) {}
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
      setIsDownloaded(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallPWA = async () => {
    // 1. Check if already installed or downloaded on this device
    if (isInstalled || isDownloaded) {
      setShowAlreadyInstalledDialog(true);
      return;
    }

    // 2. Prevent concurrent downloads on multiple fast taps
    if (isDownloading) return;

    if (!installPrompt) {
      setShowAlreadyInstalledDialog(true);
      return;
    }

    setIsDownloading(true);
    try {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsDownloaded(true);
        const now = new Date().toISOString();
        setInstalledAt(now);
        try {
          localStorage.setItem('nirikshak_pwa_downloaded', 'true');
          localStorage.setItem('nirikshak_pwa_installed_at', now);
        } catch (_) {}
      }
      setInstallPrompt(null);
    } catch (err) {
      console.warn('Install error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const resetDownloadTest = () => {
    try {
      localStorage.removeItem('nirikshak_pwa_downloaded');
      localStorage.removeItem('nirikshak_pwa_installed_at');
    } catch (_) {}
    setIsDownloaded(false);
    setInstalledAt(null);
  };

  // If already authenticated and visiting /login directly, redirect
  useEffect(() => {
    if (isAuthenticated && !confirmedRole) {
      if (isOfficer) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/check', { replace: true });
      }
    }
  }, [isAuthenticated, isOfficer, navigate, confirmedRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage(t('auth.missingFields', 'Please enter both email address and password.'));
      triggerShake();
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await login({
        email: email.trim(),
        password,
        rememberMe,
      });

      const userRole = response.user.role === 'OFFICER' ? 'OFFICER' : 'USER';
      setConfirmedRole(userRole);

      // Safe role-based destination resolution
      const fromPath = (location.state as any)?.from?.pathname;
      let destination = userRole === 'OFFICER' ? '/dashboard' : '/check';
      if (fromPath) {
        if (userRole === 'OFFICER') {
          const officerRoutes = [
            '/dashboard',
            '/scan',
            '/inspections',
            '/complaints',
            '/products',
            '/reports',
            '/rules',
            '/analytics',
            '/settings',
          ];
          if (officerRoutes.some((r) => fromPath === r || fromPath.startsWith(r + '/'))) {
            destination = fromPath;
          }
        } else {
          const consumerRoutes = ['/check', '/complaint', '/my-complaints', '/profile'];
          if (consumerRoutes.some((r) => fromPath === r || fromPath.startsWith(r + '/'))) {
            destination = fromPath;
          }
        }
      }

      setTimeout(() => {
        navigate(destination, { replace: true });
      }, 900);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(
        err.message ||
          t('auth.invalidCredentials', 'Unable to sign in. Check your email and password and try again.')
      );
      triggerShake();
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setIsGoogleLoading(false);
      setErrorMessage(
        err.message ||
          t(
            'auth.googleError',
            'Unable to connect to Google Sign-In. You may sign in with institutional credentials below.'
          )
      );
      triggerShake();
    }
  };

  const triggerShake = () => {
    setHasErrorShake(true);
    setTimeout(() => setHasErrorShake(false), 350);
  };

  const quickFillDemo = (type: 'officer' | 'citizen') => {
    if (type === 'officer') {
      setEmail('inspector@officer.demo');
      setPassword(DEMO_PASSWORDS.OFFICER);
    } else {
      setEmail('citizen@gmail.com');
      setPassword(DEMO_PASSWORDS.CONSUMER);
    }
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-institutional-50 dark:bg-[#0B110E] flex flex-col justify-center items-center p-3 sm:p-6 bg-grid-pattern selection:bg-govgreen-100 selection:text-govgreen-950 transition-colors duration-200">
      {/* Top Utility Bar (Theme and Language Controls - Manual platform switcher removed) */}
      <div className="w-full max-w-md flex items-center justify-end mb-3 px-1">
        <div className="flex items-center gap-2">
          <ThemeToggle variant="compact" />
          <LanguageSelector />
        </div>
      </div>

      <div className="w-full max-w-md space-y-4 animate-card-entrance">
        {/* =========================================================================
            HEADER SECTION:
            Automatically determined by user's platform/environment:
            - iOS: Sleek Apple App Header + Apple iOS Web App Badge
            - Android: Pure App Header + Android PWA Badge
            - Web / Desktop: Full government header with national emblems and subtitles
            ========================================================================= */}
        {isIOS ? (
          /* APPLE iOS PWA HEADER */
          <div className="text-center py-1 space-y-2">
            <div className="inline-flex items-center justify-center p-3.5 sm:p-4 rounded-3xl bg-white shadow-elevated border border-institutional-200/80 transition-transform active:scale-98">
              <img
                src="/logo-full-transparent.png"
                alt="Nirikshak-AI"
                className="w-52 sm:w-60 h-auto object-contain"
              />
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-[10px] font-semibold border border-slate-200 dark:border-slate-800">
                <AppleLogo className="w-3 h-3 fill-current" />
                <span>Apple iOS Web App</span>
                {isStandalone || isDownloaded ? (
                  <span className="text-[#16A34A] font-bold">• Active Standalone</span>
                ) : (
                  <span className="text-blue-500 dark:text-blue-400 font-medium">• Apple Device Detected</span>
                )}
              </div>
            </div>
          </div>
        ) : isAndroid ? (
          /* ANDROID PWA HEADER */
          <div className="text-center py-1 space-y-2">
            <div className="inline-flex items-center justify-center p-3.5 sm:p-4 rounded-3xl bg-white shadow-elevated border border-institutional-200/80 transition-transform active:scale-98">
              <img
                src="/logo-full-transparent.png"
                alt="Nirikshak-AI"
                className="w-52 sm:w-60 h-auto object-contain"
              />
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-semibold border border-slate-200 dark:border-slate-800">
                <Smartphone className="w-3 h-3 text-[#22C55E]" />
                <span>Android PWA</span>
                {isStandalone || isDownloaded ? (
                  <span className="text-[#16A34A] font-bold">• Installed</span>
                ) : (
                  <span className="text-slate-400">• Android Device Detected</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* STANDARD WEB HEADER (Windows / macOS / Linux Desktop) */
          <div className="text-center space-y-2.5">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-govgreen-600 dark:bg-govgreen-400 animate-soft-pulse" />
              <span className="text-[11px] font-mono font-bold text-institutional-500 dark:text-institutional-400 uppercase tracking-wider">
                OFFICIAL SYSTEM
              </span>
            </div>

            <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-white dark:bg-[#131B17] shadow-elevated border border-institutional-200 dark:border-institutional-800">
              <img
                src="/logo-icon.png"
                alt="Nirikshak-AI"
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
              />
            </div>

            <div>
              <div className="flex items-center justify-center gap-1.5">
                <span className="font-extrabold text-2xl sm:text-3xl font-display">
                  <span className="text-[#0B2545] dark:text-white">Nirikshak</span>
                  <span className="text-[#16A34A] dark:text-[#22C55E] font-black ml-0.5">-AI</span>
                </span>
                <span className="text-xs font-bold bg-govgreen-50 dark:bg-govgreen-950 text-govgreen-800 dark:text-govgreen-300 border border-govgreen-200/80 dark:border-govgreen-800/80 px-1.5 py-0.5 rounded font-mono">
                  PCR 2011
                </span>
              </div>
              <p className="text-xs font-semibold text-institutional-600 dark:text-institutional-400 uppercase tracking-wider mt-0.5">
                {t('brand.fullTitle', 'Legal Metrology Compliance & Inspection Platform')}
              </p>
              <p className="text-[11px] text-institutional-500 dark:text-institutional-400 mt-0.5">
                Government of India • Ministry of Consumer Affairs
              </p>
            </div>
          </div>
        )}

        {/* PWA Install Banner: Automatically tailored to platform */}
        {isInstalled || isDownloaded || isStandalone ? (
          <div
            onClick={() => setShowAlreadyInstalledDialog(true)}
            className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-xs cursor-pointer animate-fade-in hover:brightness-95 transition-all"
          >
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-bold truncate block">
                  {isStandalone ? 'Running in Standalone App Mode' : 'Nirikshak-AI Already Downloaded'}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block truncate">
                  Single device instance active • Ready for field inspections
                </span>
              </div>
            </div>
            <button
              type="button"
              className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 shrink-0"
            >
              View Status
            </button>
          </div>
        ) : isIOS ? (
          /* iOS PWA Add to Home Screen Banner */
          <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0B2545] to-slate-900 text-white flex items-center justify-between shadow-md border border-slate-700/60 animate-slide-down">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-xs">
                <AppleLogo className="w-5 h-5 fill-slate-900" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">Install Nirikshak-AI on iOS</div>
                <div className="text-[10px] text-slate-300 truncate">
                  Tap Safari Share &amp; Add to Home Screen
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowIosInstallModal(true)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              <SafariShareIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>Install Guide</span>
            </button>
          </div>
        ) : isAndroid ? (
          /* Android PWA Install Banner */
          <div className="p-3 rounded-2xl bg-gradient-to-r from-govgreen-900 to-[#0B2545] text-white flex items-center justify-between shadow-md border border-govgreen-700/50 animate-slide-down">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/logo-icon.png"
                alt="App Icon"
                className="w-8 h-8 rounded-lg bg-white p-0.5 shrink-0"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">Install Nirikshak-AI App</div>
                <div className="text-[10px] text-govgreen-200 truncate">
                  Android PWA • Fast &amp; Offline Ready
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleInstallPWA}
              disabled={isDownloading}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloading ? 'Installing…' : 'Install'}</span>
            </button>
          </div>
        ) : null}

        {/* Login Card */}
        <div
          className={`bg-white dark:bg-[#131B17] rounded-3xl border border-institutional-200 dark:border-institutional-800 p-5 sm:p-7 shadow-elevated transition-all duration-200 ${
            hasErrorShake ? 'animate-error-shake ring-2 ring-govred-400' : ''
          }`}
        >
          {confirmedRole ? (
            /* Role Confirmation Feedback Animation */
            <div className="py-8 text-center space-y-4 animate-scale-in">
              <div
                className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center animate-checkmark ${
                  confirmedRole === 'OFFICER'
                    ? 'bg-govgreen-100 dark:bg-govgreen-950 text-govgreen-900 dark:text-govgreen-300 border border-govgreen-300 dark:border-govgreen-700'
                    : 'bg-govteal-100 dark:bg-govteal-950 text-govteal-800 dark:text-govteal-300 border border-govteal-300 dark:border-govteal-700'
                }`}
              >
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-institutional-900 dark:text-white">
                  {confirmedRole === 'OFFICER'
                    ? t('auth.officerVerified', 'Officer Access Verified')
                    : t('auth.welcomeConsumer', 'Welcome to Nirikshak-AI')}
                </h3>
                <p className="text-xs text-institutional-500 dark:text-institutional-400 mt-1">
                  {confirmedRole === 'OFFICER'
                    ? t('auth.openingInspectionPortal', 'Launching Enforcement Workspace…')
                    : t('auth.openingConsumerPortal', 'Launching Citizen Portal…')}
                </p>
              </div>

              <div className="flex justify-center items-center gap-1.5 pt-2">
                <span className="w-2 h-2 rounded-full bg-govgreen-600 dark:bg-govgreen-400 animate-ping" />
                <span className="text-[11px] font-mono font-bold text-institutional-400">
                  AUTHENTICATED
                </span>
              </div>
            </div>
          ) : (
            /* Standard Login Form */
            <div className="space-y-4">
              {!isIOS && !isAndroid && (
                <div className="border-b border-institutional-100 dark:border-institutional-800 pb-3">
                  <h2 className="text-base sm:text-lg font-bold text-institutional-900 dark:text-white">
                    {t('auth.unifiedSignIn', 'Authorized Sign In')}
                  </h2>
                  <p className="text-xs text-institutional-500 dark:text-institutional-400 mt-0.5">
                    Unified access portal for statutory officers and consumer citizens
                  </p>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 rounded-xl bg-govred-50 dark:bg-govred-950/60 border border-govred-200 dark:border-govred-900/60 text-govred-800 dark:text-govred-300 text-xs flex items-start gap-2 animate-slide-down">
                  <AlertCircle className="w-4 h-4 text-govred-600 dark:text-govred-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {/* Google OAuth Login Button */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || isLoading}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-2xl border border-institutional-200 dark:border-institutional-800 bg-white dark:bg-[#1A2420] hover:bg-institutional-50 dark:hover:bg-[#202E28] text-institutional-800 dark:text-institutional-200 font-semibold text-xs sm:text-sm shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-[#16A34A] cursor-pointer disabled:opacity-60"
                  aria-label="Continue with Google"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>
                    {isGoogleLoading
                      ? t('auth.connectingGoogle', 'Connecting to Google…')
                      : t('auth.continueWithGoogle', 'Continue with Google')}
                  </span>
                </button>

                <div className="relative flex items-center justify-center my-3">
                  <div className="border-t border-institutional-200 dark:border-institutional-800 w-full"></div>
                  <span className="bg-white dark:bg-[#131B17] px-3 text-[10px] sm:text-[11px] font-mono font-bold uppercase text-institutional-400 tracking-wider">
                    {t('auth.orDivider', 'OR USE CREDENTIALS')}
                  </span>
                  <div className="border-t border-institutional-200 dark:border-institutional-800 w-full"></div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                {/* Email Input */}
                <div>
                  <label className="block font-semibold text-institutional-800 dark:text-institutional-200 mb-1">
                    {t('auth.emailLabel', 'Email Address')}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-institutional-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="inspector@officer.demo or citizen@gmail.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-institutional-200 dark:border-institutional-800 bg-white dark:bg-[#1A2420] text-institutional-900 dark:text-white placeholder:text-institutional-400 focus:outline-none focus:ring-2 focus:ring-[#16A34A] transition-all text-xs sm:text-sm"
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-institutional-800 dark:text-institutional-200">
                      {t('auth.passwordLabel', 'Password')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-[11px] text-[#16A34A] dark:text-[#22C55E] hover:underline font-semibold cursor-pointer"
                    >
                      {t('auth.forgotPassword', 'Forgot password?')}
                    </button>
                  </div>

                  <div className="relative">
                    <Lock className="w-4 h-4 text-institutional-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-institutional-200 dark:border-institutional-800 bg-white dark:bg-[#1A2420] text-institutional-900 dark:text-white placeholder:text-institutional-400 focus:outline-none focus:ring-2 focus:ring-[#16A34A] transition-all text-xs sm:text-sm font-mono"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-institutional-400 hover:text-institutional-700 dark:hover:text-institutional-200 transition-colors cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 transition-transform active:rotate-12" />
                      ) : (
                        <Eye className="w-4 h-4 transition-transform active:rotate-12" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-[#16A34A] focus:ring-[#16A34A] border-institutional-300 dark:border-institutional-700 bg-white dark:bg-[#1A2420]"
                    />
                    <span className="text-xs text-institutional-600 dark:text-institutional-400 font-medium">
                      {t('auth.rememberMe', 'Remember me')}
                    </span>
                  </label>

                  <div className="text-[11px] text-institutional-400 font-mono">
                    Auto-Role Detection
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full min-h-[46px] text-xs sm:text-sm font-bold shadow-subtle mt-2 press-spring justify-center bg-[#0B2545] hover:bg-[#07192F] text-white rounded-xl cursor-pointer"
                  isLoading={isLoading}
                  rightIcon={!isLoading ? <ArrowRight className="w-4 h-4" /> : undefined}
                >
                  {isLoading
                    ? t('auth.verifying', 'Signing In…')
                    : isIOS
                    ? 'Sign In to iOS App'
                    : isAndroid
                    ? 'Sign In'
                    : 'Sign In to Nirikshak-AI'}
                </Button>
              </form>

              {/* Quick Evaluation Demo Chips */}
              <div className="pt-3 border-t border-institutional-200 dark:border-institutional-800">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-institutional-500 dark:text-institutional-400 uppercase mb-2">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Quick Evaluation Accounts</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => quickFillDemo('officer')}
                    className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-[#0B2545]/20 dark:border-institutional-700 bg-slate-50 dark:bg-[#1A2420] hover:bg-slate-100 dark:hover:bg-[#202E28] text-[#0B2545] dark:text-slate-200 transition-colors text-xs font-semibold cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5 shrink-0 text-[#16A34A]" />
                    <span className="truncate">Officer Demo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => quickFillDemo('citizen')}
                    className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-govteal-200 dark:border-govteal-800/80 bg-govteal-50/80 dark:bg-govteal-950/40 hover:bg-govteal-100 dark:hover:bg-govteal-950/70 text-govteal-900 dark:text-govteal-300 transition-colors text-xs font-semibold cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 shrink-0 text-govteal-600 dark:text-govteal-400" />
                    <span className="truncate">Consumer Demo</span>
                  </button>
                </div>
              </div>

              {/* Statutory Notice */}
              <div className="pt-1 text-center">
                <div className="inline-flex items-center gap-1.5 text-[10px] text-institutional-500 dark:text-institutional-400 font-medium">
                  <Shield className="w-3 h-3 text-[#16A34A]" />
                  <span>Statutory Role-Based Access Control</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {!isIOS && !isAndroid && (
          <div className="text-center text-[11px] text-institutional-500 dark:text-institutional-400">
            Legal Metrology Enforcement System • Built for official field &amp; public vigilance
          </div>
        )}
      </div>

      {/* iOS PWA Add to Home Screen Guidance Modal */}
      {showIosInstallModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#131B17] rounded-3xl max-w-md w-full border border-institutional-200 dark:border-institutional-800 shadow-modal p-5 sm:p-6 space-y-4 animate-slide-up sm:animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-institutional-100 dark:border-institutional-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-xs">
                  <AppleLogo className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-institutional-900 dark:text-white">
                    Install Nirikshak-AI on iOS
                  </h3>
                  <p className="text-[11px] text-institutional-500 dark:text-institutional-400">
                    Apple iPhone &amp; iPad Home Screen Setup
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIosInstallModal(false)}
                className="p-1 rounded-full text-institutional-400 hover:text-institutional-700 dark:hover:text-institutional-200 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <span className="text-xl leading-none font-bold">&times;</span>
              </button>
            </div>

            {/* Step-by-Step Apple Safari Guide */}
            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#1A2420] border border-slate-200/80 dark:border-slate-800">
                <div className="w-7 h-7 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                  1
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="text-xs font-bold text-institutional-900 dark:text-white flex items-center gap-1.5">
                    <span>Tap Safari Share button</span>
                    <SafariShareIcon className="w-4 h-4 text-blue-500 shrink-0" />
                  </div>
                  <p className="text-[11px] text-institutional-600 dark:text-institutional-400">
                    In Safari toolbar (bottom on iPhone, top on iPad), tap the Share icon.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#1A2420] border border-slate-200/80 dark:border-slate-800">
                <div className="w-7 h-7 rounded-xl bg-[#0B2545] dark:bg-white dark:text-[#0B2545] text-white flex items-center justify-center shrink-0 font-bold text-xs">
                  2
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="text-xs font-bold text-institutional-900 dark:text-white flex items-center gap-1.5">
                    <span>Select &ldquo;Add to Home Screen&rdquo;</span>
                    <PlusSquare className="w-4 h-4 text-[#16A34A] shrink-0" />
                  </div>
                  <p className="text-[11px] text-institutional-600 dark:text-institutional-400">
                    Scroll down through the share options and tap <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#1A2420] border border-slate-200/80 dark:border-slate-800">
                <div className="w-7 h-7 rounded-xl bg-[#16A34A] text-white flex items-center justify-center shrink-0 font-bold text-xs">
                  3
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="text-xs font-bold text-institutional-900 dark:text-white flex items-center gap-1.5">
                    <span>Tap &ldquo;Add&rdquo; in Top-Right</span>
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0" />
                  </div>
                  <p className="text-[11px] text-institutional-600 dark:text-institutional-400">
                    Confirm by tapping <strong>Add</strong>. Nirikshak-AI will appear on your Home Screen as an offline-ready app.
                  </p>
                </div>
              </div>
            </div>

            {/* Apple Native Advantage Callout */}
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-tight">
                Runs fullscreen without browser bars, caches Legal Metrology Rules for offline use, and loads instantly.
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => setShowIosInstallModal(false)}
              className="w-full justify-center text-xs font-bold rounded-xl bg-[#0B2545] hover:bg-[#07192F] text-white cursor-pointer"
            >
              Got It
            </Button>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#131B17] rounded-2xl max-w-sm w-full border border-institutional-200 dark:border-institutional-800 shadow-modal p-6 space-y-4 animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-govgreen-50 dark:bg-govgreen-950 text-govgreen-800 dark:text-govgreen-300 border border-govgreen-200 dark:border-govgreen-800 flex items-center justify-center mx-auto">
              <HelpCircle className="w-6 h-6 text-[#16A34A]" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-institutional-900 dark:text-white">
                Credential Assistance
              </h3>
              <p className="text-xs text-institutional-600 dark:text-institutional-400 leading-relaxed">
                For authorized officers, contact your state nodal administrator or Legal Metrology helpdesk. Consumers may use the evaluation demo accounts or reset via verified email.
              </p>
            </div>

            <Button
              variant="outline"
              size="md"
              onClick={() => setShowForgotModal(false)}
              className="w-full justify-center text-xs font-bold rounded-xl cursor-pointer"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* App Already Downloaded / Installed Dialogue Box */}
      <AppAlreadyInstalledModal
        isOpen={showAlreadyInstalledDialog}
        onClose={() => setShowAlreadyInstalledDialog(false)}
        isStandalone={isInstalled}
        installedAt={installedAt}
        onReinstallTest={resetDownloadTest}
      />
    </div>
  );
};

export default LoginPage;
