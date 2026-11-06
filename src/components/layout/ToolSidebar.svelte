<script>
  import { MousePointer2, Hand, BrickWall, DoorOpen, Ruler, Printer } from 'lucide-svelte';
  const TOOL_ICONS = {
    select: MousePointer2,
    pan: Hand,
    wall: BrickWall,
    door: DoorOpen,
    dimension: Ruler,
    furniture: Armchair,
    print: Printer,
  };
  import { Armchair, ChevronDown, Plus, X, Search } from 'lucide-svelte';
  import Furniture from '../plan/Furniture.svelte';

  let { editor } = $props();
  /** Starts the tool identified by the clicked button.
   * @param {Event} event Control event.
   */
  function selectTool(event) {
    editor.chooseTool(event.currentTarget.dataset.tool);
  }

  /** Clears the catalog search when reset or category selection changes.
   */
  function clearSearch() {
    editor.query = '';
  }

  /** Clears the catalog search when reset or category selection changes.
   */
  function clearSearch2() {
    editor.query = '';
  }

  /** Starts placement of the selected catalog item.
   * @param {Event} event Control event.
   */
  function placeFurniture(event) {
    for (const item of editor.filtered) {
      if (item.type === event.currentTarget.dataset.type) {
        editor.pickFurniture(item);
        return;
      }
    }
  }
</script>

<aside class="left-sidebar">
  <div class="sidebar-heading">
    <span>ALATI ZA PLANIRANJE</span><span class="tiny-label">01</span>
  </div>
  <nav class="tool-list" aria-label="Alati za planiranje">
    {#each editor.tools as t (t.id)}{@const Icon = TOOL_ICONS[t.id]}<button
        class="tool-button"
        class:active={editor.tool === t.id}
        data-tool={t.id}
        onclick={selectTool}
        title={t.name}><Icon size={18} strokeWidth={1.65} /><span>{t.name}</span></button
      >{/each}
  </nav>
  <div class="library-heading">
    <div>
      <span class="eyebrow">BIBLIOTEKA</span>
      <h2>Uredi svoj prostor<span class="little-dot"></span></h2>
    </div>
    <Armchair size={20} strokeWidth={1.4} />
  </div>
  <div class="search-box">
    <Search size={14} /><input
      aria-label="Pretraži nameštaj"
      placeholder="Pronađi element…"
      bind:value={editor.query}
    />{#if editor.query}<button onclick={clearSearch} aria-label="Obriši pretragu"
        ><X size={13} /></button
      >{/if}
  </div>
  <div class="category-select">
    <select aria-label="Kategorija nameštaja" bind:value={editor.category} onchange={clearSearch2}
      >{#each ['Kuhinja', 'Kupatilo', 'Dnevna soba', 'Spavaća soba'] as c}<option>{c}</option
        >{/each}</select
    ><ChevronDown size={14} />
  </div>
  <div class="furniture-library">
    {#each editor.filtered as item}<button
        class="furniture-card"
        class:chosen={editor.pendingType?.type === item.type}
        data-type={item.type}
        onclick={placeFurniture}
        title={`Postavi: ${item.name}`}
        ><span class="item-add"><Plus size={12} /></span><svg
          viewBox={`-20 -20 ${item.w + 40} ${item.h + 40}`}
          aria-hidden="true"><Furniture type={item.type} w={item.w} h={item.h} /></svg
        ><span>{item.name}</span><small
          >{editor.format(item.w, false)} × {editor.format(item.h)}</small
        ></button
      >{/each}
    {#if !editor.filtered.length}<p class="no-results">Nema elemenata za „{editor.query}“.</p>{/if}
  </div>
  <div class="sidebar-bottom">
    <span class="leaf-mark">✳</span>
    <div><strong>Svaka ideja počinje prostorom.</strong><span>Napravi mesta za svoju.</span></div>
  </div>
</aside>
