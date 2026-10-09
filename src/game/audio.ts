let ctx: AudioContext | null = null;
let master: GainNode;
let hiss: GainNode;
let noiseBuf: AudioBuffer;
let musicGain: GainNode | null = null;
let musicTimer: ReturnType<typeof setInterval> | null = null;
const musicNodes = new Set<OscillatorNode>();

function noiseSrc() {
  if (!ctx) throw new Error("Audio not initialized");
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  return s;
}

function env(g: GainNode, t: number, peak: number, a: number, d: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

export const audio = {
  init() {
    if (ctx) {
      void ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(comp).connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    // interior hum
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 160;
    const hg = ctx.createGain();
    hg.gain.value = 0.09;
    lp.connect(hg).connect(master);
    for (const f of [55, 55.6, 110.3]) {
      const o = ctx.createOscillator();
      o.type = f > 100 ? "sine" : "sawtooth";
      o.frequency.value = f;
      o.connect(lp);
      o.start();
    }
    const air = noiseSrc();
    air.loop = true;
    const af = ctx.createBiquadFilter();
    af.type = "lowpass";
    af.frequency.value = 300;
    const ag = ctx.createGain();
    ag.gain.value = 0.025;
    air.connect(af).connect(ag).connect(master);
    air.start();

    // thruster hiss bed
    const hs = noiseSrc();
    hs.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2200;
    bp.Q.value = 0.6;
    hiss = ctx.createGain();
    hiss.gain.value = 0;
    hs.connect(bp).connect(hiss).connect(master);
    hs.start();
  },
  suspend(on: boolean) {
    if (!ctx) return;
    if (on) void ctx.suspend();
    else void ctx.resume();
  },
  setHiss(v: number) {
    if (!ctx) return;
    hiss.gain.setTargetAtTime(v * 0.07, ctx.currentTime, 0.04);
  },
  music(on: boolean) {
    if (!ctx) return;
    const context = ctx;
    if (musicGain) { musicGain.gain.setTargetAtTime(on ? 0.42 : 0, context.currentTime, 0.5); return; }
    if (!on) return;
    // Original slow organ/string-like score, not a film recording or copied melody.
    const bus = context.createGain(); musicGain = bus;
    bus.gain.setValueAtTime(0, context.currentTime);
    bus.gain.setTargetAtTime(0.42, context.currentTime, 1.5);
    bus.connect(master);
    const reverb = context.createConvolver();
    const impulse = context.createBuffer(2, Math.floor(context.sampleRate * 3), context.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const samples = impulse.getChannelData(ch);
      for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * Math.exp(-i / context.sampleRate * 2.4) * 0.3;
    }
    reverb.buffer = impulse;
    const wet = context.createGain(); wet.gain.value = 0.4;
    reverb.connect(wet).connect(bus);
    const voice = (midi: number, at: number, duration: number, volume: number, pad: boolean) => {
      const oscillator = context.createOscillator();
      if (pad) {
        oscillator.setPeriodicWave(context.createPeriodicWave(new Float32Array(6), new Float32Array([0, 1, 0.22, 0.08, 0.03, 0.01])));
      } else oscillator.type = "sine";
      oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(volume, at + (pad ? 1.4 : 0.035));
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      oscillator.connect(gain); gain.connect(bus); gain.connect(reverb);
      musicNodes.add(oscillator);
      oscillator.onended = () => { musicNodes.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(at); oscillator.stop(at + duration + 0.05);
    };
    const chords = [[45, 52, 59, 60], [48, 55, 59, 64], [40, 47, 54, 55], [43, 50, 57, 62]];
    const steps = [0, 2, 1, 3, 2, 1, 3, 2];
    const beat = 60 / 72;
    let index = 0, next = context.currentTime + 0.08;
    const schedule = () => {
      if (context.state !== "running") return;
      if (next < context.currentTime) next = context.currentTime + 0.04;
      while (next < context.currentTime + 0.15) {
        const chord = chords[Math.floor(index / 8) % chords.length];
        if (!chord) return;
        if (index % 8 === 0) for (const note of chord) voice(note, next, beat * 9, 0.045, true);
        const note = chord[steps[index % 8] ?? 0];
        if (note !== undefined) voice(note + 24, next, beat * 2.7, 0.055, false);
        next += beat; index++;
      }
    };
    schedule(); musicTimer = setInterval(schedule, 50);
  },
  stopMusic() {
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = null;
    for (const node of musicNodes) node.stop();
    musicNodes.clear(); musicGain?.disconnect(); musicGain = null;
  },
  thud() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(28, t + 0.3);
    const g = ctx.createGain();
    env(g, t, 0.55, 0.005, 0.3);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.4);
    const n = noiseSrc();
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 500;
    const ng = ctx.createGain();
    env(ng, t, 0.25, 0.003, 0.15);
    n.connect(f).connect(ng).connect(master);
    n.start(t);
    n.stop(t + 0.2);
  },
  beep(freq = 880, dur = 0.12, vol = 0.12) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.value = freq;
    const g = ctx.createGain();
    env(g, t, vol, 0.005, dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  },
  squelch() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const n = noiseSrc();
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 1800;
    f.Q.value = 1.2;
    const g = ctx.createGain();
    env(g, t, 0.2, 0.01, 0.28);
    n.connect(f).connect(g).connect(master);
    n.start(t);
    n.stop(t + 0.35);
  },
  chime() {
    if (!ctx) return;
    const context = ctx;
    this.squelch();
    const t = ctx.currentTime + 0.3;
    [988, 1319, 1976].forEach((fr, i) => {
      const o = context.createOscillator();
      o.frequency.value = fr;
      const g = context.createGain();
      env(g, t + i * 0.12, 0.12, 0.01, 0.4);
      o.connect(g).connect(master);
      o.start(t + i * 0.12);
      o.stop(t + i * 0.12 + 0.5);
    });
  },
  voice(text: string) {
    this.chime();
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.02;
      u.pitch = 0.75;
      u.volume = 0.8;
      setTimeout(() => speechSynthesis.speak(u), 750);
    } catch {
      /* no speech */
    }
  },
  impact() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const n = noiseSrc();
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(2500, t);
    f.frequency.exponentialRampToValueAtTime(120, t + 0.6);
    const g = ctx.createGain();
    env(g, t, 0.9, 0.003, 0.7);
    n.connect(f).connect(g).connect(master);
    n.start(t);
    n.stop(t + 0.8);
    this.thud();
  },
  clamp() {
    if (!ctx) return;
    const context = ctx;
    const t0 = ctx.currentTime;
    // servo whine
    const s = ctx.createOscillator();
    s.type = "sawtooth";
    s.frequency.setValueAtTime(180, t0);
    s.frequency.exponentialRampToValueAtTime(620, t0 + 0.7);
    const sf = ctx.createBiquadFilter();
    sf.type = "bandpass";
    sf.frequency.value = 900;
    const sg = ctx.createGain();
    env(sg, t0, 0.06, 0.1, 0.65);
    s.connect(sf).connect(sg).connect(master);
    s.start(t0);
    s.stop(t0 + 0.9);
    // metallic latches
    [0.75, 0.95, 1.05].forEach((dt, i) => {
      const t = t0 + dt;
      for (const fr of [180, 830, 2450]) {
        const n = noiseSrc();
        const f = context.createBiquadFilter();
        f.type = "bandpass";
        f.frequency.value = fr * (1 + i * 0.07);
        f.Q.value = 18;
        const g = context.createGain();
        env(g, t, 1.2, 0.002, 0.5);
        n.connect(f).connect(g).connect(master);
        n.start(t);
        n.stop(t + 0.6);
      }
      const o = context.createOscillator();
      o.frequency.setValueAtTime(55, t);
      o.frequency.exponentialRampToValueAtTime(30, t + 0.4);
      const og = context.createGain();
      env(og, t, 0.7, 0.003, 0.4);
      o.connect(og).connect(master);
      o.start(t);
      o.stop(t + 0.5);
    });
  },
  warp() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const n = noiseSrc();
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 0.7;
    f.frequency.setValueAtTime(120, t);
    f.frequency.exponentialRampToValueAtTime(6000, t + 1.1);
    f.frequency.exponentialRampToValueAtTime(700, t + 4.6);
    const g = ctx.createGain(); env(g, t, 0.55, 1.1, 3.7);
    n.loop = true; n.connect(f).connect(g).connect(master); n.start(t); n.stop(t + 5);
    for (const hz of [38, 57, 85]) {
      const o = ctx.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(hz, t); o.frequency.exponentialRampToValueAtTime(hz * 5, t + 1.1);
      o.frequency.exponentialRampToValueAtTime(hz * 0.8, t + 4.8);
      const gain = ctx.createGain(); env(gain, t, 0.16, 0.9, 3.9);
      o.connect(gain).connect(master); o.start(t); o.stop(t + 5);
    }
  },
  warpExit() { this.thud(); this.squelch(); },
};
