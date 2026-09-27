import {
  db,
  marketingSegments,
  marketingCampaigns,
  campaignRecipients,
  leads,
  companies,
  enrichmentRuns,
  websiteAnalysis,
  decisionMakers,
  users,
  activityLog,
  type MarketingSegment,
  type MarketingCampaign,
  type CampaignRecipient,
} from '@ai-crm/db';
import { eq, and, or, inArray, gte, lte, sql, desc, count } from 'drizzle-orm';
import { UserSessionPayload } from './auth';

// ---------------------------------------------------------------------------
// 1. Interfaces & Types
// ---------------------------------------------------------------------------

export interface TechStackFilter {
  cms?: string[]; // e.g. ['WordPress', 'Shopify', 'PrestaShop', 'Wix', 'Webflow']
  hasPixel?: boolean;
  hasChatbot?: boolean;
  hasWhatsapp?: boolean;
  hasBooking?: boolean;
  hasAnalytics?: boolean;
  isEcommerce?: boolean;
}

export interface ContactsRequirementFilter {
  mustHaveEmail?: boolean;
  mustHavePhone?: boolean;
  mustHaveDecisionMaker?: boolean;
  requireMarketingConsent?: boolean;
}

export interface SegmentRules {
  sectors?: string[];
  cities?: string[];
  provinces?: string[];
  sources?: string[];
  leadStatuses?: string[];
  minCommercialScore?: number;
  maxCommercialScore?: number;
  minReliabilityScore?: number;
  maxReliabilityScore?: number;
  techStack?: TechStackFilter;
  contactsRequirement?: ContactsRequirementFilter;
}

export interface CreateSegmentInput {
  name: string;
  description?: string;
  targetType: 'leads' | 'companies';
  rules: SegmentRules;
}

export interface UpdateSegmentInput {
  name?: string;
  description?: string;
  rules?: SegmentRules;
}

export interface CreateCampaignInput {
  name: string;
  objective:
    | 'lead_generation'
    | 'nurturing'
    | 'upselling'
    | 'reengagement'
    | 'event_invitation'
    | 'other';
  channel: 'email' | 'whatsapp' | 'phone_outreach' | 'mixed' | 'manual_task';
  segmentId?: string;
  contentSubject?: string;
  contentBody?: string;
  dynamicVariables?: string[];
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  notes?: string;
}

export interface UpdateCampaignInput {
  name?: string;
  objective?:
    | 'lead_generation'
    | 'nurturing'
    | 'upselling'
    | 'reengagement'
    | 'event_invitation'
    | 'other';
  channel?: 'email' | 'whatsapp' | 'phone_outreach' | 'mixed' | 'manual_task';
  segmentId?: string;
  contentSubject?: string;
  contentBody?: string;
  dynamicVariables?: string[];
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  status?:
    | 'draft'
    | 'in_review'
    | 'approved'
    | 'scheduled'
    | 'active'
    | 'paused'
    | 'completed'
    | 'archived';
  notes?: string;
}

export interface UpdateRecipientStatusInput {
  status:
    | 'pending'
    | 'excluded_no_consent'
    | 'excluded_missing_contact'
    | 'contacted'
    | 'replied'
    | 'interested'
    | 'not_interested'
    | 'converted'
    | 'bounced';
  outcomeNotes?: string;
}

// ---------------------------------------------------------------------------
// 2. Explainability: Natural Language Summary Generator
// ---------------------------------------------------------------------------

