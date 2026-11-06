<script>
  import { distance } from '../../lib/geometry.js';
  import { formatMeasure } from '../../lib/units.js';

  let { a, b, thickness, unit = 'cm', zoom = 1 } = $props();
  let label = $derived(formatMeasure(distance(a, b), unit));
  let labelWidth = $derived(Math.max(76, label.length * 7 + 24));
  let labelX = $derived((a.x + b.x) / 2);
  let labelY = $derived(Math.min(a.y, b.y) - thickness / 2 - 24 / zoom);
</script>

<g class="wall-preview editing-only" pointer-events="none">
  <line
    x1={a.x}
    y1={a.y}
    x2={b.x}
    y2={b.y}
    stroke="#687c49"
    stroke-width={thickness}
    stroke-linecap="square"
    opacity=".75"
  />
  {#each [a, b] as endpoint}
    <circle
      cx={endpoint.x}
      cy={endpoint.y}
      r={4 / zoom}
      fill="#fffef9"
      stroke="#6b7c44"
      stroke-width={1.5 / zoom}
    />
  {/each}
  <g transform={`translate(${labelX} ${labelY}) scale(${1 / zoom})`}>
    <rect
      x={-labelWidth / 2}
      y="-15"
      width={labelWidth}
      height="30"
      rx="6"
      fill="#fffef9"
      stroke="#a7b68b"
      stroke-width="1"
    />
    <text
      class="wall-preview-length"
      text-anchor="middle"
      dominant-baseline="central"
      font-size="12"
      font-weight="600"
      fill="#526139">{label}</text
    >
  </g>
</g>
