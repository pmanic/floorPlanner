import { catalog } from './catalog.js';
const TYPES = new Set(catalog.map(typeName));
/** Extracts the catalog discriminator once when the schema is loaded.
 * @param {{type:string}} item Catalog item.
 * @returns {string} Known furniture type.
 */
function typeName(item) {
  return item.type;
}

/** Validates the document schema and references at the import/storage boundary.
 * IDs must be unique; numbers must be finite and bounded. Wall lookups are indexed, not nested scans.
 * @param {unknown} plan Untrusted parsed document.
 * @returns {boolean} Whether the plan can be safely rendered and edited.
 */
export function validPlan(plan) {
  if (!plan || typeof plan !== 'object' || typeof plan.name !== 'string' || plan.name.length > 120)
    return false;
  const collections = ['walls', 'doors', 'furniture', 'dimensions', 'labels'];
  for (const key of collections)
    if (!Array.isArray(plan[key]) || plan[key].length > 10000) return false;
  const ids = new Set(),
    walls = new Map();
  for (const key of collections.slice(0, 4))
    for (const item of plan[key]) {
      if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id)) return false;
      ids.add(item.id);
    }
  for (const wall of plan.walls) {
    if (!point(wall.a) || !point(wall.b) || !positive(wall.thickness)) return false;
    walls.set(wall.id, wall);
  }
  for (const item of plan.furniture)
    if (
      !point(item) ||
      !positive(item.w) ||
      !positive(item.h) ||
      !finite(item.rotation) ||
      !TYPES.has(item.type)
    )
      return false;
  for (const door of plan.doors) {
    const wall = walls.get(door.wallId);
    if (
      !point(door) ||
      !positive(door.width) ||
      !finite(door.angle) ||
      !positive(door.thickness) ||
      ![1, -1].includes(door.side) ||
      typeof door.flip !== 'boolean' ||
      !wall
    )
      return false;
    if (door.width > Math.hypot(wall.b.x - wall.a.x, wall.b.y - wall.a.y)) return false;
  }
  for (const dim of plan.dimensions)
    if (!point(dim.a) || !point(dim.b) || !finite(dim.offset)) return false;
  for (const label of plan.labels)
    if (!point(label) || typeof label.name !== 'string' || typeof label.area !== 'string')
      return false;
  return true;
}
/** @param {unknown} value Numeric input. @returns {boolean} Whether it is finite and bounded. */
function finite(value) {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) < 1e7;
}
/** @param {unknown} value Dimension input. @returns {boolean} Whether it is positive and bounded. */
function positive(value) {
  return finite(value) && value > 0;
}
/** @param {unknown} value Coordinate object. @returns {boolean} Whether both coordinates are valid. */
function point(value) {
  return !!value && finite(value.x) && finite(value.y);
}
