// ======================================================
// Árbol de relaciones entre personajes (dentro de Personajes)
// ======================================================
//
// Se construye con los bloques de tipo "relación" que cada persona pone en
// su personaje (uid del otro personaje + etiqueta, p.ej. "hermano"). Cada
// personaje es un círculo con su foto y cada relación una línea con su
// etiqueta; si las dos partes la declaran (hermano / hermana), sale una sola
// línea con las dos etiquetas.
//
// La colocación (layoutGraph) separa los grupos de personajes conectados,
// coloca cada uno de forma que las distancias en el dibujo sigan a las del
// árbol (los amigos cerca, sin enredos) y los reparte según la forma de la
// caja; no usa nada aleatorio, así que sale siempre igual para los mismos
// datos. Las funciones buildGraph() y layoutGraph() no tocan el DOM (se
// prueban en tests/graph.test.js); renderRelationsGraph() es la que dibuja el SVG.
//
// Zoom: se cambia el viewBox del SVG (así las letras y las fotos se ven más
// grandes y nítidas). Se acerca con los botones + / −, con la rueda del
// ratón, pellizcando en móvil o con el gesto de pellizco del touchpad; con
// zoom se arrastra para moverse. Sin zoom, bajar la rueda baja la página.

import { estadoOf } from './personajes/status.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// personajes: [{ id, data }] (la caché del directorio).
export function buildGraph(personajes) {
  const byId = new Map(personajes.map((p) => [p.id, p]));
  const pairs = new Map(); // "idA|idB" (ordenados) -> { a, b, labels }
  const declarations = []; // cada relación tal cual la puso su autor: { from, to, label }

  for (const { id, data } of personajes) {
    for (const bloque of data.bloques || []) {
      if (bloque.tipo !== 'relacion' || !bloque.uid || bloque.uid === id) continue;
      if (!byId.has(bloque.uid)) continue; // el otro personaje ya no existe
      const [a, b] = [id, bloque.uid].sort();
      const key = `${a}|${b}`;
      if (!pairs.has(key)) pairs.set(key, { a, b, labels: [] });
      const label = (bloque.etiqueta || '').trim();
      declarations.push({ from: id, to: bloque.uid, label });
      const labels = pairs.get(key).labels;
      if (label && !labels.includes(label)) labels.push(label);
    }
  }

  const connected = new Set();
  for (const { a, b } of pairs.values()) connected.add(a).add(b);

  const nodes = personajes
    .filter((p) => connected.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.data.nombre || '',
      foto: p.data.fotoUrl || null,
      faccion: p.data.faccion || null,
      estado: estadoOf(p.data),
    }))
    .sort((x, y) => x.id.localeCompare(y.id)); // orden estable: mismo dibujo siempre

  // Orden fijo (no el de llegada de los datos): la simulación suma fuerzas en
  // este orden, y cualquier cambio haría que el dibujo saliera distinto.
  const edges = [...pairs.values()]
    .map((e) => ({ ...e, labels: [...e.labels].sort((x, y) => x.localeCompare(y)) }))
    .sort((x, y) => x.a.localeCompare(y.a) || x.b.localeCompare(y.b));

  declarations.sort(
    (x, y) => x.from.localeCompare(y.from) || x.to.localeCompare(y.to) || x.label.localeCompare(y.label),
  );

  return {
    nodes,
    edges,
    declarations,
    isolatedCount: personajes.length - nodes.length,
  };
}

// Ancho aproximado (px) de la línea más larga de las etiquetas de una
// relación, a 14px. Sin DOM: lo usa la colocación, que se prueba en Node.
export function estimateLabelWidth(labels) {
  return Math.max(0, ...labels.map((l) => l.length)) * 7.5;
}

// Medio ancho y alto de lo que ocupa un personaje: el círculo (radio 30) y,
// debajo, su nombre en la fuente pixelada (~13px por letra).
function nodeBox(node) {
  return { hw: Math.max(40, [...node.name].length * 6.5 + 10), top: 40, bottom: 62 };
}

// Grupos de personajes conectados entre sí (cada uno se coloca por separado),
// del más grande al más pequeño.
function components(graph) {
  const adj = new Map(graph.nodes.map((n) => [n.id, []]));
  for (const e of graph.edges) {
    adj.get(e.a).push(e.b);
    adj.get(e.b).push(e.a);
  }
  const seen = new Set();
  const groups = [];
  for (const node of graph.nodes) {
    if (seen.has(node.id)) continue;
    const ids = [];
    const queue = [node.id];
    seen.add(node.id);
    while (queue.length) {
      const id = queue.shift();
      ids.push(id);
      for (const other of adj.get(id)) {
        if (!seen.has(other)) {
          seen.add(other);
          queue.push(other);
        }
      }
    }
    groups.push(ids.sort((x, y) => x.localeCompare(y)));
  }
  return groups.sort((x, y) => y.length - x.length || x[0].localeCompare(y[0]));
}

