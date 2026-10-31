export const WEAPONS = [
 {name:'P9 · 서비스',type:'권총',damage:14,recoil:1.3,weight:0.9,interval:270,mag:15},
 {name:'P45 · 헤비',type:'권총',damage:12,recoil:2.1,weight:1.3,interval:400,mag:10},
 {name:'SG12 · 펌프',type:'샷건',damage:18,recoil:4,weight:3.7,interval:950,mag:6,pellets:5,spread:0.065},
 {name:'SG8 · 택티컬',type:'샷건',damage:16,recoil:3,weight:3.2,interval:650,mag:8,pellets:4,spread:0.08},
 {name:'SM9 · 벡터',type:'기관단총',damage:10,recoil:0.8,weight:2.2,interval:100,mag:30,auto:true},
 {name:'AR4 · 밸런스',type:'소총',damage:15,recoil:1.4,weight:3.1,interval:160,mag:30,auto:true},
 {name:'AR7 · 임팩트',type:'소총',damage:17,recoil:2.2,weight:3.8,interval:220,mag:24,auto:true},
 {name:'AR5 · 라이트',type:'소총',damage:13,recoil:1.1,weight:2.7,interval:130,mag:30,auto:true},
 {name:'SR2 · 스카우트',type:'저격소총',damage:19,recoil:2.8,weight:4.2,interval:750,mag:10},
 {name:'SR8 · 볼트',type:'저격소총',damage:20,recoil:4.5,weight:5.4,interval:1100,mag:5}
];
// BRIDGE YARD: two bases linked by a protected bridge over a canal.
export const BOXES = [
 [0,1.25,0,3,2.5,3],
 [-6,1.5,8,2,3,2],[6,1.5,-8,2,3,2],
 [5,1.3,12.5,3,2.6,1],[-5,1.3,-12.5,3,2.6,1],
 [-2.8,1,4,1.4,2,2],[2.8,1,-4,1.4,2,2],
 [-4.4,.6,0,.5,1.2,14],[4.4,.6,0,.5,1.2,14],
 [0,2,-14.5,30,4,1],[0,2,14.5,30,4,1],
 [-14.5,2,0,1,4,30],[14.5,2,0,1,4,30]
];
export const speed = (weapon, sprint=false) => (4.6-WEAPONS[weapon].weight*0.28)*(sprint?1.65:1);
export function blocked(x,z){return Math.abs(x)>13.5||Math.abs(z)>13.5||(Math.abs(z)<7.35&&Math.abs(x)>3.8)||BOXES.some(([bx,,bz,w,,d])=>Math.abs(x-bx)<w/2+0.35&&Math.abs(z-bz)<d/2+0.35);}

export const MAPS = [
 {id:'bridge',name:'BRIDGE YARD · 다리',description:'운하 위 중앙 다리와 양쪽 진영'},
 {id:'hills',name:'GREEN RIDGE · 언덕',description:'완만한 능선과 바위 엄폐물'},
 {id:'depot',name:'DUST DEPOT · 훈련장',description:'경사 지형과 컨테이너 교전'}
];
export function validMap(id){return MAPS.some(m=>m.id===id)?id:'bridge';}
function rawHeight(id,x,z){
 if(id==='hills')return 2.6*Math.exp(-((x+2)**2+(z-1)**2)/65)+1.3*Math.exp(-((x-9)**2+(z+7)**2)/28);
 if(id==='depot')return Math.max(0,Math.min(2.5,(x+4)*.22));
 return 0;
}
// Use the same triangulated one-metre surface for physics, rendering and hits.
export function groundHeight(id,x,z){
 const ix=Math.max(-14,Math.min(13,Math.floor(x))),iz=Math.max(-14,Math.min(13,Math.floor(z)));
 const u=Math.max(0,Math.min(1,x-ix)),v=Math.max(0,Math.min(1,z-iz));
 const a=rawHeight(id,ix,iz),b=rawHeight(id,ix+1,iz),c=rawHeight(id,ix,iz+1),d=rawHeight(id,ix+1,iz+1);
 return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
}
export function terrainVertices(id){const result=[];for(let x=-14;x<14;x++)for(let z=-14;z<14;z++)for(const [a,b]of [[x,z],[x,z+1],[x+1,z],[x+1,z],[x,z+1],[x+1,z+1]])result.push(a,rawHeight(id,a,b),b);return result;}
const boxCache=new Map();
export function mapBoxes(id){
 if(boxCache.has(id))return boxCache.get(id);
 if(id==='bridge')return BOXES;
 const cover=id==='hills'?[[0,1,0,2,2,2],[-6,1.2,4,3,2.4,2],[5,1.2,-3,2,2.4,3],[-5,1,-7,3,2,2],[7,1,7,3,2,2]]:
 [[0,1.5,0,3,3,3],[-6,1.5,4,3,3,5],[6,1.5,-4,3,3,5],[-5,1,-8,3,2,2],[5,1,8,3,2,2]];
 const result=[...cover,...BOXES.slice(-4)].map(([x,y,z,w,h,d])=>[x,y+groundHeight(id,x,z),z,w,h,d]);boxCache.set(id,result);return result;
}
export function mapBlocked(id,x,z){return Math.abs(x)>13.5||Math.abs(z)>13.5||(id==='bridge'&&Math.abs(z)<7.35&&Math.abs(x)>3.8)||mapBoxes(id).some(([bx,,bz,w,,d])=>Math.abs(x-bx)<w/2+.35&&Math.abs(z-bz)<d/2+.35);}
export function movePlayer(p,input,yaw,dt,map='bridge'){
 let f=Number(!!input.forward)-Number(!!input.back),r=Number(!!input.right)-Number(!!input.left);const length=Math.hypot(f,r)||1;f/=length;r/=length;
 const v=speed(p.weapon,input.sprint)*(input.ads?.72:1)*dt;
 const dx=(-Math.sin(yaw)*f+Math.cos(yaw)*r)*v,dz=(-Math.cos(yaw)*f-Math.sin(yaw)*r)*v;
 if(!mapBlocked(map,p.x+dx,p.z))p.x+=dx;if(!mapBlocked(map,p.x,p.z+dz))p.z+=dz;
 const floor=groundHeight(map,p.x,p.z),grounded=p.y<=floor+.08&&p.vy<=0;
 if(input.jump&&grounded)p.vy=6;
 p.vy-=16*dt;p.y=Math.max(floor,p.y+p.vy*dt);if(p.y<=floor)p.vy=0;
}
export function damageAtDistance(index,distance){
 const w=WEAPONS[index];if(w.type==='저격소총')return w.damage;const profile=w.type==='권총'?[8,28,.35]:w.type==='샷건'?[7,23,.25]:w.type==='기관단총'?[10,32,.45]:[16,55,.65];
 const [start,end,min]=profile,t=Math.max(0,Math.min(1,(distance-start)/(end-start)));
 return w.damage*(1-t*(1-min));
}
export function shotSpread(index,input,airborne=false){
 const w=WEAPONS[index],moving=input.forward||input.back||input.left||input.right;
 // Full cone width in radians. ADS never removes movement or jump penalties.
 return (w.spread||0)*(input.ads?.7:1)+(moving?(input.sprint?.10:.055):0)+(airborne?.12:0);
}
