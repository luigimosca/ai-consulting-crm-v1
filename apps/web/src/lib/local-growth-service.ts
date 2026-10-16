import { db, localSocialPosts, localGbpReviews, localGbpPosts, companies, users, projects, activityLog } from '@ai-crm/db';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import crypto from 'crypto';
import type { LocalSocialPost, LocalGbpReview, LocalGbpPost } from '@ai-crm/db';

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
// Overall Local Growth Metrics
// ============================================================================

export async function getLocalGrowthStats(companyId?: string) {
  const postConditions = companyId ? [eq(localSocialPosts.companyId, companyId)] : [];
  const reviewConditions = companyId ? [eq(localGbpReviews.companyId, companyId)] : [];
  const gbpPostConditions = companyId ? [eq(localGbpPosts.companyId, companyId)] : [];

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
