export type ComplianceStatus = 'COMPLIANT' | 'REVIEW_REQUIRED' | 'POTENTIAL_VIOLATION';

export type ProductPackagingPerspective = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

export type EvidenceQualityStatus = 'strong' | 'moderate' | 'weak' | 'uncertain';

export type EvidenceCategory =
  | 'commodity_name'
  | 'net_quantity'
  | 'mrp'
  | 'manufacturer'
  | 'consumer_care'
  | 'date'
  | 'other';

export interface VisualEvidence {
  id: string;
  sourceLineId: string;
  declarationKey?: string;
  findingId?: string;
  text: string;
  confidence: number; // OCR Confidence (0-100)
  extractionConfidence?: number; // Extraction Confidence (0-100)
  category: EvidenceCategory;
  evidenceStatus: EvidenceQualityStatus;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  normalizedBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  spatialRegion?: string;
  isMultiCandidate?: boolean;
  candidateIndex?: number;
  candidateCount?: number;
  panel?: string | null;
  notes?: string;
}

export interface BoundingBox {
  id: string;
  label: string;
  declarationKey: string;
  status: ComplianceStatus;
  confidence: number;
  // Normalized 0-100 percentage coordinates for responsive overlay
  x: number;
  y: number;
  width: number;
  height: number;
  extractedText: string;
}

export interface DeclarationCheck {
  id: string;
  key: string;
  name: string;
  ruleReference: string;
  ruleClause: string;
  detectedValue: string;
  status: ComplianceStatus;
  confidence: number; // Extraction confidence (0-100)
  extractionConfidence?: number;
  normalizedValue?: any;
  sourceLineIds?: string[];
  whatDetected?: string;
  whatExpected?: string;
  reason?: string;
  boundingBoxId?: string;
  panelLocation: string;
  legalStandard: string;
  aiNotes: string;
  officerRemarks?: string;
  officerOverridden?: boolean;
}

export interface StatutoryFinding {
  id: string;
  ruleId: string;
  ruleReference: string;
  statutoryTitle: string;
  declarationKey: string;
  status: ComplianceStatus;
  whatDetected: string;
  whatExpected: string;
  reason: string;
  extractionConfidence: number;
  sourceLineIds: string[];
}

export interface InspectionRecord {
  id: string;
  productName: string;
  brand: string;
  category: string;
  commodityType: string;
  batchNumber?: string;
  inspectionLocation: string;
  district: string;
  state: string;
  date: string;
  timestamp: string;
  officerName: string;
  officerDesignation: string;
  overallStatus: ComplianceStatus;
  complianceScore: number;
  imageUrl: string;
  perspective: ProductPackagingPerspective;
  declarations: DeclarationCheck[];
  findings?: StatutoryFinding[];
  complianceSummary?: {
    totalRules: number;
    compliantCount: number;
    reviewRequiredCount: number;
    potentialViolationCount: number;
  };
  boundingBoxes: BoundingBox[];
  visualEvidences?: VisualEvidence[];
  requiresOfficerReview: boolean;
  reviewNotes?: string;
  evidenceNotes?: string;
  ocrText?: string;
  ocrLines?: {
    id: string;
    text: string;
    confidence: number;
    bounding_box: { x: number; y: number; width: number; height: number };
    normalized_box: { x: number; y: number; width: number; height: number };
  }[];
  ocrProcessingTimeMs?: number;
  complianceProcessingTimeMs?: number;
  isRealOcr?: boolean;
  // Prompt 6: Persistent Record & Audit Metadata
  schemaVersion?: number;
  source?: 'camera' | 'upload' | 'quick_test';
  createdAt?: string;
  updatedAt?: string;
  officerNotes?: string;
  reportGeneratedAt?: string;
  workflowStatus?: 'draft' | 'pending_review' | 'reviewed' | 'completed';
}

export interface ProductRecord {
  id: string;
  gtinOrBarcode: string;
  name: string;
  brand: string;
  manufacturer: string;
  category: string;
  netQuantityDeclared: string;
  mrpDeclared: string;
  lastInspectedDate: string;
  totalInspections: number;
  overallCompliance: 'Compliant' | 'Watchlist' | 'High Risk';
  riskScore: number; // 0-100
  imageUrl: string;
}

export interface LegalMetrologyRule {
  id: string;
  ruleNumber: string;
  title: string;
  subClause: string;
  summary: string;
  applicableCommodities: string;
  statutoryRequirement: string;
  sourceDocument: string;
  version: string;
  amendmentYear: string;
  mandatoryFields: string[];
}

export interface DashboardStats {
  totalInspections: number;
  totalInspectionsTrend: number;
  compliantCount: number;
  compliantTrend: number;
  reviewRequiredCount: number;
  reviewTrend: number;
  violationCount: number;
  violationTrend: number;
}