export function generateNaturalLanguageSummary(
  rules: SegmentRules,
  targetType: 'leads' | 'companies'
): string {
  const parts: string[] = [];

  const targetLabel = targetType === 'leads' ? 'Lead' : 'Aziende';
  parts.push(`Target: ${targetLabel}`);

  if (rules.sectors && rules.sectors.length > 0) {
    const sectorLabels = rules.sectors.map((s) => {
      switch (s) {
        case 'horeca_ristoranti':
          return 'Ristoranti & HORECA';
        case 'horeca_hotel':
          return 'Hotel & Ricettivo';
        case 'studi_legali':
          return 'Studi Legali';
        case 'commercialisti':
          return 'Commercialisti & Consulenti';
        case 'ecommerce':
          return 'eCommerce & Retail';
        case 'local_services':
          return 'Servizi Locali';
        default:
          return s;
      }
    });
    parts.push(`Settori: ${sectorLabels.join(', ')}`);
  }

  if (rules.cities && rules.cities.length > 0) {
    parts.push(`Città: ${rules.cities.join(', ')}`);
  }
  if (rules.provinces && rules.provinces.length > 0) {
    parts.push(`Province: ${rules.provinces.join(', ')}`);
  }

  if (rules.leadStatuses && rules.leadStatuses.length > 0 && targetType === 'leads') {
    parts.push(`Stato CRM: ${rules.leadStatuses.join(', ')}`);
  }

  if (rules.minCommercialScore !== undefined || rules.maxCommercialScore !== undefined) {
    if (rules.minCommercialScore !== undefined && rules.maxCommercialScore !== undefined) {
      parts.push(`Score Commerciale tra ${rules.minCommercialScore} e ${rules.maxCommercialScore}`);
    } else if (rules.minCommercialScore !== undefined) {
      parts.push(`Score Commerciale ≥ ${rules.minCommercialScore}`);
    } else if (rules.maxCommercialScore !== undefined) {
      parts.push(`Score Commerciale ≤ ${rules.maxCommercialScore}`);
    }
  }

  if (rules.techStack) {
    const techParts: string[] = [];
    if (rules.techStack.cms && rules.techStack.cms.length > 0) {
      techParts.push(`CMS: ${rules.techStack.cms.join(', ')}`);
    }
    if (rules.techStack.hasPixel === true) techParts.push('Con Meta Pixel');
    if (rules.techStack.hasPixel === false) techParts.push('Senza Meta Pixel (Opportunità Ads)');
    if (rules.techStack.hasChatbot === true) techParts.push('Con Chatbot');
    if (rules.techStack.hasChatbot === false) techParts.push('Senza Chatbot');
    if (rules.techStack.hasWhatsapp === true) techParts.push('Con WhatsApp');
    if (rules.techStack.hasBooking === true) techParts.push('Con Booking Online');
    if (rules.techStack.isEcommerce === true) techParts.push('e-Commerce Attivo');
    if (techParts.length > 0) {
      parts.push(`Tecnologie: ${techParts.join(' • ')}`);
    }
  }

  if (rules.contactsRequirement) {
    const reqs: string[] = [];
    if (rules.contactsRequirement.mustHaveEmail) reqs.push('Email Obbligatoria');
    if (rules.contactsRequirement.mustHavePhone) reqs.push('Telefono Obbligatorio');
    if (rules.contactsRequirement.mustHaveDecisionMaker) reqs.push('Referente / Decision Maker Identificato');
    if (rules.contactsRequirement.requireMarketingConsent) reqs.push('Consenso Privacy Verificato (Opt-in)');
    if (reqs.length > 0) {
      parts.push(`Requisiti Contatto: ${reqs.join(', ')}`);
    }
  }

  return parts.join(' | ');
}

// ---------------------------------------------------------------------------
// 3. Segment Engine: Query Evaluation & Preview
// ---------------------------------------------------------------------------

export interface SegmentCandidate {
  id: string;
  name: string;
  targetType: 'leads' | 'companies';
  sector: string;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  score?: number | null;
  marketingConsentStatus: string;
  isEligible: boolean;
  exclusionReason?: string | null;
}

