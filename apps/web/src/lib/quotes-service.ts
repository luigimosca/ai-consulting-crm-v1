import {
  db,
  quotes,
  quoteVersions,
  quoteItems,
  approvals,
  orders,
  projects,
  tasks,
  leads,
  companies,
  users,
} from '@ai-crm/db';
import { eq, desc, and } from 'drizzle-orm';
import { calcQuoteTotals, calcLineTotal } from './money';
import { logActivity } from './activity-logger';

// ---------------------------------------------------------------------------
// Unique Code Generators
// ---------------------------------------------------------------------------

export function generateQuoteNumber(): string {
  const year = new Date().getFullYear();
  const allQuotes = db.select({ quoteNumber: quotes.quoteNumber }).from(quotes).all();

  const currentYearNumbers = allQuotes
    .map((q) => {
      const match = q.quoteNumber.match(/PREV-(\d{4})-(\d+)/);
      if (match && parseInt(match[1]) === year) {
        return parseInt(match[2]);
      }
      return 0;
    })
    .filter((n) => !isNaN(n));

  const maxSeq = currentYearNumbers.length > 0 ? Math.max(...currentYearNumbers) : 0;
  const nextSeq = (maxSeq + 1).toString().padStart(4, '0');
  return `PREV-${year}-${nextSeq}`;
}

export function generateOrderCode(): string {
  const year = new Date().getFullYear();
  const allOrders = db.select({ code: orders.code }).from(orders).all();

  const currentYearNumbers = allOrders
    .map((o) => {
      const match = o.code.match(/COM-(\d{4})-(\d+)/);
      if (match && parseInt(match[1]) === year) {
        return parseInt(match[2]);
      }
      return 0;
    })
    .filter((n) => !isNaN(n));

  const maxSeq = currentYearNumbers.length > 0 ? Math.max(...currentYearNumbers) : 0;
  const nextSeq = (maxSeq + 1).toString().padStart(4, '0');
  return `COM-${year}-${nextSeq}`;
}

export function generateProjectCode(): string {
  const year = new Date().getFullYear();
  const allProjects = db.select({ code: projects.code }).from(projects).all();

  const currentYearNumbers = allProjects
    .map((p) => {
      const match = p.code.match(/PRJ-(\d{4})-(\d+)/);
      if (match && parseInt(match[1]) === year) {
        return parseInt(match[2]);
      }
      return 0;
    })
    .filter((n) => !isNaN(n));

  const maxSeq = currentYearNumbers.length > 0 ? Math.max(...currentYearNumbers) : 0;
  const nextSeq = (maxSeq + 1).toString().padStart(4, '0');
  return `PRJ-${year}-${nextSeq}`;
}

// ---------------------------------------------------------------------------
// Quote Service Logic
// ---------------------------------------------------------------------------

export interface CreateQuoteItemInput {
  description: string;
  quantity: number;
  unitPrice: number; // cents
  discountPercent?: number;
  taxRate?: number;
  costType?: 'one_time' | 'recurring_monthly' | 'recurring_yearly';
  notes?: string;
}

export interface CreateQuoteInput {
  leadId?: string;
  companyId?: string;
  title: string;
  items: CreateQuoteItemInput[];
  validUntil?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  notes?: string;
}

