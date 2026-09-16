import React, { useState } from 'react';
import { DeclarationCheck, ComplianceStatus, VisualEvidence } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';
import {
  X,
  AlertTriangle,
  Scale,
  Sparkles,
  Edit3,
  CheckCircle2,
  XCircle,
  MapPin,
  ShieldAlert,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface FindingDrawerProps {
  finding: DeclarationCheck | null;
  visualEvidence?: VisualEvidence | null;
  onClose: () => void;
  onSaveRemarks: (findingId: string, status: ComplianceStatus, remarks: string) => void;
}

export const FindingDrawer: React.FC<FindingDrawerProps> = ({
  finding,
  visualEvidence,
  onClose,
  onSaveRemarks,
}) => {
  if (!finding) return null;

  const { t } = useLanguage();
  const [overrideStatus, setOverrideStatus] = useState<ComplianceStatus>(finding.status);
  const [remarks, setRemarks] = useState(finding.officerRemarks || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isMissing =
    finding.status === 'POTENTIAL_VIOLATION' &&
    (!finding.sourceLineIds || finding.sourceLineIds.length === 0 || finding.detectedValue.includes('NOT DETECTED'));

  const handleSave = () => {
    onSaveRemarks(finding.id, overrideStatus, remarks);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="bg-cream-100 rounded-xl border border-cream-400 shadow-subtle flex flex-col h-full max-h-[600px] overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-cream-400 bg-cream-200/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-forest-700" />
          <h3 className="font-bold text-xs sm:text-sm text-ink-primary tracking-tight">
            {t('dossier.title', 'Finding Dossier & Evidence')}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-cream-300 transition-colors"
          aria-label="Close drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
        {/* Finding Headline */}
        <div>
          <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-ink-muted">
            Target Declaration Check
          </span>
          <h4 className="text-sm sm:text-base font-bold text-ink-primary mt-0.5">
            {finding.name}
          </h4>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <StatusBadge status={finding.status} size="sm" />
            <span className="text-ink-muted">•</span>
            <span className="text-ink-secondary font-mono text-[11px]">
              {finding.ruleReference}
            </span>
          </div>
        </div>

        {/* Spatial Packaging Location & Evidence Quality */}
        <div className="p-3 rounded-lg bg-cream-200/50 border border-cream-300 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-ink-primary text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-forest-700 flex-shrink-0" />
            <span className="font-semibold">
              {isMissing
                ? 'No Packaging Region (Not Detected)'
                : visualEvidence?.spatialRegion || finding.panelLocation || 'Primary Display Panel'}
            </span>
          </div>

          <div>
            {isMissing ? (
              <span className="bg-[#FEF2F2] text-[#991B1B] text-[10px] font-bold font-mono px-2 py-0.5 rounded border border-[#FCA5A5] inline-flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                <span>No Visual Evidence</span>
              </span>
            ) : visualEvidence?.evidenceStatus === 'strong' ? (
              <span className="bg-[#065F46] text-white text-[10px] font-bold font-mono px-2 py-0.5 rounded">
                Strong Evidence
              </span>
            ) : visualEvidence?.evidenceStatus === 'moderate' ? (
              <span className="bg-[#92400E] text-white text-[10px] font-bold font-mono px-2 py-0.5 rounded">
                Moderate Evidence
              </span>
            ) : (
              <span className="bg-forest-800 text-cream-100 text-[10px] font-bold font-mono px-2 py-0.5 rounded">
                Verified Region
              </span>
            )}
          </div>
        </div>

        {/* 3-Tier Confidence Meter (Explicit Extraction vs OCR Confidence) */}
        <div className="p-3 rounded-lg bg-cream-200/60 border border-cream-300 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink-primary flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-forest-700" />
              <span>{t('dossier.confidenceTitle', 'Extraction Confidence')}</span>
            </span>
            <span className="font-mono font-bold text-ink-primary text-sm">
              {finding.extractionConfidence || finding.confidence}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-cream-300 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (finding.extractionConfidence || finding.confidence) >= 90
                  ? 'bg-[#059669]'
                  : (finding.extractionConfidence || finding.confidence) >= 70
                  ? 'bg-[#D97706]'
                  : 'bg-[#DC2626]'
              }`}
              style={{ width: `${finding.extractionConfidence || finding.confidence}%` }}
            />
          </div>
          <div className="text-[10px] text-ink-muted flex items-center justify-between font-mono">
            <span>
              {visualEvidence?.confidence ? `OCR Engine Confidence: ${visualEvidence.confidence}%` : 'Pattern Recognition'}
            </span>
            {finding.sourceLineIds && finding.sourceLineIds.length > 0 && (
              <span className="bg-cream-300 px-1.5 py-0.2 rounded text-forest-800 font-bold">
                Source Lines: {finding.sourceLineIds.join(', ')}
              </span>
            )}
          </div>
        </div>

        {/* Extracted Value */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-ink-secondary uppercase tracking-wider font-mono">
              {t('dossier.extractedText', 'Detected Packaging Declaration')}
            </span>
            {finding.normalizedValue && (
              <span className="text-[10px] font-mono bg-forest-100 text-forest-800 px-1.5 py-0.2 rounded font-bold">
                Normalized
              </span>
            )}
          </div>
          <div className="p-3 bg-white rounded-lg border border-cream-400 font-mono text-xs text-ink-primary break-words">
            {finding.detectedValue}
          </div>
          {finding.normalizedValue && typeof finding.normalizedValue === 'object' && (
            <div className="p-2 rounded bg-cream-200/50 border border-cream-300 font-mono text-[11px] text-ink-secondary">
              <span className="text-ink-muted font-semibold block text-[10px]">NORMALIZED ATTRIBUTES:</span>
              <div className="space-y-0.5 mt-0.5">
                {Object.entries(finding.normalizedValue).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="capitalize">{k.replace(/_/g, ' ')}:</span>
                    <strong className="text-ink-primary">{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Statutory Legal Standard */}
        <div className="p-3 rounded-lg bg-forest-50 border border-forest-200">
          <div className="flex items-center gap-1.5 text-forest-900 font-bold text-[11px] mb-1">
            <Scale className="w-3.5 h-3.5 text-forest-700" />
            <span>{t('dossier.legalStandard', 'Statutory Requirement')} ({finding.ruleReference})</span>
          </div>
          <p className="text-forest-950 text-[11px] leading-relaxed">
            {finding.whatExpected || finding.legalStandard}
          </p>
        </div>

        {/* AI Finding Analysis / Deterministic Reason */}
        <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A]">
          <div className="flex items-center gap-1.5 text-[#92400E] font-bold text-[11px] mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
            <span>{t('dossier.aiAnalysis', 'Statutory Evaluation Reason')}</span>
          </div>
          <p className="text-[#78350F] text-[11px] leading-relaxed">
            {finding.reason || finding.aiNotes}
          </p>
        </div>

        {/* Officer Review & Override Section */}
        <div className="pt-2 border-t border-cream-300">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-ink-primary text-xs flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-forest-700" />
              <span>{t('dossier.officerVerification', 'Officer Verification & Override')}</span>
            </span>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1">
                Official Finding Determination:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setOverrideStatus('COMPLIANT');
                    setIsEditing(true);
                  }}
                  className={`py-1.5 px-2 text-[11px] rounded-lg border font-semibold flex items-center justify-center gap-1 min-h-[38px] ${
                    overrideStatus === 'COMPLIANT'
                      ? 'bg-[#065F46] text-white border-[#065F46]'
                      : 'bg-white text-ink-primary border-cream-400 hover:bg-cream-200'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Compliant</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOverrideStatus('REVIEW_REQUIRED');
                    setIsEditing(true);
                  }}
                  className={`py-1.5 px-2 text-[11px] rounded-lg border font-semibold flex items-center justify-center gap-1 min-h-[38px] ${
                    overrideStatus === 'REVIEW_REQUIRED'
                      ? 'bg-[#92400E] text-white border-[#92400E]'
                      : 'bg-white text-ink-primary border-cream-400 hover:bg-cream-200'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Review</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOverrideStatus('POTENTIAL_VIOLATION');
                    setIsEditing(true);
                  }}
                  className={`py-1.5 px-2 text-[11px] rounded-lg border font-semibold flex items-center justify-center gap-1 min-h-[38px] ${
                    overrideStatus === 'POTENTIAL_VIOLATION'
                      ? 'bg-[#991B1B] text-white border-[#991B1B]'
                      : 'bg-white text-ink-primary border-cream-400 hover:bg-cream-200'
                  }`}
                >
                  <XCircle className="w-3 h-3" />
                  <span>Violation</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1">
                {t('dossier.officerNotes', 'Officer Inspection Notes:')}
              </label>
              <textarea
                value={remarks}
                onChange={e => {
                  setRemarks(e.target.value);
                  setIsEditing(true);
                }}
                rows={2}
                placeholder="Enter field notes, observations on physical packaging..."
                className="w-full text-xs p-2.5 rounded-lg border border-cream-400 bg-white focus:outline-none focus:ring-2 focus:ring-forest-600 text-ink-primary"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              {saveSuccess ? (
                <span className="text-[11px] text-[#065F46] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Finding updated!</span>
                </span>
              ) : (
                <span className="text-[10px] text-ink-muted">
                  Syncs with statutory dossier
                </span>
              )}

              <Button
                size="sm"
                variant="primary"
                onClick={handleSave}
                disabled={!isEditing && remarks === (finding.officerRemarks || '') && overrideStatus === finding.status}
              >
                {t('dossier.saveOverride', 'Save Officer Determination')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
