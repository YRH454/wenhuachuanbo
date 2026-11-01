import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {HOME_BACKGROUND,BackgroundCycle,backgroundSpec,validBackgroundData} from './dist/backgrounds.mjs';
const readJson=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
const art=await readJson('./dist/assembly-manifest.json'),manifest=await readJson('./dist/city-backgrounds.json');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
test('background manifest has sixteen exact city identities and only scoped paths',()=>{
  assert.equal(validBackgroundData(manifest,art.cities),true);
  assert.equal(manifest.cities.filter(c=>c.status==='ready').length,16);
  for(const entry of manifest.cities)assert.equal(art.cities.find(c=>c.cityId===entry.cityId).city,entry.city);
});
test('wrong-city, outside-root and hash-mismatching background references are rejected',()=>{
  for(const mutate of[
    m=>{m.cities[0].city='别市';},m=>{m.cities[0].src='../other.png';},
    m=>{m.cities[0].src=m.cities[1].src;},m=>{m.cities[0].sha256='0'.repeat(64);},
    m=>{m.cities[0].promptSrc='../private.txt';},m=>{m.cities[0].desktopFocus='url(bad)';}
  ]){const changed=structuredClone(manifest);mutate(changed);assert.equal(validBackgroundData(changed,art.cities),false);}
});
test('all selected background snapshots and source records match actual hashes',async()=>{
  for(const entry of manifest.cities.filter(c=>c.status==='ready')){
    const image=await readFile(new URL('./dist/'+entry.src,import.meta.url));
    const record=await readFile(new URL('./dist/'+entry.promptSrc,import.meta.url));
    assert.equal(createHash('sha256').update(image).digest('hex'),entry.sha256,entry.city);
    assert.equal(createHash('sha256').update(record).digest('hex'),entry.recordSha256,entry.city);
    assert.ok(record.toString('utf8').includes(entry.sourcePath.split(/[\\/]/).at(-1)),entry.city);
  }
});
test('map, unknown route and missing city data use home, never a neighbouring city',()=>{
  for(const route of[{kind:'map',key:'map'},{kind:'missing',key:'missing'},{kind:'city',key:'999999'}])assert.equal(backgroundSpec(route,manifest).src,HOME_BACKGROUND);
  assert.equal(backgroundSpec({kind:'city',key:'370100'},null).src,HOME_BACKGROUND);
});
test('map A/B variant does not select the city background version',()=>{
  for(const entry of manifest.cities){
    const route={kind:'city',key:entry.cityId,city:entry};
    assert.deepEqual(backgroundSpec({...route,variant:'A'},manifest),backgroundSpec({...route,variant:'B'},manifest));
  }
});
test('later city navigation rejects a slower earlier background load',async()=>{
  const first=deferred(),second=deferred(),cycle=new BackgroundCycle(src=>src==='first'?first.promise:second.promise);
  const a=cycle.begin({key:'a',src:'first'}),b=cycle.begin({key:'b',src:'second'});
  second.resolve('b-image');assert.equal((await cycle.settle(b)).spec.key,'b');
  first.resolve('a-image');assert.equal(await cycle.settle(a),null);
});
test('returning home rejects pending city work before it can repaint',async()=>{
  const pending=deferred(),cycle=new BackgroundCycle(()=>pending.promise);
  const city=cycle.begin({key:'city',src:'city.png'}),home=cycle.begin({key:'home',src:HOME_BACKGROUND});
  assert.equal((await cycle.settle(home)).spec.src,HOME_BACKGROUND);
  pending.resolve({});assert.equal(await cycle.settle(city),null);
});
test('image failure yields home fallback while preserving requested city identity',async()=>{
  const cycle=new BackgroundCycle(()=>Promise.reject(Error('broken')));
  const result=await cycle.settle(cycle.begin({key:'370100',city:'济南',src:'broken'}));
  assert.equal(result.spec.src,HOME_BACKGROUND);assert.equal(result.spec.key,'370100');assert.equal(result.spec.status,'error');
});
test('stale failure cannot overwrite the newest successful background',async()=>{
  const failed=deferred(),cycle=new BackgroundCycle(src=>src==='bad'?failed.promise:Promise.resolve('good'));
  const a=cycle.begin({key:'a',src:'bad'}),b=cycle.begin({key:'b',src:'good'});
  assert.equal((await cycle.settle(b)).image,'good');failed.reject(Error('old'));assert.equal(await cycle.settle(a),null);
});
test('same-city refresh reuses a loaded background; explicit retry can reload',async()=>{
  let loads=0;const cycle=new BackgroundCycle(()=>Promise.resolve(++loads));
  await cycle.settle(cycle.begin({key:'city',src:'same'}));
  await cycle.settle(cycle.begin({key:'city',src:'same'}));assert.equal(loads,1);
  await cycle.settle(cycle.begin({key:'city',src:'same'},{retry:true}));assert.equal(loads,2);
});
test('failed cache entries are removable for successful retry',async()=>{
  let fail=true;const cycle=new BackgroundCycle(()=>fail?Promise.reject(Error('offline')):Promise.resolve('restored'));
  assert.equal((await cycle.settle(cycle.begin({key:'city',src:'same'}))).spec.status,'error');
  fail=false;assert.equal((await cycle.settle(cycle.begin({key:'city',src:'same'},{retry:true}))).image,'restored');
});
