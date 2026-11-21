import {framings, idPattern, PAGE_SIZE, platforms, RANKING, SCHEMA, scopes, shapes,
  tagIdPattern, TAXONOMY, utc, variants} from './model.ts';
import type {Catalog, Detail, Fact, Meta, Ref, Tag, TagRef} from './model.ts';
import type {Match, QueryResult} from './search.ts';

type Obj = Record<string,unknown>;
export type Home = {catalog: Catalog; tags: Tag[]; result: QueryResult};
const revPattern = /^[a-f0-9]{24}$/;
const shaPattern = /^[a-f0-9]{64}$/;
const heatStates = ['available','missing','stale','incomparable'];
const tagStates = ['observed','candidate'];
export function insist(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function object(value: unknown, keys: string, where: string): Obj {
  insist(value!==null&&typeof value==='object'&&!Array.isArray(value),where+' 不是对象');
  const o=value as Obj, allowed=keys.split(' ');
  insist(Object.keys(o).length===allowed.length&&allowed.every(key=>Object.hasOwn(o,key)),where+' 字段与契约不一致');
  return o;
}
function array(value: unknown, max: number, where: string): unknown[] {
  insist(Array.isArray(value)&&value.length<=max,where+' 列表无效');
  return value;
}
function text(v: unknown, max: number, at: string, empty=false): string {
  insist(typeof v==='string'&&v.length<=max&&(empty||v.trim().length>0)&&!/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v),at+' 文本无效');
  return v;
}
function int(v: unknown, min: number, max: number, at: string): number {
  insist(typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max,at+' 数值无效');
  return v;
}
function time(v: unknown, at: string, nullable=true): void {
  insist(v===null&&nullable||typeof v==='string'&&utc(v)!==null,at+' UTC 时间无效');
}
function one(v: unknown, values: readonly string[], label: string): void {
  insist(typeof v==='string'&&values.includes(v),label+' 枚举无效');
}
function id(v: unknown, prefix: string): string {
  insist(typeof v==='string'&&idPattern.test(v)&&v.startsWith(prefix+'-'), '目录编号无效');
  return v;
}
export function safeRelative(value: unknown): value is string {
  return typeof value==='string'&&value.length<250&&value.split('/').every(segment=>/^[a-z0-9][a-z0-9._-]*$/.test(segment)&&!segment.endsWith('.'));
}
function relative(v: unknown, expected: RegExp, where: string): void {
  insist(safeRelative(v)&&expected.test(v),where+' 路径不在目录资源范围');
}
export function sourceLink(value: unknown): value is string {
  if (typeof value!=='string'||value.length>250) return false;
  try {
    const u=new URL(value);
    if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash) return false;
    if (u.hostname==='www.bilibili.com') {
      const p=u.search===''||/^\?p=[1-9]\d{0,5}$/.test(u.search);
      return p&&/^\/video\/(?:BV[a-zA-Z0-9]{10}|av[0-9]+)\/?$/.test(u.pathname);
    }
    return !u.search&&(u.hostname==='www.douyin.com'&&/^\/video\/\d+\/?$/.test(u.pathname)||
      u.hostname==='x.com'&&/^\/[a-zA-Z0-9_]+\/status\/\d+\/?$/.test(u.pathname));
  } catch {return false;}
}
function tagIndex(value: unknown, known: Set<string>, validScopes: string[], at: string): TagRef[] {
  const seen=new Set<string>();
  for (const entry of array(value,250,at)) {
    const r=object(entry,'id state',at);
    insist(typeof r.id==='string'&&known.has(r.id)&&validScopes.includes(r.id.split(':')[0])&&!seen.has(r.id),at+' 标签重复或来源不符');
    one(r.state,tagStates,at);
    seen.add(r.id);
  }
  return value as TagRef[];
}
function onlyUnique(keys: string[], at: string): void {insist(new Set(keys).size===keys.length,at+' 有重复编号');}
function exactRef(value: unknown, expected: string): Ref {
  const r=object(value,'path sha256','快照引用');
  insist(safeRelative(r.path)&&r.path===expected&&typeof r.sha256==='string'&&shaPattern.test(r.sha256),'快照引用无效');
  return value as Ref;
}
export function validateMeta(value: unknown): Meta {
  const o=object(value,'schemaVersion taxonomyVersion rankingVersion version asOf mode catalog tags home details','目录入口');
  insist(o.schemaVersion===SCHEMA&&o.taxonomyVersion===TAXONOMY&&o.rankingVersion===RANKING,'目录版本不兼容，请重新构建或刷新。');
  insist(typeof o.version==='string'&&revPattern.test(o.version),'目录版本无效');
  time(o.asOf,'快照',false);
  one(o.mode,['example','local'],'目录模式');
  const v=o.version;
  exactRef(o.catalog,'data/catalog.'+v+'.json');exactRef(o.tags,'data/tags.'+v+'.json');exactRef(o.home,'data/home.'+v+'.json');
  insist(o.details!==null&&typeof o.details==='object'&&!Array.isArray(o.details),'详情索引无效');
  const details=Object.entries(o.details as Obj);
  insist(details.length<=20000,'详情索引过大');
  for(const [key,ref] of details) {insist(idPattern.test(key),'详情编号无效');exactRef(ref,'data/details/'+key+'.'+v+'.json');}
  return value as Meta;
}
export function unpack(value: unknown, version: string): unknown {
  const o=object(value,'version value','静态数据块');
  insist(o.version===version,'快照版本不一致，请刷新。');
  return o.value;
}
export function validateTags(value: unknown): Tag[] {
  const seen=new Set<string>();
  for(const entry of array(value,30000,'词表')) {
    const t=object(entry,'id scope zh en aliases facet','词表条目');
    one(t.scope,scopes,'标签来源');
    insist(typeof t.id==='string'&&tagIdPattern.test(t.id)&&t.id.startsWith(t.scope+':')&&!seen.has(t.id),'词表编号无效或重复');
    seen.add(t.id);
    text(t.zh,180,'中文标签');text(t.en,180,'英文标签',true);text(t.facet,100,'标签维度');
    for(const t1 of array(t.aliases,30,'别名'))text(t1,180,'别名文本');
  }
  return value as Tag[];
}
export function validateCatalog(value: unknown, tags: Tag[], meta: Meta, subset=false): Catalog {
  const c=object(value,'works renditions','目录');
  const known=new Set(tags.map(t=>t.id));
  const workIds=array(c.works,10000,'作品').map(entry=>{
    const w=object(entry,'id title description code platform listedAt heat heatAt heatState tags','作品');
    const key=id(w.id,'work');
    text(w.title,300,'作品标题');text(w.description,24_000,'作品说明',true);
    if(w.code!==null)text(w.code,120,'作品编号');
    one(w.platform,platforms,'平台');time(w.listedAt,'入库');time(w.heatAt,'热度');one(w.heatState,heatStates,'热度状态');
    insist(w.heat===null?w.heatState!=='available':typeof w.heat==='number'&&w.heat>=0&&w.heat<=1&&w.heatState==='available'&&w.heatAt!==null,'热度与状态矛盾');
    tagIndex(w.tags,known,['native','source'],'作品标签');return key;
  });
  const works=new Set(workIds);
  const videoIds=array(c.renditions,10000,'成片').map(entry=>{
    const r=object(entry,'id workId title description variant framing shape durationMs listedAt label poster playable tags','成片');
    const key=id(r.id,'video');
    insist(typeof r.workId==='string'&&works.has(r.workId),'成片没有关联作品');
    one(r.variant,variants,'成片版本');one(r.framing,framings,'成片取景');one(r.shape,shapes,'成片画幅');
    text(r.title,300,'成片标题');text(r.description,24_000,'成片摘要',true);text(r.label,140,'成片版本说明');
    int(r.durationMs,1,86_400_000,'成片时长');time(r.listedAt,'成片入库');
    insist(typeof r.playable==='boolean'&&(meta.mode==='local'||r.playable===false),'当前公开模式不能带入播放资源');
    if(r.poster!==null) {
      const p=object(r.poster,'path width height','封面');
      const kind=meta.mode==='local'?'webp':'svg';
      insist(safeRelative(p.path)&&p.path==='covers/'+key+'.'+kind,'封面路径不匹配');
      int(p.width,1,4096,'封面宽');int(p.height,1,4096,'封面高');
    }
    tagIndex(r.tags,known,['rendition','configuration'],'成片标签');return key;
  });
  const ids=[...workIds,...videoIds];
  onlyUnique(ids,'目录');
  insist(ids.every(key=>Object.hasOwn(meta.details,key))&&(subset||Object.keys(meta.details).length===ids.length),'目录与详情索引不一致');
  return value as Catalog;
}
function factRows(value: unknown, tags: Map<string,Tag>, from: string, at: string): Fact[] {
  for(const entry of array(value,1600,at)) {
    const f=object(entry,'id state note times interval',at);
    const tag=typeof f.id==='string'?tags.get(f.id):null;
    insist(tag?.scope===from,at+' 标签来源不符');
    one(f.state,[...tagStates,'not_observed_in_samples'],at);
    text(f.note,8000,'观察说明',true);
    let prior=-1;
    for(const ms of array(f.times,1200,'采样时点')) {const cur=int(ms,0,86_400_000,'采样时点');insist(cur>prior,'采样时点未严格递增');prior=cur;}
    if(f.interval!==null) {const a=array(f.interval,2,'观察区间');insist(a.length===2&&int(a[1],1,86_400_000,'结束点')>int(a[0],0,86_399_999,'起始点'),'观察区间无效');}
  }
  return value as Fact[];
}
export function validateDetail(value: unknown, key: string, meta: Meta, tags: Tag[]): Detail {
  const d=object(value,'id sourceUrl video sourceFacts renditionFacts acceptance notes','详情');
  insist(d.id===key&&Object.hasOwn(meta.details,key),'详情身份不符');
  insist(d.sourceUrl===null||meta.mode==='local'&&sourceLink(d.sourceUrl),'原片链接不在允许范围');
  if(d.video!==null) {
    insist(meta.mode==='local'&&key.startsWith('video-'),'示例或作品详情不能带入视频');
    relative(d.video,/^media\/video-[a-z0-9-]+\.mp4$/,'播放');
    insist(d.video==='media/'+key+'.mp4','播放与详情编号不符');
  }
  const ts=new Map(tags.map(x=>[x.id,x]));
  factRows(d.sourceFacts,ts,'source','原片观察');factRows(d.renditionFacts,ts,'rendition','成片观察');
  text(d.acceptance,180,'验收状态',true);for(const n of array(d.notes,24,'说明'))text(n,6000,'详情说明');
  return value as Detail;
}
export function validateHome(value: unknown, meta: Meta): Home {
  const root=object(value,'catalog tags result','首页快照');
  const tags=validateTags(root.tags);
  const catalog=validateCatalog(root.catalog,tags,meta,true);
  const result=object(root.result,'matches total pages page facets hotAvailable','首页排序');
  const total=int(result.total,0,10000,'首页总数');
  insist(result.page===1&&result.pages===Math.ceil(total/PAGE_SIZE)&&typeof result.hotAvailable==='boolean','首页分页无效');
  insist(result.facets!==null&&typeof result.facets==='object'&&!Array.isArray(result.facets)&&!Object.keys(result.facets).length,'首页标签计数必须等待完整索引');
  const ws=new Map(catalog.works.map(w=>[w.id,w])), vs=new Map(catalog.renditions.map(v=>[v.id,v]));
  const seen=new Set<string>();
  for(const row of array(result.matches,PAGE_SIZE,'首页结果')) {
    const m=object(row,'id workId videoId matchingVideoIds matchedFields listedAt heat relevance exactId','首页结果');
    const work=id(m.workId,'work');
    insist(m.id===work&&ws.has(work)&&!seen.has(work)&&m.heat===ws.get(work)!.heat&&m.relevance===0&&m.exactId===false,'首页作品绑定无效');
    seen.add(work);time(m.listedAt,'首页入库');
    const renditions=array(m.matchingVideoIds,10000,'首页成片编号').map(k=>id(k,'video'));
    onlyUnique(renditions,'首页成片');
    insist(renditions.every(k=>vs.get(k)?.workId===work)&&(m.videoId===null?!renditions.length:renditions.includes(m.videoId as string)),'首页成片绑定无效');
    insist(!array(m.matchedFields,0,'首页命中字段').length,'无条件首页不能声明命中字段');
  }
  insist(seen.size===Math.min(total,PAGE_SIZE)&&seen.size===ws.size,'首页结果数量不符');
  return {catalog,tags,result:root.result as QueryResult};
}
export function assertMatchResult(x: QueryResult): x is QueryResult {
  return !!x&&Number.isInteger(x.total)&&Array.isArray(x.matches)&&x.matches.length<=PAGE_SIZE&&x.matches.every((m: Match)=>idPattern.test(m.id));
}