export async function evaluateSegmentCandidates(
  rules: SegmentRules,
  targetType: 'leads' | 'companies' = 'leads',
  limit: number = 100
): Promise<{ totalCount: number; eligibleCount: number; candidates: SegmentCandidate[] }> {
  const isLeads = targetType === 'leads';

  let rawList: any[] = [];

  if (isLeads) {
    rawList = db.select().from(leads).all();
  } else {
    rawList = db.select().from(companies).all();
  }

  // Pre-fetch enrichment data & decision makers to filter tech stack & contacts
  const websiteAnalyses = db.select().from(websiteAnalysis).all();
  const allDecisionMakers = db.select().from(decisionMakers).all();

  const filteredCandidates: SegmentCandidate[] = [];

  for (const item of rawList) {
    const itemId = item.id;
    const itemName = isLeads ? item.companyName : item.name;
    const itemSector = item.sector;
    const itemCity = item.city;
    const itemProvince = isLeads ? null : item.province;
    const itemSource = item.source;
    const itemStatus = isLeads ? item.status : null;
    const itemScore = isLeads ? item.score : (item.rating ? Math.round(item.rating * 20) : 0);
    const itemEmail = item.email;
    const itemPhone = item.phone;
    const itemWebsite = item.website;
    const consentStatus = item.marketingConsentStatus || 'pending';
    const optedOutChannels: string[] = item.optedOutChannelsJson
      ? JSON.parse(item.optedOutChannelsJson)
      : [];

    // Filter 1: Sectors
    if (rules.sectors && rules.sectors.length > 0) {
      if (!rules.sectors.includes(itemSector)) continue;
    }

    // Filter 2: Cities / Provinces
    if (rules.cities && rules.cities.length > 0) {
      if (!itemCity || !rules.cities.some((c) => itemCity.toLowerCase().includes(c.toLowerCase()))) {
        continue;
      }
    }
    if (rules.provinces && rules.provinces.length > 0 && itemProvince) {
      if (!rules.provinces.some((p) => itemProvince.toLowerCase() === p.toLowerCase())) {
        continue;
      }
    }

    // Filter 3: Lead Statuses (only for leads)
    if (isLeads && rules.leadStatuses && rules.leadStatuses.length > 0) {
      if (!rules.leadStatuses.includes(itemStatus)) continue;
    }

    // Filter 4: Commercial Score range
    if (rules.minCommercialScore !== undefined && itemScore < rules.minCommercialScore) {
      continue;
    }
    if (rules.maxCommercialScore !== undefined && itemScore > rules.maxCommercialScore) {
      continue;
    }

    // Filter 5: Sources
    if (rules.sources && rules.sources.length > 0) {
      if (!itemSource || !rules.sources.includes(itemSource)) continue;
    }

    // Filter 6: Tech stack filters (via website_analysis)
    if (rules.techStack) {
      const latestAnalysis = websiteAnalyses
        .filter((w) => (isLeads ? w.leadId === itemId : false))
        .sort((a, b) => (b.analyzedAt > a.analyzedAt ? 1 : -1))[0];

      if (rules.techStack.cms && rules.techStack.cms.length > 0) {
        if (!latestAnalysis || !latestAnalysis.cms || !rules.techStack.cms.includes(latestAnalysis.cms)) {
          continue;
        }
      }
      if (rules.techStack.hasPixel !== undefined) {
        const hasPixel = latestAnalysis ? Boolean(latestAnalysis.hasPixel) : false;
        if (hasPixel !== rules.techStack.hasPixel) continue;
      }
      if (rules.techStack.hasChatbot !== undefined) {
        const hasChatbot = latestAnalysis ? Boolean(latestAnalysis.hasChatbot) : false;
        if (hasChatbot !== rules.techStack.hasChatbot) continue;
      }
      if (rules.techStack.hasWhatsapp !== undefined) {
        const hasWhatsapp = latestAnalysis ? Boolean(latestAnalysis.hasWhatsapp) : false;
        if (hasWhatsapp !== rules.techStack.hasWhatsapp) continue;
      }
      if (rules.techStack.hasBooking !== undefined) {
        const hasBooking = latestAnalysis ? Boolean(latestAnalysis.hasBooking) : false;
        if (hasBooking !== rules.techStack.hasBooking) continue;
      }
      if (rules.techStack.isEcommerce !== undefined) {
        const isEcom = latestAnalysis ? Boolean(latestAnalysis.isEcommerce) : false;
        if (isEcom !== rules.techStack.isEcommerce) continue;
      }
    }

    // Eligibility check for contact requirements and GDPR consent
    let isEligible = true;
    let exclusionReason: string | null = null;

    if (consentStatus === 'revoked') {
      isEligible = false;
      exclusionReason = 'Consenso revocato (Opt-out)';
    } else if (rules.contactsRequirement?.requireMarketingConsent && consentStatus !== 'granted') {
      isEligible = false;
      exclusionReason = 'Consenso marketing non confermato';
    } else if (rules.contactsRequirement?.mustHaveEmail && (!itemEmail || !itemEmail.includes('@'))) {
      isEligible = false;
      exclusionReason = 'Email assente o non valida';
    } else if (rules.contactsRequirement?.mustHavePhone && !itemPhone) {
      isEligible = false;
      exclusionReason = 'Telefono assente';
    }

    // Check decision maker requirement if specified
    if (isEligible && rules.contactsRequirement?.mustHaveDecisionMaker) {
      const hasDM = allDecisionMakers.some((dm) => (isLeads ? dm.leadId === itemId : false));
      if (!hasDM) {
        isEligible = false;
        exclusionReason = 'Nessun referente aziendale identificato';
      }
    }

    filteredCandidates.push({
      id: itemId,
      name: itemName,
      targetType,
      sector: itemSector,
      city: itemCity,
      email: itemEmail,
      phone: itemPhone,
      website: itemWebsite,
      score: itemScore,
      marketingConsentStatus: consentStatus,
      isEligible,
      exclusionReason,
    });
  }

  const eligibleCount = filteredCandidates.filter((c) => c.isEligible).length;

  return {
    totalCount: filteredCandidates.length,
    eligibleCount,
    candidates: filteredCandidates.slice(0, limit),
  };
}

