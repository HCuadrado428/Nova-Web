// ======================================================
// Personajes: comentarios de un perfil
// ======================================================
//
// Lista en tiempo real, publicar, editar y borrar comentarios, y el aviso
// de comentarios nuevos en tu propio personaje: un número en "Mi personaje"
// que se actualiza en directo y la etiqueta "Nuevo" en los que aún no habías
// visto. Lo visto se recuerda en este navegador (localStorage). Lo monta initPersonajes()
// (js/personajes.js), que le pasa los elementos del HTML y `session`: un
// objeto cuyas propiedades se leen en el momento de usarlas, porque
// Firebase se conecta tarde y la sesión cambia al entrar o salir.
//   session.fb          -> funciones del SDK (null hasta conectar)
//   session.currentUser -> usuario con sesión iniciada, o null
//   session.profileUid  -> uid del perfil que se está viendo

import { storageGet, storageSet } from '../utils.js';
import { t } from '../i18n.js';

export function createComments({ session, comentariosCol, reportError, els }) {
  const { list: commentsListEl, form: commentForm, input: commentInput, feedback: commentFeedbackEl, mineBtn } = els;

  function toMillis(valor) {
    if (valor && typeof valor.toMillis === 'function') return valor.toMillis();
    if (valor) return new Date(valor).getTime();
    return 0;
  }

  const commentsSeenKey = (uid) => `personajes_comentarios_vistos_${uid}`;

  const lastSeenOf = (uid) => Number(storageGet(commentsSeenKey(uid))) || 0;
  const isUnread = (data, uid, since) => data.autorUid !== uid && toMillis(data.creadoEn) > since;

  // ---- Aviso en "Mi personaje" ----
  // Mientras hay sesión, se escuchan los comentarios de tu personaje: si
  // alguien te escribe, el número sube sin recargar.
  let unsubscribeUnread = null;
  let unreadUid = null;
  let unreadCount = 0;

  function renderBadge() {
    if (unreadCount > 0) {
      mineBtn.dataset.badge = unreadCount > 9 ? '9+' : String(unreadCount);
      mineBtn.setAttribute(
        'aria-label',
        `${mineBtn.textContent} · ${t(unreadCount === 1 ? 'pj.newCommentsOne' : 'pj.newComments', { n: unreadCount })}`,
      );
    } else {
      delete mineBtn.dataset.badge;
      mineBtn.removeAttribute('aria-label');
    }
  }

  function setUnread(n) {
    unreadCount = n;
    renderBadge();
  }

  function markCommentsSeen(uid) {
    storageSet(commentsSeenKey(uid), String(Date.now()));
    if (uid === unreadUid) setUnread(0);
  }

  function stopWatchingUnread() {
    if (unsubscribeUnread) unsubscribeUnread();
    unsubscribeUnread = null;
    unreadUid = null;
    setUnread(0);
  }

  function watchUnread(uid) {
    stopWatchingUnread();
    unreadUid = uid;
    unsubscribeUnread = session.fb.onSnapshot(
      comentariosCol(uid),
      (snapshot) => {
        // Si estás viendo tu propio perfil, lo que llega ya lo estás leyendo.
        if (commentsUid === uid) {
          markCommentsSeen(uid);
          return;
        }
        const since = lastSeenOf(uid);
        setUnread(snapshot.docs.filter((doc) => isUnread(doc.data(), uid, since)).length);
      },
      () => {
        // si falla (p.ej. las reglas de comentarios aún no están publicadas), simplemente no se muestra aviso
      },
    );
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
  let newSince = null; // en tu propio perfil: lo escrito después de esto lleva "Nuevo"

  function stopWatchingComments() {
    if (unsubscribeComments) unsubscribeComments();
    unsubscribeComments = null;
    commentsUid = null;
    lastCommentsSnapshot = null;
    editingComment = false;
    newSince = null;
  }

  function watchComments(uid) {
    stopWatchingComments();
    commentsUid = uid;
    commentsListEl.innerHTML = '';
    // Tu propio perfil: se apunta qué habías visto ya (para marcar lo nuevo)
    // y desde ahora todo cuenta como leído.
    if (session.currentUser && session.currentUser.uid === uid) {
      newSince = lastSeenOf(uid);
      markCommentsSeen(uid);
    }
    const comentarios = session.fb.query(comentariosCol(uid), session.fb.orderBy('creadoEn'));
    unsubscribeComments = session.fb.onSnapshot(
      comentarios,
      (snapshot) => {
        lastCommentsSnapshot = snapshot;
        if (!editingComment) renderComments();
        // Si es tu propio perfil y lo estás viendo, lo nuevo ya cuenta como leído.
        if (session.currentUser && session.currentUser.uid === uid) markCommentsSeen(uid);
      },
      (err) => {
        console.error('No se pudieron cargar los comentarios:', err);
        commentsListEl.innerHTML = '';
        const msg = document.createElement('p');
        msg.className = 'personajes-comments-hint is-fail';
        msg.textContent = t('pj.commentsLoadError');
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
      empty.textContent = t('pj.noComments');
      commentsListEl.appendChild(empty);
      return;
    }
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const item = document.createElement('div');
      item.className = 'personajes-comment';
      const isNew = newSince !== null && isUnread(data, uid, newSince);
      if (isNew) item.classList.add('is-new');

      const header = document.createElement('div');
      header.className = 'personajes-comment-header';
      const author = document.createElement('span');
      author.className = 'personajes-comment-author';
      author.textContent = data.autorNombre || t('pj.someone');
      if (isNew) {
        const newTag = document.createElement('span');
        newTag.className = 'personajes-comment-new-tag';
        newTag.textContent = t('pj.newTag');
        author.append(' ', newTag);
      }
      header.appendChild(author);

      const text = document.createElement('p');
      text.className = 'personajes-comment-text';
      text.textContent = data.texto + (data.editadoEn ? ' ' : '');
      if (data.editadoEn) {
        const editedTag = document.createElement('span');
        editedTag.className = 'personajes-comment-edited-tag';
        editedTag.textContent = t('pj.edited');
        text.appendChild(editedTag);
      }

      const isAuthor = session.currentUser && session.currentUser.uid === data.autorUid;

      if (isAuthor) {
        const editCommentBtn = document.createElement('button');
        editCommentBtn.type = 'button';
        editCommentBtn.className = 'personajes-comment-edit-btn';
        editCommentBtn.textContent = t('common.edit');
        editCommentBtn.addEventListener('click', () => startEditingComment(uid, doc.id, data.texto, text));
        header.appendChild(editCommentBtn);
      }

      if (session.currentUser && (isAuthor || session.currentUser.uid === uid)) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'personajes-comment-remove-btn';
        removeBtn.textContent = '✕';
        removeBtn.setAttribute('aria-label', t('pj.deleteComment'));
        removeBtn.addEventListener('click', () => {
          removeBtn.disabled = true;
          // No hace falta repintar a mano: onSnapshot se entera del borrado.
          session.fb.deleteDoc(session.fb.doc(comentariosCol(uid), doc.id)).catch((err) => {
            removeBtn.disabled = false;
            reportError(t('pj.deleteCommentError'), err);
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
    textarea.setAttribute('aria-label', t('pj.editComment'));

    const actions = document.createElement('div');
    actions.className = 'personajes-comment-edit-actions';
    const saveBtnEl = document.createElement('button');
    saveBtnEl.type = 'button';
    saveBtnEl.className = 'rules-switch-btn';
    saveBtnEl.textContent = t('common.save');
    const cancelBtnEl = document.createElement('button');
    cancelBtnEl.type = 'button';
    cancelBtnEl.className = 'personajes-comment-edit-btn';
    cancelBtnEl.textContent = t('common.cancel');

    saveBtnEl.addEventListener('click', () => {
      const nuevo = textarea.value.trim();
      if (!nuevo) return;
      saveBtnEl.disabled = true;
      session.fb
        .updateDoc(session.fb.doc(comentariosCol(uid), commentId), {
          texto: nuevo,
          editadoEn: session.fb.serverTimestamp(),
        })
        .then(() => renderComments())
        .catch((err) => {
          saveBtnEl.disabled = false;
          reportError(t('pj.editCommentError'), err);
        });
    });
    cancelBtnEl.addEventListener('click', () => renderComments());

    actions.append(saveBtnEl, cancelBtnEl);
    textEl.replaceWith(textarea, actions);
    textarea.focus();
  }

  commentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!session.currentUser || !session.profileUid) return;
    const texto = commentInput.value.trim();
    if (!texto) return;

    commentFeedbackEl.textContent = '';
    commentFeedbackEl.classList.remove('is-fail');
    const submitBtn = commentForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    session.fb
      .addDoc(comentariosCol(session.profileUid), {
        autorUid: session.currentUser.uid,
        // Máx. 60: lo que aceptan las reglas de Firestore.
        autorNombre: (session.currentUser.displayName || session.currentUser.email || t('pj.someone')).slice(0, 60),
        texto,
        creadoEn: session.fb.serverTimestamp(),
      })
      .then(() => {
        commentInput.value = ''; // el comentario ya lo pinta onSnapshot
      })
      .catch((err) => {
        console.error('No se pudo publicar el comentario:', err);
        commentFeedbackEl.textContent = t('pj.commentError');
        commentFeedbackEl.classList.add('is-fail');
      })
      .finally(() => {
        submitBtn.disabled = false;
      });
  });

  return {
    watch: watchComments,
    stop: stopWatchingComments,
    render: renderComments,
    watchUnread,
    stopUnread: stopWatchingUnread,
    renderBadge,
  };
}
