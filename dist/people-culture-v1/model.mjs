// PEOPLE-CULTURE-v1: city identity and untrusted package boundaries.
export const CITIES = Object.freeze({
  '370100':'济南','370200':'青岛','370300':'淄博','370400':'枣庄',
  '370500':'东营','370600':'烟台','370700':'潍坊','370800':'济宁',
  '370900':'泰安','371000':'威海','371100':'日照','371300':'临沂',
  '371400':'德州','371500':'聊城','371600':'滨州','371700':'菏泽'
});
export const isCity = id => typeof id === 'string' && Object.hasOwn(CITIES,id);
export const isId = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length < 90;
const text = (value,max=3000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
export function safeSource(value) {
  if(typeof value!=='string')return false;
  try {const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}
}
export const safeAsset = value => typeof value==='string' && /^assets\/[a-z0-9-]+-[a-f0-9]{12}\.(png|jpg|jpeg|webp)$/.test(value);
const sources = list => Array.isArray(list)&&list.length>0&&list.length<=12&&list.every(s=>text(s.title,300)&&safeSource(s.url));
const size = m => Number.isInteger(m.width)&&m.width>0&&m.width<=12000&&Number.isInteger(m.height)&&m.height>0&&m.height<=12000;
const unique = list => new Set(list.map(x=>x.id)).size===list.length;
function validPortrait(p) {
  if(!p||!['missing','candidate','approved'].includes(p.kind))return false;
  if(p.kind==='missing')return p.src===null;
  return p.identityVerified===true&&p.publicReuse===(p.kind==='approved')&&safeAsset(p.src)&&size(p)&&text(p.alt,500)&&text(p.credit,500)&&safeSource(p.sourcePage)
    &&text(p.identityStatus,1000)&&text(p.rightsStatus,1000);
}
function validMedia(m) {
  if(!m||!['missing','ai','photo'].includes(m.kind))return false;
  if(m.kind==='missing')return m.src===null;
  if(!safeAsset(m.src)||!size(m)||!text(m.alt,600)||!text(m.credit,500)||!text(m.rightsStatus,1000))return false;
  if(m.kind==='photo')return safeSource(m.sourcePage)&&m.publicReuse===true;
  return /AI/i.test(m.alt)&&/^records\/[a-z0-9-]+\.json$/.test(m.record||'')&&m.publicReuse===false;
}
export function validPackage(data,id) {
  try {return Boolean(isCity(id)&&data&&data.schemaVersion==='people-culture-v1'&&data.runtimeVersion===1
    &&data.cityId===id&&data.city===CITIES[id]&&['draft','ready'].includes(data.status)
    &&Array.isArray(data.people)&&data.people.length<=8&&unique(data.people)
    &&data.people.every(p=>isId(p.id)&&text(p.name,100)&&text(p.connection,1000)&&text(p.intro)&&sources(p.sources)&&validPortrait(p.portrait))
    &&Array.isArray(data.objects)&&data.objects.length<=4&&(data.status!=='ready'||data.objects.length===4)&&unique(data.objects)
    &&data.objects.every(o=>isId(o.id)&&text(o.name,150)&&text(o.category,150)&&text(o.connection,1000)&&text(o.intro)&&sources(o.sources)&&validMedia(o.media))
    &&Array.isArray(data.unresolved)&&data.unresolved.length<=50&&data.unresolved.every(s=>text(s,3000)));}catch{return false;}
}
export function pageRoute(search) {
  const params=new URLSearchParams(search),raw=params.get('city');
  return {id:isCity(raw)?raw:null,invalid:raw!==null&&!isCity(raw),preview:params.get('preview')==='1',
    variant:params.get('variant')==='B'?'B':'A',person:params.get('person'),object:params.get('object')};
}
export function cityUrl(id,{preview=false,variant='A'}={}) {
  if(!isCity(id))throw Error('unregistered city');
  const params=new URLSearchParams({city:id,variant:variant==='B'?'B':'A'});
  if(preview)params.set('preview','1');return '?'+params;
}
export function topicUrl(id,variant='A') {
  return '../?variant='+(variant==='B'?'B':'A')+(isCity(id)?'#/city/'+id:'#/map');
}
export function topicReadingUrl(id,variant='A') {
  return isCity(id)?'../?variant='+(variant==='B'?'B':'A')+'&section=topic#/city/'+id:topicUrl(null,variant);
}
export function contentSection(hash) {
  return hash==='#people'?'people':hash==='#objects'?'objects':null;
}
export function nextIndex(index,key,length) {
  if(!length)return -1;
  return key==='Home'?0:key==='End'?length-1:['ArrowRight','ArrowDown'].includes(key)?(index+1)%length:
    ['ArrowLeft','ArrowUp'].includes(key)?(index+length-1)%length:-1;
}
export function cityStateAnnouncement(state) {
  const name=isCity(state?.id)?CITIES[state.id]:'';
  if(!name)return '';
  if(state.phase==='loading')return '正在载入'+name+'的资料…';
  if(state.phase==='ready')return name+'资料已载入。';
  if(state.phase==='error')return name+'资料未能载入，请重新载入本市资料。';
  if(state.phase==='empty')return name+'的人物与四物尚未接入，可返回本市专题或选择另一座城市。';
  if(state.phase==='draft')return name+'的资料仍在核对，当前未展示草稿；可选择内部资料预览。';
  return '';
}
export function createCityLoader({load,onState,timeoutMs=12000}) {
  let epoch=0,abort=null,current=null;
  const emit = state => {current=state;onState(state);return state;};
  return {
    get state(){return current;},
    async select(id,{preview=false,force=false}={}) {
      if(!force&&current?.id===id&&current.preview===preview&&current.phase!=='loading')return current;
      const ticket=++epoch;abort?.abort();abort=new AbortController();
      const signal=abort.signal;
      if(!isCity(id))return emit({phase:'choose',id:null,preview});
      emit({phase:'loading',id,preview});
      let timer;
      try {
        const job=Promise.resolve().then(()=>load(id,{signal}));
        const data=timeoutMs>0?await Promise.race([job,new Promise((_,reject)=>{
          timer=setTimeout(()=>{abort?.signal===signal&&abort.abort();reject(Error('timeout'));},timeoutMs);
        })]):await job;
        if(ticket!==epoch)return null;
        if(data===null)return emit({phase:'empty',id,preview});
        if(!validPackage(data,id))throw Error('invalid package');
        return emit({phase:data.status==='draft'&&!preview?'draft':'ready',id,preview,data});
      }catch{
        if(ticket!==epoch)return null;
        return emit({phase:'error',id,preview});
      }finally{if(timer)clearTimeout(timer);}
    },
    dispose(){++epoch;abort?.abort();current=null;}
  };
}
