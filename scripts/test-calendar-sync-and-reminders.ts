import path from 'path';
import fs from 'fs';
import os from 'os';

// ---------------------------------------------------------------------------
// 1. Pre-flight Verification & Isolation Setup BEFORE ANY MODULE IMPORT
// ---------------------------------------------------------------------------
const tempDbFile = path.join(
  os.tmpdir(),
  `crm_calendar_sync_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.db`
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

async function runCalendarSyncAndRemindersTests() {
  console.log('========================================================================');
  console.log('=== TEST SUITE: CALENDAR SYNC & QUICK REMINDERS - ISOLATED RUN ===');
  console.log(`=== DB Isolato: ${tempDbFile} ===`);
  console.log('========================================================================\n');

  const {
    initDatabase,
    db,
    users,
    crmReminders,
    crmAppointments,
    crmCallbacks,
    tasks,
    projects,
  } = await import('../packages/db/src');

  const {
    createReminder,
    updateReminder,
    deleteReminder,
    listReminders,
    getOrCreateCalendarSyncToken,
    regenerateCalendarSyncToken,
    generateUserIcsCalendarFeed,
    getTodayAgenda,
    createAppointment,
    createCallback,
  } = await import('../apps/web/src/lib/activities-service');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (!condition) {
      console.error(`❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    } else {
      console.log(`✅ [PASS] ${message}`);
      passedTests++;
    }
  }

  try {
    // Step 0: Init database schema
    initDatabase();
    console.log('[Setup] Database isolato inizializzato con successo.');

    // Create a mock user
    const testUser = {
      id: 'usr_test_calendar_sync',
      name: 'Mario Rossi',
      email: 'mario.rossi@example.com',
      passwordHash: 'dummy_hash',
      role: 'admin',
      calendarSyncToken: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.insert(users).values(testUser).run();

    const userSession = {
      userId: testUser.id,
      name: testUser.name,
      email: testUser.email,
      role: testUser.role,
    };

    // -------------------------------------------------------------------------
    // Test 1: Quick Reminders CRUD ("Cose da ricordare non legate a progetti")
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Testing Standalone Reminders CRUD ---');
    const rem1 = await createReminder(
      {
        title: 'Verificare rinnovo PEC aziendale',
        description: 'Scadenza tra 3 giorni, verificare ricezione fattura',
        dueDateTime: new Date(Date.now() + 86400000).toISOString(),
        priority: 'urgent',
        category: 'administrative',
      },
      userSession
    );

    assert(!!rem1.id && rem1.id.startsWith('rem_'), 'Reminder 1 created with generated ID');
    assert(rem1.isCompleted === false, 'New reminder defaults to isCompleted = false');
    assert(rem1.priority === 'urgent', 'Priority urgent set correctly');
    assert(rem1.category === 'administrative', 'Category administrative set correctly');

    const rem2 = await createReminder(
      {
        title: 'Idea per nuova demo agentica WhatsApp',
        priority: 'low',
        category: 'idea',
      },
      userSession
    );
    assert(!!rem2.id, 'Reminder 2 (idea without due date) created');

    // List reminders
    const listPending = await listReminders({ status: 'pending' }, userSession);
    assert(listPending.length === 2, `Listed 2 pending reminders (got ${listPending.length})`);

    // Complete rem1
    const updatedRem1 = await updateReminder(
      rem1.id,
      { isCompleted: true },
      userSession
    );
    assert(updatedRem1?.isCompleted === true, 'Reminder 1 marked as completed');
    assert(!!updatedRem1?.completedAt, 'completedAt timestamp populated');

    // Filter completed
    const listCompleted = await listReminders({ status: 'completed' }, userSession);
    assert(listCompleted.length === 1, `Listed 1 completed reminder (got ${listCompleted.length})`);
    assert(listCompleted[0].id === rem1.id, 'Completed reminder matches rem1');

    // Delete rem2
    const deleted = await deleteReminder(rem2.id, userSession);
    assert(deleted === true, 'Reminder 2 deleted');
    const listAfterDelete = await listReminders({}, userSession);
    assert(listAfterDelete.length === 1, 'Remaining reminders count is 1');

    // -------------------------------------------------------------------------
    // Test 2: Google Calendar Live Sync Token Generation & Regeneration
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing Calendar Sync Security Token ---');
    const token1 = await getOrCreateCalendarSyncToken(testUser.id);
    assert(!!token1 && token1.length >= 32, `Generated 32+ char secure token (${token1})`);

    // Fetch again, should return the exact same token
    const token1Repeat = await getOrCreateCalendarSyncToken(testUser.id);
    assert(token1 === token1Repeat, 'Idempotent getOrCreateCalendarSyncToken returns existing token');

    // Regenerate token
    const token2 = await regenerateCalendarSyncToken(testUser.id);
    assert(!!token2 && token2 !== token1, 'Regenerated token creates new distinct token');

    // -------------------------------------------------------------------------
    // Test 3: Generate RFC 5545 Live iCal Feed with Alarms (VALARM)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing RFC 5545 iCalendar Feed Generation ---');

    // Create an appointment for user
    const apptStartTime = new Date(Date.now() + 2 * 3600000).toISOString();
    const appt = await createAppointment(
      {
        title: 'Demo Strategica AI Enterprise',
        description: 'Presentazione architettura agenti',
        appointmentType: 'demo_presentation',
        locationType: 'video_call',
        meetingUrl: 'https://meet.google.com/abc-defg-hij',
        scheduledStartTime: apptStartTime,
        durationMinutes: 45,
      },
      userSession
    );
    assert(!!appt.id, 'Appointment created for feed test');

    // Create a callback for user
    const cb = await createCallback(
      {
        reason: 'Richiamare Dott. Bianchi per proposta contrattuale',
        scheduledAt: new Date(Date.now() + 5 * 3600000).toISOString(),
        priority: 'high',
      },
      userSession
    );
    assert(!!cb.id, 'Callback created for feed test');

    // Create a project and task deadline
    const projId = 'proj_sync_test_01';
    db.insert(projects).values({
      id: projId,
      code: 'PRJ-TEST-01',
      title: 'Implementazione Agente AI',
      status: 'in_corso',
      createdBy: testUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).run();

    const taskId = 'task_sync_test_01';
    db.insert(tasks).values({
      id: taskId,
      projectId: projId,
      title: 'Consegna bozza integrazione CRM',
      plannedEndDate: new Date(Date.now() + 24 * 3600000).toISOString().slice(0, 10),
      status: 'in_corso',
      priority: 'alta',
      createdBy: testUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).run();

    const activeReminder = await createReminder(
      {
        title: 'Verificare rinnovo PEC aziendale',
        dueDateTime: new Date(Date.now() + 86400000).toISOString(),
        priority: 'urgent',
        category: 'administrative',
      },
      userSession
    );
    assert(!!activeReminder.id, 'Active reminder created for feed test');

    // Generate Feed
    const feed = await generateUserIcsCalendarFeed(token2, 'https://crm.example.com');
    assert(feed !== null, 'Generated feed string is not null');
    assert(feed!.includes('BEGIN:VCALENDAR'), 'Contains BEGIN:VCALENDAR');
    assert(feed!.includes('VERSION:2.0'), 'Contains VERSION:2.0');
    assert(feed!.includes('PRODID:-//AI Consulting CRM//Live Calendar Sync Hub//IT'), 'Contains PRODID');
    assert(feed!.includes('X-PUBLISHED-TTL:PT15M'), 'Contains X-PUBLISHED-TTL:PT15M for rapid auto-refresh');
    assert(feed!.includes('BEGIN:VALARM'), 'Contains BEGIN:VALARM for push notifications');
    assert(feed!.includes('TRIGGER:-PT15M'), 'Contains -15m notification trigger');

    // Check individual items in feed
    assert(feed!.includes('Demo Strategica AI Enterprise'), 'Feed includes appointment title');
    assert(feed!.includes('https://meet.google.com/abc-defg-hij'), 'Feed includes video call URL');
    assert(feed!.includes('Richiamare Dott. Bianchi per proposta contrattuale'), 'Feed includes callback reason');
    assert(feed!.includes('Verificare rinnovo PEC aziendale'), 'Feed includes standalone reminder');
    assert(feed!.includes('Consegna bozza integrazione CRM'), 'Feed includes project task deadline');

    // Test with invalid token
    const invalidFeed = await generateUserIcsCalendarFeed('invalid_random_token_xyz');
    assert(invalidFeed === null, 'Invalid token returns null feed (401/404 protection)');

    // -------------------------------------------------------------------------
    // Test 4: getTodayAgenda includes Standalone Reminders
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing getTodayAgenda Integration ---');
    const agenda = await getTodayAgenda(testUser.id);
    assert(agenda.counts.todayAppointmentsCount >= 1, 'Today agenda includes appointment');
    assert(typeof agenda.counts.pendingRemindersCount === 'number', 'pendingRemindersCount is a number');
    assert(Array.isArray(agenda.pendingReminders), 'pendingReminders is an array');

    console.log('\n========================================================================');
    console.log(`=== ALL TESTS PASSED: ${passedTests}/${totalTests} SUCCESSFUL ===`);
    console.log('========================================================================\n');
  } finally {
    // Cleanup isolated temp DB
    if (fs.existsSync(tempDbFile)) {
      try {
        fs.unlinkSync(tempDbFile);
        console.log(`[Cleanup] File temporaneo rimosso: ${tempDbFile}`);
      } catch (e) {
        console.warn(`[Cleanup Warning] Impossibile rimuovere ${tempDbFile}:`, e);
      }
    }
  }
}

runCalendarSyncAndRemindersTests().catch((err) => {
  console.error('\n❌ TEST RUNNER FATAL ERROR:', err);
  process.exit(1);
});
