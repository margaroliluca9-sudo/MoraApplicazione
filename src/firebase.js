// Connessione a Firebase (database e autenticazione).
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// --- CONFIGURAZIONE FIREBASE ---
export const firebaseConfig = {
  apiKey: "AIzaSyCQ3VhCtvxIP2cxtdSgMzYXaTg4E1zPlZE",
  authDomain: "mora-app-36607.firebaseapp.com",
  projectId: "mora-app-36607",
  storageBucket: "mora-app-36607.firebasestorage.app",
  messagingSenderId: "1039836991600",
  appId: "1:1039836991600:web:dc33445a0cd54a9473e4b5",
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

try {
  enableIndexedDbPersistence(db).catch((err) =>
    console.log("Persistenza:", err.code)
  );
} catch (e) {
  console.log("Err Persistenza:", e);
}

export const appId = "mora-maintenance-v1";
