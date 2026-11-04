import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ZIBO_GUIDE,isZiboGuideRoute,createZiboGuide} from './dist/zibo-guide.mjs';

function fixture({reduced=false}={}){
  const doc={activeElement:null,body:{dataset:{}},defaultView:{matchMedia:()=>({matches:reduced})}};
  class Node{
    constructor(tag='div'){this.tagName=tag;this.children=[];this.handlers=new Map();this.attributes={};this.dataset={};this.hidden=true;this.open=false;this.scrollCalls=[];}
    append(...children){this.children.push(...children);}
    setAttribute(name,value){this.attributes[name]=value;}
    addEventListener(type,handler){const handlers=this.handlers.get(type)||[];handlers.push(handler);this.handlers.set(type,handlers);}
    fire(type,event={}){for(const handler of this.handlers.get(type)||[])handler(event);}
    focus(options){doc.activeElement=this;this.focusOptions=options;}
    scrollIntoView(options){this.scrollCalls.push(options);}
  }
  const ids=['entry','open','close','title','reading','passages','answers','source-list','map','sources','sources-title'].map(name=>'zibo-guide-'+name);
  ids.push('zibo-guide');
  const nodes=Object.fromEntries(ids.map(id=>[id,new Node()]));
  const nav=['zibo-overview','zibo-craft','zibo-people','zibo-guide-sources','scene'].map(target=>{
    const button=new Node('button');button.dataset.ziboTarget=target;return button;
  });
  doc.getElementById=id=>nodes[id];doc.createElement=tag=>new Node(tag);doc.querySelectorAll=()=>nav;
  return {doc,nodes,nav,guide:createZiboGuide(doc)};
}
const zibo={kind:'city',key:'370300'};

