// ======================================================
// Personajes: subir imágenes a Cloudinary
// ======================================================
//
// Al lado de cada campo de imagen (foto de perfil, bloques de imagen y la
// captura de la Crónica) sale un botón "Subir imagen": el archivo va directo
// del navegador a Cloudinary con un "upload preset" sin firmar y el link
// permanente que devuelve (https://res.cloudinary.com/...) se escribe en el
// campo, igual que si lo hubieran pegado. En Firestore se sigue guardando
// solo el link, así que las reglas no cambian.
//
// Se configura en firebase-config.js (window.CLOUDINARY_CONFIG). Mientras
// tenga los valores de ejemplo no sale ningún botón y todo sigue como antes.

import { t } from '../i18n.js';

export const UPLOAD_MAX_MB = 10; // lo máximo que admite el plan gratuito por imagen

export function isUploadConfigured() {
  const cfg = window.CLOUDINARY_CONFIG;
  return !!cfg && !!cfg.cloudName && !!cfg.uploadPreset && cfg.cloudName !== 'TU_CLOUD_NAME';
}

// Sube el archivo y devuelve su link permanente. Los errores llevan ya el
// texto para enseñar al jugador.
export async function uploadImage(file) {
  if (!file.type.startsWith('image/')) throw new Error(t('pj.uploadNotImage'));
  if (file.size > UPLOAD_MAX_MB * 1024 * 1024) throw new Error(t('pj.uploadTooBig', { mb: UPLOAD_MAX_MB }));
  const { cloudName, uploadPreset } = window.CLOUDINARY_CONFIG;
  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', uploadPreset);
  let data;
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
      method: 'POST',
      body,
    });
    data = await res.json();
    if (!res.ok || !data.secure_url) throw new Error(data.error?.message || `HTTP ${res.status}`);
  } catch (err) {
    console.error('No se pudo subir la imagen:', err);
    throw new Error(t('pj.uploadFail'));
  }
  return data.secure_url;
}

// Pone el botón "Subir imagen" justo después de `input`. Al terminar escribe
// el link en el campo y lanza 'input' para que quien lo escuche se entere.
// `setFeedback(texto, fallo)` enseña cómo va.
export function attachUploadButton(input, setFeedback) {
  if (!isUploadConfigured()) return;
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.hidden = true;
  fileInput.className = 'personajes-upload-file';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'personajes-comment-edit-btn personajes-upload-btn';
  btn.dataset.i18n = 'pj.upload';
  btn.textContent = t('pj.upload');
  btn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    btn.disabled = true;
    btn.textContent = t('pj.uploading');
    setFeedback(t('pj.uploading'), false);
    try {
      input.value = await uploadImage(file);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      setFeedback(t('pj.uploadDone'), false);
    } catch (err) {
      setFeedback(err.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = t('pj.upload');
    }
  });

  input.after(btn, fileInput);
}
