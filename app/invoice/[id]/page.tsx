'use client';

import { useEffect, useRef, useState, use } from 'react';
import Link from 'next/link';
import { useReactToPrint } from 'react-to-print';
import { TransactionRecord } from '@/types';
import { getTransaction } from '@/lib/localStorage';
import InvoicePreview from '@/components/InvoicePreview';

interface InvoicePageProps {
  params: Promise<{ id: string }>;
}

export default function InvoicePage({ params }: InvoicePageProps) {
  const { id } = use(params);
  const [record, setRecord] = useState<TransactionRecord | null | undefined>(undefined);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const found = getTransaction(id);
    setRecord(found);
  }, [id]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: record ? `Invoice-${record.invoiceNumber}` : 'Invoice',
    pageStyle: `
      @page { size: A4; margin: 1cm; }
      body { font-family: 'Inter', Arial, sans-serif; }
      .no-print, .invoice-page-actions, .navbar { display: none !important; }
    `,
  });

  // Loading state
  if (record === undefined) {
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

  return (
    <div className="page-inner">
      {/* ─── Action Bar ─── */}
      <div className="invoice-page-actions no-print">
        <Link href="/" className="btn btn-ghost" id="back-to-dashboard-btn">
          ← Kembali
        </Link>
        <Link href="/history" className="btn btn-outline" id="go-history-btn">
          Riwayat
        </Link>
        <button
          className="btn btn-outline"
          id="print-invoice-btn"
          onClick={() => window.print()}
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

      {/* ─── Invoice Preview ─── */}
      <InvoicePreview ref={printRef} record={record} />
    </div>
  );
}
