import React, { useState } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  Languages,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { LanguageSelector } from '../../components/common/LanguageSelector';
import { useLanguage } from '../../i18n/LanguageContext';

export const SettingsPage: React.FC = () => {
  const { t } = useLanguage();
  const [minConfidence, setMinConfidence] = useState(85);
  const [autoFlagViolations, setAutoFlagViolations] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto animate-fadeIn pb-16">
      <Breadcrumbs items={[{ label: t('nav.settings', 'Settings') }]} />

      {/* Header */}
      <div className="bg-cream-100 rounded-2xl border border-cream-400 p-4 sm:p-6 shadow-subtle">
        <div className="text-xs font-mono font-bold uppercase text-forest-700 flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5 text-forest-700" />
          <span>SYSTEM CONFIGURATION</span>
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-ink-primary tracking-tight mt-1">
          {t('settings.title', 'Settings & Officer Profile')}
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary mt-1">
          Configure detection tolerances, statutory rule thresholds, and language preferences.
        </p>
      </div>

      {/* Language Preference Card */}
      <Card
        title={t('settings.language', 'Interface Language')}
        subtitle="Choose the default operating language for the inspector interface"
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

      {/* Officer Credentials Card */}
      <Card title="Authorized Inspecting Officer Profile">
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-xl bg-forest-700 text-white font-bold text-base flex items-center justify-center border border-forest-800 shadow-subtle flex-shrink-0">
            RV
          </div>
          <div>
            <div className="font-bold text-ink-primary text-sm sm:text-base">Inspector Rajesh Varma</div>
            <div className="text-xs text-ink-secondary">Legal Metrology Officer (Grade I)</div>
            <div className="text-[11px] font-mono text-forest-800 font-semibold mt-0.5">ID: LM-DL-2024-881 • Central Zone</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs border-t border-cream-300 pt-4">
          <div>
            <label className="block text-ink-secondary font-semibold mb-1">Official Email Address:</label>
            <input
              type="text"
              disabled
              value="rajesh.varma@doca.gov.in"
              className="w-full p-2.5 rounded-lg bg-cream-200 border border-cream-400 text-ink-primary font-mono cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-ink-secondary font-semibold mb-1">Jurisdictional Branch:</label>
            <input
              type="text"
              disabled
              value="Enforcement Directorate - NCT Delhi"
              className="w-full p-2.5 rounded-lg bg-cream-200 border border-cream-400 text-ink-primary cursor-not-allowed"
            />
          </div>
        </div>
      </Card>

      {/* OCR Tolerances */}
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
              onChange={e => setMinConfidence(Number(e.target.value))}
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
              onChange={e => setAutoFlagViolations(e.target.checked)}
              className="w-4 h-4 accent-forest-700 rounded"
            />
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-2">
        {savedSuccess ? (
          <span className="text-xs text-[#065F46] font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#065F46]" />
            <span>Settings saved successfully!</span>
          </span>
        ) : (
          <span className="text-xs text-ink-muted">Settings persist for officer session</span>
        )}

        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          leftIcon={<Save className="w-4 h-4" />}
        >
          {t('settings.save', 'Save Configuration')}
        </Button>
      </div>
    </div>
  );
};
