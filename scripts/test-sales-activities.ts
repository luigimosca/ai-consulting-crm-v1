import path from 'path';
import fs from 'fs';
import os from 'os';

// ---------------------------------------------------------------------------
// 1. Pre-flight Verification & Isolation Setup BEFORE ANY MODULE IMPORT
// ---------------------------------------------------------------------------
const tempDbFile = path.join(
  os.tmpdir(),
  `crm_sales_activities_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.db`
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

async function runSalesActivitiesTests() {
  console.log('========================================================================');
  console.log('=== TEST SUITE: SALES ACTIVITIES & CALENDAR HUB - ISOLATED RUN ===');
  console.log(`=== DB Isolato: ${tempDbFile} ===`);
  console.log('========================================================================\n');

  const {
    initDatabase,
    db,
    users,
    leads,
    companies,
    crmCalls,
    crmAppointments,
    crmCallbacks,
    activityLog,
  } = await import('../packages/db/src');

  const {
    logCall,
    listCalls,
    getCallById,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    listAppointments,
    getAppointmentById,
    generateIcsForAppointment,
    createCallback,
    updateCallback,
    deleteCallback,
    listCallbacks,
    getCalendarEvents,
    getTodayAgenda,
  } = await import('../apps/web/src/lib/activities-service');

  initDatabase();

  // Seed test operator user
  const testUser = {
    userId: 'usr_test_operator_1',
    email: 'mario.rossi@ai-agency.it',
    name: 'Mario Rossi',
    role: 'operator' as const,
    status: 'active' as const,
  };

  db.insert(users)
    .values({
      id: testUser.userId,
      name: testUser.name,
      email: testUser.email,
      passwordHash: 'dummyhash',
      role: testUser.role,
      status: testUser.status,
      createdAt: new Date().toISOString(),
    })
    .run();

  // Seed test lead and company
  const testLeadId = 'lead_test_100';
  db.insert(leads)
    .values({
      id: testLeadId,
      companyName: 'Ristorante Il Vesuvio',
      website: 'https://ilvesuvio.it',
      phone: '+39 081 1234567',
      email: 'info@ilvesuvio.it',
      status: 'in_contatto',
      sector: 'horeca_ristoranti',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .run();

  const testCompanyId = 'comp_test_200';
  db.insert(companies)
    .values({
      id: testCompanyId,
      name: 'Studio Legale Bianchi & Partners',
      sector: 'studi_legali',
      phone: '+39 02 9876543',
      email: 'segreteria@studiobianchi.it',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .run();

  let passedTests = 0;

  // --------------------------------------------------------------------------
  // TEST 1: Log Chiamata con Richiamata contestuale
  // --------------------------------------------------------------------------
  console.log('[TEST 1] Registrazione Chiamata Outbound con Follow-up Richiamata...');
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const logResult = await logCall(
    {
      leadId: testLeadId,
      direction: 'outbound',
      phoneNumber: '+39 081 1234567',
      callOutcome: 'callback_requested',
      durationSeconds: 145,
      notes: 'Titolare occupato per servizio pranzo, ha chiesto di essere richiamato domani.',
      scheduleCallback: {
        scheduledAt: tomorrow,
        reason: 'Richiamare per fissare demo CRM',
        priority: 'high',
      },
    },
    testUser
  );

  if (!logResult.call.id || !logResult.callback?.id) {
    throw new Error('Test 1 Fallito: Chiamata o richiamata non generate correttamente.');
  }
  if (logResult.call.callOutcome !== 'callback_requested') {
    throw new Error('Test 1 Fallito: Esito chiamata errato.');
  }
  console.log(`✓ Chiamata registrata: ${logResult.call.id}, Callback generata: ${logResult.callback.id}`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 2: Verifica Elenco Chiamate e Dettaglio
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Verifica Elenco Chiamate per Lead...');
  const calls = await listCalls({ leadId: testLeadId });
  if (calls.length !== 1 || calls[0].leadCompanyName !== 'Ristorante Il Vesuvio') {
    throw new Error('Test 2 Fallito: Join lead o chiamata non trovata.');
  }
  const callDetail = await getCallById(logResult.call.id);
  if (!callDetail || callDetail.caller.email !== testUser.email) {
    throw new Error('Test 2 Fallito: Chiamata dettaglio non recuperata.');
  }
  console.log(`✓ Chiamata recuperata correttamente con caller info: ${callDetail.caller.name}`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 3: Creazione e Gestione Appuntamenti (Meeting/Demo)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] Creazione Appuntamento Video Call e Generazione .ics...');
  const apptStart = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const apptEnd = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

  const appointment = await createAppointment(
    {
      leadId: testLeadId,
      title: 'Demo Strategica AI & CRM',
      description: 'Presentazione del sistema di intelligenza artificiale per gestione tavoli e recensioni.',
      appointmentType: 'demo_presentation',
      scheduledStartTime: apptStart,
      scheduledEndTime: apptEnd,
      locationType: 'video_call',
      meetingUrl: 'https://meet.google.com/xyz-abcd-qwe',
      attendees: [
        { name: 'Mario Rossi', email: 'mario.rossi@ai-agency.it', role: 'Consulente' },
        { name: 'Gennaro Esposito', email: 'info@ilvesuvio.it', role: 'Titolare Ristorante' },
      ],
    },
    testUser
  );

  if (appointment.status !== 'scheduled' || !appointment.id) {
    throw new Error('Test 3 Fallito: Creazione appuntamento non riuscita.');
  }

  // Genera file iCalendar (.ics)
  const ics = await generateIcsForAppointment(appointment.id);
  if (!ics || !ics.includes('BEGIN:VCALENDAR') || !ics.includes('https://meet.google.com/xyz-abcd-qwe')) {
    throw new Error('Test 3 Fallito: Generazione .ics RFC 5545 non conforme.');
  }
  console.log(`✓ Appuntamento creato: ${appointment.id}`);
  console.log(`✓ File .ics generato correttamente (lunghezza: ${ics.length} bytes, contiene meeting URL).`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 4: Aggiornamento Stato Appuntamento ed Esito
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] Aggiornamento Appuntamento a "completed" con note esito...');
  const updatedAppt = await updateAppointment(
    appointment.id,
    {
      status: 'completed',
      outcomeNotes: 'Cliente molto soddisfatto, inviare preventivo entro venerdì.',
    },
    testUser
  );

  if (updatedAppt?.status !== 'completed' || !updatedAppt?.outcomeNotes) {
    throw new Error('Test 4 Fallito: Aggiornamento appuntamento non riuscito.');
  }
  console.log(`✓ Appuntamento aggiornato con esito.`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 5: Gestione Richiamate (Scadute vs Future) e Completamento
  // --------------------------------------------------------------------------
  console.log('\n[TEST 5] Gestione Richiamate: rilevamento Scaduta (Overdue) e Completamento...');
  // Crea una richiamata nel passato (es. 2 ore fa)
  const pastTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const overdueCb = await createCallback(
    {
      companyId: testCompanyId,
      scheduledAt: pastTime,
      reason: 'Follow-up proposta preventivo',
      priority: 'urgent',
    },
    testUser
  );

  const cbs = await listCallbacks({ companyId: testCompanyId });
  const foundOverdue = cbs.find((c) => c.id === overdueCb.id);
  if (!foundOverdue || foundOverdue.status !== 'overdue' || !foundOverdue.isOverdue) {
    throw new Error('Test 5 Fallito: Richiamata scaduta non marcata come overdue.');
  }
  console.log(`✓ Richiamata nel passato rilevata automaticamente come 'overdue': ${foundOverdue.id}`);

  // Completa la richiamata
  const completedCb = await updateCallback(
    overdueCb.id,
    {
      status: 'completed',
      completedNotes: 'Chiamato avvocato Bianchi, confermato appuntamento di revisione.',
    },
    testUser
  );
  if (completedCb?.status !== 'completed' || !completedCb?.completedAt) {
    throw new Error('Test 5 Fallito: Completamento richiamata non riuscito.');
  }
  console.log(`✓ Richiamata marcata come completata con timestamp: ${completedCb.completedAt}`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 6: Vista Calendario Unificata (getCalendarEvents)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 6] Test Aggregatore Calendario (Appuntamenti + Richiamate)...');
  const now = new Date();
  const calStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const calEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

  const events = await getCalendarEvents({
    startDate: calStart,
    endDate: calEnd,
    userId: testUser.userId,
  });

  if (events.length < 2) {
    throw new Error(`Test 6 Fallito: Eventi calendario insufficienti (${events.length}).`);
  }
  const apptEvent = events.find((e) => e.eventType === 'appointment');
  const cbEvent = events.find((e) => e.eventType === 'callback');

  if (!apptEvent || !cbEvent) {
    throw new Error('Test 6 Fallito: Mancano eventi di tipo appointment o callback.');
  }
  console.log(`✓ Vista calendario generata con successo (${events.length} eventi nel range temporale).`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 7: Dashboard "La mia Giornata: Chiamate & Appuntamenti di Oggi"
  // --------------------------------------------------------------------------
  console.log('\n[TEST 7] Test Agenda Giornaliera Operatore (getTodayAgenda)...');
  const todayAgenda = await getTodayAgenda(testUser.userId);
  if (!todayAgenda.counts) {
    throw new Error('Test 7 Fallito: Conteggi agenda giornaliera assenti.');
  }
  console.log('✓ Conteggi Agenda Oggi:', todayAgenda.counts);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 8: Verifica Audit Log (Attività Tracciate)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 8] Verifica Audit Log...');
  const logs = db.select().from(activityLog).all();
  if (logs.length < 4) {
    throw new Error(`Test 8 Fallito: Log di audit insufficienti (${logs.length}).`);
  }
  console.log(`✓ Audit log registrato con successo: ${logs.length} azioni tracciate.`);
  passedTests++;

  // Cleanup database temporaneo
  try {
    if (fs.existsSync(tempDbFile)) {
      fs.unlinkSync(tempDbFile);
      // Rimuovi eventuali -wal e -shm
      if (fs.existsSync(`${tempDbFile}-wal`)) fs.unlinkSync(`${tempDbFile}-wal`);
      if (fs.existsSync(`${tempDbFile}-shm`)) fs.unlinkSync(`${tempDbFile}-shm`);
      console.log(`\n✓ Database temporaneo isolato eliminato con successo.`);
    }
  } catch (err) {
    console.warn('Avviso pulizia db temporaneo:', err);
  }

  console.log('\n========================================================================');
  console.log(`=== TUTTI I ${passedTests} TEST DI SALES ACTIVITIES & CALENDAR COMPLETATI CON SUCCESSO! ===`);
  console.log('========================================================================\n');
}

runSalesActivitiesTests().catch((err) => {
  console.error('\n❌ ERRORE TEST:', err);
  process.exit(1);
});
