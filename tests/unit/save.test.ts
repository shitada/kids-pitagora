import { describe, it, expect, beforeEach } from 'vitest';
import { SANDBOX_SLOT_COUNT, SaveStorage, STORAGE_WARNING } from '@/game/storage/SaveStorage';
import { STAGE_COUNT } from '@/game/config/stages';

const KEY = 'kids-pitagora:save-v1';

describe('SaveStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with only stage 1 unlocked and only the plate in the encyclopedia', () => {
    const save = new SaveStorage();
    expect(save.get().unlockedStage).toBe(1);
    expect(save.get().seenParts).toEqual(['plate']);
    expect(save.totalStars()).toBe(0);
    expect(save.clearedCount()).toBe(0);
  });

  it('unlocks the next stage after a clear', () => {
    const save = new SaveStorage();
    const { unlockedNew } = save.recordStageResult('st-01', 1, 2);
    expect(unlockedNew).toBe(true);
    expect(save.get().unlockedStage).toBe(2);
    expect(save.starsFor('st-01')).toBe(2);
  });

  it('keeps the best star count and does not regress', () => {
    const save = new SaveStorage();
    save.recordStageResult('st-01', 1, 3);
    save.recordStageResult('st-01', 1, 1);
    expect(save.starsFor('st-01')).toBe(3);
  });

  it('does not unlock past the last stage', () => {
    const save = new SaveStorage();
    save.update({ unlockedStage: STAGE_COUNT });
    const { unlockedNew } = save.recordStageResult(`st-${STAGE_COUNT}`, STAGE_COUNT, 3);
    expect(unlockedNew).toBe(false);
    expect(save.get().unlockedStage).toBe(STAGE_COUNT);
  });

  it('reveals encyclopedia entries as stages progress', () => {
    const save = new SaveStorage();
    save.recordStageResult('st-03', 3, 1);
    expect(save.isPartUnlocked('spring')).toBe(true);
    expect(save.isPartUnlocked('fan')).toBe(false);
    save.recordStageResult('st-12', 12, 1);
    expect(save.isPartUnlocked('pipe')).toBe(true);
    expect(save.isPartUnlocked('hammer')).toBe(true);
  });

  it('reports all cleared only after every stage has a star', () => {
    const save = new SaveStorage();
    for (let n = 1; n <= STAGE_COUNT; n++) {
      expect(save.allCleared()).toBe(n > STAGE_COUNT);
      save.recordStageResult(`st-${String(n).padStart(2, '0')}`, n, 1);
    }
    expect(save.allCleared()).toBe(true);
    expect(save.clearedCount()).toBe(STAGE_COUNT);
  });

  it('persists to localStorage and reloads', () => {
    const first = new SaveStorage();
    first.recordStageResult('st-01', 1, 3);
    const second = new SaveStorage();
    expect(second.starsFor('st-01')).toBe(3);
    expect(second.get().unlockedStage).toBe(2);
  });

  it('saves, loads and clears sandbox slots', () => {
    const save = new SaveStorage();
    save.saveSandbox(0, 'テスト', [{ id: 'a', kind: 'plate', x: 1, y: 2, angle: 0.5 }]);
    const slot = save.loadSandbox(0);
    expect(slot?.name).toBe('テスト');
    expect(slot?.placements).toHaveLength(1);
    expect(slot?.savedAt).toBeGreaterThan(0);

    save.clearSandbox(0);
    expect(save.loadSandbox(0)).toBeNull();
  });

  it('ignores out-of-range sandbox slots', () => {
    const save = new SaveStorage();
    save.saveSandbox(99, 'x', []);
    expect(save.loadSandbox(99)).toBeNull();
    expect(save.get().sandboxSlots).toHaveLength(SANDBOX_SLOT_COUNT);
  });

  it('recovers from corrupt data instead of crashing', () => {
    localStorage.setItem(KEY, '{not json');
    const save = new SaveStorage();
    expect(save.get().unlockedStage).toBe(1);
    expect(save.warning.length).toBeGreaterThan(0);
  });

  it('drops junk fields and clamps values when loading', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        version: 1,
        unlockedStage: 9999,
        stageStars: { 'st-01': 99, bad: 'nope' },
        seenParts: ['plate', 'nonsense'],
        sandboxSlots: [{ name: 'ok', placements: [{ id: 'a', kind: 'bogus', x: 0, y: 0, angle: 0 }] }],
        sfxVolume: 5,
        bgmVolume: -3,
      }),
    );
    const save = new SaveStorage();
    expect(save.get().unlockedStage).toBe(STAGE_COUNT);
    expect(save.starsFor('st-01')).toBe(3);
    expect(save.get().stageStars.bad).toBeUndefined();
    expect(save.get().seenParts).toEqual(['plate']);
    expect(save.get().sandboxSlots[0]?.placements).toHaveLength(0);
    expect(save.get().sfxVolume).toBe(1);
    expect(save.get().bgmVolume).toBe(0);
  });

  it('keeps working with a hiragana warning when storage is unavailable', () => {
    const save = new SaveStorage(() => {
      throw new DOMException('blocked');
    });
    expect(save.warning).toBe(STORAGE_WARNING);
    expect(save.warning).not.toMatch(/[\u4e00-\u9fff]/);
    expect(() => save.recordStageResult('st-01', 1, 3)).not.toThrow();
    expect(save.starsFor('st-01')).toBe(3);
  });

  it('remembers the all-clear celebration only once', () => {
    const save = new SaveStorage();
    expect(save.get().allClearCelebrated).toBe(false);
    save.markAllClearCelebrated();
    expect(save.get().allClearCelebrated).toBe(true);
    expect(new SaveStorage().get().allClearCelebrated).toBe(true);
  });
});
