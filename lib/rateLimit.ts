/**
 * Sliding-window rate limit, counted in process memory.
 *
 * Applied to endpoints a stranger can reach without a token — the funnel event
 * collector above all, since one runaway effect can otherwise fill the events
 * table on its own.
 *
 * ponytail: in-process only, so each instance of the app allows the full limit
 * and a restart clears every window. That is enough while this runs as a single
 * server. Move the counter to Redis or a table before running more than one.
 */

const WINDOW_MS = 60_000;
const MAX_TRACKED_KEYS = 5_000;

/** key -> timestamps (ms) of the hits still inside the current window. */
const hits = new Map<string, number[]>();

/**
 * Records a hit and reports whether it is allowed. Always counts, so a caller
 * that ignores the answer cannot accidentally get unlimited traffic.
 */
export function allow(
  key: string,
  limit: number,
  now: number = Date.now(),
  windowMs: number = WINDOW_MS
): boolean {
  const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs);

  // A caller sending a fresh key on every request would otherwise grow this map
  // without bound. Dropping the whole board is cheaper than tracking eviction.
  if (recent.length === 0 && hits.size >= MAX_TRACKED_KEYS) hits.clear();

  recent.push(now);
  hits.set(key, recent);

  return recent.length <= limit;
}

/** Test seam: the map outlives a single case, and the counts must not. */
export function reset(): void {
  hits.clear();
}
