import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {XIAOQI_PREFERENCE_KEY,companionPreferences,companionPosition,createXiaoqiCompanion} from './dist/xiaoqi-motion.mjs';

function fixture({width=1280,height=800,reduced=false,stored=null,storageError=false,obstacles=[]}={}){
  const eventTarget=()=>({handlers:new Map(),addEventListener(type,fn){if(!this.handlers.has(type))this.handlers.set(type,new Set());this.handlers.get(type).add(fn);},removeEventListener(type,fn){this.handlers.get(type)?.delete(fn);},emit(type,event={}){const e={currentTarget:this,target:this,detail:1,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...event};for(const fn of [...(this.handlers.get(type)||[])]){fn(e);if(e.stopped)break;}return e;}});
  const animations=[],timers=new Map(),storage=new Map(),writes=[];
  if(stored!==null)storage.set(XIAOQI_PREFERENCE_KEY,stored);
  class Animation{
    constructor(frames,options){Object.assign(this,eventTarget());this.frames=frames;this.options=options;this.playState='running';}
    pause(){this.playState='paused';}play(){this.playState='running';}cancel(){this.playState='idle';}
  }
  const doc={...eventTarget(),visibilityState:'visible',activeElement:null,documentElement:{clientWidth:width}};
  class Node{
    constructor(id){Object.assign(this,eventTarget());this.id=id;this.hidden=false;this.disabled=false;this.children=[];this.dataset={};this.attributes={};this.textContent='';this.style={setProperty(key,value){this[key]=value;}};this.width=0;this.height=0;this.left=0;this.top=0;this.capture=null;}
    setAttribute(key,value){this.attributes[key]=String(value);}getAttribute(key){return this.attributes[key]??null;}
    getBoundingClientRect(){const t=/translate3d\(([-.\d]+)px,([-.\d]+)px,0\)/.exec(this.style.transform||'');const left=t?Number(t[1]):Number.parseFloat(this.style.left)||this.left,top=t?Number(t[2]):Number.parseFloat(this.style.top)||this.top;return{left,top,width:this.width,height:this.height,right:left+this.width,bottom:top+this.height};}
    animate(frames,options){const a=new Animation(frames,options);animations.push({node:this,a});return a;}
    focus(){doc.activeElement=this;}contains(node){return node===this||this.children.some(child=>child.contains(node));}
    setPointerCapture(id){this.capture=id;}hasPointerCapture(id){return this.capture===id;}releasePointerCapture(){this.capture=null;}
  }
  const ids=['xiaoqi-root','xiaoqi-actor','xiaoqi-launcher','xiaoqi-panel','xiaoqi-sway','xiaoqi-figure','xiaoqi-greeting','xiaoqi-motion-toggle','xiaoqi-minimize','xiaoqi-restore','xiaoqi-switch-side','main'];
  const nodes=Object.fromEntries(ids.map(id=>[id,new Node(id)]));
  nodes['xiaoqi-actor'].width=width<=700?108:128;nodes['xiaoqi-actor'].height=width<=700?164:188;
  nodes['xiaoqi-panel'].width=Math.min(360,width-24);nodes['xiaoqi-panel'].height=Math.min(526,height-24);nodes['xiaoqi-panel'].hidden=true;
  nodes['xiaoqi-actor'].children=[nodes['xiaoqi-launcher'],nodes['xiaoqi-motion-toggle'],nodes['xiaoqi-minimize']];
  nodes['xiaoqi-root'].children=[nodes['xiaoqi-actor'],nodes['xiaoqi-panel'],nodes['xiaoqi-restore']];
  nodes.main.setAttribute('aria-busy','false');doc.body={dataset:{view:'map',transition:'idle'}};
  doc.getElementById=id=>nodes[id]||null;
  doc.querySelectorAll=()=>obstacles.map(r=>({getBoundingClientRect(){return{left:r.x,top:r.y,right:r.x+r.width,bottom:r.y+r.height,...r};}}));
  const media={...eventTarget(),matches:reduced};let timerId=0;
  const win={...eventTarget(),innerWidth:width,innerHeight:height,matchMedia:()=>media,
    localStorage:{getItem(key){assert.equal(key,XIAOQI_PREFERENCE_KEY);if(storageError)throw Error('blocked');return storage.get(key)||null;},setItem(key,value){assert.equal(key,XIAOQI_PREFERENCE_KEY);if(storageError)throw Error('blocked');storage.set(key,value);writes.push(JSON.parse(value));}},
    setTimeout(fn){const id=++timerId;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);}
  };
  doc.defaultView=win;let collapseCount=0;
  const companion=createXiaoqiCompanion(doc,{onCollapse:()=>collapseCount++});
  return{doc,win,nodes,media,animations,timers,writes,storage,companion,get collapseCount(){return collapseCount;},flush(){const batch=[...timers.values()];timers.clear();for(const fn of batch)fn();}};
}
test('only bounded display preferences are accepted and persisted, never arbitrary payloads',()=>{
  for(const raw of [null,'broken','[]','null','{}','x'.repeat(501)])assert.equal(companionPreferences(raw).side,'right');
  const p=companionPreferences(JSON.stringify({version:1,side:'left',relativeY:9,paused:true,minimized:true,introSeen:true,secret:'discard'}));
  assert.deepEqual(p,{version:1,side:'left',relativeY:1,paused:true,minimized:true,introSeen:true});
});
test('desktop, phone and short viewport paths stay bounded, including drift travel',()=>{
  for(const [width,height]of [[1280,800],[390,844],[320,568],[700,360]])for(const side of ['left','right']){
    const aw=width<=700?108:128,ah=width<=700?164:188,p=companionPosition({width,height,actorWidth:aw,actorHeight:ah,side,relativeY:.76});
    assert.ok(p.x>=12&&p.x+aw<=width-12);assert.ok(p.y-p.travelY>=0&&p.y+ah<=height-12);
    assert.ok(p.x+p.inward>=0&&p.x+p.inward+aw<=width);
  }
});
test('initial layout finds a clear edge slot above the desktop artwork shelf',()=>{
  const p=companionPosition({width:1280,height:800,actorWidth:128,actorHeight:188,obstacles:[{x:1000,y:420,width:250,height:360},{x:0,y:0,width:1280,height:88}]});
  assert.ok(p.y+188<420);assert.ok(p.y-p.travelY>88);
});
test('motion has finite phrases with real translation and tilt; greeting happens once without a panel',()=>{
  const f=fixture();f.companion.start();assert.equal(f.nodes['xiaoqi-panel'].hidden,true);assert.equal(f.nodes['xiaoqi-greeting'].hidden,false);
  const drift=f.animations.find(a=>a.node.id==='xiaoqi-actor');assert.equal(drift.a.options.iterations,1);assert.equal(drift.a.options.duration,16000);
  assert.notEqual(drift.a.frames[0].transform,drift.a.frames[1].transform);assert.equal(drift.a.frames[0].transform,drift.a.frames.at(-1).transform);
  assert.ok(f.animations.some(a=>a.node.id==='xiaoqi-sway'));f.flush();assert.equal(f.nodes['xiaoqi-greeting'].hidden,true);
  f.companion.refresh();assert.equal(f.nodes['xiaoqi-greeting'].hidden,true);assert.equal(f.writes[0].introSeen,true);f.companion.dispose();
});
test('hover, focus and open panel pause movement; ordinary pointer leave resumes it',()=>{
  const f=fixture();f.companion.start();f.nodes['xiaoqi-actor'].emit('pointerenter');assert.equal(f.companion.state.moving,false);
  assert.ok(f.animations.filter(a=>['xiaoqi-actor','xiaoqi-sway'].includes(a.node.id)).every(a=>a.a.playState==='paused'));
  f.nodes['xiaoqi-actor'].emit('pointerleave');assert.equal(f.companion.state.moving,true);
  f.nodes['xiaoqi-actor'].emit('focusin');assert.equal(f.companion.state.moving,false);f.nodes['xiaoqi-actor'].emit('focusout',{relatedTarget:null});
  f.nodes['xiaoqi-panel'].hidden=false;f.companion.setPanelOpen(true);assert.equal(f.companion.state.moving,false);
  const box=f.nodes['xiaoqi-panel'].getBoundingClientRect();assert.ok(box.left>=12&&box.top>=12&&box.right<=1268&&box.bottom<=788);f.companion.dispose();
});
test('pointer focus does not pin the mascot forever, while visible keyboard focus pauses it',()=>{
  const f=fixture();f.companion.start();const actor=f.nodes['xiaoqi-actor'],launcher=f.nodes['xiaoqi-launcher'];
  launcher.matches=()=>false;actor.emit('focusin',{target:launcher});assert.equal(f.companion.state.moving,true);
  launcher.matches=()=>true;actor.emit('focusin',{target:launcher});assert.equal(f.companion.state.moving,false);
  actor.emit('focusout',{relatedTarget:null});assert.equal(f.companion.state.moving,true);f.companion.dispose();
});
test('font/layout size changes update docking and size observation is disconnected on teardown',()=>{
  const f=fixture();let callback,disconnected=0;const watched=[];
  f.win.ResizeObserver=class{constructor(fn){callback=fn;}observe(node){watched.push(node.id);}disconnect(){disconnected++;}};
  f.companion.start();assert.ok(watched.includes('xiaoqi-actor')&&watched.includes('main'));
  f.nodes['xiaoqi-actor'].height=212;callback();assert.ok(f.companion.state.position.y+212<=788);
  f.companion.dispose();assert.ok(disconnected>0);
});
test('reduced motion starts without animations and cannot be overridden by pause controls',()=>{
  const f=fixture({reduced:true});f.companion.start();assert.equal(f.animations.length,0);assert.equal(f.nodes['xiaoqi-motion-toggle'].disabled,true);
  f.nodes['xiaoqi-actor'].emit('pointerenter');assert.equal(f.animations.length,0);f.nodes['xiaoqi-actor'].emit('pointerleave');
  f.media.emit('change',{matches:false});assert.equal(f.companion.state.moving,true);assert.ok(f.animations.length>0);f.companion.dispose();
});
test('pause survives routes and storage failure does not break controls',()=>{
  for(const storageError of [false,true]){
    const f=fixture({storageError});f.companion.start();f.nodes['xiaoqi-motion-toggle'].emit('click');assert.equal(f.companion.state.paused,true);
    f.nodes['xiaoqi-root'].dataset.context='370400';f.companion.refresh();assert.equal(f.companion.state.moving,false);assert.equal(f.nodes['xiaoqi-motion-toggle'].textContent,'继续');
    f.nodes['xiaoqi-motion-toggle'].emit('click');assert.equal(f.companion.state.moving,true);f.companion.dispose();
  }
});
test('collapse has a keyboard reachable restore tab and restores the same side',()=>{
  const f=fixture({stored:JSON.stringify({version:1,side:'left',paused:true,introSeen:true})});f.companion.start();
  f.nodes['xiaoqi-minimize'].emit('click');assert.equal(f.nodes['xiaoqi-actor'].hidden,true);assert.equal(f.nodes['xiaoqi-restore'].hidden,false);assert.equal(f.doc.activeElement,f.nodes['xiaoqi-restore']);
  f.nodes['xiaoqi-restore'].emit('click');assert.equal(f.nodes['xiaoqi-actor'].hidden,false);assert.equal(f.doc.activeElement,f.nodes['xiaoqi-launcher']);assert.equal(f.companion.state.side,'left');assert.equal(f.companion.state.paused,true);f.companion.dispose();
});
test('pointer drag docks on the other edge and does not accidentally activate the panel',()=>{
  const f=fixture();f.companion.start();const launcher=f.nodes['xiaoqi-launcher'];
  launcher.emit('pointerdown',{pointerId:1,button:0,clientX:1200,clientY:600});launcher.emit('pointermove',{pointerId:1,clientX:70,clientY:500});
  assert.equal(f.nodes['xiaoqi-root'].dataset.dragging,'true');launcher.emit('pointerup',{pointerId:1});assert.equal(f.companion.state.side,'left');assert.equal(f.collapseCount,1);
  const click=launcher.emit('click');assert.equal(click.stopped,true);assert.equal(click.prevented,true);assert.equal(f.nodes['xiaoqi-panel'].hidden,true);
  launcher.emit('pointerdown',{pointerId:2,button:0,clientX:60,clientY:500});launcher.emit('pointerup',{pointerId:2});assert.notEqual(launcher.emit('click').stopped,true);f.companion.dispose();
});
test('pointer cancel is safe; keyboard side switch remains available without dragging',()=>{
  const f=fixture();f.companion.start();const launcher=f.nodes['xiaoqi-launcher'];
  launcher.emit('pointerdown',{pointerId:3,button:0,clientX:1200,clientY:600});launcher.emit('pointermove',{pointerId:3,clientX:70,clientY:500});launcher.emit('pointercancel',{pointerId:3});
  assert.equal(f.companion.state.side,'right');assert.equal(f.companion.state.dragging,false);
  f.nodes['xiaoqi-switch-side'].emit('click');assert.equal(f.companion.state.side,'left');assert.equal(f.nodes['xiaoqi-switch-side'].textContent,'移到右侧');f.companion.dispose();
});
test('scroll, hidden tab and page lifecycle suspend nonessential motion; dispose clears listeners and timers',()=>{
  const f=fixture();f.companion.start();f.win.emit('scroll');assert.equal(f.companion.state.moving,false);f.flush();assert.equal(f.companion.state.moving,true);
  f.doc.visibilityState='hidden';f.doc.emit('visibilitychange');assert.equal(f.companion.state.moving,false);
  f.doc.visibilityState='visible';f.doc.emit('visibilitychange');assert.equal(f.companion.state.moving,true);
  f.win.emit('pagehide');assert.equal(f.companion.state.moving,false);f.win.emit('pageshow');assert.equal(f.companion.state.moving,true);
  f.companion.dispose();f.companion.dispose();assert.equal(f.timers.size,0);
  for(const target of [f.doc,f.win,f.media,...Object.values(f.nodes)])for(const handlers of target.handlers.values())assert.equal(handlers.size,0);
});
test('new markup preserves native A and never introduces a chat service or a whole-page pointer shield',async()=>{
  const read=p=>readFile(new URL(p,import.meta.url),'utf8');const html=await read('./dist/index.html'),css=await read('./dist/xiaoqi-guide.css'),js=await read('./dist/xiaoqi-motion.mjs');
  for(const id of ['xiaoqi-actor','xiaoqi-motion-toggle','xiaoqi-minimize','xiaoqi-restore','xiaoqi-switch-side'])assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/width="112" height="112"/);assert.match(html,/XIAOQI-COMPANION-v1/);assert.match(css,/\.xiaoqi\{[^}]*pointer-events:none/);
  assert.match(css,/\.xiaoqi-launcher\{[^}]*background:transparent/);assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|WebSocket|Math\.random|performance\.now|iterations:\s*Infinity/);
});
