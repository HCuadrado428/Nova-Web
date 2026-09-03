// ======================================================
// NOVA 2 — Script principal (JS vanilla, sin dependencias)
// ======================================================

document.addEventListener('DOMContentLoaded', () => {
  initDayCounter();
  initEnterGate();
});

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
  '⟟ ⌇⟒⟒ ⊬⍜⎍',
  '☊⎍⏃⋏⏁⏃ ☌⟒⋏⏁⟒ ⊑⏃⏚⌰⏃ ⌿⍜⍀ ⏃☌⎍⟟?',
  '⊬⍜⎍ ⌰⍜⌇⏁ ⏁⊑⟒ ☌⏃⋔⟒',
];

function initEnterGate() {
  const gate = document.getElementById('enter-gate');
  const bootLine4 = document.getElementById('boot-line-4');
  if (!gate) return;

  let entered = false;
  const enter = () => {
    if (entered) return;
    entered = true;

    if (bootLine4) {
      const phrase = BOOT_LINE_4_PHRASES[Math.floor(Math.random() * BOOT_LINE_4_PHRASES.length)];
      bootLine4.textContent = phrase;
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

  noise.connect(filter).connect(gain).connect(ctx.destination);
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

  noise.connect(filter).connect(gain).connect(ctx.destination);
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

  bootNoise.connect(bootFilter).connect(bootGain).connect(ctx.destination);
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

  ambientNoise.connect(ambientFilter).connect(ambientGain).connect(ctx.destination);
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

  // 06/09/2026 22:00, hora de España peninsular (CEST, UTC+2 en esa fecha) = 20:00 UTC.
  // Se fija como instante UTC para que la cuenta atrás sea igual para todo el mundo
  // (Argentina, México, etc.), en vez de usar la zona horaria de cada visitante.
  const START_DATE = new Date('2026-09-06T20:00:00Z');
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
      const elapsedDays = Math.floor(-diff / 86400000);
      currentText = `Día ${elapsedDays} desde que empezó NOVA 2`;
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