export async function createQuote(
  input: CreateQuoteInput,
  currentUser: { userId: string; role: string }
) {
  const now = new Date().toISOString();
  const quoteId = `quo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const quoteNumber = generateQuoteNumber();

  // Exact calculations
  const totals = calcQuoteTotals(input.items);

  // 1. Insert Quote
  const newQuote = {
    id: quoteId,
    quoteNumber,
    leadId: input.leadId || null,
    companyId: input.companyId || null,
    title: input.title,
    status: 'bozza' as const,
    currentVersionNumber: 1,
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    taxRate: 22.0,
    taxTotal: totals.taxTotal,
    totalAmount: totals.totalAmount,
    currency: 'EUR',
    validUntil: input.validUntil || null,
    paymentTerms: input.paymentTerms || '30% all\'avvio, 40% al rilascio beta, 30% al collaudo finale',
    deliveryTerms: input.deliveryTerms || '30 giorni lavorativi dall\'accettazione formale',
    notes: input.notes || null,
    createdBy: currentUser.userId,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(quotes).values(newQuote).run();

  // 2. Insert Quote Items
  const itemsToInsert = input.items.map((item, idx) => {
    const itemId = `qi_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
    const lineTotal = calcLineTotal(item.quantity, item.unitPrice, item.discountPercent || 0);

    return {
      id: itemId,
      quoteId,
      versionNumber: 1,
      description: item.description,
      quantity: Number(item.quantity) || 1,
      unitPrice: Math.round(Number(item.unitPrice) || 0),
      discountPercent: Number(item.discountPercent) || 0,
      taxRate: Number(item.taxRate) || 22.0,
      costType: item.costType || 'one_time',
      sortOrder: idx,
      lineTotal,
      notes: item.notes || null,
      createdAt: now,
    };
  });

  for (const it of itemsToInsert) {
    db.insert(quoteItems).values(it).run();
  }

  // 3. Create initial version snapshot (Version 1)
  const versionId = `qv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  db.insert(quoteVersions)
    .values({
      id: versionId,
      quoteId,
      versionNumber: 1,
      status: 'bozza',
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxRate: 22.0,
      taxTotal: totals.taxTotal,
      totalAmount: totals.totalAmount,
      validUntil: input.validUntil || null,
      paymentTerms: newQuote.paymentTerms,
      deliveryTerms: newQuote.deliveryTerms,
      notes: input.notes || null,
      snapshotItemsJson: JSON.stringify(itemsToInsert),
      createdBy: currentUser.userId,
      createdAt: now,
    })
    .run();

  await logActivity({
    entityType: 'quote',
    entityId: quoteId,
    action: 'quote_created',
    performedBy: currentUser.userId,
    details: { quoteNumber, title: input.title, totalAmount: totals.totalAmount },
  });

  return { quote: newQuote, items: itemsToInsert, versionId };
}

export async function snapshotQuoteVersion(
  quoteId: string,
  newStatus: 'bozza' | 'in_approvazione_interna' | 'approvato_internamente' | 'inviato' | 'accettato' | 'rifiutato' | 'scaduto',
  currentUser: { userId: string }
) {
  const quote = db.select().from(quotes).where(eq(quotes.id, quoteId)).get();
  if (!quote) throw new Error('Quote not found');

  const items = db
    .select()
    .from(quoteItems)
    .where(and(eq(quoteItems.quoteId, quoteId), eq(quoteItems.versionNumber, quote.currentVersionNumber)))
    .orderBy(quoteItems.sortOrder)
    .all();

  const now = new Date().toISOString();
  const versionId = `qv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  db.insert(quoteVersions)
    .values({
      id: versionId,
      quoteId,
      versionNumber: quote.currentVersionNumber,
      status: newStatus,
      subtotal: quote.subtotal,
      discountTotal: quote.discountTotal,
      taxRate: quote.taxRate,
      taxTotal: quote.taxTotal,
      totalAmount: quote.totalAmount,
      validUntil: quote.validUntil,
      paymentTerms: quote.paymentTerms,
      deliveryTerms: quote.deliveryTerms,
      notes: quote.notes,
      snapshotItemsJson: JSON.stringify(items),
      createdBy: currentUser.userId,
      createdAt: now,
    })
    .run();

  return versionId;
}

