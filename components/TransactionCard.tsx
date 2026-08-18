'use client';

import Link from 'next/link';
import { TransactionRecord } from '@/types';
import { deleteTransaction } from '@/lib/localStorage';

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

  const handleDelete = () => {
    onDelete(record.id);
  };

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
    <div className="txn-card">
      <div className="txn-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div>
          <span className="txn-invoice-num">{record.invoiceNumber}</span>
          <p className="txn-date">{formatDate(record.createdAt)}</p>
        </div>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          background: statusBg,
          color: statusColor,
          padding: '0.25rem 0.5rem',
          borderRadius: '50px',
          fontSize: '0.6875rem',
          fontWeight: 700,
          flexShrink: 0
        }}>
          <span style={{ width: '5px', height: '5px', background: dotColor, borderRadius: '50%' }}></span>
          {statusText}
        </span>
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
          Lihat
        </Link>
        <Link href={`/?edit=${record.id}`} className="btn btn-sm btn-outline" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }} id={`edit-invoice-${record.id}`}>
          Edit
        </Link>
        <button
          className="btn btn-sm btn-danger"
          onClick={handleDelete}
          id={`delete-txn-${record.id}`}
        >
          Hapus
        </button>
      </div>


    </div>
  );
}
