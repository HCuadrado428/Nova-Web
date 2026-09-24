// Comprueba que las traducciones están completas y cuadran entre sí.
// No necesita navegador ni emuladores: npm run test:unit
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { LORE_BY_LANGUAGE } from '../js/data/lore.js';
import en from '../js/i18n/en.js';
import es from '../js/i18n/es.js';
import pt from '../js/i18n/pt.js';

const ROOT = join(import.meta.dirname, '..');
const OTHERS = { en, pt };

const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const countTags = (text) => (text.match(/<\/?strong>/g) || []).length;
const kind = (value) => (Array.isArray(value) ? 'lista' : typeof value);

describe('diccionarios', () => {
  for (const [lang, dict] of Object.entries(OTHERS)) {
    test(`${lang}.js tiene exactamente las mismas claves que es.js`, () => {
      const missing = Object.keys(es).filter((k) => !(k in dict));
      const extra = Object.keys(dict).filter((k) => !(k in es));
      assert.deepEqual({ missing, extra }, { missing: [], extra: [] });
    });

    test(`${lang}.js: mismo tipo, mismos {huecos} y mismos <strong> que es.js`, () => {
      for (const [key, value] of Object.entries(es)) {
        const other = dict[key];
        assert.equal(kind(other), kind(value), `${key}: tipo distinto`);
        if (typeof value === 'string') {
          assert.deepEqual(placeholders(other), placeholders(value), `${key}: {huecos} distintos`);
          assert.equal(countTags(other), countTags(value), `${key}: <strong> distintos`);
          assert.ok(other.trim(), `${key}: vacío`);
        }
      }
    });

    test(`${lang}.js: frases de Adán completas`, () => {
      assert.equal(dict['adan.phrases'].length, es['adan.phrases'].length);
      for (const entry of [...dict['adan.phrases'], dict['adan.returnPhrase'], dict['adan.thirdPhrase']]) {
        assert.ok(entry.phrase && entry.response, JSON.stringify(entry));
      }
    });
  }
});

describe('Lore', () => {
  const shape = (tracks) =>
    Object.fromEntries(
      Object.entries(tracks).map(([name, slides]) => [
        name,
        slides.map((s) => ({
          type: s.type,
          src: s.src,
          poster: s.poster,
          heading: s.heading,
          centered: s.centered,
          hasAlt: !!s.alt,
          hasText: !!s.text,
          paragraphs: s.paragraphs?.map((p) => (typeof p === 'string' ? 'normal' : 'destacado')),
        })),
      ]),
    );

  for (const lang of Object.keys(OTHERS)) {
    test(`lore.${lang}.js tiene los mismos pases, imágenes y párrafos que lore.es.js`, () => {
      assert.deepEqual(shape(LORE_BY_LANGUAGE[lang]), shape(LORE_BY_LANGUAGE.es));
    });
  }
});

describe('claves usadas en la web', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');

  test('todas las claves del HTML existen', () => {
    const keys = [
      ...[...html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)].map((m) => m[1]),
      ...[...html.matchAll(/data-i18n-attr="([^"]+)"/g)].flatMap((m) => m[1].split('|').map((p) => p.split(':')[1])),
    ];
    assert.ok(keys.length > 50, 'no se encontraron claves en el HTML');
    assert.deepEqual(
      keys.filter((k) => !(k in es)),
      [],
    );
  });

  test("todas las claves de t('...') en el JS existen", () => {
    const jsDir = join(ROOT, 'js');
    // i18n.js se salta: es donde se define t() y sus comentarios traen ejemplos.
    const files = readdirSync(jsDir).filter((f) => f.endsWith('.js') && f !== 'i18n.js');
    const missing = [];
    for (const file of files) {
      const code = readFileSync(join(jsDir, file), 'utf8');
      for (const m of code.matchAll(/\bt(?:Raw)?\(\s*'([\w.]+)'/g)) {
        if (!(m[1] in es)) missing.push(`${file}: ${m[1]}`);
      }
    }
    assert.deepEqual(missing, []);
  });

  test('el español escrito en el HTML coincide con es.js', () => {
    // El HTML lleva el texto en español como respaldo: si alguien lo cambia
    // ahí pero no en es.js (o al revés), la web mostraría uno u otro.
    const decode = (s) =>
      s
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&');
    const differ = [];
    let compared = 0;
    for (const m of html.matchAll(/<(\w+)[^>]*\sdata-i18n(-html)?="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g)) {
      const [, , isHtml, key, content] = m;
      compared += 1;
      const expected = isHtml ? es[key] : decode(es[key]);
      if (decode(content.trim()) !== decode(expected)) differ.push(`${key}: "${content.trim()}" ≠ "${es[key]}"`);
    }
    assert.ok(compared > 50, `solo se compararon ${compared} textos`);
    assert.deepEqual(differ, []);
  });
});
