// ======================================================
// Sonido de estática y glitches (Web Audio API, sin archivos)
// ======================================================
//
// Sigue aproximadamente las mismas curvas de opacidad que las animaciones
// CSS del boot (@keyframes intro-boot / intro-static-ambient).

import { storageGet, storageSet } from './utils.js';

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

// Pestaña en segundo plano: se suspende el audio (y se reanuda al volver).
export function setAudioSuspended(suspended) {
  if (!audioCtx) return;
  if (suspended) audioCtx.suspend();
  else audioCtx.resume();
}

/* Bus único por el que pasa todo el audio generado (estática, glitches,
   stinger): así se puede bajar a 0 de golpe mientras se reproduce un vídeo
   del Lore, en vez de tener que silenciar cada sonido por separado. También
   es el punto por el que el botón de silenciar corta todo el audio del sitio. */
let staticBus = null;

// Preferencia de silencio, recordada entre visitas (ver initAudioToggleButton).
const AUDIO_MUTED_KEY = 'nova_audio_muted';
let isAudioMuted = storageGet(AUDIO_MUTED_KEY) === '1';

function getStaticBus(ctx) {
  if (!staticBus) {
    staticBus = ctx.createGain();
    staticBus.gain.value = isAudioMuted ? 0 : 1;
    staticBus.connect(ctx.destination);
  }
  return staticBus;
}

export function duckStaticAudio() {
  if (!audioCtx || !staticBus) return;
  const now = audioCtx.currentTime;
  staticBus.gain.cancelScheduledValues(now);
  staticBus.gain.setTargetAtTime(0, now, 0.08);
}

// No restaura el volumen si el usuario ha silenciado el sitio a propósito
// (p.ej. al terminar un vídeo del Lore con el audio ya silenciado).
export function restoreStaticAudio() {
  if (!audioCtx || !staticBus || isAudioMuted) return;
  const now = audioCtx.currentTime;
  staticBus.gain.cancelScheduledValues(now);
  staticBus.gain.setTargetAtTime(1, now, 0.2);
}

// Sube el bus de golpe, sin fundido (el "golpe seco" del final de 4D4N).
export function slamStaticAudio() {
  if (!audioCtx || !staticBus) return;
  staticBus.gain.cancelScheduledValues(audioCtx.currentTime);
  staticBus.gain.setValueAtTime(1, audioCtx.currentTime);
}

/* ---------------------------------------------------
   Botón de silenciar/reactivar el audio ambiente: útil para quien juegue
   con el sonido puesto en un sitio público. Corta/restaura el staticBus de
   golpe (no con el fundido de duck/restoreStaticAudio, pensado para vídeos)
   y recuerda la preferencia en localStorage para la próxima visita.
--------------------------------------------------- */
function setAudioMuted(muted) {
  isAudioMuted = muted;
  storageSet(AUDIO_MUTED_KEY, muted ? '1' : '0');
  if (audioCtx && staticBus) {
    const now = audioCtx.currentTime;
    staticBus.gain.cancelScheduledValues(now);
    staticBus.gain.setTargetAtTime(muted ? 0 : 1, now, 0.08);
  }
}

export function initAudioToggleButton() {
  const btn = document.getElementById('audio-toggle-btn');
  if (!btn) return;

  const sync = () => {
    btn.textContent = isAudioMuted ? 'Sonido silenciado' : 'Silenciar';
    btn.classList.toggle('is-muted', isAudioMuted);
    btn.setAttribute('aria-pressed', String(isAudioMuted));
  };
  sync();

  btn.addEventListener('click', () => {
    setAudioMuted(!isAudioMuted);
    sync();
  });
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

// Golpe grave suelto (p.ej. al llegar al pase "reveal" del Lore).
export function playStingerNow(volume) {
  const ctx = getAudioContext();
  if (ctx) playStinger(ctx, ctx.currentTime, volume);
}

export function playBootAudio() {
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

/* Ráfaga de estática al cambiar de "canal" (Lore <-> intro), reutilizando
   la misma infraestructura de audio del boot. */
export function playChannelChangeAudio() {
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
