import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

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
export const cloudDoc = doc(db, 'labTracker', 'main');
export { setDoc, onSnapshot };
