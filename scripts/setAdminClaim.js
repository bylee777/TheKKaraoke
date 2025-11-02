#!/usr/bin/env node
/**
 * Usage:
 *   node scripts/setAdminClaim.js user@example.com
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS or Firebase Admin service account
 * credentials to be available so the Admin SDK can authenticate.
 */

const fs = require('fs');
const path = require('path');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .forEach((line) => {
      const idx = line.indexOf('=');
      if (idx === -1) return;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    });
}

function getCredential() {
  try {
    return applicationDefault();
  } catch (err) {
    throw new Error(
      'Firebase Admin SDK credential not found. ' +
        'Set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON file.',
    );
  }
}

async function main() {
  loadEnv();
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/setAdminClaim.js user@example.com');
    process.exit(1);
  }

  initializeApp({ credential: getCredential() });
  const auth = getAuth();

  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { isAdmin: true });
  await auth.revokeRefreshTokens(user.uid);

  console.log(`Set isAdmin claim for ${email} (uid ${user.uid}).`);
  console.log('Users need to sign out/in for new claims to apply.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
