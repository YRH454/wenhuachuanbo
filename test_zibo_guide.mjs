import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ZIBO_GUIDE,isZiboGuideRoute,createZiboGuide} from './dist/zibo-guide.mjs';

function fixture(){
  const doc={activeElement:null};
  class Node{
    constructor(tag='div'){this.tagName=tag;this.children=[];this.handlers=new Map();this.attributes={};this.hidden=true;this.open=false;this.scrollTop=0;}
    append(...children){this.children.push(...children);}
    setAttribute(name,value){this.attributes[name]=value;}
    addEventListener(type,handler){const handlers=this.handlers.get(type)||[];handlers.push(handler);this.handlers.set(type,handlers);}
    fire(type,event={}){for(const handler of this.handlers.get(type)||[])handler(event);}
    focus(){doc.activeElement=this;}
    showModal(){this.open=true;}
    close(){this.open=false;this.fire('close');}
    getBoundingClientRect(){return {left:100,right:600,top:30,bottom:700};}
    getClientRects(){return [{}];}
    querySelectorAll(){return this.stops||[];}
  }
  const ids=['entry','open','close','title','reading','passages','answers','source-list','map'].map(name=>'zibo-guide-'+name);
  ids.push('zibo-guide');
  const nodes=Object.fromEntries(ids.map(id=>[id,new Node()]));
  nodes['zibo-guide'].stops=[nodes['zibo-guide-close'],nodes['zibo-guide-reading'],nodes['zibo-guide-map']];
  doc.getElementById=id=>nodes[id];doc.createElement=tag=>new Node(tag);
  return {doc,nodes,guide:createZiboGuide(doc)};
}
const zibo={kind:'city',key:'370300'};

