import { TransactionRecord, RentalFormData } from '@/types';

const STORAGE_KEY = 'infinitygo_transactions';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a unique invoice number based on timestamp + random suffix.
 * Format: INV-YYYYMMDD-XXXX
 */
export function generateInvoiceNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${date}-${suffix}`;
}

/**
 * Generate a unique transaction ID.
 */
export function generateId(): string {
  return `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Read all raw records from localStorage (without cleanup).
 */
function readAll(): TransactionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TransactionRecord[];
  } catch {
    return [];
  }
}

/**
 * Write all records to localStorage.
 */
function writeAll(records: TransactionRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to write to localStorage:', e);
  }
}

/**
 * Remove entries older than 24 hours. (Disabled: keep indefinitely)
 */
export function cleanupExpired(): void {
  // Disabled auto-cleanup
}

/**
 * Save a new rental transaction.
 * Returns the created TransactionRecord.
 */
export function saveTransaction(formData: RentalFormData, customId?: string): TransactionRecord {
  const now = Date.now();
  const record: TransactionRecord = {
    id: customId || generateId(),
    invoiceNumber: generateInvoiceNumber(),
    createdAt: now,
    expiresAt: now + 100 * 365 * 24 * 60 * 60 * 1000, // 100 years from now (indefinite)
    formData,
  };
  const all = readAll();
  writeAll([...all, record]);
  return record;
}

/**
 * Retrieve all transactions (indefinite).
 */
export function getTransactions(): TransactionRecord[] {
  return readAll();
}

/**
 * Get a single transaction by ID. Returns null if not found.
 */
export function getTransaction(id: string): TransactionRecord | null {
  const all = readAll();
  const found = all.find((r) => r.id === id);
  if (!found) return null;
  return found;
}

/**
 * Delete a transaction manually by ID.
 */
export function deleteTransaction(id: string): void {
  const all = readAll();
  writeAll(all.filter((r) => r.id !== id));
}

/**
 * Update an existing rental transaction's form data.
 * Returns the updated record or null if not found.
 */
export function updateTransaction(id: string, formData: RentalFormData): TransactionRecord | null {
  const all = readAll();
  const index = all.findIndex((r) => r.id === id);
  if (index === -1) return null;
  all[index] = {
    ...all[index],
    formData,
  };
  writeAll(all);
  return all[index];
}

/**
 * Returns how many hours remain until a record expires.
 */
export function hoursUntilExpiry(record: TransactionRecord): number {
  const remaining = record.expiresAt - Date.now();
  return Math.max(0, Math.floor(remaining / (1000 * 60 * 60)));
}
