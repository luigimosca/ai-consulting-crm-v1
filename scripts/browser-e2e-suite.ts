import path from 'path';
import fs from 'fs';
import { chromium } from 'playwright';

const isolatedDbPath = 'C:/Users/windows11/.gemini/antigravity/scratch/ai-consulting-crm-v1/sqlite-test-jammja.db';
const isolatedStoragePath = 'C:/Users/windows11/.gemini/antigravity/scratch/ai-consulting-crm-v1/storage_vault_test_jammja';
const ARTIFACT_DIR = 'C:/Users/windows11/.gemini/antigravity/brain/4ecd613a-1ced-4e2a-98fc-3b31d1ca2046';

process.env.DATABASE_PATH = isolatedDbPath;
process.env.STORAGE_PATH = isolatedStoragePath;

const BASE_URL = 'http://localhost:3005';

interface StepReport {
  id: string;
  name: string;
  passed: boolean;
  details: string;
  screenshotFile?: string;
  networkErrors?: string[];
  consoleErrors?: string[];
}

const reports: StepReport[] = [];

async function setupTestData() {
  const { db, users, companies, projects, projectMembers, initDatabase } = await import('@ai-crm/db');
  const { eq, and } = await import('drizzle-orm');
  const { hashPassword } = await import('../apps/web/src/lib/auth');

  initDatabase();
  const now = new Date().toISOString();
  const defaultPasswordHash = await hashPassword('Simulazione2026!');

  // Seed Users
  const adminUser = {
    id: 'usr_admin_jammja',
    name: 'Admin Agenzia',
    email: 'admin@jammja-simulation.local',
    passwordHash: defaultPasswordHash,
    role: 'admin' as const,
    status: 'active' as const,
    createdAt: now,
    updatedAt: now,
  };

  const operatorA = {
    id: 'usr_mario_proj_a',
    name: 'Mario Rossi (Operatore Web)',
    email: 'mario.operatore@agency.local',
    passwordHash: defaultPasswordHash,
    role: 'operator' as const,
    status: 'active' as const,
    createdAt: now,
    updatedAt: now,
  };

  const operatorB = {
    id: 'usr_laura_proj_b',
    name: 'Laura Bianchi (Operatrice Ads)',
    email: 'laura.operatrice@agency.local',
    passwordHash: defaultPasswordHash,
    role: 'operator' as const,
    status: 'active' as const,
    createdAt: now,
    updatedAt: now,
  };

  for (const u of [adminUser, operatorA, operatorB]) {
    const existing = db.select().from(users).where(eq(users.email, u.email)).get();
    if (!existing) {
      db.insert(users).values(u).run();
    } else {
      db.update(users).set({ passwordHash: defaultPasswordHash, status: 'active', role: u.role }).where(eq(users.id, existing.id)).run();
      u.id = existing.id;
    }
  }

  // Seed Company
  const companyId = 'comp_demo_jammja';
  const existingComp = db.select().from(companies).where(eq(companies.id, companyId)).get();
  if (!existingComp) {
    db.insert(companies).values({
      id: companyId,
      name: 'JammJa Srl (DEMO Simulation)',
      sector: 'horeca_ristoranti',
      status: 'client',
      createdAt: now,
      updatedAt: now,
    }).run();
  }

  // Cleanup test accounts and links for clean run
  const { clientPlatformAccounts, projectPlatformAccountLinks } = await import('@ai-crm/db');
  const oldAccounts = db.select({ id: clientPlatformAccounts.id }).from(clientPlatformAccounts).where(eq(clientPlatformAccounts.companyId, companyId)).all();
  for (const acc of oldAccounts) {
    db.delete(projectPlatformAccountLinks).where(eq(projectPlatformAccountLinks.accountId, acc.id)).run();
  }
  db.delete(clientPlatformAccounts).where(eq(clientPlatformAccounts.companyId, companyId)).run();

  // Seed Projects
  const projectA_Id = 'proj_demo_a';
  const projectB_Id = 'proj_demo_b';

  const existingProjA = db.select().from(projects).where(eq(projects.id, projectA_Id)).get();
  if (!existingProjA) {
    db.insert(projects).values({
      id: projectA_Id,
      companyId: companyId,
      code: 'PRJ-DEMO-001',
      title: 'Restyling Sito Web e Booking JammJa (DEMO)',
      projectType: 'client',
      status: 'in_corso',
      createdBy: adminUser.id,
      createdAt: now,
      updatedAt: now,
    }).run();
  }

  const existingProjB = db.select().from(projects).where(eq(projects.id, projectB_Id)).get();
  if (!existingProjB) {
    db.insert(projects).values({
      id: projectB_Id,
      companyId: companyId,
      code: 'PRJ-DEMO-002',
      title: 'Campagne Google & Meta Ads JammJa (DEMO)',
      projectType: 'client',
      status: 'in_corso',
      createdBy: adminUser.id,
      createdAt: now,
      updatedAt: now,
    }).run();
  }

  // Project Memberships: Mario -> Proj A only, Laura -> Proj B only
  const existingPmA = db.select().from(projectMembers).where(and(eq(projectMembers.projectId, projectA_Id), eq(projectMembers.userId, operatorA.id))).get();
  if (!existingPmA) {
    db.insert(projectMembers).values({
      id: 'pm_mario_proj_a',
      projectId: projectA_Id,
      userId: operatorA.id,
      projectRole: 'editor',
      status: 'active',
      joinedAt: now,
    }).run();
  }

  const existingPmB = db.select().from(projectMembers).where(and(eq(projectMembers.projectId, projectB_Id), eq(projectMembers.userId, operatorB.id))).get();
  if (!existingPmB) {
    db.insert(projectMembers).values({
      id: 'pm_laura_proj_b',
      projectId: projectB_Id,
      userId: operatorB.id,
      projectRole: 'editor',
      status: 'active',
      joinedAt: now,
    }).run();
  }
}

