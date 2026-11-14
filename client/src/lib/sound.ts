/**
 * Synthesized notification sounds — no audio assets required.
 * Uses Web Audio API to generate a two-tone bell (523 Hz → 784 Hz).
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (audioCtx) return audioCtx;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Play a pleasant two-tone bell. Must be triggered from a user-initiated
 * event at least once (browser autoplay policy). Since the swap notification
 * arrives after login + navigation, autoplay is usually allowed.
 */
export function playNotificationChime(): void {
  const ctx = getCtx();
  if (!ctx) return;

  // Some browsers require resume() after user interaction
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;

  const playTone = (freq: number, start: number, duration: number, gain: number) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    // ADSR-style envelope — quick attack, exponential decay
    g.gain.setValueAtTime(0, now + start);
    g.gain.linearRampToValueAtTime(gain, now + start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

    osc.connect(g);
    g.connect(ctx.destination);

    osc.start(now + start);
    osc.stop(now + start + duration + 0.05);
  };

  // Two-tone bell: 523 Hz (C5) then 784 Hz (G5)
  playTone(523.25, 0, 0.18, 0.12);
  playTone(783.99, 0.16, 0.22, 0.12);
}

/**
 * Slightly different chime for accepted swaps (single high tone)
 */
export function playAcceptedChime(): void {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 880; // A5
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.1, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.35);
}