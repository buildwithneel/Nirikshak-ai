import React, { useEffect, useState } from 'react';
import {
  Download,
  Calendar,
  AlertTriangle,
  FileText,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Layers,
  PieChart,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { useLanguage } from '../../i18n/LanguageContext';
import { PageTransition } from '../../components/motion/PageTransition';
import {
  analyticsApi,
  AnalyticsOverview,
  AnalyticsTrends,
  AnalyticsCategories,
  ReviewSignals,
} from '../../services/api/analyticsApi';

export const AnalyticsPage: React.FC = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'all' | '7d' | '30d' | '90d'>('30d');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [trends, setTrends] = useState<AnalyticsTrends | null>(null);
  const [categories, setCategories] = useState<AnalyticsCategories | null>(null);
  const [signals, setSignals] = useState<ReviewSignals | null>(null);

  const calculateDateRange = (range: 'all' | '7d' | '30d' | '90d') => {
    if (range === 'all') {
      return { from: undefined, to: undefined };
    }
    const now = new Date();
    const to = now.toISOString();
    let days = 30;
    if (range === '7d') days = 7;
    if (range === '90d') days = 90;
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    return { from, to };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const dates = fromDate && toDate ? { from: fromDate, to: toDate } : calculateDateRange(timeRange);
      const [ovData, trData, catData, sigData] = await Promise.all([
        analyticsApi.getOverview(dates.from, dates.to).catch(() => null),
        analyticsApi.getTrends().catch(() => null),
        analyticsApi.getCategories().catch(() => null),
        analyticsApi.getReviewSignals().catch(() => null),
      ]);
      setOverview(ovData);
      setTrends(trData);
      setCategories(catData);
      setSignals(sigData);
    } catch (err) {
      console.error('Failed to load analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const handleApplyCustomDates = () => {
    loadData();
  };

  return (
    <PageTransition className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-16">
      <Breadcrumbs items={[{ label: t('nav.analytics', 'Analytics') }]} />

      {/* Header */}
      <div className="bg-white rounded-2xl border border-govborder-subtle p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-xs font-mono font-bold uppercase text-govgreen-800 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-govgreen-600 animate-pulse" />
            ENFORCEMENT INTELLIGENCE & PATTERN SURVEILLANCE
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-govink-primary tracking-tight mt-1">
            {t('nav.analytics', 'Compliance Analytics & Trends')}
          </h1>
          <p className="text-xs sm:text-sm text-govink-secondary mt-1">
            Real-time aggregate compliance data, cross-image OCR review signals, and commodity pattern analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.print()}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export Digest
          </Button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-cream-100 rounded-xl border border-cream-400 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-cream-400 shadow-sm">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
              timeRange === '7d' ? 'bg-forest-700 text-white shadow-xs' : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
              timeRange === '30d' ? 'bg-forest-700 text-white shadow-xs' : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeRange('90d')}
            className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
              timeRange === '90d' ? 'bg-forest-700 text-white shadow-xs' : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            Last 90 Days
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
              timeRange === 'all' ? 'bg-forest-700 text-white shadow-xs' : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            All-Time
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-cream-400">
            <Calendar className="w-3.5 h-3.5 text-ink-muted" />
            <span className="text-[11px] text-ink-muted">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="text-xs bg-transparent focus:outline-none"
            />
            <span className="text-[11px] text-ink-muted ml-1">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="text-xs bg-transparent focus:outline-none"
            />
          </div>
          {fromDate && toDate && (
            <Button size="sm" variant="outline" onClick={handleApplyCustomDates}>
              Apply
            </Button>
          )}
        </div>
      </div>

      {/* Top Level KPIs Grid: Inspections & Complaints */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Inspection Surveillance Overview */}
        <Card
          title="Inspection Surveillance Performance"
          subtitle="Legal Metrology verification throughput & verification status"
        >
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white rounded-xl border border-cream-400 shadow-2xs">
                <span className="text-[10px] font-bold text-ink-muted uppercase font-mono block">Total Inspections</span>
                <span className="text-xl sm:text-2xl font-black text-ink-primary font-mono mt-0.5 block">
                  {overview?.inspections.total ?? 0}
                </span>
                <span className="text-[10px] text-ink-muted flex items-center gap-1 mt-1">
                  <FileText className="w-3 h-3 text-forest-700" /> All commodities
                </span>
              </div>

              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 shadow-2xs">
                <span className="text-[10px] font-bold text-amber-800 uppercase font-mono block">Active / Scanned</span>
                <span className="text-xl sm:text-2xl font-black text-amber-900 font-mono mt-0.5 block">
                  {overview?.inspections.active ?? 0}
                </span>
                <span className="text-[10px] text-amber-700 block mt-1">In progress</span>
              </div>

              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 shadow-2xs">
                <span className="text-[10px] font-bold text-indigo-800 uppercase font-mono block">Pending Review</span>
                <span className="text-xl sm:text-2xl font-black text-indigo-900 font-mono mt-0.5 block">
                  {overview?.inspections.pending_verification ?? 0}
                </span>
                <span className="text-[10px] text-indigo-700 block mt-1">Awaiting sign-off</span>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase font-mono block">Completed</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-900 font-mono mt-0.5 block">
                  {overview?.inspections.completed ?? 0}
                </span>
                <span className="text-[10px] text-emerald-700 block mt-1">Verified &amp; archived</span>
              </div>
            </div>

            <div className="p-3.5 bg-cream-200/50 rounded-xl border border-cream-400 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-ink-primary block">Average Commodity Compliance Score</span>
                <span className="text-[11px] text-ink-muted">Calculated across statutory declaration compliance models</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black font-mono text-forest-800">
                  {overview?.inspections.average_compliance_score ?? 0}%
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Consumer Grievance Overview */}
        <Card
          title="Consumer Grievance Intake"
          subtitle="Citizen complaints submitted and converted to surveillance workflows"
        >
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white rounded-xl border border-cream-400 shadow-2xs">
                <span className="text-[10px] font-bold text-ink-muted uppercase font-mono block">Total Received</span>
                <span className="text-xl sm:text-2xl font-black text-ink-primary font-mono mt-0.5 block">
                  {overview?.complaints.total ?? 0}
                </span>
                <span className="text-[10px] text-ink-muted flex items-center gap-1 mt-1">
                  <MessageSquare className="w-3 h-3 text-sky-700" /> Public intake
                </span>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 shadow-2xs">
                <span className="text-[10px] font-bold text-blue-800 uppercase font-mono block">New / Submitted</span>
                <span className="text-xl sm:text-2xl font-black text-blue-900 font-mono mt-0.5 block">
                  {overview?.complaints.new ?? 0}
                </span>
                <span className="text-[10px] text-blue-700 block mt-1">Awaiting triage</span>
              </div>

              <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 shadow-2xs">
                <span className="text-[10px] font-bold text-purple-800 uppercase font-mono block">Under Review</span>
                <span className="text-xl sm:text-2xl font-black text-purple-900 font-mono mt-0.5 block">
                  {overview?.complaints.under_review ?? 0}
                </span>
                <span className="text-[10px] text-purple-700 block mt-1">Active case</span>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase font-mono block">Resolved</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-900 font-mono mt-0.5 block">
                  {overview?.complaints.resolved ?? 0}
                </span>
                <span className="text-[10px] text-emerald-700 block mt-1">Remediated / closed</span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-cream-400 text-xs text-ink-secondary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>
                Consumer submissions are automatically preserved in the evidence repository upon inspection creation.
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Review Signals Section (AI Indicators & Disclaimers) */}
      <Card
        title="AI-Assisted Review Signals & Patterns"
        subtitle="Surveillance indicators detected across multi-image packaging panels"
      >
        <div className="space-y-4 pt-2">
          {/* Statutory AI Disclaimer Banner */}
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong className="font-bold">Statutory Legal Metrology Notice:</strong> AI review signals highlight potential OCR detection gaps, discrepancies between multiple packaging panels (e.g. Front vs Back), and compliance pattern outliers. Review signals are <strong>detection quality indicators</strong>, not scores of legal guilt or statutory violation. Physical verification by an authorized Legal Metrology Officer remains mandatory before issuing any statutory notice.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cross-Image Conflicts */}
            <div className="p-4 bg-white rounded-xl border border-cream-400 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-secondary uppercase font-mono">Cross-Panel Conflicts</span>
                  <Layers className="w-4 h-4 text-amber-700" />
                </div>
                <div className="text-3xl font-black font-mono text-ink-primary mt-2">
                  {signals?.total_conflicts_detected ?? 0}
                </div>
                <p className="text-[11px] text-ink-muted mt-1">
                  Conflicting declarations detected across distinct physical faces of the same packaging unit.
                </p>
              </div>

              {signals?.top_conflicting_declarations && signals.top_conflicting_declarations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-cream-300 space-y-1.5">
                  <span className="text-[10px] font-bold text-ink-muted uppercase font-mono block">Frequent Fields</span>
                  {signals.top_conflicting_declarations.slice(0, 3).map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-ink-secondary font-medium">{c.field}</span>
                      <span className="font-mono font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded text-[10px]">
                        {c.count} cases
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Missing Declarations Distribution */}
            <div className="p-4 bg-white rounded-xl border border-cream-400 shadow-2xs md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-ink-secondary uppercase font-mono">
                  Top Missing Declarations (PCR 2011)
                </span>
                <Sparkles className="w-4 h-4 text-forest-700" />
              </div>

              {signals?.top_missing_declarations && signals.top_missing_declarations.length > 0 ? (
                <div className="space-y-2.5 mt-3">
                  {signals.top_missing_declarations.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-ink-primary">{item.declaration}</span>
                        <span className="font-mono text-[11px] text-ink-muted">{item.occurrences} instances</span>
                      </div>
                      <div className="h-2 w-full bg-cream-300 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-forest-700 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(15, (item.occurrences / (signals.top_missing_declarations[0]?.occurrences || 1)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-ink-muted">
                  No recurring missing declaration patterns recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Charts & Trends Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Historical Monthly Trends */}
        <Card
          title="Monthly Inspection Volume & Compliance Trajectory"
          subtitle="Monthly breakdown of aggregate packaged commodities examined"
        >
          <div className="pt-4 sm:pt-6 pb-2">
            {trends?.has_data && trends.monthly.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-6 gap-2 sm:gap-3 items-end h-44 sm:h-48">
                  {trends.monthly.slice(-6).map((item, idx) => {
                    const maxVal = Math.max(...trends.monthly.map((m) => m.total), 10);
                    const heightPercent = Math.round((item.total / maxVal) * 100);
                    return (
                      <div key={idx} className="flex flex-col items-center h-full justify-end group">
                        <span className="text-[10px] sm:text-[11px] font-mono font-bold text-ink-secondary mb-1">
                          {item.total}
                        </span>
                        <div
                          className="w-full max-w-[32px] sm:max-w-[36px] bg-forest-700 rounded-t-md transition-all group-hover:bg-forest-800"
                          style={{ height: `${Math.max(10, heightPercent)}%` }}
                        />
                        <span className="text-[11px] font-mono text-ink-secondary mt-2 font-semibold truncate max-w-full text-center">
                          {item.period}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-center gap-4 text-xs pt-2 border-t border-cream-300">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-forest-700" />
                    <span className="text-ink-secondary">Total Scans</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                <PieChart className="w-10 h-10 text-cream-400 mb-2" />
                <h4 className="text-sm font-bold text-ink-primary">Insufficient Historical Data</h4>
                <p className="text-xs text-ink-muted max-w-xs mt-1">
                  Monthly trend tracking requires inspections conducted across multiple calendar periods.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Commodity Category Distribution */}
        <Card
          title="Organizational Sector Distribution"
          subtitle="Proportional distribution of inspections across commodity categories"
        >
          <div className="space-y-3 pt-2">
            {categories?.has_data && categories.categories.length > 0 ? (
              <div className="space-y-2.5">
                {categories.categories.map((cat, idx) => {
                  const total = cat.count || 1;
                  const compRatio = Math.round((cat.compliant / total) * 100);
                  return (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-cream-400 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-ink-primary">{cat.category}</span>
                        <span className="font-mono text-ink-muted">{cat.count} Audits</span>
                      </div>
                      <div className="flex h-2.5 rounded-full overflow-hidden border border-cream-300">
                        <div
                          className="bg-emerald-600"
                          style={{ width: `${compRatio}%` }}
                          title={`Compliant: ${compRatio}%`}
                        />
                        <div
                          className="bg-amber-500"
                          style={{ width: `${100 - compRatio}%` }}
                          title={`Review / Violations: ${100 - compRatio}%`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-ink-muted">
                        <span className="text-emerald-700 font-semibold">{cat.compliant} Compliant ({compRatio}%)</span>
                        <span className="text-amber-700 font-semibold">{cat.violations} Review / Violations</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                <Layers className="w-10 h-10 text-cream-400 mb-2" />
                <h4 className="text-sm font-bold text-ink-primary">No Category Distribution Available</h4>
                <p className="text-xs text-ink-muted max-w-xs mt-1">
                  Commodity categories will appear here once inspections are created.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </PageTransition>
  );
};
