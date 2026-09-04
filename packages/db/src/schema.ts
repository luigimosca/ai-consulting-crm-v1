import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'operator'] }).notNull().default('operator'),
  avatar: text('avatar'),
  createdAt: text('created_at').notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
});

export const leads = sqliteTable('leads', {
  id: text('id').primaryKey(),
  companyName: text('company_name').notNull(),
  website: text('website'),
  source: text('source', { enum: ['sito', 'maps', 'directory', 'referral'] }).notNull().default('sito'),
  sector: text('sector', { 
    enum: ['studi_legali', 'commercialisti', 'horeca_ristoranti', 'horeca_hotel', 'ecommerce', 'local_services'] 
  }).notNull().default('local_services'),
  score: integer('score').notNull().default(0),
  status: text('status', { 
    enum: ['nuovo', 'arricchito', 'in_contatto', 'qualificato', 'convertito', 'perso'] 
  }).notNull().default('nuovo'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  city: text('city'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const companies = sqliteTable('companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  vatId: text('vat_id'),
  sector: text('sector').notNull(),
  estimatedRevenue: text('estimated_revenue'),
  employeeCount: text('employee_count'),
  techStackJson: text('tech_stack_json'),
  address: text('address'),
  city: text('city'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  rating: real('rating'),
  reviewCount: integer('review_count'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const demoRequests = sqliteTable('demo_requests', {
  id: text('id').primaryKey(),
  leadId: text('lead_id').references(() => leads.id),
  contactName: text('contact_name').notNull(),
  contactEmail: text('contact_email').notNull(),
  contactPhone: text('contact_phone'),
  sector: text('sector'),
  companySize: text('company_size'),
  preferredDate: text('preferred_date'),
  notes: text('notes'),
  status: text('status', { enum: ['pending', 'confirmed', 'completed', 'cancelled'] }).notNull().default('pending'),
  createdAt: text('created_at').notNull(),
});

export const enrichmentData = sqliteTable('enrichment_data', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id),
  leadId: text('lead_id').references(() => leads.id),
  source: text('source').notNull(),
  dataJson: text('data_json').notNull(),
  enrichedAt: text('enriched_at').notNull(),
});

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  leadId: text('lead_id').references(() => leads.id),
  sessionId: text('session_id').notNull(),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
});

// ---------------------------------------------------------------------------
// Nuove Tabelle Dedicate per il Sistema Reale di Lead Enrichment
// ---------------------------------------------------------------------------

export const enrichmentRuns = sqliteTable(
  'enrichment_runs',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id),
    status: text('status', { enum: ['running', 'completed', 'partial', 'failed'] }).notNull().default('running'),
    startedAt: text('started_at').notNull(),
    completedAt: text('completed_at'),
    overallConfidence: real('overall_confidence').notNull().default(0),
    commercialScore: integer('commercial_score').notNull().default(0),
    reliabilityScore: integer('reliability_score').notNull().default(0),
    summaryJson: text('summary_json'),
  },
  (table) => ({
    leadIdIdx: index('enrichment_runs_lead_id_idx').on(table.leadId),
    startedAtIdx: index('enrichment_runs_started_at_idx').on(table.startedAt),
  })
);

export const websiteAnalysis = sqliteTable(
  'website_analysis',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id),
    runId: text('run_id').notNull().references(() => enrichmentRuns.id),
    url: text('url').notNull(),
    isReachable: integer('is_reachable', { mode: 'boolean' }).notNull().default(false),
    isHttps: integer('is_https', { mode: 'boolean' }).notNull().default(false),
    httpStatus: integer('http_status'),
    title: text('title'),
    metaDescription: text('meta_description'),
    cms: text('cms'),
    isEcommerce: integer('is_ecommerce', { mode: 'boolean' }).notNull().default(false),
    hasChatbot: integer('has_chatbot', { mode: 'boolean' }).notNull().default(false),
    hasWhatsapp: integer('has_whatsapp', { mode: 'boolean' }).notNull().default(false),
    hasBooking: integer('has_booking', { mode: 'boolean' }).notNull().default(false),
    hasContactForm: integer('has_contact_form', { mode: 'boolean' }).notNull().default(false),
    hasAnalytics: integer('has_analytics', { mode: 'boolean' }).notNull().default(false),
    hasPixel: integer('has_pixel', { mode: 'boolean' }).notNull().default(false),
    hasNewsletter: integer('has_newsletter', { mode: 'boolean' }).notNull().default(false),
    isMultilingual: integer('is_multilingual', { mode: 'boolean' }).notNull().default(false),
    detectedTechJson: text('detected_tech_json'),
    subpagesScannedJson: text('subpages_scanned_json'),
    analyzedAt: text('analyzed_at').notNull(),
  },
  (table) => ({
    leadIdIdx: index('website_analysis_lead_id_idx').on(table.leadId),
    runIdIdx: index('website_analysis_run_id_idx').on(table.runId),
  })
);

export const publicContacts = sqliteTable(
  'public_contacts',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id),
    runId: text('run_id').notNull().references(() => enrichmentRuns.id),
    type: text('type', { 
      enum: ['generic_email', 'pec', 'named_email', 'phone', 'whatsapp', 'social'] 
    }).notNull(),
    value: text('value').notNull(),
    sourceUrl: text('source_url'),
    confidence: real('confidence').notNull().default(0.5),
    isVerified: integer('is_verified', { mode: 'boolean' }).notNull().default(false),
    collectedAt: text('collected_at').notNull(),
  },
  (table) => ({
    leadIdIdx: index('public_contacts_lead_id_idx').on(table.leadId),
    runIdIdx: index('public_contacts_run_id_idx').on(table.runId),
    collectedAtIdx: index('public_contacts_collected_at_idx').on(table.collectedAt),
  })
);

