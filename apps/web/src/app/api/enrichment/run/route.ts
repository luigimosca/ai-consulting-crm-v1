import { NextResponse } from 'next/server';
import { db, leads } from '@ai-crm/db';
import { eq } from 'drizzle-orm';
import { EnrichmentOrchestrator } from '@ai-crm/ai';
import { saveEnrichmentDossierToDb } from '@/lib/enrichment-db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leadId, companyName, website, phone, email, address, city, sector, notes } = body;

    if (!leadId && !companyName) {
      return NextResponse.json(
        { success: false, error: 'Specificare un leadId valido o i dati minimi dell\'azienda' },
        { status: 400 }
      );
    }

    let targetLead: any = null;
    if (leadId) {
      targetLead = db.select().from(leads).where(eq(leads.id, leadId)).get();
    }

    const leadInput = targetLead || {
      id: leadId || `lead_tmp_${Date.now()}`,
      companyName: companyName || 'Attività',
      website: website || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      city: city || null,
      sector: sector || 'local_services',
      notes: notes || null,
      source: 'maps',
    };

    const orchestrator = new EnrichmentOrchestrator();
    const dossier = await orchestrator.runEnrichment(leadInput);

    // Persistenza unificata nel database
    saveEnrichmentDossierToDb({ dossier, leadInput });

    return NextResponse.json({
      success: true,
      dossier,
      sourcesAudit: dossier.sourcesAudit,
    });
  } catch (error: any) {
    console.error('[Enrichment API Run] Errore:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Errore durante l\'esecuzione dell\'arricchimento lead',
      },
      { status: 500 }
    );
  }
}
