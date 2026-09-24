# NOVA 2 — web

Web del SMP de rol NOVA 2: intro, Lore, Normas, Personajes (perfiles con
Firebase) y algún secreto. Se publica con GitHub Pages tal cual está en
`main`: **no hay que compilar nada**.

## Estructura

| Ruta | Qué es |
|---|---|
| `index.html`, `style.css` | La página y sus estilos |
| `js/main.js` | Punto de entrada: arranca cada sección |
| `js/intro.js`, `lore.js`, `rules.js`, `personajes.js`, `password.js`, `adan.js` | Una sección cada uno |
| `js/audio.js`, `views.js`, `utils.js` | Sonido, cambio de pantalla y utilidades compartidas |
| `js/data/lore.js` | **Los textos del Lore** (lo que se edita para cambiar la historia) |
| `firebase-config.js` | Configuración pública del proyecto de Firebase |
| `firestore.rules` | Reglas de seguridad de Firestore (ver abajo cómo publicarlas) |
| `vendor/firebase.js` | SDK de Firebase generado (ver `vendor/README.md`) |
| `fonts/`, `images/` | Fuentes e imágenes |
| `tests/` | Tests (reglas y la web en un navegador) |

## Verla en local

Los módulos de JavaScript no funcionan abriendo `index.html` con doble clic:
hay que servir la carpeta.

```sh
python3 -m http.server 8000     # o: npm start
```

y abrir http://localhost:8000

## Herramientas (opcional: solo para revisar y probar)

Necesitan [Node 24](https://nodejs.org/) (`.nvmrc`) y, para los tests,
Java 11 o superior (los emuladores de Firebase lo usan).

```sh
npm install
npm run check          # formato y lint (Biome)
npm run fix            # arregla formato y lint automáticamente
npm test               # reglas de Firestore + la web en Chromium, contra emuladores
```

La primera vez que se pasan los tests hay que instalar Chromium para
Playwright: `npx playwright install chromium`.

Todo esto lo hace también la GitHub Action (`.github/workflows/comprobaciones.yml`)
en cada push a `main` y en cada pull request.

## Firebase

- **Reglas:** `firestore.rules` es la copia versionada. Para aplicarlas,
  pégalas en la consola (Firestore → Rules → Publish) o, con el CLI,
  `npx firebase deploy --only firestore:rules --project nova-smp-6655e`.
- **Actualizar el SDK:** cambia la versión de `firebase` en `package.json`,
  `npm install`, `npm run build:firebase` y sube `vendor/firebase.js`.
