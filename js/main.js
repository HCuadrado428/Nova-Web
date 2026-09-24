// ======================================================
// NOVA 2 — Punto de entrada (JS vanilla, módulos nativos, sin dependencias)
// ======================================================
//
// Cada sección vive en su propio archivo de js/. Este solo las arranca.
// Los <script type="module"> se ejecutan cuando el HTML ya está cargado
// (como "defer"), así que no hace falta esperar a DOMContentLoaded.
//
// OJO: los módulos no funcionan abriendo index.html con doble clic
// (file://). Para probar en local hay que servir la carpeta, p.ej.:
//   python3 -m http.server   ->  http://localhost:8000

import { initAudioToggleButton } from './audio.js';
import { initLanguageSwitch } from './i18n.js';
import { initMenuToggle } from './views.js';
import { initCopyIpButton, initEnterGate } from './intro.js';
import { initLore } from './lore.js';
import { initRules } from './rules.js';
import { initPersonajes } from './personajes.js';
import { initPasswordScreen } from './password.js';
import { initAdanScene } from './adan.js';
import { initServerStatus } from './server-status.js';

// Idioma primero: traduce la página antes de que se vea nada más.
initLanguageSwitch();
initCopyIpButton();
initEnterGate();
initMenuToggle('lore-menu-btn', 'lore-submenu');
initMenuToggle('rules-menu-btn', 'rules-submenu');
initLore();
initRules();
initPersonajes();
initPasswordScreen();
initAdanScene();
initAudioToggleButton();
initServerStatus();
