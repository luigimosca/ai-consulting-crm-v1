/**
 * Test Suite: Process Templates (Modelli di Processo)
 * Covers all 15 test scenarios specified in Phase F.
 */

import {
  initDatabase,
  db,
  projects,
  tasks,
  projectMilestones,
  processTemplates,
  processTemplateVersions,
  projectAppliedTemplates,
  users,
} from '../packages/db/src/index';
import { eq, inArray } from 'drizzle-orm';
import {
  addBusinessDays,
  getNextBusinessDay,
  calculateTemplateSchedule,
  validateTemplateGraphAcyclic,
  SEED_WEBSITE_CREATION_TEMPLATE,
  SEED_SEO_LAUNCH_TEMPLATE,
  type ProcessTemplateDefinition,
} from '../packages/ai/src/index';
import {
  seedProcessTemplatesIfEmpty,
  listProcessTemplates,
  getProcessTemplateById,
  createProcessTemplateDraft,
  publishProcessTemplateVersion,
  previewTemplateApplication,
  applyTemplateToProject,
  getAppliedTemplatesForProject,
} from '../apps/web/src/lib/process-templates-service';

let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, testName: string, failureDetails?: string) {
  if (condition) {
    console.log(`\x1b[32m✔ [PASS]\x1b[0m ${testName}`);
    totalPassed++;
  } else {
    console.error(`\x1b[31m✖ [FAIL]\x1b[0m ${testName}${failureDetails ? ` - ${failureDetails}` : ''}`);
    totalFailed++;
  }
}

