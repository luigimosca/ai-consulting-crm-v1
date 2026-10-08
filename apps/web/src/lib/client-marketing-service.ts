import {
  db,
  clientCampaigns,
  campaignCreatives,
  campaignKpiReports,
  projects,
  orders,
  clientPlatformAccounts,
  users,
  documents,
  ClientCampaign,
  CampaignCreative,
  CampaignKpiReport,
} from '@ai-crm/db';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { UserSessionPayload, checkUserProjectAccess, getUserProjectRole } from './auth';
import { logActivity } from './activity-logger';
import { assertNoSensitiveData } from './platform-accounts-service';

export type ClientCampaignChannel =
  | 'google_search'
  | 'google_performance_max'
  | 'google_display_remarketing'
  | 'meta_ads_lead_generation'
  | 'meta_ads_conversions'
  | 'meta_ads_brand_awareness'
  | 'local_seo_google_maps'
  | 'email_marketing_retention'
  | 'other_channel';

export type ClientCampaignStatus =
  | 'draft'
  | 'in_planning'
  | 'pending_client_approval'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

export type CreativeFormat =
  | 'search_responsive_ad'
  | 'meta_single_image'
  | 'meta_carousel'
  | 'meta_video_reel'
  | 'display_responsive_banner';

export type CreativeApprovalStatus =
  | 'draft'
  | 'internal_review'
  | 'client_approval_requested'
  | 'approved'
  | 'changes_requested';

export type KpiReportSourceType = 'manual_entry' | 'csv_import' | 'readonly_api_sync';

export interface CalculatedKpiMetrics {
  ctrPercentage: number;
  cpcAverageEuro: number;
  cpaEuro: number;
  roasRatio: number;
}

/**
 * Calculates marketing KPI metrics with safety against division by zero.
 */
export function calculateKpiMetrics(params: {
  spendCents: number;
  impressions: number;
  clicks: number;
  conversionsCount: number;
  conversionValueCents?: number;
}): CalculatedKpiMetrics {
  const { spendCents, impressions, clicks, conversionsCount, conversionValueCents = 0 } = params;

  const spendEuro = spendCents / 100;
  const conversionValueEuro = conversionValueCents / 100;

  const ctrPercentage = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;
  const cpcAverageEuro = clicks > 0 ? Number((spendEuro / clicks).toFixed(2)) : 0;
  const cpaEuro = conversionsCount > 0 ? Number((spendEuro / conversionsCount).toFixed(2)) : 0;
  const roasRatio = spendCents > 0 ? Number((conversionValueEuro / spendEuro).toFixed(2)) : 0;

  return {
    ctrPercentage,
    cpcAverageEuro,
    cpaEuro,
    roasRatio,
  };
}

export interface UtmBuilderParams {
  baseUrl: string;
  source: string;
  medium: string;
  campaign: string;
  term?: string;
  content?: string;
}

/**
 * Clean and builds a standard tracked UTM URL.
 */
export function buildUtmUrl(params: UtmBuilderParams): string {
  if (!params.baseUrl || typeof params.baseUrl !== 'string') {
    throw new Error('URL base obbligatoria per generare i parametri UTM.');
  }

  let fullUrl = params.baseUrl.trim();
  if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
    fullUrl = 'https://' + fullUrl;
  }

  let urlObj: URL;
  try {
    urlObj = new URL(fullUrl);
  } catch {
    throw new Error(`Sintassi URL non valida: "${params.baseUrl}"`);
  }

  const cleanParam = (val: string | undefined): string | null => {
    if (!val) return null;
    return val
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_\-.]/g, '');
  };

  const source = cleanParam(params.source);
  const medium = cleanParam(params.medium);
  const campaign = cleanParam(params.campaign);
  const term = cleanParam(params.term);
  const content = cleanParam(params.content);

  if (source) urlObj.searchParams.set('utm_source', source);
  if (medium) urlObj.searchParams.set('utm_medium', medium);
  if (campaign) urlObj.searchParams.set('utm_campaign', campaign);
  if (term) urlObj.searchParams.set('utm_term', term);
  if (content) urlObj.searchParams.set('utm_content', content);

  return urlObj.toString();
}

/**
 * Validates and extracts UTM parameters from a URL string.
 */
