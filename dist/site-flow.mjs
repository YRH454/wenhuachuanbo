// COMPETITION-READING-v1: the city story continues into people and local objects.
import {isCity,cityUrl,createCityLoader} from './people-culture-v1/model.mjs';
import {createCityView} from './people-culture-v1/view.mjs';

// Kept for existing bookmarks; the live city page no longer creates these links.
export function peopleSectionUrl(id,variant='A',section='people') {
  return 'people-culture-v1/'+cityUrl(id,{variant,preview:true})+'#'+(section==='objects'?'objects':'people');
}
export function requestedTopic(search,hash) {
  const match=/^#\/city\/(\d{6})$/.exec(hash||'');
  return new URLSearchParams(search).get('section')==='topic'&&isCity(match?.[1])?match[1]:null;
}
const contentBase=new URL('./people-culture-v1/',import.meta.url);
export function createSiteFlow(doc,{load,render=createCityView,timeoutMs=12000}={}) {
  const win=doc.defaultView,body=doc.body,main=doc.getElementById('main'),host=doc.getElementById('city-guide-host');
  let request=requestedTopic(win.location.search,win.location.hash),observer=null,queued=false,started=false,disposed=false,current=null;
  const make=(tag,className='')=>{const node=doc.createElement(tag);node.className=className;return node;};
  const loadData=load||async function(id,{signal}) {
    const response=await win.fetch(new URL('data/'+id+'.json',contentBase),{signal,cache:'no-store'});
    if(response.status===404)return null;if(!response.ok)throw Error('load failed');return response.json();
  };
  function clear() {
    if(!current)return;
    current.loader?.dispose();current.view?.dispose();current.node.remove();current=null;
  }
  function consumeRequest() {
    request=null;
    const url=new URL(win.location.href);
    if(url.searchParams.get('section')==='topic'){url.searchParams.delete('section');win.history.replaceState(win.history.state,'',url);}
  }
  function currentCity() {
    const match=/^#\/city\/(\d{6})$/.exec(win.location.hash||''),id=match?.[1];
    if(body.dataset.view!=='city'||!isCity(id))return null;
    return id==='370300'?(body.dataset.zibo==='active'?id:null):
      body.dataset.cityGuide===id&&host.dataset.city===id?id:null;
  }
  function mountContent(id,article) {
    if(current?.id===id&&current.article===article&&current.node.isConnected)return;
    clear();
    const node=make('div','site-culture'),ctx={id,article,node,loader:null,view:null};
    node.dataset.city=id;node.setAttribute('aria-busy','true');current=ctx;
    const sources=article.querySelector(id==='370300'?'.zibo-sources':'.cg-sources');
    if(sources)sources.parentNode.insertBefore(node,sources);else article.append(node);
    ctx.loader=createCityLoader({load:loadData,timeoutMs,onState(state) {
      if(disposed||current!==ctx||currentCity()!==id||!node.isConnected)return;
      ctx.view?.dispose();ctx.view=null;node.replaceChildren();
      node.setAttribute('aria-busy',String(state.phase==='loading'));node.dataset.state=state.phase;
      if(state.phase==='ready') {
        ctx.view=render(doc,state.data,{mediaBase:contentBase.href});node.append(ctx.view.root);
      }else {
        const status=make('p','site-culture-status');status.setAttribute('role','status');
        status.textContent=state.phase==='loading'?'正在载入本城人物与四物…':
          state.phase==='empty'?'本城人物与四物正在整理。':'本城人物与四物暂时无法载入。';
        node.append(status);
        if(state.phase==='error') {
          const retry=make('button','site-culture-retry');retry.type='button';retry.textContent='重新载入';
          retry.addEventListener('click',()=>{if(current===ctx)ctx.loader.select(id,{preview:true,force:true});});node.append(retry);
        }
      }
    }});
    // Draft remains a provenance state; this explicit local presentation does not approve its rights.
    ctx.loader.select(id,{preview:true});
  }
  function refresh() {
    queued=false;if(disposed)return;
    const id=currentCity();
    if(!id){clear();return;}
    const zibo=id==='370300',article=zibo?doc.getElementById('zibo-guide'):host.querySelector('.cg-topic');
    if(!article||article.hidden)return;
    mountContent(id,article);
    if(request!==id||body.dataset.transition==='leaving'||body.dataset.transition==='entering'||main.getAttribute('aria-busy')==='true')return;
    const title=doc.getElementById(zibo?'zibo-guide-title':'city-guide-title');
    if(!title)return;
    consumeRequest();title.focus({preventScroll:true});article.scrollIntoView({block:'start',behavior:'instant'});
  }
  const schedule=()=>{if(!queued&&!disposed){queued=true;queueMicrotask(refresh);}};
  const onHash=()=>{if(request&&requestedTopic(win.location.search,win.location.hash)!==request)consumeRequest();refresh();};
  function observe() {
    if(disposed)return;
    observer?.disconnect();
    if(typeof win.MutationObserver==='function'){
      observer??=new win.MutationObserver(schedule);
      observer.observe(body,{attributes:true,attributeFilter:['data-view','data-zibo','data-city-guide','data-transition']});
      observer.observe(main,{attributes:true,attributeFilter:['aria-busy']});
      observer.observe(host,{childList:true,subtree:true});
    }
    refresh();
  }
  const pause=()=>{observer?.disconnect();clear();};
  return {
    refresh,
    start(){
      if(started||disposed)return;started=true;
      win.addEventListener('hashchange',onHash);win.addEventListener('pagehide',pause);win.addEventListener('pageshow',observe);observe();
    },
    dispose(){
      disposed=true;observer?.disconnect();clear();
      win.removeEventListener('hashchange',onHash);win.removeEventListener('pagehide',pause);win.removeEventListener('pageshow',observe);
    }
  };
}
if(typeof document!=='undefined'&&document.getElementById('city-guide-host'))createSiteFlow(document).start();
