import {emptyQuery, framings, idPattern, platforms, shapes, tagIdPattern, variants} from './model.ts';
import type {Query} from './model.ts';
import {parseTerms, QUERY_LENGTH} from './search.ts';

export type Route = {query: Query; detail: string | null; issue: string | null};
export function parseRoute(hash: string): Route {
  const q=emptyQuery();
  const raw=hash.replace(/^#/,'');
  if (raw.length>8192) return {query:q,detail:null,issue:'链接过长，已打开默认目录。'};
  const [path,qs='']=raw.includes('?')?[raw.slice(0,raw.indexOf('?')),raw.slice(raw.indexOf('?')+1)]:[raw,''];
  if (path && path!=='/videos' && path!=='/') return {query:q,detail:null,issue:'这个入口不存在，已打开默认目录。'};
  const p=new URLSearchParams(qs);
  let issue: string|null=null;
  const text=p.get('q')??'';
  try {parseTerms(text);q.q=text;} catch(e) {issue=(e as Error).message;}
  const one=<T extends string>(key: string, choices: readonly T[], fallback:T)=>choices.find(x=>x===p.get(key))??fallback;
  const many=<T extends string>(key: string, choices: readonly T[])=>choices.filter(x=>p.getAll(key).includes(x));
  q.tag=[...new Set(p.getAll('tag').filter(x=>tagIdPattern.test(x)))].slice(0,30);
  q.platform=many('platform',platforms); q.variant=many('variant',variants); q.frame=many('frame',framings); q.shape=many('shape',shapes);
  q.scope=one('scope',['all','source','rendition'],'all');q.view=one('view',['works','renditions'],'works');
  q.sort=one('sort',['trend','latest','hot'],'trend');q.candidates=p.get('candidate')==='1';
  const page=p.get('p');q.page=page&&/^[1-9]\d{0,8}$/.test(page)?Number(page):1;
  const id=p.get('id');
  return {query:q,detail:id&&idPattern.test(id)?id:null,issue};
}
export function routeHash(query: Query,detail: string|null=null): string {
  const p=new URLSearchParams();
  if (query.q.trim()) p.set('q',[...query.q].slice(0,QUERY_LENGTH).join(''));
  for (const key of ['tag','platform','variant','frame','shape'] as const) for (const entry of [...query[key]].sort()) p.append(key,entry);
  if (query.scope!=='all')p.set('scope',query.scope);
  if (query.candidates)p.set('candidate','1');
  if (query.view!=='works')p.set('view',query.view);
  if (query.sort!=='trend')p.set('sort',query.sort);
  if (query.page!==1)p.set('p',String(query.page));
  if (detail)p.set('id',detail);
  const text=p.toString();
  return '#/videos'+(text?'?'+text:'');
}
