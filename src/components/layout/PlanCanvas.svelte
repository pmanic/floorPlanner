<script>
  import PlanScene from '../plan/PlanScene.svelte';
  import DragPreview from '../plan/DragPreview.svelte';
  import {
    MousePointer2,
    Undo2,
    Redo2,
    Plus,
    Minus,
    Maximize,
    Magnet,
    Grid2X2,
    Move,
    PanelRightClose,
    PanelRightOpen,
  } from 'lucide-svelte';
  import Furniture from '../plan/Furniture.svelte';
  import DoorShape from '../plan/DoorShape.svelte';
  import DimensionShape from '../plan/DimensionShape.svelte';
  import WallPreview from '../plan/WallPreview.svelte';

  let { editor } = $props();
  let selection = $derived(
    editor.dragPreview ? { ...editor.dragPreview, kind: editor.drag.kind } : editor.selected,
  );
  /** Toggles the grid without changing document geometry.
   */
  function toggleGrid() {
    editor.showGrid = !editor.showGrid;
  }

  /** Toggles five-centimeter grid snapping.
   */
  function toggleSnapping() {
    editor.snapping = !editor.snapping;
  }

  /** Toggles the property inspector.
   */
  function toggleInspector() {
    editor.showInspector = !editor.showInspector;
  }

  /** Prevents the native context menu from interrupting canvas input.
   * @param {Event} e Control event.
   */
  function preventContextMenu(e) {
    e.preventDefault();
  }

  /** Reduces zoom around the canvas center.
   */
  function zoomOut() {
    editor.zoomAt(editor.zoom / 1.2);
  }

  /** Increases zoom around the canvas center.
   */
  function zoomIn() {
    editor.zoomAt(editor.zoom * 1.2);
  }
</script>

