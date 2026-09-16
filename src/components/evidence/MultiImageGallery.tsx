import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  Plus,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Trash2,
  Eye,
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { InspectionImageItem, imagesApi } from '../../services/api/imagesApi';
import { Button } from '../ui/Button';

interface MultiImageGalleryProps {
  inspectionId: string;
  images: InspectionImageItem[];
  selectedImageId: string | null;
  onSelectImage: (image: InspectionImageItem) => void;
  onRefresh: () => void;
  onRunOCR: (imageId: string) => Promise<void>;
  isReadOnly?: boolean;
}

const PANEL_TYPES = [
  { id: 'ALL', label: 'ALL PANELS' },
  { id: 'FRONT', label: 'FRONT' },
  { id: 'BACK', label: 'BACK' },
  { id: 'LEFT_SIDE', label: 'LEFT SIDE' },
  { id: 'RIGHT_SIDE', label: 'RIGHT SIDE' },
  { id: 'TOP', label: 'TOP' },
  { id: 'BOTTOM', label: 'BOTTOM' },
  { id: 'OTHER', label: 'OTHER' },
];

export const MultiImageGallery: React.FC<MultiImageGalleryProps> = ({
  inspectionId,
  images,
  selectedImageId,
  onSelectImage,
  onRefresh,
  onRunOCR,
  isReadOnly = false,
}) => {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedPanelForUpload, setSelectedPanelForUpload] = useState('UNKNOWN');
  const [ocrRunningId, setOcrRunningId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const filteredImages = images.filter(img => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'SIDE') {
      return img.panel_type === 'LEFT_SIDE' || img.panel_type === 'RIGHT_SIDE';
    }
    return img.panel_type === activeFilter;
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, source: string = 'OFFICER_ADDED') => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadError(null);

    // Client-side quick check
    const validExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = validExts.some(ext => lowerName.endsWith(ext));

    if (!hasValidExt) {
      setUploadError('Unsupported file type. Please upload JPG, PNG, or WEBP images.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Image is too large (maximum size is 15MB). Please compress the photo.');
      return;
    }

    if (images.length >= 10) {
      setUploadError('Maximum limit of 10 package images reached for this inspection.');
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await imagesApi.uploadInspectionImage(
        inspectionId,
        file,
        selectedPanelForUpload,
        source
      );
      setShowUploadModal(false);
      onRefresh();
      onSelectImage(uploaded);

      // Trigger OCR automatically on uploaded image
      try {
        setOcrRunningId(uploaded.id);
        await onRunOCR(uploaded.id);
      } catch (ocrErr) {
        console.warn('Auto-OCR failed, user can retry:', ocrErr);
      } finally {
        setOcrRunningId(null);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload package evidence.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handlePanelChange = async (imageId: string, newPanel: string) => {
    try {
      await imagesApi.updatePanelType(imageId, newPanel);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update panel classification.');
    }
  };

  const handleDelete = async (imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this package image evidence?')) return;
    try {
      await imagesApi.deleteInspectionImage(imageId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete image.');
    }
  };

  const handleRetryOCR = async (imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOcrRunningId(imageId);
    try {
      await onRunOCR(imageId);
    } catch (err: any) {
      alert(err.message || 'OCR retry failed.');
    } finally {
      setOcrRunningId(null);
    }
  };

  return (
    <div className="bg-white border border-institutional-border rounded-xl p-4 shadow-subtle space-y-4">
      {/* Header & Limits */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-institutional-border">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-govink-primary uppercase tracking-wide">
            Package Evidence Gallery
          </span>
          <span className="text-[11px] font-mono text-govink-secondary px-2 py-0.5 rounded bg-institutional-subtle border border-institutional-border">
            {images.length} / 10 Images
          </span>
        </div>

        {!isReadOnly && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowUploadModal(true)}
            disabled={images.length >= 10 || isUploading}
            className="text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Image
          </Button>
        )}
      </div>

      {/* Panel Classification Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {PANEL_TYPES.map(panel => {
          const isSelected = activeFilter === panel.id;
          const count =
            panel.id === 'ALL'
              ? images.length
              : images.filter(im => im.panel_type === panel.id).length;

          return (
            <button
              key={panel.id}
              onClick={() => setActiveFilter(panel.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-govgreen-800 text-white shadow-subtle'
                  : 'bg-institutional-subtle text-govink-secondary hover:text-govink-primary hover:bg-gray-200/70'
              }`}
            >
              <span>{panel.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-govgreen-950 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Error Alert */}
      {uploadError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded-lg text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="text-red-700 hover:text-red-950 text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Gallery Thumbnail Rail / Grid */}
      {filteredImages.length === 0 ? (
        <div className="border-2 border-dashed border-institutional-border rounded-xl p-8 text-center bg-institutional-subtle/40 space-y-3">
          <Camera className="w-8 h-8 text-govink-muted mx-auto" />
          <div>
            <p className="text-xs font-bold text-govink-primary">No Package Images Found</p>
            <p className="text-[11px] text-govink-secondary mt-0.5">
              {activeFilter === 'ALL'
                ? 'Upload package panels (Front, Back, Side, Top, Bottom) for complete Rule 6 analysis.'
                : `No images classified under ${activeFilter} panel.`}
            </p>
          </div>
          {!isReadOnly && (
            <Button variant="outline" size="sm" onClick={() => setShowUploadModal(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Upload Package Photo
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredImages.map(img => {
            const isSelected = selectedImageId === img.id;
            const isOcrRunning = ocrRunningId === img.id || img.ocr_status === 'PROCESSING';

            return (
              <div
                key={img.id}
                onClick={() => onSelectImage(img)}
                className={`group relative rounded-xl border-2 transition-all cursor-pointer overflow-hidden bg-white flex flex-col justify-between ${
                  isSelected
                    ? 'border-govgreen-800 shadow-md ring-2 ring-govgreen-700/20'
                    : 'border-institutional-border hover:border-gray-400'
                }`}
              >
                {/* Top badges */}
                <div className="p-2 flex items-center justify-between gap-1 z-10 bg-white/90 backdrop-blur-xs border-b border-institutional-border text-[10px] font-mono">
                  <span className="font-bold text-govink-primary">
                    {img.panel_type}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                      img.source === 'CONSUMER_SUBMISSION'
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : 'bg-teal-100 text-teal-900 border border-teal-200'
                    }`}
                  >
                    {img.source === 'CONSUMER_SUBMISSION' ? 'Consumer' : 'Officer'}
                  </span>
                </div>

                {/* Thumbnail Image */}
                <div className="h-28 w-full bg-gray-100 flex items-center justify-center overflow-hidden relative">
                  <img
                    src={imagesApi.getImageContentUrl(img.id)}
                    alt={img.original_filename || 'Package'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Selected Indicator overlay */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-govgreen-950/15 flex items-center justify-center">
                      <span className="px-2 py-0.5 rounded bg-govgreen-900 text-white font-mono text-[9px] font-bold shadow-subtle">
                        Active Canvas
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Status & Actions */}
                <div className="p-2 space-y-1.5 bg-institutional-subtle/60 border-t border-institutional-border">
                  {/* OCR Processing State */}
                  <div className="flex items-center justify-between text-[10px]">
                    {img.ocr_status === 'COMPLETED' ? (
                      <span className="text-govgreen-800 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-govgreen-700" />
                        <span>OCR Ready</span>
                      </span>
                    ) : isOcrRunning ? (
                      <span className="text-amber-800 font-bold flex items-center gap-1 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                        <span>Processing</span>
                      </span>
                    ) : img.ocr_status === 'FAILED' ? (
                      <span className="text-red-700 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-600" />
                        <span>Failed</span>
                      </span>
                    ) : (
                      <span className="text-gray-500 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Queued</span>
                      </span>
                    )}

                    {/* Quick retry button if failed */}
                    {img.ocr_status === 'FAILED' && !isReadOnly && (
                      <button
                        onClick={e => handleRetryOCR(img.id, e)}
                        className="text-[10px] text-govgreen-800 hover:underline font-bold"
                      >
                        Retry
                      </button>
                    )}
                  </div>

                  {/* Panel Reclassification Dropdown */}
                  {!isReadOnly && (
                    <div className="pt-1 flex items-center gap-1">
                      <select
                        value={img.panel_type}
                        onChange={e => {
                          e.stopPropagation();
                          handlePanelChange(img.id, e.target.value);
                        }}
                        onClick={e => e.stopPropagation()}
                        className="w-full text-[10px] font-semibold bg-white border border-institutional-border rounded p-1 text-govink-primary focus:outline-none"
                      >
                        <option value="FRONT">Front Panel</option>
                        <option value="BACK">Back Panel</option>
                        <option value="LEFT_SIDE">Left Side</option>
                        <option value="RIGHT_SIDE">Right Side</option>
                        <option value="TOP">Top</option>
                        <option value="BOTTOM">Bottom</option>
                        <option value="OTHER">Other Panel</option>
                        <option value="UNKNOWN">Unknown</option>
                      </select>

                      <button
                        onClick={e => handleDelete(img.id, e)}
                        title="Delete image evidence"
                        className="p-1 text-govink-muted hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-institutional-border shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-institutional-border">
              <h3 className="text-sm font-bold text-govink-primary flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-govgreen-800" />
                <span>Add Package Image Evidence</span>
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-govink-muted hover:text-govink-primary text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Panel Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-govink-primary">
                Classify Physical Package Panel:
              </label>
              <select
                value={selectedPanelForUpload}
                onChange={e => setSelectedPanelForUpload(e.target.value)}
                className="w-full text-xs bg-institutional-subtle border border-institutional-border rounded-lg p-2 font-medium"
              >
                <option value="FRONT">Front Display Panel (Brand & Commodity Name)</option>
                <option value="BACK">Back Panel (PDP / Mandatory Declarations)</option>
                <option value="LEFT_SIDE">Left Side Gusset</option>
                <option value="RIGHT_SIDE">Right Side Gusset (Consumer Care / Mfd)</option>
                <option value="TOP">Top Lid / Seal (Date / Batch)</option>
                <option value="BOTTOM">Bottom / Underside</option>
                <option value="OTHER">Additional Packaging Evidence</option>
                <option value="UNKNOWN">Unclassified (Review Later)</option>
              </select>
              <p className="text-[11px] text-govink-muted">
                AI Suggested: BACK PANEL • Officer confirmation required.
              </p>
            </div>

            {/* Upload Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Take Photo */}
              <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-govgreen-700 bg-govgreen-50/50 hover:bg-govgreen-50 cursor-pointer transition-colors text-center">
                <Camera className="w-6 h-6 text-govgreen-800" />
                <span className="text-xs font-bold text-govgreen-950">Take Photo</span>
                <span className="text-[10px] text-govgreen-800">Mobile / Tablet Camera</span>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={e => handleFileChange(e, 'CAMERA')}
                  disabled={isUploading}
                />
              </label>

              {/* Upload File / Gallery */}
              <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-institutional-border bg-institutional-subtle/50 hover:bg-institutional-subtle cursor-pointer transition-colors text-center">
                <Upload className="w-6 h-6 text-govink-secondary" />
                <span className="text-xs font-bold text-govink-primary">Upload File</span>
                <span className="text-[10px] text-govink-muted">JPG, PNG, WEBP (Max 15MB)</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  className="hidden"
                  onChange={e => handleFileChange(e, 'OFFICER_ADDED')}
                  disabled={isUploading}
                />
              </label>
            </div>

            {isUploading && (
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-govgreen-900 pt-2">
                <Loader2 className="w-4 h-4 animate-spin text-govgreen-800" />
                <span>Validating & Storing Image Evidence...</span>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUploadModal(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
