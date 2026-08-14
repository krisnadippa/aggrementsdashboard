'use client';

import { useState, useEffect, useCallback } from 'react';
import { RentalFormData, DamageMarker } from '@/types';
import { DEFAULT_CHECKLIST } from '@/data/vehicles';
import VehicleConditionDiagram from './VehicleConditionDiagram';
import FuelIndicator from './FuelIndicator';
import SignaturePad from './SignaturePad';

interface InvoiceFormProps {
  onSubmit: (data: RentalFormData) => void;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
}

function formatNumberWithDots(val: number | string): string {
  if (val === undefined || val === null || val === '' || val === 0) return '';
  const num = typeof val === 'string' ? parseInt(val.replace(/\D/g, ''), 10) : val;
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('id-ID').format(num);
}

function parseNumberFromDots(str: string): number {
  if (!str) return 0;
  const clean = str.replace(/\./g, '').replace(/\D/g, '');
  const num = parseInt(clean, 10);
  return isNaN(num) ? 0 : num;
}

function calcDuration(startDate: string, startTime: string, endDate: string, endTime: string) {
  if (!startDate || !startTime || !endDate || !endTime) return { days: 0, hours: 0 };
  const start = new Date(`${startDate}T${startTime}`);
  const end = new Date(`${endDate}T${endTime}`);
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return { days: 0, hours: 0 };
  const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return { days, hours };
}

const emptyForm = (): RentalFormData => ({
  renterName: '',
  idType: 'KTP',
  idNumber: '',
  phone: '',
  email: '',
  address: '',
  vehicleId: '',
  vehicleName: '',
  policeNumber: '',
  startDate: '',
  startTime: '08:00',
  flightArrival: '',
  endDate: '',
  endTime: '08:00',
  flightDeparture: '',
  dailyRate: 0,
  durationDays: 0,
  durationHours: 0,
  totalCharge: 0, // Subtotal
  additionalCharge: 0,
  discount: 0,
  totalRental: 0,
  deposit: 0,
  amountPaidNow: 0,
  totalPayment: 0,
  balanceDue: 0,
  balance: 0,
  damageMarkers: [],
  vehicleType: 'petrol',
  fuelLevel: 75,
  checklist: DEFAULT_CHECKLIST.map((c) => ({ ...c })),
  signatureRental: '',
  signatureRenter: '',
});

