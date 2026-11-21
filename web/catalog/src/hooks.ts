import {useCallback, useEffect, useRef, useState} from 'react';
import type {Catalog, Meta, Query, Tag} from './model.ts';
import type {QueryResult} from './search.ts';
import {emptyQuery} from './model.ts';
import {fetchCatalog, fetchHome, fetchMeta} from './data.ts';
import type {Home} from './validate.ts';
import {assertMatchResult} from './validate.ts';
import {parseRoute, routeHash} from './route.ts';
import type {SearchRequest} from './worker.ts';

type Data = {catalog: Catalog; tags: Tag[]};
type Message = {kind:'ready'} | {kind:'result'; sequence:number; result:QueryResult} | {kind:'error'; sequence:number|null; error:string};
export const defaultKey=routeHash(emptyQuery());
const message=(e:unknown) => e instanceof Error ? e.message : '无法读取目录。';
export function useLibrary(query: Query) {
  const key=routeHash(query);
  const [generation,setGeneration]=useState(0);
  const [meta,setMeta]=useState<Meta|null>(null);
  const [home,setHome]=useState<Home|null>(null);
  const [data,setData]=useState<Data|null>(null);
  const [ready,setReady]=useState(false);
  const [issue,setIssue]=useState<string|null>(null);
  const [result,setResult]=useState<{key:string; value:QueryResult}|null>(null);
  const [searchIssue,setSearchIssue]=useState<{key:string; value:string}|null>(null);
  const worker=useRef<Worker|null>(null);
  const sequence=useRef(0);
  const latest=useRef({key,query}); latest.current={key,query};
  const request=useRef({key:'',sequence:0});
  const refresh=useCallback(()=>setGeneration(i=>i+1),[]);

  useEffect(()=>{
    const abort=new AbortController(); const {signal}=abort;
    let own:Worker|null=null;
    setReady(false);setMeta(null);setHome(null);setData(null);setIssue(null);setResult(null);setSearchIssue(null);
    (async()=>{
      const m=await fetchMeta(signal);
      if(signal.aborted)return;
      setMeta(m);
      // The projected first page does not depend on the complete search index.
      const preview=await fetchHome(m,signal).catch(()=>null);
      if(signal.aborted)return;
      if(preview)setHome(preview);
      const complete=await fetchCatalog(m,signal);
      if(signal.aborted)return;
      setData(complete);
      own=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});
      worker.current=own;
      own.onerror=()=>{if(!signal.aborted){setReady(false);setIssue('检索线程未能启动。请刷新目录后重试。');}};
      own.onmessage=(e:MessageEvent<Message>)=>{
        if(signal.aborted)return;
        const m=e.data;
        if(m.kind==='ready'){setReady(true);return;}
        if(m.kind==='error'&&m.sequence===null){setIssue(m.error);return;}
        if(m.sequence!==request.current.sequence||request.current.key!==latest.current.key)return;
        if(m.kind==='error'){setSearchIssue({key:request.current.key,value:m.error});return;}
        if(assertMatchResult(m.result))setResult({key:request.current.key,value:m.result});
        else setSearchIssue({key:request.current.key,value:'检索结果校验失败。'});
      };
      own.postMessage({kind:'init',...complete,asOf:m.asOf} satisfies SearchRequest);
    })().catch(e=>{if(!signal.aborted)setIssue(message(e));});
    return ()=>{abort.abort();own?.terminate();if(worker.current===own)worker.current=null;};
  },[generation]);
  useEffect(()=>{
    if(!ready||!worker.current)return;
    const n=++sequence.current;
    request.current={key,sequence:n};
    worker.current.postMessage({kind:'search',sequence:n,query:latest.current.query} satisfies SearchRequest);
  },[key,ready]);
  return {meta,data:data??home,full:!!data,ready,issue:issue??(searchIssue?.key===key?searchIssue.value:null),
    result:result?.key===key?result.value:key===defaultKey?home?.result??null:null,refresh};
}

type HistoryData={catalogEntry?:boolean; catalogParent?:string; catalogY?:number};
export function useCatalogRoute() {
  const [route,setRoute]=useState(()=>parseRoute(window.location.hash));
  const position=useRef<number|null>(null);
  const refresh=useCallback(()=>{
    const state=history.state as HistoryData|null;
    position.current=typeof state?.catalogY==='number'?state.catalogY:0;
    setRoute(parseRoute(location.hash));
  },[]);
  useEffect(()=>{
    const prior=history.scrollRestoration;
    history.scrollRestoration='manual';
    addEventListener('popstate',refresh);addEventListener('hashchange',refresh);
    return ()=>{removeEventListener('popstate',refresh);removeEventListener('hashchange',refresh);history.scrollRestoration=prior;};
  },[refresh]);
  const go=useCallback((query:Query,detail:string|null,options:{replace?:boolean; preserve?:boolean}={})=>{
    const next=routeHash(query,detail);
    if(next===location.hash)return;
    const prior=(history.state??{}) as HistoryData;
    const current=parseRoute(location.hash);
    history.replaceState({...prior,catalogY:scrollY},'');
    const state:HistoryData={catalogY:options.preserve?scrollY:0};
    if(detail){
      state.catalogEntry=true;
      if(!options.replace&&!current.detail)state.catalogParent=routeHash(query);
      else if(prior.catalogParent)state.catalogParent=prior.catalogParent;
    }
    if(options.replace) history.replaceState(state,'',next); else history.pushState(state,'',next);
    position.current=options.preserve?null:0;
    setRoute(parseRoute(next));
  },[]);
  const close=useCallback(()=>{
    const state=history.state as HistoryData|null;
    if(state?.catalogParent===routeHash(route.query)){history.back();return;}
    go(route.query,null,{replace:true,preserve:true});
  },[go,route.query]);
  return {route,go,close,position};
}
