import path from 'path';
import fs from 'fs';
import os from 'os';

// ---------------------------------------------------------------------------
// 1. Pre-flight Verification & Isolation Setup BEFORE ANY MODULE IMPORT
// ---------------------------------------------------------------------------
const tempDbFile = path.join(
  os.tmpdir(),
  `crm_client_mktg_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.db`
);
process.env.DATABASE_PATH = tempDbFile;

// Strict sanity check: fail immediately if pointing to an unsafe DB path
const resolvedPath = path.resolve(process.env.DATABASE_PATH);
if (
  !process.env.DATABASE_PATH ||
  resolvedPath.endsWith('sqlite.db') ||
  resolvedPath.includes('/data/') ||
  resolvedPath.startsWith('/data') ||
  resolvedPath === path.resolve(process.cwd(), 'sqlite.db')
) {
  throw new Error(
    `[CRITICAL SECURITY REFUSAL] Test execution aborted: DATABASE_PATH points to an unsafe or production database path (${resolvedPath}). Tests must run strictly on an isolated temporary database.`
  );
}

async function runClientMarketingTests() {
  console.log('========================================================================');
  console.log('=== TEST SUITE: CLIENT MARKETING & ADS HUB (FASE 2) - ISOLATED RUN ===');
  console.log(`=== DB Isolato: ${tempDbFile} ===`);
  console.log('========================================================================\n');

  const {
    initDatabase,
    db,
    users,
    companies,
    orders,
    projects,
    projectMembers,
    clientPlatformAccounts,
    clientCampaigns,
    campaignCreatives,
    campaignKpiReports,
    activityLog,
  } = await import('../packages/db/src');

  const { eq } = await import('drizzle-orm');

  const {
    calculateKpiMetrics,
    buildUtmUrl,
    parseUtmUrl,
    getClientCampaignsByProject,
    getClientCampaignById,
    createClientCampaign,
    updateClientCampaign,
    deleteClientCampaign,
    createCampaignCreative,
    updateCampaignCreative,
    deleteCampaignCreative,
    createCampaignKpiReport,
    updateCampaignKpiReport,
    deleteCampaignKpiReport,
    getProjectMarketingOverview,
  } = await import('../apps/web/src/lib/client-marketing-service');

  try {
    // 1. Initialize Database Schema
    console.log('[1/10] Inizializzazione Schema DB e Tabelle Marketing Sponsorizzato su DB Isolato...');
    initDatabase();
    console.log('  ✓ Schema DDL e tabelle client_campaigns, campaign_creatives, campaign_kpi_reports inizializzate.\n');

    // 2. Setup Test Fixtures (Users, Company, Order, Project, Platform Account)
    console.log('[2/10] Creazione Utenti, Azienda, Commessa, Progetto e Account Delegato di Prova...');
    const now = new Date().toISOString();

    const adminUser = {
      userId: 'usr_admin_1',
      email: 'admin@ai-consulting.agency',
      name: 'Direttore Marketing Admin',
      role: 'admin' as const,
    };

    const assignedOperator = {
      userId: 'usr_op_assigned',
      email: 'mario.ads@ai-consulting.agency',
      name: 'Mario Media Buyer',
      role: 'operator' as const,
    };

    const unassignedOperator = {
      userId: 'usr_op_unassigned',
      email: 'luigi.dev@ai-consulting.agency',
      name: 'Luigi Non Assegnato',
      role: 'operator' as const,
    };

    db.insert(users).values([
      { id: adminUser.userId, email: adminUser.email, name: adminUser.name, role: adminUser.role, passwordHash: 'hash_test', createdAt: now },
      { id: assignedOperator.userId, email: assignedOperator.email, name: assignedOperator.name, role: assignedOperator.role, passwordHash: 'hash_test', createdAt: now },
      { id: unassignedOperator.userId, email: unassignedOperator.email, name: unassignedOperator.name, role: unassignedOperator.role, passwordHash: 'hash_test', createdAt: now },
    ]).run();

    const companyId = 'comp_hotel_etna';
    db.insert(companies).values({
      id: companyId,
      name: 'Grand Hotel Etna & SPA',
      sector: 'horeca_hotel',
      vatId: 'IT09876543210',
      createdAt: now,
      updatedAt: now,
    }).run();

    const orderId = 'ord_2026_mktg';
    db.insert(orders).values({
      id: orderId,
      code: 'ORD-2026-0042',
      title: 'Campagne Google & Meta Ads Q4',
      companyId,
      agreedValue: 150000, // 1.500 €
      status: 'attiva',
      createdBy: adminUser.userId,
      createdAt: now,
      updatedAt: now,
    }).run();

    const projectId = 'prj_hotel_etna_ads';
    db.insert(projects).values({
      id: projectId,
      code: 'PRJ-2026-0010',
      title: 'Lancio Promozioni Autunno / Inverno',
      companyId,
      orderId,
      status: 'in_corso',
      createdBy: adminUser.userId,
      createdAt: now,
      updatedAt: now,
    }).run();

    // Assign Operator 1 to Project as 'editor'
    db.insert(projectMembers).values({
      id: 'pm_1',
      projectId,
      userId: assignedOperator.userId,
      projectRole: 'editor',
      status: 'active',
      joinedAt: now,
    }).run();

    // Platform Account: Google Ads MCC
    const platformAccountId = 'acc_gads_hotel';
    db.insert(clientPlatformAccounts).values({
      id: platformAccountId,
      companyId,
      platformType: 'google_ads_account',
      accountName: 'Google Ads Grand Hotel Etna',
      externalId: '123-456-7890',
      accessMethod: 'agency_mcc_partner',
      accessLevel: 'standard_edit',
      status: 'verified_active',
      createdAt: now,
      updatedAt: now,
    }).run();

    console.log('  ✓ Fixtures create con successo.\n');

    // 3. Test Mathematical KPI Calculations (CTR %, CPC €, CPA €, ROAS)
    console.log('[3/10] Test Formule Matematiche KPI & Protezione Divisione per Zero...');
    const kpiCalc1 = calculateKpiMetrics({
      spendCents: 100000, // 1000 €
      impressions: 25000,
      clicks: 1250,
      conversionsCount: 50,
      conversionValueCents: 450000, // 4500 €
    });

    if (kpiCalc1.ctrPercentage !== 5.0) {
      throw new Error(`CTR errato: atteso 5.0%, ottenuto ${kpiCalc1.ctrPercentage}%`);
    }
    if (kpiCalc1.cpcAverageEuro !== 0.8) {
      throw new Error(`CPC medio errato: atteso 0.80€, ottenuto ${kpiCalc1.cpcAverageEuro}€`);
    }
    if (kpiCalc1.cpaEuro !== 20.0) {
      throw new Error(`CPA errato: atteso 20.00€, ottenuto ${kpiCalc1.cpaEuro}€`);
    }
    if (kpiCalc1.roasRatio !== 4.5) {
      throw new Error(`ROAS errato: atteso 4.5x, ottenuto ${kpiCalc1.roasRatio}x`);
    }

    // Zero protection check
    const kpiZero = calculateKpiMetrics({
      spendCents: 0,
      impressions: 0,
      clicks: 0,
      conversionsCount: 0,
    });
    if (kpiZero.ctrPercentage !== 0 || kpiZero.cpcAverageEuro !== 0 || kpiZero.cpaEuro !== 0 || kpiZero.roasRatio !== 0) {
      throw new Error('Protezione divisione per zero fallita per metriche KPI!');
    }
    console.log('  ✓ Tutte le formule matematiche e i controlli zero-division sono corretti.\n');

    // 4. Test UTM Builder & URL Syntax Validation
    console.log('[4/10] Test Generatore URL UTM & Validatore Sintassi...');
    const generatedUrl = buildUtmUrl({
      baseUrl: 'https://hotel-etna.it/offerte?lang=it',
      source: 'Google Ads',
      medium: 'CPC',
      campaign: 'Autunno Benessere 2026',
      term: 'spa hotel sicilia',
      content: 'variante_a',
    });

    const expectedUrl = 'https://hotel-etna.it/offerte?lang=it&utm_source=google_ads&utm_medium=cpc&utm_campaign=autunno_benessere_2026&utm_term=spa_hotel_sicilia&utm_content=variante_a';
    if (generatedUrl !== expectedUrl) {
      throw new Error(`UTM URL errata:\nAtteso: ${expectedUrl}\nRicevuto: ${generatedUrl}`);
    }

    const parsed = parseUtmUrl(generatedUrl);
    if (
      !parsed.isValid ||
      parsed.utmSource !== 'google_ads' ||
      parsed.utmMedium !== 'cpc' ||
      parsed.utmCampaign !== 'autunno_benessere_2026' ||
      parsed.utmTerm !== 'spa_hotel_sicilia' ||
      parsed.utmContent !== 'variante_a'
    ) {
      throw new Error('Parsing URL UTM fallito!');
    }
    console.log('  ✓ Generazione e parsing UTM validati con successo.\n');

    // 5. Test RBAC & Project Access Control for Client Campaigns
    console.log('[5/10] Test Controllo Permessi RBAC & Isolamento Operatori...');
    // Unassigned operator should receive FORBIDDEN
    let forbiddenCaught = false;
    try {
      await getClientCampaignsByProject(projectId, unassignedOperator);
    } catch (err: any) {
      if (err.message === 'FORBIDDEN') forbiddenCaught = true;
    }
    if (!forbiddenCaught) {
      throw new Error('SECURITY BREACH: Operatore non assegnato ha avuto accesso in lettura alle campagne del progetto!');
    }

    // Unassigned operator should not be able to create a campaign
    let forbiddenCreateCaught = false;
    try {
      await createClientCampaign({
        projectId,
        name: 'Campagna Non Autorizzata',
        channel: 'google_search',
        objective: 'Test',
        monthlyBudgetCents: 50000,
      }, unassignedOperator);
    } catch (err: any) {
      if (err.message === 'FORBIDDEN') forbiddenCreateCaught = true;
    }
    if (!forbiddenCreateCaught) {
      throw new Error('SECURITY BREACH: Operatore non autorizzato ha creato una campagna!');
    }
    console.log('  ✓ Isolamento RBAC verificato: operatore non assegnato riceve 403 Forbidden.\n');

    // 6. Test Creating Client Campaign as Assigned Operator
    console.log('[6/10] Test Creazione Campagna Sponsorizzata da Operatore Assegnato...');
    const campaign1 = await createClientCampaign(
      {
        projectId,
        orderId,
        platformAccountId,
        name: 'Google Search - Suite & Spa Promo',
        channel: 'google_search',
        objective: 'Incremento prenotazioni dirette soggiorni weekend SPA',
        monthlyBudgetCents: 80000, // 800 €
        currency: 'EUR',
        startDate: '2026-10-01',
        endDate: '2026-12-31',
        status: 'active',
        targetGeography: 'Italia (Nord & Centro)',
        targetLanguages: 'Italiano',
        targetKeywords: ['hotel spa etna', 'weekend benessere sicilia', 'resort 4 stelle etna'],
        assignedOperatorId: assignedOperator.userId,
      },
      assignedOperator
    );

    if (!campaign1 || campaign1.name !== 'Google Search - Suite & Spa Promo' || campaign1.monthlyBudgetCents !== 80000) {
      throw new Error('Creazione campagna fallita o dati non corretti!');
    }

    // Create a secondary campaign for Meta Ads
    const campaign2 = await createClientCampaign(
      {
        projectId,
        orderId,
        name: 'Meta Ads - Retargeting & Lookalike SPA',
        channel: 'meta_ads_conversions',
        objective: 'Conversioni dirette e lead generation per pacchetti romantici',
        monthlyBudgetCents: 50000, // 500 €
        currency: 'EUR',
        status: 'active',
        targetGeography: 'Italia',
      },
      adminUser
    );
    console.log('  ✓ Campagne create con successo e collegate al progetto e alla commessa.\n');

    // 7. Test Campaign Creatives & Approval Workflow
    console.log('[7/10] Test Creatività, Copywriting Studio & Flusso di Approvazione...');
    // Add Search Responsive Ad Creative
    const creative1 = await createCampaignCreative(
      {
        campaignId: campaign1.id,
        variantName: 'Variante 1 - Suite Panoramica con Idromassaggio',
        format: 'search_responsive_ad',
        headlines: [
          'Grand Hotel Etna & SPA',
          'Sconto 20% Prenotazione Diretta',
          'Suite con Vista sul Vulcano',
          'Percorso Benessere Incluso',
        ],
        descriptions: [
          'Concediti una fuga di relax indimenticabile alle pendici dell\'Etna. Prenota online al miglior prezzo.',
          'Camere esclusive, piscina riscaldata e ristorante gourmet. Richiedi disponibilità senza impegno.',
        ],
        destinationUrl: 'https://hotel-etna.it/offerte-spa',
        autoBuildUtm: true,
        utmCampaign: 'promo_autunno_spa',
      },
      assignedOperator
    );

    if (!creative1 || creative1.approvalStatus !== 'draft') {
      throw new Error('Stato iniziale creatività non è draft!');
    }
    if (!creative1.trackedUrl || !creative1.trackedUrl.includes('utm_source=google')) {
      throw new Error('Generazione automatica link tracciato UTM su creatività fallita!');
    }

    // Operator requests review
    const inReviewCreative = await updateCampaignCreative(
      creative1.id,
      { approvalStatus: 'internal_review' },
      assignedOperator
    );
    if (inReviewCreative.approvalStatus !== 'internal_review') {
      throw new Error('Transizione internal_review fallita!');
    }

    // Admin approves creative
    const approvedCreative = await updateCampaignCreative(
      creative1.id,
      { approvalStatus: 'approved' },
      adminUser
    );
    if (approvedCreative.approvalStatus !== 'approved' || !approvedCreative.approvedByUserId || !approvedCreative.approvedAt) {
      throw new Error('Approvazione formale admin fallita o timestamp/userId mancante!');
    }
    console.log('  ✓ Flusso creatività, validazione annunci e approvazione verificati.\n');

    // 8. Test Monthly KPI Reports & Analytics
    console.log('[8/10] Test Registrazione Report KPI Mensili & Calcolo Automatico...');
    const report1 = await createCampaignKpiReport(
      {
        campaignId: campaign1.id,
        periodMonth: '2026-10',
        spendCents: 80000, // 800 €
        impressions: 16000,
        clicks: 800,
        conversionsCount: 40,
        conversionValueCents: 480000, // 4.800 €
        sourceType: 'manual_entry',
        executiveSummary: 'CTR eccellente al 5.0% e 40 prenotazioni generate con CPA 20.00€.',
        optimizationsPlanned: 'Aumento budget giornaliero nel weekend.',
      },
      assignedOperator
    );

    if (report1.ctrPercentage !== 5.0 || report1.cpcAverageEuro !== 1.0 || report1.cpaEuro !== 20.0 || report1.roasRatio !== 6.0) {
      throw new Error(`Calcolo metriche report fallito! CTR: ${report1.ctrPercentage}%, CPC: ${report1.cpcAverageEuro}€, CPA: ${report1.cpaEuro}€, ROAS: ${report1.roasRatio}x`);
    }

    const report2 = await createCampaignKpiReport(
      {
        campaignId: campaign2.id,
        periodMonth: '2026-10',
        spendCents: 40000, // 400 €
        impressions: 20000,
        clicks: 500,
        conversionsCount: 20,
        conversionValueCents: 160000, // 1.600 €
        sourceType: 'manual_entry',
      },
      assignedOperator
    );
    console.log('  ✓ Report KPI registrati e metriche archiviate correttamente nel database.\n');

    // 9. Test Project Marketing Aggregated Overview
    console.log('[9/10] Test Panoramica Aggregata Marketing del Progetto...');
    const marketingOverview = await getProjectMarketingOverview(projectId, assignedOperator);

    if (marketingOverview.totalCampaignsCount !== 2) {
      throw new Error(`Numero campagne errato nel riepilogo: atteso 2, ottenuto ${marketingOverview.totalCampaignsCount}`);
    }
    if (marketingOverview.totalAllocatedBudgetCents !== 130000) { // 800 + 500 = 1300 €
      throw new Error(`Budget totale allocato errato: atteso 130000 centesimi, ottenuto ${marketingOverview.totalAllocatedBudgetCents}`);
    }
    if (marketingOverview.totalSpendCents !== 120000) { // 800 + 400 = 1200 €
      throw new Error(`Spesa totale cumulata errata: atteso 120000 centesimi, ottenuto ${marketingOverview.totalSpendCents}`);
    }
    if (marketingOverview.totalConversions !== 60) { // 40 + 20 = 60
      throw new Error(`Conversioni totali errate: atteso 60, ottenuto ${marketingOverview.totalConversions}`);
    }
    if (marketingOverview.roasRatio !== 5.33) { // (4800 + 1600) / 1200 = 6400 / 1200 = 5.33
      throw new Error(`ROAS aggregato errato: atteso 5.33, ottenuto ${marketingOverview.roasRatio}`);
    }
    console.log('  ✓ Panoramica aggregata e breakdown canali calcolati con successo.\n');

    // 10. Test Cascade Deletion and Activity Logging
    console.log('[10/10] Test Eliminazione a Cascata & Tracciamento Activity Log...');
    const deleteRes = await deleteClientCampaign(campaign2.id, adminUser);
    if (!deleteRes.success) {
      throw new Error('Eliminazione campagna fallita!');
    }

    // Verify creatives and kpi reports for campaign2 were cascade deleted
    const leftoverKpi = db.select().from(campaignKpiReports).where(eq(campaignKpiReports.campaignId, campaign2.id)).all();
    if (leftoverKpi.length > 0) {
      throw new Error('Eliminazione a cascata fallita: report KPI orfani trovati!');
    }

    // Verify activity log entries exist
    const logs = db.select().from(activityLog).where(eq(activityLog.entityType, 'client_campaign')).all();
    if (logs.length === 0) {
      throw new Error('Activity log non registrato per le operazioni sulle campagne!');
    }
    console.log(`  ✓ Eliminazione a cascata e audit log verificati (${logs.length} log registrati).\n`);

    console.log('========================================================================');
    console.log('=== TUTTI I 10 TEST DEL CLIENT MARKETING & ADS HUB SUPERATI CON SUCCESSO! ===');
    console.log('========================================================================');
  } finally {
    // Cleanup temporary test DB
    try {
      const { sqlite } = await import('../packages/db/src');
      if (sqlite && typeof sqlite.close === 'function') {
        try {
          sqlite.close();
        } catch {}
      }
      if (fs.existsSync(tempDbFile)) {
        fs.unlinkSync(tempDbFile);
        console.log(`\nPulizia: file DB isolato ${tempDbFile} rimosso con successo.`);
      }
    } catch (e) {
      console.warn(`Avviso pulizia DB: ${e}`);
    }
  }
}

runClientMarketingTests().catch((err) => {
  console.error('\n❌ ERRORE NEI TEST CLIENT MARKETING HUB:', err);
  process.exit(1);
});
