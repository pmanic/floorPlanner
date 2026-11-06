import { samplePlan } from './catalog.js';

/** Creates a fresh document with no preloaded geometry or room labels.
 * @param {string} [name='Moj prostor'] Project name.
 * @returns {object} Independent empty document.
 */
export function createBlankPlan(name = 'Moj prostor') {
  return { name, walls: [], doors: [], furniture: [], dimensions: [], labels: [] };
}

/** Removes unchanged built-in demo entities from an older autosave. Modified entities and
 * user-created objects survive, including walls required by retained doors.
 * @param {object} plan Validated legacy document.
 * @returns {object} Document without untouched starter content.
 */
export function removeLegacyDemo(plan) {
  const sample = samplePlan();
  const result = { ...plan };
  for (const collection of ['walls', 'doors', 'furniture', 'dimensions', 'labels']) {
    result[collection] = [];
    for (const item of plan[collection]) {
      let starter = false;
      for (const original of sample[collection]) {
        if (sameValue(item, original)) {
          starter = true;
          break;
        }
      }
      if (!starter) result[collection].push(item);
    }
  }
  const retainedWalls = new Set();
  for (const wall of result.walls) retainedWalls.add(wall.id);
  for (const door of result.doors) {
    if (retainedWalls.has(door.wallId)) continue;
    for (const wall of plan.walls) {
      if (wall.id === door.wallId) {
        result.walls.push(wall);
        retainedWalls.add(wall.id);
        break;
      }
    }
  }
  return result;
}

/** Compares JSON geometry independently of object-property order, preserving any edited fields.
 * @param {any} left Stored entity or nested value.
 * @param {any} right Original demo value.
 * @returns {boolean} Whether both values have identical content.
 */
function sameValue(left, right) {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  for (const key of keys)
    if (!Object.hasOwn(right, key) || !sameValue(left[key], right[key])) return false;
  return true;
}
