(function () {
  'use strict';

  /**
   * ISO naptári nap (YYYY-MM-DD) → helyi éjfél, böngésző/locale parse nélkül.
   * @param {string} value
   * @returns {Date|null}
   */
  function parseIsoDateOnlyLocal(value) {
    if (!value || typeof value !== 'string') return null;

    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;

    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);

    if (!year || !month || !day) return null;

    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  function toLocalDateOnly(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Dokumentum lejárati dátum kanonikus értelmezése (számításhoz, nem megjelenítéshez).
   * @param {*} value Firestore Timestamp, Date, ISO "YYYY-MM-DD", millis
   * @returns {Date|null}
   */
  function parseDocumentExpiryDate(value) {
    if (value == null) return null;

    if (value instanceof Date) {
      return toLocalDateOnly(value);
    }

    if (typeof value === 'object' && typeof value.toDate === 'function') {
      return toLocalDateOnly(value.toDate());
    }

    if (typeof value === 'object' && typeof value.seconds === 'number') {
      return toLocalDateOnly(new Date(value.seconds * 1000));
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      const iso = parseIsoDateOnlyLocal(trimmed);
      if (iso) return iso;
      return null;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return toLocalDateOnly(new Date(value));
    }

    return null;
  }

  /**
   * Naptári napok száma a mai naptól a lejáratig (negatív = már lejárt).
   * @param {*} expiry
   * @param {Date} [now]
   * @returns {number|null}
   */
  function daysUntilDocumentExpiry(expiry, now) {
    const expiryDate = parseDocumentExpiryDate(expiry);
    const ref = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
    const today = toLocalDateOnly(ref);
    if (!expiryDate || !today) return null;
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    return Math.floor((expiryDate.getTime() - today.getTime()) / MS_PER_DAY);
  }

  if (typeof window !== 'undefined') {
    window.parseIsoDateOnlyLocal = parseIsoDateOnlyLocal;
    window.parseDocumentExpiryDate = parseDocumentExpiryDate;
    window.daysUntilDocumentExpiryLocal = daysUntilDocumentExpiry;
  }
})();
