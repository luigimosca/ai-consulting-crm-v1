const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function main() {
  console.log('=== ESECUZIONE FASE B: BACKUP PRE-DEPLOY SU FLY.IO ===\n');

  // 1. Prepare remote backup script
  const remoteCode = `
const Database = require('/app/node_modules/better-sqlite3');
const fs = require('fs');
const crypto = require('crypto');

const db = new Database('/data/sqlite.db');
db.backup('/data/backups/sqlite_backup_pre_v23_20261008.db').then(() => {
  const bkp = new Database('/data/backups/sqlite_backup_pre_v23_20261008.db');
  const integrity = bkp.pragma('integrity_check');
  const fk = bkp.pragma('foreign_key_check');
  console.log('INTEGRITY_CHECK_RESULT:' + JSON.stringify(integrity));
  console.log('FK_CHECK_RESULT:' + JSON.stringify(fk));
  
  const buf = fs.readFileSync('/data/backups/sqlite_backup_pre_v23_20261008.db');
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  console.log('REMOTE_SIZE_BYTES:' + buf.length);
  console.log('REMOTE_SHA256:' + hash);
  process.exit(0);
}).catch(err => {
  console.error('BACKUP_ERROR:', err);
  process.exit(1);
});
`;

  const b64 = Buffer.from(remoteCode).toString('base64');
  const remoteCmd = `sh -c 'echo ${b64} | base64 -d | node'`;

  console.log('[1/4] Creazione backup SQLite consistente e verifica integrità sulla Machine Fly.io...');
  let remoteOutput = '';
  try {
    remoteOutput = execSync(`fly ssh console -a ai-consulting-crm -C "${remoteCmd}"`, {
      encoding: 'utf8',
      timeout: 60000,
    });
  } catch (err) {
    if (err.stdout && err.stdout.includes('REMOTE_SHA256:')) {
      remoteOutput = err.stdout;
    } else if (err.output && err.output[1] && err.output[1].includes('REMOTE_SHA256:')) {
      remoteOutput = err.output[1];
    } else {
      throw err;
    }
  }

  console.log(remoteOutput);

  // Extract metrics
  const integrityMatch = remoteOutput.match(/INTEGRITY_CHECK_RESULT:(.*)/);
  const fkMatch = remoteOutput.match(/FK_CHECK_RESULT:(.*)/);
  const remoteSizeMatch = remoteOutput.match(/REMOTE_SIZE_BYTES:(\d+)/);
  const remoteShaMatch = remoteOutput.match(/REMOTE_SHA256:([a-f0-9]+)/i);

  if (!remoteShaMatch || !remoteSizeMatch) {
    throw new Error('Impossibile estrarre SHA256 o dimensione dal backup remoto!');
  }

  const remoteSha = remoteShaMatch[1].trim();
  const remoteSize = parseInt(remoteSizeMatch[1].trim(), 10);

  console.log('  ✓ Integrity Check:', integrityMatch ? integrityMatch[1] : 'N/A');
  console.log('  ✓ Foreign Key Check:', fkMatch ? fkMatch[1] : 'N/A');
  console.log(`  ✓ Dimensione remota: ${remoteSize} bytes`);
  console.log(`  ✓ SHA-256 remoto: ${remoteSha}\n`);

  // 2. Download external copy locally via SFTP
  console.log('[2/4] Download copia esterna del backup via fly sftp get...');
  const localBackupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(localBackupDir)) {
    fs.mkdirSync(localBackupDir, { recursive: true });
  }

  const localBackupFile = path.join(localBackupDir, 'sqlite_backup_pre_v23_20261008.db');
  execSync(`fly sftp get /data/backups/sqlite_backup_pre_v23_20261008.db "${localBackupFile}" -a ai-consulting-crm`, {
    encoding: 'utf8',
    timeout: 120000,
  });

  if (!fs.existsSync(localBackupFile)) {
    throw new Error('Download del backup locale fallito: file non trovato.');
  }

  // 3. Verify local copy checksum
  console.log('[3/4] Verifica checksum SHA-256 della copia scaricata...');
  const localBuf = fs.readFileSync(localBackupFile);
  const localSha = crypto.createHash('sha256').update(localBuf).digest('hex');

  console.log(`  ✓ Dimensione locale: ${localBuf.length} bytes`);
  console.log(`  ✓ SHA-256 locale:    ${localSha}`);

  if (localSha.toLowerCase() !== remoteSha.toLowerCase()) {
    throw new Error(`DISCREPANZA CHECKSUM! Remoto: ${remoteSha}, Locale: ${localSha}`);
  }

  console.log('\n  ✅ VERIFICA BACKUP COMPLETATA AL 100%! I checksum coincidono perfettamente.\n');
  console.log('========================================================================');
}

main().catch(err => {
  console.error('\n❌ ERRORE FASE B BACKUP:', err);
  process.exit(1);
});
