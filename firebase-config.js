// ======================================================
// Configuración de Firebase para "Personajes" (Lore)
// ======================================================
//
// Este objeto NO es secreto: es un identificador público del proyecto de
// Firebase, seguro de subir tal cual al repositorio. La seguridad real la
// ponen las reglas de Firestore (quién puede leer/escribir cada documento),
// no ocultar esta configuración.
//
// Cómo conseguirla:
//   1. console.firebase.google.com -> crear un proyecto.
//   2. Authentication -> Sign-in method -> activar el proveedor "Google".
//   3. Authentication -> Settings -> Authorized domains -> comprobar que
//      está tu dominio de GitHub Pages (y "localhost", que ya viene por
//      defecto) para que el login con Google funcione ahí también.
//   4. Firestore Database -> Create database -> modo "production".
//   5. Firestore -> Rules -> pega las reglas de firestore.rules (en la raíz
//      de este repo) y publica.
//   6. Project settings (icono de engranaje) -> General -> "Your apps" ->
//      Add app -> Web (</>) -> copia el objeto de configuración que te da
//      y sustituye los valores de abajo por los tuyos.
//
// Mientras esto tenga los valores de ejemplo, initPersonajes() detecta que
// no está configurado y desactiva la sección (sin romper el resto de la
// web) mostrando un aviso en vez de intentar conectar con Firebase.
window.FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCBAcrwN6Uk0ovSrbwj7Tp1PKRIA5FrAK4',
  authDomain: 'nova-smp-6655e.firebaseapp.com',
  projectId: 'nova-smp-6655e',
  storageBucket: 'nova-smp-6655e.firebasestorage.app',
  messagingSenderId: '518373518736',
  appId: '1:518373518736:web:d33a383b37209c89c91715',
};