test('only Zibo receives the two-screen flow',()=>{
  assert.equal(isZiboGuideRoute(zibo),true);
  for(const key of ['370100','370200','370400','370500','370600','370700','370800','370900','371000','371100','371300','371400','371500','371600','371700'])
    assert.equal(isZiboGuideRoute({kind:'city',key}),false);
  for(const spec of [null,{}, {kind:'map',key:'370300'}])assert.equal(isZiboGuideRoute(spec),false);
});
test('official archive fields and source identities are explicit',()=>{
  assert.equal(ZIBO_GUIDE.archive.length,8);
  assert.deepEqual(ZIBO_GUIDE.archive.find(([label])=>label==='项目编号'),['项目编号','Ⅷ-90']);
  assert.deepEqual(ZIBO_GUIDE.archive.find(([label])=>label==='保护单位'),['保护单位','淄博爱美琉璃制造有限公司']);
  assert.deepEqual(ZIBO_GUIDE.passages.map(p=>p.title),['项目概况','看见技艺','当代传承']);
  for(const item of [...ZIBO_GUIDE.passages,...ZIBO_GUIDE.questions])for(const id of item.sources)assert.ok(ZIBO_GUIDE.sources[id]);
  assert.equal(ZIBO_GUIDE.sources.person.url,'https://www.ihchina.cn/ccr_detail/30515.html');
  assert.equal(ZIBO_GUIDE.sources.project.url,'https://www.ihchina.cn/project_details/14445/');
});
test('the assistant scene index stays synchronized with the visible Zibo article',async()=>{
  const index=JSON.parse(await readFile(new URL('./dist/museum-assistant/zibo-scene-context.json',import.meta.url),'utf8'));
  assert.equal(index.version,1);
  assert.equal(index.cityId,ZIBO_GUIDE.cityId);
  assert.deepEqual(index.sources,ZIBO_GUIDE.sources);
  assert.deepEqual(index.passages,ZIBO_GUIDE.passages.map(({id,title,paragraphs,sources})=>({id,title,paragraphs,sources})));
});
test('visitor copy contains no editing instructions or invented artwork identity',()=>{
  const body=JSON.stringify([...ZIBO_GUIDE.passages,...ZIBO_GUIDE.questions]);
  assert.doesNotMatch(body,/不混用|就回答|不要根据|不把报道时点|不将这些观察点写成/);
  assert.doesNotMatch(body,/AI创意画|AI意境图|生成记录|未接入模型/);
  assert.match(ZIBO_GUIDE.questions[3].body,/当前资料不足以确认这件作品的年代或价格/);
});
test('rendering creates the archive, readable sections, four sourced questions and secure links',()=>{
  const {nodes}=fixture();
  const passages=nodes['zibo-guide-passages'].children;
  assert.equal(passages.length,3);
  assert.equal(passages[0].children[1].children.length,8);
  assert.equal(nodes['zibo-guide-answers'].children.length,4);
  assert.ok(nodes['zibo-guide-answers'].children.every(n=>n.tagName==='details'&&!n.open));
  for(const item of nodes['zibo-guide-source-list'].children){
    const a=item.children[0];assert.equal(a.target,'_blank');assert.equal(a.rel,'noopener noreferrer');assert.match(a.href,/^https:\/\//);
  }
});
test('entering Zibo reveals both normal-flow sections but does not auto-scroll',()=>{
  const {guide,nodes,doc}=fixture();guide.sync(zibo);
  assert.equal(doc.body.dataset.zibo,'active');
  assert.equal(nodes['zibo-guide-entry'].hidden,false);assert.equal(nodes['zibo-guide'].hidden,false);
  assert.equal(nodes['zibo-guide'].scrollCalls.length,0);assert.equal(doc.activeElement,null);
});
test('the first-screen action scrolls to the article and focuses its title',()=>{
  const {guide,nodes,doc}=fixture();guide.sync(zibo);nodes['zibo-guide-open'].fire('click');
  assert.deepEqual(nodes['zibo-guide'].scrollCalls,[{block:'start',behavior:'smooth'}]);
  assert.equal(doc.activeElement,nodes['zibo-guide-title']);
  assert.deepEqual(doc.activeElement.focusOptions,{preventScroll:true});
});
test('reduced motion uses an immediate transition',()=>{
  const {guide,nodes}=fixture({reduced:true});guide.sync(zibo);nodes['zibo-guide-open'].fire('click');
  assert.equal(nodes['zibo-guide'].scrollCalls[0].behavior,'instant');
});
test('return-to-scene restores the original painting and entry focus',()=>{
  const {guide,nodes,doc}=fixture();guide.sync(zibo);nodes['zibo-guide-close'].fire('click');
  assert.equal(nodes['zibo-guide-entry'].scrollCalls[0].behavior,'smooth');
  assert.equal(doc.activeElement,nodes['zibo-guide-open']);
});
test('chapter controls locate the correct section without changing the route',()=>{
  const {guide,nodes,nav,doc}=fixture();guide.sync(zibo);
  nav[1].fire('click');const craft=nodes['zibo-guide-passages'].children[1];
  assert.equal(craft.scrollCalls.length,1);assert.equal(doc.activeElement,craft.children[0]);
  nav[3].fire('click');assert.equal(nodes['zibo-guide-sources'].scrollCalls.length,1);
  nav[4].fire('click');assert.equal(doc.activeElement,nodes['zibo-guide-open']);
});
test('leaving Zibo hides both sections and resets question disclosures',()=>{
  const {guide,nodes,doc}=fixture();guide.sync(zibo);
  for(const q of nodes['zibo-guide-answers'].children)q.open=true;
  guide.sync({kind:'map',key:'map'});
  assert.equal(nodes['zibo-guide-entry'].hidden,true);assert.equal(nodes['zibo-guide'].hidden,true);
  assert.equal(doc.body.dataset.zibo,undefined);
  assert.ok(nodes['zibo-guide-answers'].children.every(n=>!n.open));
  nodes['zibo-guide-open'].fire('click');assert.equal(nodes['zibo-guide'].scrollCalls.length,0);
});
test('same-city synchronization does not restart reading or fold open answers',()=>{
  const {guide,nodes}=fixture();guide.sync(zibo);nodes['zibo-guide-answers'].children[0].open=true;guide.sync(zibo);
  assert.equal(nodes['zibo-guide-answers'].children[0].open,true);assert.equal(nodes['zibo-guide'].scrollCalls.length,0);
});
test('distribution preserves Zibo artwork and integrates both city guide modules',async()=>{
  const image=await readFile(new URL('dist/backgrounds/cities/370300-3c2b7e7dc4fa.png',import.meta.url));
  assert.equal(createHash('sha256').update(image).digest('hex'),'3c2b7e7dc4fa1d70bd1671b7c192192af99d48ba148625b0bb769b4937c39aca');
  const app=await readFile(new URL('dist/app.mjs',import.meta.url),'utf8');
  assert.match(app,/createZiboGuide/);assert.match(app,/createCityGuide/);
  assert.match(app,/ziboGuide\.sync\(spec\)/);assert.match(app,/cityGuide\.sync\(spec\)/);
});
test('integration is a normal article, not a dialog, with no model calls or scroll hijacking',async()=>{
  const source=await readFile(new URL('dist/zibo-guide.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|WebSocket|showModal|preventDefault|addEventListener\(['"]wheel/);
  const html=await readFile(new URL('dist/index.html',import.meta.url),'utf8');
  assert.match(html,/<article id="zibo-guide"/);assert.doesNotMatch(html,/<dialog/);
  assert.ok(html.indexOf('id="zibo-guide-entry"')<html.indexOf('<article id="zibo-guide"'));
  assert.match(html,/ZIBO-SCROLL-v2/);assert.match(html,/从这些问题开始，继续认识博山琉璃/);
  assert.doesNotMatch(html,/AI意境图|AI创意插画|未接入模型/);
  assert.doesNotMatch(html,/<img[^>]+(?:xinhuanet|ihchina)/);
});
test('a small local display subset and its font license are present',async()=>{
  const font=await stat(new URL('dist/fonts/zibo-display-v1.woff2',import.meta.url));
  assert.ok(font.size>1000&&font.size<100000);
  assert.match(await readFile(new URL('dist/fonts/OFL-LICENSE.txt',import.meta.url),'utf8'),/SIL OPEN FONT LICENSE/);
});
test('the scene remains one viewport even on short landscape screens',async()=>{
  const css=await readFile(new URL('dist/zibo-guide.css',import.meta.url),'utf8');
  const rule=css.match(/\.zibo-scene\{([^}]+)\}/)?.[1];
  assert.ok(rule);assert.match(rule,/height:100dvh/);assert.doesNotMatch(rule,/min-height/);
});
