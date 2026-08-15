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

  // Realtime active links from database (Neon DB)
  const [dbContracts, setDbContracts] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState(false);

  const fetchDbContracts = () => {
    setDbLoading(true);
    fetch('/api/sign-data')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(({ list }) => {
        setDbContracts(list || []);
      })
      .catch((err) => {
        console.error('Error fetching database contracts:', err);
      })
      .finally(() => setDbLoading(false));
  };

  useEffect(() => {
    cleanupExpired();
    setRecords(getTransactions().sort((a, b) => b.createdAt - a.createdAt));
    setLoaded(true);
    fetchDbContracts();
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

  const deleteDbContract = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus tautan ini?')) return;
    try {
      const res = await fetch(`/api/sign-data?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDbContracts((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert('Gagal menghapus data.');
      }
    } catch (err) {
      console.error('Error deleting contract:', err);
      alert('Terjadi kesalahan koneksi.');
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

        {loaded && (
          <section style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>Status Tanda Tangan Customer (Realtime - Neon DB)</h2>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={fetchDbContracts}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem', height: 'auto' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={dbLoading ? 'animate-spin' : ''}>
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                </svg>
                Segarkan
              </button>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Daftar tautan tanda tangan mandiri yang dikirim ke customer. Status ttd ter-update secara otomatis jika customer menandatangani dari HP mereka.
            </p>

            {dbLoading && dbContracts.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Memuat data realtime dari database...
              </div>
            ) : dbContracts.length === 0 ? (
              <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)', fontSize: '0.875rem', background: 'var(--bg-card)' }}>
                Tidak ada tautan tanda tangan aktif di database.
              </div>
            ) : (
              <div className="table-responsive-custom" style={{ overflowX: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Nama Penyewa</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Mobil / Plat</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Dibuat Pada</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Status TTD</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbContracts.map((item) => {
                      const createdDate = new Date(item.createdAt).toLocaleString('id-ID', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      });
                      const customerLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/customer-sign?ref=${item.id}`;
                      const adminOpenLink = `/dashboard2?ref=${item.id}`;
                      
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.renterName}</td>
                          <td style={{ padding: '0.85rem 1rem', color: 'var(--text-primary)' }}>
                            <div style={{ fontWeight: 600 }}>{item.vehicleName}</div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{item.policeNumber}</span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{createdDate}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {item.isSigned ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'var(--success-muted)', color: 'var(--success)', padding: '0.25rem 0.625rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700 }}>
                                <span style={{ width: '6px', height: '6px', background: 'var(--success)', borderRadius: '50%' }}></span>
                                Sudah Ditandatangani
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'var(--warning-muted)', color: 'var(--warning)', padding: '0.25rem 0.625rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700 }}>
                                <span style={{ width: '6px', height: '6px', background: 'var(--warning)', borderRadius: '50%' }}></span>
                                Belum Ditandatangani
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="btn btn-outline"
                                title="Salin Link Customer"
                                onClick={() => {
                                  navigator.clipboard.writeText(customerLink).then(() => {
                                    alert('Tautan customer berhasil disalin!');
                                  });
                                }}
                                style={{ padding: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', minWidth: 'auto' }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                </svg>
                              </button>
                              <Link
                                href={adminOpenLink}
                                className="btn btn-primary"
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', height: '32px', lineHeight: '32px' }}
                              >
                                {item.isSigned ? "Proses Invoice" : "Tinjau"}
                              </Link>
                              <button
                                type="button"
                                onClick={() => deleteDbContract(item.id)}
                                className="btn btn-outline"
                                title="Hapus"
                                style={{ padding: '0.35rem', borderColor: 'var(--danger)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', minWidth: 'auto' }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>Invoice Final (LocalStorage Browser)</h2>
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
