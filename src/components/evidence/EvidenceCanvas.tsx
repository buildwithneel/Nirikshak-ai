import React, { useState, useRef, useMemo, useEffect } from 'react';
import { BoundingBox, ComplianceStatus, VisualEvidence, InspectionRecord } from '../../types';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  MapPin,
  Sparkles,
  Maximize2,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { buildVisualEvidences } from '../../utils/evidenceModel';

interface EvidenceCanvasProps {
  imageUrl: string;
  inspection?: InspectionRecord;
  boundingBoxes?: BoundingBox[];
  visualEvidences?: VisualEvidence[];
  selectedDeclarationKey: string | null;
  onSelectBoundingBox: (declarationKey: string) => void;
  selectedEvidenceId?: string | null;
  onSelectEvidence?: (evidenceId: string) => void;
  selectedDeclarationName?: string;
  className?: string;
}

export const EvidenceCanvas: React.FC<EvidenceCanvasProps> = ({
  imageUrl,
  inspection,
  boundingBoxes = [],
  visualEvidences: propVisualEvidences,
  selectedDeclarationKey,
  onSelectBoundingBox,
  selectedEvidenceId,
  onSelectEvidence,
  selectedDeclarationName,
  className = '',
}) => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Pan, Zoom & Rotation state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [showAnnotations, setShowAnnotations] = useState(true);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Resolve visual evidence list
  const evidences: VisualEvidence[] = useMemo(() => {
    if (propVisualEvidences && propVisualEvidences.length > 0) {
      return propVisualEvidences;
    }
    if (inspection) {
      return buildVisualEvidences(inspection);
    }
    if (boundingBoxes.length > 0) {
      return buildVisualEvidences({
        boundingBoxes,
        declarations: [],
        findings: [],
      } as unknown as InspectionRecord);
    }
    return [];
  }, [propVisualEvidences, inspection, boundingBoxes]);

  // Find all evidences matching current selectedDeclarationKey
  const matchingEvidences = useMemo(() => {
    if (!selectedDeclarationKey) return [];
    return evidences.filter(
      e => e.declarationKey === selectedDeclarationKey || e.id === selectedDeclarationKey
    );
  }, [evidences, selectedDeclarationKey]);

  // Determine current active evidence index for sequential navigation
  const currentEvidenceIndex = useMemo(() => {
    if (evidences.length === 0) return -1;
    if (selectedEvidenceId) {
      const idx = evidences.findIndex(e => e.id === selectedEvidenceId);
      if (idx !== -1) return idx;
    }
    if (selectedDeclarationKey) {
      const idx = evidences.findIndex(
        e => e.declarationKey === selectedDeclarationKey || e.id === selectedDeclarationKey
      );
      if (idx !== -1) return idx;
    }
    return 0;
  }, [evidences, selectedEvidenceId, selectedDeclarationKey]);

  const activeEvidence: VisualEvidence | null =
    currentEvidenceIndex >= 0 && currentEvidenceIndex < evidences.length
      ? evidences[currentEvidenceIndex]
      : null;

  // Zoom and Canvas Handlers
  const handleZoomIn = () => setZoom(prev => Math.min(Math.round((prev + 0.25) * 100) / 100, 3.0));
  const handleZoomOut = () => setZoom(prev => Math.max(Math.round((prev - 0.25) * 100) / 100, 0.75));
  const handleRotate = () => setRotation(prev => ((prev + 90) % 360) as 0 | 90 | 180 | 270);
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  // Drag-to-Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan when zoomed or user drags canvas background
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch Handlers for Mobile / Tablet Field Inspections
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Sequential Navigation Handlers
  const handlePrevEvidence = () => {
    if (evidences.length === 0) return;
    const prevIdx = currentEvidenceIndex <= 0 ? evidences.length - 1 : currentEvidenceIndex - 1;
    const target = evidences[prevIdx];
    if (target) {
      if (target.declarationKey) {
        onSelectBoundingBox(target.declarationKey);
      }
      onSelectEvidence?.(target.id);
    }
  };

  const handleNextEvidence = () => {
    if (evidences.length === 0) return;
    const nextIdx = currentEvidenceIndex >= evidences.length - 1 ? 0 : currentEvidenceIndex + 1;
    const target = evidences[nextIdx];
    if (target) {
      if (target.declarationKey) {
        onSelectBoundingBox(target.declarationKey);
      }
      onSelectEvidence?.(target.id);
    }
  };

  // Status border styles
  const getBoxStyle = (status: ComplianceStatus | undefined, isSelected: boolean, isRelated: boolean) => {
    if (isSelected) {
      return 'border-[#065F46] bg-[#059669]/25 ring-4 ring-[#059669]/50 shadow-lg z-30 scale-[1.01]';
    }
    if (isRelated) {
      return 'border-forest-600 bg-forest-600/15 ring-2 ring-forest-500/40 z-20';
    }
    switch (status) {
      case 'COMPLIANT':
        return 'border-[#059669] bg-[#059669]/10 hover:bg-[#059669]/25 ring-1 ring-[#059669]/40 z-10';
      case 'REVIEW_REQUIRED':
        return 'border-[#D97706] bg-[#D97706]/15 hover:bg-[#D97706]/30 ring-1 ring-[#D97706]/50 z-10';
      case 'POTENTIAL_VIOLATION':
        return 'border-[#DC2626] bg-[#DC2626]/20 hover:bg-[#DC2626]/35 ring-1 ring-[#DC2626]/60 animate-pulse z-10';
      default:
        return 'border-forest-500 bg-forest-500/10 hover:bg-forest-500/20 ring-1 ring-forest-500/30 z-10';
    }
  };

  const getBadgeStyle = (status: ComplianceStatus | undefined, isSelected: boolean) => {
    if (isSelected) return 'bg-forest-900 text-cream-100 ring-2 ring-forest-600 font-bold';
    switch (status) {
      case 'COMPLIANT':
        return 'bg-[#065F46] text-white';
      case 'REVIEW_REQUIRED':
        return 'bg-[#92400E] text-white';
      case 'POTENTIAL_VIOLATION':
        return 'bg-[#991B1B] text-white';
      default:
        return 'bg-forest-800 text-cream-100';
    }
  };

  // Quality badge rendering
  const renderQualityBadge = (quality?: string) => {
    switch (quality) {
      case 'strong':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#065F46] text-cream-100 inline-flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
            <span>Strong Evidence</span>
          </span>
        );
      case 'moderate':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#92400E] text-cream-100 inline-flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24]" />
            <span>Moderate</span>
          </span>
        );
      case 'weak':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#991B1B] text-cream-100 inline-flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F87171]" />
            <span>Weak OCR</span>
          </span>
        );
      case 'uncertain':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-900 text-amber-100 inline-flex items-center gap-1 font-mono">
            <span>Ambiguous</span>
          </span>
        );
      default:
        return null;
    }
  };

  // Check if current selected declaration has zero matching visual evidences
  const isSelectedDeclarationMissing =
    Boolean(selectedDeclarationKey) && matchingEvidences.length === 0;

  return (
    <div
      ref={containerRef}
      className={`relative bg-cream-100 rounded-xl overflow-hidden border border-cream-400 shadow-subtle flex flex-col ${className}`}
    >
      {/* 1. Primary Top Toolbar */}
      <div className="min-h-11 bg-cream-200/90 px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between border-b border-cream-400 text-ink-primary gap-2 z-20">
        {/* Left: Title & Active Region Info */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-primary flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-forest-600 animate-pulse" />
            <span>{t('results.evidenceTitle', 'Visual Evidence & Inspection Overlay')}</span>
          </span>
          <span className="text-[10px] text-ink-muted font-mono bg-cream-300 px-1.5 py-0.5 rounded border border-cream-400">
            {inspection?.isRealOcr ? 'PaddleOCR Layer' : 'Reference Layer'}
          </span>

          {activeEvidence?.spatialRegion && (
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-mono text-forest-900 bg-forest-100/80 px-2 py-0.5 rounded border border-forest-300">
              <MapPin className="w-3 h-3 text-forest-700" />
              <span>{activeEvidence.spatialRegion}</span>
            </span>
          )}
        </div>

        {/* Right: Controls (Annotations, Zoom, Rotate, Reset) */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Annotations Toggle */}
          <button
            type="button"
            onClick={() => setShowAnnotations(!showAnnotations)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
              showAnnotations
                ? 'bg-forest-100 text-forest-800 border border-forest-300'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-cream-300'
            }`}
            title="Toggle Bounding Box Annotations"
          >
            {showAnnotations ? <Eye className="w-3.5 h-3.5 text-forest-700" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-[11px]">
              {showAnnotations ? 'Boxes ON' : 'Boxes OFF'}
            </span>
          </button>

          <div className="h-4 w-px bg-cream-400 mx-0.5" />

          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 0.75}
            className="p-1.5 rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-cream-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Zoom Out (-25%)"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Level Indicator */}
          <span className="text-xs font-mono font-bold text-ink-secondary px-1 min-w-[36px] text-center select-none">
            {Math.round(zoom * 100)}%
          </span>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 3.0}
            className="p-1.5 rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-cream-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Zoom In (+25%)"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Rotate 90° Clockwise */}
          <button
            type="button"
            onClick={handleRotate}
            className={`p-1.5 rounded-lg transition-colors ${
              rotation !== 0
                ? 'bg-forest-100 text-forest-800 border border-forest-300'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-cream-300'
            }`}
            title={`Rotate 90° Clockwise (Current: ${rotation}°)`}
            aria-label="Rotate 90 degrees"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Reset Viewport */}
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-cream-300 transition-colors"
            title="Reset Zoom & Pan (100%)"
            aria-label="Reset viewport"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Sequential Evidence Navigation Bar */}
      {evidences.length > 0 && (
        <div className="h-9 bg-cream-200/60 px-3 sm:px-4 flex items-center justify-between border-b border-cream-300 text-xs text-ink-secondary">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handlePrevEvidence}
              className="p-1 rounded hover:bg-cream-300 text-ink-primary disabled:opacity-30 flex items-center gap-0.5 font-semibold text-[11px] transition-colors"
              title="Previous Evidence"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            <div className="font-mono text-[11px] font-bold text-ink-primary bg-cream-100 px-2 py-0.5 rounded border border-cream-400 shadow-xs">
              Evidence {currentEvidenceIndex + 1} of {evidences.length}
            </div>

            <button
              type="button"
              onClick={handleNextEvidence}
              className="p-1 rounded hover:bg-cream-300 text-ink-primary disabled:opacity-30 flex items-center gap-0.5 font-semibold text-[11px] transition-colors"
              title="Next Evidence"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeEvidence && (
              <>
                <span className="font-mono font-semibold uppercase text-[10px] text-ink-muted hidden sm:inline">
                  {activeEvidence.category.replace(/_/g, ' ')}
                </span>
                {renderQualityBadge(activeEvidence.evidenceStatus)}
              </>
            )}
          </div>
        </div>
      )}

      {/* 3. Image & Bounding Box Viewport */}
      <div
        ref={viewportRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative flex-1 overflow-hidden min-h-[340px] sm:min-h-[420px] lg:min-h-[480px] flex items-center justify-center p-3 sm:p-6 bg-cream-200/40 bg-grid-pattern select-none ${
          zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        }`}
      >
        {/* Missing Declaration Floating Advisory Banner (STRICT RULE: NO FAKE BOUNDING BOXES) */}
        {isSelectedDeclarationMissing && (
          <div className="absolute top-4 inset-x-4 sm:inset-x-8 bg-[#FFFBEB]/95 backdrop-blur-sm border-2 border-[#FDE68A] text-[#92400E] p-3 sm:p-4 rounded-xl shadow-elevated z-30 flex items-start gap-3 transition-all animate-fadeIn">
            <ShieldAlert className="w-5 h-5 text-[#D97706] flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-left">
              <div className="font-bold text-xs sm:text-sm text-[#78350F] flex items-center gap-2 flex-wrap">
                <span>No Reliable Visual Evidence Detected: {selectedDeclarationName || selectedDeclarationKey?.replace(/_/g, ' ')}</span>
                <span className="font-mono text-[10px] bg-[#FEF3C7] text-[#92400E] px-1.5 py-0.2 rounded font-bold border border-[#FDE68A]">
                  MISSING DECLARATION
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#92400E] mt-1 leading-relaxed">
                Mandatory declaration is absent from the scanned packaging panel. Under Legal Metrology (Packaged Commodities) Rules, 2011, verify alternate packaging surfaces (back or side panels) or record statutory non-compliance.
              </p>
            </div>
          </div>
        )}

        {/* Transformable Canvas Surface */}
        <div
          className="relative inline-block max-w-full transition-transform duration-100 ease-out origin-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
          }}
        >
          {/* Packaging Image */}
          <img
            src={imageUrl}
            alt="Packaged Commodity Declaration Panel"
            className="rounded-lg shadow-elevated max-h-[440px] sm:max-h-[500px] w-auto object-contain select-none pointer-events-none border border-cream-400 bg-white"
            draggable={false}
          />

          {/* Resolution-Independent Bounding Box Overlays */}
          {showAnnotations &&
            evidences.map((ev, index) => {
              const box = ev.normalizedBox;
              const isSelected = Boolean(
                (selectedEvidenceId && ev.id === selectedEvidenceId) ||
                (selectedDeclarationKey && ev.declarationKey === selectedDeclarationKey)
              );

              // Multi-evidence related highlight: another line belonging to the same declaration
              const isRelated =
                Boolean(selectedDeclarationKey) &&
                ev.declarationKey === selectedDeclarationKey &&
                !isSelected;

              // Smart Adaptive Label Placement: If box is in the upper 12% of the package, place label below
              const isNearTopEdge = box.y < 12;

              // Find associated declaration compliance status if known
              const declStatus: ComplianceStatus | undefined = inspection?.declarations.find(
                d => d.key === ev.declarationKey
              )?.status;

              return (
                <div
                  key={ev.id}
                  onClick={e => {
                    e.stopPropagation();
                    if (ev.declarationKey) {
                      onSelectBoundingBox(ev.declarationKey);
                    }
                    onSelectEvidence?.(ev.id);
                  }}
                  style={{
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`,
                  }}
                  className={`absolute border-2 cursor-pointer transition-all duration-150 rounded ${getBoxStyle(
                    declStatus,
                    isSelected,
                    isRelated
                  )}`}
                  title={`${ev.text} (${ev.confidence}% OCR confidence)`}
                >
                  {/* Smart Adaptive Floating Label */}
                  <div
                    className={`absolute ${
                      isNearTopEdge ? 'top-full mt-1' : '-top-5 sm:-top-6'
                    } left-0 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-mono tracking-wide flex items-center gap-1 shadow-subtle whitespace-nowrap z-20 pointer-events-none ${getBadgeStyle(
                      declStatus,
                      isSelected
                    )}`}
                  >
                    <span className="font-bold">
                      {ev.text.length > 22 ? ev.text.slice(0, 20) + '…' : ev.text}
                    </span>
                    <span className="opacity-90 font-mono text-[9px]">
                      ({ev.confidence}%)
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* 4. Bottom Canvas Legend & Controls */}
      <div className="h-9 bg-cream-200/90 px-3 sm:px-4 border-t border-cream-400 flex items-center justify-between text-[11px] text-ink-secondary z-20">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#059669]" />
            <span>{t('status.compliant', 'Compliant')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#D97706]" />
            <span>{t('status.reviewRequired', 'Review')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#DC2626]" />
            <span>{t('status.potentialViolation', 'Potential Non-Compliance')}</span>
          </div>
        </div>

        <div className="text-[10px] text-ink-muted font-mono hidden md:flex items-center gap-2">
          <span>Resolution-Independent % Coordinates</span>
          <span>•</span>
          <span>Drag to pan when zoomed</span>
        </div>
      </div>
    </div>
  );
};
