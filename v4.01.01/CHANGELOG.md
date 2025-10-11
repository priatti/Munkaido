v3.03.05 - 2025-10-04
Javítások és Fejlesztések 🛠️
Riport Generálás UI/UX Javítása: A "Havi riport" generálásakor a felesleges HTML táblázat helyett egy új, esztétikus visszajelző panel jelenik meg. Ez egyértelműen, a kiválasztott nyelven jelzi a sikeres műveletet, és nem okoz többé megjelenítési hibákat mobilon.

Új "Toast" Értesítés: A sikeres riportkészítést egy modern, felugró értesítés is megerősíti a képernyő jobb felső sarkában.

Kritikus Fordítási Hiba Javítása: Javítva egy hiba a translations.js fájlban, ami miatt az új funkciók szövegei hibásan (undefined) vagy egyáltalán nem jelentek meg. A fájl javításra és a hiányzó kulcsokkal való kiegészítésre került.

v3.03.04 - 2025-10-04
Új Funkció ✨
A raklap riport generálásánál időszakos szűrési lehetőség lett beépítve. Mostantól lehetőség van havi vagy egyéni (tól-ig) dátumtartományra is riportot készíteni.

Kritikus Hibajavítás ❗
Adatvesztési hiba javítva a raklap modulban. A korábbi mentési logika egy hálózati hiba esetén képes volt a teljes raklap adatbázist törölni. Ez most egy biztonságos, tételenkénti mentési és törlési logikára lett cserélve, ami megakadályozza a jövőbeli adatvesztést.

Javítások és Fejlesztések 🛠️
Javítva egy hiba, ami miatt a Statisztika oldalon a diagramok elnyúltak, amikor az egérkurzort föléjük vitték. A diagramok mostantól fix magasságú tárolóban jelennek meg.

A Raklapok listájában a szerkesztés és törlés gombokról eltávolításra került a szöveges felirat, a letisztultabb kinézet érdekében. A funkciót az ikon fölé vitt egérkurzorral megjelenő tooltip jelzi.

Javítva egy UI hiba, ahol a raklap riport készítésénél duplikált gombok jelentek meg a felugró ablak mögött.

Több SyntaxError hiba javítása a pallets.js és database.js fájlokban, amelyek az alkalmazás indulását akadályozták.

Javítva egy hiba, ami miatt az alsó navigációs sáv alatt egy felesleges szürke sáv jelent meg.
## v3.03.02 - 2025-10-03

### Javítások és Finomhangolás 🛠️

* **PWA Vizuális Hiba Javítása:** Javítva egy CSS hiba, ami miatt a bejelentkezési képernyőn az ikonok helytelenül, nagy méretben jelentek meg a telepített PWA alkalmazásban.
* **PWA Név Frissítése:** A telepített alkalmazás neve és rövid neve "Munkaidő Pro"-ról a helyes "GuriGO"-ra lett frissítve a `manifest.json` fájlban.
* **Verziószám Pontosítása:** Az alkalmazáson belüli "Névjegy" menüpontban és a központi konfigurációs fájlban is frissítve lett a verziószám `v3.03.02`-re.
## v3.03.01 - 2025-10-03

### Újdonságok ✨

* **Teljesen új, önálló bejelentkezési képernyő** került bevezetésre, amely az alkalmazás indításakor fogadja a felhasználót.
* **E-mail és jelszó alapú regisztráció és bejelentkezés** a Google opció mellett, hogy a felhasználók több módon is létrehozhassák fiókjukat.
* **Vendég mód** lehetővé teszi az alkalmazás kipróbálását regisztráció nélkül. Az adatok helyben, a böngészőben tárolódnak, amire egy figyelmeztetés is felhívja a figyelmet.
* **Automatikus adatmigráció vendég módból.** Amikor egy vendég felhasználó regisztrál vagy bejelentkezik (Google vagy e-mail), a helyben rögzített munkaidő- és raklapadatai automatikusan átkerülnek az új, felhőalapú fiókjába, így nem vesznek el.

### Fejlesztések 🎨

* A bejelentkezési képernyő egy **modern, a program arculatához méltó dizájnt** kapott, tematikus, kamionos háttérképpel, áttetsző "üveg" kártyával és ikonokkal ellátott beviteli mezőkkel.
* A Google bejelentkezési gomb mérete és stílusa finomítva lett egy szolidabb, letisztultabb megjelenés érdekében.
* A Beállítások menüben a vendég felhasználók mostantól nemcsak Google, hanem **e-mail/jelszó párossal is létrehozhatják végleges fiókjukat**.

### Javítások 🛠️

* Javítva több kritikus JavaScript szintaktikai hiba (`SyntaxError`, `ReferenceError`), amelyek megakadályozták az alkalmazás helyes elindulását.
* Javítva egy hiba, ami miatt a Beállítások menüben lévő **"Kijelentkezés" gomb nem működött**.
* Javítva egy logikai hiba, ami miatt a betöltőképernyő (splash screen) nem tűnt el az új, még be nem jelentkezett felhasználók számára.
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
