import type { SurfaceMaterial } from '@/types';

/**
 * Web Audio API だけで 音を つくる。音源ファイルは 1つも つかわない。
 *
 * - こうかおん: オシレータ＋ノイズの プロシージャル合成
 * - ころがり音: ボールの はやさで ピッチとおおきさが れんぞくに かわる
 * - BGM: ホーム / くみたて / じっこう / けっか の 4 きょく
 */

export type SfxName =
  | 'click'
  | 'place'
  | 'rotate'
  | 'delete'
  | 'start'
  | 'reset'
  | 'spring'
  | 'fan'
  | 'conveyor'
  | 'domino'
  | 'pipe-in'
  | 'pipe-out'
  | 'hammer'
  | 'coin'
  | 'goal'
  | 'fanfare'
  | 'unlock'
  | 'nope';

export type BgmTrackId = 'home' | 'build' | 'run' | 'result';

type WaveType = OscillatorType;

interface BgmNote {
  frequency: number;
  length: number;
  velocity: number;
  wave?: WaveType;
}

interface BgmStep {
  lead?: BgmNote;
  chord: readonly BgmNote[];
  bass?: BgmNote;
  beat?: 'kick' | 'snare' | 'tick';
  durationBeats: number;
}

interface BgmTrack {
  tempo: number;
  swing: number;
  steps: readonly BgmStep[];
}

const SEMITONE = 2 ** (1 / 12);
const NOTE_INDEX: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

