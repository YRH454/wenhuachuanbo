// CITY-GUIDES-v1: route-local extension. Zibo keeps its existing implementation.
import {CITY_GUIDES} from './city-guide-index.mjs';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const slug = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,47}$/.test(value);
const https = value => {try {const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!!u.hostname;}catch{return false;}};
// Visitor-facing summaries only. Full source-audit scopes remain in the adopted JSON.
const SOURCE_INTROS=Object.freeze({
 '370100':{
  spring:'介绍趵突泉的位置、泉眼与近旁景观。景区评级属于旅游档案。',
  landscape:'2009年的泉景介绍，供了解泉池与亭堂的空间关系。',
  life:'2025年黑虎泉与护城河边的生活报道，地点与趵突泉不同；水位信息以报道时点为准。'
 },
 '370200':{
  'qd-district':'2023年市南区第七批非遗名录中的项目记录。',
  'qd-culture':'介绍青岛贝雕的地方产业历程、贝材加工与看盘变化。',
  'qd-visit':'2025年高校团队的车间探访与数字化讨论。'
 },
 '370400':{
  'ichina-campus':'介绍伏里村的土陶课堂、手把手教学与校园传习。',
  'xinhua-fuli':'2025年伏里土陶的地方报道，介绍用土、制作环节与生活用途。',
  'iqilu-campus':'记录2023年山亭区发布会介绍的校园传习措施与实践案例。'
 },
 '370500':{
  workshop:'2024年大码头苇编工坊的产品、材料与培训故事。',
  teaching:'介绍苇片处理、学员传习与日用产品实践。',
  award:'介绍2024年具名作品“大码头苇编包”的获奖记录。'
 },
 '370600':{
  'yt-project':'介绍莱州草辫的项目档案、地域、编结方法与关联人物。',
  'yt-exhibition':'介绍2025年莱州草辫专题展，以及草编包、收纳盒、麦草贴画等展品。所载展期已结束。'
 },
 '370700':{
  'wf-project':'聂家庄泥塑的国家级项目档案与高密地域介绍。',
  'wf-person':'介绍聂希蔚的创作和授艺经历。',
  'wf-workshop':'记录2023年工坊的泥塑品类、培训与研发实践。',
  'wf-report':'其中山东聂家庄泥塑一节介绍制作与叫虎发声结构。'
 },
 '370800':{
  'jining-nishan':'介绍曲阜尼山石、因材施艺、制砚环节及砚铭文化。',
  'jining-register':'地方史志整理的非遗名录，载有2009年省级项目记录。',
  'sdxc-nishan':'2020年的制砚报道，讲述顺应石形与纹理设计砚台。'
 },
 '370900':{
  project:'泰山皮影戏的项目档案，以及造型、声腔与题材概况。',
  person:'范正安的代表性传承人条目，介绍制作、表演与伴奏实践。',
  practice:'2021年展演、传习、亲子体验与高校合作的报道，不是当前场次或预约信息。'
 },
 '371000':{
  'wh-register':'2008年威海市第二批市级非遗名录的正式通知。',
  'wh-craft':'介绍锡合金纹饰、器物底胎与沿曲面连接、打光等技艺。',
  'wh-story':'2023年李江玉、杜佳慧参与制作与创新的故事。',
  'wh-education':'2023年的学生锡镶錾刻研学记录，不是当前课程预约信息。'
 },
 '371100':{
  'sdxc-cup-2024':'介绍1973年日照东海峪遗址出土的一件蛋壳黑陶高柄杯。',
  'xinhua-making-2024':'记录2024年日照黑陶制作、修复、开窑与文化讲解。',
  'xinhua-experience-2025':'记录2025年留学生在日照体验泥条盘筑与拉坯塑形。',
  'ihchina-news-2026':'2026年山东非遗月活动资讯，分别提及日照黑陶烧制技艺与莒县过门笺。'
 },
 '371300':{
  'ihchina-project':'郯城木旋玩具的项目档案，介绍耍货、旋制、彩绘与主要用色。',
  'xinhua-newyear-2021':'记录2021年春节前年集木旋玩具的制作场景。',
  'sdxc-renewal-2022':'介绍2022年郯城木旋企业的新玩偶、启蒙玩具与网络销售探索。',
  'cns-workshop-2024':'2024年旋制毛坯与绘制木旋玩具的新闻记录。'
 },
 '371400':{
  'official-project':'德州扒鸡的项目档案，以及运河商贸背景和制作概述。',
  'archive-donation':'报道2026年5月崔学平捐赠扒鸡技艺史料的事件。',
  'festival-life':'其中德州一节讲述年节购买、返岗携带与门店口味探索。'
 },
 '371500':{
  'official-project':'东昌葫芦雕刻的项目档案、地域与日常用途介绍。',
  'official-culture':'介绍运河交流、吉祥题材与多种表现技法。',
  'official-person':'李玉成的代表性传承人档案与学习经历。',
  'contemporary-life':'2026年路庄村葫芦种植、加工与文创生活的报道。'
 },
 '371600':{
  'official-project':'博兴柳编的项目档案，介绍麻大湖畔的原料与日用编织。',
  'craft-report':'讲述博兴手艺人在造型、建筑应用与摄影电商方面的探索。',
  'university-visit':'2023年高校对博兴产业园、非遗展馆的走访记录，不是当前开放信息。'
 },
 '371700':{
  'official-project':'曹州面人的项目档案、花供与观赏工艺品背景，以及塑作手法。',
  'official-person':'陈素景的代表性传承人档案与授艺经历。',
  'contemporary-creation':'2026年牡丹题材、卡通面塑与公共文化教习的报道。'
 }
});