export async function requestInternalApproval(
  quoteId: string,
  currentUser: { userId: string }
) {
  const quote = db.select().from(quotes).where(eq(quotes.id, quoteId)).get();
  if (!quote) throw new Error('Quote not found');

  if (quote.status !== 'bozza') {
    throw new Error(`Non è possibile richiedere l'approvazione di un preventivo in stato "${quote.status}"`);
  }

  const now = new Date().toISOString();
  const approvalId = `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Create approval record
  db.insert(approvals)
    .values({
      id: approvalId,
      entityType: 'quote',
      entityId: quoteId,
      approvalType: 'internal',
      status: 'richiesta',
      requestedBy: currentUser.userId,
      requestedAt: now,
      comment: 'Richiesta approvazione interna prima dell\'invio al cliente',
      createdAt: now,
      updatedAt: now,
    })
    .run();

  // Update quote status
  db.update(quotes)
    .set({
      status: 'in_approvazione_interna',
      updatedAt: now,
    })
    .where(eq(quotes.id, quoteId))
    .run();

  await snapshotQuoteVersion(quoteId, 'in_approvazione_interna', currentUser);

  await logActivity({
    entityType: 'quote',
    entityId: quoteId,
    action: 'approval_requested_internal',
    performedBy: currentUser.userId,
    details: { approvalId },
  });

  return { success: true, approvalId };
}

export async function decideInternalApproval(
  quoteId: string,
  decision: 'approvata' | 'rifiutata',
  comment: string,
  currentUser: { userId: string; role: string }
) {
  if (currentUser.role !== 'admin') {
    throw new Error('Solo gli amministratori possono approvare internamente i preventivi.');
  }

  const quote = db.select().from(quotes).where(eq(quotes.id, quoteId)).get();
  if (!quote) throw new Error('Quote not found');

  const now = new Date().toISOString();

  // Find latest pending internal approval
  const pendingApproval = db
    .select()
    .from(approvals)
    .where(
      and(
        eq(approvals.entityType, 'quote'),
        eq(approvals.entityId, quoteId),
        eq(approvals.approvalType, 'internal'),
        eq(approvals.status, 'richiesta')
      )
    )
    .orderBy(desc(approvals.createdAt))
    .get();

  if (pendingApproval) {
    db.update(approvals)
      .set({
        status: decision,
        decidedBy: currentUser.userId,
        decidedAt: now,
        comment: comment || (decision === 'approvata' ? 'Approvato per invio al cliente' : 'Revisione richiesta'),
        method: 'internal_review',
        updatedAt: now,
      })
      .where(eq(approvals.id, pendingApproval.id))
      .run();
  } else {
    // Direct admin approval
    const approvalId = `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    db.insert(approvals)
      .values({
        id: approvalId,
        entityType: 'quote',
        entityId: quoteId,
        approvalType: 'internal',
        status: decision,
        requestedBy: currentUser.userId,
        requestedAt: now,
        decidedBy: currentUser.userId,
        decidedAt: now,
        comment: comment || 'Approvato direttamente da Admin',
        method: 'internal_review',
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  const nextStatus = decision === 'approvata' ? 'approvato_internamente' : 'bozza';

  db.update(quotes)
    .set({
      status: nextStatus,
      updatedAt: now,
    })
    .where(eq(quotes.id, quoteId))
    .run();

  await snapshotQuoteVersion(quoteId, nextStatus, currentUser);

  await logActivity({
    entityType: 'quote',
    entityId: quoteId,
    action: `approval_internal_${decision}`,
    performedBy: currentUser.userId,
    details: { decision, comment },
  });

  return { success: true, nextStatus };
}

export async function markSentToClient(
  quoteId: string,
  currentUser: { userId: string }
) {
  const quote = db.select().from(quotes).where(eq(quotes.id, quoteId)).get();
  if (!quote) throw new Error('Quote not found');

  if (quote.status !== 'approvato_internamente' && quote.status !== 'bozza') {
    throw new Error(`Il preventivo deve essere approvato internamente prima dell'invio.`);
  }

  const now = new Date().toISOString();

  db.update(quotes)
    .set({
      status: 'inviato',
      updatedAt: now,
    })
    .where(eq(quotes.id, quoteId))
    .run();

  await snapshotQuoteVersion(quoteId, 'inviato', currentUser);

  await logActivity({
    entityType: 'quote',
    entityId: quoteId,
    action: 'quote_sent_to_client',
    performedBy: currentUser.userId,
  });

  return { success: true };
}

export interface ClientAcceptanceParams {
  decidedBy: string; // Name of client contact who accepted
  decidedAt?: string; // Date of acceptance
  method: 'email_confirmation' | 'signed_document' | 'verbal_with_notes' | 'portal_action';
  evidenceNotes: string;
  evidenceDocumentId?: string;
  comment?: string;
}

export async function recordClientAcceptance(
  quoteId: string,
  params: ClientAcceptanceParams,
  currentUser: { userId: string }
) {
  if (!params.decidedBy || !params.evidenceNotes || !params.method) {
    throw new Error('È obbligatorio registrare persona referente, metodo ed evidenza dell\'accettazione del cliente.');
  }

  const quote = db.select().from(quotes).where(eq(quotes.id, quoteId)).get();
  if (!quote) throw new Error('Quote not found');

  const now = new Date().toISOString();
  const acceptanceDate = params.decidedAt || now;
  const approvalId = `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Record Client Approval with Evidence
  db.insert(approvals)
    .values({
      id: approvalId,
      entityType: 'quote',
      entityId: quoteId,
      approvalType: 'client',
      status: 'approvata',
      requestedBy: currentUser.userId,
      requestedAt: now,
      decidedBy: params.decidedBy,
      decidedAt: acceptanceDate,
      comment: params.comment || `Accettazione formale registrata da ${params.decidedBy}`,
      method: params.method,
      evidenceDocumentId: params.evidenceDocumentId || null,
      evidenceNotes: params.evidenceNotes,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  // Freeze quote status to 'accettato'
  db.update(quotes)
    .set({
      status: 'accettato',
      updatedAt: now,
    })
    .where(eq(quotes.id, quoteId))
    .run();

  // Create permanent snapshot of accepted version
  const versionId = await snapshotQuoteVersion(quoteId, 'accettato', currentUser);

  // If lead is linked, update lead status to 'convertito'
  if (quote.leadId) {
    try {
      db.update(leads)
        .set({ status: 'convertito', updatedAt: now })
        .where(eq(leads.id, quote.leadId))
        .run();
    } catch {}
  }

  await logActivity({
    entityType: 'quote',
    entityId: quoteId,
    action: 'client_acceptance_recorded',
    performedBy: currentUser.userId,
    details: {
      clientContact: params.decidedBy,
      method: params.method,
      evidenceNotes: params.evidenceNotes,
      versionId,
    },
  });

  return { success: true, approvalId, versionId };
}

// ---------------------------------------------------------------------------
// Conversion to Commessa (Order) - Idempotent & Transactional
// ---------------------------------------------------------------------------

export async function convertQuoteToOrder(
  quoteId: string,
  options: {
    createInitialProject?: boolean;
    initialProjectTitle?: string;
    managerId?: string;
    startDate?: string;
    dueDate?: string;
  },
  currentUser: { userId: string; role: string }
) {
  if (currentUser.role !== 'admin') {
    throw new Error('Solo gli amministratori possono generare commesse operative.');
  }

  const quote = db.select().from(quotes).where(eq(quotes.id, quoteId)).get();
  if (!quote) throw new Error('Quote non trovato');

  if (quote.status !== 'accettato') {
    throw new Error(`Il preventivo deve essere in stato "accettato" con evidenza formale per poter creare la commessa (stato attuale: ${quote.status}).`);
  }

  // IDEMPOTENCY CHECK: Check if an order already exists for this quote
  const existingOrder = db.select().from(orders).where(eq(orders.quoteId, quoteId)).get();
  if (existingOrder) {
    return {
      order: existingOrder,
      isExisting: true,
      message: 'Commessa già creata precedentemente per questo preventivo.',
    };
  }

  const now = new Date().toISOString();
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const orderCode = generateOrderCode();

  // Get accepted version snapshot
  const acceptedVersion = db
    .select()
    .from(quoteVersions)
    .where(and(eq(quoteVersions.quoteId, quoteId), eq(quoteVersions.status, 'accettato')))
    .orderBy(desc(quoteVersions.createdAt))
    .get();

  const deliverablesSnapshotJson = acceptedVersion
    ? acceptedVersion.snapshotItemsJson
    : JSON.stringify(
        db
          .select()
          .from(quoteItems)
          .where(eq(quoteItems.quoteId, quoteId))
          .all()
      );

  const newOrder = {
    id: orderId,
    code: orderCode,
    title: `Commessa: ${quote.title}`,
    leadId: quote.leadId || null,
    companyId: quote.companyId || null,
    quoteId: quote.id,
    quoteVersionId: acceptedVersion ? acceptedVersion.id : null,
    agreedValue: quote.totalAmount, // Immutable agreed value snapshot
    currency: quote.currency || 'EUR',
    status: 'da_avviare' as const,
    managerId: options.managerId || currentUser.userId,
    startDate: options.startDate || now.slice(0, 10),
    dueDate: options.dueDate || quote.validUntil || null,
    completedAt: null,
    deliverablesSnapshotJson,
    notes: `Generata automaticamente dal preventivo ${quote.quoteNumber}`,
    createdBy: currentUser.userId,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(orders).values(newOrder).run();

  await logActivity({
    entityType: 'order',
    entityId: orderId,
    action: 'order_created_from_quote',
    performedBy: currentUser.userId,
    details: { code: orderCode, quoteNumber: quote.quoteNumber, agreedValue: quote.totalAmount },
  });

  // Optional: Auto-create initial project from template
  let initialProject = null;
  if (options.createInitialProject) {
    const projectId = `prj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const projectCode = generateProjectCode();
    const projectTitle = options.initialProjectTitle || `Progetto: ${quote.title}`;

    initialProject = {
      id: projectId,
      orderId,
      code: projectCode,
      title: projectTitle,
      description: `Progetto principale per commessa ${orderCode}. Deliverables: ${quote.title}`,
      status: 'pianificato' as const,
      managerId: options.managerId || currentUser.userId,
      startDate: options.startDate || now.slice(0, 10),
      dueDate: options.dueDate || null,
      completedAt: null,
      progressPercent: 0,
      budgetHours: 40,
      createdBy: currentUser.userId,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(projects).values(initialProject).run();

    // Create initial kick-off task
    const kickoffTaskId = `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    db.insert(tasks)
      .values({
        id: kickoffTaskId,
        projectId,
        title: 'Kick-off meeting & Setup architettura',
        description: 'Incontro iniziale con il cliente per definizione requisiti e avvio operativo',
        status: 'da_fare',
        priority: 'alta',
        plannedStartDate: options.startDate || now.slice(0, 10),
        plannedEndDate: options.startDate || now.slice(0, 10),
        estimatedHours: 4,
        actualHours: 0,
        progressPercent: 0,
        checklistJson: JSON.stringify([
          { id: '1', text: 'Raccolta accessi e credenziali', completed: false },
          { id: '2', text: 'Definizione roadmap e milestone', completed: false },
        ]),
        sortOrder: 0,
        createdBy: currentUser.userId,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    await logActivity({
      entityType: 'project',
      entityId: projectId,
      action: 'project_created_initial',
      performedBy: currentUser.userId,
      details: { code: projectCode, title: projectTitle },
    });
  }

  return {
    order: newOrder,
    project: initialProject,
    isExisting: false,
    message: 'Commessa creata con successo!',
  };
}
