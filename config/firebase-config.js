// firebase-config.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAcQCn1NfGujTUIBAWr_Xe36kBEUKnk9JU",
  authDomain: "project-bpr-6d9ae.firebaseapp.com",
  projectId: "project-bpr-6d9ae",
  storageBucket: "project-bpr-6d9ae.firebasestorage.app",
  messagingSenderId: "1022500973352",
  appId: "1:1022500973352:web:5437bb09d8e09b94f67e1d",
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Inisialisasi Firestore
const db = getFirestore(app);

export { db };
