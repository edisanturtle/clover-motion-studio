// Procedural Multi-Voice Web Audio Synthesizer & Real-Time FFT Spectrum Analyzer

export class ProceduralAudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.masterGain = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.volume = 0.75;
    this.currentTrack = null;
    this.stepTimer = null;
    this.stepIndex = 0;
    this.freqData = new Uint8Array(64);
    this.audioElement = null;
    this.mediaElementSource = null;
    this.micStream = null;
    this.micSource = null;
  }

  ensureContext() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.78;
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  start(track) {
    this.ensureContext();
    this.currentTrack = track || this.currentTrack || { id: 'funk', bpm: 104, rootFreq: 110 };
    this.isPlaying = true;

    if (this.audioElement) {
      this.audioElement.play().catch(() => {});
      return;
    }

    this.startStepSequencer();
  }

  stop() {
    this.isPlaying = false;
    if (this.stepTimer) {
      clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  setTrack(track) {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
    this.currentTrack = track;
    if (this.isPlaying) {
      this.startStepSequencer();
    }
  }

  startStepSequencer() {
    if (this.stepTimer) clearInterval(this.stepTimer);
    const bpm = this.currentTrack?.bpm || 110;
    const stepMs = (60 / bpm / 4) * 1000;

    this.stepTimer = setInterval(() => {
      if (!this.isPlaying || this.isMuted || !this.ctx) return;
      this.triggerStep(this.stepIndex);
      this.stepIndex = (this.stepIndex + 1) % 16;
    }, stepMs);
  }

  triggerStep(step) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const pattern = this.currentTrack?.pattern || 'funk';
    const root = this.currentTrack?.rootFreq || 110;

    // 1. Kick drum
    const isKick =
      pattern === 'ambient'
        ? false
        : pattern === 'ticks'
        ? step === 0 || step === 8
        : pattern === 'breakbeat' || pattern === 'funk'
        ? step === 0 || step === 3 || step === 6 || step === 10
        : step % 4 === 0;

    if (isKick) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(125, now);
      osc.frequency.exponentialRampToValueAtTime(36, now + 0.12);
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.15);
    }

    // 2. Snare / Clap on steps 4 and 12
    if (pattern !== 'ambient' && pattern !== 'ticks' && (step === 4 || step === 12)) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.09);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.11);
    }

    // 3. Hi-hat / Ticks on even or offbeat steps
    if (pattern !== 'ambient' && step % 2 === 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(pattern === 'ticks' ? 2400 : 3800, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.035);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.04);
    }

    // 4. Bass / Synth note
    if (step % 2 === 0) {
      const intervals = [1, 1.2, 1.333, 1.5, 1.2, 1, 0.89, 1.125];
      const mult = intervals[(step / 2) % intervals.length];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = pattern === 'techno' || pattern === 'electro' ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(root * mult, now);
      const dur = pattern === 'ambient' ? 0.45 : 0.16;
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    }
  }

  loadAudioFile(file) {
    this.ensureContext();
    if (this.stepTimer) {
      clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
    }
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.loop = true;
    this.audioElement = audio;
    try {
      this.mediaElementSource = this.ctx.createMediaElementSource(audio);
      this.mediaElementSource.connect(this.masterGain);
    } catch {
      // ignore if already connected
    }
    audio.play().catch(() => {});
    this.isPlaying = true;
  }

  async enableMicrophone() {
    try {
      this.ensureContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.micStream = stream;
      this.micSource = this.ctx.createMediaStreamSource(stream);
      this.micSource.connect(this.analyser);
      return true;
    } catch {
      return false;
    }
  }

  disableMicrophone() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && !this.isMuted) {
      this.masterGain.gain.value = this.volume;
    }
  }

  setMuted(muted) {
    this.isMuted = !!muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
    }
  }

  getAnalysis() {
    if (!this.analyser || !this.isPlaying) {
      return {
        bass: 0.12,
        mid: 0.1,
        treble: 0.08,
        rms: 0.1,
        bars: new Array(32).fill(0.12),
      };
    }

    this.analyser.getByteFrequencyData(this.freqData);
    const bars = [];
    for (let i = 0; i < 32; i++) {
      bars.push(Math.max(0.06, (this.freqData[i] || 0) / 255));
    }

    const avgRange = (start, end) => {
      let sum = 0;
      for (let i = start; i < end; i++) sum += bars[i] || 0;
      return sum / Math.max(1, end - start);
    };

    const bass = avgRange(0, 6);
    const mid = avgRange(6, 18);
    const treble = avgRange(18, 30);
    const rms = (bass * 0.45 + mid * 0.35 + treble * 0.2);

    return { bass, mid, treble, rms, bars };
  }
}
