'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RentalFormData } from '@/types';
import { cleanupExpired, saveTransaction, getTransactions, updateTransaction } from '@/lib/localStorage';
import InvoiceForm2 from '@/components/InvoiceForm2';
import ThemeToggle from '@/components/ThemeToggle';
import { decodeShortData } from '@/lib/urlData';

export default function Dashboard2Page() {
  const [txnCount, setTxnCount] = useState(0);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [refId, setRefId] = useState<string | null>(null);
  const [prefillData, setPrefillData] = useState<RentalFormData | null>(null);
  const [refLoading, setRefLoading] = useState(false);
  const [refError, setRefError] = useState<string | null>(null);

  useEffect(() => {
    cleanupExpired();
    setTxnCount(getTransactions().length);

    // Check if URL has ?data= or ?ref= param from customer WhatsApp return link
    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get('data');
    const ref = params.get('ref');

    if (dataParam) {
      const decoded = decodeShortData(dataParam);
      if (decoded) {
        setPrefillData(decoded);
        // Clean URL to avoid re-fetching or reloading data on refresh
        window.history.replaceState({}, '', '/dashboard2');
      } else {
        setRefError('Tautan data tidak valid atau rusak.');
      }
    } else if (ref) {
      setRefId(ref);
      setRefLoading(true);
      fetch(`/api/sign-data?id=${encodeURIComponent(ref)}`)
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Gagal mengambil data');
          }
          return res.json();
        })
        .then(({ data }) => {
          setPrefillData(data as RentalFormData);
          // Clean URL to avoid re-fetching on refresh
          window.history.replaceState({}, '', '/dashboard2');
        })
        .catch((err) => {
          setRefError(err.message || 'Tautan tidak valid atau sudah kedaluwarsa.');
        })
        .finally(() => setRefLoading(false));
    }
  }, []);

  const handleFormSubmit = (data: RentalFormData) => {
    if (refId) {
      updateTransaction(refId, data);
      
      // Also post the update to Postgres DB
      fetch(`/api/sign-data?id=${encodeURIComponent(refId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch((err) => console.error('Failed to sync updated contract to DB:', err));

      setSavedId(refId);
    } else {
      const record = saveTransaction(data);
      setSavedId(record.id);
    }
  };

  return (
    <>
      {/* Top Header Bar matching mockup */}
      <div className="main-header-bar no-print">
        <div className="search-container">
          <svg className="search-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" className="search-input-field" placeholder="Cari..." />
        </div>
        <div className="main-header-actions">
          <ThemeToggle />
        </div>
      </div>

      <div className="page-inner">
        {/* Loading state when fetching signed data from customer */}
        {refLoading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '2rem', background: 'var(--accent-muted)', borderRadius: 'var(--radius)', marginBottom: '1.5rem', border: '1px solid var(--accent)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.9375rem' }}>Memuat data TTD penyewa...</span>
          </div>
        )}

        {/* Error state */}
        {refError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', background: 'var(--danger-muted)', borderRadius: 'var(--radius)', marginBottom: '1.5rem', border: '1px solid var(--danger)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--danger)', flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '0.875rem' }}>Gagal Memuat Data Penyewa</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.125rem' }}>{refError}</p>
            </div>
          </div>
        )}

        {/* Success notification when prefill loaded */}
        {prefillData && !refLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', background: 'var(--success-muted)', borderRadius: 'var(--radius)', marginBottom: '1.5rem', border: '1px solid var(--success)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--success)', flexShrink: 0 }}>
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.875rem' }}>Data TTD Penyewa Berhasil Dimuat!</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.125rem' }}>
                Form sudah terisi otomatis lengkap dengan tanda tangan <strong>{prefillData.renterName}</strong>. Silakan periksa dan simpan invoice.
              </p>
            </div>
          </div>
        )}

        {/* Form 2 with Shareable Signature Link support, prefill from customer if available */}
        <InvoiceForm2 onSubmit={handleFormSubmit} prefillData={prefillData ?? undefined} />
      </div>

      {/* Beautiful Success Modal Popup */}
      {savedId && (
        <div className="custom-modal-backdrop no-print" style={{
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
          <div className="custom-modal-box" style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-lg)',
            width: '90%',
            maxWidth: '420px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--success-muted)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Invoice Disimpan!</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.75rem', lineHeight: 1.5 }}>
              Perjanjian sewa rental mobil berhasil disimpan ke penyimpanan lokal browser Anda.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a
                href={`/invoice/${savedId}`}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center' }}
              >
                Lihat &amp; Cetak Invoice
              </a>
              <button
                type="button"
                className="btn btn-outline"
                style={{ width: '100%' }}
                onClick={() => {
                  setSavedId(null);
                  window.location.reload(); // Hard reset form state
                }}
              >
                Buat Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
