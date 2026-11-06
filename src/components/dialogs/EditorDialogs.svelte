<script>
  import {
    BrickWall,
    DoorOpen,
    Printer,
    Plus,
    Download,
    X,
    Check,
    ArrowUpRight,
    FilePlus2,
    Keyboard,
  } from 'lucide-svelte';

  import { focusDialog } from '../../lib/focusDialog.js';
  let { editor } = $props();
  /** Dismisses the status notification.
   */
  function dismissToast() {
    editor.toast = '';
  }

  /** Closes tool settings and clears a cancelled print selection.
   */
  function dismissModal() {
    editor.modal = null;
    if (editor.tool === 'print') editor.printRect = null;
  }

  /** Validates tool dimensions without submitting a page navigation.
   * @param {Event} e Control event.
   */
  function submitSettings(e) {
    e.preventDefault();
    editor.acceptSetting();
  }

  /** Converts a preset centimeter value to the selected input unit.
   * @param {Event} event Control event.
   */
  function selectPreset(event) {
    editor.settingValue = editor.toUnit(Number(event.currentTarget.dataset.value));
  }

  /** Closes the shortcut reference.
   */
  function dismissHelp() {
    editor.help = false;
  }
</script>

<input
  class="hidden"
  type="file"
  accept=".json,application/json"
  bind:this={editor.fileInput}
  onchange={editor.importPlan}
