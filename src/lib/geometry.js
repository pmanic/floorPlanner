export const snap =
  /** Rounds a coordinate to the nearest grid interval in centimeters.
   * @param {any} n Coordinate in centimeters.
   * @param {any} step Grid interval in centimeters.
   */
  (n, step = 5) => Math.round(n / step) * step;
export const distance =
  /** Computes Euclidean distance between two world-space points in centimeters.
   * @param {any} a First world-space endpoint.
   * @param {any} b Second world-space endpoint.
   */
  (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
/** Projects a point onto a finite wall segment and reports distance, side and normalized position. Degenerate walls have infinite hit distance.
 * @param {any} p World-space point.
 * @param {any} wall Wall segment with endpoints and thickness.
 */
export function projectOnWall(p, wall) {
  const dx = wall.b.x - wall.a.x,
    dy = wall.b.y - wall.a.y;
  const length = Math.hypot(dx, dy);
  if (!length) return { point: wall.a, t: 0, distance: Infinity, length: 0, side: 1 };
  const t = Math.max(
    0,
    Math.min(1, ((p.x - wall.a.x) * dx + (p.y - wall.a.y) * dy) / (length * length)),
  );
  const point = { x: wall.a.x + t * dx, y: wall.a.y + t * dy };
  return {
    point,
    t,
    distance: distance(p, point),
    length,
    side: dx * (p.y - point.y) - dy * (p.x - point.x) >= 0 ? 1 : -1,
  };
}
/** Chooses the nearest eligible wall, clamps the opening inside its endpoints and derives hinge/side from the pointer around a snapped center.
 * @param {any} p World-space point.
 * @param {any} walls Candidate wall segments.
 * @param {any} width Opening width in centimeters.
 */
export function doorPlacement(p, walls, width) {
  let best = null;
  for (const wall of walls) {
    const hit = projectOnWall(p, wall);
    if (hit.length < width || hit.distance > 90 || (best && hit.distance >= best.distance))
      continue;
    const center = Math.max(
      width / 2,
      Math.min(hit.length - width / 2, snap(hit.t * hit.length, 40)),
    );
    const dx = (wall.b.x - wall.a.x) / hit.length,
      dy = (wall.b.y - wall.a.y) / hit.length;
    // The two pointer axes around the snapped opening choose side and hinge.
    const flip = hit.t * hit.length > center;
    best = {
      wallId: wall.id,
      x: wall.a.x + dx * center,
      y: wall.a.y + dy * center,
      angle: (Math.atan2(dy, dx) * 180) / Math.PI,
      side: hit.side,
      flip,
      width,
      thickness: wall.thickness,
      distance: hit.distance,
    };
  }
  return best;
}
/** Derives a perpendicular dimension baseline, its orientation and the measured segment length.
 * @param {any} d Dimension or door geometry.
 */
export function dimensionGeometry(d) {
  const len = distance(d.a, d.b) || 1,
    nx = -(d.b.y - d.a.y) / len,
    ny = (d.b.x - d.a.x) / len;
  const p = { x: d.a.x + nx * d.offset, y: d.a.y + ny * d.offset },
    q = { x: d.b.x + nx * d.offset, y: d.b.y + ny * d.offset };
  return {
    p,
    q,
    nx,
    ny,
    length: len,
    angle: (Math.atan2(d.b.y - d.a.y, d.b.x - d.a.x) * 180) / Math.PI,
  };
}
/** Returns a furniture candidate snapped to an adjacent kitchen boundary; source objects are never mutated.
 * @param {any} item Furniture/entity data.
 * @param {any} others Candidate neighboring furniture.
 * @param {any} enabled Whether automatic kitchen snapping is enabled.
 */
export function snapFurniture(item, others, enabled = true) {
  const result = { ...item };
  if (!enabled || item.rotation % 90 !== 0) return result;
  const bounds = furnitureBounds(item);
  for (const o of others) {
    if (o.id === item.id || !o.kitchen || !item.kitchen || o.rotation % 90 !== 0) continue;
    const other = furnitureBounds(o);
    if (Math.abs(bounds.y - other.y) < 18) {
      if (Math.abs(bounds.x - (other.x + other.w)) < 18) {
        result.x += other.x + other.w - bounds.x;
        result.y += other.y - bounds.y;
        return result;
      }
      if (Math.abs(bounds.x + bounds.w - other.x) < 18) {
        result.x += other.x - bounds.w - bounds.x;
        result.y += other.y - bounds.y;
        return result;
      }
    }
    if (Math.abs(bounds.x - other.x) < 18) {
      if (Math.abs(bounds.y - (other.y + other.h)) < 18) {
        result.y += other.y + other.h - bounds.y;
        result.x += other.x - bounds.x;
        return result;
      }
      if (Math.abs(bounds.y + bounds.h - other.y) < 18) {
        result.y += other.y - bounds.h - bounds.y;
        result.x += other.x - bounds.x;
        return result;
      }
    }
  }
  return result;
}
/** Determines completely shared kitchen edges and maps world-space directions back into local rotated symbol coordinates.
 * @param {any} item Furniture/entity data.
 * @param {any} others Candidate neighboring furniture.
 */
export function sharedEdges(item, others) {
  const edges = { top: false, right: false, bottom: false, left: false };
  if (!item.kitchen || item.rotation % 90 !== 0) return edges;
  const bounds = furnitureBounds(item);
  for (const o of others) {
    if (o.id === item.id || !o.kitchen || o.rotation % 90 !== 0) continue;
    const other = furnitureBounds(o);
    if (Math.abs(other.y - bounds.y) < 0.1 && Math.abs(other.h - bounds.h) < 0.1) {
      if (Math.abs(other.x - bounds.x - bounds.w) < 0.1) edges.right = true;
      if (Math.abs(other.x + other.w - bounds.x) < 0.1) edges.left = true;
    }
    if (Math.abs(other.x - bounds.x) < 0.1 && Math.abs(other.w - bounds.w) < 0.1) {
      if (Math.abs(other.y - bounds.y - bounds.h) < 0.1) edges.bottom = true;
      if (Math.abs(other.y + other.h - bounds.y) < 0.1) edges.top = true;
    }
  }
  const sides = ['top', 'right', 'bottom', 'left'];
  const quarterTurns = (((item.rotation / 90) % 4) + 4) % 4;
  return Object.fromEntries(
    sides.map(
      /** Maps a local edge to its world direction after quarter-turn rotation.
       * @param {any} side Input for this operation.
       * @param {any} index Precomputed entity lookup.
       */
      (side, index) => [side, edges[sides[(index + quarterTurns) % 4]]],
    ),
  );
}

/** Computes the axis-aligned world bounds of a symbol rotated about its center.
 * @param {any} item Furniture/entity data.
 */
export function furnitureBounds(item) {
  const angle = (item.rotation * Math.PI) / 180;
  const w = Math.abs(item.w * Math.cos(angle)) + Math.abs(item.h * Math.sin(angle));
  const h = Math.abs(item.w * Math.sin(angle)) + Math.abs(item.h * Math.cos(angle));
  return { x: item.x + (item.w - w) / 2, y: item.y + (item.h - h) / 2, w, h };
}
