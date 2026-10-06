// ======================================================
// Cuenta atrás del siguiente evento (abajo del todo en la intro)
// ======================================================
//
// Los eventos están en js/data/events.js (en UTC). Se muestra el que está en
// curso o el siguiente: con la cuenta atrás y la fecha en UTC y en la hora de
// quien mira la web; al llegar la hora, "¡Ha llegado la hora!" mientras dura
// el evento; y al acabar, pasa solo al siguiente (o se oculta si no quedan).
// El botón "Añadir al calendario" descarga un .ics del evento.

import { EVENTS } from './data/events.js';
import { buildIcs, currentEvent } from './calendar.js';
import { getLanguage, onLanguageChange, t } from './i18n.js';
import { SERVER_IP } from './intro.js';

const pad = (n) => String(n).padStart(2, '0');
// setTimeout no admite esperas de más de ~24,8 días: se va por tramos.
const MAX_WAIT = 2 ** 31 - 1;

export function initCountdown() {
  const el = document.getElementById('countdown');
  const titleEl = document.getElementById('countdown-title');
  const timerEl = document.getElementById('countdown-timer');
  const dateEl = document.getElementById('countdown-date');
  const doneEl = document.getElementById('countdown-done');
  const icsBtn = document.getElementById('countdown-ics-btn');
  if (!el || !titleEl || !timerEl || !dateEl || !doneEl || !icsBtn) return;

  const nums = {};
  for (const num of el.querySelectorAll('[data-unit]')) nums[num.dataset.unit] = num;

  let ev = null;
  let timer = null;

  // "10 oct, 20:00 UTC · En tu hora: 10 oct, 22:00 CEST"
  const renderDate = () => {
    if (!ev) return;
    const base = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
    const date = new Date(ev.start);
    const utc = new Intl.DateTimeFormat(getLanguage(), { ...base, timeZone: 'UTC' }).format(date);
    const local = new Intl.DateTimeFormat(getLanguage(), { ...base, timeZoneName: 'short' }).format(date);
    dateEl.textContent = t('countdown.date', { utc, local });
  };

  const tick = () => {
    clearTimeout(timer);
    const now = Date.now();
    const next = currentEvent(EVENTS, now);
    if (!next) {
      ev = null;
      el.hidden = true;
      return;
    }
    if (next.name !== ev?.name || next.start !== ev?.start) {
      ev = next;
      titleEl.textContent = ev.name;
      titleEl.dataset.text = ev.name;
      renderDate();
    }
    el.hidden = false;

    const left = ev.start - now;
    const started = left <= 0;
    timerEl.hidden = started;
    dateEl.hidden = started;
    icsBtn.hidden = started;
    doneEl.hidden = !started;
    if (started) {
      // Hasta que acabe el evento, y entonces al siguiente.
      timer = setTimeout(tick, Math.min(ev.end - now + 20, MAX_WAIT));
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

  icsBtn.addEventListener('click', () => {
    if (!ev) return;
    const ics = buildIcs(ev, {
      url: location.origin + location.pathname,
      description: t('countdown.icsDescription', { ip: SERVER_IP }),
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    link.download = `nova2-${ev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  });

  onLanguageChange(renderDate);
  tick();
  // Al volver a la pestaña, se recalcula al momento (los temporizadores de
  // las pestañas en segundo plano van con retraso).
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tick();
  });
}
