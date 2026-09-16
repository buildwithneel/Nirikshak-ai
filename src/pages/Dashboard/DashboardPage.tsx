import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  ArrowRight,
  ShoppingBag,
  Type,
  Layers,
  Sparkles,
  Inbox,
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageTransition } from '../../components/motion/PageTransition';
import {
  mockDashboardStats,
  mockComplianceByCategory,
  mockViolationCategories,
  mockRecentInspections,
  mockInspectionActivityTrend,
} from '../../data/mockDashboard';
import { useLanguage } from '../../i18n/LanguageContext';
import { dashboardApi, DashboardStats } from '../../services/api/dashboardApi';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [liveStats, setLiveStats] = useState<any | null>(null);
  const [timeframe, setTimeframe] = useState('7d');
  const [entityFilter, setEntityFilter] = useState<'ALL' | 'COMPLAINTS' | 'INSPECTIONS' | 'REPORTS'>('ALL');
  const [workQueueTab, setWorkQueueTab] = useState<'ATTENTION' | 'PENDING' | 'COMPLAINTS' | 'RECENT'>('ATTENTION');
  const [workQueue, setWorkQueue] = useState<any>({
    requires_attention: [],
    pending_verification: [],
    recently_submitted_complaints: [],
    recently_updated: [],
  });
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  useEffect(() => {
    dashboardApi.getStats()
      .then(stats => setLiveStats(stats))
      .catch(err => console.warn('Using default dashboard metrics:', err));
  }, []);

  useEffect(() => {
    setIsLoadingQueue(true);
    dashboardApi.getWorkQueue(timeframe)
      .then(q => setWorkQueue(q))
      .catch(err => console.warn('Work queue load error:', err))
      .finally(() => setIsLoadingQueue(false));
  }, [timeframe]);

  const openComplaintsCount = liveStats?.openComplaints ?? (liveStats?.total_complaints || 0);
  const activeInspectionsCount = liveStats?.activeInspections ?? (liveStats?.total_inspections || 0);
  const pendingVerificationCount = liveStats?.pendingReview ?? (liveStats?.pending_review_inspections || 0);
  const reportsGeneratedCount = liveStats?.reportsGenerated ?? 0;

  return (
    <PageTransition className="space-y-4 sm:space-y-6 pb-8">
      {/* Officer Command Center Header (Section 19) */}
      <div className="bg-white rounded-2xl border border-institutional-border p-4 sm:p-6 shadow-subtle flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-page-enter">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-govgreen-900 font-mono">
            <span className="w-2 h-2 rounded-full bg-govgreen-800 inline-block animate-pulse" />
            <span>OFFICER COMMAND CENTER • CURRENT WORKLOAD</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-govink-primary tracking-tight mt-1">
            Good afternoon, Officer Portal
          </h1>
          <p className="text-xs sm:text-sm text-govink-secondary mt-1">
            Active statutory surveillance, prioritized work queue, and cross-panel enforcement intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="md"
            onClick={() => navigate('/check')}
            leftIcon={<ShoppingBag className="w-4 h-4 text-govteal-700" />}
          >
            {t('consumer.modeConsumer', 'Consumer View')}
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() => navigate('/inspections')}
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-govgreen-900" />}
          >
            {t('nav.history', 'Inspection History')}
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/scan')}
            leftIcon={<ScanLine className="w-4 h-4 text-white" />}
            className="shadow-subtle"
          >
            {t('nav.newInspection', 'New Inspection')}
          </Button>
        </div>
      </div>

      {/* Dashboard Filter Bar (Section 21) */}
      <div className="bg-white rounded-xl border border-institutional-border p-3 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold text-govink-secondary uppercase">Timeframe:</span>
          <div className="flex items-center gap-1 bg-institutional-subtle p-1 rounded-lg">
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: 'all', label: 'Custom' },
            ].map(tf => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                  timeframe === tf.id
                    ? 'bg-govgreen-800 text-white shadow-xs'
                    : 'text-govink-secondary hover:text-govink-primary'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold text-govink-secondary uppercase">Entity:</span>
          <div className="flex items-center gap-1 bg-institutional-subtle p-1 rounded-lg">
            {(['ALL', 'COMPLAINTS', 'INSPECTIONS', 'REPORTS'] as const).map(ent => (
              <button
                key={ent}
                onClick={() => setEntityFilter(ent)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                  entityFilter === ent
                    ? 'bg-govgreen-800 text-white shadow-xs'
                    : 'text-govink-secondary hover:text-govink-primary'
                }`}
              >
                {ent}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Primary Operational Stat Cards (Section 19) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-page-enter stagger-1">
        <StatCard
          title="Open Complaints"
          value={openComplaintsCount}
          subtitle="Citizen grievance queue"
          trend={{ value: 12.5, isPositiveGood: false, label: 'Awaiting Action' }}
          icon={<Inbox className="w-5 h-5" />}
          variant="violation"
        />

        <StatCard
          title="Active Inspections"
          value={activeInspectionsCount}
          subtitle="In-progress investigations"
          trend={{ value: 8.2, label: 'Active Pipeline' }}
          icon={<Layers className="w-5 h-5" />}
          variant="default"
        />

        <StatCard
          title="Pending Verification"
          value={pendingVerificationCount}
          subtitle="Requires officer sign-off"
          trend={{ value: 4.1, isPositiveGood: false, label: 'Immediate Attention' }}
          icon={<AlertTriangle className="w-5 h-5" />}
          variant="review"
        />

        <StatCard
          title="Reports Generated"
          value={reportsGeneratedCount}
          subtitle="Statutory PDF reports"
          trend={{ value: 15.0, isPositiveGood: true, label: 'Finalized Dossiers' }}
          icon={<CheckCircle2 className="w-5 h-5" />}
          variant="compliant"
        />
      </div>

      {/* Inspection Pipeline Stepper (Section 19) */}
      <div className="bg-white rounded-xl border border-institutional-border p-4 shadow-subtle space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-govink-primary uppercase tracking-wide">
            Statutory Inspection Pipeline
          </span>
          <span className="text-[11px] text-govink-muted">Linear Enforcement Lifecycle</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200">
            <span className="text-[10px] font-mono font-bold text-amber-900 block">STEP 1</span>
            <div className="font-bold text-govink-primary mt-0.5">Complaints</div>
            <div className="text-[11px] text-govink-secondary mt-1">{openComplaintsCount} Intake Cases</div>
          </div>
          <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200">
            <span className="text-[10px] font-mono font-bold text-blue-900 block">STEP 2</span>
            <div className="font-bold text-govink-primary mt-0.5">Under Review</div>
            <div className="text-[11px] text-govink-secondary mt-1">Preliminary Assessment</div>
          </div>
          <div className="p-3 rounded-lg bg-purple-50/70 border border-purple-200">
            <span className="text-[10px] font-mono font-bold text-purple-900 block">STEP 3</span>
            <div className="font-bold text-govink-primary mt-0.5">Inspection</div>
            <div className="text-[11px] text-govink-secondary mt-1">{activeInspectionsCount} Multi-Image OCR</div>
          </div>
          <div className="p-3 rounded-lg bg-teal-50/70 border border-teal-200">
            <span className="text-[10px] font-mono font-bold text-teal-900 block">STEP 4</span>
            <div className="font-bold text-govink-primary mt-0.5">Verification</div>
            <div className="text-[11px] text-govink-secondary mt-1">{pendingVerificationCount} Officer Protocols</div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 col-span-2 md:col-span-1">
            <span className="text-[10px] font-mono font-bold text-emerald-900 block">STEP 5</span>
            <div className="font-bold text-govink-primary mt-0.5">Report</div>
            <div className="text-[11px] text-govink-secondary mt-1">{reportsGeneratedCount} Legal Metrology PDFs</div>
          </div>
        </div>
      </div>

      {/* Real Officer Work Queue (Section 20) */}
      <div className="bg-white rounded-xl border border-institutional-border p-5 shadow-subtle space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-institutional-border flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-govink-primary uppercase tracking-wide font-mono">
              Officer Work Queue
            </h3>
            <p className="text-xs text-govink-secondary">
              Prioritized statutory cases requiring inspecting officer action.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-institutional-subtle p-1 rounded-lg overflow-x-auto text-xs">
            {[
              { id: 'ATTENTION', label: 'Requires Attention', count: workQueue.requires_attention?.length || 0 },
              { id: 'PENDING', label: 'Pending Verification', count: workQueue.pending_verification?.length || 0 },
              { id: 'COMPLAINTS', label: 'Recent Complaints', count: workQueue.recently_submitted_complaints?.length || 0 },
              { id: 'RECENT', label: 'Recently Updated', count: workQueue.recently_updated?.length || 0 },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setWorkQueueTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-md font-bold text-xs transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  workQueueTab === tab.id
                    ? 'bg-govgreen-800 text-white shadow-xs'
                    : 'text-govink-secondary hover:text-govink-primary'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  workQueueTab === tab.id ? 'bg-govgreen-950 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Work Queue Items List */}
        <div className="space-y-2.5">
          {(() => {
            const list =
              workQueueTab === 'ATTENTION'
                ? workQueue.requires_attention
                : workQueueTab === 'PENDING'
                ? workQueue.pending_verification
                : workQueueTab === 'COMPLAINTS'
                ? workQueue.recently_submitted_complaints
                : workQueue.recently_updated;

            if (!list || list.length === 0) {
              return (
                <div className="p-8 text-center text-xs text-govink-muted bg-gray-50 rounded-lg">
                  No items in this queue category.
                </div>
              );
            }

            return list.map((item: any, idx: number) => (
              <div
                key={item.id || idx}
                className="p-3.5 rounded-lg border border-institutional-border bg-institutional-subtle/30 hover:bg-institutional-subtle/70 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-govink-primary">
                      {item.reference || item.id}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase">
                      {item.status?.replace('_', ' ')}
                    </span>
                    {item.signal && (
                      <span className="text-[10px] text-red-700 font-bold bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                        {item.signal}
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-sm text-govink-primary">
                    {item.product_name}
                  </div>
                  <div className="text-[11px] text-govink-secondary">
                    {item.consumer_email && <span>From: {item.consumer_email} • </span>}
                    <span>Last updated: {new Date(item.updated_at || item.created_at || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(item.url || `/inspections/${item.id}/workspace`)}
                  className="text-xs self-start sm:self-center"
                >
                  Open Workspace
                </Button>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Main Grid: Activity Chart & Violation Categories (Staggered Entrance 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 animate-page-enter stagger-2">
        {/* Compliance Activity & Velocity (2 cols) */}
        <div className="lg:col-span-2">
          <Card
            title={t('dashboard.weeklyActivity', 'Inspection Activity & Velocity')}
            subtitle="Recent 7-day inspection volume classified by conformity status"
            action={
              <Link to="/analytics" className="text-xs text-forest-700 font-bold hover:underline flex items-center gap-1">
                <span>Analytics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-4 sm:pt-6 pb-2 items-end h-40 sm:h-44">
                {mockInspectionActivityTrend.map((day, idx) => {
                  const total = day.compliant + day.review + day.violation;
                  const maxTotal = 67;
                  const heightPercent = Math.round((total / maxTotal) * 100);

                  return (
                    <div key={idx} className="flex flex-col items-center h-full justify-end group cursor-pointer">
                      <div className="text-[9px] sm:text-[10px] text-ink-muted font-mono mb-1 font-bold">
                        {total}
                      </div>

                      {/* Stacked Bar */}
                      <div
                        className="w-full max-w-[28px] sm:max-w-[32px] rounded-t-md overflow-hidden flex flex-col-reverse transition-all group-hover:brightness-95"
                        style={{ height: `${heightPercent}%` }}
                      >
                        <div
                          className="w-full bg-[#059669]"
                          style={{ height: `${(day.compliant / total) * 100}%` }}
                          title={`Compliant: ${day.compliant}`}
                        />
                        <div
                          className="w-full bg-[#D97706]"
                          style={{ height: `${(day.review / total) * 100}%` }}
                          title={`Requires Review: ${day.review}`}
                        />
                        <div
                          className="w-full bg-[#DC2626]"
                          style={{ height: `${(day.violation / total) * 100}%` }}
                          title={`Potential Violations: ${day.violation}`}
                        />
                      </div>

                      <span className="text-[9px] sm:text-[10px] text-ink-secondary font-mono mt-2 truncate w-full text-center">
                        {day.date}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Chart Legend */}
              <div className="flex flex-wrap items-center justify-between pt-3 border-t border-cream-300 text-xs text-ink-secondary gap-2">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-[#059669]" />
                    <span>Compliant</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-[#D97706]" />
                    <span>Review</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-[#DC2626]" />
                    <span>Violations</span>
                  </div>
                </div>
                <span className="text-[11px] text-ink-muted">
                  Standard benchmark: ≥85%
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Top Violation Categories (1 col) */}
        <div>
          <Card
            title={t('dashboard.statutoryFindings', 'Common Statutory Findings')}
            subtitle="Frequent infractions under Rule 6 &amp; 9"
            action={
              <Link to="/rules" className="text-xs text-forest-700 font-bold hover:underline">
                Rules
              </Link>
            }
          >
            <div className="space-y-3">
              {mockViolationCategories.map((v, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink-primary line-clamp-1">
                      {v.name}
                    </span>
                    <span className="font-mono font-bold text-ink-secondary ml-2">
                      {v.count}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-institutional-border overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        i === 0 ? 'bg-govred-700' : i === 1 ? 'bg-govamber-700' : 'bg-govgreen-900'
                      }`}
                      style={{ width: `${v.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Commodity Sector Breakdown Table (Staggered Entrance 3) */}
      <div className="animate-page-enter stagger-3">
        <Card
          title={t('dashboard.commoditySectors', 'Commodity Sector Compliance Breakdown')}
          subtitle="Enforcement audit distribution across primary packaged product sectors"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-institutional-border text-govink-secondary uppercase tracking-wider font-mono">
                  <th className="pb-3 font-bold">Commodity Sector</th>
                  <th className="pb-3 font-bold text-right">Total Inspected</th>
                  <th className="pb-3 font-bold text-right">Compliant</th>
                  <th className="pb-3 font-bold text-right">Review Needed</th>
                  <th className="pb-3 font-bold text-right">Violations</th>
                  <th className="pb-3 font-bold text-right">Compliance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-institutional-border">
                {mockComplianceByCategory.map((cat, idx) => (
                  <tr key={idx} className="hover:bg-institutional-subtle/50 transition-colors">
                    <td className="py-3 font-bold text-govink-primary">{cat.category}</td>
                    <td className="py-3 font-mono text-right text-govink-secondary">{cat.total}</td>
                    <td className="py-3 font-mono text-right text-govgreen-900 font-bold">{cat.compliant}</td>
                    <td className="py-3 font-mono text-right text-govamber-800 font-bold">{cat.review}</td>
                    <td className="py-3 font-mono text-right text-govred-800 font-bold">{cat.violation}</td>
                    <td className="py-3 text-right">
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-institutional-subtle text-govink-primary border border-institutional-border">
                        {cat.rate}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Recent Field Inspections & Future Feature Cards (Staggered Entrance 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 animate-page-enter stagger-4">
        {/* Recent Inspections Table (2 cols) */}
        <div className="lg:col-span-2">
          <Card
            title={t('dashboard.recentInspections', 'Recent Field Inspections')}
            subtitle="Latest packaged commodities submitted for Legal Metrology AI evaluation"
            action={
              <Link to="/inspections" className="text-xs text-govgreen-900 font-bold hover:underline flex items-center gap-1">
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-institutional-border text-govink-secondary uppercase tracking-wider font-mono">
                    <th className="pb-3 font-bold">Inspection ID</th>
                    <th className="pb-3 font-bold">Product / Commodity</th>
                    <th className="pb-3 font-bold">Date</th>
                    <th className="pb-3 font-bold">Status</th>
                    <th className="pb-3 font-bold text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-institutional-border">
                  {mockRecentInspections.map((rec) => (
                    <tr
                      key={rec.id}
                      onClick={() => navigate(rec.id === 'LM-2026-001284' ? '/scan/result' : `/inspections/${rec.id}`)}
                      className="hover:bg-institutional-subtle/50 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 font-mono font-bold text-govgreen-900 group-hover:text-govgreen-800">
                        {rec.id}
                      </td>
                      <td className="py-3">
                        <div className="font-bold text-govink-primary">{rec.productName}</div>
                        <div className="text-[10px] text-govink-muted">{rec.brand} • {rec.category}</div>
                      </td>
                      <td className="py-3 text-govink-secondary font-mono">
                        {rec.date}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={rec.status as any} size="sm" />
                      </td>
                      <td className="py-3 font-mono font-bold text-right text-govink-primary">
                        {rec.score}/100
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Future Capabilities Cards */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-institutional-border shadow-subtle space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-govteal-50 text-govteal-700 border border-govteal-200">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <StatusBadge status="COMING_SOON" size="sm" />
            </div>
            <h4 className="font-bold text-sm text-govink-primary">E-Commerce Compliance</h4>
            <p className="text-xs text-govink-secondary leading-relaxed">
              Compare online marketplace product listings with physical packaging to detect digital declaration discrepancies under Rule 6(10).
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 border border-institutional-border shadow-subtle space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-govnavy-100 text-govnavy-900 border border-govnavy-200">
                <Type className="w-4 h-4" />
              </div>
              <StatusBadge status="NEXT_PHASE" size="sm" />
            </div>
            <h4 className="font-bold text-sm text-govink-primary">Font-Size &amp; Readability Engine</h4>
            <p className="text-xs text-govink-secondary leading-relaxed">
              Calibrate physical character height in millimeters against Table 1 of Rule 9 based on package net quantity brackets.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};
