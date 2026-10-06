// ======================================================
// Calendario de eventos: cálculos puros (sin DOM)
// ======================================================
//
// Separado de js/countdown.js para poder probarlo sin navegador
// (tests/calendar.test.js).

const HOUR_MS = 3_600_000;
const DEFAULT_HOURS = 3;

// Los eventos con sus horas ya en milisegundos, ordenados por inicio.
// Los que tienen una fecha mal escrita se ignoran.
export function normalizeEvents(events) {
  return events
    .map((ev) => {
      const start = Date.parse(ev.start);
      const hours = Number.isFinite(ev.hours) && ev.hours > 0 ? ev.hours : DEFAULT_HOURS;
      return { name: ev.name, start, end: start + hours * HOUR_MS };
    })
    .filter((ev) => Number.isFinite(ev.start))
    .sort((a, b) => a.start - b.start);
}

// El evento que toca mostrar ahora: el que está en curso o, si no hay
// ninguno, el siguiente que va a empezar. null si ya han pasado todos.
export function currentEvent(events, now) {
  return normalizeEvents(events).find((ev) => now < ev.end) ?? null;
}

// "20261010T200000Z", el formato de fecha de los .ics (en UTC).
const icsDate = (ms) =>
  new Date(ms)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

// En los textos de un .ics hay que escapar \ ; , y los saltos de línea.
const icsText = (s) =>
  String(s)
    .replace(/[\\;,]/g, (c) => `\\${c}`)
    .replace(/\r?\n/g, '\\n');

// Archivo .ics de un evento (ya normalizado) para "Añadir al calendario".
// Las líneas van con CRLF, como pide el estándar (RFC 5545).
export function buildIcs(ev, { now = Date.now(), url = '', description = '' } = {}) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NOVA 2//Eventos//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${icsDate(ev.start)}-${ev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}@nova-web`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(ev.start)}`,
    `DTEND:${icsDate(ev.end)}`,
    `SUMMARY:${icsText(`NOVA 2 · ${ev.name}`)}`,
  ];
  if (description) lines.push(`DESCRIPTION:${icsText(description)}`);
  if (url) lines.push(`URL:${url}`);
  lines.push('END:VEVENT', 'END:VCALENDAR', '');
  return lines.join('\r\n');
}
