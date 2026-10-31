import express from 'express';
import {createServer} from 'node:http';
import {WebSocketServer,WebSocket} from 'ws';
import {randomBytes} from 'node:crypto';
import * as THREE from 'three';
import {WEAPONS,BOXES,speed,blocked} from './public/shared.js';
const app=express();app.use(express.static('public'));app.use('/vendor',express.static('node_modules/three/build'));
const server=createServer(app),wss=new WebSocketServer({server}),rooms=new Map();
const send=(ws,data)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data));};
const broadcast=(room,data)=>room.players.forEach(p=>send(p.ws,data));
function reset(p,index){Object.assign(p,{x:index?10:-10,z:index? -11:11,y:0,vy:0,yaw:index?Math.PI:0,pitch:0,hp:100,ammo:WEAPONS[p.weapon].mag,reload:0,input:{},lastShot:0});}
const walls=BOXES.map(([x,y,z,w,h,d])=>new THREE.Box3(new THREE.Vector3(x-w/2,y-h/2,z-d/2),new THREE.Vector3(x+w/2,y+h/2,z+d/2)));
wss.on('connection',ws=>{
 let player,room;let count=0,windowStart=Date.now();
 ws.on('message',raw=>{try{
 if(Date.now()-windowStart>1000){count=0;windowStart=Date.now();}if(++count>150||raw.length>2000)return;
 const m=JSON.parse(raw);
 if(m.type==='join'&&!room){
 const code=String(m.code||'').trim().toUpperCase();
 if(code){room=rooms.get(code);if(!room)return send(ws,{type:'error',message:'존재하지 않는 방 코드입니다.'});if(room.players.length>=2){room=undefined;return send(ws,{type:'error',message:'이미 두 명이 접속한 방입니다.'});}}
 else{const id=randomBytes(3).toString('hex').toUpperCase();room={code:id,players:[]};rooms.set(id,room);}
 player={id:randomBytes(6).toString('hex'),ws,weapon:0,kills:0};reset(player,room.players.length);room.players.push(player);send(ws,{type:'joined',id:player.id,code:room.code});return;
 }
 if(!player)return;
 if(m.type==='input'){
 const i=m.input||{};player.input={forward:!!i.forward,back:!!i.back,left:!!i.left,right:!!i.right,sprint:!!i.sprint};
 if(Number.isFinite(m.yaw))player.yaw=m.yaw%(Math.PI*2);
 if(Number.isFinite(m.pitch))player.pitch=Math.max(-1.45,Math.min(1.45,m.pitch));
 if(i.jump&&player.y===0&&player.hp>0)player.vy=6;
 }
 if(m.type==='weapon'&&Number.isInteger(m.index)&&WEAPONS[m.index]&&player.weapon!==m.index){player.weapon=m.index;player.ammo=WEAPONS[m.index].mag;player.reload=Date.now()+1200;}
 if(m.type==='reload'&&player.ammo<WEAPONS[player.weapon].mag&&!player.reload)player.reload=Date.now()+1600;
 if(m.type==='shoot')shoot(player,room);
 }catch{}});
 ws.on('close',()=>{if(room&&player){room.players=room.players.filter(p=>p!==player);if(!room.players.length)rooms.delete(room.code);}});
});
function shoot(p,room){
 const now=Date.now(),w=WEAPONS[p.weapon];if(p.hp<=0||p.reload||p.ammo<=0||now-p.lastShot<w.interval||room.players.length<2)return;
 p.ammo--;p.lastShot=now;let hit=false,head=false;
 for(let n=0;n<(w.pellets||1);n++){
 const yaw=p.yaw+(Math.random()-.5)*(w.spread||0),pitch=p.pitch+(Math.random()-.5)*(w.spread||0);
 const origin=new THREE.Vector3(p.x,p.y+1.65,p.z),direction=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
 const ray=new THREE.Ray(origin,direction);let nearest=100, victim,critical=false;
 for(const box of walls){const point=ray.intersectBox(box,new THREE.Vector3());if(point)nearest=Math.min(nearest,point.distanceTo(origin));}
 for(const other of room.players){if(other===p||other.hp<=0)continue;
 const body=new THREE.Box3(new THREE.Vector3(other.x-.32,other.y,other.z-.32),new THREE.Vector3(other.x+.32,other.y+1.9,other.z+.32));
 const point=ray.intersectBox(body,new THREE.Vector3());if(point&&point.distanceTo(origin)<nearest){nearest=point.distanceTo(origin);victim=other;critical=point.y>other.y+1.4;}}
 if(victim){hit=true;head ||= critical;victim.hp=Math.max(0,victim.hp-(w.damage/(w.pellets||1))*(critical?2:1));if(!victim.hp){p.kills++;victim.respawn=now+3000;broadcast(room,{type:'kill',killer:p.id,head:critical});}}
 }
 send(p.ws,{type:'shot',hit,head,recoil:w.recoil});
 broadcast(room,{type:'sound',x:p.x,z:p.z,kind:'shot',id:p.id});
}
setInterval(()=>{
 const now=Date.now(),dt=1/30;
 for(const room of rooms.values()){
 for(const [index,p] of room.players.entries()){
 if(p.hp<=0){if(now>=p.respawn)reset(p,index);continue;}
 if(p.reload&&now>=p.reload){p.reload=0;p.ammo=WEAPONS[p.weapon].mag;}
 const i=p.input;let f=Number(i.forward||false)-Number(i.back||false),r=Number(i.right||false)-Number(i.left||false),l=Math.hypot(f,r)||1;
 f/=l;r/=l;const v=speed(p.weapon,i.sprint)*dt;
 const dx=(-Math.sin(p.yaw)*f+Math.cos(p.yaw)*r)*v,dz=(-Math.cos(p.yaw)*f-Math.sin(p.yaw)*r)*v;
 if(!blocked(p.x+dx,p.z))p.x+=dx;if(!blocked(p.x,p.z+dz))p.z+=dz;
 p.vy-=16*dt;p.y=Math.max(0,p.y+p.vy*dt);if(p.y===0)p.vy=0;
 if(i.sprint&&(f||r)&&p.y===0&&now-(p.step||0)>340){p.step=now;broadcast(room,{type:'sound',x:p.x,z:p.z,kind:'step',id:p.id});}
 }
 for(const p of room.players)send(p.ws,{type:'state',players:room.players.map(o=>({id:o.id,x:o.x,y:o.y,z:o.z,yaw:o.yaw,hp:Math.ceil(o.hp),kills:o.kills,weapon:o.weapon,...(o===p?{ammo:o.ammo,reload:!!o.reload}: {})}))});
 }
},1000/30);
server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('BLINDSPOT listening on port '+(process.env.PORT||3000)));
