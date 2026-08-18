'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TransactionRecord } from '@/types';
import { getTransactions, cleanupExpired, deleteTransaction, updateTransaction } from '@/lib/localStorage';
import ThemeToggle from '@/components/ThemeToggle';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function HistoryPage() {
  const [records, setRecords] = useState<TransactionRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TransactionRecord | null>(null);
  
  // Search and Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    cleanupExpired();
    const localRecords = getTransactions().sort((a, b) => b.createdAt - a.createdAt);
    setRecords(localRecords);
    setLoaded(true);

    // Background sync: for any local storage records that don't have renter's signature
    // and have a Neon DB ID (length of DB ID is 8 characters)
    localRecords.forEach((record) => {
      if (!record.formData.signatureRenter && record.id.length === 8) {
        fetch(`/api/sign-data?id=${record.id}`)
          .then((res) => {
            if (res.ok) return res.json();
          })
          .then(({ data }) => {
            if (data && data.signatureRenter) {
              const updated = updateTransaction(record.id, data);
              if (updated) {
                setRecords((prev) =>
                  prev.map((r) => (r.id === record.id ? updated : r))
                );
              }
            }
          })
          .catch((err) => console.error('Error background-syncing contract:', err));
      }
    });
  }, []);

  const handleDeleteRequest = (id: string) => {
    const target = records.find((r) => r.id === id);
    if (target) {
      setDeleteTarget(target);
    }
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      // Also request DELETE on database contract if it's a Neon DB ID (length 8)
      if (deleteTarget.id.length === 8) {
        fetch(`/api/sign-data?id=${deleteTarget.id}`, {
          method: 'DELETE',
        }).catch((err) => console.error('Error deleting contract from Postgres DB:', err));
      }
      
      deleteTransaction(deleteTarget.id);
      setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    }
  };

  // Filter records based on search query
  const filteredRecords = records.filter((record) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    const invoiceNum = record.invoiceNumber.toLowerCase();
    const renterName = (record.formData.renterName || '').toLowerCase();
    const vehicleName = (record.formData.vehicleName || '').toLowerCase();
    const policeNumber = (record.formData.policeNumber || '').toLowerCase();

    return (
      invoiceNum.includes(q) ||
      renterName.includes(q) ||
      vehicleName.includes(q) ||
      policeNumber.includes(q)
    );
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <>
      {/* Top Header Bar matching mockup */}
      <div className="main-header-bar no-print">
        <div className="search-container">
          <svg className="search-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="search-input-field"
            placeholder="Cari invoice..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset to page 1 on search
            }}
          />
        </div>
        <div className="main-header-actions">
          <ThemeToggle />
        </div>
      </div>

      <div className="page-inner">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 className="page-title">Riwayat Penyewaan</h1>
              <p className="page-subtitle">
                Menampilkan daftar invoice dan perjanjian sewa yang tersimpan di browser ini.
              </p>
            </div>
            <Link href="/" className="btn btn-primary no-print" id="new-transaction-btn">
              + Transaksi Baru
            </Link>
          </div>

          {loaded && records.length > 0 && (
            <div style={{ marginTop: '0.875rem', padding: '0.625rem 0.875rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: '0.8125rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>Data riwayat ini disimpan secara lokal di browser Anda. Hapus secara manual jika transaksi sudah tidak diperlukan.</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>Invoice Rental</h2>
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
              Invoice yang Anda buat akan muncul di sini. Buat transaksi baru untuk memulai.
            </p>
            <Link href="/" className="btn btn-primary" id="start-transaction-btn">
              Buat Transaksi Baru
            </Link>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>Tidak ada hasil pencarian ditemukan</p>
            <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>Coba cari nama penyewa, no plat, atau nomor invoice lainnya.</p>
          </div>
        ) : (
          <>
            <p style={{ marginBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Menampilkan {paginatedRecords.length} dari {filteredRecords.length} invoice ditemukan
            </p>

            <div className="table-responsive-custom" style={{ overflowX: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
                    <th style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>No. Invoice</th>
                    <th style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Tanggal</th>
                    <th style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Penyewa</th>
                    <th style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Kendaraan / Plat</th>
                    <th style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Total</th>
                    <th style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Status TTD</th>
                    <th style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((record) => {
                    const f = record.formData;
                    const hasRentalSig = !!f.signatureRental;
                    const hasRenterSig = !!f.signatureRenter;
                    
                    let statusText = '';
                    let statusBg = '';
                    let statusColor = '';
                    let dotColor = '';

                    if (hasRentalSig && hasRenterSig) {
                      statusText = 'Sudah Ditandatangani';
                      statusBg = 'var(--success-muted)';
                      statusColor = 'var(--success)';
                      dotColor = 'var(--success)';
                    } else if (!hasRentalSig && !hasRenterSig) {
                      statusText = 'Belum Ditandatangani';
                      statusBg = 'var(--danger-muted)';
                      statusColor = 'var(--danger)';
                      dotColor = 'var(--danger)';
                    } else {
                      statusText = 'Tanda Tangan Parsial';
                      statusBg = 'var(--warning-muted)';
                      statusColor = 'var(--warning)';
                      dotColor = 'var(--warning)';
                    }

                    return (
                      <tr key={record.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s ease' }} className="table-row-hover">
                        <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{record.invoiceNumber}</td>
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{formatDate(record.createdAt)}</td>
                        <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{f.renterName || '—'}</td>
                        <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>
                          <div style={{ fontWeight: 600 }}>{f.vehicleName || '—'}</div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{f.policeNumber || '—'}</span>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(f.totalCharge || 0)}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            background: statusBg,
                            color: statusColor,
                            padding: '0.25rem 0.625rem',
                            borderRadius: '50px',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            <span style={{ width: '6px', height: '6px', background: dotColor, borderRadius: '50%' }}></span>
                            {statusText}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <Link href={`/invoice/${record.id}`} className="btn btn-sm btn-outline" style={{ height: '30px', padding: '0 0.75rem', fontSize: '0.75rem', lineHeight: '28px' }}>
                              Lihat
                            </Link>
                            <Link href={`/?edit=${record.id}`} className="btn btn-sm btn-outline" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', height: '30px', padding: '0 0.75rem', fontSize: '0.75rem', lineHeight: '28px' }}>
                              Edit
                            </Link>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteRequest(record.id)}
                              style={{ height: '30px', padding: '0 0.75rem', fontSize: '0.75rem' }}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', padding: '0.5rem 0' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8125rem', height: 'auto', minWidth: 'auto' }}
                >
                  Sebelumnya
                </button>
                
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  const isCurrent = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      className={`btn ${isCurrent ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setCurrentPage(pageNum)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.8125rem',
                        height: 'auto',
                        minWidth: '36px',
                        background: isCurrent ? 'var(--accent)' : 'transparent',
                        borderColor: isCurrent ? 'var(--accent)' : 'var(--border)',
                        color: isCurrent ? '#fff' : 'var(--text-primary)'
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8125rem', height: 'auto', minWidth: 'auto' }}
                >
                  Selanjutnya
                </button>
              </div>
            )}
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
