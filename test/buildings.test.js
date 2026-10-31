import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BUILDING_SITES,buildingSolids} from '../public/buildings.js';
import {movePlayer,groundHeight,mapBoxes,mapBlocked,supportHeight,isGrounded,damageAtDistance,WEAPONS} from '../public/shared.js';
function walk(p,input,ticks,map='depot'){for(let n=0;n<ticks;n++)movePlayer(p,input,0,1/60,map);}
test('enter ground floor through door, climb real stairs, stay on upper floor and descend',()=>{
 const p={x:-8,z:5,y:0,vy:0,weapon:0};walk(p,{forward:true},25);assert.ok(p.z<4);assert.equal(p.y,0);
 walk(p,{right:true},26);assert.ok(p.x>-6.2);walk(p,{forward:true},95);assert.ok(Math.abs(p.y-3.2)<.01);assert.ok(p.z< -3.4);assert.ok(isGrounded(p,'depot'));
 walk(p,{left:true},26);assert.ok(p.x< -7.9);walk(p,{},90);assert.ok(Math.abs(p.y-3.2)<.01,'floor supports a standing player without falling through');
 // Jump under the roof: the player's head must not pass through it.
 walk(p,{jump:true},1);walk(p,{},120);assert.ok(Math.abs(p.y-3.2)<.01);
 walk(p,{right:true},26);walk(p,{back:true},95);walk(p,{},120);assert.ok(p.y<.25,'stairs descend to the ground floor');
});
test('door and both storey windows transmit rays while intact wall and floor block them',()=>{
 const boxes=buildingSolids('depot').filter(([x])=>x< -4).map(([x,y,z,w,h,d])=>new THREE.Box3(new THREE.Vector3(x-w/2,y-h/2,z-d/2),new THREE.Vector3(x+w/2,y+h/2,z+d/2)));
 function firstHit(origin,direction){const ray=new THREE.Ray(new THREE.Vector3(...origin),new THREE.Vector3(...direction));return Math.min(...boxes.map(box=>{const hit=ray.intersectBox(box,new THREE.Vector3());return hit?hit.distanceTo(ray.origin):Infinity;}));}
 assert.ok(firstHit([-8,1.65,6],[0,0,-1])>7,'door ray reaches interior/back door');
 assert.ok(firstHit([-9.875,1.65,6],[0,0,-1])>7,'lower window is an opening');
 assert.ok(firstHit([-9.875,4.85,6],[0,0,-1])>7,'upper window is an opening');
 assert.ok(firstHit([-8.95,1.65,6],[0,0,-1])<3,'wall pier blocks a bullet');
 assert.ok(firstHit([-8,1.65,0],[0,1,0])<1.6,'upper floor blocks upward shot');
 assert.equal(mapBlocked('depot',-11,0,0),true,'solid side wall stops walking');
 assert.equal(mapBlocked('depot',-8,4,0),false,'door has no invisible collision');assert.equal(mapBlocked('depot',-8,0,2.9),true,'feet below upper slab cannot clip through its interior');
});
test('every map has a traversable building and sniper/Vector balance is stronger',()=>{
 for(const map of ['bridge','hills','depot'])for(const b of BUILDING_SITES[map]){
 assert.ok(mapBoxes(map).some(row=>row[6]==='stair'));assert.ok(!mapBlocked(map,b.x,b.z+b.d/2,b.base));
 assert.ok(Math.abs(supportHeight(map,b.x-1,b.z,b.base+3.3)-(b.base+3.2))<.001);
 }
 assert.equal(damageAtDistance(8,60),55);assert.equal(damageAtDistance(9,60),80);assert.ok(WEAPONS[8].damage*2>=100);assert.ok(WEAPONS[4].recoil>=2.5);
});
