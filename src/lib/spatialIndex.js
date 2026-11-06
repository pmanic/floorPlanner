import { furnitureBounds, sharedEdges, snapFurniture } from './geometry.js';
const CACHE = new WeakMap();

/** Builds/reuses a spatial hash for one immutable furniture collection. Oversized objects use
 * an overflow list so a malformed/large dimension cannot allocate millions of grid buckets.
 * @param {object[]} items Furniture collection.
 * @param {number} [cellSize=120] Hash cell size in centimeters.
 * @returns {{query: Function, items: object[]}} Nearby-candidate lookup.
 */
export function createKitchenIndex(items, cellSize = 120) {
  const cached = CACHE.get(items);
  if (cached && cellSize === 120) return cached;
  const cells = new Map(),
    overflow = [],
    order = new Map();
  for (const item of items) {
    order.set(item, order.size);
    if (!item.kitchen) continue;
    const b = furnitureBounds(item),
      range = cellRange(b);
    if ((range.x2 - range.x1 + 1) * (range.y2 - range.y1 + 1) > 64) {
      overflow.push(item);
      continue;
    }
    for (let x = range.x1; x <= range.x2; x++)
      for (let y = range.y1; y <= range.y2; y++) {
        const key = `${x}:${y}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(item);
      }
  }
  /** Converts a world-space rectangle into inclusive hash-cell coordinates.
   * @param {{x:number,y:number,w:number,h:number}} bounds Rectangle.
   * @returns {{x1:number,x2:number,y1:number,y2:number}} Cell range.
   */
  function cellRange(bounds) {
    return {
      x1: Math.floor(bounds.x / cellSize),
      x2: Math.floor((bounds.x + bounds.w) / cellSize),
      y1: Math.floor(bounds.y / cellSize),
      y2: Math.floor((bounds.y + bounds.h) / cellSize),
    };
  }
  /** Finds nearby kitchen objects; stable source order preserves previous snapping behavior.
   * @param {object} item Candidate furniture item.
   * @param {number} [padding=18] Search tolerance in centimeters.
   * @returns {object[]} Nearby kitchen candidates.
   */
  function query(item, padding = 18) {
    if (!item.kitchen) return [];
    const b = furnitureBounds(item),
      range = cellRange({
        x: b.x - padding,
        y: b.y - padding,
        w: b.w + padding * 2,
        h: b.h + padding * 2,
      });
    if ((range.x2 - range.x1 + 1) * (range.y2 - range.y1 + 1) > 100) return items;
    const found = new Set(overflow);
    for (let x = range.x1; x <= range.x2; x++)
      for (let y = range.y1; y <= range.y2; y++)
        for (const candidate of cells.get(`${x}:${y}`) || []) found.add(candidate);
    return [...found].sort(bySourceOrder);
  }
  /** Keeps equal-distance snapping deterministic and compatible with catalog insertion order.
   * @param {object} left First candidate.
   * @param {object} right Second candidate.
   * @returns {number} Source-order comparison.
   */
  function bySourceOrder(left, right) {
    return order.get(left) - order.get(right);
  }
  const index = { query, items };
  if (cellSize === 120) CACHE.set(items, index);
  return index;
}

/** Snaps against spatially nearby elements instead of scanning the whole plan per frame.
 * @param {object} item Candidate furniture.
 * @param {{query: Function}} index Cached spatial index.
 * @param {boolean} enabled Whether kitchen snapping is enabled.
 * @returns {object} Snapped candidate.
 */
export function snapIndexed(item, index, enabled) {
  return snapFurniture(item, enabled ? index.query(item) : [], enabled);
}

/** Computes shared boundaries once per committed furniture revision, using local candidates.
 * @param {object[]} items Immutable furniture collection.
 * @returns {Map<string,object>} Local edge flags for each kitchen element.
 */
export function buildKitchenEdges(items) {
  const index = createKitchenIndex(items),
    edges = new Map();
  for (const item of items)
    if (item.kitchen) edges.set(item.id, sharedEdges(item, index.query(item, 0.1)));
  return edges;
}
