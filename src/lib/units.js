const centimeters = new Intl.NumberFormat('sr-RS', { maximumFractionDigits: 0 });
const meters = new Intl.NumberFormat('sr-RS', { maximumFractionDigits: 2 });

/** Formats a centimeter measurement with cached formatters; no formatter is allocated per frame.
 * @param {number} value Measurement in centimeters.
 * @param {'cm'|'m'} unit Display unit.
 * @param {boolean} [suffix=true] Whether to append the unit.
 * @returns {string} Localized measurement.
 */
export function formatMeasure(value, unit = 'cm', suffix = true) {
  const text = unit === 'm' ? meters.format(value / 100) : centimeters.format(value);
  return suffix ? `${text} ${unit}` : text;
}

/** Converts a displayed input into the canonical centimeter model.
 * @param {number|string} value Input value.
 * @param {'cm'|'m'} unit Input unit.
 * @returns {number} Centimeters; invalid numeric input remains NaN for validation.
 */
export function fromDisplayUnit(value, unit) {
  return Number(value) * (unit === 'm' ? 100 : 1);
}

/** Converts centimeters to an editable value without modifying the stored geometry.
 * @param {number} value Centimeters.
 * @param {'cm'|'m'} unit Display unit.
 * @returns {number} Value rounded to three decimal places for meters.
 */
export function toDisplayUnit(value, unit) {
  return unit === 'm' ? Number((value / 100).toFixed(3)) : value;
}
