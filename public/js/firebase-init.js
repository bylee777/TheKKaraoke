// public/js/firebase-init.js
/* global firebase, Stripe */
// Initializes Firebase (App, Firestore, Storage, Functions) and Stripe,
// then exposes them on window so app.js can use them.
//
// Usage in your HTML (before js/app.js):
//   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
//   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-functions-compat.js"></script>
//   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
//   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-storage-compat.js"></script>
//   <script src="https://js.stripe.com/v3/"></script>
//   <script src="js/firebase-init.js"></script>
//   <script src="js/app.js"></script>

(function () {
  // ===== 1) REQUIRED: Paste your Firebase config here =====
  // Get it from Firebase Console -> Project settings -> General -> Your apps
  const firebaseConfig = {
    apiKey: 'AIzaSyBAlQmkR9MMjfKXofeuBBodzmZ5Gq20NO4',
    authDomain: 'thek-karaoke.firebaseapp.com',
    projectId: 'thek-karaoke',
    storageBucket: 'thek-karaoke.firebasestorage.app',
    messagingSenderId: '508456771115',
    appId: '1:508456771115:web:6e792cd798414ca8ac146e',
    measurementId: 'G-6S02LBR6NQ',
  };

  // (Optional) If you deployed Functions to a specific region, put it here.
  // If unsure, leave null and the default will be used.
  const FUNCTIONS_REGION = null; // e.g., "northamerica-northeast1" (Toronto) or "us-central1"

  const STRIPE_PUBLISHABLE_KEY =
    'pk_live_51KemZfB7gDWZecdIgivhhujMb6iWslsm37W4aDjUhwdUNlZPltc8IwIB05CkHDlcPPo2Wu9ZixEJdnpMlnmwPStm00TM78V9JV';

  // ===== 3) Sanity checks for SDKs loaded via HTML <script> tags =====
  if (typeof firebase === 'undefined') {
    console.error(
      '[firebase-init] Firebase SDK not found. Add the compat scripts before firebase-init.js.',
    );
    return;
  }
  if (typeof Stripe === 'undefined') {
    console.error(
      "[firebase-init] Stripe.js not found. Add <script src='https://js.stripe.com/v3/'></script> before firebase-init.js.",
    );
    return;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
  } catch (err) {
    console.error('[firebase-init] Failed to initialize Firebase app:', err);
  }

  let functions = null;
  try {
    functions = FUNCTIONS_REGION
      ? firebase.app().functions(FUNCTIONS_REGION)
      : firebase.functions();
  } catch (err) {
    console.error('[firebase-init] Failed to initialize Functions:', err);
  }

  let auth = null;
  try {
    auth = firebase.auth();
  } catch (err) {
    console.error('[firebase-init] Failed to initialize Auth:', err);
  }

  let db = null;
  try {
    db = firebase.firestore();
  } catch (err) {
    console.error('[firebase-init] Failed to initialize Firestore:', err);
  }

  let storage = null;
  try {
    storage = firebase.storage();
  } catch (err) {
    console.error('[firebase-init] Failed to initialize Storage:', err);
  }

  try {
    const useEmu =
      /[?&]useEmulator=1/.test(window.location.search) ||
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1';
    if (useEmu) {
      // NOTE: Ports pinned in firebase.json -> emulators
      const HOST = '127.0.0.1';
      const FN_PORT = 5001;
      const FS_PORT = 8085; // changed from 8080 to avoid conflicts
      const ST_PORT = 9199;
      const AUTH_PORT = 9099;
      if (functions && functions.useEmulator) functions.useEmulator(HOST, FN_PORT);
      if (db && db.useEmulator) db.useEmulator(HOST, FS_PORT);
      if (storage && storage.useEmulator) storage.useEmulator(HOST, ST_PORT);
      if (auth && auth.useEmulator) auth.useEmulator(`http://${HOST}:${AUTH_PORT}`);
      console.info('[firebase-init] Using Firebase Emulators');
    }
  } catch (err) {
    console.warn('[firebase-init] Emulator setup skipped:', err);
  }

  let stripe = null;
  try {
    stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
  } catch (err) {
    console.error('[firebase-init] Failed to initialize Stripe:', err);
  }

  window.firebaseApp = firebase.app();
  window.firebaseFunctions = functions;
  window.firebaseAuth = auth;
  window.firestore = db;
  window.storage = storage;
  window.stripe = stripe;

  console.info('[firebase-init] Firebase & Stripe initialized', {
    projectId: firebaseConfig.projectId,
    region: FUNCTIONS_REGION || 'default',
  });
})();
