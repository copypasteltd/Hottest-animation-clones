import {createHash} from 'node:crypto';
import {lstat, readFile, readdir, realpath} from 'node:fs/promises';
import {join, relative, resolve, isAbsolute} from 'node:path';
import {spawnSync} from 'node:child_process';
import {heatScores, listedTime} from '../src/ranking.ts';
import {cmpText, utc} from '../src/model.ts';
import {sourceLink} from '../src/validate.ts';

const hash = s => createHash('sha256').update(s).digest('hex');
const keyOf = (prefix,object) => prefix+'-'+hash(JSON.stringify(object)).slice(0,24);
const allowedFolder=/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const hidden = s => !allowedFolder.test(s)||s.endsWith('.');
const parse = async path => JSON.parse(await readFile(path,'utf8'));
const time = v => typeof v==='string'&&/(?:Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v)) ? new Date(v).toISOString() : null;
const recorded = (v,now) => listedTime(now,time(v))===null?null:time(v);
const earliest = (a,b) => a&&b ? (a<b?a:b) : a||b;
const value=(fields,key)=>fields[key]?.state==='present'?fields[key].value:null;
const count=(f,key)=>Number.isSafeInteger(value(f,key))&&value(f,key)>=0?value(f,key):null;
const aliases={ 'content.gesture_dance':['手指舞','gesture dance'], 'content.high_energy_dance':['热舞','高能舞蹈','high-energy dance'],
  'movement.heart_gesture':['比心','heart gesture'], 'movement.crossed_feet':['交叉步','交错步','cross step'],
  'movement.separated_feet':['分脚','并脚'], 'camera.orbit':['绕拍','orbit','环绕'] };

async function inside(root, rel, directory=false) {
  const pieces=rel.split('/');
  if (pieces.some(hidden)) throw new Error('Invalid local artifact path');
  let path=root;
  for(const piece of pieces){
    path=join(path,piece);
    if((await lstat(path)).isSymbolicLink())throw new Error('Local artifact link is not allowed');
  }
  const resolved=await realpath(path);
  if(relative(root,resolved).split(/[\\/]/).includes('..')||isAbsolute(relative(root,resolved))||resolve(path)!==resolved)throw new Error('Local artifact alias is not allowed');
  const stat=await lstat(resolved);
  if(directory?!stat.isDirectory():!stat.isFile())throw new Error('Local artifact has the wrong type');
  return resolved;
}
async function profiles(root) {
  const dir=await inside(root,'runs',true);
  const list=[];
  for (const b of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>cmpText(a.name,b.name))) {
    if(!b.isDirectory()||hidden(b.name))continue;
    const batch=await inside(root,'runs/'+b.name,true);
    for (const w of (await readdir(batch,{withFileTypes:true})).sort((a,b)=>cmpText(a.name,b.name))) {
      if(!w.isDirectory()||hidden(w.name))continue;
      const name='runs/'+b.name+'/'+w.name+'/motion-profile-v1.json';
      try {list.push(await inside(root,name));} catch(e) {if(e.code!=='ENOENT')throw e;}
      if(list.length>150)throw new Error('Local build supports at most 150 profiles per release.');
    }
  }
  if(!list.length)throw new Error('There are no local motion-profile-v1.json records to load.');
  return list;
}
function facts(rows,scope,define) {
  return rows.map(l=>({id:define(scope,l.tag_id),state:l.state,note:l.note,
    times:l.extent.kind==='sample_points'?l.extent.times_ms:[],interval:l.extent.kind==='estimated_interval'?[l.extent.start_ms,l.extent.end_ms]:null}));
}
function refs(rows) {
  const ids=new Map();
  for(const r of rows)if(r.state==='observed'||r.state==='candidate'&&ids.get(r.id)!=='observed')ids.set(r.id,r.state);
  return [...ids].map(([id,state])=>({id,state}));
}
function shape(w,h,r) {const x=Math.abs(r)%180===90?h:w,y=Math.abs(r)%180===90?w:h;return x===y?'square':x>y?'landscape':'portrait';}

