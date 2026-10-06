// ======================================================
// Personajes (dentro de Lore)
// ======================================================
//
// Directorio + perfil de personaje respaldado por Firebase (Auth +
// Firestore — ver firebase-config.js). Cualquiera puede ver los perfiles
// sin iniciar sesión; solo quien entra con su cuenta de Google puede
// crear/editar el suyo (un documento por cuenta, id = uid). El control de
// quién puede escribir de verdad lo hacen las reglas de Firestore
// (firestore.rules), no los botones de aquí — estos solo ocultan la
// opción por comodidad visual.
// Sigue el mismo patrón de página que rules.js: transición de canal +
// vistas internas conmutadas por .is-active.
// Las piezas que no dependen del resto viven en js/personajes/: la carga de
// Firebase (firebase.js), los bloques del perfil (blocks.js) y los
// comentarios (comments.js) y las facciones (factions.js).

import { channelSwitch, closeMenuToggle, isView, setView } from './views.js';
import { normalizeSearchTerm } from './utils.js';
import { onLanguageChange, t } from './i18n.js';
import { buildGraph, renderRelationsGraph } from './relations-graph.js';
import { isFirebaseConfigured, loadFirebase } from './personajes/firebase.js';
import { buildPersonajeBlockElement } from './personajes/blocks.js';
import { createComments } from './personajes/comments.js';
import { FACTION_MAX, factionKey, listFactions } from './personajes/factions.js';

// Enganche para el link directo a un personaje (#personaje/<uid>): lo monta
// initPersonajes() y lo llama intro.js tras revelarse la intro.
let openFromHash = null;
export function openPersonajeFromHash(uid) {
  if (openFromHash) openFromHash(uid);
}

