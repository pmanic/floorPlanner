import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFrameScheduler } from '../src/lib/frameScheduler.js';
import { createHistory } from '../src/editor/history.js';
import { commitDrag, indexEntities, nudgeEntity } from '../src/editor/entities.js';
import { createKitchenIndex, buildKitchenEdges, snapIndexed } from '../src/lib/spatialIndex.js';
import { sharedEdges, snapFurniture } from '../src/lib/geometry.js';
import { samplePlan } from '../src/lib/catalog.js';
import { validPlan } from '../src/lib/projectValidation.js';
import { createAutosave } from '../src/services/autosave.js';
import { formatMeasure, fromDisplayUnit, toDisplayUnit } from '../src/lib/units.js';

/** Checks that door nudges follow horizontal, vertical and diagonal walls in either endpoint order. */
function doorNudgeGeometry() {
  for (const end of [
    { x: 100, y: 0 },
    { x: 0, y: 100 },
    { x: 60, y: 80 },
  ]) {
    for (const reverse of [false, true]) {
      const start = { x: 0, y: 0 };
      const wall = { a: reverse ? end : start, b: reverse ? start : end };
      const door = { x: end.x / 2, y: end.y / 2, width: 20, side: -1, flip: true };
      const moved = nudgeEntity('door', door, 10, 0, wall);
      assert.ok(Math.abs(moved.x - end.x * 0.6) < 1e-8);
      assert.ok(Math.abs(moved.y - end.y * 0.6) < 1e-8);
      assert.equal(moved.side, door.side);
      assert.equal(moved.flip, door.flip);
      const limit = nudgeEntity('door', door, 1000, 0, wall);
      assert.ok(Math.abs(limit.x - end.x * 0.9) < 1e-8);
      assert.ok(Math.abs(limit.y - end.y * 0.9) < 1e-8);
      assert.equal(nudgeEntity('door', limit, 1, 0, wall), limit);
      assert.equal(nudgeEntity('door', door, 0, 1, wall), door);
      assert.equal(nudgeEntity('door', door, 1, 0), door);
    }
  }
}
test(
  'door nudges preserve wall attachment and opening bounds in every orientation',
  doorNudgeGeometry,
);

/** Verifies that frame scheduler coalesces bursts, flushes the last sample, and cancels stale work. */
function regressionCase1() {
  const callbacks = new Map(),
    values = [];
  let id = 0;
  const clock = {
    /** Registers an animation callback on the deterministic test clock.
     * @param {any} fn Input for this operation.
     */
    request(fn) {
      callbacks.set(++id, fn);
      return id;
    },
    /** Cancels an animation callback on the deterministic test clock.
     * @param {any} key Property name or input key.
     */

    cancel(key) {
      callbacks.delete(key);
    },
  };
  const frames = createFrameScheduler(
    /** Records the frame consumer output for assertions.
     * @param {any} value Value to apply or convert.
     */
    (value) => values.push(value),
    clock,
  );
  for (let i = 0; i < 1000; i++) frames.push(i);
  assert.equal(callbacks.size, 1);
  assert.equal(values.length, 0);
  frames.flush();
  assert.deepEqual(values, [999]);
  assert.equal(callbacks.size, 0);
  frames.push('cancelled');
  frames.cancel();
  frames.flush();
  assert.deepEqual(values, [999]);
}
test(
  'frame scheduler coalesces bursts, flushes the last sample, and cancels stale work',
  regressionCase1,
);

/** Verifies that history stores exact immutable references, is bounded, and invalidates redo on a new edit. */
function regressionCase2() {
  const history = createHistory(2),
    a = { name: 'a' },
    b = { name: 'b' },
    c = { name: 'c' },
    d = { name: 'd' };
  history.record(a);
  history.record(b);
  history.record(c);
  assert.equal(history.undo(d), c);
  assert.equal(history.undo(c), b);
  assert.equal(history.undo(b), b);
  assert.equal(history.redo(b), c);
  history.record(c);
  assert.equal(history.canRedo(), false);
}
test(
  'history stores exact immutable references, is bounded, and invalidates redo on a new edit',
  regressionCase2,
);

/** Verifies that a committed wall drag moves attached doors once without mutating its snapshot. */
function regressionCase3() {
  const plan = samplePlan(),
    before = JSON.stringify(plan),
    wall = plan.walls.find(
      /** Selects the sample interior wall with attached doors.
       * @param {any} w Input for this operation.
       */
      (w) => w.id === 'w5',
    );
  const moved = {
    ...wall,
    a: { x: wall.a.x + 50, y: wall.a.y + 25 },
    b: { x: wall.b.x + 50, y: wall.b.y + 25 },
  };
  const result = commitDrag(plan, 'wall', wall, moved);
  assert.equal(JSON.stringify(plan), before);
  assert.equal(result.furniture, plan.furniture);
  assert.equal(result.walls[0], plan.walls[0]);
  assert.equal(result.walls[4], moved);
  assert.equal(result.doors[0].x, plan.doors[0].x + 50);
  assert.equal(result.doors[0].y, plan.doors[0].y + 25);
  assert.equal(result.doors[2], plan.doors[2]);
  assert.equal(indexEntities(result).get(wall.id).item, moved);
}
test(
  'a committed wall drag moves attached doors once without mutating its snapshot',
  regressionCase3,
);

