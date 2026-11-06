import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { indexedDB } from 'fake-indexeddb';
import { compile, compileModule } from 'svelte/compiler';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { samplePlan } from '../src/lib/catalog.js';

const browser = new Window({ url: 'http://localhost/' });
for (const key of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'Element',
  'Node',
  'Text',
  'Comment',
  'Event',
  'MouseEvent',
  'SVGElement',
  'MutationObserver',
  'ResizeObserver',
  'localStorage',
]) {
  Object.defineProperty(globalThis, key, {
    value: key === 'window' ? browser : browser[key],
    configurable: true,
    writable: true,
  });
}
globalThis.indexedDB = indexedDB;
const frames = new Map();
let frameId = 0;
globalThis.requestAnimationFrame = requestFrame;
globalThis.cancelAnimationFrame = cancelFrame;
/** Registers a deterministic test animation callback.
 * @param {any} fn Input for this operation.
 */
function requestFrame(fn) {
  assert.ok(this == null || this === globalThis, 'requestAnimationFrame: illegal receiver');
  frames.set(++frameId, fn);
  return frameId;
}
/** Removes a deterministic test animation callback.
 * @param {any} id Tool or entity identifier.
 */
function cancelFrame(id) {
  assert.ok(this == null || this === globalThis, 'cancelAnimationFrame: illegal receiver');
  frames.delete(id);
}
/** Executes the currently queued test frame without running future frames recursively.
 */
function drawFrame() {
  const pending = [...frames.values()];
  frames.clear();
  for (const callback of pending) callback(0);
}

