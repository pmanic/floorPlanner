/** Creates bounded undo/redo stacks of immutable document references. Snapshots share unchanged
 * arrays and entities; recording history never serializes or deeply clones the document.
 * @param {number} [limit=70] Maximum retained undo steps.
 * @returns {{record: Function, undo: Function, redo: Function, canUndo: Function, canRedo: Function}} History API.
 */
export function createHistory(limit = 70) {
  let past = [],
    future = [];
  /** Records the state before a committed edit and invalidates redo.
   * @param {object} plan Immutable document reference.
   */
  function record(plan) {
    past = [...past.slice(-(limit - 1)), plan];
    future = [];
  }
  /** Restores the last state while retaining the current one for redo.
   * @param {object} current Current immutable document.
   * @returns {object} Restored document, or the original reference if no step exists.
   */
  function undo(current) {
    if (!past.length) return current;
    future.push(current);
    return past.pop();
  }
  /** Restores a previously undone state.
   * @param {object} current Current immutable document.
   * @returns {object} Restored document, or the current reference.
   */
  function redo(current) {
    if (!future.length) return current;
    past.push(current);
    return future.pop();
  }
  /** @returns {boolean} Whether an undo step exists. */
  function canUndo() {
    return past.length > 0;
  }
  /** @returns {boolean} Whether a redo step exists. */
  function canRedo() {
    return future.length > 0;
  }
  return { record, undo, redo, canUndo, canRedo };
}
