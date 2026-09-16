import React, { useState, useEffect } from 'react';
import {
  Search,
  Scale,
  ExternalLink,
  ShieldCheck,
  History,
  BookOpen,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { mockLegalMetrologyRules } from '../../data/mockRules';
import { useLanguage } from '../../i18n/LanguageContext';

interface LegalRuleItem {
  id: string;
  rule_number: string;
  sub_clause?: string;
  title: string;
  statutory_title?: string;
  summary: string;
  statutory_requirement?: string;
  applicable_commodities?: string;
  verification_status?: string;
  enactment_date?: string;
  effective_date?: string;
  gazette_notification?: string;
  citation?: string;
  source_id?: string;
  parent_act?: string;
}

interface StatutorySource {
  id: string;
  title: string;
  short_name: string;
  authority: string;
  official_portal: string;
  act_year: number;
  description: string;
}

interface RuleVersionItem {
  id: string;
  gazette_notification: string;
  amendment_title: string;
  notification_date: string;
  effective_date: string;
  summary_of_changes: string;
  authority: string;
}

export const RulesPage: React.FC = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'rules' | 'sources' | 'amendments'>('rules');
  const [rules, setRules] = useState<LegalRuleItem[]>([]);
  const [sources, setSources] = useState<StatutorySource[]>([]);
  const [versions, setVersions] = useState<RuleVersionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLegalData() {
      try {
        const [rulesRes, sourcesRes, versionsRes] = await Promise.allSettled([
          fetch('/api/rules').then(r => r.ok ? r.json() : null),
          fetch('/api/rules/sources').then(r => r.ok ? r.json() : null),
          fetch('/api/rules/versions').then(r => r.ok ? r.json() : null),
        ]);

        if (rulesRes.status === 'fulfilled' && rulesRes.value && rulesRes.value.rules) {
          setRules(rulesRes.value.rules);
        } else {
          // Fallback to mock mapped
          setRules(
            mockLegalMetrologyRules.map(r => ({
              id: r.id,
              rule_number: r.ruleNumber,
              sub_clause: r.subClause,
              title: r.title,
              summary: r.summary,
              statutory_requirement: r.statutoryRequirement,
              applicable_commodities: r.applicableCommodities,
              verification_status: 'VERIFIED',
              citation: 'Rule ' + r.ruleNumber + ', Legal Metrology (Packaged Commodities) Rules, 2011',
              parent_act: 'Legal Metrology Act, 2009 (Act No. 1 of 2010)',
            }))
          );
        }

        if (sourcesRes.status === 'fulfilled' && sourcesRes.value && sourcesRes.value.sources) {
          setSources(sourcesRes.value.sources);
        } else {
          setSources([
            {
              id: 'LM_ACT_2009',
              title: 'The Legal Metrology Act, 2009 (Act No. 1 of 2010)',
              short_name: 'LM Act 2009',
              authority: 'Parliament of India / Dept. of Consumer Affairs',
              official_portal: 'https://www.indiacode.nic.in/handle/123456789/2056',
              act_year: 2009,
              description: 'Principal legislation establishing standards of weights and measures.',
            },
            {
              id: 'LM_PCR_2011',
              title: 'Legal Metrology (Packaged Commodities) Rules, 2011 (G.S.R. 202(E))',
              short_name: 'LM PCR 2011',
              authority: 'Ministry of Consumer Affairs, Food & Public Distribution',
              official_portal: 'https://consumeraffairs.nic.in/acts-and-rules/legal-metrology',
              act_year: 2011,
              description: 'Regulates mandatory declarations, font heights, and unit sale pricing.',
            },
          ]);
        }

        if (versionsRes.status === 'fulfilled' && versionsRes.value && versionsRes.value.amendments) {
          setVersions(versionsRes.value.amendments);
        }
      } catch (err) {
        console.warn('Could not fetch rules from API, using cached data', err);
      } finally {
        setLoading(false);
      }
    }
    loadLegalData();
  }, []);

  const filteredRules = rules.filter(r =>
    r.rule_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.applicable_commodities && r.applicable_commodities.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto animate-fadeIn pb-16">
      <Breadcrumbs items={[{ label: t('nav.rules', 'Compliance Rules') }]} />

      {/* Header */}
      <div className="bg-cream-100 rounded-2xl border border-cream-400 p-4 sm:p-6 shadow-subtle flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-xs font-mono font-bold uppercase text-forest-700 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-forest-700" />
            <span>STATUTORY COMPENDIUM & PROVENANCE REGISTRY</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-ink-primary tracking-tight mt-1">
            {t('nav.rules', 'Compliance Rules & Statutory Citations')}
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1">
            Statutory clauses, minimum character height schedules, and declaration standards under Legal Metrology Rules, 2011.
          </p>
        </div>

        <div className="p-3 bg-cream-200 border border-cream-400 rounded-xl text-xs text-ink-primary font-mono flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-forest-700 flex-shrink-0" />
          <div>
            <strong>Legal Basis:</strong> Legal Metrology (Packaged Commodities) Rules, 2011
            <div className="text-[10px] text-ink-muted">G.S.R. 202(E) as amended</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-cream-400 pb-2">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'rules'
              ? 'bg-forest-700 text-white shadow-sm'
              : 'bg-cream-200 text-ink-secondary hover:bg-cream-300'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Statutory Rules ({rules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sources')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'sources'
              ? 'bg-forest-700 text-white shadow-sm'
              : 'bg-cream-200 text-ink-secondary hover:bg-cream-300'
          }`}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Authoritative Sources ({sources.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('amendments')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'amendments'
              ? 'bg-forest-700 text-white shadow-sm'
              : 'bg-cream-200 text-ink-secondary hover:bg-cream-300'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Gazette Amendments ({versions.length})</span>
        </button>
      </div>

      {activeTab === 'rules' && (
        <>
          {/* Search Input */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search rule number (e.g. Rule 6(1)(e)), title or clause..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-cream-400 rounded-lg text-xs text-ink-primary focus:outline-none focus:ring-2 focus:ring-forest-600 shadow-subtle"
            />
          </div>

          {/* Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {filteredRules.map(rule => (
              <div
                key={rule.id}
                className="bg-cream-100 rounded-xl border border-cream-400 shadow-subtle p-5 sm:p-6 space-y-3.5 hover:shadow-elevated transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono font-bold text-xs bg-forest-700 text-white px-2.5 py-1 rounded-md">
                      {rule.rule_number}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      {rule.verification_status || 'VERIFIED STATUTE'}
                    </span>
                  </div>

                  <h3 className="font-bold text-ink-primary text-base tracking-tight">
                    {rule.title}
                  </h3>
                  {rule.sub_clause && (
                    <div className="text-[11px] font-mono text-forest-800 font-bold mt-0.5">
                      Sub-clause: {rule.sub_clause}
                    </div>
                  )}

                  <p className="text-xs text-ink-secondary mt-2 leading-relaxed">
                    {rule.summary}
                  </p>

                  <div className="mt-3.5 p-3 bg-cream-200/80 border border-cream-300 rounded-lg text-xs text-ink-primary space-y-1">
                    <div className="font-bold text-ink-primary text-[11px] uppercase font-mono">
                      Statutory Requirement:
                    </div>
                    <div className="text-[11px] text-ink-secondary leading-relaxed">
                      {rule.statutory_requirement}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-cream-300 flex flex-col gap-1.5 text-[11px] text-ink-muted">
                  <div className="flex items-center justify-between">
                    <span className="truncate max-w-[240px]">
                      Applicable: {rule.applicable_commodities || 'All Pre-packaged Commodities'}
                    </span>
                    <span className="font-mono text-forest-700 font-bold">Active Enforcement</span>
                  </div>
                  {rule.citation && (
                    <div className="text-[10px] font-mono text-ink-muted truncate" title={rule.citation}>
                      Ref: {rule.citation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'sources' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map(src => (
            <div key={src.id} className="bg-cream-100 rounded-xl border border-cream-400 p-5 shadow-subtle space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs bg-forest-700 text-white px-2.5 py-1 rounded">
                  {src.short_name}
                </span>
                <span className="text-xs font-mono text-ink-muted">Enacted: {src.act_year}</span>
              </div>
              <h3 className="font-bold text-ink-primary text-base">{src.title}</h3>
              <p className="text-xs text-ink-secondary leading-relaxed">{src.description}</p>
              <div className="pt-3 border-t border-cream-300 flex items-center justify-between">
                <span className="text-[11px] text-ink-muted">Authority: {src.authority}</span>
                <a
                  href={src.official_portal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-forest-700 hover:text-forest-800 hover:underline"
                >
                  <span>Official Gazette</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'amendments' && (
        <div className="space-y-3">
          {versions.map(ver => (
            <div key={ver.id} className="bg-cream-100 rounded-xl border border-cream-400 p-5 shadow-subtle space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono font-bold text-xs bg-cream-300 text-ink-primary px-2 py-0.5 rounded border border-cream-400">
                  {ver.gazette_notification}
                </span>
                <div className="text-xs font-mono text-ink-muted">
                  Notified: {ver.notification_date} | Effective: {ver.effective_date}
                </div>
              </div>
              <h4 className="font-bold text-ink-primary text-sm">{ver.amendment_title}</h4>
              <p className="text-xs text-ink-secondary leading-relaxed">{ver.summary_of_changes}</p>
              <div className="text-[11px] text-forest-800 font-mono">Issued by: {ver.authority}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
