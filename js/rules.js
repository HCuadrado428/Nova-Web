// ======================================================
// Normas (Discord / Minecraft / Objetos)
// ======================================================
//
// El texto de cada normativa vive directamente en el HTML (rules-panel-discord
// / rules-panel-minecraft / rules-panel-objetos), no hay que generarlo desde
// aquí. Este módulo solo controla la transición de página (igual que el Lore)
// y el cambio entre paneles una vez dentro, con los botones rules-switch-btn.

import { channelSwitch, closeMenuToggle, isView, setView } from './views.js';

export function initRules() {
  const openBtns = {
    discord: document.getElementById('rules-discord-btn'),
    minecraft: document.getElementById('rules-minecraft-btn'),
    objetos: document.getElementById('rules-objetos-btn'),
  };
  const backBtn = document.getElementById('rules-back-btn');
  const rulesPage = document.getElementById('rules-page');
  const panels = {
    discord: document.getElementById('rules-panel-discord'),
    minecraft: document.getElementById('rules-panel-minecraft'),
    objetos: document.getElementById('rules-panel-objetos'),
  };
  const switchBtns = {
    discord: document.getElementById('rules-switch-discord'),
    minecraft: document.getElementById('rules-switch-minecraft'),
    objetos: document.getElementById('rules-switch-objetos'),
  };
  if (!backBtn || !rulesPage || Object.values(openBtns).some((b) => !b) || Object.values(panels).some((p) => !p)) return;

  const showPanel = (key) => {
    Object.entries(panels).forEach(([k, el]) => el.classList.toggle('is-active', k === key));
    Object.entries(switchBtns).forEach(([k, btn]) => {
      if (btn) btn.classList.toggle('is-active', k === key);
    });
    rulesPage.scrollTop = 0;
  };

  const switchTo = (showRules, panelKey) => channelSwitch(() => {
    if (showRules) showPanel(panelKey);
    setView(showRules ? 'rules' : 'home');
  });

  Object.entries(openBtns).forEach(([key, btn]) => {
    btn.addEventListener('click', () => {
      closeMenuToggle('rules-menu-btn', 'rules-submenu');
      switchTo(true, key);
    });
  });
  backBtn.addEventListener('click', () => switchTo(false));

  Object.entries(switchBtns).forEach(([key, btn]) => {
    if (btn) btn.addEventListener('click', () => showPanel(key));
  });

  document.addEventListener('keydown', (e) => {
    if (isView('rules') && e.key === 'Escape') switchTo(false);
  });
}
