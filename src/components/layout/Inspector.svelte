<script>
  import {
    BrickWall,
    DoorOpen,
    Ruler,
    Armchair,
    RotateCw,
    Trash2,
    X,
    Layers,
    Eye,
    EyeOff,
    HelpCircle,
    ArrowUpRight,
    Copy,
    Home,
    Settings2,
  } from 'lucide-svelte';

  import { distance } from '../../lib/geometry.js';

  let { editor } = $props();
  /** Updates furniture width in canonical centimeters.
   * @param {Event} e Control event.
   */
  function changeWidth(e) {
    editor.updateSelected('w', editor.fromUnit(e.target.value));
  }

  /** Updates furniture depth in canonical centimeters.
   * @param {Event} e Control event.
   */
  function changeDepth(e) {
    editor.updateSelected('h', editor.fromUnit(e.target.value));
  }

  /** Updates the horizontal world coordinate.
   * @param {Event} e Control event.
   */
  function changeX(e) {
    editor.updateSelected('x', editor.fromUnit(e.target.value));
  }

  /** Updates the vertical world coordinate.
   * @param {Event} e Control event.
   */
  function changeY(e) {
    editor.updateSelected('y', editor.fromUnit(e.target.value));
  }

  /** Applies the selected quarter-turn rotation.
   * @param {Event} e Control event.
   */
  function changeRotation(e) {
    editor.updateSelected('rotation', Number(e.target.value));
  }

  /** Updates wall thickness and attached door openings.
   * @param {Event} e Control event.
   */
  function changeThickness(e) {
    editor.updateSelected('thickness', editor.fromUnit(e.target.value));
  }

  /** Validates the selected door opening width.
   * @param {Event} e Control event.
   */
  function changeDoorWidth(e) {
    editor.updateSelected('width', editor.fromUnit(e.target.value));
  }

  /** Switches the door to the other side of its wall.
   */
  function flipDoorSide() {
    editor.updateSelected('side', -editor.selected.side);
  }

  /** Switches the door hinge between left and right.
   */
  function flipDoorHinge() {
    editor.updateSelected('flip', !editor.selected.flip);
  }

  /** Updates the signed dimension-line offset.
   * @param {Event} e Control event.
   */
  function changeDimensionOffset(e) {
    editor.updateSelected('offset', editor.fromUnit(e.target.value));
  }

  /** Toggles one visible plan layer.
   * @param {Event} event Control event.
   */
  function toggleLayer(event) {
    if (event.currentTarget.dataset.layer === 'furniture')
      editor.showFurniture = !editor.showFurniture;
    else if (event.currentTarget.dataset.layer === 'dimensions')
      editor.showDimensions = !editor.showDimensions;
    else
      editor.layerVisible = {
        ...editor.layerVisible,
        [event.currentTarget.dataset.layer]:
          !editor.layerVisible[event.currentTarget.dataset.layer],
      };
  }

  /** Toggles automatic adjacency snapping.
   */
  function toggleJoining() {
    editor.kitchenJoin = !editor.kitchenJoin;
  }

  /** Shows or hides shared kitchen boundaries.
   */
  function toggleBorders() {
    editor.kitchenBorders = !editor.kitchenBorders;
  }

  /** Starts drawing walls after requesting thickness.
   */
  function startWall() {
    editor.chooseTool('wall');
  }

  /** Toggles the keyboard shortcut reference.
   */
  function toggleHelp() {
    editor.help = !editor.help;
  }
</script>

