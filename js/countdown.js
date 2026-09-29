// ======================================================
// Cuenta atrás "Be The Boss" (abajo del todo en la intro)
// ======================================================
//
// La hora de fin está en el HTML, en data-end de #countdown, siempre en UTC
// (la "Z" del final), para que sea la misma en todo el mundo:
//   22:00 del 10 de octubre en España (CEST, UTC+2) = 2026-10-10T20:00:00Z
// Para cambiarla basta con tocar data-end. Debajo de los números se muestra
// la fecha en UTC y también en la hora de quien mira la web.

import { getLanguage, onLanguageChange, t } from './i18n.js';

const pad = (n) => String(n).padStart(2, '0');

export function initCountdown() {
  const el = document.getElementById('countdown');
  const timerEl = document.getElementById('countdown-timer');
  const dateEl = document.getElementById('countdown-date');
  const doneEl = document.getElementById('countdown-done');
  if (!el || !timerEl || !dateEl || !doneEl) return;

  const end = Date.parse(el.dataset.end || '');
  if (Number.isNaN(end)) return;
  const nums = {};
  for (const num of el.querySelectorAll('[data-unit]')) nums[num.dataset.unit] = num;

  // "10 oct, 20:00 UTC · En tu hora: 10 oct, 22:00 CEST"
  const renderDate = () => {
    const base = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
    const date = new Date(end);
    const utc = new Intl.DateTimeFormat(getLanguage(), { ...base, timeZone: 'UTC' }).format(date);
    const local = new Intl.DateTimeFormat(getLanguage(), { ...base, timeZoneName: 'short' }).format(date);
    dateEl.textContent = t('countdown.date', { utc, local });
  };

  let timer = null;
  const tick = () => {
    const left = end - Date.now();
    if (left <= 0) {
      timerEl.hidden = true;
      dateEl.hidden = true;
      doneEl.hidden = false;
      return;
    }
    const s = Math.floor(left / 1000);
    nums.days.textContent = pad(Math.floor(s / 86400));
    nums.hours.textContent = pad(Math.floor((s % 86400) / 3600));
    nums.minutes.textContent = pad(Math.floor((s % 3600) / 60));
    nums.seconds.textContent = pad(s % 60);
    // Al siguiente cambio de segundo (no cada 1000 ms fijos, que se desfasa).
    timer = setTimeout(tick, (left % 1000) + 20);
  };

  renderDate();
  onLanguageChange(renderDate);
  tick();
  el.hidden = false;
  // Al volver a la pestaña, se recalcula al momento (los temporizadores de
  // las pestañas en segundo plano van con retraso).
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !doneEl.hidden) return;
    clearTimeout(timer);
    tick();
  });
}
