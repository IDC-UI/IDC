const C='idc-v20',A=['./','index.html','404.html','idc-plus.js','idc-intro.js','idc-intro.css','manifest.json','favicon.png','apple-touch-icon.png','icon-192.png','icon-512.png','supabase-config.js','idc-supabase.js','idc-private.js','idc-settings.js','idc-bank.js'],Q='https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>caches.open(C).then(c=>c.add(Q).catch(()=>{}))));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
// SECURITY: only the app shell is cached. Supabase API/Storage responses (authenticated, per-user data)
// and every other cross-origin request go straight to the network and are never written to the cache.
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET')return;
  if(u.origin!==self.location.origin&&r.url!==Q)return;
  if(r.headers.has('authorization'))return;
  e.respondWith(fetch(r).then(res=>{if(res.ok&&res.type!=='opaque'){const c=res.clone();caches.open(C).then(x=>x.put(r,c))}return res}).catch(()=>caches.match(r).then(x=>x||caches.match('index.html'))))
});
