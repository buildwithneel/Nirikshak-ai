import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Inbox,
  AlertCircle,
  Clock,
  Eye,
  ScanLine,
  Filter,
  CheckCircle2,
  FileText,
  ShieldCheck,
  X,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { authApi } from '../../auth/authApi';
import { complaintsApi } from '../../services/api/complaintsApi';
import { Complaint, ComplaintStatus } from '../../auth/authTypes';
import { PageTransition } from '../../components/motion/PageTransition';
import { Button } from '../../components/ui/Button';
import { PulseBadge } from '../../components/motion/PulseBadge';
import { useInspection } from '../../context/InspectionContext';
import { useLanguage } from '../../i18n/LanguageContext';

export const OfficerComplaintsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isOfficer } = useAuth();
  const { setCurrentInspection } = useInspection();
  const { t } = useLanguage();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [officerNoteInput, setOfficerNoteInput] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    setIsLoading(true);
    try {
      const data = await authApi.getComplaints();
      setComplaints(data);
    } catch (e) {
      console.warn('Failed to load complaints:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDetail = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setOfficerNoteInput(complaint.officer_notes || '');
  };

  const handleStatusUpdate = async (newStatus: ComplaintStatus) => {
    if (!selectedComplaint) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await authApi.updateComplaintStatus(
        selectedComplaint.id,
        newStatus,
        officerNoteInput.trim() || undefined
      );
      if (updated) {
        setSelectedComplaint(updated);
        setComplaints(prev => prev.map(c => (c.id === updated.id ? updated : c)));
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCreateInspection = async (complaint: Complaint) => {
    try {
      const result = await complaintsApi.initiateInspection(complaint.id);
      navigate(`/inspections/${result.id}/workspace`);
    } catch {
      // Offline fallback
      setCurrentInspection(prev => ({
        ...prev,
        productName: complaint.product_name,
        imageUrl: complaint.image_url || prev.imageUrl,
        officerNotes: `Originating from Consumer Grievance ${complaint.id}. Reported concern: ${complaint.description}`,
      }));
      navigate('/scan');
    }
  };


  const filteredComplaints = complaints.filter(c => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.id.toLowerCase().includes(q) ||
        c.product_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case 'SUBMITTED':
        return <PulseBadge status="active" label="SUBMITTED" />;
      case 'UNDER_REVIEW':
        return <PulseBadge status="review" label="UNDER REVIEW" />;
      case 'INSPECTION_REQUIRED':
        return <PulseBadge status="violation" label="INSPECTION REQUIRED" />;
      case 'RESOLVED':
        return <PulseBadge status="compliant" label="RESOLVED" />;
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-institutional-subtle text-govink-secondary border border-institutional-border">
            {status}
          </span>
        );
    }
  };

  return (
    <PageTransition className="space-y-5 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-institutional-border p-5 sm:p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-govgreen-100 text-govgreen-900 border border-govgreen-200 text-xs font-bold mb-2">
            <Inbox className="w-3.5 h-3.5 text-govgreen-800" />
            <span>OFFICER INBOX</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-govink-primary tracking-tight">
            Consumer Grievance Intake
          </h1>
          <p className="text-xs sm:text-sm text-govink-secondary mt-1">
            Review citizen reports of packaging non-compliance and initiate official field verifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-2 rounded-xl bg-institutional-subtle border border-institutional-border text-xs text-right">
            <div className="text-[10px] text-govink-muted font-bold font-mono">TOTAL COMPLAINTS</div>
            <div className="text-base font-black text-govink-primary">{complaints.length}</div>
          </div>
        </div>
      </div>

      {/* Statutory Guidance Banner */}
      <div className="p-3.5 rounded-xl bg-govamber-50 border border-govamber-200 text-govamber-900 text-xs flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-govamber-700 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-bold">Statutory Protocol:</strong> A consumer grievance is an alert for officer review. It does NOT automatically constitute a legal metrology finding. Initiate an official inspection with AI OCR assistance to document verified visual evidence.
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-institutional-border p-3.5 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-govink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search complaint ID, product, or citizen email..."
            className="w-full bg-institutional-subtle border border-institutional-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-govink-primary focus:outline-none focus:ring-2 focus:ring-govgreen-700"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 md:pb-0">
          <span className="text-[11px] font-bold text-govink-muted flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" />
            <span>STATUS:</span>
          </span>
          {['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'INSPECTION_REQUIRED', 'RESOLVED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex-shrink-0 ${
                statusFilter === st
                  ? 'bg-govgreen-900 text-white'
                  : 'bg-institutional-subtle hover:bg-institutional-border text-govink-secondary'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Complaints List Table / Grid */}
      <div className="bg-white rounded-2xl border border-institutional-border shadow-subtle overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-govink-muted animate-pulse">
            Loading grievance repository…
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Inbox className="w-10 h-10 text-govink-muted mx-auto" />
            <div className="text-sm font-bold text-govink-primary">No complaints found</div>
            <p className="text-xs text-govink-secondary">
              No citizen submissions match the selected criteria.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-institutional-border">
            {filteredComplaints.map(item => (
              <div
                key={item.id}
                onClick={() => handleOpenDetail(item)}
                className="p-4 sm:p-5 hover:bg-institutional-subtle/50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-govgreen-900 bg-govgreen-50 border border-govgreen-200 px-2 py-0.5 rounded">
                      {item.id}
                    </span>
                    {getStatusBadge(item.status)}
                    <span className="text-[11px] text-govink-muted">
                      {new Date(item.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-govink-primary truncate">
                    {item.product_name}
                  </h3>

                  <p className="text-xs text-govink-secondary line-clamp-1">
                    {item.description}
                  </p>

                  <div className="text-[11px] text-govink-muted">
                    Submitted by: <span className="font-mono text-govink-primary">{item.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation();
                      handleCreateInspection(item);
                    }}
                    leftIcon={<ScanLine className="w-3.5 h-3.5 text-govgreen-800" />}
                    className="text-xs font-bold text-govgreen-900 hover:bg-govgreen-50"
                  >
                    Inspect
                  </Button>

                  <ChevronRight className="w-4 h-4 text-govink-muted" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complaint Detail Drawer / Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-govink-primary/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-institutional-border shadow-modal overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-institutional-border bg-govgreen-900 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-govgreen-200" />
                <h3 className="font-bold text-sm sm:text-base font-mono">
                  {selectedComplaint.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="text-govgreen-200 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-govink-muted font-bold font-mono uppercase block">
                    CURRENT STATUS
                  </span>
                  <div className="mt-0.5">{getStatusBadge(selectedComplaint.status)}</div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-govink-muted font-bold font-mono uppercase block">
                    SUBMISSION DATE
                  </span>
                  <span className="font-semibold text-govink-primary text-xs">
                    {new Date(selectedComplaint.created_at).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-3 rounded-xl bg-institutional-subtle border border-institutional-border space-y-1">
                <span className="text-[10px] text-govink-muted font-bold font-mono uppercase block">
                  REPORTED COMMODITY
                </span>
                <div className="font-bold text-sm text-govink-primary">
                  {selectedComplaint.product_name}
                </div>
                <div className="text-[11px] text-govink-secondary">
                  Category: {selectedComplaint.issue_category.replace('_', ' ').toUpperCase()}
                </div>
              </div>

              {/* Consumer Observation */}
              <div>
                <span className="text-[10px] text-govink-muted font-bold font-mono uppercase block mb-1">
                  CONSUMER OBSERVATION
                </span>
                <div className="p-3 rounded-xl bg-white border border-institutional-border text-govink-primary leading-relaxed text-xs">
                  {selectedComplaint.description}
                </div>
              </div>

              {/* Consumer Email */}
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg border border-institutional-border bg-institutional-subtle">
                <span className="text-govink-secondary font-medium">Citizen Contact:</span>
                <span className="font-mono font-bold text-govink-primary">
                  {selectedComplaint.email}
                </span>
              </div>

              {/* Officer Notes & Status Action */}
              <div className="pt-2 border-t border-institutional-border space-y-2">
                <label className="block text-[11px] font-bold text-govink-primary font-mono uppercase">
                  OFFICER ASSESSMENT NOTES
                </label>
                <textarea
                  rows={2}
                  value={officerNoteInput}
                  onChange={e => setOfficerNoteInput(e.target.value)}
                  placeholder="Enter preliminary enforcement notes or statutory observations..."
                  className="w-full p-2.5 rounded-lg border border-institutional-border text-xs focus:outline-none focus:ring-2 focus:ring-govgreen-700"
                />

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-govink-muted font-bold mr-1">SET STATUS:</span>
                  {(
                    ['SUBMITTED', 'UNDER_REVIEW', 'INSPECTION_REQUIRED', 'RESOLVED'] as ComplaintStatus[]
                  ).map(st => (
                    <button
                      key={st}
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleStatusUpdate(st)}
                      className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                        selectedComplaint.status === st
                          ? 'bg-govgreen-900 text-white border-govgreen-900'
                          : 'bg-white hover:bg-institutional-subtle text-govink-secondary border-institutional-border'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-institutional-border bg-institutional-subtle flex items-center justify-between flex-shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedComplaint(null)}
                className="text-xs font-bold"
              >
                Close
              </Button>

              <div className="flex items-center gap-2">
                <Link
                  to={`/complaints/${selectedComplaint.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-govgreen-800 text-govgreen-900 bg-govgreen-50 text-xs font-bold hover:bg-govgreen-100 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Full Case File</span>
                </Link>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleCreateInspection(selectedComplaint)}
                  leftIcon={<ScanLine className="w-3.5 h-3.5 text-white" />}
                  className="text-xs font-bold shadow-subtle"
                >
                  Initiate Official Inspection
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
};

export default OfficerComplaintsPage;
