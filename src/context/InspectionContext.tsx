import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { InspectionRecord, ComplianceStatus, DeclarationCheck, BoundingBox, StatutoryFinding } from '../types';
import { mockDefaultInspectionRecord, samplePresets } from '../data/mockScanResult';
import { mockInspectionsList } from '../data/mockInspections';
import { OCRResponse } from '../services/ocrApi';
import { analyzeCompliance } from '../services/complianceApi';
import { buildVisualEvidences } from '../utils/evidenceModel';
import {
  saveInspection,
  getAllInspections,
  deleteInspection,
  getInspection,
  generateInspectionId,
} from '../services/storage/inspectionStorage';

interface InspectionContextType {
  currentInspection: InspectionRecord;
  setCurrentInspection: React.Dispatch<React.SetStateAction<InspectionRecord>>;
  inspections: InspectionRecord[];
  selectedDeclarationKey: string | null;
  setSelectedDeclarationKey: (key: string | null) => void;
  loadPreset: (presetId: string) => void;
  updateDeclarationReview: (declarationId: string, status: ComplianceStatus, remarks: string) => void;
  updateOfficerNotes: (notes: string) => void;
  toggleMarkForReview: (notes?: string) => void;
  createInspectionFromUpload: (
    imageDataUrl: string,
    metadata: { productName?: string; brand?: string; category?: string; location?: string },
    ocrResult?: OCRResponse
  ) => Promise<void>;
  saveCurrentInspection: (notes?: string) => Promise<InspectionRecord>;
  deleteInspectionRecord: (id: string) => Promise<void>;
  openInspectionById: (id: string) => Promise<InspectionRecord | null>;
  refreshInspections: () => Promise<void>;
}

const InspectionContext = createContext<InspectionContextType | undefined>(undefined);

const STORAGE_KEY = 'nirikshak_active_inspection';

