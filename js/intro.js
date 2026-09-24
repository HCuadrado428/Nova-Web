// ======================================================
// Intro: pantalla de entrada, boot y botón "Copiar IP"
// ======================================================

import { playBootAudio, setAudioSuspended } from './audio.js';
import { ADAN_VISITS_KEY, BOOT_LINE_4_ADAN_PHRASE } from './adan.js';
import { openPersonajeFromHash } from './personajes.js';
import { storageGet } from './utils.js';

// IP del server, usada por el botón "Copiar IP" de la intro.
const SERVER_IP = 'xray.dathost.net:17487';

// Momento en que termina la animación intro-reveal (~2.15s de retraso + 1s)
// y ya se ven los botones: no se salta a un link directo antes de eso.
const INTRO_REVEALED_MS = 3000;

/* ---------------------------------------------------
   Pantalla de entrada
   El boot visual (CSS) empieza pausado en su primer fotograma;
   al tocar/pulsar se añade "booted" al body (arranca la animación
   desde cero) y se dispara el audio sincronizado del boot.
--------------------------------------------------- */
const BOOT_LINE_4_PHRASES = [
  '⋏⍜ ⎅⟒⏚⟒⍀í⏃⟟⌇ ⟒⌇⏁⏃⍀ ⏃⍾⎍í',
  '⟒⌇⏁⟒ ⋏⍜ ⟒⌇ ⎐⎍⟒⌇⏁⍀⍜ ⋔⎍⋏⎅⍜',
  '⌇⏃☊⏃⎅⋔⟒ ⎅⟒ ⏃⍾⎍í',
  '⎐⎍⟒⌇⏁⍀⍜ ⎎⟟⋏ ⟒⌇⏁⏃ ☊⟒⍀☊⏃',
  '⎐⍜⌰⎐⟒⎅ ⎅⟒ ⎅⍜⋏⎅⟒ ⎐⟒⋏í⌇',
  '⟒⌇⏁⟒ ⋏⍜ ⟒⌇ ⟒⌰ ⋔⎍⋏⎅⍜ ☌⎍⟒ ⍀⟒☊⎍⟒⍀⎅⍜',
  '⏃⌿⍜☊⏃⌰⟟⌿⌇⟟⌇ 1:3',
  '☊⍀⟒⟒⎅ ⊬ ⌿⟒⍀⟒☊⟒⎅',
  '☊⎍⏃⋏⏁⏃ ☌⟒⋏⏁⟒ ⊑⏃⏚⌰⏃ ⌿⍜⍀ ⏃☌⎍⟟?',
  '⊬⍜⎍ ⌰⍜⌇⏁ ⏁⊑⟒ ☌⏃⋔⟒',
  '⏁⟒⌇⏁⟟☊⎍⌰⏃⍀ ⏁⍜⍀⌇⟟⍜⋏',
  '⌿⍜⍀☌⎍⟒ ⍜⌇ ⊑⏃☊⟒⟟⌇ ⟒⌇⏁⍜',
  '⏃⌰☌⎍⟟⟒⋏ ⏁⟒ ⍜⏚⌇⟒⍀⎐⏃',
  '⋏⍜ ⊑⏃⊬ ⟒⌇☊⏃⌿⟒',
  '⏁⍜⎅⍜ ⟒⌇ ⋔⟒⋏⏁⟟⍀⏃',
  '⋏⎍⋏☊⏃ ⟒⌇⏁⏃⌇ ⌇⍜⌰⍜',
  '⎅⟒⌇⌿⟟⟒⍀⏁⏃',
];

// Variante "imagen" de la línea 4: en vez de frase, aparece esta imagen con un
// texto rojo debajo. Añade más objetos aquí para tener más imágenes en el sorteo
// (guarda cada archivo en images/creepy/).
const BOOT_LINE_4_IMAGES = [
  { src: 'images/creepy/eyes-1.jpg', caption: '⟟ ⌇⟒⟒ ⊬⍜⎍' },
];