// Coloca un grupo conectado. Cada pareja de personajes "quiere" estar a la
// distancia de su camino más corto en el árbol (cada relación mide más o menos
// según lo larga que sea su etiqueta), y se busca el dibujo que mejor cumple
// todas esas distancias a la vez ("stress majorization"). Así los grupos de
// amigos quedan juntos, los lejanos lejos y apenas se cruzan líneas. Empieza
// desde un punto de partida calculado (MDS clásico), no al azar, por lo que el
// dibujo sale siempre igual. Devuelve [{ x, y }] en el orden de "ids".
function layoutComponent(ids, edges, spacing, iterations) {
  const n = ids.length;
  if (n === 1) return [{ x: 0, y: 0 }];
  const index = new Map(ids.map((id, i) => [id, i]));
  // Distancias de camino más corto (Floyd-Warshall: pocos personajes).
  const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)));
  for (const e of edges) {
    const i = index.get(e.a);
    const j = index.get(e.b);
    if (i === undefined || j === undefined) continue;
    // Con tope: si no, unas pocas etiquetas muy largas estiran todo el dibujo.
    const len = Math.min(260, Math.max(spacing, estimateLabelWidth(e.labels) + 90));
    d[i][j] = d[j][i] = Math.min(d[i][j], len);
  }
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
      }
    }
  }

  // Punto de partida: MDS clásico (los dos ejes principales de las distancias).
  const d2 = d.map((row) => row.map((v) => v * v));
  const rowMean = d2.map((row) => row.reduce((a, b) => a + b, 0) / n);
  const allMean = rowMean.reduce((a, b) => a + b, 0) / n;
  const B = d2.map((row, i) => row.map((v, j) => -0.5 * (v - rowMean[i] - rowMean[j] + allMean)));
  const axes = [];
  for (let axis = 0; axis < 2; axis++) {
    let v = ids.map((_, i) => Math.sin(i * 1.7 + axis + 1)); // arranque fijo, no aleatorio
    let value = 0;
    for (let it = 0; it < 100; it++) {
      let next = B.map((row) => row.reduce((sum, b, j) => sum + b * v[j], 0));
      for (const prev of axes) {
        const dot = next.reduce((sum, x, i) => sum + x * prev.v[i], 0);
        next = next.map((x, i) => x - dot * prev.v[i]);
      }
      const norm = Math.hypot(...next);
      if (norm < 1e-9) break;
      value = norm;
      v = next.map((x) => x / norm);
    }
    axes.push({ v, value });
  }
  const pos = ids.map((_, i) => ({
    x: axes[0].v[i] * Math.sqrt(axes[0].value) + i * 1e-3,
    y: axes[1].v[i] * Math.sqrt(axes[1].value) + ((i * 7) % 5) * 1e-3,
  }));

  // Stress majorization: cada personaje se mueve al punto que mejor respeta
  // sus distancias a todos los demás (pesando más las cercanas).
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < n; i++) {
      let sx = 0;
      let sy = 0;
      let sw = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const w = 1 / (d[i][j] * d[i][j]);
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        const dist = Math.hypot(dx, dy) || 1e-3;
        sx += w * (pos[j].x + (d[i][j] * dx) / dist);
        sy += w * (pos[j].y + (d[i][j] * dy) / dist);
        sw += w;
      }
      pos[i] = { x: sx / sw, y: sy / sw };
    }
  }
  return pos;
}

// Separa a los personajes cuyos círculos o nombres se pisan, empujándolos
// por el eje en el que menos se solapan.
function removeOverlaps(items, gap = 24) {
  for (let pass = 0; pass < 60; pass++) {
    let moved = false;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const ox = a.box.hw + b.box.hw + gap - Math.abs(a.x - b.x);
        const above = a.y <= b.y ? a : b;
        const below = above === a ? b : a;
        const oy = above.box.bottom + below.box.top + gap - (below.y - above.y);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        if (ox < oy) {
          const s = (a.x < b.x || (a.x === b.x && i < j) ? -1 : 1) * (ox / 2);
          a.x += s;
          b.x -= s;
        } else {
          above.y -= oy / 2;
          below.y += oy / 2;
        }
      }
    }
    if (!moved) break;
  }
}

// ¿Se cruzan los segmentos p-q y r-s? (sin contar los que solo se tocan)
function segmentsCross(p, q, r, s) {
  const side = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  return side(p, q, r) * side(p, q, s) < 0 && side(r, s, p) * side(r, s, q) < 0;
}

