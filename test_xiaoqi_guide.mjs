import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {CITIES} from './dist/people-culture-v1/model.mjs';
import {xiaoqiContext,createXiaoqiGuide} from './dist/xiaoqi-guide.mjs';

function fixture({hash='#/map',busy=false,committed=true,transition='idle'}={}) {
  const events=()=>({handlers:new Map(),addEventListener(type,fn){if(!this.handlers.has(type))this.handlers.set(type,new Set());this.handlers.get(type).add(fn);},removeEventListener(type,fn){this.handlers.get(type)?.delete(fn);},emit(type,event={}){for(const fn of this.handlers.get(type)||[])fn({currentTarget:this,...event});}});
  const doc={...events(),activeElement:null};
  class Node {
    constructor(id=''){Object.assign(this,events());this.id=id;this.hidden=false;this.disabled=false;this.dataset={};this.attributes={};this.children=[];this.textContent='';this.clicks=0;this.scrolls=[];}
    setAttribute(key,value){this.attributes[key]=String(value);}
    getAttribute(key){return this.attributes[key]??null;}
    focus(options){doc.activeElement=this;this.focusOptions=options;}
    click(){this.clicks++;if(!this.disabled)this.emit('click',{target:this});}
    contains(node){return node===this||this.children.some(child=>child.contains(node));}
    querySelectorAll(selector){return selector==='img'?this.children.flatMap(child=>[...(child.tagName==='img'?[child]:[]),...child.querySelectorAll(selector)]):[];}
    scrollIntoView(options){this.scrolls.push(options);}
  }
  const ids=['xiaoqi-root','xiaoqi-launcher','xiaoqi-panel','xiaoqi-title','xiaoqi-close','xiaoqi-primary','xiaoqi-action-label','xiaoqi-context','xiaoqi-map','main','map-heading','map-view','city-guide-host','zibo-guide-open','zibo-guide-title','city-guide-open','city-guide-title'];
  const nodes=Object.fromEntries(ids.map(id=>[id,new Node(id)]));
  doc.getElementById=id=>nodes[id]||null;doc.body=new Node('body');
  const first=new Node('launcher-image'),second=new Node('portrait-image');first.tagName=second.tagName='img';first.complete=second.complete=true;first.naturalWidth=second.naturalWidth=1254;
  nodes['xiaoqi-launcher'].children=[first];nodes['xiaoqi-panel'].children=[nodes['xiaoqi-title'],nodes['xiaoqi-close'],nodes['xiaoqi-primary'],nodes['xiaoqi-map'],second];
  nodes['xiaoqi-root'].children=[nodes['xiaoqi-launcher'],nodes['xiaoqi-panel']];nodes['xiaoqi-root'].hidden=true;nodes['xiaoqi-panel'].hidden=true;
  doc.body.children=Object.values(nodes).filter(node=>!node.id.startsWith('xiaoqi-')).concat(nodes['xiaoqi-root']);
  const observations=[];
  const win={...events(),location:{hash},MutationObserver:class {constructor(callback){this.callback=callback;}observe(target,options){observations.push({target,options});}disconnect(){this.disconnected=true;}}};
  doc.defaultView=win;
  function commit(next=hash,{ready=committed,loading=busy,phase=transition}={}) {
    win.location.hash=next;const state=xiaoqiContext(next);
    doc.body.dataset={view:state.kind==='city'?'city':state.kind==='map'?'map':'unknown',transition:phase};
    nodes.main.setAttribute('aria-busy',String(loading));nodes['city-guide-host'].dataset.city=ready?state.id:'';
    if(ready&&state.kind==='city'){
      if(state.id==='370300')doc.body.dataset.zibo='active';else doc.body.dataset.cityGuide=state.id;
    }
    nodes['zibo-guide-title'].textContent='琉璃烧制技艺';nodes['city-guide-title'].textContent='本城文化';
  }
  commit();
  return {doc,win,nodes,first,second,observations,commit,guide:createXiaoqiGuide(doc)};
}

