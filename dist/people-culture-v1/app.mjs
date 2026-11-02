import {CITIES,isCity,createCityLoader,pageRoute,cityUrl,topicUrl,topicReadingUrl,contentSection,cityStateAnnouncement} from './model.mjs';
import {createCityView} from './view.mjs';

const doc=document,host=doc.getElementById('city-content'),status=doc.getElementById('load-status'),select=doc.getElementById('city-select');
const title=doc.getElementById('page-title'),intro=doc.getElementById('page-intro'),topic=doc.getElementById('topic-link'),map=doc.getElementById('map-link');
const scene=doc.getElementById('scene-link');
let view=null,route=pageRoute(location.search),navigation=0;
for(const [id,name] of Object.entries(CITIES)){const option=doc.createElement('option');option.value=id;option.textContent=name;select.append(option);}
const make=(tag,text,cls)=>{const n=doc.createElement(tag);n.textContent=text||'';if(cls)n.className=cls;return n;};
function remember() {history.replaceState({...history.state,pc:{city:route.id,y:scrollY,focus:doc.activeElement?.id||null}},'',location.href);}
function selectionChange({person,object,candidates}) {
  const url=new URL(location.href);
  for(const [name,value] of Object.entries({person,object})){if(value)url.searchParams.set(name,value);else url.searchParams.delete(name);}
  if(route.preview&&candidates)url.searchParams.set('candidates','1');else url.searchParams.delete('candidates');
  history.replaceState(history.state,'',url);route=pageRoute(url.search);
}
function empty(state,heading,copy) {
  const section=make('section','','empty-state');section.append(make('h2',heading),make('p',copy));
  if(state.phase==='error'){const retry=make('button','重新载入本市资料');retry.type='button';retry.addEventListener('click',()=>loadRoute({force:true,focus:true}));section.append(retry);}
  if(state.phase==='draft'){const a=make('a','查看内部资料预览（未完成核验）');a.href=cityUrl(state.id,{...route,preview:true});section.append(a);}
  host.replaceChildren(section);
}
const loader=createCityLoader({
  async load(id,{signal}) {
    const response=await fetch('data/'+id+'.json',{signal,cache:'no-store'});
    if(response.status===404)return null;if(!response.ok)throw Error('load failed');return response.json();
  },
  onState(state) {
    view?.dispose();view=null;host.replaceChildren();host.setAttribute('aria-busy',String(state.phase==='loading'));
    const name=CITIES[state.id];doc.body.dataset.city=state.id||'';select.value=state.id||'';
    if(name)title.replaceChildren(make('span',name+'，'),make('span','物有来处。'));else title.textContent='物有来处，手艺有人。';
    doc.title=name?name+' · 人物与四物 · 一物见山东':'人物与四物 · 一物见山东';
    topic.href=topicReadingUrl(state.id,route.variant);topic.textContent=name?name+'专题':'文化地图';map.href=topicUrl(null,route.variant);doc.querySelector('.brand').href=map.href;
    scene.hidden=!name;scene.href=topicUrl(state.id,route.variant);scene.textContent=name?name+'画卷':'城市画卷';
    intro.textContent=name?'从真实人物与四项地方文化，继续认识'+name+'。':'选择一座城市，从真实人物与四项地方文化，继续认识山东。';
    status.textContent=cityStateAnnouncement(state);
    if(state.phase==='ready') {
      const review=route.preview&&new URLSearchParams(location.search).get('review')==='1';
      view=createCityView(doc,state.data,{preview:state.preview,review,candidates:review&&new URLSearchParams(location.search).get('candidates')==='1',person:route.person,object:route.object,onSelect:selectionChange});host.append(view.root);
    }else if(state.phase==='choose')empty(state,route.invalid?'这个城市编号不可用':'先选择一座山东城市','这里只读取当前城市的资料；不会用其他城市的人物和图片替代。');
    else if(state.phase==='empty')empty(state,name+'的资料正在整理','本市人物与四物尚未接入。可以选择另一座城市，或返回本市原有专题继续阅读。');
    else if(state.phase==='draft')empty(state,name+'的资料仍在核对','当前交付为内部草稿，不作为正式城市内容展示。你可以明确进入内部预览，查看已到资料与缺项。');
    else if(state.phase==='error')empty(state,name+'的资料暂时未能载入','网络响应或资料格式有误，已保留当前城市身份。请重试，或返回本市原有专题。');
  }
});
async function loadRoute({force=false,focus=false,restore=null}={}) {
  const ticket=++navigation;route=pageRoute(location.search);await loader.select(route.id,{preview:route.preview,force});
  if(ticket!==navigation)return;
  if(restore?.city===route.id){doc.getElementById(restore.focus)?.focus({preventScroll:true});scrollTo({top:Math.max(0,Number(restore.y)||0),left:0,behavior:'instant'});}
  else if(focus){title.focus({preventScroll:true});scrollTo({top:0,left:0,behavior:'instant'});}
  else {
    const section=contentSection(location.hash),target=section&&doc.getElementById(section);
    if(target){doc.getElementById(section+'-title')?.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'instant'});}
  }
}
doc.getElementById('city-form').addEventListener('submit',event=>{
  event.preventDefault();if(!isCity(select.value)){select.focus();return;}
  remember();history.pushState({},'',cityUrl(select.value,route));loadRoute({focus:true});
});
addEventListener('popstate',()=>{
  const next=pageRoute(location.search);
  if(next.id===route.id&&next.preview===route.preview)return;
  loadRoute({restore:history.state?.pc||null});
});
addEventListener('pagehide',()=>{remember();view?.dispose();loader.dispose();});
addEventListener('pageshow',event=>{if(event.persisted)loadRoute({force:true,restore:history.state?.pc||null});});
if('scrollRestoration' in history)history.scrollRestoration='manual';
loadRoute();
