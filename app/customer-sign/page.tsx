'use client';

import { useState, useEffect } from 'react';
import { RentalFormData, DamageMarker, TransactionRecord } from '@/types';
import { DEFAULT_CHECKLIST } from '@/data/vehicles';
import VehicleConditionDiagram from '@/components/VehicleConditionDiagram';
import FuelIndicator from '@/components/FuelIndicator';
import SignaturePad from '@/components/SignaturePad';
import { encodeShortData, decodeShortData } from '@/lib/urlData';

function formatCurrency(value: number): string {
  if (!value || isNaN(value)) return 'Rp 0';
  return 'Rp ' + Math.round(value).toLocaleString('id-ID');
}

export default function CustomerSignPage() {
  const [form, setForm] = useState<RentalFormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [returnUrl, setReturnUrl] = useState('');
  const [shortId, setShortId] = useState('');

  useEffect(() => {
    // Hide admin sidebar layout
    document.body.classList.add('hide-sidebar-layout');
    
    // Load data: prefer ?ref= (server API) over ?data= (legacy URL encoding)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const refParam = params.get('ref');
      const dataParam = params.get('data');

      if (refParam) {
        // New method: fetch from server API using short ID
        fetch(`/api/sign-data?id=${encodeURIComponent(refParam)}`)
          .then(async (res) => {
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.error || 'Data tidak ditemukan atau sudah kedaluwarsa.');
            }
            return res.json();
          })
          .then(({ data }) => {
            // Ensure all numeric fields are numbers
            setForm({
              ...data,
              dailyRate: Number(data.dailyRate) || 0,
              additionalCharge: Number(data.additionalCharge) || 0,
              discount: Number(data.discount) || 0,
              deposit: Number(data.deposit) || 0,
              amountPaidNow: Number(data.amountPaidNow) || 0,
              totalCharge: Number(data.totalCharge) || 0,
              totalRental: Number(data.totalRental) || 0,
              totalPayment: Number(data.totalPayment) || 0,
              balanceDue: Number(data.balanceDue) || 0,
              fuelLevel: Number(data.fuelLevel) || 75,
              damageMarkers: data.damageMarkers || [],
              signatureRenter: '',  // Customer will fill this
            });
          })
          .catch((err) => {
            setError(err.message || 'Tautan tidak valid atau sudah kedaluwarsa.');
          });
      } else if (dataParam) {
        // Legacy fallback: decode from URL base64
        const decoded = decodeShortData(dataParam);
        if (decoded) {
          setForm(decoded);
        } else {
          setError('Tautan tidak valid atau data rusak.');
        }
      } else {
        setError('Tautan tidak memiliki data perjanjian sewa.');
      }
    }

    return () => {
      document.body.classList.remove('hide-sidebar-layout');
    };
  }, []);

  const handleChecklist = (itemId: string, checked: boolean) => {
    if (!form) return;
    setForm({
      ...form,
      checklist: form.checklist.map((c) => c.id === itemId ? { ...c, checked } : c)
    });
  };

  const handleMarkers = (markers: DamageMarker[]) => {
    if (!form) return;
    setForm({
      ...form,
      damageMarkers: markers
    });
  };

  const setRenterSignature = (sig: string) => {
    if (!form) return;
    setForm({
      ...form,
      signatureRenter: sig
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.signatureRenter) {
      alert('Silakan tanda tangan terlebih dahulu sebelum melakukan konfirmasi.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/sign-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('API save failed');
      const { id } = await res.json();
      const host = window.location.origin;
      const adminLink = `${host}/dashboard2?ref=${id}`;
      setShortId(id);
      setReturnUrl(adminLink);
      setIsSubmitted(true);
    } catch (err) {
      console.warn('API save failed, falling back to URL encoding:', err);
      // Fallback: use URL-encoded data
      const encoded = encodeShortData(form);
      const host = window.location.origin;
      const adminLink = `${host}/dashboard2?data=${encoded}`;
      setShortId('SIGNED');
      setReturnUrl(adminLink);
      setIsSubmitted(true);
    } finally {
      setIsSaving(false);
    }
  };

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80dvh', padding: '2rem', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--danger-muted)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Terjadi Kesalahan</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
        <a href="/" className="btn btn-primary">Kembali</a>
      </div>
    );
  }

  if (!form) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80dvh' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" style={{ color: 'var(--accent)' }}>
          <line x1="12" y1="2" x2="12" y2="6"></line>
          <line x1="12" y1="18" x2="12" y2="22"></line>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
          <line x1="2" y1="12" x2="6" y2="12"></line>
          <line x1="18" y1="12" x2="22" y2="12"></line>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Memuat data perjanjian...</p>
      </div>
    );
  }

  if (isSubmitted) {
    const waText = encodeURIComponent(
      `Halo Admin Rental,\n\nSaya *${form?.renterName || 'Penyewa'}* telah menandatangani dokumen perjanjian sewa kendaraan *${form?.vehicleName || ''}*.\n\nSilakan klik tautan berikut untuk memproses invoice:\n\n${returnUrl}\n\nTerima kasih!`
    );
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '90dvh', padding: '2rem', textAlign: 'center' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--success-muted)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Tanda Tangan Berhasil!</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '380px', lineHeight: 1.6 }}>
          Dokumen sewa sudah ditandatangani dan tersimpan. Klik tombol WhatsApp di bawah untuk mengirim tautan ke admin rental agar invoice bisa diproses.
        </p>

        {/* Short link preview card */}
        <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.5rem', width: '100%', maxWidth: '400px', textAlign: 'left' }}>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 700 }}>Tautan Dokumen Signed:</p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--accent)', fontFamily: 'monospace', wordBreak: 'break-all', fontWeight: 600 }}>{returnUrl}</p>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: '0.375rem' }}>ID: <strong>{shortId}</strong> &nbsp;·&nbsp; {shortId === 'SIGNED' ? 'Status: Signed &amp; Aman' : 'Berlaku 24 jam'}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '400px' }}>
          <a
            href={`https://wa.me/?text=${waText}`}
            target="_blank"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem',
              background: '#25D366', color: '#fff', borderRadius: '10px',
              padding: '0.9rem 1.25rem', fontWeight: 800, fontSize: '0.9375rem',
              textDecoration: 'none', boxShadow: '0 4px 14px rgba(37,211,102,0.35)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M11.99 2C6.469 2 2 6.478 2 12.011c0 1.763.461 3.462 1.338 4.95L2.05 21.945l5.099-1.268A9.96 9.96 0 0 0 11.99 22c5.522 0 9.99-4.478 9.99-10.011C21.98 6.478 17.511 2 11.99 2zm0 18.185a8.176 8.176 0 0 1-4.17-1.138l-.299-.178-3.095.77.82-2.99-.196-.308A8.154 8.154 0 0 1 3.824 12c0-4.512 3.656-8.185 8.166-8.185 4.51 0 8.166 3.673 8.166 8.185 0 4.51-3.656 8.185-8.166 8.185z"/>
            </svg>
            Kirim ke WhatsApp Rental
          </a>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(returnUrl).then(() => {
                alert('Tautan berhasil disalin!');
              });
            }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              background: 'transparent', color: 'var(--text-primary)', border: '1.5px solid var(--border)',
              borderRadius: '10px', padding: '0.75rem 1.25rem', fontWeight: 600, fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Salin Tautan
          </button>
        </div>
      </div>
    );
  }

  // Use admin-set totals from form data directly (accurate from server)
  // Only recalculate as fallback when stored totals are 0 (e.g. legacy ?data= links)
  const billedDays = form.durationDays + (form.durationHours > 0 ? 1 : 0) || 1;
  const storedTotalPayment = form.totalPayment || form.totalRental;
  const storedBalanceDue = form.balanceDue;

  // Use stored values from admin if available, else calculate
  const calculatedTotalPayment = storedTotalPayment > 0 ? storedTotalPayment
    : (form.dailyRate * billedDays) + form.additionalCharge - form.discount + form.deposit;
  const calculatedBalanceDue = storedBalanceDue > 0 ? storedBalanceDue
    : calculatedTotalPayment - form.amountPaidNow;
  const calculatedSubtotal = form.totalCharge > 0 ? form.totalCharge : form.dailyRate * billedDays;
  const calculatedTotalRental = form.totalRental > 0 ? form.totalRental
    : calculatedSubtotal + form.additionalCharge - form.discount;

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      
      {/* Header Info */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 900, color: 'var(--accent)' }}>INFINITY GO TRAVEL</h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Konfirmasi Dokumen Sewa & TTD Mandiri</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Card 1: Review Renter Info */}
        <section className="form-card-section" style={{ padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>1. Data Penyewa</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Nama Lengkap</span><strong style={{ color: 'var(--text-primary)' }}>{form.renterName}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Nomor {form.idType}</span><span style={{ color: 'var(--text-primary)' }}>{form.idNumber}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>WhatsApp</span><span style={{ color: 'var(--text-primary)' }}>{form.phone}</span></div>
            {form.address && <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', marginTop: '0.25rem' }}><span style={{ color: 'var(--text-secondary)' }}>Alamat Villa/Hotel</span><span style={{ color: 'var(--text-primary)', background: 'var(--bg-hover)', padding: '0.5rem', borderRadius: '6px' }}>{form.address}</span></div>}
          </div>
        </section>

        {/* Card 2: Vehicle & Period */}
        <section className="form-card-section" style={{ padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>2. Detail Sewa & Mobil</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Kendaraan</span><strong style={{ color: 'var(--accent)' }}>{form.vehicleName}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Nomor Polisi</span><span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{form.policeNumber}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Mulai Sewa</span><span style={{ color: 'var(--text-primary)' }}>{form.startDate} {form.startTime}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Kembali Sewa</span><span style={{ color: 'var(--text-primary)' }}>{form.endDate} {form.endTime}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Durasi Sewa</span><strong style={{ color: 'var(--text-primary)' }}>{form.durationDays > 0 ? `${form.durationDays} hari` : ''}{form.durationHours > 0 ? ` ${form.durationHours} jam` : ''}</strong></div>
          </div>
        </section>

        {/* Card 3: Checklist (Editable by Customer to confirm state) */}
        <section className="form-card-section" style={{ padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>3. Checklist Kelengkapan Mobil</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Periksa kembali kelengkapan mobil di lokasi. Centang jika ada dan sesuai:</p>
          <div className="checklist-stack-custom" style={{ maxHeight: 'none' }}>
            {form.checklist.map((item) => (
              <label key={item.id} className="checklist-row-custom" style={{ padding: '0.5rem 0' }}>
                <input
                  type="checkbox"
                  className="checklist-cb-custom"
                  checked={item.checked}
                  onChange={(e) => handleChecklist(item.id, e.target.checked)}
                />
                <span className="checklist-text-custom" style={{ fontSize: '0.875rem' }}>{item.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Card 4: Fuel Level */}
        <section className="form-card-section" style={{ padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>4. Level Bahan Bakar / Baterai</h2>
          {form.vehicleType === 'petrol' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Kondisi Tangki Bensin:</span>
              <FuelIndicator value={form.fuelLevel} readOnly />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                <span>KAPASITAS BATERAI EV:</span>
                <span style={{ color: 'var(--accent)' }}>{form.fuelLevel}%</span>
              </div>
              <div style={{ flex: 1, height: '14px', background: '#cbd5e1', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  width: `${form.fuelLevel}%`,
                  height: '100%',
                  background: form.fuelLevel < 20 ? 'var(--danger)' : form.fuelLevel < 50 ? 'var(--warning)' : 'var(--success)'
                }} />
              </div>
            </div>
          )}
        </section>

        {/* Card 5: Damage Diagram */}
        <section className="form-card-section" style={{ padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>5. Goresan / Kerusakan Mobil</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Lihat diagram goresan di bawah ini. Anda dapat mengklik gambar untuk menambahkan titik goresan baru yang Anda temukan di lokasi serah terima:
          </p>
          <VehicleConditionDiagram
            markers={form.damageMarkers}
            onChange={handleMarkers}
          />
        </section>

        {/* Card 6: Pricing */}
        <section className="form-card-section" style={{ padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>6. Rincian Biaya</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Harga Sewa Harian</span><span>{formatCurrency(form.dailyRate)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Durasi Sewa</span><span>{billedDays} Hari</span></div>
            {form.additionalCharge > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Biaya Tambahan</span><span>{formatCurrency(form.additionalCharge)}</span></div>}
            {form.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Diskon</span><span style={{ color: 'var(--danger)' }}>-{formatCurrency(form.discount)}</span></div>}
            {form.deposit > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Jaminan / Deposit</span><span>{formatCurrency(form.deposit)}</span></div>}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', fontWeight: 800 }}>
              <span style={{ color: 'var(--text-primary)' }}>Total Pembayaran</span>
              <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(calculatedTotalPayment)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Sudah Dibayar</span>
              <span style={{ color: 'var(--success)' }}>{formatCurrency(form.amountPaidNow)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.9375rem', color: 'var(--danger)', background: 'var(--danger-muted)', padding: '0.5rem', borderRadius: '6px', marginTop: '0.25rem' }}>
              <span>Sisa Pembayaran</span>
              <span>{formatCurrency(calculatedBalanceDue)}</span>
            </div>
          </div>
        </section>

        {/* Card 7: Digital Signature Pad */}
        <section className="form-card-section" style={{ padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>7. Bubuhkan Tanda Tangan Anda</h2>
          <SignaturePad
            label="Tanda Tangan Penyewa (Customer)"
            value={form.signatureRenter}
            onChange={setRenterSignature}
          />
        </section>

        {/* Action Submit */}
        <button
          type="submit"
          disabled={isSaving}
          className="btn btn-primary btn-lg"
          style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: 800, justifyContent: 'center', opacity: isSaving ? 0.7 : 1 }}
        >
          {isSaving ? 'Menyimpan...' : 'Konfirmasi & Simpan TTD'}
        </button>

      </form>
    </div>
  );
}
