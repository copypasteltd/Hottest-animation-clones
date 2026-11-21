import type {Meta, Ref, Detail} from './model.ts';
import {safeRelative, unpack, validateMeta, validateCatalog, validateHome, validateDetail, validateTags} from './validate.ts';
import type {Tag} from './model.ts';

const BASE=new URL(import.meta.env.BASE_URL,window.location.origin);
export function resource(path: string) {
  if(!safeRelative(path)) throw new Error('资源路径无效');
  return new URL(path,BASE).href;
}
async function bytes(path: string, cap: number, signal: AbortSignal, refresh=false) {
  const response=await fetch(resource(path),{signal,credentials:'omit',redirect:'error',cache:refresh?'no-cache':'default'});
  if(!response.ok||!response.headers.get('content-type')?.toLowerCase().includes('application/json')) throw new Error('目录资源不可用（'+response.status+'）。');
  if(Number(response.headers.get('content-length'))>cap||!response.body) throw new Error('目录资源超出加载限制。');
  const stream=response.body.getReader();
  const parts: Uint8Array[]=[];
  let size=0;
  try {
    for(;;) {
      const item=await stream.read();if(item.done) break;
      size+=item.value.byteLength;
      if(size>cap) {await stream.cancel();throw new Error('目录资源超出加载限制。');}
      parts.push(item.value);
    }
  } finally {stream.releaseLock();}
  const data=new Uint8Array(size);
  let off=0;for(const p of parts) {data.set(p,off);off+=p.byteLength;}
  return data;
}
const json=(b: Uint8Array) => JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b)) as unknown;
async function block(ref: Ref, meta: Meta, cap: number, signal: AbortSignal) {
  const data=await bytes(ref.path,cap,signal);
  if(!crypto.subtle) throw new Error('请通过 HTTPS 或本机回环地址打开目录。');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(x=>x.toString(16).padStart(2,'0')).join('');
  if(digest!==ref.sha256)throw new Error('目录校验未通过，请刷新或重新构建。');
  return unpack(json(data),meta.version);
}
export const fetchMeta=async (signal: AbortSignal) => validateMeta(json(await bytes('data/catalog-meta.json',3_500_000,signal,true)));
export const fetchHome=async (meta: Meta, signal: AbortSignal) => validateHome(await block(meta.home,meta,2_500_000,signal),meta);
export async function fetchCatalog(meta: Meta, signal: AbortSignal) {
  const [c,t]=await Promise.all([block(meta.catalog,meta,16_000_000,signal),block(meta.tags,meta,5_000_000,signal)]);
  const tags=validateTags(t);
  return {catalog:validateCatalog(c,tags,meta),tags};
}
export async function fetchDetail(meta: Meta,key: string,tags: Tag[],signal: AbortSignal): Promise<Detail> {
  const ref=Object.hasOwn(meta.details,key)?meta.details[key]:null;
  if(!ref)throw new Error('该条目不在此目录快照中。');
  return validateDetail(await block(ref,meta,3_000_000,signal),key,meta,tags);
}
