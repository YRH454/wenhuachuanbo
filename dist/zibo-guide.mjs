// Fixed editorial material supplied in the approved 2026-11-01 Zibo brief.
// No model, network request, generated typing, extra imagery, or other-city content.
export const ZIBO_GUIDE={
  cityId:'370300',
  sources:{
    project:{title:'非遗项目页 · 中国非物质文化遗产网',short:'非遗项目页',url:'https://www.ihchina.cn/project_details/14445/'},
    person:{title:'孙云浩传承人条目 · 中国非物质文化遗产网',short:'传承人条目',url:'https://www.ihchina.cn/ccr_detail/30515.html'},
    workshop:{title:'新华社 · 2026年5月工坊报道',short:'新华社工坊报道',url:'https://imgs.xinhuanet.com/photo/20260528/9d48e4bb6d824ed2a92c13c2f64672da/c.html'}
  },
  passages:[
    {title:'认识一物',body:'这里从淄博市博山区的琉璃烧制技艺进入，而不是给背景中的想象器物编造名称或年代。成品之外，热料如何被塑出形态，同样值得观看。',sources:['project']},
    {title:'看见手艺',body:'用“热料—动作—形态”三个观察点介绍：受热时的可塑状态、匠人的吹拉与转动、逐渐形成的曲线。不同制品涉及不同技法，不将这些观察点写成每件作品统一的完整工序，也不提供家庭高温操作教程。',sources:['project']},
    {title:'人在今天',body:'非遗网列有这项技艺的代表性传承人孙云浩。新华社2026年5月的报道记录了工坊制作、技艺交流和研学探索，可作为“传统怎样进入今天”的具体阅读入口；不把报道时点的企业数量或产业比例写成当前实时数据。',sources:['person','workshop']}
  ],
  questions:[
    {title:'为什么从博山琉璃认识淄博？',body:'它是在淄博博山区流布的传统技艺，既能看造型与色彩，也能看手作过程；这是一个入口，不代表淄博只有这一种文化。',sources:['project']},
    {title:'我应该留意哪些制作动作？',body:'先观察吹、拉、转等动作怎样改变热料的形态。这是认识技法的线索，不是适用于全部制品的固定配方或操作清单。',sources:['project']},
    {title:'今天还有人在做吗？',body:'有。非遗网收录孙云浩的相关传承人信息；新华社2026年5月的工坊报道提供了当代制作与交流的实例。人物介绍和报道分别显示来源，不混用孙云浩与孙云毅的名字。',sources:['person','workshop']},
    {title:'背景里这些器物是真实文物吗？',body:'不是已经鉴定的真实文物。当前地域背景是AI创意画；画中作坊、人物与器形不能用于证明具体作者、藏品名称、年代或真实地点。若展示真实作品，应另有对应照片、身份依据和使用许可。',sources:[]},
    {title:'能不能告诉我某件作品的年代或价格？',body:'如果没有能对应到该单件的可靠资料，就回答“当前资料不足以确认这件作品的年代或价格”，不要根据颜色、形状或AI背景猜测。价格也不纳入本轮导览范围。',sources:[]}
  ]
};

export function isZiboGuideRoute(spec){return spec?.kind==='city'&&spec.key===ZIBO_GUIDE.cityId;}

export function createZiboGuide(doc){
  const get=id=>doc.getElementById(id),entry=get('zibo-guide-entry'),trigger=get('zibo-guide-open');
  const dialog=get('zibo-guide'),heading=get('zibo-guide-title'),reading=get('zibo-guide-reading');
  let eligible=false,restoreFocus=true;
  const make=(tag,text,className)=>{const node=doc.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node;};
  const sourceLink=(source,full=false)=>{
    const link=make('a',full?source.title:source.short);
    link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';return link;
  };
  function cite(parent,ids){
    if(!ids.length)return;
    const links=make('p','依据：','zibo-guide-citations');
    ids.forEach((id,index)=>{if(index)links.append(' · ');links.append(sourceLink(ZIBO_GUIDE.sources[id]));});
    parent.append(links);
  }
  for(const item of ZIBO_GUIDE.passages){
    const section=make('section');section.append(make('h3',item.title),make('p',item.body));cite(section,item.sources);get('zibo-guide-passages').append(section);
  }
  const questions=[];
  for(const item of ZIBO_GUIDE.questions){
    const details=make('details','','zibo-guide-question'),answer=make('div','','zibo-guide-answer');
    answer.append(make('p',item.body));cite(answer,item.sources);details.append(make('summary',item.title),answer);
    get('zibo-guide-answers').append(details);questions.push(details);
  }
  for(const source of Object.values(ZIBO_GUIDE.sources)){
    const item=make('li');item.append(sourceLink(source,true));get('zibo-guide-source-list').append(item);
  }
  function close({restore=true}={}){
    restoreFocus=restore;
    if(dialog.open)dialog.close();
    trigger.setAttribute('aria-expanded','false');
  }
  function open(){
    if(!eligible||dialog.open)return;
    restoreFocus=true;dialog.showModal();reading.scrollTop=0;trigger.setAttribute('aria-expanded','true');heading.focus({preventScroll:true});
  }
  trigger.addEventListener('click',open);
  get('zibo-guide-close').addEventListener('click',()=>close());
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('close',()=>{
    trigger.setAttribute('aria-expanded','false');
    if(restoreFocus&&eligible&&!entry.hidden)trigger.focus({preventScroll:true});
  });
  // Native modality supplies inertness. Explicit edge wrapping also covers the
  // programmatically focused heading (tabindex=-1), including reverse Tab.
  dialog.addEventListener('keydown',event=>{
    if(event.key!=='Tab'||!dialog.open)return;
    const stops=[...dialog.querySelectorAll('a[href],button:not([disabled]),summary,[tabindex="0"]')].filter(node=>node.getClientRects().length);
    const first=stops[0],last=stops.at(-1),active=doc.activeElement;
    if(!first){event.preventDefault();heading.focus({preventScroll:true});return;}
    if(event.shiftKey&&(active===first||!stops.includes(active))){event.preventDefault();last.focus({preventScroll:true});}
    else if(!event.shiftKey&&active===last){event.preventDefault();first.focus({preventScroll:true});}
  });
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const rect=dialog.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close();
  });
  return {
    sync(spec){
      eligible=isZiboGuideRoute(spec);entry.hidden=!eligible;
      if(!eligible){close({restore:false});reading.scrollTop=0;for(const question of questions)question.open=false;}
    }
  };
}