export function parseUtmUrl(urlStr: string): {
  isValid: boolean;
  baseUrl: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
} {
  try {
    let clean = urlStr.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    const parsed = new URL(clean);
    return {
      isValid: true,
      baseUrl: `${parsed.origin}${parsed.pathname}`,
      utmSource: parsed.searchParams.get('utm_source') || undefined,
      utmMedium: parsed.searchParams.get('utm_medium') || undefined,
      utmCampaign: parsed.searchParams.get('utm_campaign') || undefined,
      utmTerm: parsed.searchParams.get('utm_term') || undefined,
      utmContent: parsed.searchParams.get('utm_content') || undefined,
    };
  } catch {
    return {
      isValid: false,
      baseUrl: urlStr,
    };
  }
}

// ---------------------------------------------------------------------------
// Client Campaigns CRUD
// ---------------------------------------------------------------------------

export interface CreateClientCampaignInput {
  projectId: string;
  orderId?: string;
  platformAccountId?: string;
  name: string;
  channel: ClientCampaignChannel;
  objective: string;
  monthlyBudgetCents: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  status?: ClientCampaignStatus;
  targetGeography?: string;
  targetLanguages?: string;
  targetKeywords?: string[];
  assignedOperatorId?: string;
}

export interface UpdateClientCampaignInput {
  orderId?: string | null;
  platformAccountId?: string | null;
  name?: string;
  channel?: ClientCampaignChannel;
  objective?: string;
  monthlyBudgetCents?: number;
  currency?: string;
  startDate?: string | null;
  endDate?: string | null;
  status?: ClientCampaignStatus;
  targetGeography?: string | null;
  targetLanguages?: string | null;
  targetKeywords?: string[] | null;
  assignedOperatorId?: string | null;
}

export async function getClientCampaignsByProject(
  projectId: string,
  user: UserSessionPayload
) {
  if (!checkUserProjectAccess(user, projectId, 'viewer')) {
    throw new Error('FORBIDDEN');
  }

  const campaigns = db
    .select()
    .from(clientCampaigns)
    .where(eq(clientCampaigns.projectId, projectId))
    .orderBy(desc(clientCampaigns.createdAt))
    .all();

  const campaignIds = campaigns.map((c) => c.id);

  // Fetch related counts & data in batches
  const creativesCountMap = new Map<string, number>();
  if (campaignIds.length > 0) {
    const counts = db
      .select({
        campaignId: campaignCreatives.campaignId,
        count: sql<number>`count(${campaignCreatives.id})`,
      })
      .from(campaignCreatives)
      .where(inArray(campaignCreatives.campaignId, campaignIds))
      .groupBy(campaignCreatives.campaignId)
      .all();

    for (const row of counts) {
      creativesCountMap.set(row.campaignId, Number(row.count) || 0);
    }
  }

  // Fetch latest KPI report for each campaign
  const latestKpiMap = new Map<string, CampaignKpiReport>();
  if (campaignIds.length > 0) {
    const kpis = db
      .select()
      .from(campaignKpiReports)
      .where(inArray(campaignKpiReports.campaignId, campaignIds))
      .orderBy(desc(campaignKpiReports.periodMonth))
      .all();

    for (const k of kpis) {
      if (!latestKpiMap.has(k.campaignId)) {
        latestKpiMap.set(k.campaignId, k);
      }
    }
  }

  // Fetch platform accounts details
  const platformAccIds = campaigns
    .map((c) => c.platformAccountId)
    .filter((id): id is string => Boolean(id));

  const platformAccountsMap = new Map<string, any>();
  if (platformAccIds.length > 0) {
    const accs = db
      .select({
        id: clientPlatformAccounts.id,
        accountName: clientPlatformAccounts.accountName,
        platformType: clientPlatformAccounts.platformType,
        externalId: clientPlatformAccounts.externalId,
        status: clientPlatformAccounts.status,
      })
      .from(clientPlatformAccounts)
      .where(inArray(clientPlatformAccounts.id, platformAccIds))
      .all();

    for (const acc of accs) {
      platformAccountsMap.set(acc.id, acc);
    }
  }

  // Fetch orders details
  const orderIds = campaigns.map((c) => c.orderId).filter((id): id is string => Boolean(id));
  const ordersMap = new Map<string, any>();
  if (orderIds.length > 0) {
    const ords = db
      .select({
        id: orders.id,
        code: orders.code,
        title: orders.title,
        agreedValue: orders.agreedValue,
      })
      .from(orders)
      .where(inArray(orders.id, orderIds))
      .all();

    for (const o of ords) {
      ordersMap.set(o.id, o);
    }
  }

  // Fetch assigned operators
  const userIds = campaigns
    .map((c) => c.assignedOperatorId)
    .filter((id): id is string => Boolean(id));
  const usersMap = new Map<string, any>();
  if (userIds.length > 0) {
    const uList = db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(inArray(users.id, userIds))
      .all();

    for (const u of uList) {
      usersMap.set(u.id, u);
    }
  }

  return campaigns.map((c) => ({
    ...c,
    targetKeywords: c.targetKeywordsJson ? JSON.parse(c.targetKeywordsJson) : [],
    creativesCount: creativesCountMap.get(c.id) || 0,
    latestKpiReport: latestKpiMap.get(c.id) || null,
    platformAccount: c.platformAccountId ? platformAccountsMap.get(c.platformAccountId) || null : null,
    order: c.orderId ? ordersMap.get(c.orderId) || null : null,
    assignedOperator: c.assignedOperatorId ? usersMap.get(c.assignedOperatorId) || null : null,
  }));
}

