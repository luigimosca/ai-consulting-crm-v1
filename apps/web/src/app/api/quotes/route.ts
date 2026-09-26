import { NextResponse } from 'next/server';
import { db, quotes, leads, companies, users } from '@ai-crm/db';
import { eq, desc, like, or, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { createQuote } from '@/lib/quotes-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const status = searchParams.get('status');
    const q = searchParams.get('q');

    let allQuotes = db
      .select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        title: quotes.title,
        leadId: quotes.leadId,
        companyId: quotes.companyId,
        status: quotes.status,
        currentVersionNumber: quotes.currentVersionNumber,
        subtotal: quotes.subtotal,
        discountTotal: quotes.discountTotal,
        taxRate: quotes.taxRate,
        taxTotal: quotes.taxTotal,
        totalAmount: quotes.totalAmount,
        currency: quotes.currency,
        validUntil: quotes.validUntil,
        paymentTerms: quotes.paymentTerms,
        deliveryTerms: quotes.deliveryTerms,
        createdBy: quotes.createdBy,
        createdAt: quotes.createdAt,
        updatedAt: quotes.updatedAt,
        leadCompanyName: leads.companyName,
        creatorName: users.name,
      })
      .from(quotes)
      .leftJoin(leads, eq(quotes.leadId, leads.id))
      .leftJoin(users, eq(quotes.createdBy, users.id))
      .orderBy(desc(quotes.createdAt))
      .all();

    if (leadId) {
      allQuotes = allQuotes.filter((item) => item.leadId === leadId);
    }

    if (status && status !== 'all') {
      allQuotes = allQuotes.filter((item) => item.status === status);
    }

    if (q) {
      const term = q.toLowerCase();
      allQuotes = allQuotes.filter(
        (item) =>
          item.quoteNumber.toLowerCase().includes(term) ||
          item.title.toLowerCase().includes(term) ||
          (item.leadCompanyName && item.leadCompanyName.toLowerCase().includes(term))
      );
    }

    return NextResponse.json({ success: true, quotes: allQuotes });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore recupero preventivi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    if (!body.title || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Titolo e almeno una voce di preventivo sono obbligatori' },
        { status: 400 }
      );
    }

    const result = await createQuote(
      {
        leadId: body.leadId,
        companyId: body.companyId,
        title: body.title,
        items: body.items,
        validUntil: body.validUntil,
        paymentTerms: body.paymentTerms,
        deliveryTerms: body.deliveryTerms,
        notes: body.notes,
      },
      user
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Errore creazione preventivo' }, { status: 500 });
  }
}