export const InspectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inspections, setInspections] = useState<InspectionRecord[]>(() => {
    return mockInspectionsList.map(item => ({
      ...item,
      schemaVersion: 1,
      source: 'quick_test' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  });

  const [currentInspection, setCurrentInspection] = useState<InspectionRecord>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.visualEvidences || parsed.visualEvidences.length === 0) {
          parsed.visualEvidences = buildVisualEvidences(parsed);
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load inspection from sessionStorage', e);
    }
    const defaultRec = { ...mockDefaultInspectionRecord };
    defaultRec.visualEvidences = buildVisualEvidences(defaultRec);
    return defaultRec;
  });

  const [selectedDeclarationKey, setSelectedDeclarationKey] = useState<string | null>('consumer_care');

  // Fetch all persisted inspections from IndexedDB on startup
  const refreshInspections = useCallback(async () => {
    try {
      const stored = await getAllInspections();
      if (stored && stored.length > 0) {
        setInspections(stored);
      }
    } catch (err) {
      console.warn('IndexedDB initial fetch notice:', err);
    }
  }, []);

  useEffect(() => {
    refreshInspections();
  }, [refreshInspections]);

  // Persist active inspection session to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(currentInspection));
    } catch (e) {
      console.error('Failed to save to sessionStorage', e);
    }
  }, [currentInspection]);

  const loadPreset = (presetId: string) => {
    const preset = samplePresets.find(p => p.id === presetId);
    if (!preset) return;

    const presetFindings: StatutoryFinding[] = preset.declarations.map((d, idx) => ({
      id: `preset-finding-${idx + 1}`,
      ruleId: d.ruleClause || `RULE_6_1_${idx + 1}`,
      ruleReference: d.ruleReference,
      statutoryTitle: d.name,
      declarationKey: d.key,
      status: d.status,
      whatDetected: d.detectedValue,
      whatExpected: d.legalStandard,
      reason: d.aiNotes || `Statutory analysis under ${d.ruleReference}.`,
      extractionConfidence: d.confidence,
      sourceLineIds: d.boundingBoxId ? [d.boundingBoxId] : [],
    }));

    const compliantCount = presetFindings.filter(f => f.status === 'COMPLIANT').length;
    const reviewCount = presetFindings.filter(f => f.status === 'REVIEW_REQUIRED').length;
    const violationCount = presetFindings.filter(f => f.status === 'POTENTIAL_VIOLATION').length;

    const newRecord: InspectionRecord = {
      ...mockDefaultInspectionRecord,
      id: generateInspectionId(),
      productName: preset.productName,
      brand: preset.brand,
      category: preset.category,
      inspectionLocation: preset.location,
      overallStatus: preset.status,
      complianceScore: preset.score,
      imageUrl: preset.imageUrl,
      schemaVersion: 1,
      source: 'quick_test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      declarations: preset.declarations.map(d => ({
        ...d,
        extractionConfidence: d.confidence,
        whatDetected: d.detectedValue,
        whatExpected: d.legalStandard,
        reason: d.aiNotes,
      })),
      findings: presetFindings,
      complianceSummary: {
        totalRules: presetFindings.length,
        compliantCount,
        reviewRequiredCount: reviewCount,
        potentialViolationCount: violationCount,
      },
      boundingBoxes: preset.boundingBoxes,
      requiresOfficerReview: preset.status !== 'COMPLIANT',
      date: '16 September 2026',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour12: false }) + ' IST',
    };

    newRecord.visualEvidences = buildVisualEvidences(newRecord);
    setCurrentInspection(newRecord);
    const isIssue = (preset.status as ComplianceStatus) !== 'COMPLIANT';
    if (isIssue) {
      setSelectedDeclarationKey('consumer_care');
    } else {
      setSelectedDeclarationKey(preset.declarations[0]?.key || null);
    }
  };

  const updateDeclarationReview = (declarationId: string, status: ComplianceStatus, remarks: string) => {
    setCurrentInspection(prev => {
      const updatedDeclarations = prev.declarations.map(dec => {
        if (dec.id === declarationId) {
          return {
            ...dec,
            status,
            officerRemarks: remarks,
            officerOverridden: true,
          };
        }
        return dec;
      });

      const updatedFindings = (prev.findings || []).map(f => {
        const matchingDec = updatedDeclarations.find(d => d.id === declarationId);
        if (matchingDec && f.declarationKey === matchingDec.key) {
          return {
            ...f,
            status,
            reason: remarks ? `[Officer Override]: ${remarks}` : f.reason,
          };
        }
        return f;
      });

      const updatedBoxes = prev.boundingBoxes.map(box => {
        const matchingDec = updatedDeclarations.find(d => d.id === declarationId);
        if (matchingDec && (box.declarationKey === matchingDec.key || box.id === matchingDec.boundingBoxId)) {
          return {
            ...box,
            status,
          };
        }
        return box;
      });

      const hasViolation = updatedDeclarations.some(d => d.status === 'POTENTIAL_VIOLATION');
      const hasReview = updatedDeclarations.some(d => d.status === 'REVIEW_REQUIRED');
      const overallStatus: ComplianceStatus = hasViolation
        ? 'POTENTIAL_VIOLATION'
        : hasReview
        ? 'REVIEW_REQUIRED'
        : 'COMPLIANT';

      const updatedRecord: InspectionRecord = {
        ...prev,
        declarations: updatedDeclarations,
        findings: updatedFindings,
        boundingBoxes: updatedBoxes,
        overallStatus,
        requiresOfficerReview: overallStatus !== 'COMPLIANT',
        updatedAt: new Date().toISOString(),
      };

      updatedRecord.visualEvidences = buildVisualEvidences(updatedRecord);
      return updatedRecord;
    });
  };

  const updateOfficerNotes = (notes: string) => {
    setCurrentInspection(prev => ({
      ...prev,
      officerNotes: notes,
      updatedAt: new Date().toISOString(),
    }));
  };

  const toggleMarkForReview = (notes?: string) => {
    setCurrentInspection(prev => ({
      ...prev,
      requiresOfficerReview: !prev.requiresOfficerReview,
      reviewNotes: notes || prev.reviewNotes,
      updatedAt: new Date().toISOString(),
    }));
  };

  const createInspectionFromUpload = async (
    imageDataUrl: string,
    metadata: { productName?: string; brand?: string; category?: string; location?: string },
    ocrResult?: OCRResponse
  ) => {
    const newId = generateInspectionId();
    let declarations = mockDefaultInspectionRecord.declarations;
    let findings = mockDefaultInspectionRecord.findings || [];
    let complianceSummary = mockDefaultInspectionRecord.complianceSummary;
    let overallStatus: ComplianceStatus = 'REVIEW_REQUIRED';
    let complianceScore = 78;
    let boundingBoxes: BoundingBox[] = [];
    let complianceProcessingTimeMs = 0;

    if (ocrResult && ocrResult.lines && ocrResult.lines.length > 0) {
      const complianceRes = await analyzeCompliance(
        ocrResult.lines,
        ocrResult.text || '',
        ocrResult.image_width || 800,
        ocrResult.image_height || 600
      );
      if (complianceRes && complianceRes.success) {
        complianceProcessingTimeMs = complianceRes.processing_time_ms;
        overallStatus = complianceRes.overall_status;
        complianceScore = complianceRes.compliance_score;
        complianceSummary = {
          totalRules: complianceRes.summary.total_rules,
          compliantCount: complianceRes.summary.compliant_count,
          reviewRequiredCount: complianceRes.summary.review_required_count,
          potentialViolationCount: complianceRes.summary.potential_violation_count,
        };
        findings = complianceRes.findings.map(f => ({
          id: f.id,
          ruleId: f.rule_id,
          ruleReference: f.rule_reference,
          statutoryTitle: f.statutory_title,
          declarationKey: f.declaration_key,
          status: f.status,
          whatDetected: f.what_detected,
          whatExpected: f.what_expected,
          reason: f.reason,
          extractionConfidence: f.extraction_confidence,
          sourceLineIds: f.source_line_ids,
        }));

        declarations = Object.entries(complianceRes.declarations).map(([key, d], idx) => {
          const finding = findings.find(f => f.declarationKey === key);
          const status: ComplianceStatus =
            d.status === 'detected'
              ? (finding?.status || 'COMPLIANT')
              : d.status === 'uncertain'
              ? 'REVIEW_REQUIRED'
              : 'POTENTIAL_VIOLATION';

          return {
            id: `dec-real-${idx + 1}`,
            key,
            name: d.label,
            ruleReference: finding?.ruleReference || 'Rule 6(1)',
            ruleClause: 'Legal Metrology (Packaged Commodities) Rules, 2011',
            detectedValue: d.detected_value || '[NOT DETECTED]',
            normalizedValue: d.normalized_value,
            status,
            confidence: Math.round(d.confidence * 100),
            extractionConfidence: Math.round(d.confidence * 100),
            sourceLineIds: d.source_line_ids,
            panelLocation: 'Packaging Declaration Surface',
            legalStandard: finding?.whatExpected || 'Mandatory declaration under Rule 6',
            aiNotes: d.notes || '',
          };
        });

        boundingBoxes = ocrResult.lines.map((line, idx) => {
          const matchedDecl = declarations.find(d => d.sourceLineIds?.includes(line.id));
          const declKey = matchedDecl ? matchedDecl.key : `ocr_item_${idx + 1}`;
          const bboxStatus: ComplianceStatus = matchedDecl ? matchedDecl.status : 'COMPLIANT';

          return {
            id: line.id || `real-bbox-${idx + 1}`,
            label: line.text.length > 20 ? line.text.slice(0, 18) + '...' : line.text,
            declarationKey: declKey,
            status: bboxStatus,
            confidence: Math.round(line.confidence * 100),
            x: line.normalized_box.x,
            y: line.normalized_box.y,
            width: line.normalized_box.width,
            height: line.normalized_box.height,
            extractedText: line.text,
          };
        });
      }
    }

    const detectedCommodity = declarations.find(d => d.key === 'commodity_name')?.detectedValue;
    const finalProductName = metadata.productName || detectedCommodity || ocrResult?.lines[0]?.text || 'Inspected Packaged Commodity';

    const newRecord: InspectionRecord = {
      ...mockDefaultInspectionRecord,
      id: newId,
      productName: finalProductName,
      brand: metadata.brand || 'Commercial Brand',
      category: metadata.category || 'Packaged Commodities',
      inspectionLocation: metadata.location || 'Local Retail Outlet, Central District',
      imageUrl: imageDataUrl,
      schemaVersion: 1,
      source: 'upload',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      date: '16 September 2026',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour12: false }) + ' IST',
      overallStatus,
      complianceScore,
      declarations,
      findings,
      complianceSummary,
      boundingBoxes,
      requiresOfficerReview: overallStatus !== 'COMPLIANT',
      ocrText: ocrResult?.text,
      ocrLines: ocrResult?.lines,
      ocrProcessingTimeMs: ocrResult?.processing_time_ms,
      complianceProcessingTimeMs,
      isRealOcr: !!ocrResult && ocrResult.lines.length > 0,
    };

    newRecord.visualEvidences = buildVisualEvidences(newRecord);
    setCurrentInspection(newRecord);
    setInspections(prev => [newRecord, ...prev]);
    setSelectedDeclarationKey(declarations[0]?.key || 'net_quantity');
  };

  /**
   * Save the current inspection to IndexedDB and update local list
   */
  const saveCurrentInspection = async (notes?: string): Promise<InspectionRecord> => {
    const recordToSave: InspectionRecord = {
      ...currentInspection,
      officerNotes: notes !== undefined ? notes : currentInspection.officerNotes,
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveInspection(recordToSave);
    setCurrentInspection(saved);
    await refreshInspections();
    return saved;
  };

  /**
   * Delete an inspection from IndexedDB
   */
  const deleteInspectionRecord = async (id: string): Promise<void> => {
    await deleteInspection(id);
    await refreshInspections();
  };

  /**
   * Open an existing inspection by ID from IndexedDB
   */
  const openInspectionById = async (id: string): Promise<InspectionRecord | null> => {
    const record = await getInspection(id);
    if (record) {
      if (!record.visualEvidences || record.visualEvidences.length === 0) {
        record.visualEvidences = buildVisualEvidences(record);
      }
      setCurrentInspection(record);
      setSelectedDeclarationKey(record.declarations[0]?.key || null);
      return record;
    }
    return null;
  };

  return (
    <InspectionContext.Provider
      value={{
        currentInspection,
        setCurrentInspection,
        inspections,
        selectedDeclarationKey,
        setSelectedDeclarationKey,
        loadPreset,
        updateDeclarationReview,
        updateOfficerNotes,
        toggleMarkForReview,
        createInspectionFromUpload,
        saveCurrentInspection,
        deleteInspectionRecord,
        openInspectionById,
        refreshInspections,
      }}
    >
      {children}
    </InspectionContext.Provider>
  );
};

export const useInspection = () => {
  const context = useContext(InspectionContext);
  if (!context) {
    throw new Error('useInspection must be used within an InspectionProvider');
  }
  return context;
};
