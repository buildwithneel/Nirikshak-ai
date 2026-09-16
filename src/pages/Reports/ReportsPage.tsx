import React from 'react';
import {
  Download,
  Printer,
  Shield,
  Scale,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { mockDefaultInspectionRecord } from '../../data/mockScanResult';
import { useLanguage } from '../../i18n/LanguageContext';

export const ReportsPage: React.FC = () => {
  const { t } = useLanguage();
  const report = mockDefaultInspectionRecord;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto animate-fadeIn pb-16">
      <Breadcrumbs items={[{ label: t('nav.reports', 'Reports') }]} />

      {/* Action Header */}
      <div className="bg-cream-100 rounded-2xl border border-cream-400 p-4 sm:p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="text-xs font-mono font-bold uppercase text-forest-700">
            OFFICIAL STATUTORY DOCUMENTATION
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-ink-primary tracking-tight mt-1">
            {t('nav.reports', 'Inspection Reports')}
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1">
            Official inspection memorandum and preliminary compliance notices for field enforcement records.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            onClick={() => window.print()}
            leftIcon={<Printer className="w-4 h-4 text-forest-700" />}
          >
            Print Dossier
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => window.print()}
            leftIcon={<Download className="w-4 h-4 text-cream-100" />}
          >
            Download PDF
          </Button>
        </div>
      </div>

      {/* Official Government Memorandum Document */}
      <div className="bg-cream-100 border border-cream-400 rounded-2xl shadow-subtle p-6 sm:p-10 space-y-6 sm:space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="text-center border-b-2 border-ink-primary pb-5">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-forest-800 text-cream-100 flex items-center justify-center font-black text-xs">
              GOI
            </div>
          </div>
          <div className="text-[11px] font-extrabold tracking-widest text-ink-primary uppercase">
            Government of India • Ministry of Consumer Affairs, Food &amp; Public Distribution
          </div>
          <div className="text-xs font-bold text-forest-800 uppercase tracking-wider mt-0.5">
            Department of Consumer Affairs • Legal Metrology Division
          </div>
          <div className="text-base sm:text-lg font-black text-ink-primary uppercase tracking-tight mt-2.5">
            LEGAL METROLOGY INSPECTION REPORT &amp; STATUTORY AUDIT MEMORANDUM
          </div>
          <div className="text-[11px] font-mono text-ink-secondary mt-1">
            Issued under Legal Metrology (Packaged Commodities) Rules, 2011
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-cream-200/80 border border-cream-400 text-xs font-mono">
          <div>
            <span className="text-ink-muted block text-[10px] uppercase">Inspection ID:</span>
            <span className="font-bold text-ink-primary">{report.id}</span>
          </div>
          <div>
            <span className="text-ink-muted block text-[10px] uppercase">Audit Date:</span>
            <span className="font-bold text-ink-primary">{report.date}</span>
          </div>
          <div>
            <span className="text-ink-muted block text-[10px] uppercase">Location:</span>
            <span className="font-bold text-ink-primary truncate block">{report.inspectionLocation}</span>
          </div>
          <div>
            <span className="text-ink-muted block text-[10px] uppercase">Officer:</span>
            <span className="font-bold text-ink-primary">{report.officerName}</span>
          </div>
        </div>

        {/* Commodity Particulars */}
        <div className="space-y-2">
          <h3 className="text-xs sm:text-sm font-bold text-ink-primary uppercase tracking-wider border-b border-cream-400 pb-1.5 flex items-center gap-2">
            <Scale className="w-4 h-4 text-forest-700" />
            <span>1. Commodity Particulars under Audit</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-white rounded-lg border border-cream-400">
              <span className="text-ink-muted block text-[10px]">DECLARED COMMODITY:</span>
              <span className="font-bold text-ink-primary text-sm">{report.productName}</span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-cream-400">
              <span className="text-ink-muted block text-[10px]">BRAND:</span>
              <span className="font-bold text-ink-primary text-sm">{report.brand}</span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-cream-400">
              <span className="text-ink-muted block text-[10px]">CLASSIFICATION:</span>
              <span className="font-bold text-ink-primary text-sm">{report.category}</span>
            </div>
          </div>
        </div>

        {/* Rule 6 Examination */}
        <div className="space-y-2">
          <h3 className="text-xs sm:text-sm font-bold text-ink-primary uppercase tracking-wider border-b border-cream-400 pb-1.5 flex items-center gap-2">
            <Shield className="w-4 h-4 text-forest-700" />
            <span>2. Mandatory Declaration Audit (Rule 6 Examination)</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-cream-400 bg-white">
              <thead>
                <tr className="bg-cream-200/80 border-b border-cream-400 font-mono text-ink-secondary">
                  <th className="p-2.5 font-bold">Rule Reference</th>
                  <th className="p-2.5 font-bold">Mandatory Declaration</th>
                  <th className="p-2.5 font-bold">Observed Value</th>
                  <th className="p-2.5 font-bold text-center">Finding</th>
                  <th className="p-2.5 font-bold text-right">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-300">
                {report.declarations.map(d => (
                  <tr key={d.id}>
                    <td className="p-2.5 font-mono font-bold text-forest-800">{d.ruleReference}</td>
                    <td className="p-2.5 font-semibold text-ink-primary">{d.name}</td>
                    <td className="p-2.5 font-mono text-ink-secondary">{d.detectedValue}</td>
                    <td className="p-2.5 text-center">
                      <StatusBadge status={d.status} size="sm" />
                    </td>
                    <td className="p-2.5 font-mono font-bold text-right text-ink-primary">{d.confidence}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Non-compliance Directive */}
        <div className="space-y-2">
          <h3 className="text-xs sm:text-sm font-bold text-ink-primary uppercase tracking-wider border-b border-cream-400 pb-1.5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#D97706]" />
            <span>3. Non-Compliance Summary &amp; Directives</span>
          </h3>
          <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl space-y-1.5 text-xs text-[#92400E]">
            <div className="font-bold text-[#78350F]">
              Notice under Rule 6(1)(n): Consumer Care Contact Details Omitted / Obscured
            </div>
            <p className="leading-relaxed">
              Upon optical and visual surveillance of sample package reference <strong>{report.id}</strong>, mandatory grievance redressal contacts were not detected on the declaration panel.
            </p>
          </div>
        </div>

        {/* Officer Sign-off */}
        <div className="pt-6 border-t-2 border-cream-400 grid grid-cols-2 gap-6 text-xs">
          <div>
            <div className="text-ink-muted font-bold uppercase text-[10px]">FIELD INSPECTING OFFICER:</div>
            <div className="font-bold text-ink-primary text-sm mt-0.5">{report.officerName}</div>
            <div className="text-ink-secondary">{report.officerDesignation}</div>
          </div>

          <div className="text-right">
            <div className="text-ink-muted font-bold uppercase text-[10px]">DIGITAL VERIFICATION:</div>
            <div className="font-mono text-xs font-bold text-forest-800 mt-0.5">AUTHENTICATED AUDIT RECORD</div>
            <div className="text-ink-muted text-[11px]">NIRIKSHAK AI Platform</div>
          </div>
        </div>
      </div>
    </div>
  );
};
