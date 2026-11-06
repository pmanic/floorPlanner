/** Converts portable project JSON away from the main rendering thread.
 * @param {MessageEvent<{operation:'parse'|'stringify',payload:any}>} event Conversion request.
 */
self.onmessage = function convertProject(event) {
  try {
    const { operation, payload } = event.data;
    const result = operation === 'parse' ? JSON.parse(payload) : JSON.stringify(payload, null, 2);
    self.postMessage({ result });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
