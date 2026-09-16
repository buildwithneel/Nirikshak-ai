/**
 * Legal Metrology Compliance API Client
 * Sends OCR lines to the deterministic rule engine on POST /api/compliance/analyze
 */

import { OCRLine } from './ocrApi';
import { getApiUrl } from './api/config';

export interface ExtractedDeclarationField {
  key: string;
  label: string;
  detected_value: string | null;
  normalized_value?: any;
  confidence: number; // Extraction confidence (0.0 - 1.0)
  status: 'detected' | 'missing' | 'uncertain';
  source_line_ids: string[];
  notes?: string;
}

export interface StatutoryComplianceFinding {
  id: string;
  rule_id: string;
  rule_reference: string;
  statutory_title: string;
  declaration_key: string;
  status: 'COMPLIANT' | 'REVIEW_REQUIRED' | 'POTENTIAL_VIOLATION';
  what_detected: string;
  what_expected: string;
  reason: string;
  extraction_confidence: number; // 0 - 100
  source_line_ids: string[];
}

export interface ComplianceSummary {
  total_rules: number;
  compliant_count: number;
  review_required_count: number;
  potential_violation_count: number;
}

export interface ComplianceAnalysisResponse {
  success: boolean;
  declarations: Record<string, ExtractedDeclarationField>;
  findings: StatutoryComplianceFinding[];
  overall_status: 'COMPLIANT' | 'REVIEW_REQUIRED' | 'POTENTIAL_VIOLATION';
  compliance_score: number;
  summary: ComplianceSummary;
  processing_time_ms: number;
  error?: string;
}

export async function analyzeCompliance(
  ocrLines: OCRLine[],
  fullText: string = '',
  imageWidth: number = 0,
  imageHeight: number = 0
): Promise<ComplianceAnalysisResponse> {
  try {
    const response = await fetch(getApiUrl('/api/compliance/analyze'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lines: ocrLines,
        text: fullText,
        image_width: imageWidth,
        image_height: imageHeight,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        success: false,
        declarations: {},
        findings: [],
        overall_status: 'REVIEW_REQUIRED',
        compliance_score: 0,
        summary: {
          total_rules: 0,
          compliant_count: 0,
          review_required_count: 0,
          potential_violation_count: 0,
        },
        processing_time_ms: 0,
        error: errData.error || `Compliance API error: HTTP ${response.status}`,
      };
    }

    const data: ComplianceAnalysisResponse = await response.json();
    return data;
  } catch (err: any) {
    console.error('Compliance API request failed:', err);
    return {
      success: false,
      declarations: {},
      findings: [],
      overall_status: 'REVIEW_REQUIRED',
      compliance_score: 0,
      summary: {
        total_rules: 0,
        compliant_count: 0,
        review_required_count: 0,
        potential_violation_count: 0,
      },
      processing_time_ms: 0,
      error: err.message || 'Network error connecting to compliance engine',
    };
  }
}
