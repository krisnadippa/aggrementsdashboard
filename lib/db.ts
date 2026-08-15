import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('Warning: DATABASE_URL is not set in environment variables. Database features will be unavailable.');
}

export const sql = databaseUrl ? neon(databaseUrl) : null;

// Helper to initialize table if it doesn't exist
export async function initDb() {
  if (!sql) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS rental_contracts (
        id VARCHAR(50) PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE
      );
    `;
  } catch (err) {
    console.error('Failed to initialize database table:', err);
  }
}
