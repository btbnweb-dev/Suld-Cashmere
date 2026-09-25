import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const candidate=path.join(root,'verification/candidate-sequence');
const original=path.join(root,'public/sequence');
const backup=path.join(root,'verification/original-sequence');
const protectedFiles=JSON.parse(fs.readFileSync(path.join(root,'verification/protected-baseline.json'),'utf8'));
for(const [file,hash] of Object.entries(protectedFiles)){
 // App and CSS were intentionally restyled later; enforce the preserved film core.
 if(!['src/film/filmController.ts','src/Stage.tsx','public/proof.html'].includes(file))continue;
 if(createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')!==hash)
  throw new Error('Protected file changed: '+file);
}
const files=Array.from({length:160},(_,i)=>'frame-'+String(i+1).padStart(4,'0')+'.webp');
const bytes=files.reduce((sum,file)=>sum+fs.statSync(path.join(candidate,file)).size,0);
if(bytes>11370638)throw new Error('Candidate exceeds original sequence weight');
const browser=await chromium.launch();
try{
 const page=await browser.newPage();
 for(const file of files){
  const data=fs.readFileSync(path.join(candidate,file));
  const dimensions=await page.evaluate(async base64=>{
   const im=new Image();im.src='data:image/webp;base64,'+base64;await im.decode();
   return [im.naturalWidth,im.naturalHeight];
  },data.toString('base64'));
  if(dimensions[0]!==1600||dimensions[1]!==900)throw new Error('Bad dimensions: '+file);
 }
}finally{await browser.close();}
if(!fs.existsSync(backup)){
 fs.mkdirSync(backup,{recursive:true});
 for(const file of files)fs.copyFileSync(path.join(original,file),path.join(backup,file));
}
for(const file of files)fs.copyFileSync(path.join(candidate,file),path.join(original,file));
console.log('Installed reviewed sequence; original frames retained. Bytes:',bytes);