const runtime = path.resolve('.test-runtime');
await mkdir(runtime, { recursive: true });
let controller = compileModule(await readFile('src/editor/createEditor.svelte.js', 'utf8'), {
  filename: 'createEditor.svelte.js',
  generate: 'client',
  dev: true,
}).js.code;
controller = controller.replace(/from\s+(['"])(\.[^'"]+)\1/g, absoluteImport);
/** Resolves the compiled test controller imports back to maintained source modules.
 * @param {any} match Matched import statement.
 * @param {any} quote Original import quote character.
 * @param {any} relative Relative module specifier.
 */
function absoluteImport(match, quote, relative) {
  return `from ${quote}${pathToFileURL(path.resolve('src/editor', relative)).href}${quote}`;
}
await writeFile(path.join(runtime, 'editor.mjs'), controller);
const harness = `<script>import {createEditor} from './editor.mjs';let {capture}=$props();const editor=createEditor();capture(editor);</script><main bind:this={editor.canvasHost}><svg bind:this={editor.svg}></svg></main>`;
await writeFile(
  path.join(runtime, 'harness.mjs'),
  compile(harness, { filename: 'Harness.svelte', generate: 'client', dev: true }).js.code,
);
const { mount, unmount, flushSync, tick } = await import('svelte');
const { default: Harness } = await import(pathToFileURL(path.join(runtime, 'harness.mjs')).href);

/** Compiles the real plan-rendering components so tests exercise their runtime imports as well
 * as the controller. All generated modules stay inside the existing test-runtime directory.
 * @param {string} name Component filename without its extension.
 * @returns {Promise<void>} Completion of the generated client module.
 */
async function compilePlanComponent(name) {
  const filename = path.resolve('src/components/plan', `${name}.svelte`);
  const result = compile(await readFile(filename, 'utf8'), {
    filename,
    generate: 'client',
    dev: true,
  });
  const code = result.js.code.replace(/from\s+(['"])(\.[^'"]+)\1/g, resolvePlanImport);
  /** Resolves compiled component siblings and unmodified source helpers separately.
   * @param {string} match Original import statement.
   * @param {string} quote Original quote character.
   * @param {string} relative Relative module specifier.
   * @returns {string} Import referencing the appropriate runtime or source file.
   */
  function resolvePlanImport(match, quote, relative) {
    const target = relative.endsWith('.svelte')
      ? path.join(runtime, `${path.basename(relative, '.svelte')}.mjs`)
      : path.resolve(path.dirname(filename), relative);
    return `from ${quote}${pathToFileURL(target).href}${quote}`;
  }
  await writeFile(path.join(runtime, `${name}.mjs`), code);
}

for (const name of ['Furniture', 'DoorShape', 'DimensionShape', 'WallPreview', 'PlanScene']) {
  await compilePlanComponent(name);
}
const wallHarness = `<script>import WallPreview from './WallPreview.mjs';let {editor}=$props();</script><svelte:window onkeydown={editor.keyDown}/><svg onpointerdown={editor.pointerDown} onpointermove={editor.pointerMove} onpointerup={editor.pointerUp}>{#if editor.tool==='wall'&&editor.draft.length}<WallPreview a={editor.draft[0]} b={editor.pointer} thickness={editor.wallThickness} unit={editor.unit} zoom={editor.zoom}/>{/if}</svg>`;
await writeFile(
  path.join(runtime, 'wall-harness.mjs'),
  compile(wallHarness, { filename: 'WallHarness.svelte', generate: 'client', dev: true }).js.code,
);
const { default: WallHarness } = await import(
  pathToFileURL(path.join(runtime, 'wall-harness.mjs')).href
);
const { default: PlanScene } = await import(
  pathToFileURL(path.join(runtime, 'PlanScene.mjs')).href
);

/** Verifies that the real plan scene renders dimensions and all sample elements in both display units. */
async function regressionCase1() {
  const plan = samplePlan();
  for (const unit of ['cm', 'm']) {
    const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.append(target);
    let component;
    try {
      component = mount(PlanScene, {
        target,
        props: {
          plan,
          showFurniture: true,
          showDimensions: true,
          layerVisible: { walls: true, doors: true },
          unit,
          kitchenBorders: false,
          movingId: null,
        },
      });
      flushSync();
      assert.equal(
        target.querySelectorAll('[data-id]').length,
        plan.walls.length + plan.doors.length + plan.furniture.length + plan.dimensions.length,
      );
      assert.equal(
        target.querySelector('[data-id="m1"] text').textContent,
        unit === 'cm' ? '540 cm' : '5,4 m',
      );
      assert.equal(
        target.querySelector('[data-id="m3"] text').textContent,
        unit === 'cm' ? '620 cm' : '6,2 m',
      );
      assert.equal(target.querySelector('[data-id="m1"] line').getAttribute('y1'), '-65');
    } finally {
      if (component) await unmount(component);
      target.remove();
    }
  }
}
test(
  'the real plan scene renders dimensions and all sample elements in both display units',
  regressionCase1,
);

after(
  /** Closes the simulated DOM and removes only the generated test-runtime directory.
   */
  async () => {
    await browser.happyDOM.close();
    await rm(runtime, { recursive: true, force: true });
  },
);

/** Mounts a real Svelte controller with explicit test geometry after storage initialization.
 * @param {object|null} [seed=samplePlan()] Test document, or null to inspect blank startup.
 */
async function setup(seed = samplePlan()) {
  let editor;
  const target = document.createElement('div');
  document.body.append(target);
  const component = mount(Harness, {
    target,
    props: {
      /** Tracks a simulated pointer capture.
       * @param {any} value Value to apply or convert.
       */
      capture(value) {
        editor = value;
      },
    },
  });
  flushSync();
  const captures = new Set();
  editor.svg.getBoundingClientRect = bounds;
  editor.svg.setPointerCapture = capture;
  editor.svg.releasePointerCapture = release;
  editor.svg.hasPointerCapture = hasCapture;
  /** Supplies a stable canvas rectangle to a DOM interaction test.
   */
  function bounds() {
    return { left: 0, top: 0, width: 1000, height: 800 };
  }
  /** Tracks a simulated pointer capture.
   * @param {any} id Tool or entity identifier.
   */
  function capture(id) {
    captures.add(id);
  }
  /** Releases a simulated pointer capture.
   * @param {any} id Tool or entity identifier.
   */
  function release(id) {
    captures.delete(id);
  }
  /** Reports whether the simulated SVG owns a pointer.
   * @param {any} id Tool or entity identifier.
   */
  function hasCapture(id) {
    return captures.has(id);
  }
  for (let i = 0; i < 100 && !editor.ready; i++)
    await new Promise(
      /** Yields to the simulated IndexedDB completion task.
       * @param {any} resolve Input for this operation.
       */
      (resolve) => setTimeout(resolve, 2),
    );
  assert.ok(editor.ready, 'editor initializes local persistence');
  editor.ready = false;
  if (seed) editor.plan = seed;
  drawFrame();
  await tick();
  editor.pan = { x: 0, y: 0 };
  editor.zoom = 1;
  /** Removes observers/listeners, cancels transient work and flushes queued persistence when the editor unmounts.
   */
  async function cleanup() {
    await unmount(component);
    target.remove();
    frames.clear();
  }
  return { editor, cleanup };
}
/** Builds a pointer event fixture targeting a chosen entity ID.
 * @param {any} x Horizontal coordinate in centimeters.
 * @param {any} y Vertical coordinate in centimeters.
 * @param {any} id Tool or entity identifier.
 */
function pointer(x, y, id = null) {
  return {
    clientX: x,
    clientY: y,
    button: 0,
    pointerId: 1,
    shiftKey: false,
    target: {
      /** Resolves the requested entity wrapper in a pointer-event fixture.
       */
      closest() {
        return id
          ? {
              /** Returns the fixture entity ID.
               */
              getAttribute() {
                return id;
              },
            }
          : null;
      },
    },
  };
}

/** Verifies that furniture preview leaves committed plan unchanged and pointerup flushes the last sample. */
async function regressionCase2() {
  const { editor, cleanup } = await setup();
  const original = editor.plan,
    first = original.furniture[0];
  editor.pointerDown(pointer(first.x, first.y, first.id));
  for (let i = 1; i <= 100; i++) editor.pointerMove(pointer(first.x + i, first.y + 200));
  assert.equal(editor.plan, original);
  assert.equal(editor.dragPreview, null);
  assert.equal(frames.size, 1);
  drawFrame();
  assert.equal(editor.plan, original);
  assert.ok(editor.dragPreview);
  editor.pointerUp(pointer(first.x + 150, first.y + 200));
  assert.notEqual(editor.plan, original);
  assert.equal(editor.plan.furniture[0].x, first.x + 150);
  assert.equal(editor.plan.furniture[0].y, first.y + 200);
  editor.undo();
  assert.equal(editor.plan, original);
  assert.equal(editor.canUndo, false);
  editor.redo();
  assert.equal(editor.plan.furniture[0].x, first.x + 150);
  await cleanup();
}
test(
  'furniture preview leaves committed plan unchanged and pointerup flushes the last sample',
  regressionCase2,
);

/** Verifies that cancelled drag and drag back to original position create no document or history change. */
async function regressionCase3() {
  const { editor, cleanup } = await setup();
  const original = editor.plan,
    first = original.furniture[0];
  editor.pointerDown(pointer(first.x, first.y, first.id));
  editor.pointerMove(pointer(first.x + 100, first.y + 200));
  drawFrame();
  editor.cancelInteraction();
  assert.equal(editor.plan, original);
  assert.equal(editor.dragPreview, null);
  assert.equal(editor.canUndo, false);
  editor.pointerDown(pointer(first.x, first.y, first.id));
  editor.pointerMove(pointer(first.x + 100, first.y + 200));
  drawFrame();
  editor.pointerUp(pointer(first.x, first.y));
  assert.equal(editor.plan, original);
  assert.equal(editor.canUndo, false);
  await cleanup();
}
test(
  'cancelled drag and drag back to original position create no document or history change',
  regressionCase3,
);

/** Verifies that wall drag keeps attached doors synchronized and commits one undo step. */
async function regressionCase4() {
  const { editor, cleanup } = await setup();
  const original = editor.plan,
    wall = original.walls[4],
    door = original.doors[0];
  editor.pointerDown(pointer(wall.a.x, wall.a.y, wall.id));
  editor.pointerUp(pointer(wall.a.x + 100, wall.a.y + 50));
  assert.equal(editor.plan.doors[0].x, door.x + 100);
  assert.equal(editor.plan.doors[0].y, door.y + 50);
  editor.undo();
  assert.equal(editor.plan, original);
  assert.equal(editor.canUndo, false);
  await cleanup();
}
test('wall drag keeps attached doors synchronized and commits one undo step', regressionCase4);

/** Verifies that click placement uses the click coordinate without depending on a previous hover frame. */
async function regressionCase5() {
  const { editor, cleanup } = await setup();
  const original = editor.plan;
  editor.chooseTool('wall');
  editor.acceptSetting();
  editor.pointerDown(pointer(1000, 1000));
  editor.pointerUp(pointer(1000, 1000));
  editor.pointerDown(pointer(1200, 1000));
  editor.pointerUp(pointer(1200, 1000));
  assert.equal(editor.plan.walls.length, original.walls.length + 1);
  assert.deepEqual(editor.plan.walls.at(-1).b, { x: 1200, y: 1000 });
  editor.chooseTool('dimension');
  editor.pointerDown(pointer(1000, 1000));
  editor.pointerDown(pointer(1200, 1000));
  editor.pointerDown(pointer(1100, 900));
  assert.equal(editor.plan.dimensions.at(-1).offset, -100);
  editor.chooseTool('door');
  editor.acceptSetting();
  editor.pointerDown(pointer(1100, 1010));
  assert.equal(editor.plan.doors.at(-1).wallId, editor.plan.walls.at(-1).id);
  editor.pickFurniture({ type: 'counter', name: 'Radna površina', w: 60, h: 60, kitchen: true });
  editor.pointerDown(pointer(1500, 1500));
  assert.equal(editor.plan.furniture.at(-1).x, 1470);
  assert.equal(editor.plan.furniture.at(-1).y, 1470);
  await cleanup();
}
test(
  'click placement uses the click coordinate without depending on a previous hover frame',
  regressionCase5,
);

/** Verifies empty startup and that letter keys no longer select or interrupt toolbar tools. */
async function blankStartupWithoutToolShortcuts() {
  const { editor, cleanup } = await setup(null);
  try {
    for (const key of ['walls', 'doors', 'furniture', 'dimensions', 'labels']) {
      assert.equal(editor.plan[key].length, 0);
    }
    editor.chooseTool('dimension');
    for (const key of 'vhw dkfpVHW DKFP'.replaceAll(' ', '')) {
      editor.keyDown({ key, target: document.body });
    }
    assert.equal(editor.tool, 'dimension');
    assert.equal(editor.modal, null);
  } finally {
    await cleanup();
  }
}
test('startup is empty and tool letter shortcuts are disabled', blankStartupWithoutToolShortcuts);

/** Sends an arrow through the controller's shortcut routing, including default prevention.
 * @param {object} editor Mounted editor controller.
 * @param {string} key Arrow key name.
 * @param {object} [options] Modifier keys or an editable event target.
 * @returns {boolean} Whether the editor consumed the key.
 */
function pressArrow(editor, key, options = {}) {
  let prevented = false;
  editor.keyDown({
    key,
    target: document.body,
    ...options,
    /** Records whether native page scrolling was suppressed. */
    preventDefault() {
      prevented = true;
    },
  });
  return prevented;
}

/** Checks precise four-way movement, structural sharing, undo/redo and keyboard guards. */
async function nudgeFurnitureSelection() {
  const { editor, cleanup } = await setup();
  try {
    const original = editor.plan;
    const first = original.furniture[0];
    editor.selectedId = first.id;
    assert.equal(pressArrow(editor, 'ArrowRight'), true);
    assert.equal(editor.plan.furniture[0].x, first.x + 1);
    assert.equal(editor.plan.walls, original.walls);
    assert.equal(editor.plan.furniture[1], original.furniture[1]);
    assert.equal(original.furniture[0], first);
    editor.undo();
    assert.equal(editor.plan, original);
    editor.redo();
    editor.selectedId = first.id;
    editor.unit = 'm';
    pressArrow(editor, 'ArrowDown', { shiftKey: true });
    pressArrow(editor, 'ArrowLeft');
    pressArrow(editor, 'ArrowUp');
    assert.equal(editor.plan.furniture[0].x, first.x);
    assert.equal(editor.plan.furniture[0].y, first.y + 9);
    const moved = editor.plan;
    for (const tag of ['input', 'textarea', 'select']) {
      assert.equal(
        pressArrow(editor, 'ArrowRight', { target: document.createElement(tag) }),
        false,
      );
    }
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    pressArrow(editor, 'ArrowRight', { target: editable });
    for (const options of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
      pressArrow(editor, 'ArrowRight', options);
    }
    editor.modal = 'wall';
    pressArrow(editor, 'ArrowRight');
    editor.modal = null;
    editor.help = true;
    pressArrow(editor, 'ArrowRight');
    editor.help = false;
    editor.pointerDown(pointer(first.x, first.y, first.id));
    pressArrow(editor, 'ArrowRight');
    editor.cancelInteraction();
    assert.equal(editor.plan, moved);
    editor.selectedId = original.walls[0].id;
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) pressArrow(editor, key);
    assert.equal(editor.plan, moved, 'walls never move via arrow keys');
  } finally {
    await cleanup();
  }
}
test(
  'arrow keys nudge furniture with undo and preserve walls, inputs and active interactions',
  nudgeFurnitureSelection,
);

/** Checks door constraints and dimension offset changes through the editor keyboard route. */
async function nudgeConstrainedSelection() {
  const { editor, cleanup } = await setup(null);
  try {
    const wall = { id: 'wall', a: { x: 100, y: 100 }, b: { x: 100, y: 0 }, thickness: 15 };
    const door = {
      id: 'door',
      wallId: wall.id,
      x: 100,
      y: 50,
      width: 40,
      angle: -90,
      side: 1,
      flip: false,
      thickness: 15,
    };
    const dimension = { id: 'dimension', a: { x: 0, y: 0 }, b: { x: 100, y: 0 }, offset: 20 };
    editor.plan = { ...editor.plan, walls: [wall], doors: [door], dimensions: [dimension] };
    const original = editor.plan;
    editor.selectedId = door.id;
    pressArrow(editor, 'ArrowUp');
    pressArrow(editor, 'ArrowDown');
    assert.equal(editor.plan, original);
    assert.equal(editor.canUndo, false);
    pressArrow(editor, 'ArrowRight');
    assert.equal(editor.plan.doors[0].y, 51);
    assert.equal(editor.plan.doors[0].angle, -90);
    editor.undo();
    assert.equal(editor.plan, original);
    editor.selectedId = door.id;
    for (let i = 0; i < 5; i++) pressArrow(editor, 'ArrowLeft', { shiftKey: true });
    assert.equal(editor.plan.doors[0].y, 20);
    const clamped = editor.plan;
    pressArrow(editor, 'ArrowLeft');
    assert.equal(editor.plan, clamped, 'blocked nudges do not commit');
    editor.undo();
    assert.equal(editor.plan.doors[0].y, 30, 'blocked nudges do not add undo entries');
    editor.selectedId = dimension.id;
    pressArrow(editor, 'ArrowDown');
    assert.equal(editor.plan.dimensions[0].offset, 21);
    assert.equal(editor.plan.dimensions[0].a, dimension.a);
    assert.equal(editor.plan.dimensions[0].b, dimension.b);
    const adjusted = editor.plan;
    pressArrow(editor, 'ArrowRight');
    assert.equal(editor.plan, adjusted);
  } finally {
    await cleanup();
  }
}
test(
  'door arrows slide only along their wall and dimension arrows preserve measured points',
  nudgeConstrainedSelection,
);

/** Dispatches real DOM pointer events to verify free hover and continued wall segments.
 * A small movement during the first click must not prematurely commit or remove the preview.
 */
async function drawWallWithLiveLength() {
  const { editor, cleanup } = await setup(null);
  const target = document.createElement('div');
  document.body.append(target);
  const component = mount(WallHarness, { target, props: { editor } });
  try {
    editor.chooseTool('wall');
    editor.acceptSetting();
    const original = editor.plan;
    const canvas = target.querySelector('svg');
    /** Dispatches a pointer event with explicit button state to the rendered wall canvas.
     * @param {string} type DOM event name.
     * @param {number} x Client-space horizontal coordinate.
     * @param {number} y Client-space vertical coordinate.
     * @param {number} buttons Bitmask of currently held buttons.
     */
    function sendPointer(type, x, y, buttons) {
      canvas.dispatchEvent(
        new browser.PointerEvent(type, {
          bubbles: true,
          clientX: x,
          clientY: y,
          button: 0,
          buttons,
          pointerId: 1,
        }),
      );
    }
    sendPointer('pointerdown', 100, 100, 1);
    sendPointer('pointermove', 110, 100, 1);
    sendPointer('pointerup', 110, 100, 0);
    flushSync();
    assert.equal(editor.plan, original);
    assert.deepEqual(editor.draft, [{ x: 100, y: 100 }]);
    assert.equal(editor.svg.hasPointerCapture(1), false);
    sendPointer('pointermove', 200, 100, 0);
    drawFrame();
    flushSync();
    assert.equal(editor.plan, original);
    assert.equal(editor.canUndo, false);
    assert.equal(target.querySelector('.wall-preview line').getAttribute('x2'), '200');
    assert.equal(target.querySelector('.wall-preview-length').textContent, '100 cm');
    editor.unit = 'm';
    flushSync();
    assert.equal(target.querySelector('.wall-preview-length').textContent, '1 m');
    sendPointer('pointerdown', 250, 100, 1);
    sendPointer('pointerup', 250, 100, 0);
    flushSync();
    assert.ok(target.querySelector('.wall-preview'));
    assert.deepEqual(editor.draft, [{ x: 250, y: 100 }]);
    assert.equal(editor.plan.walls.length, 1);
    assert.deepEqual(editor.plan.walls[0].a, { x: 100, y: 100 });
    assert.deepEqual(editor.plan.walls[0].b, { x: 250, y: 100 });
    sendPointer('pointermove', 250, 300, 0);
    drawFrame();
    flushSync();
    assert.equal(target.querySelector('.wall-preview-length').textContent, '2 m');
    sendPointer('pointerdown', 250, 300, 1);
    sendPointer('pointerup', 250, 300, 0);
    assert.equal(editor.plan.walls.length, 2);
    assert.deepEqual(editor.plan.walls[1].a, editor.plan.walls[0].b);
    assert.deepEqual(editor.draft, [{ x: 250, y: 300 }]);
    sendPointer('pointermove', 450, 300, 0);
    document.body.dispatchEvent(
      new browser.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    drawFrame();
    flushSync();
    assert.equal(target.querySelector('.wall-preview'), null);
    assert.equal(editor.plan.walls.length, 2, 'Enter discards the unfinished preview');
    assert.equal(editor.tool, 'wall');
    editor.undo();
    assert.equal(editor.plan.walls.length, 1);
    editor.undo();
    assert.equal(editor.plan, original);
    assert.equal(editor.canUndo, false);
  } finally {
    await unmount(component);
    target.remove();
    await cleanup();
  }
}
test(
  'wall clicks continue a connected path with live length until Enter finishes it',
  drawWallWithLiveLength,
);

/** Verifies closure onto the first segment and connections to an existing wall interior. */
async function connectWallPath() {
  const { editor, cleanup } = await setup(null);
  try {
    editor.chooseTool('wall');
    editor.acceptSetting();
    for (const [x, y] of [
      [100, 100],
      [300, 100],
      [300, 300],
      [100, 300],
      [100, 100],
    ]) {
      editor.pointerDown(pointer(x, y));
      editor.pointerUp(pointer(x, y));
    }
    assert.equal(editor.plan.walls.length, 4);
    assert.deepEqual(editor.draft, []);
    assert.deepEqual(editor.plan.walls[3].b, editor.plan.walls[0].a);
    editor.pointerDown(pointer(200, 200));
    editor.pointerUp(pointer(200, 200));
    editor.pointerMove(pointer(200, 105));
    drawFrame();
    assert.deepEqual(editor.pointer, { x: 200, y: 100 });
    assert.equal(editor.draft.length, 1, 'hovering a wall does not end the path');
    editor.pointerDown(pointer(200, 105));
    editor.pointerUp(pointer(200, 105));
    assert.equal(editor.plan.walls.length, 5);
    assert.deepEqual(editor.plan.walls[4].b, { x: 200, y: 100 });
    assert.deepEqual(editor.draft, []);
    editor.undo();
    assert.equal(editor.plan.walls.length, 4);
    editor.redo();
    assert.equal(editor.plan.walls.length, 5);
    editor.pointerDown(pointer(500, 500));
    editor.pointerUp(pointer(500, 500));
    editor.pointerDown(pointer(500, 500));
    assert.equal(editor.plan.walls.length, 5, 'duplicate clicks do not create zero-length walls');
    editor.keyDown({ key: 'Enter', target: document.createElement('input') });
    assert.equal(editor.draft.length, 1, 'typing in an input must not finish the path');
  } finally {
    await cleanup();
  }
}
test(
  'wall paths finish on loop closure or a clicked existing wall, with reversible segments',
  connectWallPath,
);

/** Checks axis locking and cancellation without adding walls or recording an undo step. */
async function cancelDrawingWall() {
  const { editor, cleanup } = await setup(null);
  try {
    editor.chooseTool('wall');
    editor.acceptSetting();
    const original = editor.plan;
    editor.pointerDown(pointer(100, 100));
    editor.pointerUp(pointer(100, 100));
    editor.pointerMove({ ...pointer(300, 140), shiftKey: true });
    drawFrame();
    assert.deepEqual(editor.pointer, { x: 300, y: 100 });
    editor.cancelInteraction();
    assert.equal(editor.plan, original);
    assert.deepEqual(editor.draft, []);
    assert.equal(editor.canUndo, false);
    editor.pointerUp(pointer(300, 140));
    assert.equal(editor.plan, original);
  } finally {
    await cleanup();
  }
}
test(
  'wall drawing supports Shift constraints and cancellation without committing',
  cancelDrawingWall,
);
