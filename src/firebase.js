// firebase.js — Replace supabase.js with this file
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyBWQIMis6sTO4idO-3YixhAC2pxK1V1wkI",
  authDomain:        "stayfit-23926.firebaseapp.com",
  projectId:         "stayfit-23926",
  storageBucket:     "stayfit-23926.firebasestorage.app",
  messagingSenderId: "541005083880",
  appId:             "1:541005083880:web:f254b924841b08d581055d",
};

const app = initializeApp(firebaseConfig);
export const db  = getFirestore(app);
export default db;
