// ======================================================
// Buscador "Inserta la contraseña"
// ======================================================
//
// Pantalla aparte, deliberadamente limpia (sin estática ni glitches): solo
// una barra de búsqueda y un botón "Buscar". Cada palabra que hace algo se
// define en SEARCH_ACTIONS: la clave es la palabra en minúsculas y sin
// tildes, el valor es la función que se ejecuta al encontrarla (recibe un
// objeto con setFeedback para escribir un mensaje bajo el buscador, y close
// para cerrar esta pantalla).
// Ejemplo:
//   'iris': ({ setFeedback }) => setFeedback('IRIS está despierta.', 'ok'),
//
// Cada 3 búsquedas fallidas seguidas aparece el botón "¿Una ayudita?", que
// rellena el buscador con una palabra al azar de entre las que hay en
// SEARCH_ACTIONS (no hace falta mantener una lista aparte). En cuanto se
// acierta una palabra (a mano o con la ayudita) o se manda una búsqueda,
// el contador de fallos vuelve a 0 y el botón desaparece.

import { openAdanScene } from './adan.js';
import { isView, setView } from './views.js';
import { normalizeSearchTerm } from './utils.js';
import { t } from './i18n.js';

const openInNewTab = (url) => () => window.open(url, '_blank', 'noopener');

const SEARCH_ACTIONS = {
  rick: openInNewTab('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  amogus: openInNewTab('https://www.youtube.com/watch?v=gVylTS6Y1Bs'),
  sus: openInNewTab('https://www.youtube.com/watch?v=gVylTS6Y1Bs'),
  creeper: openInNewTab('https://www.youtube.com/watch?v=8n0iZgLDCSg'),
  cucaracha: openInNewTab('https://www.youtube.com/watch?v=tCHYrpiqDxI'),
  shrimp: openInNewTab('https://www.youtube.com/watch?v=u4ecB57jFhI'),
  house: openInNewTab('images/gallery/646390b727116f4c2c5eee161238ff86.jpg'),
  jojos: openInNewTab('images/gallery/c2d391b2b3f1142f75c555aca8808667.jpg'),
  tuff: openInNewTab('images/gallery/f9aeebe83fee27a41c31c3ebdaa7793f.jpg'),
};

// Palabras secretas: no se guardan en claro sino su huella SHA-256 (de la
// palabra ya normalizada, en minúsculas y sin tildes), así no se leen con
// "ver código fuente". Para añadir una, calcula su huella, p.ej. con
//   printf 'palabra' | sha256sum
// Ojo: esto solo la esconde de quien mira la web; en el repo de GitHub sigue
// apareciendo en los tests y en el historial. Tampoco entran en el sorteo
// de "¿Una ayudita?", que solo usa SEARCH_ACTIONS.
const SECRET_ACTIONS = {
  // La escena de Adán. Se cierra el buscador antes de abrirla: las dos son
  // vistas y solo puede haber una activa a la vez.
  ec168423b51025aa822ff088a98ae5abe048860793e5411d895667430c8357f0: ({ close }) => {
    close();
    openAdanScene();
  },
};

// crypto.subtle solo existe en HTTPS (y en localhost): sin él, las palabras
// secretas simplemente no se encuentran.
async function sha256Hex(text) {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function initPasswordScreen() {
  const triggerBtn = document.getElementById('password-trigger-btn');
  const page = document.getElementById('password-page');
  const backBtn = document.getElementById('password-back-btn');
  const form = document.getElementById('password-form');
  const input = document.getElementById('password-input');
  const feedback = document.getElementById('password-feedback');
  const hintBtn = document.getElementById('password-hint-btn');
  if (!triggerBtn || !page || !backBtn || !form || !input || !feedback || !hintBtn) return;

  let failStreak = 0;

  const setFeedback = (text, tone) => {
    feedback.textContent = text;
    feedback.classList.remove('is-fail', 'is-ok');
    if (tone === 'ok') feedback.classList.add('is-ok');
    if (tone === 'fail') feedback.classList.add('is-fail');
  };

  const open = () => {
    page.setAttribute('aria-hidden', 'false');
    setView('password');
    input.value = '';
    setFeedback('', null);
    setTimeout(() => input.focus(), 50);
  };

  const close = () => {
    page.setAttribute('aria-hidden', 'true');
    setView('home');
  };

  const runSearch = async (rawValue) => {
    const term = normalizeSearchTerm(rawValue);
    if (!term) return;

    const action = Object.hasOwn(SEARCH_ACTIONS, term) ? SEARCH_ACTIONS[term] : SECRET_ACTIONS[await sha256Hex(term)];
    if (action) {
      failStreak = 0;
      hintBtn.classList.remove('is-visible');
      action({ setFeedback, close });
      return;
    }

    failStreak += 1;
    setFeedback(t('password.nothing'), 'fail');
    if (failStreak % 3 === 0) {
      hintBtn.classList.add('is-visible');
    }
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    runSearch(input.value);
  });

  hintBtn.addEventListener('click', () => {
    // Las palabras secretas (SECRET_ACTIONS) no están aquí a propósito: no
    // son una gracia como el resto sino algo que hay que descubrir.
    const words = Object.keys(SEARCH_ACTIONS);
    if (!words.length) return;
    const word = words[Math.floor(Math.random() * words.length)];
    input.value = word;
    input.focus();
  });

  triggerBtn.addEventListener('click', open);
  backBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isView('password')) close();
  });
}