export async function localData(root, asOf, copyMedia, cover) {
  const inputs=await profiles(root), now=utc(asOf);
  // Reuse the project validator. Do not print the private records on subprocess failure.
  for(let i=0;i<inputs.length;i+=20){
    const r=spawnSync('python',['-B','scripts/check_motion_profiles.py','--verify-assets',...inputs.slice(i,i+20)],{cwd:root,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:1048576});
    if(r.status!==0||r.error)throw new Error('Local motion profiles or evidence did not validate. Run the project profile checker before building.');
    if(!JSON.parse(r.stdout).every(v=>v.status==='passed'&&v.kind==='profile'))throw new Error('Local verification did not return a real profile.');
  }
  const vocab=await parse(await inside(root,'docs/schemas/motion-tags.v1.json'));
  const allTerms=new Map(vocab.tags.map(t=>[t.id,t]));
  const tags=new Map();
  function define(scope,code){
    const id=scope+':'+code;
    if(!tags.has(id)){
      const t=allTerms.get(code);
      if(!t)throw new Error('Local taxonomy version was not implemented');
      tags.set(id,{id,scope,zh:t.zh,en:t.en,aliases:aliases[code]??[],facet:t.facet});
    }
    return id;
  }
  const works=new Map(),renditions=new Map(), details=Object.create(null), downloads=new Map();
  for(const input of inputs){
    const p=await parse(input), s=p.source, si=s.identity, sHash=s.media.asset.sha256;
    if(p.taxonomy_version!==vocab.taxonomy_version)throw new Error('Inconsistent local taxonomy');
    const publicKey=keyOf('work',[si.platform,si.work_id,si.selection_kind,si.selected_part,si.platform_media_id,sHash]);
    const f=s.platform_fields, title=value(f,'title')??'未命名作品', description=value(f,'description')??'';
    const sourceFacts=facts(s.observations.labels,'source',define);
    const native=Object.entries({native_tags:'平台原生标签',platform_hashtags:'平台话题',text_hashtags:'文案话题'}).flatMap(([type,facet])=>
      (value(f,type)??[]).map(text=>{
        const id='native:'+si.platform+'-'+type+'-'+hash(text).slice(0,24);
        if(!tags.has(id))tags.set(id,{id,scope:'native',zh:text,en:'',aliases:[],facet});
        return {id,state:'observed'};
      }));
    const row={id:publicKey,title,description,code:si.work_id,platform:si.platform,listedAt:recorded(s.capture.captured_at,now),tags:refs([...native,...sourceFacts])};
    if(works.has(publicKey)){
      const prior=works.get(publicKey);
      row.listedAt=earliest(prior.listedAt,row.listedAt);
      row.tags=refs([...prior.tags,...row.tags]);
    }
    works.set(publicKey,row);
    if(!downloads.has(publicKey))downloads.set(publicKey,{id:publicKey,platform:si.platform,samples:[]});
    const at=time(s.capture.captured_at);
    if(at){
      const sample={at,views:count(f,'view_count'),likes:count(f,'like_count'),comments:count(f,'comment_count'),reposts:count(f,'repost_count')};
      const existing=downloads.get(publicKey).samples.find(v=>v.at===sample.at);
      if(existing&&JSON.stringify(existing)!==JSON.stringify(sample))throw new Error('Conflicting counters for the same source snapshot');
      if(!existing)downloads.get(publicKey).samples.push(sample);
    }
    const sourceUrl=sourceLink(si.work_url)?si.work_url:null;
    details[publicKey]={id:publicKey,sourceUrl,video:null,sourceFacts,renditionFacts:[],acceptance:'原片资料',notes:s.observations.limitations};
    for(const r of p.renditions){
      const media=r.media, config=r.configuration;
      const id=keyOf('video',[publicKey,p.key.run_id,r.variant,r.attempt_id,media.asset.sha256]);
      if(renditions.has(id))continue;
      const contents=facts(r.observations.labels,'rendition',define);
      const configTag='configuration:scene.s02';
      if(!tags.has(configTag))tags.set(configTag,{id:configTag,scope:'configuration',zh:'S02 白场',en:'S02 white grid',aliases:[],facet:'scene'});
      const configTags=config.scene_id==='scene-s02-white-grid'?[{id:configTag,state:'observed'}]:[];
      const notesByKey={motion:'动作对照',footwork:'脚步对照',camera:'运镜对照',scene:'场景对照',audio:'音轨对照'};
      const notes=[...Object.keys(notesByKey).map(k=>notesByKey[k]+'：'+r.comparison[k].note),...r.observations.limitations];
      if(!media.asset.path.startsWith('outputs/')||!media.asset.path.endsWith('.mp4'))throw new Error('Only validated final MP4s can be copied');
      const original=await inside(root,media.asset.path);
      const video='media/'+id+'.mp4';
      await copyMedia(original,video,media.asset);
      const poster=await cover(original,'covers/'+id+'.webp',media.duration_ms);
      const marks={user_accepted_sample:'此样片已验收',pending_user_review:'待用户复核',not_recorded:'未记录验收'};
      const display=title+' · '+(r.variant==='SA02'?'动漫':'写实');
      renditions.set(id,{id,workId:publicKey,title:display,description:'',variant:r.variant,framing:config.framing,
        shape:shape(media.video.width,media.video.height,media.video.rotation_deg),durationMs:media.duration_ms,listedAt:recorded(r.retrieved_at,now),
        label:marks[r.acceptance.status],poster,playable:true,tags:refs([...contents,...configTags])});
      details[id]={id,sourceUrl,video,sourceFacts,renditionFacts:contents,acceptance:marks[r.acceptance.status],notes};
    }
  }
  const hot=heatScores(asOf,[...downloads.values()]);
  return {asOf,tags:[...tags.values()],works:[...works.values()].map(w=>({...w,...hot.get(w.id)})),renditions:[...renditions.values()],details};
}
