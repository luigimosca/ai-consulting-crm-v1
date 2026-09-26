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
  legalName: text('legal_name'),
  vatId: text('vat_id'),
  fiscalCode: text('fiscal_code'),
  rea: text('rea'),
  sector: text('sector').notNull(),
  ateco: text('ateco'),
  legalAddress: text('legal_address'),
  operatingAddress: text('operating_address'),
  estimatedRevenue: text('estimated_revenue'),
  employeeCount: text('employee_count'),
  techStackJson: text('tech_stack_json'),
  address: text('address'),
  city: text('city'),
  province: text('province'),
  phone: text('phone'),
  email: text('email'),
  pec: text('pec'),
  website: text('website'),
  rating: real('rating'),
  reviewCount: integer('review_count'),
  notes: text('notes'),
  source: text('source'),
  sourceUrl: text('source_url'),
  providerPlaceId: text('provider_place_id'),
  confidence: text('confidence'),
  rawSourceData: text('raw_source_data'),
  fieldSourcesJson: text('field_sources_json'),
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

export const decisionMakers = sqliteTable(
  'decision_makers',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id').notNull().references(() => leads.id),
    runId: text('run_id').references(() => enrichmentRuns.id),
    fullName: text('full_name').notNull(),
    role: text('role').notNull(),
    department: text('department', {
      enum: ['management', 'marketing', 'medical', 'legal', 'sales', 'operations', 'tech', 'other']
    }).notNull().default('management'),
    seniority: text('seniority', {
      enum: ['c_level', 'owner', 'director', 'manager', 'specialist']
    }).notNull().default('owner'),
    email: text('email'),
    phone: text('phone'),
    linkedinUrl: text('linkedin_url'),
    avatarUrl: text('avatar_url'),
    confidence: real('confidence').notNull().default(0.7),
    source: text('source').notNull().default('team_page'),
    sourceUrl: text('source_url'),
    rawData: text('raw_data'),
    extractedAt: text('extracted_at').notNull(),
    lastVerifiedAt: text('last_verified_at'),
    verificationMethod: text('verification_method', {
      enum: ['website_published', 'pattern_inferred', 'manual_verified', 'unverified']
    }).notNull().default('website_published'),
    isVerified: integer('is_verified', { mode: 'boolean' }).notNull().default(false),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    leadIdIdx: index('decision_makers_lead_id_idx').on(table.leadId),
  })
);

// ---------------------------------------------------------------------------
// FASE 1: Ciclo Operativo Agenzia (Preventivi, Approvazioni, Commesse, Progetti, Compiti, Documenti, Gantt)
// ---------------------------------------------------------------------------

export const quotes = sqliteTable(
  'quotes',
  {
    id: text('id').primaryKey(),
    quoteNumber: text('quote_number').notNull().unique(),
    leadId: text('lead_id').references(() => leads.id),
    companyId: text('company_id').references(() => companies.id),
    title: text('title').notNull(),
    status: text('status', {
      enum: ['bozza', 'in_approvazione_interna', 'approvato_internamente', 'inviato', 'accettato', 'rifiutato', 'scaduto']
    }).notNull().default('bozza'),
    currentVersionNumber: integer('current_version_number').notNull().default(1),
    subtotal: integer('subtotal').notNull().default(0), // in centesimi di euro per evitare errori di arrotondamento float
    discountTotal: integer('discount_total').notNull().default(0),
    taxRate: real('tax_rate').notNull().default(22.0),
    taxTotal: integer('tax_total').notNull().default(0),
    totalAmount: integer('total_amount').notNull().default(0),
    currency: text('currency').notNull().default('EUR'),
    validUntil: text('valid_until'),
    paymentTerms: text('payment_terms'),
    deliveryTerms: text('delivery_terms'),
    notes: text('notes'),
    createdBy: text('created_by').notNull().references(() => users.id),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    leadIdIdx: index('quotes_lead_id_idx').on(table.leadId),
    statusIdx: index('quotes_status_idx').on(table.status),
    quoteNumberIdx: index('quotes_quote_number_idx').on(table.quoteNumber),
  })
);