// ¿Pasa la línea p-q por encima del círculo de c (sin ser suya)?
function passesOver(p, q, c, radius) {
  if (c.x < Math.min(p.x, q.x) - radius || c.x > Math.max(p.x, q.x) + radius) return false;
  if (c.y < Math.min(p.y, q.y) - radius || c.y > Math.max(p.y, q.y) + radius) return false;
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const t = Math.min(1, Math.max(0, ((c.x - p.x) * dx + (c.y - p.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x + t * dx - c.x, p.y + t * dy - c.y) < radius;
}

// Desenreda las líneas: prueba a intercambiar de sitio cada pareja de
// personajes y se queda con el cambio si hay menos cruces, menos líneas que
// pasan por encima de otro personaje y sin alargar mucho las relaciones.
// Devuelve true si ha movido algo.
function untangle(items, pairs, spacing) {
  const HIT = 2; // una línea encima de un personaje molesta más que un cruce
  const LENGTH = 0.3; // por cada "spacing" de largo
  const adj = items.map(() => []);
  pairs.forEach(([a, b], e) => {
    adj[a].push(e);
    adj[b].push(e);
  });
  // Lo que cuesta lo que depende de los personajes "who" (sus líneas y lo que pasa por encima de ellos).
  const localCost = (who) => {
    const own = new Set(who.flatMap((i) => adj[i]));
    let cost = 0;
    for (const e of own) {
      const [a, b] = pairs[e];
      const p = items[a];
      const q = items[b];
      cost += (LENGTH * Math.hypot(p.x - q.x, p.y - q.y)) / spacing;
      const minX = Math.min(p.x, q.x);
      const maxX = Math.max(p.x, q.x);
      const minY = Math.min(p.y, q.y);
      const maxY = Math.max(p.y, q.y);
      for (let f = 0; f < pairs.length; f++) {
        const [c, d] = pairs[f];
        if (f === e || c === a || c === b || d === a || d === b) continue;
        const r = items[c];
        const t = items[d];
        // Descarte rápido: si las cajas de las dos líneas no se tocan, no se cruzan.
        if (Math.max(r.x, t.x) < minX || Math.min(r.x, t.x) > maxX) continue;
        if (Math.max(r.y, t.y) < minY || Math.min(r.y, t.y) > maxY) continue;
        if (segmentsCross(p, q, r, t)) cost++;
      }
      for (let k = 0; k < items.length; k++) {
        if (k !== a && k !== b && passesOver(p, q, items[k], 36)) cost += HIT;
      }
    }
    for (const i of who) {
      for (let e = 0; e < pairs.length; e++) {
        if (!own.has(e) && passesOver(items[pairs[e][0]], items[pairs[e][1]], items[i], 36)) cost += HIT;
      }
    }
    return cost;
  };
  const swap = (i, j) => {
    const { x, y } = items[i];
    items[i].x = items[j].x;
    items[i].y = items[j].y;
    items[j].x = x;
    items[j].y = y;
  };
  let changed = false;
  // Solo con los cercanos (cambiar con uno lejano casi nunca ayuda) y con un
  // tope de intentos, para que con muchos personajes no tarde: el tope es
  // por intentos, no por tiempo, así que el dibujo sigue saliendo igual.
  let budget = 1500;
  const near = spacing * 3;
  for (let pass = 0; pass < 4 && budget > 0; pass++) {
    let improved = false;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length && budget > 0; j++) {
        if (Math.hypot(items[i].x - items[j].x, items[i].y - items[j].y) > near) continue;
        budget--;
        const before = localCost([i, j]);
        swap(i, j);
        if (localCost([i, j]) < before - 1e-6) improved = true;
        else swap(i, j); // no mejora: se deja como estaba
      }
    }
    if (!improved) break;
    changed = true;
  }

  // Luego, empujoncitos: cada personaje prueba a moverse un poco en ocho
  // direcciones (sin pisar a nadie) por si así deja de estorbar a una línea.
  const fits = (i) =>
    items.every((o, k) => {
      if (k === i) return true;
      const a = items[i];
      const ox = a.box.hw + o.box.hw + 30 - Math.abs(a.x - o.x);
      const oy = (a.y <= o.y ? a.box.bottom + o.box.top : o.box.bottom + a.box.top) + 30 - Math.abs(a.y - o.y);
      return ox <= 0 || oy <= 0;
    });
  budget = 400;
  for (let pass = 0; pass < 4 && budget > 0; pass++) {
    let improved = false;
    for (let i = 0; i < items.length && budget > 0; i++) {
      budget--;
      let best = localCost([i]);
      const home = { x: items[i].x, y: items[i].y };
      let to = null;
      for (const dist of [spacing * 0.3, spacing * 0.6]) {
        for (let d = 0; d < 8; d++) {
          items[i].x = home.x + Math.cos((d * Math.PI) / 4) * dist;
          items[i].y = home.y + Math.sin((d * Math.PI) / 4) * dist;
          if (!fits(i)) continue;
          const cost = localCost([i]);
          if (cost < best - 0.5) {
            best = cost;
            to = { x: items[i].x, y: items[i].y };
          }
        }
      }
      items[i].x = (to || home).x;
      items[i].y = (to || home).y;
      if (to) improved = true;
    }
    if (!improved) break;
    changed = true;
  }
  return changed;
}

// Gira el grupo para que su lado largo vaya a lo largo de la caja (a lo ancho
// en el ordenador, a lo alto en el móvil) y lo deja con la esquina en 0,0.
function orient(items, landscape) {
  const cx = items.reduce((s, p) => s + p.x, 0) / items.length;
  const cy = items.reduce((s, p) => s + p.y, 0) / items.length;
  let xx = 0;
  let yy = 0;
  let xy = 0;
  for (const p of items) {
    xx += (p.x - cx) ** 2;
    yy += (p.y - cy) ** 2;
    xy += (p.x - cx) * (p.y - cy);
  }
  // Ángulo del eje principal; se gira para llevarlo a horizontal o vertical.
  const angle = 0.5 * Math.atan2(2 * xy, xx - yy);
  const turn = (landscape ? 0 : Math.PI / 2) - angle;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  for (const p of items) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    p.x = dx * cos - dy * sin;
    p.y = dx * sin + dy * cos;
  }
}