// ---------------------------------------------------------------------------
// 4. Segment Service Methods (CRUD)
// ---------------------------------------------------------------------------

export async function createSegment(
  input: CreateSegmentInput,
  user: UserSessionPayload
): Promise<MarketingSegment> {
  const now = new Date().toISOString();
  const segmentId = `seg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const summary = generateNaturalLanguageSummary(input.rules, input.targetType);

  const { eligibleCount } = await evaluateSegmentCandidates(input.rules, input.targetType, 1);

  db.insert(marketingSegments)
    .values({
      id: segmentId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      targetType: input.targetType,
      rulesJson: JSON.stringify(input.rules),
      naturalLanguageSummary: summary,
      estimatedCount: eligibleCount,
      createdBy: user.userId,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  // Log activity
  try {
    db.insert(activityLog)
      .values({
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        entityType: 'marketing_segment',
        entityId: segmentId,
        action: 'segment_created',
        performedBy: user.userId,
        detailsJson: JSON.stringify({ name: input.name, targetType: input.targetType, estimatedCount: eligibleCount }),
        beforeJson: null,
        afterJson: null,
        ipAddress: null,
        createdAt: now,
      })
      .run();
  } catch {}

  const result = db.select().from(marketingSegments).where(eq(marketingSegments.id, segmentId)).get();
  if (!result) throw new Error('SEGMENT_CREATION_FAILED');
  return result;
}

export async function updateSegment(
  id: string,
  input: UpdateSegmentInput,
  user: UserSessionPayload
): Promise<MarketingSegment> {
  const existing = db.select().from(marketingSegments).where(eq(marketingSegments.id, id)).get();
  if (!existing) throw new Error('NOT_FOUND: Segmento non trovato');

  const now = new Date().toISOString();
  const updatePayload: Partial<typeof marketingSegments.$inferInsert> = {
    updatedAt: now,
  };

  if (input.name) updatePayload.name = input.name.trim();
  if (input.description !== undefined) updatePayload.description = input.description?.trim() || null;

  if (input.rules) {
    updatePayload.rulesJson = JSON.stringify(input.rules);
    updatePayload.naturalLanguageSummary = generateNaturalLanguageSummary(
      input.rules,
      existing.targetType as 'leads' | 'companies'
    );
    const { eligibleCount } = await evaluateSegmentCandidates(
      input.rules,
      existing.targetType as 'leads' | 'companies',
      1
    );
    updatePayload.estimatedCount = eligibleCount;
  }

  db.update(marketingSegments).set(updatePayload).where(eq(marketingSegments.id, id)).run();

  const updated = db.select().from(marketingSegments).where(eq(marketingSegments.id, id)).get();
  return updated!;
}

export async function deleteSegment(id: string, user: UserSessionPayload): Promise<boolean> {
  const existing = db.select().from(marketingSegments).where(eq(marketingSegments.id, id)).get();
  if (!existing) throw new Error('NOT_FOUND: Segmento non trovato');

  db.delete(marketingSegments).where(eq(marketingSegments.id, id)).run();
  return true;
}

export async function getSegmentById(id: string): Promise<MarketingSegment | null> {
  const seg = db.select().from(marketingSegments).where(eq(marketingSegments.id, id)).get();
  return seg || null;
}

export async function listSegments(): Promise<MarketingSegment[]> {
  return db.select().from(marketingSegments).orderBy(desc(marketingSegments.createdAt)).all();
}

// ---------------------------------------------------------------------------
// 5. Campaign Service Methods (CRUD & Governance)
// ---------------------------------------------------------------------------

function generateCampaignCode(): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `CAMP-${year}-${randomNum}`;
}

export async function createCampaign(
  input: CreateCampaignInput,
  user: UserSessionPayload
): Promise<MarketingCampaign> {
  const now = new Date().toISOString();
  const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const code = generateCampaignCode();

  db.insert(marketingCampaigns)
    .values({
      id: campaignId,
      code,
      name: input.name.trim(),
      objective: input.objective,
      channel: input.channel,
      status: 'draft',
      segmentId: input.segmentId || null,
      contentSubject: input.contentSubject?.trim() || null,
      contentBody: input.contentBody || null,
      dynamicVariablesJson: input.dynamicVariables ? JSON.stringify(input.dynamicVariables) : null,
      scheduledStartAt: input.scheduledStartAt || null,
      scheduledEndAt: input.scheduledEndAt || null,
      ownerUserId: user.userId,
      approvedByUserId: null,
      approvedAt: null,
      notes: input.notes?.trim() || null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  // If a segment was provided, populate recipients
  if (input.segmentId) {
    await populateCampaignRecipients(campaignId, user);
  }

  // Log activity
  try {
    db.insert(activityLog)
      .values({
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        entityType: 'marketing_campaign',
        entityId: campaignId,
        action: 'campaign_created',
        performedBy: user.userId,
        detailsJson: JSON.stringify({ code, name: input.name, channel: input.channel, objective: input.objective }),
        beforeJson: null,
        afterJson: null,
        ipAddress: null,
        createdAt: now,
      })
      .run();
  } catch {}

  const result = db.select().from(marketingCampaigns).where(eq(marketingCampaigns.id, campaignId)).get();
  if (!result) throw new Error('CAMPAIGN_CREATION_FAILED');
  return result;
}

export async function updateCampaign(
  id: string,
  input: UpdateCampaignInput,
  user: UserSessionPayload
): Promise<MarketingCampaign> {
  const existing = db.select().from(marketingCampaigns).where(eq(marketingCampaigns.id, id)).get();
  if (!existing) throw new Error('NOT_FOUND: Campagna non trovata');

  // RBAC check: only admin can force status to 'approved' directly
  if (input.status === 'approved' && user.role !== 'admin') {
    throw new Error('FORBIDDEN: Solo gli amministratori possono approvare una campagna');
  }

  const now = new Date().toISOString();
  const updatePayload: Partial<typeof marketingCampaigns.$inferInsert> = {
    updatedAt: now,
  };

  if (input.name) updatePayload.name = input.name.trim();
  if (input.objective) updatePayload.objective = input.objective;
  if (input.channel) updatePayload.channel = input.channel;
  if (input.segmentId !== undefined) updatePayload.segmentId = input.segmentId || null;
  if (input.contentSubject !== undefined) updatePayload.contentSubject = input.contentSubject?.trim() || null;
  if (input.contentBody !== undefined) updatePayload.contentBody = input.contentBody || null;
  if (input.dynamicVariables) updatePayload.dynamicVariablesJson = JSON.stringify(input.dynamicVariables);
  if (input.scheduledStartAt !== undefined) updatePayload.scheduledStartAt = input.scheduledStartAt || null;
  if (input.scheduledEndAt !== undefined) updatePayload.scheduledEndAt = input.scheduledEndAt || null;
  if (input.notes !== undefined) updatePayload.notes = input.notes?.trim() || null;
  if (input.status) updatePayload.status = input.status;

  db.update(marketingCampaigns).set(updatePayload).where(eq(marketingCampaigns.id, id)).run();

  // If segment changed, re-populate recipients
  if (input.segmentId && input.segmentId !== existing.segmentId) {
    await populateCampaignRecipients(id, user);
  }

  const updated = db.select().from(marketingCampaigns).where(eq(marketingCampaigns.id, id)).get();
  return updated!;
}

export async function submitCampaignForReview(
  id: string,
  user: UserSessionPayload
): Promise<MarketingCampaign> {
  const existing = db.select().from(marketingCampaigns).where(eq(marketingCampaigns.id, id)).get();
  if (!existing) throw new Error('NOT_FOUND: Campagna non trovata');

  if (existing.status !== 'draft') {
    throw new Error('INVALID_STATE: Solo le campagne in bozza possono essere inviate per revisione');
  }

  const now = new Date().toISOString();
  db.update(marketingCampaigns)
    .set({
      status: 'in_review',
      updatedAt: now,
    })
    .where(eq(marketingCampaigns.id, id))
    .run();

  try {
    db.insert(activityLog)
      .values({
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        entityType: 'marketing_campaign',
        entityId: id,
        action: 'campaign_submitted_for_review',
        performedBy: user.userId,
        detailsJson: JSON.stringify({ previousStatus: existing.status }),
        beforeJson: null,
        afterJson: null,
        ipAddress: null,
        createdAt: now,
      })
      .run();
  } catch {}

  const updated = db.select().from(marketingCampaigns).where(eq(marketingCampaigns.id, id)).get();
  return updated!;
}

export async function approveCampaign(
  id: string,
  user: UserSessionPayload
): Promise<MarketingCampaign> {
  if (user.role !== 'admin') {
    throw new Error('FORBIDDEN: Solo gli amministratori possono approvare una campagna');
  }

  const existing = db.select().from(marketingCampaigns).where(eq(marketingCampaigns.id, id)).get();
  if (!existing) throw new Error('NOT_FOUND: Campagna non trovata');

  const now = new Date().toISOString();
  db.update(marketingCampaigns)
    .set({
      status: 'approved',
      approvedByUserId: user.userId,
      approvedAt: now,
      updatedAt: now,
    })
    .where(eq(marketingCampaigns.id, id))
    .run();

  try {
    db.insert(activityLog)
      .values({
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        entityType: 'marketing_campaign',
        entityId: id,
        action: 'campaign_approved',
        performedBy: user.userId,
        detailsJson: JSON.stringify({ approvedBy: user.name, approvedAt: now }),
        beforeJson: null,
        afterJson: null,
        ipAddress: null,
        createdAt: now,
      })
      .run();
  } catch {}

  const updated = db.select().from(marketingCampaigns).where(eq(marketingCampaigns.id, id)).get();
  return updated!;
}

export async function populateCampaignRecipients(
  campaignId: string,
  user: UserSessionPayload
): Promise<number> {
  const campaign = db.select().from(marketingCampaigns).where(eq(marketingCampaigns.id, campaignId)).get();
  if (!campaign || !campaign.segmentId) return 0;

  const segment = db.select().from(marketingSegments).where(eq(marketingSegments.id, campaign.segmentId)).get();
  if (!segment) return 0;

  const rules: SegmentRules = JSON.parse(segment.rulesJson);
  const { candidates } = await evaluateSegmentCandidates(
    rules,
    segment.targetType as 'leads' | 'companies',
    500
  );

  const now = new Date().toISOString();

  // Delete previous pending recipients for this campaign to refresh
  db.delete(campaignRecipients)
    .where(and(eq(campaignRecipients.campaignId, campaignId), eq(campaignRecipients.status, 'pending')))
    .run();

  const existingRecipients = db
    .select()
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, campaignId))
    .all();

  const existingIds = new Set(
    existingRecipients.map((r) => (r.leadId ? `lead_${r.leadId}` : `comp_${r.companyId}`))
  );

  let insertedCount = 0;

  for (const c of candidates) {
    const key = c.targetType === 'leads' ? `lead_${c.id}` : `comp_${c.id}`;
    if (existingIds.has(key)) continue;

    const recipientId = `recip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let recipientStatus: typeof campaignRecipients.$inferInsert.status = 'pending';
    let exclusionReason: string | null = null;

    if (!c.isEligible) {
      if (c.exclusionReason?.includes('Consenso')) {
        recipientStatus = 'excluded_no_consent';
      } else {
        recipientStatus = 'excluded_missing_contact';
      }
      exclusionReason = c.exclusionReason || null;
    }

    db.insert(campaignRecipients)
      .values({
        id: recipientId,
        campaignId,
        leadId: c.targetType === 'leads' ? c.id : null,
        companyId: c.targetType === 'companies' ? c.id : null,
        recipientEmail: c.email || null,
        recipientPhone: c.phone || null,
        contactPersonName: c.name,
        status: recipientStatus,
        exclusionReason,
        customVariablesSnapshotJson: JSON.stringify({
          companyName: c.name,
          sector: c.sector,
          city: c.city || '',
          score: c.score || 0,
        }),
        lastContactedAt: null,
        outcomeNotes: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    insertedCount++;
  }

  return insertedCount;
}

export async function updateRecipientStatus(
  recipientId: string,
  input: UpdateRecipientStatusInput,
  user: UserSessionPayload
): Promise<CampaignRecipient> {
  const existing = db.select().from(campaignRecipients).where(eq(campaignRecipients.id, recipientId)).get();
  if (!existing) throw new Error('NOT_FOUND: Destinatario non trovato');

  const now = new Date().toISOString();
  db.update(campaignRecipients)
    .set({
      status: input.status,
      outcomeNotes: input.outcomeNotes?.trim() || existing.outcomeNotes,
      lastContactedAt: input.status === 'contacted' || input.status === 'interested' ? now : existing.lastContactedAt,
      updatedAt: now,
    })
    .where(eq(campaignRecipients.id, recipientId))
    .run();

  const updated = db.select().from(campaignRecipients).where(eq(campaignRecipients.id, recipientId)).get();
  return updated!;
}

export async function getCampaignDetails(id: string) {
  const campaign = db.select().from(marketingCampaigns).where(eq(marketingCampaigns.id, id)).get();
  if (!campaign) throw new Error('NOT_FOUND: Campagna non trovata');

  const segment = campaign.segmentId
    ? db.select().from(marketingSegments).where(eq(marketingSegments.id, campaign.segmentId)).get()
    : null;

  const recipients = db
    .select()
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, id))
    .all();

  const owner = campaign.ownerUserId
    ? db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, campaign.ownerUserId)).get()
    : null;

  const approver = campaign.approvedByUserId
    ? db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, campaign.approvedByUserId)).get()
    : null;

  const statusCounts: Record<string, number> = {};
  for (const r of recipients) {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  }

  return {
    ...campaign,
    segment,
    owner,
    approver,
    recipients,
    totalRecipients: recipients.length,
    statusCounts,
  };
}

