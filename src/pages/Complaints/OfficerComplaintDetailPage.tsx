import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldAlert,
  Clock,
  User,
  Mail,
  Package,
  Calendar,
  FileCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  ExternalLink,
  ChevronRight,
  Shield,
  Loader2,
  Send,
  Eye,
} from 'lucide-react';
import { complaintsApi, ComplaintItem } from '../../services/api/complaintsApi';
import { PageTransition } from '../../components/motion/PageTransition';
import { Button } from '../../components/ui/Button';
import { useLanguage } from '../../i18n/LanguageContext';

export const OfficerComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [complaint, setComplaint] = useState<ComplaintItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [officerNotes, setOfficerNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadComplaint(id);
    }
  }, [id]);

  const loadComplaint = async (complaintId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await complaintsApi.getComplaintById(complaintId);
      setComplaint(data);
      setOfficerNotes(data.officer_notes || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load complaint details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotes = async (newStatus?: string) => {
    if (!complaint) return;
    setIsSavingNotes(true);
    try {
      const updated = await complaintsApi.updateComplaintStatus(
        complaint.id,
        newStatus || complaint.status,
        officerNotes.trim()
      );
      setComplaint(updated);
      setActionSuccessMessage('Officer notes and case review state updated.');
      setTimeout(() => setActionSuccessMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to update review.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleInitiateInspection = async () => {
    if (!complaint) return;
    setIsInitiating(true);
    try {
      const result = await complaintsApi.initiateInspection(complaint.id);
      setActionSuccessMessage(`Inspection record ${result.inspection_reference} initiated! Redirecting...`);
      setTimeout(() => {
        navigate(`/inspections/${result.id}/workspace`);
      }, 1000);
    } catch (err: any) {
      alert(err.message || 'Failed to initiate inspection.');
      setIsInitiating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-govink-secondary">
        <Loader2 className="w-8 h-8 animate-spin text-govgreen-700 mb-2" />
        <span className="text-sm font-medium">Loading Grievance Dossier...</span>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <div className="p-8 bg-white rounded-xl border border-institutional-border shadow-subtle">
          <AlertTriangle className="w-12 h-12 text-govred-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-govink-primary mb-1">Grievance Not Found</h2>
          <p className="text-sm text-govink-secondary mb-4">{error || 'This complaint record does not exist or access is restricted.'}</p>
          <Button variant="secondary" onClick={() => navigate('/complaints')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Complaints Inbox
          </Button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-amber-100 text-amber-900 border border-amber-200">GRIEVANCE SUBMITTED</span>;
      case 'UNDER_REVIEW':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-blue-100 text-blue-900 border border-blue-200">UNDER OFFICER SCRUTINY</span>;
      case 'INSPECTION_SCHEDULED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-100 text-emerald-900 border border-emerald-200">INSPECTION INITIATED</span>;
      case 'RESOLVED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-govgreen-100 text-govgreen-950 border border-govgreen-300">RESOLVED</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-govred-100 text-govred-900 border border-govred-200">REJECTED / DISMISSED</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-govink-muted">
            <Link to="/complaints" className="hover:text-govgreen-800 flex items-center gap-1 font-medium transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Complaints Inbox
            </Link>
            <span>/</span>
            <span className="font-mono text-govink-primary font-bold">{complaint.complaint_reference}</span>
          </div>

          <div className="flex items-center gap-2">
            {complaint.linked_inspection_id && (
              <Link
                to={`/inspections/${complaint.linked_inspection_id}/workspace`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-govgreen-800 text-white rounded-lg text-xs font-bold hover:bg-govgreen-900 shadow-subtle transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open Linked Inspection Workspace</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Action notification toast */}
        {actionSuccessMessage && (
          <div className="p-3 bg-govgreen-50 border border-govgreen-300 text-govgreen-900 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-govgreen-700 flex-shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {/* Dossier Header Banner */}
        <div className="bg-white border border-institutional-border rounded-xl p-5 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-sm font-bold text-govink-primary tracking-wide">
                {complaint.complaint_reference}
              </span>
              {getStatusBadge(complaint.status)}
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-institutional-subtle border border-institutional-border text-govink-secondary">
                Rule 6 Enforcement
              </span>
            </div>
            <h1 className="text-xl font-black text-govink-primary tracking-tight">
              {complaint.product_name}
            </h1>
            <p className="text-xs text-govink-secondary">
              Logged on {new Date(complaint.created_at).toLocaleString()} | Complainant: <span className="font-medium text-govink-primary">{complaint.consumer_email}</span>
            </p>
          </div>

          {/* Quick Primary Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {!complaint.linked_inspection_id && complaint.status !== 'REJECTED' && (
              <Button
                variant="primary"
                onClick={handleInitiateInspection}
                disabled={isInitiating}
                className="text-xs"
              >
                {isInitiating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Spawning Inspection...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
                    Initiate Formal Inspection
                  </>
                )}
              </Button>
            )}
            {complaint.status === 'SUBMITTED' && (
              <Button
                variant="secondary"
                onClick={() => handleSaveNotes('UNDER_REVIEW')}
                disabled={isSavingNotes}
                className="text-xs"
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                Mark Under Review
              </Button>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Complainant Evidence and Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Citizen Submission Card */}
            <div className="bg-white border border-institutional-border rounded-xl p-5 shadow-subtle space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-institutional-border">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-amber-100 text-amber-900 border border-amber-200">
                    CONSUMER SUBMISSION
                  </span>
                  <span className="text-xs text-govink-muted">Citizen Grievance Filing</span>
                </div>
                <span className="text-xs font-mono text-govink-muted">{new Date(complaint.created_at).toLocaleDateString()}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-govink-muted block text-[11px] font-medium">Product Category:</span>
                  <span className="font-semibold text-govink-primary uppercase tracking-wide">
                    {complaint.issue_category.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-govink-muted block text-[11px] font-medium">Packaging Spec:</span>
                  <span className="font-semibold text-govink-primary">
                    {complaint.product_description || 'Standard Packaged Commodity'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-govink-muted block text-[11px] font-medium mb-1">Grievance Statement:</span>
                <div className="p-3.5 rounded-lg bg-institutional-subtle/70 border border-institutional-border text-xs leading-relaxed text-govink-primary">
                  {complaint.complaint_description}
                </div>
              </div>

              {complaint.image_reference && (
                <div>
                  <span className="text-govink-muted block text-[11px] font-medium mb-2">Consumer Provided Photo:</span>
                  <div className="max-w-md rounded-lg overflow-hidden border border-institutional-border bg-gray-50">
                    <img
                      src={complaint.image_reference}
                      alt="Consumer evidence"
                      className="w-full max-h-64 object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Officer Enforcement Notes */}
            <div className="bg-white border border-institutional-border rounded-xl p-5 shadow-subtle space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-institutional-border">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-govgreen-100 text-govgreen-950 border border-govgreen-200">
                    OFFICER OBSERVATION
                  </span>
                  <span className="text-xs font-bold text-govink-primary">Preliminary Assessment & Internal Notes</span>
                </div>
                <span className="text-[10px] text-govink-muted">Internal Confidential</span>
              </div>

              <textarea
                value={officerNotes}
                onChange={e => setOfficerNotes(e.target.value)}
                placeholder="Enter preliminary verification notes, retailer identification, or enforcement instructions..."
                rows={4}
                className="w-full p-3 rounded-lg border border-institutional-border bg-white text-xs text-govink-primary focus:ring-2 focus:ring-govgreen-800 focus:outline-none placeholder:text-govink-muted"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-govink-muted">
                  Notes are stored securely in the enforcement database and logged to the audit timeline.
                </span>
                <Button
                  variant="primary"
                  onClick={() => handleSaveNotes()}
                  disabled={isSavingNotes}
                  className="text-xs"
                >
                  {isSavingNotes ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : (
                    <FileCheck className="w-3.5 h-3.5 mr-1" />
                  )}
                  Save Assessment
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column: Case Management & Linkages */}
          <div className="space-y-6">
            {/* Case Workflow Status Box */}
            <div className="bg-white border border-institutional-border rounded-xl p-5 shadow-subtle space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-govink-primary font-mono border-b border-institutional-border pb-2">
                Enforcement Workflow
              </h3>

              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-govgreen-100 text-govgreen-900 flex items-center justify-center text-xs font-bold mt-0.5">
                    1
                  </div>
                  <div>
                    <span className="text-xs font-bold text-govink-primary block">Consumer Grievance Lodged</span>
                    <span className="text-[11px] text-govink-muted">Recorded into registry under Rule 6</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                    complaint.status !== 'SUBMITTED' ? 'bg-govgreen-100 text-govgreen-900' : 'bg-gray-100 text-gray-500'
                  }`}>
                    2
                  </div>
                  <div>
                    <span className="text-xs font-bold text-govink-primary block">Officer Scrutiny</span>
                    <span className="text-[11px] text-govink-muted">Preliminary review of statutory claims</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                    complaint.linked_inspection_id ? 'bg-govgreen-100 text-govgreen-900' : 'bg-gray-100 text-gray-500'
                  }`}>
                    3
                  </div>
                  <div>
                    <span className="text-xs font-bold text-govink-primary block">Formal Inspection Workspace</span>
                    <span className="text-[11px] text-govink-muted">
                      {complaint.linked_inspection_id ? 'Inspection active' : 'Awaiting initiation'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Update Dropdown Actions */}
              <div className="pt-3 border-t border-institutional-border space-y-2">
                <span className="text-[11px] font-medium text-govink-muted block">Change Complaint Status:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSaveNotes('RESOLVED')}
                    className="p-2 text-xs font-medium rounded-lg border border-govgreen-300 bg-govgreen-50 text-govgreen-900 hover:bg-govgreen-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-govgreen-700" />
                    Mark Resolved
                  </button>
                  <button
                    onClick={() => handleSaveNotes('REJECTED')}
                    className="p-2 text-xs font-medium rounded-lg border border-govred-200 bg-govred-50 text-govred-900 hover:bg-govred-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5 text-govred-700" />
                    Dismiss / Reject
                  </button>
                </div>
              </div>
            </div>

            {/* Linked Inspection Card */}
            {complaint.linked_inspection_id ? (
              <div className="bg-govgreen-50/70 border border-govgreen-200 rounded-xl p-5 shadow-subtle space-y-3">
                <div className="flex items-center gap-2 text-govgreen-900 font-bold text-xs">
                  <Shield className="w-4 h-4 text-govgreen-800" />
                  <span>Linked Inspection Active</span>
                </div>
                <p className="text-[11px] text-govgreen-950 leading-relaxed">
                  An official inspection record has been initiated from this consumer complaint. All findings, physical observations, and officer verifications are tracked in the inspection dossier.
                </p>
                <Link
                  to={`/inspections/${complaint.linked_inspection_id}/workspace`}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-govgreen-800 text-white font-bold text-xs hover:bg-govgreen-900 transition-colors shadow-subtle"
                >
                  <span>Open Inspection Workspace</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="bg-institutional-subtle border border-institutional-border rounded-xl p-5 shadow-subtle space-y-3 text-center">
                <ShieldAlert className="w-8 h-8 text-govink-muted mx-auto" />
                <h4 className="text-xs font-bold text-govink-primary">No Inspection Initiated Yet</h4>
                <p className="text-[11px] text-govink-secondary leading-relaxed">
                  To conduct statutory OCR package analysis and legal verification, initiate a formal inspection from this grievance.
                </p>
                <Button
                  variant="primary"
                  onClick={handleInitiateInspection}
                  disabled={isInitiating}
                  className="w-full text-xs justify-center"
                >
                  Initiate Inspection
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default OfficerComplaintDetailPage;