export async function getClientCampaignById(
  campaignId: string,
  user: UserSessionPayload
) {
  const campaign = db
    .select()
    .from(clientCampaigns)
    .where(eq(clientCampaigns.id, campaignId))
    .get();

  if (!campaign) {
    throw new Error('NOT_FOUND');
  }

  if (!checkUserProjectAccess(user, campaign.projectId, 'viewer')) {
    throw new Error('FORBIDDEN');
  }

  const creatives = db
    .select()
    .from(campaignCreatives)
    .where(eq(campaignCreatives.campaignId, campaignId))
    .orderBy(desc(campaignCreatives.createdAt))
    .all()
    .map((cr) => ({
      ...cr,
      headlines: JSON.parse(cr.headlinesJson || '[]'),
      descriptions: JSON.parse(cr.descriptionsJson || '[]'),
    }));

  const kpiReports = db
    .select()
    .from(campaignKpiReports)
    .where(eq(campaignKpiReports.campaignId, campaignId))
    .orderBy(desc(campaignKpiReports.periodMonth))
    .all();

  const platformAccount = campaign.platformAccountId
    ? db
        .select()
        .from(clientPlatformAccounts)
        .where(eq(clientPlatformAccounts.id, campaign.platformAccountId))
        .get()
    : null;

  const order = campaign.orderId
    ? db.select().from(orders).where(eq(orders.id, campaign.orderId)).get()
    : null;

  const assignedOperator = campaign.assignedOperatorId
    ? db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, campaign.assignedOperatorId))
        .get()
    : null;

  return {
    ...campaign,
    targetKeywords: campaign.targetKeywordsJson ? JSON.parse(campaign.targetKeywordsJson) : [],
    creatives,
    kpiReports,
    platformAccount,
    order,
    assignedOperator,
  };
}

