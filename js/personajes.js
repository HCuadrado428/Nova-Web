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

import { channelSwitch, closeMenuToggle, isView, setView } from './views.js';
import { normalizeSearchTerm, storageGet, storageSet } from './utils.js';

/* ---------------------------------------------------
   Carga de Firebase bajo demanda
   El SDK solo lo necesita esta sección, así que no se descarga al entrar en
   la web sino la primera vez que se abre Personajes (o un link directo a un
   personaje). Se sirve desde la propia web (vendor/firebase.js, generado con
   "npm run build:firebase" con solo las funciones que se usan aquí), no desde
   gstatic.com: pesa menos y no lo cortan los bloqueadores.
--------------------------------------------------- */
let firebaseLoad = null;

function loadFirebase() {
  if (!firebaseLoad) {
    firebaseLoad = import('../vendor/firebase.js').then((fb) => {
      const app = fb.initializeApp(window.FIREBASE_CONFIG);
      const auth = fb.getAuth(app);
      const db = fb.getFirestore(app);
      // Solo para los tests (tests/e2e.test.js): apunta a los emuladores
      // locales de Firebase en vez de al proyecto real.
      const emulators = window.NOVA_FIREBASE_EMULATORS;
      if (emulators) {
        fb.connectAuthEmulator(auth, emulators.auth, { disableWarnings: true });
        fb.connectFirestoreEmulator(db, emulators.firestoreHost, emulators.firestorePort);
      }
      return { fb, auth, db };
    });
    // Si falla (sin conexión...), se olvida para poder reintentarlo luego.
    firebaseLoad.catch(() => {
      firebaseLoad = null;
    });
  }
  return firebaseLoad;
}

// Mientras firebase-config.js siga con los valores de ejemplo, la sección se
// desactiva en vez de intentar conectar con Firebase.
const isFirebaseConfigured = () => !!window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey !== 'TU_API_KEY';

// Enganche para el link directo a un personaje (#personaje/<uid>): lo monta
// initPersonajes() y lo llama intro.js tras revelarse la intro.
let openFromHash = null;
export function openPersonajeFromHash(uid) {
  if (openFromHash) openFromHash(uid);
}

function spotifyUrlToEmbed(url) {
  const match = /open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/.exec(
    url || '',
  );
  if (!match) return null;
  return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
}

