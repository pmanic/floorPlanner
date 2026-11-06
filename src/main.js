import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';
import { startPerformanceDiagnostics } from './performance/diagnostics.js';
mount(App, { target: document.getElementById('app') });
void startPerformanceDiagnostics();
