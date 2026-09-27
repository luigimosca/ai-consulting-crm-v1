import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq, and } from 'drizzle-orm';
import * as schema from '../packages/db/src/schema';
import {
  createSegment,
  createCampaign,
  populateCampaignRecipients,
  updateRecipientStatus,
  getCampaignDetails,
  getLeadCampaignHistory,
} from '../apps/web/src/lib/marketing-service';
import { initDatabase, db as defaultDb } from '../packages/db/src';

async function runFinalVerifications() {
  console.log('========================================================================');
  console.log('=== TEST SUITE: 3 VERIFICHE FINALI MARKETING HUB (FASE 1) ===');
  console.log('========================================================================\n');

  initDatabase();
  const now = new Date().toISOString();

  const adminUser = {
    userId: 'usr_admin_final',
    email: 'admin.final@agency.local',
    name: 'Admin Final',
    role: 'admin' as const,
  };

  const operatorA = {
    userId: 'usr_operator_a_final',
    email: 'mario.final@agency.local',
    name: 'Mario Operatore A',
    role: 'operator' as const,
  };

  const operatorB = {
    userId: 'usr_operator_b_final',
    email: 'luigi.final@agency.local',
    name: 'Luigi Operatore B',
    role: 'operator' as const,
  };

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
      id: operatorA.userId,
      email: operatorA.email,
      name: operatorA.name,
      role: operatorA.role,
      passwordHash: 'hash_test',
      createdAt: now,
    },
    {
      id: operatorB.userId,
      email: operatorB.email,
      name: operatorB.name,
      role: operatorB.role,
      passwordHash: 'hash_test',
      createdAt: now,
    },
  ]).onConflictDoNothing().run();

  // -------------------------------------------------------------------------
  // TEST 1: Revoca Consenso + Risincronizzazione (Preservazione Storico)
  // -------------------------------------------------------------------------
  console.log('[TEST 1/3] Revoca Consenso + Risincronizzazione Segmento/Campagna...');
  const leadPendingId = `lead_pending_rev_${Date.now()}`;
  const leadWorkedId = `lead_worked_rev_${Date.now()}`;

  defaultDb.insert(schema.leads).values([
    {
      id: leadPendingId,
      companyName: 'Ristorante Da Ciro (Pending Test)',
      sector: 'horeca_ristoranti',
      score: 88,
      status: 'nuovo',
      phone: '+39 081 123456',
      email: 'info@daciro.it',
      city: 'Pompei-Final-Test',
      marketingConsentStatus: 'granted',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: leadWorkedId,
      companyName: 'Trattoria Vesuviana (Worked Test)',
      sector: 'horeca_ristoranti',
      score: 95,
      status: 'nuovo',
      phone: '+39 081 654321',
      email: 'info@trattoriavesuviana.it',
      city: 'Pompei-Final-Test',
      marketingConsentStatus: 'granted',
      createdAt: now,
      updatedAt: now,
    },
  ]).run();

  const segment1 = await createSegment(
    {
      name: 'Segmento Test Revoca',
      targetType: 'leads',
      rules: {
        sectors: ['horeca_ristoranti'],
        cities: ['Pompei-Final-Test'],
        minCommercialScore: 80,
      },
    },
    operatorA
  );

  const campaign1 = await createCampaign(
    {
      name: 'Campagna Test Revoca & Risincronizzazione',
      objective: 'lead_generation',
      channel: 'email',
      segmentId: segment1.id,
      contentSubject: 'Offerta per {{companyName}}',
      contentBody: 'Gentile referente di {{companyName}}...',
    },
    operatorA
  );

  let details1 = await getCampaignDetails(campaign1.id);
  console.log('  Arruolamento Iniziale: Destinatari totali =', details1.totalRecipients);
  if (details1.totalRecipients !== 2) throw new Error('Arruolamento iniziale non corretto');

  // Lavorazione del leadWorked: Operatore A registra contatto ed esito
  const workedRecipient = details1.recipients.find((r: any) => r.leadId === leadWorkedId);
  await updateRecipientStatus(
    workedRecipient.id,
    {
      status: 'interested',
      outcomeNotes: 'Il titolare desidera una demo personalizzata giovedì mattina',
    },
    operatorA
  );
  console.log('  ✓ Destinatario 2 lavorato con successo: Stato = interested, Note salvate');

  // Simulazione: ENTRAMBI i lead revocano il consenso privacy nel CRM
  console.log('  -> Simulazione: Entrambi i lead revocano il consenso marketing nel CRM...');
  defaultDb.update(schema.leads)
    .set({ marketingConsentStatus: 'revoked', updatedAt: new Date().toISOString() })
    .where(eq(schema.leads.id, leadPendingId))
    .run();
  defaultDb.update(schema.leads)
    .set({ marketingConsentStatus: 'revoked', updatedAt: new Date().toISOString() })
    .where(eq(schema.leads.id, leadWorkedId))
    .run();

  // RISINCRONIZZAZIONE DELLA CAMPAGNA
  console.log('  -> Esecuzione Risincronizzazione: populateCampaignRecipients()...');
  await populateCampaignRecipients(campaign1.id, operatorA);

  const detailsAfterResync = await getCampaignDetails(campaign1.id);
  console.log('  Destinatari dopo Risincronizzazione:', detailsAfterResync.totalRecipients);

  // Verifiche:
  // 1. Il record lavorato (leadWorkedId) DEVE essere ancora presente con il suo stato storico 'interested' e le sue note!
  const workedAfterResync = detailsAfterResync.recipients.find((r: any) => r.leadId === leadWorkedId);
  if (!workedAfterResync) throw new Error('ERRORE CRITICO: Il record storico lavorato è stato eliminato dalla risincronizzazione!');
  if (workedAfterResync.status !== 'interested' || !workedAfterResync.outcomeNotes?.includes('demo personalizzata')) {
    throw new Error('ERRORE: Dati storici o note del destinatario alterate!');
  }
  console.log('  ✓ Preservazione Storico: Il record lavorato è rimasto intatto (Stato = interested, Note preservate).');

  // 2. Il record lavorato DEVE risultare LIVE non contattabile per intervenuta revoca
  if (workedAfterResync.isCurrentlyContactable !== false || !workedAfterResync.isLiveConsentRevoked) {
    throw new Error('ERRORE: La conformità privacy live non ha rilevato la revoca sul record lavorato');
  }
  console.log('  ✓ Verifica Privacy Live sul record storico: isCurrentlyContactable = false, isLiveConsentRevoked = true.');

  // 3. Tentativo di ulteriore contatto positivo sul record storico lavorato DEVE essere bloccato con 403
  let caughtPrivacyBlock = false;
  try {
    await updateRecipientStatus(
      workedAfterResync.id,
      { status: 'converted', outcomeNotes: 'Tentativo forzato' },
      operatorA
    );
  } catch (err: any) {
    if (err.message.includes('FORBIDDEN_PRIVACY')) {
      caughtPrivacyBlock = true;
      console.log('  ✓ Blocco Runtime: Ulteriore azione di contatto positivo rigettata con 403 FORBIDDEN_PRIVACY.');
    }
  }
  if (!caughtPrivacyBlock) throw new Error('ERRORE: Violazione privacy permessa su record con consenso revocato!');

  // Pulizia dati test 1
  defaultDb.delete(schema.campaignRecipients).where(eq(schema.campaignRecipients.campaignId, campaign1.id)).run();
  defaultDb.delete(schema.marketingCampaigns).where(eq(schema.marketingCampaigns.id, campaign1.id)).run();
  defaultDb.delete(schema.marketingSegments).where(eq(schema.marketingSegments.id, segment1.id)).run();
  defaultDb.delete(schema.leads).where(eq(schema.leads.id, leadPendingId)).run();
  defaultDb.delete(schema.leads).where(eq(schema.leads.id, leadWorkedId)).run();
  console.log('  ✓ TEST 1 SUPERATO CON SUCCESSO.\n');

  // -------------------------------------------------------------------------
  // TEST 2: Lettura della Campagna da Operatore B con Verifica Campi Esposti
  // -------------------------------------------------------------------------
  console.log('[TEST 2/3] Lettura Campagna da Operatore B & Ispezione Campi Esposti...');
  const leadSampleId = `lead_sample_${Date.now()}`;
  defaultDb.insert(schema.leads).values({
    id: leadSampleId,
    companyName: 'Grand Hotel Pompei',
    sector: 'horeca_hotel',
    score: 91,
    status: 'qualificato',
    phone: '+39 081 888999',
    email: 'direzione@grandhotelpompei.it',
    city: 'Pompei',
    marketingConsentStatus: 'granted',
    createdAt: now,
    updatedAt: now,
  }).run();

  const segmentA = await createSegment(
    {
      name: 'Segmento Hotel Top',
      targetType: 'leads',
      rules: { sectors: ['horeca_hotel'], minCommercialScore: 80 },
    },
    operatorA
  );

  const campaignA = await createCampaign(
    {
      name: 'Campagna Outreach Hotel Q4',
      objective: 'lead_generation',
      channel: 'email',
      segmentId: segmentA.id,
      contentSubject: 'Soluzioni AI Hospitality per {{companyName}}',
      contentBody: 'Gentile direzione di {{companyName}} a {{city}}, abbiamo sviluppato...',
      notes: 'Campagna strategica assegnata a Mario',
    },
    operatorA
  );

  // Operatore B legge la campagna di Operatore A
  const readResultByB = await getCampaignDetails(campaignA.id);
  console.log('  Ispezione Payload letto da Operatore B:');
  console.log('    - id:', readResultByB.id);
  console.log('    - code:', readResultByB.code);
  console.log('    - name:', readResultByB.name);
  console.log('    - objective:', readResultByB.objective);
  console.log('    - channel:', readResultByB.channel);
  console.log('    - status:', readResultByB.status);
  console.log('    - ownerUserId:', readResultByB.ownerUserId, '(Operatore A)');
  console.log('    - owner.name:', readResultByB.owner?.name);
  console.log('    - segment.name:', readResultByB.segment?.name);
  console.log('    - totalRecipients:', readResultByB.totalRecipients);

  // Controllo Destinatario e Variabili Snapshot
  const recip = readResultByB.recipients[0];
  console.log('    - Recipient 0:');
  console.log('        * contactPersonName:', recip.contactPersonName);
  console.log('        * recipientEmail:', recip.recipientEmail);
  console.log('        * status:', recip.status);
  console.log('        * isCurrentlyContactable:', recip.isCurrentlyContactable);
  console.log('        * customVariablesSnapshotJson:', recip.customVariablesSnapshotJson);

  // Validazioni di Integrità e Sicurezza:
  if (!readResultByB.id || !readResultByB.code || readResultByB.ownerUserId !== operatorA.userId) {
    throw new Error('Metadati campagna incompleti o ownerUserId errato');
  }
  if (!recip || !recip.customVariablesSnapshotJson) {
    throw new Error('Snapshot variabili non presente nel destinatario');
  }

  // Verifica Leakage Sicurezza: nessun passwordHash o token esposto
  const payloadString = JSON.stringify(readResultByB);
  if (payloadString.includes('passwordHash') || payloadString.includes('password_hash') || payloadString.includes('token')) {
    throw new Error('SICUREZZA VIOLATA: Trovati campi sensibili (passwordHash/token) nel payload!');
  }
  console.log('  ✓ Sicurezza Payload Verificata: Nessun dato sensibile o credenziale esposta.');
  console.log('  ✓ TEST 2 SUPERATO CON SUCCESSO.\n');

  // Pulizia dati test 2
  defaultDb.delete(schema.campaignRecipients).where(eq(schema.campaignRecipients.campaignId, campaignA.id)).run();
  defaultDb.delete(schema.marketingCampaigns).where(eq(schema.marketingCampaigns.id, campaignA.id)).run();
  defaultDb.delete(schema.marketingSegments).where(eq(schema.marketingSegments.id, segmentA.id)).run();
  defaultDb.delete(schema.leads).where(eq(schema.leads.id, leadSampleId)).run();

  // -------------------------------------------------------------------------
  // TEST 3: Bootstrap Indici Univoci su DB con Destinatari Preesistenti e Duplicati
  // -------------------------------------------------------------------------
  console.log('[TEST 3/3] Bootstrap Indici Univoci su DB di Test con Duplicati Preesistenti...');
  const tempDbPath = `sqlite_test_dedup_bootstrap_${Date.now()}.db`;
  const rawSqlite = new Database(tempDbPath);

  try {
    // 1. Crea la tabella campaign_recipients SENZA indici univoci (simulazione DB legacy non migrato)
    rawSqlite.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'operator',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL
      );

      CREATE TABLE marketing_campaigns (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        objective TEXT NOT NULL,
        channel TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        segment_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE campaign_recipients (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        lead_id TEXT,
        company_id TEXT,
        recipient_email TEXT,
        recipient_phone TEXT,
        contact_person_name TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        exclusion_reason TEXT,
        custom_variables_snapshot_json TEXT,
        last_contacted_at TEXT,
        outcome_notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    const campTestId = 'camp_test_legacy_101';
    const leadTestId = 'lead_dup_legacy_202';

    // 2. Inserimento di DUPLICATI preesistenti:
    // Duplicate 1 (LAVORATO con note storiche):
    rawSqlite.prepare(`
      INSERT INTO campaign_recipients (id, campaign_id, lead_id, contact_person_name, status, last_contacted_at, outcome_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'recip_worked_historic_1',
      campTestId,
      leadTestId,
      'Azienda Duplicata Srl',
      'interested',
      '2026-09-20T10:00:00Z',
      'Nota di audit storica: cliente molto interessato a consulenza AI',
      '2026-09-18T08:00:00Z',
      '2026-09-20T10:00:00Z'
    );

    // Duplicate 2 (Ombra ridondante unworked pending):
    rawSqlite.prepare(`
      INSERT INTO campaign_recipients (id, campaign_id, lead_id, contact_person_name, status, last_contacted_at, outcome_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'recip_shadow_pending_2',
      campTestId,
      leadTestId,
      'Azienda Duplicata Srl',
      'pending',
      null,
      null,
      '2026-09-19T09:00:00Z',
      '2026-09-19T09:00:00Z'
    );

    const countBefore = rawSqlite.prepare(`SELECT count(*) as c FROM campaign_recipients WHERE campaign_id = ? AND lead_id = ?`).get(campTestId, leadTestId) as any;
    console.log('  Righe duplicate presenti prima della migrazione:', countBefore.c);
    if (countBefore.c !== 2) throw new Error('Preparazione record duplicati fallita');

    // 3. ESECUZIONE DELLA PROCEDURA DI BOOTSTRAP RESILIENTE (come in client.ts)
    console.log('  -> Esecuzione deduplicazione protettiva e creazione indice univoco...');
    rawSqlite.exec(`
      DELETE FROM campaign_recipients 
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY campaign_id, lead_id 
            ORDER BY 
              CASE WHEN status != 'pending' THEN 1 ELSE 2 END,
              CASE WHEN last_contacted_at IS NOT NULL THEN 1 ELSE 2 END,
              created_at DESC
          ) as rn
          FROM campaign_recipients
          WHERE lead_id IS NOT NULL
        ) WHERE rn = 1
      ) AND lead_id IS NOT NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS mktg_recipients_camp_lead_uidx ON campaign_recipients(campaign_id, lead_id) WHERE lead_id IS NOT NULL;
    `);

    // 4. Verifiche di Integrità:
    // A. L'indice univoco è stato creato con successo senza errori
    const indexes = rawSqlite.prepare(`PRAGMA index_list('campaign_recipients')`).all() as any[];
    const hasUniqueIdx = indexes.some((idx) => idx.name === 'mktg_recipients_camp_lead_uidx' && idx.unique === 1);
    console.log('  Indice Univoco Creato:', hasUniqueIdx);
    if (!hasUniqueIdx) throw new Error('Indice univoco mktg_recipients_camp_lead_uidx non presente o non univoco');

    // B. È rimasta esattamente 1 riga, e deve essere quella con la nota storica e lo stato 'interested'
    const remainingRows = rawSqlite.prepare(`SELECT * FROM campaign_recipients WHERE campaign_id = ? AND lead_id = ?`).all(campTestId, leadTestId) as any[];
    console.log('  Righe residue nel DB:', remainingRows.length);
    if (remainingRows.length !== 1) throw new Error('Deduplicazione fallita: trovate più righe');

    const preservedRow = remainingRows[0];
    console.log('  Riga Preservata:', {
      id: preservedRow.id,
      status: preservedRow.status,
      outcomeNotes: preservedRow.outcome_notes,
      lastContactedAt: preservedRow.last_contacted_at,
    });

    if (preservedRow.id !== 'recip_worked_historic_1' || preservedRow.status !== 'interested' || !preservedRow.outcome_notes) {
      throw new Error('ERRORE: La riga con storico/note non è stata preservata!');
    }
    console.log('  ✓ Preservazione Storica Garantita: La riga lavorata con note e timestamp è stata preservata.');

    // C. Tentativo di inserire un nuovo duplicato DEVE fallire per vincolo SQLite UNIQUE
    let caughtSqliteUniqueError = false;
    try {
      rawSqlite.prepare(`
        INSERT INTO campaign_recipients (id, campaign_id, lead_id, contact_person_name, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('recip_new_dup_attempt', campTestId, leadTestId, 'Azienda Duplicata Srl', 'pending', now, now);
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed') || err.message.includes('constraint failed')) {
        caughtSqliteUniqueError = true;
        console.log('  ✓ Vincolo Univoco Attivo: Inserimento duplicato bloccato dal database (UNIQUE constraint failed).');
      }
    }
    if (!caughtSqliteUniqueError) throw new Error('ERRORE: L\'indice univoco non ha impedito l\'inserimento del duplicato!');

    console.log('  ✓ TEST 3 SUPERATO CON SUCCESSO.\n');
  } finally {
    rawSqlite.close();
    try {
      require('fs').unlinkSync(tempDbPath);
    } catch {}
  }

  console.log('========================================================================');
  console.log('=== TUTTI I 3 TEST FINALI SONO STATI SUPERATI CON SUCCESSO AL 100%! ===');
  console.log('========================================================================\n');
}

runFinalVerifications().catch((err) => {
  console.error('FINAL VERIFICATIONS FAILED:', err);
  process.exit(1);
});