export const quoteVersions = sqliteTable(
  'quote_versions',
  {
    id: text('id').primaryKey(),
    quoteId: text('quote_id').notNull().references(() => quotes.id),
    versionNumber: integer('version_number').notNull(),
    status: text('status', {
      enum: ['bozza', 'in_approvazione_interna', 'approvato_internamente', 'inviato', 'accettato', 'rifiutato', 'scaduto']
    }).notNull(),
    subtotal: integer('subtotal').notNull().default(0),
    discountTotal: integer('discount_total').notNull().default(0),
    taxRate: real('tax_rate').notNull().default(22.0),
    taxTotal: integer('tax_total').notNull().default(0),
    totalAmount: integer('total_amount').notNull().default(0),
    validUntil: text('valid_until'),
    paymentTerms: text('payment_terms'),
    deliveryTerms: text('delivery_terms'),
    notes: text('notes'),
    snapshotItemsJson: text('snapshot_items_json').notNull(), // Snapshot immutabile righe
    createdBy: text('created_by').notNull().references(() => users.id),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    quoteIdIdx: index('quote_versions_quote_id_idx').on(table.quoteId),
    versionNumberIdx: index('quote_versions_number_idx').on(table.quoteId, table.versionNumber),
  })
);

export const quoteItems = sqliteTable(
  'quote_items',
  {
    id: text('id').primaryKey(),
    quoteId: text('quote_id').notNull().references(() => quotes.id),
    versionNumber: integer('version_number').notNull().default(1),
    description: text('description').notNull(),
    quantity: real('quantity').notNull().default(1),
    unitPrice: integer('unit_price').notNull().default(0), // in centesimi di euro
    discountPercent: real('discount_percent').notNull().default(0),
    taxRate: real('tax_rate').notNull().default(22.0),
    costType: text('cost_type', {
      enum: ['one_time', 'recurring_monthly', 'recurring_yearly']
    }).notNull().default('one_time'),
    sortOrder: integer('sort_order').notNull().default(0),
    lineTotal: integer('line_total').notNull().default(0), // in centesimi di euro
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    quoteIdIdx: index('quote_items_quote_id_idx').on(table.quoteId),
  })
);

export const approvals = sqliteTable(
  'approvals',
  {
    id: text('id').primaryKey(),
    entityType: text('entity_type', {
      enum: ['quote', 'quote_version', 'order', 'project']
    }).notNull(),
    entityId: text('entity_id').notNull(),
    approvalType: text('approval_type', {
      enum: ['internal', 'client']
    }).notNull(),
    status: text('status', {
      enum: ['richiesta', 'approvata', 'rifiutata']
    }).notNull().default('richiesta'),
    requestedBy: text('requested_by').notNull().references(() => users.id),
    requestedAt: text('requested_at').notNull(),
    decidedBy: text('decided_by'), // ID utente interno o nome referente cliente
    decidedAt: text('decided_at'),
    comment: text('comment'),
    method: text('method', {
      enum: ['email_confirmation', 'signed_document', 'verbal_with_notes', 'portal_action', 'internal_review']
    }),
    evidenceDocumentId: text('evidence_document_id'),
    evidenceNotes: text('evidence_notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    entityIdx: index('approvals_entity_idx').on(table.entityType, table.entityId),
    statusIdx: index('approvals_status_idx').on(table.status),
  })
);