export async function listCampaigns(): Promise<any[]> {
  const campaignsList = db.select().from(marketingCampaigns).orderBy(desc(marketingCampaigns.createdAt)).all();
  const segments = db.select().from(marketingSegments).all();
  const segmentMap = new Map(segments.map((s) => [s.id, s.name]));

  return campaignsList.map((c) => ({
    ...c,
    segmentName: c.segmentId ? segmentMap.get(c.segmentId) || 'Segmento non trovato' : 'Nessun segmento',
  }));
}

// ---------------------------------------------------------------------------
// 6. Dashboard Metrics & Stats (100% Real DB Queries)
// ---------------------------------------------------------------------------

export async function getMarketingDashboardStats() {
  const allCampaigns = db.select().from(marketingCampaigns).all();
  const allSegments = db.select().from(marketingSegments).all();
  const allRecipients = db.select().from(campaignRecipients).all();

  const campaignsByStatus = {
    draft: allCampaigns.filter((c) => c.status === 'draft').length,
    in_review: allCampaigns.filter((c) => c.status === 'in_review').length,
    approved: allCampaigns.filter((c) => c.status === 'approved').length,
    scheduled: allCampaigns.filter((c) => c.status === 'scheduled').length,
    active: allCampaigns.filter((c) => c.status === 'active').length,
    completed: allCampaigns.filter((c) => c.status === 'completed').length,
    archived: allCampaigns.filter((c) => c.status === 'archived').length,
  };

  const channelDistribution = {
    email: allCampaigns.filter((c) => c.channel === 'email').length,
    whatsapp: allCampaigns.filter((c) => c.channel === 'whatsapp').length,
    phone_outreach: allCampaigns.filter((c) => c.channel === 'phone_outreach').length,
    mixed: allCampaigns.filter((c) => c.channel === 'mixed').length,
    manual_task: allCampaigns.filter((c) => c.channel === 'manual_task').length,
  };

  const recipientsByStatus = {
    pending: allRecipients.filter((r) => r.status === 'pending').length,
    contacted: allRecipients.filter((r) => r.status === 'contacted').length,
    replied: allRecipients.filter((r) => r.status === 'replied').length,
    interested: allRecipients.filter((r) => r.status === 'interested').length,
    not_interested: allRecipients.filter((r) => r.status === 'not_interested').length,
    converted: allRecipients.filter((r) => r.status === 'converted').length,
    bounced: allRecipients.filter((r) => r.status === 'bounced').length,
    excluded_no_consent: allRecipients.filter((r) => r.status === 'excluded_no_consent').length,
    excluded_missing_contact: allRecipients.filter((r) => r.status === 'excluded_missing_contact').length,
  };

  const totalAudienceReach = allSegments.reduce((acc, s) => acc + (s.estimatedCount || 0), 0);

  return {
    totalCampaigns: allCampaigns.length,
    totalSegments: allSegments.length,
    totalRecipients: allRecipients.length,
    totalAudienceReach,
    campaignsByStatus,
    channelDistribution,
    recipientsByStatus,
    // Explicit disclosure of unavailable tracking metrics
    unavailableMetrics: {
      openRate: 'Non disponibile in v1 (Richiede server SMTP dedicato e webhook di delivery)',
      clickRate: 'Non disponibile in v1 (Richiede link redirector con tracking token)',
      adsMetrics: 'Non applicabile (Modulo Campagne Outbound CRM, separato da Ads Hub)',
    },
  };
}

