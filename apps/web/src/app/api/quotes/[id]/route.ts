import { NextResponse } from 'next/server';
import {
  db,
  quotes,
  quoteItems,
  quoteVersions,
  approvals,
  orders,
  leads,
  companies,
  users,
} from '@ai-crm/db';
import { eq, desc, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { calcQuoteTotals, calcLineTotal } from '@/lib/money';
import {
  requestInternalApproval,
  decideInternalApproval,
  markSentToClient,
  recordClientAcceptance,
  convertQuoteToOrder,
  snapshotQuoteVersion,
} from '@/lib/quotes-service';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const quote = db.select().from(quotes).where(eq(quotes.id, id)).get();
    if (!quote) {
      return NextResponse.json({ error: 'Preventivo non trovato' }, { status: 404 });
    }

    const items = db
      .select()
      .from(quoteItems)
      .where(and(eq(quoteItems.quoteId, id), eq(quoteItems.versionNumber, quote.currentVersionNumber)))
      .orderBy(quoteItems.sortOrder)
      .all();

    const versions = db
      .select()
      .from(quoteVersions)
      .where(eq(quoteVersions.quoteId, id))
      .orderBy(desc(quoteVersions.versionNumber), desc(quoteVersions.createdAt))
      .all();

    const quoteApprovals = db
      .select({
        id: approvals.id,
        entityType: approvals.entityType,
        entityId: approvals.entityId,
        approvalType: approvals.approvalType,
        status: approvals.status,
        requestedBy: approvals.requestedBy,
        requestedAt: approvals.requestedAt,
        decidedBy: approvals.decidedBy,
        decidedAt: approvals.decidedAt,
        comment: approvals.comment,
        method: approvals.method,
        evidenceDocumentId: approvals.evidenceDocumentId,
        evidenceNotes: approvals.evidenceNotes,
        createdAt: approvals.createdAt,
        requesterName: users.name,
      })
      .from(approvals)
      .leftJoin(users, eq(approvals.requestedBy, users.id))
      .where(eq(approvals.entityId, id))
      .orderBy(desc(approvals.createdAt))
      .all();

    // Check if order exists
    const order = db.select().from(orders).where(eq(orders.quoteId, id)).get();

    // Lead & Company data
    let lead = null;
    if (quote.leadId) {
      lead = db.select().from(leads).where(eq(leads.id, quote.leadId)).get();
    }

    let company = null;
    if (quote.companyId) {
      company = db.select().from(companies).where(eq(companies.id, quote.companyId)).get();
    }

    return NextResponse.json({
      success: true,
      quote,
      items,
      versions,
      approvals: quoteApprovals,
      order,
      lead,
      company,
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore caricamento preventivo' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const quote = db.select().from(quotes).where(eq(quotes.id, id)).get();
    if (!quote) {
      return NextResponse.json({ error: 'Preventivo non trovato' }, { status: 404 });
    }

    // Only allow editing items and terms if in draft 'bozza'
    if (quote.status !== 'bozza') {
      return NextResponse.json(
        {
          error: `Il preventivo è in stato "${quote.status}". Per modificare le voci o le condizioni è necessario creare una nuova versione.`,
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // If updating items
    if (body.items && Array.isArray(body.items)) {
      const totals = calcQuoteTotals(body.items);

      // Delete existing items for current version
      db.delete(quoteItems)
        .where(and(eq(quoteItems.quoteId, id), eq(quoteItems.versionNumber, quote.currentVersionNumber)))
        .run();

      // Re-insert items
      for (let idx = 0; idx < body.items.length; idx++) {
        const item = body.items[idx];
        const lineTotal = calcLineTotal(item.quantity, item.unitPrice, item.discountPercent || 0);

        db.insert(quoteItems)
          .values({
            id: `qi_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
            quoteId: id,
            versionNumber: quote.currentVersionNumber,
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
          })
          .run();
      }

      // Update quote header
      db.update(quotes)
        .set({
          title: body.title || quote.title,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          taxRate: 22.0,
          taxTotal: totals.taxTotal,
          totalAmount: totals.totalAmount,
          validUntil: body.validUntil !== undefined ? body.validUntil : quote.validUntil,
          paymentTerms: body.paymentTerms !== undefined ? body.paymentTerms : quote.paymentTerms,
          deliveryTerms: body.deliveryTerms !== undefined ? body.deliveryTerms : quote.deliveryTerms,
          notes: body.notes !== undefined ? body.notes : quote.notes,
          updatedAt: now,
        })
        .where(eq(quotes.id, id))
        .run();

      await logActivity({
        entityType: 'quote',
        entityId: id,
        action: 'quote_updated',
        performedBy: user.userId,
        details: { totalAmount: totals.totalAmount },
      });
    } else {
      // Simple metadata update
      db.update(quotes)
        .set({
          title: body.title || quote.title,
          validUntil: body.validUntil !== undefined ? body.validUntil : quote.validUntil,
          paymentTerms: body.paymentTerms !== undefined ? body.paymentTerms : quote.paymentTerms,
          deliveryTerms: body.deliveryTerms !== undefined ? body.deliveryTerms : quote.deliveryTerms,
          notes: body.notes !== undefined ? body.notes : quote.notes,
          updatedAt: now,
        })
        .where(eq(quotes.id, id))
        .run();
    }

    return NextResponse.json({ success: true, message: 'Preventivo aggiornato con successo' });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore aggiornamento preventivo' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'request_approval': {
        const res = await requestInternalApproval(id, user);
        return NextResponse.json(res);
      }

      case 'decide_internal_approval': {
        const { decision, comment } = body;
        if (!decision || (decision !== 'approvata' && decision !== 'rifiutata')) {
          return NextResponse.json({ error: 'Decisione non valida (approvata / rifiutata)' }, { status: 400 });
        }
        const res = await decideInternalApproval(id, decision, comment, user);
        return NextResponse.json(res);
      }

      case 'send_client': {
        const res = await markSentToClient(id, user);
        return NextResponse.json(res);
      }

      case 'accept_client': {
        const { decidedBy, decidedAt, method, evidenceNotes, evidenceDocumentId, comment } = body;
        if (!decidedBy || !method || !evidenceNotes) {
          return NextResponse.json(
            { error: 'Nome referente cliente, metodo ed evidenza dell\'accettazione sono obbligatori' },
            { status: 400 }
          );
        }
        const res = await recordClientAcceptance(
          id,
          {
            decidedBy,
            decidedAt,
            method,
            evidenceNotes,
            evidenceDocumentId,
            comment,
          },
          user
        );
        return NextResponse.json(res);
      }

      case 'convert_to_order': {
        const { createInitialProject, initialProjectTitle, managerId, startDate, dueDate } = body;
        const res = await convertQuoteToOrder(
          id,
          {
            createInitialProject: !!createInitialProject,
            initialProjectTitle,
            managerId,
            startDate,
            dueDate,
          },
          user
        );
        return NextResponse.json(res);
      }

      case 'new_version': {
        // Creates a new draft version from previous snapshot
        const quote = db.select().from(quotes).where(eq(quotes.id, id)).get();
        if (!quote) return NextResponse.json({ error: 'Preventivo non trovato' }, { status: 404 });

        const nextVerNum = quote.currentVersionNumber + 1;
        const now = new Date().toISOString();

        // Clone items to new version
        const currentItems = db
          .select()
          .from(quoteItems)
          .where(and(eq(quoteItems.quoteId, id), eq(quoteItems.versionNumber, quote.currentVersionNumber)))
          .all();

        for (const it of currentItems) {
          db.insert(quoteItems)
            .values({
              id: `qi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              quoteId: id,
              versionNumber: nextVerNum,
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              discountPercent: it.discountPercent,
              taxRate: it.taxRate,
              costType: it.costType,
              sortOrder: it.sortOrder,
              lineTotal: it.lineTotal,
              notes: it.notes,
              createdAt: now,
            })
            .run();
        }

        db.update(quotes)
          .set({
            currentVersionNumber: nextVerNum,
            status: 'bozza',
            updatedAt: now,
          })
          .where(eq(quotes.id, id))
          .run();

        await snapshotQuoteVersion(id, 'bozza', user);

        await logActivity({
          entityType: 'quote',
          entityId: id,
          action: 'quote_new_version_created',
          performedBy: user.userId,
          details: { versionNumber: nextVerNum },
        });

        return NextResponse.json({ success: true, versionNumber: nextVerNum });
      }

      default:
        return NextResponse.json({ error: `Azione non supportata: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore esecuzione azione preventivo' }, { status: 500 });
  }
}
