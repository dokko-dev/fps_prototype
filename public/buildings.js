// All geometry is shared by movement, bullets and rendering. Metres, Y up.
export const BUILDING_SITES={
 bridge:[{x:-6,z:-10.5,w:6,d:5,name:'NORTH WATCH',base:0}],
 hills:[{x:8,z:7,w:6,d:7,name:'RIDGE OUTPOST',base:.43}],
 depot:[{x:-8,z:0,w:6,d:8,name:'COMMAND 01',base:0},{x:8,z:0,w:6,d:8,name:'COMMAND 02',base:2.5}]
};
export function buildingSolids(map){
 const out=[];
 for(const b of BUILDING_SITES[map]||[]){
 const add=(x,y,z,w,h,d,kind='wall')=>out.push([b.x+x,b.base+y,b.z+z,w,h,d,kind]);
 // Foundations, upper floor around a stairwell, and a roof that stops bullets.
 add(0,-.10,0,b.w,.2,b.d,'floor');
 add(-.9,3.11,0,4.2,.18,b.d,'floor');add(2.8,3.11,0,.4,.18,b.d,'floor');
 for(const z of [-b.d/2+.35,b.d/2-.35])add(1.9,3.11,z,1.4,.18,.7,'floor');
 add(0,6.4,0,b.w+.18,.20,b.d+.18,'roof');
 // Front and back walls have real door/window holes, not transparent decals.
 const xs=[-3,-2.5,-1.25,-.8,.8,1.25,2.5,3],ys=[0,1.05,2.1,2.4,3.2,4.15,5.45,6.4];
 const hole=(x,y)=>Math.abs(x)<.8&&y<2.4||Math.abs(x)>1.25&&Math.abs(x)<2.5&&(y>1.05&&y<2.1||y>4.15&&y<5.45);
 for(const z of [-b.d/2,b.d/2])for(let j=0;j<ys.length-1;j++){
 let start=null;
 for(let i=0;i<xs.length;i++){
 const solid=i<xs.length-1&&!hole((xs[i]+xs[i+1])/2,(ys[j]+ys[j+1])/2);
 if(solid&&start===null)start=xs[i];
 if(!solid&&start!==null){add((start+xs[i])/2,(ys[j]+ys[j+1])/2,z,xs[i]-start,ys[j+1]-ys[j],.25);start=null;}
 }
 }
 for(const x of [-3,3])for(const floor of [0,3.2]){
 add(x,floor+.525,0,.25,1.05,b.d);add(x,floor+2.675,0,.25,1.05,b.d);
 for(const sign of [-1,1])add(x,floor+1.6,sign*(b.d/4+.55),.25,1.1,b.d/2-1.1);
 }
 for(const floor of [0,3.2]){add(-2.4,floor+.9,-1.2,.5,1.8,1.2,'equipment');add(-1.5,floor+.72,-b.d/2+.7,1.2,.08,.5,'equipment');}
 const run=b.d-1.4,steps=16;
 for(let n=0;n<steps;n++){const top=(n+1)*3.2/steps;add(1.9,top/2,b.d/2-.7-(n+.5)*run/steps,1.4,top,run/steps,'stair');}
 }
 return out;
}
