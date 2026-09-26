/**
 * Comprehensive Test Suite: Raccolta Materiali, Informazioni e Accessi del Cliente (Client Requests)
 * Includes granular project/record-level authorization tests, task unblocking invariants, and lifecycle edge cases.
 */

import {
  initDatabase,
  db,
  projects,
  companies,
  tasks,
  taskAssignments,
  taskDependencies,
  documents,
  users,
  projectMembers,
  clientRequests,
  clientRequestItems,
  clientRequestTaskLinks,
  requestComments,
} from '../packages/db/src/index';
import { eq, inArray } from 'drizzle-orm';
import {
  validateNoSensitiveCredentials,
  SEED_ONBOARDING_WEBSITE_MARKETING_TEMPLATE,
  matchTasksForRequest,
  computeRequestOverallStatus,
} from '../packages/ai/src/index';
import {
  createClientRequest,
  updateClientRequest,
  updateClientRequestItem,
  approveClientRequest,
  rejectClientRequest,
  addRequestComment,
  generateClientRequestsFromTemplate,
  listProjectClientRequests,
  getClientRequestById,
  getDashboardClientRequestsSummary,
} from '../apps/web/src/lib/client-requests-service';
import { isTaskBlockedByClient, isTaskBlocked } from '../apps/web/src/lib/task-graph';
import { checkUserProjectAccess, canUserAccessClientRequest, canUserAccessDocument } from '../apps/web/src/lib/auth';

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

