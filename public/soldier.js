import * as THREE from 'three';
import {mergeParts} from './mesh-batch.js';
import {createGun} from './guns.js';
export function createSoldier(){
 const group=new THREE.Group(),uniform=new THREE.MeshLambertMaterial({color:0x6c745b}),armor=new THREE.MeshLambertMaterial({color:0x3e4d47}),skin=new THREE.MeshLambertMaterial({color:0xbba68b}),black=new THREE.MeshLambertMaterial({color:0x283031});
 function box(x,y,z,w,h,d,material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);group.add(mesh);return mesh;}
 box(0,1.05,0,.48,.62,.32,uniform);box(0,1.14,-.17,.46,.42,.09,armor);box(0,1.08,.19,.42,.48,.17,armor);
 for(const x of [-.14,0,.14])box(x,1.10,-.235,.10,.16,.055,uniform);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.22,10,7),skin);head.scale.set(1,1.15,.95);head.position.y=1.64;group.add(head);
 const helmet=new THREE.Mesh(new THREE.SphereGeometry(.255,10,6,0,Math.PI*2,0,Math.PI*.57),armor);helmet.position.y=1.71;group.add(helmet);
 box(0,1.68,-.19,.36,.09,.10,black);box(0,1.53,-.17,.28,.12,.09,uniform);box(0,.74,0,.46,.09,.33,black);
 const limbs=[];
 for(const sign of [-1,1]){
 const leg=new THREE.Group();leg.position.set(sign*.14,.72,0);const pants=new THREE.Mesh(new THREE.CylinderGeometry(.105,.085,.57,7),uniform);pants.position.y=-.25;leg.add(pants);const boot=new THREE.Mesh(new THREE.BoxGeometry(.18,.18,.28),black);boot.position.set(0,-.62,-.035);leg.add(boot);group.add(leg);limbs.push(leg);
 const arm=new THREE.Group();arm.position.set(sign*.30,1.34,0);const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(.09,.07,.42,7),uniform);sleeve.rotation.x=-.7;sleeve.position.set(0,-.15,-.09);arm.add(sleeve);const hand=new THREE.Mesh(new THREE.BoxGeometry(.12,.11,.15),black);hand.position.set(0,-.28,-.24);arm.add(hand);group.add(arm);
 }
 const rifle=createGun(5,{hands:false});rifle.position.set(.09,1.08,-.32);group.add(rifle);mergeParts(group);group.userData.legs=limbs;return group;
}
