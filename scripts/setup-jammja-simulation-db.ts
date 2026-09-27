import path from 'path';
import fs from 'fs';

// Force DATABASE_PATH and STORAGE_PATH before importing DB modules
const isolatedDbPath = path.resolve(process.cwd(), 'sqlite-test-jammja.db');
const isolatedStoragePath = path.resolve(process.cwd(), 'storage_vault_test_jammja');

process.env.DATABASE_PATH = isolatedDbPath;
process.env.STORAGE_PATH = isolatedStoragePath;

if (!fs.existsSync(isolatedStoragePath)) {
  fs.mkdirSync(isolatedStoragePath, { recursive: true });
}

import { db, users, initDatabase, organizationSettings } from '@ai-crm/db';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../apps/web/src/lib/auth';
import { seedProcessTemplatesIfEmpty } from '../apps/web/src/lib/process-templates-service';
import { getOrganizationSettings } from '../apps/web/src/lib/settings-service';

async function setup() {
  console.log('====================================================');
  console.log('📦 PREDISPOSIZIONE AMBIENTE DI TEST ISOLATO');
  console.log(`📁 Database SQLite di Test: ${isolatedDbPath}`);
  console.log(`📁 Storage Vault di Test:   ${isolatedStoragePath}`);
  console.log('====================================================');

  initDatabase();

  const now = new Date().toISOString();
  const passwordHash = await hashPassword('Simulazione2026!');

  // Clean old simulation users if existing
  db.delete(users).where(eq(users.email, 'admin@jammja-simulation.local')).run();
  db.delete(users).where(eq(users.email, 'operatore@jammja-simulation.local')).run();

  // Create Admin
  const adminId = 'usr_admin_simulation';
  db.insert(users).values({
    id: adminId,
    name: 'Admin Simulazione',
    email: 'admin@jammja-simulation.local',
    passwordHash,
    role: 'admin',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }).run();

  // Create Operator
  const operatorId = 'usr_operator_simulation';
  db.insert(users).values({
    id: operatorId,
    name: 'Operatore Marketing',
    email: 'operatore@jammja-simulation.local',
    passwordHash,
    role: 'operator',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }).run();

  // Seed process templates
  await seedProcessTemplatesIfEmpty(adminId);

  // Seed organization settings
  getOrganizationSettings('default');

  console.log('✅ Utenti demo creati nell\'ambiente di test isolato:');
  console.log(`   - Admin:     admin@jammja-simulation.local (Password: Simulazione2026!)`);
  console.log(`   - Operatore: operatore@jammja-simulation.local (Password: Simulazione2026!)`);
  console.log('✅ Modelli di processo standard inizializzati.');
  console.log('✅ Impostazioni organizzazione inizializzate.');
  console.log('====================================================');
}

setup().catch((err) => {
  console.error('❌ Errore durante il setup:', err);
  process.exit(1);
});
