import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Use a temp directory that persists during dev server lifetime
const DATA_DIR = join(tmpdir(), 'infinitycar_sign_data');
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function generateId(): string {
  // Generate short 8-character alphanumeric ID
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// POST /api/sign-data  — save signed form data, return short ID
export async function POST(req: NextRequest) {
  try {
    ensureDir();
    const body = await req.json();
    
    let id = generateId();
    let filePath = join(DATA_DIR, `${id}.json`);
    // Ensure no collision
    let tries = 0;
    while (existsSync(filePath) && tries < 10) {
      id = generateId();
      filePath = join(DATA_DIR, `${id}.json`);
      tries++;
    }

    const record = {
      id,
      data: body,
      createdAt: Date.now(),
      expiresAt: Date.now() + MAX_AGE_MS,
    };

    writeFileSync(filePath, JSON.stringify(record), 'utf-8');

    return NextResponse.json({ id }, { status: 200 });
  } catch (err) {
    console.error('[sign-data POST]', err);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}

// GET /api/sign-data?id=xxxx — retrieve saved form data by ID
export async function GET(req: NextRequest) {
  try {
    ensureDir();
    const id = req.nextUrl.searchParams.get('id');
    if (!id || !/^[a-z0-9]{6,16}$/.test(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const filePath = join(DATA_DIR, `${id}.json`);
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Data not found or expired' }, { status: 404 });
    }

    const raw = JSON.parse(readFileSync(filePath, 'utf-8'));

    // Check expiry
    if (raw.expiresAt && Date.now() > raw.expiresAt) {
      return NextResponse.json({ error: 'Link telah kedaluwarsa (24 jam)' }, { status: 410 });
    }

    return NextResponse.json({ data: raw.data }, { status: 200 });
  } catch (err) {
    console.error('[sign-data GET]', err);
    return NextResponse.json({ error: 'Failed to retrieve data' }, { status: 500 });
  }
}
