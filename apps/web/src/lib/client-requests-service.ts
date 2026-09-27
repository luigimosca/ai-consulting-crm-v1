import { db, clientRequests, clientRequestItems, clientRequestTaskLinks, requestComments, projects, tasks, documents, users, activityLog } from '@ai-crm/db';
import { eq, and, desc, sql, inArray, isNull, or } from 'drizzle-orm';
import {
  type ClientRequestCategory,
  type ClientRequestStatus,
  type ClientRequestPriority,
  type ClientRequestItemType,
  type ClientRequestItemStatus,
  type AccessConfirmationConfig,
  SEED_ONBOARDING_WEBSITE_MARKETING_TEMPLATE,
  validateNoSensitiveCredentials,
  matchTasksForRequest,
  computeRequestOverallStatus,
} from '@ai-crm/ai';
import { logActivity } from './activity-logger';
import { checkUserProjectAccess, canUserAccessClientRequest } from './auth';
import { isTaskBlocked } from './task-graph';
import { syncAccountFromApprovedClientRequestItem } from './platform-accounts-service';

export interface ClientRequestItemData {
  id: string;
  requestId: string;
  label: string;
  description: string | null;
  itemType: ClientRequestItemType;
  required: boolean;
  status: ClientRequestItemStatus;
  valueText: string | null;
  valueUrl: string | null;
  documentId: string | null;
  sourceUrl: string | null;
  notes: string | null;
  accessConfig: AccessConfirmationConfig | null;
  selectionOptions: string[] | null;
  sortOrder: number;
  receivedAt: string | null;
  approvedAt: string | null;
  document?: {
    id: string;
    originalName: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    visibility: string;
    createdAt: string;
  } | null;
}

export interface ClientRequestTaskLinkData {
  id: string;
  requestId: string;
  taskId: string;
  relationType: 'blocks' | 'supports';
  createdAt: string;
  taskTitle: string;
  taskStatus: string;
  taskPriority: string;
}

export interface RequestCommentData {
  id: string;
  requestId: string;
  authorUserId: string;
  authorName: string;
  authorRole: string;
  content: string;
  visibility: 'internal' | 'client';
  createdAt: string;
}

export interface ClientRequestDetail {
  id: string;
  projectId: string;
  projectName: string;
  orderId: string | null;
  companyId: string | null;
  title: string;
  description: string | null;
  category: ClientRequestCategory;
  status: ClientRequestStatus;
  priority: ClientRequestPriority;
  dueDate: string | null;
  requestedByUserId: string;
  requestedByName: string;
  assignedToUserId: string | null;
  assignedToName: string | null;
  clientVisible: boolean;
  blocksTaskCompletion: boolean;
  createdAt: string;
  updatedAt: string;
  receivedAt: string | null;
  approvedAt: string | null;
  approvedByUserId: string | null;
  approvedByName: string | null;
  rejectionReason: string | null;
  templateCode: string | null;
  items: ClientRequestItemData[];
  linkedTasks: ClientRequestTaskLinkData[];
  comments: RequestCommentData[];
  activityHistory?: any[];
  metrics: {
    totalItems: number;
    requiredItems: number;
    receivedItems: number;
    approvedItems: number;
    completionPercent: number;
    isOverdue: boolean;
  };
}

export interface ProjectClientRequestsSummary {
  kpis: {
    totalRequests: number;
    missingRequests: number;
    underReviewRequests: number;
    approvedRequests: number;
    blockingRequests: number;
    overdueRequests: number;
    completionPercent: number;
  };
  requests: ClientRequestDetail[];
}

/**
 * Recupera tutte le richieste di un progetto con voci, collegamenti, metriche e KPI
 */
