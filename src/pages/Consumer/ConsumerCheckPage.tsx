import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Loader2,
  Info,
  Scale,
  Receipt,
  Building2,
  PhoneCall,
  Calendar,
} from 'lucide-react';
import { PageTransition } from '../../components/motion/PageTransition';
import { Button } from '../../components/ui/Button';
import { samplePresets } from '../../data/mockScanResult';
import { useInspection } from '../../context/InspectionContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { runRealOCR } from '../../services/ocrApi';

export const ConsumerCheckPage: React.FC = () => {
  const navigate = useNavigate();
  const { createInspectionFromUpload, loadPreset } = useInspection();
  const { t } = useLanguage();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(samplePresets[0].imageUrl);
  const [activePresetId, setActivePresetId] = useState<string>('preset-biscuit');
  const [isScanning, setIsScanning] = useState(false);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Please upload a clear JPG, PNG, or WEBP photo of the package.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('Image size is too large (max 15MB). Please upload a compressed photo.');
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    setActivePresetId('');

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = samplePresets.find(p => p.id === presetId);
    if (preset) {
      setActivePresetId(presetId);
      setSelectedFile(null);
      setImagePreview(preset.imageUrl);
      setErrorMessage(null);
    }
  };

  const handleStartConsumerAnalysis = async () => {
    if (!imagePreview) {
      setErrorMessage('Please select or capture a packaged product photograph first.');
      return;
    }

    setIsScanning(true);
    setAnalysisStage(1);

    if (activePresetId) {
      // Fast sequential feedback for sample presets
      setTimeout(() => setAnalysisStage(2), 500);
      setTimeout(() => setAnalysisStage(3), 1000);
      setTimeout(() => setAnalysisStage(4), 1500);
      setTimeout(() => {
        loadPreset(activePresetId);
        setIsScanning(false);
        navigate('/check/result');
      }, 1900);
      return;
    }

    // Real OCR path for consumer uploaded photo
    try {
      setAnalysisStage(2);
      const imagePayload = selectedFile || imagePreview;
      const ocrResult = await runRealOCR(imagePayload);

      setAnalysisStage(3);
      await new Promise(r => setTimeout(r, 400));

      setAnalysisStage(4);
      await createInspectionFromUpload(
        imagePreview,
        {
          productName: ocrResult?.lines?.[0]?.text || 'Scanned Commodity',
          category: 'Consumer Product',
        },
        ocrResult
      );

      setIsScanning(false);
      navigate('/check/result');
    } catch (err) {
      setIsScanning(false);
      setErrorMessage(
        'Could not read declarations clearly from this photograph. Try taking a photo with better lighting or closer to the text.'
      );
    }
  };

  return (
    <PageTransition className="space-y-4 sm:space-y-6 max-w-2xl mx-auto pb-8">
      {/* Hidden File Inputs for Mobile Camera vs Gallery */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {/* Clean Institutional Header */}
      <div className="bg-white rounded-2xl border border-institutional-border p-5 sm:p-7 shadow-subtle text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-govteal-50 border border-govteal-200 text-govteal-700 text-xs font-bold mb-2.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('brand.name', 'NIRIKSHAK')} • PUBLIC PRODUCT VERIFICATION</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-govink-primary tracking-tight">
          {t('consumer.checkTitle', 'Check your packaged product')}
        </h1>
        <p className="text-xs sm:text-sm text-govink-secondary mt-1.5 leading-relaxed">
          {t(
            'consumer.checkSubtitle',
            'Scan the label or upload a photograph to review important mandatory declarations.'
          )}
        </p>
      </div>

      {/* Main Image Capture / Preview Card */}
      <div className="bg-white rounded-2xl border border-institutional-border shadow-subtle p-4 sm:p-6 space-y-4">
        {imagePreview ? (
          <div className="space-y-4">
            {/* Visual Canvas with 21st.dev Scanning Beam */}
            <div className="relative overflow-hidden rounded-xl border border-institutional-border bg-institutional-bg flex items-center justify-center min-h-[260px] sm:min-h-[320px]">
              <img
                src={imagePreview}
                alt="Product packaging preview"
                className="max-h-[300px] sm:max-h-[340px] w-auto object-contain mx-auto"
              />

              {/* 21st.dev-Inspired Horizontal Scan Sweep */}
              {isScanning && (
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-govteal-500 to-transparent shadow-[0_0_12px_rgba(15,118,110,0.8)] animate-scan-sweep pointer-events-none z-10" />
              )}

              {/* Status Badge Overlay */}
              <div className="absolute top-3 right-3 bg-govink-primary/80 backdrop-blur-xs text-white text-[11px] font-mono px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-govteal-200" />
                <span>Ready to Check</span>
              </div>
            </div>

            {/* Retake / Change Controls */}
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="outline"
                size="md"
                className="w-full"
                onClick={() => cameraInputRef.current?.click()}
                leftIcon={<Camera className="w-4 h-4 text-govteal-700" />}
              >
                {t('consumer.cameraPrompt', 'Take Photo')}
              </Button>
              <Button
                variant="outline"
                size="md"
                className="w-full"
                onClick={() => galleryInputRef.current?.click()}
                leftIcon={<Upload className="w-4 h-4 text-govteal-700" />}
              >
                {t('consumer.galleryPrompt', 'Choose Gallery')}
              </Button>
            </div>

            {/* Analyze Primary CTA */}
            <Button
              variant="teal"
              size="lg"
              className="w-full min-h-[50px] text-sm sm:text-base font-bold shadow-elevated"
              onClick={handleStartConsumerAnalysis}
              isLoading={isScanning}
              leftIcon={!isScanning ? <Sparkles className="w-5 h-5" /> : undefined}
            >
              {isScanning
                ? t('consumer.submitting', 'Checking declarations...')
                : t('consumer.scanCta', 'Check Declarations Now')}
            </Button>
          </div>
        ) : (
          /* Empty State / Trigger Buttons */
          <div className="text-center py-8 px-4 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-govteal-50 border border-govteal-200 text-govteal-700 flex items-center justify-center mx-auto shadow-subtle">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-base text-govink-primary">
                Capture or Upload Product Packaging
              </h3>
              <p className="text-xs text-govink-secondary mt-1 max-w-sm mx-auto">
                Hold the camera steady and make sure the principal display panel or declaration text is visible.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-xs mx-auto pt-2">
              <Button
                variant="teal"
                size="md"
                className="w-full"
                onClick={() => cameraInputRef.current?.click()}
                leftIcon={<Camera className="w-4 h-4" />}
              >
                {t('consumer.cameraPrompt', 'Take Photo')}
              </Button>
              <Button
                variant="outline"
                size="md"
                className="w-full"
                onClick={() => galleryInputRef.current?.click()}
                leftIcon={<Upload className="w-4 h-4" />}
              >
                {t('consumer.galleryPrompt', 'Upload Photo')}
              </Button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 bg-[#FEE4E2] border border-[#FECACA] rounded-xl text-xs text-[#B42318] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Quick Test Samples for Evaluators & Mobile Testing */}
      <div className="bg-white rounded-2xl border border-institutional-border p-4 sm:p-5 shadow-subtle space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-govink-primary uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-govteal-700" />
            <span>Try Sample Packaged Products</span>
          </span>
          <span className="text-[10px] text-govink-muted">Tap to load</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {samplePresets.slice(0, 2).map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(p.id)}
              className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer min-h-[46px] ${
                activePresetId === p.id
                  ? 'border-govteal-700 bg-govteal-50/70 ring-1 ring-govteal-700'
                  : 'border-institutional-border hover:bg-institutional-subtle'
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="font-bold text-govink-primary truncate">{p.title}</div>
                <div className="text-[10px] text-govink-secondary truncate">{p.productName}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-govink-muted flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* What Can You Check? Section */}
      <div className="bg-white rounded-2xl border border-institutional-border p-5 shadow-subtle space-y-3.5">
        <h3 className="text-xs font-bold text-govink-primary uppercase tracking-wider font-mono flex items-center gap-1.5">
          <Info className="w-4 h-4 text-govgreen-900" />
          <span>{t('consumer.whatCanYouCheck', 'What can you check on this package?')}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-govink-secondary">
          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-institutional-subtle/50">
            <Scale className="w-4 h-4 text-govgreen-900 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="text-govink-primary block font-semibold">Net Quantity</strong>
              <span>{t('consumer.itemNetQty', 'Standard metric units (g, kg, ml, L)')}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-institutional-subtle/50">
            <Receipt className="w-4 h-4 text-govgreen-900 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="text-govink-primary block font-semibold">Maximum Retail Price</strong>
              <span>{t('consumer.itemMrp', 'MRP inclusive of all taxes')}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-institutional-subtle/50">
            <Building2 className="w-4 h-4 text-govgreen-900 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="text-govink-primary block font-semibold">Manufacturer Details</strong>
              <span>{t('consumer.itemMfg', 'Name and physical address')}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-institutional-subtle/50">
            <PhoneCall className="w-4 h-4 text-govgreen-900 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="text-govink-primary block font-semibold">Consumer Care Contact</strong>
              <span>{t('consumer.itemCare', 'Helpline telephone & email address')}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-institutional-subtle/50 sm:col-span-2">
            <Calendar className="w-4 h-4 text-govgreen-900 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="text-govink-primary block font-semibold">Packaging & Expiry Dates</strong>
              <span>{t('consumer.itemDate', 'Month and year of manufacture or packaging')}</span>
            </div>
          </div>
        </div>

        {/* Responsible Disclaimer */}
        <div className="p-3 rounded-lg bg-govnavy-50/70 border border-govnavy-200/80 text-[11px] text-govnavy-900 leading-relaxed flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-govnavy-800 flex-shrink-0 mt-0.5" />
          <p>{t('consumer.disclaimer', 'AI-assisted packaging inspection for consumer awareness under Legal Metrology Rules, 2011.')}</p>
        </div>
      </div>

      {/* Sequential Analysis Overlay */}
      {isScanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-govink-primary/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-institutional-border shadow-modal p-6 text-center space-y-4 animate-page-enter">
            <div className="w-14 h-14 rounded-2xl bg-govteal-700 text-white flex items-center justify-center mx-auto shadow-subtle">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>

            <div>
              <h4 className="font-black text-base text-govink-primary">
                Reading Product Packaging...
              </h4>
              <p className="text-xs text-govink-secondary mt-0.5">
                Checking mandatory declarations under Legal Metrology Rules
              </p>
            </div>

            {/* Stages Checklist */}
            <div className="space-y-2 text-left p-3 rounded-xl bg-institutional-subtle font-mono text-xs">
              <div className="flex items-center gap-2">
                {analysisStage >= 1 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-govgreen-900" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-institutional-border inline-block" />
                )}
                <span className={analysisStage >= 1 ? 'font-bold text-govink-primary' : 'text-govink-muted'}>
                  1. Image received &amp; normalized
                </span>
              </div>
              <div className="flex items-center gap-2">
                {analysisStage >= 2 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-govgreen-900" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-institutional-border inline-block" />
                )}
                <span className={analysisStage >= 2 ? 'font-bold text-govink-primary' : 'text-govink-muted'}>
                  2. Reading declaration panels
                </span>
              </div>
              <div className="flex items-center gap-2">
                {analysisStage >= 3 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-govgreen-900" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-institutional-border inline-block" />
                )}
                <span className={analysisStage >= 3 ? 'font-bold text-govink-primary' : 'text-govink-muted'}>
                  3. Checking mandatory details
                </span>
              </div>
              <div className="flex items-center gap-2">
                {analysisStage >= 4 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-govgreen-900" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-institutional-border inline-block" />
                )}
                <span className={analysisStage >= 4 ? 'font-bold text-govink-primary' : 'text-govink-muted'}>
                  4. Preparing summary
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
};

export default ConsumerCheckPage;
