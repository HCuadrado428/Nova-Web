// ======================================================
// NOVA 2 — Script principal (JS vanilla, sin dependencias)
// ======================================================

document.addEventListener('DOMContentLoaded', () => {
  initDayCounter();
  initEnterGate();
  initLore();
  initFinaleSequence();
});

/* 06/09/2026 22:00, hora de España peninsular (CEST, UTC+2 en esa fecha) = 20:00 UTC.
   Se fija como instante UTC para que el evento empiece a la vez para todo el mundo
   (Argentina, México, etc.), cada uno lo ve a su hora local correspondiente. */
const START_DATE = new Date('2026-09-06T20:00:00Z');
// 25 min después de empezar el evento, el título se rompe y aparece el botón final.
const EVENT_GLITCH_DATE = new Date(START_DATE.getTime() + 25 * 60 * 1000);

/* ---------------------------------------------------
   Pantalla de entrada
   El boot visual (CSS) empieza pausado en su primer fotograma;
   al tocar/pulsar se añade "booted" al body (arranca la animación
   desde cero) y se dispara el audio sincronizado del boot.
--------------------------------------------------- */
const BOOT_LINE_4_PHRASES = [
  '⋏⍜ ⎅⟒⏚⟒⍀í⏃⟟⌇ ⟒⌇⏁⏃⍀ ⏃⍾⎍í',
  '⟒⌇⏁⟒ ⋏⍜ ⟒⌇ ⎐⎍⟒⌇⏁⍀⍜ ⋔⎍⋏⎅⍜',
  '⌇⏃☊⏃⎅⋔⟒ ⎅⟒ ⏃⍾⎍í',
  '⎐⎍⟒⌇⏁⍀⍜ ⎎⟟⋏ ⟒⌇⏁⏃ ☊⟒⍀☊⏃',
  '⎐⍜⌰⎐⟒⎅ ⎅⟒ ⎅⍜⋏⎅⟒ ⎐⟒⋏í⌇',
  '⟒⌇⏁⟒ ⋏⍜ ⟒⌇ ⟒⌰ ⋔⎍⋏⎅⍜ ☌⎍⟒ ⍀⟒☊⎍⟒⍀⎅⍜',
  '⏃⌿⍜☊⏃⌰⟟⌿⌇⟟⌇ 1:3',
  '☊⍀⟒⟒⎅ ⊬ ⌿⟒⍀⟒☊⟒⎅',
  '☊⎍⏃⋏⏁⏃ ☌⟒⋏⏁⟒ ⊑⏃⏚⌰⏃ ⌿⍜⍀ ⏃☌⎍⟟?',
  '⊬⍜⎍ ⌰⍜⌇⏁ ⏁⊑⟒ ☌⏃⋔⟒',
  '⏁⟒⌇⏁⟟☊⎍⌰⏃⍀ ⏁⍜⍀⌇⟟⍜⋏',
  '⌿⍜⍀☌⎍⟒ ⍜⌇ ⊑⏃☊⟒⟟⌇ ⟒⌇⏁⍜',
];

// Variante "imagen" de la línea 4: en vez de frase, aparece esta imagen con un
// texto rojo debajo. Añade más objetos aquí para tener más imágenes en el sorteo
// (guarda cada archivo en images/creepy/).
const BOOT_LINE_4_IMAGES = [
  { src: 'images/creepy/eyes-1.jpg', caption: '⟟ ⌇⟒⟒ ⊬⍜⎍' },
];

function initEnterGate() {
  const gate = document.getElementById('enter-gate');
  const bootLine4 = document.getElementById('boot-line-4');
  const fullscreenImage = document.getElementById('boot-fullscreen-image');
  if (!gate) return;

  let entered = false;
  const enter = () => {
    if (entered) return;
    entered = true;

    if (bootLine4) {
      setBootLine4Variant(bootLine4, fullscreenImage);
    }

    gate.classList.add('hidden');
    gate.addEventListener('transitionend', () => gate.remove(), { once: true });
    document.body.classList.add('booted');

    playBootAudio();
  };

  gate.addEventListener('click', enter);
  gate.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      enter();
    }
  });

  document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('tab-hidden', document.hidden);
    if (!audioCtx) return;
    if (document.hidden) audioCtx.suspend();
    else audioCtx.resume();
  });
}

/* Sortea entre las frases (texto pequeño) y las imágenes creepy (foto a pantalla
   completa con texto grande) para la línea 4, todas con el mismo peso. */
function setBootLine4Variant(lineEl, fullscreenEl) {
  const totalVariants = BOOT_LINE_4_PHRASES.length + BOOT_LINE_4_IMAGES.length;
  const pick = Math.floor(Math.random() * totalVariants);

  lineEl.textContent = '';

  if (pick < BOOT_LINE_4_PHRASES.length) {
    lineEl.textContent = BOOT_LINE_4_PHRASES[pick];
    return;
  }

  if (!fullscreenEl) return;
  const variant = BOOT_LINE_4_IMAGES[pick - BOOT_LINE_4_PHRASES.length];
  const caption = fullscreenEl.querySelector('.boot-fullscreen-caption');

  fullscreenEl.style.backgroundImage = `url("${variant.src}")`;
  if (caption) caption.textContent = variant.caption;
  fullscreenEl.classList.add('active');
}

