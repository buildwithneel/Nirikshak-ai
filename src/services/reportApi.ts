/**
 * NIRIKSHAK AI — PDF Report Client Service
 * Requests official statutory inspection report from backend and triggers direct browser download.
 */

import { InspectionRecord } from '../types';
import { getApiUrl, getAuthHeaders } from './api/config';

export async function generateInspectionPdf(record: InspectionRecord): Promise<Blob> {
  const response = await fetch(getApiUrl('/api/reports/generate-pdf'), {
    method: 'POST',
    headers: getAuthHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(record),
  });

  if (!response.ok) {
    let errorDetail = 'PDF report generation failed.';
    try {
      const errJson = await response.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return await response.blob();
}

/**
 * Triggers direct browser download of the generated PDF inspection report
 */
export async function downloadInspectionPdf(record: InspectionRecord): Promise<string> {
  const blob = await generateInspectionPdf(record);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const filename = `NIRIKSHAK_AI_${record.id || 'INSPECTION'}.pdf`.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  return filename;
}
