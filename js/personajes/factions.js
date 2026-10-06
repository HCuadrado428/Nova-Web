// ======================================================
// Personajes: facciones
// ======================================================
//
// Cada jugador escribe la facción de su personaje en su ficha (texto libre,
// campo `faccion`), así que las facciones las crean los propios jugadores:
// basta con que dos fichas pongan el mismo nombre para que salgan juntas.
// Se comparan sin mayúsculas ni tildes ("Reino del Norte" = "reino del norte").
// Sin DOM: se prueba en tests/factions.test.js.

import { normalizeSearchTerm } from '../utils.js';

export const FACTION_MAX = 40; // el mismo máximo que en firestore.rules

// Colores para distinguir facciones (en el árbol y en las fichas). Se reparten
// por orden alfabético, así que una facción no cambia de color por tener más
// o menos miembros.
const COLORS = ['#ff2e63', '#37f0e0', '#f5c542', '#2ecc71', '#a66cff', '#ff8a3d', '#4da3ff', '#ff6fd8'];

export const factionKey = (name) => normalizeSearchTerm(name || '');

// personajes: [{ id, data }] (la caché del directorio, la más reciente primero).
// Devuelve [{ key, name, count, color }], las más numerosas primero. Si se
// escribe de varias formas ("Reino del Norte", "reino del norte"), se muestra
// la más usada y, si empatan, la de la ficha que lleva más tiempo sin cambiar
// (la última de la lista): así no cambia cada vez que alguien la escribe mal.
export function listFactions(personajes) {
  const byKey = new Map();
  for (const { data } of personajes) {
    const name = (data.faccion || '').trim().replace(/\s+/g, ' ');
    const key = factionKey(name);
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, { key, count: 0, spellings: new Map() });
    const f = byKey.get(key);
    f.count += 1;
    f.spellings.set(name, (f.spellings.get(name) || 0) + 1);
  }
  const alphabetical = [...byKey.keys()].sort((a, b) => a.localeCompare(b));
  return [...byKey.values()]
    .map(({ key, count, spellings }) => {
      let name = '';
      let best = 0;
      for (const [spelling, n] of spellings) {
        if (n >= best) [name, best] = [spelling, n];
      }
      return { key, name, count, color: COLORS[alphabetical.indexOf(key) % COLORS.length] };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
