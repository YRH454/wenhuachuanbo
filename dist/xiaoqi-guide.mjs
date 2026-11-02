// XIAOQI-SCROLL-A-v1: a local welcome, not a simulated model conversation.
import {CITIES,isCity} from './people-culture-v1/model.mjs';
import {createXiaoqiCompanion} from './xiaoqi-motion.mjs';

export function xiaoqiContext(hash) {
  const id=/^#\/city\/(\d{6})$/.exec(hash||'')?.[1];
  if(isCity(id))return {kind:'city',id,city:CITIES[id]};
  return {kind:!hash||hash==='#/map'?'map':'unknown',id:null,city:null};
}

export function createXiaoqiGuide(doc) {
  const win=doc.defaultView,root=doc.getElementById('xiaoqi-root');
  if(!root)return null;
  const launcher=doc.getElementById('xiaoqi-launcher'),panel=doc.getElementById('xiaoqi-panel'),
    title=doc.getElementById('xiaoqi-title'),closeButton=doc.getElementById('xiaoqi-close'),
    primary=doc.getElementById('xiaoqi-primary'),label=doc.getElementById('xiaoqi-action-label'),
    context=doc.getElementById('xiaoqi-context'),mapLink=doc.getElementById('xiaoqi-map'),main=doc.getElementById('main');
  const images=[...root.querySelectorAll('img')];
  let started=false,disposed=false,observer=null,companion=null;

  function readingEntry(state) {
    if(state.kind!=='city'||doc.body.dataset.view!=='city'||main.getAttribute('aria-busy')==='true'||doc.body.dataset.transition==='leaving'||doc.body.dataset.transition==='entering')return null;
    if(state.id==='370300')return doc.body.dataset.zibo==='active'?doc.getElementById('zibo-guide-open'):null;
    return doc.body.dataset.cityGuide===state.id&&doc.getElementById('city-guide-host')?.dataset.city===state.id?doc.getElementById('city-guide-open'):null;
  }
  function refresh() {
    if(disposed)return;
    const state=xiaoqiContext(win.location.hash),entry=readingEntry(state);
    root.dataset.context=state.id||state.kind;
    context.textContent=state.kind==='city'?'你正在逛 · '+state.city:state.kind==='map'?'十六座城市，等你慢慢发现。':'从文化地图重新出发。';
    primary.disabled=state.kind==='city'&&!entry;
    const heading=state.kind==='city'&&entry?doc.getElementById(state.id==='370300'?'zibo-guide-title':'city-guide-title'):null;
    label.textContent=state.kind==='city'?(entry?'走近'+(heading?.textContent.trim()||state.city):'本城内容尚未就绪'):state.kind==='map'?'在地图上选一城':'返回文化地图';
    mapLink.hidden=state.kind!=='city';
    companion?.refresh();
  }
  function close({restoreFocus=true}={}) {
    const wasOpen=!panel.hidden;
    panel.hidden=true;launcher.setAttribute('aria-expanded','false');launcher.setAttribute('aria-label','打开小齐文化向导');
    companion?.setPanelOpen(false);
    if(wasOpen&&restoreFocus)launcher.focus({preventScroll:true});
  }
  function open() {
    if(disposed||!started)return;
    refresh();panel.hidden=false;launcher.setAttribute('aria-expanded','true');launcher.setAttribute('aria-label','收起小齐文化向导');
    companion?.setPanelOpen(true);
    title.focus({preventScroll:true});
  }
  const toggle=()=>panel.hidden?open():close();
  const onClose=()=>close();
  const onEscape=event=>{if(event.key==='Escape'&&!panel.hidden){event.preventDefault();close();}};
  const onOutside=event=>{if(!panel.hidden&&!root.contains(event.target))close({restoreFocus:false});};
  const onHash=()=>{close({restoreFocus:false});refresh();};
  const onMap=()=>close({restoreFocus:false});
  const onPrimary=()=>{
    const state=xiaoqiContext(win.location.hash),entry=readingEntry(state);
    if(state.kind==='city'&&!entry){refresh();return;}
    close({restoreFocus:false});
    if(entry){entry.click();return;}
    if(state.kind!=='map'){win.location.hash='/map';return;}
    const heading=doc.getElementById('map-heading');
    heading?.focus({preventScroll:true});doc.getElementById('map-view')?.scrollIntoView({block:'start',behavior:'instant'});
  };
  const onImageError=event=>{event.currentTarget.hidden=true;};
  function observe() {
    if(disposed)return;
    observer?.disconnect();
    if(typeof win.MutationObserver==='function'){
      observer??=new win.MutationObserver(refresh);
      observer.observe(doc.body,{attributes:true,attributeFilter:['data-view','data-city-guide','data-zibo','data-transition']});
      observer.observe(main,{attributes:true,attributeFilter:['aria-busy']});
    }
    refresh();
  }
  const pause=()=>{close({restoreFocus:false});observer?.disconnect();};
  return {
    refresh,open,close,
    start(){
      if(started||disposed)return;started=true;
      companion=createXiaoqiCompanion(doc,{onCollapse:()=>close({restoreFocus:false})});
      launcher.addEventListener('click',toggle);closeButton.addEventListener('click',onClose);
      primary.addEventListener('click',onPrimary);mapLink.addEventListener('click',onMap);
      doc.addEventListener('keydown',onEscape);doc.addEventListener('click',onOutside);
      win.addEventListener('hashchange',onHash);win.addEventListener('pagehide',pause);win.addEventListener('pageshow',observe);
      for(const image of images){image.addEventListener('error',onImageError);if(image.complete&&image.naturalWidth===0)image.hidden=true;}
      close({restoreFocus:false});root.hidden=false;companion?.start();observe();
    },
    dispose(){
      if(disposed)return;close({restoreFocus:false});disposed=true;observer?.disconnect();root.hidden=true;
      companion?.dispose();
      launcher.removeEventListener('click',toggle);closeButton.removeEventListener('click',onClose);
      primary.removeEventListener('click',onPrimary);mapLink.removeEventListener('click',onMap);
      doc.removeEventListener('keydown',onEscape);doc.removeEventListener('click',onOutside);
      win.removeEventListener('hashchange',onHash);win.removeEventListener('pagehide',pause);win.removeEventListener('pageshow',observe);
      for(const image of images)image.removeEventListener('error',onImageError);
    }
  };
}
if(typeof document!=='undefined')createXiaoqiGuide(document)?.start();