/* ---------------------------------------------------
   Sonido de estática y glitches (Web Audio API, sin archivos)
   Sigue aproximadamente las mismas curvas de opacidad que las
   animaciones CSS del boot (@keyframes intro-boot / intro-static-ambient).
--------------------------------------------------- */
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/* Bus único por el que pasa todo el audio generado (estática, glitches,
   stinger): así se puede bajar a 0 de golpe mientras se reproduce un vídeo
   del Lore, en vez de tener que silenciar cada sonido por separado. */
let staticBus = null;

function getStaticBus(ctx) {
  if (!staticBus) {
    staticBus = ctx.createGain();
    staticBus.gain.value = 1;
    staticBus.connect(ctx.destination);
  }
  return staticBus;
}

function duckStaticAudio() {
  if (!audioCtx || !staticBus) return;
  const now = audioCtx.currentTime;
  staticBus.gain.cancelScheduledValues(now);
  staticBus.gain.setTargetAtTime(0, now, 0.08);
}

function restoreStaticAudio() {
  if (!audioCtx || !staticBus) return;
  const now = audioCtx.currentTime;
  staticBus.gain.cancelScheduledValues(now);
  staticBus.gain.setTargetAtTime(1, now, 0.2);
}

function createNoiseBuffer(ctx, duration) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function playGlitchBlip(ctx, when, volume = 0.18) {
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 0.12);

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1200;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(volume, when + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);

  noise.connect(filter).connect(gain).connect(getStaticBus(ctx));
  noise.start(when);
  noise.stop(when + 0.13);
}

function scheduleAmbientGlitches(ctx, ambientGain) {
  const fire = () => {
    if (!audioCtx) return;
    const now = ctx.currentTime;
    playGlitchBlip(ctx, now, 0.12);

    ambientGain.gain.cancelScheduledValues(now);
    ambientGain.gain.setValueAtTime(0.025, now);
    ambientGain.gain.linearRampToValueAtTime(0.09, now + 0.05);
    ambientGain.gain.linearRampToValueAtTime(0.025, now + 0.35);

    setTimeout(fire, 4000 + Math.random() * 5000);
  };
  setTimeout(fire, 4000 + Math.random() * 3000);
}

function playStinger(ctx, when, volume = 0.14) {
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 0.3);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(900, when);
  filter.frequency.exponentialRampToValueAtTime(120, when + 0.3);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(volume, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.3);

  noise.connect(filter).connect(gain).connect(getStaticBus(ctx));
  noise.start(when);
  noise.stop(when + 0.32);
}

/* Tono limpio de "conexión establecida", para la revelación final de la IP:
   deliberadamente sin ruido, para que contraste con toda la estática previa.
   Va directo a ctx.destination (no pasa por el bus, que en ese momento está
   silenciado) para asegurarnos de que suena pase lo que pase. */
function playRevealTone(ctx) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(660, now + 0.5);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.1, now + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.9);
}

function playBootAudio() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Estática del arranque (0 - 2.2s): sigue la curva de @keyframes intro-boot
  const bootNoise = ctx.createBufferSource();
  bootNoise.buffer = createNoiseBuffer(ctx, 2.2);

  const bootFilter = ctx.createBiquadFilter();
  bootFilter.type = 'bandpass';
  bootFilter.frequency.value = 2500;
  bootFilter.Q.value = 0.6;

  const bootGain = ctx.createGain();
  const peak = 0.16;
  bootGain.gain.setValueAtTime(peak, now);
  bootGain.gain.linearRampToValueAtTime(peak * 0.82, now + 0.18);
  bootGain.gain.linearRampToValueAtTime(peak, now + 0.35);
  bootGain.gain.linearRampToValueAtTime(peak * 0.55, now + 0.53);
  bootGain.gain.linearRampToValueAtTime(peak * 0.95, now + 0.7);
  bootGain.gain.linearRampToValueAtTime(peak * 0.35, now + 0.99);
  bootGain.gain.linearRampToValueAtTime(peak * 0.8, now + 1.21);
  bootGain.gain.linearRampToValueAtTime(peak * 0.2, now + 1.54);
  bootGain.gain.linearRampToValueAtTime(peak * 0.45, now + 1.87);
  bootGain.gain.linearRampToValueAtTime(0.01, now + 2.2);

  bootNoise.connect(bootFilter).connect(bootGain).connect(getStaticBus(ctx));
  bootNoise.start(now);
  bootNoise.stop(now + 2.2);

  // Blips de glitch durante el arranque, junto a las barras de color
  playGlitchBlip(ctx, now + 0.32);
  playGlitchBlip(ctx, now + 1.05);

  // Golpe grave justo cuando aparece la línea 4 (el mensaje "corrupto")
  playStinger(ctx, now + 1.55);

  // Ruido ambiente de fondo, muy bajo, una vez asentada la señal
  const ambientNoise = ctx.createBufferSource();
  ambientNoise.buffer = createNoiseBuffer(ctx, 4);
  ambientNoise.loop = true;

  const ambientFilter = ctx.createBiquadFilter();
  ambientFilter.type = 'lowpass';
  ambientFilter.frequency.value = 1800;

  const ambientGain = ctx.createGain();
  ambientGain.gain.setValueAtTime(0, now);
  ambientGain.gain.linearRampToValueAtTime(0.025, now + 2.2);

  ambientNoise.connect(ambientFilter).connect(ambientGain).connect(getStaticBus(ctx));
  ambientNoise.start(now + 2.0);

  scheduleAmbientGlitches(ctx, ambientGain);
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

  const pad = (n) => String(n).padStart(2, '0');
  let currentText = '';

  const render = () => {
    const diff = START_DATE - new Date();

    if (diff > 0) {
      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      currentText = `Faltan ${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s para el lanzamiento de NOVA 2`;
    } else {
      currentText = 'Entren al evento en discord.';
    }
    el.textContent = currentText;
  };

  render();
  setInterval(render, 1000);

  // Tartamudeo ocasional: un dígito se corrompe un instante y se restaura
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion) {
    const scheduleStutter = () => {
      setTimeout(() => {
        stutterDigit(el, () => currentText);
        scheduleStutter();
      }, 4000 + Math.random() * 6000);
    };
    scheduleStutter();
  }
}

