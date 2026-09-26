import { db, users, companies, leads } from '@ai-crm/db';
import {
  generateNameVariants,
  extractVerifiedItalianVat,
  extractItalianFiscalCode,
  extractVerifiedPec,
  extractItalianRea,
  extractItalianAteco,
  extractFormalLegalName,
  PublicCompanySearchService,
  LocalCrmSourceAdapter,
  OfficialWebsiteSourceAdapter,
  IniPecSourceAdapter,
  RegistroImpreseSourceAdapter,
  normalizeText,
  extractCleanDomain,
} from '@ai-crm/ai';
import { eq } from 'drizzle-orm';

async function runTests() {
  console.log('================================================================');
  console.log('TEST SUITE: MODULO RICERCA PUBBLICA AZIENDE & DEDUPLICAZIONE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      if (details) console.error(`    Dettagli: ${details}`);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Generatore di Varianti del Nome (Jamm Ja -> JammJa, Jamm-Ja, JAMMJA SRL, Jamm Ja Charter)
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Generatore Varianti Nome ---');
  const variants = generateNameVariants('Jamm Ja');
  assert(variants.includes('Jamm Ja'), 'Include testo originale ("Jamm Ja")');
  assert(variants.includes('JammJa'), 'Include testo senza spazi ("JammJa")');
  assert(variants.includes('Jamm-Ja'), 'Include testo con trattino ("Jamm-Ja")');
  assert(
    variants.some((v) => v.toUpperCase().includes('JAMMJA SRL') || v.toUpperCase().includes('JAMM JA SRL')),
    'Include variante con suffisso SRL ("JAMMJA SRL" o "Jamm Ja Srl")'
  );
  assert(
    variants.some((v) => v.includes('Charter')),
    'Include variante con espansione attività ("Jamm Ja Charter")'
  );

  // ---------------------------------------------------------------------------
  // TEST 2: Validazione Partita IVA e Checksum
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: Validazione Algoritmo Partita IVA Italiana ---');
  const validVat = '10391601217'; // Valid Italian VAT
  const invalidVat = '12345678901'; // Invalid checksum
  assert(extractVerifiedItalianVat(`P.IVA ${validVat}`) === validVat, 'Riconosce e valida P.IVA corretta (10391601217)');
  assert(extractVerifiedItalianVat(`P.IVA ${invalidVat}`) === null, 'Rifiuta P.IVA con checksum non valido (12345678901)');

  // ---------------------------------------------------------------------------
  // TEST 3: Distinzione Rigorosa Sede Legale vs Sede Operativa
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Distinzione Sede Legale vs Sede Operativa ---');
  const websiteAdapter = new OfficialWebsiteSourceAdapter();
  const mockHtmlSnippet = `
    <footer>
      <p>Jammja Srl - P.IVA: 10391601217 - REA: NA-1052345 - ATECO: 50.10.00</p>
      <p>Sede Legale: Via Molinelle 65, Pompei (NA)</p>
      <p>Sede Operativa: Porto di Castellammare di Stabia, Banchina Marinella</p>
      <p>PEC: jammjasrl@pec.it - Email: info@jamm-ja.it</p>
    </footer>
  `;
  const legalNameExtracted = extractFormalLegalName(mockHtmlSnippet, 'Jamm Ja');
  const vatExtracted = extractVerifiedItalianVat(mockHtmlSnippet);
  const pecExtracted = extractVerifiedPec(mockHtmlSnippet);
  const reaExtracted = extractItalianRea(mockHtmlSnippet);
  const atecoExtracted = extractItalianAteco(mockHtmlSnippet);

  assert(legalNameExtracted === 'Jammja Srl', 'Estrae ragione sociale formale ("Jammja Srl")');
  assert(vatExtracted === '10391601217', 'Estrae Partita IVA verificata (10391601217)');
  assert(pecExtracted === 'jammjasrl@pec.it', 'Estrae PEC ufficiale (jammjasrl@pec.it)');
  assert(reaExtracted?.includes('1052345') ?? false, 'Estrae numero REA (NA-1052345)');
  assert(atecoExtracted === '50.10.00', 'Estrae codice ATECO (50.10.00)');

  // ---------------------------------------------------------------------------
  // TEST 4: Campi Null Non Sostituiti da Dati Inventati / Fake
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Nessun Dato Fake se Assente ---');
  const emptyHtmlSnippet = '<div><h1>Benvenuti sul nostro sito</h1><p>Contattaci per informazioni.</p></div>';
  assert(extractVerifiedItalianVat(emptyHtmlSnippet) === null, 'P.IVA assente resta null (non inventata)');
  assert(extractVerifiedPec(emptyHtmlSnippet) === null, 'PEC assente resta null');
  assert(extractItalianRea(emptyHtmlSnippet) === null, 'REA assente resta null');
  assert(extractItalianAteco(emptyHtmlSnippet) === null, 'ATECO assente resta null');

  // ---------------------------------------------------------------------------
  // TEST 5: Controllo Deduplicazione CRM (P.IVA, Codice Fiscale, Dominio, Nome+Città)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Deduplicazione CRM Multilivello ---');
  const testCompanyId = `test_comp_${Date.now()}`;
  const now = new Date().toISOString();

  // Inserisci un'azienda di test nel DB
  db.insert(companies).values({
    id: testCompanyId,
    name: 'Jamm Ja Test Enterprise',
    legalName: 'Jammja S.r.l.',
    vatId: '10391601217',
    fiscalCode: '10391601217',
    sector: 'horeca_ristoranti',
    address: 'Via Molinelle 65',
    city: 'Pompei',
    province: 'NA',
    website: 'https://www.jamm-ja.it',
    createdAt: now,
    updatedAt: now,
  }).run();

  const crmCompanies = db.select().from(companies).all();
  const crmLeads = db.select().from(leads).all();

  const searchService = new PublicCompanySearchService();

  // 5a. Ricerca per Partita IVA identica
  const resByVat = await searchService.searchCandidates({
    q: 'Qualsiasi Nome',
    vatId: '10391601217',
    existingCompanies: crmCompanies,
    existingLeads: crmLeads,
  });
  const dupByVat = resByVat.candidates.find((c) => c.vatId === '10391601217');
  assert(dupByVat?.alreadyInCrm === true, 'Rileva duplicato per Partita IVA');
  assert(dupByVat?.duplicateOfCompanyId === testCompanyId, 'Collega l\'ID dell\'azienda duplicata');

  // 5b. Ricerca per Dominio identico
  const resByDomain = await searchService.searchCandidates({
    q: 'Altro Nome',
    domain: 'jamm-ja.it',
    existingCompanies: crmCompanies,
    existingLeads: crmLeads,
  });
  const dupByDomain = resByDomain.candidates.find((c) => c.website && extractCleanDomain(c.website) === 'jamm-ja.it');
  assert(dupByDomain?.alreadyInCrm === true, 'Rileva duplicato per Dominio Web');

  // 5c. Ricerca per Nome + Città
  const resByNameCity = await searchService.searchCandidates({
    q: 'Jamm Ja Test Enterprise',
    city: 'Pompei',
    existingCompanies: crmCompanies,
    existingLeads: crmLeads,
  });
  const dupByNameCity = resByNameCity.candidates.find((c) => c.duplicateOfCompanyId === testCompanyId);
  assert(dupByNameCity?.alreadyInCrm === true, 'Rileva duplicato per Nome + Città coincidente');

  // ---------------------------------------------------------------------------
  // TEST 6: Caso di Studio Pompei: Jamm Ja & Jammja S.r.l.
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6: Caso di Studio "Jamm Ja" Pompei ---');
  const pompeiSearch = await searchService.searchCandidates({
    q: 'Jamm Ja',
    city: 'Pompei',
    province: 'NA',
    existingCompanies: crmCompanies,
    existingLeads: crmLeads,
  });

  assert(pompeiSearch.nameVariants.length >= 4, 'Genera almeno 4 varianti di ricerca per Jamm Ja');
  assert(pompeiSearch.sourcesQueried.includes('openstreetmap'), 'Interroga OpenStreetMap');
  assert(pompeiSearch.sourcesQueried.includes('crm_locale'), 'Interroga CRM Locale');

  // Test specifico con "jammja S.r.l." + P.IVA 10391601217
  const jammjaSrlVariants = generateNameVariants('jammja S.r.l.');
  assert(!jammjaSrlVariants.some((v) => v.includes('S r l') || v.includes('S-r-l')), 'Rimuove correttamente il suffisso "S.r.l." senza generare "S r l"');
  assert(jammjaSrlVariants.some((v) => v.toUpperCase().includes('JAMMJA') || v.toUpperCase().includes('JAMM JA')), 'Genera radice e varianti per "jammja S.r.l."');

  const jammjaSrlSearch = await searchService.searchCandidates({
    q: 'jammja S.r.l.',
    city: 'pompei',
    vatId: '10391601217',
    existingCompanies: crmCompanies,
    existingLeads: crmLeads,
  });
  assert(jammjaSrlSearch.candidates.length >= 1, 'Restituisce scheda societaria per "jammja S.r.l." con P.IVA 10391601217');
  const jammjaCandidate = jammjaSrlSearch.candidates.find((c) => c.vatId === '10391601217');
  assert(jammjaCandidate !== undefined, 'Candidato contiene P.IVA 10391601217');
  assert(jammjaCandidate?.legalName?.toUpperCase().includes('JAMMJA') ?? false, 'Candidato contiene ragione sociale formale');



  // ---------------------------------------------------------------------------
  // TEST 7: Importazione Solo dopo Conferma Esplicita
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7: Flusso Importazione Solo Post Conferma ---');
  const countBefore = db.select().from(companies).all().length;
  
  // Eseguire la ricerca NON deve inserire nulla nel database
  await searchService.searchCandidates({
    q: 'Azienda Temporanea Mai Vista',
    city: 'Napoli',
    existingCompanies: crmCompanies,
    existingLeads: crmLeads,
  });
  const countAfterSearch = db.select().from(companies).all().length;
  assert(countBefore === countAfterSearch, 'La sola ricerca pubblica NON crea record nel database');

  // ---------------------------------------------------------------------------
  // TEST 8: Link Adattatori INI-PEC e Registro Imprese
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 8: Adattatori INI-PEC & Registro Imprese ---');
  const iniPec = new IniPecSourceAdapter();
  const regImprese = new RegistroImpreseSourceAdapter();

  const iniPecUrl = iniPec.getVerificationLink('10391601217');
  const regImpreseUrl = regImprese.getVerificationLink('Jamm Ja Srl', '10391601217');

  assert(iniPecUrl.includes('inipec.gov.it') && iniPecUrl.includes('10391601217'), 'Genera link di verifica INI-PEC conforme');
  assert(regImpreseUrl.includes('registroimprese.it') && regImpreseUrl.includes('10391601217'), 'Genera link Registro Imprese');

  // ---------------------------------------------------------------------------
  // TEST 9: Verifica Autorizzazione API e Validazione Parametri
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 9: Autorizzazione API Route /api/companies/public-search ---');
  try {
    const { GET: getPublicSearchRoute } = await import('../apps/web/src/app/api/companies/public-search/route');
    const unauthReq = new Request('http://localhost:3000/api/companies/public-search?q=JammJa');
    const unauthRes = await getPublicSearchRoute(unauthReq);
    assert(unauthRes.status === 401, 'API risponde 401 Non autorizzato per richieste non autenticate');
  } catch (err: any) {
    assert(err.message === 'UNAUTHORIZED' || err.status === 401, 'API blocca accessi non autenticati (UNAUTHORIZED)');
  }

  // Pulizia azienda test
  db.delete(companies).where(eq(companies.id, testCompanyId)).run();

  console.log('\n================================================================');
  console.log(`RISULTATI FINALI: ${passed} PASSATI, ${failed} FALLITI`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test Suite Error:', err);
  process.exit(1);
});
