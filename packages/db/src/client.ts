import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

function getCanonicalDatabasePath(): string {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }

  // Check upwards from process.cwd() for the monorepo root
  let currentDir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const pkgPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.workspaces || pkg.name === 'ai-consulting-crm-v1') {
          return path.join(currentDir, 'sqlite.db');
        }
      } catch {}
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }

  // Check upwards from __dirname for the monorepo root
  let dirFromModule = __dirname;
  for (let i = 0; i < 5; i++) {
    const pkgPath = path.join(dirFromModule, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.workspaces || pkg.name === 'ai-consulting-crm-v1') {
          return path.join(dirFromModule, 'sqlite.db');
        }
      } catch {}
    }
    const parent = path.dirname(dirFromModule);
    if (parent === dirFromModule) break;
    dirFromModule = parent;
  }

  return path.resolve(process.cwd(), 'sqlite.db');
}

// Resolve canonical database file path
const dbPath = getCanonicalDatabasePath();

// Ensure directory exists
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// If root sqlite.db doesn't exist but apps/web/sqlite.db exists, copy it over
const altWebDbPath = path.resolve(dir, 'apps', 'web', 'sqlite.db');
if (!fs.existsSync(dbPath) && fs.existsSync(altWebDbPath)) {
  try {
    fs.copyFileSync(altWebDbPath, dbPath);
  } catch {}
}

const sqlite = new Database(dbPath);
// Enable WAL mode for better concurrency
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

/**
 * Initializes database tables if they do not exist.
 * Ensures zero-config startup for local dev & testing.
 */
