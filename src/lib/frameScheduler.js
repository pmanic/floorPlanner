/** Coalesces continuous events to the newest sample per animation frame. `flush` is mandatory
 * before pointer-up so a fast press/move/release cannot lose its last coordinate.
 * Default browser callbacks retain their global receiver when invoked through the clock object.
 * @param {(value: any) => void} consume Consumer invoked once per frame.
 * @param {{request: Function, cancel: Function}} [clock] Injectable animation clock for tests.
 * @returns {{push: Function, flush: Function, cancel: Function}} Scheduling API.
 */
export function createFrameScheduler(
  consume,
  clock = {
    request: requestAnimationFrame.bind(globalThis),
    cancel: cancelAnimationFrame.bind(globalThis),
  },
) {
  let frame = null,
    latest,
    pending = false;
  /** Runs the most recent sample and releases the scheduled frame. */
  function run() {
    frame = null;
    if (!pending) return;
    const value = latest;
    latest = undefined;
    pending = false;
    consume(value);
  }
  /** Replaces the queued sample, allocating at most one animation callback.
   * @param {any} value Latest continuous input.
   */
  function push(value) {
    latest = value;
    pending = true;
    if (frame === null) frame = clock.request(run);
  }
  /** Processes the latest sample synchronously at an interaction boundary. */
  function flush() {
    if (frame !== null) clock.cancel(frame);
    frame = null;
    run();
  }
  /** Drops pending samples when an interaction is cancelled or the editor unmounts. */
  function cancel() {
    if (frame !== null) clock.cancel(frame);
    frame = null;
    pending = false;
    latest = undefined;
  }
  return { push, flush, cancel };
}