export async function listProjectClientRequests(
  projectId: string,
  filters?: { status?: string; category?: string; priority?: string; q?: string },
  user?: { userId: string; role: string }
): Promise<ProjectClientRequestsSummary> {
  if (user && !checkUserProjectAccess(user, projectId)) {
    throw new Error('FORBIDDEN');
  }

  const allRequests = db
    .select({
      req: clientRequests,
      projTitle: projects.title,
      reqUserName: users.name,
    })
    .from(clientRequests)
    .innerJoin(projects, eq(clientRequests.projectId, projects.id))
    .leftJoin(users, eq(clientRequests.requestedByUserId, users.id))
    .where(eq(clientRequests.projectId, projectId))
    .orderBy(desc(clientRequests.createdAt))
    .all();

  const requestIds = allRequests.map((r) => r.req.id);

  // Caricamento in bulk di voci, task links e commenti
  let allItems: any[] = [];
  let allLinks: any[] = [];
  let allComments: any[] = [];
  let allDocumentsMap = new Map<string, any>();

  if (requestIds.length > 0) {
    allItems = db
      .select()
      .from(clientRequestItems)
      .where(inArray(clientRequestItems.requestId, requestIds))
      .orderBy(clientRequestItems.sortOrder)
      .all();

    const docIds = allItems.map((i) => i.documentId).filter(Boolean) as string[];
    if (docIds.length > 0) {
      const docs = db.select().from(documents).where(inArray(documents.id, docIds)).all();
      for (const d of docs) {
        allDocumentsMap.set(d.id, d);
      }
    }

    allLinks = db
      .select({
        link: clientRequestTaskLinks,
        tTitle: tasks.title,
        tStatus: tasks.status,
        tPriority: tasks.priority,
      })
      .from(clientRequestTaskLinks)
      .innerJoin(tasks, eq(clientRequestTaskLinks.taskId, tasks.id))
      .where(inArray(clientRequestTaskLinks.requestId, requestIds))
      .all();

    allComments = db
      .select({
        comment: requestComments,
        authorName: users.name,
        authorRole: users.role,
      })
      .from(requestComments)
      .leftJoin(users, eq(requestComments.authorUserId, users.id))
      .where(inArray(requestComments.requestId, requestIds))
      .orderBy(desc(requestComments.createdAt))
      .all();
  }

  const today = new Date().toISOString().slice(0, 10);

  const mappedRequests: ClientRequestDetail[] = allRequests.map((r) => {
    const rawReq = r.req;
    const reqItems = allItems.filter((i) => i.requestId === rawReq.id);
    const reqLinks = allLinks.filter((l) => l.link.requestId === rawReq.id);
    const reqComments = allComments.filter((c) => c.comment.requestId === rawReq.id);

    const parsedItems: ClientRequestItemData[] = reqItems.map((item) => {
      let accessConfig: AccessConfirmationConfig | null = null;
      let selectionOptions: string[] | null = null;
      try {
        if (item.accessConfigJson) accessConfig = JSON.parse(item.accessConfigJson);
        if (item.selectionOptionsJson) selectionOptions = JSON.parse(item.selectionOptionsJson);
      } catch {}

      const linkedDoc = item.documentId ? allDocumentsMap.get(item.documentId) : null;

      return {
        id: item.id,
        requestId: item.requestId,
        label: item.label,
        description: item.description,
        itemType: item.itemType as ClientRequestItemType,
        required: item.required,
        status: item.status as ClientRequestItemStatus,
        valueText: item.valueText,
        valueUrl: item.valueUrl,
        documentId: item.documentId,
        sourceUrl: item.sourceUrl,
        notes: item.notes,
        accessConfig,
        selectionOptions,
        sortOrder: item.sortOrder,
        receivedAt: item.receivedAt,
        approvedAt: item.approvedAt,
        document: linkedDoc
          ? {
              id: linkedDoc.id,
              originalName: linkedDoc.originalName,
              fileName: linkedDoc.fileName,
              mimeType: linkedDoc.mimeType,
              sizeBytes: linkedDoc.sizeBytes,
              visibility: linkedDoc.visibility,
              createdAt: linkedDoc.createdAt,
            }
          : null,
      };
    });

    const parsedLinks: ClientRequestTaskLinkData[] = reqLinks.map((l) => ({
      id: l.link.id,
      requestId: l.link.requestId,
      taskId: l.link.taskId,
      relationType: l.link.relationType as 'blocks' | 'supports',
      createdAt: l.link.createdAt,
      taskTitle: l.tTitle,
      taskStatus: l.tStatus,
      taskPriority: l.tPriority,
    }));

    const parsedComments: RequestCommentData[] = reqComments
      .filter((c) => {
        if (!user) return true;
        if (user.role === 'admin' || user.role === 'operator') return true;
        return c.comment.visibility === 'client';
      })
      .map((c) => ({
        id: c.comment.id,
        requestId: c.comment.requestId,
        authorUserId: c.comment.authorUserId,
        authorName: c.authorName || 'Utente',
        authorRole: c.authorRole || 'operator',
        content: c.comment.content,
        visibility: c.comment.visibility as 'internal' | 'client',
        createdAt: c.comment.createdAt,
      }));

    const totalItems = parsedItems.length;
    const requiredItems = parsedItems.filter((i) => i.required).length;
    const receivedItems = parsedItems.filter((i) => ['received', 'approved'].includes(i.status)).length;
    const approvedItems = parsedItems.filter((i) => i.status === 'approved').length;

    const denominator = requiredItems > 0 ? requiredItems : totalItems;
    const completionPercent = denominator > 0 ? Math.round((receivedItems / denominator) * 100) : 0;
    const isOverdue = !!(rawReq.dueDate && rawReq.dueDate < today && !['approved', 'cancelled'].includes(rawReq.status));

    return {
      id: rawReq.id,
      projectId: rawReq.projectId,
      projectName: r.projTitle,
      orderId: rawReq.orderId,
      companyId: rawReq.companyId,
      title: rawReq.title,
      description: rawReq.description,
      category: rawReq.category as ClientRequestCategory,
      status: rawReq.status as ClientRequestStatus,
      priority: rawReq.priority as ClientRequestPriority,
      dueDate: rawReq.dueDate,
      requestedByUserId: rawReq.requestedByUserId,
      requestedByName: r.reqUserName || 'Sistema',
      assignedToUserId: rawReq.assignedToUserId,
      assignedToName: null,
      clientVisible: rawReq.clientVisible,
      blocksTaskCompletion: rawReq.blocksTaskCompletion,
      createdAt: rawReq.createdAt,
      updatedAt: rawReq.updatedAt,
      receivedAt: rawReq.receivedAt,
      approvedAt: rawReq.approvedAt,
      approvedByUserId: rawReq.approvedByUserId,
      approvedByName: null,
      rejectionReason: rawReq.rejectionReason,
      templateCode: rawReq.templateCode,
      items: parsedItems,
      linkedTasks: parsedLinks,
      comments: parsedComments,
      metrics: {
        totalItems,
        requiredItems,
        receivedItems,
        approvedItems,
        completionPercent,
        isOverdue,
      },
    };
  });

  // Calcolo KPI Globali di Progetto
  const totalRequests = mappedRequests.length;
  const missingRequests = mappedRequests.filter((r) => ['requested', 'partially_received', 'rejected'].includes(r.status)).length;
  const underReviewRequests = mappedRequests.filter((r) => ['received', 'under_review'].includes(r.status)).length;
  const approvedRequests = mappedRequests.filter((r) => r.status === 'approved').length;
  const blockingRequests = mappedRequests.filter((r) => r.blocksTaskCompletion && !['approved', 'cancelled'].includes(r.status)).length;
  const overdueRequests = mappedRequests.filter((r) => r.metrics.isOverdue).length;

  const totalPossible = totalRequests * 100;
  const sumPercent = mappedRequests.reduce((acc, r) => acc + r.metrics.completionPercent, 0);
  const globalCompletionPercent = totalPossible > 0 ? Math.round((sumPercent / totalPossible) * 100) : 0;

  // Applicazione filtri se presenti
  let filtered = mappedRequests;
  if (filters?.status) {
    filtered = filtered.filter((r) => r.status === filters.status);
  }
  if (filters?.category) {
    filtered = filtered.filter((r) => r.category === filters.category);
  }
  if (filters?.priority) {
    filtered = filtered.filter((r) => r.priority === filters.priority);
  }
  if (filters?.q) {
    const qLower = filters.q.toLowerCase().trim();
    filtered = filtered.filter(
      (r) =>
        r.title.toLowerCase().includes(qLower) ||
        (r.description && r.description.toLowerCase().includes(qLower)) ||
        r.items.some((i) => i.label.toLowerCase().includes(qLower))
    );
  }

  return {
    kpis: {
      totalRequests,
      missingRequests,
      underReviewRequests,
      approvedRequests,
      blockingRequests,
      overdueRequests,
      completionPercent: globalCompletionPercent,
    },
    requests: filtered,
  };
}

