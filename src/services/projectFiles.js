import { validPlan } from '../lib/projectValidation.js';

/** Downloads a portable project file. Caller yields to paint before invoking this encoding path.
 * @param {object} plan Immutable document.
 * @param {'cm'|'m'} unit Display preference.
 * @returns {Promise<void>} Download initiation.
 */
export async function downloadProject(plan, unit) {
  const content = await serializeProject({ version: 1, plan, unit });
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${plan.name || 'forma-plan'}.json`;
  anchor.click();
  setTimeout(release, 1000);
  /** Releases the temporary URL after the browser starts consuming it. */
  function release() {
    URL.revokeObjectURL(url);
  }
}

/** Reads and validates an imported file outside the initial input event.
 * @param {File} file Selected JSON file, limited to 5 MB.
 * @returns {Promise<{plan:object,unit:'cm'|'m'}>} Validated project data.
 * @throws {Error} If the file is oversized, malformed or has invalid geometry.
 */
export async function readProjectFile(file) {
  if (file.size > 5_000_000) throw new Error('Project exceeds the 5 MB import limit.');
  const data = await processJSON('parse', await file.text());
  if (!validPlan(data?.plan)) throw new Error('Invalid project schema.');
  return { plan: data.plan, unit: data.unit === 'm' ? 'm' : 'cm' };
}

/** Encodes a snapshot in a dedicated worker, avoiding JSON.stringify on the interaction thread.
 * @param {object} snapshot Portable project envelope.
 * @returns {Promise<string>} JSON source.
 */
export function serializeProject(snapshot) {
  return processJSON('stringify', snapshot);
}

/** Runs a single JSON conversion in a short-lived worker, terminating on success or failure.
 * @param {'parse'|'stringify'} operation JSON operation.
 * @param {object|string} payload Input data.
 * @returns {Promise<any>} Converted result.
 */
function processJSON(operation, payload) {
  return new Promise(run);
  /** Handles the worker protocol and bounds its lifetime.
   * @param {Function} resolve Success callback.
   * @param {Function} reject Error callback.
   */
  function run(resolve, reject) {
    const worker = new Worker(new URL('../workers/projectJSON.js', import.meta.url), {
      type: 'module',
    });
    const timeout = setTimeout(expire, 15000);
    worker.onmessage = complete;
    worker.onerror = fail;
    try {
      worker.postMessage({ operation, payload });
    } catch (error) {
      finish();
      reject(error);
    }
    /** @param {MessageEvent} event Converted result or parsing error. */
    function complete(event) {
      finish();
      event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.result);
    }
    /** @param {ErrorEvent} event Worker failure. */
    function fail(event) {
      finish();
      reject(new Error(event.message || 'JSON worker failed.'));
    }
    /** Rejects a worker that did not respond within the expected interval. */
    function expire() {
      finish();
      reject(new Error('JSON operation timed out.'));
    }
    /** Releases worker and timeout resources on every completion path. */
    function finish() {
      clearTimeout(timeout);
      worker.terminate();
    }
  }
}
