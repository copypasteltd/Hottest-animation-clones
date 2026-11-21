import assert from 'node:assert/strict';
import {test} from 'node:test';
import {exampleData} from '../scripts/examples.mjs';
import {byteRange} from '../scripts/serve.mjs';
import {emptyQuery, utc} from '../src/model.ts';
import {DAY, heatScores, rankOrder, trendScore} from '../src/ranking.ts';
import {editWithin, normalize, parseTerms, SearchIndex} from '../src/search.ts';
import {parseRoute, routeHash} from '../src/route.ts';
import {safeRelative, sourceLink, unpack, validateTags} from '../src/validate.ts';

const examples=await exampleData(async()=>{});
const catalog={works:examples.works,renditions:examples.renditions};
const index=new SearchIndex(catalog,examples.tags,examples.asOf);
const run=(extra={})=>index.run({...emptyQuery(),...extra});
const id=(x)=>x.matches.map(m=>m.id);
const at=Date.parse(examples.asOf);
const before=d=>new Date(at-d*DAY).toISOString();

test('example has stable work grouping, historical attempts and no playback',()=>{
  assert.equal(catalog.works.length,34);
  assert.equal(catalog.renditions.length,67);
  assert.equal(catalog.renditions.filter(v=>v.workId==='work-demo-01'&&v.variant==='SA02').length,2);
  assert.ok(catalog.renditions.every(v=>!v.playable));
  assert.ok(Object.values(examples.details).every(v=>!v.video&&!v.sourceUrl));
});
test('paginates after sorting and visits every work exactly once',()=>{
  assert.deepEqual([run().total,run().pages,run().matches.length],[34,2,24]);
  assert.equal(run({page:9999}).page,2);
  assert.equal(new Set([...id(run()),...id(run({page:2}))]).size,34);
  const v=[1,2,3].flatMap(page=>id(run({view:'renditions',page})));
  assert.equal(v.length,67);assert.equal(new Set(v).size,67);
});
test('search finds the last work by text outside the first page',()=>{
  assert.deepEqual(id(run({q:'"星屑回形步唯一检索词"'})),['work-demo-34']);
  assert.deepEqual(id(run({q:'ＤＥＭＯ－３４'})),['work-demo-34']);
  assert.equal(run({q:'"不存在的短语"'}).total,0);
});
test('Chinese middle-character typo and English alias typo work',()=>{
  for(const q of ['手势舞','手市舞','"gesture-led dance"','gestuer dance','gestvre dance','手指舞']) {
    const r=run({q,scope:'source'});
    assert.ok(r.total>0,q);
    assert.ok(r.matches.some(m=>m.matchedFields.includes('分析标签')),q);
  }
  assert.equal(run({q:'"手市舞"',scope:'source'}).total,0);
  assert.equal(run({q:'僻',scope:'source'}).total,0);
});
test('normalization and bounded Unicode editing handle boundary lengths',()=>{
  assert.equal(normalize(' ＳＡ０２ · 手势舞！'),'sa02 手势舞');
  assert.ok(editWithin([..."手市舞"],[..."手势舞"],1));
  assert.ok(editWithin([..."手势舞"],[..."手势"],1));
  assert.equal(editWithin([..."手市舞"],[..."热舞"],1),false);
  assert.throws(()=>parseTerms('字'.repeat(121)),/120/);
  assert.throws(()=>parseTerms(Array(13).fill('字').join(' ')),/12/);
});
test('a candidate requires explicit inclusion for text and exact tag search',()=>{
  const tag=['source:movement.heart_gesture'];
  assert.equal(run({q:'比心'}).total,0);
  assert.equal(run({tag}).total,0);
  assert.ok(run({q:'比心',tag,candidates:true}).total>0);
  assert.equal(run({q:'比心',scope:'rendition',candidates:true}).total,0);
});
test('no cross-rendition tag joins and source remains distinct',()=>{
  const sw='rendition:movement.arm_sweep',pt='rendition:movement.pointing';
  assert.equal(run({q:'DEMO-01',tag:[sw,pt]}).total,0);
  assert.equal(run({q:'DEMO-01',variant:['BM01'],tag:[sw]}).total,0);
  assert.equal(run({q:'DEMO-01',variant:['BM01'],tag:['source:movement.arm_sweep',pt]}).total,1);
  assert.equal(run({q:'DEMO-01',view:'renditions',variant:['SA02'],tag:[sw]}).total,2);
});
test('metadata-only work remains visible only without rendition constraints',()=>{
  assert.deepEqual(id(run({q:'DEMO-33'})),['work-demo-33']);
  for(const extra of [{view:'renditions'},{variant:['BM01']},{frame:['full_body']}])assert.equal(run({q:'DEMO-33',...extra}).total,0);
});
test('counts refer to the filtered full result rather than the current page',()=>{
  assert.deepEqual(run({page:2}).facets,run().facets);
  assert.equal(run().facets['native:fixture-dance'],34);
  assert.equal(run({view:'renditions',platform:['x','bilibili']}).total,51);
});
test('heat uses comparable same-platform cohorts, declared zero and stable ties',()=>{
  const s=(views,likes,days=1)=>({at:before(days),views,likes,comments:null,reposts:null});
  const mains=[
    {id:'a',platform:'bilibili',samples:[s(0,0),s(999,999,-1),s(999,999,35)]},
    {id:'b',platform:'bilibili',samples:[s(200,9)]},{id:'c',platform:'bilibili',samples:[s(200,9)]},
    {id:'x',platform:'x',samples:[s(900000,0)]},{id:'mask',platform:'bilibili',samples:[s(10,null)]},
    {id:'stale',platform:'x',samples:[s(9,0,31)]},{id:'bad',platform:'x',samples:[s(-1,1),s(9,0,-1)]},
  ];
  const scored=heatScores(examples.asOf,mains);
  assert.ok(scored.get('a').heat<scored.get('b').heat);
  assert.deepEqual(scored.get('b'),scored.get('c'));
  for(const key of ['x','mask','stale','bad'])assert.equal(scored.get(key).heat,null);
  assert.equal(scored.get('stale').heatState,'stale');assert.equal(scored.get('bad').heatState,'missing');
  assert.throws(()=>heatScores(examples.asOf,[mains[0],mains[0]]),/duplicate/);
});
test('freshness halves at 14 days and invalid or future timestamps stay unknown',()=>{
  assert.equal(trendScore(at,before(14),0),.275);
  assert.equal(trendScore(at,null,null),.225);
  assert.equal(trendScore(at,before(-1),null),.225);
  assert.equal(utc('2026-02-30T12:00:00Z'),null);
  const r=[[5,.83],[2,.58],[1,null],[28,.92]].map(([d,h])=>trendScore(at,before(d),h).toFixed(4));
  assert.deepEqual(r,['0.8029','0.7591','0.7484','0.5515']);
});
test('ranking sorts freshness and heat independently, with deterministic final ties',()=>{
  const r=(id,age,heat)=>({id,listedAt:age===null?null:before(age),heat,relevance:0,exactId:false});
  const rows=[r('b',1,.4),r('z',4,.8),r('a',null,null),r('a1',1,.4)];
  assert.deepEqual(rows.slice().sort((a,b)=>rankOrder(a,b,'latest',at,false)).map(r=>r.id),['a1','b','z','a']);
  assert.deepEqual(rows.slice().sort((a,b)=>rankOrder(a,b,'hot',at,false)).map(r=>r.id),['z','a1','b','a']);
  assert.deepEqual(run({sort:'latest'}).matches.map(m=>m.listedAt),run({sort:'latest'}).matches.map(m=>m.listedAt).slice().sort((a,b)=>Date.parse(b)-Date.parse(a)));
});
test('hash URL is bounded and round-trips bilingual and exact scoped filters',()=>{
  const q={...emptyQuery(),q:'"gesture dance" 比心',tag:['source:movement.heart_gesture'],variant:['BM01'],
    platform:['bilibili'],frame:['half_body'],shape:['landscape'],scope:'source',candidates:true,sort:'hot',page:2};
  assert.deepEqual(parseRoute(routeHash(q,'video-demo-01-bm01-1')),{query:q,detail:'video-demo-01-bm01-1',issue:null});
  assert.equal(parseRoute('#/videos?p=-2&id=%2Ftmp&tag=wrong').query.page,1);
  assert.equal(parseRoute('#/videos?id=%2Ftmp').detail,null);
  assert.ok(parseRoute('#/miss').issue);
  assert.ok(parseRoute('#/videos?q='+'foo'.repeat(121)).issue);
});
test('snapshot integrity rejects mixed revisions, unadmitted paths and loose source links',()=>{
  assert.throws(()=>unpack({version:'old',value:1},'new'),/版本/);
  assert.throws(()=>unpack({version:'new',value:1,extra:2},'new'),/字段/);
  assert.ok(safeRelative('data/catalog.abcdef.json'));
  for(const path of ['../other','data/../other','//test.invalid/a','data/%2e','data/a\\b','data/a:1','data/a.'])assert.equal(safeRelative(path),false,path);
  assert.ok(sourceLink('https://www.bilibili.com/video/av123/?p=2'));
  for(const href of ['https://www.bilibili.com.evil.invalid/video/av123/','https://www.bilibili.com/video/av123/?p=2&foo=bar','https://user@x.com/a/status/123'])assert.equal(sourceLink(href),false);
  assert.throws(()=>validateTags([...examples.tags,examples.tags[0]]),/重复/);
});
test('static media ranges allow single well-formed ranges only',()=>{
  assert.equal(byteRange(undefined,1000),null);
  assert.deepEqual(byteRange('bytes=10-19',1000),{start:10,stop:19});
  assert.deepEqual(byteRange('bytes=995-',1000),{start:995,stop:999});
  assert.deepEqual(byteRange('bytes=-12',1000),{start:988,stop:999});
  for(const value of ['bytes=1000-','bytes=20-19','bytes=-0','bytes=0-1,5-7','items=0-1'])assert.equal(byteRange(value,1000),false);
});
