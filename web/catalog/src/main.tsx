import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {cmpText, emptyQuery, frameName, platformName, scopeName, shapeName, utc, variantName, variants} from './model.ts';
import type {Query, Rendition, Tag, Work} from './model.ts';
import {parseTerms} from './search.ts';
import type {Match} from './search.ts';
import {parseRoute,routeHash} from './route.ts';
import {useCatalogRoute,useLibrary} from './hooks.ts';
import {Cover,displayDuration,Icon,Masonry,Panel} from './ui.tsx';
import {FilterPanel,flip,TagPill} from './filters.tsx';
import {DetailPanel} from './detail.tsx';
import './style.css';

const labels={trend:'综合',latest:'最新',hot:'最热'} as const;
const formatter=new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'});
const date=(value:string|null)=>value?formatter.format(new Date(value)):'时间未知';
const modes=[['works','作品'],['renditions','成片']] as const;
const notes={missing:'热度未采集',stale:'热度已过期',incomparable:'暂无可比热度'};
const initialTheme=()=>{try{const t=localStorage.getItem('motion-catalog-theme');if(t==='light'||t==='dark')return t;}catch{/* storage is optional */}return null;};
function useTheme(){
  const [preference,setPreference]=useState<'light'|'dark'|null>(initialTheme);
  const [system,setSystem]=useState(()=>matchMedia('(prefers-color-scheme: dark)').matches);
  const theme=preference??(system?'dark':'light');
  useEffect(()=>{const mq=matchMedia('(prefers-color-scheme: dark)');const on=()=>setSystem(mq.matches);mq.addEventListener('change',on);return()=>mq.removeEventListener('change',on);},[]);
  useLayoutEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);
  function toggle(){const next=theme==='dark'?'light':'dark';setPreference(next);try{localStorage.setItem('motion-catalog-theme',next);}catch{/* optional */}}
  return {theme,toggle};
}
function Switch({value,change,label}:{value:Query['view'];change:(v:Query['view'])=>void;label:string}){
  return <div className="segmented" role="group" aria-label={label}>{modes.map(([v,t])=><button type="button" key={v} aria-pressed={value===v} onClick={()=>change(v)}>{t}</button>)}</div>;
}
function Paging({page,pages,go}:{page:number;pages:number;go:(p:number)=>void}){
  if(pages<2)return null;
  const windowed=[...new Set([1,page-1,page,page+1,pages])].filter(p=>p>=1&&p<=pages).sort((a,b)=>a-b);
  return <nav className="paging" aria-label="分页">
    <button type="button" className="page-step" aria-label="上一页" disabled={page===1} onClick={()=>go(page-1)}><Icon name="left" size={15}/><span>上一页</span></button>
    {windowed.map((v,i)=><span className="page-part" key={v}>{i>0&&v-windowed[i-1]>1&&<span className="ellipsis" aria-hidden="true">···</span>}<button type="button" aria-current={v===page?'page':undefined} aria-label={'第 '+v+' 页'} onClick={()=>go(v)}>{v}</button></span>)}
    <button type="button" className="page-step" aria-label="下一页" disabled={page===pages} onClick={()=>go(page+1)}><span>下一页</span><Icon name="right" size={15}/></button>
  </nav>;
}
function Card({match,work,video,eligible,wordbank,mode,eager,select,view,toggleTag,active}:{match:Match;work:Work;
  video:Rendition|null;eligible:Rendition[];wordbank:Map<string,Tag>;mode:Query['view'];eager:boolean;
  select:(id:string)=>void;view:()=>void;toggleTag:(id:string)=>void;active:string[]}){
  const title=mode==='renditions'&&video?video.title:work.title;
  const tags=[...work.tags,...(video?.tags??[])].filter(t=>t.state==='observed')
    .sort((a,b)=>{const order=(id:string)=>id.startsWith('rendition:movement.')?0:id.startsWith('source:content.')?1:id.startsWith('source:movement.')?2:id.startsWith('native:')?3:4;return order(a.id)-order(b.id);})
    .map(t=>wordbank.get(t.id)).filter((t):t is Tag=>!!t);
  return <article className="card" data-item={match.id} aria-label={title}>
    <button className="card-main" type="button" aria-label={'查看：'+title} onClick={view}>
      <span className="card-media" data-shape={video?.shape}><Cover key={video?.id??work.id} video={video} eager={eager}/>
        {video&&<span className="media-chip" data-playable={video.playable}><Icon name={video.playable?'play':'video'} size={12}/>{displayDuration(video.durationMs)}</span>}
        {video?.poster&&video.shape==='portrait'&&<span className="corner-frame">竖屏</span>}
      </span>
      <span className="card-title">{title}</span>
      <span className="card-meta"><span><i className={'dot brand '+work.platform}/>{platformName[work.platform]}{video?' · '+frameName[video.framing]+'／'+shapeName[video.shape]:''}</span><time dateTime={match.listedAt??undefined}>{date(match.listedAt)}</time></span>
    </button>
    {mode==='works'&&eligible.length>0&&<div className="version-row" aria-label={'版本：'+work.title}>
      {variants.map(v=>{const r=eligible.find(item=>item.variant===v);return r&&<button className="version" type="button" key={v} aria-pressed={video?.variant===v} onClick={()=>select(r.id)}>{variantName[v]}</button>;})}
    </div>}
    {mode==='renditions'&&video&&<p className="rendition-caption">{variantName[video.variant]} · {video.label}</p>}
    {tags.length>0&&<div className="card-tags">{tags.slice(0,3).map(t=><TagPill key={t.id} tag={t} showScope selected={active.includes(t.id)} onClick={()=>toggleTag(t.id)}/>)}
      {tags.length>3&&<button type="button" className="plus-tags" aria-label={'查看全部 '+tags.length+' 个标签：'+title} onClick={view}>+{tags.length-3}</button>}
    </div>}
    <div className="card-tail"><span title={match.heat===null?notes[work.heatState as keyof typeof notes]??'热度未采集':'平台互动快照 '+date(work.heatAt)}>{match.heat===null?notes[work.heatState as keyof typeof notes]??'热度未采集':'热度 '+Math.round(match.heat*100)}</span>
      {!!match.matchedFields.length&&<span title={match.matchedFields.join('、')}>命中：{match.matchedFields.join('、')}</span>}</div>
  </article>;
}

