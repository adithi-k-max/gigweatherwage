import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDVGhEY-u_pQ4S71MK45cHp6sWAFzuwE3s",
  authDomain: "gigweatherwage.firebaseapp.com" ,
  projectId: "gigweatherwage" ,
  storageBucket: "gigweatherwage.firebasestorage.app" ,
  messagingSenderId: "59858832620" ,
  appId: "1:59858832620:web:e2c7928503b839427869c9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