// The competition page carries cultural copy; production provenance stays in the package.
export const artworkDescription=asset=>asset.alt.replace(/^AI创意插画[：:]\s*/i,'').replace('两个虚构面塑风格人物','两个面塑风格人物');
export const artworkTitle=asset=>asset.caption.split(' · ')[0];
const READER_ANSWERS=Object.freeze({
  '370600':{'草辫只有一种编法吗？':'不是。项目介绍区分三根、五根和七根草掐法；压、挑的配合会形成不同辫纹。'},
  '370900':{
    '影偶造型可以从哪里看起？':'可以留意人物脸部与轮廓。官方介绍指出，泰山皮影的造型借鉴地方剪纸和传统戏曲脸谱。',
    '范正安与这个项目有什么关系？':'中国非遗网的代表性传承人条目将他列为皮影戏（泰山皮影戏）的第三批国家级代表性传承人，并介绍其制作和表演实践。人物认定批次与项目公布批次是两类信息。'
  },
  '371100':{'这里提到的高柄杯出自哪里？':'山东宣传网2024年报道所述标本，1973年出土于日照东海峪遗址。这一出处对应报道介绍的器物，不代表其他同类器物。'},
  '371400':{'扒鸡与今天的日常生活有什么关系？':'2025年春节报道中，市民在年节购买扒鸡，也有人返岗时携带家乡风味；部分门店尝试不同口味。这些当时的生活实例，把饮食与团聚、往来联系起来。'},
  '371500':{'这项手艺与今天的生活还有哪些连接？':'2026年7月的官方报道记录了路庄村的种植、加工、销售，以及茶叶罐、挂件、胸针等文创方向。这些是当时的生活与创作实例；当前活动安排仍需另核。'},
  '371600':{
    '博兴柳编是不是只能用柳条？':'不能这样概括当地的草柳编。官方介绍还列有蒲草、苇草、玉米皮、麦秆等植物原料；具体作品的材料需要逐件确认。',
    '想继续了解，可以先从哪里读起？':'可先读官方项目页，再结合人民日报的手艺人采访和青岛农业大学2023年的当地走访报道。报道中的走访是当时的记录，实际参观请另核最新公告。'
  },
  '371700':{'为什么从牡丹意境进入面人故事？':'2026年4月的菏泽日报社报道记录了李斌将牡丹题材与面塑结合的创作，提供了两者联系的当代实例。'}
});
export const readerQuestions=data=>data.questions.filter(question=>question.kind!=='disclaimer')
  .map(question=>({...question,body:READER_ANSWERS[data.cityId]?.[question.title]||question.body}));

