// ======================================================
// NOVA 2 — Script principal (JS vanilla, sin dependencias)
// ======================================================

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initNews();
  initServerStatus();
  initCopyIp();
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
  {
    title: '¡Arranca NOVA 2!',
    date: '01 Sep 2026',
    excerpt: 'La segunda temporada del SMP ya está en marcha. Nuevo mundo, nuevos mods y una historia por escribir entre todos.',
  },
  {
    title: 'Nueva zona de rol: el Bosque Susurrante',
    date: '15 Sep 2026',
    excerpt: 'Se ha habilitado una nueva región para eventos de rol, con misiones y NPCs preparados por el equipo de builders.',
  },
  {
    title: 'Actualización de reglas de construcción',
    date: '28 Sep 2026',
    excerpt: 'Revisamos las normas de construcción para mantener la coherencia visual de cada región. Consulta la sección de Reglas.',
  },
];

function initNews() {
  const grid = document.getElementById('news-grid');
  if (!grid) return;

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
   Estado del servidor
   Por ahora está SIMULADO. Para conectarlo a datos reales:
   1) Usa la API pública de mcsrvstat.us, por ejemplo:
        fetch('https://api.mcsrvstat.us/3/play.nova2.net')
          .then((res) => res.json())
          .then((data) => {
            // data.online -> boolean
            // data.players.online -> número de jugadores conectados
          });
   2) Sustituye la IP 'play.nova2.net' de abajo (y en el HTML) por la IP real.
   3) Reemplaza la simulación de setTimeout por la llamada fetch de arriba.
--------------------------------------------------- */
function initServerStatus() {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  const players = document.getElementById('player-count');
  if (!dot || !text || !players) return;

  // Simulación: tras un breve "chequeo", mostramos el server como online.
  setTimeout(() => {
    const isOnline = true; // <- cambia esto para probar el estado offline
    dot.classList.add(isOnline ? 'online' : 'offline');
    text.textContent = isOnline ? 'Servidor online' : 'Servidor offline';
    players.textContent = isOnline ? Math.floor(Math.random() * 12) + 3 : 0;
  }, 900);
}

/* ---------------------------------------------------
   Botón "Copiar IP"
--------------------------------------------------- */
function initCopyIp() {
  const btn = document.getElementById('copy-ip-btn');
  const ipEl = document.getElementById('server-ip');
  if (!btn || !ipEl) return;

  btn.addEventListener('click', async () => {
    const ip = ipEl.textContent.trim();
    try {
      await navigator.clipboard.writeText(ip);
    } catch (err) {
      // Fallback para navegadores sin soporte de Clipboard API
      const helper = document.createElement('textarea');
      helper.value = ip;
      document.body.appendChild(helper);
      helper.select();
      document.execCommand('copy');
      document.body.removeChild(helper);
    }
    const original = btn.textContent;
    btn.textContent = '¡Copiado!';
    setTimeout(() => { btn.textContent = original; }, 1600);
  });
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
   Contador de días desde que empezó NOVA 2
   Cambia START_DATE por la fecha real de inicio de la temporada.
--------------------------------------------------- */
function initDayCounter() {
  const el = document.getElementById('day-counter');
  if (!el) return;

  const START_DATE = new Date('2026-09-01T00:00:00');
  const now = new Date();
  const diffDays = Math.max(0, Math.floor((now - START_DATE) / (1000 * 60 * 60 * 24)));

  el.textContent = `Día ${diffDays} desde que empezó NOVA 2`;
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
