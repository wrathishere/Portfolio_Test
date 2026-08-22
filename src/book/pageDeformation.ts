import * as THREE from 'three';
export function clamp01(v:number){ return Math.max(0, Math.min(1, v)); }
export function easeInOut(t:number){ return t*t*(3-2*t); }
export function deformPageGeometry(geometry: THREE.BufferGeometry, progress:number, direction:1|-1){
 const p=clamp01(progress), pos=geometry.attributes.position as THREE.BufferAttribute; const width=2.15; const lift=Math.sin(Math.PI*p); const turn=-Math.PI*p*direction; const curl=.55*lift; const baseX=direction>0?width/2:-width/2;
 for(let i=0;i<pos.count;i++){ const ox=(pos as any).array[i*3], oy=(pos as any).array[i*3+1]; const across=direction>0?(width/2-ox)/width:(ox+width/2)/width; const hingeDist=across*width; const angle=turn + curl*Math.pow(across,1.35)*direction; const radius=Math.max(.18, hingeDist); let x=baseX - direction*Math.sin(Math.abs(angle))*radius; let z=(1-Math.cos(angle))*radius + lift*Math.sin(Math.PI*across)*.34; let y=oy + Math.sin(Math.PI*across)*lift*.05; if(p>.86){ const settle=(p-.86)/.14; z*=1-settle; y*=1-settle*.25; } pos.setXYZ(i,x,y,z); }
 pos.needsUpdate=true; geometry.computeVertexNormals(); }
