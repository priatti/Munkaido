<?php
// Beolvassa az aktuális verzió nevét a CURRENT fájlból
$current = trim(file_get_contents(__DIR__ . "/CURRENT"));

// Az aktuális verzió elérési útja
$releaseDir = __DIR__ . "/releases/" . $current;

// A kiadott verzió index.html fájlja
$indexFile = $releaseDir . "/index.html";

if (file_exists($indexFile)) {
    // Beolvassa az index.html tartalmát
    $html = file_get_contents($indexFile);

    // Base href beállítása, hogy a relatív hivatkozások jók legyenek
    $html = preg_replace(
        '/<head>/i',
        "<head>\n<base href=\"/releases/$current/\">",
        $html,
        1
    );

    echo $html;
} else {
    echo "<h1>Hiba: nincs ilyen verzió ($current)</h1>";
}
?>