/>
{#if editor.toast}<div class="toast" role="status">
    <Check size={16} />{editor.toast}<button onclick={dismissToast} aria-label="Zatvori obaveštenje"
      ><X size={14} /></button
    >
  </div>{/if}
{#if editor.modal}<div class="modal-overlay" role="presentation">
    <div
      class="modal"
      role="dialog"
      use:focusDialog={editor.closeDialog}
      aria-modal="true"
      aria-labelledby="modal-title"
      tabindex="-1"
    >
      <button class="modal-close" onclick={dismissModal} aria-label="Zatvori"
        ><X size={19} /></button
      >
      {#if editor.modal === 'wall' || editor.modal === 'door'}<div class="modal-icon">
          {#if editor.modal === 'wall'}<BrickWall size={25} />{:else}<DoorOpen size={25} />{/if}
        </div>
        <span class="eyebrow">SVAKI DETALJ JE VAŽAN</span>
        <h2 id="modal-title">
          {editor.modal === 'wall' ? 'Počnimo od zidova.' : 'Otvori nove mogućnosti.'}
        </h2>
        <p>
          {editor.modal === 'wall'
            ? 'Podesi debljinu i klikni početnu tačku. Svaki sledeći klik dodaje povezani segment, uz prikaz zida i dužine uživo. Enter ili klik na postojeći zid završava niz.'
            : 'Podesi širinu vrata. Položaj miša uz zid određuje stranu i smer otvaranja.'}
        </p>
        <form onsubmit={submitSettings}>
          <label class="field-label"
            >{editor.modal === 'wall' ? 'Debljina zida' : 'Širina vrata'} ({editor.unit})<input
              type="number"
              min={editor.unit === 'cm' ? 1 : 0.01}
              max={editor.toUnit(editor.modal === 'wall' ? 100 : 400)}
              step="any"
              bind:value={editor.settingValue}
              required
            /></label
          >
          <div class="preset-options">
            {#each editor.modal === 'wall' ? [10, 15, 20, 25] : [70, 80, 90, 100] as v}<button
                type="button"
                class:active={editor.fromUnit(editor.settingValue) === v}
                data-value={v}
                onclick={selectPreset}>{editor.format(v)}</button
              >{/each}
          </div>
          <button class="primary-button w-full justify-center mt-6" type="submit"
            >{editor.modal === 'wall' ? 'Nacrtaj zid' : 'Postavi vrata'}<ArrowUpRight
              size={16}
            /></button
          >
        </form>
      {:else if editor.modal === 'print'}<div class="modal-icon"><Printer size={25} /></div>
        <span class="eyebrow">OD IDEJE DO PAPIRA</span>
        <h2 id="modal-title">Tvoj plan, na A4.</h2>
        <p>
          Izabrana površina: {editor.format(editor.printRect.w)} × {editor.format(
            editor.printRect.h,
          )}. Štampa se trenutni prikaz slojeva, bez mreže.
        </p>
        <label class="field-label"
          >Orijentacija<select bind:value={editor.printOrientation}
            ><option value="landscape">Položeno — A4</option><option value="portrait"
              >Uspravno — A4</option
            ></select
          ></label
        ><label class="field-label mt-4"
          >Razmera<select bind:value={editor.printScale}
            ><option value="fit">Uklopi na papir</option><option value="20">1 : 20</option><option
              value="50">1 : 50</option
            ><option value="100">1 : 100</option></select
          ></label
        >
        <div class="print-note"><Check size={15} />Čist arhitektonski plan sa kotama</div>
        <button class="primary-button w-full justify-center mt-5" onclick={editor.printPlan}
          ><Printer size={16} />Otvori pregled za štampu</button
        >
      {:else if editor.modal === 'new'}<div class="modal-icon"><FilePlus2 size={25} /></div>
        <h2 id="modal-title">Prostor za novu ideju.</h2>
        <p>
          Počni sa praznim platnom. Pre toga možeš preuzeti trenutni projekat. Ovu promenu možeš i
          poništiti.
        </p>
        <button class="secondary-button w-full justify-center mt-4" onclick={editor.exportPlan}
          ><Download size={16} />Preuzmi trenutni projekat</button
        ><button class="primary-button w-full justify-center mt-3" onclick={editor.newPlan}
          >Napravi novi projekat<Plus size={16} /></button
        >{/if}
    </div>
  </div>{/if}
{#if editor.help}<div class="modal-overlay" role="presentation">
    <div
      class="modal help-modal"
      role="dialog"
      use:focusDialog={editor.closeDialog}
      aria-modal="true"
      aria-label="Pomoć i prečice"
      tabindex="-1"
    >
      <button class="modal-close" onclick={dismissHelp} aria-label="Zatvori"><X size={19} /></button
      >
      <div class="modal-icon"><Keyboard size={25} /></div>
      <h2>Manje klikova.<br />Više ideja.</h2>
      <div class="shortcut-list">
        <div><span>Pomeri platno</span><kbd>Space + prevlačenje</kbd></div>
        <div><span>Zumiranje</span><kbd>Ctrl + scroll</kbd></div>
        <div><span>Horizontalno pomeranje</span><kbd>Shift + scroll</kbd></div>
        <div><span>Prav zid</span><kbd>Shift + klik</kbd></div>
        <div><span>Završi niz zidova</span><kbd>Enter</kbd></div>
        <div><span>Pomeri izabrani element (1 cm)</span><kbd>↑ ↓ ← →</kbd></div>
        <div><span>Veći pomak (10 cm)</span><kbd>Shift + strelica</kbd></div>
        <div><span>Rotiraj / promeni šarku</span><kbd>R</kbd></div>
        <div><span>Poništi / ponovi</span><kbd>Ctrl + Z / Shift + Z</kbd></div>
        <div><span>Završi alat</span><kbd>Esc</kbd></div>
      </div>
      <p class="help-note">
        Nameštaj pomeraš u sva četiri smera. Vrata pomeraš strelicama levo/desno duž zida, do
        njegovih krajeva. Kod kota se pomera samo odstojanje; zidovi se ne pomeraju strelicama.
      </p>
      <p class="help-note">
        Kota se postavlja u tri klika: početak, kraj, pa odstojanje. Vrata prate stranu zida; male
        promene položaja duž zida menjaju šarku. Obe opcije možeš promeniti i u svojstvima vrata.
      </p>
      <p class="help-note">
        Nazivi soba i površine u početnom primeru su ilustrativni i ne preračunavaju se pri izmeni
        zidova. Projekti se čuvaju lokalno; JSON fajl služi kao prenosiva kopija.
      </p>
    </div>
  </div>{/if}
