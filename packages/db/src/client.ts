import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

function getCanonicalDatabasePath(): string {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }

  // Support Fly.io mounted persistent volume at /data
  if (fs.existsSync('/data')) {
    return '/data/sqlite.db';
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
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {}
}

// If persistent volume /data/sqlite.db doesn't exist yet, seed it from /app/sqlite.db or local sqlite.db
if (!fs.existsSync(dbPath)) {
  const seedCandidates = [
    '/app/sqlite.db',
    path.resolve(process.cwd(), 'sqlite.db'),
    path.resolve(process.cwd(), 'apps', 'web', 'sqlite.db'),
  ];
  for (const cand of seedCandidates) {
    if (cand !== dbPath && fs.existsSync(cand)) {
      try {
        fs.copyFileSync(cand, dbPath);
        break;
      } catch {}
    }
  }
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
      legal_name TEXT,
      vat_id TEXT,
      fiscal_code TEXT,
      rea TEXT,
      sector TEXT NOT NULL,
      ateco TEXT,
      legal_address TEXT,
      operating_address TEXT,
      estimated_revenue TEXT,
      employee_count TEXT,
      tech_stack_json TEXT,
      address TEXT,
      city TEXT,
      province TEXT,
      phone TEXT,
      email TEXT,
      pec TEXT,
      website TEXT,
      rating REAL,
      review_count INTEGER,
      notes TEXT,
      source TEXT,
      source_url TEXT,
      provider_place_id TEXT,
      confidence TEXT,
      raw_source_data TEXT,
      field_sources_json TEXT,
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

    CREATE TABLE IF NOT EXISTS decision_makers (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id),
      run_id TEXT REFERENCES enrichment_runs(id),
      full_name TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT NOT NULL DEFAULT 'management',
      seniority TEXT NOT NULL DEFAULT 'owner',
      email TEXT,
      phone TEXT,
      linkedin_url TEXT,
      avatar_url TEXT,
      confidence REAL NOT NULL DEFAULT 0.7,
      source TEXT NOT NULL DEFAULT 'team_page',
      source_url TEXT,
      raw_data TEXT,
      extracted_at TEXT NOT NULL,
      last_verified_at TEXT,
      verification_method TEXT NOT NULL DEFAULT 'website_published',
      is_verified INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS decision_makers_lead_id_idx ON decision_makers(lead_id);

    -- =========================================================================
    -- FASE 1: Ciclo Operativo Agenzia (Tabelle DDL)
    -- =========================================================================

    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      quote_number TEXT NOT NULL UNIQUE,
      lead_id TEXT REFERENCES leads(id),
      company_id TEXT REFERENCES companies(id),
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'bozza',
      current_version_number INTEGER NOT NULL DEFAULT 1,
      subtotal INTEGER NOT NULL DEFAULT 0,
      discount_total INTEGER NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 22.0,
      tax_total INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'EUR',
      valid_until TEXT,
      payment_terms TEXT,
      delivery_terms TEXT,
      notes TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS quotes_lead_id_idx ON quotes(lead_id);
    CREATE INDEX IF NOT EXISTS quotes_status_idx ON quotes(status);
    CREATE INDEX IF NOT EXISTS quotes_quote_number_idx ON quotes(quote_number);

    CREATE TABLE IF NOT EXISTS quote_versions (
      id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL REFERENCES quotes(id),
      version_number INTEGER NOT NULL,
      status TEXT NOT NULL,
      subtotal INTEGER NOT NULL DEFAULT 0,
      discount_total INTEGER NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 22.0,
      tax_total INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL DEFAULT 0,
      valid_until TEXT,
      payment_terms TEXT,
      delivery_terms TEXT,
      notes TEXT,
      snapshot_items_json TEXT NOT NULL,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS quote_versions_quote_id_idx ON quote_versions(quote_id);
    CREATE INDEX IF NOT EXISTS quote_versions_number_idx ON quote_versions(quote_id, version_number);

    CREATE TABLE IF NOT EXISTS quote_items (
      id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL REFERENCES quotes(id),
      version_number INTEGER NOT NULL DEFAULT 1,
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price INTEGER NOT NULL DEFAULT 0,
      discount_percent REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 22.0,
      cost_type TEXT NOT NULL DEFAULT 'one_time',
      sort_order INTEGER NOT NULL DEFAULT 0,
      line_total INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS quote_items_quote_id_idx ON quote_items(quote_id);

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      approval_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'richiesta',
      requested_by TEXT NOT NULL REFERENCES users(id),
      requested_at TEXT NOT NULL,
      decided_by TEXT,
      decided_at TEXT,
      comment TEXT,
      method TEXT,
      evidence_document_id TEXT,
      evidence_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS approvals_entity_idx ON approvals(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS approvals_status_idx ON approvals(status);

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      lead_id TEXT REFERENCES leads(id),
      company_id TEXT REFERENCES companies(id),
      quote_id TEXT REFERENCES quotes(id),
      quote_version_id TEXT REFERENCES quote_versions(id),
      agreed_value INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'EUR',
      status TEXT NOT NULL DEFAULT 'da_avviare',
      manager_id TEXT REFERENCES users(id),
      start_date TEXT,
      due_date TEXT,
      completed_at TEXT,
      deliverables_snapshot_json TEXT,
      notes TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS orders_code_idx ON orders(code);
    CREATE INDEX IF NOT EXISTS orders_lead_id_idx ON orders(lead_id);
    CREATE INDEX IF NOT EXISTS orders_quote_id_idx ON orders(quote_id);
    CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
    CREATE INDEX IF NOT EXISTS orders_manager_id_idx ON orders(manager_id);

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      project_type TEXT NOT NULL DEFAULT 'client',
      order_id TEXT REFERENCES orders(id),
      lead_id TEXT REFERENCES leads(id),
      company_id TEXT REFERENCES companies(id),
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pianificato',
      manager_id TEXT REFERENCES users(id),
      start_date TEXT,
      due_date TEXT,
      completed_at TEXT,
      progress_percent INTEGER NOT NULL DEFAULT 0,
      budget_hours REAL DEFAULT 0,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS projects_order_id_idx ON projects(order_id);
    CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);
    CREATE INDEX IF NOT EXISTS projects_manager_id_idx ON projects(manager_id);

    CREATE TABLE IF NOT EXISTS project_milestones (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT NOT NULL,
      actual_date TEXT,
      status TEXT NOT NULL DEFAULT 'in_programma',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS project_milestones_project_id_idx ON project_milestones(project_id);
    CREATE INDEX IF NOT EXISTS project_milestones_status_idx ON project_milestones(status);

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      milestone_id TEXT REFERENCES project_milestones(id),
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'da_fare',
      priority TEXT NOT NULL DEFAULT 'media',
      planned_start_date TEXT,
      planned_end_date TEXT,
      actual_start_date TEXT,
      actual_end_date TEXT,
      estimated_hours REAL DEFAULT 0,
      actual_hours REAL DEFAULT 0,
      progress_percent INTEGER NOT NULL DEFAULT 0,
      checklist_json TEXT DEFAULT '[]',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
    CREATE INDEX IF NOT EXISTS tasks_priority_idx ON tasks(priority);

    CREATE TABLE IF NOT EXISTS task_assignments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      role TEXT NOT NULL DEFAULT 'contributor',
      assigned_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS task_assignments_task_id_idx ON task_assignments(task_id);
    CREATE INDEX IF NOT EXISTS task_assignments_user_id_idx ON task_assignments(user_id);

    CREATE TABLE IF NOT EXISTS task_dependencies (
      id TEXT PRIMARY KEY,
      predecessor_task_id TEXT NOT NULL REFERENCES tasks(id),
      successor_task_id TEXT NOT NULL REFERENCES tasks(id),
      dependency_type TEXT NOT NULL DEFAULT 'finish_to_start',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS task_dep_predecessor_idx ON task_dependencies(predecessor_task_id);
    CREATE INDEX IF NOT EXISTS task_dep_successor_idx ON task_dependencies(successor_task_id);

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      storage_key TEXT NOT NULL UNIQUE,
      storage_provider TEXT NOT NULL DEFAULT 'local',
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      visibility TEXT NOT NULL DEFAULT 'internal',
      uploaded_by TEXT NOT NULL REFERENCES users(id),
      notes TEXT,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS documents_entity_idx ON documents(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS documents_uploaded_by_idx ON documents(uploaded_by);

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      performed_by TEXT NOT NULL REFERENCES users(id),
      details_json TEXT,
      before_json TEXT,
      after_json TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS activity_log_entity_idx ON activity_log(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS activity_log_performed_by_idx ON activity_log(performed_by);
    CREATE INDEX IF NOT EXISTS activity_log_created_at_idx ON activity_log(created_at);

    -- Modelli di Processo (Process Templates)
    CREATE TABLE IF NOT EXISTS process_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'website',
      description TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      current_version_number INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS process_templates_code_idx ON process_templates(code);
    CREATE INDEX IF NOT EXISTS process_templates_category_idx ON process_templates(category);
    CREATE INDEX IF NOT EXISTS process_templates_status_idx ON process_templates(status);

    CREATE TABLE IF NOT EXISTS process_template_versions (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES process_templates(id),
      version_number INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      changelog TEXT,
      definition_json TEXT NOT NULL,
      created_by TEXT NOT NULL REFERENCES users(id),
      published_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS process_template_versions_template_id_idx ON process_template_versions(template_id);
    CREATE INDEX IF NOT EXISTS process_template_versions_number_idx ON process_template_versions(template_id, version_number);
    CREATE INDEX IF NOT EXISTS process_template_versions_status_idx ON process_template_versions(status);

    CREATE TABLE IF NOT EXISTS project_applied_templates (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      template_id TEXT NOT NULL REFERENCES process_templates(id),
      template_version_id TEXT NOT NULL REFERENCES process_template_versions(id),
      template_version_number INTEGER NOT NULL,
      applied_by TEXT NOT NULL REFERENCES users(id),
      applied_at TEXT NOT NULL,
      idempotency_key TEXT,
      task_mapping_json TEXT NOT NULL,
      notes TEXT
    );
    CREATE INDEX IF NOT EXISTS proj_applied_templates_project_id_idx ON project_applied_templates(project_id);
    CREATE INDEX IF NOT EXISTS proj_applied_templates_template_id_idx ON project_applied_templates(template_id);
    CREATE INDEX IF NOT EXISTS proj_applied_templates_idempotency_idx ON project_applied_templates(idempotency_key);

    -- Raccolta Materiali, Informazioni e Accessi del Cliente (Client Requests)
    CREATE TABLE IF NOT EXISTS client_requests (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      order_id TEXT REFERENCES orders(id),
      company_id TEXT REFERENCES companies(id),
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'general',
      status TEXT NOT NULL DEFAULT 'requested',
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      requested_by_user_id TEXT NOT NULL REFERENCES users(id),
      assigned_to_user_id TEXT REFERENCES users(id),
      client_visible INTEGER NOT NULL DEFAULT 1,
      blocks_task_completion INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      received_at TEXT,
      approved_at TEXT,
      approved_by_user_id TEXT REFERENCES users(id),
      rejection_reason TEXT,
      template_code TEXT,
      template_version INTEGER,
      idempotency_key TEXT
    );
    CREATE INDEX IF NOT EXISTS client_requests_project_id_idx ON client_requests(project_id);
    CREATE INDEX IF NOT EXISTS client_requests_order_id_idx ON client_requests(order_id);
    CREATE INDEX IF NOT EXISTS client_requests_company_id_idx ON client_requests(company_id);
    CREATE INDEX IF NOT EXISTS client_requests_status_idx ON client_requests(status);
    CREATE INDEX IF NOT EXISTS client_requests_category_idx ON client_requests(category);
    CREATE INDEX IF NOT EXISTS client_requests_priority_idx ON client_requests(priority);
    CREATE INDEX IF NOT EXISTS client_requests_idempotency_idx ON client_requests(idempotency_key);

    CREATE TABLE IF NOT EXISTS client_request_items (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL REFERENCES client_requests(id),
      label TEXT NOT NULL,
      description TEXT,
      item_type TEXT NOT NULL DEFAULT 'text',
      required INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'missing',
      value_text TEXT,
      value_url TEXT,
      document_id TEXT REFERENCES documents(id),
      source_url TEXT,
      notes TEXT,
      access_config_json TEXT,
      selection_options_json TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      received_at TEXT,
      approved_at TEXT
    );
    CREATE INDEX IF NOT EXISTS client_request_items_request_id_idx ON client_request_items(request_id);
    CREATE INDEX IF NOT EXISTS client_request_items_status_idx ON client_request_items(status);
    CREATE INDEX IF NOT EXISTS client_request_items_type_idx ON client_request_items(item_type);

    CREATE TABLE IF NOT EXISTS client_request_task_links (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL REFERENCES client_requests(id),
      task_id TEXT NOT NULL REFERENCES tasks(id),
      relation_type TEXT NOT NULL DEFAULT 'blocks',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS client_req_task_links_request_id_idx ON client_request_task_links(request_id);
    CREATE INDEX IF NOT EXISTS client_req_task_links_task_id_idx ON client_request_task_links(task_id);

    CREATE TABLE IF NOT EXISTS request_comments (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL REFERENCES client_requests(id),
      author_user_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'internal',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS request_comments_request_id_idx ON request_comments(request_id);
    CREATE INDEX IF NOT EXISTS request_comments_author_idx ON request_comments(author_user_id);

    -- Team & Permessi (Project Members & User Invitations)
    CREATE TABLE IF NOT EXISTS project_members (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      project_role TEXT NOT NULL DEFAULT 'contributor',
      status TEXT NOT NULL DEFAULT 'active',
      joined_at TEXT NOT NULL,
      added_by TEXT REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS project_members_project_id_idx ON project_members(project_id);
    CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON project_members(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS project_members_proj_user_uniq ON project_members(project_id, user_id);

    CREATE TABLE IF NOT EXISTS user_invitations (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'operator',
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS user_invitations_token_idx ON user_invitations(token);
    CREATE INDEX IF NOT EXISTS user_invitations_email_idx ON user_invitations(email);

    -- Area Admin: Impostazioni Attività, Brand e Preventivi (Organization Settings)
    CREATE TABLE IF NOT EXISTS organization_settings (
      id TEXT PRIMARY KEY,
      brand_key TEXT NOT NULL UNIQUE DEFAULT 'default',
      is_default INTEGER NOT NULL DEFAULT 1,
      legal_name TEXT,
      legal_form TEXT,
      vat_id TEXT,
      fiscal_code TEXT,
      legal_address TEXT,
      postal_code TEXT,
      city TEXT,
      province TEXT,
      country TEXT DEFAULT 'Italia',
      admin_email TEXT,
      phone TEXT,
      pec TEXT,
      sdi_code TEXT,
      brand_name TEXT,
      tagline TEXT,
      description TEXT,
      logo_document_id TEXT REFERENCES documents(id),
      logo_dark_document_id TEXT REFERENCES documents(id),
      favicon_document_id TEXT REFERENCES documents(id),
      primary_color TEXT,
      secondary_color TEXT,
      accent_color TEXT,
      quote_header_notes TEXT,
      quote_footer_text TEXT,
      quote_default_validity_days INTEGER DEFAULT 30,
      quote_default_terms TEXT,
      quote_payment_instructions TEXT,
      quote_contact_block_json TEXT,
      quote_logo_choice TEXT DEFAULT 'primary',
      updated_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS org_settings_brand_key_idx ON organization_settings(brand_key);

    -- Registro Account e Deleghe Digitali
    CREATE TABLE IF NOT EXISTS client_platform_accounts (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id),
      platform_type TEXT NOT NULL,
      account_name TEXT NOT NULL,
      external_id TEXT,
      external_url TEXT,
      access_method TEXT NOT NULL DEFAULT 'agency_mcc_partner',
      access_level TEXT NOT NULL DEFAULT 'standard_edit',
      delegated_to_identifier TEXT,
      status TEXT NOT NULL DEFAULT 'not_requested',
      origin_client_request_id TEXT REFERENCES client_requests(id),
      origin_client_request_item_id TEXT REFERENCES client_request_items(id),
      evidence_document_id TEXT REFERENCES documents(id),
      verification_type TEXT NOT NULL DEFAULT 'manual_operator',
      verification_method TEXT,
      verification_notes TEXT,
      verified_by_user_id TEXT REFERENCES users(id),
      verified_at TEXT,
      revoked_at TEXT,
      revoked_by_user_id TEXT REFERENCES users(id),
      revocation_reason TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS client_plat_acc_company_idx ON client_platform_accounts(company_id);
    CREATE INDEX IF NOT EXISTS client_plat_acc_type_idx ON client_platform_accounts(platform_type);
    CREATE INDEX IF NOT EXISTS client_plat_acc_status_idx ON client_platform_accounts(status);

    CREATE TABLE IF NOT EXISTS project_platform_account_links (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      account_id TEXT NOT NULL REFERENCES client_platform_accounts(id),
      linked_by_user_id TEXT NOT NULL REFERENCES users(id),
      linked_at TEXT NOT NULL,
      notes TEXT
    );
    CREATE INDEX IF NOT EXISTS proj_plat_link_project_idx ON project_platform_account_links(project_id);
    CREATE INDEX IF NOT EXISTS proj_plat_link_account_idx ON project_platform_account_links(account_id);
    CREATE UNIQUE INDEX IF NOT EXISTS proj_plat_link_uniq ON project_platform_account_links(project_id, account_id);

    -- Marketing Hub Tables
    CREATE TABLE IF NOT EXISTS marketing_segments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      target_type TEXT NOT NULL DEFAULT 'leads',
      rules_json TEXT NOT NULL,
      natural_language_summary TEXT,
      estimated_count INTEGER NOT NULL DEFAULT 0,
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS mktg_segments_target_type_idx ON marketing_segments(target_type);
    CREATE INDEX IF NOT EXISTS mktg_segments_created_by_idx ON marketing_segments(created_by);

    CREATE TABLE IF NOT EXISTS marketing_campaigns (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      objective TEXT NOT NULL DEFAULT 'lead_generation',
      channel TEXT NOT NULL DEFAULT 'email',
      status TEXT NOT NULL DEFAULT 'draft',
      segment_id TEXT REFERENCES marketing_segments(id),
      content_subject TEXT,
      content_body TEXT,
      dynamic_variables_json TEXT,
      scheduled_start_at TEXT,
      scheduled_end_at TEXT,
      owner_user_id TEXT REFERENCES users(id),
      approved_by_user_id TEXT REFERENCES users(id),
      approved_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS mktg_campaigns_code_idx ON marketing_campaigns(code);
    CREATE INDEX IF NOT EXISTS mktg_campaigns_status_idx ON marketing_campaigns(status);
    CREATE INDEX IF NOT EXISTS mktg_campaigns_segment_idx ON marketing_campaigns(segment_id);
    CREATE INDEX IF NOT EXISTS mktg_campaigns_owner_idx ON marketing_campaigns(owner_user_id);

    CREATE TABLE IF NOT EXISTS campaign_recipients (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES marketing_campaigns(id),
      lead_id TEXT REFERENCES leads(id),
      company_id TEXT REFERENCES companies(id),
      recipient_email TEXT,
      recipient_phone TEXT,
      contact_person_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      exclusion_reason TEXT,
      custom_variables_snapshot_json TEXT,
      last_contacted_at TEXT,
      outcome_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS mktg_recipients_campaign_idx ON campaign_recipients(campaign_id);
    CREATE INDEX IF NOT EXISTS mktg_recipients_lead_idx ON campaign_recipients(lead_id);
    CREATE INDEX IF NOT EXISTS mktg_recipients_company_idx ON campaign_recipients(company_id);
    CREATE INDEX IF NOT EXISTS mktg_recipients_status_idx ON campaign_recipients(status);
  `);

  // Non-destructive unique index bootstrap: detect conflicts without deleting any data or notes
  try {
    const leadDupes = sqlite.prepare(`
      SELECT campaign_id, lead_id, COUNT(*) as cnt 
      FROM campaign_recipients 
      WHERE lead_id IS NOT NULL 
      GROUP BY campaign_id, lead_id 
      HAVING count(*) > 1
    `).all() as Array<{ campaign_id: string; lead_id: string; cnt: number }>;

    const compDupes = sqlite.prepare(`
      SELECT campaign_id, company_id, COUNT(*) as cnt 
      FROM campaign_recipients 
      WHERE company_id IS NOT NULL 
      GROUP BY campaign_id, company_id 
      HAVING count(*) > 1
    `).all() as Array<{ campaign_id: string; company_id: string; cnt: number }>;

    if (leadDupes.length > 0 || compDupes.length > 0) {
      console.warn(
        `[initDatabase] Rilevati ${leadDupes.length + compDupes.length} gruppi di destinatari duplicati preesistenti in campaign_recipients. ` +
        `Nessuna riga è stata eliminata. Gli indici UNIQUE verranno abilitati solo dopo bonifica controllata autorizzata.`
      );
    } else {
      sqlite.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS mktg_recipients_camp_lead_uidx ON campaign_recipients(campaign_id, lead_id) WHERE lead_id IS NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS mktg_recipients_camp_comp_uidx ON campaign_recipients(campaign_id, company_id) WHERE company_id IS NOT NULL;
      `);
    }
  } catch (err) {
    console.warn('[initDatabase] Errore verifica indici univoci campaign_recipients:', err);
  }

  // Migrazione retrocompatibile per colonne aggiuntive se le tabelle esistevano già
  const migrations = [
    'ALTER TABLE leads ADD COLUMN marketing_consent_status TEXT NOT NULL DEFAULT "pending"',
    'ALTER TABLE leads ADD COLUMN opted_out_channels_json TEXT',
    'ALTER TABLE companies ADD COLUMN marketing_consent_status TEXT NOT NULL DEFAULT "pending"',
    'ALTER TABLE companies ADD COLUMN opted_out_channels_json TEXT',
    'ALTER TABLE client_platform_accounts ADD COLUMN verification_type TEXT NOT NULL DEFAULT "manual_operator"',
    'ALTER TABLE client_platform_accounts ADD COLUMN revoked_at TEXT',
    'ALTER TABLE client_platform_accounts ADD COLUMN revoked_by_user_id TEXT',
    'ALTER TABLE client_platform_accounts ADD COLUMN revocation_reason TEXT',
    'ALTER TABLE quote_versions ADD COLUMN sender_snapshot_json TEXT',
    'ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT "active"',
    'ALTER TABLE users ADD COLUMN invited_by TEXT',
    'ALTER TABLE users ADD COLUMN activated_at TEXT',
    'ALTER TABLE users ADD COLUMN updated_at TEXT',
    'CREATE INDEX IF NOT EXISTS users_status_idx ON users(status)',
    'ALTER TABLE decision_makers ADD COLUMN source_url TEXT',
    'ALTER TABLE decision_makers ADD COLUMN raw_data TEXT',
    'ALTER TABLE decision_makers ADD COLUMN extracted_at TEXT',
    'ALTER TABLE decision_makers ADD COLUMN last_verified_at TEXT',
    'ALTER TABLE decision_makers ADD COLUMN verification_method TEXT DEFAULT "website_published"',
    'ALTER TABLE decision_makers ADD COLUMN notes TEXT',
    'ALTER TABLE decision_makers ADD COLUMN updated_at TEXT',
    'ALTER TABLE tasks ADD COLUMN planned_start_date TEXT',
    'ALTER TABLE tasks ADD COLUMN planned_end_date TEXT',
    'ALTER TABLE tasks ADD COLUMN actual_start_date TEXT',
    'ALTER TABLE tasks ADD COLUMN actual_end_date TEXT',
    'ALTER TABLE tasks ADD COLUMN estimated_hours REAL DEFAULT 0',
    'ALTER TABLE tasks ADD COLUMN actual_hours REAL DEFAULT 0',
    'ALTER TABLE tasks ADD COLUMN progress_percent INTEGER DEFAULT 0',
    'ALTER TABLE tasks ADD COLUMN checklist_json TEXT DEFAULT "[]"',
    'ALTER TABLE projects ADD COLUMN project_type TEXT NOT NULL DEFAULT "client"',
    'ALTER TABLE projects ADD COLUMN lead_id TEXT',
    'ALTER TABLE projects ADD COLUMN company_id TEXT',
    'CREATE INDEX IF NOT EXISTS projects_project_type_idx ON projects(project_type)',
    'CREATE INDEX IF NOT EXISTS projects_lead_id_idx ON projects(lead_id)',
    'CREATE INDEX IF NOT EXISTS projects_company_id_idx ON projects(company_id)',
    'ALTER TABLE companies ADD COLUMN legal_name TEXT',
    'ALTER TABLE companies ADD COLUMN fiscal_code TEXT',
    'ALTER TABLE companies ADD COLUMN rea TEXT',
    'ALTER TABLE companies ADD COLUMN ateco TEXT',
    'ALTER TABLE companies ADD COLUMN legal_address TEXT',
    'ALTER TABLE companies ADD COLUMN operating_address TEXT',
    'ALTER TABLE companies ADD COLUMN province TEXT',
    'ALTER TABLE companies ADD COLUMN pec TEXT',
    'ALTER TABLE companies ADD COLUMN source TEXT',
    'ALTER TABLE companies ADD COLUMN source_url TEXT',
    'ALTER TABLE companies ADD COLUMN provider_place_id TEXT',
    'ALTER TABLE companies ADD COLUMN confidence TEXT',
    'ALTER TABLE companies ADD COLUMN raw_source_data TEXT',
    'ALTER TABLE companies ADD COLUMN field_sources_json TEXT',
    'CREATE INDEX IF NOT EXISTS companies_vat_id_idx ON companies(vat_id)',
    'CREATE INDEX IF NOT EXISTS companies_fiscal_code_idx ON companies(fiscal_code)',
    'CREATE INDEX IF NOT EXISTS companies_provider_place_id_idx ON companies(provider_place_id)',
  ];
  for (const m of migrations) {
    try {
      sqlite.exec(m);
    } catch {}
  }

  // Migrazione automatica pregressi in project_members
  try {
    const existingProjects = sqlite.prepare(`SELECT id, manager_id, created_by, created_at FROM projects`).all() as Array<{
      id: string;
      manager_id: string | null;
      created_by: string;
      created_at: string;
    }>;

    for (const proj of existingProjects) {
      // 1. Inserisci project manager come 'manager'
      if (proj.manager_id) {
        sqlite.prepare(`
          INSERT OR IGNORE INTO project_members (id, project_id, user_id, project_role, status, joined_at, added_by)
          VALUES (?, ?, ?, 'manager', 'active', ?, ?)
        `).run(`pm_${proj.id}_${proj.manager_id}`, proj.id, proj.manager_id, proj.created_at || new Date().toISOString(), proj.created_by || proj.manager_id);
      }

      // 2. Inserisci project creator come 'manager' se non già presente
      if (proj.created_by && proj.created_by !== proj.manager_id) {
        sqlite.prepare(`
          INSERT OR IGNORE INTO project_members (id, project_id, user_id, project_role, status, joined_at, added_by)
          VALUES (?, ?, ?, 'manager', 'active', ?, ?)
        `).run(`pm_${proj.id}_${proj.created_by}`, proj.id, proj.created_by, proj.created_at || new Date().toISOString(), proj.created_by);
      }

      // 3. Inserisci tutti gli utenti con task assegnati come 'contributor'
      const taskUsers = sqlite.prepare(`
        SELECT DISTINCT ta.user_id 
        FROM task_assignments ta
        JOIN tasks t ON ta.task_id = t.id
        WHERE t.project_id = ?
      `).all(proj.id) as Array<{ user_id: string }>;

      for (const tu of taskUsers) {
        if (tu.user_id) {
          sqlite.prepare(`
            INSERT OR IGNORE INTO project_members (id, project_id, user_id, project_role, status, joined_at, added_by)
            VALUES (?, ?, ?, 'contributor', 'active', ?, ?)
          `).run(`pm_${proj.id}_${tu.user_id}`, proj.id, tu.user_id, proj.created_at || new Date().toISOString(), proj.created_by || proj.manager_id);
        }
      }
    }
  } catch (err) {
    console.error('Migration error backfilling project_members:', err);
  }

  // Se la tabella projects ha ancora il vincolo NOT NULL su order_id, migriamo la tabella preservando tutti i dati
  try {
    const tableInfo = sqlite.pragma('table_info(projects)') as Array<{ name: string; notnull: number }>;
    const orderIdCol = tableInfo.find((col) => col.name === 'order_id');
    if (orderIdCol && orderIdCol.notnull === 1) {
      sqlite.exec(`
        PRAGMA foreign_keys=off;
        CREATE TABLE IF NOT EXISTS projects_dg_tmp (
          id TEXT PRIMARY KEY,
          project_type TEXT NOT NULL DEFAULT 'client',
          order_id TEXT REFERENCES orders(id),
          lead_id TEXT REFERENCES leads(id),
          company_id TEXT REFERENCES companies(id),
          code TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT NOT NULL DEFAULT 'pianificato',
          manager_id TEXT REFERENCES users(id),
          start_date TEXT,
          due_date TEXT,
          completed_at TEXT,
          progress_percent INTEGER NOT NULL DEFAULT 0,
          budget_hours REAL DEFAULT 0,
          created_by TEXT NOT NULL REFERENCES users(id),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT INTO projects_dg_tmp (id, project_type, order_id, lead_id, company_id, code, title, description, status, manager_id, start_date, due_date, completed_at, progress_percent, budget_hours, created_by, created_at, updated_at)
        SELECT id, COALESCE(project_type, 'client'), order_id, lead_id, company_id, code, title, description, status, manager_id, start_date, due_date, completed_at, progress_percent, budget_hours, created_by, created_at, updated_at FROM projects;
        DROP TABLE projects;
        ALTER TABLE projects_dg_tmp RENAME TO projects;
        CREATE INDEX IF NOT EXISTS projects_project_type_idx ON projects(project_type);
        CREATE INDEX IF NOT EXISTS projects_order_id_idx ON projects(order_id);
        CREATE INDEX IF NOT EXISTS projects_lead_id_idx ON projects(lead_id);
        CREATE INDEX IF NOT EXISTS projects_company_id_idx ON projects(company_id);
        CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);
        CREATE INDEX IF NOT EXISTS projects_manager_id_idx ON projects(manager_id);
        PRAGMA foreign_keys=on;
      `);
    }
  } catch (err) {
    console.error('Migration error making order_id nullable:', err);
  }

  // Seeding record di default per organization_settings se non esiste
  try {
    const existingSettings = sqlite.prepare(`SELECT id FROM organization_settings WHERE id = 'default'`).get();
    if (!existingSettings) {
      const now = new Date().toISOString();
      sqlite.prepare(`
        INSERT INTO organization_settings (
          id, brand_key, is_default,
          legal_name, legal_form, vat_id, fiscal_code, legal_address, postal_code, city, province, country, admin_email, phone, pec, sdi_code,
          brand_name, tagline, description,
          quote_header_notes, quote_footer_text, quote_default_validity_days, quote_default_terms, quote_logo_choice,
          created_at, updated_at
        ) VALUES (
          'default', 'default', 1,
          'AI Consulting & Solutions', 'Ditta / Società', NULL, NULL, NULL, NULL, NULL, NULL, 'Italia', NULL, NULL, NULL, NULL,
          'AI Consulting', 'Soluzioni di Intelligenza Artificiale e Automazione per Imprese', NULL,
          NULL, 'Grazie per la fiducia accordataci.', 30, '30% all''avvio, 40% al rilascio beta, 30% al collaudo finale', 'primary',
          ?, ?
        )
      `).run(now, now);
    }
  } catch (err) {
    console.error('Error seeding default organization_settings:', err);
  }
}

// Auto-run initDatabase on client import
initDatabase();



