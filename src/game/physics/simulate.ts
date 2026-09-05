import type { Placement, SimResult, StageConfig } from '@/types';
import { MAX_SIM_SECONDS } from '@/game/config/physics';
import { StageRuntime } from './StageRuntime';

/**
 * ステージと配置から シミュレーションを さいごまで まわして 結果だけを かえす 純関数。
 *
 * 決定論なので おなじ入力からは かならず おなじ結果が でる。
 * これを つかって「ステージ N は そうていかいで ★3 が とれる」ことを
 * Vitest で じどう検証する。
 */
export function simulateStage(
  stage: StageConfig,
  placements: readonly Placement[],
  maxSeconds: number = MAX_SIM_SECONDS,
): SimResult {
  const runtime = new StageRuntime(stage, placements);
  runtime.run(maxSeconds);
  return runtime.result();
}

/** ステージの そうていかいを ながして 結果を かえす */
export function simulateSolution(stage: StageConfig): SimResult {
  return simulateStage(stage, stage.solution);
}

/**
 * ボールの きせきを しらべたい ときに つかう（ステージ調整・デバッグ用）。
 * 本番の描画では StageRuntime を そのまま つかうので これは よばない。
 */
export function traceStage(
  stage: StageConfig,
  placements: readonly Placement[],
  sampleEveryTicks = 10,
): { result: SimResult; trace: Array<{ t: number; balls: Array<{ id: string; x: number; y: number }> }> } {
  const runtime = new StageRuntime(stage, placements);
  const trace: Array<{ t: number; balls: Array<{ id: string; x: number; y: number }> }> = [];
  let tick = 0;
  while (!runtime.finished && runtime.seconds < MAX_SIM_SECONDS) {
    runtime.step();
    if (tick % sampleEveryTicks === 0) {
      trace.push({
        t: Number(runtime.seconds.toFixed(3)),
        balls: runtime.world.balls
          .filter((b) => b.active)
          .map((b) => ({ id: b.id, x: Number(b.x.toFixed(3)), y: Number(b.y.toFixed(3)) })),
      });
    }
    tick++;
  }
  return { result: runtime.result(), trace };
}
