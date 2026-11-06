<script>
  import { dimensionGeometry } from '../../lib/geometry.js';
  import { formatMeasure } from '../../lib/units.js';
  let { d, active = false, unit = 'cm' } = $props();
  let g = $derived(dimensionGeometry(d));
</script>

<g stroke={active ? '#788d4f' : '#9a9f8e'} fill="none" stroke-width="1">
  <path
    d={`M ${d.a.x - g.nx * 8} ${d.a.y - g.ny * 8} L ${g.p.x + g.nx * Math.sign(d.offset || 1) * 10} ${g.p.y + g.ny * Math.sign(d.offset || 1) * 10} M ${d.b.x - g.nx * 8} ${d.b.y - g.ny * 8} L ${g.q.x + g.nx * Math.sign(d.offset || 1) * 10} ${g.q.y + g.ny * Math.sign(d.offset || 1) * 10}`}
    opacity=".65"
  />
  <line x1={g.p.x} y1={g.p.y} x2={g.q.x} y2={g.q.y} /><line
    x1={g.p.x}
    y1={g.p.y}
    x2={g.q.x}
    y2={g.q.y}
    stroke="transparent"
    stroke-width="14"
  />
  {#each [g.p, g.q] as p}<path d={`M ${p.x - 5} ${p.y + 5} l 10 -10`} stroke-width="1.6" />{/each}
  <g
    transform={`translate(${(g.p.x + g.q.x) / 2} ${(g.p.y + g.q.y) / 2}) rotate(${g.angle > 90 || g.angle < -90 ? g.angle + 180 : g.angle})`}
    ><rect x="-33" y="-11" width="66" height="22" fill="#f5f5ed" stroke="none" /><text
      text-anchor="middle"
      dominant-baseline="middle"
      fill={active ? '#657942' : '#7d8470'}
      stroke="none"
      font-size="12"
      font-family="Arial, sans-serif">{formatMeasure(g.length, unit)}</text
    ></g
  >
</g>
