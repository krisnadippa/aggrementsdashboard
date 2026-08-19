import { NextRequest, NextResponse } from 'next/server';
import { sql, initDb, cleanupExpiredDb } from '@/lib/db';
import { verifyJWT } from '@/lib/auth-crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'ab43878b27f12e879a83d735fb29dc0a10c92f15a31a90c0a8767b45451bfd7890cf2c';

async function checkAdminAuth(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get('session_token')?.value;
  if (!token) return false;
  const payload = await verifyJWT(token, JWT_SECRET);
  return payload !== null;
}

const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function generateId(): string {
  // Generate short 8-character alphanumeric ID with secure randomness
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const array = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Safe fallback for legacy runtimes
    for (let i = 0; i < 8; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[array[i] % chars.length];
  }
  return id;
}

// POST /api/sign-data  — save or update signed form data to Postgres
export async function POST(req: NextRequest) {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'DATABASE_URL is not configured in env' }, { status: 500 });
    }

    // Auto-create table if not exists
    await initDb();
    
    // Auto-cleanup database rows older than 24 hours
    await cleanupExpiredDb();

    const body = await req.json();
    const idParam = req.nextUrl.searchParams.get('id');

    if (idParam) {
      // 1. Validate ID pattern
      if (!/^[a-z0-9]{6,16}$/.test(idParam)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
      }

      // 2. Fetch existing contract from DB first to prevent parameter tampering and enforce expiration
      const rows = await sql`SELECT data, expires_at FROM rental_contracts WHERE id = ${idParam}`;
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Invoice tidak ditemukan' }, { status: 404 });
      }

      const record = rows[0];
      const now = new Date();
      const expiresAt = record.expires_at ? new Date(record.expires_at as string) : null;
      if (expiresAt && now > expiresAt) {
        return NextResponse.json({ error: 'Link telah kedaluwarsa (24 jam)' }, { status: 410 });
      }

      const existingData = typeof record.data === 'string' 
        ? JSON.parse(record.data) 
        : record.data;

      // 3. Allowlist validation for customer signing updates
      const updatedData = {
        ...existingData,
        signatureRenter: body.signatureRenter || existingData.signatureRenter || '',
        ktpPhotos: Array.isArray(body.ktpPhotos) ? body.ktpPhotos.slice(0, 2) : existingData.ktpPhotos || [],
        carPhotos: Array.isArray(body.carPhotos) ? body.carPhotos.slice(0, 2) : existingData.carPhotos || [],
        damageMarkers: Array.isArray(body.damageMarkers) ? body.damageMarkers : existingData.damageMarkers || [],
        
        // Gracefully allow inputting basic identification details only if they were empty in database
        idNumber: existingData.idNumber || body.idNumber || '',
        idType: existingData.idType || body.idType || '',
        phone: existingData.phone || body.phone || '',
        email: existingData.email || body.email || '',
        address: existingData.address || body.address || '',

        // STRICTLY preserve all immutable pricing, schedule, and checklist items from database
        renterName: existingData.renterName,
        vehicleId: existingData.vehicleId,
        vehicleName: existingData.vehicleName,
        policeNumber: existingData.policeNumber,
        startDate: existingData.startDate,
        startTime: existingData.startTime,
        flightArrival: existingData.flightArrival,
        endDate: existingData.endDate,
        endTime: existingData.endTime,
        flightDeparture: existingData.flightDeparture,
        dailyRate: existingData.dailyRate,
        durationDays: existingData.durationDays,
        durationHours: existingData.durationHours,
        totalCharge: existingData.totalCharge,
        additionalCharge: existingData.additionalCharge,
        discount: existingData.discount,
        totalRental: existingData.totalRental,
        deposit: existingData.deposit,
        amountPaidNow: existingData.amountPaidNow,
        totalPayment: existingData.totalPayment,
        balanceDue: existingData.balanceDue,
        balance: existingData.balance,
        vehicleType: existingData.vehicleType,
        fuelLevel: existingData.fuelLevel,
        checklist: existingData.checklist,
        signatureRental: existingData.signatureRental,
        invoiceNumber: existingData.invoiceNumber,
      };

      // Update existing record with the safe/sanitized data object
      await sql`
        UPDATE rental_contracts 
        SET data = ${updatedData} 
        WHERE id = ${idParam}
      `;
      return NextResponse.json({ id: idParam }, { status: 200 });
    }
    
    // Otherwise, create new contract (Admin-only action)
    if (!(await checkAdminAuth(req))) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    // Sanitize incoming creation payload (allowlist verification to prevent mass assignment)
    const cleanData = {
      renterName: body.renterName || '',
      idType: body.idType || '',
      idNumber: body.idNumber || '',
      phone: body.phone || '',
      email: body.email || '',
      address: body.address || '',
      vehicleId: body.vehicleId || '',
      vehicleName: body.vehicleName || '',
      policeNumber: body.policeNumber || '',
      startDate: body.startDate || '',
      startTime: body.startTime || '',
      flightArrival: body.flightArrival || '',
      endDate: body.endDate || '',
      endTime: body.endTime || '',
      flightDeparture: body.flightDeparture || '',
      dailyRate: Number(body.dailyRate) || 0,
      durationDays: Number(body.durationDays) || 0,
      durationHours: Number(body.durationHours) || 0,
      totalCharge: Number(body.totalCharge) || 0,
      additionalCharge: Number(body.additionalCharge) || 0,
      discount: Number(body.discount) || 0,
      totalRental: Number(body.totalRental) || 0,
      deposit: Number(body.deposit) || 0,
      amountPaidNow: Number(body.amountPaidNow) || 0,
      totalPayment: Number(body.totalPayment) || 0,
      balanceDue: Number(body.balanceDue) || 0,
      balance: Number(body.balance) || 0,
      damageMarkers: Array.isArray(body.damageMarkers) ? body.damageMarkers : [],
      vehicleType: body.vehicleType || 'petrol',
      fuelLevel: Number(body.fuelLevel) || 75,
      checklist: Array.isArray(body.checklist) ? body.checklist : [],
      signatureRental: body.signatureRental || '',
      signatureRenter: body.signatureRenter || '',
      ktpPhotos: Array.isArray(body.ktpPhotos) ? body.ktpPhotos.slice(0, 2) : [],
      carPhotos: Array.isArray(body.carPhotos) ? body.carPhotos.slice(0, 2) : [],
      invoiceNumber: body.invoiceNumber || '',
    };

    let id = generateId();
    const expiresAt = new Date(Date.now() + MAX_AGE_MS).toISOString();
    let inserted = false;
    let tries = 0;

    while (!inserted && tries < 5) {
      try {
        await sql`
          INSERT INTO rental_contracts (id, data, expires_at) 
          VALUES (${id}, ${cleanData}, ${expiresAt})
        `;
        inserted = true;
      } catch (err: any) {
        // Unique violation check (Postgres code 23505)
        if (err.code === '23505' || err.message?.includes('unique constraint') || err.message?.includes('duplicate key')) {
          id = generateId();
          tries++;
        } else {
          throw err;
        }
      }
    }

    if (!inserted) {
      return NextResponse.json({ error: 'Gagal membuat ID invoice unik' }, { status: 500 });
    }

    return NextResponse.json({ id }, { status: 200 });
  } catch (err) {
    console.error('[sign-data POST]', err);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}

