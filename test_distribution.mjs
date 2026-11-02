import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,readdir,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {CITY_GUIDES} from './dist/city-guide-index.mjs';
import {validCityGuide} from './dist/city-guides.mjs';
import {CITIES,validPackage} from './dist/people-culture-v1/model.mjs';

const dist=fileURLToPath(new URL('./dist/',import.meta.url));
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const present=async path=>assert.ok((await stat(path)).isFile(),path);

test('all fifteen city guide packages and their redacted provenance records are present',async()=>{
  assert.equal(Object.keys(CITY_GUIDES).length,15);
  for(const [id,relative] of Object.entries(CITY_GUIDES)){
    const file=join(dist,relative),data=await json(file),base=join(dist,'guides',id);
    assert.equal(validCityGuide(data,id,CITIES[id]),true,id);
    for(const media of data.media){
      await present(join(base,media.src));
      if(media.record&&media.recordSha256){
        const bytes=await readFile(join(base,media.record));
        assert.equal(digest(bytes),media.recordSha256,`${id}: record digest`);
      }
    }
  }
});

test('all sixteen city people-and-objects packages and referenced assets are present',async()=>{
  assert.equal(Object.keys(CITIES).length,16);
  const base=join(dist,'people-culture-v1');
  for(const [id,city] of Object.entries(CITIES)){
    const data=await json(join(base,'data',`${id}.json`));
    assert.equal(validPackage(data,id),true,city);
    for(const person of data.people){
      assert.notEqual(person.portrait.kind,'candidate',`${city}: internal-only portrait must not ship`);
      if(person.portrait.src)await present(join(base,person.portrait.src));
    }
    for(const object of data.objects){
      if(object.media.src)await present(join(base,object.media.src));
      if(object.media.record)await present(join(base,object.media.record));
    }
  }
});

test('internal-only portrait research images are not present in the public snapshot',async()=>{
  const base=join(dist,'people-culture-v1');
  const record=await json(join(base,'records','portrait-candidates-20261102.json'));
  for(const asset of record.assets){
    if(asset.publicReuse===false&&asset.localPath){
      assert.match(asset.localPath,/^assets\/[a-z0-9-]+\.(?:png|jpg|jpeg|webp)$/);
      await assert.rejects(stat(join(base,asset.localPath)),{code:'ENOENT'});
    }
  }
});

test('distributable text contains no absolute Windows paths',async()=>{
  const textExtensions=/\.(?:css|html|js|json|md|mjs|txt)$/i;
  const absoluteWindowsPath=/(?<![A-Za-z0-9])[A-Za-z]:(?:\\|\/)/;
  async function inspect(dir){
    for(const item of await readdir(dir,{withFileTypes:true})){
      const path=join(dir,item.name);
      if(item.isDirectory())await inspect(path);
      else if(item.isFile()&&textExtensions.test(item.name)){
        const content=await readFile(path,'utf8');
        assert.doesNotMatch(content,absoluteWindowsPath,path);
      }
    }
  }
  await inspect(dist);
});
