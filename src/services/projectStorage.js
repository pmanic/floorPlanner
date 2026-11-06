const DATABASE = 'forma-projects';
const STORE = 'projects';
const KEY = 'current';
let connection;

/** Opens the local IndexedDB database once. No JSON serialization or synchronous storage write
 * occurs on the input path; existing localStorage projects are migrated on load.
 * @returns {Promise<IDBDatabase>} Database connection.
 */
function openDatabase() {
  if (connection) return connection;
  connection = new Promise(open);
  /** Configures schema creation and connection lifecycle.
   * @param {Function} resolve Promise success callback.
   * @param {Function} reject Promise failure callback.
   */
  function open(resolve, reject) {
    const request = indexedDB.open(DATABASE, 1);
    /** Creates the initial object store. */
    request.onupgradeneeded = function upgrade() {
      request.result.createObjectStore(STORE);
    };
    /** Exposes a reusable connection and closes it when a future schema upgrade is requested. */
    request.onsuccess = function connected() {
      const db = request.result;
      db.onversionchange = close;
      resolve(db);
      /** Releases an outdated connection for an upgrade in another tab. */
      function close() {
        db.close();
        connection = undefined;
      }
    };
    /** Rejects connection failures so the UI cannot falsely claim data was saved. */
    request.onerror = function failed() {
      connection = undefined;
      reject(request.error);
    };
    /** Rejects a blocked upgrade instead of leaving the save indicator pending indefinitely. */
    request.onblocked = function blocked() {
      connection = undefined;
      reject(new Error('Lokalna baza je zauzeta drugim prozorom.'));
    };
  }
  return connection;
}

/** Writes an immutable snapshot and resolves only after the transaction commits.
 * @param {object} snapshot Project and persisted preferences.
 * @returns {Promise<void>} Transaction completion.
 */
export async function writeProject(snapshot) {
  const db = await openDatabase();
  return new Promise(write);
  /** Creates a transaction with explicit commit/error handling.
   * @param {Function} resolve Success callback.
   * @param {Function} reject Failure callback.
   */
  function write(resolve, reject) {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(snapshot, KEY);
    /** Marks the write complete after IndexedDB commits. */
    transaction.oncomplete = function complete() {
      resolve();
    };
    /** Reports transaction failures. */
    transaction.onerror = function failed() {
      reject(transaction.error);
    };
    /** Reports aborted transactions, including quota failures. */
    transaction.onabort = function aborted() {
      reject(transaction.error || new Error('Čuvanje je prekinuto.'));
    };
  }
}

/** Loads the latest project, falling back to the previous storage format for migration.
 * @returns {Promise<object|null>} Untrusted snapshot; caller must validate it.
 */
export async function readProject() {
  const db = await openDatabase();
  const stored = await new Promise(read);
  /** Retrieves the current project without changing it.
   * @param {Function} resolve Success callback.
   * @param {Function} reject Failure callback.
   */
  function read(resolve, reject) {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
    /** Returns a stored snapshot. */
    request.onsuccess = function loaded() {
      resolve(request.result);
    };
    /** Propagates a read failure. */
    request.onerror = function failed() {
      reject(request.error);
    };
  }
  if (stored) return stored;
  const legacy = localStorage.getItem('forma-plan-v1');
  return legacy ? JSON.parse(legacy) : null;
}
