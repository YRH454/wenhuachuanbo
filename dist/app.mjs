import {MOTION,NavigationCycle,routeSpec} from './navigation.mjs';
import {stories} from './city-stories.mjs';
import {HOME_BACKGROUND,BackgroundCycle,backgroundSpec,validBackgroundData} from './backgrounds.mjs';
import {createZiboGuide} from './zibo-guide.mjs';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const ziboGuide=createZiboGuide(document);
const expectedHash='9b7f711c65cd10af31a70b9a61b63867fcafaf7c1680a335e3240419c893228e';
// The user's current stage is background-only; content is reserved, not displayed.
const backgroundOnly=true;
const motion=matchMedia('(prefers-reduced-motion: reduce)'),cycle=new NavigationCycle();
let data=null,variant=new URLSearchParams(location.search).get('variant')==='B'?'B':'A';
let origin=null,mapToken=0,detailToken=0,active=null,loadToken=0;
let backgroundData=null,shownBackground=null,backgroundAnimations=[];
const backdropCycle=new BackgroundCycle(src=>new Promise((resolve,reject)=>{
  const image=new Image(),timeout=setTimeout(()=>{image.onload=image.onerror=null;reject(Error('background timeout'));},15000);
  image.decoding='async';image.alt='';
  image.onload=()=>{clearTimeout(timeout);image.onload=image.onerror=null;resolve(image);};
  image.onerror=()=>{clearTimeout(timeout);image.onload=image.onerror=null;reject(Error('background failed'));};
  image.src=src;
}));
const text=(id,value)=>{$(id).textContent=value;};
const safeAsset=value=>typeof value==='string'&&/^assets\/[a-z0-9_-]+\.png$/i.test(value);
const textRecord=value=>typeof value==='string'&&/^records\/[a-z0-9_-]+\.txt$/i.test(value);
function svg(tag,attrs){const node=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))node.setAttribute(k,String(v));return node;}
function validData(d){
  return d.templateVersion==='map-base-v1'&&d.templateManifestSha256===expectedHash
    &&Array.isArray(d.cities)&&d.cities.length===16&&new Set(d.cities.map(c=>c.cityId)).size===16
    &&d.cities.every(c=>/^\d{6}$/.test(c.cityId)&&typeof c.city==='string'&&typeof c.pathD==='string'
      &&Array.isArray(c.referenceFrame?.viewBox)&&c.referenceFrame.viewBox.length===4&&c.referenceFrame.viewBox.every(Number.isFinite)&&c.variants);
}
function remember(node){
  origin={id:node.id,scroll:scrollY,shelfScroll:$('city-list').scrollTop};
  history.replaceState({...history.state,mapOrigin:origin},'');
}
function enter(event,node,city){
  if(event.button>0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();remember(node);
  location.hash='/city/'+city.cityId;
}
function selectCity(cid){
  document.querySelectorAll('.city-link').forEach(link=>link.dataset.selected=String(link.dataset.city===cid));
}
function setVariant(next){
  if(!['A','B'].includes(next))return;
  variant=next;
  document.querySelectorAll('[data-variant]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.variant===variant)));
  const url=new URL(location.href);url.searchParams.set('variant',variant);
  history.replaceState(history.state,'',url);
  if(data){drawMap();route({immediate:true,focus:false,refresh:true});}
}
document.querySelectorAll('[data-variant]').forEach(button=>button.addEventListener('click',()=>setVariant(button.dataset.variant)));
$('labels-toggle').addEventListener('change',event=>{document.body.dataset.labels=event.target.checked?'on':'off';});
function drawMap(){
  const token=++mapToken,failures=new Set();
  let pending=0;
  for(const id of['map-defs','city-art','city-links','city-labels','city-list'])$(id).replaceChildren();
  $('map').setAttribute('aria-busy','true');$('image-status').hidden=true;$('retry-images').hidden=true;
  for(const[index,city]of data.cities.entries()){
    const cid=city.cityId,tile=city.variants[variant],story=stories[cid],clip=svg('clipPath',{id:'clip-'+cid,clipPathUnits:'userSpaceOnUse'});
    clip.append(svg('path',{d:city.pathD,'fill-rule':'evenodd','clip-rule':'evenodd'}));$('map-defs').append(clip);
    const art=svg('g',{'data-city-art':cid});
    art.append(svg('path',{d:city.pathD,fill:'#e8eee9','fill-rule':'evenodd'}));
    if(tile&&safeAsset(tile.src)){
      const[x,y,width,height]=city.referenceFrame.viewBox;
      const img=svg('image',{x,y,width,height,preserveAspectRatio:'xMidYMid meet','clip-path':'url(#clip-'+cid+')',class:'city-image','data-state':'loading'});
      ++pending;let settled=false;
      const settle=state=>{
        if(token!==mapToken||settled)return;settled=true;img.dataset.state=state;--pending;
        if(!pending){$('map').setAttribute('aria-busy','false');text('progress','');if(!failures.size&&active?.kind==='map')text('live',variant==='A'?'水墨画作已载入，可选择市域或城市原图。':'工艺融合画作已载入，可选择市域或城市原图。');}
      };
      img.addEventListener('load',()=>settle('loaded'),{once:true});
      img.addEventListener('error',()=>{
        if(token!==mapToken)return;failures.add(city.city);settle('error');img.remove();
        $('image-status').hidden=false;$('retry-images').hidden=false;
        const message=[...failures].join('、')+'画作未能载入，市域与城市名入口仍可使用。';
        text('image-status',message);text('live',message);
      },{once:true});
      img.setAttribute('href',tile.src);art.append(img);
    }
    $('city-art').append(art);
    const link=svg('a',{href:'#/city/'+cid,id:'map-link-'+cid,tabindex:'0',class:'city-link','aria-label':city.city+'，'+story.object+'，进入城市文化介绍','data-city':cid});
    link.append(svg('path',{d:city.pathD,class:'boundary-under','fill-rule':'evenodd','clip-rule':'evenodd'}),svg('path',{d:city.pathD,class:'city-hit','fill-rule':'evenodd','clip-rule':'evenodd'}));
    link.addEventListener('click',event=>enter(event,link,city));
    link.addEventListener('keydown',event=>{
      if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End',' '].includes(event.key))return;
      event.preventDefault();
      if(event.key===' '){remember(link);location.hash='/city/'+cid;return;}
      const at=event.key==='Home'?0:event.key==='End'?data.cities.length-1:(index+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)+data.cities.length)%data.cities.length;
      $('map-link-'+data.cities[at].cityId).focus();
    });
    const caption=()=>text('map-caption',city.city+' · '+story.object+' · 选择此城，走近一物');
    link.addEventListener('mouseenter',caption);link.addEventListener('focus',caption);
    link.addEventListener('mouseleave',()=>text('map-caption','在地图中，选择想走近的城市。'));
    $('city-links').append(link);
    const label=svg('text',{x:city.labelPoint[0],y:city.labelPoint[1],class:'map-label'});label.textContent=city.city;$('city-labels').append(label);
    const entry=document.createElement('a');entry.href='#/city/'+cid;entry.id='city-entry-'+cid;entry.className='city-entry';
    entry.setAttribute('aria-label',city.city+'，'+story.object+'，完整画作与城市文化');
    const frame=document.createElement('span');frame.className='thumb-frame';
    const fallback=document.createElement('span');fallback.className='thumb-fallback';fallback.textContent=tile?'画作载入中':'画作暂未到达';fallback.setAttribute('aria-hidden','true');frame.append(fallback);
    if(tile&&safeAsset(tile.src)){
      const thumb=document.createElement('img');thumb.alt='';thumb.width=1254;thumb.height=1254;thumb.loading='lazy';thumb.decoding='async';thumb.dataset.state='loading';
      thumb.onload=()=>{if(token!==mapToken)return;thumb.dataset.state='loaded';fallback.hidden=true;};
      thumb.onerror=()=>{if(token!==mapToken)return;thumb.dataset.state='error';thumb.hidden=true;fallback.hidden=false;fallback.textContent='图片未载入，仍可读城';};
      thumb.src=tile.src;frame.append(thumb);
    }
    const name=document.createElement('span');name.className='city-name';name.textContent=city.city;entry.append(frame,name);
    entry.addEventListener('click',event=>enter(event,entry,city));$('city-list').append(entry);
  }
  $('map').setAttribute('aria-busy',String(pending>0));text('progress',pending?'正在载入十六城画作…':'');
}
function addList(id,values){$(id).replaceChildren();for(const value of values||[]){const li=document.createElement('li');li.textContent=value;$(id).append(li);}}
function finishBackgroundMotion(){for(const animation of backgroundAnimations)animation.cancel();backgroundAnimations=[];}
function clearBackground(spec){
  finishBackgroundMotion();shownBackground=null;$('city-background').replaceChildren();
  $('city-background').dataset.city=spec.key;$('city-background').dataset.src=HOME_BACKGROUND;
  $('city-background').dataset.state=spec.src===HOME_BACKGROUND?spec.status:'loading';
}
function describeBackground(spec){
  const entry=backgroundData?.cities.find(c=>c.cityId===spec.key),ready=entry?.status==='ready';
  text('background-description',ready?entry.city+' · '+entry.title+' · '+entry.aiLabel+'。按本市最后完成稿选用，与上方画作风格切换无关；非真实地点、器物或历史还原。':'本市地域背景尚未到达，当前使用首页山海背景，不借用其他城市图片。');
  $('background-details').replaceChildren();$('background-links').replaceChildren();
  if(!ready)return;
  for(const[label,value]of[['背景版本',entry.revision],['生成工具',entry.generationTool],['原生尺寸',entry.width+' × '+entry.height],['原图SHA-256',entry.sha256],['来源原图',entry.sourcePath]]){
    const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;$('background-details').append(dt,dd);
  }
  for(const[label,src]of[['查看完整背景原图',entry.src],['查看背景生成记录',entry.promptSrc]]){
    const a=document.createElement('a');a.href=src;a.textContent=label;a.target='_blank';a.rel='noopener';$('background-links').append(a);
  }
}
async function displayBackground(ticket){
  if(!backdropCycle.current(ticket))return;
  const spec=ticket.spec,same=shownBackground?.key===spec.key&&shownBackground.src===spec.src;
  describeBackground(spec);$('retry-background').hidden=true;
  if(same){$('background-status').hidden=true;return;}
  clearBackground(spec);
  $('background-status').hidden=spec.status==='home';
  text('background-status',spec.status==='fallback'?'本市地域背景尚未到达，暂用山海背景。':'正在载入'+(spec.city||'本市')+'地域背景…');
  const result=await backdropCycle.settle(ticket);
  if(!result)return;
  const resolved=result.spec;
  if(resolved.src===HOME_BACKGROUND){
    $('city-background').dataset.state=resolved.status;
    $('background-status').hidden=resolved.status==='home';
    if(resolved.status==='error'){text('background-status','本市地域背景暂时未能载入，已回退山海背景；文化介绍仍可阅读。');$('retry-background').hidden=false;}
    return;
  }
  const plane=result.image;plane.style.setProperty('--desktop-focus',resolved.desktopFocus);plane.style.setProperty('--mobile-focus',resolved.mobileFocus);
  $('city-background').replaceChildren(plane);
  $('city-background').dataset.state='loaded';$('city-background').dataset.src=resolved.src;
  shownBackground=resolved;$('background-status').hidden=true;
  if(!motion.matches&&typeof plane.animate==='function'){
    backgroundAnimations=[plane].map(node=>node.animate([{opacity:0},{opacity:1}],{duration:MOTION.entrance,iterations:1,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'}));
    const animations=backgroundAnimations;
    Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(()=>{for(const a of animations)a.cancel();if(backgroundAnimations===animations)backgroundAnimations=[];});
  }
}
function renderCity(city){
  const token=++detailToken,tile=city.variants[variant],story=stories[city.cityId];
  if(backgroundOnly){text('city-title',city.city);return;}
  text('city-title',city.city);text('culture-title',story.title);text('culture-intro',story.intro);text('culture-reading',story.reading);
  text('city-panel-title',story.object+' · 画作与文化介绍');
  text('original-caption',city.city+' · '+story.object+' · '+(variant==='A'?'水墨画作':'工艺融合画作'));
  $('city-empty').hidden=!!tile;$('city-record').hidden=!tile;$('work-details').hidden=!tile;$('city-image-error').hidden=true;$('retry-detail').hidden=true;
  $('original-placeholder').hidden=false;text('original-placeholder',tile?'正在载入本市画作…':'本组画作尚未到达');
  for(const id of['original-image','masked-image']){$(id).hidden=true;$(id).removeAttribute('src');}
  text('city-subtitle',tile?tile.aiLabel+' · 原生 '+tile.width+' × '+tile.height+' · 版本 '+tile.revision:'');
  if(!tile)return;
  const failures=new Set();
  for(const[id,key,description]of[['original-image','src','完整画作'],['masked-image','maskedSrc','裁切预检']]){
    const img=$(id);img.dataset.state='loading';img.alt=city.city+story.object+'主题'+description+'，AI创意插画';
    img.onload=()=>{
      if(token!==detailToken)return;img.dataset.state='loaded';img.hidden=false;
      if(id==='original-image')$('original-placeholder').hidden=true;
    };
    img.onerror=()=>{
      if(token!==detailToken)return;img.dataset.state='error';img.hidden=true;failures.add(description);
      if(id==='original-image'){text('original-placeholder','本市画作暂时未能载入，文化介绍仍可阅读。');$('original-placeholder').hidden=false;}
      $('city-image-error').hidden=false;$('retry-detail').hidden=false;
      const message=city.city+'的'+[...failures].join('、')+'未能载入。可重试，或在作品说明中查看本市文件。';
      text('city-image-error',message);text('live',message);
    };
    if(safeAsset(tile[key]))img.src=tile[key];else img.onerror();
  }
  $('basis-list').replaceChildren();
  for(const basis of tile.culturalBasis||[]){
    const li=document.createElement('li'),description=document.createElement('p');description.textContent=basis.supports||'';
    let url;try{url=new URL(basis.url);}catch{}
    if(url?.protocol==='https:'){const a=document.createElement('a');a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=basis.title||'文化依据';li.append(a);}else li.textContent=basis.title||'文化依据';
    li.append(description);$('basis-list').append(li);
  }
  addList('imagined-list',tile.imaginedElements);addList('risk-list',tile.knownRisks);
  $('asset-details').replaceChildren();
  for(const[label,value]of[['候选身份',tile.assetId],['生成工具',tile.generationTool],['模板版本','map-base-v1'],['原图SHA-256',tile.sha256],['固定frame',city.referenceFrame.viewBox.map(n=>n.toFixed(4)).join(' / ')]]){
    const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;$('asset-details').append(dt,dd);
  }
  $('asset-links').replaceChildren();
  for(const[title,key]of[['下载完整原图','src'],['下载裁切预检','maskedSrc'],['查看完整提示词记录','promptSrc']]){
    if(key==='promptSrc'?!textRecord(tile[key]):!safeAsset(tile[key]))continue;
    const a=document.createElement('a');a.href=tile[key];a.textContent=title;
    if(key!=='promptSrc')a.download='';else{a.target='_blank';a.rel='noopener';}
    $('asset-links').append(a);
  }
}
function panel(spec){return $(spec?.kind==='map'?'map-view':spec?.kind==='city'?'city-view':'not-found');}
function commit(spec){
  ++detailToken;
  for(const id of['map-view','city-view','not-found']){$(id).hidden=true;$(id).inert=false;}
  if(spec.kind==='city'){
    const changed=active?.key!==spec.key;
    if(changed){$('work-details').open=false;$('city-info').open=false;document.querySelector('.city-panel-scroll').scrollTop=0;}
    renderCity(spec.city);
  }
  panel(spec).hidden=false;active=spec;
  document.body.dataset.view=spec.kind;$('labels-control').hidden=spec.kind!=='map';
  document.title=spec.kind==='city'?spec.city.city+' · 一物见山东':spec.kind==='map'?'一物见山东 · 文化地图':'未找到城市 · 一物见山东';
  if(spec.kind!=='map')scrollTo({top:0,behavior:'instant'});
  else {
    const saved=history.state?.mapOrigin||origin;
    if(saved){$('city-list').scrollTop=saved.shelfScroll;scrollTo({top:saved.scroll,behavior:'instant'});}
  }
}
function focusView(spec){
  if(spec.kind==='city')$('city-title').focus({preventScroll:true});
  else if(spec.kind==='missing')$('not-found').querySelector('h1').focus({preventScroll:true});
  else {
    const saved=history.state?.mapOrigin||origin;
    if(saved)$(saved.id)?.focus({preventScroll:true});else $('map-heading').focus({preventScroll:true});
  }
}
async function route({immediate=false,focus=true,refresh=false}={}){
  if(!data)return;
  const token=cycle.begin(),spec=routeSpec(location.hash,data.cities),previous=active;
  ziboGuide.sync(spec);
  document.body.dataset.transition='idle';
  for(const id of['map-view','city-view','not-found'])$(id).inert=false;
  selectCity(spec.kind==='city'?spec.key:null);
  if(previous?.key===spec.key&&!refresh){$('main').setAttribute('aria-busy','false');if(focus)focusView(spec);return;}
  const backgroundTicket=backdropCycle.begin(backgroundSpec(spec,backgroundData));
  const animate=previous&&!immediate&&!motion.matches&&typeof panel(previous).animate==='function';
  $('main').setAttribute('aria-busy','true');
  try{
    if(animate){
      document.body.dataset.transition='leaving';
      // The 100ms still-visible response lets the selected city register before the ink fades.
      await cycle.play(panel(previous),[{opacity:1},{opacity:0}],{duration:MOTION.exit,delay:MOTION.feedback,easing:'cubic-bezier(.4,0,1,1)'});
      if(!cycle.current(token))return;
    }
    commit(spec);
    void displayBackground(backgroundTicket);
    if(animate){
      document.body.dataset.transition='entering';
      const arrivals=[cycle.play(panel(spec),[{opacity:0},{opacity:1}],{duration:MOTION.entrance,easing:'cubic-bezier(.16,1,.3,1)'})];
      if(spec.kind==='city'&&!backgroundOnly){
        arrivals.push(cycle.play($('city-artwork')||document.querySelector('.city-artwork'),[{clipPath:'inset(0 0 8% 0)',transform:'translateX(-10px)'},{clipPath:'inset(0)',transform:'translateX(0)'}],{duration:MOTION.entrance,easing:'cubic-bezier(.16,1,.3,1)'}));
        arrivals.push(cycle.play(document.querySelector('.city-intro'),[{opacity:0,transform:'translateX(10px)'},{opacity:1,transform:'translateX(0)'}],{duration:MOTION.entrance-MOTION.textDelay,delay:MOTION.textDelay,easing:'cubic-bezier(.16,1,.3,1)'}));
      }
      await Promise.all(arrivals);
      if(!cycle.current(token))return;
    }
    if(focus)focusView(spec);
    text('live',spec.kind==='city'?'已进入'+spec.city.city+'文化介绍。':spec.kind==='map'?'已返回山东文化地图。':'未找到城市，请从十六市入口重新选择。');
  }finally{
    if(cycle.current(token)){document.body.dataset.transition='idle';$('main').setAttribute('aria-busy','false');selectCity(null);}
  }
}
addEventListener('hashchange',()=>route());
motion.addEventListener('change',()=>{
  finishBackgroundMotion();
  if(data)route({immediate:true,focus:active?.key!==routeSpec(location.hash,data.cities).key});
});
document.querySelector('.skip').addEventListener('click',event=>{
  event.preventDefault();$('main').focus({preventScroll:true});
});
document.querySelector('.source-jump').addEventListener('click',event=>{
  event.preventDefault();$('work-details').open=true;$('work-details').querySelector('summary').focus();$('work-details').scrollIntoView({block:'start',behavior:'instant'});
});
async function load(){
  const token=++loadToken;$('load-error').hidden=true;text('live','正在载入十六城画作。');
  try{
    const backgroundRequest=fetch('city-backgrounds.json').then(r=>r.ok?r.json():null).catch(()=>null);
    const response=await fetch('assembly-manifest.json');if(!response.ok)throw Error('fetch');
    const incoming=await response.json();if(!validData(incoming))throw Error('schema');
    const incomingBackgrounds=await backgroundRequest;
    if(token!==loadToken)return;data=incoming;backgroundData=validBackgroundData(incomingBackgrounds,incoming.cities)?incomingBackgrounds:null;setVariant(variant);
  }catch{
    if(token!==loadToken)return;ziboGuide.sync(null);cycle.begin();backdropCycle.cancel();clearBackground({key:'home',src:HOME_BACKGROUND,status:'home'});active=null;data=null;
    for(const id of['map-view','city-view','not-found'])$(id).hidden=true;
    $('load-error').hidden=false;$('main').setAttribute('aria-busy','false');text('live','画作未能载入，请使用重新载入按钮重试。');
  }
}
$('retry').addEventListener('click',load);
$('retry-images').addEventListener('click',()=>{drawMap();$('map-heading').focus({preventScroll:true});});
$('retry-detail').addEventListener('click',()=>{
  if(active?.kind==='city'){renderCity(active.city);$('city-title').focus({preventScroll:true});}
});
$('retry-background').addEventListener('click',()=>{
  if(active?.kind==='city')void displayBackground(backdropCycle.begin(backgroundSpec(active,backgroundData),{retry:true}));
});
load();
