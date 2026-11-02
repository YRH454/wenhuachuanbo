// XIAOQI-COMPANION-v1. Native, finite WAAPI phrases; no media/runtime dependency.
export const XIAOQI_PREFERENCE_KEY='yiwu:xiaoqi:companion:v1';
const clamp=(n,min,max)=>Math.min(Math.max(n,min),Math.max(min,max));
const defaults=()=>({version:1,side:'right',relativeY:.76,paused:false,minimized:false,introSeen:false});
export function companionPreferences(raw) {
  try {
    if(typeof raw!=='string'||raw.length>500)return defaults();
    const value=JSON.parse(raw);
    if(!value||Array.isArray(value)||value.version!==1)return defaults();
    return {version:1,side:value.side==='left'?'left':'right',relativeY:Number.isFinite(value.relativeY)?clamp(value.relativeY,0,1):.76,
      paused:value.paused===true,minimized:value.minimized===true,introSeen:value.introSeen===true};
  }catch{return defaults();}
}
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
export function companionPosition({width,height,actorWidth,actorHeight,side='right',relativeY=.76,obstacles=[]}) {
  const gap=12,travelX=width<=700?10:16,travelY=width<=700?14:26;
  const x=side==='left'?gap:Math.max(gap,width-actorWidth-gap),low=Math.min(gap+travelY,Math.max(gap,height-actorHeight-gap)),high=Math.max(low,height-actorHeight-gap);
  const wanted=low+(high-low)*clamp(relativeY,0,1),inward=side==='left'?travelX:-travelX;
  const candidates=[wanted,low,high,...obstacles.flatMap(r=>[r.y-actorHeight-10,r.y+r.height+travelY+10])].map(y=>clamp(y,low,high));
  let best=wanted,score=Infinity;
  for(const y of candidates){
    const area={x:Math.min(x,x+inward)-4,y:y-travelY-4,width:actorWidth+travelX+8,height:actorHeight+travelY+8};
    const next=obstacles.reduce((sum,r)=>sum+overlap(area,r),0)*1000+Math.abs(y-wanted);
    if(next<score){score=next;best=y;}
  }
  return {x,y:best,inward,travelY,relativeY:high===low?0:(best-low)/(high-low)};
}

