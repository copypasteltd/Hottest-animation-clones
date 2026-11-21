import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {lstat, realpath} from 'node:fs/promises';
import {join, resolve, dirname, extname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {auditOutput, layout} from './output.mjs';

const APP=await realpath(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
const mime={'.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4'};
export const ports={root:4173,pages:4174,local:4176};
export function byteRange(value,size){
  if(value===undefined)return null;
  if(typeof value!=='string'||!Number.isSafeInteger(size)||size<=0)return false;
  const match=/^bytes=(\d{0,15})-(\d{0,15})$/.exec(value);
  if(!match||!match[1]&&!match[2])return false;
  const [,a,b]=match;
  if(!a&&Number(b)===0)return false;
  const start=a?Number(a):Math.max(0,size-Number(b));
  const stop=a&&b?Math.min(Number(b),size-1):size-1;
  return start<=stop&&start<size?{start,stop}:false;
}
export async function createPreview(target,port=0){
  const {destination,base,mode}=layout(APP,target);
  const {paths,...report}=await auditOutput(destination,target,{includePaths:true});
  const admitted=new Set(paths);
  if(!Number.isInteger(port)||port<0||port>65535)throw new Error('Invalid loopback port');
  let authority='';
  const server=createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Cross-Origin-Resource-Policy','same-origin');
    res.setHeader('Content-Security-Policy',"frame-ancestors 'none'");
    res.setHeader('Cache-Control',mode==='local'?'private, no-store':'no-cache');
    const end=(code,message,headers={})=>{res.writeHead(code,{'Content-Type':'text/plain; charset=utf-8',...headers});res.end(req.method==='HEAD'?undefined:message);};
    if(req.headers.host!==authority||req.headers['sec-fetch-site']==='cross-site'||
      req.headers.origin&&req.headers.origin!=='http://'+authority) return end(403,'Loopback preview only.');
    if(req.method!=='GET'&&req.method!=='HEAD')return end(405,'Static read only.',{Allow:'GET, HEAD'});
    const raw=(req.url??'').split('?')[0];
    if(base!=='/'&&raw===base.slice(0,-1)){res.writeHead(308,{Location:base});res.end();return;}
    if(!raw.startsWith(base))return end(404,'Static resource not found.');
    const rel=raw.slice(base.length)||'index.html';
    const type=mime[extname(rel)];
    if(!type||!admitted.has(rel))return end(404,'Static resource not found.');
    if(mode!=='local'&&rel.startsWith('media/'))return end(404,'Static resource not found.');
    const file=join(destination,rel);
    let size;
    try {
      const st=await lstat(file);
      if(!st.isFile()||st.isSymbolicLink()||await realpath(file)!==file)return end(404,'Static resource not found.');
      size=st.size;
    } catch {return end(404,'Static resource not found.');}
    const range=byteRange(req.headers.range,size);
    if(range===false)return end(416,'Range not satisfiable.',{'Content-Range':'bytes */'+size});
    res.writeHead(range?206:200,{'Content-Type':type,'Accept-Ranges':'bytes',
      'Content-Length':range?range.stop-range.start+1:size,
      ...(range?{'Content-Range':'bytes '+range.start+'-'+range.stop+'/'+size}:{})});
    if(req.method==='HEAD'){res.end();return;}
    const stream=createReadStream(file,range?{start:range.start,end:range.stop}:{});
    stream.on('error',()=>res.destroy());
    res.on('close',()=>stream.destroy());
    stream.pipe(res);
  });
  await new Promise((done,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',()=>{server.off('error',fail);done();});});
  authority='127.0.0.1:'+server.address().port;
  return {server,base,mode,url:'http://'+authority+base,report,
    close:()=>new Promise((done,fail)=>{server.close(e=>e?fail(e):done());server.closeIdleConnections();})};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const args=process.argv.slice(2);
  if(args[0]!=='--target'||!Object.hasOwn(ports,args[1])||args.length!==2&&(args.length!==4||args[2]!=='--port'||!/^\d{1,5}$/.test(args[3])))
    throw new Error('Use --target root|pages|local [--port N].');
  const preview=await createPreview(args[1],args.length===4?Number(args[3]):ports[args[1]]);
  console.log(JSON.stringify({status:'listening',url:preview.url,mode:preview.mode,...preview.report}));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>void preview.close());
}
