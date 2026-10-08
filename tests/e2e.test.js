// Tests de extremo a extremo: la web real en Chromium (Playwright), con el
// SDK real de Firebase (vendor/firebase.js) apuntando a los emuladores
// locales de Firestore y Auth. Se lanzan con: npm run test:e2e
//
// Variables opcionales:
//   CHROMIUM_PATH  -> ejecutable de Chromium a usar (si no, el de Playwright)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { build } from 'esbuild';
import { collection, doc, getDoc, getDocs, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { chromium } from 'playwright';
import { startStaticServer } from './static-server.js';

const EMULATORS = { auth: 'http://127.0.0.1:9099', firestoreHost: '127.0.0.1', firestorePort: 8080 };
// Configuración de pruebas (proyecto "demo-*": el emulador nunca toca Firebase de verdad).
const TEST_CONFIG = `window.FIREBASE_CONFIG = ${JSON.stringify({
  apiKey: 'demo-key',
  authDomain: 'demo-nova.firebaseapp.com',
  projectId: 'demo-nova',
  appId: 'demo-app',
})};
window.CLOUDINARY_CONFIG = { cloudName: 'demo-nova', uploadPreset: 'demo-preset' };`;
const INTRO_MS = 3400; // hasta que se ven los botones tras pulsar la pantalla de entrada
const CHANNEL_MS = 1400; // transición de canal completa

let server;
let baseUrl;
let browser;
let env;
let authHelper;

before(async () => {
  ({ server, url: baseUrl } = await startStaticServer());
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  env = await initializeTestEnvironment({
    projectId: 'demo-nova',
    firestore: {
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
      host: EMULATORS.firestoreHost,
      port: EMULATORS.firestorePort,
    },
  });
  // Iniciar sesión con el popup de Google necesita el dominio real del
  // proyecto, así que en los tests se entra con una credencial falsa de
  // Google (que el emulador de Auth acepta) desde un SDK aparte en la misma
  // página. La sesión queda guardada en IndexedDB y la web la recoge al
  // arrancar Firebase, igual que cuando alguien vuelve con la sesión abierta.
  const helper = await build({
    stdin: {
      contents: `
        import { initializeApp } from 'firebase/app';
        import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
        export async function signIn(config, emulatorUrl, uid, name) {
          // Misma app "[DEFAULT]" y misma apiKey que la web: la sesión se guarda
          // en IndexedDB bajo esa clave, y es donde la web la buscará.
          const auth = getAuth(initializeApp(config));
          connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
          const idToken = JSON.stringify({ sub: uid, email: uid + '@test.dev', email_verified: true, name });
          const { user } = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
          return user.uid; // el emulador genera el uid, no es el "sub" de la credencial
        }`,
      resolveDir: import.meta.dirname,
    },
    bundle: true,
    format: 'esm',
    write: false,
  });
  authHelper = helper.outputFiles[0].text;
});

after(async () => {
  await browser?.close();
  server?.close();
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  const ahora = Timestamp.now();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'personajes/kira'), {
      nombre: 'Kira',
      minecraftUsername: 'Kira_MC',
      fotoUrl: null,
      bloques: [
        { id: '1', tipo: 'texto', contenido: 'Hola' },
        { id: '2', tipo: 'relacion', uid: 'zed', nombre: 'Zed', etiqueta: 'hermano' },
      ],
      actualizadoEn: ahora,
      creadoEn: ahora,
    });
    await setDoc(doc(db, 'personajes/zed'), {
      nombre: 'Zed',
      minecraftUsername: null,
      fotoUrl: null,
      bloques: [],
      actualizadoEn: ahora,
      creadoEn: ahora,
    });
    await setDoc(doc(db, 'personajes/kira/comentarios/c1'), {
      autorUid: 'zed',
      autorNombre: 'Zed',
      texto: 'Buenas',
      creadoEn: ahora,
    });
  });
});

// ---------- utilidades ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const STATUS_ONLINE = { online: true, players: { online: 5, max: 20 } };

