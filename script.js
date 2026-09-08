// ======================================================
// NOVA 2 — Script principal (JS vanilla, sin dependencias)
// ======================================================

document.addEventListener('DOMContentLoaded', () => {
  initCopyIpButton();
  initEnterGate();
  initMenuToggle('lore-menu-btn', 'lore-submenu');
  initMenuToggle('rules-menu-btn', 'rules-submenu');
  initLore();
  initRules();
  initPasswordScreen();
});

/* ---------------------------------------------------
   Botones "Lore" / "Normas": despliegan su submenú (las dos pistas de Lore,
   o las dos normativas) al pulsarlos, en vez de mostrar siempre los botones
   sueltos. El propio submenú se cierra desde initLore/initRules cuando se
   elige una opción.
--------------------------------------------------- */
function initMenuToggle(toggleId, submenuId) {
  const toggle = document.getElementById(toggleId);
  const submenu = document.getElementById(submenuId);
  if (!toggle || !submenu) return;

  toggle.addEventListener('click', () => {
    const isOpen = submenu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
}

function closeMenuToggle(toggleId, submenuId) {
  const toggle = document.getElementById(toggleId);
  const submenu = document.getElementById(submenuId);
  if (!toggle || !submenu) return;
  submenu.classList.remove('is-open');
  toggle.setAttribute('aria-expanded', 'false');
}

// IP del server, usada por el botón "Copiar IP" de la intro.
const SERVER_IP = 'xray.dathost.net:17487';

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
   Botón "Copiar IP": copia la IP del server al portapapeles al pulsarlo.
--------------------------------------------------- */
function initCopyIpButton() {
  const btn = document.getElementById('copy-ip-btn');
  if (!btn || !navigator.clipboard) return;

  const defaultLabel = btn.textContent;
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(SERVER_IP).then(() => {
      btn.textContent = 'IP copiada';
      btn.classList.add('is-copied');
      setTimeout(() => {
        btn.textContent = defaultLabel;
        btn.classList.remove('is-copied');
      }, 1600);
    });
  });
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
    ],
  },
  { type: 'video', src: 'images/lv_0_20260207170013.mp4' },
];