test('all sixteen exact city routes have their own identity; invalid routes never borrow a city',()=>{
  for(const [id,city]of Object.entries(CITIES))assert.deepEqual(xiaoqiContext('#/city/'+id),{kind:'city',id,city});
  assert.equal(xiaoqiContext('#/map').kind,'map');assert.equal(xiaoqiContext('').kind,'map');
  for(const hash of ['#/city/379999','#/city/370300/other','#/city/<script>','#people',null])assert.equal(xiaoqiContext(hash).id,null);
});
test('launcher is progressively enhanced without an automatic panel or focus change',()=>{
  const f=fixture();assert.equal(f.nodes['xiaoqi-root'].hidden,true);f.guide.start();f.guide.start();
  assert.equal(f.nodes['xiaoqi-root'].hidden,false);assert.equal(f.nodes['xiaoqi-panel'].hidden,true);
  assert.equal(f.doc.activeElement,null);assert.equal(f.nodes['xiaoqi-launcher'].getAttribute('aria-expanded'),'false');
  assert.equal(f.nodes['xiaoqi-launcher'].handlers.get('click').size,1);assert.equal(f.observations.length,2);
});
test('open, toggle and close maintain names, expanded state and focus',()=>{
  const f=fixture();f.guide.start();f.nodes['xiaoqi-launcher'].click();
  assert.equal(f.nodes['xiaoqi-panel'].hidden,false);assert.equal(f.doc.activeElement,f.nodes['xiaoqi-title']);
  assert.equal(f.nodes['xiaoqi-launcher'].getAttribute('aria-expanded'),'true');assert.match(f.nodes['xiaoqi-launcher'].getAttribute('aria-label'),/收起/);
  f.nodes['xiaoqi-close'].click();assert.equal(f.nodes['xiaoqi-panel'].hidden,true);assert.equal(f.doc.activeElement,f.nodes['xiaoqi-launcher']);
  f.nodes['xiaoqi-launcher'].click();f.nodes['xiaoqi-launcher'].click();assert.equal(f.nodes['xiaoqi-panel'].hidden,true);
});
test('Escape closes and returns focus without trapping unrelated keys',()=>{
  const f=fixture();f.guide.start();f.guide.open();let prevented=0;
  f.doc.emit('keydown',{key:'Tab',preventDefault(){prevented++;}});assert.equal(prevented,0);assert.equal(f.nodes['xiaoqi-panel'].hidden,false);
  f.doc.emit('keydown',{key:'Escape',preventDefault(){prevented++;}});assert.equal(prevented,1);assert.equal(f.doc.activeElement,f.nodes['xiaoqi-launcher']);
});
test('outside click closes without stealing page focus; inside clicks do not dismiss',()=>{
  const f=fixture();f.guide.start();f.guide.open();f.doc.emit('click',{target:f.nodes['xiaoqi-title']});assert.equal(f.nodes['xiaoqi-panel'].hidden,false);
  f.doc.activeElement=f.nodes['map-heading'];f.doc.emit('click',{target:f.nodes['map-heading']});
  assert.equal(f.nodes['xiaoqi-panel'].hidden,true);assert.equal(f.doc.activeElement,f.nodes['map-heading']);
});
test('all sixteen city actions use their existing reading control, not a new route or a model call',()=>{
  for(const id of Object.keys(CITIES)){
    const f=fixture({hash:'#/city/'+id});f.guide.start();f.guide.open();
    assert.equal(f.nodes['xiaoqi-primary'].disabled,false,id);assert.match(f.nodes['xiaoqi-context'].textContent,new RegExp(CITIES[id]));
    assert.equal(f.nodes['xiaoqi-map'].hidden,false);f.nodes['xiaoqi-primary'].click();
    assert.equal(f.nodes[id==='370300'?'zibo-guide-open':'city-guide-open'].clicks,1,id);
    assert.equal(f.win.location.hash,'#/city/'+id);assert.equal(f.nodes['xiaoqi-panel'].hidden,true);
  }
});
test('busy, uncommitted and transitioning city content cannot open a stale story',()=>{
  for(const options of [{busy:true},{committed:false},{transition:'leaving'},{transition:'entering'}]){
    const f=fixture({hash:'#/city/370400',...options});f.guide.start();f.guide.open();
    assert.equal(f.nodes['xiaoqi-primary'].disabled,true);f.nodes['xiaoqi-primary'].click();assert.equal(f.nodes['city-guide-open'].clicks,0);
    f.commit('#/city/370400',{ready:true,loading:false,phase:'idle'});f.guide.refresh();assert.equal(f.nodes['xiaoqi-primary'].disabled,false);
  }
});
test('city identity must match the committed guide host',()=>{
  const f=fixture({hash:'#/city/370400'});f.nodes['city-guide-host'].dataset.city='371700';f.guide.start();
  assert.equal(f.nodes['xiaoqi-primary'].disabled,true);assert.match(f.nodes['xiaoqi-context'].textContent,/枣庄/);
});
test('changing cities dismisses the panel and refreshes identity without taking page focus',()=>{
  const f=fixture({hash:'#/city/370300'});f.guide.start();f.guide.open();f.commit('#/city/371700');f.doc.activeElement=f.nodes['city-guide-title'];f.win.emit('hashchange');
  assert.equal(f.nodes['xiaoqi-panel'].hidden,true);assert.match(f.nodes['xiaoqi-context'].textContent,/菏泽/);assert.equal(f.doc.activeElement,f.nodes['city-guide-title']);
});
test('map action returns focus to the existing map; unknown route offers map recovery',()=>{
  const f=fixture();f.guide.start();f.guide.open();f.nodes['xiaoqi-primary'].click();
  assert.equal(f.doc.activeElement,f.nodes['map-heading']);assert.equal(f.nodes['map-view'].scrolls.length,1);assert.equal(f.nodes['xiaoqi-map'].hidden,true);
  f.commit('#/city/379999');f.guide.refresh();f.guide.open();f.nodes['xiaoqi-primary'].click();assert.equal(f.win.location.hash,'/map');
});
test('broken artwork leaves the named launcher and reading action usable',()=>{
  const f=fixture();f.first.naturalWidth=0;f.guide.start();assert.equal(f.first.hidden,true);
  f.second.emit('error');assert.equal(f.second.hidden,true);f.guide.open();assert.equal(f.nodes['xiaoqi-panel'].hidden,false);assert.equal(f.nodes['xiaoqi-primary'].disabled,false);
});
test('page lifecycle and disposal leave no automatic panel or duplicate listeners',()=>{
  const f=fixture();f.guide.start();f.guide.open();f.win.emit('pagehide');assert.equal(f.nodes['xiaoqi-panel'].hidden,true);
  f.win.emit('pageshow');assert.equal(f.observations.length,4);f.guide.dispose();f.guide.dispose();f.guide.start();f.guide.open();
  assert.equal(f.nodes['xiaoqi-root'].hidden,true);assert.equal(f.nodes['xiaoqi-panel'].hidden,true);
  for(const target of [f.doc,f.win,f.nodes['xiaoqi-launcher'],f.nodes['xiaoqi-close'],f.first,f.second])for(const handlers of target.handlers.values())assert.equal(handlers.size,0);
});
test('HTML keeps the chosen artwork, non-modal semantics and an honest service state',async()=>{
  const html=await readFile(new URL('./dist/index.html',import.meta.url),'utf8'),guide=html.slice(html.indexOf('<div id="xiaoqi-root"'));
  assert.match(html,/href="xiaoqi-guide\.css"/);assert.match(html,/src="xiaoqi-guide\.mjs"/);assert.match(html,/XIAOQI-SCROLL-A-v1/);
  assert.match(guide,/role="dialog" aria-modal="false"/);assert.match(guide,/aria-expanded="false"/);assert.match(guide,/智能问答尚未接通/);
  assert.doesNotMatch(guide,/<input|<textarea|xiaoqi-b-page|AI生成/i);
  const code=await readFile(new URL('./dist/xiaoqi-guide.mjs',import.meta.url),'utf8');assert.doesNotMatch(code,/\bfetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|apiKey/i);
});
test('adopted A asset is the exact native copy, with the user selection separately recorded',async()=>{
  const png=await readFile(new URL('./dist/assets/xiaoqi/xiaoqi-scroll-a-d9cf1a109245.png',import.meta.url));
  assert.equal(createHash('sha256').update(png).digest('hex'),'d9cf1a1092452d61f9c3f3622e12c19f2943d03b94c70fcaadb1c12e98248119');
  const selection=JSON.parse(await readFile(new URL('./provenance/xiaoqi-selection.json',import.meta.url),'utf8'));
  assert.equal(selection.selectedVariant,'A');assert.equal(selection.userRequest,'用A吧');assert.match(selection.approvalScope,/不代表商标/);
});
