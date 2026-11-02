import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CITY_GUIDES} from './dist/city-guide-index.mjs';
import {createCityGuide,validCityGuide,artworkDescription,artworkTitle,readerQuestions} from './dist/city-guides.mjs';
import {ZIBO_GUIDE} from './dist/zibo-guide.mjs';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const packages=await Promise.all(Object.entries(CITY_GUIDES).map(async([id,path])=>({id,data:JSON.parse(await read('dist/'+path))})));
const productionCopy=/AI\s*(?:创意|意境|生成|插画|虚构|影人|器物|图|画)|生成记录|未接入模型|联网模型|非真实(?:人物|器物|作品|场景)/i;
const walk=node=>[node,...(node.children||[]).filter(n=>typeof n==='object').flatMap(walk)];
function fixture(data){
  const doc={body:{dataset:{}},defaultView:{matchMedia:()=>({matches:true})}};
  class Node{
    constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.dataset={};this.style={setProperty(){}};this.hidden=false;}
    append(...items){this.children.push(...items);}
    replaceChildren(...items){this.children=[...items];}
    setAttribute(key,value){this.attributes[key]=value;}
    addEventListener(){}
  }
  const host=new Node('div');doc.getElementById=()=>host;
  doc.createElement=tag=>new Node(tag);doc.createElementNS=(_,tag)=>new Node(tag);
  return{host,guide:createCityGuide(doc,{loadGuide:async()=>data})};
}
test('all fifteen packages retain their internal AI provenance and validation contracts',()=>{
  for(const {id,data}of packages){
    assert.equal(validCityGuide(data,id,data.city),true,id);
    assert.equal(data.scene.label,'AI意境图');
    for(const media of data.media){assert.equal(media.kind,'ai');assert.match(media.caption,/AI/);assert.ok(media.generationTool);assert.ok(media.generatorThreadId);}
    assert.ok(Object.values(data.sources).every(source=>source.supports.length>0));
  }
});
test('audience question projections preserve package data, source IDs and factual limits',()=>{
  let omitted=0;
  for(const {data}of packages){
    const before=JSON.stringify(data),questions=readerQuestions(data);
    omitted+=data.questions.length-questions.length;assert.ok(questions.length>=4);
    for(const question of questions){assert.doesNotMatch(question.title+' '+question.body,productionCopy);assert.equal(question.kind,'fact');assert.ok(question.sources.length);assert.ok(question.sources.every(id=>data.sources[id]));}
    assert.equal(JSON.stringify(data),before,'reader projection must not mutate adopted provenance');
  }
  assert.equal(omitted,5,'only the five picture-production-only questions are omitted');
});
test('artwork display keeps composition titles and descriptions without production notices or real-photo claims',()=>{
  for(const {data}of packages)for(const media of data.media){
    const title=artworkTitle(media),alt=artworkDescription(media);
    assert.ok(title.length>0&&alt.length>0);assert.doesNotMatch(title+' '+alt,productionCopy);
    assert.equal(title,media.caption.split(' · ')[0]);assert.doesNotMatch(title+' '+alt,/实拍|纪实照片|馆藏照片/);
  }
});
test('all fifteen rendered topics have clean audience copy and no detached people-page shortcut',async()=>{
  for(const {id,data}of packages){
    const {host,guide}=fixture(data);await guide.sync({kind:'city',key:id,city:{city:data.city}});
    const nodes=walk(host),text=nodes.map(node=>[node.textContent||'',node.alt||'',...Object.values(node.attributes)].join(' ')).join('\n');
    assert.doesNotMatch(text,productionCopy,id);assert.equal(nodes.some(node=>node.className==='cg-people-link'),false);
    assert.equal(nodes.filter(node=>node.tagName==='details').length,readerQuestions(data).length);
    assert.equal(nodes.some(node=>node.className==='cg-scene-caption'),false);guide.dispose();
  }
});
test('Zibo keeps four cultural questions while its picture-production question is absent',()=>{
  assert.equal(ZIBO_GUIDE.questions.length,4);assert.doesNotMatch(JSON.stringify(ZIBO_GUIDE.questions),productionCopy);
  assert.ok(ZIBO_GUIDE.questions.some(question=>/年代或价格/.test(question.body)),'not an appraisal service');
});
test('HTML no longer displays image-production explanations and retains the cultural source list',async()=>{
  const html=(await read('dist/index.html')).replace(/<!--[\s\S]*?-->/g,'');
  assert.doesNotMatch(html,productionCopy);assert.doesNotMatch(html,/class="zibo-scene-caption"/);
  assert.match(html,/id="zibo-guide-source-list"/);assert.match(html,/沿着项目档案、人物条目与工坊报道/);
});
test('runtime display code no longer exposes generation tools, prompt links or AI labels',async()=>{
  const app=await read('dist/app.mjs');
  assert.doesNotMatch(app,/entry\.aiLabel|tile\.aiLabel|生成工具|查看背景生成记录|查看完整提示词记录|AI创意插画/);
  assert.match(app,/const backgroundOnly=true/);assert.match(app,/ziboGuide\.sync\(spec\)/);assert.match(app,/cityGuide\.sync\(spec\)/);
});
