import type { PartKind, Placement, SandboxSlot, SaveData } from '@/types';
import { STAGE_COUNT } from '@/game/config/stages';
import { PART_ORDER } from '@/game/config/parts';

const STORAGE_KEY = 'kids-pitagora:save-v1';
export const SANDBOX_SLOT_COUNT = 3;

export const STORAGE_WARNING =
  'この ブラウザでは きろくを ほぞん できません。ゲームは そのまま あそべます。';
export const CORRUPT_WARNING = 'きろくが よめなかったので あたらしく はじめます。';

function defaultSave(): SaveData {
  return {
    version: 1,
    unlockedStage: 1,
    stageStars: {},
    seenParts: ['plate'],
    sandboxSlots: new Array<SandboxSlot | null>(SANDBOX_SLOT_COUNT).fill(null),
    sfxVolume: 0.7,
    bgmVolume: 0.4,
    allClearCelebrated: false,
  };
}

function clamp01(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : fallback;
}

function isPlacement(value: unknown): value is Placement {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Partial<Placement>;
  return (
    typeof p.id === 'string' &&
    typeof p.kind === 'string' &&
    (PART_ORDER as readonly string[]).includes(p.kind) &&
    typeof p.x === 'number' &&
    Number.isFinite(p.x) &&
    typeof p.y === 'number' &&
    Number.isFinite(p.y) &&
    typeof p.angle === 'number' &&
    Number.isFinite(p.angle)
  );
}

function sanitizeSlot(value: unknown): SandboxSlot | null {
  if (typeof value !== 'object' || value === null) return null;
  const slot = value as Partial<SandboxSlot>;
  if (typeof slot.name !== 'string') return null;
  if (!Array.isArray(slot.placements)) return null;
  const placements = slot.placements.filter(isPlacement);
  return {
    name: slot.name.slice(0, 24),
    placements,
    savedAt: typeof slot.savedAt === 'number' && Number.isFinite(slot.savedAt) ? slot.savedAt : 0,
  };
}

function sanitize(raw: unknown): SaveData {
  const base = defaultSave();
  if (typeof raw !== 'object' || raw === null) return base;
  const data = raw as Partial<SaveData>;

  const stars: Record<string, number> = {};
  if (typeof data.stageStars === 'object' && data.stageStars !== null) {
    for (const [key, value] of Object.entries(data.stageStars)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        stars[key] = Math.max(0, Math.min(3, Math.floor(value)));
      }
    }
  }

  const seen = Array.isArray(data.seenParts)
    ? PART_ORDER.filter((kind) => (data.seenParts as unknown[]).includes(kind))
    : base.seenParts;

  const slots = new Array<SandboxSlot | null>(SANDBOX_SLOT_COUNT).fill(null);
  if (Array.isArray(data.sandboxSlots)) {
    for (let i = 0; i < SANDBOX_SLOT_COUNT; i++) {
      slots[i] = sanitizeSlot(data.sandboxSlots[i]);
    }
  }

  return {
    version: 1,
    unlockedStage:
      typeof data.unlockedStage === 'number' && Number.isFinite(data.unlockedStage)
        ? Math.max(1, Math.min(STAGE_COUNT, Math.floor(data.unlockedStage)))
        : 1,
    stageStars: stars,
    seenParts: seen.length > 0 ? seen : base.seenParts,
    sandboxSlots: slots,
    sfxVolume: clamp01(data.sfxVolume, base.sfxVolume),
    bgmVolume: clamp01(data.bgmVolume, base.bgmVolume),
    allClearCelebrated: data.allClearCelebrated === true,
  };
}

/**
 * localStorage への ほぞん。
 *
 * プライベートブラウズなどで localStorage が つかえなくても
 * ゲームが とまらないように、すべての そうさを 例外あんぜんにする。
 */
export class SaveStorage {
  private data: SaveData = defaultSave();
  private warningText = '';
  private persistenceAvailable = true;

  constructor(private readonly getStorage: () => Storage | null = defaultStorage) {
    this.load();
  }

  get warning(): string {
    return this.warningText;
  }

  get(): SaveData {
    return this.data;
  }

  update(patch: Partial<SaveData>): void {
    this.data = { ...this.data, ...patch };
    this.persist();
  }

