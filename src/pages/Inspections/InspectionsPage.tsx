import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  ChevronRight,
  ScanLine,
  Trash2,
  AlertTriangle,
  FileDown,
  Calendar,
  Layers,
  MapPin,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Modal } from '../../components/ui/Modal';
import { useInspection } from '../../context/InspectionContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { InspectionRecord } from '../../types';
import { downloadInspectionPdf } from '../../services/reportApi';

import { PageTransition } from '../../components/motion/PageTransition';

export const InspectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const { inspections, deleteInspectionRecord } = useInspection();

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'SCORE'>('NEWEST');

  // Deletion modal state
  const [recordToDelete, setRecordToDelete] = useState<InspectionRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filteredInspections = useMemo(() => {
    return inspections
      .filter(rec => {
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !query ||
          rec.id.toLowerCase().includes(query) ||
          rec.productName.toLowerCase().includes(query) ||
          rec.brand.toLowerCase().includes(query) ||
          rec.inspectionLocation.toLowerCase().includes(query);

        const matchesStatus = statusFilter === 'ALL' || rec.overallStatus === statusFilter;
        const matchesSource = sourceFilter === 'ALL' || rec.source === sourceFilter;

        return matchesSearch && matchesStatus && matchesSource;
      })
      .sort((a, b) => {
        if (sortBy === 'NEWEST') {
          const timeA = new Date(a.createdAt || a.date).getTime();
          const timeB = new Date(b.createdAt || b.date).getTime();
          return timeB - timeA;
        }
        if (sortBy === 'OLDEST') {
          const timeA = new Date(a.createdAt || a.date).getTime();
          const timeB = new Date(b.createdAt || b.date).getTime();
          return timeA - timeB;
        }
        if (sortBy === 'SCORE') {
          return b.complianceScore - a.complianceScore;
        }
        return 0;
      });
  }, [inspections, searchQuery, statusFilter, sourceFilter, sortBy]);

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      await deleteInspectionRecord(recordToDelete.id);
      setRecordToDelete(null);
    } catch (err) {
      console.error('Failed to delete inspection:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadPdf = async (e: React.MouseEvent, record: InspectionRecord) => {
    e.stopPropagation();
    setDownloadingId(record.id);
    try {
      await downloadInspectionPdf(record);
    } catch (err) {
      console.error('Failed to download PDF:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const renderSourceBadge = (source?: string) => {
    if (source === 'camera') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
          Camera
        </span>
      );
    }
    if (source === 'upload') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-govgreen-50 text-govgreen-800 border border-govgreen-200">
          Upload
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-100 text-govink-muted border border-govborder-subtle">
        Demo Mode
      </span>
    );
  };

  return (
    <PageTransition className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-12">
      <Breadcrumbs items={[{ label: t('nav.history', 'Inspection History') }]} />

      {/* Header */}
      <div className="bg-white rounded-2xl border border-govborder-subtle p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-xs font-mono font-bold uppercase text-govgreen-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-govgreen-600 animate-pulse" />
            <span>STATUTORY AUDIT REGISTRY</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-govink-primary tracking-tight mt-1">
            {t('nav.history', 'Inspection History & Audit Log')}
          </h1>
          <p className="text-xs sm:text-sm text-govink-secondary mt-1">
            Persistent local registry of Legal Metrology inspection snapshots, OCR evidence overlays, and statutory compliance determinations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/scan')}
            leftIcon={<ScanLine className="w-4 h-4 text-cream-100" />}
          >
            {t('nav.newInspection', 'New Inspection')}
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card noPadding>
        <div className="p-3.5 sm:p-4 border-b border-cream-400 bg-cream-200/50 flex flex-col md:flex-row items-center gap-2.5 sm:gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by ID (e.g. INSP-2026), Product, Brand, Location..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-cream-400 rounded-lg text-xs text-ink-primary focus:outline-none focus:ring-2 focus:ring-forest-600 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-cream-400 rounded-lg text-xs text-ink-primary focus:outline-none focus:ring-2 focus:ring-forest-600 font-semibold flex-1 md:flex-initial"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLIANT">Compliant</option>
              <option value="REVIEW_REQUIRED">Review Required</option>
              <option value="POTENTIAL_VIOLATION">Potential Violation</option>
            </select>

            {/* Source Filter */}
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-cream-400 rounded-lg text-xs text-ink-primary focus:outline-none focus:ring-2 focus:ring-forest-600 font-semibold flex-1 md:flex-initial"
            >
              <option value="ALL">All Sources</option>
              <option value="upload">Uploaded Image</option>
              <option value="camera">Camera Capture</option>
              <option value="quick_test">Quick Test / Demo</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'NEWEST' | 'OLDEST' | 'SCORE')}
              className="px-3 py-2 bg-white border border-cream-400 rounded-lg text-xs text-ink-primary focus:outline-none focus:ring-2 focus:ring-forest-600 font-semibold flex-1 md:flex-initial"
            >
              <option value="NEWEST">Newest First</option>
              <option value="OLDEST">Oldest First</option>
              <option value="SCORE">Highest Score</option>
            </select>
          </div>
        </div>

        {/* Responsive Content: Mobile Cards (< md) vs Desktop Audit Table (>= md) */}
        {/* Mobile View */}
        <div className="block md:hidden divide-y divide-cream-300">
          {filteredInspections.length > 0 ? (
            filteredInspections.map(rec => (
              <div
                key={rec.id}
                onClick={() => navigate(`/inspections/${rec.id}`)}
                className="p-4 hover:bg-cream-200/50 cursor-pointer space-y-2.5 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-forest-800">{rec.id}</span>
                    {renderSourceBadge(rec.source)}
                  </div>
                  <StatusBadge status={rec.overallStatus} size="sm" />
                </div>

                <div>
                  <div className="font-bold text-sm text-ink-primary">{rec.productName}</div>
                  <div className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    <span>{rec.brand} • {rec.inspectionLocation}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-cream-300">
                  <span className="text-ink-secondary font-mono">
                    Score: <strong>{rec.complianceScore}/100</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleDownloadPdf(e, rec)}
                      disabled={downloadingId === rec.id}
                      className="p-1.5 rounded hover:bg-cream-300 text-forest-800 font-bold"
                      title="Download PDF"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecordToDelete(rec);
                      }}
                      className="p-1.5 rounded hover:bg-red-100 text-red-700"
                      title="Delete Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <ChevronRight className="w-4 h-4 text-ink-muted" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 px-4 text-center space-y-2">
              <Layers className="w-8 h-8 text-ink-muted mx-auto" />
              <p className="font-bold text-ink-primary text-sm">No inspections found</p>
              <p className="text-xs text-ink-secondary">
                No inspection records match the current filters. Start a new inspection to build your registry.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/scan')}
                className="mt-2"
              >
                Start New Inspection
              </Button>
            </div>
          )}
        </div>

        {/* Desktop Audit Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-cream-200/70 border-b border-cream-400 text-ink-secondary uppercase tracking-wider font-mono">
                <th className="py-3 px-4 font-bold">Inspection ID</th>
                <th className="py-3 px-4 font-bold">Commodity &amp; Brand</th>
                <th className="py-3 px-4 font-bold">Source</th>
                <th className="py-3 px-4 font-bold">Audit Date</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
                <th className="py-3 px-4 font-bold text-right">Score</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {filteredInspections.length > 0 ? (
                filteredInspections.map(rec => (
                  <tr
                    key={rec.id}
                    onClick={() => navigate(`/inspections/${rec.id}`)}
                    className="hover:bg-cream-200/50 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-forest-800 group-hover:text-forest-700">
                      {rec.id}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-ink-primary text-sm">
                        {rec.productName}
                      </div>
                      <div className="text-[11px] text-ink-muted">
                        {rec.brand} • {rec.inspectionLocation}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {renderSourceBadge(rec.source)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-ink-primary">{rec.date}</div>
                      <div className="text-[10px] text-ink-muted font-mono">{rec.timestamp || 'Recorded'}</div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={rec.overallStatus} size="sm" />
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-right text-ink-primary text-sm">
                      {rec.complianceScore}/100
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleDownloadPdf(e, rec)}
                          disabled={downloadingId === rec.id}
                          className="p-1.5 rounded hover:bg-cream-300 text-forest-800 font-semibold"
                          title="Generate PDF Report"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRecordToDelete(rec);
                          }}
                          className="p-1.5 rounded hover:bg-red-100 text-red-700"
                          title="Delete Inspection"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-md text-xs font-bold bg-cream-200 text-ink-primary group-hover:bg-forest-700 group-hover:text-white transition-colors inline-flex items-center gap-1"
                        >
                          <span>View</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ink-muted">
                    <Layers className="w-8 h-8 text-ink-muted mx-auto mb-2" />
                    <p className="text-sm font-semibold text-ink-primary">No inspection records found.</p>
                    <p className="text-xs text-ink-secondary mt-0.5">
                      No records match the current filter criteria.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('/scan')}
                      className="mt-3"
                    >
                      Start New Inspection
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <Modal
          isOpen={Boolean(recordToDelete)}
          onClose={() => setRecordToDelete(null)}
          title="Delete Inspection Record"
          subtitle={`Reference: ${recordToDelete.id}`}
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecordToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-[#991B1B] hover:bg-[#7F1D1D] text-white border-transparent"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-[#991B1B]">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Are you sure you want to delete this inspection record?</span>
                <p className="text-[11px] mt-0.5 text-red-900 leading-relaxed">
                  This will permanently remove <strong>{recordToDelete.productName}</strong> ({recordToDelete.id}) from the local statutory audit registry, including all associated OCR evidence, findings, and notes.
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </PageTransition>
  );
};
