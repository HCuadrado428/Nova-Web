// Calendario de eventos (js/calendar.js y js/data/events.js), sin navegador.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildIcs, currentEvent, normalizeEvents } from '../js/calendar.js';
import { EVENTS } from '../js/data/events.js';

const at = (iso) => Date.parse(iso);
const LISTA = [
  { name: 'Segundo', start: '2026-11-01T18:00:00Z' },
  { name: 'Primero', start: '2026-10-10T20:00:00Z', hours: 2 },
];

describe('currentEvent', () => {
  test('antes de empezar: el más cercano, aunque no esté primero en la lista', () => {
    assert.equal(currentEvent(LISTA, at('2026-10-01T00:00:00Z')).name, 'Primero');
  });

  test('mientras dura (hours) sigue siendo ese; al acabar pasa al siguiente', () => {
    assert.equal(currentEvent(LISTA, at('2026-10-10T21:59:59Z')).name, 'Primero');
    assert.equal(currentEvent(LISTA, at('2026-10-10T22:00:00Z')).name, 'Segundo');
  });

  test('sin hours dura 3 horas; si ya pasaron todos, null', () => {
    assert.equal(currentEvent(LISTA, at('2026-11-01T20:59:59Z')).name, 'Segundo');
    assert.equal(currentEvent(LISTA, at('2026-11-01T21:00:00Z')), null);
    assert.equal(currentEvent([], Date.now()), null);
  });

  test('una fecha mal escrita se ignora', () => {
    assert.deepEqual(
      normalizeEvents([{ name: 'Mal', start: 'mañana' }, ...LISTA]).map((ev) => ev.name),
      ['Primero', 'Segundo'],
    );
  });

  test('los eventos de js/data/events.js tienen nombre y la hora en UTC', () => {
    for (const ev of EVENTS) {
      assert.ok(ev.name, 'falta el nombre');
      assert.match(ev.start, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?Z$/, `${ev.name}: start debe terminar en Z`);
    }
  });
});

describe('buildIcs', () => {
  test('evento en UTC, con CRLF y los textos escapados', () => {
    const [ev] = normalizeEvents([{ name: 'Be The Boss', start: '2026-10-10T20:00:00Z', hours: 3 }]);
    const ics = buildIcs(ev, {
      now: at('2026-10-06T10:00:00Z'),
      url: 'https://hcuadrado428.github.io/Nova-Web/',
      description: 'IP: a.b, c; d \\ e',
    });
    const lines = ics.split('\r\n');
    assert.equal(lines[0], 'BEGIN:VCALENDAR');
    assert.ok(lines.includes('DTSTART:20261010T200000Z'));
    assert.ok(lines.includes('DTEND:20261010T230000Z'));
    assert.ok(lines.includes('DTSTAMP:20261006T100000Z'));
    assert.ok(lines.includes('SUMMARY:NOVA 2 · Be The Boss'));
    assert.ok(lines.includes('DESCRIPTION:IP: a.b\\, c\\; d \\\\ e'));
    assert.ok(lines.includes('UID:20261010T200000Z-be-the-boss@nova-web'));
    assert.ok(!/[^\r]\n/.test(ics), 'todas las líneas con CRLF');
  });
});
