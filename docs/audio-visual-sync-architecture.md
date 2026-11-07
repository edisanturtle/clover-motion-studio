# Clover Motion Studio — Audio-Visual Synchronization Architecture & Clock Reconciler

**Document Version**: 1.0.0 (Fase 8)  
**Governing ADRs**: ADR 004 (Rational Timebase), ADR 006 (Multi-Track Audio Engine), ADR 007 (Audio-Reactive Modulation)  
**Status**: APPROVED & IMPLEMENTED

---

## 1. Architectural Overview & Design Intent

Clover Motion Studio coordinates high-precision procedural graphics, 2D canvas rendering, and multi-track audio playback. To maintain frame-accurate lip-sync, musical beat alignment, and deterministic export without drift, the system enforces a strict mathematical separation between:
1. **Media Project Clock (Rational Timebase)**: Absolute integer ticks ($254{,}016{,}000{,}000\text{ ticks/sec}$).
2. **Audio Sample Clock (Discrete Sample Index)**: Discrete PCM frames evaluated at $48{,}000\text{ Hz}$, $44{,}100\text{ Hz}$, or $96{,}000\text{ Hz}$.
3. **SoundCraft Musical Clock (Pulses Per Quarter Note)**: Musical subdivision ticks ($PPQ = 960$) evaluated at dynamic BPM.

```
       +-----------------------------------------------------------+
       |         Media Timebase (ADR 004)                          |
       |         254,016,000,000 BigInt ticks / second             |
       +-----------------------------+-----------------------------+
                                     |
             +-----------------------+-----------------------+
             |                                               |
             v                                               v
+----------------------------+                 +----------------------------+
|  Audio Sample Clock        |                 |  SoundCraft Musical Clock  |
|  48 kHz: 5,292,000 t/samp  |                 |  PPQ = 960 ticks / beat    |
|  44.1 kHz: 5,760,000       |                 |  120 BPM: 132,300,000 t/PPQ|
|  96 kHz: 2,646,000         |                 |  (Direct cast FORBIDDEN)   |
+----------------------------+                 +----------------------------+
```

---

## 2. Clock Invariants & Mathematical Conversion Proofs

### 2.1 The Master Media Ticks Factor ($254{,}016{,}000{,}000\text{ ticks/s}$)
The constant $T_{sec} = 254{,}016{,}000{,}000\text{ ticks}$ was selected in ADR 004 because it is divisible by every standard broadcast framerate, film framerate, and audio sample rate with **zero fractional remainder**:

| Clock / Domain | Frequency / Rate | Integer Division Factor | Exact Remainder |
| :--- | :--- | :--- | :--- |
| **Film / Cinema** | $24\text{ fps}$ | $10{,}584{,}000{,}000\text{ ticks/frame}$ | **$0$** |
| **PAL Broadcast** | $25\text{ fps}$ | $10{,}160{,}640{,}000\text{ ticks/frame}$ | **$0$** |
| **NTSC Standard** | $30\text{ fps}$ | $8{,}467{,}200{,}000\text{ ticks/frame}$ | **$0$** |
| **High Frame Rate**| $60\text{ fps}$ | $4{,}233{,}600{,}000\text{ ticks/frame}$ | **$0$** |
| **NTSC Color** | $29.97\text{ fps}$ ($30000/1001$) | $8{,}475{,}667{,}200\text{ ticks/frame}$ | **$0$** |
| **Film NTSC** | $23.976\text{ fps}$ ($24000/1001$)| $10{,}594{,}584{,}000\text{ ticks/frame}$| **$0$** |
| **Studio Audio** | $48{,}000\text{ Hz}$ | $5{,}292{,}000\text{ ticks/sample}$ | **$0$** |
| **CD Audio** | $44{,}100\text{ Hz}$ | $5{,}760{,}000\text{ ticks/sample}$ | **$0$** |
| **Hi-Res Audio** | $96{,}000\text{ Hz}$ | $2{,}646{,}000\text{ ticks/sample}$ | **$0$** |

### 2.2 Discrete Audio Samples to Canonical Media Ticks
```javascript
export function audioSamplesToTicks(samples, sampleRate = 48000) {
  const s = BigInt(Math.max(0, Math.round(Number(samples) || 0)));
  if (sampleRate === 48000) return s * 5_292_000n;
  if (sampleRate === 44100) return s * 5_760_000n;
  if (sampleRate === 96000) return s * 2_646_000n;
  return (s * 254_016_000_000n) / BigInt(sampleRate);
}
```

### 2.3 SoundCraft Musical PPQ to Canonical Media Ticks
SoundCraft defines musical tempo in Pulses Per Quarter Note ($PPQ = 960$). One quarter note is $\frac{60}{BPM}$ seconds. Therefore:
$$\text{ticks\_per\_musical\_tick} = \frac{T_{sec} \times 60}{BPM \times 960}$$

For standard $120\text{ BPM}$:
$$\frac{254{,}016{,}000{,}000 \times 60}{120 \times 960} = \frac{15{,}240{,}960{,}000{,}000}{115{,}200} = 132{,}300{,}000\text{ ticks}$$
This yields an exact integer with **zero remainder**.

