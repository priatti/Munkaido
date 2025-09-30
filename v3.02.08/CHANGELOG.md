# GuriGO – Változásnapló (CHANGELOG)

Ez a fájl tartalmazza a GuriGO kiadásainak főbb változásait.  
A verziózás szabálya: **FŐ.KISEBB.JAVÍTÁS**

---

## [3.01.02] – 2025-09-29
### Megjegyzés
- Ettől a verziótól kezdődik a hivatalos dokumentált verziózás.
- A korábbi kiadások nem kerültek visszamenőleg rögzítésre.

### Újdonságok
- Alap funkciók stabilizálása: indítás, befejezés, teljes nap, riport PDF export.
- Verziószám kiírás a láblécben.

### Javítások
- Indítás oldalon a heti vezetési idő és kezdő kilométer az utolsó zárásból ajánlódik.
- PDF riport időformátum javítás (00:59 → 0:59).
- GPS mező automatikus kitöltése a befejezésnél is működik.

---

## [3.02.01] – 2025-09-30
### Újdonságok
- Nap lezárása és teljes nap funkció stabilizálása.
- Hibás funkciók javítása (3.01.01/3.01.02-höz képest).

---

## [3.02.04] – 2025-10-01
### Javítások
- Betöltési sorrend javítása az `index.html`-ben.
- A `dataHelpers.js` most a `tachograph.js` előtt töltődik be → a „Nap lezárása” újra működik.
- Konzol hibák megszüntetése: `getLatestRecord is not defined`.

---

## [3.02.05] – 2025-10-02
### Javítások
- PDF megosztás funkció: ha az eszköz/PWA nem támogatja a Web Share API-t, barátságos üzenetet mutat.  
- Üzenetek kétnyelvűek (magyar + német).
- „Permission denied” hiba többé nem jelenik meg felhasználónak.


---

## [3.02.06] – 2025-10-02
### Újdonságok
- „Megnyitás rendszer nézőben” fallback: ha a megosztás nem támogatott (pl. Samsung Internet PWA), a PDF megnyílik a rendszer beépített PDF-nézőjében.

### Javítások
- Finomhangolt üzenetek (HU/DE) megosztásnál.