{#if editor.showInspector}<aside class="right-sidebar">
    <div class="properties-heading">
      <h2>{editor.selected ? 'Svojstva elementa' : 'Svojstva plana'}</h2>
      <Settings2 size={16} />
    </div>
    {#if editor.selected}
      <section class="inspector-section">
        <div class="selected-type">
          <span class="selection-icon"
            >{#if editor.selected.kind === 'furniture'}<Armchair
                size={23}
              />{:else if editor.selected.kind === 'wall'}<BrickWall
                size={23}
              />{:else if editor.selected.kind === 'door'}<DoorOpen size={23} />{:else}<Ruler
                size={23}
              />{/if}</span
          >
          <div>
            <h3>
              {editor.selected.name ||
                { wall: 'Zid', door: 'Vrata', dimension: 'Kota' }[editor.selected.kind]}
            </h3>
            <p>Izabrani element</p>
          </div>
        </div>
        {#if editor.selected.kind === 'furniture'}<div class="input-grid">
            <label
              >Širina ({editor.unit})<input
                type="number"
                min="0.01"
                step="any"
                value={editor.toUnit(editor.selected.w)}
                onchange={changeWidth}
              /></label
            ><label
              >Dubina ({editor.unit})<input
                type="number"
                min="0.01"
                step="any"
                value={editor.toUnit(editor.selected.h)}
                onchange={changeDepth}
              /></label
            ><label
              >X ({editor.unit})<input
                type="number"
                step="any"
                value={editor.toUnit(editor.selected.x)}
                onchange={changeX}
              /></label
            ><label
              >Y ({editor.unit})<input
                type="number"
                step="any"
                value={editor.toUnit(editor.selected.y)}
                onchange={changeY}
              /></label
            >
          </div>
          <label class="field-label"
            >Rotacija<select value={editor.selected.rotation} onchange={changeRotation}
              >{#each [0, 90, 180, 270] as r}<option value={r}>{r}°</option>{/each}</select
            ></label
          >
          <div class="flex gap-2 mt-3">
            <button class="secondary-button flex-1" onclick={editor.rotate}
              ><RotateCw size={14} />Rotiraj</button
            ><button class="icon-button" onclick={editor.duplicate} title="Dupliraj"
              ><Copy size={15} /></button
            >
          </div>
        {:else if editor.selected.kind === 'wall'}<label class="field-label"
            >Debljina zida ({editor.unit})<input
              type="number"
              min="0.01"
              step="any"
              value={editor.toUnit(editor.selected.thickness)}
              onchange={changeThickness}
            /></label
          >
          <div class="property-row mt-4">
            <span>Dužina</span><strong
              >{editor.format(distance(editor.selected.a, editor.selected.b))}</strong
            >
          </div>
        {:else if editor.selected.kind === 'door'}<label class="field-label"
            >Širina vrata ({editor.unit})<input
              type="number"
              min="0.01"
              step="any"
              value={editor.toUnit(editor.selected.width)}
              onchange={changeDoorWidth}
            /></label
          ><button class="secondary-button w-full mt-3" onclick={flipDoorSide}
            ><RotateCw size={14} />Unutra / spolja</button
          ><button class="secondary-button w-full mt-2" onclick={flipDoorHinge}
            >Leva / desna šarka</button
          >
        {:else}<div class="property-row">
            <span>Dužina</span><strong
              >{editor.format(distance(editor.selected.a, editor.selected.b))}</strong
            >
          </div>
          <label class="field-label mt-3"
            >Odstojanje ({editor.unit})<input
              type="number"
              step="any"
              value={editor.toUnit(editor.selected.offset)}
              onchange={changeDimensionOffset}
            /></label
          >{/if}
        <button class="delete-button" onclick={editor.removeSelected}
          ><Trash2 size={14} />Obriši element<span>Del</span></button
        >
      </section>
    {:else}<section class="inspector-section project-summary">
        <div class="floor-icon"><Home size={23} strokeWidth={1.4} /></div>
        <h3>Osnova prizemlja</h3>
        <p>Tvoj prostor, tvoja pravila.</p>
        <div class="summary-stats">
          <div><strong>{editor.plan.walls.length}</strong><span>zidova</span></div>
          <div><strong>{editor.plan.furniture.length}</strong><span>elemenata</span></div>
          <div><strong>{editor.plan.doors.length}</strong><span>vrata</span></div>
        </div>
      </section>{/if}
    <section class="inspector-section">
      <div class="section-title">
        <h3>Prikaz plana</h3>
        <Layers size={14} />
      </div>
      {#each [{ key: 'walls', name: 'Zidovi', icon: BrickWall, count: editor.plan.walls.length }, { key: 'doors', name: 'Vrata', icon: DoorOpen, count: editor.plan.doors.length }, { key: 'furniture', name: 'Nameštaj', icon: Armchair, count: editor.plan.furniture.length }, { key: 'dimensions', name: 'Kote', icon: Ruler, count: editor.plan.dimensions.length }] as layer}<div
          class="layer-row"
        >
          <layer.icon size={15} strokeWidth={1.5} /><span>{layer.name}</span><small
            >{layer.count}</small
          ><button
            title={`Prikaži / sakrij: ${layer.name}`}
            aria-label={`Prikaži / sakrij: ${layer.name}`}
            data-layer={layer.key}
            onclick={toggleLayer}
            >{#if layer.key === 'furniture' ? editor.showFurniture : layer.key === 'dimensions' ? editor.showDimensions : editor.layerVisible[layer.key]}<Eye
                size={14}
              />{:else}<EyeOff size={14} />{/if}</button
          >
        </div>{/each}
    </section>
    <section class="inspector-section kitchen-settings">
      <div class="section-title"><h3>Kuhinjski elementi</h3></div>
      <div class="toggle-row">
        <span>Automatsko spajanje</span><button
          class="switch"
          class:on={editor.kitchenJoin}
          role="switch"
          aria-checked={editor.kitchenJoin}
          aria-label="Automatsko spajanje kuhinjskih elemenata"
          onclick={toggleJoining}><span></span></button
        >
      </div>
      <p>Elementi prijanjaju jedan uz drugi pri postavljanju.</p>
      <div class="toggle-row">
        <span>Prikaži granice</span><button
          class="switch"
          class:on={editor.kitchenBorders}
          role="switch"
          aria-checked={editor.kitchenBorders}
          aria-label="Prikaži granice kuhinjskih elemenata"
          onclick={toggleBorders}><span></span></button
        >
      </div>
      <div class="join-preview">
        <svg viewBox="0 0 172 45"
          ><rect
            x="1"
            y="1"
            width="170"
            height="42"
            rx="2"
            fill="#f4f3eb"
            stroke="#a4ab96"
          />{#if editor.kitchenBorders}<path d="M57 1V43M114 1V43" stroke="#a4ab96" />{/if}<rect
            x="68"
            y="9"
            width="35"
            height="27"
            rx="5"
            fill="none"
            stroke="#a4ab96"
          /><circle cx="85" cy="23" r="2" fill="#a4ab96" /><circle
            cx="131"
            cy="14"
            r="6"
            fill="none"
            stroke="#a4ab96"
          /><circle cx="153" cy="14" r="6" fill="none" stroke="#a4ab96" /><circle
            cx="131"
            cy="31"
            r="6"
            fill="none"
            stroke="#a4ab96"
          /><circle cx="153" cy="31" r="6" fill="none" stroke="#a4ab96" /></svg
        ><span>{editor.kitchenBorders ? 'Pojedinačni elementi' : 'Jedna povezana celina'}</span>
      </div>
    </section>
    <div class="tip-card">
      <span class="tip-eyebrow"><span>✧</span> MALI SAVET</span>
      <p>Velike ideje počinju<br />jednostavnom linijom.</p>
      <span>Izaberi zid i nacrtaj prvi korak.</span><button onclick={startWall}
        >Započni crtanje<ArrowUpRight size={15} /></button
      >
    </div>
    <button class="help-button" onclick={toggleHelp}
      ><HelpCircle size={16} /><span>Pomoć i prečice</span><kbd>?</kbd></button
    >
  </aside>{/if}
