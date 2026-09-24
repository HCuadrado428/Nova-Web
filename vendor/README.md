# vendor/

## firebase.js

SDK de Firebase para la web (Auth + Firestore), **generado, no se edita a mano**.

- Sale del paquete npm `firebase` (versión fijada en `package.json`) con
  `npm run build:firebase`, que usa esbuild para quedarse solo con las
  funciones que importa `tools/firebase-entry.js`.
- Lo carga `js/personajes.js` la primera vez que se abre Personajes.
- Para actualizar Firebase: cambia la versión de `firebase` en `package.json`,
  `npm install`, `npm run build:firebase` y sube el `vendor/firebase.js` nuevo.
  La GitHub Action avisa si el archivo no coincide con la versión instalada.

Firebase JS SDK © Google LLC, con licencia Apache 2.0
(https://github.com/firebase/firebase-js-sdk/blob/main/LICENSE). Los avisos
de licencia de sus dependencias van al final del propio archivo.
