// public/js/firebase-init.js
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
  // Get it from Firebase Console → Project settings → General → Your apps
  const firebaseConfig = {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT_ID.appspot.com',
    appId: 'YOUR_APP_ID',
    // messagingSenderId: "optional"
  };

  // (Optional) If you deployed Functions to a specific region, put it here.
  // If unsure, leave null and the default will be used.
  const FUNCTIONS_REGION = null; // e.g., "northamerica-northeast1" (Toronto) or "us-central1"

  const STRIPE_PUBLISHABLE_KEY = 'pk_test_XXXXXXXXXXXXXXXXXXXXXXXX';

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
      // NOTE: Adjust ports to match your emulator settings
      if (functions && functions.useEmulator) functions.useEmulator('localhost', 5001);
      if (db && db.useEmulator) db.useEmulator('localhost', 8080);
      if (storage && storage.useEmulator) storage.useEmulator('localhost', 9199);
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
  window.firestore = db;
  window.storage = storage;
  window.stripe = stripe;

  console.info('[firebase-init] Firebase & Stripe initialized', {
    projectId: firebaseConfig.projectId,
    region: FUNCTIONS_REGION || 'default',
  });
})();
