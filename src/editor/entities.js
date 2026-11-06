import { distance, projectOnWall } from '../lib/geometry.js';

/** Builds an ID lookup once per document revision, avoiding a full clone during selection.
 * @param {object} plan Immutable document.
 * @returns {Map<string, {item: object, kind: string}>} Entity metadata indexed by ID.
 */
export function indexEntities(plan) {
  const index = new Map();
  for (const [collection, kind] of [
    ['walls', 'wall'],
    ['doors', 'door'],
    ['furniture', 'furniture'],
    ['dimensions', 'dimension'],
  ]) {
    for (const item of plan[collection]) index.set(item.id, { item, kind });
  }
  return index;
}

/** Applies a completed drag without mutating history snapshots. Attached doors move with a wall.
 * @param {object} plan Committed document.
 * @param {string} kind Entity kind.
 * @param {object} original Entity at pointer-down.
 * @param {object} preview Final preview entity.
 * @returns {object} New immutable document with structural sharing.
 */
export function commitDrag(plan, kind, original, preview) {
  const collection = {
    wall: 'walls',
    door: 'doors',
    dimension: 'dimensions',
    furniture: 'furniture',
  }[kind];
  const result = { ...plan, [collection]: plan[collection].map(replace) };
  /** Replaces only the edited entity; all other references remain stable.
   * @param {object} item Existing entity.
   * @returns {object} New or original entity.
   */
  function replace(item) {
    return item.id === original.id ? preview : item;
  }
  if (kind === 'wall') {
    const dx = preview.a.x - original.a.x,
      dy = preview.a.y - original.a.y;
    result.doors = plan.doors.map(moveAttachedDoor);
    /** Translates doors attached to the moved wall.
     * @param {object} door Existing door.
     * @returns {object} Translated door or unchanged reference.
     */
    function moveAttachedDoor(door) {
      return door.wallId === original.id ? { ...door, x: door.x + dx, y: door.y + dy } : door;
    }
  }
  return result;
}
/** Computes a keyboard move without mutating the entity or its supporting wall.
 * Furniture translates freely; dimensions change only their perpendicular offset.
 * Doors accept horizontal input along their wall, clamped to fit the entire opening.
 * Right means toward screen-right (screen-down for vertical walls), regardless of endpoint order.
 * @param {string} kind Entity kind.
 * @param {object} item Original entity.
 * @param {number} dx Requested horizontal movement in centimeters.
 * @param {number} dy Requested vertical movement in centimeters.
 * @param {object} [wall] Supporting wall for a door.
 * @returns {object} Moved entity, or the original reference for an unsupported or blocked move.
 */
export function nudgeEntity(kind, item, dx, dy, wall) {
  if (kind === 'furniture') return { ...item, x: item.x + dx, y: item.y + dy };
  if (kind === 'dimension') {
    const length = distance(item.a, item.b);
    if (!length) return item;
    const offset = (-(item.b.y - item.a.y) * dx + (item.b.x - item.a.x) * dy) / length;
    return Math.abs(offset) < 1e-8 ? item : { ...item, offset: item.offset + offset };
  }
  if (kind !== 'door' || dy || !dx || !wall) return item;
  const hit = projectOnWall(item, wall);
  if (!hit.length || item.width > hit.length) return item;
  const ux = (wall.b.x - wall.a.x) / hit.length;
  const uy = (wall.b.y - wall.a.y) / hit.length;
  const direction = (Math.abs(ux) < 1e-8 ? uy : ux) < 0 ? -1 : 1;
  const center = Math.max(
    item.width / 2,
    Math.min(hit.length - item.width / 2, hit.t * hit.length + dx * direction),
  );
  const x = wall.a.x + ux * center;
  const y = wall.a.y + uy * center;
  return Math.hypot(x - item.x, y - item.y) < 1e-8 ? item : { ...item, x, y };
}
