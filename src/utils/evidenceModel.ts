/**
 * Visual Evidence Intelligence & Coordinate Safety Layer
 * Normalizes, validates, and groups OCR bounding boxes into auditable visual evidence
 * linked with statutory compliance findings and mandatory declarations.
 */

import {
  InspectionRecord,
  VisualEvidence,
  EvidenceCategory,
  EvidenceQualityStatus,
  DeclarationCheck,
  StatutoryFinding,
} from '../types';

/**
 * Clamps coordinates to safe 0-100% ranges and rejects invalid dimensions.
 */
export function clampNormalizedBox(box: {
  x: number;
  y: number;
  width: number;
  height: number;
}): { x: number; y: number; width: number; height: number } | null {
  if (
    typeof box.x !== 'number' ||
    typeof box.y !== 'number' ||
    typeof box.width !== 'number' ||
    typeof box.height !== 'number' ||
    isNaN(box.x) ||
    isNaN(box.y) ||
    isNaN(box.width) ||
    isNaN(box.height)
  ) {
    return null;
  }

  const x = Math.max(0, Math.min(99.5, box.x));
  const y = Math.max(0, Math.min(99.5, box.y));
  const width = Math.max(0.5, Math.min(100 - x, box.width));
  const height = Math.max(0.5, Math.min(100 - y, box.height));

  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    width: Math.round(width * 100) / 100,
    height: Math.round(height * 100) / 100,
  };
}

/**
 * Derives a human-understandable spatial region on the package surface.
 */
export function deriveSpatialRegion(box: { x: number; y: number; width: number; height: number }): string {
  const centerY = box.y + box.height / 2;
  const centerX = box.x + box.width / 2;

  let vPos = 'Center Body Panel';
  if (centerY < 32) {
    vPos = 'Upper Principal Display Panel';
  } else if (centerY > 68) {
    vPos = 'Lower Base Panel';
  }

  let hPos = 'Center';
  if (centerX < 33) {
    hPos = 'Left';
  } else if (centerX > 67) {
    hPos = 'Right';
  }

  return `${vPos} (${hPos})`;
}

/**
 * Evaluates the quality status of an evidence segment.
 */
export function evaluateEvidenceQuality(
  ocrConfidence: number,
  extractionConfidence?: number,
  isAmbiguous: boolean = false
): EvidenceQualityStatus {
  if (isAmbiguous) return 'uncertain';
  const effectiveExtraction = extractionConfidence ?? ocrConfidence;

  if (ocrConfidence >= 90 && effectiveExtraction >= 85) {
    return 'strong';
  } else if (ocrConfidence >= 70 && effectiveExtraction >= 60) {
    return 'moderate';
  } else {
    return 'weak';
  }
}

/**
 * Determines the semantic evidence category based on declaration key or text content.
 */
export function getEvidenceCategory(declarationKey?: string, text: string = ''): EvidenceCategory {
  if (!declarationKey) {
    const lower = text.toLowerCase();
    if (/mrp|rs\.|₹|\/g|\/kg/i.test(lower)) return 'mrp';
    if (/net|qty|weight|wt|gram|kg|ml|litre/i.test(lower)) return 'net_quantity';
    if (/mfd|mfg|manufactured|packed|pkd|ltd/i.test(lower)) return 'manufacturer';
    if (/care|toll|1800|helpline|@/i.test(lower)) return 'consumer_care';
    if (/date|batch|exp|mfg/i.test(lower)) return 'date';
    return 'other';
  }

  if (declarationKey.includes('mrp')) return 'mrp';
  if (declarationKey.includes('quantity') || declarationKey.includes('qty')) return 'net_quantity';
  if (declarationKey.includes('manufacturer') || declarationKey.includes('packer')) return 'manufacturer';
  if (declarationKey.includes('consumer') || declarationKey.includes('care')) return 'consumer_care';
  if (declarationKey.includes('date') || declarationKey.includes('packaging')) return 'date';
  if (declarationKey.includes('commodity') || declarationKey.includes('name')) return 'commodity_name';
  return 'other';
}

/**
 * Builds structured, validated VisualEvidence models from the current inspection record.
 */
