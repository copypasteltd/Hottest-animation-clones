import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import type {Rendition} from './model.ts';
import {resource} from './data.ts';

const paths = {
  logo:'M3 17.5 9.2 6.1h4.2L7 17.5H3Zm8 0 6.1-11.4h3.9l-6.1 11.4H11ZM8 15l5.5-1.2 3 1.2',
  wall:'M4 4h6v7H4zm10 0h6v4h-6zM4 15h6v5H4zm10-3h6v8h-6z',
  tag:'M20.5 11.5 12 20l-8-8V4h8l8.5 7.5ZM8 8h.01',
  search:'m21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  sun:'M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  moon:'M20.9 13.3A9.1 9.1 0 1 1 10.7 3.1a7 7 0 0 0 10.2 10.2Z',
  info:'M12 11v5m0-8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  filter:'M4 6h16M7 12h10m-7 6h4',
  up:'M12 19V5m-6 6 6-6 6 6',
  right:'m9 6 6 6-6 6',left:'m15 6-6 6 6 6',
  close:'m6 6 12 12M18 6 6 18',
  play:'m9 6 11 6-11 6V6Z',
  video:'M3 6h13v12H3zM16 10l5-3v10l-5-3',
  link:'M13 4h7v7m0-7-9 9m7-1v8H4V6h8',
  sort:'M4 6h12M4 12h8m-8 6h4m9-5v7m-3-3 3 3 3-3',
  star:'M12 3c.8 5.2 3.8 8.2 9 9-5.2.8-8.2 3.8-9 9-.8-5.2-3.8-8.2-9-9 5.2-.8 8.2-3.8 9-9Z',
  reset:'M3 11a9 9 0 1 1 2.5 6M3 4v7h7',
} as const;
export function Icon({name,size=18}:{name:keyof typeof paths;size?:number}){
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]}/></svg>;
}
export function Panel({title,children,onClose,side=false}:{title:string;children:ReactNode;onClose:()=>void;side?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const focus=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const el=ref.current!;
    el.showModal();
    const scroll=document.body.style.overflow;document.body.style.overflow='hidden';
    return ()=>{document.body.style.overflow=scroll;if(el.open)el.close();focus?.focus({preventScroll:true});};
  },[]);
  return <dialog ref={ref} className={'panel '+(side?'side':'center')} aria-label={title} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target!==e.currentTarget)return;const b=e.currentTarget.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)onClose();}}>
    <div className="panel-head"><h2>{title}</h2><button className="icon-btn" aria-label="关闭" onClick={onClose}><Icon name="close"/></button></div>{children}
  </dialog>;
}
export function displayDuration(ms:number){const total=Math.max(1,Math.round(ms/1000));return String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0');}
export function Cover({video,eager=false,small=false}:{video:Rendition|null;eager?:boolean;small?:boolean}){
  const [bad,setBad]=useState(false);
  const p=video?.poster;
  const aspect=p ? p.width+'/'+p.height : video?.shape==='portrait' ? '9/16' : '16/9';
  return <span className="art" style={{aspectRatio:small?'1/1':aspect}}>
    {p&&!bad?<img src={resource(p.path)} width={p.width} height={p.height} alt="" loading={eager?'eager':'lazy'} fetchPriority={eager?'high':'auto'} decoding="async" onError={()=>setBad(true)}/>:<span className="no-art"><Icon name="video" size={small?13:24}/>{!small&&<span>暂无封面</span>}</span>}
  </span>;
}
export function Masonry({children}:{children:ReactNode}){
  const ref=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const host=ref.current!;
    const elements=Array.from(host.children) as HTMLElement[];
    if(!elements.length || typeof ResizeObserver==='undefined')return;
    let raf=0, lastWidth=0;
    const calculate=()=>{
      const width=host.clientWidth; if(!width)return;
      const capacity=width>=1280?5:width>=1040?4:width>=760?3:width>=360?2:1;
      const columns=Math.min(capacity,elements.length);
      const gap=columns<=2?12:16;
      const fit=(width-gap*(columns-1))/columns;
      const size=columns<capacity?Math.min(310,fit):fit;
      const inset=(width-size*columns-gap*(columns-1))/2;
      if(lastWidth!==width){for(const item of elements)item.style.width=size+'px';lastWidth=width;}
      const heights=new Array<number>(columns).fill(0);
      for(const item of elements){
        const col=heights.indexOf(Math.min(...heights));
        item.style.left=(inset+col*(size+gap))+'px';item.style.top=heights[col]+'px';
        heights[col]+=item.offsetHeight+gap;
      }
      host.style.height=Math.max(0,Math.max(...heights)-gap)+'px';host.dataset.positioned='true';
    };
    const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(calculate);};
    calculate();
    const observer=new ResizeObserver(schedule);
    observer.observe(host);for(const item of elements)observer.observe(item);
    return ()=>{observer.disconnect();cancelAnimationFrame(raf);};
  },[children]);
  return <div className="wall" ref={ref}>{children}</div>;
}