export async function createClientCampaign(
  input: CreateClientCampaignInput,
  user: UserSessionPayload
) {
  if (!checkUserProjectAccess(user, input.projectId, 'editor')) {
    throw new Error('FORBIDDEN');
  }

  assertNoSensitiveData(input as Record<string, any>);

  if (!input.name || !input.name.trim()) {
    throw new Error('Il nome della campagna è obbligatorio.');
  }

  if (!input.channel) {
    throw new Error('Il canale sponsorizzato è obbligatorio.');
  }

  if (!input.objective || !input.objective.trim()) {
    throw new Error("L'obiettivo strategico della campagna è obbligatorio.");
  }

  const id = `ccamp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const record = {
    id,
    projectId: input.projectId,
    orderId: input.orderId || null,
    platformAccountId: input.platformAccountId || null,
    name: input.name.trim(),
    channel: input.channel,
    objective: input.objective.trim(),
    monthlyBudgetCents: Math.max(0, Math.round(input.monthlyBudgetCents || 0)),
    currency: input.currency || 'EUR',
    startDate: input.startDate || null,
    endDate: input.endDate || null,
    status: input.status || 'draft',
    targetGeography: input.targetGeography?.trim() || null,
    targetLanguages: input.targetLanguages?.trim() || null,
    targetKeywordsJson: input.targetKeywords ? JSON.stringify(input.targetKeywords) : null,
    assignedOperatorId: input.assignedOperatorId || null,
    createdBy: user.userId,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(clientCampaigns).values(record).run();

  await logActivity({
    entityType: 'client_campaign',
    entityId: id,
    action: 'campaign_created',
    performedBy: user.userId,
    details: {
      name: record.name,
      channel: record.channel,
      monthlyBudgetCents: record.monthlyBudgetCents,
      projectId: record.projectId,
    },
  });

  return getClientCampaignById(id, user);
}

export async function updateClientCampaign(
  campaignId: string,
  input: UpdateClientCampaignInput,
  user: UserSessionPayload
) {
  const existing = db
    .select()
    .from(clientCampaigns)
    .where(eq(clientCampaigns.id, campaignId))
    .get();

  if (!existing) {
    throw new Error('NOT_FOUND');
  }

  if (!checkUserProjectAccess(user, existing.projectId, 'editor')) {
    throw new Error('FORBIDDEN');
  }

  assertNoSensitiveData(input as Record<string, any>);

  const now = new Date().toISOString();
  const updates: Partial<typeof clientCampaigns.$inferInsert> = {
    updatedAt: now,
  };

  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.channel !== undefined) updates.channel = input.channel;
  if (input.objective !== undefined) updates.objective = input.objective.trim();
  if (input.monthlyBudgetCents !== undefined) {
    updates.monthlyBudgetCents = Math.max(0, Math.round(input.monthlyBudgetCents));
  }
  if (input.currency !== undefined) updates.currency = input.currency;
  if (input.startDate !== undefined) updates.startDate = input.startDate || null;
  if (input.endDate !== undefined) updates.endDate = input.endDate || null;
  if (input.status !== undefined) updates.status = input.status;
  if (input.targetGeography !== undefined) updates.targetGeography = input.targetGeography || null;
  if (input.targetLanguages !== undefined) updates.targetLanguages = input.targetLanguages || null;
  if (input.targetKeywords !== undefined) {
    updates.targetKeywordsJson = input.targetKeywords ? JSON.stringify(input.targetKeywords) : null;
  }
  if (input.assignedOperatorId !== undefined) updates.assignedOperatorId = input.assignedOperatorId || null;
  if (input.orderId !== undefined) updates.orderId = input.orderId || null;
  if (input.platformAccountId !== undefined) updates.platformAccountId = input.platformAccountId || null;

  db.update(clientCampaigns)
    .set(updates)
    .where(eq(clientCampaigns.id, campaignId))
    .run();

  await logActivity({
    entityType: 'client_campaign',
    entityId: campaignId,
    action: 'campaign_updated',
    performedBy: user.userId,
    details: updates,
    before: existing,
  });

  return getClientCampaignById(campaignId, user);
}

export async function deleteClientCampaign(
  campaignId: string,
  user: UserSessionPayload
) {
  const existing = db
    .select()
    .from(clientCampaigns)
    .where(eq(clientCampaigns.id, campaignId))
    .get();

  if (!existing) {
    throw new Error('NOT_FOUND');
  }

  if (!checkUserProjectAccess(user, existing.projectId, 'manager')) {
    throw new Error('FORBIDDEN');
  }

  // Cascade delete creatives and kpi reports
  db.delete(campaignCreatives).where(eq(campaignCreatives.campaignId, campaignId)).run();
  db.delete(campaignKpiReports).where(eq(campaignKpiReports.campaignId, campaignId)).run();
  db.delete(clientCampaigns).where(eq(clientCampaigns.id, campaignId)).run();

  await logActivity({
    entityType: 'client_campaign',
    entityId: campaignId,
    action: 'campaign_deleted',
    performedBy: user.userId,
    details: { name: existing.name, projectId: existing.projectId },
    before: existing,
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Campaign Creatives CRUD & Approval Flow
// ---------------------------------------------------------------------------

export interface CreateCampaignCreativeInput {
  campaignId: string;
  variantName: string;
  format?: CreativeFormat;
  headlines?: string[];
  descriptions?: string[];
  primaryBodyCopy?: string;
  callToAction?: string;
  destinationUrl: string;
  autoBuildUtm?: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  mediaDocumentId?: string;
}

export interface UpdateCampaignCreativeInput {
  variantName?: string;
  format?: CreativeFormat;
  headlines?: string[];
  descriptions?: string[];
  primaryBodyCopy?: string | null;
  callToAction?: string | null;
  destinationUrl?: string;
  trackedUrl?: string | null;
  mediaDocumentId?: string | null;
  approvalStatus?: CreativeApprovalStatus;
  feedbackNotes?: string | null;
}

export async function createCampaignCreative(
  input: CreateCampaignCreativeInput,
  user: UserSessionPayload
) {
  const campaign = db
    .select()
    .from(clientCampaigns)
    .where(eq(clientCampaigns.id, input.campaignId))
    .get();

  if (!campaign) {
    throw new Error('NOT_FOUND');
  }

  if (!checkUserProjectAccess(user, campaign.projectId, 'editor')) {
    throw new Error('FORBIDDEN');
  }

  assertNoSensitiveData(input as Record<string, any>);

  if (!input.variantName || !input.variantName.trim()) {
    throw new Error('Il nome della variante creativa è obbligatorio.');
  }

  if (!input.destinationUrl || !input.destinationUrl.trim()) {
    throw new Error('La URL di destinazione (landing page) è obbligatoria.');
  }

  let trackedUrl: string | null = null;
  if (input.autoBuildUtm) {
    trackedUrl = buildUtmUrl({
      baseUrl: input.destinationUrl,
      source: input.utmSource || (campaign.channel.startsWith('google') ? 'google' : 'meta'),
      medium: input.utmMedium || 'cpc',
      campaign: input.utmCampaign || campaign.name.toLowerCase().replace(/\s+/g, '_'),
      term: input.utmTerm,
      content: input.utmContent || input.variantName.toLowerCase().replace(/\s+/g, '_'),
    });
  }

  const id = `creat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const record = {
    id,
    campaignId: input.campaignId,
    variantName: input.variantName.trim(),
    format: input.format || 'search_responsive_ad',
    headlinesJson: JSON.stringify(input.headlines || []),
    descriptionsJson: JSON.stringify(input.descriptions || []),
    primaryBodyCopy: input.primaryBodyCopy?.trim() || null,
    callToAction: input.callToAction?.trim() || 'Richiedi Disponibilità',
    destinationUrl: input.destinationUrl.trim(),
    trackedUrl,
    mediaDocumentId: input.mediaDocumentId || null,
    approvalStatus: 'draft' as const,
    feedbackNotes: null,
    approvedByUserId: null,
    approvedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(campaignCreatives).values(record).run();

  await logActivity({
    entityType: 'campaign_creative',
    entityId: id,
    action: 'creative_created',
    performedBy: user.userId,
    details: {
      campaignId: input.campaignId,
      variantName: record.variantName,
      format: record.format,
    },
  });

  return {
    ...record,
    headlines: input.headlines || [],
    descriptions: input.descriptions || [],
  };
}

export async function updateCampaignCreative(
  creativeId: string,
  input: UpdateCampaignCreativeInput,
  user: UserSessionPayload
) {
  const existing = db
    .select()
    .from(campaignCreatives)
    .where(eq(campaignCreatives.id, creativeId))
    .get();

  if (!existing) {
    throw new Error('NOT_FOUND');
  }

  const campaign = db
    .select()
    .from(clientCampaigns)
    .where(eq(clientCampaigns.id, existing.campaignId))
    .get();

  if (!campaign) {
    throw new Error('NOT_FOUND');
  }

  if (!checkUserProjectAccess(user, campaign.projectId, 'editor')) {
    throw new Error('FORBIDDEN');
  }

  assertNoSensitiveData(input as Record<string, any>);

  const now = new Date().toISOString();
  const updates: Partial<typeof campaignCreatives.$inferInsert> = {
    updatedAt: now,
  };

  if (input.variantName !== undefined) updates.variantName = input.variantName.trim();
  if (input.format !== undefined) updates.format = input.format;
  if (input.headlines !== undefined) updates.headlinesJson = JSON.stringify(input.headlines);
  if (input.descriptions !== undefined) updates.descriptionsJson = JSON.stringify(input.descriptions);
  if (input.primaryBodyCopy !== undefined) updates.primaryBodyCopy = input.primaryBodyCopy?.trim() || null;
  if (input.callToAction !== undefined) updates.callToAction = input.callToAction?.trim() || null;
  if (input.destinationUrl !== undefined) updates.destinationUrl = input.destinationUrl.trim();
  if (input.trackedUrl !== undefined) updates.trackedUrl = input.trackedUrl?.trim() || null;
  if (input.mediaDocumentId !== undefined) updates.mediaDocumentId = input.mediaDocumentId || null;
  if (input.feedbackNotes !== undefined) updates.feedbackNotes = input.feedbackNotes?.trim() || null;

  if (input.approvalStatus !== undefined) {
    updates.approvalStatus = input.approvalStatus;

    if (input.approvalStatus === 'approved') {
      const userRole = getUserProjectRole(user, campaign.projectId);
      if (user.role !== 'admin' && userRole !== 'manager') {
        throw new Error('Solo un Project Manager o un Admin può approvare formalmente la creatività.');
      }
      updates.approvedByUserId = user.userId;
      updates.approvedAt = now;
    } else if (input.approvalStatus !== existing.approvalStatus) {
      // Status reset
      if (input.approvalStatus === 'draft' || input.approvalStatus === 'internal_review' || input.approvalStatus === 'client_approval_requested') {
        updates.approvedByUserId = null;
        updates.approvedAt = null;
      }
    }
  }

  db.update(campaignCreatives)
    .set(updates)
    .where(eq(campaignCreatives.id, creativeId))
    .run();

  await logActivity({
    entityType: 'campaign_creative',
    entityId: creativeId,
    action: 'creative_updated',
    performedBy: user.userId,
    details: updates,
    before: existing,
  });

  const updated = db
    .select()
    .from(campaignCreatives)
    .where(eq(campaignCreatives.id, creativeId))
    .get();

  return {
    ...updated,
    headlines: JSON.parse(updated?.headlinesJson || '[]'),
    descriptions: JSON.parse(updated?.descriptionsJson || '[]'),
  };
}

export async function deleteCampaignCreative(
  creativeId: string,
  user: UserSessionPayload
) {
  const existing = db
    .select()
    .from(campaignCreatives)
    .where(eq(campaignCreatives.id, creativeId))
    .get();

  if (!existing) {
    throw new Error('NOT_FOUND');
  }

  const campaign = db
    .select()
    .from(clientCampaigns)
    .where(eq(clientCampaigns.id, existing.campaignId))
    .get();

  if (!campaign || !checkUserProjectAccess(user, campaign.projectId, 'editor')) {
    throw new Error('FORBIDDEN');
  }

  db.delete(campaignCreatives).where(eq(campaignCreatives.id, creativeId)).run();

  await logActivity({
    entityType: 'campaign_creative',
    entityId: creativeId,
    action: 'creative_deleted',
    performedBy: user.userId,
    details: { variantName: existing.variantName, campaignId: existing.campaignId },
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Campaign KPI Reports CRUD & Metrics Calculation
// ---------------------------------------------------------------------------

export interface CreateCampaignKpiReportInput {
  campaignId: string;
  periodMonth: string; // e.g. "2026-09"
  spendCents: number;
  impressions: number;
  clicks: number;
  conversionsCount: number;
  conversionValueCents?: number;
  sourceType?: KpiReportSourceType;
  executiveSummary?: string;
  optimizationsPlanned?: string;
}

export interface UpdateCampaignKpiReportInput {
  periodMonth?: string;
  spendCents?: number;
  impressions?: number;
  clicks?: number;
  conversionsCount?: number;
  conversionValueCents?: number;
  sourceType?: KpiReportSourceType;
  executiveSummary?: string | null;
  optimizationsPlanned?: string | null;
}

export async function createCampaignKpiReport(
  input: CreateCampaignKpiReportInput,
  user: UserSessionPayload
) {
  const campaign = db
    .select()
    .from(clientCampaigns)
    .where(eq(clientCampaigns.id, input.campaignId))
    .get();

  if (!campaign) {
    throw new Error('NOT_FOUND');
  }

  if (!checkUserProjectAccess(user, campaign.projectId, 'editor')) {
    throw new Error('FORBIDDEN');
  }

  assertNoSensitiveData(input as Record<string, any>);

  if (!input.periodMonth || !/^\d{4}-\d{2}$/.test(input.periodMonth)) {
    throw new Error('Il periodo del report deve essere nel formato AAAA-MM (es. 2026-09).');
  }

  const spendCents = Math.max(0, Math.round(input.spendCents || 0));
  const impressions = Math.max(0, Math.round(input.impressions || 0));
  const clicks = Math.max(0, Math.round(input.clicks || 0));
  const conversionsCount = Math.max(0, Math.round(input.conversionsCount || 0));
  const conversionValueCents = Math.max(0, Math.round(input.conversionValueCents || 0));

  const calculated = calculateKpiMetrics({
    spendCents,
    impressions,
    clicks,
    conversionsCount,
    conversionValueCents,
  });

  const id = `kpi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const record = {
    id,
    campaignId: input.campaignId,
    projectId: campaign.projectId,
    periodMonth: input.periodMonth,
    spendCents,
    impressions,
    clicks,
    conversionsCount,
    conversionValueCents,
    cpcAverageEuro: calculated.cpcAverageEuro,
    ctrPercentage: calculated.ctrPercentage,
    cpaEuro: calculated.cpaEuro,
    roasRatio: calculated.roasRatio,
    sourceType: input.sourceType || 'manual_entry',
    executiveSummary: input.executiveSummary?.trim() || null,
    optimizationsPlanned: input.optimizationsPlanned?.trim() || null,
    recordedByUserId: user.userId,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(campaignKpiReports).values(record).run();

  await logActivity({
    entityType: 'campaign_kpi_report',
    entityId: id,
    action: 'kpi_report_recorded',
    performedBy: user.userId,
    details: {
      campaignId: input.campaignId,
      periodMonth: record.periodMonth,
      spendCents,
      conversionsCount,
      roasRatio: calculated.roasRatio,
    },
  });

  return record;
}

export async function updateCampaignKpiReport(
  reportId: string,
  input: UpdateCampaignKpiReportInput,
  user: UserSessionPayload
) {
  const existing = db
    .select()
    .from(campaignKpiReports)
    .where(eq(campaignKpiReports.id, reportId))
    .get();

  if (!existing) {
    throw new Error('NOT_FOUND');
  }

  if (!checkUserProjectAccess(user, existing.projectId, 'editor')) {
    throw new Error('FORBIDDEN');
  }

  assertNoSensitiveData(input as Record<string, any>);

  const now = new Date().toISOString();
  const spendCents = input.spendCents !== undefined ? Math.max(0, Math.round(input.spendCents)) : existing.spendCents;
  const impressions = input.impressions !== undefined ? Math.max(0, Math.round(input.impressions)) : existing.impressions;
  const clicks = input.clicks !== undefined ? Math.max(0, Math.round(input.clicks)) : existing.clicks;
  const conversionsCount = input.conversionsCount !== undefined ? Math.max(0, Math.round(input.conversionsCount)) : existing.conversionsCount;
  const conversionValueCents = input.conversionValueCents !== undefined ? Math.max(0, Math.round(input.conversionValueCents)) : (existing.conversionValueCents || 0);

  const calculated = calculateKpiMetrics({
    spendCents,
    impressions,
    clicks,
    conversionsCount,
    conversionValueCents,
  });

  const updates: Partial<typeof campaignKpiReports.$inferInsert> = {
    periodMonth: input.periodMonth || existing.periodMonth,
    spendCents,
    impressions,
    clicks,
    conversionsCount,
    conversionValueCents,
    cpcAverageEuro: calculated.cpcAverageEuro,
    ctrPercentage: calculated.ctrPercentage,
    cpaEuro: calculated.cpaEuro,
    roasRatio: calculated.roasRatio,
    sourceType: input.sourceType || existing.sourceType,
    executiveSummary: input.executiveSummary !== undefined ? (input.executiveSummary?.trim() || null) : existing.executiveSummary,
    optimizationsPlanned: input.optimizationsPlanned !== undefined ? (input.optimizationsPlanned?.trim() || null) : existing.optimizationsPlanned,
    updatedAt: now,
  };

  db.update(campaignKpiReports)
    .set(updates)
    .where(eq(campaignKpiReports.id, reportId))
    .run();

  await logActivity({
    entityType: 'campaign_kpi_report',
    entityId: reportId,
    action: 'kpi_report_updated',
    performedBy: user.userId,
    details: updates,
    before: existing,
  });

  return db
    .select()
    .from(campaignKpiReports)
    .where(eq(campaignKpiReports.id, reportId))
    .get();
}

export async function deleteCampaignKpiReport(
  reportId: string,
  user: UserSessionPayload
) {
  const existing = db
    .select()
    .from(campaignKpiReports)
    .where(eq(campaignKpiReports.id, reportId))
    .get();

  if (!existing) {
    throw new Error('NOT_FOUND');
  }

  if (!checkUserProjectAccess(user, existing.projectId, 'editor')) {
    throw new Error('FORBIDDEN');
  }

  db.delete(campaignKpiReports).where(eq(campaignKpiReports.id, reportId)).run();

  await logActivity({
    entityType: 'campaign_kpi_report',
    entityId: reportId,
    action: 'kpi_report_deleted',
    performedBy: user.userId,
    details: { periodMonth: existing.periodMonth, campaignId: existing.campaignId },
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Project Marketing Overview / Aggregated Dashboard
// ---------------------------------------------------------------------------

export async function getProjectMarketingOverview(
  projectId: string,
  user: UserSessionPayload
) {
  if (!checkUserProjectAccess(user, projectId, 'viewer')) {
    throw new Error('FORBIDDEN');
  }

  const campaigns = await getClientCampaignsByProject(projectId, user);

  let totalAllocatedBudgetCents = 0;
  let activeCampaignsCount = 0;

  for (const camp of campaigns) {
    totalAllocatedBudgetCents += camp.monthlyBudgetCents;
    if (camp.status === 'active') {
      activeCampaignsCount++;
    }
  }

  // Aggregate all KPI reports for this project
  const allKpiReports = db
    .select()
    .from(campaignKpiReports)
    .where(eq(campaignKpiReports.projectId, projectId))
    .orderBy(desc(campaignKpiReports.periodMonth))
    .all();

  let totalSpendCents = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalConversions = 0;
  let totalConversionValueCents = 0;

  for (const report of allKpiReports) {
    totalSpendCents += report.spendCents;
    totalImpressions += report.impressions;
    totalClicks += report.clicks;
    totalConversions += report.conversionsCount;
    totalConversionValueCents += report.conversionValueCents || 0;
  }

  const overallMetrics = calculateKpiMetrics({
    spendCents: totalSpendCents,
    impressions: totalImpressions,
    clicks: totalClicks,
    conversionsCount: totalConversions,
    conversionValueCents: totalConversionValueCents,
  });

  // Channel breakdown
  const channelBreakdown: Record<string, { count: number; spendCents: number; conversions: number }> = {};
  for (const camp of campaigns) {
    if (!channelBreakdown[camp.channel]) {
      channelBreakdown[camp.channel] = { count: 0, spendCents: 0, conversions: 0 };
    }
    channelBreakdown[camp.channel].count++;
  }

  for (const report of allKpiReports) {
    const camp = campaigns.find((c) => c.id === report.campaignId);
    if (camp && channelBreakdown[camp.channel]) {
      channelBreakdown[camp.channel].spendCents += report.spendCents;
      channelBreakdown[camp.channel].conversions += report.conversionsCount;
    }
  }

  return {
    totalCampaignsCount: campaigns.length,
    activeCampaignsCount,
    totalAllocatedBudgetCents,
    totalSpendCents,
    totalImpressions,
    totalClicks,
    totalConversions,
    totalConversionValueCents,
    ...overallMetrics,
    channelBreakdown,
    campaigns,
    recentKpiReports: allKpiReports.slice(0, 10),
  };
}
