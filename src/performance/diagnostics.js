/** Enables opt-in local INP and long-task diagnostics. No telemetry leaves the browser.
 * Open with ?performance=1, interact, then inspect window.__FORMA_PERFORMANCE__.
 * @returns {Promise<void>} Observer initialization.
 */
export async function startPerformanceDiagnostics() {
  if (!new URLSearchParams(location.search).has('performance')) return;
  const { onINP } = await import('web-vitals');
  const report = {
    inp: null,
    longTasks: [],
    samples: [],
    note: 'Local diagnostics; not field p75. Pointer-move smoothness is measured separately.',
  };
  window.__FORMA_PERFORMANCE__ = report;
  onINP(recordINP, { reportAllChanges: true });
  /** Records the official library's INP metric without DOM targets or user data.
   * @param {import('web-vitals').INPMetric} metric Current page-lifecycle metric.
   */
  function recordINP(metric) {
    const sample = { value: metric.value, rating: metric.rating, id: metric.id };
    report.inp = sample;
    report.samples.push(sample);
    if (report.samples.length > 30) report.samples.shift();
  }
  if (!PerformanceObserver.supportedEntryTypes.includes('longtask')) return;
  const observer = new PerformanceObserver(recordTasks);
  /** Retains a bounded list of blocking tasks for manual profiling.
   * @param {PerformanceObserverEntryList} list Observed timing entries.
   */
  function recordTasks(list) {
    for (const entry of list.getEntries()) {
      report.longTasks.push({ startTime: entry.startTime, duration: entry.duration });
      if (report.longTasks.length > 50) report.longTasks.shift();
    }
  }
  observer.observe({ type: 'longtask', buffered: true });
  /** Disconnects the debug-only observer when the page is discarded. */
  function cleanup() {
    observer.disconnect();
  }
  window.addEventListener('pagehide', cleanup, { once: true });
}
