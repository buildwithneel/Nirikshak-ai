import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Layers,
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
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/ui/Button';
import { LanguageSelector } from '../../components/common/LanguageSelector';
import { useLanguage } from '../../i18n/LanguageContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, isAuthenticated, isOfficer, isSupabaseEnabled } = useAuth();
  const { t } = useLanguage();

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

  // If already authenticated and visiting /login directly, redirect
  React.useEffect(() => {
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

      // Show subtle role confirmation transition
      const userRole = response.user.role === 'OFFICER' ? 'OFFICER' : 'USER';
      setConfirmedRole(userRole);

      const destination = (location.state as any)?.from?.pathname || (userRole === 'OFFICER' ? '/dashboard' : '/check');

      setTimeout(() => {
        navigate(destination, { replace: true });
      }, 1000);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(
        err.message || t('auth.invalidCredentials', 'Unable to sign in. Check your email and password and try again.')
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
        err.message || t('auth.googleError', 'Unable to connect to Google Sign-In. You may sign in with institutional credentials below.')
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
      setPassword('Officer@2026!');
    } else {
      setEmail('citizen@gmail.com');
      setPassword('Citizen@2026!');
    }
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-institutional-bg flex flex-col justify-center items-center p-4 sm:p-6 bg-grid-pattern selection:bg-govgreen-100 selection:text-govgreen-950">
      <div className="w-full max-w-md space-y-4 sm:space-y-5 animate-card-entrance">
        {/* Top Header Row: Branding & Language */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-govgreen-600 animate-soft-pulse" />
            <span className="text-[11px] font-mono font-bold text-govink-muted uppercase tracking-wider">
              OFFICIAL SYSTEM
            </span>
          </div>
          <LanguageSelector />
        </div>

        {/* Central Seal & Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-govgreen-900 text-white shadow-elevated border border-govgreen-950 animate-logo-reveal">
            <Layers className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>

          <div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="font-black text-2xl sm:text-3xl text-govink-primary tracking-wider font-sans">
                {t('brand.name', 'NIRIKSHAK')}
              </span>
              <span className="text-xs font-bold bg-govgreen-100 text-govgreen-900 border border-govgreen-200 px-1.5 py-0.5 rounded font-mono">
                AI
              </span>
            </div>
            <p className="text-xs font-bold text-govink-secondary uppercase tracking-wider mt-0.5">
              {t('brand.fullTitle', 'LEGAL METROLOGY COMPLIANCE & INSPECTION PLATFORM')}
            </p>
            <p className="text-[11px] text-govink-muted mt-0.5">
              {t('brand.portalTag', 'Government of India • Ministry of Consumer Affairs')}
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div
          className={`bg-white rounded-2xl border border-institutional-border p-6 sm:p-8 shadow-elevated transition-all duration-200 ${
            hasErrorShake ? 'animate-error-shake ring-2 ring-govred-300' : ''
          }`}
        >
          {confirmedRole ? (
            /* Role Confirmation Feedback Animation */
            <div className="py-8 text-center space-y-4 animate-scale-in">
              <div
                className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center animate-checkmark ${
                  confirmedRole === 'OFFICER'
                    ? 'bg-govgreen-100 text-govgreen-900 border border-govgreen-300'
                    : 'bg-govteal-100 text-govteal-800 border border-govteal-300'
                }`}
              >
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h3 className="text-lg font-black text-govink-primary">
                  {confirmedRole === 'OFFICER'
                    ? t('auth.officerVerified', 'Officer access verified')
                    : t('auth.welcomeConsumer', 'Welcome to NIRIKSHAK AI')}
                </h3>
                <p className="text-xs text-govink-secondary mt-1">
                  {confirmedRole === 'OFFICER'
                    ? t('auth.openingInspectionPortal', 'Opening Inspection Portal…')
                    : t('auth.openingConsumerPortal', 'Opening Consumer Portal…')}
                </p>
              </div>

              <div className="flex justify-center items-center gap-1.5 pt-2">
                <span className="w-2 h-2 rounded-full bg-govgreen-700 animate-ping" />
                <span className="text-[11px] font-mono font-bold text-govink-muted">
                  AUTHENTICATED
                </span>
              </div>
            </div>
          ) : (
            /* Standard Login Form */
            <div className="space-y-4">
              <div className="border-b border-institutional-border pb-3">
                <h2 className="text-base sm:text-lg font-bold text-govink-primary">
                  {t('auth.unifiedSignIn', 'Authorized Sign In')}
                </h2>
                <p className="text-xs text-govink-secondary mt-0.5">
                  {t(
                    'auth.signInSub',
                    'Single institutional portal for Enforcement Officers and Consumers'
                  )}
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-govred-50 border border-govred-200 text-govred-800 text-xs flex items-start gap-2 animate-slide-down">
                  <AlertCircle className="w-4 h-4 text-govred-600 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {/* Google OAuth Login Button */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || isLoading}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-institutional-border bg-white hover:bg-slate-50 text-govink-primary font-bold text-xs sm:text-sm shadow-sm transition-all hover:border-govgreen-600 focus:outline-none focus:ring-2 focus:ring-govgreen-700 cursor-pointer disabled:opacity-60"
                  aria-label="Continue with Google"
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
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
                    {isGoogleLoading ? t('auth.connectingGoogle', 'Connecting to Google…') : t('auth.continueWithGoogle', 'Continue with Google')}
                  </span>
                </button>

                <div className="relative flex items-center justify-center my-3">
                  <div className="border-t border-institutional-border w-full"></div>
                  <span className="bg-white px-3 text-[10px] sm:text-[11px] font-mono font-bold uppercase text-govink-muted tracking-wider">
                    {t('auth.orDivider', 'OR USE CREDENTIALS')}
                  </span>
                  <div className="border-t border-institutional-border w-full"></div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                {/* Email Input */}
                <div>
                  <label className="block font-bold text-govink-primary mb-1">
                    {t('auth.emailLabel', 'Email Address')}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-govink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="inspector@officer.demo or citizen@gmail.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-institutional-border bg-white text-govink-primary font-sans focus:outline-none focus:ring-2 focus:ring-govgreen-700 transition-all text-xs sm:text-sm"
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-govink-primary">
                      {t('auth.passwordLabel', 'Password')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-[11px] text-govgreen-800 hover:text-govgreen-900 hover:underline font-semibold cursor-pointer"
                    >
                      {t('auth.forgotPassword', 'Forgot password?')}
                    </button>
                  </div>

                  <div className="relative">
                    <Lock className="w-4 h-4 text-govink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-institutional-border bg-white text-govink-primary font-sans focus:outline-none focus:ring-2 focus:ring-govgreen-700 transition-all text-xs sm:text-sm"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-govink-muted hover:text-govink-primary transition-colors cursor-pointer"
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
                      onChange={e => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-govgreen-800 focus:ring-govgreen-700 border-institutional-border"
                    />
                    <span className="text-xs text-govink-secondary font-medium">
                      {t('auth.rememberMe', 'Remember me')}
                    </span>
                  </label>

                  <div className="text-[11px] text-govink-muted font-mono">
                    Auto-Role Detection
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full min-h-[46px] text-xs sm:text-sm font-bold shadow-subtle mt-2 press-spring justify-center"
                  isLoading={isLoading}
                  rightIcon={!isLoading ? <ArrowRight className="w-4 h-4" /> : undefined}
                >
                  {isLoading ? t('auth.verifying', 'Signing In…') : t('auth.signIn', 'Sign In')}
                </Button>
              </form>

              {/* Dev / Evaluation Quick-Fill Chips */}
              <div className="pt-3 border-t border-institutional-border">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-govink-muted uppercase mb-2">
                  <Sparkles className="w-3 h-3 text-govamber-600" />
                  <span>Quick Evaluation Credentials</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => quickFillDemo('officer')}
                    className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-govgreen-200 bg-govgreen-50 hover:bg-govgreen-100 text-govgreen-900 transition-colors text-left text-xs font-semibold cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5 flex-shrink-0 text-govgreen-800" />
                    <span className="truncate">Officer Demo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => quickFillDemo('citizen')}
                    className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-govteal-200 bg-govteal-50 hover:bg-govteal-100 text-govteal-900 transition-colors text-left text-xs font-semibold cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 flex-shrink-0 text-govteal-700" />
                    <span className="truncate">Consumer Demo</span>
                  </button>
                </div>
              </div>

              {/* Institutional Assurance */}
              <div className="pt-2 text-center">
                <div className="inline-flex items-center gap-1.5 text-[11px] text-govgreen-900 font-semibold">
                  <Shield className="w-3.5 h-3.5 text-govgreen-800" />
                  <span>Secure Role-Based Access</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-[11px] text-govink-muted">
          Legal Metrology Enforcement System • Built for official field &amp; public vigilance
        </div>
      </div>

      {/* Forgot Password Institutional Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-govink-primary/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-institutional-border shadow-modal p-6 space-y-4 animate-scale-in">
            <div className="w-12 h-12 rounded-xl bg-govgreen-50 text-govgreen-800 border border-govgreen-200 flex items-center justify-center mx-auto">
              <HelpCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-govink-primary">
                Credential Assistance
              </h3>
              <p className="text-xs text-govink-secondary leading-relaxed">
                For authorized officers, contact your state nodal administrator or Legal Metrology helpdesk. Consumers may use the evaluation demo accounts or reset via verified email.
              </p>
            </div>

            <Button
              variant="outline"
              size="md"
              onClick={() => setShowForgotModal(false)}
              className="w-full justify-center text-xs font-bold"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