<main class="canvas-area" bind:this={editor.canvasHost}>
  <div class="canvas-top">
    <div class="plan-tab">
      <span class="plan-tab-dot"></span>Osnova prizemlja <span class="tab-badge">2D</span>
    </div>
    <div class="canvas-top-actions">
      <button
        class:active={editor.showGrid}
        onclick={toggleGrid}
        title="Prikaži / sakrij grid"
        aria-label="Prikaži ili sakrij grid"><Grid2X2 size={16} /></button
      ><button
        class:active={editor.snapping}
        onclick={toggleSnapping}
        title="Prijanjanje na mrežu (5 cm)"
        aria-label="Prijanjanje na mrežu"><Magnet size={16} /></button
      ><span></span><button
        onclick={toggleInspector}
        title="Panel svojstava"
        aria-label="Panel svojstava"
        >{#if editor.showInspector}<PanelRightClose size={17} />{:else}<PanelRightOpen
            size={17}
          />{/if}</button
      >
    </div>
  </div>
  <div class="canvas-paper-label"><span class="tiny-cross">+</span> PROSTOR ZA TVOJE IDEJE</div>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <svg
    class="plan-canvas"
    class:panning={editor.space || editor.tool === 'pan'}
    class:drawing={['wall', 'door', 'dimension', 'print'].includes(editor.tool) ||
      editor.pendingType}
    bind:this={editor.svg}
    onpointerdown={editor.pointerDown}
    onpointermove={editor.pointerMove}
    onpointerup={editor.pointerUp}
    onpointercancel={editor.cancelInteraction}
    onpointerleave={editor.pointerLeave}
    onwheel={editor.wheel}
    oncontextmenu={preventContextMenu}
    aria-label="Interaktivni plan prostora"
  >
    <defs
      ><pattern
        id="canvas-grid"
        width={20 * editor.zoom}
        height={20 * editor.zoom}
        patternUnits="userSpaceOnUse"
        x={editor.pan.x}
        y={editor.pan.y}
        ><path
          d={`M ${20 * editor.zoom} 0 H 0 V ${20 * editor.zoom}`}
          fill="none"
          stroke="#dedfd4"
          stroke-width=".6"
        /></pattern
      ></defs
    >
    <rect width="100%" height="100%" fill={editor.showGrid ? 'url(#canvas-grid)' : '#f5f5ed'} />
    <g transform={`translate(${editor.pan.x} ${editor.pan.y}) scale(${editor.zoom})`}>
      <PlanScene
        plan={editor.plan}
        showFurniture={editor.showFurniture}
        showDimensions={editor.showDimensions}
        layerVisible={editor.layerVisible}
        unit={editor.unit}
        kitchenBorders={editor.kitchenBorders}
        movingId={editor.drag?.id}
      />
      <DragPreview {editor} />
      {#if selection}<g class="editing-only" pointer-events="none"
          >{#if selection.kind === 'furniture'}<g
              transform={`translate(${selection.x} ${selection.y}) rotate(${selection.rotation} ${selection.w / 2} ${selection.h / 2})`}
              ><rect
                x="-4"
                y="-4"
                width={selection.w + 8}
                height={selection.h + 8}
                fill="#85985b"
                fill-opacity=".07"
                stroke="#7c8e56"
                stroke-width={1.5 / editor.zoom}
              />{#each [[-4, -4], [selection.w + 4, -4], [-4, selection.h + 4], [selection.w + 4, selection.h + 4]] as p}<rect
                  x={p[0] - 3 / editor.zoom}
                  y={p[1] - 3 / editor.zoom}
                  width={6 / editor.zoom}
                  height={6 / editor.zoom}
                  fill="white"
                  stroke="#7c8e56"
                  stroke-width={1 / editor.zoom}
                />{/each}</g
            >{:else if selection.kind === 'wall'}<line
              x1={selection.a.x}
              y1={selection.a.y}
              x2={selection.b.x}
              y2={selection.b.y}
              stroke="#a7bb7a"
              stroke-width={selection.thickness + 4}
              opacity=".55"
            />{:else if selection.kind === 'door'}<circle
              cx={selection.x}
              cy={selection.y}
              r={selection.width * 0.6}
              fill="none"
              stroke="#82955a"
              stroke-dasharray="5 4"
            />{:else}<DimensionShape d={selection} active={true} unit={editor.unit} />{/if}</g
        >{/if}
      {#if editor.tool === 'wall' && editor.draft.length}
        <WallPreview
          a={editor.draft[0]}
          b={editor.pointer}
          thickness={editor.wallThickness}
          unit={editor.unit}
          zoom={editor.zoom}
        />
      {/if}
      {#if editor.doorGhost}<g opacity=".7" pointer-events="none"
          ><DoorShape d={editor.doorGhost} /></g
        >{/if}
      {#if editor.furnitureGhost}<g
          transform={`translate(${editor.furnitureGhost.x} ${editor.furnitureGhost.y}) rotate(${editor.furnitureGhost.rotation} ${editor.furnitureGhost.w / 2} ${editor.furnitureGhost.h / 2})`}
          opacity=".7"
          pointer-events="none"
          ><Furniture
            type={editor.furnitureGhost.type}
            w={editor.furnitureGhost.w}
            h={editor.furnitureGhost.h}
            selected
          /><rect
            width={editor.furnitureGhost.w}
            height={editor.furnitureGhost.h}
            fill="none"
            stroke="#7b8c50"
            stroke-dasharray="4 3"
          /></g
        >{/if}
      {#if editor.tool === 'dimension' && editor.draft.length === 1}<line
          x1={editor.draft[0].x}
          y1={editor.draft[0].y}
          x2={editor.pointer.x}
          y2={editor.pointer.y}
          stroke="#85965b"
          stroke-dasharray="5 4"
        />{/if}
      {#if editor.previewDimension}<DimensionShape
          d={editor.previewDimension}
          active={true}
          unit={editor.unit}
        />{/if}
      {#if editor.printRect}<rect
          x={editor.printRect.x}
          y={editor.printRect.y}
          width={editor.printRect.w}
          height={editor.printRect.h}
          fill="#8b9d65"
          fill-opacity=".1"
          stroke="#6d8247"
          stroke-width={1.5 / editor.zoom}
          stroke-dasharray={`${7 / editor.zoom} ${4 / editor.zoom}`}
        />{/if}
    </g>
  </svg>
  <div class="canvas-compass" title="Sever">
    <span>N</span><svg width="24" height="31" viewBox="0 0 24 31"
      ><path d="M12 2 L20 27 L12 22 L4 27Z" fill="none" stroke="currentColor" /><path
        d="M12 2 V22 L4 27Z"
        fill="currentColor"
      /></svg
    >
  </div>
  <div class="canvas-bottom">
    <div class="canvas-hint">
      <span class="hint-icon"
        >{#if editor.tool === 'select'}<MousePointer2 size={14} />{:else}<Move
            size={14}
          />{/if}</span
      ><span>{editor.hint}</span>
    </div>
    <div class="zoom-control">
      <button onclick={zoomOut} aria-label="Umanji"><Minus size={16} /></button><button
        class="zoom-number"
        onclick={editor.fit}
        title="Uklopi ceo plan">{Math.round(editor.zoom * 100)}%</button
      ><button onclick={zoomIn} aria-label="Uvećaj"><Plus size={16} /></button><span></span><button
        onclick={editor.fit}
        title="Uklopi plan (0)"
        aria-label="Uklopi ceo plan"><Maximize size={15} /></button
      >
    </div>
  </div>
  <div class="history-controls">
    <button
      onclick={editor.undo}
      disabled={!editor.canUndo}
      title="Poništi (Ctrl+Z)"
      aria-label="Poništi"><Undo2 size={17} /></button
    ><button
      onclick={editor.redo}
      disabled={!editor.canRedo}
      title="Ponovi (Ctrl+Shift+Z)"
      aria-label="Ponovi"><Redo2 size={17} /></button
    >
  </div>
</main>
