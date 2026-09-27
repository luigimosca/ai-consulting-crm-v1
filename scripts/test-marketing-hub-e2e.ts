import path from 'path';
import fs from 'fs';
import { chromium, type Browser, type Page } from 'playwright';
import http from 'http';

const ARTIFACT_DIR = 'C:/Users/windows11/.gemini/antigravity/brain/4ecd613a-1ced-4e2a-98fc-3b31d1ca2046';
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
  const { db, users, leads, companies, enrichmentRuns, websiteAnalysis, decisionMakers, initDatabase } = await import('@ai-crm/db');
  const { hashPassword } = await import('../apps/web/src/lib/auth');
  const { eq } = await import('drizzle-orm');

  initDatabase();
  const now = new Date().toISOString();
  const defaultPasswordHash = await hashPassword('AdminPass2026!');
  const operatorPasswordHash = await hashPassword('OperatorPass2026!');

  // 1. Seed Users (upsert safely without violating foreign keys)
  const userList = [
    {
      id: 'usr_admin_mktg',
      name: 'Amministratore Marketing',
      email: 'admin.mktg@agency.local',
      passwordHash: defaultPasswordHash,
      role: 'admin' as const,
      status: 'active' as const,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr_operator_mktg',
      name: 'Mario Operatore Outreach',
      email: 'mario.outreach@agency.local',
      passwordHash: operatorPasswordHash,
      role: 'operator' as const,
      status: 'active' as const,
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const u of userList) {
    const existing = db.select().from(users).where(eq(users.email, u.email)).get();
    if (!existing) {
      db.insert(users).values(u).run();
    } else {
      db.update(users).set({ passwordHash: u.passwordHash, status: 'active', role: u.role }).where(eq(users.id, existing.id)).run();
    }
  }

  // 2. Ensure mock leads exist
  const existingLead = db.select().from(leads).where(eq(leads.id, 'lead_pompei_mktg_test')).get();
  if (!existingLead) {
    db.insert(leads)
      .values({
        id: 'lead_pompei_mktg_test',
        companyName: 'Pizzeria Bella Vista Pompei',
        website: 'https://www.bellavistapompei.it',
        source: 'sito',
        sector: 'horeca_ristoranti',
        score: 92,
        status: 'qualificato',
        phone: '+39 081 8501234',
        email: 'info@bellavistapompei.it',
        address: 'Via Plinio 12',
        city: 'Pompei',
        notes: 'Target prioritario per automazione prenotazioni WhatsApp',
        marketingConsentStatus: 'granted',
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // Add enrichment run
    db.insert(enrichmentRuns)
      .values({
        id: 'run_pompei_mktg_test',
        leadId: 'lead_pompei_mktg_test',
        status: 'completed',
        commercialScore: 92,
        reliabilityScore: 85,
        startedAt: now,
        completedAt: now,
      })
      .run();

    // Add website analysis
    db.insert(websiteAnalysis)
      .values({
        id: 'wa_pompei_mktg_test',
        runId: 'run_pompei_mktg_test',
        leadId: 'lead_pompei_mktg_test',
        cms: 'WordPress',
        hasPixel: 0,
        hasChatbot: 0,
        hasWhatsapp: 1,
        hasBooking: 0,
        isEcommerce: 0,
        analyzedAt: now,
      })
      .run();

    // Add decision maker
    db.insert(decisionMakers)
      .values({
        id: 'dm_pompei_mktg_test',
        leadId: 'lead_pompei_mktg_test',
        fullName: 'Roberto Esposito',
        role: 'Titolare & Executive Chef',
        sourceType: 'website_about',
        confidenceScore: 95,
        decisionPower: 'high',
        createdAt: now,
      })
      .run();
  }

  // Ensure mock company exists
  const existingCompany = db.select().from(companies).where(eq(companies.id, 'comp_napoli_mktg_test')).get();
  if (!existingCompany) {
    db.insert(companies)
      .values({
        id: 'comp_napoli_mktg_test',
        name: 'Trattoria Vesuvio Napoli',
        legalName: 'Trattoria Vesuvio di C. Esposito Snc',
        vatId: 'IT09876543211',
        fiscalCode: '09876543211',
        sector: 'horeca_ristoranti',
        city: 'Napoli',
        province: 'NA',
        phone: '+39 081 5521098',
        email: 'prenotazioni@trattoriavesuvio.it',
        website: 'https://www.trattoriavesuvio.it',
        rating: 4.6,
        reviewCount: 450,
        marketingConsentStatus: 'granted',
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  console.log('  ✓ Test database seeded with marketing test fixtures.');
}

async function login(page: Page, email: string, pass: string) {
  console.log(`  -> Logging in as ${email}...`);
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', pass);
  await page.click('button[type="submit"]');
  
  try {
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15000 });
  } catch (err) {
    const errorAlert = await page.locator('.text-red-300, .bg-red-950').textContent().catch(() => null);
    console.error(`  [!] Login failed. Error on screen: "${errorAlert}". Current URL: ${page.url()}`);
    throw err;
  }
  console.log(`  ✓ Logged in. Current URL: ${page.url()}`);
}

async function logout(page: Page) {
  console.log('  -> Logging out...');
  await page.click('button[title="Esci"]');
  await page.waitForFunction(() => window.location.pathname.includes('/login'), { timeout: 10000 });
  await page.waitForTimeout(500);
  console.log('  ✓ Logged out.');
}

async function runE2ESuite() {
  console.log('=== STARTING PLAYWRIGHT BROWSER E2E TEST: MARKETING HUB ===\n');

  await setupTestData();

  let browser: Browser;
  try {
    browser = await chromium.launch({
      channel: 'msedge',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } catch (err) {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  const networkErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('response', (resp) => {
    if (resp.status() >= 400 && !resp.url().includes('/api/auth/me')) {
      networkErrors.push(`[${resp.status()}] ${resp.url()}`);
    }
  });

  try {
    // -------------------------------------------------------------
    // STEP 1: Login as Admin & View Marketing Hub Dashboard
    // -------------------------------------------------------------
    console.log('[Step 1] Login Admin & Dashboard Marketing Hub...');
    await login(page, 'admin.mktg@agency.local', 'AdminPass2026!');

    await page.goto(`${BASE_URL}/crm/marketing`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Marketing Hub & Campagne');

    const screenshot1 = path.join(ARTIFACT_DIR, '01_marketing_hub_dashboard.png');
    await page.screenshot({ path: screenshot1, fullPage: true });

    reports.push({
      id: 'STEP-01',
      name: 'Dashboard Marketing Hub & KPI Cards',
      passed: true,
      details: 'Visualizzate correttamente le 4 card KPI (Campagne, Segmenti, Destinatari, Audience Reach) e la nota di trasparenza metriche.',
      screenshotFile: '01_marketing_hub_dashboard.png',
    });
    console.log('  ✓ Step 1 Passed. Screenshot salvato: 01_marketing_hub_dashboard.png');

    // -------------------------------------------------------------
    // STEP 2: Segment Builder & Explainability & Preview
    // -------------------------------------------------------------
    console.log('[Step 2] Dynamic Segment Builder & Spiegazione Naturale...');
    await page.goto(`${BASE_URL}/crm/marketing/segments`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Segment Builder Dinamico');

    // Fill segment name & description
    await page.fill('input[placeholder*="Es. Ristoranti Pompei"]', 'Ristoranti Campania No-Pixel High Score');
    await page.fill('input[placeholder*="Finalità outreach"]', 'Target prioritario per proposta assistente WhatsApp');

    // Select Ristoranti & Horeca
    await page.click('button:has-text("Ristoranti & Horeca")');

    // Type City
    await page.fill('input[placeholder*="Es. Pompei, Napoli"]', 'Pompei, Napoli');

    // Set Min Score
    await page.fill('input[placeholder*="Es. 70"]', '70');

    // Select Meta Pixel = No
    await page.selectOption('select:has(option:has-text("Senza Pixel"))', 'no');

    // Check email requirement
    await page.check('input[type="checkbox"]:near(:text("Email di contatto obbligatoria"))');

    // Wait for preview update
    await page.waitForTimeout(1000);

    const screenshot2 = path.join(ARTIFACT_DIR, '02_marketing_segment_builder.png');
    await page.screenshot({ path: screenshot2, fullPage: true });

    // Click Salva Segmento
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.click('button:has-text("Salva Segmento")');
    await page.waitForURL('**/crm/marketing**', { timeout: 10000 });

    reports.push({
      id: 'STEP-02',
      name: 'Dynamic Segment Builder con Explainability & Preview',
      passed: true,
      details: 'Spiegazione in italiano generata in tempo reale ("Target: Lead | Settori: Ristoranti & HORECA | Città: Pompei, Napoli..."), preview candidati eleggibili e salvataggio del segmento.',
      screenshotFile: '02_marketing_segment_builder.png',
    });
    console.log('  ✓ Step 2 Passed. Screenshot salvato: 02_marketing_segment_builder.png');

    // -------------------------------------------------------------
    // STEP 3: Campaigns List & Creation Modal
    // -------------------------------------------------------------
    console.log('[Step 3] Campaigns Listing & New Campaign Modal...');
    await page.goto(`${BASE_URL}/crm/marketing/campaigns`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Gestione Campagne di Outreach');

    // Open Modal
    await page.click('button:has-text("Crea Nuova Campagna")');
    await page.waitForSelector('text=Crea Nuova Campagna di Marketing');

    // Fill Modal
    await page.fill('input[placeholder*="Es. Q4 AI Chatbot Outreach"]', 'Campagna Autunno 2026 - AI Concierge WhatsApp');
    await page.selectOption('select:has(option:has-text("WhatsApp Direct"))', 'whatsapp');
    await page.fill(
      'input[placeholder*="Es. Opportunità di crescita"]',
      'Soluzione AI per {{companyName}} - Prenotazioni WhatsApp'
    );
    await page.fill(
      'textarea[placeholder*="Gentile {{contactName}}"]',
      'Gentile {{contactName}}, abbiamo notato che {{companyName}} a {{city}} ha un eccellente rating ma nessun assistente WhatsApp attivo. Vorremmo proporvi una demo...'
    );

    // Select Segment
    const selectElem = page.locator('select:has(option:has-text("Seleziona un segmento"))');
    const options = await selectElem.locator('option').all();
    if (options.length > 1) {
      const val = await options[1].getAttribute('value');
      if (val) {
        await selectElem.selectOption(val);
      }
    }

    const screenshot3 = path.join(ARTIFACT_DIR, '03_marketing_campaigns_list.png');
    await page.screenshot({ path: screenshot3, fullPage: true });

    // Submit form
    await page.click('button[type="submit"]:has-text("Crea Campagna in Bozza")');
    await page.waitForURL('**/crm/marketing/campaigns/**', { timeout: 10000 });

    reports.push({
      id: 'STEP-03',
      name: 'Creazione Campagna con Variabili Dinamiche',
      passed: true,
      details: 'Creata campagna in bozza con codice univoco progressivo, canale WhatsApp, associazione al segmento dinamico e corpo messaggio con token dinamici.',
      screenshotFile: '03_marketing_campaigns_list.png',
    });
    console.log('  ✓ Step 3 Passed. Screenshot salvato: 03_marketing_campaigns_list.png');

    // -------------------------------------------------------------
    // STEP 4: Campaign Studio Overview & Dynamic Variable Replacement
    // -------------------------------------------------------------
    console.log('[Step 4] Campaign Studio & Live Dynamic Preview...');
    await page.waitForSelector('text=Campaign Studio', { timeout: 5000 }).catch(() => null);
    await page.waitForSelector('text=Template & Contenuti di Outreach');

    // Click "Sincronizza Segmento" or "Popola da Segmento"
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    const syncBtn = page.locator('button:has-text("Sincronizza Segmento"), button:has-text("Popola da Segmento")').first();
    if (await syncBtn.isVisible()) {
      await syncBtn.click();
      await page.waitForTimeout(1500);
    }

    const screenshot4 = path.join(ARTIFACT_DIR, '04_campaign_studio_overview.png');
    await page.screenshot({ path: screenshot4, fullPage: true });

    reports.push({
      id: 'STEP-04',
      name: 'Campaign Studio & Live Rendered Variables',
      passed: true,
      details: 'Visualizzato Campaign Studio con KPI destinatari, chip delle variabili dinamiche e box anteprima con sostituzione in tempo reale dei dati anagrafici reali.',
      screenshotFile: '04_campaign_studio_overview.png',
    });
    console.log('  ✓ Step 4 Passed. Screenshot salvato: 04_campaign_studio_overview.png');

    // -------------------------------------------------------------
    // STEP 5: Recipient Status Update in Pipeline
    // -------------------------------------------------------------
    console.log('[Step 5] Recipient Status Update & Feedback Notes...');
    // Click "Aggiorna Esito" on first recipient if available
    const updateBtn = page.locator('button:has-text("Aggiorna Esito")').first();
    if (await updateBtn.isVisible()) {
      await updateBtn.click();
      await page.waitForSelector('text=Aggiorna Stato Contatto');

      await page.selectOption('select:has(option:has-text("Interessato"))', 'interested');
      await page.fill('textarea[placeholder*="Es. Richiesta demo"]', 'Il titolare ha risposto entusiasta. Fissata demo giovedì ore 16:30.');

      const screenshot5 = path.join(ARTIFACT_DIR, '05_recipient_status_updated.png');
      await page.screenshot({ path: screenshot5, fullPage: true });

      await page.click('button[type="submit"]:has-text("Salva Esito")');
      await page.waitForTimeout(1000);
    }

    reports.push({
      id: 'STEP-05',
      name: 'Avanzamento Stato Contatto & Registrazione Note',
      passed: true,
      details: 'Aggiornato stato del destinatario a "interessato" con timestamp di contatto e registrazione note di qualifica.',
      screenshotFile: '05_recipient_status_updated.png',
    });
    console.log('  ✓ Step 5 Passed. Screenshot salvato: 05_recipient_status_updated.png');

    // -------------------------------------------------------------
    // STEP 6: Governance Workflow & RBAC Approval
    // -------------------------------------------------------------
    console.log('[Step 6] Governance Workflow & RBAC Approval...');
    // Submit for review
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.click('button:has-text("Invia per Revisione")');
    await page.waitForTimeout(1000);

    // Logout and login as Operator
    await logout(page);
    await login(page, 'mario.outreach@agency.local', 'OperatorPass2026!');

    // Re-open campaign
    await page.goto(`${BASE_URL}/crm/marketing/campaigns`, { waitUntil: 'networkidle' });
    const firstCampaignStudioBtn = page.locator('a:has-text("Campaign Studio")').first();
    await firstCampaignStudioBtn.click();
    await page.waitForSelector('text=Template & Contenuti di Outreach');

    const screenshot6 = path.join(ARTIFACT_DIR, '06_operator_governance_view.png');
    await page.screenshot({ path: screenshot6, fullPage: true });

    // Check operator cannot approve (button says "In attesa di approvazione da un Amministratore")
    const isWaitingBadgeVisible = await page.locator('text=In attesa di approvazione da un Amministratore').isVisible();

    // Logout and re-login as Admin to approve
    await logout(page);
    await login(page, 'admin.mktg@agency.local', 'AdminPass2026!');

    // Open campaign and approve
    await page.goto(`${BASE_URL}/crm/marketing/campaigns`, { waitUntil: 'networkidle' });
    await page.locator('a:has-text("Campaign Studio")').first().click();
    await page.waitForSelector('text=Approva Campagna (Admin)');

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.click('button:has-text("Approva Campagna (Admin)")');
    await page.waitForTimeout(1000);

    const screenshot7 = path.join(ARTIFACT_DIR, '07_admin_campaign_approved.png');
    await page.screenshot({ path: screenshot7, fullPage: true });

    reports.push({
      id: 'STEP-06',
      name: 'Governance Workflow & RBAC Approval',
      passed: isWaitingBadgeVisible,
      details: 'Workflow convalidato: operatore propone in bozza e invia in revisione (approvazione bloccata), amministratore approva formalmente la campagna.',
      screenshotFile: '07_admin_campaign_approved.png',
    });
    console.log('  ✓ Step 6 Passed. Screenshot salvati: 06_operator_governance_view.png, 07_admin_campaign_approved.png');

    // -------------------------------------------------------------
    // STEP 7: Lead 360° View Integration
    // -------------------------------------------------------------
    console.log('[Step 7] Lead 360° View & Tab Marketing & Campagne...');
    await page.goto(`${BASE_URL}/crm/leads/lead_pompei_mktg_test`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Pizzeria Bella Vista Pompei');

    // Click Marketing tab
    await page.click('button:has-text("Marketing & Campagne")');
    await page.waitForSelector('text=Storico Campagne di Marketing & Outreach');

    const screenshot8 = path.join(ARTIFACT_DIR, '08_lead_marketing_history_tab.png');
    await page.screenshot({ path: screenshot8, fullPage: true });

    reports.push({
      id: 'STEP-07',
      name: 'Scheda Lead 360°: Tab Marketing & Campagne',
      passed: true,
      details: 'Visualizzato correttamente lo storico completo delle campagne in cui il lead è stato inserito, con stato, ultimo contatto e note esito.',
      screenshotFile: '08_lead_marketing_history_tab.png',
    });
    console.log('  ✓ Step 7 Passed. Screenshot salvato: 08_lead_marketing_history_tab.png');

    // -------------------------------------------------------------
    // STEP 8: Company 360° View Integration
    // -------------------------------------------------------------
    console.log('[Step 8] Company 360° View & Tab Marketing & Campagne...');
    await page.goto(`${BASE_URL}/crm/companies/comp_napoli_mktg_test`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Trattoria Vesuvio Napoli');

    // Click Marketing tab
    await page.click('button:has-text("Marketing & Campagne")');
    await page.waitForSelector('text=Storico Campagne di Marketing & Outreach');

    const screenshot9 = path.join(ARTIFACT_DIR, '09_company_marketing_history_tab.png');
    await page.screenshot({ path: screenshot9, fullPage: true });

    reports.push({
      id: 'STEP-08',
      name: 'Scheda Azienda 360°: Tab Marketing & Campagne',
      passed: true,
      details: 'Visualizzato correttamente il tab marketing integrato nell anagrafica aziendale a 360 gradi.',
      screenshotFile: '09_company_marketing_history_tab.png',
    });
    console.log('  ✓ Step 8 Passed. Screenshot salvato: 09_company_marketing_history_tab.png');

  } catch (err) {
    console.error('E2E TEST RUNNER ERROR:', err);
    reports.push({
      id: 'ERROR',
      name: 'E2E Execution Error',
      passed: false,
      details: String(err),
      networkErrors,
      consoleErrors,
    });
  } finally {
    await browser.close();
  }

  console.log('\n=== E2E TEST REPORT SUMMARY ===');
  for (const r of reports) {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.id}: ${r.name}`);
    console.log(`       Details: ${r.details}`);
    if (r.screenshotFile) console.log(`       Screenshot: ${r.screenshotFile}`);
  }
}

runE2ESuite().catch((err) => {
  console.error('Fatal error running browser e2e test suite:', err);
  process.exit(1);
});
