// ======================================================
// Calendario de eventos del servidor (cuenta atrás de la intro)
// ======================================================
//
// La intro muestra siempre la cuenta atrás del SIGUIENTE evento de esta lista.
// Cuando llega la hora, sale "¡Ha llegado la hora!" durante las horas que dure
// el evento (`hours`, 3 si no se pone) y después pasa sola al siguiente. Si no
// queda ninguno, la cuenta atrás desaparece.
//
// Para añadir un evento basta con una línea más. `start` va SIEMPRE en UTC
// (la "Z" del final), para que sea la misma hora en todo el mundo:
//   22:00 en España en verano (CEST, UTC+2) = 20:00Z
//   22:00 en España en invierno (CET, UTC+1, desde el 25 oct) = 21:00Z
// El nombre es propio del evento y no se traduce. Los eventos pasados se pueden
// dejar en la lista (no se muestran); Be The Boss lo usan los tests e2e.

export const EVENTS = [{ name: 'Be The Boss', start: '2026-10-10T20:00:00Z', hours: 3 }];
