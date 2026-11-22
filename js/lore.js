// ======================================================
// Lore: visor de pases (los textos viven en js/data/lore.js)
// ======================================================

import { LORE_BY_LANGUAGE } from './data/lore.js';
import { duckStaticAudio, restoreStaticAudio, playStingerNow } from './audio.js';
import { channelSwitch, closeMenuToggle, isView, setView } from './views.js';
import { isTypingOrMediaTarget } from './utils.js';
import { getLanguage, onLanguageChange, t } from './i18n.js';
import { airedTrack, formatRemaining } from './lore-schedule.js';

function buildLoreSlideElement(slide) {
  const el = document.createElement('div');
  el.className = 'lore-slide';

  if (slide.type === 'title') {
    el.innerHTML = '<h2 class="lore-slide-title glitch" data-text="𝙽𝚘𝚟𝚊ᏕᎷᎮ ²⁰⁵⁵">𝙽𝚘𝚟𝚊ᏕᎷᎮ ²⁰⁵⁵</h2>';
  } else if (slide.type === 'image') {
    el.classList.add('lore-slide-image');
    const img = document.createElement('img');
    img.className = 'lore-slide-img';
    img.src = slide.src;
    img.alt = slide.alt || '';
    el.appendChild(img);
  } else if (slide.type === 'video') {
    el.classList.add('lore-slide-video');
    const video = document.createElement('video');
    video.className = 'lore-slide-video-el';
    video.src = slide.src;
    // Solo los metadatos hasta que se pulse play: el vídeo pesa ~11 MB y no
    // hace falta descargarlo entero por pasar por el pase.
    video.preload = 'metadata';
    if (slide.poster) video.poster = slide.poster;
    video.controls = true;
    video.playsInline = true;
    // Mientras el vídeo suena o está en pantalla completa, se baja a 0 la
    // estática/glitches de fondo para que se oiga mejor; al pausarlo o
    // salir de pantalla completa, vuelve a subir.
    const syncStaticWithVideo = () => {
      if (!video.paused || document.fullscreenElement === video) {
        duckStaticAudio();
      } else {
        restoreStaticAudio();
      }
    };
    video.addEventListener('play', syncStaticWithVideo);
    video.addEventListener('pause', syncStaticWithVideo);
    video.addEventListener('ended', syncStaticWithVideo);
    video.addEventListener('fullscreenchange', syncStaticWithVideo);
    video.addEventListener('webkitfullscreenchange', syncStaticWithVideo);
    el.appendChild(video);
  } else if (slide.type === 'reveal') {
    el.classList.add('lore-slide-reveal');
    const img = document.createElement('img');
    img.className = 'lore-reveal-img';
    img.src = slide.src;
    img.alt = slide.alt || '';
    const p = document.createElement('p');
    p.className = 'lore-reveal-text glitch';
    p.dataset.text = slide.text;
    p.textContent = slide.text;
    el.appendChild(img);
    el.appendChild(p);
  } else if (slide.type === 'chat') {
    // Conversación: cada línea en el color de quien habla (ver lore.es.js).
    el.classList.add('lore-slide-chat');
    for (const line of slide.lines) {
      const p = document.createElement('p');
      p.className = `lore-chat-line lore-chat-${line.who}`;
      p.textContent = line.text;
      el.appendChild(p);
    }
    if (slide.note) {
      const note = document.createElement('p');
      note.className = 'lore-chat-note';
      note.textContent = slide.note;
      el.appendChild(note);
    }
  } else {
    el.classList.add('lore-slide-text');
    if (slide.centered) el.classList.add('is-centered');
    const heading = slide.heading ? `<h2 class="lore-chapter-heading">${slide.heading}</h2>` : '';
    const paragraphs = slide.paragraphs
      .map((p) => {
        const text = typeof p === 'string' ? p : p.text;
        const emphasis = typeof p === 'object' && p.emphasis;
        return `<p class="lore-paragraph${emphasis ? ' lore-paragraph-emphasis' : ''}">${text}</p>`;
      })
      .join('');
    el.innerHTML = heading + paragraphs;
  }

  return el;
}

