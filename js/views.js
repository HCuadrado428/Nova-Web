// ======================================================
// Vistas: qué pantalla se está viendo en cada momento
// ======================================================
//
// La vista activa vive en un único atributo, <body data-view="...">, en vez de
// en varias clases sueltas: así nunca pueden quedar dos vistas "activas" a la
// vez y el CSS solo tiene que preguntar por un valor.
//   home        -> la intro (lo normal)
//   lore        -> página de Lore (pases)
//   rules       -> página de Normas
//   personajes  -> directorio / perfil / editor de Personajes
//   password    -> buscador "Inserta la contraseña"
//   adan        -> easter egg de Adán (palabra secreta del buscador)
// Aparte quedan dos clases que NO son vistas y se combinan con cualquiera:
// "booted" (ya se pulsó la pantalla de entrada) y "tab-hidden" (pestaña en
// segundo plano).

import { playChannelChangeAudio } from './audio.js';

export function setView(name) {
  document.body.dataset.view = name;
}

export function getView() {
  return document.body.dataset.view || 'home';
}

export const isView = (name) => getView() === name;

/* ---------------------------------------------------
   Transición de "cambio de canal" entre páginas: estática a pantalla
   completa + sonido; a mitad (con la pantalla ya tapada) se ejecuta
   onSwitch, que es quien cambia de vista de verdad. Compartida por Lore,
   Normas y Personajes, y con un solo candado: no se puede empezar un
   cambio de canal mientras otro sigue en marcha.
--------------------------------------------------- */
const CHANNEL_SWITCH_AT_MS = 750; // pantalla ya tapada por la estática
const CHANNEL_END_MS = 1300; // la estática se va

let switching = false;

export function channelSwitch(onSwitch) {
  const transition = document.getElementById('channel-transition');
  if (switching || !transition) return false;
  switching = true;

  transition.classList.add('active');
  playChannelChangeAudio();

  setTimeout(onSwitch, CHANNEL_SWITCH_AT_MS);
  setTimeout(() => {
    transition.classList.remove('active');
    switching = false;
  }, CHANNEL_END_MS);
  return true;
}

/* ---------------------------------------------------
   Botones "Lore" / "Normas": despliegan su submenú al pulsarlos. El propio
   submenú se cierra desde lore.js/rules.js/personajes.js cuando se elige
   una opción.
--------------------------------------------------- */
export function initMenuToggle(toggleId, submenuId) {
  const toggle = document.getElementById(toggleId);
  const submenu = document.getElementById(submenuId);
  if (!toggle || !submenu) return;

  toggle.addEventListener('click', () => {
    const isOpen = submenu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
}

export function closeMenuToggle(toggleId, submenuId) {
  const toggle = document.getElementById(toggleId);
  const submenu = document.getElementById(submenuId);
  if (!toggle || !submenu) return;
  submenu.classList.remove('is-open');
  toggle.setAttribute('aria-expanded', 'false');
}
