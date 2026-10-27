export interface TempoMap {
  /** performed time = scale * reference time + offset. scale > 1 means the player is slower. */
  scale: number;
  offset: number;
}

const MIN_OUTLIER_S = 0.15;
const MAD_FACTOR = 2.5;
const ITERATIONS = 3;

function leastSquares(points: [number, number][]): TempoMap {
  const count = points.length;
  const meanX = points.reduce((sum, [x]) => sum + x, 0) / count;
  const meanY = points.reduce((sum, [, y]) => sum + y, 0) / count;
  const variance = points.reduce((sum, [x]) => sum + (x - meanX) ** 2, 0);
  if (variance < 1e-9) return { scale: 1, offset: meanY - meanX };
  const scale = points.reduce((sum, [x, y]) => sum + (x - meanX) * (y - meanY), 0) / variance;
  return { scale, offset: meanY - scale * meanX };
}

/**
 * Fits how performed time relates to score time from notes that were matched with the right pitch.
 * Outliers (the very notes that were played late or early) are dropped and the fit repeated, so a few
 * mistakes do not drag the whole map and a steady slower or faster tempo is not blamed on every note.
 */
export function fitTempoMap(points: [number, number][]): TempoMap {
  if (points.length < 3) {
    const shift = points.length ? points.reduce((sum, [x, y]) => sum + (y - x), 0) / points.length : 0;
    return { scale: 1, offset: shift };
  }
  let kept = points;
  let map = leastSquares(kept);
  for (let round = 0; round < ITERATIONS; round++) {
    const residuals = points.map(([x, y]) => Math.abs(y - (map.scale * x + map.offset)));
    const sorted = [...residuals].sort((a, b) => a - b);
    const mad = sorted[Math.floor(sorted.length / 2)];
    const limit = Math.max(MIN_OUTLIER_S, MAD_FACTOR * mad);
    const inliers = points.filter((_, index) => residuals[index] <= limit);
    if (inliers.length < 3 || inliers.length === kept.length) break;
    kept = inliers;
    map = leastSquares(kept);
  }
  return map;
}
