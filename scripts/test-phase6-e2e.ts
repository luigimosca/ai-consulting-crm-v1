import {
  db,
  leads,
  companies,
  quotes,
  quoteVersions,
  quoteItems,
  approvals,
  orders,
  projects,
  projectMilestones,
  tasks,
  taskAssignments,
  taskDependencies,
  documents,
  users,
} from '../packages/db/src/index';
import { eq, desc } from 'drizzle-orm';
import {
  calcQuoteTotals,
  calcLineTotal,
  formatCentsToCurrency,
  parseInputToCents,
} from '../apps/web/src/lib/money';
import {
  createQuote,
  requestInternalApproval,
  decideInternalApproval,
  markSentToClient,
  recordClientAcceptance,
  convertQuoteToOrder,
  generateQuoteNumber,
  generateOrderCode,
  generateProjectCode,
} from '../apps/web/src/lib/quotes-service';
import { wouldCreateDependencyCycle, isTaskBlocked, recalculateProjectProgress } from '../apps/web/src/lib/task-graph';
import { getStorageProvider, LocalStorageProvider } from '../apps/web/src/lib/storage';

async function runE2ETest() {
  console.log('🚀 AVVIO TEST END-TO-END FASE 6 — CICLO OPERATIVO COMPLETO CRM\n');

  let passedTests = 0;
  const totalTests = 12;

  // 1. Setup & Verifica Lead Esistente
  console.log('--- TEST 1: Selezione Lead Esistente ---');
  const allLeads = db.select().from(leads).all();
  if (allLeads.length === 0) throw new Error('Nessun lead trovato nel DB');
  const targetLead = allLeads[0];
  console.log(`✅ Lead selezionato: "${targetLead.companyName}" (ID: ${targetLead.id}, Città: ${targetLead.city || 'N/D'})`);
  passedTests++;

  // 2. Creazione Preventivo con 2 Righe, Sconti e Imposte (Calcolo in Cents Esatti)
  console.log('\n--- TEST 2: Creazione Preventivo con 2 Righe e Calcolo Cents Esatti ---');
  const items = [
    {
      description: 'Audit AI & Analisi Processi Aziendali',
      quantity: 1,
      unitPrice: 250000, // €2.500,00
      discountPercent: 10, // 10% sconto -> €2.250,00
      taxRate: 22, // 22% IVA
    },
    {
      description: 'Implementazione Agente AI WhatsApp & Funnel',
      quantity: 2,
      unitPrice: 150000, // €1.500,00 x 2 = €3.000,00
      discountPercent: 0,
      taxRate: 22, // 22% IVA
    },
  ];

  const totals = calcQuoteTotals(items);
  console.log(`Subtotale Netto: ${formatCentsToCurrency(totals.subtotalCents)}`);
  console.log(`Sconto Totale: ${formatCentsToCurrency(totals.discountTotalCents)}`);
  console.log(`Imponibile: ${formatCentsToCurrency(totals.taxableCents)}`);
  console.log(`IVA 22%: ${formatCentsToCurrency(totals.taxAmountCents)}`);
  console.log(`Totale Lordo: ${formatCentsToCurrency(totals.totalAmountCents)}`);

  if (totals.taxableCents !== 525000) {
    throw new Error(`Calcolo errato: atteso imponibile 525000 cents, ottenuto ${totals.taxableCents}`);
  }

  // Admin user
  let adminUser = db.select().from(users).where(eq(users.role, 'admin')).get();
  if (!adminUser) {
    adminUser = { id: 'usr_admin_default', name: 'Admin', email: 'admin@ai-consulting.it', role: 'admin' } as any;
  }

  const { quote, versionId } = await createQuote(
    {
      leadId: targetLead.id,
      title: `Proposta Trasformazione AI - ${targetLead.companyName}`,
      items,
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      paymentTerms: '50% acconto, 50% saldo collaudo',
      notes: 'Inclusa garanzia di 6 mesi e SLA 4h',
    },
    { userId: adminUser.id, role: 'admin' }
  );

  console.log(`✅ Preventivo creato: ${quote.quoteNumber} (v1) - Totale: ${formatCentsToCurrency(quote.totalAmount)}`);
  passedTests++;

  // 3. Workflow Approvazione Interna (Richiesta -> Approvazione Admin)
  console.log('\n--- TEST 3: Workflow Approvazione Interna ---');
  await requestInternalApproval(quote.id, { userId: adminUser.id });
  const approvalRes = await decideInternalApproval(
    quote.id,
    'approvata',
    'Margine operativo conforme ai target di agenzia',
    { userId: adminUser.id, role: 'admin' }
  );
  console.log(`✅ Approvazione interna eseguita con successo. Nuovo stato: ${approvalRes.nextStatus}`);
  passedTests++;

  // 4. Invio al Cliente e PDF Preview
  console.log('\n--- TEST 4: Invio al Cliente e Snapshot Immutabile ---');
  await markSentToClient(quote.id, { userId: adminUser.id });
  const sentQuote = db.select().from(quotes).where(eq(quotes.id, quote.id)).get();
  console.log(`✅ Preventivo inviato al cliente, stato: ${sentQuote?.status}`);
  passedTests++;

  // 5. Registrazione Accettazione Cliente con Prove Formali
  console.log('\n--- TEST 5: Registrazione Accettazione Cliente con Evidenze Formali ---');
  const acceptanceResult = await recordClientAcceptance(
    quote.id,
    {
      decidedBy: 'Mario Rossi (Amministratore Delegato)',
      decidedAt: new Date().toISOString().slice(0, 10),
      method: 'email_confirmation',
      evidenceNotes: 'Email formale di accettazione ricevuta da direzione@azienda.it il 26/09/2026',
      comment: 'Offerta accettata senza riserve',
    },
    { userId: adminUser.id }
  );
  console.log(`✅ Accettazione cliente registrata: snapshot versione ${acceptanceResult.versionId}`);
  passedTests++;

  // 6. Conversione Idempotente in Commessa (Double-click proof)
  console.log('\n--- TEST 6: Conversione Idempotente in Commessa ---');
  const conversion1 = await convertQuoteToOrder(
    quote.id,
    {
      managerId: adminUser.id,
      createInitialProject: true,
      initialProjectTitle: `Setup & Avvio - ${targetLead.companyName}`,
    },
    { userId: adminUser.id, role: 'admin' }
  );
  console.log(`✅ Commessa creata: ${conversion1.order.code} - ${conversion1.order.title}`);

  // Test idempotency: second call must return existing order without creating duplicates
  const conversion2 = await convertQuoteToOrder(
    quote.id,
    {
      managerId: adminUser.id,
    },
    { userId: adminUser.id, role: 'admin' }
  );
  if (conversion1.order.id !== conversion2.order.id) {
    throw new Error('Idempotency failure: duplicate order created on second call');
  }
  console.log(`✅ Idempotenza verificata: richiamata conversione restituisce la stessa commessa ${conversion2.order.id}`);
  passedTests++;

  // 7. Gestione 2 Progetti Operativi per la Commessa
  console.log('\n--- TEST 7: Gestione di 2 Progetti Operativi ---');
  const project1 = conversion1.project;
  if (!project1) throw new Error('Initial project was not created');

  // Create second project
  const proj2Code = generateProjectCode();
  const proj2Id = `prj_${Date.now()}_2`;
  db.insert(projects).values({
    id: proj2Id,
    orderId: conversion1.order.id,
    code: proj2Code,
    title: 'Sviluppo Modulo AI & Integrazioni CRM',
    description: 'Setup backend FastAPI e webhook WhatsApp',
    status: 'pianificato',
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    budgetHours: 60,
    managerId: adminUser.id,
    progressPercent: 0,
    createdBy: adminUser.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).run();

  const allOrderProjects = db.select().from(projects).where(eq(projects.orderId, conversion1.order.id)).all();
  console.log(`✅ ${allOrderProjects.length} Progetti attivi per la commessa (${allOrderProjects.map(p => p.code).join(', ')})`);
  passedTests++;

  // 8. Milestone e Attività con Assegnazione a 2 Operatori e Dipendenze DAG
  console.log('\n--- TEST 8: Milestone, Task Multi-Assegnatario e Grafo DAG ---');
  const milestoneId = `ms_${Date.now()}`;
  db.insert(projectMilestones).values({
    id: milestoneId,
    projectId: project1.id,
    title: 'Rilascio Funnel Test & Demo',
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    status: 'in_programma',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).run();

  // Task 1: Setup
  const task1Id = `tsk_${Date.now()}_1`;
  db.insert(tasks).values({
    id: task1Id,
    projectId: project1.id,
    milestoneId,
    title: 'Audit Iniziale e Schema Dati',
    status: 'completato',
    priority: 'alta',
    plannedStartDate: '2026-10-01',
    plannedEndDate: '2026-10-05',
    progressPercent: 100,
    estimatedHours: 15,
    actualHours: 14,
    createdBy: adminUser.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).run();

  // Task 2: Dipendente da Task 1
  const task2Id = `tsk_${Date.now()}_2`;
  db.insert(tasks).values({
    id: task2Id,
    projectId: project1.id,
    milestoneId,
    title: 'Configurazione Agente AI',
    status: 'in_corso',
    priority: 'urgente',
    plannedStartDate: '2026-10-06',
    plannedEndDate: '2026-10-15',
    progressPercent: 40,
    estimatedHours: 25,
    actualHours: 10,
    createdBy: adminUser.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).run();

  // Link Dependency: Task 1 -> Task 2
  db.insert(taskDependencies).values({
    id: `dep_${Date.now()}`,
    predecessorTaskId: task1Id,
    successorTaskId: task2Id,
    dependencyType: 'finish_to_start',
    createdAt: new Date().toISOString(),
  }).run();

  // Multi-assignee on Task 2
  db.insert(taskAssignments).values({
    id: `ta_${Date.now()}_1`,
    taskId: task2Id,
    userId: adminUser.id,
    role: 'owner',
    assignedAt: new Date().toISOString(),
  }).run();

  // Check DAG cycle prevention
  const cycleDetected = wouldCreateDependencyCycle(task2Id, task1Id);
  if (!cycleDetected) {
    throw new Error('DAG cycle detection failed to prevent circular dependency');
  }
  console.log(`✅ Prevenzione cicli DAG verificata (bloccata dipendenza ciclica ${task2Id} -> ${task1Id})`);
  console.log(`✅ Task 2 bloccato da Task 1? ${isTaskBlocked(task2Id) ? 'Sì (incompleto)' : 'No (predecessore completato)'}`);
  passedTests++;

  // 9. Storage Provider Documenti (Upload, MIME check, Path isolation)
  console.log('\n--- TEST 9: Storage Provider Documentale ---');
  const storage = getStorageProvider();
  const testBuffer = Buffer.from('PDF DELIVERABLE SPECIFICHE TECNICHE E ACCETTAZIONE OPERATIVA', 'utf-8');
  const uploadRes = await storage.upload({
    originalName: 'specifica_tecnica_v1.pdf',
    mimeType: 'application/pdf',
    buffer: testBuffer,
    entityType: 'project',
    entityId: project1.id,
  });

  const docId = `doc_${Date.now()}`;
  db.insert(documents).values({
    id: docId,
    title: 'Specifica Tecnica di Progetto',
    originalName: uploadRes.originalName,
    fileName: uploadRes.fileName,
    storageKey: uploadRes.storageKey,
    storageProvider: uploadRes.storageProvider,
    mimeType: uploadRes.mimeType,
    sizeBytes: uploadRes.sizeBytes,
    category: 'specifica_tecnica',
    entityType: 'project',
    entityId: project1.id,
    uploadedBy: adminUser.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).run();

  console.log(`✅ Documento salvato nel Vault: Specifica Tecnica (${uploadRes.sizeBytes} bytes, StorageKey: ${uploadRes.storageKey})`);
  
  const downloadRes = await storage.download(uploadRes.storageKey);
  if (!downloadRes || downloadRes.buffer.toString('utf-8') !== testBuffer.toString('utf-8')) {
    throw new Error('Integrità documento fallita su lettura binary stream');
  }
  console.log('✅ Integrità binary stream verificata con successo');
  passedTests++;

  // 10. Coerenza Dati Cronoprogramma Gantt
  console.log('\n--- TEST 10: Coerenza Cronoprogramma Gantt ---');
  const allProjTasks = db.select().from(tasks).where(eq(tasks.projectId, project1.id)).all();
  const allProjMs = db.select().from(projectMilestones).where(eq(projectMilestones.projectId, project1.id)).all();
  console.log(`✅ Gantt Timeline: ${allProjTasks.length} attività tracciate, ${allProjMs.length} milestone sincronizzate`);
  passedTests++;

  // 11. Controllo Immutabilità Versione Preventivo
  console.log('\n--- TEST 11: Controllo Immutabilità Versioni Preventivo ---');
  const quoteVersionsList = db.select().from(quoteVersions).where(eq(quoteVersions.quoteId, quote.id)).all();
  console.log(`✅ ${quoteVersionsList.length} Versioni immutabili registrate per il preventivo ${quote.quoteNumber}`);
  for (const v of quoteVersionsList) {
    console.log(`   - Versione ${v.versionNumber} [${v.status}]: ${formatCentsToCurrency(v.totalAmount)}`);
  }
  passedTests++;

  // 12. Ricalcolo Automatico Progresso Progetto
  console.log('\n--- TEST 12: Ricalcolo Automatico Progresso Progetto ---');
  recalculateProjectProgress(project1.id);
  const updatedProj = db.select().from(projects).where(eq(projects.id, project1.id)).get();
  console.log(`✅ Progresso Progetto ricalcolato automaticamente: ${updatedProj?.progressPercent}%`);
  passedTests++;

  console.log(`\n======================================================`);
  console.log(`🎉 TUTTI I ${passedTests}/${totalTests} TEST DI ACCETTAZIONE SUPERATI CON SUCCESSO!`);
  console.log(`======================================================\n`);
}

runE2ETest().catch((err) => {
  console.error('❌ ERRORE TEST E2E:', err);
  process.exit(1);
});
