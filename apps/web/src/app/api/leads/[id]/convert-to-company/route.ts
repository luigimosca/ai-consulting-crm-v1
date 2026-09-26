import { NextResponse } from 'next/server';
import { db, leads, companies, financialIndicators, publicContacts, decisionMakers, users } from '@ai-crm/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const lead = db.select().from(leads).where(eq(leads.id, id)).get();
    if (!lead) {
      return NextResponse.json({ error: 'Lead non trovato' }, { status: 404 });
    }

    // Check if company with same name already exists
    let existingCompany = db.select().from(companies).where(eq(companies.name, lead.companyName)).get();

    const now = new Date().toISOString();

    // Fetch financial indicators if available
    const fi = db.select().from(financialIndicators).where(eq(financialIndicators.leadId, id)).get();

    if (existingCompany) {
      // Update existing company if new data available
      db.update(companies)
        .set({
          legalName: existingCompany.legalName || lead.companyName,
          vatId: existingCompany.vatId || fi?.vatId || null,
          fiscalCode: existingCompany.fiscalCode || fi?.taxCode || null,
          ateco: existingCompany.ateco || fi?.atecoCode || null,
          phone: existingCompany.phone || lead.phone || null,
          email: existingCompany.email || lead.email || null,
          website: existingCompany.website || lead.website || null,
          city: existingCompany.city || lead.city || null,
          address: existingCompany.address || lead.address || null,
          operatingAddress: existingCompany.operatingAddress || lead.address || null,
          updatedAt: now,
        })
        .where(eq(companies.id, existingCompany.id))
        .run();
    } else {
      const companyId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newCompany = {
        id: companyId,
        name: lead.companyName,
        legalName: lead.companyName,
        vatId: fi?.vatId || null,
        fiscalCode: fi?.taxCode || null,
        rea: null,
        sector: lead.sector,
        ateco: fi?.atecoCode || null,
        legalAddress: null,
        operatingAddress: lead.address || null,
        estimatedRevenue: fi?.revenueOfficial ? `${fi.revenueOfficial / 100} €` : null,
        employeeCount: fi?.employeesOfficial ? String(fi.employeesOfficial) : null,
        techStackJson: null,
        address: lead.address || null,
        city: lead.city || null,
        province: null,
        phone: lead.phone || null,
        email: lead.email || null,
        pec: null,
        website: lead.website || null,
        rating: null,
        reviewCount: 0,
        notes: `Convertita da Lead CRM (${lead.id}) il ${now.slice(0, 10)}. ${lead.notes || ''}`,
        source: 'crm_lead',
        sourceUrl: `/crm/leads/${lead.id}`,
        confidence: 'high',
        createdAt: now,
        updatedAt: now,
      };

      db.insert(companies).values(newCompany).run();
      existingCompany = newCompany as any;
    }

    // Update lead status to convertito
    db.update(leads)
      .set({ status: 'convertito', updatedAt: now })
      .where(eq(leads.id, id))
      .run();

    await logActivity({
      entityType: 'lead',
      entityId: id,
      action: 'lead_converted_to_company',
      performedBy: user.userId,
      details: { companyId: existingCompany?.id, companyName: lead.companyName },
    });

    return NextResponse.json({
      success: true,
      message: 'Lead convertito con successo in Azienda Cliente',
      company: existingCompany,
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error?.message || 'Errore conversione lead in azienda' },
      { status: 500 }
    );
  }
}
