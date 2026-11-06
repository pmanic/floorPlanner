import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { parse } from 'svelte/compiler';

/** Lists maintained JavaScript and Svelte files, excluding generated output and dependencies.
 * @param {string[]} [roots] Maintained source directories.
 * @returns {string[]} Sorted relative paths.
 */
export function sourceFiles(roots = ['src', 'scripts', 'tests']) {
  const result = ['vite.config.js', 'svelte.config.js'];
  for (const root of roots) visit(root);
  /** Traverses one maintained directory.
   * @param {string} directory Directory path.
   */
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (/\.(?:js|mjs|svelte)$/.test(file)) result.push(file);
    }
  }
  return result.sort();
}

/** Locates functions and their JSDoc anchors, including callbacks in Svelte markup.
 * @param {string} source File contents.
 * @param {string} filename Source filename.
 * @returns {Array<{start:number,name:string,params:string[],documented:boolean,text:string}>} Function records.
 */
export function inspectFunctions(source, filename) {
  const result = [];
  if (filename.endsWith('.svelte')) {
    const tree = parse(source, { modern: true });
    for (const section of [tree.instance, tree.module])
      if (section) {
        const start = section.content.start,
          end = section.content.end;
        inspectScript(source.slice(start, end), start);
      }
    walkMarkup(tree.fragment);
  } else inspectScript(source, 0);
  return result;
  /** Parses JS with TypeScript's syntax-only parser; no execution or type checker is needed.
   * @param {string} script JavaScript segment.
   * @param {number} offset Absolute source offset.
   */
  function inspectScript(script, offset) {
    const ast = ts.createSourceFile(
      filename,
      script,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    );
    visit(ast);
    /** Collects declarations, expressions, callbacks, accessors and object/class methods.
     * @param {import('typescript').Node} node Current syntax node.
     */
    function visit(node) {
      if (
        ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isGetAccessorDeclaration(node) ||
        ts.isSetAccessorDeclaration(node)
      ) {
        const start = offset + node.getStart(ast);
        let documented = hasDoc(start);
        const parent = node.parent;
        if (ts.isVariableDeclaration(parent))
          documented ||= hasDoc(offset + parent.parent.parent.getStart(ast));
        if (ts.isPropertyAssignment(parent)) documented ||= hasDoc(offset + parent.getStart(ast));
        if (ts.isBinaryExpression(parent) && ts.isExpressionStatement(parent.parent))
          documented ||= hasDoc(offset + parent.parent.getStart(ast));
        result.push({
          start,
          name:
            node.name?.getText(ast) ||
            (ts.isVariableDeclaration(parent) || ts.isPropertyAssignment(parent)
              ? parent.name.getText(ast)
              : 'callback'),
          params: node.parameters.map(parameterName),
          documented,
          text: node.getText(ast),
        });
      }
      ts.forEachChild(node, visit);
    }
    /** Extracts the name/pattern of a documented parameter.
     * @param {import('typescript').ParameterDeclaration} parameter Parameter node.
     * @returns {string} Name or destructuring pattern.
     */
    function parameterName(parameter) {
      return parameter.name.getText(ast);
    }
  }
  /** Walks template expressions to find inline functions omitted by the script-only parser.
   * @param {object} node Svelte/ESTree node.
   */
  function walkMarkup(node) {
    if (!node || typeof node !== 'object') return;
    if (['ArrowFunctionExpression', 'FunctionExpression'].includes(node.type)) {
      result.push({
        start: node.start,
        name: node.id?.name || 'template callback',
        params: node.params.map(expressionName),
        documented: hasDoc(node.start),
        text: source.slice(node.start, node.end),
      });
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === 'metadata') continue;
      if (Array.isArray(value)) {
        for (const item of value) walkMarkup(item);
      } else if (value && typeof value === 'object') walkMarkup(value);
    }
  }
  /** Extracts a template callback parameter as source text.
   * @param {object} node ESTree parameter.
   * @returns {string} Parameter source.
   */
  function expressionName(node) {
    return source.slice(node.start, node.end);
  }
  /** Checks whether a descriptive JSDoc block immediately precedes an anchor.
   * @param {number} start Source anchor.
   * @returns {boolean} Whether JSDoc is present.
   */
  function hasDoc(start) {
    return /\/\*\*(?:(?!\/\*|\*\/)[\s\S])*\S(?:(?!\/\*|\*\/)[\s\S])*\*\/\s*$/.test(
      source.slice(0, start),
    );
  }
}
