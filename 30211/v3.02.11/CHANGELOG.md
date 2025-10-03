## v3.02.11f - 2025-10-02
- Teljes nap: addCrossingRow függvény szintaxis-hiba javítva (stray token eltávolítva).
- Lista fül várhatóan helyreáll; renderRecords ismét inicializálódik.
- Verzió frissítés: v3.02.11f.

## v3.02.11e - 2025-10-02
- Beállítások menü: duplikált 'Súgó' blokkok eltávolítva.
- Lista fül: fallback betöltés LocalStorage-ból, ha a rekordtömb üresnek látszana.
- Verzió frissítés: v3.02.11e.

## v3.02.11d - 2025-10-02
- Beállítások menü: duplikált 'Súgó' gomb eltávolítva.
- Névjegy: szlogen hozzáadva („Egy kamionos, aki appot készít.”).
- Áttekintés: jogi/kapcsolat blokk az oldal alján, verzióval.
- Verzió frissítés: v3.02.11d.

## v3.02.11c - 2025-10-02
- Új 'Névjegy' fül a Beállítások menüben, Impresszum és verzió információ.
- Verzió frissítés: v3.02.11c.

## v3.02.11b - 2025-10-02
- Copyright + kapcsolat blokk a Beállítások és Súgó lap **alján** jelenik meg, verziószámmal.
- Verzió frissítés: v3.02.11b.

## v3.02.11
- A szerzői jog + kontakt most a Beállítások és Súgó lap alján jelenik meg (nem sticky); az alsó navigációval ütközést elkerüli.

- Sticky lábléc hozzáadva: © 2025 Princz Attila | GuriGO — info@gurigo.eu
 - 2025-10-02
- Javítva a 'Teljes nap' fül új átlépés gomb hibája.
- Javítva az 'Indítás' fül Honnan mező automatikus kitöltése.
- Splash képernyő kezelése javítva.
- Verziószám frissítve, hozzáadva Copyright és kapcsolat: info@gurigo.eu.

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
