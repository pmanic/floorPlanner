import fs from 'node:fs';
import { sourceFiles, inspectFunctions } from './jsdoc-analysis.mjs';

/** Enforces JSDoc coverage for every maintained function, including Svelte template callbacks. */
function checkDocumentation() {
  let total = 0,
    missing = 0;
  for (const file of sourceFiles()) {
    const source = fs.readFileSync(file, 'utf8');
    for (const entry of inspectFunctions(source, file)) {
      total++;
      if (entry.documented) continue;
      missing++;
      const line = source.slice(0, entry.start).split('\n').length;
      console.error(`${file}:${line} Missing JSDoc: ${entry.name}`);
    }
  }
  console.log(`JSDoc: ${total - missing}/${total} documented functions.`);
  if (missing) process.exitCode = 1;
}
checkDocumentation();
