import { RentalFormData } from '@/types';
import { DEFAULT_CHECKLIST } from '@/data/vehicles';

// Encode ALL form data (including signatures since they are highly compressed JPEGs, keeping the payload small)
export function encodeShortData(form: RentalFormData): string {
  try {
    const payload = {
      renterName: form.renterName,
      idType: form.idType,
      idNumber: form.idNumber,
      phone: form.phone,
      email: form.email,
      address: form.address,
      vehicleId: form.vehicleId,
      vehicleName: form.vehicleName,
      policeNumber: form.policeNumber,
      startDate: form.startDate,
      startTime: form.startTime,
      flightArrival: form.flightArrival,
      endDate: form.endDate,
      endTime: form.endTime,
      flightDeparture: form.flightDeparture,
      dailyRate: form.dailyRate,
      durationDays: form.durationDays,
      durationHours: form.durationHours,
      totalCharge: form.totalCharge,
      additionalCharge: form.additionalCharge,
      discount: form.discount,
      totalRental: form.totalRental,
      deposit: form.deposit,
      amountPaidNow: form.amountPaidNow,
      totalPayment: form.totalPayment,
      balanceDue: form.balanceDue,
      balance: form.balance,
      vehicleType: form.vehicleType,
      fuelLevel: form.fuelLevel,
      checklist: form.checklist ? form.checklist.map(c => ({ id: c.id, checked: c.checked })) : [],
      damageMarkers: form.damageMarkers || [],
      signatureRental: form.signatureRental || '',
      signatureRenter: form.signatureRenter || '',
    };
    const json = JSON.stringify(payload);
    return btoa(encodeURIComponent(json));
  } catch (e) {
    console.error('Failed to encode:', e);
    return '';
  }
}

export function decodeShortData(str: string): RentalFormData | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(atob(str)));
    
    // Hydrate full checklist labels from default
    const fullChecklist = DEFAULT_CHECKLIST.map(item => {
      const match = parsed.checklist?.find((c: any) => c.id === item.id);
      return {
        ...item,
        checked: match ? match.checked : false
      };
    });

    return {
      ...parsed,
      renterName: parsed.renterName || '',
      idType: parsed.idType || 'KTP',
      idNumber: parsed.idNumber || '',
      phone: parsed.phone || '',
      email: parsed.email || '',
      address: parsed.address || '',
      vehicleId: parsed.vehicleId || '',
      vehicleName: parsed.vehicleName || '',
      policeNumber: parsed.policeNumber || '',
      startDate: parsed.startDate || '',
      startTime: parsed.startTime || '',
      flightArrival: parsed.flightArrival || '',
      endDate: parsed.endDate || '',
      endTime: parsed.endTime || '',
      flightDeparture: parsed.flightDeparture || '',
      dailyRate: Number(parsed.dailyRate) || 0,
      durationDays: Number(parsed.durationDays) || 0,
      durationHours: Number(parsed.durationHours) || 0,
      totalCharge: Number(parsed.totalCharge) || 0,
      additionalCharge: Number(parsed.additionalCharge) || 0,
      discount: Number(parsed.discount) || 0,
      totalRental: Number(parsed.totalRental) || 0,
      deposit: Number(parsed.deposit) || 0,
      amountPaidNow: Number(parsed.amountPaidNow) || 0,
      totalPayment: Number(parsed.totalPayment) || 0,
      balanceDue: Number(parsed.balanceDue) || 0,
      balance: Number(parsed.balance) || 0,
      fuelLevel: Number(parsed.fuelLevel) || 75,
      checklist: fullChecklist,
      damageMarkers: parsed.damageMarkers || [],
      signatureRental: parsed.signatureRental || '',
      signatureRenter: parsed.signatureRenter || '',
    };
  } catch (e) {
    console.error('Failed to decode:', e);
    return null;
  }
}
