'use client';

import Link from 'next/link';
import { TransactionRecord } from '@/types';
import { hoursUntilExpiry, deleteTransaction } from '@/lib/localStorage';

interface TransactionCardProps {
  record: TransactionRecord;
  onDelete: (id: string) => void;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TransactionCard({ record, onDelete }: TransactionCardProps) {
  const { formData: f } = record;
  const hoursLeft = hoursUntilExpiry(record);

  const handleDelete = () => {
    onDelete(record.id);
  };

  return (
    <div className="txn-card">
      <div className="txn-card-header">
        <div>
          <span className="txn-invoice-num">{record.invoiceNumber}</span>
          <p className="txn-date">{formatDate(record.createdAt)}</p>
        </div>
        <div className="txn-expiry-badge" title={`Kedaluwarsa dalam ${hoursLeft} jam`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          {hoursLeft}j tersisa
        </div>
      </div>

      <div className="txn-card-body">
        <div className="txn-detail-row">
          <span className="txn-detail-key">Penyewa</span>
          <span className="txn-detail-val">{f.renterName || '—'}</span>
        </div>
        <div className="txn-detail-row">
          <span className="txn-detail-key">Kendaraan</span>
          <span className="txn-detail-val">{f.vehicleName || '—'}</span>
        </div>
        <div className="txn-detail-row">
          <span className="txn-detail-key">Mulai</span>
          <span className="txn-detail-val">{f.startDate ? `${f.startDate} ${f.startTime}` : '—'}</span>
        </div>
        <div className="txn-detail-row">
          <span className="txn-detail-key">Total</span>
          <span className="txn-detail-val txn-total">{formatCurrency(f.totalCharge)}</span>
        </div>
      </div>

      <div className="txn-card-footer">
        <Link href={`/invoice/${record.id}`} className="btn btn-sm btn-outline" id={`view-invoice-${record.id}`}>
          Lihat Invoice
        </Link>
        <button
          className="btn btn-sm btn-danger"
          onClick={handleDelete}
          id={`delete-txn-${record.id}`}
        >
          Hapus
        </button>
      </div>

      <div className="txn-auto-delete-note" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <span>Data otomatis terhapus dalam 24 jam sejak dibuat</span>
      </div>
    </div>
  );
}
