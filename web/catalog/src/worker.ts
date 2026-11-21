import {SearchIndex} from './search.ts';
import type {Catalog, Query, Tag} from './model.ts';
export type SearchRequest = {kind:'init'; catalog:Catalog; tags:Tag[]; asOf:string} | {kind:'search'; sequence:number; query:Query};
let index: SearchIndex|undefined;
self.onmessage = (event: MessageEvent<SearchRequest>) => {
  const m=event.data;
  try {
    if(m.kind==='init'){index=new SearchIndex(m.catalog,m.tags,m.asOf);self.postMessage({kind:'ready'});return;}
    if(!index) throw new Error('检索索引尚未准备好。');
    self.postMessage({kind:'result',sequence:m.sequence,result:index.run(m.query)});
  } catch(e){self.postMessage({kind:'error',sequence:m.kind==='search'?m.sequence:null,error:(e as Error).message});}
};