function stutterDigit(el, getText) {
  const text = getText();
  const digitIndexes = [];
  for (let i = 0; i < text.length; i++) {
    if (/[0-9]/.test(text[i])) digitIndexes.push(i);
  }
  if (!digitIndexes.length) return;

  const idx = digitIndexes[Math.floor(Math.random() * digitIndexes.length)];
  const glitchChar = Math.floor(Math.random() * 10);
  const corrupted = text.slice(0, idx) + glitchChar + text.slice(idx + 1);

  el.textContent = corrupted;
  el.classList.add('glitching');
  setTimeout(() => {
    el.textContent = getText();
    el.classList.remove('glitching');
  }, 70 + Math.random() * 60);
}

/* ---------------------------------------------------
   Lore (formato pases: imagen, texto, vídeo o revelación final)
   Hay dos pistas independientes, cada una con su propio botón y su propio
   "Volver al inicio" al final: LORE_TRACKS.antes y LORE_TRACKS.nova.
   Cada elemento de una pista es un pase:
     { type: 'title' }                             -> portada con el título
     { type: 'text', heading, centered, paragraphs: [...] } -> bloque de texto
       (heading y centered son opcionales)
     { type: 'image', src: '...' }                  -> foto a pantalla completa
     { type: 'video', src: '...' }                   -> vídeo con controles
     { type: 'reveal', src: '...', text: '...' }     -> foto + texto enorme,
                                                         temblando y glitcheado
   Un párrafo puede ser un string normal, o un objeto
   { text, emphasis: true } para destacarlo (rojo, más grande).
   Añade o reordena pases aquí; no hace falta tocar el HTML.
--------------------------------------------------- */
const LORE_TRACK_ANTES = [
  {
    type: 'text',
    heading: '𝐈.',
    paragraphs: [
      'A veces la humanidad te cansa. No de golpe, sino poco a poco, con los mismos errores repitiéndose una y otra vez. Hay personas que dicen que siempre hay que buscar el lado bueno, que incluso en los peores momentos se puede aprender algo. Él pensó eso durante mucho tiempo, lo intentó. Después de ver los mismos patrones durante años, la idea empezó a parecerle una excusa más que una verdad.',
      'Con el tiempo llegó a una conclusión simple:<br>La humanidad no fallaba por falta de oportunidades, fallaba porque no sabía convivir sin destruir algo en el proceso. Y si eso era cierto, entonces no bastaba con discutirlo o escribir teorías. Había que probarlo.',
      'Así nació la idea de crear un mundo aislado. Un lugar donde nadie pudiera culpar al pasado, al gobierno o a la historia. Donde las personas fueran libres para decidir qué tipo de sociedad querían formar. Si aun así todo terminaba en conflicto, no habría excusas.',
    ],
  },
  {
    type: 'text',
    heading: '𝐈𝐈.',
    paragraphs: [
      'Hubo un intento anterior, hace años. Hoy casi nadie lo recuerda con claridad. Solo quedan referencias vagas, archivos incompletos y rumores sobre un experimento que prometía armonía y terminó mal. Cuando sus habitantes descubrieron que estaban siendo parte de un experimento, todo se vino abajo. El gobierno lo negó, los responsables desaparecieron y el tema fue enterrado.',
      'Pero él no lo dejó atrás. Para él, ese fracaso no significaba que la idea fuera incorrecta, solo que no se había hecho bien.',
      'Muchos creyeron que el responsable había desaparecido junto con aquel proyecto. Era más fácil pensar eso. Pero la verdad era otra.',
      'Mucho antes de ese experimento, él ya había tenido contacto con algo que no pertenecía a este mundo. Una isla que no aparecía en ningún registro, separada del mapa conocido. Allí existía una entidad que se hacía llamar a sí misma dios, aunque aún no entendía completamente lo que eso implicaba.',
      'El encuentro no terminó bien. Fue expulsado y obligado a regresar. Pero esa experiencia le dejó algo importante, entendió que existían otros mundos, que podían observarse sin intervenir directamente y que no siempre era necesario controlar para influir.',
      'Años después, cuando el primer experimento fue borrado de la historia oficial, ese conocimiento volvió a ser útil.',
      'Y con esa idea comenzó a tomar forma NOVA.',
    ],
  },
  {
    type: 'text',
    heading: '𝐈𝐈𝐈.',
    paragraphs: [
      'NovaSMP no fue creado por una sola persona. Fue el resultado de lo que quedó de una organización científica que, en los documentos oficiales, ya no existía. La antigua Federación había sido disuelta, pero varios de sus miembros conservaron información, tecnología y el deseo de continuar.',
      'Nova island se presentó como un nuevo comienzo. Un experimento más cuidado, más controlado. La idea no era forzar el conflicto, sino crear las condiciones necesarias y observar qué pasaba. Si la humanidad realmente podía cambiar, lo demostraría sin ayuda.',
      'La Federación ya no tenía nombre público, pero seguía activa en las sombras.',
      'El reclutamiento fue simple y discreto. No hubo contratos ni reuniones privadas. Solo anuncios comunes, fáciles de ignorar, que aparecían en el momento justo para ciertas personas que eran estudiadas con antelación. Personas normales aceptaron sin saber exactamente a qué se estaban comprometiendo. Cuando despertaron, ya no estaban en su mundo. Frente a ellos había una isla desconocida, tranquila y extrañamente vacía.',
    ],
  },
  {
    type: 'text',
    heading: '𝐈𝐕.',
    paragraphs: [
      'Nova estaba pensada para parecer un lugar justo. En el centro había una ciudad comunitaria donde todos podían reunirse, comerciar y hablar. No pertenecía a nadie en específico. Era un punto neutral.',
      'Más allá de ella se formaron dos pueblos principales: Estelar y Génesis. Nadie les prohibió relacionarse, pero tampoco se les dio una razón clara para hacerlo. Cada uno tuvo que organizarse por su cuenta, cuidar sus recursos y tomar sus propias decisiones. Con el tiempo, las diferencias empezaron a notarse.',
      'Cada que llegaba alguien nuevo lo hacían elegir un pueblo de un método creado automáticamente para llevarte a uno de los dos pueblos, era algo aleatorio que no podían elegir.',
      'Los que estaban detrás no se mostraron directamente. En su lugar, dejó que ciertos individuos cumplieran ese rol. Personas con máscaras de animales, conocidas por nombres que pronto se volvieron familiares.',
      '(Nombres censurados)',
      'Supervisaban comunidades, corregían comportamientos, borraban recuerdos cuando era necesario. A veces provocaban pequeños conflictos, aplicaban castigos disfrazados de eventos y mucho más.',
      'Para los habitantes de Nova, eran autoridades. Para quienes estaban detrás del experimento, solo eran herramientas.',
    ],
  },
  {
    type: 'text',
    heading: '𝐕.',
    centered: true,
    paragraphs: [
      'Nova no fue creada para destruir.',
      'Fue creada para observar.',
      'Para responder una sola pregunta:',
      'Si se les da libertad, un propósito y un nuevo comienzo,',
      '¿la humanidad puede hacerlo mejor?',
      'El experimento sigue en marcha.',
      { text: 'Este mundo va a dar la respuesta', emphasis: true },
      { text: 'Este mundo va a dar la respuesta', emphasis: true },
    ],
  },
  { type: 'video', src: 'images/lv_0_20260207170013.mp4' },
];

