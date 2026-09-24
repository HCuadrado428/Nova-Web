// Lógica del árbol de relaciones (js/relations-graph.js), sin navegador.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildGraph, layoutGraph } from '../js/relations-graph.js';

const rel = (uid, etiqueta = '') => ({ tipo: 'relacion', uid, nombre: uid, etiqueta });
const pj = (id, bloques = [], extra = {}) => ({ id, data: { nombre: id.toUpperCase(), bloques, ...extra } });

describe('buildGraph', () => {
  test('una línea por pareja, con las etiquetas de las dos partes', () => {
    const g = buildGraph([pj('kira', [rel('zed', 'hermana')]), pj('zed', [rel('kira', 'hermano')])]);
    assert.equal(g.edges.length, 1);
    assert.deepEqual(g.edges[0].labels.sort(), ['hermana', 'hermano']);
    assert.deepEqual(
      g.nodes.map((n) => n.id),
      ['kira', 'zed'],
    );
    // En la lista, cada una con su dirección.
    assert.deepEqual(g.declarations, [
      { from: 'kira', to: 'zed', label: 'hermana' },
      { from: 'zed', to: 'kira', label: 'hermano' },
    ]);
  });

  test('etiquetas repetidas o vacías no se duplican', () => {
    const g = buildGraph([pj('a', [rel('b', 'amigo')]), pj('b', [rel('a', 'amigo')]), pj('c', [rel('a')])]);
    const ab = g.edges.find((e) => e.a === 'a' && e.b === 'b');
    const ac = g.edges.find((e) => e.a === 'a' && e.b === 'c');
    assert.deepEqual(ab.labels, ['amigo']);
    assert.deepEqual(ac.labels, []);
  });

  test('se ignoran relaciones rotas: personaje borrado, consigo mismo, otros bloques', () => {
    const g = buildGraph([
      pj('a', [rel('borrado', 'x'), rel('a', 'yo'), { tipo: 'texto', contenido: 'hola' }, rel('b', 'rival')]),
      pj('b'),
    ]);
    assert.equal(g.edges.length, 1);
    assert.deepEqual(g.edges[0].labels, ['rival']);
  });

  test('los personajes sin relaciones no salen, pero se cuentan', () => {
    const g = buildGraph([pj('a', [rel('b')]), pj('b'), pj('solo1'), pj('solo2')]);
    assert.deepEqual(
      g.nodes.map((n) => n.id),
      ['a', 'b'],
    );
    assert.equal(g.isolatedCount, 2);
  });

  test('sin relaciones: grafo vacío', () => {
    const g = buildGraph([pj('a'), pj('b')]);
    assert.deepEqual(g.nodes, []);
    assert.deepEqual(g.edges, []);
    assert.equal(g.isolatedCount, 2);
  });

  test('la foto del personaje pasa al nodo', () => {
    const g = buildGraph([pj('a', [rel('b')], { fotoUrl: 'https://x/a.jpg' }), pj('b')]);
    assert.equal(g.nodes.find((n) => n.id === 'a').foto, 'https://x/a.jpg');
    assert.equal(g.nodes.find((n) => n.id === 'b').foto, null);
  });
});

describe('layoutGraph', () => {
  // Una familia y un grupo aparte: 8 personajes.
  const personajes = [
    pj('a', [rel('b', 'pareja'), rel('c', 'hija'), rel('d', 'hijo')]),
    pj('b', [rel('c', 'hija')]),
    pj('c', [rel('d', 'hermano')]),
    pj('d'),
    pj('e', [rel('f', 'rival')]),
    pj('f', [rel('g', 'amiga')]),
    pj('g', [rel('h', 'mentor')]),
    pj('h'),
  ];
  const graph = buildGraph(personajes);

  test('siempre el mismo dibujo para los mismos datos', () => {
    const one = layoutGraph(graph);
    const two = layoutGraph(buildGraph([...personajes].reverse()));
    for (const [id, p] of one.positions) {
      assert.ok(Math.abs(p.x - two.positions.get(id).x) < 1e-6, id);
      assert.ok(Math.abs(p.y - two.positions.get(id).y) < 1e-6, id);
    }
  });

  test('ningún par de personajes queda amontonado', () => {
    const { positions } = layoutGraph(graph);
    const list = [...positions.values()];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const d = Math.hypot(list[i].x - list[j].x, list[i].y - list[j].y);
        assert.ok(d > 70, `dos círculos a ${d.toFixed(1)}px`);
      }
    }
  });

  test('todo cabe dentro del lienzo, con margen', () => {
    const { positions, width, height } = layoutGraph(graph);
    for (const p of positions.values()) {
      assert.ok(p.x >= 50 && p.x <= width - 50, `x=${p.x} fuera de 0..${width}`);
      assert.ok(p.y >= 50 && p.y <= height - 50, `y=${p.y} fuera de 0..${height}`);
    }
  });

  test('un grafo vacío no rompe nada', () => {
    const { positions, width, height } = layoutGraph({ nodes: [], edges: [] });
    assert.equal(positions.size, 0);
    assert.ok(width > 0 && height > 0);
  });
});
