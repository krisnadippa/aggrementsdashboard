'use client';

import { useEffect, useRef, useState, use } from 'react';
import Link from 'next/link';
import { useReactToPrint } from 'react-to-print';
import { TransactionRecord, RentalFormData, DamageMarker } from '@/types';
import { getTransaction, updateTransaction } from '@/lib/localStorage';
import InvoicePreview from '@/components/InvoicePreview';
import SignaturePad from '@/components/SignaturePad';
import VehicleConditionDiagram from '@/components/VehicleConditionDiagram';
import FuelIndicator from '@/components/FuelIndicator';
import { TERMS_AND_CONDITIONS } from '@/data/terms';

interface InvoicePageProps {
  params: Promise<{ id: string }>;
}

function formatCurrency(value: number): string {
  if (!value || isNaN(value)) return 'Rp 0';
  return 'Rp ' + Math.round(value).toLocaleString('id-ID');
}

export default function InvoicePage({ params }: InvoicePageProps) {
  const { id } = use(params);
  const [record, setRecord] = useState<TransactionRecord | null | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'interactive' | 'print'>('interactive');
  
  // Interactive state
  const [formState, setFormState] = useState<RentalFormData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const found = getTransaction(id);
    setRecord(found);
    if (found) {
      setFormState(found.formData);

      // Auto-sync if customer signature is missing and it's a Neon DB ID (length of DB ID is 8)
      if (!found.formData.signatureRenter && id.length === 8) {
        fetch(`/api/sign-data?id=${id}`)
          .then((res) => {
            if (res.ok) return res.json();
          })
          .then(({ data }) => {
            if (data && data.signatureRenter) {
              const updated = updateTransaction(id, data);
              if (updated) {
                setRecord(updated);
                setFormState(updated.formData);
              }
            }
          })
          .catch((err) => console.error('Error auto-syncing detail page:', err));
      }
    }
  }, [id]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: record ? `Invoice-${record.invoiceNumber}` : 'Invoice',
    pageStyle: `
      @page { size: A4; margin: 1cm; }
      body { font-family: 'Inter', Arial, sans-serif; }
      .no-print, .invoice-page-actions, .navbar, .tab-header-nav { display: none !important; }
    `,
  });

  const handleChecklist = (itemId: string, checked: boolean) => {
    if (!formState) return;
    setFormState({
      ...formState,
      checklist: formState.checklist.map((c) => c.id === itemId ? { ...c, checked } : c)
    });
  };

  const handleMarkers = (markers: DamageMarker[]) => {
    if (!formState) return;
    setFormState({
      ...formState,
      damageMarkers: markers
    });
  };

  const setFuelLevel = (level: number) => {
    if (!formState) return;
    setFormState({
      ...formState,
      fuelLevel: level
    });
  };

  const setSignatureRental = (sig: string) => {
    if (!formState) return;
    setFormState({
      ...formState,
      signatureRental: sig
    });
  };

  const setSignatureRenter = (sig: string) => {
    if (!formState) return;
    setFormState({
      ...formState,
      signatureRenter: sig
    });
  };

  const handleSaveChanges = () => {
    if (!formState) return;
    setIsSaving(true);
    const updatedRecord = updateTransaction(id, formState);
    if (updatedRecord) {
      setRecord(updatedRecord);
      setSaveSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setSaveSuccess(false), 4000);
    } else {
      alert('Gagal menyimpan perubahan.');
    }
    setIsSaving(false);
  };

  // Loading state
  if (record === undefined || (activeTab === 'interactive' && !formState)) {
    return (
      <div className="page-inner">
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <p className="empty-state-title">Memuat invoice...</p>
        </div>
      </div>
    );
  }

  // Not found or expired
  if (record === null) {
    return (
      <div className="page-inner">
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p className="empty-state-title">Invoice tidak ditemukan</p>
          <p className="empty-state-desc">
            Invoice ini mungkin sudah kedaluwarsa (lewat 24 jam) atau dihapus secara manual.
          </p>
          <Link href="/" className="btn btn-primary" id="back-to-dashboard-not-found">
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Calculations for Rincian Biaya
  const billedDays = formState!.durationDays + (formState!.durationHours > 0 ? 1 : 0) || 1;
  const calculatedTotalPayment = formState!.totalPayment || formState!.totalRental || (formState!.dailyRate * billedDays) + formState!.additionalCharge - formState!.discount + formState!.deposit;
  const calculatedBalanceDue = formState!.balanceDue !== undefined ? formState!.balanceDue : calculatedTotalPayment - formState!.amountPaidNow;

  return (
    <div className="page-inner">
      {/* ─── Action Bar ─── */}
      <div className="invoice-page-actions no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/history" className="btn btn-ghost" id="back-to-dashboard-btn" style={{ paddingLeft: '0.5rem' }}>
            ← Kembali ke Riwayat
          </Link>
          <Link href={`/?edit=${id}`} className="btn btn-outline" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }} id="edit-invoice-detail-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '0.25rem' }}>
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            Edit Detail
          </Link>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-outline"
            id="print-invoice-btn"
            onClick={() => {
              setActiveTab('print');
              setTimeout(() => window.print(), 100);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print
          </button>
          <button
            className="btn btn-primary"
            id="download-pdf-btn"
            onClick={() => handlePrint()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download PDF
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="tab-header-nav no-print" style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', gap: '1rem' }}>
        <button
          className={`tab-btn ${activeTab === 'interactive' ? 'active' : ''}`}
          onClick={() => setActiveTab('interactive')}
          style={{
            padding: '0.75rem 1rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'interactive' ? '3px solid var(--accent)' : '3px solid transparent',
            color: activeTab === 'interactive' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: 800,
            cursor: 'pointer',
            fontSize: '0.9375rem',
            transition: 'all 0.2s ease'
          }}
        >
          Detail &amp; Tanda Tangan
        </button>
        <button
          className={`tab-btn ${activeTab === 'print' ? 'active' : ''}`}
          onClick={() => setActiveTab('print')}
          style={{
            padding: '0.75rem 1rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'print' ? '3px solid var(--accent)' : '3px solid transparent',
            color: activeTab === 'print' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: 800,
            cursor: 'pointer',
            fontSize: '0.9375rem',
            transition: 'all 0.2s ease'
          }}
        >
          Pratinjau Cetak / PDF
        </button>
      </div>

      {/* ─── TAB 1: INTERACTIVE VIEW & SIGN ─── */}
      {activeTab === 'interactive' && formState && (
        <div className="interactive-tab-view no-print" style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {saveSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', background: 'var(--success-muted)', borderRadius: 'var(--radius)', border: '1px solid var(--success)', transition: 'all 0.3s ease' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--success)', flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <div>
                <p style={{ fontWeight: 800, color: 'var(--success)', fontSize: '0.875rem', margin: 0 }}>Berhasil Disimpan!</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: '0.125rem 0 0' }}>Tanda tangan dan perubahan detail sewa telah diperbarui di browser ini.</p>
              </div>
            </div>
          )}

          {/* Card 1: Data Penyewa */}
          <section className="form-card-section" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              1. Data Penyewa
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border)', paddingBottom: '0.375rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Nama Lengkap</span>
                <strong style={{ color: 'var(--text-primary)' }}>{formState.renterName || '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border)', paddingBottom: '0.375rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Identitas ({formState.idType || 'KTP'})</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formState.idNumber || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border)', paddingBottom: '0.375rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>No. Telepon</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formState.phone || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border)', paddingBottom: '0.375rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Email</span>
                <span style={{ color: 'var(--text-primary)' }}>{formState.email || '—'}</span>
              </div>
              {formState.address && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Alamat Lokal / Hotel</span>
                  <span style={{ color: 'var(--text-primary)', background: 'var(--bg-hover)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', lineHeight: 1.4 }}>
                    {formState.address}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Card 2: Detail Sewa & Mobil */}
          <section className="form-card-section" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              2. Detail Sewa &amp; Mobil
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border)', paddingBottom: '0.375rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Kendaraan</span>
                <strong style={{ color: 'var(--accent)' }}>{formState.vehicleName || '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border)', paddingBottom: '0.375rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Nomor Polisi</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{formState.policeNumber || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border)', paddingBottom: '0.375rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Mulai Sewa</span>
                <span style={{ color: 'var(--text-primary)' }}>{formState.startDate} {formState.startTime}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border)', paddingBottom: '0.375rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Kembali Sewa</span>
                <span style={{ color: 'var(--text-primary)' }}>{formState.endDate} {formState.endTime}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.125rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Durasi Sewa</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {formState.durationDays > 0 ? `${formState.durationDays} hari` : ''}
                  {formState.durationHours > 0 ? ` ${formState.durationHours} jam` : ''}
                  {!formState.durationDays && !formState.durationHours ? '1 hari' : ''}
                </strong>
              </div>
            </div>
          </section>

          {/* Card 3: Checklist Kelengkapan Mobil */}
          <section className="form-card-section" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              3. Checklist Kelengkapan Mobil
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Verifikasi ulang kelengkapan kendaraan di lokasi serah terima:</p>
            <div className="checklist-stack-custom" style={{ maxHeight: 'none' }}>
              {formState.checklist.map((item) => (
                <label key={item.id} className="checklist-row-custom" style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    className="checklist-cb-custom"
                    checked={item.checked}
                    onChange={(e) => handleChecklist(item.id, e.target.checked)}
                  />
                  <span className="checklist-text-custom" style={{ fontSize: '0.875rem', marginLeft: '0.5rem' }}>{item.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Card 4: Level BBM/Baterai */}
          <section className="form-card-section" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              4. Kondisi BBM / Baterai
            </h2>
            <FuelIndicator
              value={formState.fuelLevel}
              onChange={setFuelLevel}
              vehicleType={formState.vehicleType}
            />
          </section>

          {/* Card 5: Damage Diagram */}
          <section className="form-card-section" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              5. Diagram Kerusakan / Goresan
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Klik pada bagian mobil di diagram untuk menambahkan titik goresan baru yang ditemukan:
            </p>
            <VehicleConditionDiagram
              markers={formState.damageMarkers}
              onChange={handleMarkers}
            />
          </section>

          {/* Card 6: Rincian Biaya */}
          <section className="form-card-section" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              6. Rincian Biaya
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Harga Sewa Harian</span>
                <span>{formatCurrency(formState.dailyRate)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Durasi Sewa (Ditagih)</span>
                <span>{billedDays} Hari</span>
              </div>
              {formState.additionalCharge > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Biaya Tambahan</span>
                  <span>{formatCurrency(formState.additionalCharge)}</span>
                </div>
              )}
              {formState.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Diskon</span>
                  <span style={{ color: 'var(--danger)' }}>-{formatCurrency(formState.discount)}</span>
                </div>
              )}
              {formState.deposit > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Jaminan / Deposit</span>
                  <span>{formatCurrency(formState.deposit)}</span>
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', fontWeight: 800 }}>
                <span style={{ color: 'var(--text-primary)' }}>Total Pembayaran</span>
                <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(calculatedTotalPayment)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Sudah Dibayar</span>
                <span style={{ color: 'var(--success)' }}>{formatCurrency(formState.amountPaidNow)}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 800,
                fontSize: '0.9375rem',
                color: calculatedBalanceDue > 0 ? 'var(--warning)' : 'var(--success)',
                background: calculatedBalanceDue > 0 ? 'var(--warning-muted)' : 'var(--success-muted)',
                padding: '0.5rem',
                borderRadius: '6px',
                marginTop: '0.25rem'
              }}>
                <span>Sisa Pembayaran</span>
                <span>{formatCurrency(calculatedBalanceDue)}</span>
              </div>
            </div>
          </section>

          {/* Card 7: Syarat & Ketentuan (SnK) */}
          <section className="form-card-section" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              7. Syarat &amp; Ketentuan (SnK)
            </h2>
            <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <ol style={{ paddingLeft: '1.2rem', margin: 0 }}>
                {TERMS_AND_CONDITIONS.map((term, i) => (
                  <li key={i} style={{ marginBottom: '0.375rem', lineHeight: 1.5 }}>{term}</li>
                ))}
              </ol>
            </div>
          </section>

          {/* Card 8: Tanda Tangan Digital */}
          <section className="form-card-section" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
              8. Tanda Tangan Digital
            </h2>
            <div className="signature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
              <SignaturePad
                label="Tanda Tangan Pihak Rental (Admin)"
                value={formState.signatureRental}
                onChange={setSignatureRental}
              />
              <SignaturePad
                label="Tanda Tangan Penyewa (Customer)"
                value={formState.signatureRenter}
                onChange={setSignatureRenter}
              />
            </div>
          </section>

          {/* Action button to save changes */}
          <div style={{ marginTop: '0.5rem', marginBottom: '3rem' }}>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveChanges}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: 800, justifyContent: 'center', opacity: isSaving ? 0.7 : 1 }}
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan & TTD'}
            </button>
          </div>

        </div>
      )}

      {/* ─── TAB 2: PRINT PREVIEW ─── */}
      <div style={{ display: activeTab === 'print' ? 'block' : 'none' }}>
        <InvoicePreview ref={printRef} record={record} />
      </div>

      {/* Print Specific CSS to always print preview layout cleanly */}
      <style jsx global>{`
        @media print {
          .interactive-tab-view,
          .tab-header-nav,
          .invoice-page-actions {
            display: none !important;
          }
          .invoice-preview {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
