/** Clones the committed SVG layers into a dedicated A4 iframe, validates physical scale and invokes the browser print dialog.
 * @param {any} options Input for this operation.
 */
export async function printSelection({
  plan,
  unit,
  printRect,
  printScale,
  printOrientation,
  notify,
}) {
  const r = printRect;
  if (!r) return;
  const content = document.getElementById('plan-content').cloneNode(true);
  content.querySelectorAll('.editing-only').forEach(
    /** Removes editor-only decorations from the printable clone.
     * @param {any} n Coordinate in centimeters.
     */
    (n) => n.remove(),
  );
  content.querySelectorAll('[data-id]').forEach(
    /** Removes interaction metadata from the printable clone.
     * @param {any} n Coordinate in centimeters.
     */
    (n) => n.removeAttribute('data-id'),
  );
  const landscape = printOrientation === 'landscape',
    paperW = landscape ? 277 : 190,
    paperH = landscape ? 170 : 257;
  const scale =
    printScale === 'fit'
      ? Math.min(paperW / (r.w * 10), paperH / (r.h * 10))
      : 1 / Number(printScale);
  const width = r.w * 10 * scale,
    height = r.h * 10 * scale;
  if (width > paperW + 0.1 || height > paperH + 0.1) {
    notify('Izabrana razmera ne staje na A4. Izaberi „Uklopi na papir“.');
    return;
  }
  let frame = document.getElementById('print-frame');
  if (frame) frame.remove();
  frame = document.createElement('iframe');
  frame.id = 'print-frame';
  frame.style.cssText = 'position:fixed;width:1px;height:1px;left:-10000px;top:0;border:0;';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  doc.open();
  doc.write(
    `<!doctype html><html><head><title>Forma — plan</title><style>@page{size:A4 ${printOrientation};margin:10mm}body{margin:0;font-family:Arial,sans-serif;color:#34382d}header{display:flex;justify-content:space-between;font-size:11px;border-bottom:1px solid #aaa;padding-bottom:3mm;margin-bottom:3mm}main{display:flex;justify-content:center}svg{max-width:none;flex-shrink:0}text{font-family:Arial,sans-serif}.room-name{font-size:11px;letter-spacing:2.2px;fill:#858c78;font-weight:500}.room-area{font-size:13px;fill:#929984}.editing-only{display:none}footer{font-size:9px;color:#777;margin-top:3mm}</style></head><body><header><strong id="title"></strong><span>FORMA / PLAN PROSTORA</span></header><main><svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="${r.x} ${r.y} ${r.w} ${r.h}"><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="white"/>${content.outerHTML}</svg></main><footer id="footer"></footer></body></html>`,
  );
  doc.close();
  doc.getElementById('title').textContent = plan.name;
  doc.getElementById('footer').textContent =
    `A4 · Razmera 1:${Math.round((1 / scale) * 10) / 10} · Mere: ${unit} · Štampati na 100%, bez dodatnog skaliranja`;
  await new Promise(
    /** Allows the print document to finish layout before opening the browser dialog.
     * @param {any} resolve Input for this operation.
     */
    (resolve) => setTimeout(resolve, 200),
  );
  frame.contentWindow.focus();
  frame.contentWindow.print();
  return true;
}