async function openPage({
  hash = '',
  reducedMotion = 'no-preference',
  blockFirebase = false,
  signedInAs = null,
  serverStatus = STATUS_ONLINE, // respuesta falsa de api.mcsrvstat.us; null = la API no responde
  locale = 'es-ES', // idioma del navegador: decide el idioma inicial de la web
  timezoneId = 'Europe/Madrid', // zona horaria del navegador
  now = null, // fecha falsa del navegador (el reloj sigue corriendo desde ahí)
} = {}) {
  const context = await browser.newContext({
    locale,
    timezoneId,
    reducedMotion,
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  await context.route('**/firebase-config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: TEST_CONFIG }));
  await context.route('**/__test__/auth-helper.js', (r) =>
    r.fulfill({ contentType: 'text/javascript', body: authHelper }),
  );
  if (blockFirebase) await context.route('**/vendor/firebase.js', (r) => r.abort());
  // Estado del servidor: nunca se consulta la API real desde los tests.
  await context.route('https://api.mcsrvstat.us/**', (r) =>
    serverStatus ? r.fulfill({ json: serverStatus, headers: { 'Access-Control-Allow-Origin': '*' } }) : r.abort(),
  );
  await context.addInitScript((emulators) => {
    window.NOVA_FIREBASE_EMULATORS = emulators;
  }, EMULATORS);

  if (now) await context.clock.install({ time: new Date(now) });

  const page = await context.newPage();
  page.errors = [];
  page.firebaseRequests = 0;
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('request', (req) => {
    if (req.url().includes('/vendor/firebase.js')) page.firebaseRequests += 1;
  });
  await page.goto(baseUrl + hash);
  if (signedInAs) {
    const config = await page.evaluate(() => window.FIREBASE_CONFIG);
    page.uid = await page.evaluate(
      async ([cfg, url, uid, name]) => (await import('/__test__/auth-helper.js')).signIn(cfg, url, uid, name),
      [config, EMULATORS.auth, signedInAs.uid, signedInAs.name],
    );
  }
  return page;
}

const view = (page) => page.evaluate(() => document.body.dataset.view);
const text = (page, selector) => page.locator(selector).first().textContent();
const style = (page, selector, prop) =>
  page.evaluate(([s, p]) => getComputedStyle(document.querySelector(s))[p], [selector, prop]);

async function enter(page) {
  await page.click('#enter-gate');
  await sleep(INTRO_MS);
}

async function openPersonajes(page) {
  await page.click('#lore-menu-btn');
  await page.click('#lore-personajes-btn');
  await sleep(CHANNEL_MS);
  // Espera a que el directorio termine de cargar: "Cargando personajes..."
  // también usa .personajes-empty, así que no basta con que aparezca algo.
  await page.waitForFunction(() => {
    const grid = document.getElementById('personajes-grid');
    return grid.children.length > 0 && !grid.textContent.includes('Cargando');
  });
}

async function openProfile(page, nombre) {
  await page.locator('.personajes-card', { hasText: nombre }).click();
  await page.locator('#personajes-view-profile.is-active').waitFor();
}

const commentTexts = (page) => page.locator('.personajes-comment-text').allTextContents();

// ---------- intro, Lore, Normas, contraseña ----------
describe('web sin Firebase', () => {
  test('Firebase no se descarga al entrar en la web', async () => {
    const page = await openPage();
    await enter(page);
    assert.equal(await view(page), 'home');
    assert.equal(page.firebaseRequests, 0);
    assert.deepEqual(page.errors, []);
    await page.context().close();
  });

  test('cuenta atrás "Be The Boss" (js/data/events.js): hasta el 10 oct 20:00 UTC, con la hora local', async () => {
    const units = (page) => page.locator('#countdown [data-unit]').allTextContents();
    // Quedan 1 d 1 h 29 min 45 s. Desde México (UTC-6): 14:00 en su hora.
    const page = await openPage({ now: '2026-10-09T18:30:15Z', timezoneId: 'America/Mexico_City' });
    await enter(page);
    assert.equal(await page.isVisible('#countdown'), true);
    assert.equal(await text(page, '.countdown-title'), 'Be The Boss');
    const [days, hours, minutes, seconds] = (await units(page)).map(Number);
    assert.deepEqual([days, hours, minutes], [1, 1, 29]);
    assert.ok(seconds > 30 && seconds <= 45, `segundos: ${seconds}`); // el reloj corre durante enter()
    const date = await text(page, '#countdown-date');
    assert.match(date, /20:00 UTC/);
    assert.match(date, /14:00/);
    await page.click('.lang-btn[data-lang="en"]');
    assert.match(await text(page, '#countdown-date'), /20:00 UTC · Your time: .*14:00/);
    assert.equal(await text(page, '.countdown-label'), 'days');
    assert.deepEqual(page.errors, []);
    await page.context().close();

    // Ya pasada la hora: aviso en vez de números.
    const late = await openPage({ now: '2026-10-10T20:00:01Z' });
    await enter(late);
    assert.equal(await late.isVisible('#countdown-timer'), false);
    assert.equal(await late.isVisible('#countdown-done'), true);
    assert.equal(await text(late, '#countdown-done'), '¡Ha llegado la hora!');
    assert.equal(await late.isVisible('#countdown-ics-btn'), false);
    await late.context().close();

    // Acabado el evento (3 horas) y sin más en la lista: la cuenta atrás desaparece.
    const over = await openPage({ now: '2026-10-10T23:00:01Z' });
    await enter(over);
    assert.equal(await over.isVisible('#countdown'), false);
    assert.deepEqual(over.errors, []);
    await over.context().close();
  });

  test('cuenta atrás: "Añadir al calendario" descarga el .ics del evento en UTC', async () => {
    const page = await openPage({ now: '2026-10-09T18:30:15Z' });
    await enter(page);
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#countdown-ics-btn')]);
    assert.equal(download.suggestedFilename(), 'nova2-be-the-boss.ics');
    const ics = readFileSync(await download.path(), 'utf8');
    assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
    assert.match(ics, /\r\nDTSTART:20261010T200000Z\r\n/);
    assert.match(ics, /\r\nSUMMARY:NOVA 2 · Be The Boss\r\n/);
    assert.match(ics, /\r\nDESCRIPTION:.*IP: xray\.dathost\.net:17487\r\n/);
    assert.deepEqual(page.errors, []);
    await page.context().close();
  });

  test('teclado: antes de entrar, Tab solo llega a la pantalla de entrada', async () => {
    const page = await openPage();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'enter-gate');
    await page.keyboard.press('Tab');
    assert.notEqual(await page.evaluate(() => document.activeElement.id), 'download-modpack');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Enter'); // Enter sobre el botón = entrar
    await sleep(INTRO_MS);
    assert.ok(await page.evaluate(() => document.body.classList.contains('booted')));
    // Ya dentro, Tab llega a los botones (sigue desde donde estaba la pantalla de entrada).
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'lore-menu-btn');
    await page.context().close();
  });

  test('Lore: navegación con teclado y botones', async () => {
    const page = await openPage();
    await enter(page);
    await page.click('#lore-menu-btn');
    await page.click('#lore-nova-btn');
    await sleep(CHANNEL_MS);
    assert.equal(await view(page), 'lore');
    assert.match(await style(page, '.intro-static', 'animationPlayState'), /paused/);
    assert.equal(await style(page, '.intro-hero-inner', 'animationPlayState'), 'paused');
    assert.equal(await style(page, '#password-trigger-btn', 'visibility'), 'hidden');
    assert.equal(await text(page, '#lore-progress'), '1 / 10');
    await page.keyboard.press('ArrowRight');
    assert.equal(await text(page, '#lore-progress'), '2 / 10');
    await page.click('#lore-next-btn');
    await page.keyboard.press('Space'); // foco en "Siguiente": un solo avance, no dos
    assert.equal(await text(page, '#lore-progress'), '4 / 10');
    await page.keyboard.press('Escape');
    await sleep(CHANNEL_MS);
    assert.equal(await view(page), 'home');
    assert.equal(await style(page, '.intro-hero-inner', 'animationPlayState'), 'running');
    assert.deepEqual(page.errors, []);
    await page.context().close();
  });

  test('Lore: espacio en el vídeo no pasa de pase, y al salir el vídeo se quita', async () => {
    const page = await openPage();
    await enter(page);
    await page.click('#lore-menu-btn');
    await page.click('#lore-antes-btn');
    await sleep(CHANNEL_MS);
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
    assert.equal(await text(page, '#lore-progress'), '6 / 6');
    const video = page.locator('video.lore-slide-video-el');
    assert.equal(await video.getAttribute('preload'), 'metadata');
    assert.equal(await video.getAttribute('poster'), 'images/lore-video-poster.jpg');
    await video.focus();
    await page.keyboard.press('Space');
    await sleep(CHANNEL_MS);
    assert.equal(await view(page), 'lore');
    assert.equal(await text(page, '#lore-progress'), '6 / 6');
    await page.click('#lore-back-btn');
    await sleep(CHANNEL_MS);
    assert.equal(await page.locator('video').count(), 0);
    await page.context().close();
  });

  test('Guías: abrir, cambiar de pestaña y volver', async () => {
    const page = await openPage();
    await enter(page);
    await page.click('#guides-open-btn');
    await sleep(CHANNEL_MS);
    assert.equal(await view(page), 'guides');
    assert.ok(await page.locator('#guides-panel-start').isVisible());
    await page.click('#guides-switch-rel');
    assert.ok(await page.locator('#guides-panel-rel').isVisible());
    assert.ok(!(await page.locator('#guides-panel-start').isVisible()));
    await page.keyboard.press('Escape');
    await sleep(CHANNEL_MS);
    assert.equal(await view(page), 'home');
    await page.context().close();
  });

  test('Normas: abrir, cambiar de panel y volver', async () => {
    const page = await openPage();
    await enter(page);
    await page.click('#rules-menu-btn');
    await page.click('#rules-minecraft-btn');
    await sleep(CHANNEL_MS);
    assert.equal(await view(page), 'rules');
    assert.ok(await page.locator('#rules-panel-minecraft').isVisible());
    await page.click('#rules-switch-objetos');
    assert.ok(await page.locator('#rules-panel-objetos').isVisible());
    assert.ok(!(await page.locator('#rules-panel-minecraft').isVisible()));
    await page.keyboard.press('Escape');
    await sleep(CHANNEL_MS);
    assert.equal(await view(page), 'home');
    await page.context().close();
  });

  test('Contraseña: pista a los 3 fallos y la palabra secreta abre 4D4N', async () => {
    const page = await openPage();
    await enter(page);
    await page.click('#password-trigger-btn');
    assert.equal(await view(page), 'password');
    assert.equal(await style(page, '.noise-overlay', 'visibility'), 'hidden');
    for (const palabra of ['uno', 'dos', 'tres']) {
      await page.fill('#password-input', palabra);
      await page.press('#password-input', 'Enter');
    }
    assert.equal(await page.locator('#password-hint-btn.is-visible').count(), 1);
    // Nombres internos de JavaScript no cuentan como palabra (antes "__proto__" daba error).
    for (const palabra of ['__proto__', 'constructor']) {
      await page.fill('#password-input', palabra);
      await page.press('#password-input', 'Enter');
      await page.waitForFunction(() => document.getElementById('password-feedback').textContent === 'Nada por aquí.');
    }
    await page.click('#password-hint-btn');
    assert.notEqual(await page.inputValue('#password-input'), '4d4n');
    await page.fill('#password-input', ' 4D4N ');
    await page.press('#password-input', 'Enter');
    await page.waitForFunction(() => document.body.dataset.view === 'adan');
    await page.waitForFunction(() => document.getElementById('adan-scene-prompt').textContent === '¿Qué haces aquí?');
    await page.keyboard.press('Escape');
    assert.equal(await view(page), 'home');
    assert.deepEqual(page.errors, []);
    await page.context().close();
  });

  test('Copiar IP, con y sin portapapeles', async () => {
    const page = await openPage();
    await enter(page);
    await page.click('#copy-ip-btn');
    await page.waitForFunction(() => document.getElementById('copy-ip-btn').textContent !== 'Copiar IP');
    assert.equal(await text(page, '#copy-ip-btn'), 'IP copiada');
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'xray.dathost.net:17487');
    await page.context().close();

    const sinPortapapeles = await openPage();
    await sinPortapapeles.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', { value: undefined });
      document.execCommand = () => false;
    });
    await enter(sinPortapapeles);
    await sinPortapapeles.click('#copy-ip-btn');
    await sinPortapapeles.waitForFunction(() => document.getElementById('copy-ip-btn').textContent !== 'Copiar IP');
    assert.equal(await text(sinPortapapeles, '#copy-ip-btn'), 'xray.dathost.net:17487');
    await sinPortapapeles.context().close();
  });

  test('idioma: se elige solo según el navegador', async () => {
    for (const [locale, lang, texto] of [
      ['en-US', 'en', 'TAP TO ENTER'],
      ['pt-BR', 'pt', 'TOQUE PARA ENTRAR'],
      ['es-MX', 'es', 'TOCA PARA ENTRAR'],
      ['de-DE', 'es', 'TOCA PARA ENTRAR'], // idioma que no tenemos: español
    ]) {
      const page = await openPage({ locale });
      assert.equal(await page.evaluate(() => document.documentElement.lang), lang, locale);
      assert.equal(await text(page, '.enter-text'), texto, locale);
      // El efecto glitch copia el texto en data-text: también tiene que cambiar.
      assert.equal(await page.getAttribute('.enter-text', 'data-text'), texto, locale);
      await page.context().close();
    }
  });

  test('idioma: cambiar con ES · EN · PT traduce todo y se recuerda', async () => {
    const page = await openPage();
    await enter(page);
    assert.equal(await text(page, '#download-modpack'), 'Descargar Modpack');
    assert.equal(await text(page, '#server-status-text'), 'Online · 5/20 jugadores');

    await page.click('.lang-btn[data-lang="en"]');
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');
    assert.equal(await page.title(), 'NOVA 2 — Modded Roleplay SMP');
    assert.equal(await text(page, '#download-modpack'), 'Download Modpack');
    assert.equal(await text(page, '#lore-menu-btn'), 'Lore');
    assert.equal(await text(page, '#rules-menu-btn'), 'Rules');
    assert.equal(await text(page, '#audio-toggle-btn'), 'Mute');
    assert.equal(await text(page, '#server-status-text'), 'Online · 5/20 players');
    assert.equal(await page.getAttribute('.lang-btn[data-lang="en"]', 'aria-pressed'), 'true');
    assert.equal(await page.getAttribute('.lang-btn[data-lang="es"]', 'aria-pressed'), 'false');

    // Normas en inglés, con su <strong>.
    await page.click('#rules-menu-btn');
    await page.click('#rules-minecraft-btn');
    await sleep(CHANNEL_MS);
    assert.equal(await text(page, '#rules-panel-minecraft .rules-title'), 'RULES · MINECRAFT');
    assert.equal(await text(page, '#rules-panel-minecraft .rules-item strong'), 'Out of character:');
    await page.keyboard.press('Escape');
    await sleep(CHANNEL_MS);

    // Lore en inglés.
    await page.click('#lore-menu-btn');
    await page.click('#lore-antes-btn');
    await sleep(CHANNEL_MS);
    assert.match(await text(page, '.lore-paragraph'), /^Sometimes humanity wears you out/);
    assert.equal(await text(page, '#lore-next-btn'), 'Next →');
    await page.keyboard.press('Escape');
    await sleep(CHANNEL_MS);

    // Portugués, y se recuerda al recargar.
    await page.click('.lang-btn[data-lang="pt"]');
    assert.equal(await text(page, '#download-modpack'), 'Baixar Modpack');
    await page.reload();
    assert.equal(await text(page, '.enter-text'), 'TOQUE PARA ENTRAR');
    await enter(page);
    assert.equal(await text(page, '#copy-ip-btn'), 'Copiar IP');
    assert.equal(await text(page, '#password-trigger-btn'), 'Digite a senha');
    assert.equal(await text(page, '#server-status-text'), 'Online · 5/20 jogadores');
    assert.deepEqual(page.errors, []);
    await page.context().close();
  });

  test('estado del servidor: online, offline y API caída', async () => {
    const online = await openPage();
    await enter(online);
    await online.locator('#server-status:not([hidden])').waitFor();
    assert.equal(await text(online, '#server-status-text'), 'Online · 5/20 jugadores');
    assert.equal(await online.getAttribute('#server-status', 'data-state'), 'online');
    await online.context().close();

    const offline = await openPage({ serverStatus: { online: false } });
    await enter(offline);
    await offline.locator('#server-status:not([hidden])').waitFor();
    assert.equal(await text(offline, '#server-status-text'), 'Offline');
    assert.equal(await offline.getAttribute('#server-status', 'data-state'), 'offline');
    await offline.context().close();

    const caida = await openPage({ serverStatus: null });
    await enter(caida);
    assert.ok(await caida.locator('#server-status').isHidden());
    assert.deepEqual(caida.errors, []);
    await caida.context().close();
  });

  test('reducir movimiento: botones visibles sin animación', async () => {
    const page = await openPage({ reducedMotion: 'reduce' });
    await page.click('#enter-gate');
    await sleep(200);
    assert.equal(await style(page, '#lore-menu-btn', 'animationName'), 'none');
    assert.equal(await style(page, '#lore-menu-btn', 'opacity'), '1');
    await page.context().close();
  });
});

