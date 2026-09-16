import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Shield,
  Mail,
  Calendar,
  Award,
  Globe,
  LogOut,
  Layers,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { PageTransition } from '../../components/motion/PageTransition';
import { Button } from '../../components/ui/Button';
import { LanguageSelector } from '../../components/common/LanguageSelector';
import { useLanguage } from '../../i18n/LanguageContext';

export const ProfilePage: React.FC = () => {
  const { user, logout, isOfficer } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setTimeout(async () => {
      await logout();
      navigate('/login', { replace: true });
    }, 450);
  };

  const createdDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '16 Jan 2026';

  return (
    <PageTransition className="max-w-2xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-institutional-border p-6 shadow-subtle flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shadow-subtle flex-shrink-0 ${
              isOfficer
                ? 'bg-govgreen-900 text-white border border-govgreen-950'
                : 'bg-govteal-700 text-white border border-govteal-800'
            }`}
          >
            {user?.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'US'}
          </div>

          <div>
            <h1 className="text-lg sm:text-xl font-black text-govink-primary leading-tight">
              {user?.displayName || 'User Profile'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  isOfficer
                    ? 'bg-govgreen-100 text-govgreen-900 border-govgreen-200'
                    : 'bg-govteal-100 text-govteal-900 border-govteal-200'
                }`}
              >
                <Shield className="w-3 h-3" />
                <span>{isOfficer ? 'Inspection Officer' : 'Consumer'}</span>
              </span>

              <span className="text-[11px] text-govink-muted font-mono">
                {isOfficer ? 'OFFICER PORTAL' : 'CONSUMER PORTAL'}
              </span>
            </div>
          </div>
        </div>

        <div className="hidden sm:block">
          <LanguageSelector />
        </div>
      </div>

      {/* Profile Details Card */}
      <div className="bg-white rounded-2xl border border-institutional-border p-6 shadow-subtle space-y-4">
        <div className="flex items-center justify-between border-b border-institutional-border pb-3">
          <h2 className="text-sm font-bold text-govink-primary uppercase tracking-wider font-mono">
            {isOfficer ? 'Official Officer Account' : 'Consumer Account'}
          </h2>
          <span className="text-xs text-govgreen-900 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Active Verified</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Email */}
          <div className="p-3.5 rounded-xl bg-institutional-subtle border border-institutional-border space-y-1">
            <div className="flex items-center gap-1.5 text-govink-muted font-bold text-[11px]">
              <Mail className="w-3.5 h-3.5" />
              <span>EMAIL ADDRESS</span>
            </div>
            <div className="font-semibold text-govink-primary text-sm font-mono truncate">
              {user?.email || 'user@portal.demo'}
            </div>
          </div>

          {/* Role */}
          <div className="p-3.5 rounded-xl bg-institutional-subtle border border-institutional-border space-y-1">
            <div className="flex items-center gap-1.5 text-govink-muted font-bold text-[11px]">
              <Shield className="w-3.5 h-3.5" />
              <span>ASSIGNED ROLE</span>
            </div>
            <div className="font-bold text-govink-primary text-sm">
              {isOfficer ? 'Legal Metrology Enforcement Officer' : 'Citizen Consumer'}
            </div>
          </div>

          {/* Officer-Specific Cadre / Authority */}
          {isOfficer && (
            <>
              <div className="p-3.5 rounded-xl bg-institutional-subtle border border-institutional-border space-y-1">
                <div className="flex items-center gap-1.5 text-govink-muted font-bold text-[11px]">
                  <Award className="w-3.5 h-3.5" />
                  <span>CADRE CODE</span>
                </div>
                <div className="font-semibold text-govink-primary text-sm font-mono">
                  {user?.cadreCode || 'LM-DL-2024-881'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-institutional-subtle border border-institutional-border space-y-1">
                <div className="flex items-center gap-1.5 text-govink-muted font-bold text-[11px]">
                  <Layers className="w-3.5 h-3.5" />
                  <span>JURISDICTION</span>
                </div>
                <div className="font-semibold text-govink-primary text-sm">
                  {user?.jurisdiction || 'State Enforcement Directorate'}
                </div>
              </div>
            </>
          )}

          {/* Account Created */}
          <div className="p-3.5 rounded-xl bg-institutional-subtle border border-institutional-border space-y-1">
            <div className="flex items-center gap-1.5 text-govink-muted font-bold text-[11px]">
              <Calendar className="w-3.5 h-3.5" />
              <span>ACCOUNT CREATED</span>
            </div>
            <div className="font-semibold text-govink-primary text-sm">
              {createdDate}
            </div>
          </div>

          {/* Security Tier */}
          <div className="p-3.5 rounded-xl bg-institutional-subtle border border-institutional-border space-y-1">
            <div className="flex items-center gap-1.5 text-govink-muted font-bold text-[11px]">
              <Lock className="w-3.5 h-3.5" />
              <span>SECURITY PROTOCOL</span>
            </div>
            <div className="font-semibold text-govink-primary text-sm">
              HMAC-SHA256 Bearer Token
            </div>
          </div>
        </div>

        {/* Language selector on mobile */}
        <div className="sm:hidden pt-2 border-t border-institutional-border flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-govink-secondary font-bold">
            <Globe className="w-4 h-4 text-govink-muted" />
            <span>Interface Language</span>
          </div>
          <LanguageSelector />
        </div>
      </div>

      {/* Logout Action Card */}
      <div className="bg-white rounded-2xl border border-institutional-border p-6 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-govink-primary">
            Sign Out of Session
          </h3>
          <p className="text-xs text-govink-secondary mt-0.5">
            Terminates current authenticated session and returns to the login screen.
          </p>
        </div>

        <Button
          variant="outline"
          size="md"
          onClick={handleLogout}
          isLoading={isLoggingOut}
          leftIcon={<LogOut className="w-4 h-4 text-govred-600" />}
          className="text-govred-700 hover:bg-govred-50 hover:border-govred-300 font-bold text-xs flex-shrink-0 w-full sm:w-auto"
        >
          {isLoggingOut ? 'Signing Out…' : 'Sign Out'}
        </Button>
      </div>
    </PageTransition>
  );
};

export default ProfilePage;
