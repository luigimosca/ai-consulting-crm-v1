const isolatedDbPath = 'C:/Users/windows11/.gemini/antigravity/scratch/ai-consulting-crm-v1/sqlite-test-jammja.db';
const isolatedStoragePath = 'C:/Users/windows11/.gemini/antigravity/scratch/ai-consulting-crm-v1/storage_vault_test_jammja';

process.env.DATABASE_PATH = isolatedDbPath;
process.env.STORAGE_PATH = isolatedStoragePath;

const BASE_URL = 'http://localhost:3005';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

async function loginAs(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status} ${res.statusText}`);
  }

  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error(`No session cookie returned for ${email}`);
  }

  const match = setCookie.match(/ai_crm_session=([^;]+)/);
  if (!match) {
    throw new Error(`ai_crm_session not found in cookie: ${setCookie}`);
  }

  return match[1];
}

async function runBrowserVaultSimulation() {
  console.log('========================================================================');
  console.log('🌐 SIMULAZIONE COLLAUDO BROWSER E2E: ACCOUNT & DELEGHE DIGITALI');
  console.log('========================================================================\n');

  const { db, users, companies, projects, projectMembers, initDatabase } = await import('@ai-crm/db');
  const { hashPassword } = await import('../apps/web/src/lib/auth');

  initDatabase();
  const now = new Date().toISOString();
  const simId = `sim_${Date.now()}`;
  const defaultPassword = 'TestPassword2026!';
  const defaultPasswordHash = await hashPassword(defaultPassword);

  // 1. Setup Users
  const admin = {
    id: `usr_adm_${simId}`,
    name: 'Admin Agenzia',
    email: `admin_${simId}@agency.local`,
    role: 'admin' as const,
  };
  const operatorA = {
    id: `usr_op_a_${simId}`,
    name: 'Operatore Mario (Sito Web)',
    email: `mario_${simId}@agency.local`,
    role: 'operator' as const,
  };
  const operatorB = {
    id: `usr_op_b_${simId}`,
    name: 'Operatrice Laura (Ads & PPC)',
    email: `laura_${simId}@agency.local`,
    role: 'operator' as const,
  };
  const operatorOutside = {
    id: `usr_op_ext_${simId}`,
    name: 'Operatore Esterno (Altra Azienda)',
    email: `esterno_${simId}@agency.local`,
    role: 'operator' as const,
  };

  db.insert(users).values([
    {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      passwordHash: defaultPasswordHash,
      role: admin.role,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: operatorA.id,
      name: operatorA.name,
      email: operatorA.email,
      passwordHash: defaultPasswordHash,
      role: operatorA.role,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: operatorB.id,
      name: operatorB.name,
      email: operatorB.email,
      passwordHash: defaultPasswordHash,
      role: operatorB.role,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: operatorOutside.id,
      name: operatorOutside.name,
      email: operatorOutside.email,
      passwordHash: defaultPasswordHash,
      role: operatorOutside.role,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
  ]).run();

  // 2. Setup Company & Projects
  const companyId = `comp_jammja_${simId}`;
  db.insert(companies).values({
    id: companyId,
    name: 'JammJa Srl (DEMO Simulation)',
    sector: 'horeca_ristoranti',
    status: 'client',
    createdAt: now,
    updatedAt: now,
  }).run();

  const projectA_Id = `proj_a_${simId}`;
  const projectB_Id = `proj_b_${simId}`;

  db.insert(projects).values([
    {
      id: projectA_Id,
      companyId: companyId,
      code: 'PRJ-DEMO-001',
      title: 'Restyling Sito Web e Booking JammJa (DEMO)',
      projectType: 'client',
      status: 'in_corso',
      createdBy: admin.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: projectB_Id,
      companyId: companyId,
      code: 'PRJ-DEMO-002',
      title: 'Campagne Google Ads e Meta Ads JammJa (DEMO)',
      projectType: 'client',
      status: 'in_corso',
      createdBy: admin.id,
      createdAt: now,
      updatedAt: now,
    },
  ]).run();

  // Operator A -> Project A only (editor)
  db.insert(projectMembers).values({
    id: `pm_a_${simId}`,
    projectId: projectA_Id,
    userId: operatorA.id,
    projectRole: 'editor',
    status: 'active',
    joinedAt: now,
  }).run();

  // Operator B -> Project B only (editor)
  db.insert(projectMembers).values({
    id: `pm_b_${simId}`,
    projectId: projectB_Id,
    userId: operatorB.id,
    projectRole: 'editor',
    status: 'active',
    joinedAt: now,
  }).run();

  // 3. Authenticate via /api/auth/login and retrieve session cookies
  console.log('--- AUTENTICAZIONE UTENTI VIA LOGIN HTTP ---');
  const adminToken = await loginAs(admin.email, defaultPassword);
  const opAToken = await loginAs(operatorA.email, defaultPassword);
  const opBToken = await loginAs(operatorB.email, defaultPassword);
  const opExtToken = await loginAs(operatorOutside.email, defaultPassword);
  console.log('  ✓ Sessioni JWT generate e verificate con successo');

  console.log('\n--- TEST 1: CREAZIONE ACCOUNT DEMO VIA HTTP API ---');
  // Operator A creates Google Ads account for company, linked to Project A
  const createRes = await fetch(`${BASE_URL}/api/companies/${companyId}/accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `ai_crm_session=${opAToken}`,
    },
    body: JSON.stringify({
      platformType: 'google_ads_account',
      accountName: 'Google Ads JammJa (Search & PMax)',
      externalId: '123-456-7890',
      accessLevel: 'admin',
      accessMethod: 'agency_mcc_partner',
      status: 'requested',
      projectId: projectA_Id,
      notes: 'Inviata richiesta di collegamento MCC agenzia',
    }),
  });

  assert(createRes.status === 201, `Creazione account via API riuscita (status 201). Reale: ${createRes.status}`);
  const createJson = await createRes.json();
  const createdAccount = createJson.account;
  assert(createdAccount.id.startsWith('acc_'), 'ID account generato correttamente');
  assert(createdAccount.status === 'requested', 'Stato iniziale impostato su requested');
  assert(createdAccount.linkedProjects.length === 1, 'Account collegato al Progetto A');

  console.log('\n--- TEST 2: ZERO SECRETS POLICY & BLOCKING SENSIBLE PAYLOADS ---');
  // Attempt to submit a password or secret key
  const secretLeakRes = await fetch(`${BASE_URL}/api/companies/${companyId}/accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `ai_crm_session=${opAToken}`,
    },
    body: JSON.stringify({
      platformType: 'hosting_server',
      accountName: 'Pannello cPanel Con Password Segreta',
      externalId: 'admin_user',
      notes: 'La password temporanea è password=SuperSecret456!',
    }),
  });

  assert(
    secretLeakRes.status === 400,
    `Tentativo di invio payload con password bloccato con 400 Bad Request. Reale: ${secretLeakRes.status}`
  );
  const leakErr = await secretLeakRes.json();
  assert(leakErr.error.includes('SECURITY_VIOLATION'), 'Risposta di errore evidenzia violazione di sicurezza Zero Secrets');

  console.log('\n--- TEST 3: COLLEGAMENTO DELL ACCOUNT A DUE PROGETTI ---');
  // Link the Google Ads account also to Project B (multiproject without duplication)
  const linkRes = await fetch(`${BASE_URL}/api/projects/${projectB_Id}/accounts/link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `ai_crm_session=${adminToken}`,
    },
    body: JSON.stringify({
      accountId: createdAccount.id,
      notes: 'Condiviso con team Ads & PPC',
    }),
  });

  assert(linkRes.status === 200, `Collegamento a Progetto B riuscito (status 200). Reale: ${linkRes.status}`);

  // Fetch account by ID as Operator B
  const getAccRes = await fetch(`${BASE_URL}/api/accounts/${createdAccount.id}`, {
    headers: { Cookie: `ai_crm_session=${opBToken}` },
  });
  assert(getAccRes.status === 200, 'Operatore B può leggere l account ora collegato al suo Progetto B');
  const getAccJson = await getAccRes.json();
  const accDetails = getAccJson.account;
  assert(accDetails.linkedProjects.length === 2, 'L account risulta collegato contemporaneamente a 2 progetti (A e B)');

  console.log('\n--- TEST 4: VERIFICA MANUALE OPERATORE (VERIFIED_ACTIVE & AUDIT TRAIL) ---');
  // Operator A verifies the access
  const verifyRes = await fetch(`${BASE_URL}/api/accounts/${createdAccount.id}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `ai_crm_session=${opAToken}`,
    },
    body: JSON.stringify({
      verificationMethod: 'Invito MCC Google Ads accettato nel pannello agenzia',
      verificationNotes: 'CID 123-456-7890 visibile sotto MCC agenzia con permessi completi',
    }),
  });

  assert(verifyRes.status === 200, `Verifica manuale eseguita con successo (status 200). Reale: ${verifyRes.status}`);
  const verifyJson = await verifyRes.json();
  const verifiedData = verifyJson.account;
  assert(verifiedData.status === 'verified_active', 'Stato account aggiornato a verified_active');
  assert(verifiedData.verifiedByUserId === operatorA.id, 'Registrato operatore A come verificatore');
  assert(verifiedData.verifiedAt !== null, 'Registrato timestamp di verifica');
  assert(verifiedData.verificationMethod.includes('MCC Google Ads'), 'Metodo di verifica registrato correttamente');

  console.log('\n--- TEST 5: REVOCA DELL ACCESSO ---');
  // Revoke access
  const revokeRes = await fetch(`${BASE_URL}/api/accounts/${createdAccount.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `ai_crm_session=${opAToken}`,
    },
    body: JSON.stringify({
      status: 'revoked',
      notes: 'Accesso MCC revocato per fine contratto',
    }),
  });

  assert(revokeRes.status === 200, 'Revoca accesso completata con status 200');
  const revokeJson = await revokeRes.json();
  const revokedData = revokeJson.account;
  assert(revokedData.status === 'revoked', 'Stato account impostato su revoked');
  assert(revokedData.verifiedByUserId === null, 'Cancellati metadati di verifica attiva all atto della revoca');

  console.log('\n--- TEST 6: ISOLAMENTO RBAC CROSS-PROGETTO ---');
  // Create Account C (Meta Ads) linked EXCLUSIVELY to Project B
  const createMetaRes = await fetch(`${BASE_URL}/api/companies/${companyId}/accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `ai_crm_session=${opBToken}`,
    },
    body: JSON.stringify({
      platformType: 'meta_business_manager',
      accountName: 'Meta Business Manager JammJa (Esclusivo Progetto B)',
      externalId: 'BM-99887766',
      accessLevel: 'admin',
      status: 'declared_by_client',
      projectId: projectB_Id,
    }),
  });
  const createMetaJson = await createMetaRes.json();
  const metaAccount = createMetaJson.account;

  // Operator Outside (external) tries to read Meta Account -> must be rejected 403
  const extReadRes = await fetch(`${BASE_URL}/api/accounts/${metaAccount.id}`, {
    headers: { Cookie: `ai_crm_session=${opExtToken}` },
  });
  assert(extReadRes.status === 403, `Operatore esterno respinto con 403 Forbidden. Reale: ${extReadRes.status}`);

  // Operator Outside tries to verify Meta Account -> must be rejected 403
  const extVerifyRes = await fetch(`${BASE_URL}/api/accounts/${metaAccount.id}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `ai_crm_session=${opExtToken}`,
    },
    body: JSON.stringify({
      verificationMethod: 'Test non autorizzato',
    }),
  });
  assert(extVerifyRes.status === 403, `Verifica non autorizzata da operatore esterno respinta con 403. Reale: ${extVerifyRes.status}`);

  console.log('\n--- TEST 7: FILTRI CATEGORIE E VISIBILITÀ DI PROGETTO ---');
  // Project A list accounts
  const projAListRes = await fetch(`${BASE_URL}/api/projects/${projectA_Id}/accounts`, {
    headers: { Cookie: `ai_crm_session=${opAToken}` },
  });
  assert(projAListRes.status === 200, 'Lettura account da Progetto A riuscita');
  const projAJson = await projAListRes.json();
  const projAAccounts = projAJson.accounts;
  assert(projAAccounts.length === 2, 'Progetto A rileva sia account Google Ads che Meta');
  const googleAdsInA = projAAccounts.find((a: any) => a.id === createdAccount.id);
  const metaInA = projAAccounts.find((a: any) => a.id === metaAccount.id);
  assert(googleAdsInA.isLinkedToProject === true, 'Google Ads è collegato a Progetto A (isLinkedToProject: true)');
  assert(metaInA.isLinkedToProject === false, 'Meta Ads appartiene alla Company ma NON è collegato al Progetto A (isLinkedToProject: false)');

  console.log('\n========================================================================');
  console.log('🎉 TUTTI GLI SCENARI DI COLLAUDO BROWSER E2E SUPERATI CON SUCCESSO!');
  console.log('========================================================================\n');
}

runBrowserVaultSimulation()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Simulation Failed:', err);
    process.exit(1);
  });
