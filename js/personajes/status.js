// ======================================================
// Personajes: estado (vivo, desaparecido o caído) y Memorial
// ======================================================
//
// Cada jugador marca en su ficha cómo está su personaje. "Vivo" es lo normal
// y no se guarda (el campo `estado` queda en null); "desaparecido" y "caído"
// sí. Los caídos pueden llevar la fecha de la caída (`caidoEl`, día sin hora:
// 'AAAA-MM-DD') y un epitafio, y salen en la página Memorial.
// Sin DOM: se prueba en tests/status.test.js.

export const ESTADOS = ['desaparecido', 'caido']; // los que se guardan, los mismos que en firestore.rules
export const EPITAFIO_MAX = 140; // el mismo máximo que en firestore.rules

// El estado de una ficha, o null si está vivo (o el valor no es uno conocido).
export const estadoOf = (data) => (ESTADOS.includes(data?.estado) ? data.estado : null);

// 'AAAA-MM-DD' con una fecha que existe de verdad (no '2026-02-31').
export function isFechaValida(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

// personajes: [{ id, data }] (la caché del directorio).
// Devuelve los caídos para el Memorial: la caída más reciente primero, y los
// que no tienen fecha al final, por nombre.
export function listCaidos(personajes) {
  return personajes
    .filter(({ data }) => estadoOf(data) === 'caido')
    .sort((x, y) => {
      const fx = isFechaValida(x.data.caidoEl) ? x.data.caidoEl : '';
      const fy = isFechaValida(y.data.caidoEl) ? y.data.caidoEl : '';
      if (fx !== fy) return fy.localeCompare(fx); // '' (sin fecha) queda la última
      return (x.data.nombre || '').localeCompare(y.data.nombre || '');
    });
}

// Fecha de la caída para mostrarla en el idioma de la web ("3 oct 2026").
// Es un día sin hora, así que se formatea en UTC para que no cambie de día
// según la zona horaria de quien mira.
export function formatFechaCaida(value, lang) {
  if (!isFechaValida(value)) return '';
  return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00Z`),
  );
}
