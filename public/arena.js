import * as THREE from 'three';
import {mapBoxes,terrainVertices,groundHeight} from './shared.js';
export function buildArena(id){
 const world=new THREE.Group();
 function box(x,y,z,w,h,d,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.9}));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;world.add(m);return m;}
 if(id==='bridge'){
 box(0,-2.5,0,29,.3,14,'#307d8b');
 box(0,-.25,10.75,29,.5,7.5,'#828b79');box(0,-.25,-10.75,29,.5,7.5,'#828b79');box(0,-.25,0,8.3,.5,14,'#65727a');
 for(const z of [-6,6]){for(const x of [-4.6,4.6]){box(x,2.8,z,.55,5.6,.55,'#b5bdac');box(x,-1.5,z,.8,3,.8,'#59666a');}box(0,5.4,z,9.7,.45,.55,'#a4afa1');}
 for(let z=-6;z<=6;z+=1.5){for(const x of [-4.4,4.4])box(x,1.5,z,.1,1.6,.1,'#acb3a6');box(0,.012,z,.14,.025,.7,'#d9c478');}
 for(const x of [-4.4,4.4])box(x,2.25,0,.12,.12,14,'#acb3a6');
 }else{
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(terrainVertices(id),3));geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:id==='hills'?0x66805a:0x998366,roughness:1}));mesh.receiveShadow=true;world.add(mesh);
 if(id==='hills')for(const [x,z]of [[-12,-5],[-12,0],[12,3],[10,-10],[-12,8]]){
 const floor=groundHeight(id,x,z);box(x,floor+1,z,.3,2,.3,'#5d4d37');
 const crown=new THREE.Mesh(new THREE.ConeGeometry(1.1,2.8,7),new THREE.MeshStandardMaterial({color:0x3d664b}));crown.position.set(x,floor+2.6,z);world.add(crown);
 }
 if(id==='depot')for(let n=-12;n<=12;n+=3)box(n,groundHeight(id,n,-13)+.02,-13,.1,.04,1,'#e6c77c');
 }
 for(const [x,y,z,w,h,d]of mapBoxes(id))box(x,y,z,w,h,d,id==='depot'?'#7c6860':h<1.5?'#8b9696':'#7b806a');
 for(const [x,z]of [[-10,11],[10,-11]]){const ring=new THREE.Mesh(new THREE.RingGeometry(.8,1,48),new THREE.MeshBasicMaterial({color:z>0?0x9bf0ff:0xffb58b,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(x,groundHeight(id,x,z)+.02,z);world.add(ring);}
 return world;
}