const LORE_TRACK_NOVA = [
  { type: 'title' },
  { type: 'image', src: 'images/Lore-1.png' },
  {
    // Lore-1
    type: 'text',
    paragraphs: [
      'Habían llegado de vacaciones a una isla, en sus televisiones apareció ese anuncio, genuino, uno que parecía inofensivo, el relajo de esas olas en la pantalla sonaba exquisito al lado de todo a lo que se enfrentarían, una realidad que solo a pesar de que no comienza en gritos ni guerra, tarde o temprano pasaría a ser oídos sordos en los habitantes que en algún momento lucharon por lo que querían, una libertad que no llegaría, al menos un problema en común, ser presos para lo que fueron sometidos.',
      'La Federación lo tenía claro, solo aquellos que actuaron bajo el propósito, para lo que fueron creados, un experimento lleno de memorias, matanzas que llegaron a consecuencias atroces, hijos - si es que se les podía llamar así- llevados al límite en donde el amor paternal llegaba a corromperse, eso era algo sentimental, los sentimientos aquí eran cruciales para que todo estuviera controlado, humanos, solo la mente humana es débil ante lo que se desconoce y te produce miedo, pero.. ¿Qué ocurriría si algo que no era humano llegara a suceder en esa mente?',
    ],
  },
  { type: 'image', src: 'images/Lore-2.png' },
  {
    // Lore-2
    type: 'text',
    paragraphs: [
      'La paz llegó, es a lo que se creían algunos llegar, pero supongo que una opción, una idea así era algo cruel de pensar en un lugar donde lo único a lo que se llegaba era a tratar de simplemente huir. Las fallas no tardaron en aparecer, lo desconocido como antes se menciono, te aterra, te hunde, te hace querer escapar de lo que no puedes evitar, manchas, una o dos, aparecieron como si de una infección se tratara, pero esto no era humano, no, no lo era, seguramente algo hecho por la Federación, pero ni ellos mismos pudieron salvarse de algo que, en efecto, no fue obra de alguna otra de sus extrañezas. Los habitantes no tardaron en aparecer preguntando si esto era digno de combatir, pero al primer caído con manchas glitcheadas, un dolor indescriptible que solo se podía ver en los ojos de aquel primero que la curiosidad terminó por matarlo, se dieron cuenta de que no solo ellos eran los que debían irse, si no todos en la isla, incluyendo a todo aquel con vida ahí.',
      'Esto era solo el comienzo, eso a lo que algunos empezaron a nombrar como entes, comenzaron a acechar, al final de cuentas consumir vida era algo que los alimentaba como primeras impresiones de algo vivo, algo vital que es importante para que el experimento siga funcionando, vida. No había mucho tiempo, pensaban en semanas para escapar pero esas criaturas solo se tomaron dos días para consumir e incluso desaparecer de a poco lo que quedaba de la isla. Su única salvación no estaba en algo que se consideraba tierra, era ese mundo al que nadie o pocos accedían, el End.',
    ],
  },
  { type: 'image', src: 'images/lore-3.jpg' },
  {
    // Lore-3
    type: 'text',
    paragraphs: [
      'Al entrar se dieron cuenta que no todo estaba en su lugar, la Federación dio una señal de que algo andaba mal, la amenaza estaba vigente en el aire que pasaba por los árboles presentes que, aunque parecían bastante normal, la presencia de esas cosas eran capaces de sentirlas, daban escalofríos, y el recuerdo de esas personas gritando por ayuda porque algo los había glicheado te acompaña mientras avanzas a lo que se supone era un camino seguro.',
      'Cuatro, cuatro llaves que necesitaban para llegar a el destino que no era más que volver a lo mismo, esa normalidad disfrazada de algo cruel, pero en estos casos era mejor eso a terminar muertos por algo que ni la federación ni los habitantes estaban seguros de lo que realmente era.',
      'Los minutos pasaban y esas cuatro llaves no aparecían por ningún lado, los puntos ciegos de esas entidades fueron revisadas, pero nada, lo que llevaba a pensar, no solo eso, estar seguro de que ellos ya se habían adelantado, lo que en resumen era un enfrentamiento que no sabían como terminaria, pensaban en no unir fuerzas por tantas diferencias dadas pero, los habitantes y la Federación de alguna manera sabían que si no se unían, ambos morirían, eso era lo que tenían en común, querer seguir vivos a toda costa, si eso involucra el que olvidan por completo, aunque sea por este momento, todo el sufrimiento que se dieron mutuamente, eso en momentos como este, ya no importaba las diferencias, si la vida de los dos estaban en riesgo lo último que se les pasó por la mente fue algunas de esas escenas que aunque no serían borradas, la adrenalina los cegó.',
    ],
  },
  { type: 'image', src: 'images/lore-4.png' },
  {
    // Lore-4
    type: 'text',
    paragraphs: [
      'Se pusieron en marcha y aunque ese enfrentamiento hubieron bajas por parte de los habitantes, la federación ya planeaba cómo derrotar a la gran dragona que les daría la libertad que buscaban, aunque esa libertad tampoco era asegurada, al menos los mantendrá a salvo. Gritos se escuchaban, gente siendo devorada por lo que decíamos desconocido, era un campo de batalla en donde los últimos en respirar ganan, luchando como si de animales se tratara, ¿esto no era el punto a lo que la federación quería llegar?, el que unos simples humanos se dieran cuenta de que no solo pueden ser manipulables o experimentales, si no que cada uno al final del día busca sobrevivir a lo que más teme.',
      'Esas entidades de un momento a otro dejaron de dar presencia, cada vez menos pero no del todo, heridas causadas por ellos se hacían visibles en su forma caracterizada por saber que para ti no quedaba mucho tiempo mas de vida, así se despiden, asi sabian que aunque trataran de sanar, su camino era a un laboratorio o aún peor, ser colocados y conscientes de que su humanidad nunca más estaría de vuelta. Derrotando a la dragona se abrió paso para que ese nuevo lugar pudiera ser su salida, el portal estaba en las narices de unos y de otros una lejanía a la que empezaron a correr, algunos no con tanta suerte, otros pensando en que harían cuando esto terminara, pero de lo que estaban seguros o al menos la mayoría era que el caos había acabado, ¿no es así?, al menos esa sensación desapareció, y era lo que contaba.',
      'Uno tras otro fueron entrando, un nuevo comienzo, pero lo único que les hacía sentir iguales era el simple hecho de que estaban atrapados de alguna u otra manera, uno tras otro, poco a poco observando, y cuando fue la última persona quisieron asegurarse de que el portal estaba cerrado, así no llegaría gente nueva con la cual lidiar, gente nueva con la cual experimentar, gente que no era de este lugar, de cualquier manera no podrían llegar.',
    ],
  },
  {
    // Lore-5: la revelación final, sobre la foto de lore-5
    type: 'reveal',
    src: 'images/lore-5.png',
    text: 'Pero tú no eres de este lugar.',
  },
];

