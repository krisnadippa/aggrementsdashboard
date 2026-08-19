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
    console.warn('LocalStorage quota exceeded. Attempting to prune photos from older transactions to free up space...', e);
    
    // Create a copy of records to modify
    let prunedRecords = [...records];

    // 1. First attempt: Prune photos (KTP & Car photos) from older transactions
    // Sort by createdAt so we prune the oldest transactions first
    const sortedIndices = prunedRecords
      .map((rec, index) => ({ id: rec.id, createdAt: rec.createdAt, index }))
      .sort((a, b) => a.createdAt - b.createdAt);

    for (const item of sortedIndices) {
      const rec = prunedRecords[item.index];
      const hasPhotos = (rec.formData.ktpPhotos && rec.formData.ktpPhotos.length > 0) || 
                        (rec.formData.carPhotos && rec.formData.carPhotos.length > 0);
      
      if (hasPhotos) {
        prunedRecords[item.index] = {
          ...rec,
          formData: {
            ...rec.formData,
            ktpPhotos: [],
            carPhotos: []
          }
        };

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(prunedRecords));
          console.log('Successfully freed up space by pruning photos from transaction:', rec.invoiceNumber);
          return; // Saved successfully!
        } catch (err) {
          // If still quota exceeded, keep pruning
        }
      }
    }

    // 2. Second attempt: Delete the oldest transaction records completely until it fits
    // (excluding the very last record which is the one currently being created/edited)
    const oldestFirst = [...prunedRecords].sort((a, b) => a.createdAt - b.createdAt);
    const newestRecordId = records[records.length - 1]?.id;

    while (oldestFirst.length > 1) {
      const oldest = oldestFirst[0];
      if (oldest.id === newestRecordId) {
        // Don't delete the record we are trying to save
        break;
      }
      oldestFirst.shift(); // Remove oldest from array
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(oldestFirst));
        console.log('Successfully freed up space by deleting old transaction record:', oldest.invoiceNumber);
        return; // Saved successfully!
      } catch (err) {
        // Keep deleting oldest until it fits
      }
    }

    console.error('Failed to write to localStorage even after pruning:', e);
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
  const invoiceNumber = formData.invoiceNumber || generateInvoiceNumber();
  
  // Make sure formData also contains the invoiceNumber
  formData.invoiceNumber = invoiceNumber;

  const record: TransactionRecord = {
    id: customId || generateId(),
    invoiceNumber: invoiceNumber,
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

/**
 * Compress base64 image using canvas to prevent exceeding localStorage quota.
 */
export function compressImage(base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.6): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Keep aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
}
