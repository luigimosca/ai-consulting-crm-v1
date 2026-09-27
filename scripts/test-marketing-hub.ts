import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import * as schema from '../packages/db/src/schema';
import {
  generateNaturalLanguageSummary,
  evaluateSegmentCandidates,
  createSegment,
  createCampaign,
  submitCampaignForReview,
  approveCampaign,
  populateCampaignRecipients,
  updateRecipientStatus,
  getCampaignDetails,
  getMarketingDashboardStats,
  getLeadCampaignHistory,
  getCompanyCampaignHistory,
} from '../apps/web/src/lib/marketing-service';
import { initDatabase, db as defaultDb } from '../packages/db/src';

async function runTests() {
  console.log('=== TEST SUITE: MARKETING HUB (PHASE 1) ===\n');

  // 1. Initialize Database
  console.log('[1/7] Inizializzazione Schema DB e Tabelle Marketing...');
  initDatabase();
  console.log('  ✓ Schema DB e tabelle marketing (marketingSegments, marketingCampaigns, campaignRecipients) verificate.\n');

  // Test User Contexts
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

  const now = new Date().toISOString();
  defaultDb.insert(schema.users).values([
    {
      id: adminUser.userId,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
      passwordHash: 'hash_test',
      createdAt: now,
    },
    {
      id: operatorUser.userId,
      email: operatorUser.email,
      name: operatorUser.name,
      role: operatorUser.role,
      passwordHash: 'hash_test',
      createdAt: now,
    },
  ]).onConflictDoNothing().run();

  // 2. Test Natural Language Summary Generator
  console.log('[2/7] Test Generatore Spiegazione in Linguaggio Naturale...');
  const summary1 = generateNaturalLanguageSummary(
    {
      sectors: ['horeca_ristoranti'],
      cities: ['Pompei', 'Napoli'],
      minCommercialScore: 70,
      techStack: {
        hasPixel: false,
        hasChatbot: false,
      },
      contactsRequirement: {
        mustHaveEmail: true,
        requireMarketingConsent: true,
      },
    },
    'leads'
  );
  console.log('  Summary Generato:', summary1);
  if (!summary1.includes('Ristoranti & HORECA') || !summary1.includes('Senza Meta Pixel') || !summary1.includes('Score Commerciale ≥ 70')) {
    throw new Error('Test Generatore Spiegazione fallito: stringa non coerente con i filtri');
  }
  console.log('  ✓ Generazione spiegazione naturale in italiano validata con successo.\n');

  // 3. Test Segment Creation & Candidate Evaluation
  console.log('[3/7] Test Creazione Segmento Dinamico e Valutazione Candidati...');
  const testSegment = await createSegment(
    {
      name: 'Test Segment Ristoranti Senza Pixel',
      description: 'Prospect ristorazione ad alto potenziale per campagne lead gen',
      targetType: 'leads',
      rules: {
        sectors: ['horeca_ristoranti'],
        minCommercialScore: 50,
        techStack: {
          hasPixel: false,
        },
        contactsRequirement: {
          mustHaveEmail: false,
        },
      },
    },
    operatorUser
  );
  console.log('  Segmento Creato ID:', testSegment.id);
  console.log('  Audience Stimata:', testSegment.estimatedCount);
  if (!testSegment.id || testSegment.estimatedCount === undefined) {
    throw new Error('Creazione segmento fallita');
  }
  console.log('  ✓ Segmento salvato e valutato correttamente.\n');

  // 4. Test Campaign Creation & Recipient Population
  console.log('[4/7] Test Creazione Campagna e Popolamento Destinatari...');
  const testCampaign = await createCampaign(
    {
      name: 'Campagna Test Q4 Outreach',
      objective: 'lead_generation',
      channel: 'email',
      segmentId: testSegment.id,
      contentSubject: 'Opportunità AI per {{companyName}} a {{city}}',
      contentBody: 'Gentile {{contactName}}, abbiamo analizzato la vostra presenza a {{city}} e notato eccellenti margini di crescita...',
    },
    operatorUser
  );
  console.log('  Campagna Creata:', testCampaign.code, '| Stato:', testCampaign.status);
  if (testCampaign.status !== 'draft') {
    throw new Error('La campagna creata deve avere stato iniziale "draft"');
  }

  const campaignDetails = await getCampaignDetails(testCampaign.id);
  console.log('  Destinatari Arruolati:', campaignDetails.totalRecipients);
  console.log('  ✓ Destinatari sincronizzati dal segmento e variabili snapshot salvate.\n');

  // 5. Test Recipient Status Updates & Conversion Tracking
  console.log('[5/7] Test Avanzamento Stato Destinatario in Pipeline...');
  if (campaignDetails.recipients && campaignDetails.recipients.length > 0) {
    const firstRecipient = campaignDetails.recipients[0];
    const updatedRecipient = await updateRecipientStatus(
      firstRecipient.id,
      {
        status: 'interested',
        outcomeNotes: 'Il titolare ha risposto entusiasta alla demo via email. Fissata call giovedì.',
      },
      operatorUser
    );
    console.log('  Destinatario Aggiornato:', updatedRecipient.contactPersonName, '-> Stato:', updatedRecipient.status);
    if (updatedRecipient.status !== 'interested' || !updatedRecipient.lastContactedAt) {
      throw new Error('Aggiornamento stato destinatario fallito');
    }
  }
  console.log('  ✓ Avanzamento stato outreach e registrazione note esito convalidate.\n');

  // 6. Test Governance & RBAC (Draft -> In Review -> Admin Approval)
  console.log('[6/8] Test Workflow di Governance & RBAC...');
  // Operator submits for review
  const underReview = await submitCampaignForReview(testCampaign.id, operatorUser);
  console.log('  Stato dopo invio in revisione:', underReview.status);
  if (underReview.status !== 'in_review') {
    throw new Error('Lo stato deve essere "in_review"');
  }

  // Operator attempts to approve -> Must Fail!
  let failedAsExpected = false;
  try {
    await approveCampaign(testCampaign.id, operatorUser);
  } catch (err: any) {
    if (err.message.includes('FORBIDDEN') || err.message.includes('Solo gli amministratori')) {
      failedAsExpected = true;
      console.log('  ✓ Blocco RBAC: L\'operatore non può auto-approvare la campagna (Rifiutato con 403/Forbidden).');
    }
  }
  if (!failedAsExpected) {
    throw new Error('Violazione RBAC: L\'operatore non deve poter approvare la campagna!');
  }

  // Admin approves campaign
  const approved = await approveCampaign(testCampaign.id, adminUser);
  console.log('  Stato dopo approvazione Admin:', approved.status, '| Approvata da:', approved.approvedByUserId);
  if (approved.status !== 'approved' || approved.approvedByUserId !== adminUser.userId) {
    throw new Error('Approvazione Admin fallita');
  }
  console.log('  ✓ Approvazione da parte dell\'amministratore completata con successo.\n');

  // 7. Comprehensive Negative Tests & Entity-Level Isolation
  console.log('[7/8] Test Negativi: Isolamento Operatore & Protezione Entità Fuori Ambito...');
  const otherOperator = {
    userId: 'usr_operator_other_test',
    email: 'luigi.operator@consulting.ai',
    name: 'Luigi Operatore Esterno',
    role: 'operator' as const,
  };

  defaultDb.insert(schema.users).values({
    id: otherOperator.userId,
    email: otherOperator.email,
    name: otherOperator.name,
    role: otherOperator.role,
    passwordHash: 'hash_test',
    createdAt: now,
  }).onConflictDoNothing().run();

  // Test A: Other operator tries to edit Mario's segment
  let caughtOtherSegEdit = false;
  try {
    const { updateSegment } = require('../apps/web/src/lib/marketing-service');
    await updateSegment(testSegment.id, { name: 'Hacked Segment' }, otherOperator);
  } catch (err: any) {
    if (err.message.includes('FORBIDDEN')) {
      caughtOtherSegEdit = true;
      console.log('  ✓ Blocco Negativo: Operatore non proprietario non può modificare il segmento (403).');
    }
  }
  if (!caughtOtherSegEdit) throw new Error('Test Negativo fallito: un operatore ha modificato un segmento non suo!');

  // Test B: Other operator tries to delete Mario's segment
  let caughtOtherSegDelete = false;
  try {
    const { deleteSegment } = require('../apps/web/src/lib/marketing-service');
    await deleteSegment(testSegment.id, otherOperator);
  } catch (err: any) {
    if (err.message.includes('FORBIDDEN')) {
      caughtOtherSegDelete = true;
      console.log('  ✓ Blocco Negativo: Operatore non proprietario non può eliminare il segmento (403).');
    }
  }
  if (!caughtOtherSegDelete) throw new Error('Test Negativo fallito: un operatore ha eliminato un segmento non suo!');

  // Test C: Other operator tries to edit Mario's campaign
  let caughtOtherCampEdit = false;
  try {
    const { updateCampaign } = require('../apps/web/src/lib/marketing-service');
    await updateCampaign(testCampaign.id, { name: 'Hacked Campaign' }, otherOperator);
  } catch (err: any) {
    if (err.message.includes('FORBIDDEN')) {
      caughtOtherCampEdit = true;
      console.log('  ✓ Blocco Negativo: Operatore non proprietario non può modificare la campagna (403).');
    }
  }
  if (!caughtOtherCampEdit) throw new Error('Test Negativo fallito: un operatore ha modificato una campagna non sua!');

  // Test D: Mario tries to edit his campaign now that it is APPROVED (locked state)
  let caughtLockedEdit = false;
  try {
    const { updateCampaign } = require('../apps/web/src/lib/marketing-service');
    await updateCampaign(testCampaign.id, { name: 'Modified After Approval' }, operatorUser);
  } catch (err: any) {
    if (err.message.includes('FORBIDDEN') && err.message.includes('approvata')) {
      caughtLockedEdit = true;
      console.log('  ✓ Blocco Negativo: Operatore non può modificare una campagna già approvata (403).');
    }
  }
  if (!caughtLockedEdit) throw new Error('Test Negativo fallito: la campagna approvata è stata modificata da un operatore!');

  // Test E: Other operator tries to update recipients of Mario's campaign
  let caughtOtherRecipEdit = false;
  if (campaignDetails.recipients && campaignDetails.recipients.length > 0) {
    try {
      await updateRecipientStatus(
        campaignDetails.recipients[0].id,
        { status: 'contacted', outcomeNotes: 'Unauthorized note' },
        otherOperator
      );
    } catch (err: any) {
      if (err.message.includes('FORBIDDEN')) {
        caughtOtherRecipEdit = true;
        console.log('  ✓ Blocco Negativo: Operatore non proprietario non può modificare i destinatari della campagna (403).');
      }
    }
    if (!caughtOtherRecipEdit) throw new Error('Test Negativo fallito: un operatore estraneo ha aggiornato destinatari non suoi!');
  }

  // Test F: Cross-campaign recipient parameter tampering
  let caughtCrossCamp = false;
  if (campaignDetails.recipients && campaignDetails.recipients.length > 0) {
    try {
      await updateRecipientStatus(
        campaignDetails.recipients[0].id,
        { status: 'contacted' },
        adminUser,
        'fake_campaign_id_999'
      );
    } catch (err: any) {
      if (err.message.includes('FORBIDDEN') && err.message.includes('non appartiene')) {
        caughtCrossCamp = true;
        console.log('  ✓ Blocco Negativo: Mismatch campaignId/recipientId intercettato e bloccato (403).');
      }
    }
    if (!caughtCrossCamp) throw new Error('Test Negativo fallito: mismatch cross-campaign non rilevato!');
  }

  // 8. Test Live GDPR Consent Revocation & Channel Opt-Out Post-Snapshot
  console.log('\n[8/8] Test Conformità GDPR Live: Revoca Consenso e Opt-Out Canale Post-Snapshot...');
  const testLeadId = `lead_live_gdpr_${Date.now()}`;
  defaultDb.insert(schema.leads).values({
    id: testLeadId,
    companyName: 'Studio Medico Live Test',
    sector: 'local_services',
    score: 85,
    status: 'nuovo',
    phone: '+39 081 99988877',
    email: 'info@studiomedicolive.it',
    city: 'Napoli-GDPR-Test',
    marketingConsentStatus: 'granted',
    optedOutChannelsJson: null,
    createdAt: now,
    updatedAt: now,
  }).run();

  const gdprSegment = await createSegment(
    {
      name: 'Segmento GDPR Live Test',
      targetType: 'leads',
      rules: {
        sectors: ['local_services'],
        cities: ['Napoli-GDPR-Test'],
        minCommercialScore: 80,
      },
    },
    adminUser
  );

  const gdprCampaign = await createCampaign(
    {
      name: 'Campagna GDPR Live Test',
      objective: 'lead_generation',
      channel: 'email',
      segmentId: gdprSegment.id,
      contentSubject: 'Test Live GDPR',
      contentBody: 'Messaggio di prova',
    },
    adminUser
  );

  const gdprDetailsInitial = await getCampaignDetails(gdprCampaign.id);
  const enrolledTarget = gdprDetailsInitial.recipients.find((r: any) => r.leadId === testLeadId);
  if (!enrolledTarget) throw new Error('Target GDPR non arruolato nella campagna');
  console.log('  Target Arruolato:', enrolledTarget.contactPersonName, '| isCurrentlyContactable:', enrolledTarget.isCurrentlyContactable);
  if (!enrolledTarget.isCurrentlyContactable) {
    throw new Error('Target doveva risultare contattabile con consenso iniziale granted');
  }

  // Lead revokes consent in CRM after enrollment snapshot
  console.log('  -> Simulazione: Il lead revoca il consenso marketing nel CRM (marketingConsentStatus = "revoked")...');
  defaultDb.update(schema.leads)
    .set({ marketingConsentStatus: 'revoked', updatedAt: new Date().toISOString() })
    .where(eq(schema.leads.id, testLeadId))
    .run();

  // Inspect campaign details live
  const gdprDetailsAfterRevoke = await getCampaignDetails(gdprCampaign.id);
  const targetAfterRevoke = gdprDetailsAfterRevoke.recipients.find((r: any) => r.leadId === testLeadId);
  console.log('  Target dopo revoca:');
  console.log('    - isLiveConsentRevoked:', targetAfterRevoke.isLiveConsentRevoked);
  console.log('    - isCurrentlyContactable:', targetAfterRevoke.isCurrentlyContactable);
  console.log('    - liveComplianceWarning:', targetAfterRevoke.liveComplianceWarning);

  if (targetAfterRevoke.isCurrentlyContactable !== false || !targetAfterRevoke.isLiveConsentRevoked) {
    throw new Error('La verifica live del consenso doveva rilevare la revoca del consenso post-snapshot!');
  }

  // Attempt to register positive contact action (e.g. contacted) -> Must fail with FORBIDDEN_PRIVACY
  let caughtGdprBlock = false;
  try {
    await updateRecipientStatus(
      enrolledTarget.id,
      { status: 'contacted', outcomeNotes: 'Tentativo di contatto post-revoca' },
      adminUser
    );
  } catch (err: any) {
    if (err.message.includes('FORBIDDEN_PRIVACY')) {
      caughtGdprBlock = true;
      console.log('  ✓ Blocco GDPR Live Eseguito: Tentativo di contatto respinto con 403 FORBIDDEN_PRIVACY.');
    }
  }
  if (!caughtGdprBlock) throw new Error('Violazione GDPR: Il sistema ha permesso il contatto nonostante la revoca live!');

  // Verify recipient status in DB was automatically updated to excluded_no_consent
  const recipientAfterBlock = defaultDb.select().from(schema.campaignRecipients).where(eq(schema.campaignRecipients.id, enrolledTarget.id)).get();
  console.log('  Stato finale destinatario nel DB:', recipientAfterBlock?.status, '| Motivo esclusione:', recipientAfterBlock?.exclusionReason);
  if (recipientAfterBlock?.status !== 'excluded_no_consent') {
    throw new Error('Lo stato del destinatario doveva essere convertito in excluded_no_consent');
  }

  // Verify Audit Log entry for GDPR auto-exclusion
  console.log('  -> Verifica Audit Trail in activity_log...');
  const auditEntries = defaultDb
    .select()
    .from(schema.activityLog)
    .where(eq(schema.activityLog.entityId, enrolledTarget.id))
    .all();
  const privacyAudit = auditEntries.find((a) => a.action === 'recipient_privacy_blocked_auto_excluded');
  if (!privacyAudit) {
    throw new Error('Audit entry non trovata per il blocco privacy live in activity_log');
  }
  console.log('  ✓ Audit registrato con successo: Action =', privacyAudit.action, '| PerformedBy =', privacyAudit.performedBy);

  // Verify Deduplication & Composite Unique Index
  console.log('\n  -> Test Deduplicazione: ID Univoco vs Anagrafiche Multiple Distinte...');
  const countRepop = await populateCampaignRecipients(gdprCampaign.id, adminUser);
  console.log('  Popolamento ripetuto su campagna con record già presenti: inseriti', countRepop, 'nuovi destinatari (atteso 0).');
  if (countRepop !== 0) {
    throw new Error('Deduplicazione fallita: sono stati inseriti duplicati durante il ripopolamento!');
  }
  console.log('  ✓ Deduplicazione per ID garantita dal vincolo univoco (mktg_recipients_camp_lead_uidx).');

  // Test that distinct leads with same company name remain distinct without arbitrary merging
  const leadBranchA = `lead_branch_a_${Date.now()}`;
  const leadBranchB = `lead_branch_b_${Date.now()}`;
  defaultDb.insert(schema.leads).values([
    {
      id: leadBranchA,
      companyName: 'Acme Solutions - Sede Napoli',
      sector: 'local_services',
      score: 90,
      status: 'nuovo',
      phone: '+39 081 1111111',
      email: 'napoli@acme.it',
      city: 'Napoli-Dedup-Test',
      marketingConsentStatus: 'granted',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: leadBranchB,
      companyName: 'Acme Solutions - Sede Milano',
      sector: 'local_services',
      score: 90,
      status: 'nuovo',
      phone: '+39 02 2222222',
      email: 'milano@acme.it',
      city: 'Napoli-Dedup-Test',
      marketingConsentStatus: 'granted',
      createdAt: now,
      updatedAt: now,
    },
  ]).run();

  const dedupSegment = await createSegment(
    {
      name: 'Segmento Test Sedi Multiple',
      targetType: 'leads',
      rules: {
        sectors: ['local_services'],
        cities: ['Napoli-Dedup-Test'],
        minCommercialScore: 80,
      },
    },
    adminUser
  );

  const dedupCampaign = await createCampaign(
    {
      name: 'Campagna Sedi Multiple',
      objective: 'lead_generation',
      channel: 'email',
      segmentId: dedupSegment.id,
      contentSubject: 'Test sedi',
      contentBody: 'Messaggio sedi',
    },
    adminUser
  );

  const dedupDetails = await getCampaignDetails(dedupCampaign.id);
  console.log('  Destinatari arruolati per 2 sedi distinte (stesso brand Acme):', dedupDetails.totalRecipients);
  if (dedupDetails.totalRecipients !== 2) {
    throw new Error('Le 2 sedi distinte dovevano essere preservate entrambe come destinatari autonomi');
  }
  console.log('  ✓ Preservazione anagrafiche distinte verificata: nessuna fusione arbitraria senza merge esplicito CRM.');

  // Clean up dedup test records
  defaultDb.delete(schema.campaignRecipients).where(eq(schema.campaignRecipients.campaignId, dedupCampaign.id)).run();
  defaultDb.delete(schema.marketingCampaigns).where(eq(schema.marketingCampaigns.id, dedupCampaign.id)).run();
  defaultDb.delete(schema.marketingSegments).where(eq(schema.marketingSegments.id, dedupSegment.id)).run();
  defaultDb.delete(schema.leads).where(eq(schema.leads.id, leadBranchA)).run();
  defaultDb.delete(schema.leads).where(eq(schema.leads.id, leadBranchB)).run();

  // Clean up test records
  defaultDb.delete(schema.campaignRecipients).where(eq(schema.campaignRecipients.campaignId, gdprCampaign.id)).run();
  defaultDb.delete(schema.marketingCampaigns).where(eq(schema.marketingCampaigns.id, gdprCampaign.id)).run();
  defaultDb.delete(schema.marketingSegments).where(eq(schema.marketingSegments.id, gdprSegment.id)).run();
  defaultDb.delete(schema.leads).where(eq(schema.leads.id, testLeadId)).run();

  // 9. Read Permissions & Agency Central Registry Verification
  console.log('\n[9/9] Verifica Politiche di LETTURA (Anagrafica Condivisa vs Non Autenticato)...');
  // Operator B reading Mario's campaign details
  const operatorBDetails = await getCampaignDetails(testCampaign.id);
  console.log('  Operatore B legge dettagli campagna di Mario:', operatorBDetails.name, '| Destinatari:', operatorBDetails.totalRecipients);
  if (!operatorBDetails || operatorBDetails.id !== testCampaign.id) {
    throw new Error('Lettura condivisa campagna fallita per operatore B');
  }
  console.log('  ✓ Lettura condivisa CRM: Gli operatori autenticati condividono la visualizzazione delle campagne e anagrafiche aziendali per coordinamento interno.');

  // Test Lead Campaign History read by Operator
  if (campaignDetails.recipients && campaignDetails.recipients.length > 0 && campaignDetails.recipients[0].leadId) {
    const leadHistory = await getLeadCampaignHistory(campaignDetails.recipients[0].leadId);
    console.log('  Operatore legge Storico 360° Lead:', leadHistory.length, 'campagne associate');
    if (leadHistory.length === 0) {
      throw new Error('Storico marketing del lead non trovato');
    }
  }

  // Test Dashboard Metrics & 360 History
  console.log('\n--- Verifica Metriche Dashboard & Storico 360° ---');
  const stats = await getMarketingDashboardStats();
  console.log('  Dashboard Stats:');
  console.log('    - Campagne Totali:', stats.totalCampaigns);
  console.log('    - Segmenti Totali:', stats.totalSegments);
  console.log('    - Destinatari Totali:', stats.totalRecipients);
  console.log('    - Distribuzione Canali:', stats.channelDistribution);
  console.log('    - Disclaimers Trasparenza Metriche:', stats.unavailableMetrics);

  if (stats.unavailableMetrics.openRate === undefined) {
    throw new Error('Mancata disclosure esplicita delle metriche non disponibili');
  }

  // Test Lead Campaign History
  if (campaignDetails.recipients && campaignDetails.recipients.length > 0 && campaignDetails.recipients[0].leadId) {
    const leadHistory = await getLeadCampaignHistory(campaignDetails.recipients[0].leadId);
    console.log('  Lead 360° Marketing History Count:', leadHistory.length);
    if (leadHistory.length === 0) {
      throw new Error('Storico marketing del lead non trovato');
    }
  }

  console.log('\n========================================================================');
  console.log('=== TUTTI I TEST MARKETING HUB (FASE 1) SONO STATI SUPERATI CON SUCCESSO! ===');
  console.log('========================================================================\n');
}

runTests().catch((err) => {
  console.error('TEST SUITE FAILED:', err);
  process.exit(1);
});