export const financialIndicators = sqliteTable(
  'financial_indicators',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id),
    runId: text('run_id').notNull().references(() => enrichmentRuns.id),
    vatId: text('vat_id'),
    taxCode: text('tax_code'),
    legalForm: text('legal_form'),
    atecoCode: text('ateco_code'),
    revenueType: text('revenue_type', { enum: ['official', 'estimated', 'unavailable'] }).notNull().default('unavailable'),
    revenueMin: integer('revenue_min'),
    revenueMax: integer('revenue_max'),
    revenueOfficial: integer('revenue_official'),
    profitOfficial: integer('profit_official'),
    employeesMin: integer('employees_min'),
    employeesMax: integer('employees_max'),
    employeesOfficial: integer('employees_official'),
    sourceName: text('source_name').notNull(),
    sourceUrl: text('source_url'),
    sourceYear: integer('source_year'),
    confidence: real('confidence').notNull().default(0.3),
    notes: text('notes'),
    collectedAt: text('collected_at').notNull(),
  },
  (table) => ({
    leadIdIdx: index('financial_indicators_lead_id_idx').on(table.leadId),
    runIdIdx: index('financial_indicators_run_id_idx').on(table.runId),
  })
);

export const reviewsSignals = sqliteTable(
  'reviews_signals',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id),
    runId: text('run_id').notNull().references(() => enrichmentRuns.id),
    sourceName: text('source_name').notNull(),
    sourceUrl: text('source_url'),
    hasPublicRating: integer('has_public_rating', { mode: 'boolean' }).notNull().default(false),
    ratingValue: real('rating_value'),
    reviewCount: integer('review_count'),
    signalsJson: text('signals_json'),
    collectedAt: text('collected_at').notNull(),
  },
  (table) => ({
    leadIdIdx: index('reviews_signals_lead_id_idx').on(table.leadId),
    runIdIdx: index('reviews_signals_run_id_idx').on(table.runId),
  })
);

export const growthSignals = sqliteTable(
  'growth_signals',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id),
    runId: text('run_id').notNull().references(() => enrichmentRuns.id),
    growthLevel: text('growth_level', { enum: ['low', 'medium', 'high', 'unknown'] }).notNull().default('unknown'),
    confidence: real('confidence').notNull().default(0),
    signalsJson: text('signals_json'),
    sourceUrlsJson: text('source_urls_json'),
    observedAt: text('observed_at').notNull(),
  },
  (table) => ({
    leadIdIdx: index('growth_signals_lead_id_idx').on(table.leadId),
    runIdIdx: index('growth_signals_run_id_idx').on(table.runId),
  })
);

export const enrichmentSources = sqliteTable(
  'enrichment_sources',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id),
    runId: text('run_id').notNull().references(() => enrichmentRuns.id),
    adapterName: text('adapter_name').notNull(),
    status: text('status', { enum: ['success', 'partial', 'failed', 'skipped'] }).notNull(),
    durationMs: integer('duration_ms').notNull().default(0),
    itemsCount: integer('items_count').notNull().default(0),
    errorMessage: text('error_message'),
    executedAt: text('executed_at').notNull(),
  },
  (table) => ({
    leadIdIdx: index('enrichment_sources_lead_id_idx').on(table.leadId),
    runIdIdx: index('enrichment_sources_run_id_idx').on(table.runId),
  })
);

// ---------------------------------------------------------------------------
// Type Exports
// ---------------------------------------------------------------------------

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

export type DemoRequest = typeof demoRequests.$inferSelect;
export type NewDemoRequest = typeof demoRequests.$inferInsert;

export type EnrichmentDataRecord = typeof enrichmentData.$inferSelect;
export type NewEnrichmentDataRecord = typeof enrichmentData.$inferInsert;

export type ChatMessageRecord = typeof chatMessages.$inferSelect;
export type NewChatMessageRecord = typeof chatMessages.$inferInsert;

export type EnrichmentRun = typeof enrichmentRuns.$inferSelect;
export type NewEnrichmentRun = typeof enrichmentRuns.$inferInsert;

export type WebsiteAnalysisRecord = typeof websiteAnalysis.$inferSelect;
export type NewWebsiteAnalysisRecord = typeof websiteAnalysis.$inferInsert;

export type PublicContactRecord = typeof publicContacts.$inferSelect;
export type NewPublicContactRecord = typeof publicContacts.$inferInsert;

export type FinancialIndicatorRecord = typeof financialIndicators.$inferSelect;
export type NewFinancialIndicatorRecord = typeof financialIndicators.$inferInsert;

export type ReviewSignalRecord = typeof reviewsSignals.$inferSelect;
export type NewReviewSignalRecord = typeof reviewsSignals.$inferInsert;

export type GrowthSignalRecord = typeof growthSignals.$inferSelect;
export type NewGrowthSignalRecord = typeof growthSignals.$inferInsert;

export type EnrichmentSourceRecord = typeof enrichmentSources.$inferSelect;
export type NewEnrichmentSourceRecord = typeof enrichmentSources.$inferInsert;
