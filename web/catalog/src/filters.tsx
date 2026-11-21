import {useState} from 'react';
import type {ReactNode} from 'react';
import {frameName, framings, platformName, platforms, scopeName, scopes, shapeName, shapes, variantName, variants} from './model.ts';
import type {Query, Tag} from './model.ts';
import {normalize} from './search.ts';
import {Icon, Panel} from './ui.tsx';

export const flip = <T,>(list:T[],value:T):T[]=>list.includes(value)?list.filter(t=>t!==value):[...list,value];
export function TagPill({tag,selected=false,candidate=false,count,showScope=false,onClick}:{tag:Tag;selected?:boolean;candidate?:boolean;count?:number;showScope?:boolean;onClick?:()=>void}){
  const name=tag.zh; const origin=tag.scope==='native'&&tag.facet!=='platform'?tag.facet:scopeName[tag.scope];
  const shortScope={native:'平台',source:'原片',rendition:'成片',configuration:'配置'}[tag.scope];
  const content=<><i className={'dot '+tag.scope}/>{showScope&&<small className="tag-origin">{shortScope}</small>}<span>{name}</span>{candidate&&<small>候选</small>}{count!==undefined&&<small>{count}</small>}</>;
  return onClick?<button type="button" className="tag-pill" aria-pressed={selected} aria-label={origin+'：'+name+(count===undefined?'':'，'+count+' 条')} title={origin+' · '+(tag.en||name)} onClick={onClick}>{content}</button>
    :<span className="tag-pill" title={origin+' · '+(tag.en||name)}>{content}</span>;
}
function Choices<T extends string>({title,options,values,names,onChange}:{title:string;options:readonly T[];values:T[];names:Record<T,string>;onChange:(v:T[])=>void}){
  return <fieldset className="choices"><legend>{title}</legend><div className="choices-row">{options.map(value=><button type="button" key={value} aria-pressed={values.includes(value)} className="choice" onClick={()=>onChange(flip(values,value))}>{names[value]}</button>)}</div></fieldset>;
}
function Group({title,children}:{title:string;children:ReactNode}){return <section className="tag-group"><h3>{title}</h3><div className="tag-group-items">{children}</div></section>}
export function FilterPanel({query,tags,facets,ready,update,clear,close}:{query:Query;tags:Tag[];facets:Record<string,number>;ready:boolean;update:(p:Partial<Query>)=>void;clear:()=>void;close:()=>void}){
  const [text,setText]=useState('');const needle=normalize(text);
  const matching=tags.filter(t=>!needle||[t.zh,t.en,t.id,...t.aliases].some(v=>normalize(v).includes(needle)));
  return <Panel title="筛选与标签" onClose={close}>
    <div className="filter-body">
      <p className="muted">标签需同时满足；同组的版本、平台、取景和画幅任选其一。成片条件必须命中同一份成片。</p>
      <Choices title="版本" options={variants} values={query.variant} names={variantName} onChange={variant=>update({variant})}/>
      <Choices title="来源平台" options={platforms} values={query.platform} names={platformName} onChange={platform=>update({platform})}/>
      <Choices title="取景" options={framings} values={query.frame} names={frameName} onChange={frame=>update({frame})}/>
      <Choices title="画幅" options={shapes} values={query.shape} names={shapeName} onChange={shape=>update({shape})}/>
      <fieldset className="choices"><legend>文本匹配的分析标签范围</legend><div className="choices-row">
        {([['all','不限'],['source','原片观察'],['rendition','成片观察']] as const).map(([value,name])=><button key={value} type="button" className="choice" aria-pressed={query.scope===value} onClick={()=>update({scope:value})}>{name}</button>)}
      </div><label className="candidates"><input type="checkbox" checked={query.candidates} onChange={e=>update({candidates:e.currentTarget.checked})}/>同时检索候选标签</label></fieldset>
      <label className="tag-search"><Icon name="search" size={16}/><input aria-label="查找标签" placeholder="按中文、英文或别名找标签" value={text} maxLength={120} onChange={e=>setText(e.currentTarget.value)}/></label>
      <p className="muted">数字是当前条件下、分页前的匹配条数。候选不是确认标签。</p>
      {!ready?<p className="muted" role="status">等待全库标签索引…</p>:!matching.length?<p className="muted">没有这个标签。</p>:scopes.map(scope=>{
        const group=matching.filter(t=>t.scope===scope);if(!group.length)return null;
        return <Group key={scope} title={scopeName[scope]}>{group.map(tag=><TagPill key={tag.id} tag={tag} selected={query.tag.includes(tag.id)} count={facets[tag.id]??0} onClick={()=>{
          const list=flip(query.tag,tag.id);if(list.length<=30)update({tag:list});
        }}/>)}</Group>;
      })}
      {query.tag.length>=30&&<p className="muted">已选 30 个标签，请先取消某项再添加。</p>}
    </div>
    <div className="panel-footer"><button className="soft-btn" type="button" onClick={clear}>清除筛选</button><button className="solid-btn" type="button" onClick={close}>查看结果</button></div>
  </Panel>;
}
