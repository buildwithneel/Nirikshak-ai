import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  FileText,
  Building2,
  Calendar,
} from 'lucide-react';
import { PageTransition } from '../../components/motion/PageTransition';
import { Button } from '../../components/ui/Button';
import { useLanguage } from '../../i18n/LanguageContext';

export const ConsumerComplaintSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [copied, setCopied] = useState(false);
  const [complaintData, setComplaintData] = useState<{
    referenceId: string;
    productName: string;
    issueCategory: string;
    description: string;
    email: string;
    imageUrl?: string;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('nirikshak_last_complaint');
      if (stored) {
        setComplaintData(JSON.parse(stored));
      } else {
        // Fallback default demo reference
        setComplaintData({
          referenceId: 'CMP-89E2D104',
          productName: 'NutriBake Butter Delite Biscuits',
          issueCategory: 'missing_care',
          description: 'Customer care telephone number and email address missing on back panel.',
          email: 'citizen@example.com',
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const referenceId = complaintData?.referenceId || 'CMP-89E2D104';

  const handleCopyRef = () => {
    navigator.clipboard.writeText(referenceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PageTransition className="space-y-4 sm:space-y-6 max-w-xl mx-auto pb-8 text-center sm:text-left">
      {/* Visual Success Hero */}
      <div className="bg-white rounded-2xl border border-institutional-border p-6 sm:p-8 shadow-subtle text-center space-y-4">
        {/* Animated Pop Checkmark */}
        <div className="w-16 h-16 rounded-full bg-govgreen-100 border-2 border-govgreen-200 text-govgreen-900 flex items-center justify-center mx-auto animate-checkmark">
          <CheckCircle2 className="w-8 h-8 text-govgreen-900" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-govink-primary tracking-tight">
            {t('consumer.successTitle', 'Concern Submitted')}
          </h1>
          <p className="text-xs sm:text-sm text-govink-secondary mt-1">
            {t(
              'consumer.successSubtitle',
              'We have recorded your packaging report and photograph reference.'
            )}
          </p>
        </div>

        {/* Reference ID Pill */}
        <div className="bg-institutional-subtle rounded-xl border border-institutional-border p-3.5 max-w-xs mx-auto flex items-center justify-between gap-2">
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-govink-muted font-mono block">
              {t('consumer.refNumber', 'Complaint Reference ID')}
            </span>
            <span className="font-mono text-base font-black text-govgreen-900 tracking-wider">
              {referenceId}
            </span>
          </div>

          <button
            onClick={handleCopyRef}
            className="p-2 rounded-lg hover:bg-institutional-300 text-govink-secondary hover:text-govink-primary transition-colors cursor-pointer"
            title="Copy Reference ID"
          >
            {copied ? <Check className="w-4 h-4 text-govgreen-900" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Local Demo Disclaimer Note */}
        <p className="text-[11px] text-govink-muted max-w-sm mx-auto leading-relaxed pt-1">
          {t(
            'consumer.demoNotice',
            'Local demonstration reference generated. Official statutory enforcement is conducted through authorized Legal Metrology departments.'
          )}
        </p>
      </div>

      {/* Submission Summary Details */}
      {complaintData && (
        <div className="bg-white rounded-2xl border border-institutional-border p-5 shadow-subtle space-y-3 text-left">
          <h2 className="text-xs font-bold text-govink-primary uppercase tracking-wider font-mono flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-govteal-700" />
            <span>Submission Summary</span>
          </h2>

          <div className="space-y-2 text-xs divide-y divide-institutional-border">
            <div className="flex justify-between py-1.5">
              <span className="text-govink-secondary">Product:</span>
              <span className="font-bold text-govink-primary text-right">{complaintData.productName}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-govink-secondary">Category:</span>
              <span className="font-semibold text-govink-primary capitalize text-right">
                {complaintData.issueCategory.replace('_', ' ')}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-govink-secondary">Contact Email:</span>
              <span className="font-mono text-govink-primary text-right">{complaintData.email}</span>
            </div>
            {complaintData.description && (
              <div className="pt-2">
                <span className="text-govink-secondary block mb-1">Observation Remarks:</span>
                <p className="p-2.5 rounded-lg bg-institutional-subtle text-govink-primary text-[11px] leading-relaxed">
                  {complaintData.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="teal"
          size="lg"
          className="w-full sm:flex-1 shadow-subtle min-h-[48px]"
          onClick={() => navigate('/check')}
          leftIcon={<RotateCcw className="w-4 h-4" />}
        >
          {t('consumer.checkAnother', 'Check Another Product')}
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="w-full sm:w-auto min-h-[48px]"
          onClick={() => navigate('/dashboard')}
          leftIcon={<ArrowRight className="w-4 h-4" />}
        >
          {t('consumer.modeOfficer', 'Officer Portal')}
        </Button>
      </div>
    </PageTransition>
  );
};

export default ConsumerComplaintSuccessPage;
