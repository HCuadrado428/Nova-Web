// ======================================================
// Estado del servidor de Minecraft en la intro
// ======================================================
//
// "Online · 5/20 jugadores" u "Offline". Solo el número de jugadores, sin
// nombres: los jugadores que tienen desactivado "Permitir listados del
// servidor" en su Minecraft salen como "Anonymous Player", así que la lista
// de nombres no sería fiable (el número sí lo es).
//
// Se consulta api.mcsrvstat.us (gratuita, sin clave, permite llamarla desde
// el navegador), que ya guarda cada respuesta en caché alrededor de un minuto.
// Solo se refresca mientras se ve la intro y la pestaña está a la vista. Si la
// API no responde, el recuadro simplemente no aparece.

import { SERVER_IP } from './intro.js';
import { onLanguageChange, t } from './i18n.js';
import { isView } from './views.js';

const STATUS_URL = `https://api.mcsrvstat.us/3/${encodeURIComponent(SERVER_IP)}`;
const REFRESH_MS = 60_000;

export function initServerStatus() {
  const el = document.getElementById('server-status');
  const textEl = document.getElementById('server-status-text');
  if (!el || !textEl || !window.fetch) return;

  let timer = null;
  let loading = false;
  let lastData = null; // para repintar el texto al cambiar de idioma

  const render = (data) => {
    lastData = data;
    if (data.online) {
      const players = data.players;
      el.dataset.state = 'online';
      textEl.textContent =
        players && Number.isFinite(players.online) && Number.isFinite(players.max)
          ? t(players.max === 1 ? 'status.onlineOne' : 'status.online', { online: players.online, max: players.max })
          : t('status.onlineNoCount');
    } else {
      el.dataset.state = 'offline';
      textEl.textContent = t('status.offline');
    }
    el.hidden = false;
  };
  onLanguageChange(() => {
    if (lastData) render(lastData);
  });

  const refresh = async () => {
    clearTimeout(timer);
    timer = setTimeout(refresh, REFRESH_MS);
    // Nadie lo está mirando: no gastar peticiones.
    if (loading || document.hidden || !isView('home')) return;
    loading = true;
    try {
      const res = await fetch(STATUS_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      render(await res.json());
    } catch (err) {
      console.warn('No se pudo consultar el estado del servidor:', err);
      el.hidden = true;
    } finally {
      loading = false;
    }
  };

  // Al volver a la pestaña, dato fresco en vez de esperar al siguiente minuto.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });
  refresh();
}
