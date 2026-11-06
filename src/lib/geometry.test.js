import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  projectOnWall,
  doorPlacement,
  dimensionGeometry,
  snapFurniture,
  sharedEdges,
  furnitureBounds,
} from './geometry.js';

/** Verifies that door projects to a wall, fits within endpoints, and switches side. */
function regressionCase1() {
  const wall = { id: 'w', a: { x: 0, y: 0 }, b: { x: 200, y: 0 }, thickness: 20 };
  assert.deepEqual(projectOnWall({ x: 40, y: 20 }, wall).point, { x: 40, y: 0 });
  const above = doorPlacement({ x: 10, y: -10 }, [wall], 90);
  assert.equal(above.x, 45);
  assert.equal(above.side, -1);
  assert.equal(doorPlacement({ x: 190, y: 10 }, [wall], 90).x, 155);
  assert.equal(doorPlacement({ x: 190, y: 10 }, [wall], 90).side, 1);
  assert.equal(doorPlacement({ x: 100, y: 100 }, [wall], 90), null);
  assert.equal(doorPlacement({ x: 20, y: 0 }, [wall], 250), null);
}
test('door projects to a wall, fits within endpoints, and switches side', regressionCase1);
/** Verifies that vertical wall door keeps proper angle and point. */
function regressionCase2() {
  const door = doorPlacement(
    { x: 110, y: 130 },
    [{ id: 'w', a: { x: 100, y: 0 }, b: { x: 100, y: 300 }, thickness: 15 }],
    80,
  );
  assert.equal(door.angle, 90);
  assert.equal(door.x, 100);
  assert.equal(door.side, -1);
}
test('vertical wall door keeps proper angle and point', regressionCase2);
/** Verifies that door hinge responds to pointer on either side of opening center. */
function regressionCase3() {
  const wall = { id: 'w', a: { x: 0, y: 0 }, b: { x: 400, y: 0 }, thickness: 20 };
  const left = doorPlacement({ x: 150, y: 10 }, [wall], 80);
  const right = doorPlacement({ x: 170, y: -10 }, [wall], 80);
  assert.equal(left.x, right.x);
  assert.equal(left.flip, false);
  assert.equal(right.flip, true);
  assert.equal(left.side, 1);
  assert.equal(right.side, -1);
}
test('door hinge responds to pointer on either side of opening center', regressionCase3);
/** Verifies that dimensions offset perpendicular to diagonal measurements. */
function regressionCase4() {
  const g = dimensionGeometry({ a: { x: 0, y: 0 }, b: { x: 300, y: 400 }, offset: 50 });
  assert.equal(g.length, 500);
  assert.deepEqual(g.p, { x: -40, y: 30 });
  assert.deepEqual(g.q, { x: 260, y: 430 });
}
test('dimensions offset perpendicular to diagonal measurements', regressionCase4);
/** Verifies that kitchen snaps flush and hides only fully shared boundaries. */
function regressionCase5() {
  const a = { id: 'a', x: 0, y: 0, w: 60, h: 60, rotation: 0, kitchen: true };
  const b = { id: 'b', x: 66, y: 5, w: 60, h: 60, rotation: 0, kitchen: true };
  const snapped = snapFurniture(b, [a]);
  assert.equal(snapped.x, 60);
  assert.equal(snapped.y, 0);
  assert.equal(sharedEdges(a, [snapped]).right, true);
  assert.equal(sharedEdges(snapped, [a]).left, true);
  assert.equal(sharedEdges(a, [{ ...snapped, h: 40 }]).right, false);
  assert.equal(snapFurniture(b, [a], false).x, 66);
  assert.equal(snapFurniture({ ...b, kitchen: false }, [a]).x, 66);
}
test('kitchen snaps flush and hides only fully shared boundaries', regressionCase5);
/** Verifies that rotated kitchen items snap in world space and map the hidden edge locally. */
function regressionCase6() {
  const a = { id: 'a', x: 0, y: 0, w: 60, h: 80, rotation: 0, kitchen: true };
  const b = { id: 'b', x: 60, y: 0, w: 80, h: 60, rotation: 90, kitchen: true };
  const snapped = snapFurniture(b, [a]);
  const bounds = furnitureBounds(snapped);
  assert.ok(Math.abs(bounds.x - 60) < 0.01);
  assert.ok(Math.abs(bounds.y) < 0.01);
  assert.equal(sharedEdges(snapped, [a]).bottom, true);
  assert.equal(sharedEdges(a, [snapped]).right, true);
}
test('rotated kitchen items snap in world space and map the hidden edge locally', regressionCase6);