// ---------- Personajes (Firebase de verdad, en emuladores) ----------
describe('Personajes', () => {
  test('directorio, buscador y perfil', async () => {
    const page = await openPage();
    await enter(page);
    await openPersonajes(page);
    assert.equal(page.firebaseRequests, 1);
    assert.equal(await view(page), 'personajes');
    assert.equal(await style(page, '#password-trigger-btn', 'visibility'), 'hidden');
    assert.deepEqual((await page.locator('.personajes-card-name').allTextContents()).sort(), ['Kira', 'Zed']);

    await page.fill('#personajes-search-input', 'kír');
    assert.deepEqual(await page.locator('.personajes-card-name').allTextContents(), ['Kira']);
    await page.fill('#personajes-search-input', '');

    await openProfile(page, 'Kira');
    assert.equal(await text(page, '#personajes-profile-name'), 'Kira');
    assert.equal(await text(page, '#personajes-profile-mcuser'), 'Usuario de Minecraft: Kira_MC');
    assert.ok(await page.locator('.personaje-block-relacion-card', { hasText: 'Zed' }).isVisible());
    assert.equal(await page.evaluate(() => location.hash), '#personaje/kira');
    await page.locator('.personajes-comment').first().waitFor();
    assert.deepEqual(await commentTexts(page), ['Buenas']);
    assert.ok(await page.locator('#personajes-comment-signin-hint').isVisible());

    await page.locator('.personaje-block-relacion-card', { hasText: 'Zed' }).click();
    await page.waitForFunction(() => document.getElementById('personajes-profile-name').textContent === 'Zed');

    await page.keyboard.press('Escape');
    await sleep(CHANNEL_MS);
    assert.equal(await view(page), 'home');
    assert.equal(await page.evaluate(() => location.hash), '');
    assert.deepEqual(page.errors, []);
    await page.context().close();
  });

  test('crear tu personaje con sesión iniciada', async () => {
    const page = await openPage({ signedInAs: { uid: 'yo', name: 'Probador' } });
    await enter(page);
    await openPersonajes(page);
    await page.waitForFunction(() => document.getElementById('personajes-session-name').textContent === 'Probador');
    await page.locator('#personajes-mine-btn:not([hidden])').waitFor();
    assert.equal(await text(page, '#personajes-mine-btn'), 'Crear personaje');

    await page.click('#personajes-mine-btn');
    await page.locator('#personajes-view-editor.is-active').waitFor();
    await page.fill('#personajes-input-nombre', 'Nuevo');
    await page.fill('#personajes-input-mcuser', 'Nuevo_MC');
    await page.click('#personajes-add-texto-btn');
    await page.locator('.personajes-editor-block textarea').fill('Mi historia');
    await page.click('#personajes-add-relacion-btn');
    await page.locator('.personajes-editor-block-relacion input').first().fill('kira');
    await page.click('#personajes-save-btn');
    await page.waitForFunction(() => document.getElementById('personajes-profile-name').textContent === 'Nuevo');

    // Guardado de verdad en Firestore, y aceptado por las reglas.
    // (withSecurityRulesDisabled no devuelve lo que devuelve su función)
    let guardado;
    await env.withSecurityRulesDisabled(async (ctx) => {
      guardado = (await getDoc(doc(ctx.firestore(), 'personajes', page.uid))).data();
    });
    assert.equal(guardado.nombre, 'Nuevo');
    assert.equal(guardado.minecraftUsername, 'Nuevo_MC');
    assert.deepEqual(
      guardado.bloques.map((b) => b.tipo),
      ['texto', 'relacion'],
    );
    assert.equal(guardado.bloques[1].uid, 'kira');
    assert.equal(guardado.creadoEn.toMillis(), guardado.actualizadoEn.toMillis()); // hora del servidor

    await page.click('#personajes-profile-back-btn');
    await page.waitForFunction(() => document.querySelectorAll('.personajes-card').length === 3);
    assert.equal(await text(page, '#personajes-mine-btn'), 'Mi personaje');
    assert.deepEqual(page.errors, []);
    await page.context().close();
  });

  test('facciones: cada jugador pone la suya, filtro en el directorio y color en el árbol', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      updateDoc(doc(ctx.firestore(), 'personajes/kira'), { faccion: 'Reino del Norte' }),
    );
    const page = await openPage({ signedInAs: { uid: 'yo', name: 'Probador' } });
    await enter(page);
    await openPersonajes(page);
    await page.locator('#personajes-faction-filter:not([hidden])').waitFor();
    assert.deepEqual(await page.locator('.personajes-faction-chip').allTextContents(), [
      'Todas',
      'Reino del Norte (1)',
    ]);

    // Se une escribiéndola en minúsculas: cuenta como la misma facción.
    await page.locator('#personajes-mine-btn:not([hidden])').waitFor();
    await page.click('#personajes-mine-btn');
    await page.locator('#personajes-view-editor.is-active').waitFor();
    assert.equal(await page.locator('#personajes-facciones-datalist option').getAttribute('value'), 'Reino del Norte');
    await page.fill('#personajes-input-nombre', 'Nuevo');
    await page.fill('#personajes-input-faccion', '  reino   del norte ');
    await page.click('#personajes-save-btn');
    await page.waitForFunction(() => document.getElementById('personajes-profile-name').textContent === 'Nuevo');
    assert.equal(await text(page, '#personajes-profile-faccion'), 'Facción: reino del norte');
    let guardado;
    await env.withSecurityRulesDisabled(async (ctx) => {
      guardado = (await getDoc(doc(ctx.firestore(), 'personajes', page.uid))).data();
    });
    assert.equal(guardado.faccion, 'reino del norte');

    await page.click('#personajes-profile-back-btn');
    await page.waitForFunction(() => document.querySelectorAll('.personajes-card').length === 3);
    await page.click('.personajes-faction-chip:has-text("(2)")');
    assert.deepEqual((await page.locator('.personajes-card-name').allTextContents()).sort(), ['Kira', 'Nuevo']);
    await page.click('.personajes-faction-chip:has-text("Todas")');
    assert.equal(await page.locator('.personajes-card').count(), 3);

    // Árbol: Kira lleva el color de su facción; Zed, sin facción, el de siempre.
    await page.click('#personajes-relations-btn');
    await page.locator('#personajes-view-relations.is-active').waitFor();
    const color = (id) =>
      page.locator(`.relations-node[data-id="${id}"]`).evaluate((g) => g.style.getPropertyValue('--node-color'));
    assert.ok(await color('kira'));
    assert.equal(await color('zed'), '');
    // Dos formas de escribirla, empatadas: se muestra la de la ficha más antigua.
    assert.equal(await text(page, '#personajes-relations-legend li'), 'Reino del Norte');
    assert.deepEqual(page.errors, []);
    await page.context().close();
  });

  test('estado del personaje: caído con fecha y epitafio, en gris y en el Memorial', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      updateDoc(doc(ctx.firestore(), 'personajes/kira'), { estado: 'desaparecido' }),
    );
    const page = await openPage({ signedInAs: { uid: 'yo', name: 'Probador' } });
    await enter(page);
    await openPersonajes(page);
    assert.equal(await page.locator('.personajes-card[data-estado="desaparecido"]').count(), 1);
    assert.equal(await text(page, '.personajes-estado-tag'), 'Desaparecido');

    // Memorial vacío: Kira solo ha desaparecido.
    await page.click('#personajes-memorial-btn');
    await page.locator('#personajes-view-memorial.is-active').waitFor();
    assert.equal(await text(page, '#personajes-memorial-list'), 'Nadie ha caído todavía.');
    await page.click('#personajes-memorial-back-btn');

    await page.locator('#personajes-mine-btn:not([hidden])').waitFor();
    await page.click('#personajes-mine-btn');
    await page.locator('#personajes-view-editor.is-active').waitFor();
    assert.ok(await page.locator('#personajes-caido-fields').isHidden());
    await page.fill('#personajes-input-nombre', 'Nuevo');
    await page.selectOption('#personajes-input-estado', 'caido');
    assert.ok(await page.locator('#personajes-caido-fields').isVisible());
    await page.fill('#personajes-input-caido-el', '2026-10-03');
    await page.fill('#personajes-input-epitafio', 'Cayó defendiendo la torre.');
    await page.click('#personajes-save-btn');
    await page.waitForFunction(() => document.getElementById('personajes-profile-name').textContent === 'Nuevo');
    assert.match(await text(page, '#personajes-profile-estado'), /^Caído el 3 oct\.? 2026$/);
    assert.equal(await text(page, '#personajes-profile-epitafio'), '«Cayó defendiendo la torre.»');
    let guardado;
    await env.withSecurityRulesDisabled(async (ctx) => {
      guardado = (await getDoc(doc(ctx.firestore(), 'personajes', page.uid))).data();
    });
    assert.equal(guardado.estado, 'caido');
    assert.equal(guardado.caidoEl, '2026-10-03');
    assert.equal(guardado.epitafio, 'Cayó defendiendo la torre.');

    await page.click('#personajes-profile-back-btn');
    await page.waitForFunction(() => document.querySelectorAll('.personajes-card').length === 3);
    assert.equal(await page.locator('.personajes-card[data-estado="caido"]').count(), 1);

    // En el Memorial, y desde ahí a su ficha.
    await page.click('#personajes-memorial-btn');
    await page.locator('#personajes-view-memorial.is-active').waitFor();
    assert.deepEqual(await page.locator('.memorial-card-name').allTextContents(), ['Nuevo']);
    assert.equal(await text(page, '.memorial-card-epitafio'), '«Cayó defendiendo la torre.»');
    await page.click('.memorial-card');
    await page.locator('#personajes-view-profile.is-active').waitFor();
    assert.equal(await text(page, '#personajes-profile-name'), 'Nuevo');

    // Árbol: Kira sale marcada como desaparecida; Zed, vivo, sin marca.
    await page.click('#personajes-profile-back-btn');
    await page.waitForFunction(() => document.querySelectorAll('.personajes-card').length === 3);
    await page.click('#personajes-relations-btn');
    await page.locator('#personajes-view-relations.is-active').waitFor();
    const estado = (id) => page.locator(`.relations-node[data-id="${id}"]`).getAttribute('data-estado');
    assert.equal(await estado('kira'), 'desaparecido');
    assert.equal(await estado('zed'), null);

    // Vuelve a estar vivo: se borran la fecha y el epitafio.
    await page.click('#personajes-relations-back-btn');
    await page.click('#personajes-mine-btn');
    await page.locator('#personajes-view-editor.is-active').waitFor();
    assert.equal(await page.inputValue('#personajes-input-estado'), 'caido');
    await page.selectOption('#personajes-input-estado', '');
    await page.click('#personajes-save-btn');
    await page.locator('#personajes-view-profile.is-active').waitFor();
    assert.ok(await page.locator('#personajes-profile-estado').isHidden());
    await env.withSecurityRulesDisabled(async (ctx) => {
      guardado = (await getDoc(doc(ctx.firestore(), 'personajes', page.uid))).data();
    });
    assert.deepEqual([guardado.estado, guardado.caidoEl, guardado.epitafio], [null, null, null]);
    assert.deepEqual(page.errors, []);
    await page.context().close();
  });

  test('subir imágenes: la foto y un bloque de imagen se suben a Cloudinary y se guarda su link', async () => {
    const page = await openPage({ signedInAs: { uid: 'subidor', name: 'Subidor' } });
    // Cloudinary falso: nunca se sube nada de verdad desde los tests.
    const subidas = [];
    await page.context().route('https://api.cloudinary.com/**', (r) => {
      subidas.push(r.request().url());
      const n = subidas.length;
      r.fulfill({
        json: { secure_url: `https://res.cloudinary.com/demo-nova/image/upload/v1/pj-${n}.png` },
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    });
    await page.context().route('https://res.cloudinary.com/**', (r) => r.abort());
    const png = { name: 'pj.png', mimeType: 'image/png', buffer: Buffer.from('falso png') };

    await enter(page);
    await openPersonajes(page);
    await page.locator('#personajes-mine-btn:not([hidden])').waitFor();
    await page.click('#personajes-mine-btn');
    await page.locator('#personajes-view-editor.is-active').waitFor();
    await page.fill('#personajes-input-nombre', 'Con fotos');

    // Un archivo que no es imagen no llega a subirse.
    const fotoFile = page.locator('#personajes-input-foto ~ .personajes-upload-file');
    await fotoFile.setInputFiles({ name: 'notas.txt', mimeType: 'text/plain', buffer: Buffer.from('hola') });
    await page.waitForFunction(() =>
      document.getElementById('personajes-feedback').textContent.includes('no es una imagen'),
    );
    assert.equal(subidas.length, 0);

    await fotoFile.setInputFiles(png);
    await page.waitForFunction(() => document.getElementById('personajes-input-foto').value.includes('pj-1.png'));
    await page.click('#personajes-add-imagen-btn');
    await page.locator('.personajes-upload-field .personajes-upload-file').setInputFiles(png);
    await page.waitForFunction(() =>
      document.querySelector('.personajes-upload-field input[type="url"]').value.includes('pj-2'),
    );
    assert.ok(
      subidas.every((url) => url === 'https://api.cloudinary.com/v1_1/demo-nova/image/upload'),
      subidas.join(),
    );

    await page.click('#personajes-save-btn');
    await page.waitForFunction(() => document.getElementById('personajes-profile-name').textContent === 'Con fotos');
    let guardado;
    await env.withSecurityRulesDisabled(async (ctx) => {
      guardado = (await getDoc(doc(ctx.firestore(), 'personajes', page.uid))).data();
    });
    assert.equal(guardado.fotoUrl, 'https://res.cloudinary.com/demo-nova/image/upload/v1/pj-1.png');
    assert.deepEqual(
      guardado.bloques.map((b) => b.contenido),
      ['https://res.cloudinary.com/demo-nova/image/upload/v1/pj-2.png'],
    );
    assert.deepEqual(page.errors, []);
    await page.context().close();
  });

  test('comentarios en tiempo real: aparecen y desaparecen sin recargar', async () => {
    const lector = await openPage(); // sin sesión, mirando el perfil de Kira
    await enter(lector);
    await openPersonajes(lector);
    await openProfile(lector, 'Kira');
    await lector.locator('.personajes-comment').first().waitFor();

    const autor = await openPage({ signedInAs: { uid: 'bob', name: 'Bob' } });
    await enter(autor);
    await openPersonajes(autor);
    await openProfile(autor, 'Kira');
    await autor.locator('#personajes-comment-form:not([hidden])').waitFor();
    await autor.fill('#personajes-comment-input', 'Hola desde otra pestaña');
    await autor.click('#personajes-comment-form button[type=submit]');

    // El lector lo ve sin hacer nada.
    await lector.waitForFunction(() => document.querySelectorAll('.personajes-comment').length === 2);
    assert.deepEqual(await commentTexts(lector), ['Buenas', 'Hola desde otra pestaña']);
    assert.equal(await lector.locator('.personajes-comment-author').nth(1).textContent(), 'Bob');

    // Y ve también cuando el autor lo borra.
    await autor
      .locator('.personajes-comment', { hasText: 'Hola desde otra pestaña' })
      .locator('.personajes-comment-remove-btn')
      .click();
    await lector.waitForFunction(() => document.querySelectorAll('.personajes-comment').length === 1);

    assert.deepEqual(lector.errors, []);
    assert.deepEqual(autor.errors, []);
    await lector.context().close();
    await autor.context().close();
  });

  test('avisos de comentarios: número en "Mi personaje" en directo y "Nuevo" en tu ficha', async () => {
    const ana = await openPage({ signedInAs: { uid: 'ana', name: 'Ana' } });
    const hace = (min) => Timestamp.fromMillis(Date.now() - min * 60_000);
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'personajes', ana.uid), {
        nombre: 'Ana',
        minecraftUsername: null,
        fotoUrl: null,
        bloques: [],
        actualizadoEn: hace(300),
        creadoEn: hace(300),
      });
      const comentario = (id, texto, min) =>
        setDoc(doc(db, 'personajes', ana.uid, 'comentarios', id), {
          autorUid: 'zed',
          autorNombre: 'Zed',
          texto,
          creadoEn: hace(min),
        });
      await comentario('viejo', 'Ya lo habías leído', 120);
      await comentario('nuevo', 'Aún no lo has leído', 1);
    });
    // Ana vio su ficha por última vez hace una hora (en este navegador).
    await ana.evaluate(
      (uid) => localStorage.setItem(`personajes_comentarios_vistos_${uid}`, Date.now() - 3_600_000),
      ana.uid,
    );
    await enter(ana);
    await openPersonajes(ana);
    const badge = () => ana.locator('#personajes-mine-btn').getAttribute('data-badge');
    await ana.waitForFunction(() => document.getElementById('personajes-mine-btn').dataset.badge === '1');
    assert.equal(
      await ana.locator('#personajes-mine-btn').getAttribute('aria-label'),
      'Mi personaje · 1 comentario nuevo',
    );

    // Bob le escribe desde otro navegador: el número sube solo.
    const bob = await openPage({ signedInAs: { uid: 'bob', name: 'Bob' } });
    await enter(bob);
    await openPersonajes(bob);
    await openProfile(bob, 'Ana');
    await bob.locator('#personajes-comment-form:not([hidden])').waitFor();
    await bob.fill('#personajes-comment-input', 'Hola Ana');
    await bob.click('#personajes-comment-form button[type=submit]');
    await ana.waitForFunction(() => document.getElementById('personajes-mine-btn').dataset.badge === '2');

    // En su ficha, los dos que no había visto salen como "Nuevo" y el aviso se va.
    await openProfile(ana, 'Ana');
    await ana.waitForFunction(() => document.querySelectorAll('.personajes-comment').length === 3);
    assert.deepEqual(await ana.locator('.personajes-comment.is-new .personajes-comment-text').allTextContents(), [
      'Aún no lo has leído',
      'Hola Ana',
    ]);
    assert.equal(await text(ana, '.personajes-comment-new-tag'), 'Nuevo');
    assert.equal(await badge(), null);

    // Al volver a entrar ya no hay nada nuevo.
    await ana.click('#personajes-profile-back-btn');
    await openProfile(ana, 'Ana');
    await ana.waitForFunction(() => document.querySelectorAll('.personajes-comment').length === 3);
    assert.equal(await ana.locator('.personajes-comment.is-new').count(), 0);
    assert.equal(await badge(), null);
    assert.deepEqual(ana.errors, []);
    assert.deepEqual(bob.errors, []);
    await ana.context().close();
    await bob.context().close();
  });

  test('un comentario nuevo no borra lo que estás editando', async () => {
    const bob = await openPage({ signedInAs: { uid: 'bob', name: 'Bob' } });
    await env.withSecurityRulesDisabled((ctx) =>
      setDoc(doc(ctx.firestore(), 'personajes/kira/comentarios/c2'), {
        autorUid: bob.uid,
        autorNombre: 'Bob',
        texto: 'Primera versión',
        creadoEn: Timestamp.now(),
      }),
    );
    await enter(bob);
    await openPersonajes(bob);
    await openProfile(bob, 'Kira');
    const suyo = bob.locator('.personajes-comment', { hasText: 'Primera versión' });
    await suyo.locator('.personajes-comment-edit-btn').waitFor();
    await suyo.locator('.personajes-comment-edit-btn').click();
    const editor = bob.locator('.personajes-comment textarea');
    await editor.fill('Segunda versión');

    // Mientras edita, otra persona comenta.
    await env.withSecurityRulesDisabled((ctx) =>
      setDoc(doc(ctx.firestore(), 'personajes/kira/comentarios/c3'), {
        autorUid: 'zed',
        autorNombre: 'Zed',
        texto: 'Comentario mientras editas',
        creadoEn: Timestamp.now(),
      }),
    );
    await sleep(800);
    assert.equal(await editor.inputValue(), 'Segunda versión'); // no se ha perdido

    await bob.locator('.personajes-comment-edit-actions button', { hasText: 'Guardar' }).click();
    // Ya había 3 comentarios antes de guardar: hay que esperar a que llegue la
    // edición, ya confirmada por el servidor (hasta entonces la hora de la
    // edición está pendiente y aún no sale "(editado)").
    await bob.waitForFunction(() =>
      [...document.querySelectorAll('.personajes-comment-text')].some((el) =>
        el.textContent.includes('Segunda versión (editado)'),
      ),
    );
    const textos = await commentTexts(bob);
    assert.ok(textos.includes('Segunda versión (editado)'), textos.join(' | '));
    assert.ok(textos.includes('Comentario mientras editas'), textos.join(' | '));
    assert.deepEqual(bob.errors, []);
    await bob.context().close();
  });

  test('cerrar sesión y volver a pulsar "Entrar con Google": el botón nunca se bloquea', async () => {
    const page = await openPage({ signedInAs: { uid: 'bob', name: 'Bob' } });
    // Sin la ventana de Google de verdad (no existe para un proyecto de
    // pruebas): el intento de login falla siempre, que es justo el caso en el
    // que antes el botón parecía bloqueado.
    await page.context().route(/firebaseapp\.com|apis\.google\.com/, (r) => r.abort());
    await enter(page);
    await openPersonajes(page);
    await page.locator('#personajes-signout-btn:visible').click();
    const signin = page.locator('#personajes-signin-btn');
    await signin.waitFor({ state: 'visible' });
    // Registra cada texto por el que pasa el botón: el fallo puede ser tan
    // rápido que "Abriendo Google..." dure solo unos milisegundos.
    await page.evaluate(() => {
      const btn = document.getElementById('personajes-signin-btn');
      window.__signinLabels = [];
      new MutationObserver(() => window.__signinLabels.push(btn.textContent)).observe(btn, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    });
    const labels = () => page.evaluate(() => window.__signinLabels.splice(0));

    for (let intento = 1; intento <= 2; intento++) {
      await signin.click();
      // Falla, avisa y el botón vuelve a su estado normal, listo para otro intento.
      await page.waitForFunction(
        () => document.getElementById('personajes-signin-btn').textContent === 'Entrar con Google',
      );
      assert.deepEqual(await labels(), ['Abriendo Google...', 'Entrar con Google'], `intento ${intento}`);
      assert.ok(await page.locator('#personajes-status').isVisible(), `intento ${intento}: sin aviso`);
      assert.ok(await signin.isEnabled());
    }

    // Pulsar dos veces seguidas: el segundo intento sustituye al primero sin
    // dejar el botón colgado.
    await signin.click();
    await signin.click();
    await page.waitForFunction(
      () => document.getElementById('personajes-signin-btn').textContent === 'Entrar con Google',
    );
    assert.deepEqual(page.errors, []);
    await page.context().close();
  });

  test('árbol de relaciones: dibuja las relaciones y lleva al perfil', async () => {
    const page = await openPage();
    await enter(page);
    await openPersonajes(page);
    await page.click('#personajes-relations-btn');
    await page.locator('#personajes-view-relations.is-active').waitFor();

    // Semilla: Kira declara a Zed como "hermano".
    assert.equal(await page.locator('.relations-node').count(), 2);
    assert.equal(await page.locator('.relations-edge').count(), 1);
    assert.equal(await text(page, '.relations-edge-label'), 'hermano');
    // Con sitio de sobra, la etiqueta se ve (solo se esconden las que no caben).
    assert.ok(await page.locator('.relations-edge-label').isVisible());
    assert.equal(await text(page, '.relations-list li'), 'Kira → hermano → Zed');
    assert.ok(await page.locator('#personajes-relations-empty').isHidden()); // todos tienen relación

    // Zoom con los botones: acerca (viewBox más pequeño), y 1:1 lo deja como estaba.
    const viewBox = () => page.locator('.relations-graph').getAttribute('viewBox');
    const size = async () => (await viewBox()).split(' ').map(Number)[2];
    // Sin zoom, el dibujo se ajusta a la forma de la caja (se ve entero y la llena).
    await page.waitForFunction(() => {
      const svg = document.querySelector('.relations-graph');
      const [, , w, h] = svg.getAttribute('viewBox').split(' ').map(Number);
      return Math.abs(w / h - svg.clientWidth / svg.clientHeight) < 0.01;
    });
    const initialViewBox = await viewBox();
    assert.ok(await page.locator('.relations-zoom-out').isDisabled());
    await page.click('.relations-zoom-in');
    assert.ok((await size()) < Number(initialViewBox.split(' ')[2]));
    assert.ok(await page.locator('.relations-graph.is-zoomed').isVisible());
    // Arrastrar con zoom mueve el dibujo y no abre ningún perfil.
    const box = await page.locator('.relations-graph').boundingBox();
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 120, box.y + 80, { steps: 5 });
    await page.mouse.up();
    assert.ok(await page.locator('#personajes-view-relations.is-active').isVisible());
    await page.click('.relations-zoom-reset');
    assert.equal(await viewBox(), initialViewBox);

    // Rueda: hacia arriba acerca; sin zoom, hacia abajo no hace nada (baja la página).
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 200);
    assert.equal(await viewBox(), initialViewBox);
    await page.mouse.wheel(0, -200);
    await page.waitForFunction(
      (vb) => document.querySelector('.relations-graph').getAttribute('viewBox') !== vb,
      initialViewBox,
    );
    assert.ok((await size()) < Number(initialViewBox.split(' ')[2]));
    await page.click('.relations-zoom-reset');

    // Pulsar un personaje del árbol abre su perfil.
    await page.locator('.relations-node[aria-label="Ver el perfil de Zed"]').click();
    await page.waitForFunction(() => document.getElementById('personajes-profile-name').textContent === 'Zed');
    assert.deepEqual(page.errors, []);
    await page.context().close();
  });

  test('árbol de relaciones: sin relaciones, aviso en vez de dibujo', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      setDoc(doc(ctx.firestore(), 'personajes/kira'), {
        nombre: 'Kira',
        minecraftUsername: null,
        fotoUrl: null,
        bloques: [],
        actualizadoEn: Timestamp.now(),
        creadoEn: Timestamp.now(),
      }),
    );
    const page = await openPage({ locale: 'en-US' });
    await enter(page);
    await page.click('#lore-menu-btn');
    await page.click('#lore-personajes-btn');
    await page.locator('.personajes-card').first().waitFor();
    await page.click('#personajes-relations-btn');
    await page.locator('#personajes-relations-empty:not([hidden])').waitFor();
    assert.match(await text(page, '#personajes-relations-empty'), /^No relationships yet/);
    assert.equal(await page.locator('.relations-graph').count(), 0);
    await page.context().close();
  });

  test('Crónica: desde Lore, publicar, editar y borrar; los demás lo ven en directo', async () => {
    const lector = await openPage(); // sin sesión
    await enter(lector);
    await lector.click('#lore-menu-btn');
    await lector.click('#lore-cronica-btn');
    await lector.locator('#personajes-view-cronica.is-active').waitFor();
    await lector.waitForFunction(() =>
      document.getElementById('personajes-cronica-list').textContent.includes('Todavía'),
    );
    assert.ok(await lector.locator('#personajes-cronica-signin-hint').isVisible());
    assert.ok(await lector.locator('#personajes-cronica-form').isHidden());

    const autor = await openPage({ signedInAs: { uid: 'bob', name: 'Bob' } });
    await enter(autor);
    await openPersonajes(autor);
    await autor.click('#personajes-cronica-btn');
    await autor.locator('#personajes-cronica-form:not([hidden])').waitFor();
    await autor.fill('#personajes-cronica-titulo', 'La caída de la torre');
    await autor.fill('#personajes-cronica-texto', 'Ardió entera.');
    await autor.click('#personajes-cronica-submit');
    await autor.locator('.chronicle-entry').waitFor();
    // Al guardarse, el formulario se vacía.
    await autor.waitForFunction(() => document.getElementById('personajes-cronica-titulo').value === '');

    // El lector la ve sin recargar, con autor y sin botones de editar.
    await lector.locator('.chronicle-entry').waitFor();
    assert.equal(await text(lector, '.chronicle-entry-title'), 'La caída de la torre');
    assert.match(await text(lector, '.chronicle-entry-meta'), /· Bob$/);
    assert.equal(await lector.locator('.chronicle-entry-actions').count(), 0);

    // Editar reutiliza el formulario.
    await autor.click('.chronicle-entry .personajes-comment-edit-btn');
    assert.equal(await autor.inputValue('#personajes-cronica-titulo'), 'La caída de la torre');
    assert.equal(await text(autor, '#personajes-cronica-submit'), 'Guardar');
    await autor.fill('#personajes-cronica-texto', 'Ardió entera. Nadie sabe quién fue.');
    await autor.click('#personajes-cronica-submit');
    await lector.waitForFunction(() =>
      document.querySelector('.chronicle-entry-text')?.textContent.includes('Nadie sabe'),
    );
    assert.match(await text(lector, '.chronicle-entry-meta'), /\(editado\)$/);

    // Borrar (con confirmación).
    autor.on('dialog', (d) => d.accept());
    await autor.click('.chronicle-entry .personajes-comment-remove-btn');
    await lector.waitForFunction(() => !document.querySelector('.chronicle-entry'));

    let entradas;
    await env.withSecurityRulesDisabled(async (ctx) => {
      entradas = (await getDocs(collection(ctx.firestore(), 'cronica'))).size;
    });
    assert.equal(entradas, 0);
    assert.deepEqual(lector.errors, []);
    assert.deepEqual(autor.errors, []);
    await lector.context().close();
    await autor.context().close();
  });

  test('link directo #personaje/<uid>', async () => {
    const page = await openPage({ hash: '#personaje/zed' });
    await enter(page);
    await page.waitForFunction(() => document.getElementById('personajes-profile-name').textContent === 'Zed');
    assert.equal(await view(page), 'personajes');
    assert.deepEqual(page.errors, []);
    await page.context().close();
  });

  test('si Firebase no carga, aviso visible y el resto de la web sigue', async () => {
    const page = await openPage({ blockFirebase: true });
    await enter(page);
    await page.click('#lore-menu-btn');
    await page.click('#lore-personajes-btn');
    await page.locator('#personajes-status').waitFor();
    assert.match(await text(page, '#personajes-status'), /No se pudo conectar/);
    assert.ok(!(await page.locator('#personajes-signin-btn').isVisible()));
    await sleep(CHANNEL_MS); // Escape se ignora mientras dura la transición de canal
    await page.keyboard.press('Escape');
    await sleep(CHANNEL_MS);
    assert.equal(await view(page), 'home');
    await page.context().close();
  });
});
