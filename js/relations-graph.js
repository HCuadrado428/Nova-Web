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
//
// Zoom: se cambia el viewBox del SVG (así las letras y las fotos se ven más
// grandes y nítidas). Se acerca con los botones + / −, con la rueda del
// ratón, pellizcando en móvil o con el gesto de pellizco del touchpad; con
// zoom se arrastra para moverse. Sin zoom, bajar la rueda baja la página.

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

  // Cada relación es un muelle; si tiene etiquetas largas, más largo, para
  // que el texto quepa entre los dos círculos.
  const neighbors = graph.edges.map((e) => [e.a, e.b, Math.max(spacing, estimateLabelWidth(e.labels) + 90)]);
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
    for (const [a, b, length] of neighbors) {
      const p = pos.get(a);
      const q = pos.get(b);
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const dist = Math.max(Math.hypot(dx, dy), 0.01);
      const pull = ((dist - length) * dist) / length;
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

  // Encuadre: se desplaza todo para que quepa con margen, contando también
  // lo que asoma el nombre de cada personaje a los lados (fuente pixelada,
  // ~13px por letra), para que los nombres largos no queden cortados.
  const margin = 70;
  const half = new Map(graph.nodes.map((node) => [node.id, Math.max(margin, [...node.name].length * 6.5 + 10)]));
  const lefts = graph.nodes.map((node) => pos.get(node.id).x - half.get(node.id));
  const rights = graph.nodes.map((node) => pos.get(node.id).x + half.get(node.id));
  const ys = [...pos.values()].map((p) => p.y);
  const minX = n ? Math.min(...lefts) : 0;
  const minY = n ? Math.min(...ys) : 0;
  const width = n ? Math.max(...rights) - minX : margin * 2;
  const height = (n ? Math.max(...ys) - minY : 0) + margin * 2;
  for (const p of pos.values()) {
    p.x -= minX;
    p.y = p.y - minY + margin;
  }
  return { positions: pos, width, height };
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
  const { positions, width, height } = layoutGraph(graph);
  const r = 30;

  const svg = svgEl('svg', {
    class: 'relations-graph',
    viewBox: `0 0 ${Math.round(width)} ${Math.round(height)}`,
    role: 'group',
  });

  const edgesLayer = svgEl('g', { class: 'relations-edges' });
  const labelsLayer = svgEl('g', { class: 'relations-edge-labels' });
  const nodesLayer = svgEl('g', { class: 'relations-nodes' });
  svg.append(edgesLayer, labelsLayer, nodesLayer);
  // Ya en la página: hace falta para medir los textos (getBBox) al colocarlos.
  container.append(svg);

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

  placeEdgeLabels(labelsLayer, nodesLayer, graph, positions, r);
  // Los nombres usan la fuente pixelada, más ancha: si aún no había cargado,
  // se miden mal. Se vuelven a colocar cuando llega.
  if (document.fonts && document.fonts.status !== 'loaded') {
    document.fonts.ready.then(() => {
      if (svg.isConnected) placeEdgeLabels(labelsLayer, nodesLayer, graph, positions, r);
    });
  }
  container.append(setupZoom(svg, width, height, zoomLabels));
}

// Etiquetas de las relaciones: una línea por etiqueta (si las dos partes
// pusieron una, salen las dos, una encima de otra), con fondo oscuro para
// leerse sobre las líneas. Cada una se coloca en el primer punto de su línea
// (del centro hacia los extremos) donde no pisa ningún círculo, ningún nombre
// ni otra etiqueta; si no hay ninguno libre, donde menos pisa.
function placeEdgeLabels(labelsLayer, nodesLayer, graph, positions, r) {
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
    .filter((e) => e.labels.length)
    .sort((x, y) => y.labels.length - x.labels.length || estimateLabelWidth(y.labels) - estimateLabelWidth(x.labels));

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
    const box = { x: t.x - 5, y: t.y - 2, w: t.w + 10, h: t.h + 4 };
    bg.setAttribute('x', box.x);
    bg.setAttribute('y', box.y);
    bg.setAttribute('width', box.w);
    bg.setAttribute('height', box.h);

    const p = positions.get(edge.a);
    const q = positions.get(edge.b);
    let best = null;
    for (const step of STEPS) {
      const cx = p.x + (q.x - p.x) * step;
      const cy = p.y + (q.y - p.y) * step;
      const at = { x: cx + box.x, y: cy + box.y, w: box.w, h: box.h };
      const cost = taken.reduce((sum, o) => sum + overlap(at, o), 0);
      if (!best || cost < best.cost) best = { cost, cx, cy, at };
      if (!cost) break;
    }
    group.setAttribute('transform', `translate(${best.cx} ${best.cy})`);
    taken.push(best.at);
  }
}

const MAX_ZOOM = 4;
const BUTTON_STEP = 1.5;
const DRAG_THRESHOLD = 6; // px: menos que esto es un clic, no un arrastre

// Zoom y desplazamiento sobre el viewBox. Devuelve la botonera (+ / − / 1:1).
function setupZoom(svg, width, height, labels) {
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
