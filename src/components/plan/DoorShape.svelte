<script>
  let { d } = $props();
</script>

<g transform={`translate(${d.x} ${d.y}) rotate(${d.angle})`}>
  <line
    x1={-d.width / 2 + 1}
    y1="0"
    x2={d.width / 2 - 1}
    y2="0"
    stroke="#fbfaf5"
    stroke-width={d.thickness + 2}
  />
  <g
    transform={`translate(${d.flip ? d.width / 2 : -d.width / 2} 0) scale(${d.flip ? -1 : 1} ${d.side})`}
    fill="none"
    stroke="#737d60"
    stroke-width="1.5"
    ><path d={`M ${d.width} 0 A ${d.width} ${d.width} 0 0 1 0 ${d.width}`} stroke-width="1" /><path
      d={`M 0 0 V ${d.width} H 3 V 0 Z`}
      fill="#e9ecdf"
    /><path
      d={`M 0 -${d.thickness / 2} V ${d.thickness / 2} M ${d.width} -${d.thickness / 2} V ${d.thickness / 2}`}
    /></g
  >
  <rect
    x={-d.width / 2}
    y={-d.thickness / 2 - 5}
    width={d.width}
    height={d.thickness + 10}
    fill="transparent"
  />
</g>
