import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

const testDbPath = path.resolve(process.cwd(), 'sqlite-test-jammja.db');
const testStoragePath = path.resolve(process.cwd(), 'storage_vault_test_jammja');

if (!fs.existsSync(testStoragePath)) {
  fs.mkdirSync(testStoragePath, { recursive: true });
}

console.log('Seeding test DB at:', testDbPath);
const dbTest = new Database(testDbPath);
const now = new Date().toISOString();
const hash = bcrypt.hashSync('Simulazione2026!', 10);

// Ensure users table exists with required columns
dbTest.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operator',
    status TEXT NOT NULL DEFAULT 'active',
    avatar TEXT,
    invited_by TEXT,
    activated_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// Insert admin and operator into isolated DB
dbTest.prepare(`
  INSERT OR REPLACE INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run('usr_admin_simulation', 'Admin Simulazione', 'admin@jammja-simulation.local', hash, 'admin', 'active', now, now);

dbTest.prepare(`
  INSERT OR REPLACE INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run('usr_operator_simulation', 'Operatore Marketing', 'operatore@jammja-simulation.local', hash, 'operator', 'active', now, now);

console.log('✅ Isolated DB users:', dbTest.prepare('SELECT id, email, role, status FROM users').all());

// Clean any leftover simulation user from sqlite.db if it exists
try {
  const rootDbPath = path.resolve(process.cwd(), 'sqlite.db');
  if (fs.existsSync(rootDbPath)) {
    const dbRoot = new Database(rootDbPath);
    dbRoot.prepare('DELETE FROM users WHERE email LIKE ?').run('%@jammja-simulation.local');
    console.log('✅ Cleaned any accidental entry from root sqlite.db');
  }
} catch (e) {
  console.error('Root DB cleanup note:', e);
}
