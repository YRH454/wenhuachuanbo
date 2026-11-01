import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {MOTION,NavigationCycle,routeSpec} from './dist/navigation.mjs';
import {stories} from './dist/city-stories.mjs';
const data=JSON.parse(await readFile(new URL('./dist/assembly-manifest.json',import.meta.url),'utf8'));
test('map routes are explicit, including the skip-link target',()=>{
  for(const hash of['','#/map','#main'])assert.deepEqual(routeSpec(hash,data.cities),{kind:'map',key:'map'});
});
test('all sixteen city IDs resolve to the exact same manifest object',()=>{
  for(const city of data.cities){const route=routeSpec('#/city/'+city.cityId,data.cities);assert.equal(route.city,city);assert.equal(route.key,city.cityId);}
});
test('unknown and malformed addresses never substitute another city',()=>{
  for(const hash of['#/city/999999','#/city/3701','#/city/370100/extra','#work-details','#/other'])assert.deepEqual(routeSpec(hash,data.cities),{kind:'missing',key:'missing'});
});
test('every city has bounded editorial content keyed by the same identity',()=>{
  assert.deepEqual(Object.keys(stories).sort(),data.cities.map(c=>c.cityId).sort());
  for(const city of data.cities)for(const key of['object','title','intro','reading'])assert.ok(stories[city.cityId][key].trim());
});
test('the authored motion is finite and sums to 780ms',()=>{
  assert.equal(MOTION.feedback+MOTION.exit+MOTION.entrance,MOTION.total);
  assert.equal(MOTION.total,780);assert.ok(MOTION.textDelay<MOTION.entrance);
});
test('a newer navigation invalidates the previous epoch without leaving animations',()=>{
  const c=new NavigationCycle(),first=c.begin();let cancelled=0;
  c.animations.add({cancel(){++cancelled;}});
  const second=c.begin();
  assert.equal(c.current(first),false);assert.equal(c.current(second),true);assert.equal(cancelled,1);assert.equal(c.animations.size,0);
});
test('natural completion cleans up the animation effect',async()=>{
  const c=new NavigationCycle();let cancelled=0,options;
  await c.play({animate(_frames,value){options=value;return{finished:Promise.resolve(),cancel(){++cancelled;}};}},[{opacity:0},{opacity:1}],{duration:460});
  assert.equal(options.iterations,1);assert.equal(cancelled,1);assert.equal(c.animations.size,0);
});
test('interrupted animation resolves normally and remains invalidated',async()=>{
  const c=new NavigationCycle(),first=c.begin();let reject;
  const running=c.play({animate(){return{finished:new Promise((_resolve,r)=>{reject=r;}),cancel(){reject(new Error('cancel'));}};}},[],{duration:220});
  c.begin();await running;assert.equal(c.current(first),false);assert.equal(c.animations.size,0);
});
test('missing WAAPI support degrades to an immediate, resolved step',async()=>{
  const c=new NavigationCycle();await c.play({},[],{});assert.equal(c.animations.size,0);
});
