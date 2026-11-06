/** Traps keyboard focus inside an open dialog and restores the prior focus on teardown.
 * @param {HTMLElement} node Dialog element.
 * @param {() => void} close Callback for Escape.
 * @returns {{destroy: () => void}} Svelte action cleanup.
 */
export function focusDialog(node, close) {
  const previous = document.activeElement;
  const frame = requestAnimationFrame(focusFirstControl);
  /** Focuses the first editable control after the dialog has mounted. */
  function focusFirstControl() {
    (node.querySelector('input, select') || node.querySelector('button') || node).focus();
  }
  /** Handles Escape and cycles Tab within the dialog.
   * @param {KeyboardEvent} event Keyboard interaction.
   */
  function trap(event) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = [
      ...node.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
      ),
    ];
    const first = controls[0],
      last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  node.addEventListener('keydown', trap);
  /** Cancels pending focus work, removes listeners and restores the invoking control. */
  function destroy() {
    cancelAnimationFrame(frame);
    node.removeEventListener('keydown', trap);
    previous?.focus();
  }
  return { destroy };
}