const LORE_TRACK_NOVA = [
  { type: 'title' },
  { type: 'image', src: 'images/Lore-1.webp', alt: 'Dos figuras humanoides con capucha blanca en una sala oscura: una con ojos brillantes en cian, la otra con ojos rojos sosteniendo un arma.' },
  {
    // Lore-1
    type: 'text',
    paragraphs: [
      'Habían llegado de vacaciones a una isla, en sus televisiones apareció ese anuncio, genuino, uno que parecía inofensivo, el relajo de esas olas en la pantalla sonaba exquisito al lado de todo a lo que se enfrentarían, una realidad que solo a pesar de que no comienza en gritos ni guerra, tarde o temprano pasaría a ser oídos sordos en los habitantes que en algún momento lucharon por lo que querían, una libertad que no llegaría, al menos un problema en común, ser presos para lo que fueron sometidos.',
      'La Federación lo tenía claro, solo aquellos que actuaron bajo el propósito, para lo que fueron creados, un experimento lleno de memorias, matanzas que llegaron a consecuencias atroces, hijos - si es que se les podía llamar así- llevados al límite en donde el amor paternal llegaba a corromperse, eso era algo sentimental, los sentimientos aquí eran cruciales para que todo estuviera controlado, humanos, solo la mente humana es débil ante lo que se desconoce y te produce miedo, pero.. ¿Qué ocurriría si algo que no era humano llegara a suceder en esa mente?',
    ],
  },
  { type: 'image', src: 'images/Lore-2.webp', alt: 'Tres personajes sentados en el borde de un acantilado, mirando la puesta de sol sobre el océano.' },
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
  { type: 'image', src: 'images/lore-4.webp', alt: 'Tres figuras pálidas y encapuchadas de pie, muy juntas entre sí.' },
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
    src: 'images/lore-5.webp',
    alt: 'Interior de un templo submarino en ruinas, con enredaderas y bloques cubiertos de musgo.',
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
    img.alt = slide.alt || '';
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
   Normas (Discord / Minecraft / Objetos)
   El texto de cada normativa vive directamente en el HTML (rules-panel-discord
   / rules-panel-minecraft / rules-panel-objetos), no hay que generarlo desde
   aquí. Este bloque solo controla la transición de página (igual que el Lore)
   y el cambio entre paneles una vez dentro, con los botones rules-switch-btn.
--------------------------------------------------- */
function initRules() {
  const discordBtn = document.getElementById('rules-discord-btn');
  const minecraftBtn = document.getElementById('rules-minecraft-btn');
  const objetosBtn = document.getElementById('rules-objetos-btn');
  const backBtn = document.getElementById('rules-back-btn');
  const rulesPage = document.getElementById('rules-page');
  const panels = {
    discord: document.getElementById('rules-panel-discord'),
    minecraft: document.getElementById('rules-panel-minecraft'),
    objetos: document.getElementById('rules-panel-objetos'),
  };
  const switchBtns = {
    discord: document.getElementById('rules-switch-discord'),
    minecraft: document.getElementById('rules-switch-minecraft'),
    objetos: document.getElementById('rules-switch-objetos'),
  };
  const transition = document.getElementById('channel-transition');
  if (!discordBtn || !minecraftBtn || !objetosBtn || !backBtn || !rulesPage || !panels.discord || !panels.minecraft || !panels.objetos || !transition) return;

  const showPanel = (key) => {
    Object.entries(panels).forEach(([k, el]) => el.classList.toggle('is-active', k === key));
    Object.entries(switchBtns).forEach(([k, btn]) => {
      if (btn) btn.classList.toggle('is-active', k === key);
    });
    rulesPage.scrollTop = 0;
  };

  let switching = false;
  const switchTo = (showRules, panelKey) => {
    if (switching) return;
    switching = true;

    transition.classList.add('active');
    playChannelChangeAudio();

    setTimeout(() => {
      document.body.classList.toggle('view-rules', showRules);
      if (showRules) showPanel(panelKey);
    }, 750);

    setTimeout(() => {
      transition.classList.remove('active');
      switching = false;
    }, 1300);
  };

  const openPanel = (key) => {
    closeMenuToggle('rules-menu-btn', 'rules-submenu');
    switchTo(true, key);
  };

  discordBtn.addEventListener('click', () => openPanel('discord'));
  minecraftBtn.addEventListener('click', () => openPanel('minecraft'));
  objetosBtn.addEventListener('click', () => openPanel('objetos'));
  backBtn.addEventListener('click', () => switchTo(false));

  Object.entries(switchBtns).forEach(([key, btn]) => {
    if (btn) btn.addEventListener('click', () => showPanel(key));
  });

  document.addEventListener('keydown', (e) => {
    if (!document.body.classList.contains('view-rules')) return;
    if (e.key === 'Escape') switchTo(false);
  });
}

/* ---------------------------------------------------
   Buscador "Inserta la contraseña"
   Pantalla aparte, deliberadamente limpia (sin estática ni glitches): solo
   una barra de búsqueda y un botón "Buscar". Cada palabra que hace algo se
   define en SEARCH_ACTIONS: la clave es la palabra en minúsculas y sin
   tildes, el valor es la función que se ejecuta al encontrarla (recibe un
   objeto con setFeedback para escribir un mensaje bajo el buscador).
   Ejemplo:
     'iris': ({ setFeedback }) => setFeedback('IRIS está despierta.', 'ok'),

   Cada 3 búsquedas fallidas seguidas aparece el botón "Una ayudita?", que
   rellena el buscador con una palabra al azar de entre las que hay en
   SEARCH_ACTIONS (no hace falta mantener una lista aparte). En cuanto se
   acierta una palabra (a mano o con la ayudita) o se manda una búsqueda,
   el contador de fallos vuelve a 0 y el botón desaparece.
--------------------------------------------------- */
const SEARCH_ACTIONS = {
  cucaracha: () => window.open('https://www.youtube.com/watch?v=tCHYrpiqDxI', '_blank', 'noopener'),
  shrimp: () => window.open('https://www.youtube.com/watch?v=u4ecB57jFhI', '_blank', 'noopener'),
  house: () => window.open('images/gallery/646390b727116f4c2c5eee161238ff86.jpg', '_blank', 'noopener'),
  jojos: () => window.open('images/gallery/c2d391b2b3f1142f75c555aca8808667.jpg', '_blank', 'noopener'),
  tuff: () => window.open('images/gallery/f9aeebe83fee27a41c31c3ebdaa7793f.jpg', '_blank', 'noopener'),
  timmy: () => window.open('images/gallery/f4459e76f2b07d164440989aed18bd4d.jpg', '_blank', 'noopener'),
};

function normalizeSearchTerm(raw) {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function initPasswordScreen() {
  const triggerBtn = document.getElementById('password-trigger-btn');
  const page = document.getElementById('password-page');
  const backBtn = document.getElementById('password-back-btn');
  const form = document.getElementById('password-form');
  const input = document.getElementById('password-input');
  const feedback = document.getElementById('password-feedback');
  const hintBtn = document.getElementById('password-hint-btn');
  if (!triggerBtn || !page || !backBtn || !form || !input || !feedback || !hintBtn) return;

  let failStreak = 0;

  const setFeedback = (text, tone) => {
    feedback.textContent = text;
    feedback.classList.remove('is-fail', 'is-ok');
    if (tone === 'ok') feedback.classList.add('is-ok');
    if (tone === 'fail') feedback.classList.add('is-fail');
  };

  const runSearch = (rawValue) => {
    const term = normalizeSearchTerm(rawValue);
    if (!term) return;

    const action = SEARCH_ACTIONS[term];
    if (action) {
      failStreak = 0;
      hintBtn.classList.remove('is-visible');
      action({ setFeedback });
      return;
    }

    failStreak += 1;
    setFeedback('Nada por aquí.', 'fail');
    if (failStreak % 3 === 0) {
      hintBtn.classList.add('is-visible');
    }
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    runSearch(input.value);
  });

  hintBtn.addEventListener('click', () => {
    const words = Object.keys(SEARCH_ACTIONS);
    if (!words.length) return;
    const word = words[Math.floor(Math.random() * words.length)];
    input.value = word;
    input.focus();
  });

  const open = () => {
    page.classList.add('active');
    page.setAttribute('aria-hidden', 'false');
    document.body.classList.add('view-password');
    input.value = '';
    setFeedback('', null);
    setTimeout(() => input.focus(), 50);
  };

  const close = () => {
    page.classList.remove('active');
    page.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('view-password');
  };

  triggerBtn.addEventListener('click', open);
  backBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('view-password')) close();
  });
}
