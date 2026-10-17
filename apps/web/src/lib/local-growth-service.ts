import {
  db,
  localSocialPosts,
  localGbpReviews,
  localGbpPosts,
  localWhatsappAgents,
  localWhatsappConversations,
  localSeoWebsites,
  localSeoArticles,
  companies,
  leads,
  crmAppointments,
  users,
  projects,
  activityLog,
} from '@ai-crm/db';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import crypto from 'crypto';
import type {
  LocalSocialPost,
  LocalGbpReview,
  LocalGbpPost,
  LocalWhatsappAgent,
  LocalWhatsappConversation,
  LocalSeoWebsite,
  LocalSeoArticle,
} from '@ai-crm/db';

export interface UserSessionPayload {
  userId: string;
  name?: string;
  email?: string;
  role: string;
}

// ============================================================================
// Types & Input Interfaces
// ============================================================================

export type SocialChannel = 'instagram' | 'facebook' | 'linkedin' | 'google_business' | 'tiktok';
export type SocialPostType = 'post' | 'reel' | 'story' | 'carousel' | 'update';
export type PublishStatus = 'bozza' | 'in_revisione' | 'approvato' | 'programmato' | 'pubblicato' | 'archiviato';

export interface GeneratePedInput {
  companyId?: string;
  companyName?: string;
  sector?: string;
  month?: string; // YYYY-MM
  numPosts?: number; // 4 to 30
  channels?: SocialChannel[];
  toneOfVoice?: 'professionale' | 'accattivante_amichevole' | 'elegante_autorevole' | 'giovane_dinamico';
  targetAudience?: string;
  focusGoal?: 'brand_awareness' | 'lead_generation' | 'promozione_offerte' | 'autorita_settore';
  specialEvents?: string;
}

export interface CreateSocialPostInput {
  companyId?: string;
  projectId?: string;
  channel?: SocialChannel;
  postType?: SocialPostType;
  publishStatus?: PublishStatus;
  scheduledAt?: string;
  topic?: string;
  title: string;
  hook?: string;
  caption: string;
  callToAction?: string;
  hashtags?: string[];
  visualPrompt?: string;
  mediaUrls?: string[];
  notes?: string;
}

export interface UpdateSocialPostInput {
  channel?: SocialChannel;
  postType?: SocialPostType;
  publishStatus?: PublishStatus;
  scheduledAt?: string;
  topic?: string;
  title?: string;
  hook?: string;
  caption?: string;
  callToAction?: string;
  hashtags?: string[];
  visualPrompt?: string;
  mediaUrls?: string[];
  notes?: string;
}

// ============================================================================
// Activity Logger Helper
// ============================================================================

async function logActivity(record: {
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  details?: Record<string, any>;
  before?: Record<string, any>;
}) {
  try {
    const id = `act_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    db.insert(activityLog)
      .values({
        id,
        entityType: record.entityType,
        entityId: record.entityId,
        action: record.action,
        performedBy: record.performedBy,
        detailsJson: record.details ? JSON.stringify(record.details) : null,
        beforeJson: record.before ? JSON.stringify(record.before) : null,
        createdAt: new Date().toISOString(),
      })
      .run();
  } catch (err) {
    console.error('Failed to log activity record:', err);
  }
}

// ============================================================================
// FASE 1: SOCIAL PLANNER AI & PIANO EDITORIALE (PED)
// ============================================================================

export async function generateSocialPedPlan(
  input: GeneratePedInput,
  user: UserSessionPayload
): Promise<LocalSocialPost[]> {
  const numPosts = Math.min(Math.max(input.numPosts || 12, 4), 30);
  const channels = input.channels && input.channels.length > 0
    ? input.channels
    : (['instagram', 'facebook', 'google_business'] as SocialChannel[]);

  let targetCompanyName = input.companyName || 'La Nostra Attività';
  let targetSector = input.sector || 'local_services';

  if (input.companyId) {
    const comp = db.select().from(companies).where(eq(companies.id, input.companyId)).get();
    if (comp) {
      targetCompanyName = comp.name;
      if (comp.sector) targetSector = comp.sector;
    }
  }

  // Determine target month and year
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1; // 1-12
  if (input.month) {
    const parts = input.month.split('-');
    if (parts.length === 2) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
    }
  }

  // Days in target month
  const daysInMonth = new Date(year, month, 0).getDate();

  // Create posting days evenly distributed across the month
  const step = Math.max(Math.floor(daysInMonth / numPosts), 1);
  const generatedPosts: LocalSocialPost[] = [];

  // Sector-tailored content templates & hooks
  const sectorTemplates = getSectorTemplates(targetSector, targetCompanyName);

  const pillars: Array<{
    pillar: string;
    type: SocialPostType;
    channelWeight: SocialChannel;
  }> = [
    { pillar: 'storytelling', type: 'reel', channelWeight: 'instagram' },
    { pillar: 'educational_value', type: 'carousel', channelWeight: 'facebook' },
    { pillar: 'social_proof', type: 'post', channelWeight: 'instagram' },
    { pillar: 'promotion_offer', type: 'update', channelWeight: 'google_business' },
    { pillar: 'community_behind_scenes', type: 'post', channelWeight: 'facebook' },
  ];

  const nowIso = new Date().toISOString();

  for (let i = 0; i < numPosts; i++) {
    const day = Math.min(1 + i * step, daysInMonth);
    // Peak engagement local time: 12:30 or 19:15
    const hour = i % 2 === 0 ? '12:30:00' : '19:15:00';
    const dayFormatted = String(day).padStart(2, '0');
    const monthFormatted = String(month).padStart(2, '0');
    const scheduledDateTimeIso = `${year}-${monthFormatted}-${dayFormatted}T${hour}.000Z`;

    const pillarInfo = pillars[i % pillars.length];
    const channel = channels[i % channels.length];
    const template = sectorTemplates[i % sectorTemplates.length];

    const postId = `post_${Date.now()}_${crypto.randomBytes(3).toString('hex')}_${i}`;

    const hashtags = [
      `#${targetCompanyName.replace(/\s+/g, '')}`,
      ...template.hashtags,
      `#${targetSector.replace(/_/g, '')}`,
      '#localbusiness',
      '#qualità',
      '#madeinitaly',
    ];

    const newPost: LocalSocialPost = {
      id: postId,
      companyId: input.companyId || null,
      projectId: null,
      channel,
      postType: pillarInfo.type,
      publishStatus: 'bozza',
      scheduledAt: scheduledDateTimeIso,
      topic: template.topic,
      title: template.title,
      hook: template.hook,
      caption: template.caption,
      callToAction: template.cta,
      hashtagsJson: JSON.stringify(hashtags),
      visualPrompt: template.visualPrompt,
      mediaUrlsJson: JSON.stringify([]),
      createdById: user.userId,
      approvedById: null,
      approvedAt: null,
      publishedAt: null,
      notes: `Generato automaticamente dall'Agente Social PED AI per ${targetCompanyName}. Obiettivo: ${input.focusGoal || 'brand_awareness'}.`,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.insert(localSocialPosts).values(newPost).run();
    generatedPosts.push(newPost);
  }

  await logActivity({
    entityType: 'local_social_posts',
    entityId: input.companyId || 'global',
    action: 'ped_plan_generated',
    performedBy: user.userId,
    details: {
      numPosts,
      month: `${year}-${String(month).padStart(2, '0')}`,
      companyName: targetCompanyName,
      sector: targetSector,
    },
  });

  return generatedPosts;
}

