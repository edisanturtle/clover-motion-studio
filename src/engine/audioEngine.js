// Procedural Multi-Voice Web Audio Synthesizer, Master DSP Rack, Event SFX Sampler & Real-Time FFT Spectrum Analyzer

export class ProceduralAudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.masterGain = null;
    this.lowpassFilter = null;
    this.bassEq = null;
    this.delayNode = null;
    this.delayFeedback = null;
    this.delayWetGain = null;
    this.dspParams = {
      lowpassFreq: 20000,
      bassGain: 0,
      delayMix: 0,
    };
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

      // Master input gain node
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : this.volume;

      // Master DSP Rack: Bass Boost Low-Shelf -> Lowpass Filter -> Dry/Delay -> Analyser -> Destination
      this.bassEq = this.ctx.createBiquadFilter();
      this.bassEq.type = 'lowshelf';
      this.bassEq.frequency.value = 110;
      this.bassEq.gain.value = this.dspParams.bassGain;

      this.lowpassFilter = this.ctx.createBiquadFilter();
      this.lowpassFilter.type = 'lowpass';
      this.lowpassFilter.frequency.value = this.dspParams.lowpassFreq;
      this.lowpassFilter.Q.value = 1.4;

      // Stereo / Dub Echo Delay loop
      this.delayNode = this.ctx.createDelay(1.0);
      this.delayNode.delayTime.value = 0.28;
      this.delayFeedback = this.ctx.createGain();
      this.delayFeedback.gain.value = 0.36;
      this.delayWetGain = this.ctx.createGain();
      this.delayWetGain.gain.value = this.dspParams.delayMix;

      this.masterGain.connect(this.bassEq);
      this.bassEq.connect(this.lowpassFilter);

      // Dry path
      this.lowpassFilter.connect(this.analyser);

      // Wet delay path
      this.lowpassFilter.connect(this.delayNode);
      this.delayNode.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      this.delayNode.connect(this.delayWetGain);
      this.delayWetGain.connect(this.analyser);

      this.analyser.connect(this.ctx.destination);
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setDspParams(params = {}) {
    this.dspParams = { ...this.dspParams, ...params };
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.lowpassFilter && typeof this.dspParams.lowpassFreq === 'number') {
      this.lowpassFilter.frequency.setTargetAtTime(
        Math.max(120, Math.min(20000, this.dspParams.lowpassFreq)),
        now,
        0.02
      );
    }
    if (this.bassEq && typeof this.dspParams.bassGain === 'number') {
      this.bassEq.gain.setTargetAtTime(
        Math.max(-12, Math.min(18, this.dspParams.bassGain)),
        now,
        0.02
      );
    }
    if (this.delayWetGain && typeof this.dspParams.delayMix === 'number') {
      this.delayWetGain.gain.setTargetAtTime(
        Math.max(0, Math.min(0.85, this.dspParams.delayMix)),
        now,
        0.02
      );
    }
  }

  setBpm(bpm) {
    const cleanBpm = Math.max(60, Math.min(200, Math.round(bpm)));
    if (this.currentTrack) {
      this.currentTrack = { ...this.currentTrack, bpm: cleanBpm };
    }
    if (this.delayNode && this.ctx) {
      // Sync delay time to dotted eighth note of BPM
      const beatSec = 60 / cleanBpm;
      this.delayNode.delayTime.setTargetAtTime(Math.min(0.95, beatSec * 0.75), this.ctx.currentTime, 0.03);
    }
    if (this.isPlaying && !this.audioElement) {
      this.startStepSequencer();
    }
  }

  triggerSoundEffect(sfxId) {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    switch (sfxId) {
      case 'subDrop': {
        // 808 Sub Drop (110Hz -> 28Hz deep impact)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(115, now);
        osc.frequency.exponentialRampToValueAtTime(28, now + 0.85);
        gain.gain.setValueAtTime(0.75, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.95);
        break;
      }

      case 'riserSweep': {
        // Whoosh Riser Sweep
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.75);
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(300, now);
        filter.frequency.exponentialRampToValueAtTime(3200, now + 0.75);
        filter.Q.value = 3.5;
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.linearRampToValueAtTime(0.38, now + 0.65);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.82);
        break;
      }

      case 'glitchHit': {
        // Digital Glitch Stutter burst
        for (let i = 0; i < 4; i++) {
          const t0 = now + i * 0.045;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = i % 2 === 0 ? 'square' : 'sawtooth';
          osc.frequency.setValueAtTime(240 + i * 310, t0);
          osc.frequency.setValueAtTime(90 + i * 80, t0 + 0.02);
          gain.gain.setValueAtTime(0.32, t0);
          gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.04);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(t0);
          osc.stop(t0 + 0.042);
        }
        break;
      }

      case 'laserZap': {
        // Synth Laser Zap
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1850, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.22);
        gain.gain.setValueAtTime(0.38, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }

      case 'shutterClick': {
        // Crisp Mechanical Camera Shutter
        [0, 0.055].forEach((offset, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(idx === 0 ? 3200 : 2400, now + offset);
          osc.frequency.exponentialRampToValueAtTime(320, now + offset + 0.028);
          gain.gain.setValueAtTime(0.4, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.03);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now + offset);
          osc.stop(now + offset + 0.035);
        });
        break;
      }

      case 'stingerChord': {
        // Warm Clover Min9 Stinger Chord
        const freqs = [220, 261.63, 329.63, 392.0, 493.88];
        freqs.forEach((f, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(f, now);
          gain.gain.setValueAtTime(0.14, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 1.15);
        });
        break;
      }

      case 'vinylSpin': {
        // Turntable Brake / Rewind Spin
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(24, now + 0.48);
        gain.gain.setValueAtTime(0.32, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.52);
        break;
      }

      case 'crowdPulse':
      default: {
        // Festival Uplift Pulse
        const freqs = [146.83, 220, 293.66, 440, 587.33];
        freqs.forEach((f) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f * 0.98, now);
          osc.frequency.exponentialRampToValueAtTime(f * 1.02, now + 0.65);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.72);
        });
        break;
      }
    }
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
    const rms = bass * 0.45 + mid * 0.35 + treble * 0.2;

    return { bass, mid, treble, rms, bars };
  }
}
