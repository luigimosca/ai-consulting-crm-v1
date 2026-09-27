import {
  db,
  users,
  companies,
  projects,
  projectMembers,
  clientRequests,
  clientRequestItems,
  clientPlatformAccounts,
  projectPlatformAccountLinks,
  initDatabase,
} from '@ai-crm/db';
import { eq, and } from 'drizzle-orm';
import {
  createPlatformAccount,
  updatePlatformAccount,
  verifyPlatformAccount,
  getCompanyPlatformAccounts,
  getProjectPlatformAccounts,
  getPlatformAccountById,
  linkAccountToProject,
  unlinkAccountFromProject,
  deletePlatformAccount,
  assertNoSensitiveData,
} from '../apps/web/src/lib/platform-accounts-service';
import {
  createClientRequest,
  submitClientRequest,
  approveClientRequest,
} from '../apps/web/src/lib/client-requests-service';
import {
  canUserAccessPlatformAccount,
  canUserAccessCompanyAccounts,
} from '../apps/web/src/lib/auth';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

async function runPlatformAccountsTestSuite() {
  console.log('======================================================================');
  console.log('🚀 TEST SUITE: REGISTRO ACCOUNT & DELEGHE DIGITALI (CLIENT VAULT)');
  console.log('======================================================================\n');

  initDatabase();
  const now = new Date().toISOString();
  const testId = `test_vault_${Date.now()}`;

  // 1. Setup Test Users
  const adminUser = {
    id: `usr_adm_${testId}`,
    name: 'Admin Platform Vault',
    email: `adm_${testId}@test.local`,
    role: 'admin' as const,
  };
  const operatorAssigned = {
    id: `usr_op_assign_${testId}`,
    name: 'Operator Assigned Project',
    email: `op_assign_${testId}@test.local`,
    role: 'operator' as const,
  };
  const operatorUnassigned = {
    id: `usr_op_unassign_${testId}`,
    name: 'Operator Unassigned',
    email: `op_unassign_${testId}@test.local`,
    role: 'operator' as const,
  };

  db.insert(users).values([
    {
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      passwordHash: 'dummy_hash',
      role: adminUser.role,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: operatorAssigned.id,
      name: operatorAssigned.name,
      email: operatorAssigned.email,
      passwordHash: 'dummy_hash',
      role: operatorAssigned.role,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: operatorUnassigned.id,
      name: operatorUnassigned.name,
      email: operatorUnassigned.email,
      passwordHash: 'dummy_hash',
      role: operatorUnassigned.role,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
  ]).run();

  // 2. Setup Test Company & Projects
  const companyId = `comp_${testId}`;
  db.insert(companies).values({
    id: companyId,
    name: 'JammJa Srl (DEMO Simulation)',
    sector: 'horeca_ristoranti',
    status: 'client',
    createdAt: now,
    updatedAt: now,
  }).run();

  const project1Id = `proj_1_${testId}`;
  const project2Id = `proj_2_${testId}`;

  db.insert(projects).values([
    {
      id: project1Id,
      companyId: companyId,
      code: `PRJ-TEST-01`,
      title: 'Restyling Sito Web (DEMO)',
      projectType: 'client',
      status: 'in_corso',
      createdBy: adminUser.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: project2Id,
      companyId: companyId,
      code: `PRJ-TEST-02`,
      title: 'Campagne Google & Meta Ads (DEMO)',
      projectType: 'client',
      status: 'in_corso',
      createdBy: adminUser.id,
      createdAt: now,
      updatedAt: now,
    },
  ]).run();

  // Assign operatorAssigned to project1 as manager
  db.insert(projectMembers).values({
    id: `pm_${testId}_1`,
    projectId: project1Id,
    userId: operatorAssigned.id,
    projectRole: 'manager',
    status: 'active',
    joinedAt: now,
  }).run();

  console.log('--- TEST 1: ZERO SECRETS POLICY & DATA SANITIZATION ---');
  // Verify assertNoSensitiveData blocks sensitive strings
  let secretBlocked = false;
  try {
    assertNoSensitiveData({
      notes: 'Questa è una nota con una password=SuperSecret123!',
    });
  } catch (err: any) {
    secretBlocked = true;
    assert(err.message.includes('SECURITY_VIOLATION'), 'Rilevata e bloccata presenza di password nei payload');
  }
  assert(secretBlocked, 'Zero Secrets Policy impedisce il salvataggio di password nel testo');

  let tokenBlocked = false;
  try {
    assertNoSensitiveData({
      externalId: 'G-123456',
      metadata: { apiKey: 'AIzaSySecretToken987654321' },
    });
  } catch (err: any) {
    tokenBlocked = true;
    assert(err.message.includes('SECURITY_VIOLATION'), 'Rilevata e bloccata presenza di token segreti');
  }
  assert(tokenBlocked, 'Zero Secrets Policy impedisce il salvataggio di apiKey/token nei metadati');

  console.log('\n--- TEST 2: CREAZIONE ACCOUNT AZIENDALE & ASSOCIAZIONE PROGETTI ---');
  // Admin creates GA4 account for Company
  const ga4Account = await createPlatformAccount(
    {
      companyId: companyId,
      projectId: project1Id, // optionally link directly to project1
      platformType: 'google_analytics_4',
      accountName: 'GA4 Proprietà Web Principale (DEMO)',
      externalId: 'G-DEMO123456',
      accessLevel: 'admin',
      accessMethod: 'agency_mcc_partner',
      status: 'requested',
      notes: 'Inviato invito a analytics@agenzia.local',
    },
    { userId: adminUser.id, role: adminUser.role }
  );

  assert(Boolean(ga4Account && ga4Account.id), 'Account GA4 creato con successo a livello azienda');
  assert(ga4Account!.status === 'requested', 'Stato iniziale impostato su requested');
  assert(ga4Account!.companyId === companyId, 'Account legato correttamente alla Company');

  // Verify link to project 1 was created
  const proj1Accounts = await getProjectPlatformAccounts(project1Id, {
    userId: operatorAssigned.id,
    role: operatorAssigned.role,
  });
  assert(proj1Accounts.length === 1, 'Account visibile nel Progetto 1 tramite collegamento');
  assert(proj1Accounts[0].id === ga4Account!.id, 'ID account corrisponde');

  // Link same account to Project 2 (Multiprogetto senza duplicazione)
  await linkAccountToProject(
    project2Id,
    ga4Account!.id,
    { userId: adminUser.id, role: adminUser.role },
    'Utilizzato per il tracciamento conversioni campagne'
  );

  const proj2Accounts = await getProjectPlatformAccounts(project2Id, {
    userId: adminUser.id,
    role: adminUser.role,
  });
  assert(proj2Accounts.length === 1, 'Account GA4 collegato anche a Progetto 2 senza duplicare il record');

  const compAccounts = await getCompanyPlatformAccounts(companyId, {
    userId: adminUser.id,
    role: adminUser.role,
  });
  assert(compAccounts.length === 1, 'Il record a livello aziendale rimane univoco (1 solo account registrato)');

  console.log('\n--- TEST 3: SINCRONIZZAZIONE DA CLIENT REQUEST (GATE DI SICUREZZA) ---');
  // Create a client request with an access item for Hosting/DNS
  const clientReq = await createClientRequest({
    companyId: companyId,
    projectId: project1Id,
    title: 'Richiesta Accessi Hosting e DNS (DEMO)',
    description: 'Fornitura dati di accesso server e pannello DNS',
    category: 'accesses',
    requestedByUserId: adminUser.id,
    items: [
      {
        label: 'Accesso Hosting Server CPanel',
        description: 'Indicare l URL del pannello e utente delegato',
        itemType: 'access_confirmation',
        required: true,
      },
    ],
  });

  assert(clientReq.items.length === 1, 'Richiesta cliente creata con 1 item access_confirmation');
  const reqItemId = clientReq.items[0].id;

  // Simulate client filling data and updating item
  const { updateClientRequestItem } = await import('../apps/web/src/lib/client-requests-service');
  await updateClientRequestItem({
    itemId: reqItemId,
    valueText: 'https://cpanel.jammja-demo.local:2083 (Utente agenzia delegato)',
    performedByUserId: adminUser.id,
    status: 'received',
  });

  // Operator approves request
  const approvalResult = await approveClientRequest(
    clientReq.id,
    operatorAssigned.id,
    'Dati ricevuti e pronti per verifica tecnica',
    { userId: operatorAssigned.id, role: operatorAssigned.role }
  );

  assert(approvalResult.status === 'approved', 'Client request approvata con successo');

  // Verify that an account was created via synchronization in status 'declared_by_client', NEVER 'verified_active'
  const updatedCompanyAccounts = await getCompanyPlatformAccounts(companyId, {
    userId: adminUser.id,
    role: adminUser.role,
  });
  
  const syncedAccount = updatedCompanyAccounts.find((a) => a.platformType === 'hosting_server');
  assert(Boolean(syncedAccount), 'Account Hosting Server generato automaticamente dall approvazione richiesta');
  assert(
    syncedAccount?.status === 'declared_by_client',
    'CRITICO: Lo stato dell account sincronizzato è "declared_by_client" e NON "verified_active"'
  );
  assert(syncedAccount?.verifiedAt === null, 'verifiedAt è NULL (nessuna verifica automatica)');
  assert(syncedAccount?.verifiedByUserId === null, 'verifiedByUserId è NULL');

  console.log('\n--- TEST 4: AUDIT TRAIL SU VERIFICA OPERATORE (VERIFIED_ACTIVE) ---');
  // Operator verifies the hosting account
  const verifyNotes = 'Verificato login cPanel via 2FA agenzia, permessi file manager e database confermati';
  const verifyMethod = 'Accesso hosting / DNS effettuato e convalidato con successo';

  const verifiedAccount = await verifyPlatformAccount(
    syncedAccount!.id,
    {
      verificationMethod: verifyMethod,
      verificationNotes: verifyNotes,
    },
    { userId: operatorAssigned.id, role: operatorAssigned.role }
  );

  assert(verifiedAccount?.status === 'verified_active', 'Stato account aggiornato a "verified_active"');
  assert(verifiedAccount?.verifiedByUserId === operatorAssigned.id, 'Registrato correttamente l operatore verificatore');
  assert(verifiedAccount?.verifiedAt !== null, 'Registrato timestamp ISO immutabile della verifica');
  assert(verifiedAccount?.verificationMethod === verifyMethod, 'Metodo di verifica registrato');
  assert(verifiedAccount?.verificationNotes === verifyNotes, 'Evidenza non sensibile registrata');

  // Verify failure when trying to verify without a method
  let emptyMethodFailed = false;
  try {
    await verifyPlatformAccount(
      ga4Account!.id,
      {
        verificationMethod: '', // Empty method
      },
      { userId: operatorAssigned.id, role: operatorAssigned.role }
    );
  } catch (err: any) {
    emptyMethodFailed = true;
    assert(err.message.includes('obbligatorio'), 'Bloccata verifica con metodo vuoto');
  }
  assert(emptyMethodFailed, 'Verifica richiede obbligatoriamente un metodo esplicito');

  console.log('\n--- TEST 5: CONTROLLO ACCESSI E PERMESSI RBAC (GET, LIST, VERIFY, DELETE) ---');
  // 1. Operator Assigned has access to company accounts because they belong to project1 of that company
  const opAssignedCanAccess = canUserAccessPlatformAccount(
    { userId: operatorAssigned.id, role: operatorAssigned.role },
    ga4Account!.id,
    'view'
  );
  assert(opAssignedCanAccess, 'Operatore assegnato a un progetto dell azienda ha accesso in lettura all account');

  // 2. Operator Unassigned (no projects in company) is denied access
  const opUnassignedCanAccess = canUserAccessPlatformAccount(
    { userId: operatorUnassigned.id, role: operatorUnassigned.role },
    ga4Account!.id,
    'view'
  );
  assert(!opUnassignedCanAccess, 'Operatore NON assegnato viene RESPINTA la lettura (403 RBAC)');

  let unauthorizedGetFailed = false;
  try {
    await getPlatformAccountById(ga4Account!.id, {
      userId: operatorUnassigned.id,
      role: operatorUnassigned.role,
    });
  } catch (err: any) {
    unauthorizedGetFailed = true;
    assert(err.message.includes('FORBIDDEN'), 'getPlatformAccountById lancia eccezione di mancata autorizzazione');
  }
  assert(unauthorizedGetFailed, 'Accesso per ID protetto da RBAC');

  // 3. Operator Unassigned cannot verify account
  let unauthorizedVerifyFailed = false;
  try {
    await verifyPlatformAccount(
      ga4Account!.id,
      {
        verificationMethod: 'Test',
      },
      { userId: operatorUnassigned.id, role: operatorUnassigned.role }
    );
  } catch (err: any) {
    unauthorizedVerifyFailed = true;
  }
  assert(unauthorizedVerifyFailed, 'Operatore non assegnato non può eseguire verifyPlatformAccount');

  console.log('\n--- TEST 6: UNLINK & CASCADE DELETION ---');
  // Unlink GA4 from Project 2
  await unlinkAccountFromProject(
    project2Id,
    ga4Account!.id,
    { userId: adminUser.id, role: adminUser.role }
  );

  const proj2AccountsAfterUnlink = await getProjectPlatformAccounts(project2Id, {
    userId: adminUser.id,
    role: adminUser.role,
  });
  const ga4InProj2 = proj2AccountsAfterUnlink.find((a) => a.id === ga4Account!.id);
  assert(ga4InProj2?.isLinkedToProject === false, 'Account GA4 scollegato con successo dal Progetto 2 (isLinkedToProject: false)');

  const proj1AccountsStillPresent = await getProjectPlatformAccounts(project1Id, {
    userId: operatorAssigned.id,
    role: operatorAssigned.role,
  });
  const ga4InProj1 = proj1AccountsStillPresent.find((a) => a.id === ga4Account!.id);
  assert(ga4InProj1?.isLinkedToProject === true, 'Account GA4 ancora attivamente collegato al Progetto 1 (isLinkedToProject: true)');

  // Delete the synced hosting account
  await deletePlatformAccount(
    syncedAccount!.id,
    { userId: adminUser.id, role: adminUser.role }
  );

  const finalCompanyAccounts = await getCompanyPlatformAccounts(companyId, {
    userId: adminUser.id,
    role: adminUser.role,
  });
  assert(finalCompanyAccounts.length === 1, 'Account eliminato con successo dal registro aziendale');

  console.log('\n======================================================================');
  console.log('✅ TUTTI I TEST DEL MODULO "ACCOUNT E DELEGHE DIGITALI" SUPERATI!');
  console.log('======================================================================\n');
}

runPlatformAccountsTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
