import {
  db,
  users,
  sessions,
  projects,
  projectMembers,
  userInvitations,
  tasks,
  taskAssignments,
  clientRequests,
  clientRequestItems,
  clientRequestTaskLinks,
  initDatabase,
} from '@ai-crm/db';
import { eq, and, or, sql } from 'drizzle-orm';
import {
  createUserByAdmin,
  createInvitationToken,
  getInvitationByToken,
  activateUserInvitation,
  updateUser,
  listTeamUsers,
  getProjectMembers,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
  getAvailableTaskAssignees,
} from '../apps/web/src/lib/team-service';
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  getUserProjectRole,
  checkUserProjectAccess,
  canUserEditTask,
  canUserManageProjectContent,
  canUserManageProjectTeam,
  canUserAccessClientRequest,
  canUserAccessDocument,
  ProjectRole,
} from '../apps/web/src/lib/auth';
import {
  createClientRequest,
  approveClientRequest,
  rejectClientRequest,
  submitClientRequestItem,
} from '../apps/web/src/lib/client-requests-service';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

async function runTestSuite() {
  console.log('===============================================================');
  console.log('🚀 SUITE DI TEST COMPLETA: TEAM & PERMESSI (Access Control)');
  console.log('===============================================================\n');

  const now = new Date().toISOString();
  const testId = `test_${Date.now()}`;

  // 0. Setup test actors
  console.log('--- SCENARIO 0: Setup Utenti di Test ---');
  const adminId = `usr_adm_${testId}`;
  const opManagerId = `usr_man_${testId}`;
  const opEditorId = `usr_edt_${testId}`;
  const opContribId = `usr_cnt_${testId}`;
  const opViewerId = `usr_viw_${testId}`;
  const opExternalId = `usr_ext_${testId}`;

  const defaultPassword = 'TestPassword123!';
  const defaultHash = await hashPassword(defaultPassword);

  // Inserimento attori
  db.insert(users).values([
    {
      id: adminId,
      name: 'Admin Test',
      email: `admin_${testId}@test.local`,
      passwordHash: defaultHash,
      role: 'admin',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: opManagerId,
      name: 'Manager Operatore',
      email: `manager_${testId}@test.local`,
      passwordHash: defaultHash,
      role: 'operator',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: opEditorId,
      name: 'Editor Operatore',
      email: `editor_${testId}@test.local`,
      passwordHash: defaultHash,
      role: 'operator',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: opContribId,
      name: 'Contributor Operatore',
      email: `contrib_${testId}@test.local`,
      passwordHash: defaultHash,
      role: 'operator',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: opViewerId,
      name: 'Viewer Operatore',
      email: `viewer_${testId}@test.local`,
      passwordHash: defaultHash,
      role: 'operator',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: opExternalId,
      name: 'External Operatore (Non Membro)',
      email: `external_${testId}@test.local`,
      passwordHash: defaultHash,
      role: 'operator',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
  ]).run();

  console.log('✓ Utenti di test creati con successo nel database.\n');

  // 1. Creazione Utente da Admin vs Tentativo non autorizzato
  console.log('--- SCENARIO 1: Creazione Utente Admin vs Controlli Ruolo ---');
  const createdUser = await createUserByAdmin({
    name: 'Nuovo Collaboratore',
    email: `collaboratore_${testId}@test.local`,
    role: 'operator',
    password: 'InitialPassword123!',
    createdBy: adminId,
  });
  assert(!!createdUser.userId, 'Admin ha creato con successo un nuovo operatore con password');
  assert(createdUser.status === 'active', 'Il nuovo utente ha status "active"');

  // Tentativo di creare utente con email duplicata -> deve fallire
  try {
    await createUserByAdmin({
      name: 'Duplicato',
      email: `collaboratore_${testId}@test.local`,
      role: 'operator',
      password: 'InitialPassword123!',
      createdBy: adminId,
    });
    assert(false, 'Dovrebbe lanciare errore su email duplicata');
  } catch (err: any) {
    assert(err.message === 'EMAIL_ALREADY_EXISTS', 'Email duplicata correttamente respinta con EMAIL_ALREADY_EXISTS');
  }

  // 2. Generazione e Uso Token Invito Monouso
  console.log('\n--- SCENARIO 2: Inviti Monouso, Scadenza e Attivazione ---');
  const invitedUser = await createUserByAdmin({
    name: 'Operatore Da Invitare',
    email: `invited_${testId}@test.local`,
    role: 'operator',
    createInviteToken: true,
    createdBy: adminId,
  });

  assert(!!invitedUser.inviteToken, 'Token di invito monouso generato');
  const token = invitedUser.inviteToken!;

  // Verifica validità token
  const tokenCheck = getInvitationByToken(token);
  assert(tokenCheck?.success === true, 'Token di invito risulta valido e non scaduto');

  // Attivazione account con impostazione nuova password
  const activationRes = await activateUserInvitation(token, 'MySecurePassword2026!');
  assert(activationRes.success === true, 'Account attivato con successo tramite token');

  // Verifica che la nuova password funzioni
  const activatedUser = db.select().from(users).where(eq(users.id, invitedUser.userId)).get()!;
  const passMatch = await verifyPassword('MySecurePassword2026!', activatedUser.passwordHash);
  assert(passMatch, 'La nuova password impostata corrisponde all\'hash salvato');
  assert(!!activatedUser.activatedAt, 'activatedAt valorizzato dopo l\'attivazione');

  // Tentativo di riuso dello stesso token -> deve essere rifiutato
  try {
    await activateUserInvitation(token, 'AnotherPassword123!');
    assert(false, 'Il token riutilizzato dovrebbe essere respinto');
  } catch (err: any) {
    assert(err.message === 'TOKEN_ALREADY_USED', 'Tentativo di riuso token respinto con TOKEN_ALREADY_USED');
  }

  // 3. Utente Disattivato: Sessione Revocata e Login Respinto
  console.log('\n--- SCENARIO 3: Utente Disattivato e Revoca Istantanea Sessione ---');
  // Crea sessione JWT per opContribId
  const contribToken = await createSessionToken({
    userId: opContribId,
    email: `contrib_${testId}@test.local`,
    name: 'Contributor Operatore',
    role: 'operator',
    status: 'active',
  });

  // Verifica che la sessione sia valida quando l'utente è attivo
  const validSession = await verifySessionToken(contribToken);
  assert(validSession !== null, 'Sessione JWT valida per utente attivo');

  // Disattivazione utente
  await updateUser(opContribId, { status: 'inactive' });
  const dbContrib = db.select().from(users).where(eq(users.id, opContribId)).get()!;
  assert(dbContrib.status === 'inactive', 'Utente impostato su status "inactive"');

  // Verifica immediata: la sessione JWT esistente DEVE essere respinta all'istante
  const revokedSession = await verifySessionToken(contribToken);
  assert(revokedSession === null, 'Sessione JWT esistente IMMEDIATAMENTE invalidata per utente disattivato');

  // Riattivazione utente per i test successivi
  await updateUser(opContribId, { status: 'active' });
  const restoredSession = await verifySessionToken(contribToken);
  assert(restoredSession !== null, 'Sessione ripristinata dopo la riattivazione utente');

  // 4. Setup Progetti e Assegnazione Membri con Ruoli Diversi
  console.log('\n--- SCENARIO 4: Gestione Membri di Progetto e Ruoli ---');
  const projA_Id = `prj_A_${testId}`;
  const projB_Id = `prj_B_${testId}`;

  db.insert(projects).values([
    {
      id: projA_Id,
      code: `PRJ-A-${testId.slice(-4)}`,
      title: 'Progetto Pilota A',
      projectType: 'client',
      status: 'in_corso',
      managerId: opManagerId,
      createdBy: adminId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: projB_Id,
      code: `PRJ-B-${testId.slice(-4)}`,
      title: 'Progetto Riservato B',
      projectType: 'client',
      status: 'in_corso',
      managerId: adminId,
      createdBy: adminId,
      createdAt: now,
      updatedAt: now,
    },
  ]).run();

  // Assegnazione membri a Progetto A
  addProjectMember({ projectId: projA_Id, userId: opManagerId, projectRole: 'manager', addedBy: adminId });
  addProjectMember({ projectId: projA_Id, userId: opEditorId, projectRole: 'editor', addedBy: adminId });
  addProjectMember({ projectId: projA_Id, userId: opContribId, projectRole: 'contributor', addedBy: adminId });
  addProjectMember({ projectId: projA_Id, userId: opViewerId, projectRole: 'viewer', addedBy: adminId });

  const membersA = getProjectMembers(projA_Id);
  assert(membersA.length === 4, 'Progetto A ha esattamente 4 membri registrati');
  assert(getUserProjectRole({ userId: opManagerId, role: 'operator' }, projA_Id) === 'manager', 'opManager ha ruolo "manager" nel Progetto A');
  assert(getUserProjectRole({ userId: opEditorId, role: 'operator' }, projA_Id) === 'editor', 'opEditor ha ruolo "editor" nel Progetto A');
  assert(getUserProjectRole({ userId: opContribId, role: 'operator' }, projA_Id) === 'contributor', 'opContrib ha ruolo "contributor" nel Progetto A');
  assert(getUserProjectRole({ userId: opViewerId, role: 'operator' }, projA_Id) === 'viewer', 'opViewer ha ruolo "viewer" nel Progetto A');
  assert(getUserProjectRole({ userId: opExternalId, role: 'operator' }, projA_Id) === null, 'opExternal NON ha alcun ruolo nel Progetto A (null)');

  // 5. Matrice Permessi e Controlli Cross-Progetto
  console.log('\n--- SCENARIO 5: Matrice Permessi e Controlli Cross-Progetto ---');
  // 5.1 Accesso al Progetto
  assert(checkUserProjectAccess({ userId: adminId, role: 'admin' }, projA_Id, 'viewer') === true, 'Admin globale: accesso consentito (viewer)');
  assert(checkUserProjectAccess({ userId: adminId, role: 'admin' }, projA_Id, 'manager') === true, 'Admin globale: accesso consentito (manager)');
  assert(checkUserProjectAccess({ userId: opViewerId, role: 'operator' }, projA_Id, 'viewer') === true, 'Viewer: accesso in lettura consentito');
  assert(checkUserProjectAccess({ userId: opViewerId, role: 'operator' }, projA_Id, 'editor') === false, 'Viewer: permessi editor RESPINTI (false)');
  assert(checkUserProjectAccess({ userId: opExternalId, role: 'operator' }, projA_Id, 'viewer') === false, 'Operatore non membro: accesso in lettura RESPINTA (false)');

  // 5.2 Creazione e Gestione Task
  const taskA1_Id = `tsk_A1_${testId}`;
  const taskA2_Id = `tsk_A2_${testId}`;

  db.insert(tasks).values([
    {
      id: taskA1_Id,
      projectId: projA_Id,
      title: 'Task Assegnato a Contributor',
      status: 'in_corso',
      priority: 'alta',
      createdBy: adminId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: taskA2_Id,
      projectId: projA_Id,
      title: 'Task Assegnato a Nessuno',
      status: 'da_fare',
      priority: 'media',
      createdBy: adminId,
      createdAt: now,
      updatedAt: now,
    },
  ]).run();

  // Assegna taskA1 a opContribId
  db.insert(taskAssignments).values({
    id: `ta_1_${testId}`,
    taskId: taskA1_Id,
    userId: opContribId,
    role: 'contributor',
    assignedAt: now,
  }).run();

  // Verifica permessi modifica task
  assert(canUserEditTask({ userId: adminId, role: 'admin' }, taskA1_Id) === true, 'Admin: può modificare task A1');
  assert(canUserEditTask({ userId: opManagerId, role: 'operator' }, taskA1_Id) === true, 'Manager: può modificare qualsiasi task nel progetto');
  assert(canUserEditTask({ userId: opEditorId, role: 'operator' }, taskA1_Id) === true, 'Editor: può modificare qualsiasi task nel progetto');
  assert(canUserEditTask({ userId: opContribId, role: 'operator' }, taskA1_Id) === true, 'Contributor: PUÒ modificare il task A1 a lui assegnato');
  assert(canUserEditTask({ userId: opContribId, role: 'operator' }, taskA2_Id) === false, 'Contributor: NON può modificare il task A2 non assegnato a lui (403)');
  assert(canUserEditTask({ userId: opViewerId, role: 'operator' }, taskA1_Id) === false, 'Viewer: NON può modificare alcun task (403)');
  assert(canUserEditTask({ userId: opExternalId, role: 'operator' }, taskA1_Id) === false, 'Non membro: NON può modificare alcun task (403)');

  // 5.3 Permessi Client Requests (Creazione, Approvazione, Rifiuto)
  const reqA_Id = `req_A_${testId}`;
  db.insert(clientRequests).values({
    id: reqA_Id,
    projectId: projA_Id,
    title: 'Richiesta Materiali Grafici',
    status: 'requested',
    category: 'materials',
    priority: 'high',
    requestedByUserId: adminId,
    createdAt: now,
    updatedAt: now,
  }).run();

  assert(canUserAccessClientRequest({ userId: opViewerId, role: 'operator' }, reqA_Id, 'view') === true, 'Viewer: può visualizzare la richiesta cliente');
  assert(canUserAccessClientRequest({ userId: opViewerId, role: 'operator' }, reqA_Id, 'edit') === false, 'Viewer: non può modificare la richiesta (403)');
  assert(canUserAccessClientRequest({ userId: opViewerId, role: 'operator' }, reqA_Id, 'approve') === false, 'Viewer: non può approvare la richiesta (403)');
  assert(canUserAccessClientRequest({ userId: opContribId, role: 'operator' }, reqA_Id, 'approve') === false, 'Contributor: non può approvare la richiesta (403)');
  assert(canUserAccessClientRequest({ userId: opEditorId, role: 'operator' }, reqA_Id, 'approve') === false, 'Editor: non può approvare la richiesta (solo manager/admin) (403)');
  assert(canUserAccessClientRequest({ userId: opManagerId, role: 'operator' }, reqA_Id, 'approve') === true, 'Manager: PUÒ approvare/rifiutare la richiesta');
  assert(canUserAccessClientRequest({ userId: adminId, role: 'admin' }, reqA_Id, 'approve') === true, 'Admin: PUÒ approvare/rifiutare la richiesta');

  // 6. Rimozione Membro con Task Aperti (Warning & Blocco)
  console.log('\n--- SCENARIO 6: Rimozione Membro con Task Aperti ---');
  // opContribId ha taskA1 aperto in projA_Id
  const removeAttempt = removeProjectMember(projA_Id, opContribId, false);
  assert(removeAttempt.success === false, 'Tentativo di rimozione senza force fallito');
  assert(removeAttempt.hasOpenTasks === true, 'Segnalata presenza di task aperti (hasOpenTasks = true)');
  assert(removeAttempt.openTasksCount === 1, 'Conteggio task aperti corretto (= 1)');

  // Rimozione forzata con force = true
  const forceRemove = removeProjectMember(projA_Id, opContribId, true);
  assert(forceRemove.success === true, 'Rimozione forzata con force=true completata con successo');
  assert(getUserProjectRole({ userId: opContribId, role: 'operator' }, projA_Id) === null, 'opContribId rimosso dal team del Progetto A');

  // 7. Selezione Assegnatari Task Limitata ai Soli Membri
  console.log('\n--- SCENARIO 7: Restrizione Assegnatari ai Soli Membri di Progetto ---');
  const assigneesProjA = getAvailableTaskAssignees(projA_Id);
  const assigneeUserIds = assigneesProjA.map((u) => u.id);
  assert(!assigneeUserIds.includes(opContribId), 'opContrib (rimosso) NON compare tra gli assegnatari selezionabili');
  assert(!assigneeUserIds.includes(opExternalId), 'opExternal (non membro) NON compare tra gli assegnatari selezionabili');
  assert(assigneeUserIds.includes(opManagerId), 'opManager compare tra gli assegnatari');
  assert(assigneeUserIds.includes(opEditorId), 'opEditor compare tra gli assegnatari');
  assert(assigneeUserIds.includes(opViewerId), 'opViewer compare tra gli assegnatari');

  // 8. Migrazione Automatica dei Dati Pregressi
  console.log('\n--- SCENARIO 8: Verifica Migrazione Automatica Dati Pregressi ---');
  // Crea un progetto storico senza record in project_members
  const projLegacyId = `prj_legacy_${testId}`;
  const legacyManagerId = `usr_legman_${testId}`;
  const legacyAssigneeId = `usr_legass_${testId}`;
  const legacyTaskId = `tsk_leg_${testId}`;

  db.insert(users).values([
    {
      id: legacyManagerId,
      name: 'Manager Storico',
      email: `legman_${testId}@test.local`,
      passwordHash: defaultHash,
      role: 'operator',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: legacyAssigneeId,
      name: 'Assegnatario Storico',
      email: `legass_${testId}@test.local`,
      passwordHash: defaultHash,
      role: 'operator',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
  ]).run();

  db.insert(projects).values({
    id: projLegacyId,
    code: `PRJ-LEG-${testId.slice(-4)}`,
    title: 'Progetto Storico Ante-Migrazione',
    projectType: 'client',
    status: 'in_corso',
    managerId: legacyManagerId,
    createdBy: adminId,
    createdAt: now,
    updatedAt: now,
  }).run();

  db.insert(tasks).values({
    id: legacyTaskId,
    projectId: projLegacyId,
    title: 'Attività Storica Assegnata',
    status: 'in_corso',
    createdBy: legacyManagerId,
    createdAt: now,
    updatedAt: now,
  }).run();

  db.insert(taskAssignments).values({
    id: `ta_leg_${testId}`,
    taskId: legacyTaskId,
    userId: legacyAssigneeId,
    role: 'contributor',
    assignedAt: now,
  }).run();

  // Esegui la migrazione retroattiva initDatabase
  initDatabase();

  const legacyMembers = getProjectMembers(projLegacyId);
  const legMan = legacyMembers.find((m) => m.userId === legacyManagerId);
  const legAss = legacyMembers.find((m) => m.userId === legacyAssigneeId);

  assert(!!legMan && legMan.projectRole === 'manager', 'Manager storico migrato automaticamente con ruolo "manager"');
  assert(!!legAss && legAss.projectRole === 'contributor', 'Assegnatario storico migrato automaticamente con ruolo "contributor"');

  console.log('\n===============================================================');
  console.log('🎉 TUTTI GLI SCENARI DI TEST HANNO AVUTO ESITO POSITIVO (PASS)!');
  console.log('===============================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
