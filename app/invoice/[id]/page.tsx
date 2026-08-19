'use client';

import { useEffect, useRef, useState, use } from 'react';
import Link from 'next/link';
import { useReactToPrint } from 'react-to-print';
import { TransactionRecord, RentalFormData, DamageMarker } from '@/types';
import { getTransaction, updateTransaction, compressImage } from '@/lib/localStorage';
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
    // Clear old state during route transitions
    setRecord(undefined);
    setFormState(null);

    // Fetch directly from Neon database API
    fetch(`/api/sign-data?id=${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Data tidak ditemukan di database');
        return res.json();
      })
      .then(({ data }) => {
        if (data) {
          const rec: TransactionRecord = {
            id: id,
            invoiceNumber: data.invoiceNumber || `INV-${id.toUpperCase()}`,
            createdAt: Date.now(),
            expiresAt: Date.now() + 100 * 365 * 24 * 60 * 60 * 1000,
            formData: data
          };
          setRecord(rec);
          setFormState(data);
        } else {
          setRecord(null);
        }
      })
      .catch((err) => {
        console.warn('Error fetching from DB, falling back to localStorage:', err);
        const found = getTransaction(id);
        if (found) {
          setRecord(found);
          setFormState(found.formData);
        } else {
          setRecord(null);
        }
      });
  }, [id]);

  const handleDownloadPDF = () => {
    const element = printRef.current;
    if (!element) return;
    
    const loadAndGenerate = () => {
      // Switch to print tab temporarily to ensure element is populated and displayed
      const prevTab = activeTab;
      setActiveTab('print');

      // Wait for the render to complete and then check images
      setTimeout(() => {
        const images = element.querySelectorAll('img');
        const promises = Array.from(images).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        });

        Promise.all(promises).then(() => {
          // @ts-ignore
          const html2pdf = window.html2pdf;
          const opt = {
            margin:       10,
            filename:     `Invoice-${record ? record.invoiceNumber : 'document'}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };
          html2pdf().from(element).set(opt).save().then(() => {
            // Switch back to the previous tab after download completes
            setActiveTab(prevTab);
          });
        });
      }, 300);
    };

    // @ts-ignore
    if (window.html2pdf) {
      loadAndGenerate();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        loadAndGenerate();
      };
      document.head.appendChild(script);
    }
  };

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'ktpPhotos' | 'carPhotos') => {
    const files = e.target.files;
    if (!files) return;

    const currentImages = formState?.[field] || [];
    if (currentImages.length + files.length > 2) {
      alert('Maksimal 2 foto saja');
      return;
    }

    Array.from(files).forEach((file) => {
      if (file.size > 4 * 1024 * 1024) {
        alert('File terlalu besar. Maksimal ukuran file adalah 4MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          const compressed = await compressImage(reader.result);
          setFormState((prev) => {
            if (!prev) return null;
            const updated = [...(prev[field] || [])];
            if (updated.length < 2) {
              updated.push(compressed);
            }
            return { ...prev, [field]: updated };
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number, field: 'ktpPhotos' | 'carPhotos') => {
    setFormState((prev) => {
      if (!prev) return null;
      const updated = [...(prev[field] || [])];
      updated.splice(index, 1);
      return { ...prev, [field]: updated };
    });
  };

  const handleSaveChanges = () => {
    if (!formState) return;
    setIsSaving(true);
    
    fetch(`/api/sign-data?id=${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formState),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Gagal menyimpan ke database');
        return res.json();
      })
      .then(() => {
        const updatedRecord = updateTransaction(id, formState);
        if (updatedRecord) {
          setRecord(updatedRecord);
        } else {
          setRecord({
            id: id,
            invoiceNumber: record?.invoiceNumber || `INV-${id.toUpperCase()}`,
            createdAt: Date.now(),
            expiresAt: Date.now() + 100 * 365 * 24 * 60 * 60 * 1000,
            formData: formState
          });
        }
        setSaveSuccess(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => setSaveSuccess(false), 4000);
      })
      .catch((err) => {
        alert(err.message || 'Gagal menyimpan perubahan.');
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  // Loading state (pulsing skeleton)
  if (record === undefined || (activeTab === 'interactive' && !formState)) {
    return (
      <div className="page-inner">
        {/* Shimmer Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ height: '32px', width: '220px', background: 'var(--border)', borderRadius: '6px', animation: 'pulse-glow 1.5s infinite' }} />
          <div style={{ height: '32px', width: '120px', background: 'var(--border)', borderRadius: '6px', animation: 'pulse-glow 1.5s infinite' }} />
        </div>

        {/* Shimmer Navigation Tabs */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '2rem' }}>
          <div style={{ height: '36px', width: '140px', background: 'var(--border)', borderRadius: '20px', animation: 'pulse-glow 1.5s infinite' }} />
          <div style={{ height: '36px', width: '140px', background: 'var(--border)', borderRadius: '20px', animation: 'pulse-glow 1.5s infinite' }} />
        </div>

        {/* Shimmer Content Grid */}
        <div className="form-main-columns-grid">
          {/* Left Column (Checklist / Vehicle view) */}
          <div className="form-column-left">
            <div className="form-card-section" style={{ height: '380px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ height: '24px', width: '60%', background: 'var(--border)', borderRadius: '4px', animation: 'pulse-glow 1.5s infinite' }} />
              <div style={{ flex: 1, background: 'var(--border)', borderRadius: '8px', animation: 'pulse-glow 1.5s infinite' }} />
            </div>
            <div className="form-card-section" style={{ height: '180px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ height: '24px', width: '50%', background: 'var(--border)', borderRadius: '4px', animation: 'pulse-glow 1.5s infinite' }} />
              <div style={{ height: '14px', background: 'var(--border)', borderRadius: '4px', animation: 'pulse-glow 1.5s infinite' }} />
              <div style={{ height: '14px', background: 'var(--border)', borderRadius: '4px', animation: 'pulse-glow 1.5s infinite' }} />
              <div style={{ height: '14px', background: 'var(--border)', borderRadius: '4px', animation: 'pulse-glow 1.5s infinite' }} />
            </div>
          </div>

          {/* Right Column (Forms, Details, Signatures) */}
          <div className="form-column-right">
            <div className="form-card-section" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ height: '24px', width: '40%', background: 'var(--border)', borderRadius: '4px', animation: 'pulse-glow 1.5s infinite' }} />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ height: '12px', width: '25%', background: 'var(--border)', borderRadius: '3px', animation: 'pulse-glow 1.5s infinite' }} />
                  <div style={{ height: '38px', background: 'var(--border)', borderRadius: '6px', animation: 'pulse-glow 1.5s infinite' }} />
                </div>
              ))}
            </div>

            <div className="form-card-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ height: '24px', width: '50%', background: 'var(--border)', borderRadius: '4px', animation: 'pulse-glow 1.5s infinite' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ height: '100px', background: 'var(--border)', borderRadius: '8px', animation: 'pulse-glow 1.5s infinite' }} />
                <div style={{ height: '100px', background: 'var(--border)', borderRadius: '8px', animation: 'pulse-glow 1.5s infinite' }} />
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes pulse-glow {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 0.25; }
          }
        `}</style>
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
            className="btn btn-primary"
            id="download-pdf-btn"
            onClick={handleDownloadPDF}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
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

          {/* Card 7.5: Foto Dokumen & Bersama Mobil */}
          <section className="form-card-section" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
              7.5. Foto Dokumen KTP &amp; Bersama Mobil
            </h2>
            
            {/* Foto KTP */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Foto Dokumen KTP (Maksimal 2 Foto)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  disabled={(formState.ktpPhotos || []).length >= 2}
                  onChange={(e) => handleImageUpload(e, 'ktpPhotos')}
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-hover)',
                    border: '1px dashed var(--border)',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    cursor: (formState.ktpPhotos || []).length >= 2 ? 'not-allowed' : 'pointer',
                    width: '100%'
                  }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {(formState.ktpPhotos || []).map((photo, index) => (
                    <div key={index} style={{ position: 'relative', width: '100px', height: '100px', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden', background: '#f8fafc' }}>
                      <img src={photo} alt={`KTP ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button 
                        type="button" 
                        onClick={() => removeImage(index, 'ktpPhotos')}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          background: 'rgba(239, 68, 68, 0.9)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          cursor: 'pointer',
                          padding: 0,
                          lineHeight: 1
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Foto Bersama Mobil */}
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Foto Bersama Mobil (Maksimal 2 Foto)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  disabled={(formState.carPhotos || []).length >= 2}
                  onChange={(e) => handleImageUpload(e, 'carPhotos')}
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-hover)',
                    border: '1px dashed var(--border)',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    cursor: (formState.carPhotos || []).length >= 2 ? 'not-allowed' : 'pointer',
                    width: '100%'
                  }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {(formState.carPhotos || []).map((photo, index) => (
                    <div key={index} style={{ position: 'relative', width: '100px', height: '100px', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden', background: '#f8fafc' }}>
                      <img src={photo} alt={`Mobil ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button 
                        type="button" 
                        onClick={() => removeImage(index, 'carPhotos')}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          background: 'rgba(239, 68, 68, 0.9)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          cursor: 'pointer',
                          padding: 0,
                          lineHeight: 1
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
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
      <div style={activeTab === 'print' ? { display: 'block' } : { position: 'fixed', left: '-9999px', top: '-9999px', zIndex: -1000, width: '800px', background: '#fff' }}>
        <InvoicePreview ref={printRef} record={record ? { ...record, formData: formState || record.formData } : null as any} />
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
