import { neon } from '@neondatabase/serverless';
import { hashPassword } from './auth-crypto';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('Warning: DATABASE_URL is not set in environment variables. Database features will be unavailable.');
}

export const sql = databaseUrl ? neon(databaseUrl) : null;

// Track initialization state to avoid redundant checks on every request
let isDbInitialized = false;

// Helper to initialize table if it doesn't exist
export async function initDb() {
  if (!sql || isDbInitialized) return;
  try {
    // 1. Create rental_contracts table
    await sql`
      CREATE TABLE IF NOT EXISTS rental_contracts (
        id VARCHAR(50) PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE
      );
    `;

    // 2. Create users table for authentication
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 3. Create index for query plan optimization
    await sql`
      CREATE INDEX IF NOT EXISTS idx_contracts_expiry_created 
      ON rental_contracts (expires_at, created_at DESC);
    `;

    // 4. Seed default admin if empty
    const usersCount = await sql`SELECT count(*) FROM users`;
    const count = Number(usersCount[0]?.count || 0);
    if (count === 0) {
      const seedUsername = process.env.ADMIN_USERNAME || 'admin';
      const seedPassword = process.env.ADMIN_PASSWORD || 'InfinityGoSecret2026!';
      const passwordHash = hashPassword(seedPassword);

      await sql`
        INSERT INTO users (username, password_hash)
        VALUES (${seedUsername}, ${passwordHash})
      `;
      console.log(`Database initialized: Seeded default user "${seedUsername}".`);
    }
    
    isDbInitialized = true;
  } catch (err) {
    console.error('Failed to initialize database table:', err);
  }
}

// Helper to delete records older than 24 hours
export async function cleanupExpiredDb() {
  if (!sql) return;
  try {
    await sql`DELETE FROM rental_contracts WHERE expires_at < NOW()`;
  } catch (err) {
    console.error('Failed to cleanup expired database records:', err);
  }
}
