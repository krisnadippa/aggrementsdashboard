'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TransactionRecord } from '@/types';
import { getTransactions, cleanupExpired, deleteTransaction } from '@/lib/localStorage';
import TransactionCard from '@/components/TransactionCard';
import ThemeToggle from '@/components/ThemeToggle';

export default function HistoryPage() {
  const [records, setRecords] = useState<TransactionRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TransactionRecord | null>(null);

  useEffect(() => {
    cleanupExpired();
    setRecords(getTransactions().sort((a, b) => b.createdAt - a.createdAt));
    setLoaded(true);
  }, []);

  const handleDeleteRequest = (id: string) => {
    const target = records.find((r) => r.id === id);
    if (target) {
      setDeleteTarget(target);
    }
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteTransaction(deleteTarget.id);
      setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
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
          <input type="text" className="search-input-field" placeholder="Cari invoice..." />
        </div>
        <div className="main-header-actions">
          <ThemeToggle />
        </div>
      </div>

      <div className="page-inner">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 className="page-title">Riwayat Sementara</h1>
              <p className="page-subtitle">
                Menampilkan invoice yang dibuat dalam 24 jam terakhir dari browser ini.
              </p>
            </div>
            <Link href="/" className="btn btn-primary no-print" id="new-transaction-btn">
              + Transaksi Baru
            </Link>
          </div>

          {loaded && records.length > 0 && (
            <div style={{ marginTop: '0.875rem', padding: '0.625rem 0.875rem', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, fontSize: '0.8125rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>Data riwayat ini hanya tersimpan di browser Anda dan <strong>otomatis terhapus setelah 24 jam</strong> sejak dibuat. Untuk penyimpanan permanen, simpan PDF atau cetak invoice.</span>
            </div>
          )}
        </div>

        {!loaded ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" style={{ color: 'var(--text-muted)' }}>
                <line x1="12" y1="2" x2="12" y2="6"></line>
                <line x1="12" y1="18" x2="12" y2="22"></line>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                <line x1="2" y1="12" x2="6" y2="12"></line>
                <line x1="18" y1="12" x2="22" y2="12"></line>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
              </svg>
            </div>
            <p className="empty-state-title">Memuat data...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <p className="empty-state-title">Belum ada riwayat transaksi</p>
            <p className="empty-state-desc">
              Invoice yang Anda buat akan muncul di sini selama 24 jam. Buat transaksi baru untuk memulai.
            </p>
            <Link href="/" className="btn btn-primary" id="start-transaction-btn">
              Buat Transaksi Baru
            </Link>
          </div>
        ) : (
          <>
            <p style={{ marginBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {records.length} invoice ditemukan
            </p>
            <div className="history-grid">
              {records.map((record) => (
                <TransactionCard
                  key={record.id}
                  record={record}
                  onDelete={handleDeleteRequest}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Custom Confirmation Delete Modal */}
      {deleteTarget && (
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
            maxWidth: '400px',
            padding: '1.75rem',
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
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Hapus Invoice?</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.75rem', lineHeight: 1.5 }}>
              Apakah Anda yakin ingin menghapus invoice <strong>{deleteTarget.invoiceNumber}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => setDeleteTarget(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={confirmDelete}
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
