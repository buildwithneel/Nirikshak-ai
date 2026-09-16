/**
 * NIRIKSHAK AI — Persistent Inspection Storage Layer
 * Robust Promise-based IndexedDB abstraction for Legal Metrology inspection snapshots.
 * Supports complete context persistence (image, OCR lines, findings, visual evidence, officer notes).
 */

import { InspectionRecord } from '../../types';
import { mockInspectionsList } from '../../data/mockInspections';

const DB_NAME = 'nirikshak_legal_metrology_db';
const DB_VERSION = 1;
const STORE_INSPECTIONS = 'inspections';
const STORE_DRAFTS = 'drafts';

/**
 * Generate a canonical collision-resistant inspection ID
 * Format: INSP-YYYYMMDD-XXXX (e.g. INSP-20260916-08F2)
 */
export function generateInspectionId(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePart = `${yyyy}${mm}${dd}`;

  // 4-character random hex suffix
  const randomSuffix = Math.floor(Math.random() * 0x10000)
    .toString(16)
    .toUpperCase()
    .padStart(4, '0');

  return `INSP-${datePart}-${randomSuffix}`;
}

/**
 * Open and initialize the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_INSPECTIONS)) {
        const store = db.createObjectStore(STORE_INSPECTIONS, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('overallStatus', 'overallStatus', { unique: false });
        store.createIndex('productName', 'productName', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB.'));
  });
}

/**
 * Pre-seed initial sample inspections if the store is empty
 */
async function ensurePreSeeded(db: IDBDatabase): Promise<void> {
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_INSPECTIONS, 'readonly');
    const store = tx.objectStore(STORE_INSPECTIONS);
    const countReq = store.count();

    countReq.onsuccess = () => {
      if (countReq.result === 0) {
        const writeTx = db.transaction(STORE_INSPECTIONS, 'readwrite');
        const writeStore = writeTx.objectStore(STORE_INSPECTIONS);

        mockInspectionsList.forEach((mockRec, idx) => {
          const timestamp = new Date(Date.now() - (idx * 3600 * 1000 * 24)).toISOString();
          const record: InspectionRecord = {
            ...mockRec,
            schemaVersion: 1,
            source: 'quick_test',
            createdAt: timestamp,
            updatedAt: timestamp,
            officerNotes: mockRec.reviewNotes || 'Initial baseline reference inspection.',
            workflowStatus: mockRec.overallStatus === 'COMPLIANT' ? 'completed' : 'pending_review',
          };
          writeStore.put(record);
        });

        writeTx.oncomplete = () => resolve();
        writeTx.onerror = () => resolve(); // Non-fatal
      } else {
        resolve();
      }
    };

    countReq.onerror = () => resolve();
  });
}

/**
 * Save an inspection record (creates new or updates existing)
 */
export async function saveInspection(record: InspectionRecord): Promise<InspectionRecord> {
  const db = await openDB();
  const now = new Date().toISOString();

  // Ensure canonical ID format
  let finalId = record.id;
  if (!finalId || finalId.startsWith('LM-2026-')) {
    finalId = generateInspectionId();
  }

  const completeRecord: InspectionRecord = {
    ...record,
    id: finalId,
    schemaVersion: 1,
    source: record.source || (record.isRealOcr ? 'upload' : 'quick_test'),
    createdAt: record.createdAt || now,
    updatedAt: now,
    workflowStatus: record.workflowStatus || (record.overallStatus === 'COMPLIANT' ? 'completed' : 'pending_review'),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_INSPECTIONS, 'readwrite');
    const store = tx.objectStore(STORE_INSPECTIONS);
    const req = store.put(completeRecord);

    req.onsuccess = () => resolve(completeRecord);
    req.onerror = () => reject(req.error || new Error('Failed to save inspection to IndexedDB.'));
  });
}

/**
 * Retrieve a single inspection record by ID
 */
export async function getInspection(id: string): Promise<InspectionRecord | null> {
  const db = await openDB();
  await ensurePreSeeded(db);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_INSPECTIONS, 'readonly');
    const store = tx.objectStore(STORE_INSPECTIONS);
    const req = store.get(id);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error || new Error(`Failed to load inspection ${id}.`));
  });
}

/**
 * Retrieve all inspection records, sorted newest first
 */
export async function getAllInspections(): Promise<InspectionRecord[]> {
  const db = await openDB();
  await ensurePreSeeded(db);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_INSPECTIONS, 'readonly');
    const store = tx.objectStore(STORE_INSPECTIONS);
    const req = store.getAll();

    req.onsuccess = () => {
      const records: InspectionRecord[] = req.result || [];
      // Sort newest first by createdAt or updatedAt
      records.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.date).getTime();
        const timeB = new Date(b.createdAt || b.date).getTime();
        return timeB - timeA;
      });
      resolve(records);
    };
    req.onerror = () => reject(req.error || new Error('Failed to fetch inspections.'));
  });
}

/**
 * Delete an inspection record by ID
 */
export async function deleteInspection(id: string): Promise<boolean> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_INSPECTIONS, 'readwrite');
    const store = tx.objectStore(STORE_INSPECTIONS);
    const req = store.delete(id);

    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error || new Error(`Failed to delete inspection ${id}.`));
  });
}

/**
 * Save draft inspection state without creating an official record
 */
export async function saveDraft(record: InspectionRecord): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DRAFTS, 'readwrite');
    const store = tx.objectStore(STORE_DRAFTS);
    const req = store.put({ key: 'active_draft', record, savedAt: new Date().toISOString() });

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieve active draft inspection if any
 */
export async function getDraft(): Promise<InspectionRecord | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DRAFTS, 'readonly');
    const store = tx.objectStore(STORE_DRAFTS);
    const req = store.get('active_draft');

    req.onsuccess = () => resolve(req.result ? req.result.record : null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Clear draft inspection
 */
export async function clearDraft(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DRAFTS, 'readwrite');
    const store = tx.objectStore(STORE_DRAFTS);
    const req = store.delete('active_draft');

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
