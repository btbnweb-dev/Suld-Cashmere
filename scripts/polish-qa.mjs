import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const out=path.resolve('verification/polish');
const browser=await chromium.launch();
const rows=[],failures=[],errors=[];
try {
 for(const width of [1440,1024,768,390,320]){
  const page=await browser.newPage({viewport:{width,height:width<=390?740:900},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4173');
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(1800);
  const distance=await page.evaluate(()=>document.querySelector('.pin-spacer').offsetHeight-document.querySelector('#film-stage').offsetHeight);
  for(const p of [.06,.19,.32,.44,.59,.75,.875,.99]){
   const y=await page.evaluate(()=>scrollY);
   await page.mouse.wheel(0,Math.round(p*distance)-y);await page.waitForTimeout(350);
   const state=await page.evaluate(()=>{
    const header=document.querySelector('header').getBoundingClientRect();
    const meta=document.querySelector('.nav-edition').getBoundingClientRect();
    const visible=[...document.querySelectorAll('[data-beat]')].filter(e=>Number(getComputedStyle(e).opacity)>.8);
    const heads=visible.map(e=>e.querySelector('.story-headline')).filter(Boolean);
    const bounds=heads.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,size:getComputedStyle(e).fontSize}});
    return {overflow:document.documentElement.scrollWidth>innerWidth,bounds,metaVisible:meta.width>0&&meta.right<=innerWidth&&meta.left>0,
     headerBottom:header.bottom,pin:document.querySelectorAll('.pin-spacer').length};
   });
   if(state.overflow||!state.metaVisible||state.pin!==1||state.bounds.some(b=>b.left<0||b.right>width+1||b.top<state.headerBottom||b.bottom>(width<=390?740:900)))failures.push({width,p,state});
   rows.push({width,p,...state});
   await page.screenshot({path:path.join(out,width+'-scene-'+p+'.png')});
  }
  await page.locator('#collection').scrollIntoViewIfNeeded();
  await page.locator('#collection img').evaluateAll(images=>images.forEach(im=>im.loading='eager'));
  await page.waitForFunction(()=>[...document.querySelectorAll('#collection img')].every(im=>im.complete&&im.naturalWidth));
  await page.locator('#collection img').evaluateAll(images=>Promise.all(images.map(im=>im.decode())));
  await page.waitForTimeout(150);
  await page.locator('#collection').screenshot({path:path.join(out,width+'-collection.png')});
  if(width<1024){
   await page.locator('button[aria-controls="mobile-nav"]').click();
   if(!await page.locator('#mobile-nav').isVisible())failures.push({width,menu:'did not open'});
   await page.screenshot({path:path.join(out,width+'-menu.png')});
   await page.locator('button[aria-controls="mobile-nav"]').click();
  }
  await page.close();console.log('Visual polish checked:',width);
 }
}finally{
 await browser.close();
 fs.writeFileSync(path.join(out,'ui-qa.json'),JSON.stringify({rows,failures,errors},null,2));
 console.log(JSON.stringify({failures,errors}));
 if(failures.length||errors.length)process.exitCode=1;
}
