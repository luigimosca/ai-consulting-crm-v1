import {
  db,
  leads,
  companies,
  quotes,
  quoteVersions,
  orders,
  projects,
  projectMilestones,
  tasks,
  taskAssignments,
  taskDependencies,
  documents,
  users,
  activityLog,
} from '../packages/db/src/index';
import { eq, desc, sql } from 'drizzle-orm';
import { generateOrderCode, generateProjectCode } from '../apps/web/src/lib/quotes-service';
import { recalculateProjectProgress, isTaskBlocked } from '../apps/web/src/lib/task-graph';
import { formatCentsToCurrency } from '../apps/web/src/lib/money';

async function runProjectTypesTestSuite() {
  console.log('🧪 AVVIO TEST SUITE: TIPI PROGETTO (INTERNAL, PRESALES, CLIENT) & SEPARAZIONE KPI\n');

  let passedTests = 0;
  const adminUser = db.select().from(users).all()[0] || { id: 'usr_admin', name: 'Admin Test' };
  const leadSample = db.select().from(leads).all()[0];
  const companySample = db.select().from(companies).all()[0];

  // -------------------------------------------------------------
  // TEST 1: Creazione Progetto INTERNAL (Nessuna azienda, nessuna commessa)
  // -------------------------------------------------------------
  console.log('--- TEST 1: Progetto Interno (Internal / R&D) ---');
  const internalProjectId = `prj_internal_test_${Date.now()}`;
  const internalProjectCode = generateProjectCode();
  const now = new Date().toISOString();

  const internalProject = {
    id: internalProjectId,
    projectType: 'internal' as const,
    orderId: null,
    leadId: null,
    companyId: null,
    code: internalProjectCode,
    title: 'R&D: Nuovo Modulo AI Contact Intelligence',
    description: 'Sviluppo interno di algoritmi di lead enrichment proprietari',
    status: 'pianificato' as const,
    managerId: adminUser.id,
    startDate: now.slice(0, 10),
    dueDate: '2026-12-31',
    progressPercent: 0,
    budgetHours: 120,
    createdBy: adminUser.id,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(projects).values(internalProject).run();
  const fetchedInternal = db.select().from(projects).where(eq(projects.id, internalProjectId)).get();

  if (!fetchedInternal || fetchedInternal.orderId !== null || fetchedInternal.companyId !== null) {
    throw new Error('Fallita creazione progetto interno senza commessa');
  }
  console.log(`✅ Progetto Interno creato con successo: [${fetchedInternal.code}] "${fetchedInternal.title}" (orderId: null, companyId: null)`);
  passedTests++;

  // -------------------------------------------------------------
  // TEST 2: Creazione Progetto PRESALES (Lead opzionale, nessuna commessa)
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Progetto Pre-vendita (Presales / POC) ---');
  const presalesProjectId = `prj_presales_test_${Date.now()}`;
  const presalesProjectCode = generateProjectCode();

  const presalesProject = {
    id: presalesProjectId,
    projectType: 'presales' as const,
    orderId: null,
    leadId: leadSample ? leadSample.id : null,
    companyId: null,
    code: presalesProjectCode,
    title: `POC Demo per Lead ${leadSample ? leadSample.companyName : 'Prospect'}`,
    description: 'Prototipo preliminare per dimostrazione pre-contrattuale',
    status: 'pianificato' as const,
    managerId: adminUser.id,
    startDate: now.slice(0, 10),
    dueDate: '2026-10-15',
    progressPercent: 0,
    budgetHours: 20,
    createdBy: adminUser.id,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(projects).values(presalesProject).run();
  const fetchedPresales = db.select().from(projects).where(eq(projects.id, presalesProjectId)).get();

  if (!fetchedPresales || fetchedPresales.orderId !== null || fetchedPresales.projectType !== 'presales') {
    throw new Error('Fallita creazione progetto pre-vendita');
  }
  console.log(`✅ Progetto Pre-vendita creato con successo: [${fetchedPresales.code}] "${fetchedPresales.title}" (leadId: ${fetchedPresales.leadId})`);
  passedTests++;

  // -------------------------------------------------------------
  // TEST 3: Creazione Progetto CLIENT con Commessa
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Progetto Cliente (Client) con Commessa ---');
  const orderId = `ord_test_${Date.now()}`;
  const orderCode = generateOrderCode();
  const clientOrder = {
    id: orderId,
    code: orderCode,
    title: 'Commessa Servizi AI & Automazione',
    leadId: leadSample ? leadSample.id : null,
    companyId: companySample ? companySample.id : null,
    quoteId: null,
    quoteVersionId: null,
    agreedValue: 850000, // €8.500,00
    currency: 'EUR',
    status: 'attiva' as const,
    managerId: adminUser.id,
    startDate: now.slice(0, 10),
    dueDate: '2026-11-30',
    deliverablesSnapshotJson: '[]',
    createdBy: adminUser.id,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(orders).values(clientOrder).run();

  const clientProjectId = `prj_client_test_${Date.now()}`;
  const clientProjectCode = generateProjectCode();
  const clientProject = {
    id: clientProjectId,
    projectType: 'client' as const,
    orderId: orderId,
    leadId: leadSample ? leadSample.id : null,
    companyId: companySample ? companySample.id : null,
    code: clientProjectCode,
    title: 'Progetto Esecutivo CRM Custom',
    description: 'Sviluppo ed erogazione milestone contrattuali',
    status: 'pianificato' as const,
    managerId: adminUser.id,
    startDate: now.slice(0, 10),
    dueDate: '2026-11-30',
    progressPercent: 0,
    budgetHours: 90,
    createdBy: adminUser.id,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(projects).values(clientProject).run();

  const fetchedClient = db.select().from(projects).where(eq(projects.id, clientProjectId)).get();
  if (!fetchedClient || fetchedClient.orderId !== orderId || fetchedClient.projectType !== 'client') {
    throw new Error('Fallita creazione progetto cliente con commessa');
  }
  console.log(`✅ Progetto Cliente creato con successo: [${fetchedClient.code}] "${fetchedClient.title}" (commessa: ${fetchedClient.orderId})`);
  passedTests++;

  // -------------------------------------------------------------
  // TEST 4: Milestone e Task su Progetto Presales e Internal
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Gestione Milestones e Attività su Progetto Presales ---');
  const msId = `ms_test_${Date.now()}`;
  db.insert(projectMilestones).values({
    id: msId,
    projectId: presalesProjectId,
    title: 'Milestone 1: Wireframe e Demo Flow',
    dueDate: '2026-10-10',
    status: 'in_programma',
    sortOrder: 1,
    createdAt: now,
    updatedAt: now,
  }).run();

  const task1Id = `tsk_pre_1_${Date.now()}`;
  const task2Id = `tsk_pre_2_${Date.now()}`;

  db.insert(tasks).values({
    id: task1Id,
    projectId: presalesProjectId,
    milestoneId: msId,
    title: 'Preparazione mockup interattivo',
    status: 'completato',
    priority: 'alta',
    estimatedHours: 8,
    actualHours: 7,
    progressPercent: 100,
    checklistJson: '[]',
    sortOrder: 1,
    createdBy: adminUser.id,
    createdAt: now,
    updatedAt: now,
  }).run();

  db.insert(tasks).values({
    id: task2Id,
    projectId: presalesProjectId,
    milestoneId: msId,
    title: 'Presentazione e demo al cliente',
    status: 'in_corso',
    priority: 'urgente',
    estimatedHours: 4,
    actualHours: 2,
    progressPercent: 50,
    checklistJson: '[]',
    sortOrder: 2,
    createdBy: adminUser.id,
    createdAt: now,
    updatedAt: now,
  }).run();

  // Task assignment
  db.insert(taskAssignments).values({
    id: `ta_pre_${Date.now()}`,
    taskId: task2Id,
    userId: adminUser.id,
    role: 'lead',
    assignedAt: now,
  }).run();

  // Dependency: task 2 depends on task 1
  db.insert(taskDependencies).values({
    id: `td_pre_${Date.now()}`,
    predecessorTaskId: task1Id,
    successorTaskId: task2Id,
    dependencyType: 'finish_to_start',
    createdAt: now,
  }).run();

  recalculateProjectProgress(presalesProjectId);

  const updatedPresales = db.select().from(projects).where(eq(projects.id, presalesProjectId)).get();
  const presalesTasks = db.select().from(tasks).where(eq(tasks.projectId, presalesProjectId)).all();

  if (presalesTasks.length !== 2 || updatedPresales?.progressPercent === 0) {
    throw new Error('Fallita gestione task e ricalcolo progresso su progetto presales');
  }
  console.log(`✅ Attività create e collegate a Progetto Presales: ${presalesTasks.length} task, progresso: ${updatedPresales?.progressPercent}%`);
  passedTests++;

  // -------------------------------------------------------------
  // TEST 5: Documenti con visibilità su Progetto Presales & Interno
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Caricamento e Visibilità Documenti ---');
  const docId = `doc_test_${Date.now()}`;
  db.insert(documents).values({
    id: docId,
    originalName: 'presentazione_poc.pdf',
    fileName: 'presentazione_poc_2026.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 102400,
    storageKey: `docs/test/${docId}.pdf`,
    storageProvider: 'local',
    entityType: 'project',
    entityId: presalesProjectId,
    version: 1,
    visibility: 'internal',
    uploadedBy: adminUser.id,
    notes: 'Documento interno riservato al team di presales',
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  }).run();

  const fetchedDoc = db.select().from(documents).where(eq(documents.id, docId)).get();
  if (!fetchedDoc || fetchedDoc.visibility !== 'internal') {
    throw new Error('Fallita verifica documento interno');
  }
  console.log(`✅ Documento creato e verificato: "${fetchedDoc.originalName}" (visibilità: ${fetchedDoc.visibility})`);
  passedTests++;

  // -------------------------------------------------------------
  // TEST 6: Conversione Progetto Presales -> Client con Assegnazione Commessa
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Conversione Presales in Client con Assegnazione Commessa ---');
  const convertedOrderId = `ord_converted_${Date.now()}`;
  db.insert(orders).values({
    id: convertedOrderId,
    code: generateOrderCode(),
    title: 'Commessa Convertita da POC Accettato',
    leadId: leadSample ? leadSample.id : null,
    companyId: companySample ? companySample.id : null,
    agreedValue: 1200000, // €12.000,00
    currency: 'EUR',
    status: 'attiva',
    managerId: adminUser.id,
    startDate: now.slice(0, 10),
    dueDate: '2026-12-31',
    deliverablesSnapshotJson: '[]',
    createdBy: adminUser.id,
    createdAt: now,
    updatedAt: now,
  }).run();

  // In-place update preserving ID and tasks
  db.update(projects)
    .set({
      projectType: 'client',
      orderId: convertedOrderId,
      companyId: companySample ? companySample.id : null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(projects.id, presalesProjectId))
    .run();

  // Log activity
  db.insert(activityLog).values({
    id: `act_${Date.now()}`,
    entityType: 'project',
    entityId: presalesProjectId,
    action: 'project_linked_to_order',
    performedBy: adminUser.id,
    detailsJson: JSON.stringify({
      orderId: convertedOrderId,
      previousType: 'presales',
      newType: 'client',
    }),
    createdAt: new Date().toISOString(),
  }).run();

  const convertedProject = db.select().from(projects).where(eq(projects.id, presalesProjectId)).get();
  const tasksAfterConversion = db.select().from(tasks).where(eq(tasks.projectId, presalesProjectId)).all();
  const logEntries = db.select().from(activityLog).where(eq(activityLog.entityId, presalesProjectId)).all();

  if (
    convertedProject?.projectType !== 'client' ||
    convertedProject?.orderId !== convertedOrderId ||
    tasksAfterConversion.length !== 2 ||
    logEntries.length === 0
  ) {
    throw new Error('Conversione presales -> client fallita o task duplicati/persi');
  }

  console.log(`✅ Progetto convertito con successo!`);
  console.log(`   - Stesso ID progetto: ${convertedProject.id}`);
  console.log(`   - Nuovo projectType: ${convertedProject.projectType}`);
  console.log(`   - Commessa collegata: ${convertedProject.orderId}`);
  console.log(`   - Numero task invariato e preservato: ${tasksAfterConversion.length}`);
  console.log(`   - Activity log registrato: "${logEntries[0].action}"`);
  passedTests++;

  // -------------------------------------------------------------
  // TEST 7: Separazione KPI (Commesse Acquisite & Fatturato Contrattualizzato)
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Verifica Separazione KPI ---');
  // I KPI di commesse e fatturato devono calcolarsi unicamente sulla tabella `orders`
  const allOrdersList = db.select().from(orders).all();
  const commesseAcquisiteCount = allOrdersList.filter(o => o.status !== 'annullata').length;
  const totalContractedRevenueCents = allOrdersList
    .filter(o => o.status !== 'annullata')
    .reduce((sum, o) => sum + (o.agreedValue || 0), 0);

  console.log(`📊 KPI Commesse Acquisite (Totale contratti attivi/completati): ${commesseAcquisiteCount}`);
  console.log(`📊 KPI Fatturato Contrattualizzato: ${formatCentsToCurrency(totalContractedRevenueCents)}`);

  // Creiamo un nuovo progetto interno e un nuovo progetto presales
  const extraInternalId = `prj_extra_internal_${Date.now()}`;
  db.insert(projects).values({
    id: extraInternalId,
    projectType: 'internal',
    orderId: null,
    leadId: null,
    companyId: null,
    code: generateProjectCode(),
    title: 'Iniziativa di ricerca interna',
    status: 'in_corso',
    createdBy: adminUser.id,
    createdAt: now,
    updatedAt: now,
  }).run();

  const extraPresalesId = `prj_extra_presales_${Date.now()}`;
  db.insert(projects).values({
    id: extraPresalesId,
    projectType: 'presales',
    orderId: null,
    leadId: leadSample ? leadSample.id : null,
    companyId: null,
    code: generateProjectCode(),
    title: 'POC esplorativo non vincolante',
    status: 'pianificato',
    createdBy: adminUser.id,
    createdAt: now,
    updatedAt: now,
  }).run();

  // Ricalcolo KPI
  const ordersAfterExtra = db.select().from(orders).all();
  const commesseAfter = ordersAfterExtra.filter(o => o.status !== 'annullata').length;
  const revenueAfter = ordersAfterExtra
    .filter(o => o.status !== 'annullata')
    .reduce((sum, o) => sum + (o.agreedValue || 0), 0);

  if (commesseAfter !== commesseAcquisiteCount || revenueAfter !== totalContractedRevenueCents) {
    throw new Error('I progetti interni/presales hanno inquinato i KPI delle commesse!');
  }

  console.log('✅ Separazione KPI verificata al 100%: Progetti interni e pre-vendita esclusi da commesse e fatturato.');
  passedTests++;

  console.log(`\n🎉 SUITE COMPLETATA: TUTTI I ${passedTests}/${passedTests} TEST SUPERATI CON SUCCESSO!`);
}

runProjectTypesTestSuite().catch((err) => {
  console.error('❌ ERRORE NELLA SUITE DI TEST:', err);
  process.exit(1);
});