export function initPersonajes() {
  const menuBtn = document.getElementById('lore-personajes-btn');
  const backBtn = document.getElementById('personajes-back-btn');
  const page = document.getElementById('personajes-page');

  const sessionEl = document.getElementById('personajes-session');
  const statusEl = document.getElementById('personajes-status');
  const signinBtn = document.getElementById('personajes-signin-btn');
  const sessionActive = document.getElementById('personajes-session-active');
  const sessionName = document.getElementById('personajes-session-name');
  const editNameBtn = document.getElementById('personajes-edit-name-btn');
  const mineBtn = document.getElementById('personajes-mine-btn');
  const signoutBtn = document.getElementById('personajes-signout-btn');

  const views = {
    directory: document.getElementById('personajes-view-directory'),
    profile: document.getElementById('personajes-view-profile'),
    editor: document.getElementById('personajes-view-editor'),
    relations: document.getElementById('personajes-view-relations'),
  };
  const grid = document.getElementById('personajes-grid');
  const searchInput = document.getElementById('personajes-search-input');
  const factionFilterEl = document.getElementById('personajes-faction-filter');
  const relationsLegendEl = document.getElementById('personajes-relations-legend');
  const relationsBtn = document.getElementById('personajes-relations-btn');
  const relationsBackBtn = document.getElementById('personajes-relations-back-btn');
  const relationsGraphEl = document.getElementById('personajes-relations-graph');
  const relationsEmptyEl = document.getElementById('personajes-relations-empty');
  const relationsHintEl = document.getElementById('personajes-relations-hint');
  const relationsListTitleEl = document.getElementById('personajes-relations-list-title');
  const relationsListEl = document.getElementById('personajes-relations-list');

  const profileBackBtn = document.getElementById('personajes-profile-back-btn');
  const editBtn = document.getElementById('personajes-edit-btn');
  const profileNameEl = document.getElementById('personajes-profile-name');
  const profileMcUserEl = document.getElementById('personajes-profile-mcuser');
  const profileFaccionEl = document.getElementById('personajes-profile-faccion');
  const profileBlocksEl = document.getElementById('personajes-profile-blocks');
  const commentsListEl = document.getElementById('personajes-comments-list');
  const commentForm = document.getElementById('personajes-comment-form');
  const commentInput = document.getElementById('personajes-comment-input');
  const commentSigninHint = document.getElementById('personajes-comment-signin-hint');
  const commentFeedbackEl = document.getElementById('personajes-comment-feedback');

  const editorCancelBtn = document.getElementById('personajes-editor-cancel-btn');
  const nombreInput = document.getElementById('personajes-input-nombre');
  const mcUserInput = document.getElementById('personajes-input-mcuser');
  const faccionInput = document.getElementById('personajes-input-faccion');
  const faccionesDatalist = document.getElementById('personajes-facciones-datalist');
  const fotoInput = document.getElementById('personajes-input-foto');
  const editorBlocksEl = document.getElementById('personajes-editor-blocks');
  const nombresDatalist = document.getElementById('personajes-nombres-datalist');
  const addTextoBtn = document.getElementById('personajes-add-texto-btn');
  const addImagenBtn = document.getElementById('personajes-add-imagen-btn');
  const addSpotifyBtn = document.getElementById('personajes-add-spotify-btn');
  const addRelacionBtn = document.getElementById('personajes-add-relacion-btn');
  const feedbackEl = document.getElementById('personajes-feedback');
  const saveBtn = document.getElementById('personajes-save-btn');
  const deleteBtn = document.getElementById('personajes-delete-btn');

  if (
    !menuBtn ||
    !backBtn ||
    !page ||
    !sessionEl ||
    !statusEl ||
    !signinBtn ||
    !sessionActive ||
    !sessionName ||
    !editNameBtn ||
    !mineBtn ||
    !signoutBtn ||
    !views.directory ||
    !views.profile ||
    !views.editor ||
    !grid ||
    !searchInput ||
    !profileBackBtn ||
    !editBtn ||
    !profileNameEl ||
    !profileMcUserEl ||
    !profileBlocksEl ||
    !commentsListEl ||
    !commentForm ||
    !commentInput ||
    !commentSigninHint ||
    !commentFeedbackEl ||
    !editorCancelBtn ||
    !nombreInput ||
    !mcUserInput ||
    !fotoInput ||
    !editorBlocksEl ||
    !nombresDatalist ||
    !addTextoBtn ||
    !addImagenBtn ||
    !addSpotifyBtn ||
    !addRelacionBtn ||
    !feedbackEl ||
    !saveBtn ||
    !deleteBtn ||
    !views.relations ||
    !relationsBtn ||
    !relationsBackBtn ||
    !relationsGraphEl ||
    !relationsEmptyEl ||
    !relationsHintEl ||
    !relationsListTitleEl ||
    !relationsListEl ||
    !factionFilterEl ||
    !relationsLegendEl ||
    !profileFaccionEl ||
    !faccionInput ||
    !faccionesDatalist
  )
    return;

  if (!isFirebaseConfigured()) {
    menuBtn.disabled = true;
    menuBtn.title = t('pj.notConfigured');
    return;
  }

  // Se rellenan al conectar (ver connect()), no al cargar la página.
  let fb = null; // funciones del SDK (vendor/firebase.js)
  let auth = null;
  let db = null;
  const personajeDoc = (uid) => fb.doc(db, 'personajes', uid);
  const comentariosCol = (uid) => fb.collection(db, 'personajes', uid, 'comentarios');

  let currentUser = null;
  let currentProfileUid = null;
  let editorBloques = [];
  let editingExisting = false;
  let hadFaccion = false; // la ficha que se edita ya tenía facción (ver el guardado)
  let allPersonajes = []; // [{ id, data }], cache del directorio: alimenta el buscador y el autocompletado de relaciones
  let factions = []; // listFactions(allPersonajes): [{ key, name, count, color }]
  let factionFilter = ''; // clave de la facción elegida en el directorio ('' = todas)
  const factionOf = (data) => factions.find((f) => f.key === factionKey(data.faccion));

  // Aviso general de la sección (errores de carga, de login...), visible
  // sobre cualquiera de las tres vistas internas. Se limpia al cambiar de vista.
  const showStatus = (text) => {
    statusEl.textContent = text || '';
    statusEl.hidden = !text;
  };
  const reportError = (text, err) => {
    console.error(text, err);
    showStatus(text);
  };

  // ---- Comentarios (js/personajes/comments.js) ----
  const comments = createComments({
    session: {
      get fb() {
        return fb;
      },
      get currentUser() {
        return currentUser;
      },
      get profileUid() {
        return currentProfileUid;
      },
    },
    comentariosCol,
    reportError,
    els: { list: commentsListEl, form: commentForm, input: commentInput, feedback: commentFeedbackEl, mineBtn },
  });

  const showView = (key) => {
    for (const [k, el] of Object.entries(views)) el.classList.toggle('is-active', k === key);
    if (key !== 'profile') comments.stop();
    showStatus('');
    page.scrollTop = 0;
  };

  const setFeedback = (text, tone) => {
    feedbackEl.textContent = text || '';
    feedbackEl.classList.remove('is-fail', 'is-ok');
    if (tone) feedbackEl.classList.add(tone === 'ok' ? 'is-ok' : 'is-fail');
  };

  // Link directo a un personaje: refleja/limpia #personaje/<uid> en la URL
  // según la vista, sin tocar el historial (replaceState, no pushState).
  const setProfileHash = (uid) => {
    const hash = uid ? `#personaje/${uid}` : '';
    if (location.hash === hash) return;
    history.replaceState(null, '', hash || location.pathname + location.search);
  };

  // Carga Firebase (solo la primera vez) y engancha la sesión.
  function connect() {
    if (auth) return Promise.resolve();
    return loadFirebase().then((loaded) => {
      if (auth) return;
      ({ fb, auth, db } = loaded);
      fb.onAuthStateChanged(auth, handleAuthState);
      sessionEl.hidden = false;
    });
  }

  // `uid`: abrir directamente ese perfil (link directo) en vez del directorio.
  const switchTo = (showPersonajes, uid = null) =>
    channelSwitch(() => {
      if (!showPersonajes) {
        comments.stop();
        setProfileHash(null);
        setView('home');
        return;
      }
      setView('personajes');
      showView('directory');
      if (!auth) setGridMessage(t('pj.loading'));
      connect()
        .then(() => {
          const directoryLoaded = renderDirectory();
          if (uid) directoryLoaded.then(() => goToProfile(uid));
        })
        .catch((err) => {
          grid.innerHTML = ''; // quita el "Cargando..."; el aviso va arriba
          reportError(t('pj.connectError'), err);
        });
    });

  // ---- Directorio ----
  function setGridMessage(text) {
    grid.innerHTML = '';
    const msg = document.createElement('p');
    msg.className = 'personajes-empty';
    msg.textContent = text;
    grid.appendChild(msg);
  }

  function renderGrid() {
    const term = normalizeSearchTerm(searchInput.value);
    const filtered = allPersonajes.filter(
      ({ data }) =>
        (!term || normalizeSearchTerm(data.nombre || '').includes(term)) &&
        (!factionFilter || factionKey(data.faccion) === factionFilter),
    );

    if (!filtered.length) {
      setGridMessage(allPersonajes.length ? t('pj.noMatches') : t('pj.empty'));
      return;
    }
    grid.innerHTML = '';
    filtered.forEach(({ id, data }) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'personajes-card';
      if (data.fotoUrl) {
        const img = document.createElement('img');
        img.className = 'personajes-card-photo';
        img.src = data.fotoUrl;
        img.alt = '';
        img.loading = 'lazy';
        img.addEventListener('error', () => {
          img.remove();
          card.classList.add('is-photoless');
        });
        card.appendChild(img);
      } else {
        card.classList.add('is-photoless');
      }
      const name = document.createElement('span');
      name.className = 'personajes-card-name';
      name.textContent = data.nombre || t('pj.noName');
      card.appendChild(name);
      const faction = factionOf(data);
      if (faction) {
        const tag = document.createElement('span');
        tag.className = 'personajes-faction-tag';
        tag.style.setProperty('--faction-color', faction.color);
        tag.textContent = faction.name;
        card.appendChild(tag);
      }
      card.addEventListener('click', () => openProfile(id, data));
      grid.appendChild(card);
    });
  }

  // Devuelve una promesa que se resuelve siempre (haya ido bien o no) cuando
  // termina de cargar, para quien quiera encadenar algo después.
  function renderDirectory() {
    setProfileHash(null);
    const directorio = fb.query(fb.collection(db, 'personajes'), fb.orderBy('actualizadoEn', 'desc'));
    return fb
      .getDocs(directorio)
      .then((snapshot) => {
        allPersonajes = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));

        nombresDatalist.innerHTML = '';
        allPersonajes.forEach(({ data }) => {
          const opt = document.createElement('option');
          opt.value = data.nombre || '';
          nombresDatalist.appendChild(opt);
        });

        factions = listFactions(allPersonajes);
        if (!factions.some((f) => f.key === factionFilter)) factionFilter = '';
        faccionesDatalist.innerHTML = '';
        for (const f of factions) {
          const opt = document.createElement('option');
          opt.value = f.name;
          faccionesDatalist.appendChild(opt);
        }

        renderFactionFilter();
        renderGrid();
      })
      .catch((err) => {
        console.error('No se pudieron cargar los personajes:', err);
        setGridMessage(t('pj.loadError'));
      });
  }

  searchInput.addEventListener('input', renderGrid);

  // Botones "Todas · Facción A · Facción B..." encima del directorio.
  function renderFactionFilter() {
    factionFilterEl.innerHTML = '';
    factionFilterEl.hidden = !factions.length;
    if (!factions.length) return;
    const chip = (key, label, color) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'personajes-faction-chip';
      btn.dataset.faction = key;
      btn.setAttribute('aria-pressed', String(key === factionFilter));
      if (color) btn.style.setProperty('--faction-color', color);
      btn.textContent = label;
      btn.addEventListener('click', () => {
        factionFilter = key;
        for (const b of factionFilterEl.children) b.setAttribute('aria-pressed', String(b === btn));
        renderGrid();
      });
      return btn;
    };
    factionFilterEl.append(chip('', t('pj.factionAll'), null));
    for (const f of factions) factionFilterEl.append(chip(f.key, `${f.name} (${f.count})`, f.color));
  }
  onLanguageChange(() => {
    if (views.directory.classList.contains('is-active')) renderFactionFilter();
  });

  // ---- Árbol de relaciones (js/relations-graph.js) ----
  // Usa la caché del directorio (allPersonajes), que ya está cargada porque
  // al árbol solo se llega desde el directorio.
  function renderRelations() {
    const graph = buildGraph(allPersonajes);
    const nameOf = (id) => allPersonajes.find((p) => p.id === id)?.data.nombre || t('pj.noName');
    const hasEdges = graph.edges.length > 0;

    renderRelationsGraph(relationsGraphEl, graph, {
      onSelect: goToProfile,
      nodeLabel: (name) => t('pj.treeNodeLabel', { name: name || t('pj.noName') }),
      nodeColor: (node) => factionOf({ faccion: node.faccion })?.color || null,
      zoomLabels: { in: t('pj.treeZoomIn'), out: t('pj.treeZoomOut'), reset: t('pj.treeZoomReset') },
    });
    relationsHintEl.hidden = !hasEdges;

    // Leyenda de colores: solo las facciones que salen en el árbol.
    const inGraph = new Set(graph.nodes.map((n) => factionKey(n.faccion)));
    relationsLegendEl.innerHTML = '';
    for (const f of factions.filter((f) => inGraph.has(f.key))) {
      const li = document.createElement('li');
      li.className = 'personajes-faction-tag';
      li.style.setProperty('--faction-color', f.color);
      li.textContent = f.name;
      relationsLegendEl.append(li);
    }
    relationsLegendEl.hidden = !relationsLegendEl.children.length;
    relationsListTitleEl.hidden = !hasEdges;

    // Aviso: vacío del todo, o cuántos personajes se quedan fuera por no tener relaciones.
    if (!hasEdges) relationsEmptyEl.textContent = t('pj.treeEmpty');
    else if (graph.isolatedCount === 1) relationsEmptyEl.textContent = t('pj.treeIsolatedOne');
    else relationsEmptyEl.textContent = graph.isolatedCount ? t('pj.treeIsolated', { n: graph.isolatedCount }) : '';
    relationsEmptyEl.hidden = !relationsEmptyEl.textContent;

    // La misma información en texto (se lee mejor en móvil y con lector de pantalla).
    relationsListEl.innerHTML = '';
    const personButton = (id) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'relations-list-person';
      btn.textContent = nameOf(id);
      btn.addEventListener('click', () => goToProfile(id));
      return btn;
    };
    // Cada relación con su dirección, tal cual la puso su autor:
    // "Kira → hermano → Zed" (en el dibujo, la pareja comparte una línea).
    const declarations = [...graph.declarations].sort(
      (x, y) => nameOf(x.from).localeCompare(nameOf(y.from)) || nameOf(x.to).localeCompare(nameOf(y.to)),
    );
    for (const { from, to, label } of declarations) {
      const li = document.createElement('li');
      const labelEl = document.createElement('span');
      labelEl.className = 'relations-list-label';
      labelEl.textContent = label ? ` → ${label} → ` : ' → ';
      li.append(personButton(from), labelEl, personButton(to));
      relationsListEl.append(li);
    }
  }

  relationsBtn.addEventListener('click', () => {
    setProfileHash(null);
    showView('relations');
    renderRelations();
  });
  relationsBackBtn.addEventListener('click', () => showView('directory'));
  // Si se cambia de idioma con el árbol abierto, se repintan sus textos.
  onLanguageChange(() => {
    if (views.relations.classList.contains('is-active')) renderRelations();
  });

  function goToProfile(uid) {
    const cached = allPersonajes.find((p) => p.id === uid);
    if (cached) {
      openProfile(uid, cached.data);
      return;
    }
    fb.getDoc(personajeDoc(uid))
      .then((doc) => {
        if (doc.exists()) openProfile(uid, doc.data());
        else showStatus(t('pj.gone'));
      })
      .catch((err) => reportError(t('pj.openError'), err));
  }

  // ---- Perfil (solo lectura) ----
  function updateCommentFormVisibility() {
    commentForm.hidden = !currentUser;
    commentSigninHint.hidden = !!currentUser;
    commentFeedbackEl.textContent = '';
    commentFeedbackEl.classList.remove('is-fail');
  }

  function openProfile(uid, data) {
    currentProfileUid = uid;
    profileNameEl.textContent = data.nombre || t('pj.noName');
    profileNameEl.dataset.text = data.nombre || '';
    // Dato extra opcional: solo se muestra si el personaje puso un usuario de Minecraft.
    if (data.minecraftUsername) {
      profileMcUserEl.textContent = t('pj.mcUser', { name: data.minecraftUsername });
      profileMcUserEl.hidden = false;
    } else {
      profileMcUserEl.textContent = '';
      profileMcUserEl.hidden = true;
    }
    const faccion = (data.faccion || '').trim();
    profileFaccionEl.hidden = !faccion;
    profileFaccionEl.textContent = faccion ? t('pj.faction', { name: faccion }) : '';
    profileFaccionEl.style.setProperty('--faction-color', factionOf(data)?.color || '');
    profileBlocksEl.innerHTML = '';
    for (const bloque of data.bloques || []) {
      profileBlocksEl.appendChild(
        buildPersonajeBlockElement(bloque, {
          onRelacionClick: goToProfile,
          lookupFoto: (relUid) => allPersonajes.find((p) => p.id === relUid)?.data.fotoUrl,
        }),
      );
    }
    editBtn.hidden = !(currentUser && currentUser.uid === uid);
    if (currentUser && currentUser.uid === uid) {
      comments.markSeen(uid);
      mineBtn.classList.remove('personajes-has-badge');
    }
    updateCommentFormVisibility();
    showView('profile');
    comments.watch(uid);
    setProfileHash(uid);
  }

  profileBackBtn.addEventListener('click', () => {
    showView('directory');
    renderDirectory();
  });

  // Abre el editor con tu personaje (o vacío si aún no tienes). Si la
  // lectura falla NO se abre vacío: guardar desde ahí machacaría el que ya
  // tienes.
  function openOwnEditor() {
    if (!currentUser) return;
    currentProfileUid = currentUser.uid;
    fb.getDoc(personajeDoc(currentUser.uid))
      .then((doc) => {
        openEditor(doc.exists() ? doc.data() : null);
      })
      .catch((err) => reportError(t('pj.openOwnError'), err));
  }

  editBtn.addEventListener('click', () => {
    if (!currentUser || currentProfileUid !== currentUser.uid) return;
    openOwnEditor();
  });

  // ---- Editor ----
  function renderEditorBlocks() {
    editorBlocksEl.innerHTML = '';
    editorBloques.forEach((bloque, index) => {
      const row = document.createElement('div');
      row.className = 'personajes-editor-block';

      const controls = document.createElement('div');
      controls.className = 'personajes-editor-block-controls';

      const upBtn = document.createElement('button');
      upBtn.type = 'button';
      upBtn.className = 'personajes-block-move-btn';
      upBtn.textContent = '▲';
      upBtn.setAttribute('aria-label', t('pj.moveUp'));
      upBtn.disabled = index === 0;
      upBtn.addEventListener('click', () => {
        [editorBloques[index - 1], editorBloques[index]] = [editorBloques[index], editorBloques[index - 1]];
        renderEditorBlocks();
      });

      const downBtn = document.createElement('button');
      downBtn.type = 'button';
      downBtn.className = 'personajes-block-move-btn';
      downBtn.textContent = '▼';
      downBtn.setAttribute('aria-label', t('pj.moveDown'));
      downBtn.disabled = index === editorBloques.length - 1;
      downBtn.addEventListener('click', () => {
        [editorBloques[index + 1], editorBloques[index]] = [editorBloques[index], editorBloques[index + 1]];
        renderEditorBlocks();
      });

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'personajes-block-remove-btn';
      removeBtn.textContent = '✕';
      removeBtn.setAttribute('aria-label', t('pj.removeBlock'));
      removeBtn.addEventListener('click', () => {
        editorBloques.splice(index, 1);
        renderEditorBlocks();
      });

      controls.append(upBtn, downBtn, removeBtn);
      row.appendChild(controls);

      if (bloque.tipo === 'relacion') {
        const relWrap = document.createElement('div');
        relWrap.className = 'personajes-editor-block-relacion';

        const nombreField = document.createElement('input');
        nombreField.className = 'personajes-input';
        nombreField.type = 'text';
        nombreField.placeholder = t('pj.relName');
        nombreField.setAttribute('aria-label', t('pj.relName'));
        nombreField.setAttribute('list', 'personajes-nombres-datalist');
        nombreField.value = bloque.nombre || '';
        const resolveUid = () => {
          const match = allPersonajes.find(
            (p) => normalizeSearchTerm(p.data.nombre || '') === normalizeSearchTerm(nombreField.value),
          );
          bloque.nombre = nombreField.value;
          bloque.uid = match ? match.id : null;
          nombreField.classList.toggle('is-invalid', !!nombreField.value.trim() && !match);
        };
        nombreField.addEventListener('input', resolveUid);
        nombreField.addEventListener('blur', resolveUid);

        const etiquetaField = document.createElement('input');
        etiquetaField.className = 'personajes-input';
        etiquetaField.type = 'text';
        etiquetaField.maxLength = 40;
        etiquetaField.placeholder = t('pj.relLabelPlaceholder');
        etiquetaField.setAttribute('aria-label', t('pj.relLabel'));
        etiquetaField.value = bloque.etiqueta || '';
        etiquetaField.addEventListener('input', () => {
          bloque.etiqueta = etiquetaField.value;
        });

        relWrap.append(nombreField, etiquetaField);
        row.appendChild(relWrap);
      } else {
        let field;
        if (bloque.tipo === 'texto') {
          field = document.createElement('textarea');
          field.className = 'personajes-input personajes-block-textarea';
          field.rows = 3;
          field.placeholder = t('pj.textPlaceholder');
        } else {
          field = document.createElement('input');
          field.className = 'personajes-input';
          field.type = 'url';
          field.placeholder = bloque.tipo === 'imagen' ? t('pj.imagePlaceholder') : t('pj.spotifyPlaceholder');
        }
        field.setAttribute(
          'aria-label',
          { texto: t('pj.textLabel'), imagen: t('pj.imageLabel'), spotify: t('pj.spotifyLabel') }[bloque.tipo],
        );
        field.value = bloque.contenido || '';
        field.addEventListener('input', () => {
          bloque.contenido = field.value;
        });
        row.appendChild(field);
      }

      editorBlocksEl.appendChild(row);
    });
  }

  function addBlock(tipo) {
    const base = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, tipo };
    editorBloques.push(
      tipo === 'relacion' ? { ...base, uid: null, nombre: '', etiqueta: '' } : { ...base, contenido: '' },
    );
    renderEditorBlocks();
  }
  addTextoBtn.addEventListener('click', () => addBlock('texto'));
  addImagenBtn.addEventListener('click', () => addBlock('imagen'));
  addSpotifyBtn.addEventListener('click', () => addBlock('spotify'));
  addRelacionBtn.addEventListener('click', () => addBlock('relacion'));

  function openEditor(data) {
    setProfileHash(null);
    editingExisting = !!data;
    nombreInput.value = data ? data.nombre || '' : '';
    mcUserInput.value = data ? data.minecraftUsername || '' : '';
    faccionInput.value = data ? data.faccion || '' : '';
    hadFaccion = !!data?.faccion;
    fotoInput.value = data ? data.fotoUrl || '' : '';
    editorBloques = data && Array.isArray(data.bloques) ? data.bloques.map((b) => ({ ...b })) : [];
    renderEditorBlocks();
    setFeedback('', null);
    deleteBtn.hidden = !editingExisting;
    showView('editor');
  }

  editorCancelBtn.addEventListener('click', () => {
    if (currentUser && currentProfileUid === currentUser.uid) {
      fb.getDoc(personajeDoc(currentUser.uid))
        .then((doc) => {
          if (doc.exists()) {
            openProfile(currentUser.uid, doc.data());
          } else {
            showView('directory');
            renderDirectory();
          }
        })
        .catch(() => {
          showView('directory');
          renderDirectory();
        });
    } else {
      showView('directory');
      renderDirectory();
    }
  });

  saveBtn.addEventListener('click', () => {
    if (!currentUser) return;
    const nombre = nombreInput.value.trim();
    if (!nombre) {
      setFeedback(t('pj.errNoName'), 'fail');
      return;
    }
    if (nombre.length > 60) {
      setFeedback(t('pj.errNameLong'), 'fail');
      return;
    }
    const fotoUrl = fotoInput.value.trim();
    if (fotoUrl && !/^https?:\/\//i.test(fotoUrl)) {
      setFeedback(t('pj.errPhoto'), 'fail');
      return;
    }
    const minecraftUsername = mcUserInput.value.trim();
    if (minecraftUsername && !/^\w{1,16}$/.test(minecraftUsername)) {
      setFeedback(t('pj.errMcUser'), 'fail');
      return;
    }
    const faccion = faccionInput.value.trim().replace(/\s+/g, ' ');
    if (faccion.length > FACTION_MAX) {
      setFeedback(t('pj.errFactionLong'), 'fail');
      return;
    }
    const relacionInvalida = editorBloques.some((b) => b.tipo === 'relacion' && (b.nombre || '').trim() && !b.uid);
    if (relacionInvalida) {
      setFeedback(t('pj.errRelation'), 'fail');
      return;
    }

    const bloques = editorBloques
      .map((b) =>
        b.tipo === 'relacion'
          ? { id: b.id, tipo: b.tipo, uid: b.uid, nombre: (b.nombre || '').trim(), etiqueta: (b.etiqueta || '').trim() }
          : { id: b.id, tipo: b.tipo, contenido: (b.contenido || '').trim() },
      )
      .filter((b) => (b.tipo === 'relacion' ? !!b.uid : !!b.contenido));

    saveBtn.disabled = true;
    setFeedback(t('pj.saving'), null);

    const payload = {
      nombre,
      minecraftUsername: minecraftUsername || null,
      // Solo se manda si hay facción (o había, para quitarla): así las fichas
      // sin facción se siguen guardando aunque firestore.rules aún no la admita.
      ...(faccion || hadFaccion ? { faccion: faccion || null } : {}),
      fotoUrl: fotoUrl || null,
      bloques,
      actualizadoEn: fb.serverTimestamp(),
    };
    const docRef = personajeDoc(currentUser.uid);
    const write = editingExisting
      ? fb.updateDoc(docRef, payload)
      : fb.setDoc(docRef, { ...payload, creadoEn: fb.serverTimestamp() });

    write
      .then(() => {
        editingExisting = true;
        hadFaccion = !!faccion;
        setHasCharacter(true);
        currentProfileUid = currentUser.uid;
        openProfile(currentUser.uid, {
          nombre,
          minecraftUsername: minecraftUsername || null,
          faccion: faccion || null,
          fotoUrl: fotoUrl || null,
          bloques,
        });
      })
      .catch((err) => {
        console.error('No se pudo guardar el personaje:', err);
        setFeedback(t('pj.saveError'), 'fail');
      })
      .finally(() => {
        saveBtn.disabled = false;
      });
  });

  deleteBtn.addEventListener('click', () => {
    if (!currentUser || !editingExisting) return;
    const ok = window.confirm(t('pj.confirmDelete'));
    if (!ok) return;

    deleteBtn.disabled = true;
    setFeedback(t('pj.deleting'), null);

    fb.deleteDoc(personajeDoc(currentUser.uid))
      .then(() => {
        editingExisting = false;
        setHasCharacter(false);
        showView('directory');
        renderDirectory();
      })
      .catch((err) => {
        console.error('No se pudo eliminar el personaje:', err);
        setFeedback(t('pj.deleteError'), 'fail');
      })
      .finally(() => {
        deleteBtn.disabled = false;
      });
  });

  // ---- Sesión ----
  // "Mi personaje" o "Crear personaje": se guarda si ya lo tiene para poder
  // repintar el botón al cambiar de idioma.
  let hasCharacter = false;
  function setHasCharacter(value) {
    hasCharacter = value;
    mineBtn.textContent = t(value ? 'pj.mine' : 'pj.create');
  }
  onLanguageChange(() => {
    setHasCharacter(hasCharacter);
    if (!signinBtn.hasAttribute('aria-busy')) signinBtn.textContent = t('pj.signin');
  });

  function handleAuthState(user) {
    currentUser = user;
    resetSigninButton();
    signinBtn.hidden = !!user;
    sessionActive.hidden = !user;
    mineBtn.hidden = true;
    mineBtn.classList.remove('personajes-has-badge');
    if (user) {
      sessionName.textContent = user.displayName || user.email || t('pj.googleAccount');
      fb.getDoc(personajeDoc(user.uid))
        .then((doc) => {
          setHasCharacter(doc.exists());
          if (doc.exists()) comments.checkUnread(user.uid);
        })
        .catch((err) => {
          // Sin saber si ya tiene personaje: el botón se enseña igual y, al
          // pulsarlo, openOwnEditor() vuelve a comprobarlo.
          console.error('No se pudo comprobar tu personaje:', err);
          setHasCharacter(true);
        })
        .finally(() => {
          mineBtn.hidden = false;
        });
    }
    if (views.profile.classList.contains('is-active')) {
      editBtn.hidden = !(user && currentProfileUid === user.uid);
      updateCommentFormVisibility();
      // Los botones de editar/borrar de cada comentario dependen de quién mira.
      comments.render();
    }
  }

  // Login con la ventana (popup) de Google.
  // El botón nunca se queda bloqueado: mientras se espera muestra
  // "Abriendo Google..." pero se puede volver a pulsar, y cada pulsación
  // empieza un intento nuevo (Firebase cancela solo el anterior, que puede
  // haberse quedado colgado si la ventana se cerró o no llegó a abrirse).
  // Cada intento lleva un número para que la respuesta tardía de uno viejo
  // no deshaga el estado del botón del intento actual.
  const SIGNIN_SLOW_MS = 15000; // si tarda más, se avisa de cómo desatascarlo
  let signinAttempt = 0;
  let signinSlowTimer = null;

  function resetSigninButton() {
    clearTimeout(signinSlowTimer);
    signinBtn.textContent = t('pj.signin');
    signinBtn.removeAttribute('aria-busy');
  }

  signinBtn.addEventListener('click', () => {
    if (!auth) return;
    const attempt = ++signinAttempt;
    showStatus('');
    clearTimeout(signinSlowTimer);
    signinBtn.textContent = t('pj.signinOpening');
    signinBtn.setAttribute('aria-busy', 'true');
    signinSlowTimer = setTimeout(() => {
      if (attempt !== signinAttempt) return;
      showStatus(t('pj.signinSlow'));
    }, SIGNIN_SLOW_MS);

    fb.signInWithPopup(auth, new fb.GoogleAuthProvider())
      .then(() => {
        if (attempt === signinAttempt) showStatus('');
      })
      .catch((err) => {
        // Un intento viejo cancelado porque se pulsó otra vez: no es un fallo.
        if (err.code === 'auth/cancelled-popup-request' || attempt !== signinAttempt) return;
        if (err.code === 'auth/popup-closed-by-user') {
          showStatus(''); // la persona cerró la ventana de Google: nada que avisar
          return;
        }
        reportError(err.code === 'auth/popup-blocked' ? t('pj.popupBlocked') : t('pj.signinError'), err);
      })
      .finally(() => {
        if (attempt === signinAttempt) resetSigninButton();
      });
  });
  signoutBtn.addEventListener('click', () => {
    if (auth) fb.signOut(auth);
  });

  editNameBtn.addEventListener('click', () => {
    if (!currentUser) return;
    const nuevo = window.prompt(t('pj.promptName'), currentUser.displayName || '');
    if (nuevo === null) return;
    const nombre = nuevo.trim().slice(0, 60); // máx. que aceptan los comentarios (firestore.rules)
    if (!nombre) return;
    fb.updateProfile(currentUser, { displayName: nombre })
      .then(() => {
        sessionName.textContent = nombre;
      })
      .catch((err) => reportError(t('pj.renameError'), err));
  });

  mineBtn.addEventListener('click', openOwnEditor);

  // ---- Entrada / salida de la página ----
  menuBtn.addEventListener('click', () => {
    closeMenuToggle('lore-menu-btn', 'lore-submenu');
    switchTo(true);
  });
  backBtn.addEventListener('click', () => switchTo(false));

  document.addEventListener('keydown', (e) => {
    if (isView('personajes') && e.key === 'Escape') switchTo(false);
  });

  openFromHash = (uid) => {
    closeMenuToggle('lore-menu-btn', 'lore-submenu');
    switchTo(true, uid);
  };
}
