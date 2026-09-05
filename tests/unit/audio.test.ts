import { describe, it, expect } from 'vitest';
import { AudioEngine, BGM_TRACKS, noteFrequency } from '@/game/audio/AudioEngine';

describe('note frequencies', () => {
  it('resolves A4 to 440 Hz', () => {
    expect(noteFrequency('A4')).toBeCloseTo(440, 6);
  });

  it('doubles an octave up', () => {
    expect(noteFrequency('A5')).toBeCloseTo(880, 6);
    expect(noteFrequency('C3')).toBeCloseTo(noteFrequency('C4') / 2, 6);
  });

  it('handles sharps and flats', () => {
    expect(noteFrequency('A#4')).toBeCloseTo(noteFrequency('Bb4'), 6);
  });

  it('throws on nonsense', () => {
    expect(() => noteFrequency('H9')).toThrow();
  });
});

describe('BGM tracks', () => {
  it('defines one track per game phase', () => {
    expect(Object.keys(BGM_TRACKS).sort()).toEqual(['build', 'home', 'result', 'run']);
  });

  it('gives every track a tempo and playable steps', () => {
    for (const track of Object.values(BGM_TRACKS)) {
      expect(track.tempo).toBeGreaterThan(40);
      expect(track.tempo).toBeLessThan(220);
      expect(track.steps.length).toBeGreaterThan(2);
      for (const step of track.steps) {
        expect(step.chord.length).toBeGreaterThan(0);
        expect(step.durationBeats).toBeGreaterThan(0);
        for (const note of step.chord) {
          expect(note.frequency).toBeGreaterThan(20);
          expect(note.frequency).toBeLessThan(5000);
        }
      }
    }
  });

  it('makes the run track faster than the build track', () => {
    expect(BGM_TRACKS.run.tempo).toBeGreaterThan(BGM_TRACKS.build.tempo);
  });
});

describe('AudioEngine without Web Audio support', () => {
  it('never throws when the browser has no AudioContext', () => {
    const engine = new AudioEngine();
    engine.init();
    expect(() => {
      engine.playSfx('click');
      engine.playSfx('spring');
      engine.playImpact('wood', 4);
      engine.playImpact('metal', 9);
      engine.playImpact('rubber', 0.4);
      engine.updateRolling(6, true);
      engine.updateRolling(0, false);
      engine.stopRolling();
      engine.startBgm('run');
      engine.stopBgm();
      engine.resume();
      engine.dispose();
    }).not.toThrow();
  });

  it('clamps volumes into 0..1', () => {
    const engine = new AudioEngine();
    engine.setSfxVolume(5);
    engine.setBgmVolume(-2);
    expect(engine.getSfxVolume()).toBe(1);
    expect(engine.getBgmVolume()).toBe(0);
  });
});
