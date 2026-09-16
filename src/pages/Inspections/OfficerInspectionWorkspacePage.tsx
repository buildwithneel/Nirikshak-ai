import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Download,
  Clock,
  User,
  PlusCircle,
  Eye,
  Camera,
  Layers,
  Sparkles,
  Info,
  Loader2,
  ChevronRight,
  ExternalLink,
  Save,
  Check,
  FileCheck2,
  History,
} from 'lucide-react';
import { PageTransition } from '../../components/motion/PageTransition';
import { Button } from '../../components/ui/Button';
import { inspectionsApi, InspectionDetail, AuditEventItem } from '../../services/api/inspectionsApi';
import { MultiImageGallery } from '../../components/evidence/MultiImageGallery';
import { ConflictDrawer } from '../../components/evidence/ConflictDrawer';
import { EvidenceCanvas } from '../../components/evidence/EvidenceCanvas';
import { imagesApi, InspectionImageItem, DeclarationConflict, ReviewSignalItem } from '../../services/api/imagesApi';
import { runRealOCR } from '../../services/ocrApi';
import { analyzeCompliance } from '../../services/complianceApi';
import { useLanguage } from '../../i18n/LanguageContext';
import { InspectionCopilot } from '../../components/copilot/InspectionCopilot';

export const OfficerInspectionWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'EVIDENCE' | 'AI_ANALYSIS' | 'OBSERVATIONS' | 'VERIFICATION' | 'AUDIT'>('EVIDENCE');
  const [auditEvents, setAuditEvents] = useState<AuditEventItem[]>([]);

  // Multi-image & Evidence Intelligence state
  const [inspectionImages, setInspectionImages] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [isConflictDrawerOpen, setIsConflictDrawerOpen] = useState(false);
  const [reviewSignals, setReviewSignals] = useState<any[]>([]);
  const [evidenceLocations, setEvidenceLocations] = useState<any[]>([]);
  const [evidenceSearchQuery, setEvidenceSearchQuery] = useState('');
  const [selectedDeclarationKey, setSelectedDeclarationKey] = useState<string | null>(null);
  const [selectedEvidenceFilter, setSelectedEvidenceFilter] = useState<'ALL' | 'OCR' | 'DECLARATIONS' | 'FINDINGS' | 'CONSUMER' | 'OFFICER'>('ALL');

  // Physical Observation form state
  const [obsCategory, setObsCategory] = useState('GENERAL');
  const [obsText, setObsText] = useState('');
  const [isSubmittingObs, setIsSubmittingObs] = useState(false);

  // Verification Checklist & Decision form state
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [check3, setCheck3] = useState(false);
  const [decision, setDecision] = useState<'CONFIRM_VIOLATION' | 'OVERRIDE_AI' | 'COMPLIANT' | 'DISMISS'>('CONFIRM_VIOLATION');
  const [statutoryAction, setStatutoryAction] = useState('NOTICE_SECTION_39');
  const [justification, setJustification] = useState('');
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);

  // OCR upload & execution state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotInitialQuery, setCopilotInitialQuery] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadInspection(id);
      loadAudit(id);
      loadImagesAndEvidence(id);
    }
  }, [id]);

  const loadImagesAndEvidence = async (inspId: string) => {
    try {
      const imgs = await imagesApi.getInspectionImages(inspId);
      setInspectionImages(imgs);
      if (imgs.length > 0) {
        setSelectedImage((prev: any) => prev || imgs[0]);
      }

      const intel = await imagesApi.getEvidenceIntelligence(inspId);
      setConflicts(intel.conflicts || []);
      setReviewSignals(intel.review_signals || []);
      setEvidenceLocations(intel.evidence_locations || []);
    } catch (err) {
      console.warn('Could not load multi-image intelligence:', err);
    }
  };

  const loadInspection = async (inspId: string) => {
    setIsLoading(true);
    try {
      const data = await inspectionsApi.getInspectionById(inspId);
      setInspection(data);
      if (data.verification) {
        setCheck1(data.verification.reviewed_ai_findings);
        setCheck2(data.verification.reviewed_visual_evidence);
        setCheck3(data.verification.recorded_physical_observations);
        setDecision(data.verification.verification_decision as any);
        setStatutoryAction(data.verification.statutory_action || 'NOTICE_SECTION_39');
        setJustification(data.verification.officer_justification || '');
      }
    } catch (err: any) {
      console.error('Error loading inspection:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAudit = async (inspId: string) => {
    try {
      const logs = await inspectionsApi.getAuditTimeline(inspId);
      setAuditEvents(logs);
    } catch (err) {
      console.warn('Failed to load audit logs:', err);
    }
  };

  const handleRunImageOCR = async (imageId: string) => {
    await imagesApi.runImageOCR(imageId);
    showToast('OCR analysis executed on package image.');
    if (id) {
      await loadInspection(id);
      await loadAudit(id);
      await loadImagesAndEvidence(id);
    }
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleAddObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspection || !obsText.trim()) return;
    setIsSubmittingObs(true);
    try {
      await inspectionsApi.addObservation(inspection.id, {
        category: obsCategory,
        observation: obsText.trim(),
      });
      setObsText('');
      showToast('Physical observation logged in enforcement ledger.');
      await loadInspection(inspection.id);
      await loadAudit(inspection.id);
    } catch (err: any) {
      alert(err.message || 'Failed to add observation.');
    } finally {
      setIsSubmittingObs(false);
    }
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspection) return;
    if (!check1 || !check2 || !check3) {
      alert('Officer Protocol: You must complete all 3 physical review checklist verifications.');
      return;
    }
    if (!justification.trim()) {
      alert('Officer Protocol: Statutory justification is mandatory for audit defensibility.');
      return;
    }

    setIsSubmittingVerification(true);
    try {
      await inspectionsApi.submitVerification(inspection.id, {
        reviewed_ai_findings: check1,
        reviewed_visual_evidence: check2,
        recorded_physical_observations: check3,
        verification_decision: decision,
        statutory_action: statutoryAction,
        officer_justification: justification.trim(),
      });
      showToast('Statutory verification recorded! Case dossier finalized.');
      await loadInspection(inspection.id);
      await loadAudit(inspection.id);
    } catch (err: any) {
      alert(err.message || 'Verification submission failed.');
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!inspection) return;
    setIsGeneratingPdf(true);
    try {
      const blob = await inspectionsApi.generateReport(inspection.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NIRIKSHAK_AI_${inspection.inspection_reference}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Statutory multi-image PDF report generated and downloaded.');
      await loadInspection(inspection.id);
      await loadAudit(inspection.id);
    } catch (err: any) {
      alert(err.message || 'Failed to generate PDF report.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-govink-secondary">
        <Loader2 className="w-8 h-8 animate-spin text-govgreen-700 mb-2" />
        <span className="text-sm font-medium">Opening Officer Inspection Workspace...</span>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center bg-white rounded-xl border border-institutional-border mt-8">
        <AlertTriangle className="w-12 h-12 text-govred-600 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-govink-primary mb-1">Inspection Dossier Not Found</h2>
        <p className="text-xs text-govink-secondary mb-4">Inspection ID {id} does not exist or has been archived.</p>
        <Button variant="secondary" onClick={() => navigate('/inspections')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Inspection History
        </Button>
      </div>
    );
  }

  // Parse analysis JSON if available
  let declarationsMap: Record<string, any> = {};
  let findingsList: any[] = [];
  let allOcrLines: any[] = [];

  if (inspection.analysis) {
    try {
      if (inspection.analysis.declarations_json) {
        declarationsMap = JSON.parse(inspection.analysis.declarations_json);
      }
      if (inspection.analysis.statutory_findings_json) {
        findingsList = JSON.parse(inspection.analysis.statutory_findings_json);
      }
      if (inspection.analysis.ocr_lines_json) {
        allOcrLines = JSON.parse(inspection.analysis.ocr_lines_json);
      }
    } catch (e) {
      console.warn('Error parsing analysis JSON:', e);
    }
  }

  // Filter declarations based on evidence search query and filter tab
  const filteredDeclarations = Object.entries(declarationsMap).filter(([key, field]: [string, any]) => {
    if (evidenceSearchQuery) {
      const q = evidenceSearchQuery.toLowerCase();
      const matchKey = key.toLowerCase().includes(q);
      const matchVal = String(field.detected_value || '').toLowerCase().includes(q);
      const matchLabel = String(field.label || '').toLowerCase().includes(q);
      if (!matchKey && !matchVal && !matchLabel) return false;
    }

    if (selectedEvidenceFilter === 'DECLARATIONS') return true;
    if (selectedEvidenceFilter === 'OCR') return field.source_line_ids && field.source_line_ids.length > 0;
    if (selectedEvidenceFilter === 'FINDINGS') return field.status !== 'detected';
    return true;
  });

  // Construct active bounding boxes for selected image
  const activeImageBoxes = allOcrLines
    .filter(l => !selectedImage || l.image_id === selectedImage.id || (!l.image_id && inspectionImages.length <= 1))
    .map((l, i) => ({
      id: l.id || `box-${i}`,
      label: l.text,
      declarationKey: l.declaration_key || l.id,
      status: 'COMPLIANT' as const,
      confidence: Math.round((l.confidence || 0.95) * 100),
      x: l.normalized_box?.x ?? 10,
      y: l.normalized_box?.y ?? 10,
      width: l.normalized_box?.width ?? 30,
      height: l.normalized_box?.height ?? 10,
      extractedText: l.text,
    }));

  const activeCanvasImageUrl = selectedImage
    ? `/api/inspection-images/${selectedImage.id}/content`
    : (inspection.package_image_url || '');

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto space-y-6 pb-16">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs text-govink-muted">
            <Link to="/inspections" className="hover:text-govgreen-800 flex items-center gap-1 font-medium transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Inspection History
            </Link>
            <span>/</span>
            <span className="font-mono text-govink-primary font-bold">{inspection.inspection_reference}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCopilotInitialQuery(null);
                setIsCopilotOpen(!isCopilotOpen);
              }}
              className="inline-flex items-center gap-1.5 text-xs bg-forest-800 hover:bg-forest-900 text-white font-bold px-3 py-1.5 rounded-lg shadow-subtle border border-forest-700 transition-colors cursor-pointer"
              title="Open AI Inspection Copilot"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>AI Copilot</span>
            </button>

            {conflicts.length > 0 && (
              <button
                onClick={() => setIsConflictDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg shadow-subtle transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{conflicts.length} Declaration Conflict{conflicts.length > 1 ? 's' : ''}</span>
              </button>
            )}

            {inspection.complaint_id && (
              <Link
                to={`/complaints/${inspection.complaint_id}`}
                className="inline-flex items-center gap-1 text-xs text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-md font-semibold transition-colors"
              >
                <span>Linked to Complaint {inspection.complaint_reference || inspection.complaint_id}</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>

        {/* Toast Notification */}
        {successToast && (
          <div className="p-3 bg-govgreen-50 border border-govgreen-300 text-govgreen-950 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-govgreen-700 flex-shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Workspace Top Dossier Header */}
        <div className="bg-white border border-institutional-border rounded-xl p-5 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-govink-primary tracking-wide">
                {inspection.inspection_reference}
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md uppercase ${
                inspection.status === 'VERIFIED'
                  ? 'bg-govgreen-100 text-govgreen-900 border border-govgreen-300'
                  : inspection.status === 'REPORT_GENERATED'
                  ? 'bg-purple-100 text-purple-900 border border-purple-200'
                  : 'bg-amber-100 text-amber-900 border border-amber-200'
              }`}>
                {inspection.status.replace('_', ' ')}
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded uppercase ${
                inspection.verification_state === 'CONFIRMED'
                  ? 'bg-red-100 text-red-900 border border-red-200'
                  : inspection.verification_state === 'COMPLIANT'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                  : 'bg-gray-100 text-gray-700 border border-gray-200'
              }`}>
                {inspection.verification_state}
              </span>
            </div>

            <h1 className="text-xl font-black text-govink-primary tracking-tight">
              {inspection.product_name}
            </h1>

            <div className="flex items-center gap-4 text-xs text-govink-secondary flex-wrap">
              <span>Source: <strong className="text-govink-primary">{inspection.source}</strong></span>
              <span>Point: <strong className="text-govink-primary">{inspection.retail_point || 'Field Jurisdiction'}</strong></span>
              <span>Compliance Score: <strong className="text-govink-primary">{inspection.compliance_score}%</strong></span>
              <span>Opened: <strong className="text-govink-primary">{new Date(inspection.created_at).toLocaleDateString()}</strong></span>
            </div>
          </div>

          {/* PDF Report Generation Action */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="primary"
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
              className="text-xs"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Generating Multi-Image PDF...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Generate Statutory PDF Report
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 5 Workspace Tabs (Prompt 9 Section 36) */}
        <div className="border-b border-institutional-border bg-white rounded-t-xl px-4 pt-2 shadow-subtle flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('EVIDENCE')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'EVIDENCE'
                ? 'border-govgreen-800 text-govgreen-900'
                : 'border-transparent text-govink-secondary hover:text-govink-primary'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>1. Visual Evidence & Canvas</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-govgreen-100 text-govgreen-900 font-bold">
              {inspectionImages.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('AI_ANALYSIS')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'AI_ANALYSIS'
                ? 'border-govgreen-800 text-govgreen-900'
                : 'border-transparent text-govink-secondary hover:text-govink-primary'
            }`}
          >
            <Sparkles className="w-4 h-4 text-teal-700" />
            <span>2. AI Analysis & Signals</span>
            {conflicts.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 font-bold">
                {conflicts.length} Conflicts
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('OBSERVATIONS')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'OBSERVATIONS'
                ? 'border-govgreen-800 text-govgreen-900'
                : 'border-transparent text-govink-secondary hover:text-govink-primary'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>3. Physical Observations</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-govgreen-100 text-govgreen-800 font-bold">
              {inspection.observations?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('VERIFICATION')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'VERIFICATION'
                ? 'border-govgreen-800 text-govgreen-900'
                : 'border-transparent text-govink-secondary hover:text-govink-primary'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>4. Human Officer Verification</span>
            {inspection.verification && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                Verified
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'AUDIT'
                ? 'border-govgreen-800 text-govgreen-900'
                : 'border-transparent text-govink-secondary hover:text-govink-primary'
            }`}
          >
            <History className="w-4 h-4" />
            <span>5. Audit Timeline</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-100 text-gray-700 font-bold">
              {auditEvents.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Visual Evidence & Multi-Image Gallery */}
        {activeTab === 'EVIDENCE' && (
          <div className="space-y-6">
            {/* Multi-Image Gallery */}
            <MultiImageGallery
              inspectionId={inspection.id}
              images={inspectionImages}
              selectedImageId={selectedImage?.id || null}
              onSelectImage={(im: any) => setSelectedImage(im)}
              onRefresh={() => {
                if (id) {
                  loadImagesAndEvidence(id);
                  loadInspection(id);
                }
              }}
              onRunOCR={handleRunImageOCR}
            />

            {/* Evidence Search & Filter Toolbar */}
            <div className="bg-white border border-institutional-border rounded-xl p-3 shadow-subtle flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  value={evidenceSearchQuery}
                  onChange={e => setEvidenceSearchQuery(e.target.value)}
                  placeholder="Search package evidence across panels (e.g. MRP, Net Quantity, Date, Consumer Care)..."
                  className="w-full pl-3 pr-8 py-2 rounded-lg border border-institutional-border text-xs focus:ring-2 focus:ring-govgreen-800 focus:outline-none"
                />
                {evidenceSearchQuery && (
                  <button
                    onClick={() => setEvidenceSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-govink-muted hover:text-govink-primary"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
                {(['ALL', 'DECLARATIONS', 'OCR', 'FINDINGS'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setSelectedEvidenceFilter(f)}
                    className={`px-2.5 py-1.5 rounded text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      selectedEvidenceFilter === f
                        ? 'bg-govgreen-800 text-white'
                        : 'bg-institutional-subtle text-govink-secondary hover:text-govink-primary'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas & Declarations Synchronized Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 1 Col: Evidence Canvas */}
              <div className="bg-white border border-institutional-border rounded-xl p-5 shadow-subtle space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-institutional-border">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-govink-primary uppercase tracking-wider font-mono">
                      Evidence Canvas
                    </span>
                    {selectedImage && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-teal-100 text-teal-900 border border-teal-200">
                        {selectedImage.panel_type} PANEL
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-govink-muted">
                    {activeImageBoxes.length} Overlays
                  </span>
                </div>

                {activeCanvasImageUrl ? (
                  <div className="border border-institutional-border rounded-lg overflow-hidden bg-gray-900 min-h-[350px] flex items-center justify-center relative">
                    <EvidenceCanvas
                      imageUrl={activeCanvasImageUrl}
                      boundingBoxes={activeImageBoxes}
                      selectedDeclarationKey={selectedDeclarationKey}
                      onSelectBoundingBox={(k: string) => setSelectedDeclarationKey(k)}
                    />
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-institutional-border rounded-lg p-10 text-center text-govink-muted">
                    <Camera className="w-8 h-8 mx-auto mb-2 text-govink-muted" />
                    <p className="text-xs font-bold text-govink-primary">No Image Selected</p>
                    <p className="text-[11px] text-govink-secondary mt-1">Select an image from the gallery above to view the Evidence Canvas.</p>
                  </div>
                )}

                {/* Evidence Quality Card (Section 13) */}
                <div className="p-3 bg-institutional-subtle/70 rounded-lg border border-institutional-border text-[11px] space-y-1">
                  <div className="flex items-center justify-between font-bold text-govink-primary">
                    <span>Evidence Detection Quality</span>
                    <span className="text-govgreen-800">STRONG</span>
                  </div>
                  <p className="text-[10px] text-govink-muted leading-relaxed">
                    Confidence indicates system detection quality. It does not determine legal validity. Final statutory compliance is determined by certified officers.
                  </p>
                </div>
              </div>

              {/* Right 2 Cols: Declarations & Findings List */}
              <div className="lg:col-span-2 space-y-6">
                {/* Declarations Extraction Table */}
                <div className="bg-white border border-institutional-border rounded-xl p-5 shadow-subtle space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-institutional-border">
                    <h3 className="text-xs font-bold text-govink-primary uppercase tracking-wider font-mono">
                      Cross-Image Declarations Aggregation
                    </h3>
                    <span className="text-xs text-govink-muted">
                      {filteredDeclarations.length} Detected
                    </span>
                  </div>

                  {filteredDeclarations.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-institutional-border bg-institutional-subtle/50 text-[11px] text-govink-secondary">
                            <th className="p-2 font-semibold">Statutory Declaration</th>
                            <th className="p-2 font-semibold">Detected Value</th>
                            <th className="p-2 font-semibold">Supporting Evidence</th>
                            <th className="p-2 font-semibold">Confidence</th>
                            <th className="p-2 font-semibold">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-institutional-border">
                          {filteredDeclarations.map(([key, field]: [string, any]) => {
                            const isConflict = conflicts.some(c => c.field_key === key);
                            const locations = field.supporting_locations || [];
                            const isSelected = selectedDeclarationKey === key;

                            return (
                              <tr
                                key={key}
                                onClick={() => setSelectedDeclarationKey(key)}
                                className={`transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-govgreen-50/70 border-l-4 border-govgreen-800'
                                    : 'hover:bg-institutional-subtle/40'
                                }`}
                              >
                                <td className="p-2">
                                  <div className="font-bold text-govink-primary">{field.label || key}</div>
                                  {isConflict && (
                                    <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                      CONFLICT DETECTED
                                    </span>
                                  )}
                                </td>
                                <td className="p-2 font-mono text-govink-primary font-bold">
                                  {field.detected_value || <span className="text-gray-400 italic">Not Detected</span>}
                                </td>
                                <td className="p-2">
                                  {locations.length > 0 ? (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {locations.map((loc: any, lIdx: number) => (
                                        <button
                                          key={lIdx}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const matchImg = inspectionImages.find(im => im.id === loc.image_id);
                                            if (matchImg) setSelectedImage(matchImg);
                                            setSelectedDeclarationKey(key);
                                          }}
                                          className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-institutional-subtle hover:bg-gray-200 border border-institutional-border text-govink-primary cursor-pointer"
                                        >
                                          {loc.panel_type} Panel
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-govink-muted">1 Supporting Location</span>
                                  )}
                                </td>
                                <td className="p-2 text-govink-secondary font-mono">
                                  {Math.round((field.confidence || 0) * 100)}%
                                </td>
                                <td className="p-2">
                                  {isConflict ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIsConflictDrawerOpen(true);
                                      }}
                                      className="text-[11px] font-bold text-amber-800 hover:underline"
                                    >
                                      Review Conflict
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => setSelectedDeclarationKey(key)}
                                      className="text-[11px] font-bold text-govgreen-800 hover:underline"
                                    >
                                      Focus Canvas
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-govink-muted bg-gray-50 rounded-lg">
                      No matching declarations found for "{evidenceSearchQuery}".
                    </div>
                  )}
                </div>

                {/* Statutory Findings & Grouping */}
                <div className="bg-white border border-institutional-border rounded-xl p-5 shadow-subtle space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-institutional-border">
                    <h3 className="text-xs font-bold text-govink-primary uppercase tracking-wider font-mono">
                      Statutory Rule 6 Findings
                    </h3>
                    <span className="text-xs text-govink-muted">
                      {findingsList.length} Rules Assessed
                    </span>
                  </div>

                  {findingsList.length > 0 ? (
                    <div className="space-y-3">
                      {findingsList.map((finding: any, idx: number) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedDeclarationKey(finding.declaration_key)}
                          className={`p-3.5 rounded-lg border text-xs space-y-1.5 transition-all cursor-pointer ${
                            finding.status === 'COMPLIANT'
                              ? 'bg-govgreen-50/50 border-govgreen-200 hover:bg-govgreen-50'
                              : 'bg-red-50/50 border-red-200 hover:bg-red-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-govink-primary">{finding.statutory_title}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/70 border border-institutional-border">
                                {finding.rule_reference}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                              finding.status === 'COMPLIANT'
                                ? 'bg-govgreen-100 text-govgreen-900'
                                : 'bg-red-100 text-red-900'
                            }`}>
                              {finding.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-govink-secondary leading-relaxed">
                            <strong>Reason:</strong> {finding.reason}
                          </p>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-govink-muted">Confidence: {finding.extraction_confidence || 95}%</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCopilotInitialQuery(`Explain the statutory finding for ${finding.statutory_title} (${finding.rule_reference}).`);
                                setIsCopilotOpen(true);
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-forest-800 hover:text-forest-950 bg-white/90 hover:bg-white px-2 py-0.5 rounded border border-cream-300 shadow-xs transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-2.5 h-2.5 text-forest-700" />
                              <span>Explain Finding</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-govink-muted bg-gray-50 rounded-lg">
                      No statutory findings evaluated yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: AI Analysis & Review Signals (Section 37) */}
        {activeTab === 'AI_ANALYSIS' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Top Analytics Counter Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-4 rounded-xl bg-white border border-institutional-border shadow-subtle text-center">
                <span className="text-[10px] font-mono font-bold text-govink-muted uppercase">OCR Lines</span>
                <div className="text-xl font-black text-govink-primary mt-1 font-mono">{allOcrLines.length}</div>
                <span className="text-[10px] text-govgreen-800 font-semibold">Detected</span>
              </div>
              <div className="p-4 rounded-xl bg-white border border-institutional-border shadow-subtle text-center">
                <span className="text-[10px] font-mono font-bold text-govink-muted uppercase">Declarations</span>
                <div className="text-xl font-black text-govink-primary mt-1 font-mono">{Object.keys(declarationsMap).length}</div>
                <span className="text-[10px] text-govgreen-800 font-semibold">Aggregated</span>
              </div>
              <div className="p-4 rounded-xl bg-white border border-institutional-border shadow-subtle text-center">
                <span className="text-[10px] font-mono font-bold text-govink-muted uppercase">Linked Evidence</span>
                <div className="text-xl font-black text-govink-primary mt-1 font-mono">{evidenceLocations.length || allOcrLines.length}</div>
                <span className="text-[10px] text-teal-800 font-semibold">Locations</span>
              </div>
              <div className="p-4 rounded-xl bg-white border border-institutional-border shadow-subtle text-center">
                <span className="text-[10px] font-mono font-bold text-govink-muted uppercase">Review Signals</span>
                <div className="text-xl font-black text-amber-900 mt-1 font-mono">{reviewSignals.length}</div>
                <span className="text-[10px] text-amber-800 font-semibold">AI Indicators</span>
              </div>
              <div className="p-4 rounded-xl bg-white border border-institutional-border shadow-subtle text-center">
                <span className="text-[10px] font-mono font-bold text-govink-muted uppercase">Conflicts</span>
                <div className="text-xl font-black text-red-900 mt-1 font-mono">{conflicts.length}</div>
                <span className="text-[10px] text-red-800 font-semibold">Cross-Panel</span>
              </div>
            </div>

            {/* AI Review Signals Card */}
            <div className="bg-white border border-institutional-border rounded-xl p-5 shadow-subtle space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-institutional-border">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-700" />
                  <h3 className="text-xs font-bold text-govink-primary uppercase tracking-wider font-mono">
                    Inspection Review Signals
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {reviewSignals.length} AI Signals Generated
                </span>
              </div>

              {reviewSignals.length > 0 ? (
                <div className="space-y-3">
                  {reviewSignals.map((sig, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-3.5 rounded-lg border border-institutional-border bg-institutional-subtle/50 text-xs flex items-start gap-3"
                    >
                      <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-govink-primary">{sig.title}</span>
                          <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                            sig.severity === 'HIGH' ? 'bg-red-100 text-red-900' : 'bg-amber-100 text-amber-900'
                          }`}>
                            {sig.severity} Severity
                          </span>
                        </div>
                        <p className="text-[11px] text-govink-secondary leading-relaxed">
                          {sig.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-govink-muted bg-gray-50 rounded-lg">
                  No adverse review signals detected on current evidence.
                </div>
              )}

              {/* Explanatory disclaimer */}
              <div className="p-3 rounded-lg bg-institutional-subtle border border-institutional-border text-[11px] text-govink-secondary space-y-1">
                <span className="font-bold text-govink-primary flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-govgreen-800" />
                  Statutory Protocol Notice
                </span>
                <p>
                  AI-assisted review signals indicate detection quality, missing mandatory fields, and cross-panel inconsistencies. They do not constitute guilt or automatic penalty. Officer verification is mandatory.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button variant="primary" size="sm" onClick={() => setActiveTab('EVIDENCE')}>
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  View Visual Evidence
                </Button>
                {conflicts.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setIsConflictDrawerOpen(true)}>
                    <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                    Review Conflicts ({conflicts.length})
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Conflict Drawer Modal Component */}
        <ConflictDrawer
          conflicts={conflicts}
          isOpen={isConflictDrawerOpen}
          onClose={() => setIsConflictDrawerOpen(false)}
          onSelectPanelImage={(imgId: string, decKey?: string) => {
            const match = inspectionImages.find(im => im.id === imgId);
            if (match) setSelectedImage(match);
            if (decKey) setSelectedDeclarationKey(decKey);
            setActiveTab('EVIDENCE');
            setIsConflictDrawerOpen(false);
          }}
        />


        {/* Tab Content: Physical Observations */}
        {activeTab === 'OBSERVATIONS' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 1 Col: Add Observation Form */}
            <div className="bg-white border border-institutional-border rounded-xl p-5 shadow-subtle space-y-4">
              <div className="pb-2 border-b border-institutional-border">
                <span className="text-xs font-bold text-govink-primary uppercase tracking-wider font-mono">
                  Record Physical Observation
                </span>
                <p className="text-[11px] text-govink-muted mt-0.5">
                  Record physical package defects, seal tampering, or tactile findings.
                </p>
              </div>

              <form onSubmit={handleAddObservation} className="space-y-3 text-xs">
                <div>
                  <label className="block text-govink-muted font-medium mb-1">Observation Category:</label>
                  <select
                    value={obsCategory}
                    onChange={e => setObsCategory(e.target.value)}
                    className="w-full p-2 rounded-lg border border-institutional-border bg-white text-xs text-govink-primary focus:ring-2 focus:ring-govgreen-800 focus:outline-none"
                  >
                    <option value="GENERAL">General Physical Inspection</option>
                    <option value="LABEL_INTEGRITY">Label Tampering / Obscuration</option>
                    <option value="DEFACED_STAMP">Defaced Date / MRP Stamp</option>
                    <option value="PACKAGING_DIMENSIONS">Dimensional / Non-Standard Package</option>
                    <option value="BARCODE_MISMATCH">Barcode / Registry Mismatch</option>
                    <option value="WEIGHT_VERIFICATION">Net Weight / Volume Shortage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-govink-muted font-medium mb-1">Officer Finding & Statement:</label>
                  <textarea
                    value={obsText}
                    onChange={e => setObsText(e.target.value)}
                    placeholder="Enter detailed physical inspection observation witnessed on the commodity package..."
                    rows={4}
                    required
                    className="w-full p-2.5 rounded-lg border border-institutional-border bg-white text-xs text-govink-primary focus:ring-2 focus:ring-govgreen-800 focus:outline-none placeholder:text-govink-muted"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmittingObs || !obsText.trim()}
                  className="w-full text-xs justify-center"
                >
                  {isSubmittingObs ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : (
                    <PlusCircle className="w-3.5 h-3.5 mr-1" />
                  )}
                  Record Physical Observation
                </Button>
              </form>
            </div>

            {/* Right 2 Cols: Observation Ledger */}
            <div className="lg:col-span-2 bg-white border border-institutional-border rounded-xl p-5 shadow-subtle space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-institutional-border">
                <h3 className="text-xs font-bold text-govink-primary uppercase tracking-wider font-mono">
                  Recorded Physical Observations Ledger
                </h3>
                <span className="text-xs text-govink-muted font-mono">
                  {inspection.observations?.length || 0} Entries
                </span>
              </div>

              {inspection.observations && inspection.observations.length > 0 ? (
                <div className="space-y-3">
                  {inspection.observations.map(obs => (
                    <div
                      key={obs.id}
                      className="p-4 rounded-lg border border-institutional-border bg-institutional-subtle/30 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
                            {obs.category.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] font-mono text-govink-muted">
                            {obs.id}
                          </span>
                        </div>
                        <span className="text-[11px] text-govink-muted">
                          {new Date(obs.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-govink-primary leading-relaxed">
                        {obs.observation}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-govink-muted bg-gray-50 rounded-lg">
                  No physical observations recorded yet. Use the form on the left to add on-site observations.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content: Officer Legal Verification */}
        {activeTab === 'VERIFICATION' && (
          <div className="max-w-4xl mx-auto bg-white border border-institutional-border rounded-xl p-6 shadow-subtle space-y-6">
            <div className="pb-3 border-b border-institutional-border space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-govgreen-800" />
                <h2 className="text-base font-bold text-govink-primary">
                  Human Officer Legal Verification Protocol
                </h2>
              </div>
              <p className="text-xs text-govink-secondary">
                Under the Legal Metrology Act 2009, AI OCR findings serve strictly as investigative aids. The human officer bears sole statutory responsibility for the official legal determination.
              </p>
            </div>

            <form onSubmit={handleSubmitVerification} className="space-y-6 text-xs">
              {/* Mandatory Checklist */}
              <div className="bg-institutional-subtle/70 border border-institutional-border rounded-lg p-4 space-y-3">
                <span className="font-bold text-govink-primary block text-xs uppercase tracking-wide">
                  1. Statutory Officer Review Checklist (Mandatory)
                </span>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={check1}
                    onChange={e => setCheck1(e.target.checked)}
                    className="mt-0.5 rounded border-institutional-border text-govgreen-800 focus:ring-govgreen-800"
                  />
                  <span className="text-xs text-govink-primary">
                    I have personally reviewed all AI OCR detected text and statutory findings against packaging regulations.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={check2}
                    onChange={e => setCheck2(e.target.checked)}
                    className="mt-0.5 rounded border-institutional-border text-govgreen-800 focus:ring-govgreen-800"
                  />
                  <span className="text-xs text-govink-primary">
                    I have verified the physical package visual evidence, bounding boxes, and statutory label zones.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={check3}
                    onChange={e => setCheck3(e.target.checked)}
                    className="mt-0.5 rounded border-institutional-border text-govgreen-800 focus:ring-govgreen-800"
                  />
                  <span className="text-xs text-govink-primary">
                    I have recorded on-site physical observations and verified actual sample packaging integrity.
                  </span>
                </label>
              </div>

              {/* Verification Decision & Statutory Action */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-govink-primary mb-1">
                    2. Official Officer Determination:
                  </label>
                  <select
                    value={decision}
                    onChange={e => setDecision(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg border border-institutional-border bg-white text-xs font-semibold text-govink-primary focus:ring-2 focus:ring-govgreen-800 focus:outline-none"
                  >
                    <option value="CONFIRM_VIOLATION">Confirm Statutory Non-Compliance / Violation</option>
                    <option value="OVERRIDE_AI">Officer Override of AI Finding (Justified)</option>
                    <option value="COMPLIANT">Fully Compliant Under Rule 6</option>
                    <option value="DISMISS">Dismiss / Inconclusive Packaging Sample</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-govink-primary mb-1">
                    3. Recommended Statutory Action:
                  </label>
                  <select
                    value={statutoryAction}
                    onChange={e => setStatutoryAction(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-institutional-border bg-white text-xs font-semibold text-govink-primary focus:ring-2 focus:ring-govgreen-800 focus:outline-none"
                  >
                    <option value="NOTICE_SECTION_39">Issue Statutory Notice Under Section 39</option>
                    <option value="SEIZURE">Seizure of Non-Compliant Lot</option>
                    <option value="COMPOUNDING">Compounding of Offence Under Section 48</option>
                    <option value="ADVISORY">Issue Advisory Warning for Rectification</option>
                    <option value="NO_ACTION">No Statutory Action Warranted</option>
                  </select>
                </div>
              </div>

              {/* Justification Textarea */}
              <div>
                <label className="block font-bold text-govink-primary mb-1">
                  4. Officer Legal Basis & Justification (Mandatory):
                </label>
                <textarea
                  value={justification}
                  onChange={e => setJustification(e.target.value)}
                  placeholder="State the legal metrology rationale, specific section references, and findings supporting your verification decision..."
                  rows={4}
                  required
                  className="w-full p-3 rounded-lg border border-institutional-border bg-white text-xs text-govink-primary focus:ring-2 focus:ring-govgreen-800 focus:outline-none placeholder:text-govink-muted"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-institutional-border">
                <span className="text-[11px] text-govink-muted">
                  Submitting will commit your verification to the immutable audit timeline and update case status.
                </span>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmittingVerification || !check1 || !check2 || !check3 || !justification.trim()}
                  className="text-xs"
                >
                  {isSubmittingVerification ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <FileCheck2 className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Submit Officer Verification & Finalize
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Tab Content: Audit Timeline */}
        {activeTab === 'AUDIT' && (
          <div className="max-w-4xl mx-auto bg-white border border-institutional-border rounded-xl p-6 shadow-subtle space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-institutional-border">
              <div>
                <h3 className="text-sm font-bold text-govink-primary uppercase tracking-wider font-mono">
                  Immutable Enforcement Audit Trail
                </h3>
                <p className="text-xs text-govink-muted">
                  Chronological event log tracking all case state transitions, AI analyses, and officer actions.
                </p>
              </div>
              <span className="px-2.5 py-1 text-xs font-mono font-bold rounded bg-institutional-subtle border border-institutional-border text-govink-primary">
                {auditEvents.length} Events Logged
              </span>
            </div>

            {auditEvents.length > 0 ? (
              <div className="space-y-4">
                {auditEvents.map((evt, idx) => (
                  <div key={evt.id || idx} className="flex items-start gap-3 text-xs">
                    <div className="w-7 h-7 rounded-full bg-govgreen-100 text-govgreen-900 flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1 p-3.5 rounded-lg border border-institutional-border bg-institutional-subtle/40 space-y-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="font-bold text-govink-primary font-mono text-[11px] px-2 py-0.5 rounded bg-white border border-institutional-border">
                          {evt.action}
                        </span>
                        <span className="text-[11px] text-govink-muted font-mono">
                          {new Date(evt.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-govink-secondary">
                        Actor: <strong className="text-govink-primary">{evt.actor_email || 'SYSTEM'}</strong> | Entity: <strong className="text-govink-primary">{evt.entity_type} ({evt.entity_id})</strong>
                      </p>
                      {evt.metadata_json && (
                        <div className="text-[11px] font-mono text-govink-muted bg-white p-2 rounded border border-institutional-border overflow-x-auto">
                          {evt.metadata_json}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-govink-muted bg-gray-50 rounded-lg">
                No audit events recorded yet for this inspection.
              </div>
            )}
          </div>
        )}

        {/* Floating Copilot Toggle Button */}
        {!isCopilotOpen && (
          <button
            type="button"
            onClick={() => {
              setCopilotInitialQuery(null);
              setIsCopilotOpen(true);
            }}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-forest-800 hover:bg-forest-900 text-white shadow-elevated border border-forest-700 font-bold text-xs transition-all hover:scale-105 cursor-pointer"
            title="Ask AI Inspection Copilot"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Ask Copilot</span>
          </button>
        )}

        {/* AI Inspection Copilot Drawer */}
        <InspectionCopilot
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
          inspectionId={inspection.id}
          productName={inspection.product_name}
          initialQuery={copilotInitialQuery}
          onNavigateToEvidence={(imageId, ocrLineId) => {
            setActiveTab('EVIDENCE');
            if (imageId) {
              const target = inspectionImages.find((img: any) => img.id === imageId);
              if (target) setSelectedImage(target);
            }
            if (ocrLineId) {
              setSelectedDeclarationKey(ocrLineId);
            }
          }}
          onNavigateToConflict={() => {
            setActiveTab('EVIDENCE');
            setIsConflictDrawerOpen(true);
          }}
          onNavigateToFinding={() => {
            setActiveTab('AI_ANALYSIS');
          }}
          onNavigateToVerification={() => {
            setActiveTab('VERIFICATION');
          }}
          onNavigateToRules={() => {
            navigate('/rules');
          }}
        />
      </div>
    </PageTransition>
  );
};

export default OfficerInspectionWorkspacePage;
