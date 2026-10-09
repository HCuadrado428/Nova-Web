// Lógica del árbol de relaciones (js/relations-graph.js), sin navegador.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildGraph, focusLayout, layoutGraph, wrapLabel } from '../js/relations-graph.js';

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

  test('un grafo vacío no rompe nada', () => {
    const { positions, width, height } = layoutGraph({ nodes: [], edges: [] });
    assert.equal(positions.size, 0);
    assert.ok(width > 0 && height > 0);
  });
});

describe('focusLayout (vista por personaje)', () => {
  // Kira con cinco relaciones; Zed además conoce a Nyx.
  const graph = buildGraph([
    pj('kira', [
      rel('zed', 'hermano'),
      rel('ash', 'rival'),
      rel('bo', 'amiga'),
      rel('cy', 'mentor'),
      rel('dee', 'socia'),
    ]),
    pj('zed', [rel('kira', 'hermana'), rel('nyx', 'pareja')]),
    pj('ash'),
    pj('bo'),
    pj('cy'),
    pj('dee'),
    pj('nyx'),
  ]);

  test('el elegido en el centro y solo sus relaciones alrededor', () => {
    const view = focusLayout(graph, 'kira');
    assert.deepEqual(
      view.nodes.map((n) => n.id),
      ['kira', 'ash', 'bo', 'cy', 'dee', 'zed'],
    );
    assert.ok(view.nodes[0].center);
    assert.ok(view.edges.every((e) => e.a === 'kira'));
    assert.equal(view.positions.has('nyx'), false);
  });

  test('todos a la misma distancia del centro, sin amontonarse', () => {
    const view = focusLayout(graph, 'kira');
    const c = view.positions.get('kira');
    const ring = view.nodes.slice(1).map((n) => view.positions.get(n.id));
    const radii = ring.map((p) => Math.hypot(p.x - c.x, p.y - c.y));
    for (const r of radii) assert.ok(Math.abs(r - radii[0]) < 1e-6);
    for (let i = 0; i < ring.length; i++) {
      for (let j = i + 1; j < ring.length; j++) {
        assert.ok(Math.hypot(ring[i].x - ring[j].x, ring[i].y - ring[j].y) > 100);
      }
    }
  });

  test('la relación va con cada nombre: primero lo que dice el del centro', () => {
    const zed = focusLayout(graph, 'kira').nodes.find((n) => n.id === 'zed');
    assert.deepEqual(zed.caption, ['hermano', 'hermana']);
    assert.equal(zed.more, 1); // además conoce a Nyx
    const kira = focusLayout(graph, 'zed').nodes.find((n) => n.id === 'kira');
    assert.deepEqual(kira.caption, ['hermana', 'hermano']);
    assert.equal(kira.more, 4);
  });

  test('en la mitad de arriba el texto va encima, para que la línea al centro no lo cruce', () => {
    const view = focusLayout(graph, 'kira');
    const c = view.positions.get('kira');
    for (const n of view.nodes.slice(1)) {
      const radius = Math.hypot(n.x - c.x, n.y - c.y);
      assert.equal(n.above, (n.y - c.y) / radius < -0.35, n.id); // bien arriba: no los de los lados
    }
  });

  test('todo cabe en el lienzo', () => {
    const view = focusLayout(graph, 'kira');
    for (const p of view.positions.values()) {
      assert.ok(p.x > 0 && p.x < view.width && p.y > 0 && p.y < view.height);
    }
  });

  test('un personaje que no está en el árbol: null', () => {
    assert.equal(focusLayout(graph, 'nadie'), null);
  });
});

describe('wrapLabel', () => {
  test('corta por palabras y parte las palabras larguísimas', () => {
    assert.deepEqual(wrapLabel('hermano'), ['hermano']);
    assert.deepEqual(wrapLabel('Lo sigue a todas partes (son amigos...?)'), [
      'Lo sigue a todas partes',
      '(son amigos...?)',
    ]);
    assert.deepEqual(wrapLabel('a'.repeat(30)), ['a'.repeat(26), 'aaaa']);
  });
});
