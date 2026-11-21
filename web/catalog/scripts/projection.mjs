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

const entry = (kind,text,candidate=false) => ({kind,text,candidate});
const identityKey = (batch,item,variant,attempt) => JSON.stringify([batch,item,variant,attempt]);
function foundFields(fields,mapping,kind) {
  return Object.entries(mapping).flatMap(([key,label])=>{
    const v=value(fields,key);
    return v===null?[]:[entry(kind,label+'：'+(Array.isArray(v)?v.join('、'):v))];
  });
}
function mediaFields(media) {
  const {video,audio,duration_ms}=media;
  const dimensions=video.width+'×'+video.height;
  const [n,d]=video.avg_frame_rate.split('/').map(Number);
  const fps=d>0&&n>0?(n/d).toFixed(3).replace(/\.?0+$/,'')+' fps':'';
  return [entry('media','分辨率 '+dimensions+' '+video.width+'x'+video.height+'；时长 '+(duration_ms/1000).toFixed(3)+' 秒；'+fps+'；视频 '+video.codec+(audio?'；音轨 '+audio.codec+' '+audio.sample_rate_hz+' Hz '+audio.channels+' 声道':''))];
}
const observedNotes = facts => facts.filter(f=>f.state!=='not_observed_in_samples'&&f.note.trim()).map(f=>entry('observation',f.note,f.state==='candidate'));
const limitations = notes => notes.filter(x=>x.trim()).map(n=>entry('limitation',n));
const reviewStates = {user_accepted_sample:'approved',pending_user_review:'pending',not_recorded:'unrecorded'};
const reviewLabels = {approved:'已定稿',pending:'待用户复核',unrecorded:'未记录验收'};
const compareTitles={motion:'动作对照',footwork:'脚步对照',camera:'运镜对照',scene:'场景对照',audio:'音轨对照'};

async function approvalInventory(root) {
  const approvals=[];
  let followed=0;
  async function dirs(path) {
    const disk=await inside(root,path,true);
    const values=(await readdir(disk,{withFileTypes:true})).filter(d=>d.isDirectory()&&!hidden(d.name)).map(d=>d.name).sort(cmpText);
    followed+=values.length;
    if(followed>12000)throw new Error('Too many local archive folders to verify approval coverage.');
    return values;
  }
  async function one(path,batch,item,variant,attempt) {
    let file;
    try {file=await inside(root,path);} catch(e) {if(e.code==='ENOENT')return;throw e;}
    const doc=await parse(file);
    if(doc.status!=='user_accepted_sample')return;
    const b=doc.baseline;
    if(!b||!allowedFolder.test(b.item_id??'')||!['SA02','BM01'].includes(b.variant)||!/^attempt-\d+$/.test(b.attempt_id??'')||
       !/^[a-f0-9]{64}$/.test(b.mp4_sha256??'')||typeof b.prompt_id!=='string'||!b.prompt_id||
       (b.run_id!==undefined&&b.run_id!==batch)||(item!==undefined&&(b.item_id!==item||b.variant!==variant||b.attempt_id!==attempt)))
      throw new Error('A local final-approval record has an invalid identity binding: '+path);
    approvals.push({key:identityKey(batch,b.item_id,b.variant,b.attempt_id),sha:b.mp4_sha256,receipt:b.prompt_id,path});
  }
  for(const batch of await dirs('runs')) {
    const dir='runs/'+batch;
    await one(dir+'/s02-contour-approved-recipe.json',batch);
    for(const item of await dirs(dir)) {
      for(const variant of await dirs(dir+'/'+item)) {
        if(variant!=='SA02'&&variant!=='BM01')continue;
        for(const attempt of await dirs(dir+'/'+item+'/'+variant)){
          if(!/^attempt-\d+$/.test(attempt))continue;
          await one(dir+'/'+item+'/'+variant+'/'+attempt+'/content-review.json',batch,item,variant,attempt);
        }
      }
    }
  }
  return approvals;
}
export function assertApprovalCoverage(approvals,indexed) {
  for(const row of approvals) {
    const matches=indexed.get(row.key);
    if(!matches||matches.sha!==row.sha||matches.receipt!==row.receipt||matches.status!=='approved')
      throw new Error('A final approval is not bound to a verified indexed rendition: '+row.path+'; add or refresh its motion profile.');
  }
}