// Pantalla de estática que ocupa el sitio del siguiente pase mientras no se
// ha emitido (ver js/lore-schedule.js). La cuenta atrás la rellena initLore.
function buildUpcomingSlideElement() {
  const el = document.createElement('div');
  el.className = 'lore-slide lore-slide-upcoming';
  const label = t('lore.upcoming');
  el.innerHTML = `
    <div class="lore-upcoming-static" aria-hidden="true"></div>
    <p class="lore-upcoming-label glitch"></p>
    <p class="lore-upcoming-timer" role="timer"></p>
    <p class="lore-upcoming-date"></p>`;
  const labelEl = el.querySelector('.lore-upcoming-label');
  labelEl.textContent = label;
  labelEl.dataset.text = label;
  return el;
}

// "1 dic, 20:00 UTC · En tu hora: 1 dic, 21:00 CET" (igual que la cuenta
// atrás de los eventos).
function formatAirDate(ms) {
  const base = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
  const date = new Date(ms);
  const utc = new Intl.DateTimeFormat(getLanguage(), { ...base, timeZone: 'UTC' }).format(date);
  const local = new Intl.DateTimeFormat(getLanguage(), { ...base, timeZoneName: 'short' }).format(date);
  return t('countdown.date', { utc, local });
}

// Nombre del botón de cada pista con fecha (data-track en el HTML) una vez emitida.
const TRACK_LABELS = { templos: () => t('menu.loreTemplos') };