// Defensive runtime check, not a replacement for the offline schema or human review.
export function validCityGuide(data, id, city) {
  if (!record(data) || data.schemaVersion!==1 || data.deliveryStatus!=='ready' || data.cityId!==id
    || id==='370300' || data.route!=='#/city/'+id || data.city!==city || data.questionMode!=='fixed-source') return false;
  if (!record(data.topic) || !['name','location','category','intro'].every(k=>text(data.topic[k]))) return false;
  if (!record(data.scene) || data.scene.backgroundCityId!==id || data.scene.label!=='AI意境图' || !text(data.scene.entryLabel)) return false;
  if (!record(data.visual) || !slug(data.visual.signature) || !['archive','woven','folio'].includes(data.visual.layout)
    || !record(data.visual.palette) || !['paper','ink','muted','accent','rule'].every(k=>/^#[a-f0-9]{6}$/i.test(data.visual.palette[k]))) return false;
  if (!record(data.sources) || !Object.keys(data.sources).length || !Object.entries(data.sources).every(([key,s])=>slug(key)&&record(s)&&text(s.title)&&text(s.short)&&https(s.url)&&text(s.supports)&&/^\d{4}-\d{2}-\d{2}$/.test(s.checkedAt))) return false;
  const cited = ids => Array.isArray(ids) && ids.every(key=>Object.hasOwn(data.sources,key));
  if (!cited(data.topic.sources) || !data.topic.sources.length) return false;
  if (!Array.isArray(data.archive) || data.archive.length>12 || !data.archive.every(row=>record(row)&&text(row.label)&&text(row.value)&&cited(row.sources)&&row.sources.length)) return false;
  if (!Array.isArray(data.media) || data.media.length>8 || !data.media.every(m=>record(m)&&slug(m.id)&&new RegExp('^media/'+id+'-[a-z0-9-]+\\.png$').test(m.src)&&['ai','photo'].includes(m.kind)&&['section','ornament'].includes(m.role)&&typeof m.alt==='string'&&(m.role==='section'?text(m.alt):m.alt==='')&&text(m.caption)&&(m.kind!=='ai'||(/AI/i.test(m.caption)&&text(m.generationTool)&&['01a1916a-77a5-7490-b6fe-80d589a41d6c','01a1918c-cfc8-7773-a282-eee1f74f6949'].includes(m.generatorThreadId)))&&Number.isInteger(m.width)&&m.width>0&&m.width<=6000&&Number.isInteger(m.height)&&m.height>0&&m.height<=6000&&m.reviewStatus==='checked')) return false;
  const mediaIds=new Set(data.media.map(m=>m.id));
  if (mediaIds.size!==data.media.length || !Array.isArray(data.passages) || data.passages.length<2 || data.passages.length>6
    || !data.passages.some(p=>p?.id==='overview') || !data.passages.every(p=>record(p)&&slug(p.id)&&text(p.title)&&Array.isArray(p.paragraphs)&&p.paragraphs.length>0&&p.paragraphs.every(text)&&cited(p.sources)&&p.sources.length&&Array.isArray(p.media)&&p.media.every(id=>mediaIds.has(id)))) return false;
  if (new Set(data.passages.map(p=>p.id)).size!==data.passages.length || !Array.isArray(data.questions) || data.questions.length<3 || data.questions.length>6
    || !data.questions.every(q=>record(q)&&text(q.title)&&text(q.body)&&['fact','disclaimer'].includes(q.kind)&&cited(q.sources)&&(q.kind==='disclaimer'||q.sources.length))) return false;
  return Array.isArray(data.unresolved) && data.unresolved.length===0;
}

export function createCityGuide(doc, {registry=CITY_GUIDES, loadGuide, getBackground=()=>null}={}) {
  const host=doc.getElementById('city-guide-host'),win=doc.defaultView,cache=new Map();
  let epoch=0,current=null;
  const make=(tag,value='',className='')=>{const node=doc.createElement(tag);if(value)node.textContent=value;if(className)node.className=className;return node;};
  const arrow=direction=>{
    const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg'),path=doc.createElementNS('http://www.w3.org/2000/svg','path');
    svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
    path.setAttribute('d',direction==='left'?'M19 12H5m6-6-6 6 6 6':direction==='up'?'M12 20V5m-6 6 6-6 6 6':'M12 4v15m-6-6 6 6 6-6');svg.append(path);return svg;
  };
  const button=(label,handler,className='cg-text-button')=>{const node=make('button',label,className);node.type='button';node.addEventListener('click',handler);return node;};
  const mapLink=(className='')=>{const node=make('a','',className);node.href='#/map';node.append(arrow('left'),'返回地图');return node;};
  const behavior=()=>win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
  const move=(ctx,node,focus)=>{if(current!==ctx)return;focus.focus({preventScroll:true});node.scrollIntoView({block:'start',behavior:behavior()});};
  const backToScene=ctx=>move(ctx,ctx.scene,ctx.trigger);
  function sourceLink(source,full=false) {
    const a=make('a',full?source.title:source.short);a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';return a;
  }
  function cite(parent,ids,data) {
    if(!ids.length)return;
    const line=make('p','资料依据：','cg-citations');
    ids.forEach((id,i)=>{if(i)line.append(' · ');line.append(sourceLink(data.sources[id]));});parent.append(line);
  }
  function mediaFigure(ctx,asset,opening=false) {
    const figure=make('figure','',opening?'cg-material cg-body-art':'cg-media');
    figure.dataset.guideKind='scene';figure.dataset.guideId='citymedia-'+ctx.id+'-'+asset.id;figure.dataset.guideTitle=artworkTitle(asset);
    const frame=make('div','','cg-art-frame'),img=make('img'),error=make('p','插画暂时无法显示，正文仍可阅读。','cg-art-error');
    figure.dataset.mediaId=asset.id;frame.style.setProperty('--cg-image-ratio',asset.width+' / '+asset.height);
    img.alt=artworkDescription(asset);img.width=asset.width;img.height=asset.height;img.loading='lazy';img.decoding='async';
    error.hidden=true;error.setAttribute('role','status');
    img.onerror=()=>{img.hidden=true;error.hidden=false;figure.dataset.state='error';};
    img.src=registry[ctx.id].slice(0,registry[ctx.id].lastIndexOf('/')+1)+asset.src;
    frame.append(img,error);figure.append(frame,make('figcaption',artworkTitle(asset)));return figure;
  }
  function fillArticle(ctx,data) {
    const article=ctx.article,targets=new Map();article.replaceChildren();article.hidden=false;
    article.dataset.layout=data.visual.layout;article.dataset.signature=data.visual.signature;
    for(const [role,value] of Object.entries(data.visual.palette))article.style.setProperty('--cg-'+role,value);
    const bar=make('div','','cg-bar'),barInner=make('div','','cg-bar-inner'),brand=make('a','一物见山东','cg-brand'),actions=make('div','','cg-actions');
    brand.href='#/map';actions.append(button('回到画面',()=>backToScene(ctx)),mapLink());barInner.append(brand,actions);bar.append(barInner);article.append(bar);
    const inner=make('div','','cg-inner'),head=make('header','','cg-heading'),identity=make('div','','cg-identity');
    const title=make('h2',data.topic.name);title.id='city-guide-title';title.setAttribute('tabindex','-1');ctx.title=title;
    const qualifiedName=/^(.+?)(（[^（）]+）)$/.exec(data.topic.name);
    if(qualifiedName)title.replaceChildren(make('span',qualifiedName[1]),make('span',qualifiedName[2],'cg-title-variant'));
    identity.append(title,make('p',data.topic.location+' · '+data.topic.category,'cg-location'));
    const intro=make('div','','cg-intro');intro.append(make('p',data.topic.intro));
    if(ctx.id==='370600')intro.append(make('p','地图取意烟台剪纸；本页走近莱州草辫。','cg-editorial'));
    if(ctx.id==='370900')intro.append(make('p','地图取意泰山山岳；本页走近泰山皮影戏。','cg-editorial'));
    cite(intro,data.topic.sources,data);head.append(identity,intro);
    const openingId=data.passages.find(p=>p.id==='overview')?.media[0];
    const openingArt=data.media.find(m=>m.id===openingId);
    if(openingArt){head.append(mediaFigure(ctx,openingArt,true));head.dataset.hasArt='true';article.dataset.hasBodyArt='true';}
    const nav=make('nav','','cg-chapters');nav.setAttribute('aria-label',data.city+'专题章节');
    const passages=make('div','','cg-passages');
    for(const passage of data.passages) {
      const section=make('section','','cg-passage'),h=make('h3',passage.title),body=make('div','','cg-passage-body');
      section.dataset.guideKind='scene';section.dataset.guideId='topic-'+ctx.id+'-'+passage.id;section.dataset.guideTitle=data.city+' · '+passage.title;
      section.dataset.guideSource=data.sources[passage.sources[0]]?.url||'';
      section.id='city-guide-'+passage.id;h.id=section.id+'-title';h.setAttribute('tabindex','-1');section.setAttribute('aria-labelledby',h.id);section.append(h);
      if(passage.id==='overview'&&data.archive.length) {
        const archive=make('dl','','cg-archive');
        for(const row of data.archive){const pair=make('div');pair.append(make('dt',row.label),make('dd',row.value));archive.append(pair);}
        body.append(archive);cite(body,[...new Set(data.archive.flatMap(row=>row.sources))],data);
      }
      for(const paragraph of passage.paragraphs)body.append(make('p',paragraph));
      for(const id of passage.media) {
        if(id===openingId)continue; // The overview image is already in the opening, never repeated.
        body.append(mediaFigure(ctx,data.media.find(m=>m.id===id)));
      }
      cite(body,passage.sources,data);section.append(body);passages.append(section);targets.set(passage.id,{node:section,focus:h});
      nav.append(button(passage.title,()=>{const target=targets.get(passage.id);move(ctx,target.node,target.focus);}));
    }
    const qa=make('section','','cg-questions');qa.setAttribute('aria-labelledby','city-guide-questions-title');
    const qh=make('h3','资料问答');qh.id='city-guide-questions-title';qa.append(qh,make('p','从这些问题开始，继续认识'+data.city+'。','cg-editorial'));
    for(const question of readerQuestions(data)) {
      const details=make('details','','cg-question'),answer=make('div','','cg-answer');answer.append(make('p',question.body));cite(answer,question.sources,data);
      details.append(make('summary',question.title),answer);qa.append(details);
    }
    const sources=make('section','','cg-sources'),sh=make('h3','资料来源'),list=make('ul');
    sources.id='city-guide-sources';sh.id='city-guide-sources-title';sh.setAttribute('tabindex','-1');sources.setAttribute('aria-labelledby',sh.id);
    for(const [id,source] of Object.entries(data.sources)){
      const li=make('li');li.append(sourceLink(source,true));
      const introduction=SOURCE_INTROS[ctx.id]?.[id];if(introduction)li.append(make('p',introduction,'cg-source-scope'));list.append(li);
    }
    sources.append(sh,list);
    nav.append(button('资料来源',()=>move(ctx,sources,sh)));
    const footer=make('footer','','cg-footer');footer.append(make('span','一物见山东 · '+data.city),button('回到画面',()=>backToScene(ctx)));
    inner.append(head,nav,passages,qa,sources,footer);article.append(inner);
    ctx.trigger.disabled=false;ctx.trigger.replaceChildren(make('span',data.scene.entryLabel),make('small','向下阅读'),arrow('down'));ctx.state='ready';
  }
  const readGuide=loadGuide|| (async id=>{const response=await fetch(registry[id]);if(!response.ok)throw Error('guide unavailable');return response.json();});
  async function load(ctx) {
    const ticket=++epoch;ctx.state='loading';ctx.trigger.disabled=true;
    ctx.trigger.replaceChildren(make('span','正在载入文化资料'),make('small','当前城市画面保留'));
    try {
      let data=cache.get(ctx.id);if(!data){data=await readGuide(ctx.id);if(!validCityGuide(data,ctx.id,ctx.city))throw Error('invalid guide');cache.set(ctx.id,data);}
      if(current!==ctx||ticket!==epoch)return;fillArticle(ctx,data);
    } catch {
      if(current!==ctx||ticket!==epoch)return;
      ctx.state='error';ctx.trigger.disabled=false;ctx.trigger.replaceChildren(make('span','重试本市文化资料'),make('small','暂未载入，画面仍可浏览'));
    }
  }
  function clear() {++epoch;current=null;host.hidden=true;host.replaceChildren();delete doc.body.dataset.cityGuide;}
  return {
    sync(spec) {
      if(spec?.kind!=='city'||spec.key==='370300'||!Object.hasOwn(registry,spec.key)){clear();return Promise.resolve();}
      if(current?.id===spec.key)return current.pending;
      clear();const ctx={id:spec.key,city:spec.city.city,state:'loading'};current=ctx;
      host.hidden=false;doc.body.dataset.cityGuide=spec.key;host.dataset.city=spec.key;
      ctx.scene=make('div','','cg-scene');ctx.article=make('article','','cg-topic');ctx.article.hidden=true;ctx.article.setAttribute('aria-labelledby','city-guide-title');
      ctx.trigger=button('',()=>ctx.state==='error'?load(ctx):ctx.state==='ready'?move(ctx,ctx.article,ctx.title):undefined,'cg-scene-open');ctx.trigger.id='city-guide-open';
      ctx.scene.append(mapLink('cg-scene-back'),ctx.trigger);host.append(ctx.scene,ctx.article);
      ctx.pending=load(ctx);return ctx.pending;
    },
    dispose:clear
  };
}
