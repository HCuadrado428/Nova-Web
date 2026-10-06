// ======================================================
// Personajes: Crónica de la temporada
// ======================================================
//
// Lo que va pasando en el servidor (batallas, alianzas, muertes...), contado
// por los propios jugadores: cualquiera con sesión iniciada publica una
// entrada (título, texto y una imagen opcional) y solo su autor la puede
// editar o borrar. Las más recientes salen primero y la lista se actualiza
// sola (onSnapshot). El control de verdad lo hacen las reglas de Firestore
// (colección `cronica` en firestore.rules).
//
// Lo monta initPersonajes() (js/personajes.js) igual que los comentarios:
// `session` se lee en el momento de usarlo porque Firebase conecta tarde.
//   session.fb          -> funciones del SDK (null hasta conectar)
//   session.currentUser -> usuario con sesión iniciada, o null

import { getLanguage, t } from '../i18n.js';

export const CHRONICLE_LIMITS = { titulo: 80, texto: 2000, imagenUrl: 1000 }; // los de firestore.rules

export function createChronicle({ session, cronicaCol, reportError, els }) {
  const { list, form, signinHint, titleInput, textInput, imageInput, submitBtn, cancelBtn, feedback } = els;

  let unsubscribe = null;
  let lastSnapshot = null;
  let editingId = null; // entrada que se está editando en el formulario (null = nueva)

  const setFeedback = (text, fail = false) => {
    feedback.textContent = text || '';
    feedback.classList.toggle('is-fail', fail);
  };

  function resetForm() {
    editingId = null;
    form.reset();
    submitBtn.textContent = t('chron.publish');
    cancelBtn.hidden = true;
  }

  // Formulario solo con sesión; sin ella, una pista para iniciarla.
  function updateForm() {
    form.hidden = !session.currentUser;
    signinHint.hidden = !!session.currentUser;
    if (!session.currentUser) resetForm();
  }

  function stop() {
    if (unsubscribe) unsubscribe();
    unsubscribe = null;
    lastSnapshot = null;
    resetForm();
    setFeedback('');
  }

  function watch() {
    stop();
    updateForm();
    list.innerHTML = '';
    const q = session.fb.query(cronicaCol(), session.fb.orderBy('creadoEn', 'desc'));
    unsubscribe = session.fb.onSnapshot(
      q,
      (snapshot) => {
        lastSnapshot = snapshot;
        render();
      },
      (err) => {
        console.error('No se pudo cargar la crónica:', err);
        list.innerHTML = '';
        const msg = document.createElement('p');
        msg.className = 'personajes-comments-hint is-fail';
        msg.textContent = t('chron.loadError');
        list.append(msg);
      },
    );
  }

  // "6 oct 2026" en el idioma de la web y la hora de quien mira.
  function formatDate(valor) {
    const ms = valor && typeof valor.toMillis === 'function' ? valor.toMillis() : Date.now();
    return new Intl.DateTimeFormat(getLanguage(), { day: 'numeric', month: 'short', year: 'numeric' }).format(ms);
  }

  function render() {
    const snapshot = lastSnapshot;
    if (!snapshot) return;
    list.innerHTML = '';
    if (snapshot.empty) {
      const empty = document.createElement('p');
      empty.className = 'personajes-comments-hint';
      empty.textContent = t('chron.empty');
      list.append(empty);
      return;
    }
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const item = document.createElement('article');
      item.className = 'chronicle-entry';

      const title = document.createElement('h3');
      title.className = 'chronicle-entry-title';
      title.textContent = data.titulo;

      const meta = document.createElement('p');
      meta.className = 'chronicle-entry-meta';
      meta.textContent = t(data.editadoEn ? 'chron.metaEdited' : 'chron.meta', {
        date: formatDate(data.creadoEn),
        author: data.autorNombre || t('pj.someone'),
      });

      item.append(title, meta);
      if (data.imagenUrl) {
        const img = document.createElement('img');
        img.className = 'chronicle-entry-image';
        img.src = data.imagenUrl;
        img.alt = '';
        img.loading = 'lazy';
        img.addEventListener('error', () => img.remove());
        item.append(img);
      }
      const text = document.createElement('p');
      text.className = 'chronicle-entry-text';
      text.textContent = data.texto;
      item.append(text);

      if (session.currentUser && session.currentUser.uid === data.autorUid) {
        const actions = document.createElement('div');
        actions.className = 'chronicle-entry-actions';
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'personajes-comment-edit-btn';
        editBtn.textContent = t('common.edit');
        editBtn.addEventListener('click', () => startEditing(doc.id, data));
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'personajes-comment-remove-btn';
        removeBtn.textContent = '✕';
        removeBtn.setAttribute('aria-label', t('chron.delete'));
        removeBtn.addEventListener('click', () => {
          if (!window.confirm(t('chron.confirmDelete'))) return;
          removeBtn.disabled = true;
          session.fb.deleteDoc(session.fb.doc(cronicaCol(), doc.id)).catch((err) => {
            removeBtn.disabled = false;
            reportError(t('chron.deleteError'), err);
          });
          if (editingId === doc.id) resetForm();
        });
        actions.append(editBtn, removeBtn);
        item.append(actions);
      }
      list.append(item);
    }
  }

  // Editar reutiliza el formulario de arriba.
  function startEditing(id, data) {
    editingId = id;
    titleInput.value = data.titulo || '';
    textInput.value = data.texto || '';
    imageInput.value = data.imagenUrl || '';
    submitBtn.textContent = t('common.save');
    cancelBtn.hidden = false;
    setFeedback('');
    form.scrollIntoView({ block: 'nearest' });
    titleInput.focus();
  }

  cancelBtn.addEventListener('click', () => {
    resetForm();
    setFeedback('');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = session.currentUser;
    if (!user) return;
    const titulo = titleInput.value.trim();
    const texto = textInput.value.trim();
    const imagenUrl = imageInput.value.trim();
    if (!titulo || !texto) {
      setFeedback(t('chron.errEmpty'), true);
      return;
    }
    if (imagenUrl && !/^https?:\/\//i.test(imagenUrl)) {
      setFeedback(t('pj.errPhoto'), true);
      return;
    }
    const fb = session.fb;
    const fields = {
      titulo: titulo.slice(0, CHRONICLE_LIMITS.titulo),
      texto: texto.slice(0, CHRONICLE_LIMITS.texto),
      imagenUrl: imagenUrl || null,
    };
    const write = editingId
      ? fb.updateDoc(fb.doc(cronicaCol(), editingId), { ...fields, editadoEn: fb.serverTimestamp() })
      : fb.addDoc(cronicaCol(), {
          ...fields,
          autorUid: user.uid,
          // Máx. 60: lo que aceptan las reglas de Firestore.
          autorNombre: (user.displayName || user.email || t('pj.someone')).slice(0, 60),
          creadoEn: fb.serverTimestamp(),
        });
    submitBtn.disabled = true;
    setFeedback('');
    write
      .then(() => resetForm()) // la entrada ya la pinta onSnapshot
      .catch((err) => {
        console.error('No se pudo guardar la entrada de la crónica:', err);
        setFeedback(t('chron.saveError'), true);
      })
      .finally(() => {
        submitBtn.disabled = false;
      });
  });

  return { watch, stop, render, updateForm };
}
