(function (global) {
  const KEY = 'nuvioEnhanced.addons';
  function normalizeManifestUrl(input) { const raw=String(input||'').trim(); if(!raw) throw new Error('Informe a URL do manifest.'); let url=raw; if(url.startsWith('stremio://')) url='https://'+url.slice('stremio://'.length); if(!/^https?:\/\//i.test(url)) throw new Error('Use uma URL http(s) de manifest.'); if(!/manifest\.json(?:\?|$)/i.test(url)) url=url.replace(/\/$/,'')+'/manifest.json'; return url; }
  function baseFromManifest(url){return url.replace(/\/manifest\.json(?:\?.*)?$/i,'');}
  async function fetchJson(url,timeoutMs){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs||12000);try{const res=await fetch(url,{signal:controller.signal,cache:'no-store'});if(!res.ok)throw new Error('HTTP '+res.status);return await res.json();}finally{clearTimeout(timer);}}
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'[]');}catch(_){return[];}}
  function save(addons){localStorage.setItem(KEY,JSON.stringify(addons));}
  async function install(url){const manifestUrl=normalizeManifestUrl(url);const manifest=await fetchJson(manifestUrl);if(!manifest||!manifest.id||!manifest.name)throw new Error('Manifest inválido.');const addons=load().filter(a=>a.manifestUrl!==manifestUrl&&a.id!==manifest.id);const item={id:manifest.id,name:manifest.name,version:manifest.version||'',manifestUrl,baseUrl:baseFromManifest(manifestUrl),manifest};addons.push(item);save(addons);return item;}
  function remove(id){save(load().filter(a=>a.id!==id));}
  function endpoint(addon,resource,type,id,extra){const base=addon.baseUrl.replace(/\/$/,'');let path='/'+resource+'/'+encodeURIComponent(type||'')+'/'+encodeURIComponent(id||'');if(extra&&Object.keys(extra).length){const parts=Object.entries(extra).filter(([,v])=>v!==undefined&&v!==null&&v!=='').map(([k,v])=>encodeURIComponent(k)+'='+encodeURIComponent(v));if(parts.length)path+='/'+parts.join('&');}return base+path+'.json';}
  async function getCatalog(addon,type,id,extra){return fetchJson(endpoint(addon,'catalog',type,id,extra),15000);} async function getMeta(addon,type,id){return fetchJson(endpoint(addon,'meta',type,id),15000);} async function getStreams(addon,type,id){return fetchJson(endpoint(addon,'stream',type,id),20000);}
  function catalogs(){const out=[];for(const addon of load()){const manifest=addon.manifest||{};for(const catalog of(manifest.catalogs||[]))out.push({addon,catalog});}return out;}
  global.NuvioAddons={load,install,remove,catalogs,getCatalog,getMeta,getStreams,fetchJson};
})(window);
