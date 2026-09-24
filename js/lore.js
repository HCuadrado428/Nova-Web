// ======================================================
// Lore: visor de pases (los textos viven en js/data/lore.js)
// ======================================================

import { LORE_TRACKS } from './data/lore.js';
import { duckStaticAudio, restoreStaticAudio, playStingerNow } from './audio.js';
import { channelSwitch, closeMenuToggle, isView, setView } from './views.js';
import { isTypingOrMediaTarget } from './utils.js';

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
    // Solo los metadatos hasta que se pulse play: el vídeo pesa ~20 MB y no
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

  let currentTrack = LORE_TRACKS.nova;
  let currentSlide = 0;

  const renderSlide = (index) => {
    restoreStaticAudio(); // por si se cambia de pase con un vídeo aún sonando
    loreSlidesEl.innerHTML = '';
    loreSlidesEl.appendChild(buildLoreSlideElement(currentTrack[index]));

    if (currentTrack[index].type === 'reveal') playStingerNow(0.16);

    prevBtn.classList.toggle('is-hidden', index === 0);
    nextBtn.textContent = index === currentTrack.length - 1 ? 'Volver al inicio' : 'Siguiente →';
    progressEl.textContent = `${index + 1} / ${currentTrack.length}`;

    lorePage.scrollTop = 0;
  };

  // La vista se alterna con data-view en <body> (CSS usa "visibility", nunca
  // "display"), así que al volver del Lore la intro no repite su animación:
  // se queda tal y como estaba, ya asentada.
  const switchTo = (showLore, trackKey) =>
    channelSwitch(() => {
      if (showLore) {
        currentTrack = LORE_TRACKS[trackKey];
        currentSlide = 0;
        renderSlide(currentSlide);
        setView('lore');
      } else {
        loreSlidesEl.innerHTML = ''; // corta el vídeo si seguía sonando
        restoreStaticAudio();
        setView('home');
      }
    });

  const goNext = () => {
    if (currentSlide >= currentTrack.length - 1) {
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
