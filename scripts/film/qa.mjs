import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=path.join(root,'verification/browser');
fs.mkdirSync(out,{recursive:true});
const url=process.env.SULD_QA_URL || 'http://127.0.0.1:5173';
const rows=[], errors=[], failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message)};
const hash=value=>createHash('sha256').update(value).digest('hex');
const browser=await chromium.launch();
async function snapshot(page){
 return page.evaluate(()=>{
  const stage=document.querySelector('#film-stage'),canvas=stage?.querySelector('canvas');
  const spacer=document.querySelector('.pin-spacer');
  const start=spacer?spacer.getBoundingClientRect().top+scrollY:0;
  const distance=spacer?spacer.offsetHeight-stage.offsetHeight:0;
  const progress=distance?Math.max(0,Math.min(1,(scrollY-start)/distance)):0;
  const shown=[...document.querySelectorAll('[data-beat]')].filter(el=>{
   const s=getComputedStyle(el);return Number(s.opacity)>.05 && s.visibility!=='hidden';
  }).map(el=>el.dataset.beat);
  return {width:innerWidth,height:innerHeight,y:scrollY,start,distance,progress,
   expected:Math.round(progress*159)+1,draw:window.__filmDraw,draws:window.__filmDraws,
   pixel:canvas?.toDataURL(),overflow:document.documentElement.scrollWidth>innerWidth,
   canvas:canvas?{width:canvas.width,height:canvas.height,clientWidth:canvas.clientWidth,clientHeight:canvas.clientHeight}:null,
   pins:document.querySelectorAll('.pin-spacer').length,shown,
   collectionTop:document.querySelector('#collection').getBoundingClientRect().top};
 });
}
async function move(page,y){
 await page.mouse.wheel(0,y-await page.evaluate(()=>scrollY));
 await page.waitForTimeout(350);
 return snapshot(page);
}
try{
 for(const width of [1440,1280,1024,768,390,320]){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:width<500?2:1});
  await context.addInitScript(()=>{
   window.__filmDraws=0;
   const draw=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(...args){
    const result=draw.apply(this,args);
    if(this.canvas.closest('#film-stage') && args[0] instanceof HTMLImageElement){
     window.__filmDraws++;
     window.__filmDraw={frame:Number(args[0].src.match(/frame-(\d+)/)?.[1]),args:args.slice(1),natural:[args[0].naturalWidth,args[0].naturalHeight]};
    }
    return result;
   };
  });
  const page=await context.newPage(),loaded=new Set();
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
  page.on('response',response=>{
   if(response.url().includes('/sequence/frame-')&&response.ok())loaded.add(response.url());
   if(response.status()>=400)errors.push(response.status()+' '+response.url());
  });
  await page.goto(url);
  await page.waitForFunction(()=>window.__filmDraw?.frame===1);
  for(let n=0;n<150&&loaded.size<160;n++)await page.waitForTimeout(100);
  check(loaded.size===160,width+': all 160 frames load');
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(700);
  const initial=await snapshot(page);
  check(initial.pins===1,width+': exactly one pin');
  check(Math.abs(initial.distance-(width<=900?8.2:14)*initial.height)<2,width+': preserved pacing');
  for(const p of [0,.25,.5,.75,1]){
   const state=await move(page,initial.start+p*initial.distance);
   check(state.draw.frame===state.expected,width+' at '+p+': direct frame mapping');
   check(!state.overflow,width+' at '+p+': horizontal overflow');
   check(state.shown.length<=1,width+' at '+p+': overlapping copy');
   check(state.collectionTop>=state.height-2,width+' at '+p+': collection before pin release');
   const [, ,dw,dh]=state.draw.args;
   check(Math.abs(dw/dh-1600/900)<.001 && dw>=state.canvas.clientWidth-.1 && dh>=state.canvas.clientHeight-.1,width+': canvas cover');
   const {pixel,...record}=state;rows.push({...record,pixelHash:hash(pixel),target:p});
   await page.screenshot({path:path.join(out,width+'-'+Math.round(p*100)+'.png')});
  }
  const stopped=await snapshot(page);await page.waitForTimeout(700);
  const later=await snapshot(page);
  check(stopped.draws===later.draws&&hash(stopped.pixel)===hash(later.pixel),width+': stop remains still');
  for(const p of [.75,.5,.25,0]){
   const state=await move(page,initial.start+p*initial.distance);
   const forward=rows.find(row=>row.width===width&&row.target===p);
   check(state.draw.frame===forward.draw.frame&&hash(state.pixel)===forward.pixelHash,width+' at '+p+': exact reverse pixels');
  }
  // Sample every caption window plus each boundary; no concurrent copy blocks.
  for(const p of [.06,.122,.14,.22,.25,.30,.375,.42,.512,.58,.675,.74,.814,.86,.94,.965]){
   const state=await move(page,initial.start+p*initial.distance);
   check(state.shown.length<=1,width+' at '+p+': caption overlap');
  }
  await move(page,initial.start+initial.distance+450);
  const released=await snapshot(page);
  check(released.collectionTop<released.height,width+': collection after release');
  await page.screenshot({path:path.join(out,width+'-collection.png')});
  await context.close();
  console.log('Wheel, reverse, stop, cover, copy, pin:',width);
 }
 for(const width of [1440,390,320]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(url);await page.evaluate(()=>document.fonts.ready);
  for(const image of await page.locator('#film img').all()){
   await image.scrollIntoViewIfNeeded();
   await image.evaluate(im=>new Promise((resolve,reject)=>{if(im.complete&&im.naturalWidth)return resolve();im.onload=resolve;im.onerror=reject;setTimeout(()=>reject(new Error('Still failed to load')),15000)}));
  }
  await page.evaluate(()=>scrollTo(0,0));
  const result=await page.evaluate(async()=>{
   const imgs=[...document.querySelectorAll('#film img')];
   await Promise.all(imgs.map(im=>im.decode()));
   return {pins:document.querySelectorAll('.pin-spacer').length,canvas:document.querySelectorAll('#film canvas').length,
    stills:imgs.map(im=>({src:im.getAttribute('src'),width:im.naturalWidth,alt:im.alt})),
    h1:document.querySelectorAll('h1').length,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  check(result.pins===0&&result.canvas===0&&result.stills.length===8&&result.h1===1&&!result.overflow,width+': reduced motion structure');
  check(result.stills.every(im=>im.width===1600&&im.alt),width+': fallback image decode and alt');
  rows.push({width,reducedMotion:result});
  await page.screenshot({path:path.join(out,width+'-reduced.png'),fullPage:true});
  await context.close();
 }
 check(errors.length===0,'No browser console, page, or HTTP errors');
}finally{
 await browser.close();
 const report={url,wheelInput:'Playwright browser mouse.wheel events; no physical mouse test',rows,errors,failures};
 fs.writeFileSync(path.join(root,'verification/browser-qa.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({checks:rows.length,errors,failures},null,2));
 if(failures.length)process.exitCode=1;
}
