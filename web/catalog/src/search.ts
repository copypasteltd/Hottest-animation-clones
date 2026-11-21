import {cmpText, frameName, PAGE_SIZE, platformName, shapeName, utc, variantName} from './model.ts';
import type {Catalog, Query, Rendition, Tag, TagRef, Work} from './model.ts';
import {listedTime, rankOrder} from './ranking.ts';
import type {RankItem} from './ranking.ts';

export const normalize = (text: string) => text.normalize('NFKC').toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const words = (text: string) => text.match(/\p{Script=Han}+|(?:(?!\p{Script=Han})[\p{L}\p{N}])+/gu) ?? [];
const exactKey = (text: string) => text.normalize('NFKC').trim().toLowerCase();
const han = /^\p{Script=Han}+$/u;
const latin = /^[a-z]+$/;
export const QUERY_LENGTH = 120;
export const QUERY_WORDS = 12;
export type Term = {text: string; phrase: boolean; fuzz: number};
export function parseTerms(q: string): Term[] {
  const value = q.normalize('NFKC');
  if ([...q].length > QUERY_LENGTH || [...value].length > QUERY_LENGTH) throw new Error('搜索最多输入 120 个字符。');
  const terms: Term[] = [];
  for (const m of value.matchAll(/"([^"]*)"|([^"\s]+)/gu)) {
    const phrase = m[1] !== undefined;
    const clean = normalize(m[1] ?? m[2]);
    for (const text of phrase ? [clean] : clean.split(' ')) {
      if (!text) continue;
      const length = [...text].length;
      const fuzz = phrase ? 0 : han.test(text) && length >= 3 ? 1 : latin.test(text) && length >= 4 ? length >= 8 ? 2 : 1 : 0;
      terms.push({text, phrase, fuzz});
    }
  }
  if (terms.length > QUERY_WORDS) throw new Error('搜索最多支持 12 个检索词。');
  return terms;
}

export function editWithin(a: string[], b: string[], limit: number): boolean {
  if (Math.abs(a.length - b.length) > limit) return false;
  if (!a.length || !b.length) return Math.max(a.length,b.length) <= limit;
  let row = Array.from({length:b.length+1}, (_,i)=>i);
  let twoBack: number[] | undefined;
  for (let i=1; i<=a.length; i++) {
    let best=limit+1;
    const next=new Array<number>(b.length+1).fill(limit+1);
    next[0]=i;
    for (let j=Math.max(1,i-limit); j<=Math.min(b.length,i+limit); j++) {
      next[j]=Math.min(row[j]+1,next[j-1]+1,row[j-1]+Number(a[i-1]!==b[j-1]));
      if (twoBack && j>=2 && a[i-1]===b[j-2] && a[i-2]===b[j-1]) {
        next[j]=Math.min(next[j],twoBack[j-2]+1);
      }
      best=Math.min(best,next[j]);
    }
    if (Math.min(best,next[0])>limit) return false;
    twoBack=row;row=next;
  }
  return row[b.length]<=limit;
}

type Atom = {text: string; tokens: string[]};
function factor(atom: Atom, term: Term, needle: string[]): number {
  if (atom.text===term.text) return 1;
  if (term.phrase) return atom.text.includes(term.text) ? .85 : 0;
  if (atom.tokens.includes(term.text)) return 1;
  if (atom.tokens.some(v=>v.startsWith(term.text))) return .92;
  if (atom.text.includes(term.text)) return .85;
  if (!term.fuzz) return 0;
  for (const token of atom.tokens) {
    if (han.test(term.text)) {
      if (!han.test(token)) continue;
      const chars=[...token];
      for (let len=needle.length-term.fuzz; len<=needle.length+term.fuzz && len<=chars.length; len++) {
        for (let start=0; start+len<=chars.length; start++) {
          if (editWithin(needle,chars.slice(start,start+len),term.fuzz)) return .7;
        }
      }
    } else if (latin.test(token) && editWithin(needle,[...token],term.fuzz)) return .7;
  }
  return 0;
}

