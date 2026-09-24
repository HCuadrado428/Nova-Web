// ======================================================
// Idiomas: español, inglés y portugués
// ======================================================
//
// Todos los textos de la web viven en los diccionarios de js/i18n/ (uno por
// idioma, con las mismas claves) y el Lore en js/data/lore.<idioma>.js.
//
// En el HTML, cada elemento traducible lleva su clave:
//   data-i18n="clave"            -> se cambia su texto
//   data-i18n-html="clave"       -> se cambia su HTML (solo textos nuestros, p.ej. <strong>)
//   data-i18n-attr="placeholder:clave|aria-label:otra"  -> se cambian atributos
// El texto en español se deja también escrito en el HTML, como respaldo.
//
// Desde JS: t('clave') devuelve el texto en el idioma actual, y
// t('clave', { n: 5 }) sustituye {n}. Si una clave faltara en un idioma, se
// usa la española.
//
// Idioma inicial: el que eligió la persona la última vez (localStorage); si
// no, el del navegador; si no es ninguno de los tres, español.

import en from './i18n/en.js';
import es from './i18n/es.js';
import pt from './i18n/pt.js';
import { storageGet, storageSet } from './utils.js';

export const LANGUAGES = { es, en, pt };
export const DEFAULT_LANGUAGE = 'es';
const STORAGE_KEY = 'nova_lang';

function detectLanguage() {
  const saved = storageGet(STORAGE_KEY);
  if (saved && LANGUAGES[saved]) return saved;
  for (const tag of navigator.languages || [navigator.language || '']) {
    const base = String(tag).toLowerCase().split('-')[0];
    if (LANGUAGES[base]) return base;
  }
  return DEFAULT_LANGUAGE;
}

let current = detectLanguage();
const listeners = [];

export const getLanguage = () => current;

// Valor tal cual del diccionario (puede ser una lista, p.ej. las frases de Adán).
export function tRaw(key) {
  const own = LANGUAGES[current][key];
  return own !== undefined ? own : LANGUAGES[DEFAULT_LANGUAGE][key];
}

export function t(key, params) {
  const value = tRaw(key);
  if (typeof value !== 'string') return key; // clave inexistente: se ve la clave, así se nota
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

export function applyTranslations(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) {
    const text = t(el.dataset.i18n);
    el.textContent = text;
    // El efecto glitch repite el texto en ::before/::after desde data-text.
    if (el.classList.contains('glitch')) el.dataset.text = text;
  }
  for (const el of root.querySelectorAll('[data-i18n-html]')) {
    el.innerHTML = t(el.dataset.i18nHtml);
  }
  for (const el of root.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr.split('|')) {
      const [attr, key] = pair.split(':');
      el.setAttribute(attr.trim(), t(key.trim()));
    }
  }
  if (root === document) {
    document.documentElement.lang = current;
    document.title = t('meta.title');
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'));
    for (const btn of document.querySelectorAll('[data-lang]')) {
      btn.setAttribute('aria-pressed', String(btn.dataset.lang === current));
    }
  }
}

// Para los módulos que pintan textos desde JS (botones con estado, avisos...):
// se les avisa al cambiar de idioma para que los vuelvan a pintar.
export function onLanguageChange(fn) {
  listeners.push(fn);
}

export function setLanguage(lang) {
  if (!LANGUAGES[lang] || lang === current) return;
  current = lang;
  storageSet(STORAGE_KEY, lang);
  applyTranslations();
  for (const fn of listeners) fn(lang);
}

// Botones "ES · EN · PT" (cualquier elemento con data-lang="..").
export function initLanguageSwitch() {
  for (const btn of document.querySelectorAll('[data-lang]')) {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  }
  applyTranslations();
}
