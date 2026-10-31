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
