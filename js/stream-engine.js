(function(global){
const RESOLUTION_SCORE={'2160p':520,'4k':520,'1080p':350,'720p':190,'480p':70};
const QUALITY_TERMS=[
  [/remux/i,220],[/blu[ .-]?ray|bluray/i,130],[/web[ .-]?dl|webdl/i,80],[/web[ .-]?rip|webrip/i,45],
  [/hdr10\+|hdr10plus/i,48],[/dolby[ .-]?vision|\bdv\b/i,46],[/\bhdr\b/i,35],[/hevc|x265|h\.265/i,28],[/av1/i,18],
  [/truehd.*atmos|atmos.*truehd/i,36],[/truehd/i,30],[/dts[ .-]?hd|dts:x/i,28],[/eac3|dd\+/i,14],[/aac/i,4],
  [/cam|hdcam|telesync|telecine|\bts\b/i,-700]
];
const RELEASE_GROUP_TIERS=[
  {points:75,re:/fraMeSToR|CiNEPHiLES|EPSiLON|WiLDCAT|KRaLiMaRKo|BLURANiUM|PmP/i},
  {points:55,re:/FLUX|HONE|NTb|CMRG|TEPES|playWEB|W4NK3R|BYNDR/i},
  {points:35,re:/DON|HiDt|CtrlHD|Geek|BMF|decibeL|NCmt/i}
];
const warmCache=new Map();
function textOf(stream){return[stream.name,stream.title,stream.description,stream.behaviorHints&&stream.behaviorHints.filename].filter(Boolean).join(' ')}
function qualityLabel(stream){const t=textOf(stream);if(/2160p|\b4k\b/i.test(t))return'4K';if(/1080p/i.test(t))return'1080p';if(/720p/i.test(t))return'720p';if(/480p/i.test(t))return'480p';return'AUTO'}
function sourceUrl(stream){if(stream&&stream.url&&/^https?:\/\//i.test(stream.url))return stream.url;if(stream&&stream.externalUrl&&/^https?:\/\//i.test(stream.externalUrl))return stream.externalUrl;return null}
function isPlayable(stream){return!!sourceUrl(stream)}
function score(stream){
  const t=textOf(stream),lower=t.toLowerCase();let value=0;
  for(const term of Object.keys(RESOLUTION_SCORE))if(lower.includes(term))value+=RESOLUTION_SCORE[term];
  for(const item of QUALITY_TERMS)if(item[0].test(t))value+=item[1];
  for(const tier of RELEASE_GROUP_TIERS)if(tier.re.test(t)){value+=tier.points;break}
  const size=Number(stream&&stream.behaviorHints&&stream.behaviorHints.videoSize||0);
  if(size>90*1024**3)value+=40;else if(size>55*1024**3)value+=30;else if(size>20*1024**3)value+=18;
  if(isPlayable(stream))value+=120;else value-=250;
  if(stream&&stream.ytId)value-=500;
  if(/sample|trailer/i.test(t))value-=300;
  return value;
}
function rank(streams,enabled){const copy=[...(streams||[])];return enabled===false?copy:copy.sort((a,b)=>score(b)-score(a))}
function displayName(stream){return stream.title||stream.name||(stream.behaviorHints&&stream.behaviorHints.filename)||'Fonte'}
function sizeLabel(stream){const n=Number(stream.behaviorHints&&stream.behaviorHints.videoSize||0);if(!n)return'';const gb=n/1024**3;return gb>=1?gb.toFixed(gb>=10?0:1)+' GB':(n/1024**2).toFixed(0)+' MB'}
function describe(stream){const t=textOf(stream);const tags=[];tags.push(qualityLabel(stream));if(/remux/i.test(t))tags.push('REMUX');if(/dolby[ .-]?vision|\bdv\b/i.test(t))tags.push('DV');else if(/hdr10\+|hdr10plus/i.test(t))tags.push('HDR10+');else if(/\bhdr\b/i.test(t))tags.push('HDR');if(/truehd/i.test(t))tags.push(/atmos/i.test(t)?'TrueHD Atmos':'TrueHD');else if(/dts[ .-]?hd/i.test(t))tags.push('DTS-HD');if(/hevc|x265|h\.265/i.test(t))tags.push('HEVC');return tags.join(' · ')}
async function warm(url,timeoutMs,rangeBytes){
  if(!url)return{ok:false,reason:'no-url'};
  const key=url+'|'+String(rangeBytes||262144);const cached=warmCache.get(key);if(cached&&Date.now()-cached.at<45000)return cached.value;
  const controller=new AbortController();const started=performance.now();const timer=setTimeout(()=>controller.abort(),timeoutMs||2400);const bytesWanted=Math.max(65536,rangeBytes||262144);
  try{
    const res=await fetch(url,{method:'GET',headers:{Range:'bytes=0-'+(bytesWanted-1)},cache:'no-store',signal:controller.signal});
    let bytes=0;try{bytes=(await res.arrayBuffer()).byteLength}catch(_){}
    const ms=Math.max(1,performance.now()-started);const value={ok:res.ok||res.status===206,status:res.status,ms,bytes,mbps:bytes?(bytes*8/ms/1000):0,host:safeHost(url)};
    warmCache.set(key,{at:Date.now(),value});return value;
  }catch(err){const value={ok:false,reason:err&&err.name==='AbortError'?'timeout':'cors-or-network',ms:performance.now()-started,host:safeHost(url)};warmCache.set(key,{at:Date.now(),value});return value}
  finally{clearTimeout(timer)}
}
async function warmTop(streams,count){const candidates=(streams||[]).filter(isPlayable).slice(0,count||3);const results=await Promise.all(candidates.map(async stream=>({stream,result:await warm(sourceUrl(stream),2200,262144)})));return results.sort((a,b)=>{if(a.result.ok!==b.result.ok)return a.result.ok?-1:1;if(a.result.mbps&&b.result.mbps)return b.result.mbps-a.result.mbps;return score(b.stream)-score(a.stream)})}
async function speedTest(url){
  if(!url)return{ok:false,reason:'no-url'};const samples=[];for(const bytes of[512*1024,2*1024*1024,6*1024*1024]){const r=await warm(url,6500,bytes);if(!r.ok)break;samples.push(r)}
  if(!samples.length)return{ok:false,reason:'unmeasurable'};const speeds=samples.map(s=>s.mbps).filter(Boolean);const average=speeds.reduce((a,b)=>a+b,0)/Math.max(1,speeds.length);const min=speeds.length?Math.min(...speeds):0;const max=speeds.length?Math.max(...speeds):0;return{ok:true,averageMbps:average,minMbps:min,maxMbps:max,stability:max?min/max:0,samples,host:safeHost(url)}
}
function safeHost(url){try{return new URL(url).host}catch(_){return'—'}}
async function findStreams(type,id,onAddonResult){
  const addons=NuvioAddons.load().filter(a=>((a.manifest&&a.manifest.resources)||[]).some(r=>(typeof r==='string'?r:r.name)==='stream'));const collected=[];
  await Promise.all(addons.map(async addon=>{try{const data=await NuvioAddons.getStreams(addon,type,id);const streams=(data.streams||[]).map(s=>Object.assign({_addonName:addon.name,_addonId:addon.id},s));collected.push(...streams);if(onAddonResult)onAddonResult(addon,streams,null)}catch(err){if(onAddonResult)onAddonResult(addon,[],err)}}));
  const rankingEnabled=localStorage.getItem('nuvioEnhanced.ranking')!=='false';return rank(collected,rankingEnabled)
}
global.NuvioStreams={rank,score,qualityLabel,displayName,sizeLabel,sourceUrl,isPlayable,describe,warm,warmTop,speedTest,findStreams};
})(window);