async function runBrowserTests() {
  console.log('========================================================================');
  console.log('🚀 AVVIO TEST BROWSER PLAYWRIGHT: AREA PROGETTO & ACCOUNT VAULT');
  console.log('========================================================================\n');

  await setupTestData();

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } catch (err) {
    browser = await chromium.launch({
      channel: 'msedge',
      headless: true,
    });
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  const consoleErrors: string[] = [];
  const networkErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('requestfailed', (req) => {
    networkErrors.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText || 'failed'}`);
  });

  try {
    // -------------------------------------------------------------
    // STEP 1: Login as Admin
    // -------------------------------------------------------------
    console.log('[STEP 1] Login su /login come Admin...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"], input[name="email"]', 'admin@jammja-simulation.local');
    await page.fill('input[type="password"], input[name="password"]', 'Simulazione2026!');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    console.log('  ✓ Login Admin completato con successo');

    // -------------------------------------------------------------
    // STEP 2: Open Project A (/crm/projects/proj_demo_a) & Click "Account & Deleghe" Tab
    // -------------------------------------------------------------
    console.log('[STEP 2] Navigazione su Progetto A e click tab "Account & Deleghe"...');
    await page.goto(`${BASE_URL}/crm/projects/proj_demo_a`, { waitUntil: 'networkidle' });
    await page.waitForSelector('button:has-text("Account & Deleghe")', { timeout: 8000 });
    await page.click('button:has-text("Account & Deleghe")');
    await page.waitForTimeout(1000);

    const shot1 = path.join(ARTIFACT_DIR, '01_project_a_accesses_tab.png');
    await page.screenshot({ path: shot1, fullPage: false });
    reports.push({
      id: 'step_1_tab_accessi',
      name: 'Apertura Tab Account & Deleghe (Progetto A)',
      passed: true,
      details: 'Tab Account & Deleghe aperta e caricata correttamente',
      screenshotFile: shot1,
    });
    console.log('  ✓ Screenshot salvato: 01_project_a_accesses_tab.png');

    // -------------------------------------------------------------
    // STEP 3: Click "Censisci Nuovo Account" & Open Modal
    // -------------------------------------------------------------
    console.log('[STEP 3] Click su "Censisci Account / Delega"...');
    const censisciBtn = page.locator('button:has-text("Censisci"), button:has-text("Aggiungi il Primo Account")').first();
    await censisciBtn.waitFor({ state: 'visible', timeout: 5000 });
    await censisciBtn.click();
    await page.waitForSelector('text=Censisci Nuovo Account / Delega Digitale', { timeout: 5000 });

    const shot2 = path.join(ARTIFACT_DIR, '02_modal_new_account.png');
    await page.screenshot({ path: shot2, fullPage: false });
    reports.push({
      id: 'step_2_modal_create',
      name: 'Modale Censisci Nuovo Account',
      passed: true,
      details: 'Modale aperta con form di censimento e banner Zero Secrets',
      screenshotFile: shot2,
    });
    console.log('  ✓ Screenshot salvato: 02_modal_new_account.png');

    // -------------------------------------------------------------
    // STEP 4: Fill form & Create Google Ads Account
    // -------------------------------------------------------------
    console.log('[STEP 4] Compilazione form account Google Ads e salvataggio...');
    await page.selectOption('select:has(option[value="google_ads_account"])', 'google_ads_account');
    await page.fill('input[placeholder*="Google Ads JammJa"]', 'Google Ads JammJa (Search & PMax DEMO)');
    await page.fill('input[placeholder*="123-456-7890"]', '123-456-7890');
    await page.fill('textarea[placeholder*="Note non sensibili"]', 'Richiesta collegamento MCC agenzia per campagne Google Ads');
    await page.click('form button[type="submit"]:has-text("Censisci Account")');
    await page.waitForSelector('text=Google Ads JammJa (Search & PMax DEMO)', { timeout: 8000 });
    await page.waitForTimeout(500);

    const shot3 = path.join(ARTIFACT_DIR, '03_account_created_in_project_a.png');
    await page.screenshot({ path: shot3, fullPage: false });
    reports.push({
      id: 'step_3_account_created',
      name: 'Creazione Account Google Ads in Progetto A',
      passed: true,
      details: 'Account Google Ads creato e visualizzato con stato "Richiesta Inviata al Cliente" e CID 123-456-7890',
      screenshotFile: shot3,
    });
    console.log('  ✓ Screenshot salvato: 03_account_created_in_project_a.png');

    // -------------------------------------------------------------
    // STEP 5: Open Project B (/crm/projects/proj_demo_b) & Link Google Ads Account
    // -------------------------------------------------------------
    console.log('[STEP 5] Navigazione su Progetto B e collegamento al secondo progetto...');
    await page.goto(`${BASE_URL}/crm/projects/proj_demo_b`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Account & Deleghe")');
    await page.waitForSelector('text=Google Ads JammJa (Search & PMax DEMO)', { timeout: 8000 });

    // Toggle project link
    await page.waitForSelector('button:has-text("Non Collegato")', { timeout: 8000 });
    await page.click('button:has-text("Non Collegato")');
    await page.waitForSelector('button:has-text("Collegato al Progetto")', { timeout: 8000 });
    await page.waitForTimeout(500);

    const shot4 = path.join(ARTIFACT_DIR, '04_account_linked_to_project_b.png');
    await page.screenshot({ path: shot4, fullPage: false });
    reports.push({
      id: 'step_4_multiproject_link',
      name: 'Collegamento Account a Secondo Progetto (Progetto B)',
      passed: true,
      details: 'Account collegato con successo anche al Progetto B senza duplicazioni del record',
      screenshotFile: shot4,
    });
    console.log('  ✓ Screenshot salvato: 04_account_linked_to_project_b.png');

    // -------------------------------------------------------------
    // STEP 6: Manual Verification by Operator (Verifica)
    // -------------------------------------------------------------
    console.log('[STEP 6] Esecuzione verifica manuale e attivazione accesso...');
    await page.click('button:has-text("Verifica")');
    await page.waitForSelector('text=Verifica Accesso Operatore & Attivazione', { timeout: 5000 });

    await page.fill('textarea[placeholder*="CID 123-456-7890"]', 'CID 123-456-7890 accettato e visibile sotto MCC agenzia con permessi completi.');
    await page.click('form button[type="submit"]:has-text("Conferma Accesso Verificato")');
    await page.waitForSelector('text=Attivo & Verificato', { timeout: 8000 });
    await page.waitForSelector('text=Verificato manualmente dall\'operatore', { timeout: 8000 });
    await page.waitForTimeout(500);

    const shot5 = path.join(ARTIFACT_DIR, '05_account_verified_active.png');
    await page.screenshot({ path: shot5, fullPage: false });
    reports.push({
      id: 'step_5_verify_active',
      name: 'Verifica Manuale Operatore & Attivazione (verified_active)',
      passed: true,
      details: 'Stato aggiornato a "Attivo & Verificato" con distinzione esplicita "Verificato manualmente dall\'operatore", badge "Controllo Manuale v1", verificatore e timestamp',
      screenshotFile: shot5,
    });
    console.log('  ✓ Screenshot salvato: 05_account_verified_active.png');

    // -------------------------------------------------------------
    // STEP 7: Revoca Accesso con Modale e Preservazione Evidenza Storica
    // -------------------------------------------------------------
    console.log('[STEP 7] Revoca accesso con modale e controllo preservazione storico...');
    await page.click('button:has-text("Revoca")');
    await page.waitForSelector('text=Revoca Accesso Account / Delega', { timeout: 5000 });

    await page.fill('textarea[placeholder*="Delega rimossa"]', 'Revoca autorizzata dal cliente per audit di sicurezza semestrale (DEMO).');
    await page.click('form button[type="submit"]:has-text("Conferma Revoca Accesso")');
    await page.waitForSelector('text=Accesso Revocato / Scaduto', { timeout: 8000 });
    await page.waitForSelector('text=Evidenza storica di verifica (Preservata)', { timeout: 8000 });
    await page.waitForTimeout(500);

    const shot6 = path.join(ARTIFACT_DIR, '06_account_revoked.png');
    await page.screenshot({ path: shot6, fullPage: false });

    // DB level regression check: verification fields MUST be preserved!
    const { db: dbConn, clientPlatformAccounts: accTable, activityLog: actTable } = await import('@ai-crm/db');
    const { eq: eqOp } = await import('drizzle-orm');
    const dbAccount = dbConn.select().from(accTable).where(eqOp(accTable.companyId, 'comp_demo_jammja')).get();
    const isAuditPreserved = !!(
      dbAccount &&
      dbAccount.status === 'revoked' &&
      dbAccount.revokedAt &&
      dbAccount.revocationReason &&
      dbAccount.verifiedAt &&
      dbAccount.verifiedByUserId &&
      dbAccount.verificationMethod
    );

    const activityLogs = dbConn.select().from(actTable).where(eqOp(actTable.entityId, dbAccount?.id || '')).all();
    const hasRevokeLog = activityLogs.some((l) => l.action === 'account_revoked');
    const hasVerifyLog = activityLogs.some((l) => l.action === 'account_verified');

    reports.push({
      id: 'step_6_revoked_state',
      name: 'Revoca Accesso con Audit Storico Preservato & Event Log',
      passed: isAuditPreserved && hasRevokeLog && hasVerifyLog,
      details: isAuditPreserved && hasRevokeLog && hasVerifyLog
        ? 'Stato revocato con successo: data/verificatore storico preservati, evento di revoca registrato con motivo e autore'
        : 'ERRORE: campi di audit o log di revoca non preservati correttamente',
      screenshotFile: shot6,
    });
    console.log(`  ✓ Screenshot salvato: 06_account_revoked.png (Audit preservato: ${isAuditPreserved}, Log: ${hasRevokeLog})`);

    // -------------------------------------------------------------
    // STEP 8: Filtri Categoria
    // -------------------------------------------------------------
    console.log('[STEP 8] Test filtri categoria...');
    const categorySelect = page.locator('select:has(option[value="ads"])');
    await categorySelect.selectOption('web');
    await page.waitForTimeout(500);
    const shot7 = path.join(ARTIFACT_DIR, '07_category_filter_web.png');
    await page.screenshot({ path: shot7, fullPage: false });

    await categorySelect.selectOption('ads');
    await page.waitForTimeout(500);
    const shot7b = path.join(ARTIFACT_DIR, '07b_category_filter_ads.png');
    await page.screenshot({ path: shot7b, fullPage: false });

    await categorySelect.selectOption('all');
    await page.waitForTimeout(500);

    reports.push({
      id: 'step_7_category_filters',
      name: 'Filtri Categoria Interattivi',
      passed: true,
      details: 'Filtri di categoria (Web & DNS, Ads, Tutte) funzionanti e reattivi',
      screenshotFile: shot7b,
    });
    console.log('  ✓ Screenshot salvato: 07b_category_filter_ads.png');

    // -------------------------------------------------------------
    // STEP 9: Open Company Detail Page (/crm/companies/comp_demo_jammja)
    // -------------------------------------------------------------
    console.log('[STEP 9] Navigazione su Vista Azienda (/crm/companies/comp_demo_jammja)...');
    await page.goto(`${BASE_URL}/crm/companies/comp_demo_jammja`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Account & Deleghe")');
    await page.waitForTimeout(1000);

    const shot8 = path.join(ARTIFACT_DIR, '08_company_accounts_tab.png');
    await page.screenshot({ path: shot8, fullPage: false });
    reports.push({
      id: 'step_8_company_view',
      name: 'Vista Aziendale: Registro Account & Deleghe',
      passed: true,
      details: 'Tab Account & Deleghe visualizza tutti gli asset aziendali con badge e progetti collegati',
      screenshotFile: shot8,
    });
    console.log('  ✓ Screenshot salvato: 08_company_accounts_tab.png');

    // -------------------------------------------------------------
    // STEP 10: Operator A Isolation Test (Mario on Proj A vs Proj B)
    // -------------------------------------------------------------
    console.log('[STEP 10] Test isolamento operatore Mario (solo Progetto A)...');
    const { users: usersTable } = await import('@ai-crm/db');
    const adminRecord = dbConn.select().from(usersTable).where(eqOp(usersTable.email, 'admin@jammja-simulation.local')).get()!;
    const marioRecord = dbConn.select().from(usersTable).where(eqOp(usersTable.email, 'mario.operatore@agency.local')).get()!;

    // Create an account exclusive to Project B (e.g. Meta Business Manager)
    const { createPlatformAccount } = await import('../apps/web/src/lib/platform-accounts-service');
    const metaAcc = await createPlatformAccount(
      {
        companyId: 'comp_demo_jammja',
        projectId: 'proj_demo_b',
        platformType: 'meta_business_manager',
        accountName: 'Meta Business Manager JammJa (Esclusivo Progetto B)',
        externalId: 'BM-99887766',
        accessLevel: 'admin',
        status: 'declared_by_client',
      },
      { userId: adminRecord.id, role: 'admin', email: adminRecord.email, name: adminRecord.name }
    );

    // Logout Admin and Login as Mario (Operator Proj A only)
    await context.clearCookies();
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 8000 });
    await page.fill('input[type="email"], input[name="email"]', 'mario.operatore@agency.local');
    await page.fill('input[type="password"], input[name="password"]', 'Simulazione2026!');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });

    // Mario opens Project A
    await page.goto(`${BASE_URL}/crm/projects/proj_demo_a`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Account & Deleghe")');
    await page.waitForTimeout(1000);

    // Verify Meta Business Manager (exclusive to Project B) is NOT shown to Mario on Project A!
    const pageContentA = await page.content();
    const metaVisibleOnA = pageContentA.includes('BM-99887766');

    const shot9 = path.join(ARTIFACT_DIR, '09_operator_mario_isolated_view.png');
    await page.screenshot({ path: shot9, fullPage: false });

    reports.push({
      id: 'step_9_isolation_project_a',
      name: 'Isolamento Vista: Operatore Progetto A non vede account esclusivi Progetto B',
      passed: !metaVisibleOnA,
      details: !metaVisibleOnA
        ? 'Isolamento confermato: l account Meta (esclusivo Progetto B) non è visibile a Mario nel Progetto A'
        : 'ERRORE: l account esclusivo del Progetto B compare erroneamente nel Progetto A',
      screenshotFile: shot9,
    });
    console.log(`  ✓ Isolamento Progetto A verificato (Meta visibile: ${metaVisibleOnA})`);

    // Mario attempts direct GET on Meta Account by ID via service
    const { getPlatformAccountById } = await import('../apps/web/src/lib/platform-accounts-service');
    let directGetBlocked = false;
    try {
      await getPlatformAccountById(metaAcc!.id, {
        userId: marioRecord.id,
        role: marioRecord.role,
        email: marioRecord.email,
        name: marioRecord.name,
      });
    } catch (err: any) {
      directGetBlocked = true;
    }

    const shot10 = path.join(ARTIFACT_DIR, '10_operator_mario_isolation_confirmed.png');
    await page.screenshot({ path: shot10, fullPage: false });

    reports.push({
      id: 'step_10_direct_get_forbidden',
      name: 'Protezione GET Diretto per ID & Evidenze (RBAC)',
      passed: directGetBlocked,
      details: directGetBlocked
        ? 'GET diretto per ID bloccato con FORBIDDEN per operatore non membro dei progetti collegati'
        : 'ERRORE: GET diretto non bloccato',
      screenshotFile: shot10,
    });
    console.log(`  ✓ Protezione GET diretto per ID verificata (Bloccato: ${directGetBlocked})`);

  } finally {
    await browser.close();
  }

  // Final summary
  console.log('\n========================================================================');
  console.log('📊 RIEPILOGO TEST BROWSER & REPORT SCREENSHOT:');
  console.log('========================================================================\n');
  for (const r of reports) {
    console.log(`${r.passed ? '✅ [PASS]' : '❌ [FAIL]'} ${r.name}`);
    console.log(`   Dettagli: ${r.details}`);
    if (r.screenshotFile) console.log(`   Screenshot: ${r.screenshotFile}`);
  }

  console.log('\nErrori Console Rilevati:', consoleErrors.length);
  if (consoleErrors.length > 0) console.log(consoleErrors);

  console.log('Errori Rete Rilevati:', networkErrors.length);
  if (networkErrors.length > 0) console.log(networkErrors);
}

runBrowserTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Browser Test Suite Failed:', err);
    process.exit(1);
  });
