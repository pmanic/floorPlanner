import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBlankPlan, removeLegacyDemo } from '../src/lib/blankPlan.js';
import { samplePlan } from '../src/lib/catalog.js';
import { validPlan } from '../src/lib/projectValidation.js';

/** Checks that blank documents have independent arrays and valid empty geometry. */
function emptyDocuments() {
  const first = createBlankPlan(),
    second = createBlankPlan();
  assert.ok(validPlan(first));
  for (const key of ['walls', 'doors', 'furniture', 'dimensions', 'labels']) {
    assert.deepEqual(first[key], []);
    assert.notEqual(first[key], second[key]);
  }
}
test('new documents start empty', emptyDocuments);

/** Checks that previously autosaved starter content is removed rather than restored on reload. */
function removeSavedStarter() {
  const sample = samplePlan();
  const result = removeLegacyDemo(sample);
  assert.deepEqual(result, createBlankPlan(sample.name));
  assert.equal(sample.walls.length, 6);
}
test('legacy starter autosaves become empty', removeSavedStarter);

/** Preserves custom objects, edited starter entities and walls required by retained doors. */
function preserveUserEdits() {
  const sample = samplePlan();
  const custom = { ...sample.furniture[0], id: 'user-fridge', x: 999 };
  sample.furniture.push(custom);
  sample.doors[0] = { ...sample.doors[0], width: 70 };
  const result = removeLegacyDemo(sample);
  assert.deepEqual(result.furniture, [custom]);
  assert.deepEqual(result.doors, [sample.doors[0]]);
  assert.deepEqual(result.walls, [sample.walls[4]]);
  assert.ok(validPlan(result));
}
test('starter cleanup preserves user work and door relationships', preserveUserEdits);
