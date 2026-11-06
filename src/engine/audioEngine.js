// Procedural Multi-Voice Web Audio Synthesizer, SoundCraft-Inspired Master DSP Rack,
// Event SFX Sampler & Real-Time FFT Spectrum Analyzer

function makeSaturationCurve(amount = 0) {
  const k = Math.max(0, Math.min(50, amount * 25));
  const samples = 1024;
  const curve = new Float32Array(samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < samples; ++i) {
    const x = (i * 2) / samples - 1;
    if (k === 0) {
      curve[i] = x;
    } else {
      // Soft saturation curve inspired by SoundCraft harmonic.rs
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
  }
  return curve;
}

function buildReverbImpulse(ctx, duration = 1.8, decay = 2.4) {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.round(rate * Math.max(0.2, duration)));
  const impulse = ctx.createBuffer(2, length, rate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const n = i / length;
    const env = Math.pow(1 - n, decay);
    // Exponentially decaying stereo diffuse noise buffer (acoustic chamber)
    left[i] = (Math.random() * 2 - 1) * env;
    right[i] = (Math.random() * 2 - 1) * env;
  }
  return impulse;
}

export class ProceduralAudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.masterGain = null;

    // 3-Band Parametric EQ & Filtering
    this.bassEq = null;
    this.midEq = null;
    this.trebleEq = null;
    this.lowpassFilter = null;

    // Saturation & Stereo Pan
    this.saturationNode = null;
    this.pannerNode = null;

    // Echo Delay
    this.delayNode = null;
    this.delayFeedback = null;
    this.delayWetGain = null;

    // Algorithmic Reverb
    this.convolverNode = null;
    this.reverbWetGain = null;

    this.dspParams = {
      lowpassFreq: 20000,
      bassGain: 0,
      midGain: 0,
      trebleGain: 0,
      drive: 0,
      delayMix: 0,
      reverbMix: 0,
      reverbDecay: 1.8,
      pan: 0,
      swing: 0.15,
      tempoMultiplier: 1.0,
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

    // Fase 5: Multi-Track Clip Buffer Cache & Active Playback Nodes
    this.clipBuffers = new Map(); // assetId -> AudioBuffer
    this.activeClipSources = [];  // Array of { clipId, trackId, source, gainNode, panner }
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

      // 1. Low Shelf EQ (Sub-Bass: 110Hz, -12dB .. +18dB)
      this.bassEq = this.ctx.createBiquadFilter();
      this.bassEq.type = 'lowshelf';
      this.bassEq.frequency.value = 110;
      this.bassEq.gain.value = this.dspParams.bassGain || 0;

      // 2. Peaking Mid EQ (Body/Vocal: 1400Hz, -12dB .. +12dB)
      this.midEq = this.ctx.createBiquadFilter();
      this.midEq.type = 'peaking';
      this.midEq.frequency.value = 1400;
      this.midEq.Q.value = 1.2;
      this.midEq.gain.value = this.dspParams.midGain || 0;

      // 3. High Shelf EQ (Air/Brilliance: 7500Hz, -12dB .. +15dB)
      this.trebleEq = this.ctx.createBiquadFilter();
      this.trebleEq.type = 'highshelf';
      this.trebleEq.frequency.value = 7500;
      this.trebleEq.gain.value = this.dspParams.trebleGain || 0;

      // 4. Analog Saturation / Tape Drive (WaveShaperNode)
      this.saturationNode = this.ctx.createWaveShaper();
      this.saturationNode.curve = makeSaturationCurve(this.dspParams.drive || 0);
      this.saturationNode.oversample = '2x';

      // 5. Master Lowpass Cutoff
      this.lowpassFilter = this.ctx.createBiquadFilter();
      this.lowpassFilter.type = 'lowpass';
      this.lowpassFilter.frequency.value = this.dspParams.lowpassFreq || 20000;
      this.lowpassFilter.Q.value = 1.4;

      // 6. Stereo / Dub Echo Delay loop
      this.delayNode = this.ctx.createDelay(1.2);
      this.delayNode.delayTime.value = 0.28;
      this.delayFeedback = this.ctx.createGain();
      this.delayFeedback.gain.value = 0.36;
      this.delayWetGain = this.ctx.createGain();
      this.delayWetGain.gain.value = this.dspParams.delayMix || 0;

      // 7. Algorithmic Space Reverb
      this.convolverNode = this.ctx.createConvolver();
      this.convolverNode.buffer = buildReverbImpulse(this.ctx, this.dspParams.reverbDecay || 1.8, 2.4);
      this.reverbWetGain = this.ctx.createGain();
      this.reverbWetGain.gain.value = this.dspParams.reverbMix || 0;

      // 8. Stereo Panning Node
      if (this.ctx.createStereoPanner) {
        this.pannerNode = this.ctx.createStereoPanner();
        this.pannerNode.pan.value = this.dspParams.pan || 0;
      }

      // Connect Series EQ & Drive Chain
      this.masterGain.connect(this.bassEq);
      this.bassEq.connect(this.midEq);
      this.midEq.connect(this.trebleEq);
      this.trebleEq.connect(this.saturationNode);
      this.saturationNode.connect(this.lowpassFilter);

      // Intermediate summing bus before panner/analyser
      const mixBus = this.ctx.createGain();

      // Dry path to mix bus
      this.lowpassFilter.connect(mixBus);

      // Delay send -> feedback loop -> delay wet to mix bus
      this.lowpassFilter.connect(this.delayNode);
      this.delayNode.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      this.delayNode.connect(this.delayWetGain);
      this.delayWetGain.connect(mixBus);

      // Reverb send -> convolver -> reverb wet to mix bus
      this.lowpassFilter.connect(this.convolverNode);
      this.convolverNode.connect(this.reverbWetGain);
      this.reverbWetGain.connect(mixBus);

      // Final master output stage
      if (this.pannerNode) {
        mixBus.connect(this.pannerNode);
        this.pannerNode.connect(this.analyser);
      } else {
        mixBus.connect(this.analyser);
      }

      this.analyser.connect(this.ctx.destination);
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);

      // Create MediaStreamDestination for video export recorder
      this.streamDestination = this.ctx.createMediaStreamDestination();
      this.analyser.connect(this.streamDestination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  getAudioStream() {
    this.ensureContext();
    return this.streamDestination ? this.streamDestination.stream : null;
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
    if (this.midEq && typeof this.dspParams.midGain === 'number') {
      this.midEq.gain.setTargetAtTime(
        Math.max(-12, Math.min(12, this.dspParams.midGain)),
        now,
        0.02
      );
    }
    if (this.trebleEq && typeof this.dspParams.trebleGain === 'number') {
      this.trebleEq.gain.setTargetAtTime(
        Math.max(-12, Math.min(15, this.dspParams.trebleGain)),
        now,
        0.02
      );
    }
    if (this.saturationNode && typeof this.dspParams.drive === 'number') {
      this.saturationNode.curve = makeSaturationCurve(this.dspParams.drive);
    }
    if (this.delayWetGain && typeof this.dspParams.delayMix === 'number') {
      this.delayWetGain.gain.setTargetAtTime(
        Math.max(0, Math.min(0.85, this.dspParams.delayMix)),
        now,
        0.02
      );
    }
    if (this.delayNode && typeof this.dspParams.delayTime === 'number') {
      this.delayNode.delayTime.setTargetAtTime(
        Math.max(0.02, Math.min(1.2, this.dspParams.delayTime)),
        now,
        0.02
      );
    }
    if (this.delayFeedback && typeof this.dspParams.delayFeedback === 'number') {
      this.delayFeedback.gain.setTargetAtTime(
        Math.max(0, Math.min(0.85, this.dspParams.delayFeedback)),
        now,
        0.02
      );
    }
    if (this.reverbWetGain && typeof this.dspParams.reverbMix === 'number') {
      this.reverbWetGain.gain.setTargetAtTime(
        Math.max(0, Math.min(0.85, this.dspParams.reverbMix)),
        now,
        0.02
      );
    }
    if (this.pannerNode && typeof this.dspParams.pan === 'number') {
      this.pannerNode.pan.setTargetAtTime(
        Math.max(-1, Math.min(1, this.dspParams.pan)),
        now,
        0.02
      );
    }
    if (typeof this.dspParams.reverbDecay === 'number' && this.convolverNode) {
      this.convolverNode.buffer = buildReverbImpulse(this.ctx, this.dspParams.reverbDecay, 2.4);
    }
  }

  setBpm(bpm) {
    const cleanBpm = Math.max(60, Math.min(220, Math.round(bpm)));
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

  triggerSfx(sfxId) {
    return this.triggerSoundEffect(sfxId);
  }

  triggerSoundEffect(sfxId) {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    const now = this.ctx.currentTime;

    switch (sfxId) {
      case 'subDrop': {
        // 808 Sub Drop (115Hz -> 28Hz deep impact)
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
        osc.stop(now + 0.92);
        break;
      }

      case 'riserSweep': {
        // White noise build & filter sweep
        const bufferSize = this.ctx.sampleRate * 1.2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(300, now);
        filter.frequency.exponentialRampToValueAtTime(6500, now + 1.15);
        filter.Q.value = 4.0;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.38, now + 1.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        whiteNoise.start(now);
        whiteNoise.stop(now + 1.22);
        break;
      }

      case 'laserZap': {
        // High-energy sci-fi FM Zap
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1600, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.22);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }

      case 'tapeStop': {
        // Turntable tape stop deceleration
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.55);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.58);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.6);
        break;
      }

      case 'airHorn': {
        // Stadium Brass Tri-Tone
        const freqs = [370, 466.16, 554.37];
        freqs.forEach((f) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, now);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.45);
        });
        break;
      }

      case 'glitchBurst': {
        // Digital sync burst
        const bursts = [0, 0.04, 0.08, 0.12];
        bursts.forEach((offset) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(880 + Math.random() * 600, now + offset);
          gain.gain.setValueAtTime(0.25, now + offset);
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
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
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
      clearTimeout(this.stepTimer);
      this.stepTimer = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.stopClipPlayback();
  }

  // ==========================================
  // Fase 5: Multi-Track Clip Scheduling & DSP
  // ==========================================

  registerClipBuffer(assetId, audioBuffer) {
    if (!assetId || !audioBuffer) return;
    this.clipBuffers.set(assetId, audioBuffer);
  }

  hasClipBuffer(assetId) {
    return this.clipBuffers.has(assetId);
  }

  getClipBuffer(assetId) {
    return this.clipBuffers.get(assetId) || null;
  }

  async loadClipAudioBuffer(assetId, arrayBuffer) {
    this.ensureContext();
    if (!this.ctx || !arrayBuffer) return null;
    try {
      const decoded = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
      this.clipBuffers.set(assetId, decoded);
      return decoded;
    } catch (err) {
      console.error('Failed to decode audio buffer:', err);
      return null;
    }
  }

  scheduleClipPlayback(tracks = [], playheadTime = 0) {
    this.stopClipPlayback();
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const hasSolo = tracks.some((t) => t.solo);
    const audibleTracks = tracks.filter((t) => (hasSolo ? t.solo && !t.mute : !t.mute));
    const now = this.ctx.currentTime;

    audibleTracks.forEach((track) => {
      const trackVol = track.volume ?? 1.0;
      const trackPan = track.pan ?? 0.0;

      (track.clips || []).forEach((clip) => {
        const buffer = this.clipBuffers.get(clip.assetId);
        if (!buffer) return;

        const clipStart = Number(clip.trackTime) || 0;
        const clipTrimIn = Number(clip.trimIn) || 0;
        const clipTrimOut = Number(clip.trimOut) || (clipTrimIn + buffer.duration);
        const clipDuration = Number(clip.duration) || (clipTrimOut - clipTrimIn);
        const clipEnd = clipStart + clipDuration;

        let scheduledStart = 0;
        let bufferOffset = clipTrimIn;
        let playDuration = clipDuration;

        if (playheadTime < clipStart) {
          // Scheduled in future
          scheduledStart = now + (clipStart - playheadTime);
          bufferOffset = clipTrimIn;
          playDuration = clipDuration;
        } else if (playheadTime >= clipStart && playheadTime < clipEnd) {
          // Playhead currently inside clip
          const elapsed = playheadTime - clipStart;
          scheduledStart = now;
          bufferOffset = clipTrimIn + elapsed;
          playDuration = clipDuration - elapsed;
        } else if (clip.loop) {
          // Past clip but loop is active
          scheduledStart = now;
          const cycleOffset = (playheadTime - clipStart) % Math.max(0.05, clipDuration);
          bufferOffset = clipTrimIn + cycleOffset;
          playDuration = clipDuration - cycleOffset;
        } else {
          return; // Past non-looping clip
        }

        try {
          const source = this.ctx.createBufferSource();
          source.buffer = buffer;
          source.loop = Boolean(clip.loop);
          if (clip.loop) {
            source.loopStart = clipTrimIn;
            source.loopEnd = clipTrimOut;
          }

          const gainNode = this.ctx.createGain();
          const targetGain = Math.max(0, Math.min(2.0, (clip.gain ?? 1.0) * trackVol));
          const fadeInSec = Math.min(clip.fadeIn || 0, playDuration / 2);
          const fadeOutSec = Math.min(clip.fadeOut || 0, playDuration / 2);

          if (fadeInSec > 0.01) {
            gainNode.gain.setValueAtTime(0.0001, scheduledStart);
            gainNode.gain.linearRampToValueAtTime(targetGain, scheduledStart + fadeInSec);
          } else {
            gainNode.gain.setValueAtTime(targetGain, scheduledStart);
          }

          if (fadeOutSec > 0.01) {
            const fadeOutStart = scheduledStart + playDuration - fadeOutSec;
            gainNode.gain.setValueAtTime(targetGain, Math.max(scheduledStart, fadeOutStart));
            gainNode.gain.linearRampToValueAtTime(0.0001, scheduledStart + playDuration);
          }

          let panner = null;
          const totalPan = Math.max(-1.0, Math.min(1.0, trackPan + (clip.pan ?? 0.0)));
          if (this.ctx.createStereoPanner) {
            panner = this.ctx.createStereoPanner();
            panner.pan.value = totalPan;
            source.connect(gainNode);
            gainNode.connect(panner);
            panner.connect(this.masterGain);
          } else {
            source.connect(gainNode);
            gainNode.connect(this.masterGain);
          }

          source.start(scheduledStart, bufferOffset, playDuration > 0 ? playDuration : undefined);

          this.activeClipSources.push({
            clipId: clip.id,
            trackId: track.id,
            source,
            gainNode,
            panner,
          });
        } catch (err) {
          // Gracefully ignore audio graph errors during rapid scrubbing
        }
      });
    });
  }

  stopClipPlayback() {
    if (this.activeClipSources && this.activeClipSources.length > 0) {
      this.activeClipSources.forEach(({ source, gainNode, panner }) => {
        try {
          source.stop();
        } catch {}
        try {
          source.disconnect();
          gainNode.disconnect();
          if (panner) panner.disconnect();
        } catch {}
      });
      this.activeClipSources = [];
    }
  }

  seekClips(playheadTime, tracks = []) {
    if (this.isPlaying) {
      this.scheduleClipPlayback(tracks, playheadTime);
    } else {
      this.stopClipPlayback();
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
    if (this.stepTimer) {
      clearTimeout(this.stepTimer);
      this.stepTimer = null;
    }
    this.scheduleNextStep();
  }

  scheduleNextStep() {
    if (!this.isPlaying || !this.ctx) return;
    const baseBpm = this.currentTrack?.bpm || 110;
    const tempoMultiplier = this.dspParams.tempoMultiplier || 1.0;
    const bpm = Math.max(50, Math.min(240, baseBpm * tempoMultiplier));
    const stepDurationSec = 60 / bpm / 4;

    // SoundCraft-inspired Swing Groove:
    // Even steps (0, 2, 4...) fall on grid; odd steps (1, 3, 5...) are swung forward
    const swingFactor = Math.max(0, Math.min(0.5, this.dspParams.swing || 0));
    const isOdd = this.stepIndex % 2 === 1;
    const currentStepDelaySec = isOdd
      ? stepDurationSec * (1 + swingFactor * 0.45)
      : stepDurationSec * (1 - swingFactor * 0.45);

    this.triggerStep(this.stepIndex);
    this.stepIndex = (this.stepIndex + 1) % 16;

    this.stepTimer = setTimeout(() => {
      this.scheduleNextStep();
    }, currentStepDelaySec * 1000);
  }

  triggerStep(step) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
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
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.18);
    }

    // 2. Snare drum / Rimshot
    const isSnare =
      pattern === 'ambient'
        ? false
        : pattern === 'ticks'
        ? step === 4 || step === 12
        : step === 4 || step === 12;

    if (isSnare) {
      // Noise burst + tone body
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.12);

      // Snare snap
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.08, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 1800;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start(now);
    }

    // 3. Hi-hat / Shaker
    const isHat = pattern !== 'ambient';
    if (isHat && (step % 2 === 0 || pattern === 'breakbeat')) {
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.035, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 7500;
      const noiseGain = this.ctx.createGain();
      const hatVolume = step % 4 === 2 ? 0.09 : 0.04;
      noiseGain.gain.setValueAtTime(hatVolume, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start(now);
    }

    // 4. Bass synth line
    const bassSteps = [0, 3, 6, 8, 10, 14];
    if (bassSteps.includes(step)) {
      const bassNotes = [1, 1, 1.2, 1, 1.33, 1.5];
      const noteMult = bassNotes[step % bassNotes.length];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(root * 0.5 * noteMult, now);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.24);
    }

    // 5. Melodic chord arpeggio / pads
    if (step % 4 === 0 || (pattern === 'ambient' && step % 8 === 0)) {
      const scale = [1, 1.2, 1.33, 1.5, 1.78, 2];
      const note = scale[Math.floor((step / 4) % scale.length)];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(root * 2 * note, now);
      const chordLen = pattern === 'ambient' ? 1.4 : 0.45;
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + chordLen);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + chordLen + 0.05);
    }
  }

  loadAudioFile(file) {
    this.ensureContext();
    if (!this.ctx) return;
    const url = URL.createObjectURL(file);
    if (this.audioElement) {
      this.audioElement.pause();
    }
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.src = url;
    audio.loop = true;
    this.audioElement = audio;

    if (!this.mediaElementSource) {
      this.mediaElementSource = this.ctx.createMediaElementSource(audio);
      this.mediaElementSource.connect(this.masterGain);
    }

    if (this.isPlaying) {
      audio.play().catch(() => {});
    }
  }

  async enableMicrophone() {
    this.ensureContext();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.micStream = stream;
      this.micSource = this.ctx.createMediaStreamSource(stream);
      this.micSource.connect(this.masterGain);
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
        amplitude: 0.1,
        transient: 0,
        beat: 0,
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

    // Transient Onset & Beat detection with exponential decay envelope
    const prevEnergy = this.lastAnalysisEnergy || 0;
    const currentEnergy = bass * 0.7 + rms * 0.3;
    this.lastAnalysisEnergy = currentEnergy;
    const energyDelta = Math.max(0, currentEnergy - prevEnergy);

    if (energyDelta > 0.12) {
      this.transientEnvelope = 1.0;
    } else {
      this.transientEnvelope = Math.max(0, (this.transientEnvelope || 0) * 0.75);
    }
    const transient = Number(this.transientEnvelope.toFixed(3));
    const beat = transient > 0.35 ? 1 : 0;

    return { bass, mid, treble, rms, amplitude: rms, transient, beat, bars };
  }
}