const LORE_TRACKS = {
  antes: LORE_TRACK_ANTES,
  nova: LORE_TRACK_NOVA,
};

function buildLoreSlideElement(slide) {
  const el = document.createElement('div');
  el.className = 'lore-slide';

  if (slide.type === 'title') {
    el.innerHTML = '<h1 class="lore-slide-title glitch" data-text="𝙽𝚘𝚟𝚊ᏕᎷᎮ ²⁰⁵⁵">𝙽𝚘𝚟𝚊ᏕᎷᎮ ²⁰⁵⁵</h1>';
  } else if (slide.type === 'image') {
    el.classList.add('lore-slide-image');
    const img = document.createElement('img');
    img.className = 'lore-slide-img';
    img.src = slide.src;
    img.alt = '';
    el.appendChild(img);
  } else if (slide.type === 'video') {
    el.classList.add('lore-slide-video');
    const video = document.createElement('video');
    video.className = 'lore-slide-video-el';
    video.src = slide.src;
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
    img.alt = '';
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

function initLore() {
  const antesBtn = document.getElementById('lore-antes-btn');
  const novaBtn = document.getElementById('lore-nova-btn');
  const loreBackBtn = document.getElementById('lore-back-btn');
  const lorePage = document.getElementById('lore-page');
  const loreSlidesEl = document.getElementById('lore-slides');
  const prevBtn = document.getElementById('lore-prev-btn');
  const nextBtn = document.getElementById('lore-next-btn');
  const progressEl = document.getElementById('lore-progress');
  const transition = document.getElementById('channel-transition');
  if (!antesBtn || !novaBtn || !loreBackBtn || !lorePage || !loreSlidesEl || !prevBtn || !nextBtn || !transition) return;

  let currentTrack = LORE_TRACKS.nova;
  let currentSlide = 0;

  const renderSlide = (index) => {
    restoreStaticAudio(); // por si se cambia de pase con un vídeo aún sonando
    loreSlidesEl.innerHTML = '';
    loreSlidesEl.appendChild(buildLoreSlideElement(currentTrack[index]));

    if (currentTrack[index].type === 'reveal') {
      const ctx = getAudioContext();
      if (ctx) playStinger(ctx, ctx.currentTime, 0.16);
    }

    prevBtn.classList.toggle('is-hidden', index === 0);
    nextBtn.textContent = index === currentTrack.length - 1 ? 'Volver al inicio' : 'Siguiente →';
    progressEl.textContent = `${index + 1} / ${currentTrack.length}`;

    lorePage.scrollTop = 0;
  };

  // La vista se alterna con una clase en <body> (CSS usa "visibility", nunca
  // "display"), así que al volver del Lore la intro no repite su animación:
  // se queda tal y como estaba, ya asentada.
  let switching = false;
  const switchTo = (showLore, trackKey) => {
    if (switching) return;
    switching = true;

    transition.classList.add('active');
    playChannelChangeAudio();

    setTimeout(() => {
      document.body.classList.toggle('view-lore', showLore);
      if (showLore) {
        currentTrack = LORE_TRACKS[trackKey];
        currentSlide = 0;
        renderSlide(currentSlide);
      }
    }, 750);

    setTimeout(() => {
      transition.classList.remove('active');
      switching = false;
    }, 1300);
  };

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

  antesBtn.addEventListener('click', () => switchTo(true, 'antes'));
  novaBtn.addEventListener('click', () => switchTo(true, 'nova'));
  loreBackBtn.addEventListener('click', () => switchTo(false));
  nextBtn.addEventListener('click', goNext);
  prevBtn.addEventListener('click', goPrev);

  document.addEventListener('keydown', (e) => {
    if (!document.body.classList.contains('view-lore')) return;
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
    if (e.key === 'Escape') switchTo(false);
  });
}

/* Ráfaga de estática al cambiar de "canal" (Lore <-> intro), reutilizando
   la misma infraestructura de audio del boot. */
function playChannelChangeAudio() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 1.1);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2200;
  filter.Q.value = 0.5;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.14, now + 0.05);
  gain.gain.setValueAtTime(0.14, now + 0.7);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

  noise.connect(filter).connect(gain).connect(getStaticBus(ctx));
  noise.start(now);
  noise.stop(now + 1.15);

  playGlitchBlip(ctx, now + 0.08);
  playGlitchBlip(ctx, now + 0.55, 0.12);
}

