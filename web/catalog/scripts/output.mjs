import {createHash} from 'node:crypto';
import {lstat,readdir,readFile,realpath} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {emptyQuery} from '../src/model.ts';
import {SearchIndex} from '../src/search.ts';
import {safeRelative,unpack,validateCatalog,validateDetail,validateHome,validateMeta,validateTags} from '../src/validate.ts';

const json=payload=>JSON.parse(payload.toString('utf8'));
const sha=payload=>createHash('sha256').update(payload).digest('hex');
const reject=message=>{throw new Error(message);};
export const marker='catalog-build.json';
export function layout(app,kind){
  if(!['root','pages','local'].includes(kind))reject('Unknown catalog target');
  const root=resolve(app,'..','..'),mode=kind==='local'?'local':'example';
  const destination=kind==='local'?join(root,'tmp','motion-catalog-v1','local'):join(app,kind==='pages'?'dist-pages':'dist');
  return {root,mode,destination,base:kind==='pages'?'/Hottest-animation-clones/':'/'};
}
export async function assertOwned(dir,target,optional=false){
  let st;
  try {st=await lstat(dir);} catch(error){if(optional&&error.code==='ENOENT')return false;throw error;}
  if(!st.isDirectory()||st.isSymbolicLink()||await realpath(dir)!==dir)reject('Existing output is not an owned directory');
  const p=join(dir,marker), m=await lstat(p);
  if(!m.isFile()||m.isSymbolicLink()||m.size>4096)reject('Not a catalog output marker');
  const mark=json(await readFile(p));
  if(mark.owner!=='motion-catalog-build/1'||mark.target!==target||mark.mode!==(target==='local'?'local':'example')||!/^[a-f0-9]{24}$/.test(mark.version))reject('Existing output belongs to a different build');
  return mark;
}
async function files(dir,prefix=''){
  const found=[];
  for(const e of await readdir(join(dir,prefix),{withFileTypes:true})){
    const name=prefix?prefix+'/'+e.name:e.name;
    if(e.isDirectory()&&!e.isSymbolicLink())found.push(...await files(dir,name));
    else if(e.isFile()&&!e.isSymbolicLink())found.push(name);
    else reject('Output contains a link or nonregular file');
  }
  return found;
}
export async function auditOutput(dir,target,{includePaths=false}={}){
  const own=await assertOwned(dir,target);
  const entries=await files(dir);
  const required=new Set(['index.html','favicon.svg','.nojekyll',marker,'data/catalog-meta.json']);
  const meta=validateMeta(json(await readFile(join(dir,'data/catalog-meta.json'))));
  if(meta.version!==own.version||meta.mode!==own.mode)reject('Mode or version does not match output marker');
  const block=async ref=>{
    if(!safeRelative(ref.path))reject('Unsafe bundle name');
    required.add(ref.path);
    const body=await readFile(join(dir,ref.path));
    if(sha(body)!==ref.sha256)reject('Static bundle hash mismatch');
    return unpack(json(body),meta.version);
  };
  const tags=validateTags(await block(meta.tags)),catalog=validateCatalog(await block(meta.catalog),tags,meta);
  const home=validateHome(await block(meta.home),meta);
  const exact=new SearchIndex(catalog,tags,meta.asOf).run(emptyQuery());
  if(JSON.stringify(home.result)!==JSON.stringify({...exact,facets:{}}))reject('Home selection does not match the full search index');
  const homeWorks=new Set(exact.matches.map(m=>m.workId));
  const shown=new Set(exact.matches.map(m=>m.videoId));
  const projection={works:catalog.works.filter(w=>homeWorks.has(w.id)),renditions:catalog.renditions.filter(v=>shown.has(v.id))};
  const tagged=new Set([...projection.works,...projection.renditions].flatMap(w=>w.tags.map(t=>t.id)));
  if(JSON.stringify(home.catalog)!==JSON.stringify(projection)||JSON.stringify(home.tags)!==JSON.stringify(tags.filter(t=>tagged.has(t.id))))
    reject('Home data is not an exact projection of the full catalog');
  const videos=new Map(catalog.renditions.map(v=>[v.id,v]));
  let playable=0;
  for(const [id,ref] of Object.entries(meta.details)){
    const detail=validateDetail(await block(ref),id,meta,tags), video=videos.get(id);
    if(video&&video.playable!==Boolean(detail.video))reject('Playback availability contradicts the detail');
    if(video?.poster)required.add(video.poster.path);
    if(detail.video){playable++;required.add(detail.video);}
  }
  if(!entries.some(p=>/^assets\/[a-zA-Z0-9_-]+\.js$/.test(p))||!entries.some(p=>/^assets\/[a-zA-Z0-9_-]+\.css$/.test(p)))reject('Missing compiled frontend assets');
  const observed=new Set(entries);
  for(const name of required)if(!observed.has(name))reject('Missing referenced static file: '+name);
  let countBytes=0;
  for(const name of entries){
    if(!required.has(name)&&!/^assets\/[a-zA-Z0-9_-]+\.(js|css)$/.test(name))reject('Unexpected static output: '+name);
    countBytes+=(await lstat(join(dir,name))).size;
    if(meta.mode==='example'&&/\.(?:json|html|js|svg|css)$/.test(name)) {
      const body=await readFile(join(dir,name),'utf8');
      if(/\bBV[0-9A-Za-z]{10}\b|motion-video-profile\/1\.0|source-media\.info\.json|(?:runs|outputs)\/bilibili-|(?:[0-9]{1,3}\.){3}[0-9]{1,3}:8188/i.test(body))reject('Private source marker in public output: '+name);
    }
  }
  if(meta.mode==='example'&&(playable||entries.some(p=>p.startsWith('media/'))))reject('Example output must be media-free');
  return {works:catalog.works.length,renditions:catalog.renditions.length,playable,files:entries.length,bytes:countBytes,
    ...(includePaths?{paths:entries}:{})};
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const app=await realpath(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
  const target=process.argv[2]??'root';
  const {destination}=layout(app,target);
  console.log(JSON.stringify(await auditOutput(destination,target)));
}