  /** ステージクリア時の きろく。★は これまでの さいこうを のこす */
  recordStageResult(stageId: string, stageNumber: number, stars: number): { unlockedNew: boolean } {
    const previous = this.data.stageStars[stageId] ?? 0;
    if (stars > previous) this.data.stageStars[stageId] = stars;

    let unlockedNew = false;
    if (stars > 0 && stageNumber >= this.data.unlockedStage && stageNumber < STAGE_COUNT) {
      this.data.unlockedStage = Math.min(STAGE_COUNT, stageNumber + 1);
      unlockedNew = true;
    }
    this.refreshSeenParts();
    this.persist();
    return { unlockedNew };
  }

  starsFor(stageId: string): number {
    return this.data.stageStars[stageId] ?? 0;
  }

  totalStars(): number {
    return Object.values(this.data.stageStars).reduce((sum, n) => sum + n, 0);
  }

  clearedCount(): number {
    return Object.values(this.data.stageStars).filter((n) => n > 0).length;
  }

  allCleared(): boolean {
    return this.clearedCount() >= STAGE_COUNT;
  }

  markAllClearCelebrated(): void {
    if (this.data.allClearCelebrated) return;
    this.data.allClearCelebrated = true;
    this.persist();
  }

  isPartUnlocked(kind: PartKind): boolean {
    return this.data.seenParts.includes(kind);
  }

  saveSandbox(index: number, name: string, placements: readonly Placement[]): void {
    if (index < 0 || index >= SANDBOX_SLOT_COUNT) return;
    this.data.sandboxSlots[index] = {
      name: name.slice(0, 24) || `さくひん ${index + 1}`,
      placements: placements.map((p) => ({ ...p })),
      savedAt: Date.now(),
    };
    this.persist();
  }

  loadSandbox(index: number): SandboxSlot | null {
    if (index < 0 || index >= SANDBOX_SLOT_COUNT) return null;
    return this.data.sandboxSlots[index];
  }

  clearSandbox(index: number): void {
    if (index < 0 || index >= SANDBOX_SLOT_COUNT) return;
    this.data.sandboxSlots[index] = null;
    this.persist();
  }

  // --- うちがわ ------------------------------------------------------------

  /** 解放ずみのステージ番号から、ずかんに のせる パーツを きめる */
  private refreshSeenParts(): void {
    const reached = Math.max(this.data.unlockedStage, this.highestClearedStage());
    const seen = PART_ORDER.filter((kind) => partUnlockStage(kind) <= reached);
    this.data.seenParts = seen.length > 0 ? seen : ['plate'];
  }

  private highestClearedStage(): number {
    let best = 1;
    for (const [stageId, stars] of Object.entries(this.data.stageStars)) {
      if (stars <= 0) continue;
      const n = Number(stageId.replace('st-', ''));
      if (Number.isFinite(n) && n > best) best = n;
    }
    return best;
  }

  private load(): void {
    const storage = this.safeStorage();
    if (!storage) {
      this.warningText = STORAGE_WARNING;
      this.persistenceAvailable = false;
      return;
    }
    let raw: string | null = null;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch {
      this.warningText = STORAGE_WARNING;
      this.persistenceAvailable = false;
      return;
    }
    if (raw === null) return;
    try {
      this.data = sanitize(JSON.parse(raw));
    } catch {
      this.data = defaultSave();
      this.warningText = CORRUPT_WARNING;
    }
  }

  private persist(): void {
    if (!this.persistenceAvailable) return;
    const storage = this.safeStorage();
    if (!storage) {
      this.persistenceAvailable = false;
      this.warningText = STORAGE_WARNING;
      return;
    }
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      this.persistenceAvailable = false;
      this.warningText = STORAGE_WARNING;
    }
  }

  private safeStorage(): Storage | null {
    try {
      return this.getStorage();
    } catch {
      return null;
    }
  }
}

function defaultStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function partUnlockStage(kind: PartKind): number {
  switch (kind) {
    case 'plate':
      return 1;
    case 'spring':
      return 4;
    case 'fan':
      return 7;
    case 'conveyor':
    case 'domino':
      return 10;
    case 'pipe':
    case 'hammer':
      return 13;
  }
}