function bounds(items) {
  const minX = Math.min(...items.map((p) => p.x - p.box.hw));
  const maxX = Math.max(...items.map((p) => p.x + p.box.hw));
  const minY = Math.min(...items.map((p) => p.y - p.box.top));
  const maxY = Math.max(...items.map((p) => p.y + p.box.bottom));
  return { minX, minY, w: maxX - minX, h: maxY - minY };
}

// Devuelve { positions: Map(id -> {x, y}), width, height } con los nodos ya
// colocados y el tamaño del lienzo que los contiene (con margen).
// aspect: ancho / alto de la caja donde se va a ver (para aprovecharla: el
// dibujo sale apaisado en el ordenador y alargado en el móvil).
export function layoutGraph(graph, { iterations = 300, spacing = 140, aspect = 1.6 } = {}) {
  const margin = 30;
  const pos = new Map();
  if (!graph.nodes.length) return { positions: pos, width: margin * 2 + 140, height: margin * 2 + 140 };
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const landscape = aspect >= 1;

  // Cada grupo conectado se coloca, se ordena y se gira por su cuenta...
  const blocks = components(graph).map((ids) => {
    const xy = layoutComponent(ids, graph.edges, spacing, iterations);
    const items = ids.map((id, i) => ({ id, x: xy[i].x, y: xy[i].y, box: nodeBox(byId.get(id)) }));
    if (items.length > 2) {
      orient(items, landscape);
      // Si el grupo es más redondo que la caja, se estira por el lado largo
      // (hasta 1,6 veces): aprovecha el sitio y despeja el centro, que es
      // donde se amontonan las etiquetas.
      const b = bounds(items);
      const stretch = Math.min(1.6, Math.max(1, landscape ? (aspect * b.h) / b.w : b.w / (aspect * b.h)));
      for (const p of items) {
        if (landscape) p.x *= stretch;
        else p.y *= stretch;
      }
    }
    removeOverlaps(items, 40);
    if (items.length > 3) {
      const index = new Map(ids.map((id, i) => [id, i]));
      const pairs = graph.edges.filter((e) => index.has(e.a)).map((e) => [index.get(e.a), index.get(e.b)]);
      if (untangle(items, pairs, spacing)) removeOverlaps(items, 40);
    }
    const b = bounds(items);
    for (const p of items) {
      p.x -= b.minX;
      p.y -= b.minY;
    }
    return { items, w: b.w, h: b.h };
  });

  // ...y luego se colocan en filas (los grandes primero), con un ancho de
  // fila pensado para que el conjunto tenga la forma de la caja.
  const gap = 50;
  const area = blocks.reduce((s, b) => s + (b.w + gap) * (b.h + gap), 0);
  const rowWidth = Math.max(...blocks.map((b) => b.w), Math.sqrt(area * aspect));
  let x = 0;
  let y = 0;
  let rowH = 0;
  let width = 0;
  for (const block of blocks) {
    if (x > 0 && x + block.w > rowWidth) {
      x = 0;
      y += rowH + gap;
      rowH = 0;
    }
    for (const p of block.items) pos.set(p.id, { x: p.x + x + margin, y: p.y + y + margin });
    x += block.w + gap;
    rowH = Math.max(rowH, block.h);
    width = Math.max(width, x - gap);
  }
  return { positions: pos, width: width + margin * 2, height: y + rowH + margin * 2 };
}

