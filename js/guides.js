// ======================================================
// Guías: cómo funciona cada parte de la web
// ======================================================
//
// Mismo patrón que Normas (js/rules.js): el texto vive en el HTML y en
// js/i18n/*.js (claves guides.*), y este módulo solo abre/cierra la página con
// la transición de canal y cambia entre pestañas (guides-switch-btn).

import { channelSwitch, isView, setView } from './views.js';

export function initGuides() {
  const openBtn = document.getElementById('guides-open-btn');
  const backBtn = document.getElementById('guides-back-btn');
  const page = document.getElementById('guides-page');
  if (!openBtn || !backBtn || !page) return;

  const switchBtns = [...page.querySelectorAll('.guides-switch-btn')];
  const showPanel = (key) => {
    for (const btn of switchBtns) {
      const active = btn.dataset.guidesTarget === key;
      btn.classList.toggle('is-active', active);
      document.getElementById(`guides-panel-${btn.dataset.guidesTarget}`)?.classList.toggle('is-active', active);
    }
    page.scrollTop = 0;
  };

  const switchTo = (showGuides) =>
    channelSwitch(() => {
      if (showGuides) showPanel('start');
      setView(showGuides ? 'guides' : 'home');
    });

  openBtn.addEventListener('click', () => switchTo(true));
  backBtn.addEventListener('click', () => switchTo(false));
  for (const btn of switchBtns) btn.addEventListener('click', () => showPanel(btn.dataset.guidesTarget));

  document.addEventListener('keydown', (e) => {
    if (isView('guides') && e.key === 'Escape') switchTo(false);
  });
}
