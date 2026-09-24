// Punto de entrada para generar vendor/firebase.js (npm run build:firebase).
//
// Solo se exporta lo que usa js/personajes.js: esbuild descarta el resto del
// SDK. Si personajes.js empieza a usar otra función de Firebase, añádela aquí
// y vuelve a generar el archivo.
export { initializeApp } from 'firebase/app';
export {
  connectAuthEmulator,
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
export {
  addDoc,
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
