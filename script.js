// ======================================================
// NOVA 2 — Script principal (JS vanilla, sin dependencias)
// ======================================================

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initNews();
  initGallery();
  initDayCounter();
  initScrollReveal();
  initFooterYear();
});

/* ---------------------------------------------------
   Menú hamburguesa (nav responsive)
--------------------------------------------------- */
function initNav() {
  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('main-nav');
  if (!hamburger || !nav) return;

  hamburger.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });

  // Cierra el menú al pulsar un enlace (útil en móvil)
  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ---------------------------------------------------
   Noticias
   Edita este array para añadir, quitar o modificar noticias.
   No hace falta tocar el HTML.
--------------------------------------------------- */
const newsItems = [
  // Añade aquí tus noticias como objetos { title, date, excerpt }, por ejemplo:
  // { title: '¡Arranca NOVA 2!', date: '01 Sep 2026', excerpt: 'La segunda temporada ya está en marcha.' },
];

function initNews() {
  const grid = document.getElementById('news-grid');
  if (!grid) return;

  if (newsItems.length === 0) {
    grid.innerHTML = '<p class="news-empty">Aún no hay noticias.</p>';
    return;
  }

  grid.innerHTML = newsItems
    .map(
      (item) => `
      <article class="news-card">
        <span class="news-date">${item.date}</span>
        <h3 class="news-title">${item.title}</h3>
        <p class="news-excerpt">${item.excerpt}</p>
      </article>
    `
    )
    .join('');
}

/* ---------------------------------------------------
   Galería + lightbox
--------------------------------------------------- */
function initGallery() {
  const items = document.querySelectorAll('.gallery-item');
  const lightbox = document.getElementById('lightbox');
  const closeBtn = document.getElementById('lightbox-close');
  const caption = document.getElementById('lightbox-caption');
  if (!items.length || !lightbox || !closeBtn || !caption) return;

  const openLightbox = (text) => {
    caption.textContent = text;
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
  };
  const closeLightbox = () => {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
  };

  items.forEach((item) => {
    item.addEventListener('click', () => openLightbox(item.dataset.caption || ''));
  });
  closeBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
}

/* ---------------------------------------------------
   Cuenta regresiva hasta el lanzamiento de NOVA 2
   Cambia START_DATE por la fecha/hora real de inicio de la temporada.
   Mientras falte, se actualiza en tiempo real (cada segundo). En cuanto
   se cumpla, cambia automáticamente a contar los días ya transcurridos.
--------------------------------------------------- */
function initDayCounter() {
  const el = document.getElementById('day-counter');
  if (!el) return;

  const START_DATE = new Date('2026-09-06T22:00:00');
  const pad = (n) => String(n).padStart(2, '0');

  const tick = () => {
    const diff = START_DATE - new Date();

    if (diff > 0) {
      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      el.textContent = `Faltan ${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s para el lanzamiento de NOVA 2`;
    } else {
      const elapsedDays = Math.floor(-diff / 86400000);
      el.textContent = `Día ${elapsedDays} desde que empezó NOVA 2`;
    }
  };

  tick();
  setInterval(tick, 1000);
}

/* ---------------------------------------------------
   Animación fade-in al hacer scroll
--------------------------------------------------- */
function initScrollReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  if (!('IntersectionObserver' in window)) {
    targets.forEach((t) => t.classList.add('in-view'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  targets.forEach((t) => observer.observe(t));
}

/* ---------------------------------------------------
   Año automático en el footer
--------------------------------------------------- */
function initFooterYear() {
  const el = document.getElementById('current-year');
  if (el) el.textContent = new Date().getFullYear();
}