// Clean SVG Icons for Section Headers
const SectionIcons = {
  Customer: () => (
    <svg className="section-header-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  ),
  Vehicle: () => (
    <svg className="section-header-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2" ry="2"></rect>
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
      <circle cx="5.5" cy="18.5" r="2.5"></circle>
      <circle cx="18.5" cy="18.5" r="2.5"></circle>
    </svg>
  ),
  Period: () => (
    <svg className="section-header-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  ),
  Checklist: () => (
    <svg className="section-header-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
    </svg>
  ),
  Fuel: () => (
    <svg className="section-header-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 22V2h11v20H3zM14 6h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4M9 8h2M9 12h2"></path>
    </svg>
  ),
  Pricing: () => (
    <svg className="section-header-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
  ),
  Save: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
      <polyline points="17 21 17 13 7 13 7 21"></polyline>
      <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
  )
};

export default function InvoiceForm({ onSubmit }: InvoiceFormProps) {
  const [form, setForm] = useState<RentalFormData>(emptyForm());
  const [today, setToday] = useState<string>('');

  useEffect(() => {
    setToday(new Date().toISOString().slice(0, 10));
  }, []);

  // Auto-calculate durations, total rental, total payment, balance due
  useEffect(() => {
    const { days, hours } = calcDuration(form.startDate, form.startTime, form.endDate, form.endTime);
    // Billing calculation: ceil partial day to 1 day
    const billedDays = days + (hours > 0 ? 1 : 0) || (form.startDate && form.endDate ? 1 : 0);
    const subtotal = form.dailyRate * (billedDays || days);
    const totalRental = subtotal + form.additionalCharge - form.discount;
    const totalPayment = totalRental + form.deposit;
    const balanceDue = totalPayment - form.amountPaidNow;

    setForm((prev) => ({
      ...prev,
      durationDays: days,
      durationHours: hours,
      totalCharge: subtotal,
      totalRental: totalRental >= 0 ? totalRental : 0,
      totalPayment: totalPayment >= 0 ? totalPayment : 0,
      balanceDue: balanceDue >= 0 ? balanceDue : 0,
      balance: balanceDue >= 0 ? balanceDue : 0, // compatibility fallback
    }));
  }, [
    form.startDate,
    form.startTime,
    form.endDate,
    form.endTime,
    form.dailyRate,
    form.additionalCharge,
    form.discount,
    form.deposit,
    form.amountPaidNow
  ]);

  const set = useCallback(<K extends keyof RentalFormData>(key: K, value: RentalFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleChecklist = (itemId: string, checked: boolean) => {
    set('checklist', form.checklist.map((c) => c.id === itemId ? { ...c, checked } : c));
  };

  const handleMarkers = useCallback((markers: DamageMarker[]) => {
    set('damageMarkers', markers);
  }, [set]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicleName) { alert('Nama kendaraan wajib diisi.'); return; }
    if (!form.policeNumber) { alert('Nomor polisi wajib diisi.'); return; }
    if (!form.renterName) { alert('Nama penyewa wajib diisi.'); return; }
    if (!form.startDate || !form.endDate) { alert('Tanggal sewa wajib diisi.'); return; }

    const submitData = {
      ...form,
      vehicleId: form.vehicleId || `custom_${Date.now()}`
    };
    onSubmit(submitData);
  };

  return (
    <form className="invoice-form" onSubmit={handleSubmit} id="rental-form">
      
      {/* ─── Top Page Actions ─── */}
      <div className="form-header-bar no-print">
        <div>
          <h1 className="page-title">Buat Perjanjian Sewa</h1>
          <p className="page-subtitle">Isi detail di bawah untuk membuat invoice & perjanjian sewa.</p>
        </div>
      </div>

      <div className="form-main-columns-grid">
        
        {/* ══════════════════ LEFT COLUMN: CUSTOMER ══════════════════ */}
        <div className="form-column-left">
          <section className="form-card-section">
            <div className="card-section-header">
              <SectionIcons.Customer />
              <h2 className="card-section-title">Informasi Pelanggan</h2>
            </div>
            
            <div className="form-fields-stack">
              <div className="form-group">
                <label htmlFor="renterName" className="form-label-custom font-semibold">NAMA LENGKAP <span className="req">*</span></label>
                <input id="renterName" type="text" className="form-input-custom" required
                  value={form.renterName} onChange={(e) => set('renterName', e.target.value)}
                  placeholder="Nama lengkap penyewa" />
              </div>

              <div className="form-grid-2-custom">
                <div className="form-group">
                  <label htmlFor="idType" className="form-label-custom">TIPE IDENTITAS</label>
                  <select id="idType" className="form-input-custom" value={form.idType}
                    onChange={(e) => set('idType', e.target.value)}>
                    <option value="KTP">KTP</option>
                    <option value="Passport">Passport</option>
                    <option value="SIM">SIM</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="idNumber" className="form-label-custom">NOMOR IDENTITAS <span className="req">*</span></label>
                  <input id="idNumber" type="text" className="form-input-custom" required
                    value={form.idNumber} onChange={(e) => set('idNumber', e.target.value)}
                    placeholder="Nomor KTP/Passport" />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="phone" className="form-label-custom">NOMOR TELEPON <span className="req">*</span></label>
                <input id="phone" type="tel" className="form-input-custom" required
                  value={form.phone} onChange={(e) => set('phone', e.target.value)}
                  placeholder="+62 812..." />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label-custom">ALAMAT EMAIL</label>
                <input id="email" type="email" className="form-input-custom"
                  value={form.email} onChange={(e) => set('email', e.target.value)}
                  placeholder="email@domain.com" />
              </div>

              <div className="form-group">
                <label htmlFor="address" className="form-label-custom">ALAMAT LOKAL / HOTEL</label>
                <textarea id="address" className="form-input-custom form-textarea-custom" rows={4}
                  value={form.address} onChange={(e) => set('address', e.target.value)}
                  placeholder="Alamat villa, hotel, atau alamat domisili di Bali" />
              </div>
            </div>
          </section>
        </div>

        {/* ══════════════════ RIGHT COLUMN: VEHICLE & PERIOD & SUMMARY ══════════════════ */}
        <div className="form-column-right">
          
          {/* Card 1: Vehicle Information */}
          <section className="form-card-section">
            <div className="card-section-header">
              <SectionIcons.Vehicle />
              <h2 className="card-section-title">Informasi Kendaraan</h2>
            </div>
            <div className="form-fields-stack">
              <div className="form-group">
                <label htmlFor="vehicleName" className="form-label-custom">NAMA KENDARAAN <span className="req">*</span></label>
                <input id="vehicleName" type="text" className="form-input-custom" required
                  value={form.vehicleName} onChange={(e) => set('vehicleName', e.target.value)}
                  placeholder="Ketik tipe kendaraan (contoh: Honda HRV 2023)" />
              </div>
              <div className="form-grid-2-custom">
                <div className="form-group">
                  <label htmlFor="policeNumber" className="form-label-custom">NOMOR POLISI <span className="req">*</span></label>
                  <input id="policeNumber" type="text" className="form-input-custom" required
                    value={form.policeNumber} onChange={(e) => set('policeNumber', e.target.value)}
                    placeholder="DK 1234 AB" />
                </div>
                <div className="form-group">
                  <label htmlFor="dailyRate" className="form-label-custom">HARGA HARIAN (RP) <span className="req">*</span></label>
                  <input id="dailyRate" type="text" className="form-input-custom" required
                    value={formatNumberWithDots(form.dailyRate)} onChange={(e) => set('dailyRate', parseNumberFromDots(e.target.value))}
                    placeholder="" />
                </div>
              </div>
            </div>
          </section>

          {/* Card 2: Rental Period */}
          <section className="form-card-section">
            <div className="card-section-header">
              <SectionIcons.Period />
              <h2 className="card-section-title">Jadwal Sewa</h2>
            </div>
            <div className="form-grid-2-custom">
              <div className="form-group">
                <label htmlFor="startDate" className="form-label-custom">TANGGAL & WAKTU MULAI <span className="req">*</span></label>
                <div className="datetime-split">
                  <input type="date" className="form-input-custom-date" required
                    value={form.startDate} min={today} onChange={(e) => set('startDate', e.target.value)} />
                  <input type="time" className="form-input-custom-time" required
                    value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="endDate" className="form-label-custom">TANGGAL & WAKTU KEMBALI <span className="req">*</span></label>
                <div className="datetime-split">
                  <input type="date" className="form-input-custom-date" required
                    value={form.endDate} min={form.startDate || today} onChange={(e) => set('endDate', e.target.value)} />
                  <input type="time" className="form-input-custom-time" required
                    value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
                </div>
              </div>
            </div>
            
            <div className="form-grid-2-custom" style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label htmlFor="flightArrival" className="form-label-custom">KEDATANGAN PENERBANGAN (OPSIONAL)</label>
                <input id="flightArrival" type="text" className="form-input-custom"
                  value={form.flightArrival} onChange={(e) => set('flightArrival', e.target.value)}
                  placeholder="Contoh: SQ 948 (12:00)" />
              </div>
              <div className="form-group">
                <label htmlFor="flightDeparture" className="form-label-custom">KEBERANGKATAN PENERBANGAN (OPSIONAL)</label>
                <input id="flightDeparture" type="text" className="form-input-custom"
                  value={form.flightDeparture} onChange={(e) => set('flightDeparture', e.target.value)}
                  placeholder="Contoh: GA 420 (15:00)" />
              </div>
            </div>

            {/* Duration alert */}
            {(form.durationDays > 0 || form.durationHours > 0) && (
              <div className="duration-info-box" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)', flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>Lama Sewa: <strong>{form.durationDays > 0 ? `${form.durationDays} hari` : ''}{form.durationHours > 0 ? ` ${form.durationHours} jam` : ''}</strong></span>
              </div>
            )}
          </section>

          {/* Cards 3 & 4 (Checklist and Fuel) Side by Side */}
          <div className="form-grid-2-custom">
            
            {/* Checklist Card */}
            <section className="form-card-section">
              <div className="card-section-header">
                <SectionIcons.Checklist />
                <h2 className="card-section-title">Kelengkapan Kendaraan</h2>
              </div>
              <div className="checklist-stack-custom">
                {form.checklist.map((item) => (
                  <label key={item.id} className="checklist-row-custom">
                    <input
                      type="checkbox"
                      className="checklist-cb-custom"
                      checked={item.checked}
                      onChange={(e) => handleChecklist(item.id, e.target.checked)}
                    />
                    <span className="checklist-text-custom">{item.label}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Fuel / Battery Card */}
            <section className="form-card-section">
              <div className="card-section-header">
                <SectionIcons.Fuel />
                <h2 className="card-section-title">Kondisi BBM / Baterai</h2>
              </div>
              
              {/* Type Switcher */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label-custom">TIPE KENDARAAN</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    className={`fuel-option-btn ${form.vehicleType === 'petrol' ? 'fuel-option-btn-active' : ''}`}
                    style={{ flex: 1, padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
                    onClick={() => {
                      set('vehicleType', 'petrol');
                      set('fuelLevel', 75);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M3 22V2h11v20H3zM14 6h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4M9 8h2M9 12h2"></path>
                    </svg>
                    <span>Bensin</span>
                  </button>
                  <button
                    type="button"
                    className={`fuel-option-btn ${form.vehicleType === 'ev' ? 'fuel-option-btn-active' : ''}`}
                    style={{ flex: 1, padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
                    onClick={() => {
                      set('vehicleType', 'ev');
                      set('fuelLevel', 80);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                    </svg>
                    <span>Listrik (EV)</span>
                  </button>
                </div>
              </div>

              {form.vehicleType === 'petrol' ? (
                <>
                  <div className="fuel-buttons-grid">
                    {[
                      { label: '1/4 Tank', val: 25 },
                      { label: '1/2 Tank', val: 50 },
                      { label: '3/4 Tank', val: 75 },
                      { label: 'Full Tank', val: 100 },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        className={`fuel-option-btn ${form.fuelLevel === item.val ? 'fuel-option-btn-active' : ''}`}
                        onClick={() => set('fuelLevel', item.val)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.75rem' }}>
                    <FuelIndicator value={form.fuelLevel} readOnly />
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    <span>KAPASITAS BATERAI:</span>
                    <span style={{ color: 'var(--accent)' }}>{form.fuelLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={form.fuelLevel}
                    onChange={(e) => set('fuelLevel', Number(e.target.value))}
                    style={{ width: '100%', height: '6px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', background: '#f8fafc', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)', flexShrink: 0 }}>
                      <rect x="2" y="7" width="16" height="10" rx="2" ry="2"></rect>
                      <line x1="22" y1="11" x2="22" y2="13"></line>
                    </svg>
                    <div style={{ flex: 1, height: '14px', background: '#cbd5e1', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                      <div style={{
                        width: `${form.fuelLevel}%`,
                        height: '100%',
                        background: form.fuelLevel < 20 ? 'var(--danger)' : form.fuelLevel < 50 ? 'var(--warning)' : 'var(--success)',
                        transition: 'width 0.2s ease, background-color 0.2s ease'
                      }} />
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Card 5: Vehicle Diagrams for Scratch marking */}
          <section className="form-card-section">
            <h3 className="form-label-custom" style={{ marginBottom: '0.75rem' }}>TANDAI KERUSAKAN/GORESAN MOBIL (KLIK PADA GAMBAR)</h3>
            <VehicleConditionDiagram
              markers={form.damageMarkers}
              onChange={handleMarkers}
            />
          </section>

          {/* Card 6: Pricing Summary */}
          <section className="form-card-section">
            <div className="card-section-header">
              <SectionIcons.Pricing />
              <h2 className="card-section-title">Rincian Pembayaran</h2>
            </div>
            
            <div className="pricing-rows-stack">
              <div className="pricing-row-custom">
                <span>Harga Harian</span>
                <span>{formatCurrency(form.dailyRate)}</span>
              </div>
              <div className="pricing-row-custom">
                <span>Durasi</span>
                <span>{form.durationDays + (form.durationHours > 0 ? 1 : 0) || 1} Hari</span>
              </div>
              <div className="pricing-row-custom pricing-row-bold">
                <span>Subtotal</span>
                <span>{formatCurrency(form.totalCharge)}</span>
              </div>

              <div className="form-grid-2-custom" style={{ marginTop: '0.75rem' }}>
                <div className="form-group">
                  <label htmlFor="additionalCharge" className="form-label-custom">BIAYA TAMBAHAN</label>
                  <input id="additionalCharge" type="text" className="form-input-custom"
                    value={formatNumberWithDots(form.additionalCharge)} onChange={(e) => set('additionalCharge', parseNumberFromDots(e.target.value))}
                    placeholder="" />
                </div>
                <div className="form-group">
                  <label htmlFor="discount" className="form-label-custom">DISKON</label>
                  <input id="discount" type="text" className="form-input-custom"
                    value={formatNumberWithDots(form.discount)} onChange={(e) => set('discount', parseNumberFromDots(e.target.value))}
                    placeholder="" />
                </div>
              </div>

              <div className="pricing-row-custom pricing-row-bold" style={{ marginTop: '0.75rem' }}>
                <span>Total Rental</span>
                <span>{formatCurrency(form.totalRental)}</span>
              </div>

              <div className="form-grid-2-custom" style={{ marginTop: '0.75rem' }}>
                <div className="form-group">
                  <label htmlFor="deposit" className="form-label-custom">JAMINAN / DEPOSIT</label>
                  <input id="deposit" type="text" className="form-input-custom"
                    value={formatNumberWithDots(form.deposit)} onChange={(e) => set('deposit', parseNumberFromDots(e.target.value))}
                    placeholder="" />
                </div>
                <div className="form-group">
                  <label htmlFor="amountPaidNow" className="form-label-custom">JUMLAH DIBAYAR SEKARANG</label>
                  <input id="amountPaidNow" type="text" className="form-input-custom"
                    value={formatNumberWithDots(form.amountPaidNow)} onChange={(e) => set('amountPaidNow', parseNumberFromDots(e.target.value))}
                    placeholder="" />
                </div>
              </div>

              {/* Giant Totals Box */}
              <div className="total-display-giant-box">
                <div className="giant-box-left">
                  <span className="giant-box-label">Total Pembayaran (Termasuk Deposit)</span>
                  <span className="giant-box-value">{formatCurrency(form.totalPayment)}</span>
                </div>
                <div className="giant-box-right">
                  <span className="giant-box-label-red">Sisa Pembayaran / Kekurangan</span>
                  <span className="giant-box-value-red">{formatCurrency(form.balanceDue)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Card 7: Digital Signatures */}
          <section className="form-card-section">
            <h3 className="form-label-custom" style={{ marginBottom: '1rem' }}>TANDA TANGAN DIGITAL</h3>
            <div className="signature-grid">
              <SignaturePad
                label="Tanda Tangan Pihak Rental"
                value={form.signatureRental}
                onChange={(v) => set('signatureRental', v)}
              />
              <SignaturePad
                label="Tanda Tangan Penyewa"
                value={form.signatureRenter}
                onChange={(v) => set('signatureRenter', v)}
              />
            </div>
          </section>

          {/* Submission actions at bottom */}
          <div className="form-actions-bottom no-print">
            <button type="submit" className="btn btn-primary btn-lg" id="generate-invoice-bottom-btn" style={{ width: '100%' }}>
              <span>Simpan & Buat Invoice</span>
            </button>
          </div>

        </div>

      </div>

    </form>
  );
}