export function initEnterGate() {
  const gate = document.getElementById('enter-gate');
  const bootLine4 = document.getElementById('boot-line-4');
  const fullscreenImage = document.getElementById('boot-fullscreen-image');
  if (!gate) return;

  let entered = false;
  const enter = () => {
    if (entered) return;
    entered = true;

    if (bootLine4) {
      setBootLine4Variant(bootLine4, fullscreenImage);
    }

    gate.classList.add('hidden');
    gate.addEventListener('transitionend', () => gate.remove(), { once: true });
    document.body.classList.add('booted');

    playBootAudio();

    // Link directo a un personaje (#personaje/<uid>): espera a que se haya
    // revelado el botón de Lore antes de saltar, para no interrumpir la
    // propia animación de entrada.
    const deepLinkMatch = /^#personaje\/(.+)$/.exec(location.hash);
    if (deepLinkMatch) {
      const uid = decodeURIComponent(deepLinkMatch[1]);
      setTimeout(() => openPersonajeFromHash(uid), INTRO_REVEALED_MS);
    }
  };

  gate.addEventListener('click', enter);
  gate.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      enter();
    }
  });

  document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('tab-hidden', document.hidden);
    setAudioSuspended(document.hidden);
  });
}

/* Sortea entre las frases (texto pequeño) y las imágenes creepy (foto a pantalla
   completa con texto grande) para la línea 4, todas con el mismo peso.
   BOOT_LINE_4_ADAN_PHRASE se suma al sorteo solo si ya se visitó la escena
   de Adán (ver ADAN_VISITS_KEY en adan.js). */
function setBootLine4Variant(lineEl, fullscreenEl) {
  const adanVisits = parseInt(storageGet(ADAN_VISITS_KEY), 10) || 0;
  const phrasePool = adanVisits > 0 ? BOOT_LINE_4_PHRASES.concat(BOOT_LINE_4_ADAN_PHRASE) : BOOT_LINE_4_PHRASES;

  const totalVariants = phrasePool.length + BOOT_LINE_4_IMAGES.length;
  const pick = Math.floor(Math.random() * totalVariants);

  lineEl.textContent = '';

  if (pick < phrasePool.length) {
    lineEl.textContent = phrasePool[pick];
    return;
  }

  if (!fullscreenEl) return;
  const variant = BOOT_LINE_4_IMAGES[pick - phrasePool.length];
  const caption = fullscreenEl.querySelector('.boot-fullscreen-caption');

  fullscreenEl.style.backgroundImage = `url("${variant.src}")`;
  if (caption) caption.textContent = variant.caption;
  fullscreenEl.classList.add('active');
}

/* ---------------------------------------------------
   Botón "Copiar IP": copia la IP del server al portapapeles al pulsarlo.
   navigator.clipboard solo existe en HTTPS y navegadores modernos; si no
   está o falla (permiso denegado...), se prueba el método antiguo y, si
   tampoco funciona, se enseña la IP en el propio botón para copiarla a mano.
--------------------------------------------------- */
function copyWithTextarea(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (err) {
    ok = false;
  }
  textarea.remove();
  return ok;
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch(() => {
      if (!copyWithTextarea(text)) throw new Error('No se pudo copiar');
    });
  }
  return copyWithTextarea(text) ? Promise.resolve() : Promise.reject(new Error('No se pudo copiar'));
}

export function initCopyIpButton() {
  const btn = document.getElementById('copy-ip-btn');
  if (!btn) return;

  const defaultLabel = btn.textContent;
  let resetTimer = null;
  const flash = (label, className, ms) => {
    clearTimeout(resetTimer);
    btn.textContent = label;
    btn.classList.remove('is-copied');
    if (className) btn.classList.add(className);
    resetTimer = setTimeout(() => {
      btn.textContent = defaultLabel;
      btn.classList.remove('is-copied');
    }, ms);
  };

  btn.addEventListener('click', () => {
    copyText(SERVER_IP)
      .then(() => flash('IP copiada', 'is-copied', 1600))
      .catch(() => flash(SERVER_IP, null, 6000));
  });
}
