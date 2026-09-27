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
  province?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  score?: number | null;
  marketingConsentStatus: string;
  consentLabel: string;
  isEligible: boolean;
  exclusionReason?: string | null;
}

export async function evaluateSegmentCandidates(
  rules: SegmentRules,
  targetType: 'leads' | 'companies' = 'leads',
  limit: number = 100
): Promise<{ totalCount: number; eligibleCount: number; limitApplied: boolean; maxLimit: number; candidates: SegmentCandidate[] }> {
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
    const itemProvince = isLeads ? (item.province || null) : item.province;
    const itemAddress = item.address || '';
    const itemNotes = item.notes || '';
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

    // Filter 2: Cities / Provinces (applicable to both leads and companies)
    if (rules.cities && rules.cities.length > 0) {
      if (!itemCity || !rules.cities.some((c) => itemCity.toLowerCase().includes(c.toLowerCase()))) {
        continue;
      }
    }
    if (rules.provinces && rules.provinces.length > 0) {
      let matchesProvince = false;
      const targetProvs = rules.provinces.map((p) => p.toLowerCase());
      
      if (itemProvince && targetProvs.includes(itemProvince.toLowerCase())) {
        matchesProvince = true;
      } else {
        // Fallback: check province acronym in city, address or notes (e.g. "Napoli", "Pompei (NA)", "MI")
        const searchBlob = `${itemCity || ''} ${itemAddress} ${itemNotes}`.toLowerCase();
        for (const p of targetProvs) {
          if (
            searchBlob.includes(`(${p})`) ||
            searchBlob.includes(` ${p} `) ||
            searchBlob.includes(p)
          ) {
            matchesProvince = true;
            break;
          }
        }
      }
      if (!matchesProvince) continue;
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

    // Filter 6: Tech stack filters (Distinguishing "Tecnologia Assente" from "Dato Non Analizzato")
    if (rules.techStack) {
      let latestAnalysis: any = null;
      let companyTechStack: any = null;

      if (isLeads) {
        latestAnalysis = websiteAnalyses
          .filter((w) => w.leadId === itemId)
          .sort((a, b) => (b.analyzedAt > a.analyzedAt ? 1 : -1))[0];
      } else {
        if ((item as any).techStackJson) {
          try {
            companyTechStack = JSON.parse((item as any).techStackJson);
          } catch {}
        }
        if (!companyTechStack && itemWebsite) {
          const cleanDomain = itemWebsite.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
          latestAnalysis = websiteAnalyses
            .filter((w) => w.url && w.url.toLowerCase().includes(cleanDomain))
            .sort((a, b) => (b.analyzedAt > a.analyzedAt ? 1 : -1))[0];
        }
      }

      const hasAnalysisData = Boolean(latestAnalysis || companyTechStack);

      // RULE: If tech stack criteria are specified, un-analyzed websites do NOT match "technology absent".
      // They are unknown/unanalyzed, not confirmed absent.
      if (!hasAnalysisData) {
        continue;
      }

      if (rules.techStack.cms && rules.techStack.cms.length > 0) {
        const detectedCms = latestAnalysis?.cms || companyTechStack?.cms;
        const cmsList = Array.isArray(detectedCms) ? detectedCms : (detectedCms ? [detectedCms] : []);
        if (!cmsList.some((c: string) => rules.techStack!.cms!.includes(c))) {
          continue;
        }
      }
      if (rules.techStack.hasPixel !== undefined) {
        const actualPixel = latestAnalysis ? Boolean(latestAnalysis.hasPixel) : Boolean(companyTechStack?.hasPixel);
        if (actualPixel !== rules.techStack.hasPixel) continue;
      }
      if (rules.techStack.hasChatbot !== undefined) {
        const actualChatbot = latestAnalysis ? Boolean(latestAnalysis.hasChatbot) : Boolean(companyTechStack?.hasChatbot);
        if (actualChatbot !== rules.techStack.hasChatbot) continue;
      }
      if (rules.techStack.hasWhatsapp !== undefined) {
        const actualWhatsapp = latestAnalysis ? Boolean(latestAnalysis.hasWhatsapp) : Boolean(companyTechStack?.hasWhatsapp);
        if (actualWhatsapp !== rules.techStack.hasWhatsapp) continue;
      }
      if (rules.techStack.hasBooking !== undefined) {
        const actualBooking = latestAnalysis ? Boolean(latestAnalysis.hasBooking) : Boolean(companyTechStack?.hasBooking);
        if (actualBooking !== rules.techStack.hasBooking) continue;
      }
      if (rules.techStack.isEcommerce !== undefined) {
        const actualEcom = latestAnalysis ? Boolean(latestAnalysis.isEcommerce) : Boolean(companyTechStack?.isEcommerce);
        if (actualEcom !== rules.techStack.isEcommerce) continue;
      }
    }

    // Eligibility check for contact requirements and GDPR consent
    let isEligible = true;
    let exclusionReason: string | null = null;
    let consentLabel = 'In attesa di verifica';

    if (consentStatus === 'granted') {
      consentLabel = 'Consenso Verificato (Opt-in)';
    } else if (consentStatus === 'revoked') {
      consentLabel = 'Consenso Revocato (Opt-out)';
      isEligible = false;
      exclusionReason = 'Consenso revocato (Opt-out)';
    } else if (consentStatus === 'pending') {
      consentLabel = 'In attesa di verifica (Opt-in non confermato)';
      if (rules.contactsRequirement?.requireMarketingConsent) {
        isEligible = false;
        exclusionReason = 'Consenso in attesa di verifica (Opt-in non confermato)';
      }
    } else if (consentStatus === 'not_applicable') {
      consentLabel = 'Non applicabile';
    }

    if (isEligible && rules.contactsRequirement?.mustHaveEmail && (!itemEmail || !itemEmail.includes('@'))) {
      isEligible = false;
      exclusionReason = 'Email assente o non valida';
    } else if (isEligible && rules.contactsRequirement?.mustHavePhone && !itemPhone) {
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
      province: itemProvince,
      email: itemEmail,
      phone: itemPhone,
      website: itemWebsite,
      score: itemScore,
      marketingConsentStatus: consentStatus,
      consentLabel,
      isEligible,
      exclusionReason,
    });
  }

  const eligibleCount = filteredCandidates.filter((c) => c.isEligible).length;
  const limitApplied = filteredCandidates.length > limit;

  return {
    totalCount: filteredCandidates.length,
    eligibleCount,
    limitApplied,
    maxLimit: limit,
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

  // Operator permission check: operator can only edit segments they created
  if (user.role !== 'admin' && existing.createdBy && existing.createdBy !== user.userId) {
    throw new Error('FORBIDDEN: Non puoi modificare un segmento creato da un altro utente');
  }

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

  // Operator permission check: operator can only delete segments they created
  if (user.role !== 'admin' && existing.createdBy && existing.createdBy !== user.userId) {
    throw new Error('FORBIDDEN: Non puoi eliminare un segmento creato da un altro utente');
  }

  // Prevent deleting segments attached to active or draft campaigns
  const linkedCampaigns = db.select({ id: marketingCampaigns.id }).from(marketingCampaigns).where(eq(marketingCampaigns.segmentId, id)).all();
  if (linkedCampaigns.length > 0) {
    throw new Error('FORBIDDEN: Impossibile eliminare un segmento collegato a campagne esistenti');
  }

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

  // Strict Governance 1: 'approved' status CANNOT be forced or set via generic PATCH, even by admin!
  if (input.status === 'approved') {
    throw new Error('FORBIDDEN: Lo stato "approved" non può essere impostato tramite modifica generica. Utilizzare l\'azione dedicata di approvazione (/api/marketing/campaigns/[id]/approve)');
  }

  // Strict Governance 2: 'in_review' status CANNOT be set via generic PATCH; must use submitCampaignForReview
  if (input.status === 'in_review') {
    throw new Error('FORBIDDEN: Lo stato "in_review" non può essere impostato tramite modifica generica. Utilizzare l\'azione dedicata di invio in revisione (/api/marketing/campaigns/[id]/submit-review)');
  }

  // Operator entity ownership check
  if (user.role !== 'admin' && existing.ownerUserId && existing.ownerUserId !== user.userId) {
    throw new Error('FORBIDDEN: Non puoi modificare una campagna creata da un altro operatore');
  }

  // Operator state lifecycle check: cannot modify locked states
  if (user.role !== 'admin' && ['approved', 'active', 'archived'].includes(existing.status)) {
    throw new Error('FORBIDDEN: Solo gli amministratori possono modificare una campagna già approvata, attiva o archiviata');
  }

  // Validate operational lifecycle state transitions if status is changing
  if (input.status && input.status !== existing.status) {
    if (['draft', 'in_review'].includes(existing.status) && ['scheduled', 'active', 'completed'].includes(input.status)) {
      throw new Error(`INVALID_STATE_TRANSITION: Impossibile attivare o pianificare una campagna in stato "${existing.status}" senza previa approvazione.`);
    }

    const validTransitions: Record<string, string[]> = {
      draft: ['draft'],
      in_review: ['draft'],
      approved: ['scheduled', 'active', 'paused', 'draft'],
      scheduled: ['active', 'paused', 'archived'],
      active: ['paused', 'completed', 'archived'],
      paused: ['active', 'archived', 'completed'],
      completed: ['archived'],
      archived: [],
    };

    const allowed = validTransitions[existing.status] || [];
    if (!allowed.includes(input.status)) {
      throw new Error(`INVALID_STATE_TRANSITION: Transizione non consentita da "${existing.status}" a "${input.status}".`);
    }
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

  if (user.role !== 'admin' && existing.ownerUserId && existing.ownerUserId !== user.userId) {
    throw new Error('FORBIDDEN: Non puoi inviare in revisione una campagna creata da un altro operatore');
  }

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
  user: UserSessionPayload,
  batchLimit: number = 2000
): Promise<{ populatedCount: number; totalRecipients: number; limitApplied: boolean }> {
  const campaign = db.select().from(marketingCampaigns).where(eq(marketingCampaigns.id, campaignId)).get();
  if (!campaign || !campaign.segmentId) return { populatedCount: 0, totalRecipients: 0, limitApplied: false };

  if (user.role !== 'admin' && campaign.ownerUserId && campaign.ownerUserId !== user.userId) {
    throw new Error('FORBIDDEN: Non puoi popolare i destinatari di una campagna appartenente a un altro operatore');
  }

  if (user.role !== 'admin' && ['approved', 'active', 'archived'].includes(campaign.status)) {
    throw new Error('FORBIDDEN: Non puoi modificare i destinatari di una campagna già approvata o chiusa');
  }

  const segment = db.select().from(marketingSegments).where(eq(marketingSegments.id, campaign.segmentId)).get();
  if (!segment) return { populatedCount: 0, totalRecipients: 0, limitApplied: false };

  const rules: SegmentRules = JSON.parse(segment.rulesJson);
  const evaluation = await evaluateSegmentCandidates(
    rules,
    segment.targetType as 'leads' | 'companies',
    batchLimit
  );

  const now = new Date().toISOString();

  // ATOMIC & NON-DESTRUCTIVE SYNCHRONIZATION
  // 1. Fetch all existing recipients
  const existingRecipients = db
    .select()
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, campaignId))
    .all();

  const recipientIds = existingRecipients.map((r) => r.id);
  const loggedEntityIds = new Set<string>();
  if (recipientIds.length > 0) {
    const logs = db
      .select({ entityId: activityLog.entityId })
      .from(activityLog)
      .where(inArray(activityLog.entityId, recipientIds))
      .all();
    for (const l of logs) {
      if (l.entityId) loggedEntityIds.add(l.entityId);
    }
  }

  const candidateKeyMap = new Map(
    evaluation.candidates.map((c) => [c.targetType === 'leads' ? `lead_${c.id}` : `comp_${c.id}`, c])
  );

  let updatedCount = 0;
  let insertedCount = 0;

  // Execute all modifications atomically in a single SQLite transaction
  db.transaction((tx) => {
    // 2. Identify rows to preserve vs update in-place vs prune
    for (const existing of existingRecipients) {
      const key = existing.leadId ? `lead_${existing.leadId}` : `comp_${existing.companyId}`;
      const matchingCandidate = candidateKeyMap.get(key);

      const hasActivity = loggedEntityIds.has(existing.id);
      const hasHistory =
        existing.status !== 'pending' ||
        Boolean(existing.outcomeNotes && existing.outcomeNotes.trim().length > 0) ||
        existing.lastContactedAt !== null ||
        hasActivity;

      if (matchingCandidate) {
        // In-place update: candidate is still in segment.
        // If the row is an un-worked pending row, update its snapshot, email, phone, and exclusion status in-place
        if (!hasHistory && existing.status === 'pending') {
          let recipientStatus: typeof campaignRecipients.$inferInsert.status = 'pending';
          let exclusionReason: string | null = null;

          if (!matchingCandidate.isEligible) {
            if (matchingCandidate.exclusionReason?.includes('Consenso') || matchingCandidate.exclusionReason?.includes('opt-out')) {
              recipientStatus = 'excluded_no_consent';
            } else {
              recipientStatus = 'excluded_missing_contact';
            }
            exclusionReason = matchingCandidate.exclusionReason || null;
          }

          tx.update(campaignRecipients)
            .set({
              recipientEmail: matchingCandidate.email || null,
              recipientPhone: matchingCandidate.phone || null,
              contactPersonName: matchingCandidate.name,
              status: recipientStatus,
              exclusionReason,
              customVariablesSnapshotJson: JSON.stringify({
                companyName: matchingCandidate.name,
                sector: matchingCandidate.sector,
                city: matchingCandidate.city || '',
                score: matchingCandidate.score || 0,
              }),
              updatedAt: now,
            })
            .where(and(eq(campaignRecipients.id, existing.id), eq(campaignRecipients.campaignId, campaignId)))
            .run();

          updatedCount++;
        }
        // Consume candidate from candidateKeyMap so we don't insert duplicate
        candidateKeyMap.delete(key);
      } else {
        // Candidate is no longer in segment.
        // If it has NO history, NO notes, and NO audit logs, prune atomically with mandatory audit logging.
        // If it HAS history, notes, timestamp, or activity logs, 100% PRESERVE IT!
        if (!hasHistory && existing.status === 'pending') {
          // Mandatory audit log in the SAME transaction: if this insert fails, transaction aborts and rolls back completely
          tx.insert(activityLog)
            .values({
              id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              entityType: 'campaign_recipient',
              entityId: existing.id,
              action: 'recipient_pruned_out_of_segment',
              performedBy: user.userId,
              detailsJson: JSON.stringify({
                campaignId,
                leadId: existing.leadId,
                companyId: existing.companyId,
                recipientEmail: existing.recipientEmail,
                contactPersonName: existing.contactPersonName,
                reason: 'Candidato non più corrispondente ai criteri del segmento (riga pending mai lavorata)',
              }),
              beforeJson: JSON.stringify(existing),
              afterJson: null,
              ipAddress: null,
              createdAt: now,
            })
            .run();

          tx.delete(campaignRecipients)
            .where(and(eq(campaignRecipients.id, existing.id), eq(campaignRecipients.campaignId, campaignId)))
            .run();
        }
      }
    }

    // 3. Insert newly discovered candidates
    for (const [key, c] of candidateKeyMap.entries()) {
      const recipientId = `recip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      let recipientStatus: typeof campaignRecipients.$inferInsert.status = 'pending';
      let exclusionReason: string | null = null;

      if (!c.isEligible) {
        if (c.exclusionReason?.includes('Consenso') || c.exclusionReason?.includes('opt-out')) {
          recipientStatus = 'excluded_no_consent';
        } else {
          recipientStatus = 'excluded_missing_contact';
        }
        exclusionReason = c.exclusionReason || null;
      }

      tx.insert(campaignRecipients)
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
  });

  const finalRecipients = db
    .select({ count: sql<number>`count(*)` })
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, campaignId))
    .get();

  return {
    populatedCount: insertedCount + updatedCount,
    totalRecipients: finalRecipients ? Number(finalRecipients.count) : 0,
    limitApplied: evaluation.limitApplied,
  };
}

export async function updateRecipientStatus(
  recipientId: string,
  input: UpdateRecipientStatusInput,
  user: UserSessionPayload,
  campaignIdParam?: string
): Promise<CampaignRecipient> {
  const existing = db.select().from(campaignRecipients).where(eq(campaignRecipients.id, recipientId)).get();
  if (!existing) throw new Error('NOT_FOUND: Destinatario non trovato');

  // Verify campaignId if passed
  if (campaignIdParam && existing.campaignId !== campaignIdParam) {
    throw new Error('FORBIDDEN: Il destinatario non appartiene alla campagna specificata');
  }

  const campaign = db.select().from(marketingCampaigns).where(eq(marketingCampaigns.id, existing.campaignId)).get();
  if (!campaign) throw new Error('NOT_FOUND: Campagna non trovata');

  // Operator check: operator can only update recipients of campaigns they own
  if (user.role !== 'admin' && campaign.ownerUserId && campaign.ownerUserId !== user.userId) {
    throw new Error('FORBIDDEN: Non puoi modificare i destinatari di una campagna appartenente a un altro operatore');
  }

  // LIVE GDPR & Channel Opt-Out Check at time of action
  let liveConsent = 'pending';
  let isOptedOutOnChannel = false;

  if (existing.leadId) {
    const liveLead = db.select({ marketingConsentStatus: leads.marketingConsentStatus, optedOutChannelsJson: leads.optedOutChannelsJson }).from(leads).where(eq(leads.id, existing.leadId)).get();
    if (liveLead) {
      liveConsent = liveLead.marketingConsentStatus || 'pending';
      if (liveLead.optedOutChannelsJson) {
        try {
          const opts = JSON.parse(liveLead.optedOutChannelsJson);
          if (Array.isArray(opts) && opts.includes(campaign.channel)) isOptedOutOnChannel = true;
        } catch {}
      }
    }
  } else if (existing.companyId) {
    const liveCompany = db.select({ marketingConsentStatus: companies.marketingConsentStatus, optedOutChannelsJson: companies.optedOutChannelsJson }).from(companies).where(eq(companies.id, existing.companyId)).get();
    if (liveCompany) {
      liveConsent = liveCompany.marketingConsentStatus || 'pending';
      if (liveCompany.optedOutChannelsJson) {
        try {
          const opts = JSON.parse(liveCompany.optedOutChannelsJson);
          if (Array.isArray(opts) && opts.includes(campaign.channel)) isOptedOutOnChannel = true;
        } catch {}
      }
    }
  }

  // PRUDENT ELIGIBILITY & PRIVACY ENFORCEMENT:
  // 1. If consent is explicitly revoked or channel opted-out -> blocked
  // 2. If consent is 'pending' on channels requiring explicit opt-in (e.g. whatsapp, strict email) -> blocked as unverified
  const isRevoked = liveConsent === 'revoked' || isOptedOutOnChannel;
  const isUnverifiedPending = liveConsent === 'pending' && ['whatsapp', 'email'].includes(campaign.channel);
  const isPositiveContactAction = ['contacted', 'interested', 'replied', 'converted'].includes(input.status);

  if ((isRevoked || isUnverifiedPending) && isPositiveContactAction) {
    let reason = '';
    if (liveConsent === 'revoked') {
      reason = 'il contatto ha revocato il consenso privacy successivamente all\'arruolamento';
    } else if (isOptedOutOnChannel) {
      reason = `il contatto ha escluso il canale (${campaign.channel}) successivamente all\'arruolamento`;
    } else {
      reason = `il consenso è in attesa di verifica (necessario opt-in confermato prima del contatto sul canale ${campaign.channel})`;
    }

    // Automatically update recipient record to excluded_no_consent
    const now = new Date().toISOString();
    db.update(campaignRecipients)
      .set({
        status: 'excluded_no_consent',
        exclusionReason: `Blocco Privacy Live: ${reason}`,
        updatedAt: now,
      })
      .where(eq(campaignRecipients.id, recipientId))
      .run();

    try {
      db.insert(activityLog)
        .values({
          id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          entityType: 'campaign_recipient',
          entityId: recipientId,
          action: 'recipient_privacy_blocked_auto_excluded',
          performedBy: user.userId,
          detailsJson: JSON.stringify({
            campaignId: existing.campaignId,
            attemptedStatus: input.status,
            reason,
            convertedStatus: 'excluded_no_consent',
          }),
          beforeJson: JSON.stringify({ status: existing.status }),
          afterJson: JSON.stringify({ status: 'excluded_no_consent' }),
          ipAddress: null,
          createdAt: now,
        })
        .run();
    } catch {}

    throw new Error(`FORBIDDEN_PRIVACY: Impossibile procedere con il contatto: ${reason}.`);
  }

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

  try {
    db.insert(activityLog)
      .values({
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        entityType: 'campaign_recipient',
        entityId: recipientId,
        action: 'recipient_status_updated',
        performedBy: user.userId,
        detailsJson: JSON.stringify({
          campaignId: existing.campaignId,
          previousStatus: existing.status,
          newStatus: input.status,
          outcomeNotes: input.outcomeNotes || null,
        }),
        beforeJson: JSON.stringify({ status: existing.status, outcomeNotes: existing.outcomeNotes }),
        afterJson: JSON.stringify({ status: input.status, outcomeNotes: input.outcomeNotes || null }),
        ipAddress: null,
        createdAt: now,
      })
      .run();
  } catch {}

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

  // Perform live lookup on current lead/company privacy & opt-out status
  const leadIds = recipients.map((r) => r.leadId).filter(Boolean) as string[];
  const companyIds = recipients.map((r) => r.companyId).filter(Boolean) as string[];

  const liveLeads = leadIds.length > 0
    ? db.select({ id: leads.id, marketingConsentStatus: leads.marketingConsentStatus, optedOutChannelsJson: leads.optedOutChannelsJson }).from(leads).where(inArray(leads.id, leadIds)).all()
    : [];
  const liveCompanies = companyIds.length > 0
    ? db.select({ id: companies.id, marketingConsentStatus: companies.marketingConsentStatus, optedOutChannelsJson: companies.optedOutChannelsJson }).from(companies).where(inArray(companies.id, companyIds)).all()
    : [];

  const liveLeadMap = new Map(liveLeads.map((l) => [l.id, l]));
  const liveCompanyMap = new Map(liveCompanies.map((c) => [c.id, c]));

  const enrichedRecipients = recipients.map((r) => {
    const liveEntity = r.leadId ? liveLeadMap.get(r.leadId) : (r.companyId ? liveCompanyMap.get(r.companyId) : null);
    const liveConsent = liveEntity?.marketingConsentStatus || 'pending';
    let optedOutChannels: string[] = [];
    try {
      if (liveEntity?.optedOutChannelsJson) {
        optedOutChannels = JSON.parse(liveEntity.optedOutChannelsJson);
      }
    } catch {}

    const isOptedOutOnChannel = Array.isArray(optedOutChannels) && optedOutChannels.includes(campaign.channel);
    const isLiveConsentRevoked = liveConsent === 'revoked' || isOptedOutOnChannel;
    
    // Prudent contactability: 'pending' is NOT contactable on channels requiring opt-in
    const isConsentPendingUnverified = liveConsent === 'pending' && ['whatsapp', 'email'].includes(campaign.channel);
    const isCurrentlyContactable = !isLiveConsentRevoked && !isConsentPendingUnverified && r.status !== 'excluded_missing_contact' && r.status !== 'excluded_no_consent';

    let liveComplianceWarning: string | null = null;
    if (liveConsent === 'revoked') {
      liveComplianceWarning = 'Consenso privacy revocato dal contatto post-snapshot.';
    } else if (isOptedOutOnChannel) {
      liveComplianceWarning = `Il contatto ha escluso le comunicazioni per il canale ${campaign.channel}.`;
    } else if (isConsentPendingUnverified) {
      liveComplianceWarning = 'Consenso in attesa di verifica (Opt-in non confermato): necessario accertamento prima del contatto.';
    }

    return {
      ...r,
      currentConsentStatus: liveConsent,
      isOptedOutOnChannel,
      isLiveConsentRevoked,
      isCurrentlyContactable,
      liveComplianceWarning,
    };
  });

  const owner = campaign.ownerUserId
    ? db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, campaign.ownerUserId)).get()
    : null;

  const approver = campaign.approvedByUserId
    ? db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, campaign.approvedByUserId)).get()
    : null;

  const statusCounts: Record<string, number> = {};
  for (const r of enrichedRecipients) {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  }

  return {
    ...campaign,
    segment,
    owner,
    approver,
    recipients: enrichedRecipients,
    totalRecipients: enrichedRecipients.length,
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
