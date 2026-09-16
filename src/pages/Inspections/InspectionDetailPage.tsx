import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  FileDown,
  ShieldAlert,
  ChevronRight,
  ListChecks,
  Save,
  CheckCircle2,
  Edit3,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { EvidenceCanvas } from '../../components/evidence/EvidenceCanvas';
import { FindingDrawer } from '../../components/evidence/FindingDrawer';
import { getInspection, saveInspection } from '../../services/storage/inspectionStorage';
import { downloadInspectionPdf } from '../../services/reportApi';
import { InspectionRecord, ComplianceStatus } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { buildVisualEvidences } from '../../utils/evidenceModel';
import { PageTransition } from '../../components/motion/PageTransition';

export const InspectionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [inspection, setInspection] = useState<InspectionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDeclarationKey, setSelectedDeclarationKey] = useState<string | null>(null);
  const [officerNotes, setOfficerNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    async function loadRecord() {
      if (!id) return;
      setLoading(true);
      try {
        const record = await getInspection(id);
        if (record) {
          if (!record.visualEvidences || record.visualEvidences.length === 0) {
            record.visualEvidences = buildVisualEvidences(record);
          }
          setInspection(record);
          setOfficerNotes(record.officerNotes || record.reviewNotes || '');
          setSelectedDeclarationKey(record.declarations[0]?.key || null);
        }
      } catch (err) {
        console.error('Error loading inspection:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRecord();
  }, [id]);

  const handleSaveNotes = async () => {
    if (!inspection) return;
    setIsSavingNotes(true);
    try {
      const updated: InspectionRecord = {
        ...inspection,
        officerNotes,
        updatedAt: new Date().toISOString(),
      };
      const saved = await saveInspection(updated);
      setInspection(saved);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save officer notes:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleSaveFindingRemarks = async (findingId: string, status: ComplianceStatus, remarks: string) => {
    if (!inspection) return;
    const updatedDeclarations = inspection.declarations.map(dec => {
      if (dec.id === findingId) {
        return {
          ...dec,
          status,
          officerRemarks: remarks,
          officerOverridden: true,
        };
      }
      return dec;
    });

    const updatedFindings = (inspection.findings || []).map(f => {
      const matchingDec = updatedDeclarations.find(d => d.id === findingId);
      if (matchingDec && f.declarationKey === matchingDec.key) {
        return {
          ...f,
          status,
          reason: remarks ? `[Officer Override]: ${remarks}` : f.reason,
        };
      }
      return f;
    });

    const updated: InspectionRecord = {
      ...inspection,
      declarations: updatedDeclarations,
      findings: updatedFindings,
      updatedAt: new Date().toISOString(),
    };
    updated.visualEvidences = buildVisualEvidences(updated);

    const saved = await saveInspection(updated);
    setInspection(saved);
  };

  const handleDownloadPdf = async () => {
    if (!inspection) return;
    setIsGeneratingPdf(true);
    try {
      const targetRecord: InspectionRecord = {
        ...inspection,
        officerNotes,
      };
      await downloadInspectionPdf(targetRecord);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-forest-700 border-t-transparent animate-spin mx-auto" />
        <p className="font-bold text-sm text-ink-primary">Loading inspection audit record...</p>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="py-16 text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-amber-600 mx-auto" />
        <h2 className="text-base font-bold text-ink-primary">Inspection Record Not Found</h2>
        <p className="text-xs text-ink-secondary">The requested inspection record does not exist or has been deleted.</p>
        <Button variant="primary" size="sm" onClick={() => navigate('/inspections')}>
          Back to Inspection History
        </Button>
      </div>
    );
  }

  const selectedDeclaration =
    inspection.declarations.find(d => d.key === selectedDeclarationKey) ||
    inspection.declarations[0] ||
    null;

  return (
    <PageTransition className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-16">
      {/* Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Breadcrumbs
          items={[
            { label: t('nav.history', 'Inspections'), href: '/inspections' },
            { label: inspection.id },
          ]}
        />
        <Link
          to="/inspections"
          className="inline-flex items-center gap-1.5 text-xs text-govgreen-800 hover:text-govgreen-900 font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Registry</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-govborder-subtle p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-govink-muted mb-1">
            <span className="font-bold text-govgreen-800 text-sm sm:text-base">{inspection.id}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{inspection.date}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate max-w-[200px] sm:max-w-none">{inspection.inspectionLocation}</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-ink-primary tracking-tight">
            {inspection.productName}
          </h1>

          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-ink-secondary">
            <span className="bg-cream-200 px-2 py-0.5 rounded font-semibold text-ink-primary border border-cream-300">
              Brand: {inspection.brand}
            </span>
            <span className="bg-cream-200 px-2 py-0.5 rounded font-semibold text-ink-primary border border-cream-300">
              Category: {inspection.category}
            </span>
            <span className="bg-forest-100 text-forest-800 px-2 py-0.5 rounded font-mono font-bold border border-forest-300">
              {inspection.source === 'camera' ? 'Camera Capture' : inspection.source === 'upload' ? 'Packaging Upload' : 'Quick Test Demo'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block font-mono">
              Audit Status
            </span>
            <div className="mt-1">
              <StatusBadge status={inspection.overallStatus} size="lg" />
            </div>
          </div>
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-forest-700 text-white flex flex-col items-center justify-center p-2 shadow-subtle flex-shrink-0">
            <span className="text-xl sm:text-2xl font-black font-mono leading-none text-cream-100">
              {inspection.complianceScore}
            </span>
            <span className="text-[9px] font-mono text-forest-200 mt-1 uppercase">/ 100 PTS</span>
          </div>
        </div>
      </div>

      {/* Mandatory Declarations Table (Rule 6 Analysis) */}
      <Card
        title={
          <div className="flex items-center justify-between w-full flex-wrap gap-2">
            <span className="font-bold text-sm sm:text-base text-ink-primary">
              Mandatory Declarations Compliance (Rule 6 Analysis)
            </span>
            <span className="text-xs font-mono text-ink-muted">
              {inspection.declarations.length} Required Declarations
            </span>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-cream-200/70 border-b border-cream-400 text-ink-secondary uppercase tracking-wider font-mono">
                <th className="py-3 px-4 font-bold">Mandatory Declaration</th>
                <th className="py-3 px-4 font-bold">Rule Ref</th>
                <th className="py-3 px-4 font-bold">Detected Value</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
                <th className="py-3 px-4 font-bold text-right">Extraction Conf.</th>
                <th className="py-3 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {inspection.declarations.map(dec => {
                const isSelected = dec.key === selectedDeclarationKey;
                return (
                  <tr
                    key={dec.id}
                    onClick={() => setSelectedDeclarationKey(dec.key)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-forest-50/80 border-l-4 border-l-forest-700' : 'hover:bg-cream-200/50'
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-ink-primary">{dec.name}</td>
                    <td className="py-3 px-4 font-mono font-bold text-forest-800">{dec.ruleReference}</td>
                    <td className="py-3 px-4 font-mono text-ink-primary max-w-xs truncate">{dec.detectedValue}</td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={dec.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-ink-primary">
                      {dec.extractionConfidence || dec.confidence}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          isSelected ? 'bg-forest-700 text-white' : 'bg-cream-200 text-ink-primary'
                        }`}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Statutory Findings (Rule 6 Deterministic Engine) */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-forest-700" />
            <span className="font-bold text-sm sm:text-base text-ink-primary">
              Statutory Findings &amp; Rationale (Rule 6 Evaluation)
            </span>
          </div>
        }
      >
        <div className="space-y-3">
          {(inspection.findings || []).map(finding => {
            const isSelected = finding.declarationKey === selectedDeclarationKey;
            return (
              <div
                key={finding.id}
                onClick={() => setSelectedDeclarationKey(finding.declarationKey)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-forest-600 bg-forest-50/50 shadow-sm'
                    : 'border-cream-400 bg-cream-100 hover:bg-cream-200/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-ink-primary">{finding.statutoryTitle}</span>
                    <span className="font-mono text-[10px] text-forest-800 font-bold bg-cream-200 px-1.5 py-0.2 rounded border border-cream-300">
                      {finding.ruleReference}
                    </span>
                  </div>
                  <StatusBadge status={finding.status} size="sm" />
                </div>

                <p className="text-xs text-ink-secondary leading-relaxed font-mono mt-1">
                  <strong>Observed:</strong> {finding.whatDetected}
                </p>
                <p className="text-xs text-ink-secondary leading-relaxed mt-0.5">
                  <strong>Rationale:</strong> {finding.reason}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Interactive Visual Evidence Canvas Section */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-ink-primary tracking-tight">
            Visual Evidence Canvas &amp; Spatial Inspection
          </h3>
          <p className="text-xs text-ink-secondary">
            High-resolution packaging capture with OCR bounding box overlay and statutory finding inspector
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          <div className="lg:col-span-7">
            <EvidenceCanvas
              imageUrl={inspection.imageUrl}
              inspection={inspection}
              boundingBoxes={inspection.boundingBoxes}
              visualEvidences={inspection.visualEvidences}
              selectedDeclarationKey={selectedDeclarationKey}
              onSelectBoundingBox={(key) => setSelectedDeclarationKey(key)}
              selectedDeclarationName={selectedDeclaration?.name}
            />
          </div>

          <div className="lg:col-span-5">
            <FindingDrawer
              finding={selectedDeclaration}
              visualEvidence={
                inspection.visualEvidences?.find(
                  e => e.declarationKey === selectedDeclarationKey || e.id === selectedDeclarationKey
                )
              }
              onClose={() => setSelectedDeclarationKey(null)}
              onSaveRemarks={handleSaveFindingRemarks}
            />
          </div>
        </div>
      </div>

      {/* Officer Notes Section */}
      <Card
        title={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-forest-700" />
              <span className="font-bold text-sm sm:text-base text-ink-primary">
                Inspecting Officer Field Observations &amp; Physical Packaging Notes
              </span>
            </div>

            {saveSuccess && (
              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 animate-checkmarkPop" />
                <span>Notes Saved ✓</span>
              </span>
            )}
          </div>
        }
      >
        <div className="space-y-3">
          <textarea
            value={officerNotes}
            onChange={(e) => setOfficerNotes(e.target.value)}
            rows={3}
            placeholder="Enter field observations, verification notes, physical packaging condition..."
            className="w-full text-xs p-3 rounded-lg border border-govborder-subtle bg-white focus:outline-none focus:ring-2 focus:ring-govgreen-600 text-govink-primary font-mono"
          />

          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveNotes}
              disabled={isSavingNotes || officerNotes === (inspection.officerNotes || '')}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              {isSavingNotes ? 'Saving Notes...' : 'Save Observations'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Action Footer */}
      <div className="bg-white rounded-xl border border-govborder-subtle p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        <div className="text-xs text-govink-secondary text-center sm:text-left">
          <span className="font-bold text-govink-primary">Statutory Action Protocol:</span>{' '}
          Export official Legal Metrology inspection audit report or return to registry.
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="md" onClick={() => navigate('/inspections')}>
            Back to Registry
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            leftIcon={<FileDown className="w-4 h-4 text-white" />}
          >
            {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Report'}
          </Button>
        </div>
      </div>
    </PageTransition>
  );
};
