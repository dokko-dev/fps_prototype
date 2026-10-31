import * as THREE from 'three';
import {mapBoxes,terrainVertices,groundHeight} from './shared.js';
import {dressBattlefield} from './battlefield.js';
import {surfaceTexture,groundMaterial} from './materials.js';
export function buildArena(id){
 const world=new THREE.Group();world.name=id;const textures=Object.fromEntries(['grass','soil','rock','concrete','metal'].map(kind=>[kind,surfaceTexture(kind)]));world.userData.textures=Object.values(textures);
 function box(x,y,z,w,h,d,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color,map:textures.concrete}));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;world.add(m);return m;}
 if(id==='bridge'){
 const water=box(0,-2.5,0,29,.3,14,'#3c8b9b');water.material.map=textures.metal;water.material.metalness=.35;water.material.roughness=.24;
 for(let n=-12;n<=12;n+=2)box(n,-2.32,0,.02,.01,13,'#75b4bc');
 box(0,-.25,10.75,29,.5,7.5,'#828b79');box(0,-.25,-10.75,29,.5,7.5,'#828b79');box(0,-.25,0,8.3,.5,14,'#596b77');
 for(const x of [-3.75,3.75])box(x,.008,0,.12,.015,14,'#d7b65e');
 for(const z of [-6,6]){for(const x of [-4.6,4.6]){box(x,2.8,z,.55,5.6,.55,'#b5bdac');box(x,-1.5,z,.8,3,.8,'#59666a');}box(0,5.4,z,9.7,.45,.55,'#a4afa1');}
 for(let z=-6;z<=6;z+=1.5){for(const x of [-4.4,4.4])box(x,1.5,z,.1,1.6,.1,'#acb3a6');box(0,.012,z,.14,.025,.7,'#d9c478');}
 for(const x of [-4.4,4.4])box(x,2.25,0,.12,.12,14,'#acb3a6');
 }else{
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(terrainVertices(id),3));geometry.computeVertexNormals();
 const vertices=geometry.getAttribute('position'),uv=[];for(let n=0;n<vertices.count;n++)uv.push((vertices.getX(n)+14)/28,(vertices.getZ(n)+14)/28);geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 const mesh=new THREE.Mesh(geometry,groundMaterial(id,textures));mesh.receiveShadow=true;world.add(mesh);
 if(id==='hills')for(const [x,z]of [[-12,-5],[-12,0],[12,3],[10,-10],[-12,8]]){
 const floor=groundHeight(id,x,z);box(x,floor+1,z,.3,2,.3,'#5d4d37');
 const crown=new THREE.Mesh(new THREE.ConeGeometry(1.1,2.8,7),new THREE.MeshLambertMaterial({color:0x3d664b}));crown.position.set(x,floor+2.6,z);world.add(crown);
 }
 if(id==='depot')for(let n=-12;n<=12;n+=3)box(n,groundHeight(id,n,-13)+.02,-13,.1,.04,1,'#e6c77c');
 }
 let index=0;
 for(const [x,y,z,w,h,d,kind]of mapBoxes(id)){
 const wall=w>=28||d>=28,container=id==='depot'&&!wall&&!kind;
 const color=kind?(kind==='stair'?'#8f9189':kind==='floor'?'#797d76':kind==='roof'?'#626e70':y<3?'#aaa591':'#b4b0a0'):wall?(id==='hills'?'#939b8c':id==='depot'?'#b1a38d':'#809197'):container?['#b56d44','#4e7b92','#81906a','#bd9146','#8b6470'][index%5]:h<1.5?'#9ca9ad':id==='hills'?'#8c9380':['#a2a79e','#818d97','#b39c79'][index%3];
 const m=box(x,y,z,w,h,d,color);
 if(container){m.material.map=textures.metal;m.material.metalness=.3;
 for(let a=-w/2+.18;a<w/2;a+=.42)box(x+a,y,z+d/2+.015,.045,h-.1,.035,color);
 for(const side of [-1,1])box(x,y+side*(h/2-.08),z,w+.05,.10,d+.05,'#4b5358');
 }else if(!kind&&wall){box(x,y-h/2+.45,z,w+.02,.9,d+.02,id==='bridge'?'#526775':id==='hills'?'#6d7864':'#867b68');box(x,y+h/2+.04,z,w+.12,.08,d+.12,'#c5c9bb');}
 else if(!kind){box(x,y+h/2+.025,z,w+.025,.05,d+.025,'#b7b4a3');}
 index++;
 }
 // Baked contact shading complements the directional shadow without extra lights.
 const aoCanvas=document.createElement('canvas');aoCanvas.width=aoCanvas.height=64;const ctx=aoCanvas.getContext('2d');const gradient=ctx.createRadialGradient(32,32,4,32,32,32);gradient.addColorStop(0,'rgba(15,22,26,.36)');gradient.addColorStop(1,'rgba(15,22,26,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);const aoTexture=new THREE.CanvasTexture(aoCanvas);world.userData.textures.push(aoTexture);
 for(const [x,y,z,w,h,d]of mapBoxes(id).filter(([, , ,w,,d,kind])=>!kind&&w<20&&d<20)){
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(w+1.8,d+1.8),new THREE.MeshBasicMaterial({map:aoTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));shadow.rotation.x=-Math.PI/2;shadow.position.set(x,groundHeight(id,x,z)+.015,z);world.add(shadow);
 }
 // Distant scenery stays outside the playable collision boundary.
 for(let n=0;n<9;n++){
 const angle=n*Math.PI*2/9,x=Math.cos(angle)*47,z=Math.sin(angle)*47;
 const hill=new THREE.Mesh(new THREE.ConeGeometry(11+(n%3)*3,10+(n%4)*3,6),new THREE.MeshLambertMaterial({color:id==='hills'?0x718677:id==='depot'?0xb3a18b:0x8c9c9d}));hill.position.set(x,1,z);world.add(hill);
 }

 for(const [x,z]of [[-10,11],[10,-11]]){const ring=new THREE.Mesh(new THREE.RingGeometry(.8,1,48),new THREE.MeshBasicMaterial({color:z>0?0x9bf0ff:0xffb58b,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(x,groundHeight(id,x,z)+.02,z);world.add(ring);}
 dressBattlefield(world,id,box,textures);batchStaticBoxes(world);return world;
}

// Collapse static boxes into a handful of instanced draws; color stays per instance.
export function batchStaticBoxes(world){
 const groups=new Map();
 world.traverse(mesh=>{if(!mesh.isMesh||mesh.geometry.type!=='BoxGeometry'||!(mesh.material.isMeshStandardMaterial||mesh.material.isMeshLambertMaterial))return;
 const m=mesh.material,key=[m.map?.uuid,m.bumpMap?.uuid,m.bumpScale,m.metalness,m.roughness,mesh.castShadow,mesh.receiveShadow].join('|');
 if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);
 });
 for(const meshes of groups.values()){
 if(meshes.length<2)continue;const material=meshes[0].material.clone();material.color.set(0xffffff);
 const batch=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,meshes.length);batch.castShadow=meshes[0].castShadow;batch.receiveShadow=meshes[0].receiveShadow;
 meshes.forEach((mesh,index)=>{const size=mesh.geometry.parameters;const matrix=new THREE.Matrix4().compose(mesh.position,mesh.quaternion,new THREE.Vector3(size.width,size.height,size.depth));batch.setMatrixAt(index,matrix);batch.setColorAt(index,mesh.material.color);world.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();});
 batch.computeBoundingSphere();world.add(batch);
 }
}