/**
 * Recupera i dettagli completi di una singola richiesta cliente
 */
export async function getClientRequestById(
  requestId: string,
  user?: { userId: string; role: string }
): Promise<ClientRequestDetail | null> {
  const reqRow = db
    .select({
      req: clientRequests,
      projTitle: projects.title,
      reqUserName: users.name,
    })
    .from(clientRequests)
    .innerJoin(projects, eq(clientRequests.projectId, projects.id))
    .leftJoin(users, eq(clientRequests.requestedByUserId, users.id))
    .where(eq(clientRequests.id, requestId))
    .get();

  if (!reqRow) return null;

  if (user && !canUserAccessClientRequest(user, requestId)) {
    throw new Error('FORBIDDEN');
  }

  const rawReq = reqRow.req;

  const reqItems = db
    .select()
    .from(clientRequestItems)
    .where(eq(clientRequestItems.requestId, requestId))
    .orderBy(clientRequestItems.sortOrder)
    .all();

  const docIds = reqItems.map((i) => i.documentId).filter(Boolean) as string[];
  const docsMap = new Map<string, any>();
  if (docIds.length > 0) {
    const docs = db.select().from(documents).where(inArray(documents.id, docIds)).all();
    for (const d of docs) docsMap.set(d.id, d);
  }

  const reqLinks = db
    .select({
      link: clientRequestTaskLinks,
      tTitle: tasks.title,
      tStatus: tasks.status,
      tPriority: tasks.priority,
    })
    .from(clientRequestTaskLinks)
    .innerJoin(tasks, eq(clientRequestTaskLinks.taskId, tasks.id))
    .where(eq(clientRequestTaskLinks.requestId, requestId))
    .all();

  const reqComments = db
    .select({
      comment: requestComments,
      authorName: users.name,
      authorRole: users.role,
    })
    .from(requestComments)
    .leftJoin(users, eq(requestComments.authorUserId, users.id))
    .where(eq(requestComments.requestId, requestId))
    .orderBy(desc(requestComments.createdAt))
    .all();

  const activityHistory = db
    .select()
    .from(activityLog)
    .where(and(eq(activityLog.entityType, 'client_request'), eq(activityLog.entityId, requestId)))
    .orderBy(desc(activityLog.createdAt))
    .all();

  const today = new Date().toISOString().slice(0, 10);

  const parsedItems: ClientRequestItemData[] = reqItems.map((item) => {
    let accessConfig: AccessConfirmationConfig | null = null;
    let selectionOptions: string[] | null = null;
    try {
      if (item.accessConfigJson) accessConfig = JSON.parse(item.accessConfigJson);
      if (item.selectionOptionsJson) selectionOptions = JSON.parse(item.selectionOptionsJson);
    } catch {}

    const linkedDoc = item.documentId ? docsMap.get(item.documentId) : null;

    return {
      id: item.id,
      requestId: item.requestId,
      label: item.label,
      description: item.description,
      itemType: item.itemType as ClientRequestItemType,
      required: item.required,
      status: item.status as ClientRequestItemStatus,
      valueText: item.valueText,
      valueUrl: item.valueUrl,
      documentId: item.documentId,
      sourceUrl: item.sourceUrl,
      notes: item.notes,
      accessConfig,
      selectionOptions,
      sortOrder: item.sortOrder,
      receivedAt: item.receivedAt,
      approvedAt: item.approvedAt,
      document: linkedDoc
        ? {
            id: linkedDoc.id,
            originalName: linkedDoc.originalName,
            fileName: linkedDoc.fileName,
            mimeType: linkedDoc.mimeType,
            sizeBytes: linkedDoc.sizeBytes,
            visibility: linkedDoc.visibility,
            createdAt: linkedDoc.createdAt,
          }
        : null,
    };
  });

  const parsedLinks: ClientRequestTaskLinkData[] = reqLinks.map((l) => ({
    id: l.link.id,
    requestId: l.link.requestId,
    taskId: l.link.taskId,
    relationType: l.link.relationType as 'blocks' | 'supports',
    createdAt: l.link.createdAt,
    taskTitle: l.tTitle,
    taskStatus: l.tStatus,
    taskPriority: l.tPriority,
  }));

  const parsedComments: RequestCommentData[] = reqComments
    .filter((c) => {
      if (!user) return true;
      if (user.role === 'admin' || user.role === 'operator') return true;
      return c.comment.visibility === 'client';
    })
    .map((c) => ({
      id: c.comment.id,
      requestId: c.comment.requestId,
      authorUserId: c.comment.authorUserId,
      authorName: c.authorName || 'Utente',
      authorRole: c.authorRole || 'operator',
      content: c.comment.content,
      visibility: c.comment.visibility as 'internal' | 'client',
      createdAt: c.comment.createdAt,
    }));

  const totalItems = parsedItems.length;
  const requiredItems = parsedItems.filter((i) => i.required).length;
  const receivedItems = parsedItems.filter((i) => ['received', 'approved'].includes(i.status)).length;
  const approvedItems = parsedItems.filter((i) => i.status === 'approved').length;

  const denominator = requiredItems > 0 ? requiredItems : totalItems;
  const completionPercent = denominator > 0 ? Math.round((receivedItems / denominator) * 100) : 0;
  const isOverdue = !!(rawReq.dueDate && rawReq.dueDate < today && !['approved', 'cancelled'].includes(rawReq.status));

  let approvedUserName: string | null = null;
  if (rawReq.approvedByUserId) {
    const appUser = db.select().from(users).where(eq(users.id, rawReq.approvedByUserId)).get();
    if (appUser) approvedUserName = appUser.name;
  }

  let assignedToUserName: string | null = null;
  if (rawReq.assignedToUserId) {
    const assUser = db.select().from(users).where(eq(users.id, rawReq.assignedToUserId)).get();
    if (assUser) assignedToUserName = assUser.name;
  }

  return {
    id: rawReq.id,
    projectId: rawReq.projectId,
    projectName: reqRow.projTitle,
    orderId: rawReq.orderId,
    companyId: rawReq.companyId,
    title: rawReq.title,
    description: rawReq.description,
    category: rawReq.category as ClientRequestCategory,
    status: rawReq.status as ClientRequestStatus,
    priority: rawReq.priority as ClientRequestPriority,
    dueDate: rawReq.dueDate,
    requestedByUserId: rawReq.requestedByUserId,
    requestedByName: reqRow.reqUserName || 'Sistema',
    assignedToUserId: rawReq.assignedToUserId,
    assignedToName: assignedToUserName,
    clientVisible: rawReq.clientVisible,
    blocksTaskCompletion: rawReq.blocksTaskCompletion,
    createdAt: rawReq.createdAt,
    updatedAt: rawReq.updatedAt,
    receivedAt: rawReq.receivedAt,
    approvedAt: rawReq.approvedAt,
    approvedByUserId: rawReq.approvedByUserId,
    approvedByName: approvedUserName,
    rejectionReason: rawReq.rejectionReason,
    templateCode: rawReq.templateCode,
    items: parsedItems,
    linkedTasks: parsedLinks,
    comments: parsedComments,
    activityHistory: activityHistory || [],
    metrics: {
      totalItems,
      requiredItems,
      receivedItems,
      approvedItems,
      completionPercent,
      isOverdue,
    },
  };
}

