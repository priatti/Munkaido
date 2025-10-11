<?php
// GuriGO root loader (keeps clean URL) – v3.03.01
$cur = @trim(@file_get_contents(__DIR__ . '/CURRENT'));
if (!$cur) { http_response_code(500); echo 'CURRENT is empty'; exit; }

// Normalize CURRENT: accept "v3.02.11", "releases/v3.02.11", "/releases/v3.02.11/"
$path = $cur;
if ($path === '/') { $path = '/'; }
else {
  $path = preg_replace('~^/?(releases/)?~', '/releases/', $path);
  if (substr($path, -1) !== '/') $path .= '/';
}
$releaseDir = __DIR__ . $path;
$indexFile  = $releaseDir . 'index.html';

if (!is_file($indexFile)) {
  http_response_code(500);
  echo 'Release index not found: ' . htmlspecialchars($path . 'index.html');
  exit;
}

// Read release index and inject <base> so relative paths work
$html = file_get_contents($indexFile);
if (stripos($html, '<base ') === false) {
  $html = preg_replace('~<head[^>]*>~i', '$0'."\n".'<base href="'.$path.'">', $html, 1);
}

// Output as HTML
header('Content-Type: text/html; charset=utf-8');
echo $html;