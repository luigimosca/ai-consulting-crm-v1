import {
  isSafeUrl,
  validateItalianVatNumber,
  WebsiteAnalyzerAdapter,
  EnrichmentOrchestrator,
  OSMEnrichmentAdapter,
  PublicCompanyDataAdapter,
  GrowthSignalAdapter,
  ReviewSignalAdapter,
} from '../packages/ai/src';

async function runTests() {
  console.log('=== TEST SUITE: LEAD ENRICHMENT & SECURITY PIPELINE ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // 1. Test Protezione SSRF
  console.log('--- 1. Sicurezza & Protezione SSRF ---');
  const ssrfTests = [
    { url: 'http://localhost:3000', expectedSafe: false, name: 'Blocco localhost' },
    { url: 'http://127.0.0.1:8080', expectedSafe: false, name: 'Blocco loopback 127.0.0.1' },
    { url: 'http://10.0.0.1/admin', expectedSafe: false, name: 'Blocco rete privata 10.0.0.0/8' },
    { url: 'http://192.168.1.1/router', expectedSafe: false, name: 'Blocco rete privata 192.168.0.0/16' },
    { url: 'http://172.20.0.1/internal', expectedSafe: false, name: 'Blocco rete privata 172.16.0.0/12' },
    { url: 'http://169.254.169.254/latest/meta-data', expectedSafe: false, name: 'Blocco AWS/Cloud Metadata 169.254.169.254' },
    { url: 'https://theroofpompei.com', expectedSafe: true, name: 'Consenti dominio pubblico HTTPS' },
    { url: 'http://pizzeriabellavista.it', expectedSafe: true, name: 'Consenti dominio pubblico HTTP' },
  ];

  for (const t of ssrfTests) {
    const res = isSafeUrl(t.url);
    assert(res.isSafe === t.expectedSafe, t.name, res.reason);
  }

  // 2. Test Validazione Algoritmo Partita IVA Italiana (11 cifre)
  console.log('\n--- 2. Validazione Algoritmo Partita IVA Italiana ---');
  const pivaTests = [
    { piva: '01234567890', expected: false, name: 'P.IVA non valida (checksum errato)' },
    { piva: '12345', expected: false, name: 'P.IVA corta (<11 cifre)' },
    { piva: '08501231214', expected: true, name: 'P.IVA 11 cifre con checksum corretto' },
    { piva: '07643520567', expected: true, name: 'P.IVA formale verificata' },
  ];

  for (const t of pivaTests) {
    const valid = validateItalianVatNumber(t.piva);
    assert(valid === t.expected, t.name);
  }

  // 3. Test WebsiteAnalyzerAdapter su lead senza sito
  console.log('\n--- 3. Analisi Lead Senza Sito Web ---');
  const analyzer = new WebsiteAnalyzerAdapter();
  const noSiteRes = await analyzer.analyze(null, 'horeca_ristoranti');
  assert(!noSiteRes.data.isReachable, 'Sito assente gestito senza crash');
  assert(noSiteRes.data.cms.status === 'not_available', 'CMS contrassegnato come not_available');
  assert(noSiteRes.discoveredContacts.length === 0, 'Nessun contatto inventato su sito assente');

  // 4. Test WebsiteAnalyzerAdapter su dominio non raggiungibile / inventato
  console.log('\n--- 4. Analisi Dominio Non Raggiungibile ---');
  const unreachableRes = await analyzer.analyze('http://dominio-totalmente-inesistente-xyz987654.it', 'studi_legali');
  assert(!unreachableRes.data.isReachable, 'Dominio non raggiungibile gestito correttamente');
  assert(unreachableRes.discoveredContacts.length === 0, 'Nessun contatto inventato su dominio non raggiungibile');

  // 5. Test EnrichmentOrchestrator Completo su Lead Reale
  console.log('\n--- 5. Orchestrator Pipeline su Lead Reale ---');
  const orchestrator = new EnrichmentOrchestrator();

  const testLead = {
    companyName: 'The Roof Pompei',
    website: 'https://theroofpompei.com',
    sector: 'horeca_ristoranti',
    city: 'Pompei',
    address: 'Via Plinio, 12',
    phone: '+39 081 8501122',
    notes: 'https://www.openstreetmap.org/node/14005991636 | Orari: Mo-Su 18:00-02:00',
  };

  const dossier = await orchestrator.runEnrichment(testLead);

  assert(Boolean(dossier.runId), 'Run ID generato correttamente');
  assert(dossier.commercialScore >= 15 && dossier.commercialScore <= 100, `Commercial score calcolato: ${dossier.commercialScore}`);
  assert(dossier.reliabilityScore >= 10 && dossier.reliabilityScore <= 100, `Reliability score calcolato: ${dossier.reliabilityScore}`);
  assert(dossier.sourcesAudit.length >= 5, `Audit trail generato con ${dossier.sourcesAudit.length} adapter`);

  // Verifica contatti estratti
  assert(dossier.publicContacts.length > 0, `Contatti pubblici trovati: ${dossier.publicContacts.length}`);
  for (const c of dossier.publicContacts) {
    assert(c.isVerified === false, `Contatto "${c.value}" non marcato automaticamente come verificato (status: ${c.verificationStatus})`);
    assert(Boolean(c.sourceUrl || c.collectedAt), `Contatto "${c.value}" traccia fonte e timestamp`);
  }

  // Verifica indicatori economici
  assert(dossier.financials.revenue.isEstimated === true, 'Fatturato contrassegnato esplicitamente come stimato (isEstimated: true)');
  assert(dossier.financials.revenue.min !== undefined && dossier.financials.revenue.max !== undefined, 'Fatturato espresso con intervallo min-max');
  assert(dossier.financials.profit.status === 'not_available', 'Utile dichiarato not_available senza bilancio camerale');

  // Verifica segnali di crescita
  assert(['low', 'medium', 'high', 'unknown'].includes(dossier.growth.growthLevel), `Growth level valido: ${dossier.growth.growthLevel}`);
  assert(dossier.growth.signals.length > 0, 'Segnali di crescita osservabili presenti');

  // Verifica recensioni
  assert(dossier.reviews.hasPublicRating === false, 'Nessun rating Google inventato (hasPublicRating: false)');
  assert(dossier.reviews.ratingValue === null, 'Rating numerico rigorosamente null');

  // Verifica pain point commerciali
  assert(dossier.painPoints.length > 0, `Pain point commerciali generati: ${dossier.painPoints.length}`);

  // 6. Test Resilienza: isolamento errori se un adapter fallisce
  console.log('\n--- 6. Resilienza Pipeline & Isolamento Errori ---');
  const failureLead = {
    companyName: 'Studio Legale Test',
    website: 'http://127.0.0.1:9999', // URL bloccato da SSRF
    sector: 'studi_legali',
    city: 'Milano',
  };

  const isolatedDossier = await orchestrator.runEnrichment(failureLead);
  assert(Boolean(isolatedDossier.runId), 'Pipeline completata con successo anche con adapter web bloccato/fallito');
  assert(isolatedDossier.sourcesAudit.some((s) => s.adapterName === 'WebsiteAnalyzerAdapter'), 'Audit traccia fallimento/parzialità dell\'adapter');

  console.log(`\n========================================`);
  console.log(`RISULTATI: ${passed} passati, ${failed} falliti.`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
