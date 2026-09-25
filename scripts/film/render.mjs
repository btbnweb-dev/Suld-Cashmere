import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {frameState,COUNT,SAMPLES} from './storyboard.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const preview=process.argv.includes('--preview');
const out=path.join(root,'verification',preview?'candidate-preview':'candidate-sequence');
fs.mkdirSync(out,{recursive:true});
const frames=preview?SAMPLES:Array.from({length:COUNT},(_,i)=>i+1);
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
 await page.route('**/plates/*.png',route=>{
  const name=path.basename(new URL(route.request().url()).pathname);
  return route.fulfill({contentType:'image/png',body:fs.readFileSync(path.join(root,'sources/campaign',name))});
 });
 await page.goto(pathToFileURL(path.join(root,'scripts/film/compositor.html')).href);
 await page.evaluate(()=>window.__ready);
 for(const frame of frames) {
  await page.evaluate(state=>window.setFrame(state),frameState(frame));
  const png=await page.screenshot({animations:'disabled'});
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-i','pipe:0','-frames:v','1','-c:v','libwebp','-quality','78','-compression_level','6','-preset','photo',path.join(out,'frame-'+String(frame).padStart(4,'0')+'.webp')],{input:png});
  if(preview||frame%20===0) console.log('Rendered',frame,'/',COUNT);
 }
 const bytes=frames.reduce((sum,n)=>sum+fs.statSync(path.join(out,'frame-'+String(n).padStart(4,'0')+'.webp')).size,0);
 fs.writeFileSync(path.join(out,'render.json'),JSON.stringify({frames:frames.length,width:1600,height:900,quality:78,bytes},null,2));
 console.log(JSON.stringify({out,frames:frames.length,bytes}));
}finally{await browser.close();}
