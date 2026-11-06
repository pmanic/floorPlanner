<script>
  export let type = 'counter';
  export let w = 60;
  export let h = 60;
  export let hidden = {};
  export let selected = false;
</script>

<g
  stroke={selected ? '#6a7c46' : '#777b6b'}
  stroke-width="1.5"
  fill="none"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  {#if type === 'plant'}
    <circle cx={w / 2} cy={h / 2} r={w * 0.38} fill="#e3e9d6" stroke="#a1ad88" />
    {#each [0, 60, 120, 180, 240, 300] as angle}<ellipse
        cx={w / 2}
        cy={h * 0.32}
        rx={w * 0.13}
        ry={h * 0.22}
        transform={`rotate(${angle} ${w / 2} ${h / 2})`}
        fill="#d6dfc4"
        stroke="#a1ad88"
      />{/each}
  {:else if type === 'bed'}
    <rect width={w} height={h} rx="4" fill="#faf9f5" /><rect
      x="5"
      y="5"
      width={w - 10}
      height="12"
      fill="#e1e3d9"
    />
    <rect x="10" y="25" width={w / 2 - 15} height="36" rx="7" fill="#f6f5ee" /><rect
      x={w / 2 + 5}
      y="25"
      width={w / 2 - 15}
      height="36"
      rx="7"
      fill="#f6f5ee"
    />
    <path d={`M 5 75 H ${w - 5} V ${h - 5} H 5 Z`} fill="#e9ebdf" /><path
      d={`M 5 90 H ${w - 5} M ${w / 2} 90 V ${h - 5}`}
    />
  {:else if type === 'sofa'}
    <rect width={w} height={h} rx="10" fill="#e5e8d9" /><rect
      x="9"
      y="8"
      width={w - 18}
      height="20"
      rx="5"
      fill="#f0f1e9"
    />
    {#each [0, 1, 2] as i}<rect
        x={17 + (i * (w - 34)) / 3}
        y="30"
        width={(w - 34) / 3 - 3}
        height={h - 39}
        rx="5"
        fill="#f0f1e9"
      />{/each}
    <rect x="4" y="23" width="12" height={h - 28} rx="4" fill="#e5e8d9" /><rect
      x={w - 16}
      y="23"
      width="12"
      height={h - 28}
      rx="4"
      fill="#e5e8d9"
    />
  {:else if type === 'table'}
    {#each [w * 0.23, w * 0.67] as x}<rect
        {x}
        y="-15"
        width="30"
        height="25"
        rx="7"
        fill="#e8e6dc"
      /><rect {x} y={h - 10} width="30" height="25" rx="7" fill="#e8e6dc" />{/each}
    <rect width={w} height={h} rx="14" fill="#ede9dd" /><rect
      x="5"
      y="5"
      width={w - 10}
      height={h - 10}
      rx="10"
      stroke="#d7d2c2"
    />
    <circle cx={w * 0.65} cy={h * 0.5} r="11" fill="#dde2d1" /><path
      d={`M ${w * 0.65 - 5} ${h * 0.5} l 10 -5 m -5 0 v 12`}
    />
  {:else if type === 'coffee'}
    <rect width={w} height={h} rx={h / 2} fill="#eee9dc" /><rect
      x={w * 0.3}
      y="12"
      width="22"
      height="28"
      rx="2"
      fill="#f7f6ef"
      transform={`rotate(-12 ${w * 0.4} 25)`}
    /><circle cx={w * 0.7} cy={h * 0.5} r="9" fill="#dce3cc" />
  {:else if type === 'toilet'}
    <rect x="2" width={w - 4} height={h * 0.27} rx="3" fill="#fbfbf8" /><path
      d={`M 5 ${h * 0.27} H ${w - 5} V ${h * 0.65} Q ${w - 5} ${h} ${w / 2} ${h} Q 5 ${h} 5 ${h * 0.65} Z`}
      fill="#fbfbf8"
    /><ellipse cx={w / 2} cy={h * 0.61} rx={w * 0.26} ry={h * 0.23} /><circle
      cx={w / 2}
      cy="8"
      r="2"
    />
  {:else if type === 'basin'}
    <rect width={w} height={h} rx="5" fill="#fbfbf8" /><ellipse
      cx={w / 2}
      cy={h * 0.57}
      rx={w * 0.35}
      ry={h * 0.3}
    /><path d={`M ${w / 2} 3 v 11`} /><circle cx={w / 2} cy={h * 0.6} r="2" />
  {:else}
    <rect width={w} height={h} fill={type === 'shower' ? '#edf0e9' : '#f1f0e8'} stroke="none" />
    {#if !hidden.top}<path d={`M 0 0 H ${w}`} />{/if}{#if !hidden.right}<path
        d={`M ${w} 0 V ${h}`}
      />{/if}{#if !hidden.bottom}<path d={`M 0 ${h} H ${w}`} />{/if}{#if !hidden.left}<path
        d={`M 0 0 V ${h}`}
      />{/if}
    {#if type === 'stove'}
      <rect
        x="6"
        y="6"
        width={w - 12}
        height={h - 12}
        rx="3"
      />{#each [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]] as p}<circle
          cx={w * p[0]}
          cy={h * p[1]}
          r={w * 0.13}
        /><circle cx={w * p[0]} cy={h * p[1]} r={w * 0.08} stroke-width=".7" />{/each}
    {:else if type === 'sink'}
      <rect x={w * 0.08} y={h * 0.18} width={w * 0.52} height={h * 0.67} rx="7" /><circle
        cx={w * 0.34}
        cy={h * 0.53}
        r="3"
      /><path d={`M ${w * 0.35} 5 v 12 q 7 0 7 5`} />{#each [0, 1, 2, 3, 4] as i}<path
          d={`M ${w * 0.68 + i * 4} ${h * 0.25} v ${h * 0.48}`}
          stroke-width=".7"
        />{/each}
    {:else if type === 'washer'}
      <path d={`M 0 10 H ${w}`} /><circle cx="8" cy="5" r="2" /><circle
        cx={w / 2}
        cy={h * 0.58}
        r={w * 0.29}
      /><path
        d={`M ${w * 0.34} ${h * 0.58} q 0 -12 12 -9 q 15 5 4 17 q -10 8 -15 -3 q -3 -7 6 -7 q 6 0 4 5`}
      />
    {:else if type === 'fridge' || type === 'freezer'}
      <path d={`M 5 ${h - 7} H ${w - 5} M ${w - 12} ${h - 15} h -16`} />
      {#if type === 'freezer'}<path
          d={`M ${w / 2} ${h * 0.22} v ${h * 0.4} M ${w * 0.32} ${h * 0.32} l ${w * 0.36} ${h * 0.2} M ${w * 0.32} ${h * 0.52} l ${w * 0.36} -${h * 0.2}`}
        />{:else}<text
          x={w / 2}
          y={h * 0.52}
          text-anchor="middle"
          stroke="none"
          fill="#979b8b"
          font-size="13">F</text
        >{/if}
    {:else if type === 'dishwasher'}
      <path
        d={`M 0 10 H ${w} M ${w * 0.2} ${h * 0.4} q ${w * 0.1} -8 ${w * 0.2} 0 t ${w * 0.2} 0 t ${w * 0.2} 0 M ${w * 0.2} ${h * 0.6} q ${w * 0.1} -8 ${w * 0.2} 0 t ${w * 0.2} 0 t ${w * 0.2} 0`}
      /><circle cx="8" cy="5" r="2" />
    {:else if type === 'shower'}
      <rect x="5" y="5" width={w - 10} height={h - 10} rx="3" /><path
        d={`M 5 5 L ${w - 5} ${h - 5} M ${w - 5} 5 L 5 ${h - 5}`}
        stroke="#c8d0c2"
      /><circle cx={w / 2} cy={h / 2} r="5" fill="#edf0e9" /><path
        d={`M ${w * 0.65} 0 V 10 H ${w * 0.4}`}
        stroke-width="3"
      />
    {:else if type === 'wardrobe'}
      <path
        d={`M ${w / 2} 0 V ${h} M 0 0 L ${w / 2} ${h} L ${w} 0 M ${w / 2 - 6} ${h * 0.4} v 12 M ${w / 2 + 6} ${h * 0.4} v 12`}
        stroke-width="1"
      />
    {/if}
  {/if}
</g>
