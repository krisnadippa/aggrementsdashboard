// Vehicle damage marker position
export interface DamageMarker {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  view: 'front' | 'back' | 'left' | 'right';
}

// Checklist items
export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

// Form data for a rental transaction
export interface RentalFormData {
  // Renter info
  renterName: string;
  idType: string; // Passport, KTP, etc.
  idNumber: string; // KTP/Passport number
  phone: string;
  email: string;
  address: string;

  // Vehicle info
  vehicleId: string;
  vehicleName: string;
  policeNumber: string;

  // Schedule
  startDate: string; // ISO date string
  startTime: string; // HH:mm
  flightArrival: string;
  endDate: string;
  endTime: string;
  flightDeparture: string;

  // Financials
  dailyRate: number;
  durationDays: number;
  durationHours: number;
  totalCharge: number; // Subtotal
  additionalCharge: number;
  discount: number;
  totalRental: number;
  deposit: number;
  amountPaidNow: number;
  totalPayment: number; // Total Payment (Incl. Deposit)
  balanceDue: number;
  balance: number; // For compatibility

  // Vehicle condition
  damageMarkers: DamageMarker[];
  vehicleType: 'petrol' | 'ev'; // Bensin atau Listrik
  fuelLevel: number; // 0-100 (BBM % atau Baterai %)

  // Checklist
  checklist: ChecklistItem[];

  // Signatures (base64 data URLs)
  signatureRental: string;
  signatureRenter: string;

  // Uploaded photos (base64 data URLs)
  ktpPhotos?: string[];
  carPhotos?: string[];

  // Metadata
  invoiceNumber?: string;
}

// Static vehicle data
export interface VehicleData {
  id: string;
  name: string;
  policeNumber: string;
  dailyRate: number;
  category: string;
  transmission: string;
  seats: number;
  color: string;
}

// Stored transaction in localStorage
export interface TransactionRecord {
  id: string;
  invoiceNumber: string;
  createdAt: number; // Unix timestamp (ms)
  expiresAt: number; // createdAt + 24h
  formData: RentalFormData;
}
