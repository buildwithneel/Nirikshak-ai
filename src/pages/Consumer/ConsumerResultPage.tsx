import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  RotateCcw,
  ShieldCheck,
  Building2,
  Scale,
  Receipt,
  PhoneCall,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { PageTransition } from '../../components/motion/PageTransition';
import { Button } from '../../components/ui/Button';
import { useInspection } from '../../context/InspectionContext';
import { useLanguage } from '../../i18n/LanguageContext';

export const ConsumerResultPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentInspection } = useInspection();
  const { t } = useLanguage();

  const declarations = currentInspection.declarations || [];
  const compliantCount = declarations.filter(d => d.status === 'COMPLIANT').length;
  const reviewCount = declarations.filter(d => d.status !== 'COMPLIANT').length;

  const getDeclarationIcon = (key: string) => {
    switch (key) {
      case 'net_quantity':
        return <Scale className="w-4 h-4 text-govteal-700" />;
      case 'mrp':
        return <Receipt className="w-4 h-4 text-govteal-700" />;
      case 'manufacturer':
        return <Building2 className="w-4 h-4 text-govteal-700" />;
      case 'consumer_care':
        return <PhoneCall className="w-4 h-4 text-govteal-700" />;
      default:
        return <Calendar className="w-4 h-4 text-govteal-700" />;
    }
  };

  return (
    <PageTransition className="space-y-4 sm:space-y-6 max-w-2xl mx-auto pb-8">
      {/* Back to Check Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/check')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-govink-secondary hover:text-govink-primary transition-colors cursor-pointer py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('consumer.checkAnother', 'Check Another Product')}</span>
        </button>

        <span className="text-[11px] font-mono text-govink-muted">
          Ref: {currentInspection.id}
        </span>
      </div>

      {/* Summary Hero Card */}
      <div className="bg-white rounded-2xl border border-institutional-border p-5 sm:p-6 shadow-subtle">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-govteal-50 border border-govteal-200 text-govteal-700 text-xs font-bold mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('consumer.resultTitle', 'Package Label Check')}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-govink-primary tracking-tight">
              {currentInspection.productName || 'Packaged Commodity'}
            </h1>
            <p className="text-xs text-govink-secondary mt-1">
              {currentInspection.brand && <span>{currentInspection.brand} • </span>}
              <span>Mandatory declarations evaluated under Legal Metrology Rules, 2011</span>
            </p>
          </div>

          {/* Clean Status Counter Pill */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-institutional-border">
            <div className="text-center px-3 py-1.5 rounded-lg bg-govgreen-50 border border-govgreen-200">
              <span className="block text-base font-black text-govgreen-900 leading-none">
                {compliantCount}
              </span>
              <span className="text-[10px] font-semibold text-govgreen-800">Verified</span>
            </div>

            {reviewCount > 0 && (
              <div className="text-center px-3 py-1.5 rounded-lg bg-govamber-50 border border-govamber-200">
                <span className="block text-base font-black text-govamber-900 leading-none">
                  {reviewCount}
                </span>
                <span className="text-[10px] font-semibold text-govamber-800">Needs Review</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Packaging Thumbnail Preview */}
      {currentInspection.imageUrl && (
        <div className="bg-white rounded-2xl border border-institutional-border p-3.5 shadow-subtle flex items-center gap-3">
          <img
            src={currentInspection.imageUrl}
            alt="Scanned Product"
            className="w-16 h-16 object-contain rounded-lg border border-institutional-border bg-institutional-bg flex-shrink-0"
          />
          <div className="min-w-0 flex-1 text-xs">
            <div className="font-bold text-govink-primary truncate">
              {currentInspection.productName}
            </div>
            <div className="text-[11px] text-govink-secondary truncate mt-0.5">
              Category: {currentInspection.category}
            </div>
            <div className="text-[10px] text-govink-muted mt-1 font-mono">
              Scanned on {new Date(currentInspection.date).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      {/* Simplified Friendly Declaration Checklist */}
      <div className="bg-white rounded-2xl border border-institutional-border p-4 sm:p-6 shadow-subtle space-y-3.5">
        <h2 className="text-xs font-bold text-govink-primary uppercase tracking-wider font-mono">
          {t('consumer.declarationsFound', 'Mandatory Declarations Identified')}
        </h2>

        <div className="space-y-2.5">
          {declarations.map(dec => {
            const isCompliant = dec.status === 'COMPLIANT';

            return (
              <div
                key={dec.key}
                className={`p-3.5 rounded-xl border transition-all ${
                  isCompliant
                    ? 'border-institutional-border bg-white'
                    : 'border-govamber-200 bg-govamber-50/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-institutional-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
                      {getDeclarationIcon(dec.key)}
                    </div>

                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-govink-primary">
                        {dec.name}
                      </div>

                      <div className="text-xs text-govink-secondary mt-0.5 break-words">
                        {dec.detectedValue || 'No clear declaration detected on this surface'}
                      </div>

                      {/* Explainable plain language for uncertain findings */}
                      {!isCompliant && (
                        <div className="mt-2 text-[11px] text-govamber-900 bg-govamber-100/70 p-2 rounded-lg leading-relaxed flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-govamber-700 flex-shrink-0 mt-0.5" />
                          <div>
                            <strong>{t('consumer.needsReview', 'Needs Manual Review')}: </strong>
                            <span>
                              {t(
                                'consumer.needsReviewDesc',
                                'We could not confidently read this declaration from the uploaded photograph. Please check the package manually.'
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex-shrink-0">
                    {isCompliant ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-govgreen-900 bg-govgreen-100 px-2 py-1 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5 text-govgreen-800" />
                        <span className="hidden sm:inline">Verified</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-govamber-900 bg-govamber-100 px-2 py-1 rounded-md">
                        <AlertCircle className="w-3.5 h-3.5 text-govamber-700" />
                        <span className="hidden sm:inline">Check Label</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Footer: Report a Concern or Scan Another */}
      <div className="bg-white rounded-2xl border border-institutional-border p-4 sm:p-6 shadow-subtle space-y-3 text-center sm:text-left">
        <div>
          <h3 className="font-bold text-sm sm:text-base text-govink-primary">
            Observed a missing declaration or pricing issue?
          </h3>
          <p className="text-xs text-govink-secondary mt-0.5">
            You can log a concern with your observations for statutory review.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <Button
            variant="teal"
            size="lg"
            className="w-full sm:flex-1 shadow-subtle min-h-[48px]"
            onClick={() => navigate('/complaint')}
            leftIcon={<AlertCircle className="w-4 h-4" />}
          >
            {t('consumer.reportConcern', 'Report a Concern')}
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto min-h-[48px]"
            onClick={() => navigate('/check')}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            {t('consumer.checkAnother', 'Check Another Product')}
          </Button>
        </div>
      </div>

      {/* Responsible Trust & Disclaimer Footer */}
      <div className="p-3.5 rounded-xl bg-institutional-subtle border border-institutional-border text-[11px] text-govink-secondary flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-govgreen-900 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {t('consumer.disclaimer', 'AI-assisted packaging inspection for consumer awareness under Legal Metrology Rules, 2011.')}
        </p>
      </div>
    </PageTransition>
  );
};

export default ConsumerResultPage;
