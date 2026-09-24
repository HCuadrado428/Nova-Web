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
// La colocación es una simulación de fuerzas sencilla (los círculos se
// repelen, las relaciones tiran como muelles) con posiciones iniciales fijas,
// así que el dibujo sale siempre igual para los mismos datos. Las funciones
// buildGraph() y layoutGraph() no tocan el DOM (se prueban en
// tests/graph.test.js); renderRelationsGraph() es la que dibuja el SVG.

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
    .map((p) => ({ id: p.id, name: p.data.nombre || '', foto: p.data.fotoUrl || null }))
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

// Devuelve { positions: Map(id -> {x, y}), width, height } con los nodos ya
// colocados y el tamaño del lienzo que los contiene (con margen).
export function layoutGraph(graph, { iterations = 400, spacing = 140 } = {}) {
  const n = graph.nodes.length;
  const pos = new Map();
  // Posición inicial: en círculo, según el orden (estable) de los nodos.
  const radius = Math.max(spacing, (spacing * n) / (2 * Math.PI));
  graph.nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / Math.max(n, 1);
    pos.set(node.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  });

  const neighbors = graph.edges.map((e) => [e.a, e.b]);
  for (let step = 0; step < iterations; step++) {
    const cooling = 1 - step / iterations; // los movimientos se van calmando
    const force = new Map(graph.nodes.map((node) => [node.id, { x: 0, y: 0 }]));

    // Repulsión entre todos los pares (pocos personajes: O(n²) sobra).
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const p = pos.get(graph.nodes[i].id);
        const q = pos.get(graph.nodes[j].id);
        let dx = p.x - q.x;
        let dy = p.y - q.y;
        let dist = Math.hypot(dx, dy);
        if (dist < 0.01) {
          dx = 0.01 * (i + 1);
          dy = 0.01 * (j + 1);
          dist = Math.hypot(dx, dy);
        }
        const push = (spacing * spacing) / dist;
        const fx = (dx / dist) * push;
        const fy = (dy / dist) * push;
        force.get(graph.nodes[i].id).x += fx;
        force.get(graph.nodes[i].id).y += fy;
        force.get(graph.nodes[j].id).x -= fx;
        force.get(graph.nodes[j].id).y -= fy;
      }
    }
    // Atracción de las relaciones (muelles de longitud "spacing").
    for (const [a, b] of neighbors) {
      const p = pos.get(a);
      const q = pos.get(b);
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const dist = Math.max(Math.hypot(dx, dy), 0.01);
      const pull = ((dist - spacing) * dist) / spacing;
      const fx = (dx / dist) * pull * 0.5;
      const fy = (dy / dist) * pull * 0.5;
      force.get(a).x += fx;
      force.get(a).y += fy;
      force.get(b).x -= fx;
      force.get(b).y -= fy;
    }
    // Gravedad hacia el centro: pliega las cadenas largas (A-B-C-D...) en
    // vez de dejarlas estiradas en línea, y acerca los grupos sueltos.
    for (const node of graph.nodes) {
      const p = pos.get(node.id);
      const f = force.get(node.id);
      f.x -= p.x * 0.08;
      f.y -= p.y * 0.08;
      const len = Math.hypot(f.x, f.y);
      const maxMove = spacing * 0.2 * cooling + 1;
      const k = len > maxMove ? maxMove / len : 1;
      p.x += f.x * k;
      p.y += f.y * k;
    }
  }

  // Encuadre: se desplaza todo para que empiece en (margin, margin).
  const margin = 70;
  const xs = [...pos.values()].map((p) => p.x);
  const ys = [...pos.values()].map((p) => p.y);
  const minX = n ? Math.min(...xs) : 0;
  const minY = n ? Math.min(...ys) : 0;
  for (const p of pos.values()) {
    p.x = p.x - minX + margin;
    p.y = p.y - minY + margin;
  }
  const width = (n ? Math.max(...xs) - minX : 0) + margin * 2;
  const height = (n ? Math.max(...ys) - minY : 0) + margin * 2;
  return { positions: pos, width, height };
}

function svgEl(name, attrs = {}) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// Dibuja el grafo dentro de "container" (se vacía antes). onSelect(id) se
// llama al pulsar (o Enter/Espacio) sobre un personaje.
export function renderRelationsGraph(container, graph, { onSelect, nodeLabel = (name) => name } = {}) {
  container.innerHTML = '';
  if (!graph.nodes.length) return;
  const { positions, width, height } = layoutGraph(graph);
  const r = 30;

  const svg = svgEl('svg', {
    class: 'relations-graph',
    viewBox: `0 0 ${Math.round(width)} ${Math.round(height)}`,
    role: 'group',
  });

  const edgesLayer = svgEl('g', { class: 'relations-edges' });
  const labelsLayer = svgEl('g', { class: 'relations-edge-labels' });
  for (const edge of graph.edges) {
    const p = positions.get(edge.a);
    const q = positions.get(edge.b);
    const line = svgEl('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y, class: 'relations-edge' });
    line.dataset.a = edge.a;
    line.dataset.b = edge.b;
    edgesLayer.append(line);
    if (edge.labels.length) {
      const label = svgEl('text', {
        x: (p.x + q.x) / 2,
        y: (p.y + q.y) / 2 - 6,
        class: 'relations-edge-label',
        'text-anchor': 'middle',
      });
      label.textContent = edge.labels.join(' · ');
      label.dataset.a = edge.a;
      label.dataset.b = edge.b;
      labelsLayer.append(label);
    }
  }

  const nodesLayer = svgEl('g', { class: 'relations-nodes' });
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

  svg.append(edgesLayer, labelsLayer, nodesLayer);
  container.append(svg);
}