export function initDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'operator',
      avatar TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      website TEXT,
      source TEXT NOT NULL DEFAULT 'sito',
      sector TEXT NOT NULL DEFAULT 'local_services',
      score INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'nuovo',
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      vat_id TEXT,
      sector TEXT NOT NULL,
      estimated_revenue TEXT,
      employee_count TEXT,
      tech_stack_json TEXT,
      address TEXT,
      city TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      rating REAL,
      review_count INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS demo_requests (
      id TEXT PRIMARY KEY,
      lead_id TEXT REFERENCES leads(id),
      contact_name TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      contact_phone TEXT,
      sector TEXT,
      company_size TEXT,
      preferred_date TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS enrichment_data (
      id TEXT PRIMARY KEY,
      company_id TEXT REFERENCES companies(id),
      lead_id TEXT REFERENCES leads(id),
      source TEXT NOT NULL,
      data_json TEXT NOT NULL,
      enriched_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      lead_id TEXT REFERENCES leads(id),
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Enrichment Dedicated Tables
    CREATE TABLE IF NOT EXISTS enrichment_runs (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id),
      status TEXT NOT NULL DEFAULT 'running',
      started_at TEXT NOT NULL,
      completed_at TEXT,
      overall_confidence REAL NOT NULL DEFAULT 0,
      commercial_score INTEGER NOT NULL DEFAULT 0,
      reliability_score INTEGER NOT NULL DEFAULT 0,
      summary_json TEXT
    );
    CREATE INDEX IF NOT EXISTS enrichment_runs_lead_id_idx ON enrichment_runs(lead_id);
    CREATE INDEX IF NOT EXISTS enrichment_runs_started_at_idx ON enrichment_runs(started_at);

    CREATE TABLE IF NOT EXISTS website_analysis (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id),
      run_id TEXT NOT NULL REFERENCES enrichment_runs(id),
      url TEXT NOT NULL,
      is_reachable INTEGER NOT NULL DEFAULT 0,
      is_https INTEGER NOT NULL DEFAULT 0,
      http_status INTEGER,
      title TEXT,
      meta_description TEXT,
      cms TEXT,
      is_ecommerce INTEGER NOT NULL DEFAULT 0,
      has_chatbot INTEGER NOT NULL DEFAULT 0,
      has_whatsapp INTEGER NOT NULL DEFAULT 0,
      has_booking INTEGER NOT NULL DEFAULT 0,
      has_contact_form INTEGER NOT NULL DEFAULT 0,
      has_analytics INTEGER NOT NULL DEFAULT 0,
      has_pixel INTEGER NOT NULL DEFAULT 0,
      has_newsletter INTEGER NOT NULL DEFAULT 0,
      is_multilingual INTEGER NOT NULL DEFAULT 0,
      detected_tech_json TEXT,
      subpages_scanned_json TEXT,
      analyzed_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS website_analysis_lead_id_idx ON website_analysis(lead_id);
    CREATE INDEX IF NOT EXISTS website_analysis_run_id_idx ON website_analysis(run_id);

    CREATE TABLE IF NOT EXISTS public_contacts (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id),
      run_id TEXT NOT NULL REFERENCES enrichment_runs(id),
      type TEXT NOT NULL,
      value TEXT NOT NULL,
      source_url TEXT,
      confidence REAL NOT NULL DEFAULT 0.5,
      is_verified INTEGER NOT NULL DEFAULT 0,
      collected_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS public_contacts_lead_id_idx ON public_contacts(lead_id);
    CREATE INDEX IF NOT EXISTS public_contacts_run_id_idx ON public_contacts(run_id);
    CREATE INDEX IF NOT EXISTS public_contacts_collected_at_idx ON public_contacts(collected_at);

    CREATE TABLE IF NOT EXISTS financial_indicators (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id),
      run_id TEXT NOT NULL REFERENCES enrichment_runs(id),
      vat_id TEXT,
      tax_code TEXT,
      legal_form TEXT,
      ateco_code TEXT,
      revenue_type TEXT NOT NULL DEFAULT 'unavailable',
      revenue_min INTEGER,
      revenue_max INTEGER,
      revenue_official INTEGER,
      profit_official INTEGER,
      employees_min INTEGER,
      employees_max INTEGER,
      employees_official INTEGER,
      source_name TEXT NOT NULL,
      source_url TEXT,
      source_year INTEGER,
      confidence REAL NOT NULL DEFAULT 0.3,
      notes TEXT,
      collected_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS financial_indicators_lead_id_idx ON financial_indicators(lead_id);
    CREATE INDEX IF NOT EXISTS financial_indicators_run_id_idx ON financial_indicators(run_id);

    CREATE TABLE IF NOT EXISTS reviews_signals (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id),
      run_id TEXT NOT NULL REFERENCES enrichment_runs(id),
      source_name TEXT NOT NULL,
      source_url TEXT,
      has_public_rating INTEGER NOT NULL DEFAULT 0,
      rating_value REAL,
      review_count INTEGER,
      signals_json TEXT,
      collected_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS reviews_signals_lead_id_idx ON reviews_signals(lead_id);
    CREATE INDEX IF NOT EXISTS reviews_signals_run_id_idx ON reviews_signals(run_id);

    CREATE TABLE IF NOT EXISTS growth_signals (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id),
      run_id TEXT NOT NULL REFERENCES enrichment_runs(id),
      growth_level TEXT NOT NULL DEFAULT 'unknown',
      confidence REAL NOT NULL DEFAULT 0,
      signals_json TEXT,
      source_urls_json TEXT,
      observed_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS growth_signals_lead_id_idx ON growth_signals(lead_id);
    CREATE INDEX IF NOT EXISTS growth_signals_run_id_idx ON growth_signals(run_id);

    CREATE TABLE IF NOT EXISTS enrichment_sources (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id),
      run_id TEXT NOT NULL REFERENCES enrichment_runs(id),
      adapter_name TEXT NOT NULL,
      status TEXT NOT NULL,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      items_count INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      executed_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS enrichment_sources_lead_id_idx ON enrichment_sources(lead_id);
    CREATE INDEX IF NOT EXISTS enrichment_sources_run_id_idx ON enrichment_sources(run_id);
  `);
}

// Auto-run initDatabase on client import
initDatabase();
