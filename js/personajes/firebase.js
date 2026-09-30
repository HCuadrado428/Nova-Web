// ======================================================
// Personajes: conexión con Firebase
// ======================================================

/* ---------------------------------------------------
   Carga de Firebase bajo demanda
   El SDK solo lo necesita esta sección, así que no se descarga al entrar en
   la web sino la primera vez que se abre Personajes (o un link directo a un
   personaje). Se sirve desde la propia web (vendor/firebase.js, generado con
   "npm run build:firebase" con solo las funciones que se usan aquí), no desde
   gstatic.com: pesa menos y no lo cortan los bloqueadores.
--------------------------------------------------- */
let firebaseLoad = null;

export function loadFirebase() {
  if (!firebaseLoad) {
    firebaseLoad = import('../../vendor/firebase.js').then((fb) => {
      const app = fb.initializeApp(window.FIREBASE_CONFIG);
      const auth = fb.getAuth(app);
      const db = fb.getFirestore(app);
      // Solo para los tests (tests/e2e.test.js): apunta a los emuladores
      // locales de Firebase en vez de al proyecto real.
      const emulators = window.NOVA_FIREBASE_EMULATORS;
      if (emulators) {
        fb.connectAuthEmulator(auth, emulators.auth, { disableWarnings: true });
        fb.connectFirestoreEmulator(db, emulators.firestoreHost, emulators.firestorePort);
      }
      return { fb, auth, db };
    });
    // Si falla (sin conexión...), se olvida para poder reintentarlo luego.
    firebaseLoad.catch(() => {
      firebaseLoad = null;
    });
  }
  return firebaseLoad;
}

// Mientras firebase-config.js siga con los valores de ejemplo, la sección se
// desactiva en vez de intentar conectar con Firebase.
export const isFirebaseConfigured = () => !!window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey !== 'TU_API_KEY';
