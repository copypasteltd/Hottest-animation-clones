import {useEffect,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import {frameName,platformName,shapeName,variantName,variants} from './model.ts';
import type {Detail,Fact,Meta,Rendition,Tag,Work} from './model.ts';
import {fetchDetail,resource} from './data.ts';
import {Cover,displayDuration,Icon,Panel} from './ui.tsx';
import {TagPill} from './filters.tsx';

function Player({video,path}:{video:Rendition;path:string}){
  const [state,setState]=useState<'idle'|'player'|'error'>('idle');
  const ref=useRef<HTMLVideoElement>(null);
  useEffect(()=>{
    if(state!=='player')return;
    const el=ref.current;
    return ()=>{el?.pause();el?.removeAttribute('src');el?.load();};
  },[state]);
  function open(){
    flushSync(()=>setState('player'));
    void ref.current?.play().catch(()=>{/* Native play controls remain available. */});
  }
  return <div className="player-frame" data-shape={video.shape}>
    {state==='player'?<video ref={ref} controls playsInline preload="none" aria-label={video.title} src={resource(path)} onError={()=>setState('error')}/>:
      <button className="poster-button" type="button" onClick={open} aria-label={state==='error'?'重试视频':'播放成片'}>
        <Cover key={video.id} video={video} eager/><span className="player-symbol"><Icon name="play" size={26}/></span>
        {state==='error'&&<span className="play-issue" role="status">视频未能播放，点击重试。</span>}
      </button>}
  </div>;
}
const timeCode=(ms:number)=>{const s=Math.floor(ms/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')+'.'+String(ms%1000).padStart(3,'0').replace(/0{1,2}$/,'');};
function Observations({title,items,wordbank}:{title:string;items:Fact[];wordbank:Map<string,Tag>}){
  return <section className="facts"><h3>{title}</h3>{!items.length?<p className="muted">没有已归档的观察。</p>:items.map((fact,i)=>{
    const tag=wordbank.get(fact.id);if(!tag)return null;
    const span=fact.interval?timeCode(fact.interval[0])+' 至 '+timeCode(fact.interval[1]):fact.times.map(timeCode).join('、');
    return <div key={fact.id+'-'+i} className="fact"><TagPill tag={tag} candidate={fact.state==='candidate'}/>
      {fact.state==='not_observed_in_samples'&&<small className="fact-status">抽样未见</small>}
      {span&&<small className="fact-times">{span}</small>}{fact.note&&<p>{fact.note}</p>}
    </div>;
  })}</section>;
}

export function DetailPanel({id,meta,tags,work,video,related,pending,select,close}:{id:string;meta:Meta|null;tags:Tag[];
  work:Work|null;video:Rendition|null;related:Rendition[];pending:boolean;select:(x:string)=>void;close:()=>void}){
  const [record,setRecord]=useState<{id:string;version:string;data:Detail}|null>(null);
  const [issue,setIssue]=useState<{id:string;version:string;message:string}|null>(null);
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    if(!meta||!work)return;
    const abort=new AbortController();
    fetchDetail(meta,id,tags,abort.signal).then(data=>{
      if(!abort.signal.aborted){setRecord({id,version:meta.version,data});setIssue(null);}
    },(e:unknown)=>{if(!abort.signal.aborted)setIssue({id,version:meta.version,message:e instanceof Error?e.message:'无法加载详情。'});});
    return ()=>abort.abort();
  },[id,meta,tags,work,retry]);
  const d=record?.id===id&&record.version===meta?.version?record.data:null;
  const error=issue?.id===id&&issue.version===meta?.version?issue.message:null;
  const names=new Map(tags.map(t=>[t.id,t]));
  const currentTitle=video?.title??work?.title??'视频详情';
  return <Panel title="视频详情" side onClose={close}>
    <div className="detail-body">
      {!work?<div className="detail-status" role="status">{pending?'正在定位目录条目…':'这一条目不在本次目录快照中。'}</div>:<>
        <p className="detail-kicker"><i className="dot native"/>{platformName[work.platform]}{video?' · '+variantName[video.variant]:' · 原片资料'}</p>
        <h2 className="detail-title">{currentTitle}</h2>
        {related.length>0&&<div className="detail-versions" aria-label="成片版本">
          {variants.map(v=>{const first=related.find(r=>r.variant===v);return first&&<button type="button" key={v} className="choice" aria-pressed={video?.variant===v} onClick={()=>select(first.id)}>{variantName[v]}</button>;})}
          {!video&&<span className="muted">选择版本查看成片</span>}
          {related.length>new Set(related.map(r=>r.variant)).size&&<label>全部尝试 <select aria-label="全部尝试" value={video?.id??''} onChange={e=>e.currentTarget.value&&select(e.currentTarget.value)}>
            {!video&&<option value="">请选择</option>}{related.map((r,i)=><option value={r.id} key={r.id}>{variantName[r.variant]} · {r.label} · {r.listedAt?.slice(0,10)??'时间未知'} · {i+1}</option>)}
          </select></label>}
        </div>}
        {video&&d?.video&&video.playable?<Player key={video.id} video={video} path={d.video}/>:video&&<div className="detail-placeholder" data-shape={video.shape}><Cover key={video.id} video={video} eager/></div>}
        {video&&<div className="detail-meta"><span>{displayDuration(video.durationMs)} · {shapeName[video.shape]}／{frameName[video.framing]}</span><span>{d?.acceptance??video.label}</span></div>}
        {video&&!video.playable&&<p className="notice">此条为虚构示例，没有可播放的真实视频。</p>}
        {!d&&(error?<div className="notice" role="alert">{error} <button type="button" className="soft-btn" onClick={()=>{setIssue(null);setRetry(n=>n+1);}}>重试详情</button></div>:<p className="muted" role="status">正在加载详情…</p>)}
        <section className="detail-notes"><h3>说明</h3>{work.description?<p>{work.description}</p>:<p className="muted">平台未提供说明，或未纳入当前目录。</p>}
          {d?.sourceUrl&&<a className="source-link" href={d.sourceUrl} target="_blank" rel="noopener noreferrer">查看原站作品 <Icon name="link" size={14}/></a>}
        </section>
        <div className="detail-tags">{[...work.tags,...(video?.tags??[])].filter(t=>t.id.startsWith('native:')||t.id.startsWith('configuration:')).map(t=>{
          const tag=names.get(t.id);return tag&&<TagPill key={t.id} tag={tag} showScope/>;
        })}</div>
        {d&&<><Observations title="原片观察" items={d.sourceFacts} wordbank={names}/>{video&&<Observations title="成片观察" items={d.renditionFacts} wordbank={names}/>}<details className="detail-limits"><summary>复核说明与证据限制</summary>{d.notes.map((n,i)=><p key={i}>{n}</p>)}</details></>}
      </>}
    </div>
  </Panel>;
}
