import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCiXsOK7o-UDfXEYn0oB8CxhlpwCSXo0SY',
  authDomain: 'lab-pc-tracker-lnmiit.firebaseapp.com',
  projectId: 'lab-pc-tracker-lnmiit',
  storageBucket: 'lab-pc-tracker-lnmiit.firebasestorage.app',
  messagingSenderId: '757846575678',
  appId: '1:757846575678:web:8011d14a38e88d1d59df6f',
  measurementId: 'G-WNNGX700FT',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const labsCollection = collection(db, 'labs');

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  hd: 'lnmiit.ac.in',
  prompt: 'select_account',
});

export {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
};
