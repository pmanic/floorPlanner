<script>
  import { X, CheckCheck } from 'lucide-svelte';

  let { editor } = $props();
</script>

<footer class="statusbar">
  <div><span class="status-dot"></span><span>Spremno za tvoju sledeću ideju</span></div>
  <div>
    <span class="coordinate"
      >X: {editor.format(editor.pointer.x)}
      <span class="mx-2">Y: {editor.format(editor.pointer.y)}</span></span
    ><span class="status-separator"></span><span>Mreža: {editor.format(20)}</span><span
      class="status-separator"
    ></span><span class="local-label">Sačuvano na ovom uređaju</span><CheckCheck size={14} />
  </div>
</footer>
