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

  test('cada nodo lleva el estado de su personaje (null si está vivo)', () => {
    const g = buildGraph([pj('a', [rel('b')], { estado: 'caido' }), pj('b', [], { estado: 'raro' })]);
    assert.deepEqual(
      g.nodes.map((n) => n.estado),
      ['caido', null],
    );
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

  test('una relación con etiqueta larga separa más a los dos personajes', () => {
    const dist = (etiqueta) => {
      const { positions } = layoutGraph(buildGraph([pj('a', [rel('b', etiqueta)]), pj('b')]));
      const [p, q] = [...positions.values()];
      return Math.hypot(p.x - q.x, p.y - q.y);
    };
    // El texto (~180px) tiene que caber entre los dos círculos (60px de diámetro cada uno).
    assert.ok(dist('Persona más cercana a él') > 180 + 60, `${dist('Persona más cercana a él')}`);
    assert.ok(dist('Persona más cercana a él') > dist('hijo'));
  });

  test('los grupos sueltos no se mezclan: cada uno en su rincón', () => {
    const { positions } = layoutGraph(graph);
    const box = (ids) => {
      const ps = ids.map((id) => positions.get(id));
      return {
        x1: Math.min(...ps.map((p) => p.x)),
        x2: Math.max(...ps.map((p) => p.x)),
        y1: Math.min(...ps.map((p) => p.y)),
        y2: Math.max(...ps.map((p) => p.y)),
      };
    };
    const familia = box(['a', 'b', 'c', 'd']);
    const otros = box(['e', 'f', 'g', 'h']);
    const separados = familia.x2 < otros.x1 || otros.x2 < familia.x1 || familia.y2 < otros.y1 || otros.y2 < familia.y1;
    assert.ok(separados, JSON.stringify({ familia, otros }));
  });

  test('el dibujo toma la forma de la caja: apaisado en ordenador, alargado en móvil', () => {
    // Una cadena larga: sin girarla saldría siempre igual.
    const cadena = buildGraph(
      Array.from({ length: 8 }, (_, i) => pj(`p${i}`, i < 7 ? [rel(`p${i + 1}`, 'amigo')] : [])),
    );
    const ancho = layoutGraph(cadena, { aspect: 16 / 9 });
    const alto = layoutGraph(cadena, { aspect: 9 / 16 });
    assert.ok(ancho.width > ancho.height, `${ancho.width}x${ancho.height}`);
    assert.ok(alto.height > alto.width, `${alto.width}x${alto.height}`);
  });

  test('las líneas no se cruzan ni pasan por encima de otro personaje si se puede evitar', () => {
    // Una rueda (un centro unido a seis que forman un anillo): se puede dibujar sin cruces.
    const ids = ['c', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6'];
    const rueda = buildGraph([
      pj(
        'c',
        ids.slice(1).map((id) => rel(id)),
      ),
      ...ids.slice(1).map((id, i) => pj(id, [rel(ids[1 + ((i + 1) % 6)])])),
    ]);
    for (const aspect of [0.6, 1.6]) {
      const { positions } = layoutGraph(rueda, { aspect });
      const lines = rueda.edges.map((e) => [e.a, e.b, positions.get(e.a), positions.get(e.b)]);
      const side = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      for (const [a, b, p, q] of lines) {
        for (const [c, d, r, t] of lines) {
          if ([a, b].includes(c) || [a, b].includes(d)) continue;
          const cruzan = side(p, q, r) * side(p, q, t) < 0 && side(r, t, p) * side(r, t, q) < 0;
          assert.ok(!cruzan, `${a}-${b} cruza ${c}-${d} (aspect ${aspect})`);
        }
        for (const [id, o] of positions) {
          if (id === a || id === b) continue;
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          const k = Math.min(1, Math.max(0, ((o.x - p.x) * dx + (o.y - p.y) * dy) / (dx * dx + dy * dy)));
          const dist = Math.hypot(p.x + k * dx - o.x, p.y + k * dy - o.y);
          assert.ok(dist > 30, `${a}-${b} pasa por encima de ${id} (aspect ${aspect})`);
        }
      }
    }
  });

  test('un grafo vacío no rompe nada', () => {
    const { positions, width, height } = layoutGraph({ nodes: [], edges: [] });
    assert.equal(positions.size, 0);
    assert.ok(width > 0 && height > 0);
  });
});