/**
 * Crea manualmente una nuova richiesta cliente con voci e associazioni task
 */
export async function createClientRequest(params: {
  projectId: string;
  orderId?: string | null;
  companyId?: string | null;
  title: string;
  description?: string | null;
  category?: ClientRequestCategory;
  priority?: ClientRequestPriority;
  dueDate?: string | null;
  clientVisible?: boolean;
  blocksTaskCompletion?: boolean;
  requestedByUserId: string;
  assignedToUserId?: string | null;
  items?: Array<{
    label: string;
    description?: string | null;
    itemType?: ClientRequestItemType;
    required?: boolean;
    accessConfig?: AccessConfirmationConfig;
    selectionOptions?: string[];
  }>;
  linkedTaskIds?: Array<{
    taskId: string;
    relationType?: 'blocks' | 'supports';
  }>;
}, user?: { userId: string; role: string }): Promise<ClientRequestDetail> {
  if (user && !checkUserProjectAccess(user, params.projectId, 'editor')) {
    throw new Error('FORBIDDEN');
  }

  const cleanTitle = (params.title || '').trim();
  if (!cleanTitle) {
    throw new Error('Il titolo della richiesta è obbligatorio.');
  }

  // Validazione anti-credenziali
  const secCheckTitle = validateNoSensitiveCredentials(cleanTitle);
  if (!secCheckTitle.isValid) throw new Error(secCheckTitle.error);

  const secCheckDesc = validateNoSensitiveCredentials(params.description);
  if (!secCheckDesc.isValid) throw new Error(secCheckDesc.error);

  const project = db.select().from(projects).where(eq(projects.id, params.projectId)).get();
  if (!project) throw new Error('Progetto non trovato');

  const now = new Date().toISOString();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const companyId = params.companyId || project.companyId || null;
  const orderId = params.orderId || project.orderId || null;

  db.insert(clientRequests)
    .values({
      id: requestId,
      projectId: params.projectId,
      orderId,
      companyId,
      title: params.title.trim(),
      description: params.description?.trim() || null,
      category: params.category || 'general',
      status: 'requested',
      priority: params.priority || 'medium',
      dueDate: params.dueDate || null,
      requestedByUserId: params.requestedByUserId,
      assignedToUserId: params.assignedToUserId || null,
      clientVisible: params.clientVisible !== false,
      blocksTaskCompletion: params.blocksTaskCompletion !== false,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  // Inserimento voci richieste
  if (params.items && params.items.length > 0) {
    for (let i = 0; i < params.items.length; i++) {
      const item = params.items[i];
      const secItemCheck = validateNoSensitiveCredentials(item.label);
      if (!secItemCheck.isValid) throw new Error(secItemCheck.error);

      const itemId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${i}`;
      db.insert(clientRequestItems)
        .values({
          id: itemId,
          requestId: requestId,
          label: item.label.trim(),
          description: item.description?.trim() || null,
          itemType: item.itemType || 'text',
          required: item.required !== false,
          status: 'missing',
          accessConfigJson: item.accessConfig ? JSON.stringify(item.accessConfig) : null,
          selectionOptionsJson: item.selectionOptions ? JSON.stringify(item.selectionOptions) : null,
          sortOrder: i,
        })
        .run();
    }
  }

  // Inserimento collegamenti task
  if (params.linkedTaskIds && params.linkedTaskIds.length > 0) {
    for (const link of params.linkedTaskIds) {
      const linkId = `link_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      db.insert(clientRequestTaskLinks)
        .values({
          id: linkId,
          requestId: requestId,
          taskId: link.taskId,
          relationType: link.relationType || 'blocks',
          createdAt: now,
        })
        .run();
    }
  }

  await logActivity({
    entityType: 'client_request',
    entityId: requestId,
    action: 'create_client_request',
    performedBy: params.requestedByUserId,
    details: {
      title: params.title,
      category: params.category,
      projectId: params.projectId,
      itemsCount: params.items?.length || 0,
      linkedTasksCount: params.linkedTaskIds?.length || 0,
    },
  });

  const created = await getClientRequestById(requestId);
  return created!;
}

/**
 * Aggiorna metadati di base di una richiesta cliente
 */
export async function updateClientRequest(
  requestId: string,
  params: {
    title?: string;
    description?: string | null;
    category?: ClientRequestCategory;
    priority?: ClientRequestPriority;
    dueDate?: string | null;
    clientVisible?: boolean;
    blocksTaskCompletion?: boolean;
    assignedToUserId?: string | null;
    status?: ClientRequestStatus;
    rejectionReason?: string | null;
  },
  performedByUserId: string,
  user?: { userId: string; role: string }
): Promise<ClientRequestDetail> {
  const actor = user || { userId: performedByUserId, role: 'operator' };
  if (!canUserAccessClientRequest(actor, requestId)) {
    throw new Error('FORBIDDEN');
  }

  if (params.title) {
    const sec = validateNoSensitiveCredentials(params.title);
    if (!sec.isValid) throw new Error(sec.error);
  }
  if (params.description) {
    const sec = validateNoSensitiveCredentials(params.description);
    if (!sec.isValid) throw new Error(sec.error);
  }

  const existing = db.select().from(clientRequests).where(eq(clientRequests.id, requestId)).get();
  if (!existing) throw new Error('Richiesta non trovata');

  const now = new Date().toISOString();
  const updatePayload: any = { updatedAt: now };

  if (params.title !== undefined) updatePayload.title = params.title.trim();
  if (params.description !== undefined) updatePayload.description = params.description?.trim() || null;
  if (params.category !== undefined) updatePayload.category = params.category;
  if (params.priority !== undefined) updatePayload.priority = params.priority;
  if (params.dueDate !== undefined) updatePayload.dueDate = params.dueDate || null;
  if (params.clientVisible !== undefined) updatePayload.clientVisible = params.clientVisible;
  if (params.blocksTaskCompletion !== undefined) updatePayload.blocksTaskCompletion = params.blocksTaskCompletion;
  if (params.assignedToUserId !== undefined) updatePayload.assignedToUserId = params.assignedToUserId || null;
  if (params.status !== undefined) updatePayload.status = params.status;
  if (params.rejectionReason !== undefined) updatePayload.rejectionReason = params.rejectionReason;

  db.update(clientRequests).set(updatePayload).where(eq(clientRequests.id, requestId)).run();

  await logActivity({
    entityType: 'client_request',
    entityId: requestId,
    action: 'update_client_request',
    performedBy: performedByUserId,
    details: { changes: Object.keys(updatePayload) },
  });

  const updated = await getClientRequestById(requestId);
  return updated!;
}

/**
 * Aggiorna o compila una singola voce di una richiesta cliente (es. testo, file caricato, accesso confermato)
 */
export async function updateClientRequestItem(
  params: {
    itemId: string;
    valueText?: string | null;
    valueUrl?: string | null;
    documentId?: string | null;
    accessConfig?: AccessConfirmationConfig | null;
    notes?: string | null;
    status?: ClientRequestItemStatus;
    performedByUserId: string;
  },
  user?: { userId: string; role: string }
): Promise<ClientRequestDetail> {
  const item = db.select().from(clientRequestItems).where(eq(clientRequestItems.id, params.itemId)).get();
  if (!item) throw new Error('Voce richiesta non trovata');

  const actor = user || { userId: params.performedByUserId, role: 'operator' };
  if (!canUserAccessClientRequest(actor, item.requestId)) {
    throw new Error('FORBIDDEN');
  }

  if (params.valueText) {
    const sec = validateNoSensitiveCredentials(params.valueText);
    if (!sec.isValid) throw new Error(sec.error);
  }
  if (params.notes) {
    const sec = validateNoSensitiveCredentials(params.notes);
    if (!sec.isValid) throw new Error(sec.error);
  }

  const now = new Date().toISOString();
  const updatePayload: any = {};

  if (params.valueText !== undefined) updatePayload.valueText = params.valueText;
  if (params.valueUrl !== undefined) updatePayload.valueUrl = params.valueUrl;
  if (params.documentId !== undefined) updatePayload.documentId = params.documentId;
  if (params.notes !== undefined) updatePayload.notes = params.notes;
  if (params.accessConfig !== undefined) updatePayload.accessConfigJson = params.accessConfig ? JSON.stringify(params.accessConfig) : null;

  // Calcolo automatico dello stato della voce se non esplicitato
  if (params.status) {
    updatePayload.status = params.status;
    if (params.status === 'received' && !item.receivedAt) updatePayload.receivedAt = now;
    if (params.status === 'approved' && !item.approvedAt) updatePayload.approvedAt = now;
  } else {
    // Se è stato fornito un valore e lo stato era missing, consideralo 'received'
    const hasValue = !!(
      (params.valueText && params.valueText.trim()) ||
      (params.valueUrl && params.valueUrl.trim()) ||
      params.documentId ||
      (params.accessConfig && params.accessConfig.status !== 'requested')
    );
    if (hasValue && item.status === 'missing') {
      updatePayload.status = 'received';
      updatePayload.receivedAt = now;
    }
  }

  db.update(clientRequestItems).set(updatePayload).where(eq(clientRequestItems.id, params.itemId)).run();

  // Ricalcola lo stato complessivo della richiesta
  const allItems = db.select().from(clientRequestItems).where(eq(clientRequestItems.requestId, item.requestId)).all();
  const currentReq = db.select().from(clientRequests).where(eq(clientRequests.id, item.requestId)).get();

  if (currentReq) {
    const newStatus = computeRequestOverallStatus(
      currentReq.status as ClientRequestStatus,
      allItems.map((i) => ({ required: i.required, status: i.status as ClientRequestItemStatus }))
    );

    const reqUpdatePayload: any = { updatedAt: now };
    if (newStatus !== currentReq.status) {
      reqUpdatePayload.status = newStatus;
      if (newStatus === 'received' && !currentReq.receivedAt) reqUpdatePayload.receivedAt = now;
    }

    db.update(clientRequests).set(reqUpdatePayload).where(eq(clientRequests.id, item.requestId)).run();
  }

  await logActivity({
    entityType: 'client_request',
    entityId: item.requestId,
    action: 'update_request_item',
    performedBy: params.performedByUserId,
    details: { itemId: params.itemId, label: item.label, itemType: item.itemType },
  });

  const detail = await getClientRequestById(item.requestId);
  return detail!;
}

/**
 * Approva una richiesta cliente: valida i contenuti, imposta lo stato 'approved'
 * e sblocca i task operativi collegati (senza completarli!).
 */
export async function approveClientRequest(
  requestId: string,
  performedByUserId: string,
  optionalComment?: string,
  user?: { userId: string; role: string }
): Promise<ClientRequestDetail> {
  const req = db.select().from(clientRequests).where(eq(clientRequests.id, requestId)).get();
  if (!req) throw new Error('Richiesta non trovata');

  const actor = user || { userId: performedByUserId, role: 'operator' };
  if (actor.role !== 'admin' && !canUserAccessClientRequest(actor, requestId, 'approve')) {
    throw new Error('FORBIDDEN');
  }

  const now = new Date().toISOString();

  // 1. Imposta la richiesta come approvata
  db.update(clientRequests)
    .set({
      status: 'approved',
      approvedAt: now,
      approvedByUserId: performedByUserId,
      rejectionReason: null,
      updatedAt: now,
    })
    .where(eq(clientRequests.id, requestId))
    .run();

  // 2. Imposta tutte le voci come approvate
  db.update(clientRequestItems)
    .set({
      status: 'approved',
      approvedAt: now,
    })
    .where(eq(clientRequestItems.requestId, requestId))
    .run();

  // 2b. Se la richiesta riguarda accessi o include deleghe, sincronizza il registro account aziendale
  // Nota: lo stato dell'account viene impostato su 'declared_by_client', MAI 'verified_active' in automatico!
  const approvedItems = db
    .select({ id: clientRequestItems.id, itemType: clientRequestItems.itemType })
    .from(clientRequestItems)
    .where(eq(clientRequestItems.requestId, requestId))
    .all();

  for (const item of approvedItems) {
    if (req.category === 'accesses' || item.itemType === 'access_confirmation') {
      try {
        await syncAccountFromApprovedClientRequestItem(requestId, item.id, performedByUserId);
      } catch (syncErr) {
        console.error('Account sync error on request item approval:', syncErr);
      }
    }
  }

  // 3. Sblocca i task collegati se non ci sono ALTRI blocchi attivi
  const linkedTasks = db
    .select()
    .from(clientRequestTaskLinks)
    .where(and(eq(clientRequestTaskLinks.requestId, requestId), eq(clientRequestTaskLinks.relationType, 'blocks')))
    .all();

  for (const link of linkedTasks) {
    // Controlla se esistono altre richieste bloccanti non ancora approvate per questo stesso task
    const otherBlockingLinks = db
      .select({
        reqId: clientRequestTaskLinks.requestId,
        reqStatus: clientRequests.status,
      })
      .from(clientRequestTaskLinks)
      .innerJoin(clientRequests, eq(clientRequestTaskLinks.requestId, clientRequests.id))
      .where(
        and(
          eq(clientRequestTaskLinks.taskId, link.taskId),
          eq(clientRequestTaskLinks.relationType, 'blocks'),
          sql`${clientRequestTaskLinks.requestId} != ${requestId}`,
          sql`${clientRequests.status} NOT IN ('approved', 'cancelled')`
        )
      )
      .all();

    // Se non rimangono altri blocchi da richieste cliente, verifica se il task è bloccato da dipendenze o da altro
    if (otherBlockingLinks.length === 0) {
      const currentTask = db.select().from(tasks).where(eq(tasks.id, link.taskId)).get();
      const isDependencyBlocked = isTaskBlocked(link.taskId);

      // Sblocca il task a 'da_fare' SOLO se era esplicitamente 'bloccato' E non è bloccato da dipendenze predecessori
      if (currentTask && currentTask.status === 'bloccato' && !isDependencyBlocked) {
        db.update(tasks)
          .set({
            status: 'da_fare',
            updatedAt: now,
          })
          .where(eq(tasks.id, link.taskId))
          .run();

        await logActivity({
          entityType: 'task',
          entityId: link.taskId,
          action: 'task_unblocked_by_client_request',
          performedBy: performedByUserId,
          details: { unblockedByRequestId: requestId, taskTitle: currentTask.title },
        });
      }
    }
  }

  await logActivity({
    entityType: 'client_request',
    entityId: requestId,
    action: 'approve_client_request',
    performedBy: performedByUserId,
    details: { title: req.title, projectId: req.projectId },
  });

  const updated = await getClientRequestById(requestId);
  return updated!;
}

/**
 * Rifiuta una richiesta cliente con motivazione obbligatoria
 */
export async function rejectClientRequest(
  requestId: string,
  rejectionReason: string,
  performedByUserId: string,
  user?: { userId: string; role: string }
): Promise<ClientRequestDetail> {
  const cleanReason = (rejectionReason || '').trim();
  if (!cleanReason || cleanReason.length < 3) {
    throw new Error('La motivazione del rifiuto è obbligatoria e deve contenere almeno 3 caratteri.');
  }

  const sec = validateNoSensitiveCredentials(cleanReason);
  if (!sec.isValid) throw new Error(sec.error);

  const req = db.select().from(clientRequests).where(eq(clientRequests.id, requestId)).get();
  if (!req) throw new Error('Richiesta non trovata');

  const actor = user || { userId: performedByUserId, role: 'operator' };
  if (actor.role !== 'admin' && !canUserAccessClientRequest(actor, requestId, 'approve')) {
    throw new Error('FORBIDDEN');
  }

  const now = new Date().toISOString();

  db.update(clientRequests)
    .set({
      status: 'rejected',
      rejectionReason: cleanReason,
      updatedAt: now,
    })
    .where(eq(clientRequests.id, requestId))
    .run();

  await logActivity({
    entityType: 'client_request',
    entityId: requestId,
    action: 'reject_client_request',
    performedBy: performedByUserId,
    details: { rejectionReason: cleanReason, title: req.title },
  });

  const updated = await getClientRequestById(requestId);
  return updated!;
}

/**
 * Aggiunge un commento a una richiesta cliente
 */
export async function addRequestComment(
  params: {
    requestId: string;
    authorUserId: string;
    content: string;
    visibility?: 'internal' | 'client';
  },
  user?: { userId: string; role: string }
): Promise<RequestCommentData> {
  const cleanContent = (params.content || '').trim();
  if (!cleanContent) throw new Error('Il commento non può essere vuoto.');

  const sec = validateNoSensitiveCredentials(cleanContent);
  if (!sec.isValid) throw new Error(sec.error);

  const req = db.select().from(clientRequests).where(eq(clientRequests.id, params.requestId)).get();
  if (!req) throw new Error('Richiesta non trovata');

  const actor = user || { userId: params.authorUserId, role: 'operator' };
  if (!canUserAccessClientRequest(actor, params.requestId)) {
    throw new Error('FORBIDDEN');
  }
  if (actor.role === 'client' && params.visibility === 'internal') {
    throw new Error('FORBIDDEN: I clienti non possono creare commenti interni.');
  }

  const authorUser = db.select().from(users).where(eq(users.id, params.authorUserId)).get();

  const commentId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  db.insert(requestComments)
    .values({
      id: commentId,
      requestId: params.requestId,
      authorUserId: params.authorUserId,
      content: cleanContent,
      visibility: params.visibility || 'internal',
      createdAt: now,
    })
    .run();

  await logActivity({
    entityType: 'client_request',
    entityId: params.requestId,
    action: 'add_request_comment',
    performedBy: params.authorUserId,
    details: { visibility: params.visibility || 'internal' },
  });

  return {
    id: commentId,
    requestId: params.requestId,
    authorUserId: params.authorUserId,
    authorName: authorUser?.name || 'Utente',
    authorRole: authorUser?.role || 'operator',
    content: cleanContent,
    visibility: (params.visibility || 'internal') as 'internal' | 'client',
    createdAt: now,
  };
}

/**
 * Genera automaticamente le richieste materiali da un template standard (es. Onboarding sito web e marketing)
 * Supporta dry-run anteprima, esclusione elementi/categorie, prevenzione duplicati e chiave di idempotenza.
 */
export async function generateClientRequestsFromTemplate(
  params: {
    projectId: string;
    templateCode?: string;
    preview?: boolean;
    excludedGroupIds?: string[];
    excludedItemIds?: string[];
    idempotencyKey?: string;
    performedByUserId: string;
  },
  user?: { userId: string; role: string }
): Promise<{
  success: boolean;
  preview: boolean;
  templateCode: string;
  templateName: string;
  version: number;
  groups: Array<{
    id: string;
    title: string;
    category: ClientRequestCategory;
    priority: ClientRequestPriority;
    blocksTaskCompletion: boolean;
    itemsCount: number;
    matchedTasks: Array<{ id: string; title: string }>;
    isDuplicate: boolean;
    duplicateWarning?: string;
    items: Array<{
      id: string;
      label: string;
      itemType: ClientRequestItemType;
      required: boolean;
      defaultRelation?: string;
    }>;
  }>;
  totalRequestsGenerated?: number;
  totalItemsGenerated?: number;
  totalTasksLinked?: number;
  duplicateWarningsCount: number;
}> {
  const actor = user || { userId: params.performedByUserId, role: 'operator' };
  if (!checkUserProjectAccess(actor, params.projectId)) {
    throw new Error('FORBIDDEN');
  }

  const project = db.select().from(projects).where(eq(projects.id, params.projectId)).get();
  if (!project) throw new Error('Progetto non trovato');

  const template = SEED_ONBOARDING_WEBSITE_MARKETING_TEMPLATE;
  const projectTasks = db.select().from(tasks).where(eq(tasks.projectId, params.projectId)).all();
  const existingRequests = db.select().from(clientRequests).where(eq(clientRequests.projectId, params.projectId)).all();

  // Controllo Idempotenza
  if (params.idempotencyKey && !params.preview) {
    const alreadyGenerated = db
      .select()
      .from(clientRequests)
      .where(and(eq(clientRequests.projectId, params.projectId), eq(clientRequests.idempotencyKey, params.idempotencyKey)))
      .all();

    if (alreadyGenerated.length > 0) {
      return {
        success: true,
        preview: false,
        templateCode: template.code,
        templateName: template.name,
        version: template.version,
        groups: [],
        totalRequestsGenerated: 0,
        totalItemsGenerated: 0,
        totalTasksLinked: 0,
        duplicateWarningsCount: 0,
      };
    }
  }

  const existingTitles = new Set(existingRequests.map((r) => r.title.toLowerCase().trim()));
  const excludedGroupIds = new Set(params.excludedGroupIds || []);
  const excludedItemIds = new Set(params.excludedItemIds || []);

  const groupsPreview: any[] = [];
  let duplicateWarningsCount = 0;

  for (const group of template.groups) {
    if (excludedGroupIds.has(group.id)) continue;

    const isDuplicate = existingTitles.has(group.title.toLowerCase().trim());
    if (isDuplicate) duplicateWarningsCount++;

    const matchedTaskIds = matchTasksForRequest(group.targetTaskKeywords, projectTasks);
    const matchedTasks = projectTasks
      .filter((t) => matchedTaskIds.includes(t.id))
      .map((t) => ({ id: t.id, title: t.title }));

    const activeItems = group.items.filter((item) => !excludedItemIds.has(item.id));

    groupsPreview.push({
      id: group.id,
      title: group.title,
      category: group.category,
      priority: group.priority,
      blocksTaskCompletion: group.blocksTaskCompletion,
      itemsCount: activeItems.length,
      matchedTasks,
      isDuplicate,
      duplicateWarning: isDuplicate ? `Esiste già una richiesta denominata "${group.title}" in questo progetto` : undefined,
      items: activeItems.map((i) => ({
        id: i.id,
        label: i.label,
        itemType: i.itemType,
        required: i.required,
        defaultRelation: i.defaultRelation,
        accessConfig: i.accessConfig,
      })),
    });
  }

  // Se è solo anteprima (dry-run), ritorna senza scrivere su DB
  if (params.preview) {
    return {
      success: true,
      preview: true,
      templateCode: template.code,
      templateName: template.name,
      version: template.version,
      groups: groupsPreview,
      duplicateWarningsCount,
    };
  }

  // Esecuzione reale atomica
  const now = new Date().toISOString();
  let totalRequestsGenerated = 0;
  let totalItemsGenerated = 0;
  let totalTasksLinked = 0;

  for (const group of groupsPreview) {
    // Evita di creare duplicati se già presente
    if (group.isDuplicate) continue;

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${totalRequestsGenerated}`;

    db.insert(clientRequests)
      .values({
        id: requestId,
        projectId: params.projectId,
        orderId: project.orderId || null,
        companyId: project.companyId || null,
        title: group.title,
        description: group.title,
        category: group.category,
        status: 'requested',
        priority: group.priority,
        dueDate: null,
        requestedByUserId: params.performedByUserId,
        assignedToUserId: null,
        clientVisible: true,
        blocksTaskCompletion: group.blocksTaskCompletion,
        createdAt: now,
        updatedAt: now,
        templateCode: template.code,
        templateVersion: template.version,
        idempotencyKey: params.idempotencyKey || null,
      })
      .run();

    totalRequestsGenerated++;

    // Inserisci Items
    for (let i = 0; i < group.items.length; i++) {
      const item = group.items[i];
      const itemId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${i}`;

      db.insert(clientRequestItems)
        .values({
          id: itemId,
          requestId: requestId,
          label: item.label,
          description: null,
          itemType: item.itemType,
          required: item.required,
          status: 'missing',
          accessConfigJson: item.accessConfig ? JSON.stringify(item.accessConfig) : null,
          sortOrder: i,
        })
        .run();

      totalItemsGenerated++;
    }

    // Collega Tasks
    for (const task of group.matchedTasks) {
      const linkId = `link_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      db.insert(clientRequestTaskLinks)
        .values({
          id: linkId,
          requestId: requestId,
          taskId: task.id,
          relationType: group.blocksTaskCompletion ? 'blocks' : 'supports',
          createdAt: now,
        })
        .run();

      totalTasksLinked++;
    }
  }

  await logActivity({
    entityType: 'project',
    entityId: params.projectId,
    action: 'generate_client_requests_from_template',
    performedBy: params.performedByUserId,
    details: {
      templateCode: template.code,
      requestsGenerated: totalRequestsGenerated,
      itemsGenerated: totalItemsGenerated,
      tasksLinked: totalTasksLinked,
    },
  });

  return {
    success: true,
    preview: false,
    templateCode: template.code,
    templateName: template.name,
    version: template.version,
    groups: groupsPreview,
    totalRequestsGenerated,
    totalItemsGenerated,
    totalTasksLinked,
    duplicateWarningsCount,
  };
}

/**
 * Dashboard Operativa: Recupera riepilogo globale/per-progetto delle richieste in attesa, da validare, bloccanti e scadute
 */
export async function getDashboardClientRequestsSummary(projectId?: string) {
  const today = new Date().toISOString().slice(0, 10);

  let query = db
    .select({
      req: clientRequests,
      projTitle: projects.title,
    })
    .from(clientRequests)
    .innerJoin(projects, eq(clientRequests.projectId, projects.id));

  const rows = projectId ? query.where(eq(clientRequests.projectId, projectId)).all() : query.all();

  const pendingClient = rows.filter((r) => ['requested', 'partially_received'].includes(r.req.status));
  const toValidate = rows.filter((r) => ['received', 'under_review'].includes(r.req.status));
  const blockingTasks = rows.filter((r) => r.req.blocksTaskCompletion && !['approved', 'cancelled'].includes(r.req.status));
  const overdue = rows.filter((r) => r.req.dueDate && r.req.dueDate < today && !['approved', 'cancelled'].includes(r.req.status));

  return {
    pendingClientCount: pendingClient.length,
    toValidateCount: toValidate.length,
    blockingTasksCount: blockingTasks.length,
    overdueCount: overdue.length,
    pendingClient: pendingClient.slice(0, 5).map((r) => ({ id: r.req.id, title: r.req.title, project: r.projTitle, dueDate: r.req.dueDate, priority: r.req.priority })),
    toValidate: toValidate.slice(0, 5).map((r) => ({ id: r.req.id, title: r.req.title, project: r.projTitle, receivedAt: r.req.receivedAt, priority: r.req.priority })),
    overdue: overdue.slice(0, 5).map((r) => ({ id: r.req.id, title: r.req.title, project: r.projTitle, dueDate: r.req.dueDate })),
  };
}