export function buildVisualEvidences(inspection: InspectionRecord): VisualEvidence[] {
  const evidences: VisualEvidence[] = [];
  const declarations = inspection.declarations || [];
  const findings = inspection.findings || [];
  const ocrLines = inspection.ocrLines || [];

  // If real OCR lines exist
  if (ocrLines.length > 0) {
    ocrLines.forEach((line, idx) => {
      const rawNorm = line.normalized_box || {
        x: (line.bounding_box.x / (inspection.ocrLines?.[0]?.bounding_box.width ? 800 : 100)) * 100,
        y: (line.bounding_box.y / 600) * 100,
        width: 20,
        height: 5,
      };

      const clampedNorm = clampNormalizedBox(rawNorm);
      if (!clampedNorm) return; // Skip malformed/out-of-bounds bounding boxes

      // Find matching declaration by sourceLineIds
      const matchedDecl = declarations.find(d => d.sourceLineIds?.includes(line.id));
      const matchedFinding = matchedDecl
        ? findings.find(f => f.declarationKey === matchedDecl.key)
        : findings.find(f => f.sourceLineIds?.includes(line.id));

      const ocrConf = Math.round(line.confidence * 100);
      const extractionConf = matchedDecl?.extractionConfidence ?? matchedDecl?.confidence;
      const category = getEvidenceCategory(matchedDecl?.key, line.text);
      const isAmbiguous = matchedDecl?.status === 'REVIEW_REQUIRED' && matchedDecl.aiNotes?.includes('Multiple candidate');

      const quality = evaluateEvidenceQuality(ocrConf, extractionConf, isAmbiguous);
      const spatial = deriveSpatialRegion(clampedNorm);

      evidences.push({
        id: `evidence-${line.id || idx + 1}`,
        sourceLineId: line.id,
        declarationKey: matchedDecl?.key,
        findingId: matchedFinding?.id,
        text: line.text,
        confidence: ocrConf,
        extractionConfidence: extractionConf,
        category,
        evidenceStatus: quality,
        boundingBox: line.bounding_box,
        normalizedBox: clampedNorm,
        spatialRegion: spatial,
        isMultiCandidate: isAmbiguous,
        panel: inspection.perspective || 'front',
        notes: matchedFinding?.reason || matchedDecl?.aiNotes,
      });
    });
  } else if (inspection.boundingBoxes && inspection.boundingBoxes.length > 0) {
    // Fallback for Quick Test demo presets
    inspection.boundingBoxes.forEach((box, idx) => {
      // Strict Rule: Never draw a fake bounding box around a missing declaration
      if (
        box.extractedText?.includes('[NOT DETECTED') ||
        box.label?.includes('NOT DETECTED') ||
        box.extractedText?.toLowerCase().includes('not detected')
      ) {
        return;
      }

      const clampedNorm = clampNormalizedBox({
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      });
      if (!clampedNorm) return;

      const matchedDecl = declarations.find(d => d.key === box.declarationKey || d.boundingBoxId === box.id);
      const matchedFinding = findings.find(f => f.declarationKey === box.declarationKey);
      const category = getEvidenceCategory(box.declarationKey, box.extractedText || box.label);

      evidences.push({
        id: `evidence-preset-${box.id || idx + 1}`,
        sourceLineId: box.id,
        declarationKey: box.declarationKey,
        findingId: matchedFinding?.id,
        text: box.extractedText || box.label,
        confidence: box.confidence || 95,
        extractionConfidence: matchedDecl?.confidence || 94,
        category,
        evidenceStatus: box.status === 'COMPLIANT' ? 'strong' : 'moderate',
        boundingBox: {
          x: Math.round(clampedNorm.x * 8),
          y: Math.round(clampedNorm.y * 6),
          width: Math.round(clampedNorm.width * 8),
          height: Math.round(clampedNorm.height * 6),
        },
        normalizedBox: clampedNorm,
        spatialRegion: deriveSpatialRegion(clampedNorm),
        panel: inspection.perspective || 'front',
        notes: matchedDecl?.aiNotes,
      });
    });
  }

  // Deterministic sorting: mapped compliance declarations first, then other text
  evidences.sort((a, b) => {
    if (a.declarationKey && !b.declarationKey) return -1;
    if (!a.declarationKey && b.declarationKey) return 1;
    return (a.normalizedBox.y || 0) - (b.normalizedBox.y || 0);
  });

  return evidences;
}