export const orders = sqliteTable(
  'orders',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(), // e.g. COM-2026-0001
    title: text('title').notNull(),
    leadId: text('lead_id').references(() => leads.id),
    companyId: text('company_id').references(() => companies.id),
    quoteId: text('quote_id').references(() => quotes.id),
    quoteVersionId: text('quote_version_id').references(() => quoteVersions.id),
    agreedValue: integer('agreed_value').notNull().default(0), // in centesimi
    currency: text('currency').notNull().default('EUR'),
    status: text('status', {
      enum: ['da_avviare', 'attiva', 'sospesa', 'completata', 'annullata']
    }).notNull().default('da_avviare'),
    managerId: text('manager_id').references(() => users.id),
    startDate: text('start_date'),
    dueDate: text('due_date'),
    completedAt: text('completed_at'),
    deliverablesSnapshotJson: text('deliverables_snapshot_json'), // snapshot prestazioni concordate
    notes: text('notes'),
    createdBy: text('created_by').notNull().references(() => users.id),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    codeIdx: index('orders_code_idx').on(table.code),
    leadIdIdx: index('orders_lead_id_idx').on(table.leadId),
    quoteIdIdx: index('orders_quote_id_idx').on(table.quoteId),
    statusIdx: index('orders_status_idx').on(table.status),
    managerIdIdx: index('orders_manager_id_idx').on(table.managerId),
  })
);

export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    projectType: text('project_type', {
      enum: ['internal', 'presales', 'client']
    }).notNull().default('client'),
    orderId: text('order_id').references(() => orders.id), // Nullable for internal & presales
    leadId: text('lead_id').references(() => leads.id), // Optional for presales
    companyId: text('company_id').references(() => companies.id), // Required for client
    code: text('code').notNull(), // e.g. PRJ-2026-0001
    title: text('title').notNull(),
    description: text('description'),
    status: text('status', {
      enum: ['pianificato', 'in_corso', 'in_pausa', 'completato', 'annullato']
    }).notNull().default('pianificato'),
    managerId: text('manager_id').references(() => users.id),
    startDate: text('start_date'),
    dueDate: text('due_date'),
    completedAt: text('completed_at'),
    progressPercent: integer('progress_percent').notNull().default(0),
    budgetHours: real('budget_hours').default(0),
    createdBy: text('created_by').notNull().references(() => users.id),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    projectTypeIdx: index('projects_project_type_idx').on(table.projectType),
    orderIdIdx: index('projects_order_id_idx').on(table.orderId),
    leadIdIdx: index('projects_lead_id_idx').on(table.leadId),
    companyIdIdx: index('projects_company_id_idx').on(table.companyId),
    statusIdx: index('projects_status_idx').on(table.status),
    managerIdIdx: index('projects_manager_id_idx').on(table.managerId),
  })
);


export const projectMilestones = sqliteTable(
  'project_milestones',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id),
    title: text('title').notNull(),
    description: text('description'),
    dueDate: text('due_date').notNull(),
    actualDate: text('actual_date'),
    status: text('status', {
      enum: ['in_programma', 'raggiunta', 'in_ritardo', 'annullata']
    }).notNull().default('in_programma'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    projectIdIdx: index('project_milestones_project_id_idx').on(table.projectId),
    statusIdx: index('project_milestones_status_idx').on(table.status),
  })
);

export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id),
    milestoneId: text('milestone_id').references(() => projectMilestones.id),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status', {
      enum: ['da_fare', 'in_corso', 'in_revisione', 'bloccato', 'completato']
    }).notNull().default('da_fare'),
    priority: text('priority', {
      enum: ['bassa', 'media', 'alta', 'urgente']
    }).notNull().default('media'),
    plannedStartDate: text('planned_start_date'),
    plannedEndDate: text('planned_end_date'),
    actualStartDate: text('actual_start_date'),
    actualEndDate: text('actual_end_date'),
    estimatedHours: real('estimated_hours').default(0),
    actualHours: real('actual_hours').default(0),
    progressPercent: integer('progress_percent').notNull().default(0),
    checklistJson: text('checklist_json').default('[]'), // array di { id, text, completed }
    sortOrder: integer('sort_order').notNull().default(0),
    createdBy: text('created_by').notNull().references(() => users.id),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    projectIdIdx: index('tasks_project_id_idx').on(table.projectId),
    statusIdx: index('tasks_status_idx').on(table.status),
    priorityIdx: index('tasks_priority_idx').on(table.priority),
  })
);

