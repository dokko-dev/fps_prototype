import * as THREE from 'three';
import {WEAPONS} from './shared.js';
export function createGun(index){
 const w=WEAPONS[index],group=new THREE.Group(),pistol=w.type==='권총',shotgun=w.type==='샷건',sniper=w.type==='저격소총',smg=w.type==='기관단총';
 const metal=new THREE.MeshStandardMaterial({color:[0x283132,0x777f7c,0x384132,0x252d2e,0x293a3b,0x434d3d,0x414443,0x55625a,0x58614d,0x272c34][index],metalness:.6,roughness:.45});
 const dark=new THREE.MeshStandardMaterial({color:0x171e20,roughness:.7});const wood=new THREE.MeshStandardMaterial({color:0x805d3d});
 function part(x,y,z,a,b,c,mat=metal){const m=new THREE.Mesh(new THREE.BoxGeometry(a,b,c),mat);m.position.set(x,y,z);group.add(m);return m;}
 function tube(x,y,z,r,length,mat=dark){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,length,12),mat);m.rotation.x=Math.PI/2;m.position.set(x,y,z);group.add(m);return m;}
 const body=[.28,.34,.47,.43,.32,.47,.52,.40,.49,.58][index],barrel=[.17,.20,.52,.38,.22,.40,.46,.28,.58,.76][index];
 part(0,0,0,.12,pistol?.11:.14,body);
 const grip=part(0,-.13,.08,.09,.22,.12,dark);grip.rotation.x=-.22;
 const tip=-body/2-barrel;
 tube(0,.015,-body/2-barrel/2,.025,barrel);tube(0,.015,tip+.025,.035,.05);
 if(pistol){part(0,.075,-.04,index===1?.14:.10,index===1?.065:.045,index===1?.30:.23);part(0,.11,-.12,.035,.025,.025,dark);}
 else{
 part(0,-.03,.30,.12,.13,.23,index===6?wood:dark);part(0,-.02,.43,.15,.22,.045,dark);
 part(0,-.025,-body/2-.10,.14,.12,.22,index===2||index===6?wood:dark);
 if(shotgun){tube(0,-.06,-.34,.026,.38);if(index===3)part(0,-.18,-.04,.10,.23,.13);}
 else{const magazine=part(0,-.18,-.025,.08,.25,smg?.07:.14,dark);magazine.rotation.x=index===6?-.18:0;}
 if(sniper){part(0,.1,-.03,.06,.06,.24,dark);tube(0,.17,-.05,.06,.32);tube(0,.17,-.24,.075,.07);tube(0,.17,.13,.075,.07);tube(.095,.04,.13,.018,.08);}
 else if(!shotgun){
 part(-.055,.12,-.10,.025,.15,.035,dark);part(.055,.12,-.10,.025,.15,.035,dark);part(0,.20,-.10,.13,.025,.035,dark);
 const lens=new THREE.Mesh(new THREE.PlaneGeometry(.09,.12),new THREE.MeshBasicMaterial({color:0x78cec4,transparent:true,opacity:.12,side:THREE.DoubleSide}));lens.position.set(0,.135,-.10);group.add(lens);
 }
 }
 if(index===7)part(0,-.14,-.29,.055,.18,.065,dark);
 if(index===8){part(-.09,-.14,-.31,.025,.23,.03,dark).rotation.z=-.2;part(.09,-.14,-.31,.025,.23,.03,dark).rotation.z=.2;}
 if(index===9)part(.1,.03,.12,.10,.03,.04,dark);
 group.name=w.name;
 const flash=new THREE.Mesh(new THREE.SphereGeometry(.065,8,6),new THREE.MeshBasicMaterial({color:0xffe3a0}));flash.scale.z=2;flash.position.set(0,.015,tip-.04);flash.visible=false;group.add(flash);
 group.userData.flash=flash;return group;
}
export function disposeGroup(group){for(const texture of group.userData.textures||[])texture.dispose();group.traverse(m=>{if(m.isInstancedMesh)m.dispose();if(m.geometry)m.geometry.dispose();if(m.material){for(const material of Array.isArray(m.material)?m.material:[m.material])material.dispose();}});}
