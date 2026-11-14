/* Original synthetic documentation demo. No inference, media upload or service API. */
'use strict';
const STRINGS = {
 zh: {
  'tour.start':'演示导览','tour.running':'导览进行中…','nav.workbench':'动作工作台','nav.method':'处理方案','nav.docs':'项目文档',
  'hero.eyebrow':'MOTION / EVIDENCE / REUSE','hero.title':'每个动作，都保留它的来源。','hero.lede':'一个动作身份，两条独立参考路径。先看清证据，再决定它能怎样复用。',
  'notice.title':'交互文档演示 · 合成数据','notice.body':'几何人物、轨迹和审核状态为人工构造。没有视频推理、真实角色图或模型生成结果。',
  'library.title':'动作实例','library.search':'名称、手型或动作顺序','library.scope':'审核范围','filter.all':'全部实例','filter.paired':'双库示例通过','filter.limited':'受限 / 待审','library.synthetic':'仅含合成示例','library.noUpload':'不读取或上传本地媒体',
  'mode.paired':'来源与双库','mode.pose':'轨迹与事件','mode.lineage':'版本与来源','play':'播放','pause':'暂停',
  'stage.caption':'线条运动为演示代码构造；画面不是源视频分析、动作估计或角色迁移的效果证明。',
  'review.title':'独立审核','review.lede':'一个分支通过，不会替其他分支放行。','review.finding':'本例需要注意','review.origin':'轨迹来源','review.time':'时间单位','review.missing':'缺失策略','review.mask':'mask + unknown',
  'download':'导出当前示例清单 ↓','downloaded':'已导出合成示例，不含真实媒体。',
  'method.title':'共享来源，各自证明。','method.body':'原视频是共同证据。生成片只作派生示范，不能反过来覆盖源骨架。',
  'flow.source':'源视频 + 动作事件','flow.sourceSub':'固定源区间 / 原始时序','flow.pose':'源骨架参考库','flow.poseSub':'身体 / 双手 / 置信度 / 缺失','flow.visual':'标准视觉参考库','flow.visualSub':'角色 / 场景 / 构图 / 生成记录','flow.review':'事件对齐 + 独立审核','flow.reviewSub':'通过范围明确后再参考生成',
  'footer.scope':'当前仓库：需求契约、维护工具与此静态演示。生产骨架提取和视频迁移尚未实现。','footer.update':'维护与更新规范',
  'source':'源动作示意','visual':'标准视觉示意','pose':'源轨迹示意','result':'个合成实例','none':'没有匹配。请清除搜索或切换审核范围。','paired':'双库示例通过','limited':'受限 / 待审','source_review':'来源','semantic_review':'语义','body_pose':'身体骨架','hand_pose':'手部骨架','visual_review':'视觉','alignment':'事件对齐','target_model':'目标模型','passed':'示例通过','needs_review':'待审','failed':'示例失败','not_run':'未运行','event':'事件','time':'时间','state':'状态','unknown':'未知','known':'构造示意','poseNote':'仅在有效点与可比视角上比较轨迹。手指缺失不会被身体平均分覆盖。','lineageSource':'原始来源实例','lineagePose':'源提取轨迹','lineageVisual':'生成示范派生','lineageReview':'固定版本的审核与对齐','lineageNever':'生成轨迹不覆盖源轨迹。'
 },
 en: {
  'tour.start':'Guided tour','tour.running':'Tour running…','nav.workbench':'Workbench','nav.method':'Method','nav.docs':'Documentation',
  'hero.eyebrow':'MOTION / EVIDENCE / REUSE','hero.title':'Keep the evidence in every motion.','hero.lede':'One motion identity. Two independent reference paths. Inspect the evidence before deciding what can be reused.',
  'notice.title':'Interactive documentation · synthetic data','notice.body':'Figures, trajectories and review states are authored examples. No inference, private character images or model-generated results.',
  'library.title':'Motion instances','library.search':'Name, hand shape or event order','library.scope':'Review scope','filter.all':'All examples','filter.paired':'Paired example passed','filter.limited':'Limited / review','library.synthetic':'Synthetic examples only','library.noUpload':'No local media reads or uploads',
  'mode.paired':'Source & libraries','mode.pose':'Tracks & events','mode.lineage':'Versions & lineage','play':'Play','pause':'Pause',
  'stage.caption':'Line motion is authored in demo code. These views do not demonstrate video analysis, pose inference or character transfer.',
  'review.title':'Independent review','review.lede':'Passing one branch does not approve another.','review.finding':'What this example shows','review.origin':'Track origin','review.time':'Time unit','review.missing':'Missing data','review.mask':'mask + unknown',
  'download':'Export example manifest ↓','downloaded':'Synthetic manifest exported; no real media included.',
  'method.title':'Shared source. Separate proof.','method.body':'The source video is the common evidence. A generated demonstration cannot replace the source pose observation.',
  'flow.source':'Source + motion events','flow.sourceSub':'Pinned source range / original timing','flow.pose':'Source-pose library','flow.poseSub':'Body / hands / confidence / missing data','flow.visual':'Canonical-video library','flow.visualSub':'Character / scene / framing / attempt','flow.review':'Alignment + independent reviews','flow.reviewSub':'Reuse only within an explicit passed scope',
  'footer.scope':'This repository: specifications, maintenance tools and this static demo. Production pose inference and video transfer are not implemented.','footer.update':'Maintenance & updates',
  'source':'Source illustration','visual':'Canonical illustration','pose':'Source-track illustration','result':'synthetic examples','none':'No match. Clear the search or change the review scope.','paired':'Paired example passed','limited':'Limited / review','source_review':'Source','semantic_review':'Semantics','body_pose':'Body pose','hand_pose':'Hand pose','visual_review':'Visual','alignment':'Alignment','target_model':'Target model','passed':'Example passed','needs_review':'Needs review','failed':'Example failed','not_run':'Not run','event':'Event','time':'Time','state':'State','unknown':'Unknown','known':'Authored','poseNote':'Compare tracks only when valid points and views are comparable. A body-average score cannot approve missing fingers.','lineageSource':'Original source instance','lineagePose':'Source observation track','lineageVisual':'Generated demonstration','lineageReview':'Pinned reviews and alignment','lineageNever':'Generated tracks never overwrite source tracks.'
 }
};
const ASSETS = [
 {id:'demo-cross-open',name:{zh:'胸前交叉 → 两侧展开',en:'Cross at chest → open arms'},tags:'cross open 交叉 展开 chest arms 双手',duration:4,scope:'paired',events:[{t:0,name:{zh:'自然起姿',en:'Start'}},{t:.8,name:{zh:'胸前交叉',en:'Cross'}},{t:2.1,name:{zh:'两侧展开',en:'Open'}},{t:3.5,name:{zh:'回位',en:'Return'}}],reviews:{source_review:'passed',semantic_review:'passed',body_pose:'passed',hand_pose:'passed',visual_review:'passed',alignment:'passed',target_model:'not_run'},finding:{zh:'这是一条人工构造的“双库通过”示例。目标模型没有运行；示例通过不会变成实际生成验证。',en:'An authored paired-pass example. No target model was run; an example pass is not a verified generation.'}},
 {id:'demo-point-alternate',name:{zh:'左右交替指向',en:'Alternate left / right pointing'},tags:'point alternate 指向 交替 left right',duration:4.5,scope:'limited',events:[{t:0,name:{zh:'起姿',en:'Start'}},{t:.9,name:{zh:'画面左指向',en:'Screen-left point'}},{t:2.2,name:{zh:'画面右指向',en:'Screen-right point'}},{t:3.9,name:{zh:'收回',en:'Return'}}],reviews:{source_review:'passed',semantic_review:'passed',body_pose:'passed',hand_pose:'needs_review',visual_review:'passed',alignment:'needs_review',target_model:'not_run'},finding:{zh:'决定性手指没有被观测。身体轨迹可作为示例通过，精细手势与完整配对仍待审。',en:'The decisive fingers are unobserved. Body pose may pass in this example, while fine-hand and paired reviews remain pending.'}},
 {id:'demo-wrist-turn',name:{zh:'双手翻腕与停顿',en:'Wrist turn and hold'},tags:'wrist turn 翻腕 停顿 hold hands',duration:3.2,scope:'limited',events:[{t:0,name:{zh:'抬腕',en:'Raise'}},{t:.7,name:{zh:'掌面变化',en:'Palm change'}},{t:1.7,name:{zh:'停顿',en:'Hold'}},{t:2.7,name:{zh:'回位',en:'Return'}}],reviews:{source_review:'passed',semantic_review:'needs_review',body_pose:'passed',hand_pose:'needs_review',visual_review:'needs_review',alignment:'not_run',target_model:'not_run'},finding:{zh:'快速翻腕的首尾帧不足以证明中间过程。保留unknown，不能凭平滑补点发布精细手势。',en:'Sparse endpoints cannot prove a fast wrist turn. Keep unknowns; smoothing does not create observed finger evidence.'}}
];
let lang='zh',currentId=ASSETS[0].id,mode='paired',phase=.32,playing=false,lastFrame=0;
const $=selector=>document.querySelector(selector);
const t=key=>STRINGS[lang][key]??key;
const current=()=>ASSETS.find(asset=>asset.id===currentId);
const translated=value=>typeof value==='object'?value[lang]:value;
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function posePoints(progress,assetId){
 const open=Math.sin(Math.PI*Math.min(1,progress/.9))**2;
 if(assetId==='demo-point-alternate'){const side=Math.sin(progress*Math.PI*2);return {head:[100,54],neck:[100,78],hip:[100,147],le:[75,100],re:[125,100],lh:[58+Math.min(0,side)*19,113-Math.abs(Math.min(0,side))*42],rh:[142+Math.max(0,side)*19,113-Math.max(0,side)*42],lk:[85,187],rk:[115,187],lf:[78,222],rf:[122,222]};}
 if(assetId==='demo-wrist-turn')return {head:[100,54],neck:[100,78],hip:[100,147],le:[72,104],re:[128,104],lh:[69,91+open*9],rh:[131,91+open*9],lk:[85,187],rk:[115,187],lf:[78,222],rf:[122,222]};
 const crossed=progress>.13&&progress<.42;
 return {head:[100,54],neck:[100,78],hip:[100,147],le:crossed?[79,108]:[72-open*12,103-open*9],re:crossed?[121,108]:[128+open*12,103-open*9],lh:crossed?[115,105]:[67-open*32,130-open*48],rh:crossed?[85,105]:[133+open*32,130-open*48],lk:[85,187],rk:[115,187],lf:[78,222],rf:[122,222]};
}
function figure(kind,progress){
 const points=posePoints(progress,currentId),missing=currentId!=='demo-cross-open'&&kind==='pose';
 const pairs=[['neck','hip'],['neck','le'],['neck','re'],['le','lh'],['re','rh'],['hip','lk'],['hip','rk'],['lk','lf'],['rk','rf']];
 let lines=pairs.map(([a,b])=>`<line class="pose-line" x1="${points[a][0]}" y1="${points[a][1]}" x2="${points[b][0]}" y2="${points[b][1]}"/>`).join('');
 let hands='';for(const side of ['lh','rh']){const [x,y]=points[side];if(missing){hands+=`<circle cx="${x}" cy="${y}" r="10" fill="#fff8e9" stroke="#b39155" stroke-dasharray="2 3"/><text x="${x-2.5}" y="${y+3}" class="sample-label">?</text>`;}else for(let k=0;k<5;k++)hands+=`<line class="pose-line pose-hand" x1="${x}" y1="${y}" x2="${x+(k-2)*2.4}" y2="${y-7+Math.abs(k-2)}"/>`;}
 const joints=kind==='pose'?Object.entries(points).filter(([key])=>key!=='head').map(([,p])=>`<circle class="pose-joint" cx="${p[0]}" cy="${p[1]}" r="3.3"/>`).join(''):'';
 const grid=Array.from({length:10},(_,i)=>`<line class="grid-line" x1="100" y1="182" x2="${-200+i*70}" y2="260"/>`).join('')+Array.from({length:6},(_,i)=>`<line class="grid-line" x1="0" y1="${186+i*i*3}" x2="200" y2="${186+i*i*3}"/>`).join('');
 return `<svg viewBox="0 0 200 260" role="img" aria-label="${esc(t(kind))} — synthetic stick figure" class="${kind}-stage"><rect width="200" height="260" fill="#fff"/>${grid}<rect x="24" y="17" width="152" height="220" class="crop-frame"/>${lines}<ellipse class="pose-head" cx="100" cy="54" rx="13" ry="16"/>${hands}${joints}<text x="10" y="251" class="sample-label">SYNTHETIC / ${kind==='pose'?'POINTS':'ILLUSTRATION'}</text></svg>`;
}
function preview(kind){return `<div class="preview"><div class="preview-header"><span>${esc(t(kind))}</span><code>${kind==='visual'?'generated': 'source'} · demo</code></div>${figure(kind,phase)}<div class="preview-footer">${kind==='visual'?'origin = generated':'origin = source'} / DEMO ONLY</div></div>`;}
function renderStage(){
 const asset=current();$('#asset-ref').textContent=`${asset.id} / phrase / synthetic`;
 $('#asset-title').textContent=translated(asset.name);
 $('#stage-content').setAttribute('aria-labelledby','tab-'+mode);
 document.querySelectorAll('.mode-tabs button').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.mode===mode)));
 if(mode==='paired')$('#stage-content').innerHTML='<div class="comparison">'+['source','visual','pose'].map(preview).join('')+'</div>';
 else if(mode==='pose')$('#stage-content').innerHTML=`<div class="pose-detail">${preview('pose')}<div><table class="event-table"><thead><tr><th>${t('event')}</th><th>${t('time')}</th><th>${t('state')}</th></tr></thead><tbody>${asset.events.map((event,index)=>`<tr><td>${esc(translated(event.name))}</td><td><code>${event.t.toFixed(2)} s</code></td><td>${index===1&&asset.scope==='limited'?t('unknown'):t('known')}</td></tr>`).join('')}</tbody></table><p class="contract-note">${t('poseNote')}</p></div></div>`;
 else $('#stage-content').innerHTML=`<div class="lineage"><div class="lineage-node"><b>${t('lineageSource')}</b><code>source_demo@1 → occurrence_demo@1 → eventset_demo@1</code></div><div class="lineage-split"><div class="lineage-node"><b>${t('lineagePose')}</b><code>origin=source / native → normalized</code></div><div class="lineage-node"><b>${t('lineageVisual')}</b><code>origin=generated / character + scene + framing</code></div></div><div class="lineage-node"><b>${t('lineageReview')}</b><code>body / hands / visual / alignment / target_model</code></div><p class="contract-note">${t('lineageNever')}</p></div>`;
 $('#review-list').innerHTML=Object.entries(asset.reviews).map(([key,value])=>`<div class="review-item"><span>${esc(t(key))}</span><span class="status ${value}">${esc(t(value))}</span></div>`).join('');
 $('#finding-text').textContent=translated(asset.finding);
 $('#event-row').innerHTML=asset.events.map((event,index)=>`<div class="event ${phase>=event.t/asset.duration&&(index===asset.events.length-1||phase<asset.events[index+1].t/asset.duration)?'current':''}"><code>${event.t.toFixed(2)}s</code>${esc(translated(event.name))}</div>`).join('');
 $('#timecode').textContent=`${(phase*asset.duration).toFixed(2).padStart(5,'0')} / ${asset.duration.toFixed(2).padStart(5,'0')} s`;
 $('#timeline').value=String(Math.round(phase*1000));
}
function renderLibrary(){
 const query=$('#search').value.trim().toLowerCase(),scope=$('#scope-filter').value;
 const visible=ASSETS.filter(asset=>(scope==='all'||asset.scope===scope)&&(!query||(asset.name.zh+' '+asset.name.en+' '+asset.tags).toLowerCase().includes(query)));
 $('#result-count').textContent=`${visible.length} ${t('result')}`;
 $('#asset-list').innerHTML=visible.length?visible.map(asset=>`<button class="asset ${asset.scope==='limited'?'limited':''} ${asset.id===currentId?'active':''}" type="button" data-asset="${asset.id}" aria-pressed="${asset.id===currentId}"><span class="asset-code">${asset.id.replace('demo-','DEMO / ')}</span><span class="asset-name">${esc(translated(asset.name))}</span><span class="asset-meta"><span><i class="quality-dot"></i>${esc(t(asset.scope))}</span><code>${asset.duration.toFixed(1)}s</code></span></button>`).join(''):`<p class="empty-state">${t('none')}</p>`;
}
function setLanguage(next){lang=next;document.documentElement.lang=next==='zh'?'zh-CN':'en';document.querySelectorAll('[data-i18n]').forEach(element=>element.textContent=t(element.dataset.i18n));$('#lang-zh').setAttribute('aria-pressed',String(lang==='zh'));$('#lang-en').setAttribute('aria-pressed',String(lang==='en'));$('#play').textContent=t(playing?'pause':'play');$('#play').setAttribute('aria-label',lang==='zh'?'播放或暂停合成动作':'Play or pause synthetic motion');$('#download-message').textContent='';renderLibrary();renderStage();}
$('#lang-zh').addEventListener('click',()=>setLanguage('zh'));$('#lang-en').addEventListener('click',()=>setLanguage('en'));
$('#search').addEventListener('input',renderLibrary);$('#scope-filter').addEventListener('change',renderLibrary);
$('#asset-list').addEventListener('click',event=>{const button=event.target.closest('[data-asset]');if(!button)return;currentId=button.dataset.asset;phase=.32;playing=false;$('#play').textContent=t('play');$('#download-message').textContent='';renderLibrary();renderStage();});
for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>{mode=button.dataset.mode;renderStage();});
$('#timeline').addEventListener('input',event=>{phase=Number(event.target.value)/1000;renderStage();});
$('#play').addEventListener('click',()=>{playing=!playing;$('#play').textContent=t(playing?'pause':'play');lastFrame=0;});
$('#download').addEventListener('click',()=>{const asset=current();const manifest={record_kind:'synthetic_documentation_example',not_inference_result:true,action_id:asset.id,revision:1,duration_seconds:asset.duration,source_media_included:false,events:asset.events.map(event=>({anchor_us:Math.round(event.t*1e6),name:translated(event.name)})),independent_reviews:asset.reviews,source_pose:{origin:'source',data_kind:'authored_demo'},canonical_visual:{origin:'generated',data_kind:'authored_demo'},target_model:'not_run'};const url=URL.createObjectURL(new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=asset.id+'.example.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#download-message').textContent=t('downloaded');});
function tick(timestamp){if(playing){if(lastFrame){phase=(phase+(timestamp-lastFrame)/1000/current().duration)%1;renderStage();}lastFrame=timestamp;}else lastFrame=0;requestAnimationFrame(tick);}
$('#tour').addEventListener('click',async()=>{const button=$('#tour');button.disabled=true;const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));const show=(asset,view,nextLang)=>{playing=false;currentId=asset;mode=view;phase=.32;setLanguage(nextLang);button.textContent=t('tour.running');};try{show('demo-cross-open','paired','zh');await wait(2200);playing=true;$('#play').textContent=t('pause');await wait(4200);show('demo-point-alternate','pose','zh');await wait(3600);show('demo-point-alternate','lineage','en');await wait(3600);show('demo-cross-open','paired','en');await wait(3000);}finally{playing=false;button.disabled=false;button.textContent=t('tour.start');$('#play').textContent=t('play');button.dataset.tourComplete='true';}});
setLanguage(new URLSearchParams(location.search).get('lang')==='en'?'en':'zh');requestAnimationFrame(tick);