function noteFrequency(name: string): number {
  const match = /^([A-G](?:#|b)?)(-?\d+)$/.exec(name);
  if (!match) throw new Error(`Invalid note name: ${name}`);
  const noteName = match[1];
  const octave = Number(match[2]);
  const index = NOTE_INDEX[noteName];
  if (index === undefined) throw new Error(`Invalid note name: ${name}`);
  const semitonesFromA4 = index - NOTE_INDEX.A + (octave - 4) * 12;
  return 440 * SEMITONE ** semitonesFromA4;
}

function note(name: string, length: number, velocity: number, wave?: WaveType): BgmNote {
  return { frequency: noteFrequency(name), length, velocity, wave };
}

function step(
  lead: string,
  chord: readonly string[],
  bass?: string,
  beat?: BgmStep['beat'],
  durationBeats = 0.5,
): BgmStep {
  return {
    lead: note(lead, 0.6, 0.1, 'triangle'),
    chord: chord.map((n) => note(n, 0.85, 0.075, 'sine')),
    bass: bass ? note(bass, 0.9, 0.1, 'triangle') : undefined,
    beat,
    durationBeats,
  };
}

/**
 * オリジナルの きょく。じっさいの ばんぐみの 音楽は いっさい つかわない。
 */
export const BGM_TRACKS: Record<BgmTrackId, BgmTrack> = {
  // ホーム: のんびり やさしい ワルツふう
  home: {
    tempo: 96,
    swing: 0.05,
    steps: [
      step('G4', ['C4', 'E4', 'G4'], 'C3', 'tick'),
      step('E4', ['C4', 'E4', 'G4'], 'G2'),
      step('C5', ['A3', 'C4', 'F4'], 'F2', 'tick'),
      step('A4', ['A3', 'C4', 'F4'], 'C3'),
      step('B4', ['G3', 'B3', 'D4'], 'G2', 'tick'),
      step('D5', ['G3', 'B3', 'D4'], 'D3'),
      step('C5', ['C4', 'E4', 'G4'], 'C3', 'tick'),
      step('G4', ['C4', 'E4', 'A4'], 'A2'),
    ],
  },
  // くみたて中: かんがえる じゃまを しない、しずかで リズミカル
  build: {
    tempo: 104,
    swing: 0.02,
    steps: [
      step('E4', ['A3', 'C4', 'E4'], 'A2', 'tick'),
      step('G4', ['A3', 'C4', 'E4'], 'A2'),
      step('D4', ['G3', 'B3', 'D4'], 'G2', 'tick'),
      step('B3', ['G3', 'B3', 'D4'], 'D3'),
      step('C4', ['F3', 'A3', 'C4'], 'F2', 'tick'),
      step('E4', ['F3', 'A3', 'C4'], 'C3'),
      step('A3', ['E3', 'G3', 'B3'], 'E2', 'tick'),
      step('C4', ['E3', 'A3', 'C4'], 'A2'),
    ],
  },
  // じっこう中: はやくて ワクワクする
  run: {
    tempo: 148,
    swing: 0.03,
    steps: [
      step('C5', ['C4', 'E4', 'G4'], 'C3', 'kick'),
      step('E5', ['C4', 'E4', 'G4'], 'C3', 'tick'),
      step('G5', ['D4', 'F4', 'A4'], 'D3', 'snare'),
      step('E5', ['D4', 'F4', 'A4'], 'A2', 'tick'),
      step('F5', ['F4', 'A4', 'C5'], 'F3', 'kick'),
      step('A5', ['F4', 'A4', 'C5'], 'C3', 'tick'),
      step('G5', ['G4', 'B4', 'D5'], 'G3', 'snare'),
      step('C6', ['G4', 'B4', 'E5'], 'G2', 'snare'),
    ],
  },
  // けっか: たっせいかんの ある あかるい きょく
  result: {
    tempo: 120,
    swing: 0.04,
    steps: [
      step('C5', ['C4', 'E4', 'G4', 'C5'], 'C3', 'kick'),
      step('E5', ['C4', 'E4', 'G4'], 'G2', 'tick'),
      step('G5', ['F4', 'A4', 'C5'], 'F2', 'snare'),
      step('C6', ['G4', 'B4', 'D5'], 'G2', 'tick'),
      step('B5', ['E4', 'G4', 'C5'], 'C3', 'kick'),
      step('G5', ['F4', 'A4', 'D5'], 'D3', 'snare'),
    ],
  },
};

/** 材質ごとの ぶつかる音の いろ */
const IMPACT_TONE: Record<SurfaceMaterial, { wave: WaveType; base: number; drop: number; decay: number; noise: number }> = {
  wood: { wave: 'triangle', base: 260, drop: 120, decay: 0.11, noise: 0.05 },
  metal: { wave: 'square', base: 900, drop: 620, decay: 0.24, noise: 0.02 },
  rubber: { wave: 'sine', base: 190, drop: 95, decay: 0.16, noise: 0 },
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterSfx: GainNode | null = null;
  private masterBgm: GainNode | null = null;

  private bgmTimer: number | null = null;
  private currentBgm: BgmTrackId | null = null;
  private bgmStepIndex = 0;

  private sfxVolume = 0.7;
  private bgmVolume = 0.4;

  private rollingOsc: OscillatorNode | null = null;
  private rollingGain: GainNode | null = null;
  private rollingFilter: BiquadFilterNode | null = null;

  init(): void {
    if (this.ctx) return;
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.masterSfx = this.ctx.createGain();
      this.masterSfx.gain.value = this.sfxVolume;
      this.masterSfx.connect(this.ctx.destination);
      this.masterBgm = this.ctx.createGain();
      this.masterBgm.gain.value = this.bgmVolume;
      this.masterBgm.connect(this.ctx.destination);
    } catch {
      // 音が つかえない かんきょうでも ゲームは そのまま あそべる
      this.ctx = null;
    }
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  get ready(): boolean {
    return this.ctx !== null;
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.masterSfx) this.masterSfx.gain.value = this.sfxVolume;
  }

  setBgmVolume(v: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, v));
    if (this.masterBgm) this.masterBgm.gain.value = this.bgmVolume;
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }

  getBgmVolume(): number {
    return this.bgmVolume;
  }

  // --- こうかおん ----------------------------------------------------------

  playSfx(name: SfxName): void {
    const ctx = this.ctx;
    const out = this.masterSfx;
    if (!ctx || !out) return;
    const now = ctx.currentTime;

    switch (name) {
      case 'click':
        this.tone('square', 760, 760, 0.05, 0.12, now);
        break;
      case 'place':
        this.tone('triangle', 300, 460, 0.09, 0.18, now);
        break;
      case 'rotate':
        this.tone('sine', 520, 700, 0.07, 0.1, now);
        break;
      case 'delete':
        this.tone('sawtooth', 420, 130, 0.16, 0.14, now);
        break;
      case 'start':
        this.melody(['C4', 'E4', 'G4'], 0.08, 0.16);
        break;
      case 'reset':
        this.melody(['G4', 'D4'], 0.08, 0.14);
        break;
      case 'spring':
        // 「ぼいん」: ピッチが ぐいっと 上がって もどる
        this.boing(now);
        break;
      case 'fan':
        this.noise(0.34, 0.05, 900);
        break;
      case 'conveyor':
        this.tone('square', 140, 160, 0.14, 0.08, now);
        break;
      case 'domino':
        this.tone('triangle', 340, 150, 0.12, 0.14, now);
        this.noise(0.06, 0.05, 2600);
        break;
      case 'pipe-in':
        this.tone('sine', 700, 260, 0.16, 0.13, now);
        break;
      case 'pipe-out':
        this.tone('sine', 300, 780, 0.14, 0.13, now);
        break;
      case 'hammer':
        this.tone('square', 620, 220, 0.18, 0.13, now);
        this.noise(0.08, 0.06, 3200);
        break;
      case 'coin':
        this.melody(['E5', 'B5'], 0.07, 0.13);
        break;
      case 'goal':
        this.melody(['C5', 'E5', 'G5'], 0.09, 0.16);
        break;
      case 'fanfare':
        this.melody(['C5', 'E5', 'G5', 'C6', 'G5', 'C6'], 0.13, 0.17);
        break;
      case 'unlock':
        this.melody(['G4', 'C5', 'E5'], 0.11, 0.15);
        break;
      case 'nope':
        this.tone('square', 200, 150, 0.12, 0.1, now);
        break;
    }
  }

  /** ボールが なにかに ぶつかった音。材質で 音色が かわる */
  playImpact(material: SurfaceMaterial, speed: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const tone = IMPACT_TONE[material];
    const intensity = Math.max(0.06, Math.min(1, speed / 9));
    const detune = 0.85 + intensity * 0.4;
    this.tone(
      tone.wave,
      tone.base * detune,
      tone.drop * detune,
      tone.decay,
      0.16 * intensity,
      ctx.currentTime,
    );
    if (tone.noise > 0) this.noise(tone.decay * 0.6, tone.noise * intensity, 2400);
  }

  // --- ころがり音 ----------------------------------------------------------

  /**
   * ボールの ころがり音。
   * はやさに おうじて ピッチと おおきさが れんぞくに かわる。
   */
  updateRolling(speed: number, touching: boolean): void {
    const ctx = this.ctx;
    if (!ctx || !this.masterSfx) return;

    const active = touching && speed > 0.35;
    if (!active) {
      if (this.rollingGain) {
        this.rollingGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
      }
      return;
    }

    if (!this.rollingOsc) {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      filter.Q.value = 2;
      gain.gain.value = 0.0001;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterSfx);
      osc.start();
      this.rollingOsc = osc;
      this.rollingFilter = filter;
      this.rollingGain = gain;
    }

    const normalized = Math.min(1, speed / 12);
    const now = ctx.currentTime;
    this.rollingOsc.frequency.setTargetAtTime(55 + normalized * 145, now, 0.04);
    this.rollingFilter?.frequency.setTargetAtTime(360 + normalized * 1500, now, 0.06);
    this.rollingGain?.gain.setTargetAtTime(0.02 + normalized * 0.075, now, 0.05);
  }

  stopRolling(): void {
    const ctx = this.ctx;
    if (!ctx || !this.rollingGain) return;
    this.rollingGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.04);
  }

  // --- BGM -----------------------------------------------------------------

  startBgm(trackId: BgmTrackId): void {
    if (!this.ctx || !this.masterBgm) return;
    if (this.currentBgm === trackId && this.bgmTimer !== null) return;
    this.stopBgm();
    this.currentBgm = trackId;
    this.bgmStepIndex = 0;
    this.scheduleBgmStep();
  }

  stopBgm(): void {
    if (this.bgmTimer !== null) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.currentBgm = null;
  }

  get playingBgm(): BgmTrackId | null {
    return this.currentBgm;
  }

  dispose(): void {
    this.stopBgm();
    this.stopRolling();
    if (this.rollingOsc) {
      try {
        this.rollingOsc.stop();
      } catch {
        // すでに とまっていても もんだいない
      }
      this.rollingOsc = null;
      this.rollingGain = null;
      this.rollingFilter = null;
    }
  }

  // --- うちがわ ------------------------------------------------------------

  private scheduleBgmStep(): void {
    if (!this.ctx || !this.masterBgm || !this.currentBgm) return;
    const track = BGM_TRACKS[this.currentBgm];
    const stepDef = track.steps[this.bgmStepIndex % track.steps.length];
    const beatSec = 60 / track.tempo;
    const duration = beatSec * stepDef.durationBeats;
    const now = this.ctx.currentTime;
    const swingSign = this.bgmStepIndex % 2 === 0 ? 1 : -1;
    const nextDelayMs = Math.max(70, (duration + track.swing * swingSign * beatSec) * 1000);

    if (stepDef.bass) this.playBgmNote(stepDef.bass, now, duration, 0.8);
    for (const chordNote of stepDef.chord) this.playBgmNote(chordNote, now, duration * 0.92, 0.4);
    if (stepDef.lead) this.playBgmNote(stepDef.lead, now + duration * 0.08, duration * 0.6, 0.55);
    if (stepDef.beat) this.playBgmBeat(stepDef.beat, now);

    this.bgmStepIndex++;
    this.bgmTimer = window.setTimeout(() => this.scheduleBgmStep(), nextDelayMs);
  }

  private playBgmNote(bgmNote: BgmNote, start: number, duration: number, layerGain: number): void {
    if (!this.ctx || !this.masterBgm) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = bgmNote.wave ?? 'triangle';
    osc.frequency.setValueAtTime(bgmNote.frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, bgmNote.velocity * layerGain), start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(0.05, duration * bgmNote.length));
    osc.connect(gain);
    gain.connect(this.masterBgm);
    osc.start(start);
    osc.stop(start + Math.max(0.07, duration * bgmNote.length + 0.05));
  }

  private playBgmBeat(kind: 'kick' | 'snare' | 'tick', start: number): void {
    if (!this.ctx || !this.masterBgm) return;
    if (kind === 'tick') {
      const tick = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      tick.type = 'square';
      tick.frequency.setValueAtTime(1400, start);
      gain.gain.setValueAtTime(0.045, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.03);
      tick.connect(gain);
      gain.connect(this.masterBgm);
      tick.start(start);
      tick.stop(start + 0.04);
      return;
    }
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = kind === 'kick' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(kind === 'kick' ? 120 : 250, start);
    osc.frequency.exponentialRampToValueAtTime(kind === 'kick' ? 52 : 92, start + 0.11);
    gain.gain.setValueAtTime(kind === 'kick' ? 0.12 : 0.07, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
    osc.connect(gain);
    gain.connect(this.masterBgm);
    osc.start(start);
    osc.stop(start + 0.15);
  }

  private tone(
    wave: WaveType,
    from: number,
    to: number,
    decay: number,
    gainValue: number,
    start: number,
  ): void {
    if (!this.ctx || !this.masterSfx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(Math.max(20, from), start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + decay);
    gain.gain.setValueAtTime(Math.max(0.0001, gainValue), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + decay);
    osc.connect(gain);
    gain.connect(this.masterSfx);
    osc.start(start);
    osc.stop(start + decay + 0.02);
  }

  private boing(start: number): void {
    if (!this.ctx || !this.masterSfx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, start);
    osc.frequency.exponentialRampToValueAtTime(760, start + 0.07);
    osc.frequency.exponentialRampToValueAtTime(320, start + 0.2);
    gain.gain.setValueAtTime(0.22, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
    osc.connect(gain);
    gain.connect(this.masterSfx);
    osc.start(start);
    osc.stop(start + 0.3);
  }

  private melody(notes: readonly string[], stepSec: number, gainValue: number): void {
    if (!this.ctx || !this.masterSfx) return;
    let t = this.ctx.currentTime;
    for (const name of notes) {
      const frequency = noteFrequency(name);
      this.tone('triangle', frequency, frequency, stepSec * 1.1, gainValue, t);
      t += stepSec;
    }
  }

  private noise(duration: number, gainValue: number, cutoff: number): void {
    if (!this.ctx || !this.masterSfx) return;
    const ctx = this.ctx;
    const size = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // ホワイトノイズを だんだん ちいさくする
    for (let i = 0; i < size; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterSfx);
    src.start();
  }
}

export { noteFrequency };
