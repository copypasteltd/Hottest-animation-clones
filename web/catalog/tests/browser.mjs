import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {chromium} from 'playwright';
import {createPreview} from '../scripts/serve.mjs';

const args=process.argv.slice(2);
const local=args.includes('--local');
const images=args.indexOf('--screenshots');
const out=images<0?null:resolve(args[images+1]??'');
if(images>=0 && !args[images+1])throw new Error('Provide a fresh screenshot directory');
if(out)await mkdir(out);
const browser=await chromium.launch({headless:true,...(process.env.CATALOG_BROWSER?{executablePath:process.env.CATALOG_BROWSER}:{})});
const reports=[];
const wait=async locator=>locator.waitFor({state:'visible',timeout:10000});
const expectTotal=async (page,total)=>wait(page.locator('.counts').filter({hasText:new RegExp('^'+total+' 条')}));
const cardIds=page=>page.locator('.card').evaluateAll(cards=>cards.map(c=>c.dataset.item));
const search=async(page,word)=>{const input=page.getByRole('textbox',{name:'搜索全库'});await input.fill(word);await input.press('Enter');};
async function shot(page,name){if(out)await page.screenshot({path:join(out,name+'.png'),animations:'disabled'});}
async function visit(target, options, test){
  const host=await createPreview(target);
  let context;
  try{
    context=await browser.newContext({locale:'zh-CN',reducedMotion:'reduce',...options});
    // The test never visits a user tab or requests a remote origin.
    const origin=new URL(host.url).origin;
    await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    const page=await context.newPage();
    page.setDefaultTimeout(10000);
    const errors=[], media=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(new URL(r.url()).pathname.endsWith('.mp4')) media.push(r.url());});
    await test({page,host,media});
    assert.deepEqual(errors,[],'no browser runtime errors');
  } finally {
    try{await context?.close();}finally{await host.close();}
  }
}
try {
  await visit('root',{viewport:{width:1440,height:900},colorScheme:'light'},async({page,host,media})=>{
    await page.goto(host.url);
    await expectTotal(page,34);
    await page.locator('.wall[data-positioned=true]').waitFor();
    const first=await cardIds(page);
    assert.equal(first.length,24);
    assert.equal(await page.locator('.card').first().evaluate(e=>e.getBoundingClientRect().top<innerHeight),true);
    assert.equal(await page.locator('.card').evaluateAll(nodes=>new Set(nodes.slice(0,5).map(n=>Math.round(n.getBoundingClientRect().left))).size),5);
    // A tag grid is a reliable full-index readiness signal, even if the first page came from home projection.
    await page.getByRole('button',{name:'筛选',exact:true}).click();
    await wait(page.getByRole('button',{name:/^原片观察：手势舞/}).first());
    await page.keyboard.press('Escape');
    await shot(page,'example-desktop-light');
    await page.getByRole('button',{name:'切换至深色主题'}).click();
    await page.locator('html[data-theme=dark]').waitFor({state:'attached'});
    await shot(page,'example-desktop-dark');
    await page.getByRole('button',{name:'下一页',exact:true}).click();
    await page.getByRole('button',{name:'第 2 页',exact:true}).getAttribute('aria-current');
    await page.locator('.paging [aria-current=page]').filter({hasText:/^2$/}).waitFor();
    const second=await cardIds(page);
    assert.equal(second.length,10);assert.equal(new Set([...first,...second]).size,34);
    await search(page,'"星屑回形步唯一检索词"');
    await expectTotal(page,1);assert.deepEqual(await cardIds(page),['work-demo-34']);
    await search(page,'手市舞');await page.locator('.card').first().waitFor();
    assert.ok(await page.locator('.card').count()>1);
    await search(page,'"gesture-led dance"');await page.locator('.card').first().waitFor();
    await search(page,'比心');await wait(page.getByRole('heading',{name:'没有符合条件的视频'}));
    await page.getByRole('button',{name:'筛选',exact:true}).click();
    await page.getByRole('checkbox',{name:'同时检索候选标签'}).check();
    await page.getByRole('button',{name:'查看结果'}).click();
    await expectTotal(page,3);
    const open=page.locator('.card-main').first();await open.click();
    await wait(page.getByRole('dialog',{name:'视频详情'}));
    await wait(page.getByText('此条为虚构示例，没有可播放的真实视频。'));
    await wait(page.getByRole('heading',{name:'成片观察'}));
    await page.keyboard.press('Escape');
    await page.getByRole('dialog',{name:'视频详情'}).waitFor({state:'detached'});
    assert.ok(await open.evaluate(e=>document.activeElement===e),'detail restores the initiating focus');
    const status=await page.request.get(host.url+'media/video-demo-01-sa02-1.mp4');
    assert.equal(status.status(),404);assert.deepEqual(media,[]);
    const cross=await page.request.get(host.url+'data/catalog-meta.json',{headers:{'Sec-Fetch-Site':'cross-site'}});
    assert.equal(cross.status(),403);
    reports.push({target:'root',checks:['fiveColumns','themes','pagination','fullCatalogSearch','fuzzy','candidates','detailFocus','noPublicVideo']});
  });
  await visit('pages',{viewport:{width:390,height:844},colorScheme:'light',isMobile:true,hasTouch:true},async({page,host})=>{
    await page.goto(host.url+'#/videos?view=renditions&sort=latest&p=2');
    await expectTotal(page,67);
    await page.locator('.paging [aria-current=page]').filter({hasText:/^2$/}).waitFor();
    const first=await cardIds(page);assert.equal(first.length,24);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.reload();await expectTotal(page,67);
    assert.deepEqual(await cardIds(page),first,'direct Pages subpath survives refresh');
    await shot(page,'example-pages-mobile');
    await page.locator('.card-main').first().click();
    const panel=page.getByRole('dialog',{name:'视频详情'});
    await wait(panel);await wait(page.getByRole('heading',{name:'原片观察'}));
    const box=await panel.boundingBox();assert.ok(box&&box.width>=389&&box.x===0);
    await page.goBack();await panel.waitFor({state:'detached'});await expectTotal(page,67);
    assert.deepEqual(await cardIds(page),first);
    const wrong=await page.request.get(new URL('/data/catalog-meta.json',host.url).href);
    assert.equal(wrong.status(),404);
    reports.push({target:'pages',checks:['subpath','deepLinkReload','noHorizontalOverflow','fullScreenDetail','backRestoresPage']});
  });
  await visit('root',{viewport:{width:1280,height:800},colorScheme:'dark'},async({page,host})=>{
    await page.goto(host.url);await expectTotal(page,34);
    await page.locator('.wall[data-positioned=true]').waitFor();
    assert.equal(await page.locator('.card').evaluateAll(nodes=>new Set(nodes.slice(0,4).map(n=>Math.round(n.getBoundingClientRect().left))).size),4);
    assert.equal(await page.locator('.card').nth(4).evaluate(e=>e.getBoundingClientRect().top>e.parentElement.getBoundingClientRect().top),true);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await shot(page,'example-desktop-compact');
    reports.push({target:'root-compact',checks:['fourColumns','1280x800','noHorizontalOverflow']});
  });
  if(local)await visit('local',{viewport:{width:1440,height:900},colorScheme:'light'},async({page,host,media})=>{
    await page.goto(host.url);await expectTotal(page,2);
    assert.equal(host.report.playable,4);
    await page.locator('.card img').first().waitFor();
    await shot(page,'local-desktop-light');
    await page.getByRole('group',{name:'目录视图',exact:true}).getByRole('button',{name:'成片',exact:true}).click();
    await expectTotal(page,4);assert.equal((await cardIds(page)).length,4);
    const wall=await cardIds(page);
    const decoded=new Set();
    const dialog=page.getByRole('dialog',{name:'视频详情'});
    for(const [i,id] of wall.entries()) {
      const requestsBefore=media.length;
      await page.locator('[data-item="'+id+'"]').locator('.card-main').click();
      const play=page.getByRole('button',{name:'播放成片'});
      await wait(play);assert.equal(media.length,requestsBefore,'opening cards must not fetch video');
      if(i===0)await shot(page,'local-detail-before-play');
      await play.click();
      const video=page.locator('video');await wait(video);
      await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&v.readyState>=2&&v.currentTime>.15;},{},{timeout:12000});
      const details=await video.evaluate(v=>({duration:v.duration,src:v.currentSrc,width:v.videoWidth,height:v.videoHeight}));
      assert.ok(details.duration>14&&details.duration<16&&details.width&&details.height);
      assert.equal(new URL(details.src).pathname,'/media/'+id+'.mp4');
      decoded.add(details.src);
      if(i===0){
        const range=await page.request.get(details.src,{headers:{Range:'bytes=0-15'}});
        assert.equal(range.status(),206);assert.equal((await range.body()).length,16);
        const unavailable=await page.request.get(details.src,{headers:{Range:'bytes=999999999-'}});
        assert.equal(unavailable.status(),416);
        await video.evaluate(v=>{v.currentTime=8;});
        await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&!v.seeking&&v.currentTime>=8;},{},{timeout:10000});
        const next=page.locator('.detail-versions button[aria-pressed=false]').first();
        await wait(next);await next.click();
        await wait(page.getByRole('button',{name:'播放成片'}));assert.equal(await page.locator('video').count(),0);
      }
      await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});
      await expectTotal(page,4);
    }
    assert.equal(decoded.size,4);
    reports.push({target:'local',checks:['twoWorkCards','fourRenditions','gestureGatedPlayback','decodedAllFour','seek','rangeServing','variantStopsPlayback']});
  });
  console.log(JSON.stringify({status:'passed',reports,screenshots:out},null,2));
} finally {await browser.close();}
