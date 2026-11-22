// Lore por emisiones (js/lore-schedule.js y los datos del Lore), sin navegador.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { LORE_BY_LANGUAGE } from '../js/data/lore.js';
import { airedTrack, formatRemaining } from '../js/lore-schedule.js';

const at = (iso) => Date.parse(iso);
const PISTA = [
  { type: 'title' },
  { type: 'text', paragraphs: ['Uno'] },
  { type: 'text', paragraphs: ['Dos'], emisionEn: '2026-12-01T20:00:00Z' },
  { type: 'text', paragraphs: ['Tres'] },
  { type: 'text', paragraphs: ['Cuatro'], emisionEn: '2026-12-08T20:00:00Z' },
];

describe('airedTrack', () => {
  test('antes de la emisión: corta en el primer pase por emitir, aunque los de detrás no tengan fecha', () => {
    const { slides, next } = airedTrack(PISTA, at('2026-11-30T00:00:00Z'));
    assert.equal(slides.length, 2);
    assert.equal(next, at('2026-12-01T20:00:00Z'));
  });

  test('justo a la hora se emite; la siguiente fecha pasa a ser la de después', () => {
    const { slides, next } = airedTrack(PISTA, at('2026-12-01T20:00:00Z'));
    assert.equal(slides.length, 4);
    assert.equal(next, at('2026-12-08T20:00:00Z'));
  });

  test('con todo emitido (o sin fechas) se ve la pista entera', () => {
    assert.deepEqual(airedTrack(PISTA, at('2027-01-01T00:00:00Z')), { slides: PISTA, next: null });
    const sinFechas = [{ type: 'title' }];
    assert.deepEqual(airedTrack(sinFechas, 0), { slides: sinFechas, next: null });
  });

  test('si el primer pase está por emitir, no se ve ninguno', () => {
    const { slides, next } = airedTrack([{ type: 'title', emisionEn: '2026-12-01T20:00:00Z' }], 0);
    assert.deepEqual(slides, []);
    assert.equal(next, at('2026-12-01T20:00:00Z'));
  });
});

describe('formatRemaining', () => {
  test('días, horas, minutos y segundos; sin días si queda menos de uno', () => {
    assert.equal(formatRemaining(((2 * 24 + 4) * 3600 + 10 * 60 + 5) * 1000), '2 d 04 h 10 min 05 s');
    assert.equal(formatRemaining((3600 + 1) * 1000), '01 h 00 min 01 s');
  });

  test('redondea hacia arriba al segundo y nunca baja de cero', () => {
    assert.equal(formatRemaining(1), '00 h 00 min 01 s');
    assert.equal(formatRemaining(-5000), '00 h 00 min 00 s');
  });
});

describe('fechas de emisión en los datos', () => {
  test('todas son fechas válidas en UTC (terminadas en Z)', () => {
    for (const [lang, tracks] of Object.entries(LORE_BY_LANGUAGE)) {
      for (const [name, slides] of Object.entries(tracks)) {
        for (const [i, slide] of slides.entries()) {
          if (slide.emisionEn === undefined) continue;
          const where = `lore.${lang}.js, ${name}[${i}]`;
          assert.match(slide.emisionEn, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?Z$/, where);
          assert.ok(Number.isFinite(Date.parse(slide.emisionEn)), where);
        }
      }
    }
  });
});
