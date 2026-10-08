// Estado de los personajes y Memorial (js/personajes/status.js), sin navegador.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { estadoOf, formatFechaCaida, isFechaValida, listCaidos } from '../js/personajes/status.js';

const pj = (id, estado, caidoEl) => ({ id, data: { nombre: id, estado, caidoEl } });

describe('estadoOf', () => {
  test('vivo (null) salvo desaparecido o caído', () => {
    assert.equal(estadoOf({}), null);
    assert.equal(estadoOf({ estado: null }), null);
    assert.equal(estadoOf({ estado: 'zombi' }), null);
    assert.equal(estadoOf({ estado: 'desaparecido' }), 'desaparecido');
    assert.equal(estadoOf({ estado: 'caido' }), 'caido');
    assert.equal(estadoOf(undefined), null);
  });
});

describe('isFechaValida', () => {
  test('solo AAAA-MM-DD de un día que existe', () => {
    assert.ok(isFechaValida('2026-10-03'));
    assert.ok(isFechaValida('2028-02-29'));
    assert.ok(!isFechaValida('2026-02-31'));
    assert.ok(!isFechaValida('2026-1-3'));
    assert.ok(!isFechaValida('2026-10-03T00:00:00Z'));
    assert.ok(!isFechaValida(null));
  });
});

describe('listCaidos', () => {
  test('solo los caídos, el más reciente primero y los sin fecha al final por nombre', () => {
    const list = listCaidos([
      pj('vivo', null),
      pj('perdido', 'desaparecido', '2026-10-01'),
      pj('zeta', 'caido'),
      pj('viejo', 'caido', '2026-09-01'),
      pj('alfa', 'caido', 'no-es-fecha'),
      pj('nuevo', 'caido', '2026-10-05'),
    ]);
    assert.deepEqual(
      list.map((p) => p.id),
      ['nuevo', 'viejo', 'alfa', 'zeta'],
    );
  });
});

describe('formatFechaCaida', () => {
  test('el mismo día en cualquier zona horaria, y vacío si no es una fecha', () => {
    assert.match(formatFechaCaida('2026-10-03', 'es'), /^3 oct\.? 2026$/);
    assert.equal(formatFechaCaida('', 'es'), '');
  });
});