function App(){
  const {route,go,close,position}=useCatalogRoute();const {query,detail}=route;
  const lib=useLibrary(query);
  const {data,result,meta}=lib;
  const {theme,toggle}=useTheme();
  const [panel,setPanel]=useState<'filters'|'info'|null>(null);
  const [draft,setDraft]=useState(query.q);
  const [usingIME,setUsingIME]=useState(false);
  const [queryIssue,setQueryIssue]=useState<string|null>(null);
  const [choice,setChoice]=useState<Record<string,string>>({});
  const input=useRef<HTMLInputElement>(null),section=useRef<HTMLElement>(null);
  const jump=useRef(false),heading=useRef<HTMLHeadingElement>(null);
  const queryKey=routeHash(query);
  const catalog=data?.catalog;
  const tags=useMemo(()=>data?.tags??[],[data]);
  const wordbank=useMemo(()=>new Map(tags.map(t=>[t.id,t])),[tags]);
  const works=useMemo(()=>new Map(catalog?.works.map(w=>[w.id,w])??[]),[catalog]);
  const videos=useMemo(()=>new Map(catalog?.renditions.map(v=>[v.id,v])??[]),[catalog]);
  const sorted=(rs:Rendition[])=>rs.sort((a,b)=>(utc(b.listedAt)??-Infinity)-(utc(a.listedAt)??-Infinity)||cmpText(a.id,b.id));
  const video=detail?videos.get(detail)??null:null;
  const work=detail?works.get(video?.workId??detail)??null:null;
  const related=work?sorted([...videos.values()].filter(v=>v.workId===work.id)):[];

  const update=useCallback((field:Partial<Query>,replace=false)=>{
    const current=parseRoute(location.hash).query;
    go({...current,...field,page:1},null,{replace,preserve:(!('q'in field)&&!('view'in field))});
  },[go]);
  const submit=useCallback((value:string)=>{
    try{parseTerms(value);setQueryIssue(null);update({q:value.trim()},true);}
    catch(e){setQueryIssue((e as Error).message);}
  },[update]);
  useEffect(()=>{setDraft(query.q);setQueryIssue(null);},[query.q]);
  useEffect(()=>{
    if(draft===query.q||usingIME)return;
    const n=window.setTimeout(()=>submit(draft),150);
    return ()=>clearTimeout(n);
  },[draft,query.q,usingIME,submit]);
  useEffect(()=>{
    const shortcuts=(e:KeyboardEvent)=>{
      if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!panel&&!detail&&!(e.target instanceof HTMLElement&&e.target.closest('input,textarea,select,[contenteditable]'))){e.preventDefault();input.current?.focus();}
    };
    addEventListener('keydown',shortcuts);return()=>removeEventListener('keydown',shortcuts);
  },[detail,panel]);
  useLayoutEffect(()=>{
    if(!result||detail||(position.current===null&&!jump.current))return;
    const id=requestAnimationFrame(()=>{
      if(jump.current){jump.current=false;section.current?.scrollIntoView({block:'start',behavior:'instant'});heading.current?.focus({preventScroll:true});}
      else if(position.current!==null) window.scrollTo({top:position.current,behavior:'instant'});
      position.current=null;
    });
    return()=>cancelAnimationFrame(id);
  },[detail,position,queryKey,result]);
  const show=(id:string)=>{setPanel(null);go(query,id,{preserve:true});};
  const page=(p:number)=>{if(p!==query.page){jump.current=true;go({...query,page:p},null);}};
  const reset=()=>{setDraft('');go({...emptyQuery(),view:query.view},null,{replace:false,preserve:true});};
  const clear=()=>update({tag:[],platform:[],variant:[],frame:[],shape:[],scope:'all',candidates:false});
  const filterCount=query.tag.length+query.platform.length+query.variant.length+query.frame.length+query.shape.length+Number(query.candidates)+Number(query.scope!=='all');
  const toggleTag=(id:string)=>{const next=flip(query.tag,id);if(next.length<=30)update({tag:next});};
  const quick=tags.filter(t=>t.scope==='source'&&['content','movement'].includes(t.facet)&&(result?.facets[t.id]??0)>0)
    .sort((a,b)=>(result?.facets[b.id]??0)-(result?.facets[a.id]??0)||cmpText(a.id,b.id)).slice(0,4);
  const defaultView=queryKey===routeHash(emptyQuery());
  const ribbon=(defaultView?result?.matches??[]:[]).map(m=>({m,v:m.videoId?videos.get(m.videoId):null})).filter(x=>x.v?.poster).slice(0,8);
  const totalCatalog=lib.full?(query.view==='works'?works.size:videos.size):defaultView?result?.total:undefined;
  const actualPage=result?.page??query.page;
  return <div className="app" data-mode={meta?.mode}>
    <a className="skip" href="#results" onClick={e=>{e.preventDefault();heading.current?.focus();}}>跳到视频列表</a>
    <aside className="rail" aria-label="快捷入口">
      <button className="mark icon-btn" type="button" aria-label="动作迁移库首页" onClick={()=>{setDraft('');go(emptyQuery(),null);}}><Icon name="logo" size={25}/></button>
      <button className="icon-btn rail-active" type="button" aria-label="浏览作品" onClick={()=>update({view:'works'})}><Icon name="wall"/></button>
      <button className="icon-btn" type="button" aria-label="标签目录" onClick={()=>setPanel('filters')}><Icon name="tag"/></button>
      <button className="icon-btn" type="button" aria-label="定位搜索框" onClick={()=>input.current?.focus()}><Icon name="search"/></button>
      <button className="icon-btn rail-tail" type="button" aria-label="关于目录" onClick={()=>setPanel('info')}><Icon name="info"/></button>
    </aside>
    <div className="surface">
      <header className="topbar">
        <div className="top-left"><span className="mobile-mark"><Icon name="logo" size={22}/></span><Switch value={query.view} label="目录视图" change={view=>update({view})}/><button type="button" className="top-tags soft-btn" onClick={()=>setPanel('filters')}><Icon name="tag" size={15}/> 标签</button></div>
        <div className="top-right"><button type="button" className="status-chip" onClick={()=>setPanel('info')}><i className="dot status-dot"/>{meta?.mode==='local'?'本机私有':meta?.mode==='example'?'示例数据':'静态目录'}</button>
          <button className="icon-btn themed" type="button" aria-label={theme==='dark'?'切换至浅色主题':'切换至深色主题'} onClick={toggle}><Icon name={theme==='dark'?'sun':'moon'} size={17}/></button></div>
      </header>
      <main>
        <section className="hero" aria-labelledby="hero-heading"><div className="hero-inner">
          <p className="eyebrow"><Icon name="star" size={13}/> 动作迁移库 <span aria-hidden="true">/</span> 灵感墙</p>
          <h1 id="hero-heading">从动作里，<strong>找灵感。</strong></h1>
          <p className="hero-copy">{totalCatalog===undefined?'在整片动作与生成版本之间快速查找。':<>浏览 <b>{totalCatalog}</b> {query.view==='works'?'条作品':'份成片'}，按动作、镜头与标签找到对应成片。</>}</p>
          <form className="query" role="search" onSubmit={e=>{e.preventDefault();if(!usingIME)submit(input.current?.value??draft);}}>
            <span className="query-icon"><Icon name="search" size={17}/></span>
            <input ref={input} value={draft} onChange={e=>setDraft(e.currentTarget.value)} onCompositionStart={()=>setUsingIME(true)} onCompositionEnd={e=>{setDraft(e.currentTarget.value);setUsingIME(false);}}
              aria-label="搜索全库" aria-invalid={!!queryIssue} aria-describedby={queryIssue?'query-error':undefined} placeholder="搜标题、说明、动作或标签" autoComplete="off" maxLength={240}/>
            {draft?<button type="button" className="clear-input icon-btn" aria-label="清空搜索" onClick={()=>{setDraft('');submit('');input.current?.focus();}}><Icon name="close" size={15}/></button>:<kbd className="shortcut" aria-hidden="true">/</kbd>}
            <button type="submit" className="search-btn" aria-label="执行搜索"><Icon name="up" size={17}/></button>
          </form>
          {queryIssue&&<p id="query-error" role="alert" className="query-error">{queryIssue}</p>}
          {ribbon.length>0&&<div className="ribbon" aria-label="首页缩略入口">{ribbon.map(({m,v})=><button type="button" key={m.id} aria-label={'预览：'+v!.title} onClick={()=>show(v!.id)}><Cover video={v??null} small/></button>)}<span aria-hidden="true"><Icon name="link" size={12}/></span></div>}
        </div></section>
        <section className="results" id="results" aria-labelledby="list-title" ref={section}>
          <div className="list-head"><div><h2 id="list-title" ref={heading} tabIndex={-1}>{query.q?'搜索结果':query.view==='works'?'作品灵感墙':'成片灵感墙'}</h2><span className="counts" role="status" aria-live="polite">{result?result.total+' 条'+(result.pages>1?' · '+result.page+' / '+result.pages+' 页':''):lib.issue?'目录暂不可用':lib.ready?'正在检索全库…':'正在准备全库索引…'}</span></div>
            <label className="list-sort"><Icon name="sort" size={16}/><span>排序</span><select aria-label="列表排序" value={query.sort} onChange={e=>update({sort:e.currentTarget.value as Query['sort']})}>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label></div>
          {route.issue&&<p className="notice" role="status">{route.issue}</p>}
          {filterCount>0&&<div className="selected-row" aria-label="已选筛选">
            {query.tag.map(key=>{const tag=wordbank.get(key);return <button type="button" className="selection" key={key} title={tag?scopeName[tag.scope]:key} onClick={()=>toggleTag(key)}>{tag?.zh??key}<Icon name="close" size={13}/></button>;})}
            {query.platform.map(x=><button type="button" className="selection" key={x} onClick={()=>update({platform:flip(query.platform,x)})}>{platformName[x]}<Icon name="close" size={13}/></button>)}
            {query.variant.map(x=><button type="button" className="selection" key={x} onClick={()=>update({variant:flip(query.variant,x)})}>{variantName[x]}<Icon name="close" size={13}/></button>)}
            {query.frame.map(x=><button type="button" className="selection" key={x} onClick={()=>update({frame:flip(query.frame,x)})}>{frameName[x]}<Icon name="close" size={13}/></button>)}
            {query.shape.map(x=><button type="button" className="selection" key={x} onClick={()=>update({shape:flip(query.shape,x)})}>{shapeName[x]}<Icon name="close" size={13}/></button>)}
            {query.scope!=='all'&&<button type="button" className="selection" onClick={()=>update({scope:'all'})}>{query.scope==='source'?'只搜原片标签':'只搜成片标签'}<Icon name="close" size={13}/></button>}
            {query.candidates&&<button type="button" className="selection" onClick={()=>update({candidates:false})}>含候选<Icon name="close" size={13}/></button>}
            <button type="button" className="text-btn" onClick={clear}>清除筛选</button>
          </div>}
          {lib.issue&&<div className="notice" role="alert">{lib.issue} <button className="soft-btn" type="button" onClick={lib.refresh}>刷新目录</button></div>}
          {query.sort==='hot'&&result&&!result.hotAvailable&&result.total>0&&<p className="notice">当前结果暂无可比较热度。 <button type="button" className="text-btn" onClick={()=>update({sort:'latest'})}>改按最新</button></p>}
          {!result&&!lib.issue&&<div className="loading-wall" aria-hidden="true">{[0,1,2,3,4].map(i=><span key={i}/>)}</div>}
          {result&&result.total===0&&<div className="empty"><Icon name={filterCount||query.q?'search':'wall'} size={28}/><h3>{filterCount||query.q?'没有符合条件的视频':'这个快照还没有视频'}</h3><p>{filterCount||query.q?'试试更短的词，或取消部分筛选。':'请在维护端生成并加载有效的目录。'}</p>{!!(filterCount||query.q)&&<button type="button" className="solid-btn" onClick={reset}>清除条件</button>}</div>}
          {!!result?.matches.length&&<Masonry key={queryKey}>{result.matches.map((m,i)=>{
            const w=works.get(m.workId);if(!w)return null;
            const eligible=m.matchingVideoIds.flatMap(id=>{const v=videos.get(id);return v?[v]:[];});
            const shown=eligible.find(v=>v.id===choice[m.id])??(m.videoId?videos.get(m.videoId)??null:null);
            return <Card key={m.id} match={m} work={w} video={shown} eligible={eligible} wordbank={wordbank} mode={query.view} eager={i<5} select={id=>setChoice(x=>({...x,[m.id]:id}))} view={()=>show(shown?.id??w.id)} toggleTag={toggleTag} active={query.tag}/>;
          })}</Masonry>}
          {!!result&&<Paging page={actualPage} pages={result.pages} go={page}/>}
          <footer className="foot">动作迁移库<span>·</span>{meta?.mode==='local'?'本机私有目录 · 请勿上传静态包':'虚构示例，不包含真实视频'}{meta&&<><span>·</span>快照 {date(meta.asOf)}</>}</footer>
        </section>
      </main>
      <div className="dock" aria-label="浮动目录工具条">
        <Switch value={query.view} label="快捷目录视图" change={view=>update({view})}/>
        <div className="dock-tags">{quick.map(t=><TagPill key={t.id} tag={t} selected={query.tag.includes(t.id)} onClick={()=>toggleTag(t.id)}/>)}</div>
        <label className="dock-sort"><Icon name="sort" size={15}/><select aria-label="快捷排序" value={query.sort} onChange={e=>update({sort:e.currentTarget.value as Query['sort']})}>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
        <button className="solid-btn dock-filter" type="button" onClick={()=>setPanel('filters')}><Icon name="filter" size={17}/><span>筛选</span>{filterCount>0&&<b>{filterCount}</b>}</button>
      </div>
    </div>
    {!detail&&panel==='filters'&&<FilterPanel query={query} tags={tags} ready={lib.ready} facets={result?.facets??{}} update={q=>update(q,true)} clear={()=>update({tag:[],variant:[],platform:[],shape:[],frame:[],candidates:false,scope:'all'},true)} close={()=>setPanel(null)}/>}
    {!detail&&panel==='info'&&<Panel title="关于此目录" onClose={()=>setPanel(null)}><div className="about">
      <p>{meta?.mode==='local'?'此构建只在本机显示私有成片。没有线上账户或外部搜索请求。':'当前是可公开检查界面与检索的虚构数据集，不含真实视频、原片链接或私有画像。'}</p>
      {meta&&<p>目录快照：<time dateTime={meta.asOf}>{date(meta.asOf)}</time>，{meta.version.slice(0,10)}。</p>}
      <p>综合排序：55% 新鲜度＋45% 平台互动热度。新鲜度每 14 天减半，热度不是本站播放量。缺失、过期或不可比的热度明确标注。</p>
      <p>观察标签只描述已有证据的范围。配置标签、原片与成片观察、候选标签均分别保存。</p>
      <button type="button" className="soft-btn" onClick={()=>{setPanel(null);lib.refresh();}}><Icon name="reset" size={15}/> 重新加载目录</button>
    </div></Panel>}
    {detail&&<DetailPanel id={detail} meta={meta} tags={tags} work={work} video={video} related={related} pending={!lib.full&&!lib.issue} select={id=>go(query,id,{replace:true,preserve:true})} close={close}/>}
  </div>;
}
const root=document.getElementById('root');
if(!root)throw new Error('Missing chart root');
createRoot(root).render(<App/>);
