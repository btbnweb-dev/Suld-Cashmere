// Offline art direction only. Runtime scroll mapping lives in filmController.ts.
export const COUNT = 160;
export const SAMPLES = [1,20,40,60,80,100,120,140,160];
const clamp = x => Math.max(0, Math.min(1, x));
const ease = x => { x=clamp(x); return x*x*(3-2*x); };
const mix = (a,b,t) => a+(b-a)*t;
const ramp = (f,a,b) => ease((f-a)/(b-a));
const plate = (name,s,cx=.5,cy=.5,extra={}) => ({name,s,cx,cy,...extra});

// Every camera is evaluated at the absolute frame: deterministic forwards and backwards.
// Lower layer stays opaque; only the upper layer is spatially revealed (no exposure dip).
export function frameState(f) {
  const raw = plate('raw',mix(1.02,1.50,ramp(f,1,42)),mix(.49,.53,ramp(f,1,42)),.50);
  const yarn = plate('yarn',mix(1.34,1.04,ramp(f,35,63)),.5,.47);
  const weave = plate('weave',mix(1.40,1.03,ramp(f,56,87)),mix(.40,.52,ramp(f,56,87)),.5);
  const fabric = plate('fabric',mix(1.65,1.06,ramp(f,78,111)),.5,.5,{flip:true});
  let scale,cy;
  if(f<=130) { const t=ramp(f,103,130); scale=mix(3.3,1.65,t); cy=mix(.54,.32,t); }
  else { const t=ramp(f,130,154); scale=mix(1.65,1.02,t); cy=mix(.32,.50,t); }
  const campaign = plate('campaign',scale,.511,cy);
  let base=raw, top=null, mask=null;
  if(f>=35 && f<44) {top=yarn;mask={kind:'thread',t:ramp(f,35,44)};}
  else if(f>=44 && f<56) base=yarn;
  else if(f>=56 && f<65) {base=yarn;top=weave;mask={kind:'thread',t:ramp(f,56,65)};}
  else if(f>=65 && f<78) base=weave;
  else if(f>=78 && f<88) {base=weave;top=fabric;mask={kind:'diagonal',t:ramp(f,78,88)};}
  else if(f>=88 && f<103) base=fabric;
  else if(f>=103 && f<114) {base=fabric;top=campaign;mask={kind:'fold',t:ramp(f,103,114)};}
  else if(f>=114) base=campaign;
  return {base,top,mask};
}