async function runClientRequestsTestSuite() {
  console.log('\n========================================================================');
  console.log('🚀 INIZIO TEST SUITE: RACCOLTA MATERIALI & ACCESSI CLIENTE (24 SCENARI)');
  console.log('========================================================================\n');

  initDatabase();

  const timestamp = Date.now();
  const testAdminId = `usr_adm_${timestamp}`;
  const testClientId = `usr_cli_${timestamp}`;
  const testOperatorId = `usr_op_${timestamp}`;
  const testCompanyId = `comp_${timestamp}`;

  const nowIso = new Date().toISOString();

  // Create test users
  try {
    await db.insert(users).values([
      {
        id: testAdminId,
        name: 'Admin Materiali Test',
        email: `adm_${timestamp}@test.local`,
        role: 'admin',
        passwordHash: 'dummy',
        createdAt: nowIso,
      },
      {
        id: testClientId,
        name: 'Cliente JammJa Test',
        email: `cli_${timestamp}@test.local`,
        role: 'operator', // operator/client
        passwordHash: 'dummy',
        createdAt: nowIso,
      },
      {
        id: testOperatorId,
        name: 'Operatore Agenzia Test',
        email: `op_${timestamp}@test.local`,
        role: 'operator',
        passwordHash: 'dummy',
        createdAt: nowIso,
      },
    ]);
  } catch (err: any) {
    console.error('Error inserting test users:', err);
  }

  // Create test company
  try {
    await db.insert(companies).values({
      id: testCompanyId,
      name: 'JammJa S.r.l.',
      sector: 'horeca_ristoranti',
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  } catch (err: any) {
    console.error('Error inserting test company:', err);
  }

  // Create test project (Pilota: JammJa Sito Web & Marketing)
  const testProjectId = `proj_mat_${timestamp}`;
  try {
    await db.insert(projects).values({
      id: testProjectId,
      companyId: testCompanyId,
      code: `PRJ-MAT-${timestamp.toString().slice(-4)}`,
      title: 'JammJa S.r.l. - Portale Web e Campagne',
      description: 'Progetto pilota di implementazione sito web, identità visiva e marketing.',
      projectType: 'client',
      status: 'in_corso',
      startDate: '2026-10-01',
      dueDate: '2026-12-15',
      budgetHours: 80,
      managerId: testAdminId,
      createdBy: testAdminId,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  } catch (err: any) {
    console.error('Error inserting test project:', err);
  }

  // Create test tasks in project
  const taskDnsId = `tsk_dns_${timestamp}`;
  const taskDesignId = `tsk_des_${timestamp}`;
  const taskTrackingId = `tsk_trk_${timestamp}`;

  try {
    await db.insert(tasks).values([
      {
        id: taskDnsId,
        projectId: testProjectId,
        title: 'Configurazione Hosting e Puntamento DNS',
        description: 'Puntamento record A e MX su server di produzione',
        status: 'da_fare',
        priority: 'alta',
        createdBy: testAdminId,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: taskDesignId,
        projectId: testProjectId,
        title: 'Design Mockup Grafico e Stile Brand',
        description: 'Elaborazione UI kit e pagine principali',
        status: 'da_fare',
        priority: 'media',
        createdBy: testAdminId,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: taskTrackingId,
        projectId: testProjectId,
        title: 'Setup Tracciamenti Google Analytics e GTM',
        description: 'Configurazione eventi e conversioni',
        status: 'da_fare',
        priority: 'media',
        createdBy: testAdminId,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ]);

    // Assign project members for testProjectId
    await db.insert(projectMembers).values([
      {
        id: `pm_cli_${timestamp}`,
        projectId: testProjectId,
        userId: testClientId,
        projectRole: 'contributor',
        status: 'active',
        joinedAt: nowIso,
        addedBy: testAdminId,
      },
      {
        id: `pm_op_${timestamp}`,
        projectId: testProjectId,
        userId: testOperatorId,
        projectRole: 'editor',
        status: 'active',
        joinedAt: nowIso,
        addedBy: testAdminId,
      },
    ]);

    // Assign testClientId to taskDesignId so testClientId is assigned to taskDesignId
    await db.insert(taskAssignments).values({
      id: `ta_cli_${timestamp}`,
      taskId: taskDesignId,
      userId: testClientId,
      role: 'contributor',
      assignedAt: nowIso,
    });
  } catch (err: any) {
    console.error('Error inserting test tasks:', err);
  }

  // Create a test document in existing documents table
  const testDocId = `doc_logo_${timestamp}`;
  try {
    await db.insert(documents).values({
      id: testDocId,
      originalName: 'logo_jammja_vector.svg',
      fileName: 'logo_jammja_vector.svg',
      fileSize: 245000,
      sizeBytes: 245000,
      mimeType: 'image/svg+xml',
      storageKey: `key_doc_logo_${timestamp}`,
      storageProvider: 'local',
      entityType: 'project',
      entityId: testProjectId,
      uploadedBy: testAdminId,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  } catch (err: any) {
    console.error('Error inserting test document:', err);
  }

  console.log('\n--- SCENARIO 1: Creazione Richiesta Manuale con Campi Multipli ---');
  let req1: any = null;
  try {
    req1 = await createClientRequest({
      projectId: testProjectId,
      title: 'Materiali Brand & Logo Aziendale',
      description: 'Fornire file del logo e linee guida colori.',
      category: 'brand',
      priority: 'high',
      dueDate: '2026-10-15',
      blocksTaskCompletion: true,
      linkedTaskIds: [{ taskId: taskDesignId, relationType: 'blocks' }],
      requestedByUserId: testAdminId,
      items: [
        {
          label: 'Logo in formato Vettoriale (.svg o .ai)',
          description: 'Logo con sfondo trasparente ad alta risoluzione',
          itemType: 'file',
          required: true,
        },
        {
          label: 'Payoff o Slogan Ufficiale',
          description: 'Slogan aziendale da inserire nell\'header',
          itemType: 'text',
          required: false,
        },
      ],
    });

    assert(
      req1 && req1.id && req1.items.length === 2 && req1.status === 'requested',
      'Scenario 1: Richiesta creata con successo in stato "requested" con 2 item e task collegato.'
    );
  } catch (err: any) {
    assert(false, 'Scenario 1: Creazione richiesta fallita', err.message);
  }

  console.log('\n--- SCENARIO 2: Validazione Campi Obbligatori ---');
  try {
    let failedAsExpected = false;
    try {
      await createClientRequest({
        projectId: testProjectId,
        title: '   ', // Empty title
        category: 'brand',
        requestedByUserId: testAdminId,
        items: [],
      });
    } catch {
      failedAsExpected = true;
    }
    assert(failedAsExpected, 'Scenario 2: Creazione con titolo vuoto correttamente respinta con errore di validazione.');
  } catch (err: any) {
    assert(false, 'Scenario 2: Fallito', err.message);
  }

  console.log('\n--- SCENARIO 3: Inserimento Parziale dei Materiali (partially_received) ---');
  const logoItem = req1?.items?.find((i: any) => i.itemType === 'file');
  const payoffItem = req1?.items?.find((i: any) => i.itemType === 'text');

  try {
    // Fill only payoff (optional)
    await updateClientRequestItem({
      itemId: payoffItem.id,
      valueText: 'JammJa - Il gusto autentico dello street food',
      status: 'received',
      performedByUserId: testClientId,
    });

    const refreshedReq1 = await getClientRequestById(req1.id);
    assert(
      refreshedReq1?.status === 'partially_received',
      `Scenario 3: Con solo 1 item consegnato su 2 (di cui 1 obbligatorio mancante), lo stato della richiesta è "partially_received" (reale: ${refreshedReq1?.status}).`
    );
  } catch (err: any) {
    assert(false, 'Scenario 3: Fallito', err.message);
  }

  console.log('\n--- SCENARIO 4: Collegamento Documento Esistente senza Duplicazione File ---');
  try {
    await updateClientRequestItem({
      itemId: logoItem.id,
      documentId: testDocId,
      status: 'received',
      performedByUserId: testClientId,
    });

    const refreshedItem = (await getClientRequestById(req1.id))?.items?.find((i: any) => i.id === logoItem.id);

    assert(
      refreshedItem?.documentId === testDocId && (refreshedItem?.status === 'received' || refreshedItem?.status === 'under_review'),
      'Scenario 4: Documento esistente correttamente associato all\'item senza clonare o duplicare record su disco.'
    );
  } catch (err: any) {
    assert(false, 'Scenario 4: Fallito', err.message);
  }

  console.log('\n--- SCENARIO 5: Risposta Testuale a Item di Tipo Text ---');
  try {
    await updateClientRequestItem({
      itemId: payoffItem.id,
      valueText: 'JammJa - Tradizione e Innovazione Partenopea',
      status: 'received',
      performedByUserId: testClientId,
    });

    const refreshedItem = (await getClientRequestById(req1.id))?.items?.find((i: any) => i.id === payoffItem.id);

    assert(
      refreshedItem?.valueText?.includes('Partenopea'),
      'Scenario 5: Valore testuale salvato e aggiornato correttamente.'
    );
  } catch (err: any) {
    assert(false, 'Scenario 5: Fallito', err.message);
  }

  console.log('\n--- SCENARIO 6: Transizione Automatica a under_review / received ---');
  try {
    const fullReq1 = await getClientRequestById(req1.id);
    assert(
      fullReq1?.status === 'under_review' || fullReq1?.status === 'received',
      `Scenario 6: Quando tutti gli item richiesti sono consegnati, lo stato della richiesta transita a under_review/received (reale: ${fullReq1?.status}).`
    );
  } catch (err: any) {
    assert(false, 'Scenario 6: Fallito', err.message);
  }

  console.log('\n--- SCENARIO 7: Approvazione Richiesta e Sblocco Task Bloccato ---');
  try {
    // Check task status before approval
    const isBlockedBefore = isTaskBlockedByClient(taskDesignId);
    assert(isBlockedBefore, 'Scenario 7a: Prima dell\'approvazione, il task collegato risulta bloccato dalla richiesta.');

    // Approve request
    await approveClientRequest(req1.id, testAdminId, 'Logo e testi verificati e conformi.');
    const fullApprovedReq = await getClientRequestById(req1.id);

    const isBlockedAfter = isTaskBlockedByClient(taskDesignId);

    assert(
      fullApprovedReq?.status === 'approved' && !isBlockedAfter,
      'Scenario 7b: Richiesta approvata con successo e task collegato sbloccato automaticamente.'
    );
  } catch (err: any) {
    assert(false, 'Scenario 7: Fallito', err.message);
  }

  console.log('\n--- SCENARIO 8: Rifiuto Richiesta con Motivazione Obbligatoria ---');
  let req2: any = null;
  try {
    req2 = await createClientRequest({
      projectId: testProjectId,
      title: 'Accessi Google Tag Manager & Analytics',
      description: 'Conferma delega per tracciamento conversioni',
      category: 'accesses',
      priority: 'high',
      blocksTaskCompletion: true,
      linkedTaskIds: [{ taskId: taskTrackingId, relationType: 'blocks' }],
      requestedByUserId: testAdminId,
      items: [
        {
          label: 'Delega Account Google Analytics 4',
          itemType: 'access_confirmation',
          accessConfig: {
            accountService: 'Google Analytics 4',
            accessTypeRequired: 'Invito utente',
            targetEmail: 'agency@jammja.local',
            requiredLevel: 'Amministratore',
            status: 'requested',
          },
          required: true,
        },
      ],
    });

    await rejectClientRequest(
      req2.id,
      'L\'invito all\'account Google Analytics risulta ancora in stato Invito Pendente non confermato dal proprietario.',
      testAdminId
    );

    const refreshedReq2 = await getClientRequestById(req2.id);
    assert(
      refreshedReq2?.status === 'rejected' &&
        refreshedReq2.rejectionReason?.includes('Invito Pendente'),
      'Scenario 8: Richiesta rifiutata correttamente, motivazione salvata e visibile.'
    );
  } catch (err: any) {
    assert(false, 'Scenario 8: Fallito', err.message);
  }

  console.log('\n--- SCENARIO 9: Rifiuto con Motivazione Vuota Respinto ---');
  try {
    let emptyRejectFailed = false;
    try {
      await rejectClientRequest(req2.id, '   ', testAdminId);
    } catch {
      emptyRejectFailed = true;
    }
    assert(emptyRejectFailed, 'Scenario 9: Rifiuto con motivo vuoto bloccato con errore obbligatorio.');
  } catch (err: any) {
    assert(false, 'Scenario 9: Fallito', err.message);
  }

  console.log('\n--- SCENARIO 10: Task Bloccato da Più Richieste Rimane Bloccato finché Tutte non sono Approvate ---');
  try {
    // Link req2 to taskDnsId as well
    await db.insert(clientRequestTaskLinks).values({
      id: `link_multi_${timestamp}`,
      requestId: req2.id,
      taskId: taskDnsId,
      relationType: 'blocks',
      createdAt: nowIso,
    });

    // Also create req3 blocking taskDnsId
    const req3 = await createClientRequest({
      projectId: testProjectId,
      title: 'Accesso Pannello Registrar DNS',
      category: 'accesses',
      blocksTaskCompletion: true,
      linkedTaskIds: [{ taskId: taskDnsId, relationType: 'blocks' }],
      requestedByUserId: testAdminId,
      items: [{ label: 'Delega Hosting Server', itemType: 'access_confirmation', required: true }],
    });

    // Approve req2
    await approveClientRequest(req2.id, testAdminId, 'GTM approvato');

    // Check taskDnsId: req3 is still open/requested, so taskDnsId must still be blocked!
    const isDnsStillBlocked = isTaskBlockedByClient(taskDnsId);
    assert(
      isDnsStillBlocked,
      'Scenario 10: Task con più richieste bloccanti rimane correttamente bloccato finché req3 è ancora aperta.'
    );

    // Now approve req3 -> taskDnsId should be unblocked
    await approveClientRequest(req3.id, testAdminId, 'DNS approvato');
    const isDnsUnblocked = !isTaskBlockedByClient(taskDnsId);
    assert(isDnsUnblocked, 'Scenario 10b: Quando tutte le richieste bloccanti sono approvate, il task viene sbloccato.');
  } catch (err: any) {
    assert(false, 'Scenario 10: Fallito', err.message);
  }

  console.log('\n--- SCENARIO 11: Task Unblocking non marca il task come completato ---');
  try {
    const taskObj = await db.select().from(tasks).where(eq(tasks.id, taskDnsId)).get();
    assert(
      taskObj?.status === 'da_fare',
      `Scenario 11: Task sbloccato è nello stato operativo "da_fare" e NON marcato erroneamente come "completato" (status reale: ${taskObj?.status}).`
    );
  } catch (err: any) {
    assert(false, 'Scenario 11: Fallito', err.message);
  }

  console.log('\n--- SCENARIO 12: Catalogo Template Standard Onboarding (5 Categorie) ---');
  try {
    const tmpl = SEED_ONBOARDING_WEBSITE_MARKETING_TEMPLATE;
    const groupCount = tmpl.groups.length;
    const totalItems = tmpl.groups.reduce((sum, g) => sum + g.items.length, 0);

    assert(
      groupCount === 5 && totalItems >= 30,
      `Scenario 12: Template standard contiene 5 gruppi (${tmpl.groups.map((g) => g.category).join(', ')}) e ${totalItems} item totali.`
    );
  } catch (err: any) {
    assert(false, 'Scenario 12: Fallito', err.message);
  }

  console.log('\n--- SCENARIO 13: Dry-Run Preview del Generatore Onboarding ---');
  try {
    const previewResult = await generateClientRequestsFromTemplate({
      projectId: testProjectId,
      templateCode: 'ONBOARDING_WEBSITE_MARKETING',
      preview: true,
      excludedGroupIds: ['req_assets', 'req_accesses', 'req_strategy'],
      performedByUserId: testAdminId,
    });

    assert(
      previewResult.preview === true &&
        previewResult.groups.length === 2 &&
        previewResult.groups[0].matchedTasks !== undefined,
      'Scenario 13: Dry-run preview calcola correttamente le richieste e le attività collegate senza persistere record duplicati.'
    );
  } catch (err: any) {
    assert(false, 'Scenario 13: Fallito', err.message);
  }

  console.log('\n--- SCENARIO 14: Heuristic Task Matcher ---');
  try {
    const mockTasks = [
      { id: 't1', title: 'Configurazione Hosting e DNS del dominio' },
      { id: 't2', title: 'Grafica e Logo per il nuovo sito' },
      { id: 't3', title: 'Altra attività non correlata' },
    ];

    const dnsLinks = matchTasksForRequest(['dns', 'hosting', 'dominio'], mockTasks);
    const brandLinks = matchTasksForRequest(['logo', 'brand', 'grafica'], mockTasks);

    assert(
      dnsLinks.includes('t1') && brandLinks.includes('t2'),
      'Scenario 14: Il matcher euristico mappa con successo parole chiave alle attività del progetto.'
    );
  } catch (err: any) {
    assert(false, 'Scenario 14: Fallito', err.message);
  }

  console.log('\n--- SCENARIO 15: Generazione Effettiva, Deduplicazione e Idempotenza ---');
  try {
    const testProjGenId = `proj_gen_${timestamp}`;
    await db.insert(projects).values({
      id: testProjGenId,
      companyId: testCompanyId,
      code: `PRJ-GEN-${timestamp.toString().slice(-4)}`,
      title: 'Progetto Test Generazione',
      projectType: 'client',
      status: 'in_corso',
      managerId: testAdminId,
      createdBy: testAdminId,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    const idempotencyKey = `idemp_${testProjGenId}_${timestamp}`;

    // First generation
    await generateClientRequestsFromTemplate({
      projectId: testProjGenId,
      templateCode: 'ONBOARDING_WEBSITE_MARKETING',
      preview: false,
      idempotencyKey,
      performedByUserId: testAdminId,
    });

    const requestsCountAfterGen1 = (await listProjectClientRequests(testProjGenId)).requests.length;

    // Second generation with same idempotency key
    const genResult2 = await generateClientRequestsFromTemplate({
      projectId: testProjGenId,
      templateCode: 'ONBOARDING_WEBSITE_MARKETING',
      preview: false,
      idempotencyKey,
      performedByUserId: testAdminId,
    });

    const requestsCountAfterGen2 = (await listProjectClientRequests(testProjGenId)).requests.length;

    assert(
      requestsCountAfterGen1 === 5 && requestsCountAfterGen2 === 5 && genResult2.totalRequestsGenerated === 0,
      `Scenario 15: Generazione idempotente completata (${requestsCountAfterGen1} richieste totali). Re-esecuzione non genera doppioni.`
    );
  } catch (err: any) {
    assert(false, 'Scenario 15: Fallito', err.message);
  }

  console.log('\n--- SCENARIO 16: Esclusione Selettiva di Categorie o Item ---');
  try {
    const testProj2Id = `proj_excl_${timestamp}`;
    await db.insert(projects).values({
      id: testProj2Id,
      companyId: testCompanyId,
      code: `PRJ-EXCL-${timestamp.toString().slice(-4)}`,
      title: 'Progetto Test Esclusioni',
      projectType: 'client',
      status: 'in_corso',
      managerId: testAdminId,
      createdBy: testAdminId,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    const genResultExcl = await generateClientRequestsFromTemplate({
      projectId: testProj2Id,
      templateCode: 'ONBOARDING_WEBSITE_MARKETING',
      excludedGroupIds: ['req_contents', 'req_assets', 'req_accesses', 'req_strategy'], // Keep only brand
      excludedItemIds: ['item_palette_colori', 'item_font_manuale_brand'],
      preview: false,
      performedByUserId: testAdminId,
    });

    const brandReq = (await listProjectClientRequests(testProj2Id)).requests?.[0];
    const createdLabels = brandReq?.items?.map((it: any) => it.label) || [];

    const cond =
      genResultExcl.totalRequestsGenerated === 1 &&
      brandReq?.items?.length === 3 &&
      !createdLabels.some((l: string) => l.includes('Palette colori')) &&
      !createdLabels.some((l: string) => l.includes('Font e Manuale'));

    assert(
      cond,
      'Scenario 16: Esclusione selettiva di gruppi e item specifici applicata con successo.'
    );
  } catch (err: any) {
    assert(false, 'Scenario 16: Fallito', err.message);
  }

  console.log('\n--- SCENARIO 17: Protezione Credenziali & Anti-Leak GDPR ---');
  try {
    const testCases = [
      { text: 'Ecco la password: SuperSecret123!', expectValid: false },
      { text: 'Il token è bearer eyJhbGciOi012345678901234567890123456789', expectValid: false },
      { text: 'api_key: sk-1234567890abcdef1234567890', expectValid: false },
      { text: '-----BEGIN RSA PRIVATE KEY-----', expectValid: false },
      { text: 'Abbiamo invitato agency@domain.it come editor su Google Search Console', expectValid: true },
      { text: 'I colori del brand sono #FF0000 e #FFFFFF', expectValid: true },
    ];

    let allCorrect = true;
    for (const tc of testCases) {
      const res = validateNoSensitiveCredentials(tc.text);
      if (res.isValid !== tc.expectValid) {
        allCorrect = false;
      }
    }

    assert(allCorrect, 'Scenario 17: Validatore anti-credenziali intercetta password/token/chiavi e accetta testi normali.');
  } catch (err: any) {
    assert(false, 'Scenario 17: Fallito', err.message);
  }

  console.log('\n--- SCENARIO 18: Gestione Sicura degli Accessi Strutturati ---');
  try {
    await updateClientRequestItem({
      itemId: req2.items[0].id,
      accessConfig: {
        accountService: 'Google Tag Manager',
        accessTypeRequired: 'Invito utente',
        targetEmail: 'marketing@jammja.local',
        requiredLevel: 'Publish Permission',
        status: 'granted',
      },
      status: 'received',
      performedByUserId: testClientId,
    });

    const refreshedItem = (await getClientRequestById(req2.id))?.items?.find((i: any) => i.id === req2.items[0].id);

    assert(
      refreshedItem?.accessConfig?.accountService === 'Google Tag Manager' &&
        refreshedItem?.accessConfig?.targetEmail === 'marketing@jammja.local' &&
        refreshedItem?.accessConfig?.requiredLevel === 'Publish Permission',
      'Scenario 18: Metadati di accesso strutturato registrati in sicurezza senza memorizzazione di credenziali segrete.'
    );
  } catch (err: any) {
    assert(false, 'Scenario 18: Fallito', err.message);
  }

  console.log('\n--- SCENARIO 19: Note Interne vs Commenti Visibili al Cliente ---');
  try {
    const internalNote = await addRequestComment({
      requestId: req1.id,
      authorUserId: testAdminId,
      content: 'Nota riservata per il PM: verificare se il logo soddisfa i requisiti di stampa.',
      visibility: 'internal',
    });

    const publicComment = await addRequestComment({
      requestId: req1.id,
      authorUserId: testClientId,
      content: 'Abbiamo caricato il logo vettoriale aggiornato.',
      visibility: 'client',
    });

    const refreshedReq = await getClientRequestById(req1.id);
    const comments = refreshedReq?.comments || [];

    const foundInternal = comments.find((c: any) => c.id === internalNote.id);
    const foundPublic = comments.find((c: any) => c.id === publicComment.id);

    assert(
      foundInternal?.visibility === 'internal' &&
        foundPublic?.visibility === 'client' &&
        comments.length >= 2,
      'Scenario 19: Separazione tra note riservate interne e comunicazioni visibili al cliente verificata.'
    );
  } catch (err: any) {
    assert(false, 'Scenario 19: Fallito', err.message);
  }

  console.log('\n--- SCENARIO 20: KPI e Dashboard Summary Aggregati ---');
  try {
    const projData = await listProjectClientRequests(testProjectId);
    const dashboardSummary = await getDashboardClientRequestsSummary();

    assert(
      dashboardSummary &&
        typeof dashboardSummary.pendingClientCount === 'number' &&
        typeof dashboardSummary.toValidateCount === 'number' &&
        projData.requests.length >= 2 &&
        typeof projData.kpis.totalRequests === 'number',
      `Scenario 20: KPI e statistiche aggregate calcolate correttamente (Pending: ${dashboardSummary?.pendingClientCount}, To Validate: ${dashboardSummary?.toValidateCount}, Progetto: ${projData.kpis.totalRequests}).`
    );
  } catch (err: any) {
    assert(false, 'Scenario 20: Fallito', err.message);
  }

  // --------------------------------------------------------------------------
  // SCENARIO 21: AUTORIZZAZIONE GRANULARE PROGETTO/RECORD (OPERATORE A VS B)
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO 21: Autorizzazione Granulare a Livello di Record/Progetto (403 Forbidden) ---');
  try {
    const opA_Id = `usr_op_A_${timestamp}`;
    const opB_Id = `usr_op_B_${timestamp}`;
    const projA_Id = `prj_A_${timestamp}`;
    const projB_Id = `prj_B_${timestamp}`;
    const compA_Id = `comp_A_${timestamp}`;
    const compB_Id = `comp_B_${timestamp}`;

    // 1. Inserisci due operatori distinti
    await db.insert(users).values([
      { id: opA_Id, name: 'Operatore Progetto A', email: `op_a_${timestamp}@agency.local`, role: 'operator', passwordHash: 'x', createdAt: nowIso },
      { id: opB_Id, name: 'Operatore Progetto B', email: `op_b_${timestamp}@agency.local`, role: 'operator', passwordHash: 'x', createdAt: nowIso },
    ]);

    await db.insert(companies).values([
      { id: compA_Id, name: 'Azienda Cliente Alfa', sector: 'ecommerce', createdAt: nowIso, updatedAt: nowIso },
      { id: compB_Id, name: 'Azienda Cliente Beta', sector: 'local_services', createdAt: nowIso, updatedAt: nowIso },
    ]);

    // 2. Inserisci due progetti con manager distinti (Progetto A assegnato a Op A, Progetto B assegnato a Op B)
    await db.insert(projects).values([
      { id: projA_Id, companyId: compA_Id, code: `PRJ-A-${timestamp.toString().slice(-4)}`, title: 'Progetto Alfa', projectType: 'client', status: 'in_corso', managerId: opA_Id, createdBy: opA_Id, createdAt: nowIso, updatedAt: nowIso },
      { id: projB_Id, companyId: compB_Id, code: `PRJ-B-${timestamp.toString().slice(-4)}`, title: 'Progetto Beta', projectType: 'client', status: 'in_corso', managerId: opB_Id, createdBy: opB_Id, createdAt: nowIso, updatedAt: nowIso },
    ]);

    // 3. Crea una richiesta su Progetto B
    const reqB = await createClientRequest({
      projectId: projB_Id,
      title: 'Materiali Riservati Progetto B',
      category: 'brand',
      requestedByUserId: opB_Id,
      items: [{ label: 'Documento Strategia Beta', itemType: 'file', required: true }],
    });

    const docB_Id = `doc_beta_${timestamp}`;
    await db.insert(documents).values({
      id: docB_Id,
      originalName: 'strategia_beta_riservata.pdf',
      fileName: 'strategia_beta_riservata.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 88000,
      fileSize: 88000,
      storageKey: `key_doc_beta_${timestamp}`,
      storageProvider: 'local',
      entityType: 'client_request',
      entityId: reqB.id,
      uploadedBy: opB_Id,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    const userOpA = { userId: opA_Id, role: 'operator' };
    const userOpB = { userId: opB_Id, role: 'operator' };
    const userAdmin = { userId: testAdminId, role: 'admin' };

    // Test a) Operatore A tenta di leggere la lista richieste del Progetto B
    let listB_blocked = false;
    try {
      await listProjectClientRequests(projB_Id, {}, userOpA);
    } catch (err: any) {
      if (err.message.includes('FORBIDDEN')) listB_blocked = true;
    }
    assert(listB_blocked, 'Scenario 21a: Operatore A riceve 403 Forbidden nel listare le richieste del Progetto B.');

    // Test b) Operatore A tenta di leggere direttamente la richiesta B
    let getB_blocked = false;
    try {
      await getClientRequestById(reqB.id, userOpA);
    } catch (err: any) {
      if (err.message.includes('FORBIDDEN')) getB_blocked = true;
    }
    assert(getB_blocked, 'Scenario 21b: Operatore A riceve 403 Forbidden nel leggere la richiesta del Progetto B.');

    // Test c) Operatore A tenta di modificare un item della richiesta B
    let updateItemB_blocked = false;
    try {
      await updateClientRequestItem({
        itemId: reqB.items[0].id,
        valueText: 'Modifica non autorizzata da Op A',
        performedByUserId: opA_Id,
      }, userOpA);
    } catch (err: any) {
      if (err.message.includes('FORBIDDEN')) updateItemB_blocked = true;
    }
    assert(updateItemB_blocked, 'Scenario 21c: Operatore A riceve 403 Forbidden nel modificare item della richiesta B.');

    // Test d) Operatore A tenta di approvare la richiesta B
    let approveB_blocked = false;
    try {
      await approveClientRequest(reqB.id, opA_Id, 'Approvazione non autorizzata', userOpA);
    } catch (err: any) {
      if (err.message.includes('FORBIDDEN')) approveB_blocked = true;
    }
    assert(approveB_blocked, 'Scenario 21d: Operatore A riceve 403 Forbidden nell\'approvare la richiesta B.');

    // Test e) Operatore A tenta di rifiutare la richiesta B
    let rejectB_blocked = false;
    try {
      await rejectClientRequest(reqB.id, 'Rifiuto non autorizzato', opA_Id, userOpA);
    } catch (err: any) {
      if (err.message.includes('FORBIDDEN')) rejectB_blocked = true;
    }
    assert(rejectB_blocked, 'Scenario 21e: Operatore A riceve 403 Forbidden nel rifiutare la richiesta B.');

    // Test f) Operatore A tenta di scaricare il documento collegato alla richiesta B
    const docB_Access_OpA = canUserAccessDocument(userOpA, docB_Id);
    assert(!docB_Access_OpA, 'Scenario 21f: Operatore A riceve 403 Forbidden nel tentativo di scaricare il documento B.');

    // Test g) Operatore B autorizzato accede regolarmente a Progetto B e Documento B
    const docB_Access_OpB = canUserAccessDocument(userOpB, docB_Id);
    const reqB_Access_OpB = !!(await getClientRequestById(reqB.id, userOpB));
    assert(docB_Access_OpB && reqB_Access_OpB, 'Scenario 21g: Operatore B autorizzato legge e gestisce regolarmente la richiesta B e il documento B.');

    // Test h) Admin super-user accede a entrambi i progetti
    const docB_Access_Admin = canUserAccessDocument(userAdmin, docB_Id);
    const reqB_Access_Admin = !!(await getClientRequestById(reqB.id, userAdmin));
    assert(docB_Access_Admin && reqB_Access_Admin, 'Scenario 21h: Admin super-user ha accesso confermato a tutti i progetti e documenti.');
  } catch (err: any) {
    assert(false, 'Scenario 21: Fallito', err.message);
  }

  // --------------------------------------------------------------------------
  // SCENARIO 22: CONSERVAZIONE DELLO STATO OPERATIVO (in_corso / in_revisione)
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO 22: Preservazione degli Stati Operativi (in_corso e in_revisione) ---');
  try {
    const tskInCorso = `tsk_inc_${timestamp}`;
    const tskInRev = `tsk_rev_${timestamp}`;

    await db.insert(tasks).values([
      { id: tskInCorso, projectId: testProjectId, title: 'Task in_corso Test', status: 'in_corso', priority: 'alta', createdBy: testAdminId, createdAt: nowIso, updatedAt: nowIso },
      { id: tskInRev, projectId: testProjectId, title: 'Task in_revisione Test', status: 'in_revisione', priority: 'media', createdBy: testAdminId, createdAt: nowIso, updatedAt: nowIso },
    ]);

    const reqStatePreserve = await createClientRequest({
      projectId: testProjectId,
      title: 'Richiesta Materiali per Task in Corso e Revisione',
      category: 'brand',
      blocksTaskCompletion: true,
      linkedTaskIds: [
        { taskId: tskInCorso, relationType: 'blocks' },
        { taskId: tskInRev, relationType: 'blocks' },
      ],
      requestedByUserId: testAdminId,
      items: [{ label: 'Documento di Test', itemType: 'file', required: true }],
    });

    assert(
      isTaskBlockedByClient(tskInCorso) && isTaskBlockedByClient(tskInRev),
      'Scenario 22a: Task in_corso e in_revisione risultano bloccati prima dell\'approvazione.'
    );

    // Approviamo la richiesta
    await approveClientRequest(reqStatePreserve.id, testAdminId, 'Approvato');

    const statusInCorsoAfter = (await db.select().from(tasks).where(eq(tasks.id, tskInCorso)).get())?.status;
    const statusInRevAfter = (await db.select().from(tasks).where(eq(tasks.id, tskInRev)).get())?.status;

    assert(
      statusInCorsoAfter === 'in_corso' &&
        statusInRevAfter === 'in_revisione' &&
        !isTaskBlockedByClient(tskInCorso) &&
        !isTaskBlockedByClient(tskInRev),
      `Scenario 22b: Task "in_corso" resta "in_corso" (${statusInCorsoAfter}) e task "in_revisione" resta "in_revisione" (${statusInRevAfter}) con blocco cliente rimosso.`
    );
  } catch (err: any) {
    assert(false, 'Scenario 22: Fallito', err.message);
  }

  // --------------------------------------------------------------------------
  // SCENARIO 23: CICLO RIFIUTO -> NUOVA CONSEGNA -> NUOVA APPROVAZIONE
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO 23: Ciclo Rifiuto -> Nuova Consegna -> Nuova Approvazione ---');
  try {
    const reqCycle = await createClientRequest({
      projectId: testProjectId,
      title: 'Accessi DNS e Hosting',
      category: 'accesses',
      priority: 'high',
      requestedByUserId: testAdminId,
      items: [{ label: 'Puntamenti DNS Record A', itemType: 'text', required: true }],
    });

    // 1. Prima consegna parziale/errata
    await updateClientRequestItem({
      itemId: reqCycle.items[0].id,
      valueText: 'IP 192.168.1.1 (errato)',
      status: 'received',
      performedByUserId: testClientId,
    });

    const reqBeforeReject = await getClientRequestById(reqCycle.id);
    assert(reqBeforeReject?.status === 'received', 'Scenario 23a: Prima consegna registrata in stato received.');

    // 2. Rifiuto con motivazione
    await rejectClientRequest(reqCycle.id, 'L\'indirizzo IP fornito è un IP locale privato non raggiungibile.', testAdminId);
    const reqAfterReject = await getClientRequestById(reqCycle.id);
    assert(
      reqAfterReject?.status === 'rejected' && reqAfterReject.rejectionReason?.includes('IP locale'),
      'Scenario 23b: Richiesta rifiutata correttamente con motivazione salvata.'
    );

    // 3. Nuova consegna corretta da parte del cliente
    await updateClientRequestItem({
      itemId: reqCycle.items[0].id,
      valueText: 'IP Pubblico 77.83.143.220 corretto',
      status: 'received',
      performedByUserId: testClientId,
    });

    const reqAfterResubmit = await getClientRequestById(reqCycle.id);
    assert(
      reqAfterResubmit?.status === 'received',
      `Scenario 23c: Nuova consegna transita automaticamente lo stato della richiesta a "received" (reale: ${reqAfterResubmit?.status}).`
    );

    // 4. Seconda approvazione da parte del PM
    await approveClientRequest(reqCycle.id, testAdminId, 'Nuovo IP pubblico verificato con successo.');
    const reqFinal = await getClientRequestById(reqCycle.id);
    assert(
      reqFinal?.status === 'approved' && reqFinal.rejectionReason === null,
      'Scenario 23d: Seconda approvazione completata con successo e motivazione di rifiuto azzerata.'
    );
  } catch (err: any) {
    assert(false, 'Scenario 23: Fallito', err.message);
  }

  // --------------------------------------------------------------------------
  // SCENARIO 24: TASK BLOCCATO PER DIPENDENZE NON VIENE SBLOCCATO PER ERRORE
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO 24: Task Bloccato per Dipendenze Predecessori non viene sbloccato per errore ---');
  try {
    const tskPredId = `tsk_pred_${timestamp}`;
    const tskSuccId = `tsk_succ_${timestamp}`;

    // Inserisci due task: Successore dipende da Predecessore non ancora completato
    await db.insert(tasks).values([
      { id: tskPredId, projectId: testProjectId, title: 'Task Predecessore (In corso)', status: 'in_corso', priority: 'alta', createdBy: testAdminId, createdAt: nowIso, updatedAt: nowIso },
      { id: tskSuccId, projectId: testProjectId, title: 'Task Successore (Bloccato da Predecessore)', status: 'bloccato', priority: 'alta', createdBy: testAdminId, createdAt: nowIso, updatedAt: nowIso },
    ]);

    // Inserisci dipendenza Gantt
    await db.insert(taskDependencies).values({
      id: `dep_${timestamp}`,
      predecessorTaskId: tskPredId,
      successorTaskId: tskSuccId,
      dependencyType: 'finish_to_start',
      createdAt: nowIso,
    });

    // Inserisci una richiesta cliente collegata al Successore
    const reqDepTest = await createClientRequest({
      projectId: testProjectId,
      title: 'Materiale Grafico per Task Successore',
      category: 'brand',
      blocksTaskCompletion: true,
      linkedTaskIds: [{ taskId: tskSuccId, relationType: 'blocks' }],
      requestedByUserId: testAdminId,
      items: [{ label: 'Icone Brand', itemType: 'file', required: true }],
    });

    // Verifica che prima dell'approvazione il task è bloccato sia da cliente che da predecessore
    assert(
      isTaskBlocked(tskSuccId) === true && isTaskBlockedByClient(tskSuccId) === true,
      'Scenario 24a: Task successore inizialmente bloccato sia da predecessore Gantt che da richiesta cliente.'
    );

    // Approviamo la richiesta cliente
    await approveClientRequest(reqDepTest.id, testAdminId, 'Icone approvate.');

    // Verifica lo stato del task successore: NON deve essere sbloccato a 'da_fare', deve rimanere 'bloccato' perché il predecessore non è completato!
    const succTaskAfter = await db.select().from(tasks).where(eq(tasks.id, tskSuccId)).get();

    assert(
      succTaskAfter?.status === 'bloccato' && isTaskBlocked(tskSuccId) === true,
      `Scenario 24b: Task con dipendenza incompiuta rimane correttamente nello stato "bloccato" (reale: ${succTaskAfter?.status}) e non viene sbloccato per errore.`
    );
  } catch (err: any) {
    assert(false, 'Scenario 24: Fallito', err.message);
  }

  console.log('\n========================================================================');
  console.log(`📊 RISULTATI FINALI TEST SUITE: ${totalPassed} PASSATI, ${totalFailed} FALLITI`);
  console.log('========================================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runClientRequestsTestSuite().catch((err) => {
  console.error('Fatal error in client requests test suite:', err);
  process.exit(1);
});
