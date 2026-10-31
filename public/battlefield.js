import * as THREE from 'three';
import {BUILDING_SITES} from './buildings.js';
import {groundHeight} from './shared.js';
export function dressBattlefield(world,map,box,textures){
 for(const [index,b]of (BUILDING_SITES[map]||[]).entries()){
 // Window/door trim follows the holes in the collision geometry.
 for(const sign of [-1,1]){
 const z=b.z+sign*(b.d/2+.025);
 for(const floor of [0,3.2])for(const offset of [-1.875,1.875]){
 const bottom=floor===0?1.05:4.15,top=floor===0?2.1:5.45;
 for(const x of [offset-.625,offset+.625])box(b.x+x,b.base+(bottom+top)/2,z,.065,top-bottom,.10,'#485054');
 for(const y of [bottom,top])box(b.x+offset,b.base+y,z,1.32,.065,.12,'#697579');
 box(b.x+offset,b.base+bottom-.10,z+sign*.07,1.45,.12,.3,'#8c8980');
 }
 for(const x of [-.85,.85])box(b.x+x,b.base+1.18,z,.12,2.36,.12,'#485354');
 box(b.x,b.base+2.44,z,1.82,.12,.12,'#485354');
 box(b.x,b.base+3.25,z,b.w,.16,.10,'#7c817c');
 }
 // A worn parapet, floor edging, stair nosings and interior equipment.
 for(const z of [-b.d/2,b.d/2])box(b.x,b.base+6.66,b.z+z,b.w+.25,.35,.22,'#747773');
 for(let n=0;n<16;n++){const run=b.d-1.4;box(b.x+1.9,b.base+(n+1)*.2+.008,b.z+b.d/2-.7-n*run/16-.015,1.38,.018,.035,n%4===0?'#c0a567':'#a4a297');}
 // Signage is a tiny cached canvas texture, not a downloaded asset.
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const ctx=canvas.getContext('2d');ctx.fillStyle='#263539';ctx.fillRect(0,0,256,64);ctx.fillStyle='#d0c3a0';ctx.font='bold 25px monospace';ctx.textAlign='center';ctx.fillText(b.name,128,40);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;world.userData.textures.push(texture);
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.4,.6),new THREE.MeshBasicMaterial({map:texture}));sign.position.set(b.x,b.base+2.82,b.z+b.d/2+.135);world.add(sign);
 }
 // Small debris stays below step height. Large cover remains in shared collisions.
 let seed=73;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let n=0;n<36;n++){
 const x=(random()-.5)*25,z=(random()-.5)*25;
 if(map==='bridge'&&Math.abs(z)<7.5&&Math.abs(x)>3.6)continue;
 if((BUILDING_SITES[map]||[]).some(b=>Math.abs(x-b.x)<b.w/2+.5&&Math.abs(z-b.z)<b.d/2+.5))continue;
 const size=.10+random()*.28;const m=box(x,groundHeight(map,x,z)+.04,z,size,.08,size*.65,['#77776c','#9a8d79','#5a615d'][n%3]);m.rotation.y=random()*Math.PI;
 }
 // Distant silhouettes add a ruined street without costly transparent effects.
 for(let n=0;n<8;n++){
 const x=(n-3.5)*8,z=n%2?-29:29,h=7+(n%3)*3;
 box(x,h/2-1,z,5,h,5,n%2?'#6c7777':'#8c8d84');
 for(let y=2;y<h-1;y+=2)for(const offset of [-1.3,1.3])box(x+offset,y,z+(z>0?-2.51:2.51),.8,1,.025,'#313e41');
 }
}
