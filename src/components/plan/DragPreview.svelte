<script>
  import Furniture from './Furniture.svelte';
  import DoorShape from './DoorShape.svelte';
  import DimensionShape from './DimensionShape.svelte';
  let { editor } = $props();
  let item = $derived(editor.dragPreview || editor.drag?.original);
  let kind = $derived(editor.drag?.kind);
  let doors = $derived.by(attachedDoors);
  /** Collects a moved wall's doors only when the drag target or committed document changes.
   * @returns {object[]} Attached doors to render in the transient overlay.
   */
  function attachedDoors() {
    if (editor.drag?.kind !== 'wall') return [];
    const result = [];
    for (const door of editor.plan.doors) if (door.wallId === editor.drag.id) result.push(door);
    return result;
  }
</script>

{#if item}
  <g class="editing-only" pointer-events="none">
    {#if kind === 'furniture'}
      <g
        transform={`translate(${item.x} ${item.y}) rotate(${item.rotation} ${item.w / 2} ${item.h / 2})`}
      >
        <Furniture type={item.type} w={item.w} h={item.h} />
      </g>
    {:else if kind === 'wall'}
      <line
        x1={item.a.x}
        y1={item.a.y}
        x2={item.b.x}
        y2={item.b.y}
        stroke="#555b4e"
        stroke-width={item.thickness}
        stroke-linecap="square"
      />
      {#each doors as door (door.id)}
        <g
          transform={`translate(${item.a.x - editor.drag.original.a.x} ${item.a.y - editor.drag.original.a.y})`}
          ><DoorShape d={door} /></g
        >
      {/each}
    {:else if kind === 'door'}<DoorShape d={item} />
    {:else if kind === 'dimension'}<DimensionShape d={item} unit={editor.unit} />
    {/if}
  </g>
{/if}
