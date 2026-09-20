import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
  ShoppingBag,
  Type,
  Layers,
  Inbox,
  Download,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageTransition } from '../../components/motion/PageTransition';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { AppAlreadyInstalledModal } from '../../components/common/AppAlreadyInstalledModal';
import {
  mockComplianceByCategory,
  mockViolationCategories,
  mockRecentInspections,
  mockInspectionActivityTrend,
} from '../../data/mockDashboard';
import { useLanguage } from '../../i18n/LanguageContext';
import { dashboardApi } from '../../services/api/dashboardApi';

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

  const {
    isInstalled,
    isDownloaded,
    triggerDownloadOrInstall,
    showAlreadyInstalledDialog,
    setShowAlreadyInstalledDialog,
    installedAt,
    markAsUninstalledForTesting,
  } = usePwaInstall();

  useEffect(() => {
    dashboardApi.getStats()
      .then((stats) => setLiveStats(stats))
      .catch((err) => console.warn('Using default dashboard metrics:', err));
  }, []);

  useEffect(() => {
    dashboardApi.getWorkQueue(timeframe)
      .then((q) => setWorkQueue(q))
      .catch((err) => console.warn('Work queue load error:', err));
  }, [timeframe]);

  const openComplaintsCount = liveStats?.openComplaints ?? (liveStats?.total_complaints || 0);
  const activeInspectionsCount = liveStats?.activeInspections ?? (liveStats?.total_inspections || 0);
  const pendingVerificationCount = liveStats?.pendingReview ?? (liveStats?.pending_review_inspections || 0);
  const reportsGeneratedCount = liveStats?.reportsGenerated ?? 0;

  return (
    <PageTransition className="space-y-4 sm:space-y-6 pb-8">
      {/* Officer Command Center Header */}
      <div className="bg-white dark:bg-[#131B17] rounded-2xl border border-institutional-200 dark:border-institutional-800 p-4 sm:p-6 shadow-subtle flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-page-enter transition-colors">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-govgreen-800 dark:text-govgreen-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-govgreen-600 dark:bg-govgreen-400 inline-block animate-pulse" />
            <span>OFFICER COMMAND CENTER • CURRENT WORKLOAD</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-institutional-900 dark:text-white tracking-tight mt-1 font-display">
            Good afternoon, Officer Portal
          </h1>
          <p className="text-xs sm:text-sm text-institutional-600 dark:text-institutional-400 mt-1">
            Active statutory surveillance, prioritized work queue, and cross-panel enforcement intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Download App / PWA Button on Dashboard */}
          <Button
            variant="outline"
            size="md"
            onClick={triggerDownloadOrInstall}
            leftIcon={
              isDownloaded ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Download className="w-4 h-4 text-[#16A34A]" />
              )
            }
            className={`rounded-xl transition-all cursor-pointer ${
              isDownloaded
                ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 font-bold'
                : 'border-institutional-300 dark:border-institutional-700 hover:border-[#16A34A] text-[#0B2545] dark:text-white font-bold'
            }`}
            title={isDownloaded ? 'Nirikshak-AI is already downloaded on this device' : 'Download and install Nirikshak-AI for offline mobile inspections'}
          >
            {isDownloaded ? 'App Downloaded' : 'Download App'}
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() => navigate('/check')}
            leftIcon={<ShoppingBag className="w-4 h-4 text-govteal-600 dark:text-govteal-400" />}
            className="rounded-xl"
          >
            {t('consumer.modeConsumer', 'Consumer View')}
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() => navigate('/inspections')}
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-govgreen-700 dark:text-govgreen-400" />}
            className="rounded-xl"
          >
            {t('nav.history', 'Inspection History')}
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/scan')}
            leftIcon={<ScanLine className="w-4 h-4 text-white" />}
            className="shadow-subtle bg-govgreen-800 hover:bg-govgreen-900 text-white rounded-xl"
          >
            {t('nav.newInspection', 'New Inspection')}
          </Button>
        </div>
      </div>

      {/* Dashboard Filter Bar */}
      <div className="bg-white dark:bg-[#131B17] rounded-2xl border border-institutional-200 dark:border-institutional-800 p-3 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-colors">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold text-institutional-500 dark:text-institutional-400 uppercase">Timeframe:</span>
          <div className="flex items-center gap-1 bg-institutional-100 dark:bg-[#1C2721] p-1 rounded-xl">
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: 'all', label: 'Custom' },
            ].map((tf) => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setTimeframe(tf.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  timeframe === tf.id
                    ? 'bg-govgreen-800 text-white shadow-xs'
                    : 'text-institutional-600 dark:text-institutional-400 hover:text-institutional-900 dark:hover:text-white'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold text-institutional-500 dark:text-institutional-400 uppercase">Entity:</span>
          <div className="flex items-center gap-1 bg-institutional-100 dark:bg-[#1C2721] p-1 rounded-xl">
            {(['ALL', 'COMPLAINTS', 'INSPECTIONS', 'REPORTS'] as const).map((ent) => (
              <button
                key={ent}
                type="button"
                onClick={() => setEntityFilter(ent)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  entityFilter === ent
                    ? 'bg-govgreen-800 text-white shadow-xs'
                    : 'text-institutional-600 dark:text-institutional-400 hover:text-institutional-900 dark:hover:text-white'
                }`}
              >
                {ent}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Primary Operational Stat Cards */}
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
          trend={{ value: 4.1, isPositiveGood: false, label: 'Immediate Action' }}
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

      {/* Statutory Inspection Pipeline Stepper */}
      <div className="bg-white dark:bg-[#131B17] rounded-2xl border border-institutional-200 dark:border-institutional-800 p-4 sm:p-5 shadow-subtle space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-institutional-900 dark:text-white uppercase tracking-wide">
            Statutory Inspection Pipeline
          </span>
          <span className="text-[11px] text-institutional-700 dark:text-institutional-300 font-semibold">Linear Enforcement Lifecycle</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
            <span className="text-[10px] font-mono font-bold text-amber-800 dark:text-amber-400 block">STEP 1</span>
            <div className="font-bold text-institutional-900 dark:text-white mt-0.5">Complaints</div>
            <div className="text-[11px] font-medium text-institutional-700 dark:text-institutional-300 mt-1 tabular-nums">{openComplaintsCount} Intake Cases</div>
          </div>
          <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
            <span className="text-[10px] font-mono font-bold text-blue-800 dark:text-blue-400 block">STEP 2</span>
            <div className="font-bold text-institutional-900 dark:text-white mt-0.5">Under Review</div>
            <div className="text-[11px] font-medium text-institutional-700 dark:text-institutional-300 mt-1">Preliminary Assessment</div>
          </div>
          <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50">
            <span className="text-[10px] font-mono font-bold text-purple-800 dark:text-purple-400 block">STEP 3</span>
            <div className="font-bold text-institutional-900 dark:text-white mt-0.5">Inspection</div>
            <div className="text-[11px] font-medium text-institutional-700 dark:text-institutional-300 mt-1 tabular-nums">{activeInspectionsCount} Multi-Image OCR</div>
          </div>
          <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50">
            <span className="text-[10px] font-mono font-bold text-teal-800 dark:text-teal-400 block">STEP 4</span>
            <div className="font-bold text-institutional-900 dark:text-white mt-0.5">Verification</div>
            <div className="text-[11px] font-medium text-institutional-700 dark:text-institutional-300 mt-1 tabular-nums">{pendingVerificationCount} Officer Protocols</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 col-span-2 md:col-span-1">
            <span className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-400 block">STEP 5</span>
            <div className="font-bold text-institutional-900 dark:text-white mt-0.5">Report</div>
            <div className="text-[11px] font-medium text-institutional-700 dark:text-institutional-300 mt-1 tabular-nums">{reportsGeneratedCount} Legal Metrology PDFs</div>
          </div>
        </div>
      </div>

      {/* PWA Download & Single-Instance Active Banner */}
      <div className="bg-gradient-to-r from-[#0B2545] via-[#0F3661] to-[#14532D] rounded-2xl p-4 sm:p-5 text-white shadow-elevated flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-page-enter">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md p-2 flex items-center justify-center shrink-0 border border-white/20 shadow-xs">
            {isDownloaded ? (
              <ShieldCheck className="w-6 h-6 text-[#22C55E]" />
            ) : (
              <Download className="w-6 h-6 text-[#22C55E]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm sm:text-base">
                {isDownloaded ? 'Nirikshak-AI Installed on this Device' : 'Download Nirikshak-AI Mobile App'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-white/90">
                {isDownloaded ? 'Single-Instance Active' : 'Offline PWA Ready'}
              </span>
            </div>
            <p className="text-xs text-white/80 mt-1 max-w-xl leading-relaxed">
              {isDownloaded
                ? 'Nirikshak-AI is registered as a single instance on this device. Offline field OCR and Legal Metrology Rule 6 engine are ready.'
                : 'Download Nirikshak-AI to your phone or desktop for rapid offline field inspections, camera OCR, and instant reports.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={triggerDownloadOrInstall}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
            isDownloaded
              ? 'bg-white/15 hover:bg-white/25 text-white border border-white/25'
              : 'bg-[#22C55E] hover:bg-[#16A34A] text-white'
          }`}
        >
          {isDownloaded ? (
            <>
              <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
              <span>Installed (View Status)</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Download App</span>
            </>
          )}
        </button>
      </div>

      {/* Real Officer Work Queue */}
      <div className="bg-white dark:bg-[#131B17] rounded-2xl border border-institutional-200 dark:border-institutional-800 p-5 shadow-subtle space-y-4 transition-colors">
        <div className="flex items-center justify-between pb-2 border-b border-institutional-100 dark:border-institutional-800 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-institutional-900 dark:text-white uppercase tracking-wide font-mono">
              Officer Work Queue
            </h3>
            <p className="text-xs text-institutional-500 dark:text-institutional-400">
              Prioritized statutory cases requiring inspecting officer action.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-institutional-100 dark:bg-[#1C2721] p-1 rounded-xl overflow-x-auto text-xs">
            {[
              { id: 'ATTENTION', label: 'Requires Attention', count: workQueue.requires_attention?.length || 0 },
              { id: 'PENDING', label: 'Pending Verification', count: workQueue.pending_verification?.length || 0 },
              { id: 'COMPLAINTS', label: 'Recent Complaints', count: workQueue.recently_submitted_complaints?.length || 0 },
              { id: 'RECENT', label: 'Recently Updated', count: workQueue.recently_updated?.length || 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setWorkQueueTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  workQueueTab === tab.id
                    ? 'bg-govgreen-800 text-white shadow-xs'
                    : 'text-institutional-600 dark:text-institutional-400 hover:text-institutional-900 dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                  workQueueTab === tab.id ? 'bg-govgreen-950 text-white' : 'bg-institutional-200 dark:bg-[#28382F] text-institutional-700 dark:text-institutional-300'
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
                <div className="p-8 text-center text-xs text-institutional-400 bg-institutional-50 dark:bg-[#19241F] rounded-xl border border-institutional-100 dark:border-institutional-800/80">
                  No items in this queue category.
                </div>
              );
            }

            return list.map((item: any, idx: number) => (
              <div
                key={item.id || idx}
                className="p-3.5 rounded-xl border border-institutional-100 dark:border-institutional-800/80 bg-institutional-50/50 dark:bg-[#18231E]/60 hover:bg-institutional-100/70 dark:hover:bg-[#1E2C26] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-institutional-900 dark:text-white tabular-nums">
                      {item.reference || item.id}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 uppercase">
                      {item.status?.replace('_', ' ')}
                    </span>
                    {item.signal && (
                      <span className="text-[10px] text-red-700 dark:text-red-300 font-bold bg-red-50 dark:bg-red-950/60 px-1.5 py-0.2 rounded border border-red-200 dark:border-red-800">
                        {item.signal}
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-sm text-institutional-900 dark:text-white">
                    {item.product_name}
                  </div>
                  <div className="text-[11px] text-institutional-500 dark:text-institutional-400">
                    {item.consumer_email && <span>From: {item.consumer_email} • </span>}
                    <span className="tabular-nums">Last updated: {new Date(item.updated_at || item.created_at || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(item.url || `/inspections/${item.id}/workspace`)}
                  className="text-xs self-start sm:self-center rounded-xl"
                >
                  Open Workspace
                </Button>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Main Grid: Activity Chart & Violation Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 animate-page-enter stagger-2">
        {/* Compliance Activity & Velocity (2 cols) */}
        <div className="lg:col-span-2">
          <Card
            title={t('dashboard.weeklyActivity', 'Inspection Activity & Velocity')}
            subtitle="Recent 7-day inspection volume classified by conformity status"
            action={
              <Link to="/analytics" className="text-xs text-govgreen-700 dark:text-govgreen-400 font-bold hover:underline flex items-center gap-1">
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
                      <div className="text-[9px] sm:text-[10px] text-institutional-700 dark:text-institutional-300 font-mono mb-1 font-bold tabular-nums">
                        {total}
                      </div>

                      {/* Stacked Bar */}
                      <div
                        className="w-full max-w-[28px] sm:max-w-[32px] rounded-t-md overflow-hidden flex flex-col-reverse transition-all group-hover:brightness-110"
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

                      <span className="text-[9px] sm:text-[10px] text-institutional-700 dark:text-institutional-300 font-mono mt-2 truncate w-full text-center">
                        {day.date}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Chart Legend */}
              <div className="flex flex-wrap items-center justify-between pt-3 border-t border-institutional-100 dark:border-institutional-800 text-xs text-institutional-700 dark:text-institutional-300 font-medium gap-2">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
                    <span>Compliant</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                    <span>Review</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
                    <span>Violations</span>
                  </div>
                </div>
                <span className="text-[11px] text-institutional-700 dark:text-institutional-300 font-medium">
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
            subtitle="Frequent infractions under Rule 6 & 9"
            action={
              <Link to="/rules" className="text-xs text-govgreen-700 dark:text-govgreen-400 font-bold hover:underline">
                Rules
              </Link>
            }
          >
            <div className="space-y-3">
              {mockViolationCategories.map((v, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-institutional-800 dark:text-institutional-200 line-clamp-1">
                      {v.name}
                    </span>
                    <span className="font-mono font-bold text-institutional-700 dark:text-institutional-300 ml-2 tabular-nums">
                      {v.count}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-institutional-200 dark:bg-institutional-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        i === 0 ? 'bg-govred-600 dark:bg-govred-500' : i === 1 ? 'bg-amber-600 dark:bg-amber-500' : 'bg-govgreen-700 dark:bg-govgreen-500'
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

      {/* Commodity Sector Breakdown Table */}
      <div className="animate-page-enter stagger-3">
        <Card
          title={t('dashboard.commoditySectors', 'Commodity Sector Compliance Breakdown')}
          subtitle="Enforcement audit distribution across primary packaged product sectors"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-institutional-200 dark:border-institutional-800 text-institutional-700 dark:text-institutional-300 uppercase tracking-wider font-mono font-semibold">
                  <th className="pb-3 font-bold">Commodity Sector</th>
                  <th className="pb-3 font-bold text-right">Total Inspected</th>
                  <th className="pb-3 font-bold text-right">Compliant</th>
                  <th className="pb-3 font-bold text-right">Review Needed</th>
                  <th className="pb-3 font-bold text-right">Violations</th>
                  <th className="pb-3 font-bold text-right">Compliance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-institutional-100 dark:divide-institutional-800/70">
                {mockComplianceByCategory.map((cat, idx) => (
                  <tr key={idx} className="hover:bg-institutional-50/70 dark:hover:bg-[#1A2420]/70 transition-colors">
                    <td className="py-3 font-semibold text-institutional-900 dark:text-white">
                      {cat.category}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-institutional-700 dark:text-institutional-300 tabular-nums">
                      {cat.total}
                    </td>
                    <td className="py-3 text-right font-mono text-govgreen-700 dark:text-govgreen-400 font-bold tabular-nums">
                      {cat.compliant}
                    </td>
                    <td className="py-3 text-right font-mono text-amber-700 dark:text-amber-400 font-bold tabular-nums">
                      {cat.review}
                    </td>
                    <td className="py-3 text-right font-mono text-govred-600 dark:text-govred-400 font-bold tabular-nums">
                      {cat.violation}
                    </td>
                    <td className="py-3 text-right">
                      <span className="font-mono font-bold px-2 py-0.5 rounded-lg bg-institutional-100 dark:bg-[#1C2721] text-institutional-900 dark:text-white border border-institutional-200 dark:border-institutional-800 tabular-nums">
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

      {/* Recent Statutory Audits & Future Capabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 animate-page-enter stagger-4">
        {/* Recent Inspections Table (2 cols) */}
        <div className="lg:col-span-2">
          <Card
            title={t('dashboard.recentAudits', 'Recent Statutory Inspections')}
            subtitle="Verified package audit logs under Legal Metrology enforcement"
            action={
              <button
                type="button"
                onClick={() => navigate('/inspections')}
                className="text-xs text-govgreen-800 dark:text-govgreen-300 font-bold hover:underline cursor-pointer"
              >
                {t('dashboard.viewAllAudits', 'View All Records')} &rarr;
              </button>
            }
          >
            {/* Mobile Cards View (<sm screens) */}
            <div className="sm:hidden space-y-3">
              {mockRecentInspections.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => navigate(rec.id === 'LM-2026-001284' ? '/scan/result' : `/inspections/${rec.id}`)}
                  className="p-3.5 rounded-xl border border-institutional-200 dark:border-institutional-800 bg-institutional-50/50 dark:bg-[#1A2420]/50 space-y-2 cursor-pointer active:scale-98 transition-transform"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-govgreen-700 dark:text-govgreen-400">
                        {rec.id}
                      </span>
                      <div className="font-bold text-sm text-institutional-900 dark:text-white mt-0.5">
                        {rec.productName}
                      </div>
                      <div className="text-xs text-institutional-700 dark:text-institutional-300 font-medium">
                        {rec.brand} • {rec.category}
                      </div>
                    </div>
                    <StatusBadge status={rec.status as any} size="sm" />
                  </div>

                  <div className="flex items-center justify-between text-xs text-institutional-700 dark:text-institutional-300 font-medium pt-1">
                    <span className="font-mono text-[11px] tabular-nums">{rec.date}</span>
                    <div className="flex items-center gap-1 font-mono text-xs font-bold text-institutional-900 dark:text-white bg-institutional-100 dark:bg-[#1C2721] px-2 py-0.5 rounded-lg border border-institutional-200 dark:border-institutional-800 tabular-nums">
                      <span>Score:</span>
                      <span className="text-govgreen-700 dark:text-govgreen-400">{rec.score}/100</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>=sm screens) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[580px]">
                <thead>
                  <tr className="border-b border-institutional-200 dark:border-institutional-800 text-institutional-700 dark:text-institutional-300 uppercase tracking-wider font-mono font-semibold">
                    <th className="pb-3 font-bold">Inspection ID</th>
                    <th className="pb-3 font-bold">Product / Commodity</th>
                    <th className="pb-3 font-bold">Date</th>
                    <th className="pb-3 font-bold">Status</th>
                    <th className="pb-3 font-bold text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-institutional-100 dark:divide-institutional-800/70">
                  {mockRecentInspections.map((rec) => (
                    <tr
                      key={rec.id}
                      onClick={() => navigate(rec.id === 'LM-2026-001284' ? '/scan/result' : `/inspections/${rec.id}`)}
                      className="hover:bg-institutional-50/70 dark:hover:bg-[#1A2420]/70 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 font-mono font-bold text-govgreen-700 dark:text-govgreen-400 group-hover:underline tabular-nums">
                        {rec.id}
                      </td>
                      <td className="py-3">
                        <div className="font-bold text-institutional-900 dark:text-white">{rec.productName}</div>
                        <div className="text-[11px] text-institutional-600 dark:text-institutional-300 font-medium">{rec.brand} • {rec.category}</div>
                      </td>
                      <td className="py-3 text-institutional-600 dark:text-institutional-300 font-mono tabular-nums whitespace-nowrap">
                        {rec.date}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={rec.status as any} size="sm" />
                      </td>
                      <td className="py-3 font-mono font-bold text-right text-institutional-900 dark:text-white tabular-nums">
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
          <div className="bg-white dark:bg-[#131B17] rounded-2xl p-4 sm:p-5 border border-institutional-200 dark:border-institutional-800 shadow-subtle space-y-2 transition-colors">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-govteal-50 dark:bg-govteal-950/60 text-govteal-700 dark:text-govteal-400 border border-govteal-200 dark:border-govteal-800">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <StatusBadge status="COMING_SOON" size="sm" />
            </div>
            <h4 className="font-bold text-sm text-institutional-900 dark:text-white">E-Commerce Compliance</h4>
            <p className="text-xs font-medium text-institutional-700 dark:text-institutional-300 leading-relaxed">
              Compare online marketplace product listings with physical packaging to detect digital declaration discrepancies under Rule 6(10).
            </p>
          </div>

          <div className="bg-white dark:bg-[#131B17] rounded-2xl p-4 sm:p-5 border border-institutional-200 dark:border-institutional-800 shadow-subtle space-y-2 transition-colors">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                <Type className="w-4 h-4" />
              </div>
              <StatusBadge status="NEXT_PHASE" size="sm" />
            </div>
            <h4 className="font-bold text-sm text-institutional-900 dark:text-white">Font-Size & Readability Engine</h4>
            <p className="text-xs font-medium text-institutional-700 dark:text-institutional-300 leading-relaxed">
              Calibrate physical character height in millimeters against Table 1 of Rule 9 based on package net quantity brackets.
            </p>
          </div>
        </div>
      </div>

      {/* App Already Downloaded / Installed Dialogue Box */}
      <AppAlreadyInstalledModal
        isOpen={showAlreadyInstalledDialog}
        onClose={() => setShowAlreadyInstalledDialog(false)}
        isStandalone={isInstalled}
        installedAt={installedAt}
        onReinstallTest={markAsUninstalledForTesting}
      />
    </PageTransition>
  );
};
export default DashboardPage;