function svgEl(name, attrs = {}) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// Dibuja el grafo dentro de "container" (se vacía antes). onSelect(id) se
// llama al pulsar (o Enter/Espacio) sobre un personaje.
// zoomLabels: textos (ya traducidos) de los botones { in, out, reset }.
export function renderRelationsGraph(
  container,
  graph,
  {
    onSelect,
    nodeLabel = (name) => name,
    nodeColor = () => null, // color del borde (p.ej. el de su facción); null = el de siempre
    zoomLabels = { in: '+', out: '−', reset: '1:1' },
  } = {},
) {
  container.innerHTML = '';
  if (!graph.nodes.length) return;
  const r = 30;

  const svg = svgEl('svg', { class: 'relations-graph', role: 'group' });
  const edgesLayer = svgEl('g', { class: 'relations-edges' });
  const labelsLayer = svgEl('g', { class: 'relations-edge-labels' });
  const nodesLayer = svgEl('g', { class: 'relations-nodes' });
  svg.append(edgesLayer, labelsLayer, nodesLayer);
  // Ya en la página: hace falta para medir los textos (getBBox) al colocarlos
  // y la forma de la caja, que decide si el dibujo sale apaisado o alargado.
  container.append(svg);
  const aspect = svg.clientWidth && svg.clientHeight ? svg.clientWidth / svg.clientHeight : undefined;
  const { positions, width, height } = layoutGraph(graph, { aspect });
  svg.setAttribute('viewBox', `0 0 ${Math.round(width)} ${Math.round(height)}`);

  for (const edge of graph.edges) {
    const p = positions.get(edge.a);
    const q = positions.get(edge.b);
    const line = svgEl('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y, class: 'relations-edge' });
    line.dataset.a = edge.a;
    line.dataset.b = edge.b;
    edgesLayer.append(line);
  }

  graph.nodes.forEach((node, i) => {
    const { x, y } = positions.get(node.id);
    const g = svgEl('g', {
      class: 'relations-node',
      transform: `translate(${x} ${y})`,
      tabindex: '0',
      role: 'button',
      'aria-label': nodeLabel(node.name),
    });
    g.dataset.id = node.id;
    if (node.estado) g.dataset.estado = node.estado; // el CSS pone en gris a los caídos
    const color = nodeColor(node);
    if (color) g.style.setProperty('--node-color', color);
    const clipId = `relations-clip-${i}`;
    const clip = svgEl('clipPath', { id: clipId });
    clip.append(svgEl('circle', { r }));
    g.append(clip, svgEl('circle', { r, class: 'relations-node-bg' }));
    if (node.foto) {
      const img = svgEl('image', {
        href: node.foto,
        x: -r,
        y: -r,
        width: r * 2,
        height: r * 2,
        preserveAspectRatio: 'xMidYMid slice',
        'clip-path': `url(#${clipId})`,
      });
      img.addEventListener('error', () => img.remove());
      g.append(img);
    } else {
      const initial = svgEl('text', { class: 'relations-node-initial', 'text-anchor': 'middle', dy: '0.35em' });
      initial.textContent = (node.name || '?').trim().charAt(0).toUpperCase();
      g.append(initial);
    }
    g.append(svgEl('circle', { r, class: 'relations-node-ring' }));
    const name = svgEl('text', { y: r + 18, class: 'relations-node-name', 'text-anchor': 'middle' });
    name.textContent = node.name;
    g.append(name);

    const select = () => onSelect?.(node.id);
    g.addEventListener('click', select);
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        select();
      }
    });
    // Al pasar por encima (o con el foco) se resaltan sus relaciones.
    const highlight = (on) => {
      setFocus(on ? node.id : null);
      svg.classList.toggle('is-highlighting', on);
      for (const el of svg.querySelectorAll('[data-a], [data-b]')) {
        el.classList.toggle('is-related', on && (el.dataset.a === node.id || el.dataset.b === node.id));
      }
    };
    g.addEventListener('mouseenter', () => highlight(true));
    g.addEventListener('mouseleave', () => highlight(false));
    g.addEventListener('focus', () => highlight(true));
    g.addEventListener('blur', () => highlight(false));
    nodesLayer.append(g);
  });

  // Las etiquetas se ven siempre al mismo tamaño en pantalla, haya o no
  // zoom: su tamaño en el dibujo es "k" (1 = 14px a escala 1:1 del dibujo).
  // Las que no caben sin pisar otra cosa se esconden (al acercar hay más
  // sitio y van apareciendo); al señalar un personaje se colocan solo las
  // suyas, para que se lean todas.
  let k = 1;
  let focus = null;
  let anyHidden = false;
  const placeLabels = () => {
    const hidden = placeEdgeLabels(labelsLayer, nodesLayer, graph, positions, r, k, focus, { w: width, h: height });
    if (!focus) anyHidden = hidden;
  };
  function setFocus(id) {
    if (id === focus) return;
    focus = id;
    if (anyHidden) placeLabels(); // si se veían todas, se quedan donde están
  }
  let timer = null;
  const onView = (pxPerUnit) => {
    const nextK = Math.min(Math.max(LABEL_SCREEN_SCALE / pxPerUnit, 0.3), LABEL_MAX_K);
    if (Math.abs(nextK - k) < 0.01) return;
    k = nextK;
    // Mientras se hace zoom solo se cambia el tamaño; recolocarlas (más caro)
    // espera a que el gesto pare.
    for (const g of labelsLayer.children) {
      g.setAttribute('transform', `translate(${g.dataset.cx} ${g.dataset.cy}) scale(${k})`);
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (svg.isConnected) placeLabels();
    }, 150);
  };
  const controls = setupZoom(svg, width, height, zoomLabels, onView); // ya calcula "k"
  placeLabels();
  clearTimeout(timer);
  // Los nombres usan la fuente pixelada, más ancha: si aún no había cargado,
  // se miden mal. Se vuelven a colocar cuando llega.
  if (document.fonts && document.fonts.status !== 'loaded') {
    document.fonts.ready.then(() => {
      if (svg.isConnected) placeLabels();
    });
  }
  container.append(controls);
}

