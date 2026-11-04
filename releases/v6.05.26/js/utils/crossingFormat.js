/**
 * Határátlépés megjelenítés és km óra (opcionális) parsolás.
 */
(function (global) {
  function parseOdometerKmInput(raw) {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (s === '') return null;
    const n = parseInt(s.replace(/\s/g, ''), 10);
    if (!Number.isFinite(n) || n < 0) return null;
    if (n > 9999999) return null;
    return n;
  }

  function formatCrossingTimePart(c, record) {
    return (c && c.time) ? c.time : '';
  }

  /**
   * Lista / kártya: zárójelben idő [ · km egység] — egy sor.
   */
  function formatCrossingParenthetical(c, record, i18n) {
    const unit = (i18n && i18n.crossingOdometerUnit) || 'km';
    const timePart = formatCrossingTimePart(c, record);
    const od = c && c.odometerKm != null ? Number(c.odometerKm) : NaN;
    if (Number.isFinite(od) && od >= 0) {
      return timePart + ' · ' + String(Math.round(od)) + ' ' + unit;
    }
    return timePart;
  }

  /**
   * Csak riport (HTML előnézet, PDF): ha van km, két sor — felül útvonal+idő, alul km.
   * @param {string} lineBreak '\n' (PDF) vagy '<br>' (HTML)
   */
  function formatCrossingReportBlock(c, record, i18n, lineBreak) {
    const lb = lineBreak == null ? '\n' : lineBreak;
    const unit = (i18n && i18n.crossingOdometerUnit) || 'km';
    const route = `${c.from}-${c.to}`;
    const timePart = formatCrossingTimePart(c, record);
    const od = c && c.odometerKm != null ? Number(c.odometerKm) : NaN;
    if (Number.isFinite(od) && od >= 0) {
      return `${route} (${timePart})${lb}${Math.round(od)} ${unit}`;
    }
    return `${route} (${timePart})`;
  }

  global.parseOdometerKmInput = parseOdometerKmInput;
  global.formatCrossingTimePart = formatCrossingTimePart;
  global.formatCrossingParenthetical = formatCrossingParenthetical;
  global.formatCrossingReportBlock = formatCrossingReportBlock;
})(typeof window !== 'undefined' ? window : global);
