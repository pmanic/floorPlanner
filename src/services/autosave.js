/** Debounces committed snapshots and serializes asynchronous writes. Changes arriving during
 * a write replace the pending snapshot; stale completions cannot set the UI to “saved”.
 * @param {object} options Save dependencies and UI callbacks.
 * @param {(snapshot: object) => Promise<void>} options.write Persistence adapter.
 * @param {() => void} options.onPending Pending-state notification.
 * @param {() => void} options.onSaved Successful latest-write notification.
 * @param {(error: Error) => void} options.onError Failure notification.
 * @param {number} [options.delay=450] Quiet period before writing.
 * @returns {{schedule: Function, flush: Function, dispose: Function}} Save queue.
 */
export function createAutosave({ write, onPending, onSaved, onError, delay = 450 }) {
  let timer,
    pending = null,
    running = null,
    disposed = false;
  /** Queues a reference only; cloning/encoding is not done during an interaction.
   * @param {object} snapshot Immutable document snapshot.
   */
  function schedule(snapshot) {
    pending = snapshot;
    onPending();
    clearTimeout(timer);
    timer = setTimeout(flush, delay);
  }
  /** Drains the latest snapshots in order and handles failures without an unhandled rejection.
   * @returns {Promise<void>} Completion of all currently queued writes.
   */
  async function flush() {
    clearTimeout(timer);
    if (running) return running;
    running = drain();
    await running;
    running = null;
  }
  /** Writes one snapshot at a time; only the most recent committed revision marks the UI saved.
   * @returns {Promise<void>} Queue completion.
   */
  async function drain() {
    while (pending) {
      const snapshot = pending;
      pending = null;
      try {
        await write(snapshot);
        if (!pending && !disposed) onSaved();
      } catch (error) {
        if (!disposed) onError(error);
      }
    }
  }
  /** Stops timers and attempts a final asynchronous write without updating an unmounted UI. */
  function dispose() {
    disposed = true;
    clearTimeout(timer);
    void flush();
  }
  return { schedule, flush, dispose };
}
