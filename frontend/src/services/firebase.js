import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, query, orderBy, doc, updateDoc } from "firebase/firestore";

// Your web app's Firebase configuration
// For the prototype, replace these with your actual Firebase project config.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Initialize Firebase only if the config is provided
let app;
let db;

export const isFirebaseConfigured = firebaseConfig.apiKey !== "";

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Firebase initialized successfully.");
  } catch (error) {
    console.error("Error initializing Firebase", error);
  }
} else {
  console.warn("Firebase is not configured. Falling back to mock data.");
}

export { db, collection, onSnapshot, query, orderBy, doc, updateDoc };
