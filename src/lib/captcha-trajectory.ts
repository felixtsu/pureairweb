/**
 * 服务端轨迹分析（滑块 v2）：速度、停顿、抖动、末端减速等。
 */

export interface TrailPoint {
  x: number;
  y: number;
  t: number;
}

export interface TrajectoryScore {
  score: number;
  suspicious: boolean;
}

function segmentSpeeds(trail: TrailPoint[]): number[] {
  const speeds: number[] = [];
  for (let i = 1; i < trail.length; i++) {
    const dt = trail[i]!.t - trail[i - 1]!.t;
    if (dt <= 0) continue;
    const dx = trail[i]!.x - trail[i - 1]!.x;
    const dy = trail[i]!.y - trail[i - 1]!.y;
    const dist = Math.hypot(dx, dy);
    speeds.push(dist / dt);
  }
  return speeds;
}

function isUniformSpeed(speeds: number[], relTol = 0.08): boolean {
  if (speeds.length < 3) return false;
  const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  if (mean < 1e-6) return true;
  return speeds.every((s) => Math.abs(s - mean) / mean < relTol);
}

function countStops(trail: TrailPoint[], speedThreshold = 0.18): number {
  const speeds = segmentSpeeds(trail);
  return speeds.filter((s) => s < speedThreshold).length;
}

/** 相邻段方向角变化 → 曲率/抖动代理 */
function hasJitter(trail: TrailPoint[]): boolean {
  if (trail.length < 4) return false;
  let angleChanges = 0;
  for (let i = 2; i < trail.length; i++) {
    const ax = trail[i - 1]!.x - trail[i - 2]!.x;
    const ay = trail[i - 1]!.y - trail[i - 2]!.y;
    const bx = trail[i]!.x - trail[i - 1]!.x;
    const by = trail[i]!.y - trail[i - 1]!.y;
    const la = Math.hypot(ax, ay);
    const lb = Math.hypot(bx, by);
    if (la < 0.5 || lb < 0.5) continue;
    const cross = Math.abs(ax * by - ay * bx);
    const sin = cross / (la * lb);
    if (sin > 0.02) angleChanges += 1;
  }
  return angleChanges >= Math.max(2, Math.floor(trail.length / 12));
}

function hasDecelerationNearEnd(speeds: number[], trail: TrailPoint[]): boolean {
  if (speeds.length < 4) return false;
  const n = speeds.length;
  const tail = speeds.slice(Math.floor(n * 0.65));
  const head = speeds.slice(0, Math.floor(n * 0.35));
  if (tail.length === 0 || head.length === 0) return false;
  const meanTail = tail.reduce((a, b) => a + b, 0) / tail.length;
  const meanHead = head.reduce((a, b) => a + b, 0) / head.length;
  const duration = trail[trail.length - 1]!.t - trail[0]!.t;
  return meanTail < meanHead * 0.85 && duration > 400;
}

/**
 * 分析轨迹；score 0~1，<0.5 视为可疑（与 SPEC 一致）。
 */
export function analyzeTrajectory(trail: TrailPoint[]): TrajectoryScore {
  if (!trail || trail.length < 3) {
    return { score: 0, suspicious: true };
  }
  const sorted = [...trail].sort((a, b) => a.t - b.t);
  const duration = sorted[sorted.length - 1]!.t - sorted[0]!.t;
  let score = 0;

  if (duration >= 800 && duration <= 4000) score += 0.2;
  else if (duration >= 500 && duration <= 6000) score += 0.1;

  const speeds = segmentSpeeds(sorted);
  if (speeds.length >= 3 && !isUniformSpeed(speeds)) score += 0.2;

  if (countStops(sorted) >= 2) score += 0.2;
  else if (countStops(sorted) >= 1) score += 0.1;

  if (hasJitter(sorted)) score += 0.2;

  if (speeds.length >= 4 && hasDecelerationNearEnd(speeds, sorted)) score += 0.2;

  const suspicious = score < 0.5;
  return { score: Math.min(1, score), suspicious };
}
