import { NextRequest, NextResponse } from 'next/server';
import { sql, initDb, cleanupExpiredDb } from '@/lib/db';

const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function generateId(): string {
  // Generate short 8-character alphanumeric ID
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
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
      // Update existing record with new data (e.g. customer signs the form)
      await sql`
        UPDATE rental_contracts 
        SET data = ${body} 
        WHERE id = ${idParam}
      `;
      return NextResponse.json({ id: idParam }, { status: 200 });
    }
    
    // Otherwise, insert new record
    let id = generateId();
    let collision = true;
    let tries = 0;

    // Ensure no ID collision in db
    while (collision && tries < 10) {
      const existing = await sql`SELECT id FROM rental_contracts WHERE id = ${id}`;
      if (existing.length === 0) {
        collision = false;
      } else {
        id = generateId();
        tries++;
      }
    }

    const expiresAt = new Date(Date.now() + MAX_AGE_MS).toISOString();

    // Insert into DB using tagged template literals
    await sql`
      INSERT INTO rental_contracts (id, data, expires_at) 
      VALUES (${id}, ${body}, ${expiresAt})
    `;

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
    
    // If no ID is specified, return all active records (for the admin monitoring list)
    if (!id) {
      const rows = await sql`
        SELECT id, data, created_at, expires_at 
        FROM rental_contracts 
        WHERE expires_at > NOW() 
        ORDER BY created_at DESC
      `;
      
      const list = rows.map((row) => ({
        id: row.id,
        renterName: row.data.renterName || '',
        vehicleName: row.data.vehicleName || '',
        policeNumber: row.data.policeNumber || '',
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        isSigned: !!row.data.signatureRenter,
        data: row.data,
      }));
      
      return NextResponse.json({ list }, { status: 200 });
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
