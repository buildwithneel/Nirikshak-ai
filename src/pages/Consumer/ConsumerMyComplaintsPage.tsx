import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Inbox,
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
  PlusCircle,
  FileText,
  Search,
  Filter,
  ShieldCheck,
  Package,
  Calendar,
  Loader2,
} from 'lucide-react';
import { PageTransition } from '../../components/motion/PageTransition';
import { Button } from '../../components/ui/Button';
import { complaintsApi, ComplaintItem } from '../../services/api/complaintsApi';
import { useLanguage } from '../../i18n/LanguageContext';

export const ConsumerMyComplaintsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    setIsLoading(true);
    try {
      const data = await complaintsApi.getComplaints();
      setComplaints(data);
    } catch (err) {
      console.warn('Failed to load my complaints:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = complaints.filter(c => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.complaint_reference.toLowerCase().includes(q) ||
        c.product_name.toLowerCase().includes(q) ||
        c.issue_category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getCitizenStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-amber-100 text-amber-900 border border-amber-200">
            Grievance Received
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-blue-100 text-blue-900 border border-blue-200">
            Under Scrutiny
          </span>
        );
      case 'INSPECTION_SCHEDULED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-purple-100 text-purple-900 border border-purple-200">
            Enforcement Assigned
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-govgreen-100 text-govgreen-950 border border-govgreen-300">
            Action Taken & Resolved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-gray-100 text-gray-800 border border-gray-200">
            Closed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Header Banner */}
        <div className="bg-white border border-institutional-border rounded-xl p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Inbox className="w-5 h-5 text-govgreen-800" />
              <h1 className="text-xl font-black text-govink-primary tracking-tight">
                My Grievance Submissions
              </h1>
            </div>
            <p className="text-xs text-govink-secondary">
              Track the live administrative status of your packaged commodity non-compliance reports.
            </p>
          </div>

          <Link
            to="/complaint"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-govgreen-800 text-white rounded-lg text-xs font-bold hover:bg-govgreen-900 transition-colors shadow-subtle"
          >
            <PlusCircle className="w-4 h-4" />
            <span>File New Grievance</span>
          </Link>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white border border-institutional-border rounded-xl p-4 shadow-subtle flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="w-full sm:w-72 relative">
            <Search className="w-3.5 h-3.5 text-govink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by reference or product..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-institutional-border text-xs text-govink-primary focus:ring-2 focus:ring-govgreen-800 focus:outline-none placeholder:text-govink-muted"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'INSPECTION_SCHEDULED', 'RESOLVED'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-govgreen-900 text-white'
                    : 'bg-institutional-subtle text-govink-secondary hover:bg-institutional-border'
                }`}
              >
                {st === 'ALL'
                  ? 'All Grievances'
                  : st === 'SUBMITTED'
                  ? 'Received'
                  : st === 'UNDER_REVIEW'
                  ? 'Under Review'
                  : st === 'INSPECTION_SCHEDULED'
                  ? 'Inspection Assigned'
                  : 'Resolved'}
              </button>
            ))}
          </div>
        </div>

        {/* Complaints List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-govink-secondary">
            <Loader2 className="w-8 h-8 animate-spin text-govgreen-700 mb-2" />
            <span className="text-xs font-medium">Loading your grievance submissions...</span>
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map(item => (
              <Link
                key={item.id}
                to={`/my-complaints/${item.id}`}
                className="block bg-white border border-institutional-border hover:border-govgreen-700/60 rounded-xl p-5 shadow-subtle hover:shadow-md transition-all group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-govink-primary">
                        {item.complaint_reference}
                      </span>
                      {getCitizenStatusBadge(item.status)}
                      <span className="text-[11px] px-2 py-0.5 rounded bg-institutional-subtle text-govink-muted uppercase">
                        {item.issue_category.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-govink-primary group-hover:text-govgreen-800 transition-colors">
                      {item.product_name}
                    </h3>

                    <p className="text-xs text-govink-secondary line-clamp-2 leading-relaxed max-w-2xl">
                      {item.complaint_description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-institutional-border">
                    <span className="text-[11px] text-govink-muted flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-xs font-bold text-govgreen-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Track Progress
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-institutional-border rounded-xl p-12 text-center shadow-subtle space-y-3">
            <Inbox className="w-12 h-12 text-govink-muted mx-auto" />
            <h3 className="text-sm font-bold text-govink-primary">No Grievances Found</h3>
            <p className="text-xs text-govink-secondary max-w-sm mx-auto">
              {statusFilter !== 'ALL'
                ? 'No grievances match the selected filter.'
                : "You haven't filed any packaged commodity grievances yet."}
            </p>
            <Button variant="primary" onClick={() => navigate('/complaint')} className="text-xs">
              File a Grievance Now
            </Button>
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default ConsumerMyComplaintsPage;
