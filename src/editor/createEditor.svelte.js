import { TOOLS } from './tools.js';
import { createHistory } from './history.js';
import { indexEntities, commitDrag, nudgeEntity } from './entities.js';
import { createFrameScheduler } from '../lib/frameScheduler.js';
import { createKitchenIndex, snapIndexed } from '../lib/spatialIndex.js';
import { formatMeasure, fromDisplayUnit, toDisplayUnit } from '../lib/units.js';
import { validPlan } from '../lib/projectValidation.js';
import { readProject, writeProject } from '../services/projectStorage.js';
import { createAutosave } from '../services/autosave.js';
import { yieldToBrowser } from '../lib/yieldToBrowser.js';

import { onMount, tick, untrack } from 'svelte';
import { catalog } from '../lib/catalog.js';
import { createBlankPlan, removeLegacyDemo } from '../lib/blankPlan.js';
import {
  snap,
  distance,
  projectOnWall,
  doorPlacement,
  dimensionGeometry,
  furnitureBounds,
} from '../lib/geometry.js';

/** Creates the editor controller. Committed geometry is immutable; pointer previews and camera state are independent reactive signals.
 */
export function createEditor() {
  let plan = $state.raw(createBlankPlan());
  let unit = $state.raw('cm');
  let tool = $state.raw('select');
  let category = $state.raw('Kuhinja');
  let query = $state.raw('');
  let selectedId = $state.raw(null);
  let svg = $state.raw(undefined);
  let canvasHost = $state.raw(undefined);
  let fileInput = $state.raw(undefined);
  let zoom = $state.raw(0.8);
  let pan = $state.raw({ x: 90, y: 100 });
  let pointer = $state.raw({ x: 0, y: 0 });
  let rawPointer = $state.raw({ x: 0, y: 0 });
  let inside = $state.raw(false);
  let draft = $state.raw([]);
  let drag = $state.raw(null);
  let space = $state.raw(false);
  let wallThickness = $state.raw(15);
  let doorWidth = $state.raw(90);
  let pendingType = $state.raw(null);
  let canUndo = $state(false),
    canRedo = $state(false);
  const historyStore = createHistory();
  let ready = $state.raw(false);
  let saved = $state.raw(true);
  let canvasBounds = null;
  let wallConnection = null;
  let dragPreview = $state.raw(null);
  const wheelQueue = [];
  const movement = createFrameScheduler(processPointerMove);
  const wheelFrames = createFrameScheduler(processWheel);
  let showGrid = $state.raw(true);
  let snapping = $state.raw(true);
  let kitchenJoin = $state.raw(true);
  let kitchenBorders = $state.raw(false);
  let showDimensions = $state.raw(true);
  let showFurniture = $state.raw(true);
  let modal = $state.raw(null);
  let settingValue = $state.raw(15);
  let toast = $state.raw('');
  let toastTimer = $state.raw(undefined);
  let showInspector = $state.raw(true);
  let printRect = $state.raw(null);
  let printScale = $state.raw('fit');
  let printOrientation = $state.raw('landscape');
  let projectMenu = $state.raw(false);
  let help = $state.raw(false);
  let layerVisible = $state.raw({ walls: true, doors: true });
  const tools = TOOLS;
  let entityIndex = $derived(indexEntities(plan));
  let kitchenIndex = $derived(createKitchenIndex(plan.furniture));
  let selected = $derived(selectEntity(entityIndex, selectedId));
  let filtered = $derived(
    catalog.filter(
      /** Filters catalog entries by search text or the selected category.
       * @param {any} i Input for this operation.
       */
      (i) =>
        query
          ? i.name.toLocaleLowerCase('sr').includes(query.toLocaleLowerCase('sr'))
          : i.category === category,
    ),
  );
  let doorGhost = $derived(
    tool === 'door' && inside ? doorPlacement(rawPointer, plan.walls, doorWidth) : null,
  );
  let furnitureGhost = $derived(pendingType && inside ? makeFurnitureGhost() : null);
  let previewDimension = $derived(
    tool === 'dimension' && draft.length === 2
      ? { a: draft[0], b: draft[1], offset: offsetFor(draft[0], draft[1], pointer) }
      : null,
  );
  let hint = $derived(
    space || tool === 'pan'
      ? 'Prevuci da pomeriš platno'
      : tool === 'wall'
        ? draft.length
          ? 'Klikni za sledeći segment · Enter ili spoj sa zidom završava niz · Esc otkaži'
          : 'Klikni početak zida · Nastavi povezanim klikovima · Enter završava niz'
        : tool === 'door'
          ? 'Pomeri miš sa obe strane zida za smer otvaranja · klikni za postavljanje'
          : tool === 'dimension'
            ? draft.length === 0
              ? 'Klikni početnu tačku kote'
              : draft.length === 1
                ? 'Klikni krajnju tačku kote'
                : 'Pomeri kotu na željenu stranu i klikni'
            : tool === 'print'
              ? 'Prevuci pravougaonik preko dela plana za A4 štampu'
              : pendingType
                ? 'Klikni za postavljanje · R rotiraj · Esc završi'
                : 'Izaberi element za uređivanje · Space + prevlačenje pomera platno',
  );

  $effect(
    /** Queues only committed state; persistence reads are kept outside the reactive dependency graph.
     */
    () => {
      if (ready) {
        const snapshot = { plan, unit, kitchenBorders, kitchenJoin, starterContentVersion: 1 };
        untrack(
          /** Queues only committed state; persistence reads are kept outside the reactive dependency graph.
           */
          () => autosave.schedule(snapshot),
        );
      }
    },
  );

  const autosave = createAutosave({
    write: writeProject,
    onPending: markPending,
    onSaved: markSaved,
    onError: saveFailed,
  });
  /** Marks the latest committed revision as waiting for local persistence.
   */
  function markPending() {
    saved = false;
  }
  /** Marks the latest revision saved only after its IndexedDB transaction completes.
   */
  function markSaved() {
    saved = true;
  }
  /** Keeps the unsaved indicator visible and offers a portable backup after a storage error.
   */
  function saveFailed() {
    saved = false;
    notify('Čuvanje nije uspelo. Preuzmi projekat kao rezervnu kopiju.');
  }
  /** Updates reactive undo/redo availability after a history operation.
   */
  function syncHistory() {
    canUndo = historyStore.canUndo();
    canRedo = historyStore.canRedo();
  }
  /** Copies only the selected indexed entity and adds its editing kind; does not clone other collections.
   * @param {any} index Precomputed entity lookup.
   * @param {any} id Tool or entity identifier.
   */
  function selectEntity(index, id) {
    const entry = index.get(id);
    return entry ? { ...entry.item, kind: entry.kind } : null;
  }
  /** Builds a centered placement preview and snaps against nearby indexed kitchen neighbors.
   */
  function makeFurnitureGhost() {
    return snapIndexed(
      {
        ...pendingType,
        x: pointer.x - pendingType.w / 2,
        y: pointer.y - pendingType.h / 2,
        rotation: pendingType.rotation || 0,
      },
      kitchenIndex,
      kitchenJoin,
    );
  }
  /** Converts one screen coordinate to world space, then applies grid and axis constraints.
   * @param {Event|object} event Input event or timing sample.
   */
  function updatePointer(event) {
    rawPointer = world(event);
    const p = snapping ? { x: snap(rawPointer.x), y: snap(rawPointer.y) } : rawPointer;
    const constrained = wallPoint(p, event);
    wallConnection = tool === 'wall' ? findWallConnection(constrained) : null;
    pointer = wallConnection ?? constrained;
  }
  /** Updates only transient drag geometry or the camera. Committed plan, history and persistence remain untouched until pointer-up.
   * @param {Event|object} event Input event or timing sample.
   */
  function processPointerMove(event) {
    updatePointer(event);
    inside = true;
    if (!drag) return;
    if (drag.kind === 'pan') {
      pan = { x: drag.pan.x + event.clientX - drag.x, y: drag.pan.y + event.clientY - drag.y };
      return;
    }
    if (drag.kind === 'print') {
      printRect = {
        x: Math.min(drag.start.x, pointer.x),
        y: Math.min(drag.start.y, pointer.y),
        w: Math.abs(pointer.x - drag.start.x),
        h: Math.abs(pointer.y - drag.start.y),
      };
      return;
    }
    const dx = pointer.x - drag.start.x,
      dy = pointer.y - drag.start.y,
      o = drag.original;
    if (!dx && !dy) {
      dragPreview = null;
      return;
    }
    if (drag.kind === 'furniture')
      dragPreview = snapIndexed({ ...o, x: o.x + dx, y: o.y + dy }, kitchenIndex, kitchenJoin);
    if (drag.kind === 'wall')
      dragPreview = {
        ...o,
        a: { x: o.a.x + dx, y: o.a.y + dy },
        b: { x: o.b.x + dx, y: o.b.y + dy },
      };
    if (drag.kind === 'door') {
      const placement = doorPlacement(rawPointer, plan.walls, o.width);
      if (placement) dragPreview = { ...placement, id: o.id };
    }
    if (drag.kind === 'dimension') dragPreview = { ...o, offset: offsetFor(o.a, o.b, pointer) };
  }
  /** Applies queued wheel deltas in order once per animation frame, preserving pan/zoom anchor semantics.
   */
  function processWheel() {
    for (const event of wheelQueue) {
      if (event.zooming) zoomAt(zoom * Math.exp(-event.dy * 0.008), event.clientX, event.clientY);
      else
        pan = {
          x: pan.x - (event.shiftKey ? event.dy : event.dx),
          y: pan.y - (event.shiftKey ? 0 : event.dy),
        };
    }
    wheelQueue.length = 0;
  }
  /** Cancels pending frame work, releases pointer capture and discards transient geometry without committing a document edit.
   */
  function cancelInteraction() {
    movement.cancel();
    wheelFrames.cancel();
    wheelQueue.length = 0;
    const pointerId = drag?.pointerId;
    if (pointerId !== undefined && svg?.hasPointerCapture(pointerId))
      svg.releasePointerCapture(pointerId);
    if (drag?.kind === 'print') printRect = null;
    if (tool === 'wall') draft = [];
    drag = null;
    dragPreview = null;
    space = false;
  }
  /** Clears hover previews and invalidates cached bounds when the pointer leaves without an active captured drag.
   */
  function pointerLeave() {
    if (drag) return;
    movement.cancel();
    inside = false;
    canvasBounds = null;
  }
  /** Releases the temporary Space-to-pan mode.
   * @param {Event|object} event Input event or timing sample.
   */
  function keyUp(event) {
    if (event.code === 'Space') space = false;
  }
  /** Closes the active modal/help panel and returns to the selection tool.
   */
  function closeDialog() {
    modal = null;
    help = false;
    printRect = null;
    tool = 'select';
  }
  /** Invalidates the cached SVG client rectangle after layout or viewport changes.
   */
  function invalidateBounds() {
    canvasBounds = null;
  }
  /** Requests a final asynchronous save when the document becomes hidden.
   */
  function flushOnHide() {
    if (document.visibilityState === 'hidden') void autosave.flush();
  }
  /** Restores a validated local project without overwriting edits made during loading and registers lifecycle cleanup.
   */
  function mountEditor() {
    showInspector = window.innerWidth > 900;
    let disposed = false;
    const initialPlan = plan,
      initialUnit = unit;
    void restore();
    const frame = requestAnimationFrame(fit);
    const resize = new ResizeObserver(invalidateBounds);
    resize.observe(canvasHost);
    window.addEventListener('scroll', invalidateBounds, true);
    window.addEventListener('resize', invalidateBounds);
    window.addEventListener('pagehide', autosave.flush);
    document.addEventListener('visibilitychange', flushOnHide);
    /** Reads the local snapshot asynchronously and restores it only if the initial document has not been edited.
     */
    async function restore() {
      try {
        const data = await readProject();
        if (disposed) return;
        if (data && validPlan(data.plan) && plan === initialPlan && unit === initialUnit && !drag) {
          plan = data.starterContentVersion === 1 ? data.plan : removeLegacyDemo(data.plan);
          unit = data.unit === 'm' ? 'm' : 'cm';
          kitchenBorders = data.kitchenBorders ?? false;
          kitchenJoin = data.kitchenJoin ?? true;
          await tick();
          fit();
        }
      } catch {
        if (!disposed) notify('Sačuvani projekat nije dostupan. Možeš učitati JSON kopiju.');
      } finally {
        if (!disposed) ready = true;
      }
    }
    return cleanup;
    /** Removes observers/listeners, cancels transient work and flushes queued persistence when the editor unmounts.
     */
    function cleanup() {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      cancelInteraction();
      autosave.dispose();
      clearTimeout(toastTimer);
      window.removeEventListener('scroll', invalidateBounds, true);
      window.removeEventListener('resize', invalidateBounds);
      window.removeEventListener('pagehide', autosave.flush);
      document.removeEventListener('visibilitychange', flushOnHide);
    }
  }

  const uid =
    /** Creates a unique identifier for a newly committed entity.
     */
    () => crypto.randomUUID();

  /** Formats a centimeter value using the current display unit and cached locale formatter.
   * @param {any} value Value to apply or convert.
   * @param {any} suffix Whether to append the display unit.
   */
  function format(value, suffix = true) {
    return formatMeasure(value, unit, suffix);
  }
  /** Converts the current UI unit into canonical centimeters.
   * @param {any} value Value to apply or convert.
   */
  function fromUnit(value) {
    return fromDisplayUnit(value, unit);
  }
  /** Converts canonical centimeters into an editable UI value.
   * @param {any} value Value to apply or convert.
   */
  function toUnit(value) {
    return toDisplayUnit(value, unit);
  }
  /** Shows a temporary non-blocking status message, replacing the previous dismissal timer.
   * @param {any} message User-facing status message.
   */
  function notify(message) {
    toast = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(
      /** Clears the previous status message when its dismissal timer expires.
       */
      () => (toast = ''),
      3500,
    );
  }

  /** Records the current immutable document before one committed edit and refreshes undo/redo controls.
   */
  function remember() {
    historyStore.record(plan);
    syncHistory();
  }
  /** Discards any active preview and restores the previous document reference.
   */
  function undo() {
    cancelInteraction();
    plan = historyStore.undo(plan);
    syncHistory();
    selectedId = null;
    draft = [];
  }
  /** Discards any active preview and restores the next document reference.
   */
  function redo() {
    cancelInteraction();
    plan = historyStore.redo(plan);
    syncHistory();
    selectedId = null;
    draft = [];
  }
  /** Cancels the current interaction, selects a tool and opens dimension settings when required.
   * @param {any} id Tool or entity identifier.
   */
  function chooseTool(id) {
    cancelInteraction();
    draft = [];
    pendingType = null;
    selectedId = null;
    tool = id;
    if (id === 'wall' || id === 'door') {
      settingValue = toUnit(id === 'wall' ? wallThickness : doorWidth);
      modal = id;
    }
    if (id === 'furniture') category = category || 'Kuhinja';
  }
  /** Validates the requested wall thickness or door width in centimeters before closing the tool dialog.
   */
  function acceptSetting() {
    const value = fromUnit(settingValue);
    if (!Number.isFinite(value) || value < 1 || value > (modal === 'wall' ? 100 : 400)) {
      notify('Unesi vrednost od 1 do ' + (modal === 'wall' ? '100' : '400') + ' cm.');
      return;
    }
    if (modal === 'wall') wallThickness = value;
    else doorWidth = value;
    modal = null;
  }
  /** Starts repeated placement of a fresh catalog instance after cancelling the prior interaction.
   * @param {any} item Furniture/entity data.
   */
  function pickFurniture(item) {
    cancelInteraction();
    tool = 'furniture';
    draft = [];
    selectedId = null;
    pendingType = { ...item, rotation: 0 };
  }
  /** Maps client coordinates to centimeter coordinates using a cached canvas rectangle and the current camera.
   * @param {Event|object} event Input event or timing sample.
   */
  function world(event) {
    const r = canvasBounds || (canvasBounds = svg.getBoundingClientRect());
    return {
      x: (event.clientX - r.left - pan.x) / zoom,
      y: (event.clientY - r.top - pan.y) / zoom,
    };
  }
  /** Converts client coordinates and optionally snaps to the world grid.
   * @param {Event|object} event Input event or timing sample.
   */
  function point(event) {
    const p = world(event);
    return snapping ? { x: snap(p.x), y: snap(p.y) } : p;
  }
  /** Constrains a wall preview to the dominant axis when Shift is held.
   * @param {any} p World-space point.
   * @param {Event|object} event Input event or timing sample.
   */
  function wallPoint(p, event) {
    if (event.shiftKey && draft.length) {
      const a = draft[0];
      return Math.abs(p.x - a.x) > Math.abs(p.y - a.y) ? { x: p.x, y: a.y } : { x: a.x, y: p.y };
    }
    return p;
  }
  /** Finds the nearest visible wall connection, preferring nearby endpoints for exact closure.
   * Ignores the active start point so a newly committed segment can continue freely.
   * Runs once per pointer frame with cheap bounds rejection before segment projection.
   * @param {{x: number, y: number}} p Constrained world-space cursor position.
   * @returns {{x: number, y: number}|null} Connection on an existing wall, or null.
   */
  function findWallConnection(p) {
    if (!layerVisible.walls) return null;
    let best = null;
    let bestDistance = Infinity;
    const endpointTolerance = 8 / zoom;
    for (const wall of plan.walls) {
      const tolerance = Math.max(endpointTolerance, wall.thickness / 2);
      if (
        p.x < Math.min(wall.a.x, wall.b.x) - tolerance ||
        p.x > Math.max(wall.a.x, wall.b.x) + tolerance ||
        p.y < Math.min(wall.a.y, wall.b.y) - tolerance ||
        p.y > Math.max(wall.a.y, wall.b.y) + tolerance
      )
        continue;
      const hit = projectOnWall(p, wall);
      if (hit.distance > tolerance) continue;
      let connection = hit.point;
      for (const endpoint of [wall.a, wall.b]) {
        if (distance(p, endpoint) <= endpointTolerance) {
          connection = endpoint;
          break;
        }
      }
      if (draft.length && distance(draft[0], connection) < 5) continue;
      const gap = distance(p, connection);
      if (gap < bestDistance) {
        best = connection;
        bestDistance = gap;
      }
    }
    return best;
  }
  /** Computes signed perpendicular distance from a point to a dimension baseline.
   * @param {any} a First world-space endpoint.
   * @param {any} b Second world-space endpoint.
   * @param {any} p World-space point.
   */
  function offsetFor(a, b, p) {
    const len = distance(a, b) || 1;
    return (p.x - a.x) * (-(b.y - a.y) / len) + (p.y - a.y) * ((b.x - a.x) / len);
  }
  /** Starts a captured gesture or commits a click-based tool using the actual click coordinate, independent of hover-frame timing.
   * @param {Event|object} event Input event or timing sample.
   */
  function pointerDown(event) {
    if (event.button !== 0 && event.button !== 1) return;
    movement.cancel();
    canvasBounds = svg.getBoundingClientRect();
    updatePointer(event);
    inside = true;
    if (tool !== 'wall' || space || event.button === 1) svg.setPointerCapture(event.pointerId);
    if (space || tool === 'pan' || event.button === 1) {
      drag = {
        kind: 'pan',
        x: event.clientX,
        y: event.clientY,
        pan: { ...pan },
        pointerId: event.pointerId,
      };
      return;
    }
    if (tool === 'wall') {
      const p = pointer;
      if (!draft.length) draft = [p];
      else if (distance(draft[0], p) >= 5) {
        remember();
        plan = {
          ...plan,
          walls: [...plan.walls, { id: uid(), a: draft[0], b: p, thickness: wallThickness }],
        };
        draft = wallConnection ? [] : [p];
      }
      return;
    }
    if (tool === 'door') {
      const placement = doorPlacement(rawPointer, plan.walls, doorWidth);
      if (placement) {
        remember();
        plan = { ...plan, doors: [...plan.doors, { ...placement, id: uid() }] };
      } else notify('Postavi vrata uz zid koji je dovoljno dug.');
      return;
    }
    if (tool === 'dimension') {
      if (draft.length < 2) {
        if (draft.length && distance(draft[0], pointer) < 1) return;
        draft = [...draft, { ...pointer }];
      } else {
        remember();
        plan = {
          ...plan,
          dimensions: [
            ...plan.dimensions,
            { a: draft[0], b: draft[1], offset: offsetFor(draft[0], draft[1], pointer), id: uid() },
          ],
        };
        draft = [];
      }
      return;
    }
    if (tool === 'print') {
      drag = { kind: 'print', start: { ...pointer }, pointerId: event.pointerId };
      printRect = { x: pointer.x, y: pointer.y, w: 0, h: 0 };
      return;
    }
    if (pendingType) {
      const item = { ...makeFurnitureGhost(), id: uid() };
      remember();
      plan = { ...plan, furniture: [...plan.furniture, item] };
      selectedId = item.id;
      return;
    }
    selectedId = event.target.closest('[data-id]')?.getAttribute('data-id') || null;
    const entity = entityIndex.get(selectedId);
    if (entity)
      drag = {
        kind: entity.kind,
        id: entity.item.id,
        start: { ...pointer },
        original: entity.item,
        pointerId: event.pointerId,
      };
  }
  /** Queues only the newest pointer sample for the next frame; does not perform document mutations.
   * @param {Event|object} event Input event or timing sample.
   */
  function pointerMove(event) {
    movement.push({ clientX: event.clientX, clientY: event.clientY, shiftKey: event.shiftKey });
  }
  /** Completes captured drags while keeping click-to-click wall previews active on button release.
   * Walls commit only on the second pointer-down, never on pointer-up.
   * @param {Event|object} event Input event or timing sample.
   */
  function pointerUp(event) {
    if (drag) {
      movement.push({ clientX: event.clientX, clientY: event.clientY, shiftKey: event.shiftKey });
      movement.flush();
    } else if (tool === 'wall' && draft.length) {
      movement.push({ clientX: event.clientX, clientY: event.clientY, shiftKey: event.shiftKey });
      movement.flush();
    } else movement.cancel();
    if (drag?.kind === 'print') {
      if (printRect.w > 10 && printRect.h > 10) modal = 'print';
      else {
        printRect = null;
        notify('Izaberi veću površinu za štampu.');
      }
    } else if (dragPreview && drag) {
      remember();
      plan = commitDrag(plan, drag.kind, drag.original, dragPreview);
    }
    drag = null;
    dragPreview = null;
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
  }
  /** Prevents page scrolling, normalizes wheel units and queues camera work for the next animation frame.
   * @param {Event|object} event Input event or timing sample.
   */
  function wheel(event) {
    event.preventDefault();
    const r = canvasBounds || (canvasBounds = svg.getBoundingClientRect());
    const factor = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? r.height : 1;
    wheelQueue.push({
      dx: event.deltaX * factor,
      dy: event.deltaY * factor,
      shiftKey: event.shiftKey,
      zooming: event.ctrlKey || event.metaKey,
      clientX: event.clientX,
      clientY: event.clientY,
    });
    wheelFrames.push(true);
  }
  /** Changes zoom around a fixed client-space anchor while clamping the supported zoom range.
   * @param {any} next Requested camera zoom or next value.
   * @param {any} clientX Client-space horizontal coordinate.
   * @param {any} clientY Client-space vertical coordinate.
   */
  function zoomAt(next, clientX, clientY) {
    const r = svg.getBoundingClientRect();
    const x = clientX === undefined ? r.width / 2 : clientX - r.left,
      y = clientY === undefined ? r.height / 2 : clientY - r.top;
    next = Math.max(0.15, Math.min(4, next));
    pan = { x: x - ((x - pan.x) * next) / zoom, y: y - ((y - pan.y) * next) / zoom };
    zoom = next;
  }
  /** Fits all committed geometry and dimensions into the canvas with padding.
   */
  function fit() {
    if (!svg) return;
    const points = [
      ...plan.walls.flatMap(
        /** Collects wall endpoints for fitting the camera.
         * @param {any} w Input for this operation.
         */
        (w) => [w.a, w.b],
      ),
      ...plan.furniture.flatMap(
        /** Collects rotated furniture extents for fitting the camera.
         * @param {any} f Input for this operation.
         */
        (f) => {
          const b = furnitureBounds(f);
          return [
            { x: b.x, y: b.y },
            { x: b.x + b.w, y: b.y + b.h },
          ];
        },
      ),
      ...plan.dimensions.flatMap(
        /** Collects offset dimension endpoints for fitting the camera.
         * @param {any} d Dimension or door geometry.
         */
        (d) => {
          const g = dimensionGeometry(d);
          return [g.p, g.q];
        },
      ),
    ];
    if (!points.length) {
      zoom = 0.8;
      pan = { x: 120, y: 120 };
      return;
    }
    const minX =
        Math.min(
          ...points.map(
            /** Selects the horizontal coordinate for computing camera bounds.
             * @param {any} p World-space point.
             */
            (p) => p.x,
          ),
        ) - 65,
      minY =
        Math.min(
          ...points.map(
            /** Selects the vertical coordinate for computing camera bounds.
             * @param {any} p World-space point.
             */
            (p) => p.y,
          ),
        ) - 100;
    const maxX =
        Math.max(
          ...points.map(
            /** Selects the horizontal coordinate for computing camera bounds.
             * @param {any} p World-space point.
             */
            (p) => p.x,
          ),
        ) + 65,
      maxY =
        Math.max(
          ...points.map(
            /** Selects the vertical coordinate for computing camera bounds.
             * @param {any} p World-space point.
             */
            (p) => p.y,
          ),
        ) + 90;
    const r = svg.getBoundingClientRect();
    zoom = Math.max(0.15, Math.min(1.3, r.width / (maxX - minX), r.height / (maxY - minY)));
    pan = {
      x: (r.width - (maxX - minX) * zoom) / 2 - minX * zoom,
      y: (r.height - (maxY - minY) * zoom) / 2 - minY * zoom,
    };
  }
  /** Deletes the selected entity and dependent doors as one reversible document edit.
   */
  function removeSelected() {
    if (!selectedId) return;
    cancelInteraction();
    remember();
    plan = {
      ...plan,
      walls: plan.walls.filter(
        /** Retains entities other than the selected deletion target.
         * @param {any} i Input for this operation.
         */
        (i) => i.id !== selectedId,
      ),
      doors: plan.doors.filter(
        /** Retains doors that are neither selected nor attached to the deleted wall.
         * @param {any} i Input for this operation.
         */
        (i) => i.id !== selectedId && i.wallId !== selectedId,
      ),
      furniture: plan.furniture.filter(
        /** Retains entities other than the selected deletion target.
         * @param {any} i Input for this operation.
         */
        (i) => i.id !== selectedId,
      ),
      dimensions: plan.dimensions.filter(
        /** Retains entities other than the selected deletion target.
         * @param {any} i Input for this operation.
         */
        (i) => i.id !== selectedId,
      ),
    };
    selectedId = null;
  }
  /** Rotates a furniture preview/selection or flips the selected door hinge.
   */
  function rotate() {
    if (pendingType) {
      pendingType = { ...pendingType, rotation: (pendingType.rotation + 90) % 360 };
      return;
    }
    if (selected?.kind === 'furniture') updateSelected('rotation', (selected.rotation + 90) % 360);
    if (selected?.kind === 'door') updateSelected('flip', !selected.flip);
  }
  /** Validates a property change and commits it immutably, keeping wall thickness synchronized with attached doors.
   * @param {any} key Property name or input key.
   * @param {any} value Value to apply or convert.
   */
  function updateSelected(key, value) {
    if (!selected) return;
    if (typeof value === 'number' && !Number.isFinite(value)) return;
    if (['w', 'h', 'width', 'thickness'].includes(key) && value <= 0) return;
    if (selected.kind === 'door' && key === 'width') {
      const wall = plan.walls.find(
        /** Finds the wall that owns the selected door.
         * @param {any} w Input for this operation.
         */
        (w) => w.id === selected.wallId,
      );
      if (!wall || value > distance(wall.a, wall.b)) {
        notify('Vrata ne mogu biti šira od zida.');
        return;
      }
    }
    remember();
    const collection = {
      furniture: 'furniture',
      wall: 'walls',
      door: 'doors',
      dimension: 'dimensions',
    }[selected.kind];
    plan = {
      ...plan,
      [collection]: plan[collection].map(
        /** Replaces only the selected entity, preserving all other references.
         * @param {any} i Input for this operation.
         */
        (i) => (i.id === selectedId ? { ...i, [key]: value } : i),
      ),
    };
    if (selected.kind === 'wall' && key === 'thickness')
      plan = {
        ...plan,
        doors: plan.doors.map(
          /** Synchronizes door thickness with the edited wall.
           * @param {any} d Dimension or door geometry.
           */
          (d) => (d.wallId === selectedId ? { ...d, thickness: value } : d),
        ),
      };
  }
  /** Copies a selected furniture entity to an offset position with a new ID and one history entry.
   */
  function duplicate() {
    if (selected?.kind !== 'furniture') return;
    remember();
    const { kind, ...item } = selected;
    const next = { ...item, id: uid(), x: item.x + 25, y: item.y + 25 };
    plan = { ...plan, furniture: [...plan.furniture, next] };
    selectedId = next.id;
  }
  /** Moves an eligible selection by one centimeter, or ten with Shift, as one undoable edit.
   * Keyboard precision moves intentionally bypass grid and kitchen snapping.
   * @param {KeyboardEvent} event Arrow-key event outside editable controls and dialogs.
   */
  function nudgeSelected(event) {
    if (tool !== 'select' || drag || space || pendingType || !selectedId || event.altKey) return;
    const entry = entityIndex.get(selectedId);
    if (!entry) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
    const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
    const preview = nudgeEntity(
      entry.kind,
      entry.item,
      dx,
      dy,
      entityIndex.get(entry.item.wallId)?.item,
    );
    if (preview === entry.item) return;
    remember();
    plan = commitDrag(plan, entry.kind, entry.item, preview);
  }
  /** Routes editor shortcuts while protecting text input, dialog focus and native button keyboard activation.
   * @param {Event|object} e Input event.
   */
  function keyDown(e) {
    if (help) {
      if (e.key === 'Escape') help = false;
      return;
    }
    if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
      help = true;
      return;
    }
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable)
      return;
    if (modal) {
      if (e.key === 'Escape') {
        modal = null;
        tool = 'select';
        printRect = null;
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
      return;
    }
    if (e.ctrlKey || e.metaKey) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      nudgeSelected(e);
      return;
    }
    if (e.key === 'Enter' && tool === 'wall' && draft.length) {
      e.preventDefault();
      cancelInteraction();
      return;
    }
    if (e.code === 'Space') {
      if (['BUTTON', 'A'].includes(e.target.tagName)) return;
      e.preventDefault();
      space = true;
      return;
    }
    if (e.key === 'Escape') {
      cancelInteraction();
      draft = [];
      pendingType = null;
      selectedId = null;
      printRect = null;
      tool = 'select';
      help = false;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      removeSelected();
    }
    if (e.key.toLowerCase() === 'r') rotate();
    if (e.key === '0') fit();
  }
  /** Yields to a paint opportunity, lazily loads file export and reports the portable download outcome.
   */
  async function exportPlan() {
    projectMenu = false;
    notify('Pripremam projekat za preuzimanje…');
    await yieldToBrowser();
    const { downloadProject } = await import('../services/projectFiles.js');
    try {
      await downloadProject(plan, unit);
      notify('Projekat je preuzet.');
    } catch {
      notify('Preuzimanje nije uspelo. Pokušaj ponovo.');
    }
  }

  /** Yields before parsing a bounded project file and replaces the document only after validation succeeds.
   * @param {Event|object} event Input event or timing sample.
   */
  async function importPlan(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    notify('Učitavanje projekta…');
    await yieldToBrowser();
    try {
      const { readProjectFile } = await import('../services/projectFiles.js');
      const data = await readProjectFile(file);
      cancelInteraction();
      remember();
      plan = data.plan;
      unit = data.unit;
      selectedId = null;
      draft = [];
      pendingType = null;
      tool = 'select';
      await tick();
      fit();
      notify('Projekat je učitan.');
    } catch {
      notify('Fajl nije ispravan Forma projekat.');
    }
    event.target.value = '';
    projectMenu = false;
  }
  /** Creates an empty reversible document, resets transient state and starts the wall tool.
   */
  async function newPlan() {
    cancelInteraction();
    remember();
    plan = createBlankPlan('Novi prostor');
    selectedId = null;
    draft = [];
    modal = null;
    projectMenu = false;
    await tick();
    fit();
    chooseTool('wall');
  }
  /** Yields before loading A4 preparation and preserves the selection if the requested scale does not fit.
   */
  async function printPlan() {
    notify('Pripremam plan za štampu…');
    await yieldToBrowser();
    const { printSelection } = await import('../services/printPlan.js');
    if (await printSelection({ plan, unit, printRect, printScale, printOrientation, notify })) {
      modal = null;
      tool = 'select';
      printRect = null;
    }
  }

  onMount(mountEditor);

  return {
    closeDialog,
    keyUp,
    cancelInteraction,
    pointerLeave,
    /** Reads the reactive plan field without copying the document.
     */

    get plan() {
      return plan;
    },
    /** Updates the plan field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set plan(value) {
      plan = value;
    },
    /** Reads the reactive unit field without copying the document.
     */
    get unit() {
      return unit;
    },
    /** Updates the unit field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set unit(value) {
      unit = value;
    },
    /** Reads the reactive tool field without copying the document.
     */
    get tool() {
      return tool;
    },
    /** Updates the tool field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set tool(value) {
      tool = value;
    },
    /** Reads the reactive category field without copying the document.
     */
    get category() {
      return category;
    },
    /** Updates the category field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set category(value) {
      category = value;
    },
    /** Reads the reactive query field without copying the document.
     */
    get query() {
      return query;
    },
    /** Updates the query field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set query(value) {
      query = value;
    },
    /** Reads the reactive selectedId field without copying the document.
     */
    get selectedId() {
      return selectedId;
    },
    /** Updates the selectedId field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set selectedId(value) {
      selectedId = value;
    },
    /** Reads the reactive svg field without copying the document.
     */
    get svg() {
      return svg;
    },
    /** Updates the svg field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set svg(value) {
      svg = value;
    },
    /** Reads the reactive canvasHost field without copying the document.
     */
    get canvasHost() {
      return canvasHost;
    },
    /** Updates the canvasHost field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set canvasHost(value) {
      canvasHost = value;
    },
    /** Reads the reactive fileInput field without copying the document.
     */
    get fileInput() {
      return fileInput;
    },
    /** Updates the fileInput field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set fileInput(value) {
      fileInput = value;
    },
    /** Reads the reactive zoom field without copying the document.
     */
    get zoom() {
      return zoom;
    },
    /** Updates the zoom field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set zoom(value) {
      zoom = value;
    },
    /** Reads the reactive pan field without copying the document.
     */
    get pan() {
      return pan;
    },
    /** Updates the pan field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set pan(value) {
      pan = value;
    },
    /** Builds a pointer event fixture targeting a chosen entity ID.
     */
    get pointer() {
      return pointer;
    },
    /** Builds a pointer event fixture targeting a chosen entity ID.
     * @param {any} value Value to apply or convert.
     */

    set pointer(value) {
      pointer = value;
    },
    /** Reads the reactive rawPointer field without copying the document.
     */
    get rawPointer() {
      return rawPointer;
    },
    /** Updates the rawPointer field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set rawPointer(value) {
      rawPointer = value;
    },
    /** Reads the reactive inside field without copying the document.
     */
    get inside() {
      return inside;
    },
    /** Updates the inside field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set inside(value) {
      inside = value;
    },
    /** Reads the reactive draft field without copying the document.
     */
    get draft() {
      return draft;
    },
    /** Updates the draft field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set draft(value) {
      draft = value;
    },
    /** Reads the reactive drag field without copying the document.
     */
    get drag() {
      return drag;
    },
    /** Updates the drag field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set drag(value) {
      drag = value;
    },
    /** Reads the reactive space field without copying the document.
     */
    get space() {
      return space;
    },
    /** Updates the space field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set space(value) {
      space = value;
    },
    /** Reads the reactive wallThickness field without copying the document.
     */
    get wallThickness() {
      return wallThickness;
    },
    /** Updates the wallThickness field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set wallThickness(value) {
      wallThickness = value;
    },
    /** Reads the reactive doorWidth field without copying the document.
     */
    get doorWidth() {
      return doorWidth;
    },
    /** Updates the doorWidth field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set doorWidth(value) {
      doorWidth = value;
    },
    /** Reads the reactive pendingType field without copying the document.
     */
    get pendingType() {
      return pendingType;
    },
    /** Updates the pendingType field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set pendingType(value) {
      pendingType = value;
    },
    /** Reads the reactive canUndo field without copying the document.
     */
    get canUndo() {
      return canUndo;
    },
    /** Reads the reactive canRedo field without copying the document.
     */
    get canRedo() {
      return canRedo;
    },
    /** Reads the reactive ready field without copying the document.
     */
    get ready() {
      return ready;
    },
    /** Updates the ready field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set ready(value) {
      ready = value;
    },
    /** Reads the reactive saved field without copying the document.
     */
    get saved() {
      return saved;
    },
    /** Updates the saved field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set saved(value) {
      saved = value;
    },
    /** Reads the reactive dragPreview field without copying the document.
     */
    get dragPreview() {
      return dragPreview;
    },
    /** Reads the reactive showGrid field without copying the document.
     */
    get showGrid() {
      return showGrid;
    },
    /** Updates the showGrid field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set showGrid(value) {
      showGrid = value;
    },
    /** Reads the reactive snapping field without copying the document.
     */
    get snapping() {
      return snapping;
    },
    /** Updates the snapping field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set snapping(value) {
      snapping = value;
    },
    /** Reads the reactive kitchenJoin field without copying the document.
     */
    get kitchenJoin() {
      return kitchenJoin;
    },
    /** Updates the kitchenJoin field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set kitchenJoin(value) {
      kitchenJoin = value;
    },
    /** Reads the reactive kitchenBorders field without copying the document.
     */
    get kitchenBorders() {
      return kitchenBorders;
    },
    /** Updates the kitchenBorders field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set kitchenBorders(value) {
      kitchenBorders = value;
    },
    /** Reads the reactive showDimensions field without copying the document.
     */
    get showDimensions() {
      return showDimensions;
    },
    /** Updates the showDimensions field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set showDimensions(value) {
      showDimensions = value;
    },
    /** Reads the reactive showFurniture field without copying the document.
     */
    get showFurniture() {
      return showFurniture;
    },
    /** Updates the showFurniture field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set showFurniture(value) {
      showFurniture = value;
    },
    /** Reads the reactive modal field without copying the document.
     */
    get modal() {
      return modal;
    },
    /** Updates the modal field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set modal(value) {
      modal = value;
    },
    /** Reads the reactive settingValue field without copying the document.
     */
    get settingValue() {
      return settingValue;
    },
    /** Updates the settingValue field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set settingValue(value) {
      settingValue = value;
    },
    /** Reads the reactive toast field without copying the document.
     */
    get toast() {
      return toast;
    },
    /** Updates the toast field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set toast(value) {
      toast = value;
    },
    /** Reads the reactive toastTimer field without copying the document.
     */
    get toastTimer() {
      return toastTimer;
    },
    /** Updates the toastTimer field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set toastTimer(value) {
      toastTimer = value;
    },
    /** Reads the reactive showInspector field without copying the document.
     */
    get showInspector() {
      return showInspector;
    },
    /** Updates the showInspector field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set showInspector(value) {
      showInspector = value;
    },
    /** Reads the reactive printRect field without copying the document.
     */
    get printRect() {
      return printRect;
    },
    /** Updates the printRect field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set printRect(value) {
      printRect = value;
    },
    /** Reads the reactive printScale field without copying the document.
     */
    get printScale() {
      return printScale;
    },
    /** Updates the printScale field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set printScale(value) {
      printScale = value;
    },
    /** Reads the reactive printOrientation field without copying the document.
     */
    get printOrientation() {
      return printOrientation;
    },
    /** Updates the printOrientation field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set printOrientation(value) {
      printOrientation = value;
    },
    /** Reads the reactive projectMenu field without copying the document.
     */
    get projectMenu() {
      return projectMenu;
    },
    /** Updates the projectMenu field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set projectMenu(value) {
      projectMenu = value;
    },
    /** Reads the reactive help field without copying the document.
     */
    get help() {
      return help;
    },
    /** Updates the help field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set help(value) {
      help = value;
    },
    /** Reads the reactive layerVisible field without copying the document.
     */
    get layerVisible() {
      return layerVisible;
    },
    /** Updates the layerVisible field; callers must preserve immutable document references.
     * @param {any} value Value to apply or convert.
     */

    set layerVisible(value) {
      layerVisible = value;
    },
    /** Reads the reactive selected field without copying the document.
     */
    get selected() {
      return selected;
    },
    /** Reads the reactive filtered field without copying the document.
     */
    get filtered() {
      return filtered;
    },
    /** Reads the reactive doorGhost field without copying the document.
     */
    get doorGhost() {
      return doorGhost;
    },
    /** Reads the reactive furnitureGhost field without copying the document.
     */
    get furnitureGhost() {
      return furnitureGhost;
    },
    /** Reads the reactive previewDimension field without copying the document.
     */
    get previewDimension() {
      return previewDimension;
    },
    /** Reads the reactive hint field without copying the document.
     */
    get hint() {
      return hint;
    },
    format,
    fromUnit,
    toUnit,
    notify,
    remember,
    undo,
    redo,
    chooseTool,
    acceptSetting,
    pickFurniture,
    world,
    point,
    wallPoint,
    offsetFor,
    pointerDown,
    pointerMove,
    pointerUp,
    wheel,
    zoomAt,
    fit,
    removeSelected,
    rotate,
    updateSelected,
    duplicate,
    keyDown,
    exportPlan,
    importPlan,
    newPlan,
    printPlan,
    tools,
  };
}
