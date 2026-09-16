import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileImage,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  Trash2,
  Layers,
  Building2,
  MapPin,
  Tag,
  Camera,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { useInspection } from '../../context/InspectionContext';
import { samplePresets } from '../../data/mockScanResult';
import { MultiImageTabs } from '../../components/evidence/MultiImageTabs';
import { ProductPackagingPerspective } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { runRealOCR } from '../../services/ocrApi';
import { PageTransition } from '../../components/motion/PageTransition';

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const { createInspectionFromUpload, loadPreset } = useInspection();
  const { t } = useLanguage();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(samplePresets[0].imageUrl);
  const [activePresetId, setActivePresetId] = useState<string>('preset-biscuit');
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [perspective, setPerspective] = useState<ProductPackagingPerspective>('back');
  const [showMetadata, setShowMetadata] = useState(false);

  // Commodity metadata form
  const [productName, setProductName] = useState('NutriBake Butter Delite Biscuits 100g');
  const [brand, setBrand] = useState('NutriBake Foods');
  const [category, setCategory] = useState('Packaged Food');
  const [location, setLocation] = useState('Central Supermarket, Connaught Place, New Delhi');

  // AI Processing Screen State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Invalid format. Please upload a clear JPG, PNG, or WEBP image.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('Image size exceeds 15MB. Please upload a compressed image.');
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
    setActivePresetId(presetId);
    setSelectedFile(null);
    setErrorMessage(null);

    const preset = samplePresets.find(p => p.id === presetId);
    if (preset) {
      setImagePreview(preset.imageUrl);
      setProductName(preset.productName);
      setBrand(preset.brand);
      setCategory(preset.category);
      setLocation(preset.location);
    }
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setActivePresetId('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const [ocrErrorState, setOcrErrorState] = useState<{ title: string; message: string; suggestions: string[] } | null>(null);

  const handleStartAnalysis = async () => {
    if (!imagePreview) {
      setErrorMessage('Please capture or select a packaged commodity image.');
      return;
    }

    setOcrErrorState(null);
    setErrorMessage(null);
    setIsAnalyzing(true);
    setAnalysisStep(1);

    // If preset is selected, use the preset data
    if (activePresetId) {
      setTimeout(() => setAnalysisStep(2), 600);
      setTimeout(() => setAnalysisStep(3), 1200);
      setTimeout(() => setAnalysisStep(4), 1800);
      setTimeout(() => {
        loadPreset(activePresetId);
        setIsAnalyzing(false);
        navigate('/scan/result');
      }, 2400);
      return;
    }

    // REAL OCR WORKFLOW for uploaded image
    try {
      setAnalysisStep(2); // Detecting text & bounding regions

      const imagePayload = selectedFile || imagePreview;
      const ocrResult = await runRealOCR(imagePayload);

      setAnalysisStep(3); // Extracting Rule 6 declarations

      if (!ocrResult.success) {
        setIsAnalyzing(false);
        setOcrErrorState({
          title: 'Unable to read package text',
          message: ocrResult.error || 'The OCR engine could not process this image.',
          suggestions: [
            'Taking a clearer photo in better lighting',
            'Moving closer to the declaration panel',
            'Holding the package steady to reduce motion blur',
            'Ensuring text contrast against package background',
          ],
        });
        return;
      }

      if (ocrResult.lines.length === 0) {
        setIsAnalyzing(false);
        setOcrErrorState({
          title: 'No readable text detected',
          message: 'The system could not confidently read text from this image.',
          suggestions: [
            'Capture the principal display panel or back declaration panel directly',
            'Improve ambient illumination and avoid glare/flash reflections',
            'Ensure packaging text is right-side up and sharp',
          ],
        });
        return;
      }

      setAnalysisStep(3); // Extracting Rule 6 declarations
      await new Promise(r => setTimeout(r, 450));
      setAnalysisStep(4); // Checking statutory compliance

      await createInspectionFromUpload(
        imagePreview,
        {
          productName: productName || ocrResult.lines[0]?.text,
          brand,
          category,
          location,
        },
        ocrResult
      );

      setIsAnalyzing(false);
      navigate('/scan/result');
    } catch (err: any) {
      setIsAnalyzing(false);
      setOcrErrorState({
        title: 'OCR Service Connection Issue',
        message: 'Could not communicate with the local OCR engine.',
        suggestions: [
          'Ensure the NIRIKSHAK OCR backend is running on port 8000',
          'Check network connectivity',
          'Retry with another packaging photo',
        ],
      });
    }
  };

  return (
    <PageTransition className="space-y-4 sm:space-y-6 max-w-4xl mx-auto pb-8">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: t('nav.history', 'Inspections'), href: '/inspections' },
          { label: t('scanner.title', 'New Product Inspection') },
        ]}
      />

      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-institutional-border p-4 sm:p-6 shadow-subtle">
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase text-govgreen-900">
          <Sparkles className="w-3.5 h-3.5 text-govgreen-900" />
          <span>OFFICIAL FIELD INSPECTION MODULE</span>
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-govink-primary tracking-tight mt-1">
          {t('scanner.title', 'New Product Inspection')}
        </h1>
        <p className="text-xs sm:text-sm text-govink-secondary mt-1 leading-relaxed">
          {t('scanner.subtitle', 'Scan a packaged commodity to analyze mandatory declarations under Legal Metrology Rules, 2011.')}
        </p>
      </div>

      {/* Quick Test Presets (Great for Evaluators) */}
      <div className="bg-white border border-institutional-border rounded-xl p-3.5 sm:p-4 shadow-subtle">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-govgreen-900" />
            <span className="text-xs font-bold text-govink-primary uppercase tracking-wider">
              {t('scanner.samplePills', 'Quick Test Packaged Commodity Samples:')}
            </span>
          </div>
          <span className="text-[10px] text-govink-muted font-mono hidden sm:inline">
            {t('scanner.sampleSub', 'Tap to load sample')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {samplePresets.map(preset => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.id)}
                className={`p-3 rounded-lg border text-left text-xs transition-all flex flex-col justify-between min-h-[48px] cursor-pointer ${
                  isSelected
                    ? 'bg-govgreen-50/80 border-govgreen-900 ring-2 ring-govgreen-600/30 shadow-subtle'
                    : 'bg-institutional-subtle/50 border-institutional-border hover:bg-institutional-subtle text-govink-primary'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-govink-primary truncate pr-2">{preset.title}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono flex-shrink-0 ${
                      preset.status === 'COMPLIANT'
                        ? 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]'
                        : 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]'
                    }`}
                  >
                    Score {preset.score}
                  </span>
                </div>
                <p className="text-[11px] text-govink-secondary mt-1 line-clamp-1">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Image Capture / Upload Area */}
      <Card
        title={t('scanner.uploadTitle', 'Packaging Image Capture')}
        subtitle={t('scanner.uploadPrompt', 'Upload a clear image of the product packaging (PDP & declaration panel)')}
        noPadding
      >
        <div className="p-4 sm:p-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="hidden"
            onChange={handleFileInputChange}
          />

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-4 sm:p-6 flex flex-col items-center justify-center transition-all min-h-[260px] sm:min-h-[320px] ${
              dragActive
                ? 'border-govgreen-700 bg-govgreen-50/50'
                : imagePreview
                ? 'border-institutional-border bg-institutional-bg'
                : 'border-institutional-border bg-institutional-subtle/40 hover:bg-institutional-subtle/70'
            }`}
          >
            {imagePreview ? (
              <div className="w-full flex flex-col items-center space-y-4">
                <div className="relative max-h-[300px] w-auto overflow-hidden rounded-lg border border-institutional-border shadow-elevated bg-white">
                  <img
                    src={imagePreview}
                    alt="Packaging Preview"
                    className="max-h-[280px] sm:max-h-[320px] w-auto object-contain mx-auto"
                  />

                  {/* 21st.dev scan-sweep beam during active inspection */}
                  {isAnalyzing && (
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-govgreen-500 to-transparent shadow-[0_0_12px_rgba(22,101,52,0.9)] animate-scan-sweep pointer-events-none z-10" />
                  )}

                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-govink-primary/80 backdrop-blur-xs text-white px-2 py-1 rounded text-[10px] font-mono">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Image Ready</span>
                  </div>
                </div>

                {/* Retake / Change Controls */}
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    leftIcon={<Camera className="w-4 h-4 text-govgreen-900" />}
                  >
                    {t('scanner.changeImage', 'Change Packaging Image')}
                  </Button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearImage();
                    }}
                    className="p-2.5 rounded-lg text-govred-700 hover:bg-govred-50 border border-institutional-border transition-colors cursor-pointer"
                    title="Remove image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3 py-6">
                <div className="w-16 h-16 rounded-2xl bg-govgreen-50 border border-govgreen-200 text-govgreen-900 flex items-center justify-center mx-auto shadow-subtle">
                  <Camera className="w-8 h-8 text-govgreen-900" />
                </div>
                <div>
                  <div className="font-bold text-sm sm:text-base text-govink-primary">
                    Capture or Choose Packaging Image
                  </div>
                  <div className="text-xs text-govink-secondary mt-0.5">
                    Supports JPG, PNG, WEBP (direct camera &amp; gallery)
                  </div>
                </div>

                {/* Mobile direct buttons */}
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    leftIcon={<Camera className="w-4 h-4" />}
                  >
                    Take Photo / Choose File
                  </Button>
                </div>

                <div className="pt-2 text-[11px] text-govink-muted max-w-sm mx-auto leading-relaxed">
                  Capture principal display panel in good lighting for optical recognition.
                </div>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="mt-3 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-[#991B1B] text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-[#DC2626] flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {ocrErrorState && (
            <div className="mt-3 p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl text-xs text-[#92400E] space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-sm text-[#78350F]">
                <AlertCircle className="w-4 h-4 text-[#D97706] flex-shrink-0" />
                <span>{ocrErrorState.title}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#78350F]">
                {ocrErrorState.message}
              </p>
              <div className="pt-2 border-t border-[#FDE68A]/60">
                <span className="font-bold text-[11px] text-[#78350F] uppercase block mb-1">
                  Recommendations:
                </span>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-[#92400E]">
                  {ocrErrorState.suggestions.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="pt-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleClearImage();
                    setOcrErrorState(null);
                  }}
                  leftIcon={<Camera className="w-3.5 h-3.5 text-forest-700" />}
                >
                  Retake Image
                </Button>
              </div>
            </div>
          )}

          {/* Collapsible Metadata Toggle */}
          <div className="mt-4 pt-4 border-t border-cream-300">
            <button
              type="button"
              onClick={() => setShowMetadata(!showMetadata)}
              className="w-full flex items-center justify-between text-xs font-bold text-ink-secondary hover:text-ink-primary py-1"
            >
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-forest-700" />
                <span>Inspection Location &amp; Commodity Details (Optional)</span>
              </span>
              {showMetadata ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showMetadata && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-2 text-xs animate-fadeIn">
                <div>
                  <label className="block font-semibold text-ink-secondary mb-1">
                    {t('scanner.commodityName', 'Commodity / Product Name')}:
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-cream-400 bg-white text-ink-primary focus:outline-none focus:ring-2 focus:ring-forest-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink-secondary mb-1">
                    {t('scanner.brandName', 'Brand / Trade Mark')}:
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-cream-400 bg-white text-ink-primary focus:outline-none focus:ring-2 focus:ring-forest-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink-secondary mb-1">
                    {t('scanner.category', 'Commodity Category')}:
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-cream-400 bg-white text-ink-primary focus:outline-none focus:ring-2 focus:ring-forest-600"
                  >
                    <option value="Packaged Food">Packaged Food &amp; Snacks</option>
                    <option value="Dairy & Beverages">Dairy &amp; Beverages</option>
                    <option value="Personal Care">Personal Care &amp; Cosmetics</option>
                    <option value="Household Goods">Household Goods &amp; Detergents</option>
                    <option value="Electronics">Electronics &amp; Hardware</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-ink-secondary mb-1">
                    {t('scanner.location', 'Inspection Location')}:
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-cream-400 bg-white text-ink-primary focus:outline-none focus:ring-2 focus:ring-forest-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Primary Analyze Action Button */}
          <div className="mt-5">
            <Button
              variant="primary"
              size="lg"
              className="w-full min-h-[50px] sm:min-h-[54px] text-sm sm:text-base font-bold shadow-elevated"
              onClick={handleStartAnalysis}
              leftIcon={<Sparkles className="w-5 h-5 text-cream-100" />}
            >
              {t('scanner.analyze', 'Analyze Product')}
            </Button>
            <p className="text-[11px] text-center text-ink-muted mt-2 font-mono">
              Evaluates mandatory Rule 6 declarations &amp; unit sale price.
            </p>
          </div>
        </div>
      </Card>

      {/* Sequential AI Analysis Modal */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-govink-primary/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm sm:max-w-md w-full border border-institutional-border shadow-modal p-6 text-center space-y-5 animate-page-enter">
            <div>
              <div className="w-16 h-16 rounded-2xl bg-govgreen-900 text-white flex items-center justify-center mx-auto shadow-md relative">
                <Layers className="w-8 h-8 text-white animate-pulse" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-govink-primary mt-3 tracking-tight">
                {t('scanner.analyzing', 'Analyzing Packaged Commodity...')}
              </h3>
              <p className="text-xs text-govink-secondary mt-0.5">
                Legal Metrology (Packaged Commodities) Rules, 2011
              </p>
            </div>

            {/* Checklist */}
            <div className="space-y-2.5 text-left p-3.5 rounded-xl bg-institutional-subtle border border-institutional-border font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {analysisStep >= 1 ? (
                    <CheckCircle2 className="w-4 h-4 text-govgreen-900" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-institutional-border inline-block" />
                  )}
                  <span className={analysisStep >= 1 ? 'font-bold text-govink-primary' : 'text-govink-muted'}>
                    {t('scanner.step1', 'Step 1: Image received & normalized')}
                  </span>
                </span>
                {analysisStep === 1 && <Loader2 className="w-3.5 h-3.5 text-govgreen-900 animate-spin" />}
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {analysisStep >= 2 ? (
                    <CheckCircle2 className="w-4 h-4 text-govgreen-900" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-institutional-border inline-block" />
                  )}
                  <span className={analysisStep >= 2 ? 'font-bold text-govink-primary' : 'text-govink-muted'}>
                    {t('scanner.step2', 'Step 2: Detecting text & bounding regions')}
                  </span>
                </span>
                {analysisStep === 2 && <Loader2 className="w-3.5 h-3.5 text-govgreen-900 animate-spin" />}
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {analysisStep >= 3 ? (
                    <CheckCircle2 className="w-4 h-4 text-govgreen-900" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-institutional-border inline-block" />
                  )}
                  <span className={analysisStep >= 3 ? 'font-bold text-govink-primary' : 'text-govink-muted'}>
                    {t('scanner.step3', 'Step 3: Extracting Rule 6 declarations')}
                  </span>
                </span>
                {analysisStep === 3 && <Loader2 className="w-3.5 h-3.5 text-govgreen-900 animate-spin" />}
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {analysisStep >= 4 ? (
                    <CheckCircle2 className="w-4 h-4 text-govgreen-900" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-institutional-border inline-block" />
                  )}
                  <span className={analysisStep >= 4 ? 'font-bold text-govink-primary' : 'text-govink-muted'}>
                    {t('scanner.step4', 'Step 4: Checking statutory compliance')}
                  </span>
                </span>
                {analysisStep === 4 && <Loader2 className="w-3.5 h-3.5 text-govgreen-900 animate-spin" />}
              </div>
            </div>

            <div className="w-full bg-institutional-border h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-govgreen-900 h-full transition-all duration-500 rounded-full"
                style={{ width: `${(analysisStep / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
};
