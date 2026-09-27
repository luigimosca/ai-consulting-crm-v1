import path from 'path';
import fs from 'fs';
import os from 'os';

// ---------------------------------------------------------------------------
// 1. Pre-flight Verification & Isolation Setup BEFORE ANY MODULE IMPORT
// ---------------------------------------------------------------------------
const tempDbFile = path.join(os.tmpdir(), `crm_mktg_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.db`);
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
  throw new Error(`[CRITICAL SECURITY REFUSAL] Test execution aborted: DATABASE_PATH points to an unsafe or production database path (${resolvedPath}). Tests must run strictly on an isolated temporary database.`);
}

async function runTests() {
  console.log('========================================================================');
  console.log('=== TEST SUITE: MARKETING HUB (PHASE 1) - ISOLATED TEST RUN ===');
  console.log(`=== DB Isolato: ${tempDbFile} ===`);
  console.log('========================================================================\n');

    // Dynamic import AFTER setting DATABASE_PATH
    const { initDatabase, db, users, leads, companies, websiteAnalysis, decisionMakers, enrichmentRuns } = await import('../packages/db/src');
    const { eq } = await import('drizzle-orm');
    const {
      generateNaturalLanguageSummary,
      evaluateSegmentCandidates,
      createSegment,
      updateSegment,
      deleteSegment,
      createCampaign,
      updateCampaign,
      submitCampaignForReview,
      approveCampaign,
      populateCampaignRecipients,
      updateRecipientStatus,
      getCampaignDetails,
      getMarketingDashboardStats,
      getLeadCampaignHistory,
      getCompanyCampaignHistory,
    } = await import('../apps/web/src/lib/marketing-service');

  try {
    // 1. Initialize Database Schema
    console.log('[1/10] Inizializzazione Schema DB e Tabelle Marketing su DB Isolato...');
    initDatabase();
    console.log('  ✓ Schema DB e tabelle marketing verificate con successo su file isolato.\n');

    // Test Users
    const adminUser = {
      userId: 'usr_admin_test',
      email: 'admin@consulting.ai',
      name: 'Admin Test',
      role: 'admin' as const,
    };

    const operatorUser = {
      userId: 'usr_operator_test',
      email: 'mario@consulting.ai',
      name: 'Mario Operatore',
      role: 'operator' as const,
    };

    const operatorB = {
      userId: 'usr_operator_b',
      email: 'luigi@consulting.ai',
      name: 'Luigi Operatore B',
      role: 'operator' as const,
    };

    const now = new Date().toISOString();
    db.insert(users).values([
      { id: adminUser.userId, email: adminUser.email, name: adminUser.name, role: adminUser.role, passwordHash: 'hash_test', createdAt: now },
      { id: operatorUser.userId, email: operatorUser.email, name: operatorUser.name, role: operatorUser.role, passwordHash: 'hash_test', createdAt: now },
      { id: operatorB.userId, email: operatorB.email, name: operatorB.name, role: operatorB.role, passwordHash: 'hash_test', createdAt: now },
    ]).run();

    // Seed Sample Leads & Companies for filtering tests
    db.insert(leads).values([
      {
        id: 'lead_analyzed_no_pixel',
        companyName: 'Ristorante Da Mario Pompei',
        sector: 'horeca_ristoranti',
        city: 'Pompei',
        address: 'Via Roma 12, Pompei (NA)',
        email: 'info@damariopompei.it',
        phone: '0818501111',
        score: 85,
        marketingConsentStatus: 'granted',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'lead_unanalyzed_site',
        companyName: 'Pizzeria Bella Napoli',
        sector: 'horeca_ristoranti',
        city: 'Napoli',
        address: 'Corso Umberto 50 (NA)',
        email: 'info@bellanapoli.it',
        phone: '0818502222',
        score: 75,
        marketingConsentStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'lead_with_pixel',
        companyName: 'Grand Hotel Vesuvio',
        sector: 'horeca_hotel',
        city: 'Sorrento',
        address: 'Via Marina 1, Sorrento (NA)',
        email: 'contact@vesuviohotel.it',
        phone: '0818503333',
        score: 90,
        marketingConsentStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      },
    ]).run();

    db.insert(enrichmentRuns).values([
      {
        id: 'run_1',
        leadId: 'lead_analyzed_no_pixel',
        status: 'completed',
        startedAt: now,
        completedAt: now,
        overallConfidence: 90,
        commercialScore: 85,
        reliabilityScore: 80,
      },
      {
        id: 'run_2',
        leadId: 'lead_with_pixel',
        status: 'completed',
        startedAt: now,
        completedAt: now,
        overallConfidence: 95,
        commercialScore: 90,
        reliabilityScore: 85,
      },
    ]).run();

    // Website analysis: only lead_analyzed_no_pixel and lead_with_pixel are analyzed!
    db.insert(websiteAnalysis).values([
      {
        id: 'wa_1',
        leadId: 'lead_analyzed_no_pixel',
        runId: 'run_1',
        url: 'https://damariopompei.it',
        hasPixel: 0,
        hasChatbot: 0,
        analyzedAt: now,
      },
      {
        id: 'wa_2',
        leadId: 'lead_with_pixel',
        runId: 'run_2',
        url: 'https://vesuviohotel.it',
        hasPixel: 1,
        hasChatbot: 1,
        analyzedAt: now,
      },
    ]).run();

    // 2. Test Natural Language Summary Generator
    console.log('[2/10] Test Generatore Spiegazione in Linguaggio Naturale...');
    const summary1 = generateNaturalLanguageSummary(
      {
        sectors: ['horeca_ristoranti'],
        cities: ['Pompei', 'Napoli'],
        provinces: ['NA'],
        minCommercialScore: 70,
        techStack: { hasPixel: false, hasChatbot: false },
        contactsRequirement: { mustHaveEmail: true, requireMarketingConsent: true },
      },
      'leads'
    );
    console.log('  Summary Generato:', summary1);
    if (!summary1.includes('Ristoranti & HORECA') || !summary1.includes('Senza Meta Pixel') || !summary1.includes('Score Commerciale ≥ 70')) {
      throw new Error('Test Generatore Spiegazione fallito: stringa non coerente con i filtri');
    }
    console.log('  ✓ Spiegazione in linguaggio naturale validata con successo.\n');

    // 3. Test Filter Accuracy: "Tecnologia Assente" vs "Dato Non Analizzato" & Province matching
    console.log('[3/10] Test Filtri: Distinzione "Tecnologia Assente" vs "Non Analizzato" e Province...');
    
    // Filter for "hasPixel: false" -> Must ONLY match lead_analyzed_no_pixel, NOT lead_unanalyzed_site!
    const evalTech = await evaluateSegmentCandidates(
      {
        sectors: ['horeca_ristoranti'],
        techStack: { hasPixel: false },
      },
      'leads'
    );
    console.log('  Candidati con Pixel Assente (verificato):', evalTech.candidates.map(c => c.name));
    if (evalTech.candidates.length !== 1 || evalTech.candidates[0].id !== 'lead_analyzed_no_pixel') {
      throw new Error('ERRORE FILTRO TECH: Un sito non analizzato è stato erroneamente conteggiato come "senza pixel"!');
    }
    console.log('  ✓ Accuratezza Filtro Tecnologico: Il lead non analizzato è stato escluso da "senza pixel".');

    // Filter by Province "NA" (Napoli) -> Must match leads with NA in address/city/notes
    const evalProv = await evaluateSegmentCandidates(
      {
        provinces: ['NA'],
      },
      'leads'
    );
    console.log('  Candidati Provincia NA:', evalProv.candidates.length);
    if (evalProv.candidates.length < 3) {
      throw new Error('ERRORE FILTRO PROVINCIA: Mancata corrispondenza della provincia per i lead');
    }
    console.log('  ✓ Filtro Provincia per Lead verificato con successo.\n');

    // 4. Test Prudent Consent Handling (pending is NOT "Consenso Valido")
    console.log('[4/10] Test Gestione Prudente Consenso (pending = Da verificare / non contattabile su canali opt-in)...');
    const evalConsent = await evaluateSegmentCandidates(
      {
        contactsRequirement: { requireMarketingConsent: true },
      },
      'leads'
    );
    const pendingLeadCandidate = evalConsent.candidates.find(c => c.id === 'lead_unanalyzed_site');
    console.log('  Candidato con consentStatus "pending":', {
      name: pendingLeadCandidate?.name,
      consentLabel: pendingLeadCandidate?.consentLabel,
      isEligible: pendingLeadCandidate?.isEligible,
      exclusionReason: pendingLeadCandidate?.exclusionReason,
    });
    if (pendingLeadCandidate?.consentLabel !== 'In attesa di verifica (Opt-in non confermato)' || pendingLeadCandidate?.isEligible !== false) {
      throw new Error('ERRORE PRIVACY: pending è stato trattato come valido o eleggibile quando era richiesto il consenso verificato!');
    }
    console.log('  ✓ Consenso Prudente Validato: I lead con "pending" non sono qualificati come consenso valido.\n');

    // 5. Test Segment Creation & Transparency Metadata (limitApplied)
    console.log('[5/10] Test Creazione Segmento Dinamico e Trasparenza Metadati...');
    const segment = await createSegment(
      {
        name: 'Segmento HORECA Campania',
        description: 'Lead ristorazione qualificati',
        targetType: 'leads',
        rules: { sectors: ['horeca_ristoranti'], provinces: ['NA'] },
      },
      operatorUser
    );
    console.log('  Segmento Creato ID:', segment.id);
    const evalWithLimit = await evaluateSegmentCandidates({ sectors: ['horeca_ristoranti'] }, 'leads', 1);
    if (!evalWithLimit.limitApplied || evalWithLimit.maxLimit !== 1) {
      throw new Error('ERRORE METADATI: limitApplied o maxLimit non valorizzati');
    }
    console.log('  ✓ Trasparenza capienza audience verificata (limitApplied = true).\n');

    // 6. Test Campaign Creation & Atomic Non-Destructive Population
    console.log('[6/10] Test Creazione Campagna e Sincronizzazione Atomica Destinatari...');
    const campaign = await createCampaign(
      {
        name: 'Campagna Email Ristoranti Q4',
        objective: 'lead_generation',
        channel: 'email',
        segmentId: segment.id,
      },
      operatorUser
    );
    console.log('  Campagna Creata:', campaign.code, '| Stato:', campaign.status);

    // Populate recipients
    const popRes1 = await populateCampaignRecipients(campaign.id, operatorUser);
    console.log('  Destinatari Iniziali Arruolati:', popRes1.populatedCount, '| Totali:', popRes1.totalRecipients);

    // Get a pending recipient and add a custom operator note
    const campaignDetails1 = await getCampaignDetails(campaign.id);
    const targetRecipient = campaignDetails1.recipients[0];
    console.log('  Aggiunta nota operativa al destinatario pending:', targetRecipient.id);
    await updateRecipientStatus(
      targetRecipient.id,
      { status: 'pending', outcomeNotes: 'Nota importante: cliente ha espresso interesse preliminare' },
      operatorUser,
      campaign.id
    );

    // Re-synchronize recipients with populateCampaignRecipients
    console.log('  -> Esecuzione risincronizzazione destinatari...');
    await populateCampaignRecipients(campaign.id, operatorUser);

    const campaignDetailsAfterSync = await getCampaignDetails(campaign.id);
    const preservedRecipient = campaignDetailsAfterSync.recipients.find(r => r.id === targetRecipient.id);
    console.log('  Destinatario dopo sync:', {
      id: preservedRecipient?.id,
      status: preservedRecipient?.status,
      outcomeNotes: preservedRecipient?.outcomeNotes,
    });
    if (!preservedRecipient || preservedRecipient.outcomeNotes !== 'Nota importante: cliente ha espresso interesse preliminare') {
      throw new Error('ERRORE SINCRONIZZAZIONE: La riga pending con note è stata cancellata o sovrascritta!');
    }
    console.log('  ✓ Preservazione Righe con Note: La sincronizzazione atomica ha preservato la riga e la nota al 100%.\n');

    // 7. Test Negative: PATCH Campaign State Bypass
    console.log('[7/10] Test Negativi: Blocco Bypass Stati Riservati tramite PATCH Campagna...');
    
    // Attempt 7.1: Admin attempts to set status='approved' via generic PATCH -> MUST BE REJECTED
    let adminBypassBlocked = false;
    try {
      await updateCampaign(campaign.id, { status: 'approved' }, adminUser);
    } catch (err: any) {
      if (err.message.includes('Lo stato "approved" non può essere impostato tramite modifica generica') || err.message.includes('FORBIDDEN')) {
        adminBypassBlocked = true;
        console.log('  ✓ Blocco Bypass Admin: PATCH status="approved" respinto con FORBIDDEN.');
      }
    }
    if (!adminBypassBlocked) throw new Error('ERRORE: Admin è riuscito a forzare status="approved" via PATCH!');

    // Attempt 7.2: Operator attempts to set status='approved' via PATCH -> MUST BE REJECTED
    let operatorBypassBlocked = false;
    try {
      await updateCampaign(campaign.id, { status: 'approved' }, operatorUser);
    } catch (err: any) {
      if (err.message.includes('FORBIDDEN')) {
        operatorBypassBlocked = true;
        console.log('  ✓ Blocco Bypass Operatore: PATCH status="approved" respinto con FORBIDDEN.');
      }
    }
    if (!operatorBypassBlocked) throw new Error('ERRORE: Operatore è riuscito a forzare status="approved" via PATCH!');

    // Attempt 7.3: Operator attempts to jump directly to 'active' on draft campaign -> MUST BE REJECTED
    let unapprovedJumpBlocked = false;
    try {
      await updateCampaign(campaign.id, { status: 'active' }, operatorUser);
    } catch (err: any) {
      if (err.message.includes('INVALID_STATE_TRANSITION') || err.message.includes('senza previa approvazione')) {
        unapprovedJumpBlocked = true;
        console.log('  ✓ Blocco Transizione Illegittima: Tentativo di attivare campagna bozza non approvata respinto.');
      }
    }
    if (!unapprovedJumpBlocked) throw new Error('ERRORE: Campagna in bozza attivata senza approvazione!');

    // 8. Test Governance Workflow (submit-review -> approve)
    console.log('\n[8/10] Test Workflow Governance Ufficiale (submit-review -> approve)...');
    await submitCampaignForReview(campaign.id, operatorUser);
    console.log('  Campagna inviata in revisione.');

    // Only admin can approve via approveCampaign
    await approveCampaign(campaign.id, adminUser);
    const approvedCamp = await getCampaignDetails(campaign.id);
    console.log('  Campagna Approvata da:', approvedCamp.approver?.name, '| Stato:', approvedCamp.status);
    if (approvedCamp.status !== 'approved' || approvedCamp.approvedByUserId !== adminUser.userId) {
      throw new Error('ERRORE GOVERNANCE: Approvazione ufficiale non registrata correttamente');
    }
    console.log('  ✓ Workflow di governance formale completato con approvatore e timestamp.\n');

    // 9. Test Runtime Server-Side Privacy Block on Unverified / Revoked Consent
    console.log('[9/10] Test Blocco Operativo Privacy Server-Side (Revoca e Consenso Pending non Verificato)...');
    // Simulate lead revoking consent
    db.update(leads).set({ marketingConsentStatus: 'revoked' }).where(eq(leads.id, targetRecipient.leadId!)).run();

    let runtimePrivacyBlocked = false;
    try {
      await updateRecipientStatus(targetRecipient.id, { status: 'contacted' }, operatorUser, campaign.id);
    } catch (err: any) {
      if (err.message.includes('FORBIDDEN_PRIVACY')) {
        runtimePrivacyBlocked = true;
        console.log('  ✓ Blocco Privacy Live: Tentativo di contatto su lead revocato respinto con FORBIDDEN_PRIVACY.');
      }
    }
    if (!runtimePrivacyBlocked) throw new Error('ERRORE PRIVACY: Azione di contatto consentita su contatto con consenso revocato!');

    // 10. Dashboard Stats & History
    console.log('\n[10/10] Test Dashboard Stats e Storico 360° Lead/Aziende...');
    const stats = await getMarketingDashboardStats();
    console.log('  Dashboard Stats:', {
      totalCampaigns: stats.totalCampaigns,
      totalSegments: stats.totalSegments,
      totalRecipients: stats.totalRecipients,
      unavailableMetrics: stats.unavailableMetrics,
    });
    const leadHist = await getLeadCampaignHistory(targetRecipient.leadId!);
    console.log('  Storico Campagne Lead Count:', leadHist.length);
    if (leadHist.length === 0) throw new Error('ERRORE: Storico 360° lead non trovato');
    console.log('  ✓ Storico 360° e metriche dashboard verificate con successo.\n');

    console.log('========================================================================');
    console.log('=== TUTTI I 10 TEST MARKETING HUB SONO STATI SUPERATI CON SUCCESSO! ===');
    console.log('========================================================================\n');
  } finally {
    // Cleanup temporary DB
    try {
      if (fs.existsSync(tempDbFile)) fs.unlinkSync(tempDbFile);
      if (fs.existsSync(tempDbFile + '-wal')) fs.unlinkSync(tempDbFile + '-wal');
      if (fs.existsSync(tempDbFile + '-shm')) fs.unlinkSync(tempDbFile + '-shm');
    } catch {}
  }
}

runTests().catch((err) => {
  console.error('TEST FALLITO:', err);
  process.exit(1);
});