// GET /api/sign-data — retrieve active contracts list OR retrieve single by ID
export async function GET(req: NextRequest) {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'DATABASE_URL is not configured in env' }, { status: 500 });
    }

    // Auto-cleanup database rows older than 24 hours
    await cleanupExpiredDb();

    const id = req.nextUrl.searchParams.get('id');
    let search = req.nextUrl.searchParams.get('search') || '';
    if (search.length > 100) {
      search = search.substring(0, 100);
    }
    let page = parseInt(req.nextUrl.searchParams.get('page') || '1', 10);
    let limit = parseInt(req.nextUrl.searchParams.get('limit') || '10', 10);
    
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1 || limit > 100) limit = 10;
    
    const offset = (page - 1) * limit;
    
    // If no ID is specified, return all active records (for the admin monitoring list)
    if (!id) {
      if (!(await checkAdminAuth(req))) {
        return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
      }
      let rows;
      let total = 0;

      if (search.trim()) {
        const queryTerm = `%${search.trim().toLowerCase()}%`;
        const [rowsResult, countResult] = await Promise.all([
          sql`
            SELECT 
              id, 
              created_at, 
              expires_at,
              data->>'renterName' as renter_name,
              data->>'vehicleName' as vehicle_name,
              data->>'policeNumber' as police_number,
              data->>'totalCharge' as total_charge,
              data->>'signatureRental' as signature_rental,
              data->>'signatureRenter' as signature_renter,
              data->>'invoiceNumber' as invoice_number
            FROM rental_contracts 
            WHERE expires_at > NOW() 
              AND (
                LOWER(data->>'renterName') LIKE ${queryTerm}
                OR LOWER(data->>'vehicleName') LIKE ${queryTerm}
                OR LOWER(data->>'policeNumber') LIKE ${queryTerm}
                OR LOWER(data->>'invoiceNumber') LIKE ${queryTerm}
              )
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset}
          `,
          sql`
            SELECT count(*) as count
            FROM rental_contracts 
            WHERE expires_at > NOW() 
              AND (
                LOWER(data->>'renterName') LIKE ${queryTerm}
                OR LOWER(data->>'vehicleName') LIKE ${queryTerm}
                OR LOWER(data->>'policeNumber') LIKE ${queryTerm}
                OR LOWER(data->>'invoiceNumber') LIKE ${queryTerm}
              )
          `
        ]);
        rows = rowsResult;
        total = Number(countResult[0]?.count || 0);
      } else {
        const [rowsResult, countResult] = await Promise.all([
          sql`
            SELECT 
              id, 
              created_at, 
              expires_at,
              data->>'renterName' as renter_name,
              data->>'vehicleName' as vehicle_name,
              data->>'policeNumber' as police_number,
              data->>'totalCharge' as total_charge,
              data->>'signatureRental' as signature_rental,
              data->>'signatureRenter' as signature_renter,
              data->>'invoiceNumber' as invoice_number
            FROM rental_contracts 
            WHERE expires_at > NOW() 
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset}
          `,
          sql`
            SELECT count(*) as count
            FROM rental_contracts 
            WHERE expires_at > NOW()
          `
        ]);
        rows = rowsResult;
        total = Number(countResult[0]?.count || 0);
      }
      
      const list = rows.map((row) => ({
        id: row.id,
        renterName: row.renter_name || '',
        vehicleName: row.vehicle_name || '',
        policeNumber: row.police_number || '',
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        isSigned: !!row.signature_renter,
        data: {
          renterName: row.renter_name || '',
          vehicleName: row.vehicle_name || '',
          policeNumber: row.police_number || '',
          totalCharge: Number(row.total_charge || 0),
          signatureRental: row.signature_rental || '',
          signatureRenter: row.signature_renter || '',
          invoiceNumber: row.invoice_number || ''
        }
      }));
      
      return NextResponse.json({ list, total }, { status: 200 });
    }

    // Otherwise, fetch single record
    if (!/^[a-z0-9]{6,16}$/.test(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Fetch using tagged template literals
    const rows = await sql`SELECT data, expires_at FROM rental_contracts WHERE id = ${id}`;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    }

    const record = rows[0];
    const now = new Date();
    const expiresAt = record.expires_at ? new Date(record.expires_at as string) : null;

    // Check expiry
    if (expiresAt && now > expiresAt) {
      return NextResponse.json({ error: 'Link telah kedaluwarsa (24 jam)' }, { status: 410 });
    }

    // Neon's client automatically parses JSONB columns, but let's be safe
    const data = typeof record.data === 'string' ? JSON.parse(record.data) : record.data;

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error('[sign-data GET]', err);
    return NextResponse.json({ error: 'Failed to retrieve data' }, { status: 500 });
  }
}

// DELETE /api/sign-data?id=xxxx — delete contract by ID
export async function DELETE(req: NextRequest) {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'DATABASE_URL is not configured' }, { status: 500 });
    }

    // 1. Boundary authentication verification
    if (!(await checkAdminAuth(req))) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get('id');
    if (!id || !/^[a-z0-9]{6,16}$/.test(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await sql`DELETE FROM rental_contracts WHERE id = ${id}`;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('[sign-data DELETE]', err);
    return NextResponse.json({ error: 'Failed to delete data' }, { status: 500 });
  }
}
