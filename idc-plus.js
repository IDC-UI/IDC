/* IDC plus: طوارئ بدون لوجين + تشفير طرف-لطرف + عارض صور + تثبيت كتطبيق */
(function(){
var b64=function(u){return btoa(String.fromCharCode.apply(null,u)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
var ub64=function(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return Uint8Array.from(atob(s),function(c){return c.charCodeAt(0)})};
var enc=new TextEncoder(),dec=new TextDecoder();
/* ---- تشفير AES-GCM (المفتاح مابيسيبش جهاز المستخدم / الكارت) ---- */
window.IDCrypto={
 async newKey(){return crypto.getRandomValues(new Uint8Array(16))},
 async _k(raw){return crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt'])},
 async enc(obj,raw){var iv=crypto.getRandomValues(new Uint8Array(12)),ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},await this._k(raw),enc.encode(JSON.stringify(obj))));var o=new Uint8Array(12+ct.length);o.set(iv);o.set(ct,12);return b64(o)},
 async dec(s,raw){var o=ub64(s);return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:o.slice(0,12)},await this._k(raw),o.slice(12))))},
 async fromPass(p,salt){var m=await crypto.subtle.importKey('raw',enc.encode(p),'PBKDF2',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:salt,iterations:250000,hash:'SHA-256'},m,128))}
};
/* ---- وضع الطوارئ: بيفتح من غير بصمة ولا باسورد ---- */
var EM=null,emErr='';
var F=[['n','الاسم'],['nid','الرقم القومي'],['bt','فصيلة الدم'],['al','الحساسية'],['dz','أمراض / أدوية مزمنة'],['c1','اسم شخص للتواصل'],['c2','رقم تليفونه']];
var SAMPLE={n:'ماريا إبراهيم',nid:'29901011234567',bt:'O+',al:'البنسلين',dz:'لا يوجد',c1:'ميكوش',c2:'01000000000'};
function hashP(){var m=location.hash.match(/^#e=([^&]+)&k=(.+)$/);return m&&{c:m[1],k:m[2]}}
async function loadEm(){var p=hashP();if(!p)return;try{EM=await IDCrypto.dec(p.c,ub64(p.k))}catch(e){EM=false}R()}
function emView(){
 if(EM===false)return '<div class="ac"><h2 style="text-align:center">الرابط ده مش سليم</h2><div class="mu" style="text-align:center">اتأكدي إن الكارت أو الـ QR اتمسح كامل.</div></div>';
 if(!EM)return '<div class="mu" style="text-align:center;padding:40px">جاري الفتح…</div>';
 var r=F.map(function(f){return EM[f[0]]?'<div class="rw"><span class="mu">'+f[1]+'</span><b dir="auto" style="font-weight:600">'+esc(EM[f[0]])+'</b></div>':''}).join('');
 var call=EM.c2?'<a class="bt w" style="display:flex;align-items:center;justify-content:center;text-decoration:none;margin-top:16px;height:48px" href="tel:'+esc(EM.c2)+'">اتصل بـ '+esc(EM.c1||'جهة الطوارئ')+'</a>':'';
 return '<div class="ac" style="margin-top:12px"><div style="color:var(--rd);text-align:center">'+mi('emergency',44)+'</div><h2 style="text-align:center;font-size:22px;margin:6px 0 14px">معلومات الطوارئ</h2>'+r+call+'</div><div class="mu" style="text-align:center;font-size:12px;margin-top:12px">البيانات دي معروضة من غير تسجيل دخول لأن صاحبها اختار كده.</div>'}
var _R=R;R=function(){if(hashP()){document.getElementById('app').innerHTML=emView();return}_R()};
window.addEventListener('hashchange',function(){EM=null;loadEm()});
/* ---- صفحة إعداد بطاقة الطوارئ ---- */
var emSample=false,emLink='';
var _hH=hHome;hHome=function(){return _hH()+'<div class="cd it" style="cursor:pointer;margin-top:12px;--c:var(--rd)" onclick="pg={k:\'emerg\'};emLink=\'\';R()"><div class="ic">'+mi('emergency')+'</div><div class="g"><b style="font-weight:600">بطاقة الطوارئ</b><div class="mu" style="font-size:12px">بيانات تتفتح من غير باسورد لو حصل طارئ</div></div></div>'};
var _pg=page;page=function(){return pg.k=='emerg'?emPage():_pg()};
function emPage(){
 var d=emSample?SAMPLE:(S.em||{});
 var fs=F.map(function(f){return fld('em_'+f[0],f[1],{v:d[f[0]]||''})}).join('');
 return pgh('بطاقة الطوارئ')+'<div class="nt" style="margin-top:0">اختاري إنتي بس البيانات اللي عايزاها تظهر لأي حد يفتح الكارت. باقي بياناتك بتفضل مقفولة.</div>'
 +(emSample?'<div class="nt" style="color:var(--bl)">ده نموذج ببيانات تجريبية للمعاينة. دوسي «بياناتي أنا» وادخلي بياناتك الحقيقية.</div>':'')
 +fs+'<div class="ar"><button class="bt o" onclick="emSample=!emSample;R()">'+(emSample?'بياناتي أنا':'معاينة بنموذج')+'</button><button class="bt" onclick="emMake()">إنشاء الرابط و QR</button></div>'
 +(emLink?'<div class="cd" style="margin-top:16px;text-align:center"><div id="emqr" style="display:inline-block;background:#fff;padding:10px;border-radius:12px"></div><div class="mu" dir="ltr" style="font-size:11px;word-break:break-all;margin:10px 0">'+esc(emLink)+'</div><button class="bt o" onclick="emCopy()">نسخ الرابط</button><div class="mu" style="font-size:12px;margin-top:10px">البيانات متشفّرة جوه الرابط نفسه، والمفتاح موجود في الجزء اللي بعد # ومابيروحش لأي سيرفر ولا لجيت هاب.</div></div>':'');
}
window.emMake=async function(){var o={};F.forEach(function(f){o[f[0]]=v('em_'+f[0])});if(!emSample){S.em=o;sv()}var k=await IDCrypto.newKey(),c=await IDCrypto.enc(o,k);emLink=location.origin+location.pathname+'#e='+c+'&k='+b64(k);R();setTimeout(function(){var e=document.getElementById('emqr');if(e&&window.qrcode){var q=qrcode(0,'M');q.addData(emLink);q.make();e.innerHTML=q.createSvgTag(4)}else if(e)e.textContent='QR محتاج إنترنت أول مرة'},50)};
window.emCopy=function(){navigator.clipboard&&navigator.clipboard.writeText(emLink).then(function(){tst('اتنسخ')})};
/* ---- عارض الصور: بيفتح + ملخص تفاصيل الصورة على الجهاز ---- */
window.vw=function(id){var i=S.items.filter(function(x){return x.id==id})[0];if(!i||!i.att)return;
 var a=i.att,blob=d2b(a.d),url=URL.createObjectURL(blob),im=new Image();
 var o=document.createElement('div');o.className='ov';o.style.zIndex=80;o.style.alignItems='center';
 o.innerHTML='<div style="border-radius:24px;padding:14px;text-align:center;width:auto;max-width:94%"><img id="vwi" style="max-width:100%;max-height:52vh;border-radius:14px"><div id="vws" class="cd mu" style="text-align:start;margin:12px 0 0;font-size:13px;line-height:1.9">جاري التحليل…</div><div class="ar" style="margin-top:12px"><button class="bt t" id="vwx">إغلاق</button><button class="bt" id="vwd">تحميل</button></div></div>';
 document.body.appendChild(o);
 var close=function(){URL.revokeObjectURL(url);o.remove()};
 o.onclick=function(e){if(e.target==o)close()};o.querySelector('#vwx').onclick=close;o.querySelector('#vwd').onclick=function(){dla(id)};
 im.onload=function(){o.querySelector('#vwi').src=url;
  var c=document.createElement('canvas');c.width=c.height=16;var x=c.getContext('2d');x.drawImage(im,0,0,16,16);var p=x.getImageData(0,0,16,16).data,r=0,g=0,bl=0,n=256;
  for(var j=0;j<p.length;j+=4){r+=p[j];g+=p[j+1];bl+=p[j+2]}r=r/n|0;g=g/n|0;bl=bl/n|0;var br=(r*299+g*587+bl*114)/1000;
  var hue=r>g&&r>bl?'مايلة للأحمر/الدفا':g>r&&g>bl?'مايلة للأخضر':'مايلة للأزرق/البرودة';
  var kind=im.width>=im.height?'أفقية':'رأسية';
  o.querySelector('#vws').innerHTML='<b style="color:var(--tx)">'+esc(i.title||a.n)+'</b><br>صورة '+kind+' '+(br>150?'فاتحة':br<80?'غامقة':'متوسطة الإضاءة')+'، ألوانها '+hue+'<br>الأبعاد: '+im.width+'×'+im.height+' بكسل · الحجم: '+(blob.size/1024|0)+' KB · النوع: '+esc(blob.type)+'<br>نوع المستند: '+esc((TN&&TN[i.type])||i.type)+(i.issuer?' · الجهة: '+esc(i.issuer):'')+'<br><span style="font-size:12px">الملخص ده بيتحسب على جهازك وماحدش بيشوف صورتك.</span>'};
 im.onerror=function(){o.querySelector('#vws').textContent='الصورة دي مش قادر أفتحها، جربي ترفعيها تاني.'};
 im.src=url};
/* ---- تثبيت كتطبيق ---- */
var dip=null;
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();dip=e;ib()});
function ib(){if(hashP()&&false)return;if(document.getElementById('inb')||matchMedia('(display-mode: standalone)').matches)return;
 var ios=/iphone|ipad/i.test(navigator.userAgent);if(!dip&&!ios)return;if(sessionStorage.getItem('idc_ib'))return;
 var d=document.createElement('div');d.id='inb';d.style.cssText='position:fixed;inset-inline:12px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:40;background:var(--bg);border:1px solid var(--ln);border-radius:16px;padding:12px 14px;display:flex;gap:10px;align-items:center;box-shadow:0 6px 24px rgba(0,0,0,.15)';
 d.innerHTML='<div class="g" style="font-size:13px"><b>نزّلي IDC كتطبيق</b><div class="mu" style="font-size:12px">'+(dip?'يفتح أسرع ويشتغل أوفلاين':'دوسي زرار المشاركة ثم «إضافة إلى الشاشة الرئيسية»')+'</div></div>'+(dip?'<button class="bt" id="inbi" style="height:36px">تنزيل</button>':'')+'<button class="ib" id="inbx">'+mi('close')+'</button>';
 document.body.appendChild(d);
 d.querySelector('#inbx').onclick=function(){sessionStorage.setItem('idc_ib','1');d.remove()};
 var bi=d.querySelector('#inbi');if(bi)bi.onclick=function(){dip.prompt();dip.userChoice.then(function(){d.remove()})}}
if('serviceWorker' in navigator)window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})});
setTimeout(ib,2500);
loadEm();if(!hashP())R();
})();