// Tamaño en pantalla de las etiquetas (respecto a los 14px de su fuente).
const LABEL_SCREEN_SCALE = 0.9;
// Sin zoom no crecen más que esto: si no, en el móvil serían mucho más
// grandes que los nombres y los círculos.
const LABEL_MAX_K = 1.5;

// Etiquetas de las relaciones: una línea por etiqueta (si las dos partes
// pusieron una, salen las dos, una encima de otra), con fondo oscuro para
// leerse sobre las líneas. Cada una se coloca en el primer punto de su línea
// (del centro hacia los extremos) donde no pisa ningún círculo, ningún nombre
// ni otra etiqueta; si no lo hay, justo al lado de la línea; y si tampoco,
// donde menos pisa. k: tamaño de las etiquetas (ver renderRelationsGraph).
// Normalmente, las que no tienen sitio libre se esconden; con "focus" (el id
// de un personaje) solo se ponen las suyas, y todas a la vista. Devuelve true
// si ha escondido alguna.
// frame: tamaño del dibujo; lo que se salga de él cuenta como pisado.
function placeEdgeLabels(labelsLayer, nodesLayer, graph, positions, r, k = 1, focus = null, frame = null) {
  labelsLayer.replaceChildren();
  const boxOf = (el, fallback) => {
    try {
      const b = el.getBBox();
      if (b.width) return { x: b.x, y: b.y, w: b.width, h: b.height };
    } catch {
      // Sin medir (p. ej. aún oculto): se usa la estimación.
    }
    return fallback;
  };

  // Lo que ya ocupa sitio: círculos y nombres de los personajes.
  const taken = [];
  for (const g of nodesLayer.querySelectorAll('.relations-node')) {
    const { x, y } = positions.get(g.dataset.id);
    taken.push({ x: x - r - 4, y: y - r - 4, w: 2 * r + 8, h: 2 * r + 8 });
    const name = g.querySelector('.relations-node-name');
    // Nunca menos que lo que ocuparía con la fuente pixelada (~13px por letra).
    const minW = [...name.textContent].length * 13;
    const b = boxOf(name, { x: -minW / 2, y: r + 4, w: minW, h: 18 });
    const w = Math.max(b.w, minW);
    taken.push({ x: x - w / 2 - 4, y: y + b.y - 2, w: w + 8, h: b.h + 4 });
  }
  const overlap = (a, b) =>
    Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

  const LINE = 17;
  const STEPS = [0.5, 0.4, 0.6, 0.3, 0.7, 0.22, 0.78];
  // Primero las etiquetas más grandes: son las que menos sitios tienen.
  const edges = graph.edges
    .filter((e) => e.labels.length && (!focus || e.a === focus || e.b === focus))
    .sort((x, y) => y.labels.length - x.labels.length || estimateLabelWidth(y.labels) - estimateLabelWidth(x.labels));

  let anyCrowded = false;
  for (const edge of edges) {
    const group = svgEl('g', { class: 'relations-edge-label' });
    group.dataset.a = edge.a;
    group.dataset.b = edge.b;
    const bg = svgEl('rect', { class: 'relations-edge-label-bg', rx: 4 });
    const text = svgEl('text', { 'text-anchor': 'middle' });
    edge.labels.forEach((label, i) => {
      const tspan = svgEl('tspan', {
        x: 0,
        dy: i === 0 ? `${0.35 - ((edge.labels.length - 1) * LINE) / 2 / 14}em` : LINE,
      });
      tspan.textContent = label;
      text.append(tspan);
    });
    group.append(bg, text);
    labelsLayer.append(group);

    const w = estimateLabelWidth(edge.labels);
    const h = edge.labels.length * LINE;
    const t = boxOf(text, { x: -w / 2, y: -h / 2, w, h });
    const local = { x: t.x - 5, y: t.y - 2, w: t.w + 10, h: t.h + 4 };
    bg.setAttribute('x', local.x);
    bg.setAttribute('y', local.y);
    bg.setAttribute('width', local.w);
    bg.setAttribute('height', local.h);
    const box = { x: local.x * k, y: local.y * k, w: local.w * k, h: local.h * k };

    const p = positions.get(edge.a);
    const q = positions.get(edge.b);
    // Si no hay hueco encima de la línea, se prueba un poco a cada lado
    // (pegada a ella, para que se vea de qué relación es).
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const nx = -(q.y - p.y) / len;
    const ny = (q.x - p.x) / len;
    const side = Math.abs(nx) * (box.w / 2) + Math.abs(ny) * (box.h / 2) + 2;
    let best = null;
    search: for (const offset of [0, side, -side]) {
      for (const step of STEPS) {
        const cx = p.x + (q.x - p.x) * step + nx * offset;
        const cy = p.y + (q.y - p.y) * step + ny * offset;
        const at = { x: cx + box.x, y: cy + box.y, w: box.w, h: box.h };
        // Lo que se aparta de la línea cuenta un poco, para preferir no hacerlo.
        const outside = frame ? at.w * at.h - overlap(at, { x: 0, y: 0, w: frame.w, h: frame.h }) : 0;
        const cost = taken.reduce((sum, o) => sum + overlap(at, o), outside) + (offset ? 1 : 0);
        if (!best || cost < best.cost) best = { cost, cx, cy, at };
        if (cost <= (offset ? 1 : 0)) break search; // sitio libre
      }
    }
    group.dataset.cx = best.cx;
    group.dataset.cy = best.cy;
    group.setAttribute('transform', `translate(${best.cx} ${best.cy}) scale(${k})`);
    if (focus) group.classList.add('is-related');
    if (best.cost > 1 && !focus) {
      group.classList.add('is-crowded'); // escondida: no ocupa sitio
      anyCrowded = true;
    } else {
      taken.push(best.at);
    }
  }
  return anyCrowded;
}

