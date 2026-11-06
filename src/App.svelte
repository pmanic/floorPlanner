<script>
  import { createEditor } from './editor/createEditor.svelte.js';
  import ProjectHeader from './components/layout/ProjectHeader.svelte';
  import ToolSidebar from './components/layout/ToolSidebar.svelte';
  import PlanCanvas from './components/layout/PlanCanvas.svelte';
  import Inspector from './components/layout/Inspector.svelte';
  import StatusBar from './components/layout/StatusBar.svelte';
  import EditorDialogs from './components/dialogs/EditorDialogs.svelte';
  const editor = createEditor();
</script>

<svelte:window
  onkeydown={editor.keyDown}
  onkeyup={editor.keyUp}
  onblur={editor.cancelInteraction}
/>
<div class="app-shell">
  <ProjectHeader {editor} />
  <div class="workspace"><ToolSidebar {editor} /><PlanCanvas {editor} /><Inspector {editor} /></div>
  <StatusBar {editor} />
</div>
<EditorDialogs {editor} />
