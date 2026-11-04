import {nextIndex} from './model.mjs';
import {optimizedAsset} from '../optimized-assets.mjs';

// The gallery stays in normal document flow. Animations never own visibility.
export function createCityView(doc,data,{preview=false,review=false,candidates=false,mediaBase='',person=null,object=null,onSelect=()=>{}}={}) {
  const win=doc.defaultView,animations=new Set(),personEntries=[],objectEntries=[];
  const motionPreference=win?.matchMedia?.('(prefers-reduced-motion: reduce)');
  let disposed=false,selectedPerson=null,selectedObject=null;
  const make=(tag,text='',className='')=>{const n=doc.createElement(tag);if(text)n.textContent=text;if(className)n.className=className;return n;};
  const reduced=()=>Boolean(motionPreference?.matches);
  const stop=()=>{for(const a of animations)a.cancel();animations.clear();};
  motionPreference?.addEventListener?.('change',stop);
  function animate(node,frames,options) {
    if(disposed||reduced()||!node.animate)return;
    const a=node.animate(frames,{duration:360,easing:'cubic-bezier(.16,1,.3,1)',iterations:1,...options});
    animations.add(a);a.finished.then(()=>animations.delete(a),()=>animations.delete(a));
  }
  const sourceLink=(source,label=source.title)=>{const a=make('a',label);a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';return a;};
  function sourceLinks(sources) {
    const nav=make('nav','','source-links');nav.setAttribute('aria-label','资料来源');
    for(const s of sources)nav.append(sourceLink(s));return nav;
  }
  const asset=path=>mediaBase+path;
  function useObjectImage(image,path,onFailure) {
    const original=asset(path), mapped=optimizedAsset('people-culture-v1/'+path);
    const preferred=asset(mapped.startsWith('people-culture-v1/')?mapped.slice('people-culture-v1/'.length):path);
    let fallback=preferred!==original;
    image.addEventListener('error',()=>{if(disposed)return;if(fallback){fallback=false;image.src=original;return;}onFailure();});
    image.src=preferred;
  }
  const artworkAlt=media=>media.kind==='ai'?media.alt.replace(/^AI[^：:]*[：:]\s*/i,'').replace(/[，；。](?:非|不(?:是|代表|作为|用于|对应)).*$/,''):media.alt;
  const root=make('div','','pc-view');root.dataset.packageCity=data.cityId;
  if(preview&&review) {
    const notice=make('aside','','preview-notice');notice.setAttribute('aria-label','内部预览说明');
    notice.append(make('strong',data.status==='draft'?'内部资料预览 · 草稿尚在核对':'本机内部预览'));
    notice.append(make('p','人物、文字、图片与公开使用许可分别核验；此页不代表最终验收或公开授权。'));
    root.append(notice);
  }
  const sectionHeading=(section,id,title,description,hint)=>{
    section.id=id;section.setAttribute('aria-labelledby',id+'-title');
    const head=make('div','','section-heading'),copy=make('div'),h=make('h2',title);h.id=id+'-title';h.tabIndex=-1;
    copy.append(h,make('p',description));head.append(copy,make('p',hint,'hint'));section.append(head);
  };
  const people=make('section','','section people-section');
  sectionHeading(people,'people','手艺与人','从有出处的人物介绍，认识'+data.city+'的文化传习。','选择姓名，阅读人物与本城的联系');
  if(!data.people.length)people.append(make('p','本市人物资料仍在核对，暂不以其他城市人物替代。','empty-copy'));
  else {
    const stage=make('div','','people-stage'),portraitHost=make('div'),content=make('div','','people-content');
    const tabs=make('div','','person-tabs'),panels=make('div','','person-details');
    tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label',data.city+'文化人物');tabs.setAttribute('aria-orientation','horizontal');
    content.append(make('p','手艺留在物里，也留在人与人之间。','people-instruction'),tabs,panels);
    const focusedWithin=()=>tabs.contains(doc.activeElement)||panels.contains(doc.activeElement)||portraitHost.contains(doc.activeElement);
    function portrait(person) {
      const info=person.portrait,figure=make('figure','','portrait'),frame=make('div','','portrait-frame'),caption=make('figcaption');
      const visible=info.kind==='approved'||(preview&&review&&candidates&&info.kind==='candidate');
      stage.dataset.hasPortrait=String(visible);portraitHost.hidden=!visible;
      if(visible) {
        const image=make('img');image.alt=info.alt;image.width=info.width;image.height=info.height;image.decoding='async';
        const error=make('div','','image-error'),retry=make('button','重试人物照片');let attempts=0;
        figure.tabIndex=-1;figure.setAttribute('aria-label',person.name+'照片与图片说明');
        error.hidden=true;error.setAttribute('role','status');retry.type='button';
        error.append(make('p','照片暂时无法显示，人物介绍和资料来源仍可阅读。'),retry);
        image.addEventListener('error',()=>{if(disposed)return;image.hidden=true;error.hidden=false;});image.src=asset(info.src);
        retry.addEventListener('click',()=>{
          if(disposed||selectedPerson!==person.id)return;
          image.hidden=false;error.hidden=true;image.src=asset(info.src)+'?retry='+(++attempts);figure.focus({preventScroll:true});
        });
        frame.append(image,error);figure.dataset.state='photo';
        caption.append(make('strong',info.kind==='candidate'?'真实照片 · 待授权内部候选':person.name));
        caption.append(make('p',info.caption||person.name),make('p',info.credit));
        if(review)caption.append(make('p',info.rightsStatus));
        caption.append(sourceLink({url:info.sourcePage,title:'查看照片原报道'}));
      }else {
        figure.dataset.state='missing';const empty=make('div','','portrait-empty');
        empty.append(make('span',person.name,'empty-name'));frame.append(empty);
      }
      figure.append(frame,caption);portraitHost.replaceChildren(figure);
      if(preview&&review&&info.kind==='candidate') {
        portraitHost.hidden=false;
        const label=make('label','','candidate-control'),input=make('input');input.type='checkbox';input.checked=candidates;
        input.id='candidate-portrait-toggle';label.append(input,make('span','显示待授权的内部照片候选'));
        input.addEventListener('change',()=>{
          candidates=input.checked;portrait(person);onSelect({person:selectedPerson,object:selectedObject,candidates});
          const next=doc.getElementById('candidate-portrait-toggle');next?.focus({preventScroll:true});
        });portraitHost.append(label);
      }
    }
    const choosePerson=(id,{focus=false,motion=true,notify=true}={})=>{
      const entry=personEntries.find(x=>x.item.id===id);if(!entry||disposed)return;
      const changed=selectedPerson!==id;selectedPerson=id;
      for(const e of personEntries){const active=e===entry;e.tab.setAttribute('aria-selected',String(active));e.tab.tabIndex=active?0:-1;e.panel.hidden=!active;}
      if(changed){stop();portrait(entry.item);if(motion)animate(entry.panel,[{opacity:.6,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}]);}
      if(focus)entry.tab.focus({preventScroll:true});if(notify)onSelect({person:selectedPerson,object:selectedObject,candidates});
    };
    for(const item of data.people) {
      const tab=make('button');tab.type='button';tab.id='person-tab-'+item.id;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','person-'+item.id);
      tab.append(make('span',item.name),make('small',data.city));
      const panel=make('article');panel.id='person-'+item.id;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);panel.tabIndex=0;
      panel.dataset.guideKind='scene';panel.dataset.guideId='person-'+data.cityId+'-'+item.id;panel.dataset.guideTitle=data.city+' · '+item.name;
      panel.dataset.guideSource=item.sources[0]?.url||'';
      panel.append(make('h3',item.name),make('p',item.connection,'connection'),make('p',item.intro),sourceLinks(item.sources));
      personEntries.push({item,tab,panel});tabs.append(tab);panels.append(panel);
      tab.addEventListener('click',()=>choosePerson(item.id));
      tab.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&!focusedWithin())choosePerson(item.id);});
      tab.addEventListener('keydown',e=>{const i=nextIndex(personEntries.findIndex(x=>x.tab===tab),e.key,personEntries.length);if(i<0)return;e.preventDefault();choosePerson(personEntries[i].item.id,{focus:true});});
    }
    stage.append(portraitHost,content);people.append(stage);root.append(people);
    // Expose only bounded selection commands; source strings never become HTML.
    people.select=choosePerson;
  }
  if(!root.contains(people))root.append(people);
  const local=make('section','','section objects-section');
  sectionHeading(local,'objects','本城四物','从器物、表演或地方风味，继续走进'+data.city+'。','选择画面，展开介绍');
  const screens=make('div','','screens'),details=make('div','','object-details');screens.setAttribute('aria-label',data.city+'文化对象');
  function fullFigure(item) {
    const m=item.media,figure=make('figure','','object-figure'),frame=make('div','','object-art-frame'),caption=make('figcaption');
    figure.tabIndex=-1;figure.setAttribute('aria-label',item.name+'完整图与图片说明');
    if(m.kind==='missing') {
      frame.append(make('p','本项配图尚未就绪，介绍与来源仍可阅读。','image-error'));caption.textContent='暂无配图，不使用其他城市画面替代。';
    }else {
      frame.style.setProperty('--image-ratio',m.width+' / '+m.height);
      const image=make('img'),error=make('div','','image-error'),retry=make('button','重试图片');let attempts=0;
      image.width=m.width;image.height=m.height;image.alt=artworkAlt(m);image.loading='lazy';image.decoding='async';error.hidden=true;error.setAttribute('role','status');retry.type='button';
      error.append(make('p','画面暂时无法显示，介绍与来源仍可阅读。'),retry);
      useObjectImage(image,m.src,()=>{image.hidden=true;error.hidden=false;});
      retry.addEventListener('click',()=>{
        image.hidden=false;error.hidden=true;image.src=asset(m.src)+'?retry='+(++attempts);figure.focus({preventScroll:true});
        const entry=objectEntries.find(e=>e.item.id===item.id);
        if(entry?.image){entry.image.hidden=false;entry.screen.dataset.hasImage='true';entry.image.src=image.src;entry.state.textContent='已展开';}
      });
      frame.append(image,error);
      caption.append(make('p',item.name));
      if(m.kind==='photo')caption.append(make('p',m.credit));
    }
    figure.append(frame,caption);return figure;
  }
  const focusedObject=()=>objectEntries.some(e=>e.panel.contains(doc.activeElement)||e.trigger.contains(doc.activeElement));
  function chooseObject(id,{focus=false,motion=true,notify=true}={}) {
    const entry=objectEntries.find(x=>x.item.id===id);if(!entry||disposed)return;
    const changed=selectedObject!==id;selectedObject=id;
    if(!changed){if(focus)entry.trigger.focus({preventScroll:true});return;}
    // FLIP measures once per interaction; never animates flex, width or height.
    const before=changed&&motion&&!reduced()?objectEntries.map(e=>e.screen.getBoundingClientRect?.()):[];stop();
    for(const e of objectEntries){const active=e===entry;e.screen.classList.toggle('is-active',active);e.trigger.setAttribute('aria-expanded',String(active));e.panel.hidden=!active;e.state.textContent=(active?'已展开':'展开介绍')+(e.item.media.kind==='missing'?' · 待配图':e.screen.dataset.hasImage==='false'?' · 图片未载入':'');}
    if(changed&&motion) {
      objectEntries.forEach((e,i)=>{const from=before[i],to=e.screen.getBoundingClientRect?.();if(!from||!to||!to.width||!to.height)return;
        animate(e.screen,[{transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})`},{transform:'translate(0,0) scale(1,1)'}],{duration:440});
      });
      animate(entry.panel,[{opacity:.6,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}]);
    }
    if(focus)entry.trigger.focus({preventScroll:true});if(notify)onSelect({person:selectedPerson,object:selectedObject,candidates});
  }
  for(const item of data.objects) {
    const screen=make('article','','screen'),trigger=make('button','','screen-trigger'),state=make('span','','screen-state');
    screen.dataset.object=item.id;screen.dataset.hasImage=String(item.media.kind!=='missing');
    let image=null;
    if(item.media.kind!=='missing') {
      image=make('img');image.alt='';image.setAttribute('aria-hidden','true');image.loading='lazy';image.decoding='async';
      useObjectImage(image,item.media.src,()=>{image.hidden=true;screen.dataset.hasImage='false';state.textContent=(selectedObject===item.id?'已展开':'展开介绍')+' · 图片未载入';});screen.append(image);
    }
    trigger.type='button';trigger.id='object-trigger-'+item.id;trigger.setAttribute('aria-controls','object-'+item.id);trigger.append(make('span',item.name,'screen-name'),state);screen.append(trigger);
    const panel=make('article','','object-panel'),copy=make('div','','object-copy');panel.id='object-'+item.id;panel.setAttribute('aria-labelledby',trigger.id);
    panel.dataset.guideKind='scene';panel.dataset.guideId='object-'+data.cityId+'-'+item.id;panel.dataset.guideTitle=data.city+' · '+item.name;
    panel.dataset.guideSource=item.sources[0]?.url||'';
    copy.append(make('h3',item.name),make('p',item.category,'object-category'),make('p',item.connection),make('p',item.intro),sourceLinks(item.sources));
    panel.append(fullFigure(item),copy);screens.append(screen);details.append(panel);objectEntries.push({item,screen,image,trigger,state,panel});
    trigger.addEventListener('click',()=>chooseObject(item.id));
    screen.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&!focusedObject())chooseObject(item.id);});
    trigger.addEventListener('keydown',e=>{const i=nextIndex(objectEntries.findIndex(x=>x.trigger===trigger),e.key,objectEntries.length);if(i<0)return;e.preventDefault();chooseObject(objectEntries[i].item.id,{focus:true});});
  }
  local.append(screens,details);root.append(local);
  if(!data.objects.length)local.append(make('p','本市文化对象仍在整理，不借用别的城市内容。','empty-copy'));
  if(preview&&review&&data.unresolved.length) {
    const notes=make('details','','section review-notes'),list=make('ul');notes.append(make('summary','本城资料待完善事项'));
    for(const text of data.unresolved)list.append(make('li',text));notes.append(list);root.append(notes);
  }
  people.select?.(personEntries.some(x=>x.item.id===person)?person:personEntries[0]?.item.id,{motion:false,notify:false});
  chooseObject(objectEntries.some(x=>x.item.id===object)?object:objectEntries[0]?.item.id,{motion:false,notify:false});
  return {root,selectPerson:people.select,selectObject:chooseObject,dispose(){disposed=true;stop();motionPreference?.removeEventListener?.('change',stop);}};
}