/* ---------------------------------------------------
   Secuencia final (25 min después del lanzamiento, EVENT_GLITCH_DATE)
   El título "NOVA 2" se rompe cada vez más fuerte hasta detenerse en
   seco, convertido en el botón "No habrá marcha atrás". Al pulsarlo:
   pantalla negra y en silencio -> intentos de conexión que fallan uno
   tras otro, interrumpidos por un aviso de alguien -> mientras tanto la
   pantalla se glitchea y la estática/ruido crecen poco a poco -> pico de
   estática total -> corte seco a negro -> la IP del server, tecleada en
   verde en el centro.
--------------------------------------------------- */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Escribe letra a letra el texto dentro de un elemento ya insertado en el DOM.
function typeInto(el, text, speed = 30) {
  return new Promise((resolve) => {
    let i = 0;
    const tick = () => {
      el.textContent = text.slice(0, i);
      i += 1;
      if (i <= text.length) {
        setTimeout(tick, speed);
      } else {
        resolve();
      }
    };
    tick();
  });
}

// Añade una línea nueva al terminal de la secuencia final y la escribe letra a letra.
async function typeLine(container, text, className, speed) {
  const p = document.createElement('p');
  p.className = className ? `finale-line ${className}` : 'finale-line';
  container.appendChild(p);
  container.scrollTop = container.scrollHeight;
  await typeInto(p, text, speed);
  return p;
}

