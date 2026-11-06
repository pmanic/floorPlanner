<script>
  import Furniture from './Furniture.svelte';
  import DoorShape from './DoorShape.svelte';
  import DimensionShape from './DimensionShape.svelte';
  import { buildKitchenEdges } from '../../lib/spatialIndex.js';
  let { plan, showFurniture, showDimensions, layerVisible, unit, kitchenBorders, movingId } =
    $props();
  const EMPTY_EDGES = Object.freeze({});
  let edges = $derived(kitchenBorders ? new Map() : buildKitchenEdges(plan.furniture));
</script>

<g id="plan-content">
  {#if plan.labels.length}<g pointer-events="none"
      ><rect x="0" y="0" width="540" height="620" fill="#fbfaf5" fill-opacity=".77" /><rect
        x="540"
        y="0"
        width="320"
        height="350"
        fill="#f3f2e9"
        fill-opacity=".85"
      /><rect
        x="540"
        y="350"
        width="320"
        height="270"
        fill="#edf0e8"
        fill-opacity=".85"
      />{#each [1, 2, 3, 4, 5] as i}<path
          d={`M 540 ${350 + i * 45} H 860 M ${540 + i * 53.3} 350 V 620`}
          stroke="#dce1d5"
          stroke-width=".7"
        />{/each}</g
    >{/if}
  {#if showFurniture}{#each plan.furniture as item (item.id)}<g
        data-id={item.id}
        visibility={movingId === item.id ? 'hidden' : undefined}
        transform={`translate(${item.x} ${item.y}) rotate(${item.rotation} ${item.w / 2} ${item.h / 2})`}
        class="plan-object"
        ><rect width={item.w} height={item.h} fill="transparent" /><Furniture
          type={item.type}
          w={item.w}
          h={item.h}
          hidden={kitchenBorders ? EMPTY_EDGES : edges.get(item.id) || EMPTY_EDGES}
        /></g
      >{/each}{/if}
  {#if layerVisible.walls}{#each plan.walls as wall (wall.id)}<g
        data-id={wall.id}
        visibility={movingId === wall.id ? 'hidden' : undefined}
        class="plan-object"
        ><line
          x1={wall.a.x}
          y1={wall.a.y}
          x2={wall.b.x}
          y2={wall.b.y}
          stroke="#555b4e"
          stroke-width={wall.thickness}
          stroke-linecap="square"
        /><line
          x1={wall.a.x}
          y1={wall.a.y}
          x2={wall.b.x}
          y2={wall.b.y}
          stroke="transparent"
          stroke-width="14"
          vector-effect="non-scaling-stroke"
        /></g
      >{/each}{/if}
  {#if layerVisible.doors}{#each plan.doors as door (door.id)}<g
        data-id={door.id}
        visibility={movingId === door.id || movingId === door.wallId ? 'hidden' : undefined}
        class="plan-object"><DoorShape d={door} /></g
      >{/each}{/if}
  {#each plan.labels as label}<g pointer-events="none"
      ><text x={label.x} y={label.y} class="room-name" text-anchor="middle">{label.name}</text><text
        x={label.x}
        y={label.y + 22}
        class="room-area"
        text-anchor="middle">{label.area}</text
      ></g
    >{/each}
  {#if showDimensions}{#each plan.dimensions as dim (dim.id)}<g
        data-id={dim.id}
        visibility={movingId === dim.id ? 'hidden' : undefined}
        class="plan-object"><DimensionShape d={dim} active={false} {unit} /></g
      >{/each}{/if}
</g>
