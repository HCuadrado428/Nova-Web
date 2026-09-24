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
| `js/relations-graph.js` | Árbol de relaciones entre personajes (dentro de Personajes) |
| `js/server-status.js`, `js/i18n.js` | Estado del servidor en la intro; idiomas |
| `js/data/lore.es.js` | **Los textos del Lore** en español (lo que se edita para cambiar la historia) |
| `js/data/lore.en.js`, `lore.pt.js` | El Lore traducido (mismos pases en el mismo orden) |
| `js/i18n/es.js`, `en.js`, `pt.js` | **Todos los demás textos** (botones, normas, avisos...) en cada idioma |
| `firebase-config.js` | Configuración pública del proyecto de Firebase |
| `firestore.rules` | Reglas de seguridad de Firestore (ver abajo cómo publicarlas) |
| `vendor/firebase.js` | SDK de Firebase generado (ver `vendor/README.md`) |
| `fonts/`, `images/` | Fuentes e imágenes |
| `tests/` | Tests (reglas y la web en un navegador) |

## Idiomas

La web está en español, inglés y portugués (de Brasil). Se elige sola según el
idioma del navegador (si no es ninguno de los tres, español) y se puede
cambiar con los botones **ES · EN · PT** de la intro; se recuerda la elección.

- **Cambiar un texto:** búscalo en `js/i18n/es.js` (o en `js/data/lore.es.js`
  si es del Lore) y cámbialo también en `en.js` y `pt.js`.
- **Añadir un texto nuevo:** ponle una clave en los tres diccionarios; en el
  HTML se marca con `data-i18n="clave"` y en JS se usa `t('clave')`.
- `npm run test:unit` avisa si falta alguna clave en algún idioma, si el Lore
  traducido no tiene los mismos pases o si el español del HTML no coincide
  con `es.js`.

No se traducen: lo que escribe cada jugador (personajes y comentarios), las
frases en el alfabeto cifrado del arranque ni las palabras secretas del
buscador.

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
