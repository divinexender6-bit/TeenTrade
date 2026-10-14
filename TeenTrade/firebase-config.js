
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCsTuuylWlMyfJzvDXLuJaHLlXb90Cn_3U",
  authDomain: "teentrade-9f1bd.firebaseapp.com",
  projectId: "teentrade-9f1bd",
  storageBucket: "teentrade-9f1bd.firebasestorage.app",
  messagingSenderId: "692110459601",
  appId: "1:692110459601:web:f07e64da3256e084887bf0",
  measurementId: "G-EFTJY5CLJY"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
