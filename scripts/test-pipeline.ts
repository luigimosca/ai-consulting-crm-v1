import { db, users, leads, demoRequests, enrichmentData, chatMessages, enrichmentRuns, initDatabase } from '../packages/db/src';
import { 
  processChatMessage,
  getLeadScraperProvider,
  analyzeDomain, 
  calculateScore, 
  generateOutreachMessage,
  isSafeUrl,
  validateItalianVatNumber,
  EnrichmentOrchestrator,
  WebsiteAnalyzerAdapter,
} from '../packages/ai/src';
import { createSessionToken, verifySessionToken } from '../apps/web/src/lib/auth';

async function testPipeline() {
  console.log('🧪 Avvio Test Pipeline Completa per AI Agency CRM v1 (OSM Lead Gen + Lead Enrichment + Chatbot)...\n');

  initDatabase();

  // Test 1: Database records check
  console.log('--- TEST 1: Database & Records ---');
  const userList = db.select().from(users).all();
  const leadList = db.select().from(leads).all();
  const demoList = db.select().from(demoRequests).all();

  console.log(`- Utenti presenti: ${userList.length} (attesi >= 2)`);
  console.log(`- Lead presenti: ${leadList.length}`);
  console.log(`- Demo requests: ${demoList.length}`);

  if (userList.length < 2) {
    throw new Error('❌ Test 1 fallito: Utenti non inizializzati');
  }
  console.log('✅ TEST 1 Superato!\n');

  // Test 2: AI Chatbot qualification flow & LLM processor
  console.log('--- TEST 2: AI Chatbot LLM / Fallback Qualification Flow ---');
  const testSessionId = `test_sess_${Date.now()}`;

  const res1 = await processChatMessage({
    sessionId: testSessionId,
    message: 'Buongiorno, vorrei informazioni sui vostri servizi',
    history: [],
    context: { step: 'greeting' },
  });
  console.log(`- Step 1 [${res1.usedModel}]:`, res1.reply.substring(0, 80) + '...');

  const res2 = await processChatMessage({
    sessionId: testSessionId,
    message: 'Sono il titolare di un ristorante a Pompei con 10 dipendenti, cerco un assistente per prenotazioni',
    history: [{ role: 'user', content: 'Buongiorno' }, { role: 'assistant', content: res1.reply }],
    context: res1.collectedData as any,
  });
  console.log(`- Step 2 [${res2.usedModel}]:`, res2.reply.substring(0, 80) + '...');

  const res3 = await processChatMessage({
    sessionId: testSessionId,
    message: 'Mi chiamo Roberto Esposito, email roberto@bellavistapompei.it tel 0818501234',
    history: [
      { role: 'user', content: 'Sono il titolare di un ristorante a Pompei' },
      { role: 'assistant', content: res2.reply }
    ],
    context: res2.collectedData as any,
  });
  console.log(`- Step 3 [${res3.usedModel}]:`, res3.reply.substring(0, 80) + '...');
  console.log('- Collected Lead Data:', res3.collectedData);

  if (!res3.collectedData.contactEmail) {
    throw new Error('❌ Test 2 fallito: Estrazione email dal chatbot non riuscita');
  }
  console.log('✅ TEST 2 Superato!\n');

  // Test 3: Lead Gen Territoriale OpenStreetMap & Overpass
  console.log('--- TEST 3: Lead Gen Territoriale (OpenStreetMap ODbL) ---');
  const scraper = getLeadScraperProvider();
  console.log('- Active provider:', scraper.name);
  const searchResults = await scraper.search({
    city: 'Pompei',
    sectorId: 'horeca_ristorazione',
    subcategories: ['ristoranti', 'pizzerie'],
    radiusKm: 3,
  });
  console.log(`- Risultati reali estratti: ${searchResults.count} attività`);
  if (searchResults.count > 0) {
    const sample = searchResults.places[0];
    console.log(`- Esempio POI: "${sample.name}" -> Distanza: ${sample.distanceMeters}m, OSM: ${sample.osmUrl}`);
    if (sample.rating !== null || sample.reviewCount !== null) {
      throw new Error('❌ Test 3 fallito: Violazione integrità rating null');
    }
  }
  console.log('✅ TEST 3 Superato!\n');

  // Test 4: Lead Enrichment Security & SSRF Protection
  console.log('--- TEST 4: Lead Enrichment & Protezione SSRF ---');
  const ssrf1 = isSafeUrl('http://127.0.0.1:3000');
  const ssrf2 = isSafeUrl('http://169.254.169.254/latest');
  const ssrf3 = isSafeUrl('https://theroofpompei.com');

  if (ssrf1.isSafe !== false || ssrf2.isSafe !== false || ssrf3.isSafe !== true) {
    throw new Error('❌ Test 4 fallito: Controlli SSRF non conformi');
  }
  console.log('- Controlli SSRF superati (localhost, loopback, metadata bloccati; domini pubblici consentiti)');

  // P.IVA Checksum
  const vatValid = validateItalianVatNumber('08501231214');
  const vatInvalid = validateItalianVatNumber('12345678901');
  if (!vatValid || vatInvalid) {
    throw new Error('❌ Test 4 fallito: Validazione algoritmo P.IVA errato');
  }
  console.log('- Validatore P.IVA italiana 11 cifre verificato');
  console.log('✅ TEST 4 Superato!\n');

  // Test 5: Enrichment Orchestrator & Dossier a 9 Sezioni
  console.log('--- TEST 5: Enrichment Orchestrator & Multi-Adapter Execution ---');
  const orchestrator = new EnrichmentOrchestrator();

  const testLead = {
    companyName: 'The Roof Pompei',
    website: 'https://theroofpompei.com',
    sector: 'horeca_ristoranti',
    city: 'Pompei',
    phone: '+39 081 8501122',
  };

  const dossier = await orchestrator.runEnrichment(testLead);
  console.log(`- Run ID: ${dossier.runId}`);
  console.log(`- Commercial Score: ${dossier.commercialScore} / 100`);
  console.log(`- Reliability Score: ${dossier.reliabilityScore} / 100`);
  console.log(`- Maturità Digitale: ${dossier.digitalMaturity.toUpperCase()}`);
  console.log(`- Contatti pubblici: ${dossier.publicContacts.length}`);
  console.log(`- Indicatori Economici: Fatturato ${dossier.financials.revenue.value} (isEstimated: ${dossier.financials.revenue.isEstimated})`);
  console.log(`- Segnali di Crescita: Livello ${dossier.growth.growthLevel.toUpperCase()}`);
  console.log(`- Pain points generati: ${dossier.painPoints.length}`);
  console.log(`- Fonti Audit: ${dossier.sourcesAudit.map((s) => `${s.adapterName} (${s.status})`).join(', ')}`);

  if (!dossier.runId || dossier.sourcesAudit.length < 4) {
    throw new Error('❌ Test 5 fallito: Dossier non generato correttamente');
  }
  console.log('✅ TEST 5 Superato!\n');

  // Test 6: Auth JWT Token flow
  console.log('--- TEST 6: Auth JWT Token Flow ---');
  const token = await createSessionToken({ id: 'user_admin', email: 'admin@ai-agency.it', name: 'Admin', role: 'admin' });
  const payload = await verifySessionToken(token);
  if (!payload || payload.email !== 'admin@ai-agency.it') {
    throw new Error('❌ Test 6 fallito: Verifica sessione JWT errata');
  }
  console.log('- Token JWT generato e verificato con successo');
  console.log('✅ TEST 6 Superato!\n');

  console.log('🎉 TUTTI I TEST DELLA PIPELINE SONO STATI SUPERATI CON SUCCESSO!');
}

testPipeline().catch((err) => {
  console.error('❌ Errore durante l\'esecuzione dei test:', err);
  process.exit(1);
});
