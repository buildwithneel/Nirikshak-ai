import React, { useState } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  Shield,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  User as UserIcon,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { LanguageSelector } from '../../components/common/LanguageSelector';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../auth/AuthContext';

export const SettingsPage: React.FC = () => {
  const { t } = useLanguage();
  const { user, isOfficer, changePassword } = useAuth();

  // Officer-specific tolerances
  const [minConfidence, setMinConfidence] = useState(85);
  const [autoFlagViolations, setAutoFlagViolations] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Security / Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  const handleSaveConfig = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (!currentPassword) {
      setPassError('Please enter your current password.');
      return;
    }

    if (!newPassword) {
      setPassError('New password cannot be empty.');
      return;
    }

    if (newPassword.length < 6) {
      setPassError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setPassError('New password cannot be the same as current password.');
      return;
    }

    setIsChangingPass(true);
    try {
      const result = changePassword(currentPassword, newPassword, confirmPassword);
      if (result.success) {
        setPassSuccess(result.message || 'Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassError(result.message || 'Failed to change password.');
      }
    } catch (err: any) {
      setPassError(err.message || 'Error updating password.');
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto animate-fadeIn pb-16">
      <Breadcrumbs items={[{ label: t('nav.settings', 'Settings') }]} />

      {/* Header */}
      <div className="bg-cream-100 rounded-2xl border border-cream-400 p-4 sm:p-6 shadow-subtle">
        <div className="text-xs font-mono font-bold uppercase text-forest-700 flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5 text-forest-700" />
          <span>{isOfficer ? 'SYSTEM CONFIGURATION' : 'ACCOUNT SETTINGS'}</span>
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-ink-primary tracking-tight mt-1">
          {isOfficer
            ? t('settings.title', 'Settings & Officer Profile')
            : 'Consumer Settings & Security'}
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary mt-1">
          {isOfficer
            ? 'Configure detection tolerances, statutory rule thresholds, security, and preferences.'
            : 'Manage your profile details, language preference, and account credentials.'}
        </p>
      </div>

      {/* Language Preference Card */}
      <Card
        title={t('settings.language', 'Interface Language')}
        subtitle="Choose the default operating language for the interface"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-bold text-ink-primary">
              {t('settings.selectLanguage', 'Select Preferred Language')}
            </div>
            <div className="text-ink-secondary text-[11px] mt-0.5">
              Available in English, हिन्दी (Hindi), and ગુજરાતી (Gujarati).
            </div>
          </div>
          <LanguageSelector />
        </div>
      </Card>

      {/* Profile Overview Card */}
      <Card title={isOfficer ? 'Authorized Inspecting Officer Profile' : 'Citizen Consumer Profile'}>
        <div className="flex items-center gap-3.5 mb-4">
          <div
            className={`w-12 h-12 rounded-xl text-white font-bold text-base flex items-center justify-center border shadow-subtle flex-shrink-0 ${
              isOfficer
                ? 'bg-forest-700 border-forest-800'
                : 'bg-govteal-700 border-govteal-800'
            }`}
          >
            {user?.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'UR'}
          </div>
          <div>
            <div className="font-bold text-ink-primary text-sm sm:text-base">
              {user?.displayName || (isOfficer ? 'Inspector Rajesh Varma' : 'Citizen Consumer')}
            </div>
            <div className="text-xs text-ink-secondary">
              {isOfficer ? 'Legal Metrology Officer (Grade I)' : 'Registered Citizen Consumer'}
            </div>
            <div className="text-[11px] font-mono text-forest-800 font-semibold mt-0.5">
              {isOfficer
                ? `ID: ${user?.cadreCode || 'LM-DL-2024-881'} • Central Zone`
                : 'Verified Consumer Citizen'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs border-t border-cream-300 pt-4">
          <div>
            <label className="block text-ink-secondary font-semibold mb-1">Account Email Address:</label>
            <input
              type="text"
              disabled
              value={user?.email || (isOfficer ? 'inspector@officer.com' : 'citizen@gmail.com')}
              className="w-full p-2.5 rounded-lg bg-cream-200 border border-cream-400 text-ink-primary font-mono cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-ink-secondary font-semibold mb-1">
              {isOfficer ? 'Jurisdictional Branch:' : 'Access Portal:'}
            </label>
            <input
              type="text"
              disabled
              value={isOfficer ? (user?.jurisdiction || 'State Enforcement Directorate') : 'National Consumer Compliance Portal'}
              className="w-full p-2.5 rounded-lg bg-cream-200 border border-cream-400 text-ink-primary cursor-not-allowed"
            />
          </div>
        </div>
      </Card>

      {/* Security: Change Password Card */}
      <Card
        title="Security &amp; Password Management"
        subtitle="Update your account password for secure access to Nirikshak-AI"
      >
        <form onSubmit={handleChangePasswordSubmit} className="space-y-4 text-xs">
          {passSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{passSuccess}</span>
            </div>
          )}

          {passError && (
            <div className="p-3 rounded-xl bg-govred-50 dark:bg-govred-950/50 border border-govred-200 dark:border-govred-900 text-govred-800 dark:text-govred-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-govred-600" />
              <span className="font-semibold">{passError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Current Password */}
            <div>
              <label className="block text-ink-primary font-semibold mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full pl-3 pr-8 py-2 rounded-lg bg-white border border-cream-400 text-ink-primary font-mono focus:outline-none focus:ring-2 focus:ring-[#16A34A] text-xs"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-primary"
                >
                  {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-ink-primary font-semibold mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-3 pr-8 py-2 rounded-lg bg-white border border-cream-400 text-ink-primary font-mono focus:outline-none focus:ring-2 focus:ring-[#16A34A] text-xs"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-primary"
                >
                  {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-ink-primary font-semibold mb-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-3 pr-8 py-2 rounded-lg bg-white border border-cream-400 text-ink-primary font-mono focus:outline-none focus:ring-2 focus:ring-[#16A34A] text-xs"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-primary"
                >
                  {showConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isChangingPass}
              leftIcon={<KeyRound className="w-3.5 h-3.5" />}
              className="bg-[#0B2545] hover:bg-[#07192F] text-white"
            >
              Change Password
            </Button>
          </div>
        </form>
      </Card>

      {/* OCR Tolerances (Officer Only) */}
      {isOfficer && (
        <Card
          title="AI Compliance &amp; Inspection Tolerances"
          subtitle="Calibrate sensitivity for automatic declaration detection and review flagging"
        >
          <div className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-ink-primary">
                  {t('settings.confidenceThreshold', 'Minimum Confidence Threshold')}:
                </label>
                <span className="font-mono font-bold text-forest-800 text-sm">{minConfidence}%</span>
              </div>
              <input
                type="range"
                min="60"
                max="95"
                value={minConfidence}
                onChange={(e) => setMinConfidence(Number(e.target.value))}
                className="w-full accent-forest-700 cursor-pointer"
              />
              <p className="text-[11px] text-ink-muted mt-1">
                Declarations with confidence below {minConfidence}% route to "Review Required".
              </p>
            </div>

            <div className="pt-3 border-t border-cream-300 flex items-center justify-between">
              <div>
                <div className="font-bold text-ink-primary">Auto-flag Missing Mandatory Fields</div>
                <p className="text-[11px] text-ink-muted">
                  Immediately mark package as Potential Non-Compliance if any of the 5 Rule 6 fields are absent.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoFlagViolations}
                onChange={(e) => setAutoFlagViolations(e.target.checked)}
                className="w-4 h-4 accent-forest-700 rounded"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Save Button for Officer Config */}
      {isOfficer && (
        <div className="flex items-center justify-between pt-2">
          {savedSuccess ? (
            <span className="text-xs text-[#065F46] font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#065F46]" />
              <span>Configuration saved successfully!</span>
            </span>
          ) : (
            <span className="text-xs text-ink-muted">Tolerances persist for officer session</span>
          )}

          <Button
            variant="primary"
            size="md"
            onClick={handleSaveConfig}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {t('settings.save', 'Save Configuration')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