type Field = {atom: Atom; weight: number; label: string; tag?: Tag};
type Indexed = {work: Work; video: Rendition | null; fixed: Field[]; tags: TagRef[]};
type Hit = {record: Indexed; relevance: number; exactId: boolean; fields: string[]; ids: Set<string>};
export type Match = RankItem & {workId: string; videoId: string | null; matchingVideoIds: string[]; matchedFields: string[]};
export type QueryResult = {matches: Match[]; total: number; pages: number; page: number; facets: Record<string,number>; hotAvailable: boolean};
const has = <T>(choices: T[], value: T): boolean => !choices.length || choices.includes(value);
const scopeAllows = (scope: Tag['scope'], q: Query) => scope==='native' || q.scope==='all' || scope===q.scope || scope==='configuration' && q.scope==='rendition';

export class SearchIndex {
  private records: Indexed[] = [];
  private dictionary = new Map<string,Atom>();
  private fields = new Map<string,Field[]>();
  private exact = new Map<string,number[]>();
  private chars = new Map<string,Set<number>>();
  private now: number;
  constructor(catalog: Catalog, vocabulary: Tag[], asOf: string) {
    const now=utc(asOf);
    if (now===null) throw new Error('无效的目录快照时间。');
    this.now=now;
    for (const tag of vocabulary) {
      this.fields.set(tag.id,[tag.id.split(':')[1],tag.zh,tag.en,...tag.aliases].map(text=>
        this.field(text,tag.scope==='native' ? .85 : .95,tag.scope==='native' ? '平台标签' : '分析标签',tag)));
    }
    const byWork=new Map<string,Rendition[]>();
    for (const video of catalog.renditions) {
      if (!byWork.has(video.workId)) byWork.set(video.workId,[]);
      byWork.get(video.workId)!.push(video);
    }
    for (const work of catalog.works) {
      const videos=byWork.get(work.id) ?? [];
      const common=[this.field(work.title,1,'作品标题'),this.field(work.description,.65,'原片说明'),
        this.field(platformName[work.platform]+' '+work.platform,.55,'平台')];
      for (const video of videos.length ? videos : [null]) {
        const fixed=video ? [...common,this.field(video.title,1,'成片标题'),this.field(video.description,.65,'成片摘要'),
          this.field(variantName[video.variant]+' '+frameName[video.framing]+' '+video.framing+' '+shapeName[video.shape]+' '+video.shape,.55,'版本与构图')]
          : common;
        const tags=[...work.tags,...(video?.tags??[])];
        const record={work,video,fixed,tags};
        const ordinal=this.records.push(record)-1;
        for (const name of [work.id,work.code,video?.id]) {
          if (!name) continue;
          const id=exactKey(name);
          if (!this.exact.has(id)) this.exact.set(id,[]);
          this.exact.get(id)!.push(ordinal);
        }
        const values=new Set([...fixed,...tags.flatMap(t=>this.fields.get(t.id)??[])].map(f=>f.atom));
        for (const ch of new Set(Array.from(values).flatMap(v=>[...v.text.replaceAll(' ','')]))){
          if (!this.chars.has(ch)) this.chars.set(ch,new Set());
          this.chars.get(ch)!.add(ordinal);
        }
      }
    }
  }
  private field(text: string,weight: number,label: string,tag?: Tag): Field {
    const key=normalize(text);
    let atom=this.dictionary.get(key);
    if (!atom) {atom={text:key,tokens:words(key)};this.dictionary.set(key,atom);}
    return {atom,weight,label,tag};
  }
  run(q: Query): QueryResult {
    const terms=parseTerms(q.q);
    const typed=exactKey(q.q);
    const identity=new Set(this.exact.get(typed)??[]);
    // An accepted fuzzy hit must share at least one code point; union, not bigram-only recall.
    const posting=terms.map(t=>{
      const set=new Set<number>();
      for(const ch of new Set([...t.text.replaceAll(' ','')])) for(const id of this.chars.get(ch)??[]) set.add(id);
      return set;
    }).sort((a,b)=>a.size-b.size);
    const possible=posting.length ? new Set([...posting[0]].filter(id=>posting.every(p=>p.has(id)))) : null;
    if (possible) for (const id of identity) possible.add(id);
    const cache=terms.map(()=>new Map<Atom,number>());
    const needles=terms.map(t=>[...t.text]);
    const hits: Hit[]=[];
    const wantsVideo=q.view==='renditions'||!!(q.variant.length||q.frame.length||q.shape.length||q.tag.some(id=>id.startsWith('rendition:')||id.startsWith('configuration:')));
    for (const i of possible??this.records.keys()) {
      const record=this.records[i], v=record.video;
      if ((!v&&wantsVideo)||!has(q.platform,record.work.platform)||v&&(!has(q.variant,v.variant)||!has(q.frame,v.framing)||!has(q.shape,v.shape))) continue;
      const refs=record.tags.filter(t=>q.candidates||t.state==='observed');
      const ids=new Set(refs.map(t=>t.id));
      if (!q.tag.every(t=>ids.has(t))) continue;
      const exactId=identity.has(i);
      const fields=new Set<string>();
      let relevance=0;
      if (exactId) { relevance=1; fields.add('编号'); }
      else if (terms.length) {
        const searchable=[...record.fixed,...refs.flatMap(r=>(this.fields.get(r.id)??[]).filter(f=>f.tag&&scopeAllows(f.tag.scope,q)))];
        let sum=0;
        for (const [j,term] of terms.entries()) {
          let best=0; let from='';
          for (const f of searchable) {
            if (f.weight<=best||!f.atom.text) continue;
            let score=cache[j].get(f.atom);
            if (score===undefined) {score=factor(f.atom,term,needles[j]);cache[j].set(f.atom,score);}
            if (score*f.weight>best) {best=score*f.weight;from=f.label;}
          }
          if (!best) {sum=-1;break;}
          sum+=best;
          fields.add(from);
        }
        if (sum<0) continue;
        relevance=sum/terms.length;
      }
      hits.push({record,relevance,exactId,fields:[...fields],ids});
    }
    const groups=new Map<string,Hit[]>();
    for (const hit of hits) {
      const id=q.view==='works'?hit.record.work.id:hit.record.video!.id;
      if (!groups.has(id)) groups.set(id,[]);
      groups.get(id)!.push(hit);
    }
    const counts: Record<string,number> = Object.create(null);
    const sorted: Match[]=[];
    for (const [id, eligible] of groups) {
      eligible.sort((a,b)=>{
        const time=(x: Hit)=>listedTime(this.now,x.record.video ? x.record.video.listedAt : x.record.work.listedAt)??-Infinity;
        return time(b)-time(a)||cmpText(a.record.video?.id??'',b.record.video?.id??'');
      });
      const top=eligible[0], work=top.record.work;
      const allIds=new Set(eligible.flatMap(h=>[...h.ids]));
      for (const tag of allIds) counts[tag]=(counts[tag]??0)+1;
      sorted.push({id,workId:work.id,videoId:top.record.video?.id??null,
        listedAt:top.record.video ? top.record.video.listedAt : work.listedAt,heat:work.heat,
        relevance:Math.max(...eligible.map(h=>h.relevance)),exactId:eligible.some(h=>h.exactId),
        matchingVideoIds:eligible.flatMap(h=>h.record.video?[h.record.video.id]:[]),
        matchedFields:[...new Set(eligible.flatMap(h=>h.fields))]});
    }
    sorted.sort((a,b)=>rankOrder(a,b,q.sort,this.now,terms.length>0));
    const total=sorted.length, pages=Math.ceil(total/PAGE_SIZE);
    const page=Math.max(1,Math.min(q.page,pages||1));
    return {total,pages,page,matches:sorted.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE),facets:counts,hotAvailable:sorted.some(m=>m.heat!==null)};
  }
}