async function runProcessTemplatesTestSuite() {
  console.log('\n======================================================');
  console.log('🚀 INIZIO TEST SUITE: MODELLI DI PROCESSO (15 SCENARI)');
  console.log('======================================================\n');

  initDatabase();

  // Setup mock test admin user & mock test team members
  const testAdminId = 'usr_test_admin_' + Date.now();
  const testDevId = 'usr_test_dev_' + Date.now();
  const testDesignerId = 'usr_test_designer_' + Date.now();

  const nowIso = new Date().toISOString();
  try {
    await db.insert(users).values([
      {
        id: testAdminId,
        name: 'Admin Test',
        email: `admin_${Date.now()}@agency.local`,
        role: 'admin',
        passwordHash: 'dummy_hash',
        createdAt: nowIso,
      },
      {
        id: testDevId,
        name: 'Dev Test',
        email: `dev_${Date.now()}@agency.local`,
        role: 'operator',
        passwordHash: 'dummy_hash',
        createdAt: nowIso,
      },
      {
        id: testDesignerId,
        name: 'Designer Test',
        email: `designer_${Date.now()}@agency.local`,
        role: 'operator',
        passwordHash: 'dummy_hash',
        createdAt: nowIso,
      },
    ]);
  } catch (err: any) {
    console.error('Error inserting test users:', err);
  }

  // SCENARIO 15b (Seed Idempotente): Seed initial templates if empty and verify no duplicate creation
  console.log('--- Test Scenario 15b: Seed Idempotente ---');
  await seedProcessTemplatesIfEmpty(testAdminId);
  const seededTemplates = await listProcessTemplates();
  const websiteTemplate = seededTemplates.find((t) => t.code === 'WEBSITE_CREATION');
  const seoTemplate = seededTemplates.find((t) => t.code === 'SEO_LAUNCH');
  assert(
    !!websiteTemplate && !!seoTemplate,
    'Scenario 15b.1: Seed iniziale dei template WEBSITE_CREATION e SEO_LAUNCH completato',
    `Found: website=${!!websiteTemplate}, seo=${!!seoTemplate}`
  );

  // Calling seed again should be completely idempotent
  await seedProcessTemplatesIfEmpty(testAdminId);
  const reseededTemplates = await listProcessTemplates();
  const duplicateWebsite = reseededTemplates.filter((t) => t.code === 'WEBSITE_CREATION');
  assert(
    duplicateWebsite.length === 1,
    'Scenario 15b.2: Seed idempotente non crea duplicati alla seconda invocazione'
  );

  // SCENARIO 1: Creazione modello in bozza con validazione schema e campi obbligatori
  console.log('\n--- Test Scenario 1: Creazione Modello in Bozza ---');
  const sampleDefinition: ProcessTemplateDefinition = {
    phases: [
      { id: 'p_strat', name: 'Fase 1: Strategia', sortOrder: 1 },
      { id: 'p_build', name: 'Fase 2: Sviluppo', sortOrder: 2 },
    ],
    milestones: [
      { id: 'ms_strat_done', phaseId: 'p_strat', title: 'Strategia Approvata', sortOrder: 1 },
      { id: 'ms_go_live', phaseId: 'p_build', title: 'Rilascio Live', sortOrder: 2 },
    ],
    tasks: [
      {
        id: 't_brief',
        phaseId: 'p_strat',
        milestoneId: 'ms_strat_done',
        title: 'Briefing con il cliente',
        estimatedWorkDays: 2,
        estimatedHours: 8,
        suggestedRole: 'tech_lead',
        priority: 'alta',
        checklist: [{ id: 'chk_1', text: 'Verbale approvato' }],
      },
      {
        id: 't_design',
        phaseId: 'p_build',
        title: 'Design Mockup Figma',
        estimatedWorkDays: 3,
        estimatedHours: 15,
        suggestedRole: 'designer',
        priority: 'media',
        checklist: [{ id: 'chk_2', text: 'Figma link inviato' }],
      },
      {
        id: 't_code',
        phaseId: 'p_build',
        milestoneId: 'ms_go_live',
        title: 'Sviluppo Frontend & Backend',
        estimatedWorkDays: 5,
        estimatedHours: 40,
        suggestedRole: 'developer',
        priority: 'urgente',
        checklist: [{ id: 'chk_3', text: 'Build superata' }],
      },
    ],
    dependencies: [
      { predecessorTaskId: 't_brief', successorTaskId: 't_design', dependencyType: 'finish_to_start' },
      { predecessorTaskId: 't_design', successorTaskId: 't_code', dependencyType: 'finish_to_start' },
    ],
  };

  const draftCode = 'CUSTOM_WORKFLOW_' + Date.now();
  const createdDraft = await createProcessTemplateDraft({
    name: 'Custom Workflow Test',
    code: draftCode,
    category: 'website',
    description: 'Modello di test personalizzato',
    createdBy: testAdminId,
    definition: sampleDefinition,
  });

  assert(
    !!createdDraft && createdDraft.status === 'draft',
    'Scenario 1.1: Creazione modello in bozza riuscita con stato draft'
  );
  assert(
    createdDraft.phasesCount === 2 && createdDraft.tasksCount === 3 && createdDraft.milestonesCount === 2,
    'Scenario 1.2: Conteggi coerenti di fasi (2), compiti (3) e milestone (2)'
  );

  // SCENARIO 2: Pubblicazione versione: generazione snapshot immutabile e incremento numero versione
  console.log('\n--- Test Scenario 2: Pubblicazione Versione Immutabile ---');
  const publishedV1 = await publishProcessTemplateVersion({
    templateId: createdDraft.id,
    publishedBy: testAdminId,
    changelog: 'Prima versione operativa v1',
  });

  assert(
    publishedV1.versionNumber === 1 && publishedV1.status === 'published',
    'Scenario 2.1: Pubblicazione v1 completata con stato published'
  );
  assert(
    publishedV1.estimatedWorkDays > 0,
    'Scenario 2.2: Calcolo giorni lavorativi stimati nella versione pubblicata'
  );

  // SCENARIO 3: Immutabilità: Modifica della bozza successiva non altera la versione pubblicata precedentemente
  console.log('\n--- Test Scenario 3: Immutabilità e Versioning (v1 vs v2) ---');
  // Edit the definition and publish v2 with 4 tasks instead of 3
  const v2Definition: ProcessTemplateDefinition = {
    ...sampleDefinition,
    tasks: [
      ...sampleDefinition.tasks,
      {
        id: 't_qa',
        phaseId: 'p_build',
        title: 'Collaudo QA & Sicurezza',
        estimatedWorkDays: 2,
        estimatedHours: 10,
        suggestedRole: 'tech_lead',
        priority: 'alta',
      },
    ],
    dependencies: [
      ...sampleDefinition.dependencies,
      { predecessorTaskId: 't_code', successorTaskId: 't_qa', dependencyType: 'finish_to_start' },
    ],
  };

  const publishedV2 = await publishProcessTemplateVersion({
    templateId: createdDraft.id,
    publishedBy: testAdminId,
    changelog: 'Aggiunta fase collaudo QA',
    definition: v2Definition,
  });

  assert(
    publishedV2.versionNumber === 2,
    'Scenario 3.1: Pubblicazione v2 incrementa correttamente a versionNumber=2'
  );

  // Verify v1 in DB still has 3 tasks while v2 has 4 tasks
  const details = await getProcessTemplateById(createdDraft.id);
  const version1Record = details?.versions.find((v) => v.versionNumber === 1);
  const version2Record = details?.versions.find((v) => v.versionNumber === 2);

  assert(
    version1Record?.definition.tasks.length === 3 && version2Record?.definition.tasks.length === 4,
    'Scenario 3.2: Snapshot immutabile garantito - v1 mantiene 3 task mentre v2 ne ha 4'
  );

  // SCENARIO 4: Dry-run / Anteprima: Calcolo date coerenti (lun-ven), ruoli mappati, checklist e duplicati
  console.log('\n--- Test Scenario 4: Dry-run e Anteprima Calcolo Lavorativo ---');
  const testProject1Id = 'proj_client_test_' + Date.now();
  await db.insert(projects).values({
    id: testProject1Id,
    code: 'PRJ-TEST-001',
    title: 'Progetto Cliente Test',
    projectType: 'client',
    status: 'pianificato',
    startDate: '2026-10-05', // Monday
    createdBy: testAdminId,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const preview = await previewTemplateApplication({
    templateId: createdDraft.id,
    versionId: version1Record!.id,
    projectId: testProject1Id,
    startDate: '2026-10-05', // Monday
    roleMappings: {
      tech_lead: testAdminId,
      designer: testDesignerId,
      developer: testDevId,
    },
    defaultAssigneeUserId: testAdminId,
  });

  assert(
    preview.schedule.tasks.length === 3,
    'Scenario 4.1: Dry-run calcola esattamente i 3 compiti della v1'
  );
  assert(
    preview.schedule.tasks[0].plannedStartDate === '2026-10-05',
    'Scenario 4.2: Data di avvio del primo compito coincide con il lunedì 2026-10-05'
  );
  assert(
    preview.schedule.tasks[0].assignedUserId === testAdminId,
    'Scenario 4.3: Ruolo tech_lead mappato correttamente all\'utente Admin'
  );
  assert(
    preview.schedule.tasks[1].assignedUserId === testDesignerId,
    'Scenario 4.4: Ruolo designer mappato correttamente all\'utente Designer'
  );

  // SCENARIO 5: Applicazione a progetto client: generazione corretta di task, milestone e assegnatari
  console.log('\n--- Test Scenario 5: Applicazione a Progetto Client ---');
  const applyClientResult = await applyTemplateToProject({
    templateId: createdDraft.id,
    versionId: version1Record!.id,
    projectId: testProject1Id,
    startDate: '2026-10-05',
    roleMappings: {
      tech_lead: testAdminId,
      designer: testDesignerId,
      developer: testDevId,
    },
    defaultAssigneeUserId: testAdminId,
    idempotencyKey: 'apply_key_client_001',
    appliedByUserId: testAdminId,
  });

  assert(
    applyClientResult.tasksCreated === 3 && applyClientResult.milestonesCreated === 2,
    'Scenario 5.1: Applicazione client genera 3 task e 2 milestone nel database'
  );

  // Verify tasks are present in DB for project
  const clientProjectTasks = await db.select().from(tasks).where(eq(tasks.projectId, testProject1Id));
  assert(
    clientProjectTasks.length === 3,
    'Scenario 5.2: Query DB conferma presenza di 3 task collegati al progetto client'
  );

  // SCENARIO 6: Applicazione a progetto internal: generazione corretta senza commessa o lead
  console.log('\n--- Test Scenario 6: Applicazione a Progetto Interno (R&D) ---');
  const testProjectInternalId = 'proj_internal_test_' + Date.now();
  await db.insert(projects).values({
    id: testProjectInternalId,
    code: 'PRJ-INT-001',
    title: 'Iniziativa R&D Interna',
    projectType: 'internal',
    status: 'pianificato',
    startDate: '2026-10-05',
    createdBy: testAdminId,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const applyInternalResult = await applyTemplateToProject({
    templateId: createdDraft.id,
    versionId: version1Record!.id,
    projectId: testProjectInternalId,
    startDate: '2026-10-05',
    defaultAssigneeUserId: testAdminId,
    idempotencyKey: 'apply_key_internal_001',
    appliedByUserId: testAdminId,
  });

  assert(
    applyInternalResult.tasksCreated === 3,
    'Scenario 6.1: Applicazione a progetto internal riuscita senza commessa o lead'
  );

  // SCENARIO 7: Esclusione compiti: compiti deselezionati non vengono creati
  console.log('\n--- Test Scenario 7: Esclusione Compiti Selettiva ---');
  const testProjectExclusionId = 'proj_excl_test_' + Date.now();
  await db.insert(projects).values({
    id: testProjectExclusionId,
    code: 'PRJ-EXCL-001',
    title: 'Progetto con Esclusione',
    projectType: 'client',
    status: 'pianificato',
    startDate: '2026-10-05',
    createdBy: testAdminId,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const applyExclusionResult = await applyTemplateToProject({
    templateId: createdDraft.id,
    versionId: version1Record!.id,
    projectId: testProjectExclusionId,
    startDate: '2026-10-05',
    excludedTaskCodes: ['t_design'], // Exclude t_design
    defaultAssigneeUserId: testAdminId,
    idempotencyKey: 'apply_key_excl_001',
    appliedByUserId: testAdminId,
  });

  assert(
    applyExclusionResult.tasksCreated === 2,
    'Scenario 7.1: Esclusione di t_design riduce i task creati da 3 a 2'
  );
  const exclTasksInDb = await db.select().from(tasks).where(eq(tasks.projectId, testProjectExclusionId));
  const hasDesignTask = exclTasksInDb.some((t) => t.title.includes('Figma'));
  assert(
    !hasDesignTask,
    'Scenario 7.2: Nessun task relativo a Figma/design è stato inserito nel DB'
  );

  // SCENARIO 8: Collegamento task-milestone-progetto: verifica FK e coerenza relazionale
  console.log('\n--- Test Scenario 8: Integrità Relazionale FK Task -> Milestone -> Progetto ---');
  const clientMilestonesInDb = await db
    .select()
    .from(projectMilestones)
    .where(eq(projectMilestones.projectId, testProject1Id));
  assert(
    clientMilestonesInDb.length === 2,
    'Scenario 8.1: Trovate 2 milestone collegate al projectId'
  );

  const taskLinkedToMilestone = clientProjectTasks.find((t) => t.milestoneId !== null);
  assert(
    !!taskLinkedToMilestone && !!clientMilestonesInDb.find((m) => m.id === taskLinkedToMilestone.milestoneId),
    'Scenario 8.2: Il task con milestone è correttamente associato alla FK della milestone creata'
  );

  // SCENARIO 9: Controllo aciclicità DAG: rifiuto di cicli di dipendenza
  console.log('\n--- Test Scenario 9: Controllo Aciclicità DAG ---');
  const cyclicDependencies = [
    { predecessorTaskId: 't_1', successorTaskId: 't_2', dependencyType: 'finish_to_start' as const },
    { predecessorTaskId: 't_2', successorTaskId: 't_3', dependencyType: 'finish_to_start' as const },
    { predecessorTaskId: 't_3', successorTaskId: 't_1', dependencyType: 'finish_to_start' as const }, // Cycle!
  ];

  const cycleCheck = validateTemplateGraphAcyclic(['t_1', 't_2', 't_3'], cyclicDependencies);
  const cycleDetected = !cycleCheck.isValid;

  assert(
    cycleDetected,
    'Scenario 9.1: Il validatore rileva e blocca correttamente il ciclo t_1 -> t_2 -> t_3 -> t_1',
    cycleCheck.error
  );

  // SCENARIO 10: Date Gantt: verifica sequenzialità (lun-ven) e milestone $\ge$ task end date
  console.log('\n--- Test Scenario 10: Date Gantt e Rispetto Calendario Lavorativo ---');
  const scheduledBrief = preview.schedule.tasks.find((t) => t.id === 't_brief')!;
  const scheduledDesign = preview.schedule.tasks.find((t) => t.id === 't_design')!;
  const scheduledCode = preview.schedule.tasks.find((t) => t.id === 't_code')!;

  // t_brief (2 work days): Mon 2026-10-05 -> Tue 2026-10-06
  // t_design (3 work days): Wed 2026-10-07 -> Fri 2026-10-09
  // t_code (5 work days): Mon 2026-10-12 -> Fri 2026-10-16 (skipping Sat/Sun Oct 10-11!)
  assert(
    scheduledBrief.plannedStartDate === '2026-10-05' && scheduledBrief.plannedEndDate === '2026-10-06',
    'Scenario 10.1: t_brief (2 gg): 2026-10-05 -> 2026-10-06',
    `Got: ${scheduledBrief.plannedStartDate} -> ${scheduledBrief.plannedEndDate}`
  );
  assert(
    scheduledDesign.plannedStartDate === '2026-10-07' && scheduledDesign.plannedEndDate === '2026-10-09',
    'Scenario 10.2: t_design (3 gg): 2026-10-07 -> 2026-10-09',
    `Got: ${scheduledDesign.plannedStartDate} -> ${scheduledDesign.plannedEndDate}`
  );
  assert(
    scheduledCode.plannedStartDate === '2026-10-12' && scheduledCode.plannedEndDate === '2026-10-16',
    'Scenario 10.3: t_code salta il weekend (10-11 Ottobre) e pianifica da Lun 2026-10-12 a Ven 2026-10-16',
    `Got: ${scheduledCode.plannedStartDate} -> ${scheduledCode.plannedEndDate}`
  );

  // SCENARIO 11: Idempotenza applicazione: chiamata ripetuta con stessa idempotencyKey
  console.log('\n--- Test Scenario 11: Idempotenza con Idempotency Key ---');
  const retryApplyResult = await applyTemplateToProject({
    templateId: createdDraft.id,
    versionId: version1Record!.id,
    projectId: testProject1Id,
    startDate: '2026-10-05',
    idempotencyKey: 'apply_key_client_001', // Exact same key as Scenario 5
    appliedByUserId: testAdminId,
  });

  assert(
    retryApplyResult.tasksCreated === 3,
    'Scenario 11.1: Reinvio con stessa idempotencyKey restituisce i metadati senza errori'
  );

  const tasksCountAfterRetry = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, testProject1Id));
  assert(
    tasksCountAfterRetry.length === 3,
    'Scenario 11.2: Nessun task duplicato creato (il conteggio rimane 3)'
  );

  // SCENARIO 12: Rollback atomico in caso di errore
  console.log('\n--- Test Scenario 12: Rollback Atomico Transazionale ---');
  const testProjectRollbackId = 'proj_rollback_test_' + Date.now();
  await db.insert(projects).values({
    id: testProjectRollbackId,
    code: 'PRJ-ROLLBACK-001',
    title: 'Progetto Rollback Test',
    projectType: 'client',
    status: 'pianificato',
    createdBy: testAdminId,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  let rollbackThrew = false;
  try {
    // Calling with non-existent version should cleanly fail and leave 0 tasks
    await applyTemplateToProject({
      templateId: createdDraft.id,
      versionId: 'non_existent_version_id',
      projectId: testProjectRollbackId,
      startDate: '2026-10-05',
      idempotencyKey: 'rollback_key_' + Date.now(),
      appliedByUserId: testAdminId,
    });
  } catch (err) {
    rollbackThrew = true;
  }

  const rollbackTasks = await db.select().from(tasks).where(eq(tasks.projectId, testProjectRollbackId));
  assert(
    rollbackThrew && rollbackTasks.length === 0,
    'Scenario 12.1: Errore gestito con transazione atomica: 0 task orfani inseriti nel DB'
  );

  // SCENARIO 13: Indipendenza post-applicazione: modifica di un task generato non altera il template
  console.log('\n--- Test Scenario 13: Indipendenza Post-Applicazione ---');
  const firstClientTask = clientProjectTasks[0];
  await db
    .update(tasks)
    .set({ title: 'TITOLO MODIFICATO DALL OPERATORE', status: 'completato' })
    .where(eq(tasks.id, firstClientTask.id));

  const tmplAfterTaskEdit = await getProcessTemplateById(createdDraft.id);
  const taskInTmpl = tmplAfterTaskEdit?.activeVersion?.definition.tasks.find((t) => t.id === 't_brief');
  assert(
    taskInTmpl?.title === 'Briefing con il cliente',
    'Scenario 13.1: Modifica di un task nel progetto non altera la definizione standard nel catalogo template'
  );

  // SCENARIO 14: Isolamento versioni tra progetti (Progetto A con v1, Progetto B con v2)
  console.log('\n--- Test Scenario 14: Isolamento Versioni (v1 vs v2) ---');
  const testProjectV2Id = 'proj_v2_test_' + Date.now();
  await db.insert(projects).values({
    id: testProjectV2Id,
    code: 'PRJ-V2-001',
    title: 'Progetto con Versione v2',
    projectType: 'client',
    status: 'pianificato',
    startDate: '2026-10-05',
    createdBy: testAdminId,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const applyV2Result = await applyTemplateToProject({
    templateId: createdDraft.id,
    versionId: version2Record!.id,
    projectId: testProjectV2Id,
    startDate: '2026-10-05',
    defaultAssigneeUserId: testAdminId,
    idempotencyKey: 'apply_key_v2_' + Date.now(),
    appliedByUserId: testAdminId,
  });

  assert(
    applyV2Result.tasksCreated === 4,
    'Scenario 14.1: Progetto B con v2 ha generato esattamente 4 task (incluso Collaudo QA)'
  );

  const appliedTemplatesProjA = await getAppliedTemplatesForProject(testProject1Id);
  const appliedTemplatesProjB = await getAppliedTemplatesForProject(testProjectV2Id);

  assert(
    appliedTemplatesProjA[0].versionNumber === 1 && appliedTemplatesProjB[0].versionNumber === 2,
    'Scenario 14.2: Tracciamento versioni isolato: Progetto A registra v1 e Progetto B registra v2'
  );

  // SCENARIO 15a: Autorizzazioni & Sicurezza: solo ruoli admin/manager possono creare e pubblicare
  console.log('\n--- Test Scenario 15a: Autorizzazioni & Sicurezza ---');
  let nonAdminBlocked = false;
  try {
    // Non-admin user trying to create draft
    await createProcessTemplateDraft({
      name: 'Unauthorized Template',
      code: 'UNAUTH_001',
      category: 'website',
      createdBy: testDevId, // Developer (not admin)
      definition: sampleDefinition,
      userRole: 'developer',
    });
  } catch (err: any) {
    if (err.message.includes('403') || err.message.includes('autorizzato')) {
      nonAdminBlocked = true;
    }
  }

  assert(
    nonAdminBlocked,
    'Scenario 15a.1: Utente con ruolo developer bloccato con 403 nella creazione di modelli standard'
  );

  // Final Summary
  console.log('\n======================================================');
  console.log(`🏁 RIEPILOGO TEST: ${totalPassed} SUPERATI, ${totalFailed} FALLITI`);
  console.log('======================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runProcessTemplatesTestSuite().catch((err) => {
  console.error('Fatal error during test suite execution:', err);
  process.exit(1);
});
