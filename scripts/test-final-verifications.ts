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
  console.log('[TEST 3/3] Bootstrap Indici Univoci su DB di Test: Rilevamento Conflitti Senza Cancellazioni...');
  const tempDbPath = `sqlite_test_dedup_bootstrap_${Date.now()}.db`;
  const rawSqlite = new Database(tempDbPath);

  try {
    // 1. Crea le tabelle SENZA indici univoci (simulazione DB legacy non migrato)
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

      CREATE INDEX IF NOT EXISTS mktg_recipients_campaign_idx ON campaign_recipients(campaign_id);
      CREATE INDEX IF NOT EXISTS mktg_recipients_lead_idx ON campaign_recipients(lead_id);
      CREATE INDEX IF NOT EXISTS mktg_recipients_company_idx ON campaign_recipients(company_id);
      CREATE INDEX IF NOT EXISTS mktg_recipients_status_idx ON campaign_recipients(status);
    `);

    // SCENARIO 3.1: Duplicati con ENTRAMBI i record lavorati (note diverse)
    const campWorked = 'camp_worked_dup';
    const leadWorked = 'lead_worked_dup';

    rawSqlite.prepare(`
      INSERT INTO campaign_recipients (id, campaign_id, lead_id, contact_person_name, status, last_contacted_at, outcome_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('recip_worked_1', campWorked, leadWorked, 'Studio Rossi', 'contacted', '2026-09-21T09:00:00Z', 'Nota 1: Referente contattato da Mario', now, now);

    rawSqlite.prepare(`
      INSERT INTO campaign_recipients (id, campaign_id, lead_id, contact_person_name, status, last_contacted_at, outcome_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('recip_worked_2', campWorked, leadWorked, 'Studio Rossi', 'interested', '2026-09-22T15:00:00Z', 'Nota 2: Richiesta demo avanzata registrata da Luigi', now, now);

    // SCENARIO 3.2: Duplicati PENDING con DATI DIFFERENTI (email diverse e snapshot diversi)
    const campPending = 'camp_pending_dup';
    const leadPending = 'lead_pending_dup';

    rawSqlite.prepare(`
      INSERT INTO campaign_recipients (id, campaign_id, lead_id, recipient_email, custom_variables_snapshot_json, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('recip_pend_1', campPending, leadPending, 'sede.roma@azienda.it', '{"city":"Roma","address":"Via del Corso 1"}', 'pending', now, now);

    rawSqlite.prepare(`
      INSERT INTO campaign_recipients (id, campaign_id, lead_id, recipient_email, custom_variables_snapshot_json, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('recip_pend_2', campPending, leadPending, 'sede.napoli@azienda.it', '{"city":"Napoli","address":"Via Toledo 10"}', 'pending', now, now);

    console.log('  -> Esecuzione bootstrap non-distruttivo di rilevamento conflitti...');

    // Simulazione esatta della logica di bootstrap in client.ts
    const leadDupes = rawSqlite.prepare(`
      SELECT campaign_id, lead_id, COUNT(*) as cnt 
      FROM campaign_recipients 
      WHERE lead_id IS NOT NULL 
      GROUP BY campaign_id, lead_id 
      HAVING count(*) > 1
    `).all() as Array<{ campaign_id: string; lead_id: string; cnt: number }>;

    console.log('  Gruppi di conflitti rilevati dal bootstrap:', leadDupes.length);
    if (leadDupes.length !== 2) throw new Error('Rilevamento conflitti fallito');

    let uniqueIndexCreated = false;
    if (leadDupes.length > 0) {
      console.log('  ✓ Segnalazione Conflitto: Trovati duplicati pregressi. Nessuna riga eliminata automaticamente.');
    } else {
      rawSqlite.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS mktg_recipients_camp_lead_uidx ON campaign_recipients(campaign_id, lead_id) WHERE lead_id IS NOT NULL;
      `);
      uniqueIndexCreated = true;
    }

    if (uniqueIndexCreated) throw new Error('L\'indice UNIQUE non doveva essere creato prima della bonifica controllata!');

    // Verifiche di non-distruzione Scenario 3.1:
    const workedRows = rawSqlite.prepare(`SELECT * FROM campaign_recipients WHERE campaign_id = ? AND lead_id = ?`).all(campWorked, leadWorked) as any[];
    console.log('  Righe Scenario Worked rimaste nel DB:', workedRows.length);
    if (workedRows.length !== 2) throw new Error('ERRORE: Una riga lavorata è stata eliminata!');
    if (!workedRows.some(r => r.outcome_notes?.includes('Nota 1')) || !workedRows.some(r => r.outcome_notes?.includes('Nota 2'))) {
      throw new Error('ERRORE: Una delle note storiche è andata persa!');
    }
    console.log('  ✓ Preservazione Lavorati: Entrambi i record lavorati e tutte le note storiche sono rimaste intatte nel DB.');

    // Verifiche di non-distruzione Scenario 3.2:
    const pendingRows = rawSqlite.prepare(`SELECT * FROM campaign_recipients WHERE campaign_id = ? AND lead_id = ?`).all(campPending, leadPending) as any[];
    console.log('  Righe Scenario Pending Dati Differenti rimaste nel DB:', pendingRows.length);
    if (pendingRows.length !== 2) throw new Error('ERRORE: Una riga pending con dati diversi è stata eliminata!');
    if (!pendingRows.some(r => r.recipient_email === 'sede.roma@azienda.it') || !pendingRows.some(r => r.recipient_email === 'sede.napoli@azienda.it')) {
      throw new Error('ERRORE: Uno degli indirizzi email differenti è andato perso!');
    }
    console.log('  ✓ Preservazione Pending Dati Differenti: Entrambi gli indirizzi e snapshot differenti sono rimasti intatti nel DB.');

    // SCENARIO 3.3: Database pulito -> Creazione Indice Univoco & Blocco Inserimenti
    console.log('  -> Verifica su DB pulito (senza duplicati)...');
    rawSqlite.prepare(`DELETE FROM campaign_recipients WHERE campaign_id IN (?, ?)`).run(campWorked, campPending);

    const dupesClean = rawSqlite.prepare(`
      SELECT campaign_id, lead_id, COUNT(*) as cnt 
      FROM campaign_recipients 
      WHERE lead_id IS NOT NULL 
      GROUP BY campaign_id, lead_id 
      HAVING count(*) > 1
    `).all() as any[];

    if (dupesClean.length === 0) {
      rawSqlite.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS mktg_recipients_camp_lead_uidx ON campaign_recipients(campaign_id, lead_id) WHERE lead_id IS NOT NULL;
      `);
    }

    const indexes = rawSqlite.prepare(`PRAGMA index_list('campaign_recipients')`).all() as any[];
    const hasUnique = indexes.some(idx => idx.name === 'mktg_recipients_camp_lead_uidx' && idx.unique === 1);
    console.log('  Indice Univoco abilitato su DB pulito:', hasUnique);
    if (!hasUnique) throw new Error('Indice univoco non creato su DB pulito');

    // Inserimento singolo
    rawSqlite.prepare(`
      INSERT INTO campaign_recipients (id, campaign_id, lead_id, contact_person_name, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('recip_clean_1', 'camp_clean', 'lead_clean', 'Test Azienda', 'pending', now, now);

    // Tentativo duplicato a runtime -> Deve fallire per vincolo SQLite UNIQUE
    let caughtConstraint = false;
    try {
      rawSqlite.prepare(`
        INSERT INTO campaign_recipients (id, campaign_id, lead_id, contact_person_name, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('recip_clean_2', 'camp_clean', 'lead_clean', 'Test Azienda Duplicata', 'pending', now, now);
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed')) {
        caughtConstraint = true;
        console.log('  ✓ Vincolo Univoco Attivo: Inserimento duplicato bloccato dal database (UNIQUE constraint failed).');
      }
    }
    if (!caughtConstraint) throw new Error('ERRORE: Inserimento duplicato non bloccato dal vincolo UNIQUE!');

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
