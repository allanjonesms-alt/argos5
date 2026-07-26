import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "aborda5",
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSy..." // wait, what's the API key?
};
// I can read it from .env