// Intentos de conexión mostrados durante la secuencia final. "warn" interrumpe
// los intentos a mitad de la lista con el aviso de alguien que los ve conectarse.
// Añade, quita o reordena líneas aquí; no hace falta tocar el HTML ni el CSS.
const FINALE_LINES = [
  { text: '> iniciando conexión con NOVA_NET...' },
  { text: '> handshake — tiempo de espera agotado', fail: true },
  { text: '> reintentando (1/6)...' },
  { text: '> conexión rechazada por el host', fail: true },
  { text: '> reintentando (2/6)...' },
  { warn: '¿Qué hacéis? ¿Estáis locos? No sabéis dónde os estáis metiendo.' },
  { text: '> reintentando (3/6)...' },
  { text: '> algo está respondiendo al otro lado', fail: true },
  { text: '> reintentando (4/6)...' },
  { text: '> ESO no es un servidor', fail: true },
  { text: '> reintentando (5/6)...' },
  { text: '> conexión establecida' },
];

function initFinaleSequence() {
  const titleEl = document.getElementById('intro-title');
  const overlay = document.getElementById('finale-overlay');
  const staticEl = document.getElementById('finale-static');
  const terminalEl = document.getElementById('finale-terminal');
  const revealEl = document.getElementById('finale-reveal');
  const revealIpEl = document.getElementById('finale-reveal-ip');
  const revealHintEl = document.getElementById('finale-reveal-hint');
  if (!titleEl || !overlay || !staticEl || !terminalEl || !revealEl || !revealIpEl) return;

  // TODO: sustituir por la IP/dominio real del server cuando esté listo.
  const SERVER_IP = 'Ketchup';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let triggered = false;
  let flashTimer = null;

  const armTitleButton = () => {
    titleEl.classList.remove('intro-title--breakdown');
    titleEl.classList.add('intro-title--armed');
    titleEl.textContent = 'No habrá marcha atrás';
    titleEl.dataset.text = 'No habrá marcha atrás';
    titleEl.setAttribute('role', 'button');
    titleEl.tabIndex = 0;
    titleEl.setAttribute('aria-label', 'Entrar al evento — no habrá marcha atrás');

    const activate = () => {
      if (triggered) return;
      triggered = true;
      triggerFinale();
    };
    titleEl.addEventListener('click', activate);
    titleEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
    });
  };

  const startTitleBreakdown = () => {
    // Con "reducir movimiento" activado no hay animación que dispare
    // "animationend", así que se salta directo al botón final.
    if (reduceMotion) {
      armTitleButton();
      return;
    }
    titleEl.classList.add('intro-title--breakdown');
    const ctx = getAudioContext();
    if (ctx) {
      playGlitchBlip(ctx, ctx.currentTime + 0.6, 0.1);
      playGlitchBlip(ctx, ctx.currentTime + 2.1, 0.14);
      playStinger(ctx, ctx.currentTime + 3.6, 0.12);
    }
    titleEl.addEventListener('animationend', armTitleButton, { once: true });
  };

  // Si se carga la página ya pasado el instante del glitch, se salta directo
  // al botón final (sin repetir la animación de ruptura del título).
  if (Date.now() >= EVENT_GLITCH_DATE) {
    armTitleButton();
  } else {
    const checkGlitchTime = setInterval(() => {
      if (Date.now() >= EVENT_GLITCH_DATE) {
        clearInterval(checkGlitchTime);
        startTitleBreakdown();
      }
    }, 1000);
  }

  // Micro-glitch de pantalla completa (sacudida + separación de canal),
  // a ritmo cada vez más rápido durante `untilMs`.
  const flashOnce = () => {
    overlay.style.setProperty('--flash-x', `${(Math.random() * 16 - 8).toFixed(1)}px`);
    overlay.style.setProperty('--flash-y', `${(Math.random() * 10 - 5).toFixed(1)}px`);
    overlay.classList.add('is-flashing');
    setTimeout(() => overlay.classList.remove('is-flashing'), 110);
  };
  const scheduleFlashes = (untilMs) => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      if (elapsed >= untilMs) { flashTimer = null; return; }
      flashOnce();
      const nextDelay = 1000 - (elapsed / untilMs) * 850; // ~1000ms -> ~150ms
      flashTimer = setTimeout(tick, Math.max(120, nextDelay));
    };
    tick();
  };

  async function triggerFinale() {
    const ctx = getAudioContext();
    const bus = ctx ? getStaticBus(ctx) : null;

    // Silencio total y pantalla negra de golpe, tal cual estaba sonando la página
    if (ctx && bus) {
      bus.gain.cancelScheduledValues(ctx.currentTime);
      bus.gain.setValueAtTime(0, ctx.currentTime);
    }
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('active');
    staticEl.style.transition = 'opacity 1.1s linear';
    terminalEl.style.opacity = '1';

    await sleep(1300);

    // Ruido dedicado que irá creciendo con los intentos de conexión
    let escalationNoise = null;
    let escalationGain = null;
    if (ctx && bus) {
      bus.gain.setValueAtTime(1, ctx.currentTime);
      escalationNoise = ctx.createBufferSource();
      escalationNoise.buffer = createNoiseBuffer(ctx, 18);
      escalationNoise.loop = true;
      const escalationFilter = ctx.createBiquadFilter();
      escalationFilter.type = 'bandpass';
      escalationFilter.frequency.value = 2000;
      escalationFilter.Q.value = 0.4;
      escalationGain = ctx.createGain();
      escalationGain.gain.setValueAtTime(0, ctx.currentTime);
      escalationNoise.connect(escalationFilter).connect(escalationGain).connect(bus);
      escalationNoise.start(ctx.currentTime);
    }

    // ---- Intentos de conexión fallidos, con el aviso interrumpiéndolos ----
    for (let i = 0; i < FINALE_LINES.length; i += 1) {
      const item = FINALE_LINES[i];
      if (item.warn) {
        await typeLine(terminalEl, item.warn, 'finale-line-warn', 20);
      } else {
        await typeLine(terminalEl, item.text, item.fail ? 'finale-line-fail' : '', 24);
        if (ctx && Math.random() < 0.5) playGlitchBlip(ctx, ctx.currentTime, 0.05);
      }

      // A partir de un tercio de la secuencia, todo empieza a romperse poco a poco
      const progress = (i + 1) / FINALE_LINES.length;
      if (progress > 0.3) {
        const growth = Math.min(1, (progress - 0.3) / 0.7);
        staticEl.style.opacity = (growth * 0.85).toFixed(2);
        if (escalationGain) {
          escalationGain.gain.cancelScheduledValues(ctx.currentTime);
          escalationGain.gain.linearRampToValueAtTime(growth * 0.35, ctx.currentTime + 0.5);
        }
        if (!reduceMotion && !flashTimer && growth > 0.1) scheduleFlashes(7000);
      }

      await sleep(260 + Math.random() * 260);
    }

    // ---- Clímax: la estática y el ruido se lo comen todo ----
    staticEl.style.transition = 'opacity 0.6s ease';
    staticEl.style.opacity = '1';
    terminalEl.style.transition = 'opacity 0.5s ease';
    terminalEl.style.opacity = '0';
    if (escalationGain) {
      escalationGain.gain.cancelScheduledValues(ctx.currentTime);
      escalationGain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.6);
    }
    if (!reduceMotion) scheduleFlashes(1800);
    await sleep(2000);

    // ---- Corte seco: negro y silencio absolutos ----
    if (flashTimer) { clearTimeout(flashTimer); flashTimer = null; }
    overlay.classList.remove('is-flashing');
    staticEl.style.transition = 'opacity 0.06s linear';
    staticEl.style.opacity = '0';
    if (ctx && bus) {
      if (escalationGain) escalationGain.gain.setValueAtTime(0, ctx.currentTime);
      if (escalationNoise) { try { escalationNoise.stop(); } catch (err) { /* ya parado */ } }
      bus.gain.cancelScheduledValues(ctx.currentTime);
      bus.gain.setValueAtTime(0, ctx.currentTime);
    }

    await sleep(900);

    // ---- Revelación: la IP del server, tecleada en verde ----
    revealEl.classList.add('active');
    if (ctx) playRevealTone(ctx);
    await typeInto(revealIpEl, SERVER_IP, 110);
    revealIpEl.classList.add('finale-line-cursor');

    if (revealHintEl) {
      revealHintEl.textContent = 'Toca para copiar';
      revealHintEl.classList.add('active');
      revealIpEl.addEventListener('click', () => {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(SERVER_IP).then(() => {
          revealHintEl.textContent = 'Copiado';
          setTimeout(() => { revealHintEl.textContent = 'Toca para copiar'; }, 1600);
        });
      });
    }
  }
}