test('the guide is gated to exactly Zibo, not the map or any other city',()=>{
  assert.equal(isZiboGuideRoute(zibo),true);
  for(const spec of [null,{}, {kind:'map',key:'370300'},...['370100','370200','370400','370500','370600','370700','370800','370900','371000','371100','371300','371400','371500','371600','371700'].map(key=>({kind:'city',key}))])assert.equal(isZiboGuideRoute(spec),false);
});
test('the approved three passages and five questions retain their source identity',()=>{
  assert.deepEqual(ZIBO_GUIDE.passages.map(p=>p.title),['认识一物','看见手艺','人在今天']);
  assert.equal(ZIBO_GUIDE.questions.length,5);assert.equal(Object.keys(ZIBO_GUIDE.sources).length,3);
  for(const item of [...ZIBO_GUIDE.passages,...ZIBO_GUIDE.questions])for(const source of item.sources)assert.ok(ZIBO_GUIDE.sources[source]);
  assert.equal(ZIBO_GUIDE.sources.person.url,'https://www.ihchina.cn/ccr_detail/30515.html');
  assert.equal(ZIBO_GUIDE.sources.project.url,'https://www.ihchina.cn/project_details/14445/');
  assert.deepEqual(ZIBO_GUIDE.passages[2].sources,['person','workshop']);
});
test('the background and unknown-work answers do not invent an identity or price',()=>{
  assert.match(ZIBO_GUIDE.questions[3].body,/AI创意画/);
  assert.match(ZIBO_GUIDE.questions[3].body,/不能用于证明/);
  assert.match(ZIBO_GUIDE.questions[4].body,/当前资料不足以确认这件作品的年代或价格/);
  assert.match(ZIBO_GUIDE.passages[2].body,/孙云浩/);
});
test('rendering creates native question disclosures and secure, explicit source links',()=>{
  const {nodes}=fixture();
  assert.equal(nodes['zibo-guide-passages'].children.length,3);
  assert.equal(nodes['zibo-guide-answers'].children.length,5);
  assert.ok(nodes['zibo-guide-answers'].children.every(n=>n.tagName==='details'&&!n.open));
  for(const item of nodes['zibo-guide-source-list'].children){const link=item.children[0];assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');assert.match(link.href,/^https:\/\//);}
});
test('entering Zibo exposes only the entry, never automatically opens the reading layer',()=>{
  const {guide,nodes}=fixture();guide.sync(zibo);
  assert.equal(nodes['zibo-guide-entry'].hidden,false);assert.equal(nodes['zibo-guide'].open,false);
});
test('the entry cannot open content while another city is active',()=>{
  const {guide,nodes}=fixture();guide.sync({kind:'city',key:'370100'});nodes['zibo-guide-open'].fire('click');
  assert.equal(nodes['zibo-guide-entry'].hidden,true);assert.equal(nodes['zibo-guide'].open,false);
});
test('active opening focuses the reading title; closing restores the entry focus',()=>{
  const {guide,nodes,doc}=fixture();guide.sync(zibo);nodes['zibo-guide-open'].fire('click');
  assert.equal(nodes['zibo-guide'].open,true);assert.equal(doc.activeElement,nodes['zibo-guide-title']);assert.equal(nodes['zibo-guide-open'].attributes['aria-expanded'],'true');
  nodes['zibo-guide-close'].fire('click');
  assert.equal(nodes['zibo-guide'].open,false);assert.equal(doc.activeElement,nodes['zibo-guide-open']);assert.equal(nodes['zibo-guide-open'].attributes['aria-expanded'],'false');
});
test('native Escape cancellation closes and restores focus without changing routes',()=>{
  const {guide,nodes,doc}=fixture();guide.sync(zibo);nodes['zibo-guide-open'].fire('click');let prevented=false;
  nodes['zibo-guide'].fire('cancel',{preventDefault(){prevented=true;}});
  assert.equal(prevented,true);assert.equal(nodes['zibo-guide'].open,false);assert.equal(doc.activeElement,nodes['zibo-guide-open']);
});
test('reverse Tab from the title and forward Tab from the last link stay in the layer',()=>{
  const {guide,nodes,doc}=fixture();guide.sync(zibo);nodes['zibo-guide-open'].fire('click');let prevented=0;
  nodes['zibo-guide'].fire('keydown',{key:'Tab',shiftKey:true,preventDefault(){++prevented;}});
  assert.equal(doc.activeElement,nodes['zibo-guide-map']);
  nodes['zibo-guide'].fire('keydown',{key:'Tab',shiftKey:false,preventDefault(){++prevented;}});
  assert.equal(doc.activeElement,nodes['zibo-guide-close']);assert.equal(prevented,2);
});
test('every deliberate opening starts at the introduction, not a stale hidden scroll offset',()=>{
  const {guide,nodes}=fixture();guide.sync(zibo);nodes['zibo-guide-reading'].scrollTop=1000;nodes['zibo-guide-open'].fire('click');
  assert.equal(nodes['zibo-guide-reading'].scrollTop,0);
});
test('leaving Zibo resets content and does not explicitly focus an outgoing entry',()=>{
  const {guide,nodes,doc}=fixture();guide.sync(zibo);nodes['zibo-guide-open'].fire('click');
  nodes['zibo-guide-reading'].scrollTop=400;for(const node of nodes['zibo-guide-answers'].children)node.open=true;
  guide.sync({kind:'map',key:'map'});
  assert.equal(nodes['zibo-guide'].open,false);assert.equal(nodes['zibo-guide-entry'].hidden,true);assert.equal(nodes['zibo-guide-reading'].scrollTop,0);
  assert.ok(nodes['zibo-guide-answers'].children.every(n=>!n.open));assert.notEqual(doc.activeElement,nodes['zibo-guide-open']);
  guide.sync(zibo);assert.equal(nodes['zibo-guide'].open,false);
});
test('same-city refresh does not unexpectedly dismiss the voluntary reading layer',()=>{
  const {guide,nodes}=fixture();guide.sync(zibo);nodes['zibo-guide-open'].fire('click');guide.sync(zibo);assert.equal(nodes['zibo-guide'].open,true);
});
test('the backdrop closes only for an actual click outside the sheet',()=>{
  const {guide,nodes}=fixture();guide.sync(zibo);nodes['zibo-guide-open'].fire('click');
  nodes['zibo-guide'].fire('click',{target:nodes['zibo-guide'],clientX:200,clientY:200});assert.equal(nodes['zibo-guide'].open,true);
  nodes['zibo-guide'].fire('click',{target:nodes['zibo-guide'],clientX:50,clientY:200});assert.equal(nodes['zibo-guide'].open,false);
});
test('the integration keeps existing styles and frozen inputs unchanged, with no model calls',async()=>{
  // Manifest hashes describe the repository snapshot after local-path redaction;
  // the running prototype's original manifests remain unchanged in its workspace.
  const expected={'dist/styles.css':'9315e26c9937f0ddb993573630deb41676d37998136946e0525132bba5f8010e','dist/assembly-manifest.json':'a6278fe5f05512b4aaf9c387095ba8f4bc9071742ceddb872123619c497119c6','dist/city-backgrounds.json':'aa82dabef2b9ad358f8512bdb1cee633ea692caeadafbbed482735f7e943e769'};
  for(const [file,hash]of Object.entries(expected))assert.equal(createHash('sha256').update(await readFile(new URL(file,import.meta.url))).digest('hex'),hash);
  const source=await readFile(new URL('dist/zibo-guide.mjs',import.meta.url),'utf8');assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|WebSocket|\.animate\s*\(/);
  const html=await readFile(new URL('dist/index.html',import.meta.url),'utf8');assert.match(html,/固定资料解答，未接入模型/);assert.match(html,/<dialog id="zibo-guide"/);assert.doesNotMatch(html,/<img[^>]+(?:xinhuanet|ihchina)/);
});
