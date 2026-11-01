// City backdrop identity is independent of the selected map-art variant.
export const HOME_BACKGROUND='backgrounds/user-selected-shanhai-20261101.png';
export function validBackgroundData(value,cities){
  return value?.schemaVersion===1&&value.home?.src===HOME_BACKGROUND&&Array.isArray(value.cities)
    &&value.cities.length===cities.length&&new Set(value.cities.map(c=>c.cityId)).size===cities.length
    &&value.cities.every(entry=>cities.some(c=>c.cityId===entry.cityId&&c.city===entry.city)
      &&(entry.status==='awaiting-delivery'&&entry.src===null||entry.status==='ready'
        &&new RegExp('^backgrounds/cities/'+entry.cityId+'-[a-f0-9]{12}\\.png$').test(entry.src)
        &&new RegExp('^backgrounds/records/'+entry.cityId+'-[a-f0-9]{12}\\.txt$').test(entry.promptSrc)
        &&/^[a-f0-9]{64}$/.test(entry.sha256)&&entry.src.includes(entry.sha256.slice(0,12))
        &&[entry.desktopFocus,entry.mobileFocus].every(v=>/^\d{1,3}% \d{1,3}%$/.test(v))));
}
export function backgroundSpec(route,manifest){
  const entry=route.kind==='city'?manifest?.cities.find(c=>c.cityId===route.key):null;
  return entry?.status==='ready'?{...entry,key:route.key}:{key:route.kind==='city'?route.key:'home',city:route.city?.city||'',src:HOME_BACKGROUND,status:route.kind==='city'?'fallback':'home'};
}
export class BackgroundCycle{
  epoch=0;
  cache=new Map();
  constructor(load){this.load=load;}
  begin(spec,{retry=false}={}){
    const epoch=++this.epoch;
    if(retry)this.cache.delete(spec.src);
    let ready=this.cache.get(spec.src);
    if(!ready){
      ready=spec.src===HOME_BACKGROUND?Promise.resolve(null):Promise.resolve().then(()=>this.load(spec.src));
      this.cache.set(spec.src,ready);
      ready.catch(()=>{if(this.cache.get(spec.src)===ready)this.cache.delete(spec.src);});
    }
    return {epoch,spec,ready};
  }
  cancel(){++this.epoch;}
  current(ticket){return this.epoch===ticket.epoch;}
  async settle(ticket){
    try{const image=await ticket.ready;return this.current(ticket)?{spec:ticket.spec,image}:null;}
    catch{return this.current(ticket)?{spec:{...ticket.spec,src:HOME_BACKGROUND,status:'error'},image:null}:null;}
  }
}