// ---------------------------------------------------------------------------
// 7. Lead & Company Timeline Integration
// ---------------------------------------------------------------------------

export async function getLeadCampaignHistory(leadId: string) {
  const records = db
    .select({
      recipientId: campaignRecipients.id,
      status: campaignRecipients.status,
      lastContactedAt: campaignRecipients.lastContactedAt,
      outcomeNotes: campaignRecipients.outcomeNotes,
      createdAt: campaignRecipients.createdAt,
      campaignId: marketingCampaigns.id,
      campaignCode: marketingCampaigns.code,
      campaignName: marketingCampaigns.name,
      campaignChannel: marketingCampaigns.channel,
      campaignObjective: marketingCampaigns.objective,
    })
    .from(campaignRecipients)
    .innerJoin(marketingCampaigns, eq(campaignRecipients.campaignId, marketingCampaigns.id))
    .where(eq(campaignRecipients.leadId, leadId))
    .orderBy(desc(campaignRecipients.createdAt))
    .all();

  return records;
}

export async function getCompanyCampaignHistory(companyId: string) {
  const records = db
    .select({
      recipientId: campaignRecipients.id,
      status: campaignRecipients.status,
      lastContactedAt: campaignRecipients.lastContactedAt,
      outcomeNotes: campaignRecipients.outcomeNotes,
      createdAt: campaignRecipients.createdAt,
      campaignId: marketingCampaigns.id,
      campaignCode: marketingCampaigns.code,
      campaignName: marketingCampaigns.name,
      campaignChannel: marketingCampaigns.channel,
      campaignObjective: marketingCampaigns.objective,
    })
    .from(campaignRecipients)
    .innerJoin(marketingCampaigns, eq(campaignRecipients.campaignId, marketingCampaigns.id))
    .where(eq(campaignRecipients.companyId, companyId))
    .orderBy(desc(campaignRecipients.createdAt))
    .all();

  return records;
}