export async function localData(root, asOf, copyMedia, cover) {
  const inputs=await profiles(root), now=utc(asOf);
  // Reuse the project validator. Do not print the private records on subprocess failure.
  for(let i=0;i<inputs.length;i+=20){
    const r=spawnSync('python',['-B','scripts/check_motion_profiles.py','--verify-assets',...inputs.slice(i,i+20)],{cwd:root,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:1048576});
    if(r.status!==0||r.error)throw new Error('Local motion profiles or evidence did not validate. Run the project profile checker before building.');
    if(!JSON.parse(r.stdout).every(v=>v.status==='passed'&&v.kind==='profile'))throw new Error('Local verification did not return a real profile.');
  }
  const all=await Promise.all(inputs.map(parse));
  const indexed=new Map();
  for(const p of all)for(const r of p.renditions) {
    const key=identityKey(p.key.run_id,p.key.item_id,r.variant,r.attempt_id);
    const binding={sha:r.media.asset.sha256,receipt:r.receipt_id,status:reviewStates[r.acceptance.status]};
    if(indexed.has(key)&&JSON.stringify(indexed.get(key))!==JSON.stringify(binding))throw new Error('Conflicting local review bindings');
    indexed.set(key,binding);
  }
  assertApprovalCoverage(await approvalInventory(root),indexed);
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
  for(const p of all){
    const s=p.source, si=s.identity, sHash=s.media.asset.sha256;
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
    const profileDetails=[...foundFields(f,{creator_name:'作者',creator_id:'平台作者编号'},'author'),
      ...foundFields(f,{published_at:'发布时间',upload_date:'上传日期',categories:'平台分类',language:'语言',track:'曲目',artist:'音乐作者',subtitle_languages:'可用字幕语言'},'platform'),
      ...mediaFields(s.media),entry('route','原片路线 '+({half_body:'半身',full_body:'全身'}[s.routing.framing]??'未知取景')+'；'+({standing:'站立',seated:'坐姿'}[s.routing.posture]??'姿态未确认')+
        (s.observations.performer_count===null?'':'；表演人数 '+s.observations.performer_count)),...observedNotes(sourceFacts),...limitations(s.observations.limitations)];
    const row={id:publicKey,title,description,code:si.work_id,platform:si.platform,listedAt:recorded(s.capture.captured_at,now),tags:refs([...native,...sourceFacts]),detailsIndex:profileDetails};
    if(works.has(publicKey)){
      const prior=works.get(publicKey);
      row.listedAt=earliest(prior.listedAt,row.listedAt);
      row.tags=refs([...prior.tags,...row.tags]);
      row.detailsIndex=[...new Map([...prior.detailsIndex,...profileDetails].map(r=>[JSON.stringify(r),r])).values()];
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
      const comparisons=Object.entries(compareTitles).filter(([k])=>r.comparison[k].note.trim()).map(([k,title])=>title+'：'+r.comparison[k].note);
      const notes=[...comparisons,...r.observations.limitations];
      const reviewStatus=reviewStates[r.acceptance.status];
      const label=reviewLabels[reviewStatus];
      const audio={source:'保留原音',muted:'静音',generated:'生成音轨',unknown:'音轨处理未知'}[config.audio_treatment];
      const detailsIndex=[...mediaFields(media),entry('configuration','场景配置 '+(config.scene_id==='scene-s02-white-grid'?'S02 白场':config.scene_id)+'；'+audio),
        entry('review',label+'；'+r.attempt_id),...observedNotes(contents),...comparisons.map(n=>entry('comparison',n)),...limitations(r.observations.limitations)];
      if(!media.asset.path.startsWith('outputs/')||!media.asset.path.endsWith('.mp4'))throw new Error('Only validated final MP4s can be copied');
      const original=await inside(root,media.asset.path);
      const video='media/'+id+'.mp4';
      await copyMedia(original,video,media.asset);
      const poster=await cover(original,'covers/'+id+'.webp',media.duration_ms);
      const display=title+' · '+(r.variant==='SA02'?'动漫':'写实');
      renditions.set(id,{id,workId:publicKey,title:display,description:'',variant:r.variant,framing:config.framing,
        shape:shape(media.video.width,media.video.height,media.video.rotation_deg),durationMs:media.duration_ms,listedAt:recorded(r.retrieved_at,now),
        label,poster,playable:true,tags:refs([...contents,...configTags]),reviewStatus,detailsIndex});
      details[id]={id,sourceUrl,video,sourceFacts,renditionFacts:contents,acceptance:label,notes};
    }
  }
  const hot=heatScores(asOf,[...downloads.values()]);
  return {asOf,tags:[...tags.values()],works:[...works.values()].map(w=>({...w,...hot.get(w.id)})),renditions:[...renditions.values()],details};
}