### 2.4 Why Direct Casting is Strictly Prohibited
Directly casting between musical ticks ($m$) or discrete audio samples ($n$) and media ticks ($T$) without these formulas is catastrophic:
- $1\text{ musical tick} \neq 1\text{ media tick}$. The true ratio is $132{,}300{,}000 : 1$ at 120 BPM.
- $1\text{ audio sample} \neq 1\text{ media tick}$. The true ratio is $5{,}292{,}000 : 1$ at 48 kHz.
- Clover Motion Studio strictly enforces conversion functions (`audioSamplesToTicks`, `ticksToAudioSamples`, `musicalTicksToTimebase`, `timebaseToMusicalTicks`).

---

## 3. Sound-From-Zero Slice: Single-Voice Oscillator + ADSR

To prevent feature creep and misleading claims of a "full DAW", Clover Motion Studio implements a focused, professional **sound-from-zero synthesis slice**:

### 3.1 Domain Entity: `createSynthNoteConfig`
Defined in `src/core/domain/audioModels.js`:
- `frequency`: $20..20{,}000\text{ Hz}$ (Concert pitch reference $440\text{ Hz}$).
- `note`: Standard musical pitch notation (`C4`, `A4`, `E4`, etc.).
- `waveform`: `'sine' | 'triangle' | 'sawtooth' | 'square'`.
- `attack`: $0.001..2.0\text{ s}$ (Linear rise time to peak gain).
- `decay`: $0.005..4.0\text{ s}$ (Linear drop time to sustain level).
- `sustain`: $0.0..1.0$ (Steady-state amplitude ratio).
- `release`: $0.01..5.0\text{ s}$ (Exponential decay to silence after note duration).
- `duration`: $0.05..10.0\text{ s}$ (Gate duration).
- `gain`: $0.0..1.0$ (Peak amplitude multiplier).

### 3.2 Real-Time & Offline Synthesis
1. **Real-Time Web Audio**: `ProceduralAudioEngine.triggerSynthNote(config)` dynamically routes an `OscillatorNode` through an ADSR `GainNode` into the master DSP rack.
2. **Deterministic Offline Synthesis**: `synthesizeSynthNoteBuffer(config, sampleRate)` generates a 16-bit PCM RIFF WAV buffer and extracts downsampled waveform peaks (`peaks[]`) for offline test runners and timeline clip placement without an active audio hardware output.

---

## 4. Privacy-First Microphone Permission Lifecycle

Under no circumstances does Clover Motion Studio probe, query, or activate user audio capture devices on page load or component mount:
- `ProceduralAudioEngine.enableMicrophone()` is **only** triggered when the user explicitly clicks the microphone toggle button (`onToggleMic`) in `BottomAudioBar.jsx` or `AudioWorkspaceView.jsx`.
- When toggled off or on component unmount, `disableMicrophone()` explicitly stops all tracks on `MediaStream` (`stream.getTracks().forEach(t => t.stop())`) to ensure the browser recording indicator terminates immediately.

---

## 5. Visual Reactive Synchronization Pipeline (FFT Analysis & Modulation)

```
[Audio Source / Track]
        |
        v
 [Biquad Filters & DSP]
        |
        v
[AnalyserNode (FFT 128)]  ---> 32 Frequency Bins (0..255)
                                     |
             +-----------------------+-----------------------+
             |                       |                       |
             v                       v                       v
     Bass (0..4 Bins)         Mids (5..16 Bins)       Treble (17..31 Bins)
       20 - 150 Hz              150 - 2500 Hz           2500 - 16000 Hz
             |
             v
 [Transient Energy Delta] ---> Delta E > 0.12 triggers onset acceleration
             |
             v
 [Attack / Release Filter] ---> V_t = V_{t-1} * s + Target * (1 - s)
             |
             v
[Canvas Property Binding] ---> scale, rotation, opacity, posX, posY (Clamped)
```

1. **FFT Windowing**: 128-point Fast Fourier Transform producing 32 distinct frequency bins with a $0.78$ smoothing time constant.
2. **Frequency Bands**:
   - **Bass Band** (bins $0..4$, $\approx 20..150\text{ Hz}$): Typically modulates rhythmic scale pulses and camera shake.
   - **Mid Band** (bins $5..16$, $\approx 150..2{,}500\text{ Hz}$): Modulates typography rotations and color saturation.
   - **Treble Band** (bins $17..31$, $\approx 2{,}500..16{,}000\text{ Hz}$): Modulates particle dispersion and scanline glitches.
3. **Transient Detection**:
   $$\Delta E = E_{current} - E_{previous}$$
   When $\Delta E > 0.12$, a transient trigger flag is fired and decays exponentially ($0.88\times$ per frame).
4. **Attack / Release Smoothing**:
   $$V_t = V_{t-1} \times s + \text{Target} \times (1 - s)$$
   where $s = \text{audioSmoothing} \in [0.0, 1.0]$.
5. **Property Binding**:
   Layer modulations clamp strictly between `audioMinRange` and `audioMaxRange` (e.g. scale $1.0..1.5\times$), preventing non-finite geometry or negative bounding boxes.

---

## 6. Save / Reopen Roundtrip & Missing Media Relinking

- **Lossless Persistence**: All `audioTracks`, `audioClips` (including `trimIn`, `trimOut`, `fadeIn`, `fadeOut`, `gain`, `pan`, `loop`, `waveformPeaks`), and `audioDsp` parameters serialize cleanly into Schema V1 `.clovermotion.json`.
- **Media Relinking**: When a saved project referencing local audio buffers is reopened on a new browser session where `AudioBuffer` memory is unavailable, clips gracefully render in an `isMissing: true` state (highlighted in amber) with a one-click local relink button (`Relink`), preserving all timeline edit points, transforms, and fades without data loss.
