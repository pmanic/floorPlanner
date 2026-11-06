import { performance } from 'node:perf_hooks';
import { createKitchenIndex, buildKitchenEdges, snapIndexed } from '../src/lib/spatialIndex.js';
import { samplePlan } from '../src/lib/catalog.js';
import { createHistory } from '../src/editor/history.js';

/** Reports local algorithm timing; deliberately does not label Node measurements as browser INP. */
function benchmark() {
  const rows = [];
  for (const count of [100, 1000, 5000]) {
    const items = [];
    for (let i = 0; i < count; i++)
      items.push({
        id: String(i),
        x: (i % 50) * 60,
        y: Math.floor(i / 50) * 140,
        w: 60,
        h: 60,
        rotation: 0,
        kitchen: true,
      });
    const start = performance.now(),
      index = createKitchenIndex(items);
    buildKitchenEdges(items);
    const build = performance.now() - start;
    const candidate = { ...items[Math.floor(count / 2)], id: 'moving', x: 607, y: 4 };
    const queries = performance.now();
    for (let i = 0; i < 1000; i++) snapIndexed(candidate, index, true);
    rows.push({
      elements: count,
      indexAndEdgesMs: Number(build.toFixed(2)),
      thousandSnapQueriesMs: Number((performance.now() - queries).toFixed(2)),
      nearbyCandidates: index.query(candidate).length,
    });
  }
  const history = createHistory(),
    plan = samplePlan(),
    start = performance.now();
  for (let i = 0; i < 10000; i++) {
    history.record(plan);
    history.undo(plan);
    history.redo(plan);
  }
  console.table(rows);
  console.log(`10,000 reference-history cycles: ${(performance.now() - start).toFixed(2)} ms`);
  console.log('These are Node algorithm timings, NOT INP or browser render measurements.');
}
benchmark();
