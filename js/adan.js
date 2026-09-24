// ======================================================
// Easter egg de Adán
// ======================================================

import { duckStaticAudio, restoreStaticAudio, slamStaticAudio, playChannelChangeAudio } from './audio.js';
import { t, tRaw } from './i18n.js';
import { isView, setView } from './views.js';
import { sleep, storageGet, storageSet, typeInto } from './utils.js';

/* ---------------------------------------------------
   Easter egg de Adán (palabra secreta del buscador, ver password.js)
   Pantalla negra de golpe, en silencio total, con un diálogo tecleado en
   terminal. La frase con la que "responde" el usuario se sortea entre las
   de adan.phrases (diccionario de idioma) al empezar; lo que teclee de verdad da igual, cada
   pulsación solo cuenta como "avanzar" o "retroceder" la revelación de esa
   frase (como en el juego SPLIT). Al completarla y pulsar Enter, se escribe
   la respuesta fija emparejada, la pantalla se inunda de estática y la
   página intenta cerrarse; si el navegador lo bloquea (lo normal, esta
   pestaña no se abrió por script), se queda negra e inerte para siempre.
--------------------------------------------------- */
// Los textos de Adán (frases que "escribe" quien juega, sus respuestas y los
// saludos) están en los diccionarios de idioma, js/i18n/<idioma>.js, bajo las
// claves adan.*. Se leen al abrir la escena, en el idioma de ese momento.
//
// adan.phrases: cada frase que el usuario puede "escribir" (sin que importe lo
// que teclee de verdad) y la respuesta fija que le corresponde.
//
// Cuántas veces se ha completado la escena en este navegador (ver
// ADAN_VISITS_KEY) decide el saludo y si se vuelve a sortear entre
// adan.phrases o no:
//   0 veces -> adan.promptFirst ("¿Qué haces aquí?") + frase al azar
//   1 vez   -> adan.promptReturn ("Volviste.") + adan.returnPhrase (Adán te reconoce)
//   2 veces -> adan.promptThird ("Otra vez tú.") + adan.thirdPhrase (ya cuenta tus visitas)
//   3+ veces -> adan.promptReturn + de nuevo frase al azar
export const ADAN_VISITS_KEY = 'nova_adan_scene_visits';

// Frase extra para el sorteo de la línea 4 del boot (BOOT_LINE_4_PHRASES,
// ver setBootLine4Variant en intro.js): solo entra en el sorteo si ya se ha
// visitado la escena de Adán al menos una vez en este navegador, como rastro
// de que la visita "dejó algo" en el resto del sitio.
export const BOOT_LINE_4_ADAN_PHRASE = '⏃⎅⏃⋏ ⌰⍜ ⌇⏃⏚⟒'; // "ADAN LO SABE"

// La escena se monta en initAdanScene(); hasta entonces (o si falta algún
// elemento del HTML) abrirla no hace nada.
let openScene = null;

// La abre la palabra secreta del buscador (password.js).
export function openAdanScene() {
  if (openScene) openScene();
}

