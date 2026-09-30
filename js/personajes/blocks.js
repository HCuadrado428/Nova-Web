// ======================================================
// Personajes: bloques del perfil (texto, imagen, Spotify, relación)
// ======================================================

function spotifyUrlToEmbed(url) {
  const match = /open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/.exec(
    url || '',
  );
  if (!match) return null;
  return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
}

// Pinta un bloque de personaje (texto/imagen/spotify/relación) para la
// vista de perfil (solo lectura). `options.onRelacionClick(uid)` navega al
// personaje enlazado; `options.lookupFoto(uid)` le da su foto si ya está en
// el directorio cargado. Ninguna de las dos hace falta fuera de un bloque
// de tipo relación.
export function buildPersonajeBlockElement(bloque, options = {}) {
  const wrap = document.createElement('div');
  wrap.className = `personaje-block personaje-block-${bloque.tipo}`;

  if (bloque.tipo === 'texto') {
    const p = document.createElement('p');
    p.className = 'personaje-block-texto-text';
    p.textContent = bloque.contenido;
    wrap.appendChild(p);
  } else if (bloque.tipo === 'imagen') {
    const img = document.createElement('img');
    img.className = 'personaje-block-imagen-img';
    img.src = bloque.contenido;
    img.alt = '';
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      wrap.hidden = true;
    });
    wrap.appendChild(img);
  } else if (bloque.tipo === 'spotify') {
    const embedUrl = spotifyUrlToEmbed(bloque.contenido);
    if (!embedUrl) {
      wrap.hidden = true;
    } else {
      const iframe = document.createElement('iframe');
      iframe.className = 'personaje-block-spotify-frame';
      iframe.src = embedUrl;
      iframe.width = '100%';
      iframe.height = '152';
      iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      iframe.loading = 'lazy';
      wrap.appendChild(iframe);
    }
  } else if (bloque.tipo === 'relacion') {
    if (!bloque.uid || !bloque.nombre) {
      wrap.hidden = true;
    } else {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'personaje-block-relacion-card';

      const foto = options.lookupFoto ? options.lookupFoto(bloque.uid) : null;
      if (foto) {
        const img = document.createElement('img');
        img.className = 'personaje-block-relacion-photo';
        img.src = foto;
        img.alt = '';
        img.loading = 'lazy';
        img.addEventListener('error', () => img.remove());
        card.appendChild(img);
      }

      const info = document.createElement('span');
      info.className = 'personaje-block-relacion-info';
      const nombreEl = document.createElement('strong');
      nombreEl.textContent = bloque.nombre;
      info.appendChild(nombreEl);
      if (bloque.etiqueta) {
        const etiquetaEl = document.createElement('span');
        etiquetaEl.className = 'personaje-block-relacion-etiqueta';
        etiquetaEl.textContent = bloque.etiqueta;
        info.appendChild(etiquetaEl);
      }
      card.appendChild(info);

      card.addEventListener('click', () => {
        if (options.onRelacionClick) options.onRelacionClick(bloque.uid);
      });
      wrap.appendChild(card);
    }
  }

  return wrap;
}
