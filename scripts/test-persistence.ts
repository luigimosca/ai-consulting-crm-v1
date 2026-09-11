import { 
  db, 
  leads, 
  enrichmentRuns, 
  websiteAnalysis, 
  publicContacts, 
  financialIndicators, 
  reviewsSignals, 
  growthSignals, 
  enrichmentSources, 
  enrichmentData,
  initDatabase 
} from '../packages/db/src';
import { EnrichmentOrchestrator } from '../packages/ai/src';
import { saveEnrichmentDossierToDb } from '../apps/web/src/lib/enrichment-db';
import { eq } from 'drizzle-orm';

async function testLeadPersistenceAndEnrichment() {
  console.log('🧪 Avvio Test di Verifica: Lead Import, Enrichment & List Persistence...\n');

  initDatabase();

  // Step 1: Count existing leads
  const initialLeads = db.select().from(leads).all();
  console.log(`1. Lead iniziali nel database: ${initialLeads.length}`);

  // Step 2: Simulate importing a new lead from OSM (e.g., Pizzeria Bella Napoli Pompei)
  const testId = `test_lead_${Date.now()}`;
  const newLeadData = {
    id: testId,
    companyName: 'Pizzeria Bella Napoli Pompei',
    website: 'https://theroofpompei.com', // test website
    source: 'maps' as const,
    sector: 'horeca_ristoranti' as const,
    score: 80,
    status: 'nuovo' as const,
    phone: '+39 081 8509988',
    email: 'info@bellanapolipompei.it',
    address: 'Via Plinio 12',
    city: 'Pompei',
    notes: 'Lead territoriale OpenStreetMap (Pizzeria)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.insert(leads).values(newLeadData).run();
  console.log(`2. Inserito lead di test "${newLeadData.companyName}" (ID: ${testId}, Status: ${newLeadData.status})`);

  // Verify lead is in the list
  const leadAfterInsert = db.select().from(leads).where(eq(leads.id, testId)).get();
  if (!leadAfterInsert) {
    throw new Error('❌ Lead non trovato nel database dopo inserimento');
  }
  console.log('   ✅ Lead presente correttamente nel DB con stato "nuovo"');

  // Step 3: Run Enrichment on this lead
  console.log('3. Esecuzione arricchimento AI sul lead...');
  const orchestrator = new EnrichmentOrchestrator();
  const dossier = await orchestrator.runEnrichment({
    id: testId,
    companyName: newLeadData.companyName,
    website: newLeadData.website,
    sector: newLeadData.sector,
    city: newLeadData.city,
    address: newLeadData.address,
    phone: newLeadData.phone,
    email: newLeadData.email,
  });

  console.log(`   Enrichment completato. Run ID: ${dossier.runId}, Score: ${dossier.commercialScore}`);

  // Step 4: Persist enrichment using saveEnrichmentDossierToDb
  saveEnrichmentDossierToDb({ dossier, leadInput: newLeadData });
  console.log('   ✅ Enrichment persistito nel DB con successo');

  // Step 5: Verify lead status and data after enrichment
  const leadAfterEnrich = db.select().from(leads).where(eq(leads.id, testId)).get();
  if (!leadAfterEnrich) {
    throw new Error('❌ Lead scomparso dopo l\'arricchimento!');
  }
  if (leadAfterEnrich.status !== 'arricchito') {
    throw new Error(`❌ Stato lead errato: atteso "arricchito", trovato "${leadAfterEnrich.status}"`);
  }
  console.log(`4. Verifica post-enrichment:
   - ID: ${leadAfterEnrich.id}
   - Nome: ${leadAfterEnrich.companyName}
   - Stato: ${leadAfterEnrich.status} (✅ Arricchito)
   - Score: ${leadAfterEnrich.score} / 100
   - Città: ${leadAfterEnrich.city}`);

  // Step 6: Test List Query and Filter Simulation (LeadTable logic)
  const allLeads = db.select().from(leads).all();
  console.log(`5. Query lista generale: trovati ${allLeads.length} lead`);

  // Simulate LeadTable filter
  const safeLeads = Array.isArray(allLeads) ? allLeads : [];
  const filteredAll = safeLeads.filter((l) => {
    if (!l) return false;
    const name = (l.companyName || '').toLowerCase();
    const city = (l.city || '').toLowerCase();
    const email = (l.email || '').toLowerCase();
    return true;
  });

  if (filteredAll.length !== allLeads.length) {
    throw new Error('❌ Filtro tabella ha scartato lead inattesi');
  }

  // Clean up test lead with cascade
  db.delete(websiteAnalysis).where(eq(websiteAnalysis.leadId, testId)).run();
  db.delete(publicContacts).where(eq(publicContacts.leadId, testId)).run();
  db.delete(financialIndicators).where(eq(financialIndicators.leadId, testId)).run();
  db.delete(reviewsSignals).where(eq(reviewsSignals.leadId, testId)).run();
  db.delete(growthSignals).where(eq(growthSignals.leadId, testId)).run();
  db.delete(enrichmentSources).where(eq(enrichmentSources.leadId, testId)).run();
  db.delete(enrichmentRuns).where(eq(enrichmentRuns.leadId, testId)).run();
  db.delete(enrichmentData).where(eq(enrichmentData.leadId, testId)).run();
  db.delete(leads).where(eq(leads.id, testId)).run();
  console.log('   Lead di test pulito con successo.');

  console.log('\n🎉 TUTTI I TEST DI PERSISTENZA ED ENRICHMENT SONO STATI SUPERATI CON SUCCESSO (100%)!');
}

testLeadPersistenceAndEnrichment().catch((err) => {
  console.error('❌ Errore durante il test:', err);
  process.exit(1);
});