export function createXiaoqiCompanion(doc,{onCollapse=()=>{}}={}) {
  const win=doc.defaultView,$=id=>doc.getElementById(id),root=$('xiaoqi-root'),actor=$('xiaoqi-actor'),launcher=$('xiaoqi-launcher'),panel=$('xiaoqi-panel'),
    sway=$('xiaoqi-sway'),figure=$('xiaoqi-figure'),greeting=$('xiaoqi-greeting'),pauseButton=$('xiaoqi-motion-toggle'),minimize=$('xiaoqi-minimize'),restore=$('xiaoqi-restore'),switchSide=$('xiaoqi-switch-side');
  if(!actor||!sway||!figure||!greeting||!pauseButton||!minimize||!restore||!switchSide)return null;
  let raw=null;try{raw=win.localStorage?.getItem(XIAOQI_PREFERENCE_KEY);}catch{}
  const prefs=companionPreferences(raw),media=win.matchMedia?.('(prefers-reduced-motion: reduce)');
  let started=false,disposed=false,active=true,hover=false,focused=false,panelOpen=false,scrolling=false,drag=null,suppressClick=false,reduced=Boolean(media?.matches),
    position={x:12,y:160,inward:-16,travelY:26},size={width:128,height:188},drift=null,tilt=null,gesture=null,introMotion=null,layoutTimer=null,greetingTimer=null,resizeObserver=null,lastContext='';
  const listeners=[];
  const on=(target,type,handler,options)=>{target.addEventListener(type,handler,options);listeners.push(()=>target.removeEventListener(type,handler,options));};
  const save=()=>{try{win.localStorage?.setItem(XIAOQI_PREFERENCE_KEY,JSON.stringify(prefs));}catch{}};
  const viewport=()=>({width:doc.documentElement?.clientWidth||win.innerWidth||390,height:win.innerHeight||doc.documentElement?.clientHeight||844});
  const transform=(x,y)=>`translate3d(${x}px,${y}px,0)`;
  const canMove=()=>started&&active&&!disposed&&!prefs.minimized&&!prefs.paused&&!reduced&&!hover&&!focused&&!panelOpen&&!drag&&!scrolling&&doc.visibilityState!=='hidden';
  function cancelMotion(){drift?.cancel();tilt?.cancel();drift=tilt=null;actor.style.willChange='';sway.style.willChange='';}
  function runPhrase(){
    if(!canMove()||typeof actor.animate!=='function')return;
    const {x,y,inward,travelY}=position;
    actor.style.willChange=sway.style.willChange='transform';
    drift=actor.animate([
      {transform:transform(x,y),offset:0},{transform:transform(x+inward,y-travelY),offset:.18},
      {transform:transform(x+inward,y-travelY),offset:.32},{transform:transform(x,y),offset:.5},
      {transform:transform(x,y),offset:.68},{transform:transform(x+inward*.35,y-travelY*.4),offset:.82},{transform:transform(x,y),offset:1}
    ],{duration:16000,iterations:1,easing:'ease-in-out'});
    tilt=sway.animate([{transform:'rotate(0deg)',offset:0},{transform:'rotate(-3deg)',offset:.18},{transform:'rotate(2deg)',offset:.36},{transform:'rotate(0deg)',offset:.5},{transform:'rotate(0deg)',offset:.68},{transform:'rotate(2deg)',offset:.84},{transform:'rotate(0deg)',offset:1}],{duration:16000,iterations:1,easing:'ease-in-out'});
    drift.addEventListener('finish',()=>{drift=tilt=null;runPhrase();},{once:true});
  }
  function syncMotion(){
    root.dataset.motion=reduced?'reduced':prefs.paused?'paused':canMove()?'moving':'resting';
    if(canMove()){
      if(drift){drift.play();tilt?.play();}else runPhrase();
    }else{drift?.pause();tilt?.pause();}
  }
  function dismissGreeting(){
    if(greetingTimer!==null)win.clearTimeout(greetingTimer);greetingTimer=null;
    introMotion?.cancel();introMotion=null;greeting.hidden=true;
  }
  function maybeGreet(){
    if(prefs.introSeen||prefs.minimized||!active||doc.visibilityState==='hidden'||$('main')?.getAttribute('aria-busy')==='true')return;
    prefs.introSeen=true;save();greeting.hidden=false;
    if(!reduced&&typeof greeting.animate==='function')introMotion=greeting.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,iterations:1,easing:'cubic-bezier(.16,1,.3,1)'});
    greetingTimer=win.setTimeout(dismissGreeting,4500);
  }
  function updateControls(){
    root.dataset.side=prefs.side;root.dataset.minimized=String(prefs.minimized);
    actor.hidden=prefs.minimized;restore.hidden=!prefs.minimized;
    pauseButton.disabled=reduced;pauseButton.textContent=reduced?'静止':prefs.paused?'继续':'暂停';
    pauseButton.setAttribute('aria-pressed',String(prefs.paused||reduced));pauseButton.setAttribute('aria-label',reduced?'已跟随系统减少动态设置':prefs.paused?'继续小齐动效':'暂停小齐动效');
    switchSide.textContent=prefs.side==='right'?'移到左侧':'移到右侧';
    root.style.setProperty('--xiaoqi-restore-y',clamp(position.y,12,viewport().height-88)+'px');
  }
  function placePanel(){
    if(panel.hidden)return;
    const view=viewport(),rect=actor.getBoundingClientRect(),box=panel.getBoundingClientRect();
    let x=prefs.side==='right'?rect.left-box.width-16:rect.right+16;
    if(view.width<=700)x=(view.width-box.width)/2;
    const y=view.width<=700?rect.top-box.height-12:rect.top-76;
    panel.style.left=clamp(x,12,view.width-box.width-12)+'px';panel.style.top=clamp(y,12,view.height-box.height-12)+'px';
  }
  function layout(){
    if(!started||disposed)return;
    const view=viewport(),rect=actor.getBoundingClientRect();
    if(rect.width&&rect.height)size={width:rect.width,height:rect.height};
    const selector='.topbar,.city-link,.cg-scene-back,.zibo-scene-back,.cg-scene-open,.zibo-scene-open,.cg-topic-bar,.zibo-topic-bar'+(view.width>=1180?',.art-shelf':'');
    const obstacles=[...doc.querySelectorAll(selector)].map(node=>node.getBoundingClientRect()).filter(r=>r.width&&r.height&&r.bottom>0&&r.top<view.height).map(r=>({x:r.left,y:r.top,width:r.width,height:r.height}));
    cancelMotion();position=companionPosition({...view,actorWidth:size.width,actorHeight:size.height,side:prefs.side,relativeY:prefs.relativeY,obstacles});
    actor.style.transform=transform(position.x,position.y);root.dataset.greetingBelow=String(position.y<110);
    updateControls();placePanel();syncMotion();
  }
  function gestureOnce(frames,duration){
    gesture?.cancel();gesture=null;
    if(!reduced&&typeof figure.animate==='function')gesture=figure.animate(frames,{duration,iterations:1,easing:'cubic-bezier(.16,1,.3,1)'});
  }
  function finishDrag(event,cancelled=false){
    if(!drag||drag.id!==event.pointerId)return;
    const current=drag;drag=null;root.dataset.dragging='false';
    if(launcher.hasPointerCapture?.(event.pointerId))launcher.releasePointerCapture(event.pointerId);
    if(current.moved&&!cancelled){
      prefs.side=current.x+size.width/2<viewport().width/2?'left':'right';
      prefs.relativeY=clamp(current.y/Math.max(1,viewport().height-size.height-12),0,1);save();
    }
    if(current.moved)layout();else syncMotion();
  }
  const pointerDown=event=>{
    if(event.isPrimary===false||(event.button!==undefined&&event.button!==0))return;
    dismissGreeting();suppressClick=false;const rect=actor.getBoundingClientRect();
    drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,x:rect.left,y:rect.top,originX:rect.left,originY:rect.top,moved:false};
    syncMotion();launcher.setPointerCapture?.(event.pointerId);
  };
  const pointerMove=event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
    if(!drag.moved&&Math.hypot(dx,dy)<8)return;
    if(!drag.moved){drag.moved=true;suppressClick=true;onCollapse();cancelMotion();root.dataset.dragging='true';}
    event.preventDefault();const view=viewport();drag.x=clamp(drag.originX+dx,12,view.width-size.width-12);drag.y=clamp(drag.originY+dy,12,view.height-size.height-12);
    actor.style.transform=transform(drag.x,drag.y);
  };
  const captureClick=event=>{
    if(suppressClick&&event.detail!==0){suppressClick=false;event.preventDefault();event.stopImmediatePropagation();return;}
    dismissGreeting();gestureOnce([{transform:'scale(1)'},{transform:'scale(.94)',offset:.3},{transform:'scale(1.025)',offset:.7},{transform:'scale(1)'}],300);
  };
  const onPause=()=>{prefs.paused=!prefs.paused;dismissGreeting();save();updateControls();syncMotion();};
  const onMinimize=()=>{onCollapse();prefs.minimized=true;dismissGreeting();save();cancelMotion();updateControls();restore.focus({preventScroll:true});};
  const onRestore=()=>{prefs.minimized=false;save();updateControls();layout();launcher.focus({preventScroll:true});};
  const onSwitch=()=>{prefs.side=prefs.side==='right'?'left':'right';dismissGreeting();save();layout();};
  const onEnter=()=>{hover=true;syncMotion();if(!panelOpen)gestureOnce([{transform:'rotate(0deg)'},{transform:'rotate(-7deg)',offset:.45},{transform:'rotate(0deg)'}],480);};
  const onLeave=()=>{hover=false;syncMotion();};
  const onFocus=event=>{focused=typeof event.target?.matches==='function'?event.target.matches(':focus-visible'):true;syncMotion();};
  const onBlur=event=>{if(actor.contains(event.relatedTarget))return;focused=false;syncMotion();};
  const onReduced=event=>{reduced=event.matches;gesture?.cancel();introMotion?.cancel();updateControls();syncMotion();};
  const onVisibility=()=>{if(doc.visibilityState==='hidden')dismissGreeting();syncMotion();};
  const onScroll=()=>{
    scrolling=true;syncMotion();if(layoutTimer!==null)win.clearTimeout(layoutTimer);
    layoutTimer=win.setTimeout(()=>{layoutTimer=null;scrolling=false;layout();},140);
  };
  const onResize=()=>{if(drag)finishDrag({pointerId:drag.id},true);dismissGreeting();layout();};
  function observeSizes(){
    resizeObserver?.disconnect();
    if(typeof win.ResizeObserver!=='function')return;
    resizeObserver??=new win.ResizeObserver(()=>{if(active&&!drag)layout();});
    for(const node of [actor,$('main'),doc.querySelector?.('.art-shelf')])if(node)resizeObserver.observe(node);
  }
  const pageHide=()=>{active=false;dismissGreeting();gesture?.cancel();cancelMotion();resizeObserver?.disconnect();if(layoutTimer!==null)win.clearTimeout(layoutTimer);layoutTimer=null;scrolling=false;};
  const pageShow=()=>{active=true;observeSizes();layout();maybeGreet();};
  return {
    get state(){return {...prefs,reduced,hover,focused,panelOpen,dragging:Boolean(drag),position:{...position},moving:canMove()};},
    refresh(){
      const context=root.dataset.context+'|'+doc.body.dataset.view+'|'+doc.body.dataset.cityGuide+'|'+doc.body.dataset.zibo+'|'+doc.body.dataset.transition+'|'+$('main')?.getAttribute('aria-busy');
      if(context!==lastContext){lastContext=context;layout();}maybeGreet();
    },
    setPanelOpen(value){panelOpen=value;if(value)dismissGreeting();syncMotion();placePanel();},
    placePanel,
    start(){
      if(started||disposed)return;started=true;
      on(launcher,'pointerdown',pointerDown);on(launcher,'pointermove',pointerMove);on(launcher,'pointerup',event=>finishDrag(event));on(launcher,'pointercancel',event=>finishDrag(event,true));on(launcher,'lostpointercapture',event=>finishDrag(event,true));on(launcher,'click',captureClick,true);
      on(actor,'pointerenter',onEnter);on(actor,'pointerleave',onLeave);on(actor,'focusin',onFocus);on(actor,'focusout',onBlur);
      on(pauseButton,'click',onPause);on(minimize,'click',onMinimize);on(restore,'click',onRestore);on(switchSide,'click',onSwitch);
      on(win,'resize',onResize);on(win,'scroll',onScroll,{passive:true});on(win,'pagehide',pageHide);on(win,'pageshow',pageShow);on(doc,'visibilitychange',onVisibility);
      if(media?.addEventListener)on(media,'change',onReduced);
      observeSizes();layout();maybeGreet();
    },
    dispose(){
      if(disposed)return;disposed=true;active=false;dismissGreeting();gesture?.cancel();cancelMotion();
      resizeObserver?.disconnect();
      if(layoutTimer!==null)win.clearTimeout(layoutTimer);layoutTimer=null;
      for(const remove of listeners)remove();
    }
  };
}
