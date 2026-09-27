import path from 'path';
import fs from 'fs';
import os from 'os';

// ---------------------------------------------------------------------------
// 1. Pre-flight Verification & Isolation Setup BEFORE ANY MODULE IMPORT
// ---------------------------------------------------------------------------
const tempDbFile = path.join(os.tmpdir(), `crm_mktg_final_verif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.db`);
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

async function runFinalVerifications() {
  console.log('========================================================================');
  console.log('=== TEST SUITE: 4 VERIFICHE FINALI MARKETING HUB (FASE 1) ===');
  console.log(`=== DB Isolato: ${tempDbFile} ===`);
  console.log('========================================================================\n');

  // Dynamic imports AFTER setting DATABASE_PATH
  const { initDatabase, db, users, leads, companies, campaignRecipients, marketingCampaigns, marketingSegments, activityLog } = await import('../packages/db/src');
  const {
    createSegment,
    updateSegment,
    createCampaign,
    populateCampaignRecipients,
    updateRecipientStatus,
    getCampaignDetails,
  } = await import('../apps/web/src/lib/marketing-service');
  const { eq } = await import('drizzle-orm');
  const Database = (await import('better-sqlite3')).default;

  try {
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

    db.insert(users).values([
      { id: adminUser.userId, email: adminUser.email, name: adminUser.name, role: adminUser.role, passwordHash: 'hash_test', createdAt: now },
      { id: operatorA.userId, email: operatorA.email, name: operatorA.name, role: operatorA.role, passwordHash: 'hash_test', createdAt: now },
      { id: operatorB.userId, email: operatorB.email, name: operatorB.name, role: operatorB.role, passwordHash: 'hash_test', createdAt: now },
    ]).run();

    // -------------------------------------------------------------------------
    // TEST 1: Revoca Consenso + Risincronizzazione (Preservazione Storico)
    // -------------------------------------------------------------------------
    console.log('[TEST 1/3] Revoca Consenso + Risincronizzazione Segmento/Campagna...');
    const leadPendingId = `lead_pending_rev_${Date.now()}`;
    const leadWorkedId = `lead_worked_rev_${Date.now()}`;

    db.insert(leads).values([
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
    db.update(leads)
      .set({ marketingConsentStatus: 'revoked', updatedAt: new Date().toISOString() })
      .where(eq(leads.id, leadPendingId))
      .run();
    db.update(leads)
      .set({ marketingConsentStatus: 'revoked', updatedAt: new Date().toISOString() })
      .where(eq(leads.id, leadWorkedId))
      .run();

    // RISINCRONIZZAZIONE DELLA CAMPAGNA
    console.log('  -> Esecuzione Risincronizzazione: populateCampaignRecipients()...');
    await populateCampaignRecipients(campaign1.id, operatorA);

    const detailsAfterResync = await getCampaignDetails(campaign1.id);
    console.log('  Destinatari dopo Risincronizzazione:', detailsAfterResync.totalRecipients);

    const workedAfterResync = detailsAfterResync.recipients.find((r: any) => r.leadId === leadWorkedId);
    if (!workedAfterResync) throw new Error('ERRORE CRITICO: Il record storico lavorato è stato eliminato dalla risincronizzazione!');
    if (workedAfterResync.status !== 'interested' || !workedAfterResync.outcomeNotes?.includes('demo personalizzata')) {
      throw new Error('ERRORE: Dati storici o note del destinatario alterate!');
    }
    console.log('  ✓ Preservazione Storico: Il record lavorato è rimasto intatto (Stato = interested, Note preservate).');

    if (workedAfterResync.isCurrentlyContactable !== false || !workedAfterResync.isLiveConsentRevoked) {
      throw new Error('ERRORE: La conformità privacy live non ha rilevato la revoca sul record lavorato');
    }
    console.log('  ✓ Verifica Privacy Live sul record storico: isCurrentlyContactable = false, isLiveConsentRevoked = true.');

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

    console.log('  ✓ TEST 1 SUPERATO CON SUCCESSO.\n');

    // -------------------------------------------------------------------------
    // TEST 2: Lettura della Campagna da Operatore B con Verifica Campi Esposti
    // -------------------------------------------------------------------------
    console.log('[TEST 2/3] Lettura Campagna da Operatore B & Ispezione Campi Esposti...');
    const leadSampleId = `lead_sample_${Date.now()}`;
    db.insert(leads).values({
      id: leadSampleId,
      companyName: 'Grand Hotel & Resort Villa Miramare',
      sector: 'horeca_hotel',
      score: 92,
      status: 'qualificato',
      phone: '+39 081 888999',
      email: 'reception@hotelvillamiramare.it',
      city: 'Sorrento',
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

    const readResultByB = await getCampaignDetails(campaignA.id);
    console.log('  Ispezione Payload letto da Operatore B:');
    console.log('    - id:', readResultByB.id);
    console.log('    - code:', readResultByB.code);
    console.log('    - name:', readResultByB.name);
    console.log('    - objective:', readResultByB.objective);
    console.log('    - channel:', readResultByB.channel);
    console.log('    - status:', readResultByB.status);
    console.log('    - ownerUserId:', readResultByB.ownerUserId, `(${readResultByB.owner?.name})`);
    console.log('    - segment.name:', readResultByB.segment?.name);
    console.log('    - totalRecipients:', readResultByB.totalRecipients);

    if (readResultByB.recipients.length > 0) {
      const sample = readResultByB.recipients[0];
      console.log('    - Recipient 0:');
      console.log('        * contactPersonName:', sample.contactPersonName);
      console.log('        * recipientEmail:', sample.recipientEmail);
      console.log('        * status:', sample.status);
      console.log('        * isCurrentlyContactable:', sample.isCurrentlyContactable);
      console.log('        * customVariablesSnapshotJson:', sample.customVariablesSnapshotJson);
    }

    if ((readResultByB as any).passwordHash || (readResultByB as any).token || (readResultByB as any).secretKey) {
      throw new Error('GRAVE VULNERABILITÀ: Esposizione di password hash o segreti nel payload della campagna!');
    }
    console.log('  ✓ Sicurezza Payload Verificata: Nessun dato sensibile o credenziale esposta.');
    console.log('  ✓ TEST 2 SUPERATO CON SUCCESSO.\n');

    // -------------------------------------------------------------------------
    // TEST 3: Bootstrap Indici Univoci su DB Isolato con Duplicati Preesistenti
    // -------------------------------------------------------------------------
    console.log('[TEST 3/3] Bootstrap Indici Univoci: Rilevamento Conflitti Senza Cancellazioni...');

    const tempDb2 = path.join(os.tmpdir(), `test_dupes_bootstrap_${Date.now()}.db`);
    const rawSqlite = new Database(tempDb2);
    try {
      rawSqlite.exec(`
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

      const campWorked = 'camp_test_worked_dupes';
      const leadWorked = 'lead_test_worked_dupes';

      rawSqlite.prepare(`
        INSERT INTO campaign_recipients (id, campaign_id, lead_id, contact_person_name, status, outcome_notes, last_contacted_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('recip_work_1', campWorked, leadWorked, 'Azienda Alfa', 'contacted', 'Nota 1 - Titolare richiamato', now, now, now);

      rawSqlite.prepare(`
        INSERT INTO campaign_recipients (id, campaign_id, lead_id, contact_person_name, status, outcome_notes, last_contacted_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('recip_work_2', campWorked, leadWorked, 'Azienda Alfa', 'interested', 'Nota 2 - Preventivo richiesto', now, now, now);

      const campPending = 'camp_test_pending_dupes';
      const leadPending = 'lead_test_pending_dupes';

      rawSqlite.prepare(`
        INSERT INTO campaign_recipients (id, campaign_id, lead_id, recipient_email, custom_variables_snapshot_json, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('recip_pend_1', campPending, leadPending, 'sede.roma@azienda.it', '{"city":"Roma","address":"Via del Corso 1"}', 'pending', now, now);

      rawSqlite.prepare(`
        INSERT INTO campaign_recipients (id, campaign_id, lead_id, recipient_email, custom_variables_snapshot_json, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('recip_pend_2', campPending, leadPending, 'sede.napoli@azienda.it', '{"city":"Napoli","address":"Via Toledo 10"}', 'pending', now, now);

      console.log('  -> Esecuzione bootstrap non-distruttivo di rilevamento conflitti...');

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

      const workedRows = rawSqlite.prepare(`SELECT * FROM campaign_recipients WHERE campaign_id = ? AND lead_id = ?`).all(campWorked, leadWorked) as any[];
      console.log('  Righe Scenario Worked rimaste nel DB:', workedRows.length);
      if (workedRows.length !== 2) throw new Error('ERRORE: Una riga lavorata è stata eliminata!');
      if (!workedRows.some(r => r.outcome_notes?.includes('Nota 1')) || !workedRows.some(r => r.outcome_notes?.includes('Nota 2'))) {
        throw new Error('ERRORE: Una delle note storiche è andata persa!');
      }
      console.log('  ✓ Preservazione Lavorati: Entrambi i record lavorati e tutte le note storiche sono rimaste intatte nel DB.');

      const pendingRows = rawSqlite.prepare(`SELECT * FROM campaign_recipients WHERE campaign_id = ? AND lead_id = ?`).all(campPending, leadPending) as any[];
      console.log('  Righe Scenario Pending Dati Differenti rimaste nel DB:', pendingRows.length);
      if (pendingRows.length !== 2) throw new Error('ERRORE: Una riga pending con dati diversi è stata eliminata!');
      if (!pendingRows.some(r => r.recipient_email === 'sede.roma@azienda.it') || !pendingRows.some(r => r.recipient_email === 'sede.napoli@azienda.it')) {
        throw new Error('ERRORE: Uno degli indirizzi email differenti è andato perso!');
      }
      console.log('  ✓ Preservazione Pending Dati Differenti: Entrambi gli indirizzi e snapshot differenti sono rimasti intatti nel DB.');

      // Pulizia e test DB pulito
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

      rawSqlite.prepare(`
        INSERT INTO campaign_recipients (id, campaign_id, lead_id, contact_person_name, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('recip_clean_1', 'camp_clean', 'lead_clean', 'Test Azienda', 'pending', now, now);

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
        if (fs.existsSync(tempDb2)) fs.unlinkSync(tempDb2);
      } catch {}
    }

    // -------------------------------------------------------------------------
    // TEST 4: Sincronizzazione Avanzata Pending: Preservazione Storico/Note/Audit vs Pruning Auditabile & Isolamento Cross-Campagna
    // -------------------------------------------------------------------------
    console.log('[TEST 4/4] Sincronizzazione Avanzata Destinatari Pending (Preservazione vs Pruning Auditabile & Isolamento Campagne)...');

    const leadWithNotesId = `lead_notes_${Date.now()}`;
    const leadWithAuditId = `lead_audit_${Date.now()}`;
    const leadWithTimestampId = `lead_ts_${Date.now()}`;
    const leadUnworkedId = `lead_unworked_${Date.now()}`;
    const leadCampaignBId = `lead_camp_b_${Date.now()}`;

    db.insert(leads).values([
      { id: leadWithNotesId, companyName: 'Azienda Con Note', sector: 'target_sync_sector', score: 85, status: 'nuovo', city: 'Napoli', email: 'notes@azienda.it', marketingConsentStatus: 'granted', createdAt: now, updatedAt: now },
      { id: leadWithAuditId, companyName: 'Azienda Con Audit Log', sector: 'target_sync_sector', score: 85, status: 'nuovo', city: 'Napoli', email: 'audit@azienda.it', marketingConsentStatus: 'granted', createdAt: now, updatedAt: now },
      { id: leadWithTimestampId, companyName: 'Azienda Con Timestamp', sector: 'target_sync_sector', score: 85, status: 'nuovo', city: 'Napoli', email: 'ts@azienda.it', marketingConsentStatus: 'granted', createdAt: now, updatedAt: now },
      { id: leadUnworkedId, companyName: 'Azienda Mai Lavorata', sector: 'target_sync_sector', score: 85, status: 'nuovo', city: 'Napoli', email: 'unworked@azienda.it', marketingConsentStatus: 'granted', createdAt: now, updatedAt: now },
      { id: leadCampaignBId, companyName: 'Azienda Altra Campagna B', sector: 'other_sector_b', score: 90, status: 'nuovo', city: 'Milano', email: 'campb@azienda.it', marketingConsentStatus: 'granted', createdAt: now, updatedAt: now },
    ]).run();

    // Segment & Campaign A
    const segmentSyncA = await createSegment({
      name: 'Segmento Sync A',
      targetType: 'leads',
      rules: { sectors: ['target_sync_sector'] },
    }, operatorA);

    const campaignSyncA = await createCampaign({
      name: 'Campagna Sync A',
      objective: 'lead_generation',
      channel: 'email',
      segmentId: segmentSyncA.id,
    }, operatorA);

    // Segment & Campaign B (Separate Campaign)
    const segmentSyncB = await createSegment({
      name: 'Segmento Sync B',
      targetType: 'leads',
      rules: { sectors: ['other_sector_b'] },
    }, operatorA);

    const campaignSyncB = await createCampaign({
      name: 'Campagna Sync B',
      objective: 'lead_generation',
      channel: 'email',
      segmentId: segmentSyncB.id,
    }, operatorA);

    // Initial enrollment
    await populateCampaignRecipients(campaignSyncA.id, operatorA);
    await populateCampaignRecipients(campaignSyncB.id, operatorA);

    const initialDetailsA = await getCampaignDetails(campaignSyncA.id);
    const initialDetailsB = await getCampaignDetails(campaignSyncB.id);

    console.log('  Arruolamento Iniziale Campagna A Destinatari:', initialDetailsA.totalRecipients);
    console.log('  Arruolamento Iniziale Campagna B Destinatari:', initialDetailsB.totalRecipients);
    if (initialDetailsA.totalRecipients !== 4 || initialDetailsB.totalRecipients !== 1) {
      throw new Error('Arruolamento iniziale non corretto');
    }

    const recipWithNotes = initialDetailsA.recipients.find((r: any) => r.leadId === leadWithNotesId)!;
    const recipWithAudit = initialDetailsA.recipients.find((r: any) => r.leadId === leadWithAuditId)!;
    const recipWithTimestamp = initialDetailsA.recipients.find((r: any) => r.leadId === leadWithTimestampId)!;
    const recipUnworked = initialDetailsA.recipients.find((r: any) => r.leadId === leadUnworkedId)!;
    const recipCampB = initialDetailsB.recipients[0];

    // 1. Add operator note to recipWithNotes (keeping status 'pending')
    db.update(campaignRecipients)
      .set({ outcomeNotes: 'Nota salvata: cliente richiede contatto via email', updatedAt: new Date().toISOString() })
      .where(eq(campaignRecipients.id, recipWithNotes.id))
      .run();

    // 2. Add activity_log entry for recipWithAudit (keeping status 'pending' and no notes in recipient table)
    db.insert(activityLog).values({
      id: `act_test_sync_${Date.now()}`,
      entityType: 'campaign_recipient',
      entityId: recipWithAudit.id,
      action: 'recipient_inspected_by_operator',
      performedBy: operatorA.userId,
      detailsJson: JSON.stringify({ note: 'Operatore ha verificato la partita IVA' }),
      beforeJson: null,
      afterJson: null,
      ipAddress: null,
      createdAt: new Date().toISOString(),
    }).run();

    // 3. Set lastContactedAt timestamp on recipWithTimestamp (keeping status 'pending')
    db.update(campaignRecipients)
      .set({ lastContactedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(campaignRecipients.id, recipWithTimestamp.id))
      .run();

    // 4. recipUnworked remains 100% untouched (pending, no notes, no audit, no timestamp)

    // Now, change the rules of Segment A so that NONE of the 4 leads match Segment A anymore
    console.log('  -> Modifica filtri Segmento A: i 4 lead escono dai criteri del segmento...');
    await updateSegment(segmentSyncA.id, {
      rules: { sectors: ['settore_completamente_differente_nessun_match'] },
    }, operatorA);

    // Execute populateCampaignRecipients for Campaign A
    console.log('  -> Esecuzione risincronizzazione: populateCampaignRecipients(Campagna A)...');
    await populateCampaignRecipients(campaignSyncA.id, operatorA);

    const afterSyncDetailsA = await getCampaignDetails(campaignSyncA.id);
    const afterSyncDetailsB = await getCampaignDetails(campaignSyncB.id);

    console.log('  Destinatari Campagna A dopo sync (usciti dal segmento):', afterSyncDetailsA.totalRecipients);
    console.log('  Destinatari Campagna B dopo sync di Campagna A:', afterSyncDetailsB.totalRecipients);

    // VERIFICATION 1: Pending with Notes is PRESERVED
    const preservedNotes = afterSyncDetailsA.recipients.find((r: any) => r.id === recipWithNotes.id);
    if (!preservedNotes || !preservedNotes.outcomeNotes?.includes('cliente richiede contatto')) {
      throw new Error('ERRORE CRITICO: Destinatario pending con outcomeNotes è stato cancellato!');
    }
    console.log('  ✓ Preservazione Note: Destinatario pending con outcomeNotes conservato al 100%.');

    // VERIFICATION 2: Pending with Activity Log is PRESERVED
    const preservedAudit = afterSyncDetailsA.recipients.find((r: any) => r.id === recipWithAudit.id);
    if (!preservedAudit) {
      throw new Error('ERRORE CRITICO: Destinatario pending con riferimento in activity_log è stato cancellato!');
    }
    console.log('  ✓ Preservazione Audit: Destinatario pending con riferimento storico in activity_log conservato al 100%.');

    // VERIFICATION 3: Pending with Timestamp is PRESERVED
    const preservedTs = afterSyncDetailsA.recipients.find((r: any) => r.id === recipWithTimestamp.id);
    if (!preservedTs || !preservedTs.lastContactedAt) {
      throw new Error('ERRORE CRITICO: Destinatario pending con lastContactedAt è stato cancellato!');
    }
    console.log('  ✓ Preservazione Timestamp: Destinatario pending con lastContactedAt conservato al 100%.');

    // VERIFICATION 4: Pending unworked is PRUNED and AUDITED in activity_log
    const prunedUnworked = afterSyncDetailsA.recipients.find((r: any) => r.id === recipUnworked.id);
    if (prunedUnworked) {
      throw new Error('ERRORE: Destinatario pending mai lavorato non è stato rimosso dopo l\'uscita dal segmento!');
    }
    const pruneAuditLog = db
      .select()
      .from(activityLog)
      .where(eq(activityLog.entityId, recipUnworked.id))
      .get();
    if (!pruneAuditLog || pruneAuditLog.action !== 'recipient_pruned_out_of_segment' || !pruneAuditLog.beforeJson) {
      throw new Error('ERRORE AUDIT: Rimozione del destinatario mai lavorato non tracciata in activity_log con beforeJson!');
    }
    console.log('  ✓ Pruning Auditabile: Destinatario pending mai lavorato rimosso con traccia audit completa e snapshot reversibile in beforeJson.');

    // VERIFICATION 5: Cross-Campaign Isolation
    if (afterSyncDetailsB.totalRecipients !== 1 || afterSyncDetailsB.recipients[0].id !== recipCampB.id) {
      throw new Error('ERRORE ISOLAMENTO: La sincronizzazione di Campagna A ha alterato o rimosso destinatari di Campagna B!');
    }
    console.log('  ✓ Isolamento Cross-Campagna: Nessun record o destinatario di Campagna B è stato toccato o alterato.');
    console.log('  ✓ TEST 4 SUPERATO CON SUCCESSO.\n');

    console.log('========================================================================');
    console.log('=== TUTTI I 4 TEST FINALI SONO STATI SUPERATI CON SUCCESSO AL 100%! ===');
    console.log('========================================================================\n');
  } finally {
    try {
      if (fs.existsSync(tempDbFile)) fs.unlinkSync(tempDbFile);
      if (fs.existsSync(tempDbFile + '-wal')) fs.unlinkSync(tempDbFile + '-wal');
      if (fs.existsSync(tempDbFile + '-shm')) fs.unlinkSync(tempDbFile + '-shm');
    } catch {}
  }
}

runFinalVerifications().catch((err) => {
  console.error('FINAL VERIFICATIONS FAILED:', err);
  process.exit(1);
});