// Pinta un bloque de personaje (texto/imagen/spotify/relación) para la
// vista de perfil (solo lectura). `options.onRelacionClick(uid)` navega al
// personaje enlazado; `options.lookupFoto(uid)` le da su foto si ya está en
// el directorio cargado. Ninguna de las dos hace falta fuera de un bloque
// de tipo relación.
function buildPersonajeBlockElement(bloque, options = {}) {
  const wrap = document.createElement('div');
  wrap.className = `personaje-block personaje-block-${bloque.tipo}`;

  if (bloque.tipo === 'texto') {
    const p = document.createElement('p');
    p.className = 'personaje-block-texto-text';
    p.textContent = bloque.contenido;
    wrap.appendChild(p);
  } else if (bloque.tipo === 'imagen') {
    const img = document.createElement('img');
    img.className = 'personaje-block-imagen-img';
    img.src = bloque.contenido;
    img.alt = '';
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      wrap.hidden = true;
    });
    wrap.appendChild(img);
  } else if (bloque.tipo === 'spotify') {
    const embedUrl = spotifyUrlToEmbed(bloque.contenido);
    if (!embedUrl) {
      wrap.hidden = true;
    } else {
      const iframe = document.createElement('iframe');
      iframe.className = 'personaje-block-spotify-frame';
      iframe.src = embedUrl;
      iframe.width = '100%';
      iframe.height = '152';
      iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      iframe.loading = 'lazy';
      wrap.appendChild(iframe);
    }
  } else if (bloque.tipo === 'relacion') {
    if (!bloque.uid || !bloque.nombre) {
      wrap.hidden = true;
    } else {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'personaje-block-relacion-card';

      const foto = options.lookupFoto ? options.lookupFoto(bloque.uid) : null;
      if (foto) {
        const img = document.createElement('img');
        img.className = 'personaje-block-relacion-photo';
        img.src = foto;
        img.alt = '';
        img.loading = 'lazy';
        img.addEventListener('error', () => img.remove());
        card.appendChild(img);
      }

      const info = document.createElement('span');
      info.className = 'personaje-block-relacion-info';
      const nombreEl = document.createElement('strong');
      nombreEl.textContent = bloque.nombre;
      info.appendChild(nombreEl);
      if (bloque.etiqueta) {
        const etiquetaEl = document.createElement('span');
        etiquetaEl.className = 'personaje-block-relacion-etiqueta';
        etiquetaEl.textContent = bloque.etiqueta;
        info.appendChild(etiquetaEl);
      }
      card.appendChild(info);

      card.addEventListener('click', () => {
        if (options.onRelacionClick) options.onRelacionClick(bloque.uid);
      });
      wrap.appendChild(card);
    }
  }

  return wrap;
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
  };
  const grid = document.getElementById('personajes-grid');
  const searchInput = document.getElementById('personajes-search-input');

  const profileBackBtn = document.getElementById('personajes-profile-back-btn');
  const editBtn = document.getElementById('personajes-edit-btn');
  const profileNameEl = document.getElementById('personajes-profile-name');
  const profileMcUserEl = document.getElementById('personajes-profile-mcuser');
  const profileBlocksEl = document.getElementById('personajes-profile-blocks');
  const commentsListEl = document.getElementById('personajes-comments-list');
  const commentForm = document.getElementById('personajes-comment-form');
  const commentInput = document.getElementById('personajes-comment-input');
  const commentSigninHint = document.getElementById('personajes-comment-signin-hint');
  const commentFeedbackEl = document.getElementById('personajes-comment-feedback');

  const editorCancelBtn = document.getElementById('personajes-editor-cancel-btn');
  const nombreInput = document.getElementById('personajes-input-nombre');
  const mcUserInput = document.getElementById('personajes-input-mcuser');
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
    !deleteBtn
  )
    return;

  if (!isFirebaseConfigured()) {
    menuBtn.disabled = true;
    menuBtn.title = 'Personajes: falta configurar Firebase (ver firebase-config.js)';
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
  let allPersonajes = []; // [{ id, data }], cache del directorio: alimenta el buscador y el autocompletado de relaciones

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

  const showView = (key) => {
    for (const [k, el] of Object.entries(views)) el.classList.toggle('is-active', k === key);
    if (key !== 'profile') stopWatchingComments();
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
        stopWatchingComments();
        setProfileHash(null);
        setView('home');
        return;
      }
      setView('personajes');
      showView('directory');
      if (!auth) setGridMessage('Cargando personajes...');
      connect()
        .then(() => {
          const directoryLoaded = renderDirectory();
          if (uid) directoryLoaded.then(() => goToProfile(uid));
        })
        .catch((err) => {
          grid.innerHTML = ''; // quita el "Cargando..."; el aviso va arriba
          reportError('No se pudo conectar con Personajes. Revisa la conexión y recarga la página.', err);
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
    const filtered = term
      ? allPersonajes.filter(({ data }) => normalizeSearchTerm(data.nombre || '').includes(term))
      : allPersonajes;

    if (!filtered.length) {
      setGridMessage(
        allPersonajes.length
          ? 'Ningún personaje coincide con la búsqueda.'
          : 'Todavía no hay personajes. ¡Sé el primero!',
      );
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
      name.textContent = data.nombre || 'Sin nombre';
      card.appendChild(name);
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

        renderGrid();
      })
      .catch((err) => {
        console.error('No se pudieron cargar los personajes:', err);
        setGridMessage('No se pudieron cargar los personajes. Vuelve a entrar para reintentarlo.');
      });
  }

  searchInput.addEventListener('input', renderGrid);

  function goToProfile(uid) {
    const cached = allPersonajes.find((p) => p.id === uid);
    if (cached) {
      openProfile(uid, cached.data);
      return;
    }
    fb.getDoc(personajeDoc(uid))
      .then((doc) => {
        if (doc.exists()) openProfile(uid, doc.data());
        else showStatus('Ese personaje ya no existe.');
      })
      .catch((err) => reportError('No se pudo abrir ese personaje.', err));
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
    profileNameEl.textContent = data.nombre || 'Sin nombre';
    profileNameEl.dataset.text = data.nombre || '';
    // Dato extra opcional: solo se muestra si el personaje puso un usuario de Minecraft.
    if (data.minecraftUsername) {
      profileMcUserEl.textContent = `Usuario de Minecraft: ${data.minecraftUsername}`;
      profileMcUserEl.hidden = false;
    } else {
      profileMcUserEl.textContent = '';
      profileMcUserEl.hidden = true;
    }
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
      markCommentsSeen(uid);
      mineBtn.classList.remove('personajes-has-badge');
    }
    updateCommentFormVisibility();
    showView('profile');
    watchComments(uid);
    setProfileHash(uid);
  }

  // ---- Comentarios ----
  function toMillis(valor) {
    if (valor && typeof valor.toMillis === 'function') return valor.toMillis();
    if (valor) return new Date(valor).getTime();
    return 0;
  }

  const commentsSeenKey = (uid) => `personajes_comentarios_vistos_${uid}`;

  function markCommentsSeen(uid) {
    storageSet(commentsSeenKey(uid), String(Date.now()));
  }

  function checkUnreadComments(uid) {
    const lastSeen = Number(storageGet(commentsSeenKey(uid))) || 0;
    fb.getDocs(comentariosCol(uid))
      .then((snapshot) => {
        let hayNuevos = false;
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.autorUid !== uid && toMillis(data.creadoEn) > lastSeen) hayNuevos = true;
        });
        mineBtn.classList.toggle('personajes-has-badge', hayNuevos);
      })
      .catch(() => {
        // si falla (p.ej. las reglas de comentarios aún no están publicadas), simplemente no se muestra aviso
      });
  }

  /* Comentarios en tiempo real: mientras se ve un perfil, onSnapshot avisa
     de cada comentario nuevo, editado o borrado (de cualquiera) y la lista se
     repinta sola, sin recargar. Se deja de escuchar al salir del perfil (ver
     showView) para no mantener conexiones abiertas de más.
     Si llega un cambio mientras estás editando uno de tus comentarios, no se
     repinta en ese momento (se perdería lo que estás escribiendo): se guarda
     y se aplica al guardar o cancelar la edición. */
  let unsubscribeComments = null;
  let commentsUid = null;
  let lastCommentsSnapshot = null;
  let editingComment = false;

  function stopWatchingComments() {
    if (unsubscribeComments) unsubscribeComments();
    unsubscribeComments = null;
    commentsUid = null;
    lastCommentsSnapshot = null;
    editingComment = false;
  }

  function watchComments(uid) {
    stopWatchingComments();
    commentsUid = uid;
    commentsListEl.innerHTML = '';
    const comentarios = fb.query(comentariosCol(uid), fb.orderBy('creadoEn'));
    unsubscribeComments = fb.onSnapshot(
      comentarios,
      (snapshot) => {
        lastCommentsSnapshot = snapshot;
        if (!editingComment) renderComments();
        // Si es tu propio perfil y lo estás viendo, lo nuevo ya cuenta como leído.
        if (currentUser && currentUser.uid === uid) markCommentsSeen(uid);
      },
      (err) => {
        console.error('No se pudieron cargar los comentarios:', err);
        commentsListEl.innerHTML = '';
        const msg = document.createElement('p');
        msg.className = 'personajes-comments-hint is-fail';
        msg.textContent = 'No se pudieron cargar los comentarios.';
        commentsListEl.appendChild(msg);
      },
    );
  }

  // Pinta el último snapshot recibido (también al cambiar de sesión: los
  // botones de editar/borrar dependen de quién mira).
  function renderComments() {
    const snapshot = lastCommentsSnapshot;
    const uid = commentsUid;
    if (!snapshot || !uid) return;
    editingComment = false;
    commentsListEl.innerHTML = '';
    if (snapshot.empty) {
      const empty = document.createElement('p');
      empty.className = 'personajes-comments-hint';
      empty.textContent = 'Todavía no hay comentarios.';
      commentsListEl.appendChild(empty);
      return;
    }
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const item = document.createElement('div');
      item.className = 'personajes-comment';

      const header = document.createElement('div');
      header.className = 'personajes-comment-header';
      const author = document.createElement('span');
      author.className = 'personajes-comment-author';
      author.textContent = data.autorNombre || 'Alguien';
      header.appendChild(author);

      const text = document.createElement('p');
      text.className = 'personajes-comment-text';
      text.textContent = data.texto + (data.editadoEn ? ' ' : '');
      if (data.editadoEn) {
        const editedTag = document.createElement('span');
        editedTag.className = 'personajes-comment-edited-tag';
        editedTag.textContent = '(editado)';
        text.appendChild(editedTag);
      }

      const isAuthor = currentUser && currentUser.uid === data.autorUid;

      if (isAuthor) {
        const editCommentBtn = document.createElement('button');
        editCommentBtn.type = 'button';
        editCommentBtn.className = 'personajes-comment-edit-btn';
        editCommentBtn.textContent = 'Editar';
        editCommentBtn.addEventListener('click', () => startEditingComment(uid, doc.id, data.texto, text));
        header.appendChild(editCommentBtn);
      }

      if (currentUser && (isAuthor || currentUser.uid === uid)) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'personajes-comment-remove-btn';
        removeBtn.textContent = '✕';
        removeBtn.setAttribute('aria-label', 'Borrar comentario');
        removeBtn.addEventListener('click', () => {
          removeBtn.disabled = true;
          // No hace falta repintar a mano: onSnapshot se entera del borrado.
          fb.deleteDoc(fb.doc(comentariosCol(uid), doc.id)).catch((err) => {
            removeBtn.disabled = false;
            reportError('No se pudo borrar el comentario.', err);
          });
        });
        header.appendChild(removeBtn);
      }

      item.append(header, text);
      commentsListEl.appendChild(item);
    }
  }

  // Sustituye el <p> de un comentario por un textarea + Guardar/Cancelar,
  // in situ, sin reordenar la lista. Solo lo llama el propio autor (ver
  // renderComments) -- las reglas de Firestore son las que de verdad lo
  // impiden para cualquier otra persona.
  function startEditingComment(uid, commentId, original, textEl) {
    editingComment = true;

    const textarea = document.createElement('textarea');
    textarea.className = 'personajes-input personajes-block-textarea';
    textarea.maxLength = 500;
    textarea.value = original;
    textarea.setAttribute('aria-label', 'Editar comentario');

    const actions = document.createElement('div');
    actions.className = 'personajes-comment-edit-actions';
    const saveBtnEl = document.createElement('button');
    saveBtnEl.type = 'button';
    saveBtnEl.className = 'rules-switch-btn';
    saveBtnEl.textContent = 'Guardar';
    const cancelBtnEl = document.createElement('button');
    cancelBtnEl.type = 'button';
    cancelBtnEl.className = 'personajes-comment-edit-btn';
    cancelBtnEl.textContent = 'Cancelar';

    saveBtnEl.addEventListener('click', () => {
      const nuevo = textarea.value.trim();
      if (!nuevo) return;
      saveBtnEl.disabled = true;
      fb.updateDoc(fb.doc(comentariosCol(uid), commentId), {
        texto: nuevo,
        editadoEn: fb.serverTimestamp(),
      })
        .then(() => renderComments())
        .catch((err) => {
          saveBtnEl.disabled = false;
          reportError('No se pudo editar el comentario.', err);
        });
    });
    cancelBtnEl.addEventListener('click', () => renderComments());

    actions.append(saveBtnEl, cancelBtnEl);
    textEl.replaceWith(textarea, actions);
    textarea.focus();
  }

  commentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentUser || !currentProfileUid) return;
    const texto = commentInput.value.trim();
    if (!texto) return;

    commentFeedbackEl.textContent = '';
    commentFeedbackEl.classList.remove('is-fail');
    const submitBtn = commentForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    fb.addDoc(comentariosCol(currentProfileUid), {
      autorUid: currentUser.uid,
      // Máx. 60: lo que aceptan las reglas de Firestore.
      autorNombre: (currentUser.displayName || currentUser.email || 'Alguien').slice(0, 60),
      texto,
      creadoEn: fb.serverTimestamp(),
    })
      .then(() => {
        commentInput.value = ''; // el comentario ya lo pinta onSnapshot
      })
      .catch((err) => {
        console.error('No se pudo publicar el comentario:', err);
        commentFeedbackEl.textContent = 'No se pudo publicar el comentario. Inténtalo de nuevo.';
        commentFeedbackEl.classList.add('is-fail');
      })
      .finally(() => {
        submitBtn.disabled = false;
      });
  });

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
      .catch((err) => reportError('No se pudo abrir tu personaje. Inténtalo de nuevo.', err));
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
      upBtn.setAttribute('aria-label', 'Subir bloque');
      upBtn.disabled = index === 0;
      upBtn.addEventListener('click', () => {
        [editorBloques[index - 1], editorBloques[index]] = [editorBloques[index], editorBloques[index - 1]];
        renderEditorBlocks();
      });

      const downBtn = document.createElement('button');
      downBtn.type = 'button';
      downBtn.className = 'personajes-block-move-btn';
      downBtn.textContent = '▼';
      downBtn.setAttribute('aria-label', 'Bajar bloque');
      downBtn.disabled = index === editorBloques.length - 1;
      downBtn.addEventListener('click', () => {
        [editorBloques[index + 1], editorBloques[index]] = [editorBloques[index], editorBloques[index + 1]];
        renderEditorBlocks();
      });

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'personajes-block-remove-btn';
      removeBtn.textContent = '✕';
      removeBtn.setAttribute('aria-label', 'Quitar bloque');
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
        nombreField.placeholder = 'Nombre del otro personaje';
        nombreField.setAttribute('aria-label', 'Nombre del otro personaje');
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
        etiquetaField.placeholder = 'Relación (ej. hermano)';
        etiquetaField.setAttribute('aria-label', 'Tipo de relación');
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
          field.placeholder = 'Escribe aquí...';
        } else {
          field = document.createElement('input');
          field.className = 'personajes-input';
          field.type = 'url';
          field.placeholder =
            bloque.tipo === 'imagen'
              ? 'Link de imagen (https://...)'
              : 'Link de Spotify (https://open.spotify.com/...)';
        }
        field.setAttribute(
          'aria-label',
          { texto: 'Texto del bloque', imagen: 'Link de la imagen', spotify: 'Link de Spotify' }[bloque.tipo],
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
      setFeedback('Ponle un nombre a tu personaje.', 'fail');
      return;
    }
    if (nombre.length > 60) {
      setFeedback('El nombre es demasiado largo (máx. 60 caracteres).', 'fail');
      return;
    }
    const fotoUrl = fotoInput.value.trim();
    if (fotoUrl && !/^https?:\/\//i.test(fotoUrl)) {
      setFeedback('El link de la foto debe empezar por http:// o https://', 'fail');
      return;
    }
    const minecraftUsername = mcUserInput.value.trim();
    if (minecraftUsername && !/^\w{1,16}$/.test(minecraftUsername)) {
      setFeedback('El usuario de Minecraft solo puede tener letras, números y "_" (máx. 16).', 'fail');
      return;
    }
    const relacionInvalida = editorBloques.some((b) => b.tipo === 'relacion' && (b.nombre || '').trim() && !b.uid);
    if (relacionInvalida) {
      setFeedback('Alguna relación no coincide con ningún personaje existente. Revisa el nombre.', 'fail');
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
    setFeedback('Guardando...', null);

    const payload = {
      nombre,
      minecraftUsername: minecraftUsername || null,
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
        mineBtn.textContent = 'Mi personaje';
        currentProfileUid = currentUser.uid;
        openProfile(currentUser.uid, {
          nombre,
          minecraftUsername: minecraftUsername || null,
          fotoUrl: fotoUrl || null,
          bloques,
        });
      })
      .catch((err) => {
        console.error('No se pudo guardar el personaje:', err);
        setFeedback('No se pudo guardar. Inténtalo de nuevo.', 'fail');
      })
      .finally(() => {
        saveBtn.disabled = false;
      });
  });

  deleteBtn.addEventListener('click', () => {
    if (!currentUser || !editingExisting) return;
    const ok = window.confirm('¿Seguro que quieres eliminar tu personaje? Esto no se puede deshacer.');
    if (!ok) return;

    deleteBtn.disabled = true;
    setFeedback('Eliminando...', null);

    fb.deleteDoc(personajeDoc(currentUser.uid))
      .then(() => {
        editingExisting = false;
        mineBtn.textContent = 'Crear personaje';
        showView('directory');
        renderDirectory();
      })
      .catch((err) => {
        console.error('No se pudo eliminar el personaje:', err);
        setFeedback('No se pudo eliminar. Inténtalo de nuevo.', 'fail');
      })
      .finally(() => {
        deleteBtn.disabled = false;
      });
  });

  // ---- Sesión ----
  function handleAuthState(user) {
    currentUser = user;
    signinBtn.hidden = !!user;
    sessionActive.hidden = !user;
    mineBtn.hidden = true;
    mineBtn.classList.remove('personajes-has-badge');
    if (user) {
      sessionName.textContent = user.displayName || user.email || 'Cuenta de Google';
      fb.getDoc(personajeDoc(user.uid))
        .then((doc) => {
          mineBtn.textContent = doc.exists() ? 'Mi personaje' : 'Crear personaje';
          if (doc.exists()) checkUnreadComments(user.uid);
        })
        .catch((err) => {
          // Sin saber si ya tiene personaje: el botón se enseña igual y, al
          // pulsarlo, openOwnEditor() vuelve a comprobarlo.
          console.error('No se pudo comprobar tu personaje:', err);
          mineBtn.textContent = 'Mi personaje';
        })
        .finally(() => {
          mineBtn.hidden = false;
        });
    }
    if (views.profile.classList.contains('is-active')) {
      editBtn.hidden = !(user && currentProfileUid === user.uid);
      updateCommentFormVisibility();
      // Los botones de editar/borrar de cada comentario dependen de quién mira.
      renderComments();
    }
  }

  // Errores de login que no son fallos: la persona cerró la ventana de Google.
  const SIGNIN_CANCELLED = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];

  signinBtn.addEventListener('click', () => {
    if (!auth) return;
    fb.signInWithPopup(auth, new fb.GoogleAuthProvider()).catch((err) => {
      if (SIGNIN_CANCELLED.includes(err.code)) return;
      reportError(
        err.code === 'auth/popup-blocked'
          ? 'El navegador ha bloqueado la ventana de Google. Permite las ventanas emergentes para esta web y vuelve a intentarlo.'
          : 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.',
        err,
      );
    });
  });
  signoutBtn.addEventListener('click', () => {
    if (auth) fb.signOut(auth);
  });

  editNameBtn.addEventListener('click', () => {
    if (!currentUser) return;
    const nuevo = window.prompt('¿Qué nombre quieres que vean los demás en Personajes?', currentUser.displayName || '');
    if (nuevo === null) return;
    const nombre = nuevo.trim().slice(0, 60); // máx. que aceptan los comentarios (firestore.rules)
    if (!nombre) return;
    fb.updateProfile(currentUser, { displayName: nombre })
      .then(() => {
        sessionName.textContent = nombre;
      })
      .catch((err) => reportError('No se pudo cambiar el nombre.', err));
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
