// lib/firebase.js

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ✅ Firebase config from your project
const firebaseConfig = {
  apiKey: 'AIzaSyDrQFREskQpFxnY2EAMnBDDFq6dNd9jEfE',
  authDomain: 'thek-karaoke.firebaseapp.com',
  projectId: 'thek-karaoke',
  storageBucket: 'thek-karaoke.firebasestorage.app',
  messagingSenderId: '508456771115',
  appId: '1:508456771115:web:6e792cd798414ca8ac146e',
  measurementId: 'G-6S02LBR6NQ',
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Only export Firestore (no analytics!)
const db = getFirestore(app);

export { db };
