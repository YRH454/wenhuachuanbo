// User-selected vertical scene-to-article flow. No network or wheel interception.
export const ZIBO_GUIDE={
  cityId:'370300',
  archive:[
    ['项目序号','873'],['项目编号','Ⅷ-90'],
    ['公布时间','2014年（第四批）'],['类别','传统技艺'],
    ['所属地区','山东省'],['类型','扩展项目'],
    ['申报地区或单位','山东省淄博市博山区'],['保护单位','淄博爱美琉璃制造有限公司']
  ],
  sources:{
    project:{title:'琉璃烧制技艺 · 中国非物质文化遗产网',short:'非遗项目档案',url:'https://www.ihchina.cn/project_details/14445/'},
    person:{title:'孙云浩传承人条目 · 中国非物质文化遗产网',short:'孙云浩条目',url:'https://www.ihchina.cn/ccr_detail/30515.html'},
    workshop:{title:'新华社 · 2026年5月工坊报道',short:'新华社工坊报道',url:'https://imgs.xinhuanet.com/photo/20260528/9d48e4bb6d824ed2a92c13c2f64672da/c.html'}
  },
  passages:[
    {id:'zibo-overview',title:'项目概况',paragraphs:['博山琉璃烧制技艺流布于山东省淄博市博山区，采用传统工艺制作琉璃制品。从花瓶、陈设品到内画鼻烟壶、料珠饰品，色彩与造型共同呈现这门地方手艺的丰富面貌。'],sources:['project']},
    {id:'zibo-craft',title:'看见技艺',paragraphs:[
      '琉璃在一定温度范围内具有可塑性。吹制时，工匠用中空铁棍挑取玻璃料，在转动铁棍的同时吹气，让材料逐渐形成不同形状。',
      '吹、拉、转、压，是理解博山琉璃的几个观察入口。不同制品还涉及内画、套料雕刻、灯工、铺丝等技法；一件作品的曲线与色彩，来自材料和手上功夫的相互配合。'
    ],sources:['project']},
    {id:'zibo-people',title:'当代传承',paragraphs:['博山琉璃的传习与师徒相授紧密相连，技艺在一代代艺人的学习和制作中延续。中国非物质文化遗产网的项目档案列有相关传承人孙云浩，可以沿着人物条目，继续了解技艺与人的联系。'],sources:['project','person']}
  ],
  questions:[
    {title:'为什么从博山琉璃认识淄博？',body:'它是流布于淄博博山区的传统技艺。既可以看器物的造型与色彩，也可以观察手作过程，是认识这座城市的一个具体入口。',sources:['project']},
    {title:'可以留意哪些制作动作？',body:'可以留意吹、拉、转、压等动作如何改变热料的形态。不同制品采用的技法并不相同，这些动作不是所有琉璃制品都遵循的固定工序。',sources:['project']},
    {title:'今天还有人在传承这门手艺吗？',body:'有。官方项目档案收录了相关传承人孙云浩；新华社2026年5月的工坊报道，也记录了当代制作与技艺交流的情景。',sources:['person','workshop']},
    {title:'这份导览能确认某件作品的年代或价格吗？',body:'当前资料不足以确认这件作品的年代或价格。这份导览介绍的是地方技艺；单件作品的鉴定和估价，需要能与该作品对应的可靠资料。',sources:[]}
  ]
};
export function isZiboGuideRoute(spec){return spec?.kind==='city'&&spec.key===ZIBO_GUIDE.cityId;}
export function createZiboGuide(doc){
  const get=id=>doc.getElementById(id),scene=get('zibo-guide-entry'),trigger=get('zibo-guide-open');
  const article=get('zibo-guide'),heading=get('zibo-guide-title'),win=doc.defaultView;
  const targets=new Map(),questions=[];
  let eligible=false;
  const make=(tag,text,className)=>{
    const node=doc.createElement(tag);
    if(text)node.textContent=text;
    if(className)node.className=className;
    return node;
  };
  const sourceLink=(source,full=false)=>{
    const link=make('a',full?source.title:source.short);
    link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';return link;
  };
  function cite(parent,ids){
    if(!ids.length)return;
    const links=make('p','资料依据：','zibo-citations');
    ids.forEach((id,index)=>{if(index)links.append(' · ');links.append(sourceLink(ZIBO_GUIDE.sources[id]));});
    parent.append(links);
  }
  for(const item of ZIBO_GUIDE.passages){
    const section=make('section','','zibo-passage'),title=make('h3',item.title),body=make('div','','zibo-passage-body');
    section.dataset.guideKind='scene';section.dataset.guideId='topic-370300-'+item.id;section.dataset.guideTitle='淄博 · 博山琉璃 · '+item.title;
    section.dataset.guideSource=ZIBO_GUIDE.sources[item.sources[0]]?.url||'';
    section.id=item.id;title.id=item.id+'-title';title.setAttribute('tabindex','-1');
    section.setAttribute('aria-labelledby',title.id);section.append(title);
    if(item.id==='zibo-overview'){
      const archive=make('dl','','zibo-archive');archive.id='zibo-guide-archive';
      for(const [label,value]of ZIBO_GUIDE.archive){
        const row=make('div');row.append(make('dt',label),make('dd',value));archive.append(row);
      }
      section.append(archive);
    }
    for(const paragraph of item.paragraphs)body.append(make('p',paragraph));
    if(item.id==='zibo-people'){
      const person=sourceLink(ZIBO_GUIDE.sources.person);person.textContent='查看孙云浩传承人条目';
      person.className='zibo-person-link';body.append(person);
    }
    cite(body,item.sources);section.append(body);get('zibo-guide-passages').append(section);
    targets.set(item.id,{node:section,focus:title});
  }
  for(const item of ZIBO_GUIDE.questions){
    const details=make('details','','zibo-question'),answer=make('div','','zibo-answer');
    answer.append(make('p',item.body));cite(answer,item.sources);
    details.append(make('summary',item.title),answer);get('zibo-guide-answers').append(details);questions.push(details);
  }
  for(const source of Object.values(ZIBO_GUIDE.sources)){
    const item=make('li');item.append(sourceLink(source,true));get('zibo-guide-source-list').append(item);
  }
  targets.set('zibo-guide-sources',{node:get('zibo-guide-sources'),focus:get('zibo-guide-sources-title')});
  const behavior=()=>win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
  function move(target){
    if(!eligible||!target)return;
    target.focus.focus({preventScroll:true});
    target.node.scrollIntoView({block:'start',behavior:behavior()});
  }
  const returnToScene=()=>move({node:scene,focus:trigger});
  trigger.addEventListener('click',()=>move({node:article,focus:heading}));
  get('zibo-guide-close').addEventListener('click',returnToScene);
  for(const button of doc.querySelectorAll('[data-zibo-target]')){
    button.addEventListener('click',()=>button.dataset.ziboTarget==='scene'?returnToScene():move(targets.get(button.dataset.ziboTarget)));
  }
  return {sync(spec){
    eligible=isZiboGuideRoute(spec);scene.hidden=!eligible;article.hidden=!eligible;
    if(eligible)doc.body.dataset.zibo='active';
    else{delete doc.body.dataset.zibo;for(const question of questions)question.open=false;}
  }};
}
