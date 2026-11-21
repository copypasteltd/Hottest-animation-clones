import {heatScores} from '../src/ranking.ts';

const AS_OF = '2026-11-22T00:00:00Z';
const themes = [
  ['手势练习：手掌追着节拍走','gesture_dance','arm_sweep','从指尖到肩线的连续摆臂练习。'],
  ['池畔四拍：交错之后分脚','choreographed_dance','crossed_feet','全身交叉步、分脚与回到并列。'],
  ['绕着她的半圈镜头','gesture_dance','arm_extension','横向扫过背景与手臂伸展的镜头练习。'],
  ['手举过肩，停在第四拍','gesture_dance','arm_raise','中景中的动作停顿和抬肘。'],
  ['沿着白场走出一个弧','choreographed_dance','separated_feet','后撤、分脚和恢复重心。'],
  ['掌心朝前的四个方向','gesture_dance','open_palm_display','分辨张掌状态和真正的挥手。'],
  ['斜线中的交错步','choreographed_dance','crossed_feet','两只脚从交错到分开。'],
  ['胸前双手靠近的练习','gesture_dance','chest_hand_gesture','比较手在胸前附近的形状变化。'],
  ['镜头转向，手指停留','gesture_dance','pointing','指向不同位置，比较透视改变。'],
  ['半蹲以后重新站直','choreographed_dance','knee_bend','全身屈膝与舒展的对照练习。'],
  ['两侧延展的动作小样','gesture_dance','arm_extension','从一侧到另一侧的摆臂轨迹。'],
  ['长镜头下的横向步伐','choreographed_dance','separated_feet','完整检索专用短语：晚风映照的琥珀步伐。'],
];
const names={gesture_dance:['手势舞','Gesture-led dance',['手指舞','gesture dance']],choreographed_dance:['编舞表演','Choreographed dance',['编舞','dance']],
  arm_sweep:['摆臂／扫臂','Arm sweep',['摆臂']],crossed_feet:['交错脚位','Crossed foot placement',['交叉步','cross step']],
  arm_extension:['伸臂','Arm extension',['伸手']],arm_raise:['抬臂','Arm raise',['举手']],separated_feet:['分脚／恢复并列','Separated feet',['分脚','并脚']],
  open_palm_display:['张掌展示','Open-palm display',['张掌']],chest_hand_gesture:['胸前手势','Chest-level gesture',['胸前']],
  pointing:['指向','Pointing',[]],knee_bend:['屈膝','Knee bend',[]],heart_gesture:['比心（未分型）','Heart gesture, unspecified',['比心','heart gesture']],
  white_void:['白色空场','White void',['纯白背景']],orbit:['环绕运镜','Orbit around subject',['绕拍','orbit']],
  floor_grid:['地面网格','Floor grid',['白模网格']],s02:['S02 白场','S02 white grid',[]]};
const tag=(scope, facet, key)=>({id:scope+':'+facet+'.'+key,scope,zh:names[key][0],en:names[key][1],aliases:names[key][2],facet});
const tags=Object.keys(names).flatMap(key=>{
  const facet=key==='s02'?'scene':key==='orbit'?'camera':key==='white_void'||key==='floor_grid'?'scene':key.endsWith('dance')?'content':'movement';
  return key==='s02'?[tag('configuration',facet,key)]:['source','rendition'].map(scope=>tag(scope,facet,key));
});
tags.push({id:'native:fixture-dance',scope:'native',zh:'舞蹈练习',en:'',aliases:[],facet:'platform'});
const obs=(id,state='observed')=>({id,state});
const info=(kind,text,candidate=false)=>({kind,text,candidate});
const fact=(row,note,times=[])=>({...row,note,times,interval:null});
const day=86400000;
const date=days=>new Date(Date.parse(AS_OF)-days*day).toISOString();

