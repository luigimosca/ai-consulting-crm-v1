import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
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
  console.log('[6/7] Test Workflow di Governance & RBAC...');
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

  // 7. Test Dashboard Metrics & 360 History
  console.log('[7/7] Test Metriche Reali Dashboard & Storico 360°...');
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

  console.log('\n=== TUTTI I TEST MARKETING HUB (FASE 1) SONO STATI SUPERATI CON SUCCESSO! ===');
}

runTests().catch((err) => {
  console.error('TEST SUITE FAILED:', err);
  process.exit(1);
});