export const taskAssignments = sqliteTable(
  'task_assignments',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id').notNull().references(() => tasks.id),
    userId: text('user_id').notNull().references(() => users.id),
    role: text('role', {
      enum: ['lead', 'contributor', 'reviewer']
    }).notNull().default('contributor'),
    assignedAt: text('assigned_at').notNull(),
  },
  (table) => ({
    taskIdIdx: index('task_assignments_task_id_idx').on(table.taskId),
    userIdIdx: index('task_assignments_user_id_idx').on(table.userId),
  })
);

export const taskDependencies = sqliteTable(
  'task_dependencies',
  {
    id: text('id').primaryKey(),
    predecessorTaskId: text('predecessor_task_id').notNull().references(() => tasks.id),
    successorTaskId: text('successor_task_id').notNull().references(() => tasks.id),
    dependencyType: text('dependency_type', {
      enum: ['finish_to_start']
    }).notNull().default('finish_to_start'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    predecessorIdx: index('task_dep_predecessor_idx').on(table.predecessorTaskId),
    successorIdx: index('task_dep_successor_idx').on(table.successorTaskId),
  })
);

export const documents = sqliteTable(
  'documents',
  {
    id: text('id').primaryKey(),
    originalName: text('original_name').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    storageKey: text('storage_key').notNull().unique(),
    storageProvider: text('storage_provider').notNull().default('local'),
    entityType: text('entity_type', {
      enum: ['lead', 'quote', 'approval', 'order', 'project', 'task', 'general']
    }).notNull(),
    entityId: text('entity_id').notNull(),
    version: integer('version').notNull().default(1),
    visibility: text('visibility', {
      enum: ['internal', 'client']
    }).notNull().default('internal'),
    uploadedBy: text('uploaded_by').notNull().references(() => users.id),
    notes: text('notes'),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    entityIdx: index('documents_entity_idx').on(table.entityType, table.entityId),
    uploadedByIdx: index('documents_uploaded_by_idx').on(table.uploadedBy),
  })
);

export const activityLog = sqliteTable(
  'activity_log',
  {
    id: text('id').primaryKey(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    action: text('action').notNull(),
    performedBy: text('performed_by').notNull().references(() => users.id),
    detailsJson: text('details_json'),
    beforeJson: text('before_json'),
    afterJson: text('after_json'),
    ipAddress: text('ip_address'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    entityIdx: index('activity_log_entity_idx').on(table.entityType, table.entityId),
    performedByIdx: index('activity_log_performed_by_idx').on(table.performedBy),
    createdAtIdx: index('activity_log_created_at_idx').on(table.createdAt),
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

export type DecisionMaker = typeof decisionMakers.$inferSelect;
export type NewDecisionMaker = typeof decisionMakers.$inferInsert;

export type Quote = typeof quotes.$inferSelect;
export type NewQuote = typeof quotes.$inferInsert;

export type QuoteVersion = typeof quoteVersions.$inferSelect;
export type NewQuoteVersion = typeof quoteVersions.$inferInsert;

export type QuoteItem = typeof quoteItems.$inferSelect;
export type NewQuoteItem = typeof quoteItems.$inferInsert;

export type Approval = typeof approvals.$inferSelect;
export type NewApproval = typeof approvals.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type ProjectMilestone = typeof projectMilestones.$inferSelect;
export type NewProjectMilestone = typeof projectMilestones.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type TaskAssignment = typeof taskAssignments.$inferSelect;
export type NewTaskAssignment = typeof taskAssignments.$inferInsert;

export type TaskDependency = typeof taskDependencies.$inferSelect;
export type NewTaskDependency = typeof taskDependencies.$inferInsert;

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export type ActivityLogRecord = typeof activityLog.$inferSelect;
export type NewActivityLogRecord = typeof activityLog.$inferInsert;
