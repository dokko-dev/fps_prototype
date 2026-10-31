import * as THREE from 'three';
// Small, deterministic textures: no downloads or per-frame texture generation.
const imageCache=new Map();
export function surfaceTexture(kind){
 if(imageCache.has(kind)){const t=new THREE.CanvasTexture(imageCache.get(kind));t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=2;return t;}
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');
 let seed=113;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const image=ctx.createImageData(256,256),base=kind==='grass'?[91,119,64]:kind==='soil'?[144,117,81]:kind==='rock'?[135,139,133]:[207,207,207];
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4;const grain=(random()-.5)*(kind==='metal'?18:48)+Math.sin(x*.12)*Math.cos(y*.09)*7;for(let c=0;c<3;c++)image.data[i+c]=Math.max(0,Math.min(255,base[c]+grain));image.data[i+3]=255;}
 ctx.putImageData(image,0,0);
 if(kind==='concrete'){ctx.strokeStyle='#8f928e66';ctx.lineWidth=1;for(let n=0;n<18;n++){const x=random()*256,y=random()*256;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+random()*20,y+random()*9);ctx.stroke();}}
 if(kind==='metal'){ctx.fillStyle='#858e9555';for(let x=0;x<256;x+=32){ctx.fillRect(x,0,3,256);ctx.fillStyle='#f1f3f333';ctx.fillRect(x+3,0,2,256);ctx.fillStyle='#858e9555';}}
 if(kind==='grass'){for(let n=0;n<1800;n++){ctx.strokeStyle=n%2?'#b4bd7244':'#394d3655';const x=random()*256,y=random()*256;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2,y-3-random()*4);ctx.stroke();}}
 imageCache.set(kind,canvas);const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;return texture;
}
export function groundMaterial(id,textures){
 const grass=textures.grass,soil=textures.soil,rock=textures.rock;for(const t of [grass,soil,rock])t.repeat.set(12,12);
 const material=new THREE.MeshLambertMaterial({color:0xffffff,map:grass});
 material.onBeforeCompile=shader=>{
 shader.uniforms.groundSoil={value:soil};shader.uniforms.groundRock={value:rock};shader.uniforms.isDepot={value:id==='depot'?1:0};
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 groundPosition; varying vec3 groundNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\ngroundPosition=position;groundNormal=normal;');
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 groundPosition;varying vec3 groundNormal;uniform sampler2D groundSoil;uniform sampler2D groundRock;uniform float isDepot;').replace('#include <map_fragment>',`vec3 grassColor=texture2D(map,vMapUv).rgb;
 vec3 soilColor=texture2D(groundSoil,vMapUv).rgb;
 vec3 rockColor=texture2D(groundRock,vMapUv).rgb;
 float path=1.0-smoothstep(.8,2.6,abs(groundPosition.x-1.5*sin(groundPosition.z*.32)));
 float slope=smoothstep(.012,.09,1.0-normalize(groundNormal).y);
 float heightBlend=smoothstep(1.6,2.8,groundPosition.y)*.3;
 vec3 ground=mix(grassColor,soilColor,max(path*.88,isDepot*.95));
 ground=mix(ground,rockColor,max(slope*.55,heightBlend)*(1.0-isDepot*.6));
 diffuseColor.rgb*=ground;`);
 };return material;
}
