import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {copyFile, mkdir, mkdtemp, realpath, rename, rm, writeFile, lstat} from 'node:fs/promises';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {build as viteBuild} from 'vite';
import {SCHEMA,TAXONOMY,RANKING,emptyQuery,utc} from '../src/model.ts';
import {SearchIndex} from '../src/search.ts';
import {safeRelative,validateCatalog,validateDetail,validateHome,validateMeta,validateTags} from '../src/validate.ts';
import {exampleData} from './examples.mjs';
import {assertOwned, layout, auditOutput} from './output.mjs';

const app=await realpath(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
const args=process.argv.slice(2);
if (args.length!==2||args[0]!=='--target') throw new Error('Use --target root|pages|local.');
const kind=args[1];
const {destination,base,mode,root}=layout(app,kind);
const parent=dirname(destination);
await mkdir(parent,{recursive:true});
if (await realpath(parent)!==parent) throw new Error('Build parent must be a canonical directory.');
const stage=await mkdtemp(join(parent,'.catalog-build-'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const encode=o=>JSON.stringify(o)+'\n';
async function save(rel,data){
  if(!safeRelative(rel))throw new Error('Unsafe generated artifact name');
  const file=join(stage,rel);
  await mkdir(dirname(file),{recursive:true});
  await writeFile(file,data,{flag:'wx'});
}
async function digestFile(path){const h=createHash('sha256');for await(const chunk of createReadStream(path))h.update(chunk);return h.digest('hex');}
async function copyMedia(source,rel,identity){
  if(mode!=='local'||!/^media\/video-[a-z0-9-]+\.mp4$/.test(rel)) throw new Error('Video output is local-only');
  const dest=join(stage,rel); await mkdir(dirname(dest),{recursive:true});
  await copyFile(source,dest,1);
  const st=await lstat(dest);
  if(!st.isFile()||st.size!==identity.bytes||await digestFile(dest)!==identity.sha256)throw new Error('Local video bytes did not match the validated receipt');
}
async function cover(source,rel,duration){
  if(mode!=='local'||!/^covers\/video-[a-z0-9-]+\.webp$/.test(rel)) throw new Error('Invalid local cover path');
  const dest=join(stage,rel); await mkdir(dirname(dest),{recursive:true});
  const t=Math.min(1.1, duration/4000).toFixed(3);
  const command=spawnSync('ffmpeg',['-nostdin','-v','error','-n','-threads','2','-ss',t,'-i',source,
    '-map','0:v:0','-an','-frames:v','1','-vf','scale=480:480:force_original_aspect_ratio=decrease:force_divisible_by=2',
    '-c:v','libwebp','-quality','82','-update','1',dest],{encoding:'utf8',windowsHide:true,timeout:30000});
  if(command.status!==0||command.error)throw new Error('FFmpeg could not prepare a local preview image.');
  const probe=spawnSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','json',dest],{encoding:'utf8',windowsHide:true,timeout:12000});
  if(probe.status!==0||probe.error)throw new Error('Could not verify local cover dimensions.');
  const row=JSON.parse(probe.stdout).streams[0];
  return {path:rel,width:row.width,height:row.height};
}
let backup=null;
let commitDone=false;
try {
  await viteBuild({root:app,configFile:false,envDir:false,envPrefix:'CATALOG_INTERNAL_NO_VARS_',base,publicDir:false,
    build:{outDir:stage,emptyOutDir:true,sourcemap:false,assetsInlineLimit:0,target:'es2023'},worker:{format:'es'},logLevel:'warn'});
  // Public targets never import the real profile projector or read the private tree.
  const data=mode==='local'
    ? await (await import('./projection.mjs')).localData(root,new Date().toISOString(),copyMedia,cover)
    : await exampleData(save);
  if(utc(data.asOf)===null)throw new Error('Invalid catalogue timestamp');
  const catalog={works:data.works,renditions:data.renditions};
  const tags=validateTags(data.tags);
  const result=new SearchIndex(catalog,tags,data.asOf).run(emptyQuery());
  const keys=new Set(result.matches.map(m=>m.workId));
  const hometown={works:catalog.works.filter(w=>keys.has(w.id)),renditions:catalog.renditions.filter(r=>keys.has(r.workId))};
  const homeTags=new Set([...hometown.works,...hometown.renditions].flatMap(w=>w.tags.map(t=>t.id)));
  const home={catalog:hometown,tags:tags.filter(t=>homeTags.has(t.id)),result:{...result,facets:{}}};
  const version=hash(encode({schema:SCHEMA,taxonomy:TAXONOMY,ranking:RANKING,mode,asOf:data.asOf,catalog,tags,details:data.details})).slice(0,24);
  const pack=(path,value)=>{const bytes=encode({version,value});return [{path,sha256:hash(bytes)},bytes];};
  const [catalogRef,catalogBytes]=pack('data/catalog.'+version+'.json',catalog);
  const [tagRef,tagBytes]=pack('data/tags.'+version+'.json',tags);
  const [homeRef,homeBytes]=pack('data/home.'+version+'.json',home);
  const detailFiles=Object.entries(data.details).map(([id,d])=>[id,...pack('data/details/'+id+'.'+version+'.json',d)]);
  const meta=validateMeta({schemaVersion:SCHEMA,taxonomyVersion:TAXONOMY,rankingVersion:RANKING,mode,asOf:data.asOf,version,
    catalog:catalogRef,tags:tagRef,home:homeRef,details:Object.fromEntries(detailFiles.map(([id,ref])=>[id,ref]))});
  validateCatalog(catalog,tags,meta);validateHome(home,meta);
  for(const [id,ref,bytes] of detailFiles){validateDetail(data.details[id],id,meta,tags);await save(ref.path,bytes);}
  for(const [ref,bytes] of [[catalogRef,catalogBytes],[tagRef,tagBytes],[homeRef,homeBytes]])await save(ref.path,bytes);
  await save('data/catalog-meta.json',encode(meta));
  await save('favicon.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#18181a"/><path d="M7 23 14 9h4l-7 14zm8 0 7-14h3l-7 14z" fill="#fafafa"/></svg>');
  await writeFile(join(stage,'.nojekyll'),'',{flag:'wx'});
  await save('catalog-build.json',encode({owner:'motion-catalog-build/1',target:kind,mode,version}));
  const report=await auditOutput(stage,kind);
  if(await assertOwned(destination,kind,true)){
    backup=await mkdtemp(join(parent,'.catalog-prior-'));
    await rename(destination,join(backup,'build'));
  }
  try {await rename(stage,destination);commitDone=true;}
  catch(error){if(backup){await rename(join(backup,'build'),destination);await rm(backup,{recursive:true});backup=null;}throw error;}
  if(backup) await rm(backup,{recursive:true});
  console.log(JSON.stringify({status:'built',target:kind,directory:destination,base,version,...report}));
} finally {
  if(!commitDone)await rm(stage,{recursive:true,force:true});
}
