// App-shell cache – bump, hogy biztos frissüljön
const CACHE_NAME = 'munkaido-v9.11.8';
const APP_SHELL = [
  './','./index.html','./style.css','./script.js','./manifest.webmanifest','./splash.png'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE_NAME?null:caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e=>{
  const req=e.request;
  e.respondWith(
    caches.match(req).then(cached=>cached||fetch(req).then(res=>{
      const url=new URL(req.url);
      if(url.origin===self.location.origin && req.method==='GET'){
        caches.open(CACHE_NAME).then(c=>c.put(req,res.clone()));
      }
      return res;
    }).catch(()=>{
      if(req.headers.get('accept')?.includes('text/html')) return caches.match('./index.html');
    }))
  );
}); 
