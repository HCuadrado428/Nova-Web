# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Web del SMP de rol NOVA 2. El dueño (Hugo) habla español: los commits, los comentarios del código, los tests y los PR se escriben en español, como el resto del repo.

## Comandos

La web es estática y se publica con GitHub Pages tal cual está en `main`: **no hay paso de compilación**. Node (24, `.nvmrc`) solo sirve para revisar y probar.

```sh
npm start                 # sirve la carpeta en http://localhost:8000 (o: python3 -m http.server 8000)
npm run check             # formato + lint con Biome (en CI: npx biome ci .)
npm run fix               # arregla formato y lint
npm run test:unit         # i18n + árbol de relaciones, sin navegador ni emuladores
npm run test:rules        # firestore.rules contra el emulador de Firestore (necesita Java 11+)
npm run test:e2e          # la web real en Chromium (Playwright) contra emuladores de Firestore y Auth
npm test                  # los tres
npm run build:firebase    # regenera vendor/firebase.js
```

- Un solo test: `node --test --test-name-pattern="Lore" tests/e2e.test.js`, pero los de reglas y e2e necesitan los emuladores, así que se envuelven igual que en `package.json`: `npx firebase emulators:exec --only firestore,auth --project demo-nova "node --test --test-name-pattern='Lore' tests/e2e.test.js"`.
- e2e acepta `CHROMIUM_PATH` para usar un Chromium ya instalado (p.ej. `/opt/pw-browsers/chromium`) en vez de `npx playwright install chromium`.
- Abrir `index.html` con doble clic (`file://`) no funciona: los módulos ES necesitan que se sirva la carpeta.
- CI (`.github/workflows/comprobaciones.yml`) pasa Biome, comprueba que `vendor/firebase.js` coincide con lo que genera `build:firebase` y lanza `npm test`.

## Arquitectura

JS vanilla con módulos ES nativos, sin framework ni bundler (salvo el SDK de Firebase). Una sola página: `index.html` contiene todas las pantallas y carga `firebase-config.js` (script clásico que define `window.FIREBASE_CONFIG`) y `js/main.js`, que solo llama al `init*()` de cada sección (`js/intro.js`, `lore.js`, `rules.js`, `guides.js`, `personajes.js`, `password.js`, `adan.js`, `countdown.js`, `server-status.js`...).

- **Vistas:** la pantalla activa es un único atributo, `<body data-view="home|lore|rules|guides|personajes|password|adan">` (`js/views.js`: `setView`/`isView`), y el CSS decide qué se ve preguntando por ese valor. Las clases `booted` y `tab-hidden` del body son aparte y se combinan con cualquier vista. Los cambios entre páginas pasan por `channelSwitch()` (transición de "cambio de canal" con un candado para que no se solapen).
- **CSS:** `css/`, un archivo por sección; el orden de los `<link>` en `index.html` importa (`base.css` primero, `reduced-motion.css` al final).
- **Idiomas (es/en/pt):** todos los textos viven en `js/i18n/{es,en,pt}.js` (mismas claves) y el Lore en `js/data/lore.{es,en,pt}.js` (mismos pases en el mismo orden). En el HTML se marcan con `data-i18n`, `data-i18n-html` o `data-i18n-attr="attr:clave|attr2:clave2"`; en JS, `t('clave', { n })`. El HTML lleva también el texto en español como respaldo y `tests/i18n.test.js` exige que coincida con `es.js`. Cualquier cambio de texto se hace en los tres idiomas; `npm run test:unit` avisa de claves, `{huecos}` o `<strong>` que no cuadren. No se traducen los textos de los jugadores, las frases del alfabeto cifrado ni las palabras secretas del buscador.
- **Personajes (única parte con backend):** Firebase Auth (Google) + Firestore. El SDK se carga bajo demanda la primera vez que se abre Personajes (`js/personajes/firebase.js` → `import('../../vendor/firebase.js')`), así que el resto de la web no depende de Firebase y hay un e2e que lo comprueba. Si `FIREBASE_CONFIG.apiKey` es `'TU_API_KEY'` la sección se desactiva. Los tests inyectan `window.NOVA_FIREBASE_EMULATORS` para apuntar a los emuladores (proyecto `demo-nova`).
- **Datos en Firestore:** `personajes/{uid}` (un perfil por usuario, con una lista de `bloques`; los de `tipo: 'relacion'` alimentan el árbol de `js/relations-graph.js`, que exporta `buildGraph`/`layoutGraph` puros para testearlos sin navegador) y la subcolección `personajes/{uid}/comentarios`. Todo control de acceso está en `firestore.rules`; cualquier cambio en la forma de los datos requiere tocar las reglas y `tests/rules.test.js`. Las reglas no se despliegan solas: se publican a mano (consola o `npx firebase deploy --only firestore:rules --project nova-smp-6655e`).
- **`vendor/firebase.js` es generado:** no se edita a mano. Para usar una función nueva del SDK se añade a `tools/firebase-entry.js`, se ejecuta `npm run build:firebase` y se sube el resultado (CI falla si no coincide).

## Convenciones

- Biome: 2 espacios, comillas simples, punto y coma, líneas de 120. `vendor/` y `fonts/` quedan fuera.
- Las horas se guardan en UTC (p.ej. `data-end` de `#countdown` en `index.html` termina en `Z`; `js/countdown.js` muestra además la hora local).
- Las normas del servidor de Minecraft (claves `rules.minecraft.*` de los diccionarios) no se cambian sin confirmación de Hugo.
- Cada cambio va en su propio PR; no se fusiona sin permiso.
