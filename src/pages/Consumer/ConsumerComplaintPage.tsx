import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Mail,
  FileImage,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { PageTransition } from '../../components/motion/PageTransition';
import { Button } from '../../components/ui/Button';
import { useInspection } from '../../context/InspectionContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../auth/AuthContext';
import { authApi } from '../../auth/authApi';

export const ConsumerComplaintPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentInspection } = useInspection();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [productName, setProductName] = useState(currentInspection.productName || 'Packaged Commodity');
  const [issueCategory, setIssueCategory] = useState('missing_care');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keep email in sync if user logs in
  React.useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user, email]);

  const validateEmail = (val: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!val.trim()) {
      return 'Email address is required.';
    }
    if (!emailRegex.test(val.trim())) {
      return t('consumer.emailInvalid', 'Please enter a valid email address.');
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const err = validateEmail(email);
    if (err) {
      setEmailError(err);
      return;
    }

    setEmailError(null);
    setIsSubmitting(true);

    try {
      // Submit to backend API connected to authenticated user
      const complaintRecord = await authApi.submitComplaint({
        product_name: productName,
        issue_category: issueCategory,
        description,
        contact_email: email.trim(),
        image_url: currentInspection.imageUrl,
        product_description: 'Packaged Commodity',
      });

      // Store submission for success display
      sessionStorage.setItem(
        'nirikshak_last_complaint',
        JSON.stringify({
          referenceId: complaintRecord.id,
          productName,
          issueCategory,
          description,
          email: email.trim(),
          imageUrl: currentInspection.imageUrl,
          timestamp: complaintRecord.created_at,
        })
      );

      navigate('/complaint/success');
    } catch (apiErr) {
      console.warn('Complaint submission fallback:', apiErr);
      const hex = Math.random().toString(16).substring(2, 10).toUpperCase();
      const referenceId = `CMP-${hex}`;
      sessionStorage.setItem(
        'nirikshak_last_complaint',
        JSON.stringify({
          referenceId,
          productName,
          issueCategory,
          description,
          email: email.trim(),
          imageUrl: currentInspection.imageUrl,
          timestamp: new Date().toISOString(),
        })
      );
      navigate('/complaint/success');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <PageTransition className="space-y-4 sm:space-y-6 max-w-2xl mx-auto pb-8">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-govink-secondary hover:text-govink-primary transition-colors cursor-pointer py-1"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-institutional-border p-5 sm:p-6 shadow-subtle">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-govred-50 border border-govred-200 text-govred-700 text-xs font-bold mb-2">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>CONSUMER GRIEVANCE INTAKE</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-govink-primary tracking-tight">
          {t('consumer.complaintTitle', 'Report a Packaging Concern')}
        </h1>
        <p className="text-xs sm:text-sm text-govink-secondary mt-1">
          {t(
            'consumer.complaintSubtitle',
            'Observed missing mandatory declarations or pricing discrepancies? Submit details for review.'
          )}
        </p>
      </div>

      {/* Complaint Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-institutional-border p-5 sm:p-7 shadow-subtle space-y-4 sm:space-y-5">
        {/* Product Name */}
        <div>
          <label className="block text-xs font-bold text-govink-primary mb-1">
            {t('consumer.productNameLabel', 'Product Name')}
          </label>
          <input
            type="text"
            value={productName}
            onChange={e => setProductName(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-institutional-border bg-white text-xs sm:text-sm text-govink-primary focus:outline-none focus:ring-2 focus:ring-govteal-700"
          />
        </div>

        {/* Issue Category */}
        <div>
          <label className="block text-xs font-bold text-govink-primary mb-1">
            {t('consumer.issueCategoryLabel', 'Issue Observed')}
          </label>
          <select
            value={issueCategory}
            onChange={e => setIssueCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-institutional-border bg-white text-xs sm:text-sm text-govink-primary focus:outline-none focus:ring-2 focus:ring-govteal-700"
          >
            <option value="missing_care">{t('consumer.issueMissingCare', 'Missing Consumer Care details')}</option>
            <option value="missing_qty">{t('consumer.issueMissingQty', 'Missing or ambiguous Net Quantity')}</option>
            <option value="missing_mrp">{t('consumer.issueMissingMrp', 'Missing MRP or Overcharging')}</option>
            <option value="missing_mfg">{t('consumer.issueMissingMfg', 'Missing Manufacturer / Packer Address')}</option>
            <option value="missing_date">{t('consumer.issueMissingDate', 'Missing or illegible Date of Packaging')}</option>
            <option value="font_legibility">{t('consumer.issueFontLegibility', 'Font too small or unreadable text')}</option>
            <option value="other">{t('consumer.issueOther', 'Other statutory non-compliance')}</option>
          </select>
        </div>

        {/* Attached Photograph Preview */}
        <div>
          <label className="block text-xs font-bold text-govink-primary mb-1">
            {t('consumer.photoAttached', 'Product Photo Attached')}
          </label>
          {currentInspection.imageUrl ? (
            <div className="flex items-center gap-3 p-2.5 rounded-lg border border-institutional-border bg-institutional-subtle">
              <img
                src={currentInspection.imageUrl}
                alt="Attached product thumbnail"
                className="w-14 h-14 object-contain rounded bg-white border border-institutional-border flex-shrink-0"
              />
              <div className="text-xs text-govink-secondary min-w-0">
                <span className="font-semibold text-govink-primary block truncate">
                  {currentInspection.productName}
                </span>
                <span className="text-[11px] text-govgreen-900 font-semibold flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Packaging image attached</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg border border-dashed border-institutional-border text-center text-xs text-govink-muted">
              No photograph attached
            </div>
          )}
        </div>

        {/* Details of Observation */}
        <div>
          <label className="block text-xs font-bold text-govink-primary mb-1">
            {t('consumer.descriptionLabel', 'Details of Observation')}
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t(
              'consumer.descriptionPlaceholder',
              'Describe where you noticed the issue and what seems missing or unclear on the label...'
            )}
            className="w-full px-3.5 py-2.5 rounded-lg border border-institutional-border bg-white text-xs sm:text-sm text-govink-primary focus:outline-none focus:ring-2 focus:ring-govteal-700"
          />
        </div>

        {/* Contact Email Field */}
        <div>
          <label className="block text-xs font-bold text-govink-primary mb-1">
            {t('consumer.contactEmailLabel', 'Contact Email Address')}
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-govink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              placeholder={t('consumer.contactEmailPlaceholder', 'yourname@gmail.com')}
              required
              className={`w-full pl-10 pr-3.5 py-2.5 rounded-lg border text-xs sm:text-sm text-govink-primary focus:outline-none focus:ring-2 ${
                emailError
                  ? 'border-govred-600 focus:ring-govred-600 bg-govred-50/20'
                  : 'border-institutional-border focus:ring-govteal-700 bg-white'
              }`}
            />
          </div>
          {emailError && (
            <span className="text-[11px] text-govred-700 mt-1 block font-medium">
              {emailError}
            </span>
          )}

          {/* Privacy Notice */}
          <div className="mt-2 text-[11px] text-govink-muted leading-relaxed flex items-start gap-1.5">
            <Lock className="w-3.5 h-3.5 text-govink-muted mt-0.5 flex-shrink-0" />
            <span>
              {t(
                'consumer.privacyNotice',
                'Your email is used to associate the complaint with your submission. Do not enter unnecessary personal information.'
              )}
            </span>
          </div>
        </div>

        {/* Local Demo Disclaimer */}
        <div className="p-3 rounded-lg bg-institutional-subtle border border-institutional-border text-[11px] text-govink-secondary leading-relaxed">
          {t(
            'consumer.demoNotice',
            'Local demonstration reference generated. Official statutory enforcement is conducted through authorized Legal Metrology departments.'
          )}
        </div>

        {/* Submit CTA */}
        <Button
          type="submit"
          variant="teal"
          size="lg"
          className="w-full min-h-[50px] text-sm sm:text-base font-bold shadow-elevated"
          isLoading={isSubmitting}
        >
          {isSubmitting
            ? t('consumer.submitting', 'Recording Concern...')
            : t('consumer.submitConcern', 'Submit Concern')}
        </Button>
      </form>
    </PageTransition>
  );
};

export default ConsumerComplaintPage;
