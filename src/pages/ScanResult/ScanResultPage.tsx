import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Scale,
  Flag,
  RotateCcw,
  FileText,
  ShieldAlert,
  ChevronRight,
  Download,
  Sparkles,
  ExternalLink,
  Cpu,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ListChecks,
  HelpCircle,
  Save,
  FileDown,
  Edit3,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { EvidenceCanvas } from '../../components/evidence/EvidenceCanvas';
import { FindingDrawer } from '../../components/evidence/FindingDrawer';
import { useInspection } from '../../context/InspectionContext';
import { ToastContainer, ToastMessage } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { ComplianceStatus } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { downloadInspectionPdf } from '../../services/reportApi';
import { PageTransition } from '../../components/motion/PageTransition';
import { CountUp } from '../../components/motion/CountUp';

export const ScanResultPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const {
    currentInspection,
    selectedDeclarationKey,
    setSelectedDeclarationKey,
    updateDeclarationReview,
    updateOfficerNotes,
    toggleMarkForReview,
    saveCurrentInspection,
  } = useInspection();

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showRawOcr, setShowRawOcr] = useState(false);
  const [copiedOcr, setCopiedOcr] = useState(false);

  // Prompt 6: Officer field observations & persistence state
  const [officerNotes, setOfficerNotes] = useState(currentInspection.officerNotes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const avgOcrConfidence =
    currentInspection.ocrLines && currentInspection.ocrLines.length > 0
      ? Math.round(
          (currentInspection.ocrLines.reduce((acc, l) => acc + l.confidence, 0) /
            currentInspection.ocrLines.length) *
            100
        )
      : 94;

  const handleCopyRawOcr = () => {
    const textToCopy =
      currentInspection.ocrText ||
      currentInspection.declarations.map(d => `${d.name}: ${d.detectedValue}`).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopiedOcr(true);
    setTimeout(() => setCopiedOcr(false), 2500);
  };

  const addToast = (type: 'success' | 'warning' | 'info' | 'error', title: string, message?: string) => {
    const newToast: ToastMessage = {
      id: String(Date.now()),
      type,
      title,
      message,
    };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newToast.id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const selectedDeclaration =
    currentInspection.declarations.find(d => d.key === selectedDeclarationKey) ||
    currentInspection.declarations[0];

  const handleMarkReview = () => {
    toggleMarkForReview();
    if (!currentInspection.requiresOfficerReview) {
      addToast(
        'warning',
        'Marked for Physical Officer Review',
        `Inspection ${currentInspection.id} flagged for field verification.`
      );
    } else {
      addToast(
        'success',
        'Review Flag Cleared',
        `Officer verification status updated for ${currentInspection.id}.`
      );
    }
  };

  const handleSaveFindingRemarks = (findingId: string, status: ComplianceStatus, remarks: string) => {
    updateDeclarationReview(findingId, status, remarks);
    addToast(
      'success',
      'Officer Determination Saved',
      'Statutory declaration assessment successfully recorded in audit log.'
    );
  };

  const handleSaveInspection = async () => {
    setIsSaving(true);
    try {
      const saved = await saveCurrentInspection(officerNotes);
      setSaveSuccessId(saved.id);
      addToast(
        'success',
        'Inspection Record Saved',
        `Canonical Audit Reference: ${saved.id}`
      );
    } catch (err: any) {
      addToast('error', 'Save Failed', err?.message || 'Failed to persist inspection to IndexedDB.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const targetRecord = {
        ...currentInspection,
        officerNotes,
      };
      const filename = await downloadInspectionPdf(targetRecord);
      addToast(
        'success',
        'Report Generated Successfully',
        `Downloaded: ${filename}`
      );
    } catch (err: any) {
      addToast('error', 'PDF Generation Error', err?.message || 'Could not generate official inspection report.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <PageTransition className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <Breadcrumbs
          items={[
            { label: t('nav.history', 'Inspections'), href: '/inspections' },
            { label: t('results.title', 'Inspection Result') },
            { label: currentInspection.id },
          ]}
        />

        <Link
          to="/scan"
          className="inline-flex items-center gap-1.5 text-xs text-forest-700 hover:text-forest-800 font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('scanner.changeImage', 'Back to Scanner')}</span>
        </Link>
      </div>

      {/* Official Statutory Advisory Banner */}
      <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3.5 sm:p-4 text-xs text-[#92400E] flex items-start gap-3 shadow-subtle">
        <ShieldAlert className="w-5 h-5 text-[#D97706] flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-[#78350F] flex items-center gap-2 flex-wrap">
            <span>{t('results.advisory', 'STATUTORY INSPECTION NOTICE: AI-ASSISTED COMPLIANCE FINDING')}</span>
            <span className="font-mono text-[10px] bg-[#FDE68A] text-[#78350F] px-1.5 py-0.2 rounded font-semibold">
              ADVISORY ONLY
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-[#92400E]">
            {t('results.advisoryText', 'This report represents an AI-assisted detection of mandatory declarations. Findings must be verified by an authorized Legal Metrology Officer before initiating statutory enforcement action.')}
          </p>
        </div>
      </div>

      {/* Main Inspection Header Card */}
      <div className="bg-cream-100 rounded-2xl border border-cream-400 p-4 sm:p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-ink-muted mb-1">
            <span className="font-bold text-forest-800 text-sm sm:text-base">
              {currentInspection.id}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{currentInspection.date}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate max-w-[200px] sm:max-w-none">{currentInspection.inspectionLocation}</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-ink-primary tracking-tight">
            {currentInspection.productName}
          </h1>

          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-ink-secondary">
            <span className="bg-cream-200 px-2 py-0.5 rounded font-semibold text-ink-primary border border-cream-300">
              Brand: {currentInspection.brand}
            </span>
            <span className="bg-cream-200 px-2 py-0.5 rounded font-semibold text-ink-primary border border-cream-300">
              Category: {currentInspection.category}
            </span>
            {currentInspection.batchNumber && (
              <span className="bg-cream-200 px-2 py-0.5 rounded font-mono text-ink-secondary border border-cream-300">
                Batch: {currentInspection.batchNumber}
              </span>
            )}
          </div>
        </div>

        {/* Overall Status & Score Block */}
        <div className="flex items-center justify-between sm:justify-end gap-4 border-t md:border-t-0 md:border-l border-cream-400 pt-3 md:pt-0 md:pl-6 flex-shrink-0">
          <div className="text-left sm:text-right">
            <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block font-mono">
              Overall Status
            </span>
            <div className="mt-1">
              <StatusBadge status={currentInspection.overallStatus} size="lg" />
            </div>
            {currentInspection.requiresOfficerReview && (
              <span className="text-[10px] text-[#92400E] font-bold block mt-1 font-mono">
                ⚠ Flagged for Field Verification
              </span>
            )}
          </div>

          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-forest-700 text-white flex flex-col items-center justify-center p-2 shadow-subtle flex-shrink-0 animate-scale-in">
            <span className="text-xl sm:text-2xl font-black font-mono tracking-tight leading-none text-cream-100">
              <CountUp end={currentInspection.complianceScore} />
            </span>
            <span className="text-[9px] font-mono text-forest-200 mt-1 uppercase">
              / 100 PTS
            </span>
          </div>
        </div>
      </div>

      {/* OCR Analysis & Detected Text Section */}
      <Card
        title={
          <div className="flex items-center justify-between w-full flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-forest-700" />
              <span className="font-bold text-sm sm:text-base text-ink-primary">
                {t('ocr.title', 'OCR Analysis & Extracted Text')}
              </span>
              {currentInspection.isRealOcr ? (
                <span className="bg-forest-100 text-forest-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-forest-300 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-forest-600 animate-pulse" />
                  {t('ocr.engine', 'Real PaddleOCR ONNX Engine')}
                </span>
              ) : (
                <span className="bg-cream-200 text-ink-secondary text-[10px] font-mono px-2 py-0.5 rounded border border-cream-300">
                  Standard Reference Mode
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 text-xs font-mono">
              {currentInspection.ocrProcessingTimeMs && (
                <span className="text-ink-secondary text-[11px] hidden sm:inline">
                  {t('ocr.speed', 'OCR Speed')}: <strong className="text-ink-primary font-bold">{currentInspection.ocrProcessingTimeMs}ms</strong>
                </span>
              )}
              <span className="bg-cream-200 text-forest-800 px-2 py-0.5 rounded border border-cream-300 font-bold text-[11px]">
                {currentInspection.ocrLines ? currentInspection.ocrLines.length : 5} {t('ocr.linesDetected', 'Lines Extracted')}
              </span>
            </div>
          </div>
        }
        subtitle="Raw optical character recognition results extracted from packaging label before statutory classification"
      >
        <div className="space-y-4">
          {/* Important Legal Distinction Notice */}
          <div className="bg-cream-200/60 border border-cream-300 rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-forest-700 flex-shrink-0" />
              <span className="text-ink-secondary text-[11px]">
                <strong className="text-ink-primary">AI Optical Character Recognition:</strong> Text detected directly on packaging surfaces. 
                Values represent physical label text and require officer review prior to statutory determination.
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] font-mono font-bold uppercase text-ink-muted">
                {t('ocr.confidence', 'OCR Confidence')}:
              </span>
              <span className="font-mono font-black text-sm bg-forest-700 text-cream-100 px-2.5 py-0.5 rounded">
                <CountUp end={avgOcrConfidence} suffix="%" />
              </span>
            </div>
          </div>

          {/* Detected Text List / Cards */}
          <div>
            <div className="text-xs font-bold font-mono text-ink-muted uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>{t('ocr.detectedText', 'Detected Packaging Text')}</span>
              <span className="text-[10px] font-normal text-ink-muted">
                Click line to locate on evidence canvas
              </span>
            </div>

            {currentInspection.ocrLines && currentInspection.ocrLines.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {currentInspection.ocrLines.map((line, idx) => {
                  const isSelected = selectedDeclarationKey === `ocr_item_${idx + 1}` || selectedDeclarationKey === line.id;
                  return (
                    <div
                      key={line.id || idx}
                      onClick={() => setSelectedDeclarationKey(`ocr_item_${idx + 1}`)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-forest-50 border-forest-600 ring-2 ring-forest-500/20'
                          : 'bg-white border-cream-300 hover:border-forest-400 hover:bg-cream-100/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[10px] text-ink-muted w-5 flex-shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="font-mono font-medium text-ink-primary truncate">
                          {line.text}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cream-200 text-forest-800 font-bold">
                          {Math.round(line.confidence * 100)}%
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-ink-muted" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Fallback for sample/preset inspections */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {currentInspection.declarations.map((d, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedDeclarationKey(d.key)}
                    className="p-2.5 rounded-lg border border-cream-300 bg-white text-xs flex items-center justify-between gap-2 cursor-pointer hover:bg-cream-100/50"
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] text-ink-muted font-mono">{d.name}</div>
                      <div className="font-mono font-medium text-ink-primary truncate">{d.detectedValue}</div>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cream-200 text-forest-800 font-bold">
                      {d.confidence}% OCR
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Collapsible Raw OCR Text Viewer */}
          <div className="border border-cream-300 rounded-lg overflow-hidden bg-cream-200/40">
            <button
              type="button"
              onClick={() => setShowRawOcr(!showRawOcr)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-ink-primary hover:bg-cream-200/80 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-forest-700" />
                <span>{t('ocr.rawText', 'Raw OCR Text Output')}</span>
                <span className="text-[10px] font-normal text-ink-muted">
                  ({currentInspection.ocrLines ? currentInspection.ocrLines.length : currentInspection.declarations.length} items)
                </span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-forest-700 uppercase font-mono">
                  {showRawOcr ? 'Collapse' : 'Expand'}
                </span>
                {showRawOcr ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            </button>

            {showRawOcr && (
              <div className="p-3 bg-white border-t border-cream-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-ink-muted">
                    Full detected stream ({currentInspection.ocrText ? currentInspection.ocrText.length : 0} characters):
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyRawOcr}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-forest-700 hover:text-forest-900 bg-cream-200 px-2 py-0.5 rounded border border-cream-300 transition-colors"
                  >
                    {copiedOcr ? (
                      <>
                        <Check className="w-3 h-3 text-[#059669]" />
                        <span className="text-[#059669]">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 bg-cream-100 rounded border border-cream-300 font-mono text-[11px] text-ink-primary leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {currentInspection.ocrText ||
                    currentInspection.declarations.map(d => `${d.name}: ${d.detectedValue}`).join('\n')}
                </pre>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Mandatory Declarations — Mobile Cards vs Desktop Table */}
      <Card
        title={
          <div className="flex items-center justify-between w-full flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-forest-700" />
              <span className="font-bold text-sm sm:text-base text-ink-primary">
                {t('compliance.declarationsTitle', 'Declaration Analysis & Normalization (Rule 6 Extraction)')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-cream-200 text-forest-800 px-2 py-0.5 rounded border border-cream-300 font-bold">
                {currentInspection.declarations.length} Parameters Evaluated
              </span>
            </div>
          </div>
        }
        subtitle={t('compliance.declarationsSubtitle', 'Semantic pattern extraction with unit normalization, statutory clause mapping, and OCR line tracking')}
        noPadding
      >
        {/* Mobile View: Clean Stacked Cards (< md) */}
        <div className="md:hidden divide-y divide-cream-300">
          {currentInspection.declarations.map(dec => {
            const isSelected = dec.key === selectedDeclarationKey;
            return (
              <div
                key={dec.id}
                onClick={() => setSelectedDeclarationKey(dec.key)}
                className={`p-3.5 space-y-2.5 transition-colors cursor-pointer ${
                  isSelected ? 'bg-forest-50/70 border-l-4 border-l-forest-700' : 'hover:bg-cream-200/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-ink-primary text-sm">
                      {dec.name}
                    </div>
                    <div className="text-[10px] font-mono text-forest-800 font-bold">
                      {dec.ruleReference}
                    </div>
                  </div>
                  <StatusBadge status={dec.status} size="sm" />
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-cream-300 space-y-1">
                  <div className="font-mono text-xs text-ink-primary break-words font-medium">
                    {dec.detectedValue}
                  </div>
                  {dec.normalizedValue && typeof dec.normalizedValue === 'object' && (
                    <div className="text-[10px] font-mono text-ink-muted border-t border-cream-200 pt-1 flex flex-wrap gap-2">
                      {Object.entries(dec.normalizedValue).slice(0, 2).map(([k, v]) => (
                        <span key={k} className="bg-cream-200/80 px-1.5 py-0.2 rounded">
                          {k}: <strong>{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-mono text-[11px] text-ink-secondary block">
                      Extraction Conf: <strong className="text-ink-primary font-bold">{dec.extractionConfidence || dec.confidence}%</strong>
                    </span>
                    {dec.sourceLineIds && dec.sourceLineIds.length > 0 && (
                      <span className="font-mono text-[10px] text-forest-700 block">
                        Linked: {dec.sourceLineIds.join(', ')}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDeclarationKey(dec.key);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1 ${
                      isSelected
                        ? 'bg-forest-700 text-white'
                        : 'bg-cream-200 text-ink-primary hover:bg-cream-300'
                    }`}
                  >
                    <span>{t('results.inspect', 'Inspect Evidence')}</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Comprehensive Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-cream-200/70 border-b border-cream-400 text-ink-secondary uppercase tracking-wider font-mono">
                <th className="py-3 px-5 font-bold">{t('results.declaration', 'Mandatory Declaration')}</th>
                <th className="py-3 px-4 font-bold">{t('results.ruleRef', 'Rule Reference')}</th>
                <th className="py-3 px-4 font-bold">{t('results.detectedValue', 'Detected / Normalized Value')}</th>
                <th className="py-3 px-4 font-bold text-center">{t('results.status', 'Status')}</th>
                <th className="py-3 px-4 font-bold text-right">Extraction Conf</th>
                <th className="py-3 px-5 font-bold text-right">{t('results.action', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {currentInspection.declarations.map(dec => {
                const isSelected = dec.key === selectedDeclarationKey;
                return (
                  <tr
                    key={dec.id}
                    onClick={() => setSelectedDeclarationKey(dec.key)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-forest-50/80 border-l-4 border-l-forest-700'
                        : 'hover:bg-cream-200/50'
                    }`}
                  >
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-ink-primary text-sm">
                        {dec.name}
                      </div>
                      <div className="text-[10px] text-ink-muted">
                        {dec.panelLocation}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-forest-800">
                      {dec.ruleReference}
                    </td>

                    <td className="py-3.5 px-4 font-mono max-w-xs text-ink-primary">
                      <div className="truncate font-medium">{dec.detectedValue}</div>
                      {dec.normalizedValue && typeof dec.normalizedValue === 'object' && (
                        <div className="text-[10px] text-ink-muted flex items-center gap-1.5 mt-0.5">
                          {dec.normalizedValue.unit && (
                            <span className="bg-cream-200 px-1 rounded">Unit: {dec.normalizedValue.unit}</span>
                          )}
                          {dec.normalizedValue.tax_inclusive_declared !== undefined && (
                            <span className="bg-cream-200 px-1 rounded">
                              Taxes: {dec.normalizedValue.tax_inclusive_declared ? 'Incl. ✓' : 'Unspecified'}
                            </span>
                          )}
                          {dec.normalizedValue.has_pincode && (
                            <span className="bg-cream-200 px-1 rounded">PIN: Verified ✓</span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={dec.status} size="sm" />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="font-mono font-bold text-ink-primary text-xs">
                        {dec.extractionConfidence || dec.confidence}%
                      </div>
                      {dec.sourceLineIds && dec.sourceLineIds.length > 0 && (
                        <div className="font-mono text-[9px] text-forest-700">
                          Line {dec.sourceLineIds.join(', ')}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDeclarationKey(dec.key);
                          document.getElementById('visual-evidence-section')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1 transition-colors ${
                          isSelected
                            ? 'bg-forest-700 text-white'
                            : 'bg-cream-200 text-ink-primary hover:bg-cream-300'
                        }`}
                      >
                        <span>{t('results.inspect', 'Inspect')}</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Statutory Compliance Findings (Rule 6 Deterministic Engine) */}
      <Card
        title={
          <div className="flex items-center justify-between w-full flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-forest-700" />
              <span className="font-bold text-sm sm:text-base text-ink-primary">
                {t('compliance.title', 'Statutory Compliance Findings (Rule 6 Engine)')}
              </span>
              <span className="bg-forest-100 text-forest-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-forest-300">
                {t('compliance.ruleEngineBadge', 'Deterministic Legal Metrology Rules, 2011')}
              </span>
            </div>

            {/* Overall Summary Pills */}
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] px-2 py-0.5 rounded font-bold">
                {currentInspection.complianceSummary?.compliantCount ??
                  currentInspection.declarations.filter(d => d.status === 'COMPLIANT').length} Compliant
              </span>
              <span className="bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] px-2 py-0.5 rounded font-bold">
                {currentInspection.complianceSummary?.reviewRequiredCount ??
                  currentInspection.declarations.filter(d => d.status === 'REVIEW_REQUIRED').length} Review
              </span>
              <span className="bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] px-2 py-0.5 rounded font-bold">
                {currentInspection.complianceSummary?.potentialViolationCount ??
                  currentInspection.declarations.filter(d => d.status === 'POTENTIAL_VIOLATION').length} Potential Non-Compliance
              </span>
            </div>
          </div>
        }
        subtitle={t('compliance.subtitle', 'Explainable findings answering what was detected, what was expected, statutory rationale, and evidence localization')}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(currentInspection.findings && currentInspection.findings.length > 0
              ? currentInspection.findings
              : currentInspection.declarations.map((d, idx) => ({
                  id: `fallback-f-${idx + 1}`,
                  ruleId: d.ruleClause || `RULE_6_1_${idx + 1}`,
                  ruleReference: d.ruleReference,
                  statutoryTitle: d.name,
                  declarationKey: d.key,
                  status: d.status,
                  whatDetected: d.detectedValue,
                  whatExpected: d.legalStandard,
                  reason: d.aiNotes || `Evaluated under ${d.ruleReference}`,
                  extractionConfidence: d.confidence,
                  sourceLineIds: d.sourceLineIds || [],
                }))
            ).map(finding => {
              const isSelected = selectedDeclarationKey === finding.declarationKey;
              return (
                <div
                  key={finding.id}
                  onClick={() => setSelectedDeclarationKey(finding.declarationKey)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all space-y-2.5 ${
                    isSelected
                      ? 'bg-forest-50/80 border-forest-600 ring-2 ring-forest-500/20'
                      : 'bg-white border-cream-300 hover:border-forest-400 hover:bg-cream-100/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-ink-primary text-sm flex items-center gap-1.5">
                        <span>{finding.statutoryTitle}</span>
                      </div>
                      <div className="text-[10px] font-mono text-forest-800 font-bold">
                        {finding.ruleReference}
                      </div>
                    </div>
                    <StatusBadge status={finding.status} size="sm" />
                  </div>

                  <div className="space-y-1.5 bg-cream-100/70 p-2.5 rounded-lg border border-cream-300 font-mono text-[11px]">
                    <div>
                      <span className="text-ink-muted text-[10px] block uppercase font-bold">What was detected:</span>
                      <span className="text-ink-primary font-medium">{finding.whatDetected}</span>
                    </div>
                    <div>
                      <span className="text-ink-muted text-[10px] block uppercase font-bold">What was expected:</span>
                      <span className="text-ink-secondary">{finding.whatExpected}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-ink-secondary leading-relaxed bg-[#FFFBEB] p-2 rounded border border-[#FDE68A]">
                    <strong className="text-[#92400E]">Statutory Rationale:</strong> {finding.reason}
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="font-mono text-ink-muted">
                      Extraction Confidence: <strong className="text-ink-primary font-bold">{finding.extractionConfidence}%</strong>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDeclarationKey(finding.declarationKey);
                        document.getElementById('visual-evidence-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-1 text-forest-700 hover:text-forest-900 font-bold font-mono text-xs"
                    >
                      <span>Locate Evidence</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-xs text-[#92400E] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#D97706] flex-shrink-0" />
              <span className="text-[11px]">
                <strong>Officer Verification Protocol:</strong> AI-assisted rule determinations must be verified by the inspecting officer against physical package packaging before initiating statutory proceedings.
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Visual Evidence Section — Responsive Desktop 2-Col vs Mobile Stack */}
      <div id="visual-evidence-section" className="space-y-3 scroll-mt-20">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-ink-primary tracking-tight">
            {t('results.evidenceTitle', 'Visual Evidence & Spatial Localization')}
          </h3>
          <p className="text-xs text-ink-secondary">
            {t('results.evidenceSubtitle', 'High-resolution packaging capture with OCR bounding box overlay and statutory finding inspector')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          {/* Visual Evidence Canvas */}
          <div className="lg:col-span-7">
            <EvidenceCanvas
              imageUrl={currentInspection.imageUrl}
              inspection={currentInspection}
              boundingBoxes={currentInspection.boundingBoxes}
              visualEvidences={currentInspection.visualEvidences}
              selectedDeclarationKey={selectedDeclarationKey}
              onSelectBoundingBox={(key) => setSelectedDeclarationKey(key)}
              selectedDeclarationName={selectedDeclaration?.name}
            />
          </div>

          {/* Finding Details & Officer Override Drawer */}
          <div className="lg:col-span-5">
            <FindingDrawer
              finding={selectedDeclaration}
              visualEvidence={
                currentInspection.visualEvidences?.find(
                  e => e.declarationKey === selectedDeclarationKey || e.id === selectedDeclarationKey
                )
              }
              onClose={() => setSelectedDeclarationKey(null)}
              onSaveRemarks={handleSaveFindingRemarks}
            />
          </div>
        </div>
      </div>

      {/* Officer Notes & Physical Packaging Observations (Prompt 6) */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-forest-700" />
            <span className="font-bold text-sm sm:text-base text-ink-primary">
              Inspecting Officer Field Observations &amp; Physical Packaging Notes
            </span>
          </div>
        }
      >
        <div className="space-y-2">
          <p className="text-xs text-ink-secondary">
            Record physical package condition, retail establishment observations, manual caliper font measurements, or statutory notes. Observations are persisted with the audit record and embedded in official PDF reports.
          </p>
          <textarea
            value={officerNotes}
            onChange={(e) => {
              setOfficerNotes(e.target.value);
              updateOfficerNotes(e.target.value);
            }}
            rows={3}
            placeholder="Enter field observations (e.g. Physical package inspected at retail counter. Typography font height measured against Rule 7 minimum standards. Batch code legible on base crimp.)..."
            className="w-full text-xs p-3 rounded-lg border border-cream-400 bg-white focus:outline-none focus:ring-2 focus:ring-forest-600 text-ink-primary font-mono"
          />
        </div>
      </Card>

      {/* Persistent Save Confirmation Banner */}
      {saveSuccessId && (
        <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-4 text-xs text-[#065F46] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#059669] flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">Inspection Record Saved Successfully</div>
              <div className="text-[11px] font-mono text-[#047857]">
                Canonical Reference ID: <strong>{saveSuccessId}</strong> (Persisted to Local Registry)
              </div>
            </div>
          </div>
          <Link
            to="/inspections"
            className="px-3.5 py-1.5 rounded-lg bg-[#065F46] text-white text-xs font-bold inline-flex items-center gap-1 hover:bg-[#047857] transition-colors self-start sm:self-auto"
          >
            <span>View in History Registry</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Enforcement Actions Toolbar */}
      <div className="bg-cream-100 rounded-xl border border-cream-400 p-4 sm:p-5 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        <div className="text-xs text-ink-secondary text-center sm:text-left">
          <span className="font-bold text-ink-primary">Audit Action Protocol:</span>{' '}
          Save statutory audit record or generate official Legal Metrology PDF notice.
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            size="md"
            onClick={() => navigate('/scan')}
            leftIcon={<RotateCcw className="w-4 h-4 text-forest-700" />}
          >
            {t('results.newInspection', 'New Scan')}
          </Button>

          <Button
            variant={currentInspection.requiresOfficerReview ? 'secondary' : 'outline'}
            size="md"
            onClick={handleMarkReview}
            leftIcon={<Flag className={`w-4 h-4 ${currentInspection.requiresOfficerReview ? 'text-[#D97706]' : 'text-forest-700'}`} />}
          >
            {currentInspection.requiresOfficerReview
              ? t('results.flaggedReview', 'Flagged for Review ✓')
              : t('results.markReview', 'Mark for Review')}
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleSaveInspection}
            disabled={isSaving}
            leftIcon={
              saveSuccessId ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-300 animate-checkmark" />
              ) : (
                <Save className="w-4 h-4 text-white" />
              )
            }
          >
            {isSaving ? 'Saving to Registry...' : saveSuccessId ? 'Inspection Saved ✓' : 'Save Inspection'}
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            leftIcon={<FileDown className="w-4 h-4 text-forest-700" />}
          >
            {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Report'}
          </Button>
        </div>
      </div>

      {/* Official Report Modal */}
      {showReportModal && (
        <Modal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          title="Legal Metrology Inspection Report"
          subtitle={`Statutory Dossier: ${currentInspection.id}`}
          maxWidth="2xl"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setShowReportModal(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.print()}
                leftIcon={<Download className="w-3.5 h-3.5 text-cream-100" />}
              >
                Print / Save PDF Notice
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="border-b border-cream-400 pb-3 text-center">
              <div className="font-black text-sm uppercase tracking-wider text-ink-primary">
                Government of India • Ministry of Consumer Affairs
              </div>
              <div className="text-[11px] text-ink-secondary">
                Department of Legal Metrology • Packaged Commodities Enforcement Directorate
              </div>
              <div className="font-mono text-xs font-bold text-forest-800 mt-1">
                PRELIMINARY COMPLIANCE INSPECTION MEMORANDUM
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-cream-200 p-3 rounded-lg border border-cream-400 font-mono text-[11px]">
              <div>
                <span className="text-ink-muted block text-[10px]">INSPECTION REFERENCE:</span>
                <span className="font-bold text-ink-primary">{currentInspection.id}</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[10px]">DATE &amp; TIME:</span>
                <span className="font-bold text-ink-primary">{currentInspection.date}</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[10px]">COMMODITY:</span>
                <span className="font-bold text-ink-primary truncate block">{currentInspection.productName}</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[10px]">OUTCOME:</span>
                <span className="font-bold uppercase text-[#92400E]">{currentInspection.overallStatus} ({currentInspection.complianceScore}/100)</span>
              </div>
            </div>

            <div>
              <div className="font-bold text-ink-primary mb-1 text-xs font-mono">
                Rule 6 Declarations Summary:
              </div>
              <div className="divide-y divide-cream-300 border border-cream-400 rounded-lg overflow-hidden bg-white">
                {currentInspection.declarations.map((d, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-ink-primary">{d.name} ({d.ruleReference}): </span>
                      <span className="font-mono text-ink-secondary">{d.detectedValue}</span>
                    </div>
                    <StatusBadge status={d.status} size="sm" />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-[#92400E] text-[11px] leading-relaxed">
              <strong>Statutory Finding (Rule 6(1)(n)):</strong> Consumer care contact details appear missing or obscured on the declaration panel of the sample package. Under Legal Metrology Rules, 2011, failure to declare customer redressal contact invites statutory action.
            </div>

            <div className="pt-3 border-t border-cream-400 flex items-center justify-between text-[11px]">
              <div>
                <div className="font-bold text-ink-primary">Inspecting Officer:</div>
                <div className="text-ink-secondary">Inspector Rajesh Varma (Grade I)</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-forest-800">DIGITALLY AUDITED</div>
                <div className="text-[10px] text-ink-muted">NIRIKSHAK AI Enforcement Core</div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </PageTransition>
  );
};