// Original illustrative vector covers. These are not frames or third-party assets.
export function exampleCover(index, portrait, variant) {
  const colors=[['#d4c9a9','#736c58','#f7efda'],['#bdd5d6','#367580','#e8f6f2'],['#edb8a0','#ad5a61','#ffe5b7'],['#c9c7e1','#615481','#f6ddeb'],['#b9d3b5','#426b58','#daf2c9'],['#d3a784','#7f5162','#ffe7bc'],['#aebad0','#384f82','#e3e8ff'],['#eddbc0','#4a6869','#f9ead0']];
  const [base,ink,glo]=colors[(index+(variant==='BM01'?2:0))%colors.length];
  const w=portrait?360:560,h=portrait?488:320;
  const lines=Array.from({length:12},(_,i)=>{
    const y=Math.round(h*.38+i*h*.055), d=Math.round(h*.14 + (i%3)*7), x=i%2?w*.24:w*.32;
    return '<path d="M -40 '+y+' Q '+x+' '+(y-d)+' '+w*.51+' '+y+' T '+(w+40)+' '+y+'" fill="none" stroke="'+glo+'" stroke-opacity="'+(.38+i*.025)+'" stroke-width="3"/>';
  }).join('');
  const grid=Array.from({length:8},(_,i)=>'<path d="M '+(i*w/7)+' '+h+' L '+(w*.42+i*w*.025)+' '+h*.66+'"/>').join('');
  const a=w*(.30+index%4*.1), b=h*.47;
  const motif=index%4===0?lines:index%4===1?'<g fill="none" stroke="'+glo+'" stroke-width="2" opacity=".8">'+grid+'</g><circle cx="'+a+'" cy="'+b+'" r="'+(h*.20)+'" fill="'+glo+'" opacity=".72"/>'
    :index%4===2?'<path d="M0 '+h*.64+' Q '+w*.52+' '+h*.24+' '+w+' '+h*.64+' V '+h+' H0Z" fill="'+ink+'" opacity=".6"/>'+lines
    :'<rect x="'+w*.19+'" y="'+h*.17+'" width="'+w*.62+'" height="'+h*.64+'" fill="none" stroke="'+glo+'" stroke-width="2"/><circle cx="'+a+'" cy="'+b+'" r="'+h*.22+'" fill="'+glo+'" opacity=".8"/>'+lines;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'"><defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="'+base+'"/><stop offset="1" stop-color="'+ink+'"/></linearGradient></defs><rect width="'+w+'" height="'+h+'" fill="url(#bg)"/>'+motif+'</svg>\n';
}
export async function exampleData(save) {
  const works=[],renditions=[],details={},inputs=[];
  for(let i=0;i<34;i++){
    const sequence=String(i+1).padStart(2,'0'), key='work-demo-'+sequence;
    const [label,classify,motion,summary]=themes[i%themes.length];
    const platform=['bilibili','bilibili','x','douyin'][i%4];
    const title=label+(i>=themes.length?' · 习作 '+sequence:'');
    const listedAt=i===33?null:date(i*.84+1);
    const description=summary+' 这是展示搜索、画幅、分页和标签来源的虚构条目。'+(i===33?' 星屑回形步唯一检索词。':'');
    const s=[obs('native:fixture-dance'),obs('source:content.'+classify),obs('source:movement.'+motion)];
    if (i%12===7) s.push(obs('source:movement.heart_gesture','candidate'));
    if (i%12===2) s.push(obs('source:camera.orbit','candidate'));
    const sf=s.filter(t=>!t.id.startsWith('native:')).map(t=>fact(t,t.state==='candidate'?'仅为虚构的待核候选。':'虚构标签，用于对照来源。',[4500,6500]));
    const w={id:key,title,description,code:'DEMO-'+sequence,platform,listedAt,tags:s,detailsIndex:[info('author',i===33?'虚构作者 云端节拍档案':'虚构作者 舞步练习组'),info('media','原片分辨率 1920×1080；30 fps'),...(i%12===7?[info('observation','星灯胸前手形观察',true)]:[])]};
    works.push(w);
    inputs.push({id:key,platform,samples:i%9===0?[]:[{at:i%9===1?date(32):date(1),views:800+(i*12841)%60800,likes:30+(i*37)%500,comments:i%4===0?null:i%80,reposts:platform==='x'?i:null}]});
    details[key]={id:key,sourceUrl:null,video:null,sourceFacts:sf,renditionFacts:[],acceptance:'虚构条目',notes:['虚构目录仅用于验收界面与检索，不含真实原片或成片。']};
    if(i===32) continue; // One searchable metadata-only work.
    for(const variant of ['SA02','BM01']) {
      const attempts=i===0&&variant==='SA02'?2:1;
      for(let a=1;a<=attempts;a++){
        const id='video-demo-'+sequence+'-'+variant.toLowerCase()+'-'+a, portrait=i%3===1||i%5===4;
        const poster={path:'covers/'+id+'.svg',width:portrait?360:560,height:portrait?488:320};
        if(i!==31) await save(poster.path,exampleCover(i,portrait,variant));
        const rTags=[obs('configuration:scene.s02'),obs('rendition:scene.white_void'),obs('rendition:scene.floor_grid'),obs('rendition:content.'+classify)];
        rTags.push(obs('rendition:movement.'+(variant==='BM01'&&i===0?'pointing':motion)));
        if (i%12===2) rTags.push(obs('rendition:camera.orbit','candidate'));
        const name=title+(variant==='SA02'?' · 动漫':' · 写实');
        const reviewStatus=i%4===0||i===33?'approved':i%3===0?'pending':'unrecorded';
        const label=reviewStatus==='approved'?'示例 · 已定稿':reviewStatus==='pending'?'示例 · 待复核':'示例 · 未记录验收';
        const comparison=i===33&&variant==='BM01'?'同刻对照专例：青岚触地复核。':'仅为虚构成片的抽样对照。';
        renditions.push({id,workId:key,title:name,description:'同源动作重画的虚构版本；保留角色标签，不作为成片证据。',variant,
          framing:portrait?'full_body':'half_body',shape:portrait?'portrait':'landscape',durationMs:12500+i*273,listedAt:i===33?null:date(i*.84+1+(attempts-a)*3),
          label:a===1&&attempts>1?label+' · 历史':label,poster:i===31?null:poster,playable:false,tags:rTags,reviewStatus,detailsIndex:[info('configuration','S02 白场；示例配置'),info('review',label),info('comparison',comparison)]});
        details[id]={id,sourceUrl:null,video:null,sourceFacts:sf,renditionFacts:rTags.filter(r=>r.id.startsWith('rendition:')).map(r=>fact(r,'虚构成片观察。',[4500])),acceptance:label,notes:[comparison,'示例封面由本站绘制，不含视频或第三方实拍素材。']};
      }
    }
  }
  const heat=heatScores(AS_OF,inputs);
  return {asOf:AS_OF,tags,works:works.map(w=>({...w,...heat.get(w.id)})),renditions,details};
}
