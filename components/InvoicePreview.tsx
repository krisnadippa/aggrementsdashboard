'use client';

import { forwardRef } from 'react';
import { TransactionRecord } from '@/types';
import { TERMS_AND_CONDITIONS, COMPANY_INFO } from '@/data/terms';
import VehicleConditionDiagram from './VehicleConditionDiagram';
import FuelIndicator from './FuelIndicator';

interface InvoicePreviewProps {
  record: TransactionRecord;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateTime(dateStr: string, timeStr: string) {
  if (!dateStr) return '—';
  return `${formatDate(dateStr)}, ${timeStr}`;
}

const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>(
  ({ record }, ref) => {
    const { formData: f, invoiceNumber, createdAt } = record;
    const transactionDate = new Date(createdAt).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    const billedDays = f.durationDays + (f.durationHours > 0 ? 1 : 0) || f.durationDays || 1;

    return (
      <div ref={ref} className="invoice-preview" id="invoice-preview-root">
        {/* ══════════════════ HEADER ══════════════════ */}
        <header className="inv-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', width: '100%' }}>
          <div className="inv-logo-block" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <img src="/images/logo.png" alt="Infinity Go Logo" style={{ height: '48px', width: 'auto', display: 'block' }} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Infinity Go</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Premium Car Rental</span>
            </div>
          </div>
          <div className="inv-header-info" style={{ textAlign: 'right' }}>
            <p className="inv-addr">{COMPANY_INFO.address}</p>
            <p className="inv-addr">Tel: {COMPANY_INFO.phone} · WA: {COMPANY_INFO.whatsapp}</p>
            <p className="inv-addr">Email: {COMPANY_INFO.email}</p>
          </div>
        </header>

        <div className="inv-divider" />

        {/* ══════════════════ TITLE ══════════════════ */}
        <div className="inv-title-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 className="inv-title" style={{ margin: 0 }}>RENTAL AGREEMENT / INVOICE</h1>
            <p className="inv-subtitle" style={{ margin: 0 }}>Kuta Selatan, {transactionDate}</p>
          </div>
          <div className="inv-number-block" style={{ textAlign: 'left', marginTop: '0.25rem' }}>
            <p className="inv-number-label" style={{ margin: 0 }}>No. Invoice</p>
            <p className="inv-number" style={{ margin: 0 }}>{invoiceNumber}</p>
          </div>
        </div>

        {/* ══════════════════ RENTER + VEHICLE DATA (2 columns) ══════════════════ */}
        <div className="inv-data-grid">
          {/* Left: Renter */}
          <div className="inv-data-col">
            <h3 className="inv-col-title">Data Penyewa</h3>
            <table className="inv-table">
              <tbody>
                <tr><td className="inv-td-key">Nama</td><td className="inv-td-val">{f.renterName || '—'}</td></tr>
                <tr><td className="inv-td-key">Identitas ({f.idType || 'KTP'})</td><td className="inv-td-val">{f.idNumber || '—'}</td></tr>
                <tr><td className="inv-td-key">Telepon</td><td className="inv-td-val">{f.phone || '—'}</td></tr>
                <tr><td className="inv-td-key">Email</td><td className="inv-td-val">{f.email || '—'}</td></tr>
                <tr><td className="inv-td-key">Alamat</td><td className="inv-td-val">{f.address || '—'}</td></tr>
              </tbody>
            </table>
          </div>
          {/* Right: Vehicle */}
          <div className="inv-data-col">
            <h3 className="inv-col-title">Data Kendaraan</h3>
            <table className="inv-table">
              <tbody>
                <tr><td className="inv-td-key">Kendaraan</td><td className="inv-td-val">{f.vehicleName || '—'}</td></tr>
                <tr><td className="inv-td-key">No. Polisi</td><td className="inv-td-val">{f.policeNumber || '—'}</td></tr>
                <tr><td className="inv-td-key">Mulai Sewa</td><td className="inv-td-val">{formatDateTime(f.startDate, f.startTime)}</td></tr>
                {f.flightArrival && <tr><td className="inv-td-key">Flight Arrival</td><td className="inv-td-val">{f.flightArrival}</td></tr>}
                <tr><td className="inv-td-key">Selesai Sewa</td><td className="inv-td-val">{formatDateTime(f.endDate, f.endTime)}</td></tr>
                {f.flightDeparture && <tr><td className="inv-td-key">Flight Departure</td><td className="inv-td-val">{f.flightDeparture}</td></tr>}
                <tr><td className="inv-td-key">Lama Sewa</td>
                  <td className="inv-td-val">
                    {f.durationDays > 0 ? `${f.durationDays} hari` : ''}
                    {f.durationHours > 0 ? ` ${f.durationHours} jam` : ''}
                    {!f.durationDays && !f.durationHours ? '1 hari' : ''}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ══════════════════ PAYMENT SUMMARY ══════════════════ */}
        <div className="inv-payment-section">
          <h3 className="inv-col-title">Rincian Pembayaran</h3>
          <table className="inv-payment-table">
            <tbody>
              <tr>
                <td>Harga per Hari</td>
                <td>{formatCurrency(f.dailyRate)}</td>
              </tr>
              <tr>
                <td>Lama Sewa (Ditagih)</td>
                <td>{billedDays} Hari</td>
              </tr>
              <tr>
                <td>Subtotal Sewa</td>
                <td>{formatCurrency(f.totalCharge)}</td>
              </tr>
              {f.additionalCharge > 0 && (
                <tr>
                  <td>Biaya Tambahan</td>
                  <td>{formatCurrency(f.additionalCharge)}</td>
                </tr>
              )}
              {f.discount > 0 && (
                <tr>
                  <td>Diskon</td>
                  <td>-{formatCurrency(f.discount)}</td>
                </tr>
              )}
              <tr className="inv-row-total">
                <td><strong>Total Rental</strong></td>
                <td><strong>{formatCurrency(f.totalRental || f.totalCharge)}</strong></td>
              </tr>
              <tr>
                <td>Uang Muka / Deposit</td>
                <td>{formatCurrency(f.deposit)}</td>
              </tr>
              <tr className="inv-row-total" style={{ background: '#eff6ff', color: 'var(--accent)' }}>
                <td><strong>Total Pembayaran (Termasuk Deposit)</strong></td>
                <td><strong>{formatCurrency(f.totalPayment || (f.totalCharge + f.deposit))}</strong></td>
              </tr>
              {f.amountPaidNow > 0 && (
                <tr>
                  <td>Jumlah Dibayar Sekarang</td>
                  <td>-{formatCurrency(f.amountPaidNow)}</td>
                </tr>
              )}
              <tr className="inv-row-balance" style={{ background: f.balanceDue > 0 ? '#fef3c7' : '#f0fdf4', color: f.balanceDue > 0 ? 'var(--warning)' : 'var(--success)' }}>
                <td><strong>Sisa Pembayaran / Balance Due</strong></td>
                <td><strong>{formatCurrency(f.balanceDue !== undefined ? f.balanceDue : f.balance)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ══════════════════ VEHICLE CONDITION ══════════════════ */}
        <div className="inv-condition-section">
          <h3 className="inv-col-title">Kondisi Kendaraan</h3>
          <VehicleConditionDiagram markers={f.damageMarkers} readOnly />
          <div className="inv-fuel-row">
            <div>
              <h4 className="inv-fuel-title">{f.vehicleType === 'ev' ? 'Daya Baterai (EV)' : 'Indikator BBM'}</h4>
              <FuelIndicator value={f.fuelLevel} vehicleType={f.vehicleType} readOnly />
            </div>
            <div className="inv-checklist">
              <h4 className="inv-fuel-title">Kelengkapan</h4>
              <ul className="inv-checklist-list">
                {f.checklist.map((item) => (
                  <li key={item.id} className="inv-checklist-item" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    {item.checked ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    )}
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ══════════════════ TERMS ══════════════════ */}
        <div className="inv-terms-section">
          <h3 className="inv-terms-title">Syarat & Ketentuan (Terms and Conditions)</h3>
          <ol className="inv-terms-list">
            {TERMS_AND_CONDITIONS.map((term, i) => (
              <li key={i} className="inv-term-item">{term}</li>
            ))}
          </ol>
        </div>

        {/* ══════════════════ ATTACHMENT PHOTOS ══════════════════ */}
        {((f.ktpPhotos && f.ktpPhotos.length > 0) || (f.carPhotos && f.carPhotos.length > 0)) && (
          <div className="inv-photos-section" style={{ marginTop: '1.5rem', marginBottom: '1.5rem', pageBreakInside: 'avoid' }}>
            <h3 className="inv-col-title" style={{ borderBottom: '2px solid var(--accent)', paddingBottom: '0.25rem', marginBottom: '1.5rem', fontSize: '0.9375rem', fontWeight: 800 }}>
              Lampiran Foto Dokumen &amp; Serah Terima
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Top Block: KTP */}
              {f.ktpPhotos && f.ktpPhotos.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)', textAlign: 'center', width: '100%' }}>
                    Foto KTP / Identitas
                  </h4>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
                    {f.ktpPhotos.map((photo, i) => (
                      <img 
                        key={i} 
                        src={photo} 
                        alt={`KTP Attachment ${i+1}`} 
                        style={{ 
                          maxHeight: '180px', 
                          maxWidth: '90%', 
                          width: 'auto',
                          height: 'auto',
                          objectFit: 'contain', 
                          border: '1px solid var(--border)', 
                          borderRadius: '8px',
                          display: 'block',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }} 
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Block: Customer Together with Car */}
              {f.carPhotos && f.carPhotos.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)', textAlign: 'center', width: '100%' }}>
                    Foto Bersama Mobil (Customer)
                  </h4>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
                    {f.carPhotos.map((photo, i) => (
                      <img 
                        key={i} 
                        src={photo} 
                        alt={`Car Attachment ${i+1}`} 
                        style={{ 
                          maxHeight: '180px', 
                          maxWidth: '90%', 
                          width: 'auto',
                          height: 'auto',
                          objectFit: 'contain', 
                          border: '1px solid var(--border)', 
                          borderRadius: '8px',
                          display: 'block',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }} 
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════ SIGNATURES ══════════════════ */}
        <div className="inv-sig-section">
          <div className="inv-sig-col">
            <p className="inv-sig-label">Pihak Rental</p>
            <div className="inv-sig-box">
              {f.signatureRental ? (
                <img src={f.signatureRental} alt="Tanda tangan rental" className="inv-sig-img" />
              ) : (
                <div className="inv-sig-placeholder" />
              )}
            </div>
            <p className="inv-sig-name">Infinity Go Rentcar Bali</p>
          </div>
          <div className="inv-sig-col">
            <p className="inv-sig-label">Penyewa</p>
            <div className="inv-sig-box">
              {f.signatureRenter ? (
                <img src={f.signatureRenter} alt="Tanda tangan penyewa" className="inv-sig-img" />
              ) : (
                <div className="inv-sig-placeholder" />
              )}
            </div>
            <p className="inv-sig-name">{f.renterName || '( _________________ )'}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="inv-footer">
          <p>Dokumen ini dihasilkan secara digital oleh sistem Infinity Go Rentcar Bali.</p>
          <p>Terima kasih telah memilih layanan kami — Selamat menikmati perjalanan Anda di Bali!</p>
        </div>
      </div>
    );
  }
);

InvoicePreview.displayName = 'InvoicePreview';
export default InvoicePreview;
