import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  FileText,
  Calendar,
  Package,
  Info,
  ChevronRight,
  Loader2,
  Lock,
} from 'lucide-react';
import { PageTransition } from '../../components/motion/PageTransition';
import { Button } from '../../components/ui/Button';
import { complaintsApi, ComplaintItem } from '../../services/api/complaintsApi';
import { useLanguage } from '../../i18n/LanguageContext';

export const ConsumerComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [complaint, setComplaint] = useState<ComplaintItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err.message || 'Unable to access grievance details.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-govink-secondary">
        <Loader2 className="w-8 h-8 animate-spin text-govgreen-700 mb-2" />
        <span className="text-xs font-medium">Retrieving Grievance Status...</span>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center bg-white rounded-xl border border-institutional-border mt-8">
        <AlertCircle className="w-12 h-12 text-govred-600 mx-auto mb-3" />
        <h2 className="text-base font-bold text-govink-primary mb-1">Grievance Record Not Found</h2>
        <p className="text-xs text-govink-secondary mb-4">
          {error || 'This grievance does not exist or belongs to another user.'}
        </p>
        <Button variant="secondary" onClick={() => navigate('/my-complaints')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Grievances
        </Button>
      </div>
    );
  }

  const getTimelineStep = () => {
    switch (complaint.status) {
      case 'SUBMITTED':
        return 1;
      case 'UNDER_REVIEW':
        return 2;
      case 'INSPECTION_SCHEDULED':
        return 3;
      case 'RESOLVED':
      case 'REJECTED':
        return 4;
      default:
        return 1;
    }
  };

  const currentStep = getTimelineStep();

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-govink-muted">
          <Link to="/my-complaints" className="hover:text-govgreen-800 flex items-center gap-1 font-medium transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            My Grievance Submissions
          </Link>
          <span>/</span>
          <span className="font-mono text-govink-primary font-bold">{complaint.complaint_reference}</span>
        </div>

        {/* Header Summary Banner */}
        <div className="bg-white border border-institutional-border rounded-xl p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-govink-primary">
                {complaint.complaint_reference}
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md ${
                complaint.status === 'RESOLVED'
                  ? 'bg-govgreen-100 text-govgreen-950 border border-govgreen-300'
                  : 'bg-blue-100 text-blue-900 border border-blue-200'
              }`}>
                {complaint.status === 'SUBMITTED'
                  ? 'GRIEVANCE RECEIVED'
                  : complaint.status === 'UNDER_REVIEW'
                  ? 'UNDER SCRUTINY'
                  : complaint.status === 'INSPECTION_SCHEDULED'
                  ? 'ENFORCEMENT INITIATED'
                  : complaint.status.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-xl font-black text-govink-primary tracking-tight">
              {complaint.product_name}
            </h1>
            <p className="text-xs text-govink-secondary">
              Submitted on {new Date(complaint.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Citizen Milestone Progress Stepper */}
        <div className="bg-white border border-institutional-border rounded-xl p-6 shadow-subtle space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-govink-primary font-mono border-b border-institutional-border pb-2">
            Official Enforcement Progress
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
            {/* Step 1 */}
            <div className={`p-3 rounded-lg border text-xs space-y-1 ${
              currentStep >= 1 ? 'bg-govgreen-50/70 border-govgreen-300' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-govink-primary">1. Lodged</span>
                {currentStep >= 1 ? (
                  <CheckCircle2 className="w-4 h-4 text-govgreen-700" />
                ) : (
                  <Clock className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <p className="text-[11px] text-govink-secondary">
                Complaint registered with unique tracking ID.
              </p>
            </div>

            {/* Step 2 */}
            <div className={`p-3 rounded-lg border text-xs space-y-1 ${
              currentStep >= 2 ? 'bg-govgreen-50/70 border-govgreen-300' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-govink-primary">2. Scrutiny</span>
                {currentStep >= 2 ? (
                  <CheckCircle2 className="w-4 h-4 text-govgreen-700" />
                ) : (
                  <Clock className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <p className="text-[11px] text-govink-secondary">
                Assigned to Legal Metrology Inspectorate for review.
              </p>
            </div>

            {/* Step 3 */}
            <div className={`p-3 rounded-lg border text-xs space-y-1 ${
              currentStep >= 3 ? 'bg-govgreen-50/70 border-govgreen-300' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-govink-primary">3. Enforcement</span>
                {currentStep >= 3 ? (
                  <CheckCircle2 className="w-4 h-4 text-govgreen-700" />
                ) : (
                  <Clock className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <p className="text-[11px] text-govink-secondary">
                Statutory inspection dossier opened.
              </p>
            </div>

            {/* Step 4 */}
            <div className={`p-3 rounded-lg border text-xs space-y-1 ${
              currentStep >= 4 ? 'bg-govgreen-50/70 border-govgreen-300' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-govink-primary">4. Resolution</span>
                {currentStep >= 4 ? (
                  <CheckCircle2 className="w-4 h-4 text-govgreen-700" />
                ) : (
                  <Clock className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <p className="text-[11px] text-govink-secondary">
                Statutory report filed or corrective action issued.
              </p>
            </div>
          </div>
        </div>

        {/* Grievance Dossier Details */}
        <div className="bg-white border border-institutional-border rounded-xl p-6 shadow-subtle space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-govink-primary font-mono border-b border-institutional-border pb-2">
            Submitted Grievance Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-govink-muted block text-[11px] font-medium">Issue Category:</span>
              <span className="font-semibold text-govink-primary uppercase tracking-wide">
                {complaint.issue_category.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-govink-muted block text-[11px] font-medium">Packaging Specification:</span>
              <span className="font-semibold text-govink-primary">
                {complaint.product_description || 'Packaged Commodity'}
              </span>
            </div>
          </div>

          <div>
            <span className="text-govink-muted block text-[11px] font-medium mb-1">Your Grievance Statement:</span>
            <div className="p-3.5 rounded-lg bg-institutional-subtle/70 border border-institutional-border text-xs leading-relaxed text-govink-primary">
              {complaint.complaint_description}
            </div>
          </div>

          {complaint.image_reference && (
            <div>
              <span className="text-govink-muted block text-[11px] font-medium mb-2">Uploaded Package Photo:</span>
              <div className="max-w-md rounded-lg overflow-hidden border border-institutional-border bg-gray-50">
                <img
                  src={complaint.image_reference}
                  alt="Consumer grievance photo"
                  className="w-full max-h-64 object-contain"
                />
              </div>
            </div>
          )}
        </div>

        {/* Data Protection and Confidentiality Banner */}
        <div className="p-4 bg-institutional-subtle/80 border border-institutional-border rounded-xl flex items-start gap-3 text-xs text-govink-secondary">
          <Lock className="w-5 h-5 text-govgreen-800 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-govink-primary block">
              Enforcement Confidentiality Notice
            </span>
            <p className="leading-relaxed text-[11px]">
              Your grievance has been securely logged into the National Legal Metrology Compliance Database. Officer notes, retailer investigation strategies, and enforcement notices are protected under official administrative secrecy to prevent evidence tampering.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default ConsumerComplaintDetailPage;
