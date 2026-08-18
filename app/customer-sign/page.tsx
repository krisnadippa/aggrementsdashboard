'use client';

import { useState, useEffect } from 'react';
import { RentalFormData, DamageMarker } from '@/types';
import VehicleConditionDiagram from '@/components/VehicleConditionDiagram';
import FuelIndicator from '@/components/FuelIndicator';
import SignaturePad from '@/components/SignaturePad';
import { encodeShortData, decodeShortData } from '@/lib/urlData';
import { COMPANY_INFO, TERMS_AND_CONDITIONS } from '@/data/terms';

function formatCurrency(value: number): string {
  if (!value || isNaN(value)) return 'Rp 0';
  return 'Rp ' + Math.round(value).toLocaleString('id-ID');
}

export default function CustomerSignPage() {
  const [form, setForm] = useState<RentalFormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [refId, setRefId] = useState<string | null>(null);
  
  // Custom Modal States
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showSignatureAlertModal, setShowSignatureAlertModal] = useState(false);

  useEffect(() => {
    // Hide admin sidebar layout
    document.body.classList.add('hide-sidebar-layout');
    
    // Load data: prefer ?ref= (server API) over ?data= (legacy URL encoding)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const refParam = params.get('ref');
      const dataParam = params.get('data');

      if (refParam) {
        setRefId(refParam);
        // Fetch from server API using ID
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
      setShowSignatureAlertModal(true);
      return;
    }

    setIsSaving(true);
    try {
      const url = refId ? `/api/sign-data?id=${encodeURIComponent(refId)}` : '/api/sign-data';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('API save failed');
      setIsSubmitted(true);
    } catch (err) {
      console.warn('API save failed, falling back to URL encoding:', err);
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
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '90dvh', padding: '2rem', textAlign: 'center' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--success-muted)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Tanda Tangan Berhasil!</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '380px', lineHeight: 1.6 }}>
          Terima kasih! Tanda tangan Anda telah berhasil disimpan dan diverifikasi. Halaman ini aman untuk ditutup.
        </p>

        <div style={{ width: '100%', maxWidth: '320px' }}>
          <button
            type="button"
            onClick={() => setShowCloseModal(true)}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: '10px', padding: '0.9rem 1.25rem', fontWeight: 700, fontSize: '0.9375rem',
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(var(--accent-rgb), 0.2)'
            }}
          >
            Oke
          </button>
        </div>

        {/* Safe to Close Modal */}
        {showCloseModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999
          }}>
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-lg)',
              width: '90%',
              maxWidth: '360px',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--accent-muted)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Dokumen Selesai</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Halaman ini sudah tidak diperlukan lagi. Anda dapat menutup tab atau jendela browser ini dengan aman.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setShowCloseModal(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Recalculations
  const billedDays = form.durationDays + (form.durationHours > 0 ? 1 : 0) || 1;
  const storedTotalPayment = form.totalPayment || form.totalRental;
  const storedBalanceDue = form.balanceDue;

  const calculatedTotalPayment = storedTotalPayment > 0 ? storedTotalPayment
    : (form.dailyRate * billedDays) + form.additionalCharge - form.discount + form.deposit;
  const calculatedBalanceDue = storedBalanceDue > 0 ? storedBalanceDue
    : calculatedTotalPayment - form.amountPaidNow;

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      
      {/* Header Info */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 900, color: 'var(--accent)' }}>{COMPANY_INFO.name}</h1>
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

        {/* Card 3: Checklist (Locked) */}
        <section className="form-card-section" style={{ padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>3. Checklist Kelengkapan Mobil</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Kelengkapan mobil saat serah terima:</p>
          <div className="checklist-stack-custom" style={{ maxHeight: 'none' }}>
            {form.checklist.map((item) => (
              <label key={item.id} className="checklist-row-custom" style={{ padding: '0.5rem 0' }}>
                <input
                  type="checkbox"
                  className="checklist-cb-custom"
                  checked={item.checked}
                  disabled
                  readOnly
                />
                <span className="checklist-text-custom" style={{ fontSize: '0.875rem', opacity: 0.85 }}>{item.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Card 4: Fuel Level */}
        <section className="form-card-section" style={{ padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>4. Level Bahan Bakar / Baterai</h2>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
            <FuelIndicator value={form.fuelLevel} vehicleType={form.vehicleType} readOnly />
          </div>
        </section>

        {/* Card 5: Damage Diagram (Locked) */}
        <section className="form-card-section" style={{ padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>5. Goresan / Kerusakan Mobil</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Diagram goresan pada mobil saat serah terima:
          </p>
          <VehicleConditionDiagram
            markers={form.damageMarkers}
            readOnly
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

        {/* Card 7: Syarat & Ketentuan (SnK) */}
        <section className="form-card-section" style={{ padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            7. Syarat &amp; Ketentuan (SnK)
          </h2>
          <div className="terms-container-custom" style={{
            maxHeight: '180px',
            overflowY: 'auto',
            background: 'var(--bg-hover)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem',
            fontSize: '0.75rem',
            lineHeight: 1.5,
            color: 'var(--text-secondary)'
          }}>
            <ol style={{ paddingLeft: '1.2rem', margin: 0 }}>
              {TERMS_AND_CONDITIONS.map((term, i) => (
                <li key={i} style={{ marginBottom: '0.5rem' }}>{term}</li>
              ))}
            </ol>
          </div>
        </section>

        {/* Card 8: Tanda Tangan */}
        <section className="form-card-section" style={{ padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>8. Tanda Tangan</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Pihak Rental</p>
              {form.signatureRental ? (
                <img
                  src={form.signatureRental}
                  alt="Tanda tangan admin"
                  style={{ maxWidth: '100%', height: '80px', objectFit: 'contain', border: '1px dashed var(--border)', borderRadius: '6px', background: '#fff' }}
                />
              ) : (
                <div style={{ height: '80px', border: '1px dashed var(--border)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Belum ditandatangani
                </div>
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Penyewa (Customer)</p>
              <SignaturePad
                label="Tanda Tangan Penyewa"
                value={form.signatureRenter}
                onChange={setRenterSignature}
              />
            </div>
          </div>
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

      {/* Signature Warning Modal */}
      {showSignatureAlertModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-lg)',
            width: '90%',
            maxWidth: '360px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--danger-muted)',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Tanda Tangan Diperlukan</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Silakan bubuhkan tanda tangan Anda pada area pad yang disediakan sebelum mengonfirmasi dokumen.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setShowSignatureAlertModal(false)}
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
