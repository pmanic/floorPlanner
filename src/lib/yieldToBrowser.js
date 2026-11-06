/** Yields until after an animation opportunity before doing non-urgent import/export/print work.
 * @returns {Promise<void>} Next post-animation task; timeout also resolves in background tabs.
 */
export function yieldToBrowser() {
  return new Promise(schedule);
  /** Schedules a task after paint and a bounded fallback for suspended animation frames.
   * @param {() => void} resolve Continuation.
   */
  function schedule(resolve) {
    let frame, timer;
    const fallback = setTimeout(finish, 100);
    frame = requestAnimationFrame(afterFrame);
    /** Moves the continuation out of the pre-paint animation callback. */
    function afterFrame() {
      timer = setTimeout(finish, 0);
    }
    /** Cancels whichever fallback lost the race and resumes the operation. */
    function finish() {
      clearTimeout(fallback);
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      resolve();
    }
  }
}