export function initLore() {
  const antesBtn = document.getElementById('lore-antes-btn');
  const novaBtn = document.getElementById('lore-nova-btn');
  const loreBackBtn = document.getElementById('lore-back-btn');
  const lorePage = document.getElementById('lore-page');
  const loreSlidesEl = document.getElementById('lore-slides');
  const prevBtn = document.getElementById('lore-prev-btn');
  const nextBtn = document.getElementById('lore-next-btn');
  const progressEl = document.getElementById('lore-progress');
  if (!antesBtn || !novaBtn || !loreBackBtn || !lorePage || !loreSlidesEl || !prevBtn || !nextBtn || !progressEl)
    return;

  // El Lore del idioma actual (el español si faltara alguno).
  const tracks = () => LORE_BY_LANGUAGE[getLanguage()] || LORE_BY_LANGUAGE.es;
  let currentKey = 'nova';
  let currentSlide = 0;
  // Lo que se ve de la pista: los pases ya emitidos y, si queda alguno por
  // emitir, la fecha del siguiente (que se pinta como un pase más al final).
  let currentTrack = [];
  let nextAir = null;
  let upcomingTimer = null;
  const lastIndex = () => currentTrack.length - (nextAir === null ? 1 : 0);

  const tickUpcoming = (timerEl) => {
    clearTimeout(upcomingTimer);
    const left = nextAir - Date.now();
    if (left <= 0) {
      // Ya se ha emitido: el pase nuevo ocupa el sitio de la estática.
      renderSlide(currentSlide);
      return;
    }
    timerEl.textContent = t('lore.upcomingIn', { time: formatRemaining(left) });
    // Al siguiente cambio de segundo (no cada 1000 ms fijos, que se desfasa).
    upcomingTimer = setTimeout(() => tickUpcoming(timerEl), (left % 1000) + 20);
  };

  const renderSlide = (index) => {
    clearTimeout(upcomingTimer);
    restoreStaticAudio(); // por si se cambia de pase con un vídeo aún sonando
    ({ slides: currentTrack, next: nextAir } = airedTrack(tracks()[currentKey], Date.now()));
    loreSlidesEl.innerHTML = '';

    if (index >= currentTrack.length) {
      const el = buildUpcomingSlideElement();
      el.querySelector('.lore-upcoming-date').textContent = formatAirDate(nextAir);
      loreSlidesEl.appendChild(el);
      tickUpcoming(el.querySelector('.lore-upcoming-timer'));
      progressEl.textContent = t('lore.upcomingProgress');
    } else {
      loreSlidesEl.appendChild(buildLoreSlideElement(currentTrack[index]));
      if (currentTrack[index].type === 'reveal') playStingerNow(0.16);
      progressEl.textContent = `${index + 1} / ${currentTrack.length}`;
    }

    prevBtn.classList.toggle('is-hidden', index === 0);
    nextBtn.textContent = index === lastIndex() ? t('lore.backToStart') : t('lore.next');

    lorePage.scrollTop = 0;
  };

  // La vista se alterna con data-view en <body> (CSS usa "visibility", nunca
  // "display"), así que al volver del Lore la intro no repite su animación:
  // se queda tal y como estaba, ya asentada.
  const switchTo = (showLore, trackKey) =>
    channelSwitch(() => {
      if (showLore) {
        currentKey = trackKey;
        currentSlide = 0;
        renderSlide(currentSlide);
        setView('lore');
      } else {
        clearTimeout(upcomingTimer);
        loreSlidesEl.innerHTML = ''; // corta el vídeo si seguía sonando
        restoreStaticAudio();
        setView('home');
      }
    });

  const goNext = () => {
    if (currentSlide >= lastIndex()) {
      switchTo(false);
      return;
    }
    currentSlide += 1;
    renderSlide(currentSlide);
  };

  const goPrev = () => {
    if (currentSlide === 0) return;
    currentSlide -= 1;
    renderSlide(currentSlide);
  };

  antesBtn.addEventListener('click', () => {
    closeMenuToggle('lore-menu-btn', 'lore-submenu');
    switchTo(true, 'antes');
  });
  novaBtn.addEventListener('click', () => {
    closeMenuToggle('lore-menu-btn', 'lore-submenu');
    switchTo(true, 'nova');
  });
  loreBackBtn.addEventListener('click', () => switchTo(false));

  // Botones de pistas con fecha de emisión (data-track, p.ej. Los 3 templos):
  // desactivados y con la cuenta atrás hasta que se emite su primer pase.
  for (const btn of document.querySelectorAll('#lore-submenu [data-track]')) {
    const key = btn.dataset.track;
    const labelEl = btn.querySelector('.lore-btn-label');
    const countdownEl = btn.querySelector('.lore-btn-countdown');
    let timer = null;
    const tick = () => {
      clearTimeout(timer);
      const { slides, next } = airedTrack(tracks()[key], Date.now());
      const aired = slides.length > 0;
      btn.disabled = !aired;
      labelEl.textContent = aired ? TRACK_LABELS[key]() : t('lore.upcoming');
      countdownEl.hidden = aired;
      if (aired) return;
      const left = next - Date.now();
      countdownEl.textContent = formatRemaining(left);
      timer = setTimeout(tick, (left % 1000) + 20);
    };
    btn.addEventListener('click', () => {
      closeMenuToggle('lore-menu-btn', 'lore-submenu');
      switchTo(true, key);
    });
    onLanguageChange(tick);
    // Al volver a la pestaña, al momento (los temporizadores van con retraso en segundo plano).
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) tick();
    });
    tick();
  }
  nextBtn.addEventListener('click', goNext);
  prevBtn.addEventListener('click', goPrev);

  document.addEventListener('keydown', (e) => {
    if (!isView('lore')) return;
    if (e.key === 'Escape') {
      switchTo(false);
      return;
    }
    // Con el foco en el vídeo, espacio/flechas son suyos (pausar, avanzar
    // unos segundos), no del visor de pases.
    if (isTypingOrMediaTarget(e.target)) return;
    // Con el foco en un botón, el propio botón ya se activa con espacio: si
    // además se llamara a goNext() se pasaría de pase dos veces.
    if (e.key === ' ' && e.target instanceof Element && e.target.closest('button')) return;

    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      goNext();
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    }
  });
}
