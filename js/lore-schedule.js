// ======================================================
// Lore por emisiones: cálculos puros (sin DOM)
// ======================================================
//
// Un pase del Lore puede llevar `emisionEn` (fecha en UTC, terminada en Z).
// Hasta esa fecha, ese pase y todos los que vienen detrás en su pista están
// "por emitir": el visor los sustituye por una pantalla de estática con la
// cuenta atrás. Así se puede dejar escrito el Lore de la temporada y que se
// vaya desbloqueando solo, como los capítulos de una serie.
//
// Ojo: los textos siguen estando en js/data/lore.*.js, así que quien mire el
// código de la web los puede leer antes de tiempo. Es un bloqueo de cara a la
// web, no un secreto.
//
// Separado de js/lore.js para poder probarlo sin navegador
// (tests/lore-schedule.test.js).

// La parte de una pista que ya se ha emitido en `now` (ms), y la fecha (ms)
// de la siguiente emisión, o null si ya está todo emitido. Una fecha mal
// escrita se ignora, igual que en el calendario (y tests/lore-schedule.test.js
// comprueba que no haya ninguna en los datos).
export function airedTrack(track, now) {
  const locked = track.findIndex((slide) => Date.parse(slide.emisionEn) > now);
  if (locked === -1) return { slides: track, next: null };
  return { slides: track.slice(0, locked), next: Date.parse(track[locked].emisionEn) };
}

const pad = (n) => String(n).padStart(2, '0');

// "2 d 04 h 10 min 05 s" (sin los días si queda menos de uno). Se redondea
// hacia arriba al segundo para que no marque 00 s mientras aún falta algo.
export function formatRemaining(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const days = Math.floor(s / 86400);
  const rest = `${pad(Math.floor((s % 86400) / 3600))} h ${pad(Math.floor((s % 3600) / 60))} min ${pad(s % 60)} s`;
  return days ? `${days} d ${rest}` : rest;
}