/** Verifies that spatial candidates and cached kitchen edges match the reference geometry. */
function regressionCase4() {
  const items = [];
  for (let y = 0; y < 20; y++)
    for (let x = 0; x < 50; x++)
      items.push({
        id: `${x}:${y}`,
        x: x * 60,
        y: y * 140,
        w: 60,
        h: 60,
        kitchen: true,
        rotation: 0,
      });
  const index = createKitchenIndex(items);
  assert.equal(createKitchenIndex(items), index);
  const candidate = { id: 'new', x: 1207, y: 2, w: 60, h: 60, kitchen: true, rotation: 0 };
  assert.ok(
    index.query(candidate).length < 30,
    'local query must not scan 1000 returned candidates',
  );
  assert.deepEqual(snapIndexed(candidate, index, true), snapFurniture(candidate, items, true));
  const edges = buildKitchenEdges(items);
  for (const item of [items[0], items[1], items[49], items[500]])
    assert.deepEqual(edges.get(item.id), sharedEdges(item, items));
  const huge = { id: 'huge', x: 0, y: 0, w: 9e6, h: 9e6, rotation: 0, kitchen: true };
  assert.ok(createKitchenIndex([huge]).query(candidate).includes(huge));
}
test('spatial candidates and cached kitchen edges match the reference geometry', regressionCase4);

/** Verifies that project boundary rejects duplicate IDs, invalid dimensions, and orphaned doors. */
function regressionCase5() {
  assert.equal(validPlan(samplePlan()), true);
  const duplicate = samplePlan();
  duplicate.furniture[0].id = duplicate.walls[0].id;
  assert.equal(validPlan(duplicate), false);
  const invalid = samplePlan();
  invalid.furniture[0].w = Infinity;
  assert.equal(validPlan(invalid), false);
  const orphan = samplePlan();
  orphan.doors[0].wallId = 'missing';
  assert.equal(validPlan(orphan), false);
}
test(
  'project boundary rejects duplicate IDs, invalid dimensions, and orphaned doors',
  regressionCase5,
);

/** Verifies that unit switching preserves canonical dimensions and cached formatting. */
function regressionCase6() {
  assert.equal(fromDisplayUnit('0.15', 'm'), 15);
  assert.equal(toDisplayUnit(15, 'm'), 0.15);
  assert.equal(formatMeasure(150, 'cm'), '150 cm');
  assert.equal(formatMeasure(150, 'm'), '1,5 m');
}
test('unit switching preserves canonical dimensions and cached formatting', regressionCase6);

/** Verifies that autosave writes only latest pending state and never marks an older write saved. */
async function regressionCase7() {
  const written = [],
    resolvers = [];
  let saved = 0;
  const queue = createAutosave({
    /** Simulates an asynchronous storage write under test control.
     * @param {any} value Value to apply or convert.
     */
    write(value) {
      written.push(value);
      return new Promise(
        /** Retains the fake storage resolver so the test controls completion ordering.
         * @param {any} resolve Input for this operation.
         */
        (resolve) => resolvers.push(resolve),
      );
    },
    /** Accepts pending notifications without side effects in this test.
     */

    onPending() {},
    /** Counts successful latest-revision save notifications.
     */

    onSaved() {
      saved++;
    },
    /** Handles the storage failure expected by this regression scenario.
     * @param {any} error Input for this operation.
     */

    onError(error) {
      throw error;
    },
    delay: 10000,
  });
  const a = { revision: 1 },
    b = { revision: 2 },
    c = { revision: 3 };
  queue.schedule(a);
  const running = queue.flush();
  queue.schedule(b);
  queue.schedule(c);
  resolvers.shift()();
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(written, [a, c]);
  assert.equal(saved, 0);
  resolvers.shift()();
  await running;
  assert.equal(saved, 1);
  queue.dispose();
}
test(
  'autosave writes only latest pending state and never marks an older write saved',
  regressionCase7,
);

/** Verifies that autosave reports a write failure without claiming success and accepts a later retry. */
async function regressionCase8() {
  let fail = true,
    errors = 0,
    saved = 0;
  const queue = createAutosave({
    /** Simulates an asynchronous storage write under test control.
     */
    async write() {
      if (fail) throw Error('quota');
    },
    /** Accepts pending notifications without side effects in this test.
     */

    onPending() {},
    /** Counts successful latest-revision save notifications.
     */

    onSaved() {
      saved++;
    },
    /** Handles the storage failure expected by this regression scenario.
     */

    onError() {
      errors++;
    },
    delay: 10000,
  });
  queue.schedule({ revision: 1 });
  await queue.flush();
  assert.equal(errors, 1);
  assert.equal(saved, 0);
  fail = false;
  queue.schedule({ revision: 2 });
  await queue.flush();
  assert.equal(saved, 1);
  queue.dispose();
}
test(
  'autosave reports a write failure without claiming success and accepts a later retry',
  regressionCase8,
);
