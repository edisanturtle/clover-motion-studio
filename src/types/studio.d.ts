/**
 * @file studio.d.ts
 * @description Strict TypeScript domain contracts for Clover Motion Studio v2.0.
 */

export type AspectRatioId = '4:5' | '1:1' | '9:16' | '16:9' | '4:3' | '3:4';

export type EditorMode = 'quick' | 'advanced';

export type AudioBand = 'bass' | 'mid' | 'treble' | 'rms';

export interface Keyframe {
  id: string;
  time: number;
  prop: 'posX' | 'posY' | 'scale' | 'rotation' | 'opacity';
  value: number;
  easing: string;
}

export interface AnimosShowcaseConfig {
  templateId: string;
  cardSize: number;
  cardAspect: '1:1' | '16:9' | '4:3' | '3:4' | '9:16';
  cornerRadius: number;
  slots: number;
  tilt: number;
  ringWidth: number;
  ringDepth: number;
  backFade: number;
  bgGradient: string;
  shadowEnabled: boolean;
  audioReactive: boolean;
}

export interface EffectCraftNodeState {
  enabled: boolean;
  intensity: number;
  secondary: number;
  audioReactive: boolean;
  audioBand: AudioBand;
}

export type EffectCraftRackState = Record<string, EffectCraftNodeState>;

export interface AudioDspConfig {
  lowpassFreq: number;
  bassGain: number;
  delayMix: number;
}