export async function listSocialPosts(params: {
  companyId?: string;
  channel?: string;
  publishStatus?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const conditions = [];
  if (params.companyId) conditions.push(eq(localSocialPosts.companyId, params.companyId));
  if (params.channel) conditions.push(eq(localSocialPosts.channel, params.channel as any));
  if (params.publishStatus) conditions.push(eq(localSocialPosts.publishStatus, params.publishStatus as any));

  if (params.startDate) {
    conditions.push(sql`${localSocialPosts.scheduledAt} >= ${params.startDate}`);
  }
  if (params.endDate) {
    conditions.push(sql`${localSocialPosts.scheduledAt} <= ${params.endDate}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const raw = db
    .select({
      post: localSocialPosts,
      companyName: companies.name,
      creatorName: users.name,
    })
    .from(localSocialPosts)
    .leftJoin(companies, eq(localSocialPosts.companyId, companies.id))
    .leftJoin(users, eq(localSocialPosts.createdById, users.id))
    .where(whereClause)
    .orderBy(desc(localSocialPosts.scheduledAt), desc(localSocialPosts.createdAt))
    .limit(params.limit || 150)
    .all();

  return raw.map((r) => ({
    ...r.post,
    hashtags: r.post.hashtagsJson ? JSON.parse(r.post.hashtagsJson) : [],
    mediaUrls: r.post.mediaUrlsJson ? JSON.parse(r.post.mediaUrlsJson) : [],
    companyName: r.companyName,
    creatorName: r.creatorName,
  }));
}

export async function createSocialPost(
  input: CreateSocialPostInput,
  user: UserSessionPayload
): Promise<LocalSocialPost> {
  const postId = `post_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  const newPost: LocalSocialPost = {
    id: postId,
    companyId: input.companyId || null,
    projectId: input.projectId || null,
    channel: input.channel || 'instagram',
    postType: input.postType || 'post',
    publishStatus: input.publishStatus || 'bozza',
    scheduledAt: input.scheduledAt || null,
    topic: input.topic || null,
    title: input.title,
    hook: input.hook || null,
    caption: input.caption,
    callToAction: input.callToAction || null,
    hashtagsJson: JSON.stringify(input.hashtags || []),
    visualPrompt: input.visualPrompt || null,
    mediaUrlsJson: JSON.stringify(input.mediaUrls || []),
    createdById: user.userId,
    approvedById: input.publishStatus === 'approvato' ? user.userId : null,
    approvedAt: input.publishStatus === 'approvato' ? now : null,
    publishedAt: null,
    notes: input.notes || null,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(localSocialPosts).values(newPost).run();

  await logActivity({
    entityType: 'local_social_posts',
    entityId: postId,
    action: 'social_post_created',
    performedBy: user.userId,
    details: { title: input.title, channel: newPost.channel },
  });

  return newPost;
}

export async function updateSocialPost(
  id: string,
  input: UpdateSocialPostInput,
  user: UserSessionPayload
): Promise<LocalSocialPost | null> {
  const existing = db.select().from(localSocialPosts).where(eq(localSocialPosts.id, id)).get();
  if (!existing) return null;

  const now = new Date().toISOString();
  const updateData: Partial<LocalSocialPost> = {
    updatedAt: now,
  };

  if (input.channel !== undefined) updateData.channel = input.channel;
  if (input.postType !== undefined) updateData.postType = input.postType;
  if (input.publishStatus !== undefined) {
    updateData.publishStatus = input.publishStatus;
    if (input.publishStatus === 'approvato' && !existing.approvedAt) {
      updateData.approvedById = user.userId;
      updateData.approvedAt = now;
    }
  }
  if (input.scheduledAt !== undefined) updateData.scheduledAt = input.scheduledAt;
  if (input.topic !== undefined) updateData.topic = input.topic;
  if (input.title !== undefined) updateData.title = input.title;
  if (input.hook !== undefined) updateData.hook = input.hook;
  if (input.caption !== undefined) updateData.caption = input.caption;
  if (input.callToAction !== undefined) updateData.callToAction = input.callToAction;
  if (input.hashtags !== undefined) updateData.hashtagsJson = JSON.stringify(input.hashtags);
  if (input.visualPrompt !== undefined) updateData.visualPrompt = input.visualPrompt;
  if (input.mediaUrls !== undefined) updateData.mediaUrlsJson = JSON.stringify(input.mediaUrls);
  if (input.notes !== undefined) updateData.notes = input.notes;

  db.update(localSocialPosts).set(updateData).where(eq(localSocialPosts.id, id)).run();

  await logActivity({
    entityType: 'local_social_posts',
    entityId: id,
    action: 'social_post_updated',
    performedBy: user.userId,
    details: updateData,
    before: existing,
  });

  return { ...existing, ...updateData };
}

export async function deleteSocialPost(id: string, user: UserSessionPayload): Promise<boolean> {
  const existing = db.select().from(localSocialPosts).where(eq(localSocialPosts.id, id)).get();
  if (!existing) return false;

  db.delete(localSocialPosts).where(eq(localSocialPosts.id, id)).run();

  await logActivity({
    entityType: 'local_social_posts',
    entityId: id,
    action: 'social_post_deleted',
    performedBy: user.userId,
    details: { title: existing.title },
    before: existing,
  });

  return true;
}

export async function bulkApprovePosts(ids: string[], user: UserSessionPayload): Promise<number> {
  if (!ids || ids.length === 0) return 0;
  const now = new Date().toISOString();

  db.update(localSocialPosts)
    .set({
      publishStatus: 'approvato',
      approvedById: user.userId,
      approvedAt: now,
      updatedAt: now,
    })
    .where(inArray(localSocialPosts.id, ids))
    .run();

  await logActivity({
    entityType: 'local_social_posts',
    entityId: 'bulk',
    action: 'social_posts_bulk_approved',
    performedBy: user.userId,
    details: { count: ids.length, ids },
  });

  return ids.length;
}

// ============================================================================
// FASE 2: GOOGLE BUSINESS PROFILE (GBP) - RECENSIONI & POST
// ============================================================================

export async function listGbpReviews(params: {
  companyId?: string;
  replyStatus?: string;
  sentiment?: string;
  rating?: number;
}) {
  const conditions = [];
  if (params.companyId) conditions.push(eq(localGbpReviews.companyId, params.companyId));
  if (params.replyStatus) conditions.push(eq(localGbpReviews.replyStatus, params.replyStatus as any));
  if (params.sentiment) conditions.push(eq(localGbpReviews.sentiment, params.sentiment as any));
  if (params.rating) conditions.push(eq(localGbpReviews.rating, params.rating));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const raw = db
    .select({
      review: localGbpReviews,
      companyName: companies.name,
      repliedByName: users.name,
    })
    .from(localGbpReviews)
    .leftJoin(companies, eq(localGbpReviews.companyId, companies.id))
    .leftJoin(users, eq(localGbpReviews.repliedById, users.id))
    .where(whereClause)
    .orderBy(desc(localGbpReviews.reviewDate))
    .limit(100)
    .all();

  return raw.map((r) => ({
    ...r.review,
    companyName: r.companyName,
    repliedByName: r.repliedByName,
  }));
}

export async function generateReviewAiReply(
  reviewId: string,
  user: UserSessionPayload
): Promise<{ suggestedReply: string; sentiment: 'positivo' | 'neutro' | 'critico' }> {
  const rev = db.select().from(localGbpReviews).where(eq(localGbpReviews.id, reviewId)).get();
  if (!rev) throw new Error('Recensione non trovata');

  let companyName = 'la nostra attività';
  const comp = db.select().from(companies).where(eq(companies.id, rev.companyId)).get();
  if (comp) companyName = comp.name;

  const rating = rev.rating;
  const reviewer = rev.reviewerName;

  let sentiment: 'positivo' | 'neutro' | 'critico' = 'positivo';
  let reply = '';

  if (rating >= 4) {
    sentiment = 'positivo';
    reply = `Gentile ${reviewer}, grazie di cuore per la splendida recensione a 5 stelle! Tutto il team di ${companyName} è felice che la tua esperienza sia stata impeccabile. Lavoriamo ogni giorno per garantire il massimo della qualità e del servizio per i nostri clienti sul territorio. Non vediamo l'ora di riaccoglierti presto! Un cordiale saluto.`;
  } else if (rating === 3) {
    sentiment = 'neutro';
    reply = `Gentile ${reviewer}, grazie per aver condiviso la tua esperienza con noi di ${companyName}. Apprezziamo molto ogni feedback perché ci permette di perfezionare costantemente i nostri servizi e dettagli. Se desideri lasciarci un consiglio più dettagliato per meritare la quinta stella alla tua prossima visita, puoi scriverci direttamente. A presto!`;
  } else {
    sentiment = 'critico';
    reply = `Gentile ${reviewer}, siamo sinceramente dispiaciuti che la tua esperienza presso ${companyName} non abbia rispecchiato gli standard di eccellenza che ci impegniamo ad offrire quotidianamente. La soddisfazione dei nostri clienti è la nostra assoluta priorità. Ci farebbe molto piacere approfondire l'accaduto direttamente con te: ti invitiamo a contattare la nostra direzione per poter trovare insieme una soluzione soddisfacente. Cordiali saluti.`;
  }

  const now = new Date().toISOString();
  db.update(localGbpReviews)
    .set({
      suggestedReplyAi: reply,
      sentiment,
      replyStatus: rev.replyStatus === 'da_rispondere' ? 'bozza_ai' : rev.replyStatus,
      updatedAt: now,
    })
    .where(eq(localGbpReviews.id, reviewId))
    .run();

  await logActivity({
    entityType: 'local_gbp_reviews',
    entityId: reviewId,
    action: 'gbp_review_ai_reply_generated',
    performedBy: user.userId,
    details: { sentiment, rating },
  });

  return { suggestedReply: reply, sentiment };
}

export async function saveReviewReply(
  reviewId: string,
  replyText: string,
  publishNow: boolean,
  user: UserSessionPayload
): Promise<LocalGbpReview | null> {
  const rev = db.select().from(localGbpReviews).where(eq(localGbpReviews.id, reviewId)).get();
  if (!rev) return null;

  const now = new Date().toISOString();
  const updateData: Partial<LocalGbpReview> = {
    replyText,
    replyStatus: publishNow ? 'risposta_pubblicata' : 'bozza_ai',
    repliedAt: publishNow ? now : rev.repliedAt,
    repliedById: user.userId,
    updatedAt: now,
  };

  db.update(localGbpReviews).set(updateData).where(eq(localGbpReviews.id, reviewId)).run();

  await logActivity({
    entityType: 'local_gbp_reviews',
    entityId: reviewId,
    action: publishNow ? 'gbp_review_reply_published' : 'gbp_review_reply_drafted',
    performedBy: user.userId,
    details: { publishNow, replyLength: replyText.length },
  });

  return { ...rev, ...updateData };
}

export async function seedSampleGbpReviews(companyId: string, user: UserSessionPayload): Promise<LocalGbpReview[]> {
  const comp = db.select().from(companies).where(eq(companies.id, companyId)).get();
  const companyName = comp ? comp.name : 'Attività Locale';

  const samples = [
    {
      reviewerName: 'Marco Bellini',
      rating: 5,
      comment: `Esperienza straordinaria presso ${companyName}. Personale cortese, servizio veloce e qualità davvero al top. Consigliatissimo!`,
      sentiment: 'positivo' as const,
      daysAgo: 2,
    },
    {
      reviewerName: 'Elena Russo',
      rating: 5,
      comment: `Puntualità, serietà e grande disponibilità. Si vede la passione e la cura per ogni minimo dettaglio. Ritornerò sicuramente!`,
      sentiment: 'positivo' as const,
      daysAgo: 5,
    },
    {
      reviewerName: 'Giuseppe Ferrara',
      rating: 4,
      comment: `Servizio molto buono e ambiente curato. Piccola attesa all'accoglienza ma ampiamente compensata dalla professionalità del team.`,
      sentiment: 'positivo' as const,
      daysAgo: 8,
    },
    {
      reviewerName: 'Chiara Moretti',
      rating: 3,
      comment: `Nel complesso ok, ma ci sono alcuni aspetti organizzativi che potrebbero essere migliorati nelle ore di punta.`,
      sentiment: 'neutro' as const,
      daysAgo: 14,
    },
  ];

  const created: LocalGbpReview[] = [];
  const now = new Date();

  for (const s of samples) {
    const revDate = new Date(now.getTime() - s.daysAgo * 86400000).toISOString();
    const id = `rev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const newRev: LocalGbpReview = {
      id,
      companyId,
      reviewerName: s.reviewerName,
      reviewerPhotoUrl: null,
      rating: s.rating,
      comment: s.comment,
      reviewDate: revDate,
      sentiment: s.sentiment,
      replyText: null,
      suggestedReplyAi: null,
      replyStatus: 'da_rispondere',
      repliedAt: null,
      repliedById: null,
      createdAt: revDate,
      updatedAt: revDate,
    };
    db.insert(localGbpReviews).values(newRev).run();
    created.push(newRev);
  }

  await logActivity({
    entityType: 'local_gbp_reviews',
    entityId: companyId,
    action: 'gbp_sample_reviews_seeded',
    performedBy: user.userId,
    details: { count: created.length },
  });

  return created;
}

// ----------------------------------------------------------------------------
// Google Business Profile Updates / Posts (Local SEO Posts)
// ----------------------------------------------------------------------------

export async function listGbpPosts(companyId?: string) {
  const conditions = [];
  if (companyId) conditions.push(eq(localGbpPosts.companyId, companyId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      post: localGbpPosts,
      companyName: companies.name,
    })
    .from(localGbpPosts)
    .leftJoin(companies, eq(localGbpPosts.companyId, companies.id))
    .where(whereClause)
    .orderBy(desc(localGbpPosts.createdAt))
    .limit(50)
    .all();
}

export async function createGbpPost(
  input: {
    companyId: string;
    postType: 'standard' | 'offerta' | 'evento';
    title: string;
    summary: string;
    ctaType?: 'PRENOTA' | 'CHIAMA' | 'SCOPRI' | 'ACQUISTA' | 'NESSUNA';
    ctaUrl?: string;
    couponCode?: string;
    termsConditions?: string;
    startDate?: string;
    endDate?: string;
  },
  user: UserSessionPayload
): Promise<LocalGbpPost> {
  const id = `gbp_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  const newPost: LocalGbpPost = {
    id,
    companyId: input.companyId,
    postType: input.postType,
    title: input.title,
    summary: input.summary,
    ctaType: input.ctaType || 'SCOPRI',
    ctaUrl: input.ctaUrl || null,
    couponCode: input.couponCode || null,
    termsConditions: input.termsConditions || null,
    startDate: input.startDate || null,
    endDate: input.endDate || null,
    status: 'pubblicato',
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(localGbpPosts).values(newPost).run();

  await logActivity({
    entityType: 'local_gbp_posts',
    entityId: id,
    action: 'gbp_post_created',
    performedBy: user.userId,
    details: { title: input.title, postType: input.postType },
  });

  return newPost;
}

export async function deleteGbpPost(id: string, user: UserSessionPayload): Promise<boolean> {
  const existing = db.select().from(localGbpPosts).where(eq(localGbpPosts.id, id)).get();
  if (!existing) return false;

  db.delete(localGbpPosts).where(eq(localGbpPosts.id, id)).run();

  await logActivity({
    entityType: 'local_gbp_posts',
    entityId: id,
    action: 'gbp_post_deleted',
    performedBy: user.userId,
    details: { title: existing.title },
  });

  return true;
}

// ============================================================================
// FASE 3: AGENTE WHATSAPP AI 24/7 PER ATTIVITÀ LOCALI
// ============================================================================

export interface WhatsappFaqItem {
  question: string;
  answer: string;
}

export interface WhatsappMessageItem {
  role: 'customer' | 'agent_ai' | 'operator';
  text: string;
  timestamp: string;
}

export interface UpsertWhatsappAgentInput {
  companyId: string;
  agentName?: string;
  whatsappPhone?: string;
  status?: 'attivo' | 'pausa' | 'configurazione';
  welcomeMessage?: string;
  businessHours?: string;
  addressInfo?: string;
  pricingMenuInfo?: string;
  faqs?: WhatsappFaqItem[];
  bookingEnabled?: boolean;
  leadCaptureEnabled?: boolean;
  escalationPhone?: string;
  toneOfVoice?: 'cordiale_locale' | 'formale_professionale' | 'rapido_diretto';
  autoGenerateKnowledgeBase?: boolean;
}

function getSectorWhatsappPreset(sector: string, companyName: string, city: string, address?: string | null, phone?: string | null) {
  const loc = address ? `${address}, ${city}` : `Centro Storico, ${city}`;
  switch (sector) {
    case 'horeca_ristoranti':
      return {
        agentName: `Concierge WhatsApp - ${companyName}`,
        welcomeMessage: `Ciao! 👋 Benvenuto da *${companyName}* a ${city}. Sono l'assistente virtuale attivo 24/7: posso aiutarti a prenotare un tavolo, consultare il menu del giorno, verificare allergeni o darti indicazioni su orari e parcheggio. Come posso aiutarti?`,
        businessHours: 'Martedì - Domenica: 12:00 - 15:00 e 19:00 - 23:30 (Lunedì chiuso)',
        addressInfo: `${loc} (Parcheggio convenzionato a 80 metri dall'ingresso)`,
        pricingMenuInfo: 'Business Lunch feriale: €18 (primo, contorno, acqua e caffè). Menu Degustazione Tradizione: €42 a persona. Alla carta: Antipasti €10-16, Primi fatti a mano €14-20, Secondi €18-28. Opzioni vegetariane e senza glutine sempre disponibili.',
        faqs: [
          {
            question: 'Avete opzioni per celiaci o intolleranze alimentari?',
            answer: 'Assolutamente sì! La nostra cucina prepara piatti dedicati senza glutine e senza lattosio con postazione separata. Segnalalo nella prenotazione.',
          },
          {
            question: 'Accettate cani nel locale?',
            answer: 'Sì, gli amici a quattro zampe educati sono sempre i benvenuti sia nella sala interna che nel dehors esterno.',
          },
          {
            question: 'È possibile prenotare per gruppi o feste di laurea/compleanno?',
            answer: 'Certamente! Per gruppi superiori a 8 persone possiamo concordare anche menu dedicati personalizzati.',
          },
        ],
      };
    case 'commercialisti':
    case 'studi_legali':
      return {
        agentName: `Segreteria Digitale AI - ${companyName}`,
        welcomeMessage: `Buongiorno! Benvenuto nello studio *${companyName}* di ${city}. Sono l'assistente di segreteria attivo 24/7: posso fornirti informazioni sui nostri servizi, verificare la documentazione necessaria o fissare un appuntamento conoscitivo in sede o in videochiamata.`,
        businessHours: 'Lunedì - Venerdì: 09:00 - 13:00 e 14:30 - 18:30 (Sabato e Domenica chiuso)',
        addressInfo: `${loc} (Zona facilmente raggiungibile con mezzi pubblici e parcheggio clienti)`,
        pricingMenuInfo: 'Prima consulenza di inquadramento (30 min): €80 (scontata integralmente in caso di conferimento incarico). Gestione Forfettari: da €60/mese. Gestione SRL e PMI: piano personalizzato su misura.',
        faqs: [
          {
            question: 'Fate anche consulenze online in videochiamata?',
            answer: 'Sì, effettuiamo regolarmente consulenze su Google Meet o Zoom con condivisione schermo per la massima comodità.',
          },
          {
            question: 'Quali documenti servono per il primo colloquio?',
            answer: 'Per il primo incontro conoscitivo bastano visura camerale (se già attivo), ultima dichiarazione dei redditi e documento d identità.',
          },
          {
            question: 'Seguite anche l apertura di nuove Partite IVA e Startup?',
            answer: 'Sì, gestiamo l intero iter di apertura in 24/48h, inclusa analisi di fattibilità, scelta regime fiscale e iscrizione Camera di Commercio/INPS.',
          },
        ],
      };
    default:
      return {
        agentName: `Assistente Clienti 24/7 - ${companyName}`,
        welcomeMessage: `Ciao! 👋 Grazie per aver scritto a *${companyName}* (${city}). Sono l'assistente intelligente sempre attivo: rispondo subito a domande su servizi, listino prezzi, disponibilità e posso fissare direttamente il tuo appuntamento!`,
        businessHours: 'Lunedì - Sabato: 09:00 - 19:30 (Domenica chiuso)',
        addressInfo: `${loc}`,
        pricingMenuInfo: 'Check-up / Prima valutazione: Gratuita su appuntamento. Intervento / Servizio Standard: da €45. Pacchetti completi su misura con preventivo trasparente prima di ogni lavorazione.',
        faqs: [
          {
            question: 'Come posso prenotare un appuntamento veloce?',
            answer: 'Ti basta scriverci qui in chat il giorno e la fascia oraria che preferisci (mattina o pomeriggio) e ti confermiamo subito la disponibilità!',
          },
          {
            question: 'Quali metodi di pagamento accettate?',
            answer: 'Accettiamo carte di credito/debito, Bancomat, Satispay, bonifico bancario e contanti.',
          },
          {
            question: 'Rilasciate preventivo gratuito prima di iniziare?',
            answer: 'Certamente, ogni nostro servizio viene sempre preceduto da un riepilogo chiaro e trasparente dei costi senza sorprese.',
          },
        ],
      };
  }
}

export async function getWhatsappAgent(companyId?: string) {
  let targetCompanyId = companyId;
  if (!targetCompanyId) {
    const firstAgent = db.select().from(localWhatsappAgents).orderBy(desc(localWhatsappAgents.updatedAt)).get();
    if (firstAgent) targetCompanyId = firstAgent.companyId;
  }
  if (!targetCompanyId) return null;

  const existing = db
    .select({
      agent: localWhatsappAgents,
      companyName: companies.name,
      companySector: companies.sector,
      companyCity: companies.city,
    })
    .from(localWhatsappAgents)
    .leftJoin(companies, eq(localWhatsappAgents.companyId, companies.id))
    .where(eq(localWhatsappAgents.companyId, targetCompanyId))
    .get();

  if (!existing) return null;

  return {
    ...existing.agent,
    faqs: existing.agent.faqJson ? (JSON.parse(existing.agent.faqJson) as WhatsappFaqItem[]) : [],
    companyName: existing.companyName,
    companySector: existing.companySector,
    companyCity: existing.companyCity,
  };
}

export async function upsertWhatsappAgent(
  input: UpsertWhatsappAgentInput,
  user: UserSessionPayload
) {
  const comp = db.select().from(companies).where(eq(companies.id, input.companyId)).get();
  const companyName = comp ? comp.name : 'Attività Locale';
  const sector = comp?.sector || 'local_services';
  const city = comp?.city || 'Milano';

  const preset = getSectorWhatsappPreset(sector, companyName, city, comp?.address, comp?.phone);

  const existing = db
    .select()
    .from(localWhatsappAgents)
    .where(eq(localWhatsappAgents.companyId, input.companyId))
    .get();

  const now = new Date().toISOString();

  if (!existing) {
    const id = `wa_agt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const verifyToken = `vrf_${crypto.randomBytes(8).toString('hex')}`;

    const newAgent: LocalWhatsappAgent = {
      id,
      companyId: input.companyId,
      agentName: input.agentName || preset.agentName,
      whatsappPhone: input.whatsappPhone || comp?.phone || '+39 348 9001122',
      status: input.status || 'attivo',
      welcomeMessage: input.autoGenerateKnowledgeBase
        ? preset.welcomeMessage
        : (input.welcomeMessage || preset.welcomeMessage),
      businessHours: input.autoGenerateKnowledgeBase
        ? preset.businessHours
        : (input.businessHours ?? preset.businessHours),
      addressInfo: input.autoGenerateKnowledgeBase
        ? preset.addressInfo
        : (input.addressInfo ?? preset.addressInfo),
      pricingMenuInfo: input.autoGenerateKnowledgeBase
        ? preset.pricingMenuInfo
        : (input.pricingMenuInfo ?? preset.pricingMenuInfo),
      faqJson: JSON.stringify(
        input.autoGenerateKnowledgeBase ? preset.faqs : (input.faqs || preset.faqs)
      ),
      bookingEnabled: input.bookingEnabled !== undefined ? input.bookingEnabled : true,
      leadCaptureEnabled: input.leadCaptureEnabled !== undefined ? input.leadCaptureEnabled : true,
      escalationPhone: input.escalationPhone || comp?.phone || '+39 02 5550199',
      toneOfVoice: input.toneOfVoice || 'cordiale_locale',
      webhookVerifyToken: verifyToken,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(localWhatsappAgents).values(newAgent).run();

    await logActivity({
      entityType: 'local_whatsapp_agents',
      entityId: id,
      action: 'whatsapp_agent_created',
      performedBy: user.userId,
      details: { companyId: input.companyId, agentName: newAgent.agentName },
    });

    return {
      ...newAgent,
      faqs: JSON.parse(newAgent.faqJson || '[]') as WhatsappFaqItem[],
      companyName,
      companySector: sector,
      companyCity: city,
    };
  } else {
    const updateData: Partial<LocalWhatsappAgent> = {
      updatedAt: now,
    };

    if (input.autoGenerateKnowledgeBase) {
      updateData.agentName = preset.agentName;
      updateData.welcomeMessage = preset.welcomeMessage;
      updateData.businessHours = preset.businessHours;
      updateData.addressInfo = preset.addressInfo;
      updateData.pricingMenuInfo = preset.pricingMenuInfo;
      updateData.faqJson = JSON.stringify(preset.faqs);
    } else {
      if (input.agentName !== undefined) updateData.agentName = input.agentName;
      if (input.whatsappPhone !== undefined) updateData.whatsappPhone = input.whatsappPhone;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.welcomeMessage !== undefined) updateData.welcomeMessage = input.welcomeMessage;
      if (input.businessHours !== undefined) updateData.businessHours = input.businessHours;
      if (input.addressInfo !== undefined) updateData.addressInfo = input.addressInfo;
      if (input.pricingMenuInfo !== undefined) updateData.pricingMenuInfo = input.pricingMenuInfo;
      if (input.faqs !== undefined) updateData.faqJson = JSON.stringify(input.faqs);
      if (input.bookingEnabled !== undefined) updateData.bookingEnabled = input.bookingEnabled;
      if (input.leadCaptureEnabled !== undefined) updateData.leadCaptureEnabled = input.leadCaptureEnabled;
      if (input.escalationPhone !== undefined) updateData.escalationPhone = input.escalationPhone;
      if (input.toneOfVoice !== undefined) updateData.toneOfVoice = input.toneOfVoice;
    }

    db.update(localWhatsappAgents)
      .set(updateData)
      .where(eq(localWhatsappAgents.id, existing.id))
      .run();

    const merged = { ...existing, ...updateData };

    await logActivity({
      entityType: 'local_whatsapp_agents',
      entityId: existing.id,
      action: 'whatsapp_agent_updated',
      performedBy: user.userId,
      details: { companyId: input.companyId, autoGenerateKnowledgeBase: !!input.autoGenerateKnowledgeBase },
    });

    return {
      ...merged,
      faqs: JSON.parse(merged.faqJson || '[]') as WhatsappFaqItem[],
      companyName,
      companySector: sector,
      companyCity: city,
    };
  }
}

export async function listWhatsappConversations(params: {
  companyId?: string;
  status?: string;
  intentDetected?: string;
}) {
  const conditions = [];
  if (params.companyId) conditions.push(eq(localWhatsappConversations.companyId, params.companyId));
  if (params.status) conditions.push(eq(localWhatsappConversations.status, params.status as any));
  if (params.intentDetected) {
    conditions.push(eq(localWhatsappConversations.intentDetected, params.intentDetected as any));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const raw = db
    .select({
      conv: localWhatsappConversations,
      companyName: companies.name,
    })
    .from(localWhatsappConversations)
    .leftJoin(companies, eq(localWhatsappConversations.companyId, companies.id))
    .where(whereClause)
    .orderBy(desc(localWhatsappConversations.lastMessageAt))
    .limit(100)
    .all();

  return raw.map((r) => ({
    ...r.conv,
    messages: r.conv.messagesJson ? (JSON.parse(r.conv.messagesJson) as WhatsappMessageItem[]) : [],
    companyName: r.companyName,
  }));
}

export async function simulateIncomingWhatsappMessage(
  input: {
    companyId: string;
    customerName: string;
    customerPhone: string;
    messageText: string;
    conversationId?: string;
  },
  user: UserSessionPayload
) {
  // Ensure agent exists for company
  let agent = await getWhatsappAgent(input.companyId);
  if (!agent) {
    agent = await upsertWhatsappAgent(
      { companyId: input.companyId, autoGenerateKnowledgeBase: true },
      user
    );
  }

  const comp = db.select().from(companies).where(eq(companies.id, input.companyId)).get();
  const companyName = comp ? comp.name : 'La Nostra Attività';
  const sector = (comp?.sector as any) || 'local_services';
  const city = comp?.city || 'Milano';

  const lower = input.messageText.toLowerCase();

  let intent: 'info_orari_indirizzo' | 'preventivo_listino' | 'prenotazione_appuntamento' | 'assistenza_reclamo' | 'altro' = 'info_orari_indirizzo';
  let status: 'risolta_ai' | 'in_corso' | 'richiede_operatore' | 'prenotazione_confermata' = 'risolta_ai';
  let aiReply = '';

  if (
    lower.includes('prenot') ||
    lower.includes('tavolo') ||
    lower.includes('appuntament') ||
    lower.includes('domani') ||
    lower.includes('stasera') ||
    lower.includes('posto') ||
    lower.includes('disponibil')
  ) {
    intent = 'prenotazione_appuntamento';
    status = agent.bookingEnabled ? 'prenotazione_confermata' : 'in_corso';
    aiReply = `Perfetto ${input.customerName}! ✅ Ho registrato la tua richiesta di prenotazione presso *${companyName}*.\n\n📍 Indirizzo: ${agent.addressInfo || city}\n🕒 Orari: ${agent.businessHours || 'Lun-Sab'}\n\nLa tua prenotazione è stata *confermata in agenda*! Riceverai un promemoria automatico e per qualsiasi variazione puoi scriverci direttamente qui su WhatsApp. A presto!`;
  } else if (
    lower.includes('prezz') ||
    lower.includes('cost') ||
    lower.includes('listin') ||
    lower.includes('preventiv') ||
    lower.includes('menu') ||
    lower.includes('quanto') ||
    lower.includes('offerta')
  ) {
    intent = 'preventivo_listino';
    status = 'risolta_ai';
    aiReply = `Ciao ${input.customerName}! Ecco i dettagli aggiornati su prezzi e proposte di *${companyName}*:\n\n📋 ${agent.pricingMenuInfo || 'Listino personalizzato su misura.'}\n\nSe desideri bloccare subito la tua disponibilità o ricevere una proposta dedicata, rispondi pure con il giorno che preferisci!`;
  } else if (
    lower.includes('problem') ||
    lower.includes('reclam') ||
    lower.includes('operatore') ||
    lower.includes('umano') ||
    lower.includes('urgente') ||
    lower.includes('parlare')
  ) {
    intent = 'assistenza_reclamo';
    status = 'richiede_operatore';
    aiReply = `Grazie per averci scritto ${input.customerName}. Ho inoltrato immediatamente la tua richiesta con *priorità alta* a un nostro responsabile di *${companyName}* (${agent.escalationPhone || 'Direzione'}), che ti risponderà personalmente qui in chat tra pochissimi minuti.`;
  } else {
    intent = 'info_orari_indirizzo';
    status = 'risolta_ai';
    // Check if matches any FAQ
    const matchedFaq = (agent.faqs || []).find((f) => {
      const words = f.question.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
      return words.some((w) => lower.includes(w));
    });
    if (matchedFaq) {
      aiReply = `Ciao ${input.customerName}! 😊\n\n${matchedFaq.answer}\n\n📍 Ci trovi in: ${agent.addressInfo}\n🕒 Orari: ${agent.businessHours}\n\nPosso aiutarti anche a fissare un appuntamento o prenotazione?`;
    } else {
      aiReply = `Ciao ${input.customerName}! Benvenuto da *${companyName}* 👋\n\n🕒 *I nostri orari*: ${agent.businessHours}\n📍 *Dove siamo*: ${agent.addressInfo}\n💡 *Info utili*: ${agent.pricingMenuInfo}\n\nScrivimi pure se vuoi prenotare o hai una domanda specifica!`;
    }
  }

  const now = new Date();
  const userMsgTime = now.toISOString();
  const aiMsgTime = new Date(now.getTime() + 1200).toISOString();

  let linkedLeadId: string | null = null;
  let linkedAppointmentId: string | null = null;

  // Automatic CRM Lead Capture & Appointment Creation
  if (agent.leadCaptureEnabled && (intent === 'prenotazione_appuntamento' || intent === 'preventivo_listino')) {
    const validSectors = ['studi_legali', 'commercialisti', 'horeca_ristoranti', 'horeca_hotel', 'ecommerce', 'local_services'];
    const leadSector = validSectors.includes(sector) ? sector : 'local_services';
    const newLeadId = `lead_wa_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    db.insert(leads)
      .values({
        id: newLeadId,
        companyName: `${input.customerName} (Cliente WhatsApp - ${companyName})`,
        source: 'sito',
        sector: leadSector,
        score: intent === 'prenotazione_appuntamento' ? 90 : 75,
        status: 'qualificato',
        phone: input.customerPhone,
        city,
        notes: `[WhatsApp AI 24/7] Contatto acquisito automaticamente per ${companyName}. Messaggio cliente: "${input.messageText}"`,
        marketingConsentStatus: 'granted',
        createdAt: userMsgTime,
        updatedAt: userMsgTime,
      })
      .run();
    linkedLeadId = newLeadId;
  }

  if (agent.bookingEnabled && intent === 'prenotazione_appuntamento') {
    const newApptId = `appt_wa_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const tomorrow = new Date(now.getTime() + 86400000);
    tomorrow.setUTCHours(18, 30, 0, 0);
    const endTomorrow = new Date(tomorrow.getTime() + 3600000);

    db.insert(crmAppointments)
      .values({
        id: newApptId,
        leadId: linkedLeadId,
        companyId: input.companyId,
        title: `Prenotazione WhatsApp: ${input.customerName} (${companyName})`,
        description: `Prenotazione generata automaticamente dall'Agente WhatsApp AI 24/7.\nRichiesta cliente: "${input.messageText}"\nTelefono: ${input.customerPhone}`,
        appointmentType: 'in_person_meeting',
        status: 'confirmed',
        scheduledStartTime: tomorrow.toISOString(),
        scheduledEndTime: endTomorrow.toISOString(),
        locationType: 'client_office',
        meetingAddress: agent.addressInfo || city,
        organizerUserId: user.userId,
        attendeesJson: JSON.stringify([{ name: input.customerName, phone: input.customerPhone }]),
        outcomeNotes: `Confermato in automatico da ${agent.agentName}`,
        createdAt: userMsgTime,
        updatedAt: userMsgTime,
      })
      .run();
    linkedAppointmentId = newApptId;
  }

  if (input.conversationId) {
    const existingConv = db
      .select()
      .from(localWhatsappConversations)
      .where(eq(localWhatsappConversations.id, input.conversationId))
      .get();

    if (existingConv) {
      const prevMessages: WhatsappMessageItem[] = existingConv.messagesJson
        ? JSON.parse(existingConv.messagesJson)
        : [];
      const updatedMessages: WhatsappMessageItem[] = [
        ...prevMessages,
        { role: 'customer', text: input.messageText, timestamp: userMsgTime },
        { role: 'agent_ai', text: aiReply, timestamp: aiMsgTime },
      ];

      db.update(localWhatsappConversations)
        .set({
          intentDetected: intent,
          status,
          messagesJson: JSON.stringify(updatedMessages),
          linkedLeadId: linkedLeadId || existingConv.linkedLeadId,
          linkedAppointmentId: linkedAppointmentId || existingConv.linkedAppointmentId,
          lastMessageAt: aiMsgTime,
          updatedAt: aiMsgTime,
        })
        .where(eq(localWhatsappConversations.id, existingConv.id))
        .run();

      return {
        ...existingConv,
        intentDetected: intent,
        status,
        messages: updatedMessages,
        linkedLeadId: linkedLeadId || existingConv.linkedLeadId,
        linkedAppointmentId: linkedAppointmentId || existingConv.linkedAppointmentId,
        lastMessageAt: aiMsgTime,
      };
    }
  }

  const convId = `wa_conv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const messages: WhatsappMessageItem[] = [
    { role: 'customer', text: input.messageText, timestamp: userMsgTime },
    { role: 'agent_ai', text: aiReply, timestamp: aiMsgTime },
  ];

  const newConv: LocalWhatsappConversation = {
    id: convId,
    agentId: agent.id,
    companyId: input.companyId,
    customerPhone: input.customerPhone,
    customerName: input.customerName,
    intentDetected: intent,
    status,
    messagesJson: JSON.stringify(messages),
    linkedLeadId,
    linkedAppointmentId,
    lastMessageAt: aiMsgTime,
    createdAt: userMsgTime,
    updatedAt: aiMsgTime,
  };

  db.insert(localWhatsappConversations).values(newConv).run();

  await logActivity({
    entityType: 'local_whatsapp_conversations',
    entityId: convId,
    action: 'whatsapp_ai_conversation_handled',
    performedBy: user.userId,
    details: {
      customerName: input.customerName,
      intent,
      status,
      linkedLeadId,
      linkedAppointmentId,
    },
  });

  return {
    ...newConv,
    messages,
    companyName,
  };
}

export async function replyWhatsappConversationAsOperator(
  conversationId: string,
  replyText: string,
  newStatus: 'risolta_ai' | 'in_corso' | 'richiede_operatore' | 'prenotazione_confermata' | undefined,
  user: UserSessionPayload
) {
  const existing = db
    .select()
    .from(localWhatsappConversations)
    .where(eq(localWhatsappConversations.id, conversationId))
    .get();
  if (!existing) return null;

  const now = new Date().toISOString();
  const prevMessages: WhatsappMessageItem[] = existing.messagesJson
    ? JSON.parse(existing.messagesJson)
    : [];
  const updatedMessages: WhatsappMessageItem[] = [
    ...prevMessages,
    { role: 'operator', text: replyText, timestamp: now },
  ];

  const finalStatus = newStatus || 'risolta_ai';

  db.update(localWhatsappConversations)
    .set({
      messagesJson: JSON.stringify(updatedMessages),
      status: finalStatus,
      lastMessageAt: now,
      updatedAt: now,
    })
    .where(eq(localWhatsappConversations.id, conversationId))
    .run();

  await logActivity({
    entityType: 'local_whatsapp_conversations',
    entityId: conversationId,
    action: 'whatsapp_operator_reply_sent',
    performedBy: user.userId,
    details: { status: finalStatus },
  });

  return {
    ...existing,
    status: finalStatus,
    messages: updatedMessages,
    lastMessageAt: now,
  };
}

export async function seedSampleWhatsappConversations(companyId: string, user: UserSessionPayload) {
  const samples = [
    {
      customerName: 'Alessandro Conti',
      customerPhone: '+39 347 8821904',
      messageText: 'Ciao! Vorrei prenotare per domani sera per 4 persone, avete disponibilità?',
    },
    {
      customerName: 'Laura Marchetti',
      customerPhone: '+39 339 4102938',
      messageText: 'Buongiorno, vorrei sapere quali sono i vostri prezzi e se posso avere un preventivo.',
    },
    {
      customerName: 'Davide Galli',
      customerPhone: '+39 328 7761239',
      messageText: 'Siete aperti oggi? Dove vi trovate esattamente e c è parcheggio vicino?',
    },
  ];

  const created = [];
  for (const s of samples) {
    const conv = await simulateIncomingWhatsappMessage(
      {
        companyId,
        customerName: s.customerName,
        customerPhone: s.customerPhone,
        messageText: s.messageText,
      },
      user
    );
    created.push(conv);
  }
  return created;
}

// ============================================================================
// FASE 4: SITO VETRINA & BLOG SEO LOCALE AUTOMATIZZATO
// ============================================================================

export interface ServiceShowcaseItem {
  name: string;
  description: string;
  priceLabel: string;
  badge?: string;
}

export interface UpsertLocalWebsiteInput {
  companyId: string;
  domainUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  primaryCtaText?: string;
  targetCity?: string;
  targetKeywords?: string[];
  servicesShowcase?: ServiceShowcaseItem[];
  status?: 'bozza' | 'online' | 'in_aggiornamento';
  autoOptimizeAi?: boolean;
}

function getSectorWebsitePreset(sector: string, companyName: string, city: string, phone?: string | null, address?: string | null) {
  const cleanSlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const domainUrl = `https://www.${cleanSlug}-${city.toLowerCase().replace(/\s+/g, '')}.it`;

  let heroTitle = `${companyName} a ${city}: Eccellenza e Qualità al Tuo Servizio`;
  let heroSubtitle = `Il punto di riferimento a ${city} per chi cerca professionalità, rapidità e risultati garantiti. Prenota ora su WhatsApp o vieni a trovarci in sede.`;
  let primaryCtaText = 'Prenota Ora su WhatsApp';
  let targetKeywords: string[] = [];
  let servicesShowcase: ServiceShowcaseItem[] = [];
  let schemaType = 'LocalBusiness';

  if (sector === 'horeca_ristoranti') {
    schemaType = 'Restaurant';
    heroTitle = `${companyName}: Ristorante Tipico ed Esperienza Gourmet a ${city}`;
    heroSubtitle = `Ingredienti freschi selezionati ogni mattina dai produttori del territorio, pasta fatta a mano e carta dei vini d'eccellenza nel cuore di ${city}.`;
    primaryCtaText = 'Prenota il Tuo Tavolo su WhatsApp';
    targetKeywords = [
      `ristorante tipico ${city}`,
      `dove mangiare a ${city} centro`,
      `miglior ristorante ${city}`,
      `business lunch ${city}`,
      `cena romantica ${city}`,
      `cucina tradizionale ${city}`,
      `ristorante senza glutine ${city}`,
      `prenotazione tavolo ${city}`,
    ];
    servicesShowcase = [
      {
        name: 'Menu Degustazione del Territorio',
        description: 'Percorso completo di 4 portate con i piatti iconici della tradizione e calice abbinato dal nostro sommelier.',
        priceLabel: '€ 42 / persona',
        badge: 'Più Richiesto',
      },
      {
        name: 'Business Lunch Veloce & Gourmet',
        description: 'Dal martedì al venerdì a pranzo: piatto unico bilanciato o primo + contorno con servizio rapido in 40 minuti.',
        priceLabel: '€ 18',
        badge: 'Lun-Ven',
      },
      {
        name: 'Eventi Privati, Lauree & Cene Aziendali',
        description: 'Sala riservata e menu personalizzati per festeggiare ricorrenze speciali o incontri di lavoro a ' + city + '.',
        priceLabel: 'Su Misura',
      },
    ];
  } else if (sector === 'commercialisti' || sector === 'studi_legali') {
    schemaType = 'ProfessionalService';
    heroTitle = `Studio ${companyName} a ${city}: Consulenza Fiscale, Societaria e Legale per PMI`;
    heroSubtitle = `Affianchiamo imprenditori, professionisti e startup a ${city} con pianificazione fiscale strategica, controllo di gestione e tutela patrimoniale.`;
    primaryCtaText = 'Richiedi Prima Consulenza in Studio o Online';
    targetKeywords = [
      `commercialista ${city}`,
      `studio consulenza fiscale ${city}`,
      `apertura partita iva ${city}`,
      `consulenza societaria PMI ${city}`,
      `pianificazione fiscale ${city}`,
      `controllo di gestione ${city}`,
      `avvocato d affari ${city}`,
      `bandi e agevolazioni imprese ${city}`,
    ];
    servicesShowcase = [
      {
        name: 'Apertura Partita IVA & Startup Check-up',
        description: 'Analisi di inquadramento fiscale, scelta regime agevolato e apertura telematica rapida in 24/48 ore.',
        priceLabel: 'Da € 60 / mese',
        badge: 'Ideale per Nuove Attività',
      },
      {
        name: 'Pianificazione Fiscale & Gestione SRL',
        description: 'Bilanci periodici, ottimizzazione del carico fiscale nel pieno rispetto normativo e consulenza continuativa.',
        priceLabel: 'Piano Dedicato PMI',
        badge: 'Best Seller',
      },
      {
        name: 'Bandi, Finanza Agevolata & Crediti d Imposta',
        description: 'Monitoraggio e istruttoria completa per accedere ai fondi regionali e nazionali per le imprese di ' + city + '.',
        priceLabel: 'Valutazione Preliminare',
      },
    ];
  } else {
    targetKeywords = [
      `${companyName.toLowerCase()} ${city}`,
      `migliori servizi ${city}`,
      `preventivo gratuito ${city}`,
      `assistenza specializzata ${city}`,
      `professionisti certificati ${city}`,
      `prenotazione appuntamento ${city}`,
    ];
    servicesShowcase = [
      {
        name: 'Check-up & Valutazione Personalizzata',
        description: `Analisi approfondita delle tue esigenze presso la nostra sede di ${city} con preventivo chiaro e immediato.`,
        priceLabel: 'Gratuito su Appuntamento',
        badge: 'Consigliato',
      },
      {
        name: 'Servizio Completo Chiavi in Mano',
        description: 'Gestione integrale con materiali certificati, tempistiche garantite e assistenza dedicata post-servizio.',
        priceLabel: 'Da € 49',
        badge: 'Più Scelto',
      },
      {
        name: 'Programma Manutenzione & Assistenza Prioritaria',
        description: 'Pacchetto annuale pensato per clienti locali con canale WhatsApp diretto 24/7 e tariffe agevolate.',
        priceLabel: 'Abbonamento Smart',
      },
    ];
  }

  const schemaMarkup = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: companyName,
    url: domainUrl,
    telephone: phone || '+39 02 5550199',
    address: {
      '@type': 'PostalAddress',
      streetAddress: address || 'Via Roma 10',
      addressLocality: city,
      addressCountry: 'IT',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '45.4642',
      longitude: '9.1900',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '09:00',
        closes: '20:00',
      },
    ],
    priceRange: '€€',
  };

  return {
    domainUrl,
    heroTitle,
    heroSubtitle,
    primaryCtaText,
    targetCity: city,
    targetKeywords,
    servicesShowcase,
    schemaMarkupJson: JSON.stringify(schemaMarkup, null, 2),
  };
}

export function buildPublicVetrinaSlug(companyName: string, city?: string | null): string {
  const base = `${companyName} ${city || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base || 'attivita-locale';
}

export async function getLocalWebsite(companyId?: string) {
  let targetCompanyId = companyId;
  if (!targetCompanyId) {
    const first = db.select().from(localSeoWebsites).orderBy(desc(localSeoWebsites.updatedAt)).get();
    if (first) targetCompanyId = first.companyId;
  }
  if (!targetCompanyId) return null;

  const existing = db
    .select({
      web: localSeoWebsites,
      companyName: companies.name,
      companySector: companies.sector,
      companyCity: companies.city,
    })
    .from(localSeoWebsites)
    .leftJoin(companies, eq(localSeoWebsites.companyId, companies.id))
    .where(eq(localSeoWebsites.companyId, targetCompanyId))
    .get();

  if (!existing) return null;

  const publicSlug = buildPublicVetrinaSlug(
    existing.companyName || 'Attività Locale',
    existing.web.targetCity || existing.companyCity
  );

  return {
    ...existing.web,
    targetKeywords: existing.web.targetKeywordsJson ? (JSON.parse(existing.web.targetKeywordsJson) as string[]) : [],
    servicesShowcase: existing.web.servicesShowcaseJson
      ? (JSON.parse(existing.web.servicesShowcaseJson) as ServiceShowcaseItem[])
      : [],
    companyName: existing.companyName,
    companySector: existing.companySector,
    publicSlug,
    publicUrl: `/vetrina/${publicSlug}`,
  };
}

export async function generateOrUpdateLocalWebsite(
  input: UpsertLocalWebsiteInput,
  user: UserSessionPayload
) {
  const comp = db.select().from(companies).where(eq(companies.id, input.companyId)).get();
  const companyName = comp ? comp.name : 'Attività Locale';
  const sector = comp?.sector || 'local_services';
  const city = input.targetCity || comp?.city || 'Milano';

  const preset = getSectorWebsitePreset(sector, companyName, city, comp?.phone, comp?.address);
  const publicSlug = buildPublicVetrinaSlug(companyName, city);

  const existing = db
    .select()
    .from(localSeoWebsites)
    .where(eq(localSeoWebsites.companyId, input.companyId))
    .get();

  const now = new Date().toISOString();

  if (!existing) {
    const id = `seo_web_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const newWeb: LocalSeoWebsite = {
      id,
      companyId: input.companyId,
      domainUrl: input.domainUrl || preset.domainUrl,
      heroTitle: input.autoOptimizeAi ? preset.heroTitle : (input.heroTitle || preset.heroTitle),
      heroSubtitle: input.autoOptimizeAi ? preset.heroSubtitle : (input.heroSubtitle || preset.heroSubtitle),
      primaryCtaText: input.primaryCtaText || preset.primaryCtaText,
      targetCity: city,
      targetKeywordsJson: JSON.stringify(
        input.autoOptimizeAi ? preset.targetKeywords : (input.targetKeywords || preset.targetKeywords)
      ),
      servicesShowcaseJson: JSON.stringify(
        input.autoOptimizeAi ? preset.servicesShowcase : (input.servicesShowcase || preset.servicesShowcase)
      ),
      schemaMarkupJson: preset.schemaMarkupJson,
      seoHealthScore: 96,
      status: input.status || 'online',
      createdAt: now,
      updatedAt: now,
    };

    db.insert(localSeoWebsites).values(newWeb).run();

    await logActivity({
      entityType: 'local_seo_websites',
      entityId: id,
      action: 'local_seo_website_created',
      performedBy: user.userId,
      details: { companyId: input.companyId, domainUrl: newWeb.domainUrl, targetCity: city, publicSlug },
    });

    return {
      ...newWeb,
      targetKeywords: JSON.parse(newWeb.targetKeywordsJson || '[]') as string[],
      servicesShowcase: JSON.parse(newWeb.servicesShowcaseJson || '[]') as ServiceShowcaseItem[],
      companyName,
      companySector: sector,
      publicSlug,
      publicUrl: `/vetrina/${publicSlug}`,
    };
  } else {
    const updateData: Partial<LocalSeoWebsite> = {
      updatedAt: now,
      seoHealthScore: 97,
    };

    if (input.autoOptimizeAi) {
      updateData.domainUrl = preset.domainUrl;
      updateData.heroTitle = preset.heroTitle;
      updateData.heroSubtitle = preset.heroSubtitle;
      updateData.primaryCtaText = preset.primaryCtaText;
      updateData.targetCity = city;
      updateData.targetKeywordsJson = JSON.stringify(preset.targetKeywords);
      updateData.servicesShowcaseJson = JSON.stringify(preset.servicesShowcase);
      updateData.schemaMarkupJson = preset.schemaMarkupJson;
    } else {
      if (input.domainUrl !== undefined) updateData.domainUrl = input.domainUrl;
      if (input.heroTitle !== undefined) updateData.heroTitle = input.heroTitle;
      if (input.heroSubtitle !== undefined) updateData.heroSubtitle = input.heroSubtitle;
      if (input.primaryCtaText !== undefined) updateData.primaryCtaText = input.primaryCtaText;
      if (input.targetCity !== undefined) updateData.targetCity = input.targetCity;
      if (input.targetKeywords !== undefined) updateData.targetKeywordsJson = JSON.stringify(input.targetKeywords);
      if (input.servicesShowcase !== undefined) updateData.servicesShowcaseJson = JSON.stringify(input.servicesShowcase);
      if (input.status !== undefined) updateData.status = input.status;
    }

    db.update(localSeoWebsites)
      .set(updateData)
      .where(eq(localSeoWebsites.id, existing.id))
      .run();

    const merged = { ...existing, ...updateData };
    const finalSlug = buildPublicVetrinaSlug(companyName, merged.targetCity || city);

    await logActivity({
      entityType: 'local_seo_websites',
      entityId: existing.id,
      action: 'local_seo_website_updated',
      performedBy: user.userId,
      details: { companyId: input.companyId, autoOptimizeAi: !!input.autoOptimizeAi, publicSlug: finalSlug },
    });

    return {
      ...merged,
      targetKeywords: JSON.parse(merged.targetKeywordsJson || '[]') as string[],
      servicesShowcase: JSON.parse(merged.servicesShowcaseJson || '[]') as ServiceShowcaseItem[],
      companyName,
      companySector: sector,
      publicSlug: finalSlug,
      publicUrl: `/vetrina/${finalSlug}`,
    };
  }
}

export async function generateLocalSeoArticlesBatch(
  input: {
    companyId: string;
    targetCity?: string;
    sector?: string;
    count?: number;
  },
  user: UserSessionPayload
): Promise<LocalSeoArticle[]> {
  const comp = db.select().from(companies).where(eq(companies.id, input.companyId)).get();
  const companyName = comp ? comp.name : 'La Nostra Attività';
  const sector = input.sector || comp?.sector || 'local_services';
  const city = input.targetCity || comp?.city || 'Milano';
  const count = Math.min(Math.max(input.count || 4, 1), 8);

  // Ensure website record exists
  let website = await getLocalWebsite(input.companyId);
  if (!website) {
    website = await generateOrUpdateLocalWebsite(
      { companyId: input.companyId, targetCity: city, autoOptimizeAi: true },
      user
    );
  }

  const templates = getLocalSeoArticleTemplates(sector, companyName, city);
  const created: LocalSeoArticle[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < count; i++) {
    const tpl = templates[i % templates.length];
    const id = `seo_art_${Date.now()}_${crypto.randomBytes(3).toString('hex')}_${i}`;
    const slug = `${tpl.slugBase}-${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    const article: LocalSeoArticle = {
      id,
      companyId: input.companyId,
      websiteId: website.id,
      title: tpl.title,
      slug,
      targetKeyword: tpl.targetKeyword,
      targetCity: city,
      metaTitle: tpl.metaTitle.slice(0, 65),
      metaDescription: tpl.metaDescription.slice(0, 160),
      excerpt: tpl.excerpt,
      contentHtml: tpl.contentHtml,
      readingTimeMinutes: tpl.readingTimeMinutes,
      seoScore: tpl.seoScore,
      publishStatus: 'pubblicato',
      publishedAt: now,
      createdById: user.userId,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(localSeoArticles).values(article).run();
    created.push(article);
  }

  await logActivity({
    entityType: 'local_seo_articles',
    entityId: input.companyId,
    action: 'local_seo_articles_batch_generated',
    performedBy: user.userId,
    details: { count: created.length, city, companyName },
  });

  return created;
}

export async function listLocalSeoArticles(params: {
  companyId?: string;
  publishStatus?: string;
}) {
  const conditions = [];
  if (params.companyId) conditions.push(eq(localSeoArticles.companyId, params.companyId));
  if (params.publishStatus) conditions.push(eq(localSeoArticles.publishStatus, params.publishStatus as any));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const raw = db
    .select({
      article: localSeoArticles,
      companyName: companies.name,
    })
    .from(localSeoArticles)
    .leftJoin(companies, eq(localSeoArticles.companyId, companies.id))
    .where(whereClause)
    .orderBy(desc(localSeoArticles.createdAt))
    .limit(100)
    .all();

  return raw.map((r) => ({
    ...r.article,
    companyName: r.companyName,
  }));
}

export async function createLocalSeoArticle(
  input: {
    companyId: string;
    title: string;
    targetKeyword: string;
    targetCity?: string;
    metaTitle?: string;
    metaDescription?: string;
    excerpt?: string;
    contentHtml: string;
    publishStatus?: 'bozza' | 'approvato' | 'pubblicato' | 'indicizzato';
  },
  user: UserSessionPayload
): Promise<LocalSeoArticle> {
  const comp = db.select().from(companies).where(eq(companies.id, input.companyId)).get();
  const city = input.targetCity || comp?.city || 'Milano';
  const now = new Date().toISOString();
  const id = `seo_art_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const slug = input.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const article: LocalSeoArticle = {
    id,
    companyId: input.companyId,
    websiteId: null,
    title: input.title,
    slug,
    targetKeyword: input.targetKeyword,
    targetCity: city,
    metaTitle: input.metaTitle || `${input.title} | ${comp?.name || city}`,
    metaDescription: input.metaDescription || input.excerpt || input.title,
    excerpt: input.excerpt || input.contentHtml.replace(/<[^>]+>/g, '').slice(0, 180) + '...',
    contentHtml: input.contentHtml,
    readingTimeMinutes: Math.max(2, Math.round(input.contentHtml.split(/\s+/).length / 180)),
    seoScore: 94,
    publishStatus: input.publishStatus || 'pubblicato',
    publishedAt: now,
    createdById: user.userId,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(localSeoArticles).values(article).run();

  await logActivity({
    entityType: 'local_seo_articles',
    entityId: id,
    action: 'local_seo_article_created',
    performedBy: user.userId,
    details: { title: input.title, targetKeyword: input.targetKeyword },
  });

  return article;
}

export async function deleteLocalSeoArticle(id: string, user: UserSessionPayload): Promise<boolean> {
  const existing = db.select().from(localSeoArticles).where(eq(localSeoArticles.id, id)).get();
  if (!existing) return false;

  db.delete(localSeoArticles).where(eq(localSeoArticles.id, id)).run();

  await logActivity({
    entityType: 'local_seo_articles',
    entityId: id,
    action: 'local_seo_article_deleted',
    performedBy: user.userId,
    details: { title: existing.title },
  });

  return true;
}

function getLocalSeoArticleTemplates(sector: string, companyName: string, city: string) {
  if (sector === 'horeca_ristoranti') {
    return [
      {
        title: `Dove Mangiare a ${city}: Guida ai Sapori Autentici di ${companyName}`,
        slugBase: 'dove-mangiare-sapori-autentici',
        targetKeyword: `dove mangiare a ${city}`,
        metaTitle: `Dove Mangiare a ${city}: Cucina Tipica da ${companyName}`,
        metaDescription: `Scopri dove mangiare a ${city} con ingredienti freschi del territorio, pasta fatta a mano e vini selezionati da ${companyName}. Prenota su WhatsApp!`,
        excerpt: `Cerchi un ristorante a ${city} capace di unire materie prime genuine e atmosfera accogliente? Scopri la filosofia culinaria di ${companyName}.`,
        readingTimeMinutes: 4,
        seoScore: 98,
        contentHtml: `<article>
  <h2>Perché scegliere un ristorante legato al territorio a ${city}</h2>
  <p>Quando si cerca <strong>dove mangiare a ${city}</strong>, la differenza tra un semplice pasto e un'esperienza gastronomica memorabile risiede nella selezione delle materie prime. Da <strong>${companyName}</strong> ogni giornata inizia con la scelta diretta di verdure di stagione, carni certificate e farine macinate a pietra.</p>
  <h3>I Piatti Simbolo della Nostra Cucina a ${city}</h3>
  <ul>
    <li><strong>Antipasti della Tradizione</strong>: salumi artigianali e formaggi d'alpeggio con confetture fatte in casa.</li>
    <li><strong>Primi Piatti Tirati a Mano</strong>: pasta fresca preparata ogni mattina dai nostri chef.</li>
    <li><strong>Menu Business Lunch & Degustazione Serale</strong>: formule pensate sia per chi lavora a ${city} sia per una serata speciale.</li>
  </ul>
  <h3>Domande Frequenti (FAQ Locali)</h3>
  <p><strong>Siete vicini al centro di ${city} e avete parcheggio?</strong><br/>Sì, siamo facilmente raggiungibili con parcheggio convenzionato a pochi passi dal locale.</p>
  <p><strong>Come posso prenotare un tavolo rapidamente?</strong><br/>Puoi scriverci a qualsiasi ora sul nostro <strong>Agente WhatsApp attivo 24/7</strong> per ricevere conferma immediata!</p>
</article>`,
      },
      {
        title: `Pranzo di Lavoro a ${city}: Come Coniugare Velocità e Alta Qualità`,
        slugBase: 'pranzo-di-lavoro-veloce-qualita',
        targetKeyword: `pranzo di lavoro ${city}`,
        metaTitle: `Pranzo di Lavoro a ${city} | Business Lunch da ${companyName}`,
        metaDescription: `Pausa pranzo a ${city}? Scopri il Business Lunch di ${companyName}: piatti sani, servizio rapido in 40 minuti e ambiente riservato per professionisti.`,
        excerpt: `Un pranzo di lavoro a ${city} non deve per forza essere un panino veloce: scopri la nostra formula Business Lunch servita in 40 minuti.`,
        readingTimeMinutes: 3,
        seoScore: 96,
        contentHtml: `<article>
  <h2>La Pausa Pranzo Perfetta per Professionisti e Aziende a ${city}</h2>
  <p>Chi lavora a <strong>${city}</strong> sa quanto sia prezioso il tempo durante la giornata lavorativa. Per questo da <strong>${companyName}</strong> abbiamo progettato una formula <em>Business Lunch</em> che garantisce piatti espressi, leggeri e nutrienti serviti in meno di 40 minuti.</p>
  <h3>I vantaggi del nostro Business Lunch</h3>
  <ul>
    <li>Menu che cambia ogni settimana seguendo la stagionalità.</li>
    <li>Connessione Wi-Fi veloce e tavoli ben distanziati per colloqui di lavoro riservati.</li>
    <li>Possibilità di convenzioni aziendali e fatturazione elettronica immediata.</li>
  </ul>
  <p>Prenota ora il tuo tavolo a ${city} tramite WhatsApp in meno di 10 secondi!</p>
</article>`,
      },
      {
        title: `Ristorante Senza Glutine e Cucina Inclusiva a ${city}: La Nostra Guida`,
        slugBase: 'ristorante-senza-glutine-cucina-inclusiva',
        targetKeyword: `ristorante senza glutine ${city}`,
        metaTitle: `Ristorante Senza Glutine a ${city} | Menu Dedicato ${companyName}`,
        metaDescription: `Cerchi un ristorante a ${city} attento a celiachia e intolleranze? Da ${companyName} trovi piatti senza glutine e vegetariani preparati in sicurezza.`,
        excerpt: `Mangiare fuori a ${city} senza pensieri: ecco come gestiamo le intolleranze alimentari e i piatti senza glutine con la massima attenzione.`,
        readingTimeMinutes: 4,
        seoScore: 95,
        contentHtml: `<article>
  <h2>Ospitalità e Sicurezza Alimentare a ${city}</h2>
  <p>Trovare un <strong>ristorante senza glutine a ${city}</strong> che offra lo stesso gusto della cucina tradizionale è una priorità per molti ospiti. Nella cucina di <strong>${companyName}</strong> adottiamo protocolli rigorosi per evitare contaminazioni.</p>
  <h3>Cosa troverai nel nostro menu dedicato</h3>
  <p>Dalla pasta fresca artigianale senza glutine ai dolci fatti in casa senza lattosio, ogni ospite può vivere il piacere della convivialità a ${city} senza rinunce.</p>
</article>`,
      },
      {
        title: `Organizzare Cene Aziendali, Lauree ed Eventi Privati a ${city}`,
        slugBase: 'cene-aziendali-eventi-privati',
        targetKeyword: `cene aziendali ${city}`,
        metaTitle: `Cene Aziendali ed Eventi Privati a ${city} | ${companyName}`,
        metaDescription: `Devi organizzare una cena aziendale, festa di laurea o evento privato a ${city}? Scopri le sale riservate e i menu su misura di ${companyName}.`,
        excerpt: `Dalla scelta del menu degustazione all'allestimento dei tavoli: come organizzare un evento perfetto nel cuore di ${city}.`,
        readingTimeMinutes: 5,
        seoScore: 97,
        contentHtml: `<article>
  <h2>La Location Ideale per i Tuoi Eventi a ${city}</h2>
  <p>Che si tratti di una <strong>cena aziendale a ${city}</strong>, di una festa di laurea o di un anniversario in famiglia, <strong>${companyName}</strong> mette a disposizione spazi dedicati e menu personalizzabili in base al budget e alle preferenze degli invitati.</p>
  <h3>Richiedi un Preventivo Personalizzato su WhatsApp</h3>
  <p>Scrivici il numero di partecipanti e la data desiderata: il nostro assistente ti invierà subito le nostre proposte degustazione.</p>
</article>`,
      },
    ];
  }

  if (sector === 'commercialisti' || sector === 'studi_legali') {
    return [
      {
        title: `Come Aprire Partita IVA a ${city} nel 2026: Costi, Regimi e Agevolazioni`,
        slugBase: 'come-aprire-partita-iva-guida-costi',
        targetKeyword: `aprire partita iva ${city}`,
        metaTitle: `Aprire Partita IVA a ${city}: Guida 2026 | Studio ${companyName}`,
        metaDescription: `Vuoi aprire Partita IVA a ${city}? Scopri requisiti, Regime Forfettario al 5%, contributi INPS e bandi regionali con lo Studio ${companyName}.`,
        excerpt: `Tutto quello che devi sapere prima di avviare la tua attività professionale o d'impresa a ${city}: simulazione tasse e scelta del codice ATECO.`,
        readingTimeMinutes: 5,
        seoScore: 99,
        contentHtml: `<article>
  <h2>Avviare un'Attività a ${city}: Perché la Pianificazione Iniziale è Decisiva</h2>
  <p>Chi desidera <strong>aprire Partita IVA a ${city}</strong> si trova spesso davanti a dubbi importanti: meglio il Regime Forfettario o una SRL? Quale codice ATECO scegliere per ottimizzare l'inquadramento previdenziale?</p>
  <h3>I 3 Passaggi Chiave seguiti dallo Studio ${companyName}</h3>
  <ul>
    <li><strong>Analisi Preliminare di Fattibilità</strong>: simulazione numerica del netto reale in tasca.</li>
    <li><strong>Verifica Bandi e Finanza Agevolata a ${city}</strong>: controllo di contributi a fondo perduto per nuove imprese.</li>
    <li><strong>Apertura Telematica Rapida in 24 ore</strong>: gestione completa di Agenzia delle Entrate, INPS e Camera di Commercio.</li>
  </ul>
  <p>Prenota un primo colloquio conoscitivo nel nostro studio di ${city} o comodamente in videochiamata!</p>
</article>`,
      },
      {
        title: `Pianificazione Fiscale per SRL e PMI a ${city}: Come Ridurre il Carico Fiscale Legalmente`,
        slugBase: 'pianificazione-fiscale-srl-pmi',
        targetKeyword: `commercialista per srl ${city}`,
        metaTitle: `Pianificazione Fiscale SRL e PMI a ${city} | ${companyName}`,
        metaDescription: `Cerchi un commercialista per SRL e PMI a ${city}? Scopri gli strumenti legali di pianificazione fiscale, welfare aziendale e controllo di gestione.`,
        excerpt: `Non guardare il bilancio solo a fine anno: ecco come gli imprenditori di ${city} pianificano in anticipo il carico fiscale con il nostro studio.`,
        readingTimeMinutes: 5,
        seoScore: 97,
        contentHtml: `<article>
  <h2>Oltre la Contabilità Tradizionale per le Imprese di ${city}</h2>
  <p>Un moderno <strong>studio professionale a ${city}</strong> non può limitarsi a registrare fatture a consuntivo. Da <strong>${companyName}</strong> affianchiamo gli amministratori di SRL e PMI con bilanci infrannuali trimestrali e strategie legali di ottimizzazione fiscale.</p>
  <h3>Gli strumenti più efficaci per le PMI</h3>
  <p>Dal compenso amministratore al TFM, dai rimborsi chilometrici al Welfare Aziendale deducibile al 100%, analizziamo ogni leva applicabile alla tua realtà aziendale a ${city}.</p>
</article>`,
      },
      {
        title: `Bandi e Contributi a Fondo Perduto per Imprese a ${city}: Guida Aggiornata`,
        slugBase: 'bandi-contributi-fondo-perduto-imprese',
        targetKeyword: `bandi imprese ${city}`,
        metaTitle: `Bandi Imprese e Fondo Perduto a ${city} | Studio ${companyName}`,
        metaDescription: `Scopri tutti i bandi camerali, regionali e i crediti d'imposta attivi per le aziende di ${city}. Verifica gratuita dei requisiti con ${companyName}.`,
        excerpt: `Come ottenere liquidità e contributi per digitalizzazione, macchinari e assunzioni per la tua impresa a ${city}.`,
        readingTimeMinutes: 4,
        seoScore: 96,
        contentHtml: `<article>
  <h2>Come Accedere alle Agevolazioni per le Imprese del Territorio di ${city}</h2>
  <p>Ogni anno milioni di euro in <strong>bandi per imprese a ${city}</strong> restano inutilizzati per mancanza di informazione tempestiva. Il team dedicato di <strong>${companyName}</strong> monitora settimanalmente i bandi della Camera di Commercio e regionali.</p>
</article>`,
      },
      {
        title: `Controllo di Gestione e Analisi dei Flussi di Cassa per Attività Locali a ${city}`,
        slugBase: 'controllo-di-gestione-flussi-di-cassa',
        targetKeyword: `controllo di gestione ${city}`,
        metaTitle: `Controllo di Gestione per PMI a ${city} | ${companyName}`,
        metaDescription: `Migliora la marginalità e la liquidità della tua azienda a ${city} con il servizio di Controllo di Gestione e cruscotto aziendale di ${companyName}.`,
        excerpt: `Fatturare non basta se manca il controllo dei margini: scopri come monitorare i KPI della tua attività a ${city}.`,
        readingTimeMinutes: 4,
        seoScore: 95,
        contentHtml: `<article>
  <h2>Prendere Decisioni Basate sui Numeri a ${city}</h2>
  <p>Con il servizio di <strong>controllo di gestione a ${city}</strong> firmato <strong>${companyName}</strong>, trasformiamo i dati contabili in un cruscotto chiaro per capire quali prodotti o servizi generano davvero utile.</p>
</article>`,
      },
    ];
  }

  return [
    {
      title: `Perché Scegliere ${companyName} a ${city}: Guida ai Nostri Servizi e Garanzie`,
      slugBase: 'guida-servizi-professionali-garanzie',
      targetKeyword: `migliori servizi ${city}`,
      metaTitle: `${companyName} a ${city}: Servizi, Prezzi e Prenotazione Rapida`,
      metaDescription: `Cerchi professionisti affidabili a ${city}? Scopri tutti i servizi di ${companyName}, listino trasparente e prenotazione immediata su WhatsApp 24/7.`,
      excerpt: `Qualità certificata, preventivi chiari senza sorprese e assistenza continua per tutti i clienti di ${city} e provincia.`,
      readingTimeMinutes: 4,
      seoScore: 96,
      contentHtml: `<article>
  <h2>Il Punto di Riferimento a ${city} per Qualità e Affidabilità</h2>
  <p>Affidarsi a una realtà radicata sul territorio di <strong>${city}</strong> significa avere la certezza di tempi rapidi, assistenza diretta e cura artigianale per ogni dettaglio. Da <strong>${companyName}</strong> seguiamo ogni cliente con un referente dedicato.</p>
  <h3>I 3 Vantaggi Esclusivi per i Clienti di ${city}</h3>
  <ul>
    <li><strong>Preventivo chiaro e gratuito</strong> prima di ogni intervento.</li>
    <li><strong>Prenotazione immediata via WhatsApp 24/7</strong> senza attese al telefono.</li>
    <li><strong>Garanzia di soddisfazione</strong> certificata dalle recensioni 5 stelle su Google Maps.</li>
  </ul>
</article>`,
    },
    {
      title: `Quanto Costa un Servizio Professionale a ${city}? Tabella Prezzi e Consigli Utili`,
      slugBase: 'quanto-costa-servizio-tabella-prezzi',
      targetKeyword: `prezzi e preventivi ${city}`,
      metaTitle: `Prezzi e Preventivi a ${city}: Guida Completa | ${companyName}`,
      metaDescription: `Vuoi conoscere i prezzi medi a ${city} e capire come valutare un preventivo di qualità? Leggi la guida trasparente realizzata da ${companyName}.`,
      excerpt: `Come orientarsi tra le diverse offerte a ${city} evitando costi nascosti e scegliendo la soluzione più duratura.`,
      readingTimeMinutes: 4,
      seoScore: 95,
      contentHtml: `<article>
  <h2>Trasparenza sui Prezzi a ${city}: Come Leggere un Preventivo</h2>
  <p>Quando si richiede un <strong>preventivo a ${city}</strong>, è fondamentale valutare non solo il prezzo finale ma anche la qualità dei materiali e le garanzie incluse. Da <strong>${companyName}</strong> forniamo sempre un prospetto analitico voce per voce.</p>
</article>`,
    },
    {
      title: `5 Errori da Evitare Quando Prenoti un Servizio a ${city} (E Come Risparmiare Tempo)`,
      slugBase: '5-errori-da-evitare-consigli-pratici',
      targetKeyword: `consigli esperti ${city}`,
      metaTitle: `5 Consigli degli Esperti a ${city} | Blog ${companyName}`,
      metaDescription: `Scopri i 5 consigli pratici degli specialisti di ${companyName} a ${city} per ottenere il miglior risultato risparmiando tempo e denaro.`,
      excerpt: `I suggerimenti pratici del nostro team tecnico a ${city} per fare sempre la scelta giusta al primo colpo.`,
      readingTimeMinutes: 3,
      seoScore: 94,
      contentHtml: `<article>
  <h2>I Consigli Pratici del Team di ${companyName} a ${city}</h2>
  <p>Abbiamo raccolto le domande più frequenti dei nostri clienti di <strong>${city}</strong> per aiutarti a preparare al meglio la tua richiesta e ottenere un servizio impeccabile in tempi record.</p>
</article>`,
    },
    {
      title: `Domande Frequenti (FAQ) sui Servizi di ${companyName} a ${city}`,
      slugBase: 'domande-frequenti-faq-clienti',
      targetKeyword: `recensioni e orari ${city}`,
      metaTitle: `FAQ, Orari e Prenotazioni a ${city} | ${companyName}`,
      metaDescription: `Tutte le risposte su orari di apertura, parcheggio, modalità di pagamento e prenotazione rapida presso ${companyName} a ${city}.`,
      excerpt: `Orari, indirizzo, parcheggio e modalità di prenotazione rapida su WhatsApp presso la nostra sede di ${city}.`,
      readingTimeMinutes: 3,
      seoScore: 97,
      contentHtml: `<article>
  <h2>Tutto Quello che Devi Sapere Prima di Venire a Trovarci a ${city}</h2>
  <p>In questa pagina trovi tutte le informazioni pratiche per raggiungere comodamente la sede di <strong>${companyName} a ${city}</strong> e utilizzare il nostro servizio di prenotazione prioritaria su WhatsApp.</p>
</article>`,
    },
  ];
}

// ============================================================================
// FASE 5: SITO VETRINA & BLOG REALMENTE PUBBLICI E NAVIGABILI (/vetrina/[slug])
// ============================================================================

export function resolveCompanyByPublicSlug(slugOrId: string) {
  const cleanInput = decodeURIComponent(slugOrId).trim().toLowerCase();

  // 1. Direct match by companyId
  const byId = db.select().from(companies).where(eq(companies.id, slugOrId.trim())).get();
  if (byId) return byId;

  // 2. Direct match by websiteId
  const webById = db.select().from(localSeoWebsites).where(eq(localSeoWebsites.id, slugOrId.trim())).get();
  if (webById) {
    const comp = db.select().from(companies).where(eq(companies.id, webById.companyId)).get();
    if (comp) return comp;
  }

  // 3. Match by generated slug (companyName + targetCity or companyName + company.city or companyName alone)
  const allWebs = db
    .select({
      web: localSeoWebsites,
      comp: companies,
    })
    .from(localSeoWebsites)
    .innerJoin(companies, eq(localSeoWebsites.companyId, companies.id))
    .all();

  for (const row of allWebs) {
    const slugWithWebCity = buildPublicVetrinaSlug(row.comp.name, row.web.targetCity);
    const slugWithCompCity = buildPublicVetrinaSlug(row.comp.name, row.comp.city);
    const slugNameOnly = buildPublicVetrinaSlug(row.comp.name, '');
    if (
      cleanInput === slugWithWebCity ||
      cleanInput === slugWithCompCity ||
      cleanInput === slugNameOnly
    ) {
      return row.comp;
    }
  }

  const allComps = db.select().from(companies).all();
  for (const comp of allComps) {
    const slugWithCity = buildPublicVetrinaSlug(comp.name, comp.city);
    const slugNameOnly = buildPublicVetrinaSlug(comp.name, '');
    if (
      cleanInput === slugWithCity ||
      cleanInput === slugNameOnly ||
      cleanInput.startsWith(slugNameOnly)
    ) {
      return comp;
    }
  }

  return null;
}

export async function listPublicVetrinaDirectory() {
  const rows = db
    .select({
      web: localSeoWebsites,
      comp: companies,
    })
    .from(localSeoWebsites)
    .innerJoin(companies, eq(localSeoWebsites.companyId, companies.id))
    .orderBy(desc(localSeoWebsites.updatedAt))
    .all();

  return rows.map((r) => {
    const city = r.web.targetCity || r.comp.city || 'Milano';
    const publicSlug = buildPublicVetrinaSlug(r.comp.name, city);
    const articles = db
      .select()
      .from(localSeoArticles)
      .where(eq(localSeoArticles.companyId, r.comp.id))
      .all();
    const reviews = db
      .select()
      .from(localGbpReviews)
      .where(eq(localGbpReviews.companyId, r.comp.id))
      .all();
    const avgRating =
      reviews.length > 0
        ? (reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length).toFixed(1)
        : '5.0';

    return {
      websiteId: r.web.id,
      companyId: r.comp.id,
      companyName: r.comp.name,
      sector: r.comp.sector || 'local_services',
      city,
      heroTitle: r.web.heroTitle,
      heroSubtitle: r.web.heroSubtitle,
      primaryCtaText: r.web.primaryCtaText,
      seoHealthScore: r.web.seoHealthScore,
      status: r.web.status,
      publicSlug,
      publicUrl: `/vetrina/${publicSlug}`,
      articlesCount: articles.length,
      reviewsCount: reviews.length,
      avgRating,
    };
  });
}

export async function getPublicVetrinaBundle(slugOrCompanyId: string) {
  const comp = resolveCompanyByPublicSlug(slugOrCompanyId);
  if (!comp) return null;

  const websiteRow = db
    .select()
    .from(localSeoWebsites)
    .where(eq(localSeoWebsites.companyId, comp.id))
    .get();

  const city = websiteRow?.targetCity || comp.city || 'Milano';
  const sector = comp.sector || 'local_services';
  const preset = getSectorWebsitePreset(sector, comp.name, city, comp.phone, comp.address);
  const publicSlug = buildPublicVetrinaSlug(comp.name, city);

  const website = websiteRow
    ? {
        ...websiteRow,
        targetKeywords: websiteRow.targetKeywordsJson
          ? (JSON.parse(websiteRow.targetKeywordsJson) as string[])
          : preset.targetKeywords,
        servicesShowcase: websiteRow.servicesShowcaseJson
          ? (JSON.parse(websiteRow.servicesShowcaseJson) as ServiceShowcaseItem[])
          : preset.servicesShowcase,
        schemaMarkupJson: websiteRow.schemaMarkupJson || preset.schemaMarkupJson,
      }
    : {
        id: `virtual_web_${comp.id}`,
        companyId: comp.id,
        domainUrl: preset.domainUrl,
        heroTitle: preset.heroTitle,
        heroSubtitle: preset.heroSubtitle,
        primaryCtaText: preset.primaryCtaText,
        targetCity: city,
        targetKeywords: preset.targetKeywords,
        servicesShowcase: preset.servicesShowcase,
        schemaMarkupJson: preset.schemaMarkupJson,
        seoHealthScore: 95,
        status: 'online' as const,
      };

  const waAgentRow = db
    .select()
    .from(localWhatsappAgents)
    .where(eq(localWhatsappAgents.companyId, comp.id))
    .get();

  const waPreset = getSectorWhatsappPreset(sector, comp.name, city, comp.address, comp.phone);

  const whatsappAgent = {
    agentName: waAgentRow?.agentName || waPreset.agentName,
    whatsappPhone: waAgentRow?.whatsappPhone || comp.phone || '+39 348 9001122',
    welcomeMessage: waAgentRow?.welcomeMessage || waPreset.welcomeMessage,
    businessHours: waAgentRow?.businessHours || waPreset.businessHours,
    addressInfo: waAgentRow?.addressInfo || waPreset.addressInfo,
    pricingMenuInfo: waAgentRow?.pricingMenuInfo || waPreset.pricingMenuInfo,
    faqs: waAgentRow?.faqJson
      ? (JSON.parse(waAgentRow.faqJson) as WhatsappFaqItem[])
      : waPreset.faqs,
    bookingEnabled: waAgentRow ? waAgentRow.bookingEnabled : true,
  };

  const articles = db
    .select()
    .from(localSeoArticles)
    .where(eq(localSeoArticles.companyId, comp.id))
    .orderBy(desc(localSeoArticles.createdAt))
    .all();

  const reviews = db
    .select()
    .from(localGbpReviews)
    .where(eq(localGbpReviews.companyId, comp.id))
    .orderBy(desc(localGbpReviews.reviewDate))
    .limit(12)
    .all();

  const gbpOffers = db
    .select()
    .from(localGbpPosts)
    .where(eq(localGbpPosts.companyId, comp.id))
    .orderBy(desc(localGbpPosts.createdAt))
    .limit(6)
    .all();

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : '5.0';

  return {
    company: {
      id: comp.id,
      name: comp.name,
      sector,
      city,
      address: comp.address || whatsappAgent.addressInfo,
      phone: comp.phone || whatsappAgent.whatsappPhone,
      email: comp.email,
      website: comp.website || website.domainUrl,
    },
    publicSlug,
    publicUrl: `/vetrina/${publicSlug}`,
    website,
    whatsappAgent,
    articles,
    reviews,
    gbpOffers,
    stats: {
      avgRating,
      totalReviews: reviews.length,
      articlesCount: articles.length,
    },
  };
}

export async function getPublicVetrinaArticle(slugOrCompanyId: string, articleSlugOrId: string) {
  const bundle = await getPublicVetrinaBundle(slugOrCompanyId);
  if (!bundle) return null;

  const cleanArtSlug = decodeURIComponent(articleSlugOrId).trim().toLowerCase();
  const article = bundle.articles.find(
    (a) => a.slug.toLowerCase() === cleanArtSlug || a.id === articleSlugOrId.trim()
  );

  if (!article) return null;

  const relatedArticles = bundle.articles.filter((a) => a.id !== article.id).slice(0, 3);

  return {
    bundle,
    article,
    relatedArticles,
  };
}

export async function handlePublicVetrinaInteraction(
  slugOrCompanyId: string,
  input: {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    messageText: string;
    serviceSelected?: string;
    preferredDate?: string;
    conversationId?: string;
  }
) {
  const comp = resolveCompanyByPublicSlug(slugOrCompanyId);
  if (!comp) {
    throw new Error('Attività locale non trovata');
  }

  // Resolve a fallback system user for audit/organizer references
  const sysUser = db.select().from(users).limit(1).get();
  const systemSession: UserSessionPayload = {
    userId: sysUser?.id || 'usr_admin_01',
    name: sysUser?.name || 'Sistema Vetrina Pubblica',
    email: sysUser?.email || 'admin@agency.it',
    role: 'admin',
  };

  let enrichedMessage = input.messageText.trim();
  if (input.serviceSelected || input.preferredDate) {
    const parts: string[] = [];
    if (input.serviceSelected) parts.push(`Servizio richiesto: ${input.serviceSelected}`);
    if (input.preferredDate) parts.push(`Data/Ora preferita: ${input.preferredDate}`);
    enrichedMessage = `[Prenotazione dal Sito Vetrina - ${parts.join(' | ')}] ${enrichedMessage || 'Vorrei prenotare un appuntamento'}`;
  }

  const result = await simulateIncomingWhatsappMessage(
    {
      companyId: comp.id,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      messageText: enrichedMessage,
      conversationId: input.conversationId,
    },
    systemSession
  );

  // If email was provided and a lead was created, enrich the lead with email
  if (input.customerEmail && result.linkedLeadId) {
    db.update(leads)
      .set({ email: input.customerEmail.trim() })
      .where(eq(leads.id, result.linkedLeadId))
      .run();
  }

  return result;
}

// ============================================================================
// Overall Local Growth Metrics (Fasi 1, 2, 3, 4)
// ============================================================================

export async function getLocalGrowthStats(companyId?: string) {
  const postConditions = companyId ? [eq(localSocialPosts.companyId, companyId)] : [];
  const reviewConditions = companyId ? [eq(localGbpReviews.companyId, companyId)] : [];
  const gbpPostConditions = companyId ? [eq(localGbpPosts.companyId, companyId)] : [];
  const waAgentConditions = companyId ? [eq(localWhatsappAgents.companyId, companyId)] : [];
  const waConvConditions = companyId ? [eq(localWhatsappConversations.companyId, companyId)] : [];
  const seoWebConditions = companyId ? [eq(localSeoWebsites.companyId, companyId)] : [];
  const seoArtConditions = companyId ? [eq(localSeoArticles.companyId, companyId)] : [];

  const allPosts = db
    .select()
    .from(localSocialPosts)
    .where(postConditions.length > 0 ? and(...postConditions) : undefined)
    .all();

  const allReviews = db
    .select()
    .from(localGbpReviews)
    .where(reviewConditions.length > 0 ? and(...reviewConditions) : undefined)
    .all();

  const allGbpPosts = db
    .select()
    .from(localGbpPosts)
    .where(gbpPostConditions.length > 0 ? and(...gbpPostConditions) : undefined)
    .all();

  const allWaAgents = db
    .select()
    .from(localWhatsappAgents)
    .where(waAgentConditions.length > 0 ? and(...waAgentConditions) : undefined)
    .all();

  const allWaConvs = db
    .select()
    .from(localWhatsappConversations)
    .where(waConvConditions.length > 0 ? and(...waConvConditions) : undefined)
    .all();

  const allSeoWebs = db
    .select()
    .from(localSeoWebsites)
    .where(seoWebConditions.length > 0 ? and(...seoWebConditions) : undefined)
    .all();

  const allSeoArts = db
    .select()
    .from(localSeoArticles)
    .where(seoArtConditions.length > 0 ? and(...seoArtConditions) : undefined)
    .all();

  const totalPosts = allPosts.length;
  const approvedPosts = allPosts.filter((p) => p.publishStatus === 'approvato' || p.publishStatus === 'programmato').length;
  const pendingPosts = allPosts.filter((p) => p.publishStatus === 'bozza' || p.publishStatus === 'in_revisione').length;
  const publishedPosts = allPosts.filter((p) => p.publishStatus === 'pubblicato').length;

  const totalReviews = allReviews.length;
  const pendingReplies = allReviews.filter((r) => r.replyStatus !== 'risposta_pubblicata').length;
  const repliedReviews = allReviews.filter((r) => r.replyStatus === 'risposta_pubblicata').length;
  const avgRating = totalReviews > 0
    ? (allReviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
    : '5.0';

  const positiveReviews = allReviews.filter((r) => r.sentiment === 'positivo').length;
  const positivePercentage = totalReviews > 0 ? Math.round((positiveReviews / totalReviews) * 100) : 100;

  const activeAgents = allWaAgents.filter((a) => a.status === 'attivo').length;
  const totalConversations = allWaConvs.length;
  const confirmedBookings = allWaConvs.filter((c) => c.status === 'prenotazione_confermata').length;
  const leadsCaptured = allWaConvs.filter((c) => !!c.linkedLeadId).length;
  const needsOperator = allWaConvs.filter((c) => c.status === 'richiede_operatore').length;

  const totalArticles = allSeoArts.length;
  const publishedArticles = allSeoArts.filter((a) => a.publishStatus === 'pubblicato' || a.publishStatus === 'indicizzato').length;
  const avgSeoScore = totalArticles > 0
    ? Math.round(allSeoArts.reduce((acc, a) => acc + a.seoScore, 0) / totalArticles)
    : (allSeoWebs[0]?.seoHealthScore || 95);

  return {
    social: {
      totalPosts,
      approvedPosts,
      pendingPosts,
      publishedPosts,
    },
    gbp: {
      totalReviews,
      pendingReplies,
      repliedReviews,
      avgRating,
      positivePercentage,
      activeUpdatesCount: allGbpPosts.length,
    },
    whatsapp: {
      activeAgents,
      totalConversations,
      confirmedBookings,
      leadsCaptured,
      needsOperator,
    },
    seo: {
      websitesCount: allSeoWebs.length,
      totalArticles,
      publishedArticles,
      avgSeoScore,
    },
  };
}


// ============================================================================
// Internal Helper: Sector-specific Content Engine Templates
// ============================================================================

function getSectorTemplates(sector: string, businessName: string) {
  switch (sector) {
    case 'horeca_ristoranti':
      return [
        {
          topic: 'Dietro le Quinte & Materie Prime',
          title: 'Il segreto della nostra freschezza quotidiana',
          hook: 'Ti sei mai chiesto come nasce un piatto indimenticabile? 🍽️✨',
          caption: `Ogni mattina alle 6:00 selezioniamo personalmente i migliori ingredienti dai produttori locali. Nessun compromesso sulla freschezza, solo sapori autentici che raccontano il nostro territorio.\n\nVieni a scoprire la nuova proposta dello chef questa settimana da ${businessName}!`,
          cta: 'Prenota il tuo tavolo direttamente su WhatsApp o dal link in bio.',
          visualPrompt: 'Foto ravvicinata ad alta risoluzione di uno chef che prepara ingredienti freschi con luce calda naturale, dettagli vividi e atmosfera accogliente.',
          hashtags: ['#cucinatipica', '#piattiitaliani', '#ristoranteitaliano', '#foodlovers', '#materieprime'],
        },
        {
          topic: 'Consiglio dello Chef & Curiosità',
          title: 'L abbinamento vino perfetto per questo weekend',
          hook: 'L abbinamento perfetto esiste: ecco come esaltare ogni sapore 🍷',
          caption: `Un piatto ricco ha bisogno del calice giusto per brillare. Il nostro sommelier consiglia per questo weekend un'etichetta speciale delle nostre colline.\n\nQual è il tuo vino preferito a tavola? Faccelo sapere nei commenti!`,
          cta: 'Lascia un commento o salva questo post per la tua prossima cena.',
          visualPrompt: 'Calice di vino rosso elegante accanto a un piatto d autore, sfondo bokeh sfocato del ristorante illuminato con candele.',
          hashtags: ['#sommelier', '#vinobuono', '#cenaperfetta', '#winelover', '#enogastronomia'],
        },
        {
          topic: 'Offerta Speciale & Promo Locale',
          title: 'Pranzo di lavoro o Cena tra amici? Il menu speciale',
          hook: 'Pausa pranzo gourmet o cena rilassante? Abbiamo la soluzione per te! ⏳🔥',
          caption: `Dal lunedì al venerdì da ${businessName} ti aspetta il nostro Business Lunch equilibrato e gustoso, pronto in tempi rapidi senza rinunciare all eccellenza.\n\nE per la sera: scopri il menu degustazione autunnale!`,
          cta: 'Scrivici per riservare il tuo tavolo prima del sold out.',
          visualPrompt: 'Tavola apparecchiata con cura per 4 persone, piatti colorati e invitanti serviti al centro del tavolo.',
          hashtags: ['#businesslunch', '#pausapranzo', '#cenatraamici', '#offertaspeciale', '#foodexperience'],
        },
        {
          topic: 'Social Proof & Recensione del Cliente',
          title: 'Le parole che ci riempiono il cuore',
          hook: 'Le vostre parole sono il nostro ingrediente più prezioso ❤️ ⭐⭐⭐⭐⭐',
          caption: `"Un esperienza culinaria che supera le aspettative. Atmosfera calda, personale gentilissimo e sapori incredibili." - Grazie a tutti i nostri ospiti per l affetto quotidiano!`,
          cta: 'Sei già stato da noi? Condividi il tuo piatto preferito nei commenti!',
          visualPrompt: 'Grafica elegante minimalista con testo della recensione 5 stelle e logo dell attività su sfondo materico scuro.',
          hashtags: ['#recensioni5stelle', '#grazie', '#clientifelici', '#passioneintavola', '#ristorantedelcuore'],
        },
      ];

    case 'commercialisti':
    case 'studi_legali':
      return [
        {
          topic: 'Consulenza Strategica & Normativa',
          title: '3 novità fiscali fondamentali per le PMI locali',
          hook: 'Attenzione alle scadenze di questo mese: ecco cosa cambia per te 📋💼',
          caption: `La corretta pianificazione fiscale non è solo una questione di conformità, ma il primo motore di risparmio e crescita per la tua impresa.\n\nNel nostro studio ${businessName} analizziamo ogni mese le opportunità di credito d imposta e incentivi per farti risparmiare in sicurezza.`,
          cta: 'Contattaci per una prima verifica personalizzata della tua posizione aziendale.',
          visualPrompt: 'Scrivania professionale moderna con documenti di pianificazione, tablet con grafici di crescita e tazza di caffè, luce professionale pulita.',
          hashtags: ['#consulenzaaziendale', '#fiscoimprese', '#pmi', '#commercialista', '#crescitaaziendale'],
        },
        {
          topic: 'Casi Studio & Soluzioni',
          title: 'Come abbiamo ottimizzato la gestione di un azienda cliente',
          hook: 'Meno burocrazia, più controllo: la storia di successo di questo mese 📈',
          caption: `Digitalizzare i flussi contabili e automatizzare il controllo di gestione ha permesso a un nostro cliente di ridurre del 40% i tempi amministrativi.\n\nVuoi semplificare la gestione della tua attività con ${businessName}?`,
          cta: 'Scrivici un messaggio privato per fissare una sessione conoscitiva di 30 minuti.',
          visualPrompt: 'Imprenditore sorridente in riunione con consulente esperto davanti a un laptop con report di controllo di gestione.',
          hashtags: ['#successoaziendale', '#ottimizzazione', '#controlloingestione', '#imprenditori', '#studioprofessionale'],
        },
        {
          topic: 'Consiglio Pratico & FAQ',
          title: 'Detrazioni e incentivi: l errore più comune da evitare',
          hook: 'Stai perdendo incentivi senza saperlo? 💡 Spesso basta un dettaglio.',
          caption: `Molti imprenditori e professionisti non sfruttano i bandi territoriali per mancanza di tempo. Il nostro team di ${businessName} monitora costantemente le agevolazioni per i clienti.`,
          cta: 'Salva questo post per ricordarti di verificare i bandi aperti.',
          visualPrompt: 'Infografica chiara e moderna a tema agevolazioni con icone pulite su sfondo blu scuro aziendale.',
          hashtags: ['#bandieincentivi', '#risparmiofiscale', '#startup', '#professionisti', '#consulenzalegale'],
        },
      ];

    default:
      return [
        {
          topic: 'Presentazione Servizio & Valore Unico',
          title: 'Perché i clienti scelgono la nostra professionalità',
          hook: 'Cerchi un servizio affidabile e su misura per le tue esigenze? ✨',
          caption: `Da ${businessName} mettiamo al centro la trasparenza, la velocità di risposta e l attenzione a ogni dettaglio. La soddisfazione di chi si affida a noi è il nostro miglior biglietto da visita.`,
          cta: 'Scopri tutti i servizi disponibili o contattaci per qualsiasi informazione!',
          visualPrompt: 'Team sorridente al lavoro in ambiente moderno e luminoso, divisa curata e atmosfera accogliente.',
          hashtags: ['#qualità', '#servizilocali', '#professionalità', '#fiducia', '#eccellenza'],
        },
        {
          topic: 'Offerta & Novità del Mese',
          title: 'Promozione esclusiva per la nostra community locale',
          hook: 'Una sorpresa pensata apposta per te per questo mese! 🎁🔥',
          caption: `Per ringraziarvi della costante fiducia, questo mese abbiamo riservato una condizione speciale per chi prenota direttamente online con ${businessName}.`,
          cta: 'Inviaci un messaggio o visita la scheda Google per usufruirne subito!',
          visualPrompt: 'Grafica elegante promozionale con badge offerta e dettagli chiari sui vantaggi per il cliente.',
          hashtags: ['#promo', '#offertadelmese', '#occasionispeciali', '#territorio', '#novità'],
        },
        {
          topic: 'Dietro le Quinte',
          title: 'Cosa succede dietro le quinte del nostro lavoro',
          hook: 'I dettagli fanno la differenza: ecco come lavoriamo ogni giorno 🛠️',
          caption: `La cura per ogni passaggio è ciò che ci contraddistingue da ${businessName}. Non lasciamo nulla al caso per garantirti sempre un risultato all altezza delle tue aspettative.`,
          cta: 'Seguici per non perderti i prossimi consigli e novità settimanali!',
          visualPrompt: 'Dettaglio macro operativo di alta qualità degli strumenti di lavoro, precisione e pulizia.',
          hashtags: ['#dietrolequinte', '#passione', '#curaebenessere', '#lavoroduro', '#soddisfazione'],
        },
      ];
  }
}
