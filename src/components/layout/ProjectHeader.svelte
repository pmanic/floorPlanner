<script>
  import { Printer, ChevronDown, Download, Upload, FilePlus2 } from 'lucide-svelte';

  let { editor } = $props();
  /** Toggles project name and file controls.
   */
  function toggleProjectMenu() {
    editor.projectMenu = !editor.projectMenu;
  }

  /** Renames the document as one reversible edit.
   * @param {Event} e Control event.
   */
  function renameProject(e) {
    editor.remember();
    editor.plan = { ...editor.plan, name: e.target.value.trim() || 'Moj prostor' };
  }

  /** Opens a new-project dialog and closes the project menu.
   */
  function newProject() {
    editor.modal = 'new';
    editor.projectMenu = false;
  }

  /** Opens the JSON project chooser.
   */
  function openProject() {
    editor.fileInput.click();
  }

  /** Switches display and input to centimeters.
   */
  function useCentimeters() {
    editor.unit = 'cm';
  }

  /** Switches display and input to meters.
   */
  function useMeters() {
    editor.unit = 'm';
  }

  /** Starts rectangular A4 print selection.
   */
  function startPrinting() {
    editor.chooseTool('print');
  }

  /** Explains local project storage.
   */
  function explainStorage() {
    editor.notify('Lični radni prostor · projekat se čuva u ovom pregledaču.');
  }
</script>

<header class="topbar flex items-center justify-between">
  <div class="flex items-center gap-5 min-w-0">
    <button class="brand" onclick={editor.fit} aria-label="Forma početak"
      ><span class="brand-mark"><span></span><span></span><span></span></span>forma<span
        class="brand-dot">.</span
      ></button
    >
    <span class="header-divider"></span>
    <div class="project-control">
      <button class="project-title" onclick={toggleProjectMenu}
        >{editor.plan.name}<ChevronDown size={14} /></button
      ><span class="save-status"
        ><span class:saving={!editor.saved}></span>{editor.saved
          ? 'Sve izmene su sačuvane'
          : 'Čuvanje…'}</span
      >
      {#if editor.projectMenu}<div class="dropdown project-dropdown">
          <label
            >Naziv projekta<input
              value={editor.plan.name}
              maxlength="60"
              onchange={renameProject}
            /></label
          ><button onclick={newProject}><FilePlus2 size={16} />Novi projekat</button><button
            onclick={openProject}><Upload size={16} />Otvori projekat</button
          ><button onclick={editor.exportPlan}><Download size={16} />Preuzmi projekat</button>
        </div>{/if}
    </div>
  </div>
  <div class="header-actions flex items-center gap-5">
    <div class="unit-control flex items-center gap-3">
      <span>Jedinice</span>
      <div class="segmented">
        <button class:active={editor.unit === 'cm'} onclick={useCentimeters}>cm</button><button
          class:active={editor.unit === 'm'}
          onclick={useMeters}>m</button
        >
      </div>
    </div>
    <span class="header-divider"></span>
    <button class="quiet-button export-button" onclick={editor.exportPlan}
      ><Download size={16} /><span>Sačuvaj projekat</span></button
    >
    <button class="primary-button" onclick={startPrinting}
      ><Printer size={16} /><span>Štampaj plan</span></button
    >
    <button class="avatar" title="Lokalni radni prostor" onclick={explainStorage}>M</button>
  </div>
</header>
