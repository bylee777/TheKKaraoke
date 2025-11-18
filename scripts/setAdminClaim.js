#!/usr/bin/env node
/**
 * Usage:
 *   node scripts/setAdminClaim.js user@example.com [role]
 *
 * role: admin (default), staff, or both
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS or Firebase Admin service account
 * credentials to be available so the Admin SDK can authenticate.
 */

const fs = require('fs');
const path = require('path');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const DEFAULT_PROJECT_ID = 'thek-karaoke';
const DEFAULT_EMULATOR_HOST = '127.0.0.1:9099';

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

function parseCli() {
  const rawArgs = process.argv.slice(2);
  const flags = {};
  rawArgs
    .filter((arg) => arg.startsWith('--'))
    .forEach((arg) => {
      const trimmed = arg.replace(/^--/, '');
      const [key, value] = trimmed.split('=');
      flags[key] = value === undefined ? true : value;
    });

  const positional = rawArgs.filter((arg) => !arg.startsWith('--'));
  return {
    email: positional[0],
    role: (positional[1] || 'admin').toLowerCase(),
    flags,
  };
}

function resolveProjectId(flagProject) {
  if (flagProject) return flagProject;
  if (process.env.PROJECT_ID) return process.env.PROJECT_ID;
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
  if (process.env.FIREBASE_CONFIG) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_CONFIG);
      if (parsed?.projectId) {
        return parsed.projectId;
      }
    } catch (_) {
      // ignore JSON parse failures
    }
  }
  return DEFAULT_PROJECT_ID;
}

async function main() {
  loadEnv();
  const { email, role: roleArg, flags } = parseCli();

  if (!email) {
    console.error(
      'Usage: node scripts/setAdminClaim.js user@example.com [role] [--emulator] [--emulator-host=host:port] [--project=my-project]',
    );
    process.exit(1);
  }

  const flagProject = flags.project || flags.projectId;
  const projectId = resolveProjectId(flagProject);
  const emulatorHost =
    typeof flags['emulator-host'] === 'string' && flags['emulator-host']
      ? flags['emulator-host']
      : null;
  const emulatorEnabled =
    !!process.env.FIREBASE_AUTH_EMULATOR_HOST || flags.emulator || emulatorHost;

  if (emulatorEnabled && !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = emulatorHost || DEFAULT_EMULATOR_HOST;
    console.log(
      `Using Firebase Auth emulator at ${process.env.FIREBASE_AUTH_EMULATOR_HOST} for project ${projectId}.`,
    );
  }

  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    initializeApp({ projectId });
  } else {
    initializeApp({ credential: getCredential(), projectId });
  }

  const auth = getAuth();

  const user = await auth.getUserByEmail(email);
  let claims;
  if (roleArg === 'staff') {
    claims = { isStaff: true };
  } else if (roleArg === 'both') {
    claims = { isAdmin: true, isStaff: true };
  } else {
    claims = { isAdmin: true };
  }
  await auth.setCustomUserClaims(user.uid, claims);
  await auth.revokeRefreshTokens(user.uid);

  console.log(
    `Set ${Object.keys(claims)
      .map((key) => `${key}=true`)
      .join(', ')} for ${email} (uid ${user.uid}).`,
  );
  console.log('Users need to sign out/in for new claims to apply.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
