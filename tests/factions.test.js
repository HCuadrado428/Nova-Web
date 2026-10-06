// Facciones de Personajes (js/personajes/factions.js), sin navegador.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { factionKey, listFactions } from '../js/personajes/factions.js';

const pj = (id, faccion) => ({ id, data: { nombre: id, faccion } });

describe('listFactions', () => {
  test('agrupa sin mayúsculas ni tildes, las más numerosas primero', () => {
    const list = listFactions([
      pj('a', 'reino del norte'),
      pj('b', 'Reino del Norte'),
      pj('c', 'Clan Ébano'),
      pj('d', '  clan ebano '),
      pj('e', 'Clan Ébano'),
      pj('f', null),
      pj('g', '   '),
    ]);
    assert.deepEqual(
      list.map((f) => [f.name, f.count]),
      [
        ['Clan Ébano', 3],
        ['Reino del Norte', 2],
      ],
    );
  });

  test('se muestra la forma más usada; si empatan, la de la ficha más antigua', () => {
    const nombre = (list) => list[0].name;
    assert.equal(nombre(listFactions([pj('a', 'reino'), pj('b', 'Reino'), pj('c', 'Reino')])), 'Reino');
    // La lista viene con la ficha cambiada más recientemente primero.
    assert.equal(nombre(listFactions([pj('nuevo', 'reino'), pj('viejo', 'Reino')])), 'Reino');
  });

  test('el color depende del nombre, no de cuántos miembros tenga', () => {
    const antes = listFactions([pj('a', 'Alfa'), pj('b', 'Beta')]);
    const despues = listFactions([pj('a', 'Alfa'), pj('b', 'Beta'), pj('c', 'Beta'), pj('d', 'Beta')]);
    const color = (list, name) => list.find((f) => f.name === name).color;
    assert.equal(color(antes, 'Alfa'), color(despues, 'Alfa'));
    assert.equal(color(antes, 'Beta'), color(despues, 'Beta'));
    assert.notEqual(color(antes, 'Alfa'), color(antes, 'Beta'));
  });

  test('sin facciones, lista vacía', () => {
    assert.deepEqual(listFactions([pj('a'), pj('b', '')]), []);
    assert.equal(factionKey(' Reino  '), 'reino');
  });
});
