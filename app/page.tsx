'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RentalFormData } from '@/types';
import { cleanupExpired, saveTransaction, getTransactions, getTransaction, updateTransaction, generateInvoiceNumber } from '@/lib/localStorage';
import InvoiceForm from '@/components/InvoiceForm';
import ThemeToggle from '@/components/ThemeToggle';

export default function DashboardPage() {
  const [txnCount, setTxnCount] = useState(0);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [prefillData, setPrefillData] = useState<RentalFormData | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  // Cleanup expired entries on mount
  useEffect(() => {
    cleanupExpired();
    setTxnCount(getTransactions().length);

    const params = new URLSearchParams(window.location.search);
    const editParam = params.get('edit');
    if (editParam) {
      setEditId(editParam);
      
      // Fetch directly from Neon database API
      fetch(`/api/sign-data?id=${encodeURIComponent(editParam)}`)
        .then((res) => {
          if (!res.ok) throw new Error('Data tidak ditemukan di database');
          return res.json();
        })
        .then(({ data }) => {
          if (data) {
            setPrefillData(data);
          }
        })
        .catch((err) => {
          console.warn('Gagal memuat prefill dari DB, falling back to local storage:', err);
          const found = getTransaction(editParam);
          if (found) {
            setPrefillData(found.formData);
          }
        });
    }
  }, []);

  const handleFormSubmit = async (data: RentalFormData) => {
    try {
      if (editId) {
        // Preserving existing invoiceNumber if available in form state
        const original = getTransaction(editId);
        const invoiceNum = original?.formData.invoiceNumber || data.invoiceNumber || generateInvoiceNumber();
        const payload = { ...data, invoiceNumber: invoiceNum };

        // Update in DB
        await fetch(`/api/sign-data?id=${encodeURIComponent(editId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        updateTransaction(editId, payload);
        setSavedId(editId);
      } else {
        // Generate new invoice number on client side
        const invoiceNum = generateInvoiceNumber();
        const payload = { ...data, invoiceNumber: invoiceNum };

        // Create in DB
        const res = await fetch('/api/sign-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Gagal menyimpan ke database');
        const { id } = await res.json();
        saveTransaction(payload, id);
        setSavedId(id);
      }
    } catch (err) {
      console.error('Failed to save to DB, falling back to local storage:', err);
      if (editId) {
        updateTransaction(editId, data);
        setSavedId(editId);
      } else {
        const record = saveTransaction(data);
        setSavedId(record.id);
      }
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
        {/* Form */}
        <InvoiceForm onSubmit={handleFormSubmit} prefillData={prefillData ?? undefined} />
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
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              {editId ? 'Invoice Diperbarui!' : 'Invoice Disimpan!'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.75rem', lineHeight: 1.5 }}>
              {editId 
                ? 'Perjanjian sewa rental mobil berhasil diperbarui di penyimpanan lokal browser Anda.' 
                : 'Perjanjian sewa rental mobil berhasil disimpan ke penyimpanan lokal browser Anda.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link
                href={`/invoice/${savedId}`}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Lihat & Cetak Invoice
              </Link>
              <button
                type="button"
                className="btn btn-outline"
                style={{ width: '100%' }}
                onClick={() => {
                  setSavedId(null);
                  if (editId) {
                    window.location.href = '/'; // clear query params and reset state cleanly
                  } else {
                    window.location.reload(); // Hard reset form state
                  }
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
