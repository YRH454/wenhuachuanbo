// Shared, testable routing and cancellation primitives. No browser-side clock or loop.
export const MOTION = Object.freeze({feedback:100, exit:220, entrance:460, textDelay:70, total:780});
export function routeSpec(hash,cities){
  if(!hash || hash==='#/map' || hash==='#main') return {kind:'map',key:'map'};
  const match=/^#\/city\/(\d{6})$/.exec(hash);
  const city=match&&cities.find(item=>item.cityId===match[1]);
  return city?{kind:'city',key:city.cityId,city}:{kind:'missing',key:'missing'};
}
export class NavigationCycle{
  epoch=0;
  animations=new Set();
  begin(){
    ++this.epoch;
    for(const animation of this.animations) animation.cancel();
    this.animations.clear();
    return this.epoch;
  }
  current(epoch){return this.epoch===epoch;}
  async play(element,keyframes,options){
    if(!element?.animate) return;
    const animation=element.animate(keyframes,{fill:'both',iterations:1,...options});
    this.animations.add(animation);
    try{await animation.finished;}catch{/* Cancellation is a normal newer navigation. */}
    finally{this.animations.delete(animation);animation.cancel();}
  }
}