const MAX_ZOOM = 4;
const BUTTON_STEP = 1.5;
const DRAG_THRESHOLD = 6; // px: menos que esto es un clic, no un arrastre

// Zoom y desplazamiento sobre el viewBox. Devuelve la botonera (+ / − / 1:1).
// onView(pxPorUnidad) se llama cada vez que cambia lo que se ve.
function setupZoom(svg, width, height, labels, onView) {
  let scale = 1;
  let x = 0; // esquina superior izquierda de lo que se ve, en coordenadas del dibujo
  let y = 0;

  const controls = document.createElement('div');
  controls.className = 'relations-zoom';
  const button = (cls, text, label, onClick) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `relations-zoom-btn ${cls}`;
    btn.textContent = text;
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.addEventListener('click', onClick);
    controls.append(btn);
    return btn;
  };
  // Zona que se ve sin zoom: el dibujo entero, ensanchado (o alargado) para
  // tener la misma forma que la caja. Así el dibujo ocupa toda la caja y al
  // acercar no quedan franjas vacías a los lados.
  let base = { x: 0, y: 0, w: width, h: height };
  function fitBase() {
    const boxW = svg.clientWidth;
    const boxH = svg.clientHeight;
    if (!boxW || !boxH) return; // aún no se ve: se recalcula al mostrarse
    const aspect = boxW / boxH;
    const w = Math.max(width, height * aspect);
    const h = w / aspect;
    const c = center();
    base = { x: (width - w) / 2, y: (height - h) / 2, w, h };
    x = c.x - base.w / scale / 2;
    y = c.y - base.h / scale / 2;
    apply();
  }

  const center = () => ({ x: x + base.w / scale / 2, y: y + base.h / scale / 2 });
  const zoomInBtn = button('relations-zoom-in', '+', labels.in, () => zoomTo(scale * BUTTON_STEP, center()));
  const zoomOutBtn = button('relations-zoom-out', '−', labels.out, () => zoomTo(scale / BUTTON_STEP, center()));
  const resetBtn = button('relations-zoom-reset', '1:1', labels.reset, () => zoomTo(1, center()));

  function apply() {
    const w = base.w / scale;
    const h = base.h / scale;
    x = Math.min(Math.max(x, base.x), base.x + base.w - w);
    y = Math.min(Math.max(y, base.y), base.y + base.h - h);
    svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
    if (svg.clientWidth) onView?.(Math.min(svg.clientWidth / w, svg.clientHeight / h));
    const zoomed = scale > 1;
    svg.classList.toggle('is-zoomed', zoomed);
    zoomInBtn.disabled = scale >= MAX_ZOOM;
    zoomOutBtn.disabled = !zoomed;
    resetBtn.disabled = !zoomed;
  }

  // Cambia el zoom dejando quieto el punto "at" (coordenadas del dibujo).
  function zoomTo(newScale, at) {
    newScale = Math.min(Math.max(newScale, 1), MAX_ZOOM);
    x = at.x - ((at.x - x) * scale) / newScale;
    y = at.y - ((at.y - y) * scale) / newScale;
    scale = newScale;
    apply();
  }

  // Punto de la pantalla -> coordenadas del dibujo.
  function toGraph(clientX, clientY) {
    const ctm = svg.getScreenCTM();
    if (!ctm) return center();
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  // Rueda (y el pellizco del touchpad, que llega como Ctrl + rueda). Sin zoom,
  // bajar la rueda no hace nada aquí: así el árbol no atrapa el scroll y se
  // puede seguir bajando la página por encima de él.
  svg.addEventListener(
    'wheel',
    (e) => {
      const deltaY = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY; // Firefox a veces cuenta en líneas
      if (!deltaY || (deltaY > 0 && scale <= 1 && !e.ctrlKey && !e.metaKey)) return;
      e.preventDefault();
      zoomTo(scale * Math.exp(-deltaY * 0.002), toGraph(e.clientX, e.clientY));
    },
    { passive: false },
  );
  // Safari (iOS/macOS) manda sus propios eventos de gesto: que no haga zoom a la página.
  svg.addEventListener('gesturestart', (e) => e.preventDefault());

  // Arrastrar (con zoom) y pellizcar, con Pointer Events (ratón y dedos).
  const pointers = new Map(); // pointerId -> { x, y } en pantalla
  let pinch = null; // { dist, scale }
  let dragged = false;
  let moved = 0;

  svg.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      dragged = false;
      moved = 0;
    }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, scale };
    }
  });

  svg.addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    if (e.pointerType === 'mouse' && !e.buttons) {
      // Se soltó el botón fuera del árbol: pasar el ratón por encima no arrastra.
      pointers.delete(e.pointerId);
      return;
    }
    const now = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, now);

    if (pointers.size >= 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const mid = toGraph((a.x + b.x) / 2, (a.y + b.y) / 2);
      zoomTo((pinch.scale * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.dist, mid);
      dragged = true;
      return;
    }
    if (scale <= 1) return; // sin zoom no hay nada que mover: se deja bajar la página
    moved += Math.hypot(now.x - prev.x, now.y - prev.y);
    if (!dragged && moved < DRAG_THRESHOLD) return;
    if (!dragged) {
      dragged = true;
      svg.setPointerCapture(e.pointerId);
      svg.classList.add('is-dragging');
    }
    const from = toGraph(prev.x, prev.y);
    const to = toGraph(now.x, now.y);
    x -= to.x - from.x;
    y -= to.y - from.y;
    apply();
  });

  const release = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!pointers.size) svg.classList.remove('is-dragging');
  };
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);

  // Soltar tras arrastrar o pellizcar no cuenta como pulsar un personaje.
  svg.addEventListener(
    'click',
    (e) => {
      if (!dragged) return;
      dragged = false;
      e.stopPropagation();
      e.preventDefault();
    },
    true,
  );

  x = base.x;
  y = base.y;
  apply();
  // La forma de la caja cambia al girar el móvil o redimensionar la ventana.
  if (typeof ResizeObserver === 'function') new ResizeObserver(fitBase).observe(svg);
  return controls;
}
