/**
 * Voice coach + audio cues.
 *
 * Browsers only allow speech and audio after a user gesture, so `unlock()` must be
 * called from a real tap (the Start button does this). Everything degrades silently
 * if the device has no speech synthesis.
 */

type SpeakOpts = { interrupt?: boolean; rate?: number };

/** The Android app's bridge to the phone's own text-to-speech (Android WebView has no speechSynthesis). */
type NativeTTS = { speak(text: string, queue: number): void; stop(): void; setRate(r: number): void; setPitch(p: number): void };
const native = (): NativeTTS | null => (typeof window !== 'undefined' && (window as any).GKNative) || null;

class Coach {
  enabled = true;
  cuesEnabled = true;
  countdownEnabled = true;
  beepsEnabled = true;
  hapticsEnabled = true;
  rate = 1.0;
  pitch = 1.0;
  voiceURI: string | null = null;

  private ctx: AudioContext | null = null;
  private unlocked = false;
  private voices: SpeechSynthesisVoice[] = [];
  private lastSpoken = '';

  get supported() {
    return !!native() || (typeof window !== 'undefined' && 'speechSynthesis' in window);
  }

  loadVoices(): SpeechSynthesisVoice[] {
    if (!this.supported || native()) return [];
    this.voices = window.speechSynthesis.getVoices();
    return this.voices;
  }

  /** Call from a user gesture before the workout starts. */
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    try {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctor) {
        this.ctx = new Ctor();
        this.ctx.resume?.();
      }
    } catch { /* audio unavailable */ }
    if (this.supported && !native()) {
      // A silent utterance primes the engine on iOS and some Android WebViews.
      try {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        window.speechSynthesis.speak(u);
      } catch { /* ignore */ }
      this.loadVoices();
    }
  }

  private pickVoice(): SpeechSynthesisVoice | null {
    if (!this.voices.length) this.loadVoices();
    if (this.voiceURI) {
      const match = this.voices.find((v) => v.voiceURI === this.voiceURI);
      if (match) return match;
    }
    return (
      this.voices.find((v) => /en[-_](US|GB|IN)/i.test(v.lang) && /female|samantha|zira|google/i.test(v.name)) ??
      this.voices.find((v) => /^en/i.test(v.lang)) ??
      null
    );
  }

  speak(text: string, opts: SpeakOpts = {}) {
    if (!this.enabled || !this.supported || !text) return;
    const n = native();
    if (n) {
      try {
        n.setRate(opts.rate ?? this.rate);
        n.setPitch(this.pitch);
        n.speak(text, opts.interrupt ? 0 : 1); // QUEUE_FLUSH : QUEUE_ADD
        this.lastSpoken = text;
      } catch { /* ignore */ }
      return;
    }
    const synth = window.speechSynthesis;
    if (opts.interrupt) synth.cancel();
    else if (synth.speaking && text === this.lastSpoken) return;
    this.lastSpoken = text;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = opts.rate ?? this.rate;
      u.pitch = this.pitch;
      const v = this.pickVoice();
      if (v) { u.voice = v; u.lang = v.lang; }
      synth.speak(u);
    } catch { /* ignore */ }
  }

  stop() {
    const n = native();
    if (n) { try { n.stop(); } catch { /* ignore */ } return; }
    if (this.supported) { try { window.speechSynthesis.cancel(); } catch { /* ignore */ } }
  }

  /* ---------- semantic announcements ---------- */

  announce(name: string, detail?: string) {
    this.speak(detail ? `${name}. ${detail}` : name, { interrupt: true });
  }

  countdown(n: number) {
    if (!this.countdownEnabled) return;
    this.speak(String(n), { interrupt: true, rate: Math.min(1.4, this.rate + 0.15) });
    this.beep(n === 0 ? 880 : 660, n === 0 ? 0.18 : 0.08);
    this.buzz(n === 0 ? 90 : 25);
  }

  cue(text: string) {
    if (!this.cuesEnabled) return;
    this.speak(text);
  }

  halfway() {
    if (!this.cuesEnabled) return;
    this.speak('Halfway there');
  }

  rest(seconds: number, next?: string) {
    const nx = next ? ` Next up, ${next}.` : '';
    this.speak(`Rest. ${seconds} seconds.${nx}`, { interrupt: true });
    this.beep(440, 0.14);
  }

  finished(calories: number, minutes: number) {
    this.speak(
      `Workout complete. ${minutes} minutes, about ${calories} calories burned. Great work.`,
      { interrupt: true },
    );
    this.buzz([60, 60, 120]);
  }

  /* ---------- non-speech feedback ---------- */

  beep(freq = 660, dur = 0.1) {
    if (!this.beepsEnabled || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch { /* ignore */ }
  }

  buzz(pattern: number | number[] = 30) {
    if (!this.hapticsEnabled) return;
    try { navigator.vibrate?.(pattern); } catch { /* ignore */ }
  }
}

export const coach = new Coach();

/** Keeps the screen awake during a workout; no-ops where unsupported. */
export class Wake {
  private sentinel: any = null;
  async on() {
    try {
      if ('wakeLock' in navigator) {
        this.sentinel = await (navigator as any).wakeLock.request('screen');
      }
    } catch { /* ignore */ }
  }
  off() {
    try { this.sentinel?.release?.(); } catch { /* ignore */ }
    this.sentinel = null;
  }
  /** Re-acquire after the tab returns to the foreground. */
  async reacquire() {
    if (this.sentinel) await this.on();
  }
}

export const wake = new Wake();