export function initAdanScene() {
  const scene = document.getElementById('adan-scene');
  const staticEl = document.getElementById('adan-scene-static');
  const terminalEl = document.getElementById('adan-scene-terminal');
  const promptEl = document.getElementById('adan-scene-prompt');
  const logEl = document.getElementById('adan-scene-log');
  const inputRow = document.getElementById('adan-scene-input-row');
  const echoEl = document.getElementById('adan-scene-echo');
  const inputEl = document.getElementById('adan-scene-input');
  if (!scene || !staticEl || !terminalEl || !promptEl || !logEl || !inputRow || !echoEl || !inputEl) return;

  // idle -> intro (escribiendo la pregunta) -> waiting (esperando la frase) ->
  // locked (Enter aceptado, escribiendo la respuesta) -> ending (inundación) -> dead
  let phase = 'idle';
  let queue = []; // rondas { phrase, response } de esta visita, en orden (normalmente 1, ver openScene)
  let roundIndex = 0;
  let current = null;
  let revealIndex = 0;
  let backspaceCount = 0; // veces que se borró durante la revelación de la ronda actual (ver freezeCurrentEcho/runResponsePhase)
  let visitsAtStart = 0; // cuántas veces se había completado la escena ANTES de esta ejecución

  const isActive = () => isView('adan');

  // Una vez una línea de Adán termina de escribirse, se le añade el glitch
  // cromático del sitio (mismo mecanismo que .intro-title/.rules-title):
  // requiere que data-text tenga el texto final completo, así que se aplica
  // después de typeInto(), nunca mientras se está escribiendo letra a letra.
  const settleGlitch = (el) => {
    el.dataset.text = el.textContent;
    el.classList.add('glitch');
  };

  const resetVisuals = () => {
    promptEl.textContent = '';
    promptEl.classList.remove('glitch');
    promptEl.removeAttribute('data-text');
    logEl.innerHTML = '';
    echoEl.textContent = '';
    inputEl.value = '';
    inputEl.disabled = true;
    inputRow.hidden = true;
    inputRow.classList.remove('is-jittering');
    staticEl.style.opacity = '0';
    terminalEl.style.opacity = '1';
  };

  // Un pequeño temblor de vez en cuando mientras se espera la frase completa,
  // para meter tensión antes del Enter. Se corta solo en cuanto phase deja de
  // ser 'waiting' (frase completada, Escape, o la escena vuelve a idle).
  const scheduleWaitingJitter = () => {
    if (phase !== 'waiting') return;
    inputRow.classList.add('is-jittering');
    setTimeout(() => inputRow.classList.remove('is-jittering'), 200);
    setTimeout(scheduleWaitingJitter, 1500 + Math.random() * 2500);
  };

  const cancel = () => {
    if (phase !== 'intro' && phase !== 'waiting') return; // ya comprometido: no hay marcha atrás
    phase = 'idle';
    scene.setAttribute('aria-hidden', 'true');
    setView('home');
    resetVisuals();
    restoreStaticAudio();
  };

  // Cada pulsación que modifica contenido cuenta como "avanzar" (insertar,
  // pegar, IME) o "retroceder" (borrar); el texto real tecleado no se usa
  // nunca. preventDefault() siempre, para que el <input> nunca muestre lo
  // que la persona pulsó de verdad.
  inputEl.addEventListener('beforeinput', (e) => {
    e.preventDefault();
    if (phase !== 'waiting') return;
    if (e.inputType && e.inputType.indexOf('delete') === 0) {
      revealIndex = Math.max(0, revealIndex - 1);
      backspaceCount += 1;
    } else {
      revealIndex = Math.min(current.phrase.length, revealIndex + 1);
    }
    const revealed = current.phrase.slice(0, revealIndex);
    inputEl.value = revealed;
    inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
    echoEl.textContent = revealed; // lo que de verdad se ve: el <input> está oculto (ver CSS)
  });

  // Un <input type="text"> (no contenteditable) no genera beforeinput al
  // pulsar Enter, así que Enter nunca cuenta como "avanzar" por accidente;
  // se gestiona aparte, solo para comprobar si la frase ya está completa.
  inputEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || phase !== 'waiting') return;
    e.preventDefault();
    if (revealIndex < current.phrase.length) return; // frase incompleta: no pasa nada
    phase = 'locked';
    inputEl.disabled = true;
    runResponsePhase();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !isActive()) return;
    if (phase === 'intro' || phase === 'waiting') {
      cancel();
    } else {
      e.preventDefault(); // fase comprometida: la tecla no hace nada
    }
  });

  // Congela la frase que se acaba de completar como línea fija del historial
  // (log), y limpia la línea "en vivo" para la siguiente ronda si la hay.
  function freezeCurrentEcho() {
    const line = document.createElement('p');
    line.className = 'adan-scene-line adan-scene-line-player';
    line.textContent = `> ${current.phrase}`;
    logEl.appendChild(line);
    inputRow.hidden = true;
    echoEl.textContent = '';
    inputEl.value = '';
  }

  function startRound() {
    current = queue[roundIndex];
    revealIndex = 0;
    backspaceCount = 0;
    inputRow.hidden = false;
    inputEl.disabled = false;
    phase = 'waiting';
    inputEl.focus();
    scheduleWaitingJitter();
  }

  // Comentario extra que Adán añade tras su respuesta según cuánto se dudó
  // al revelar la frase (backspaceCount, ver beforeinput/startRound). Null
  // si la duda fue intermedia, para no forzar el comentario siempre.
  function hesitationLine(backspaces, phraseLength) {
    if (backspaces === 0) return t('adan.noHesitation');
    if (backspaces >= phraseLength) return t('adan.hesitated');
    return null;
  }

  async function runResponsePhase() {
    freezeCurrentEcho();
    await sleep(600);
    if (!isActive()) return;
    const responseLine = document.createElement('p');
    responseLine.className = 'adan-scene-line';
    logEl.appendChild(responseLine);
    await typeInto(responseLine, current.response, 40);
    if (!isActive()) return;
    settleGlitch(responseLine);

    const hesitationTail = hesitationLine(backspaceCount, current.phrase.length);
    if (hesitationTail) {
      await sleep(700);
      if (!isActive()) return;
      const tailLine = document.createElement('p');
      tailLine.className = 'adan-scene-line';
      logEl.appendChild(tailLine);
      await typeInto(tailLine, hesitationTail, 40);
      if (!isActive()) return;
      settleGlitch(tailLine);
    }

    roundIndex += 1;
    if (roundIndex < queue.length) {
      // Queda otra ronda en esta misma visita (la 2ª vez encadena, tras el
      // reconocimiento, una ronda normal sin recargar la página): deja
      // preguntar otra vez en vez de terminar la escena aquí.
      await sleep(900);
      if (!isActive()) return;
      startRound();
      return;
    }

    // Última ronda de esta visita: cuenta como completada para decidir el
    // saludo/frase de la próxima vez (ver ADAN_VISITS_KEY más arriba).
    storageSet(ADAN_VISITS_KEY, String(visitsAtStart + 1));
    await sleep(1600);
    await floodAndClose();
  }

  async function floodAndClose() {
    phase = 'ending';
    // Silencio total roto a propósito: se sube el bus de golpe (no con
    // restoreStaticAudio(), que hace un fundido de 0.2s) para un golpe seco,
    // y se reutiliza el mismo sonido de "estática de pantalla completa" que
    // ya usa channel-transition, porque el efecto visual es el mismo.
    slamStaticAudio();
    playChannelChangeAudio();
    staticEl.style.opacity = '1';
    terminalEl.style.opacity = '0';
    await sleep(1300);

    phase = 'dead';
    scene.classList.add('is-dead');
    try {
      window.close();
    } catch (_err) {
      /* bloqueado por el navegador: se queda en negro */
    }
    // Si seguimos aquí, el cierre falló (normal: esta pestaña no se abrió
    // por script). No hay forma de volver desde aquí salvo recargar.
  }

  openScene = () => {
    if (phase !== 'idle') return; // ya en curso o terminada: un solo disparo por carga de página

    visitsAtStart = parseInt(storageGet(ADAN_VISITS_KEY), 10) || 0;
    let promptText = t('adan.promptReturn');
    if (visitsAtStart === 0) promptText = t('adan.promptFirst');
    else if (visitsAtStart === 2) promptText = t('adan.promptThird');
    const phrases = tRaw('adan.phrases');
    const randomPhrase = () => phrases[Math.floor(Math.random() * phrases.length)];
    // La 2ª visita (visitsAtStart === 1) y la 3ª (visitsAtStart === 2) añaden
    // delante su propia pareja fija de "reconocimiento"; tras esa ronda,
    // freezeCurrentEcho()/runResponsePhase() encadenan la ronda al azar que
    // sigue en la cola en vez de terminar la escena, así que en la misma
    // visita Adán ya te deja preguntar otra vez. La primera vez y a partir
    // de la cuarta es una sola ronda al azar.
    if (visitsAtStart === 1) queue = [tRaw('adan.returnPhrase'), randomPhrase()];
    else if (visitsAtStart === 2) queue = [tRaw('adan.thirdPhrase'), randomPhrase()];
    else queue = [randomPhrase()];
    roundIndex = 0;

    phase = 'intro';
    resetVisuals();
    duckStaticAudio();
    scene.classList.remove('is-dead');
    scene.setAttribute('aria-hidden', 'false');
    setView('adan');

    (async () => {
      await sleep(1400);
      if (!isActive()) return;
      await typeInto(promptEl, promptText, 45);
      if (!isActive()) return;
      settleGlitch(promptEl);
      await sleep(500);
      if (!isActive()) return;
      startRound();
    })();
  };
}
