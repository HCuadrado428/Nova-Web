// ======================================================
// Utilidades compartidas entre módulos
// ======================================================

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Escribe letra a letra el texto dentro de un elemento ya insertado en el DOM.
export function typeInto(el, text, speed = 30) {
  return new Promise((resolve) => {
    let i = 0;
    const tick = () => {
      el.textContent = text.slice(0, i);
      i += 1;
      if (i <= text.length) {
        setTimeout(tick, speed);
      } else {
        resolve();
      }
    };
    tick();
  });
}

// Minúsculas, sin espacios alrededor y sin tildes ("Canción" -> "cancion"),
// para comparar lo que escribe la gente sin que importe cómo lo escriba.
export function normalizeSearchTerm(raw) {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// localStorage puede no estar disponible (modo privado, cookies bloqueadas...):
// en ese caso simplemente no se recuerda nada, sin romper la página.
export function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (_err) {
    return null;
  }
}

export function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (_err) {
    // no disponible: no se recordará la próxima vez
  }
}

// ¿La tecla viene de un control que ya la usa por su cuenta (el vídeo, un
// campo de texto...)? En ese caso los atajos de teclado globales no deben
// "robársela" (p.ej. espacio = pausar el vídeo, no pasar de pase).
export function isTypingOrMediaTarget(target) {
  return (
    target instanceof Element && !!target.closest('video, audio, input, textarea, select, [contenteditable="true"]')
  );
}
