import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {WebSocket} from 'ws';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(fn,ms=7000){const start=Date.now();while(!fn()){if(Date.now()-start>ms)throw Error('Timed out waiting for building route');await delay(15);}}
function connect(){return new Promise(resolve=>{const socket=new WebSocket('ws://127.0.0.1:3112'),p={socket,events:[],send:m=>socket.send(JSON.stringify(m))};socket.on('message',bytes=>{const m=JSON.parse(bytes);p.events.push(m);if(m.type==='joined'){p.id=m.id;p.code=m.code;}if(m.type==='state')p.self=m.players.find(x=>x.id===p.id);});socket.on('open',()=>resolve(p));});}
async function walk(p,input,condition){p.send({type:'input',yaw:0,pitch:0,input});await wait(()=>condition(p.self));p.send({type:'input',yaw:0,pitch:0,input:{}});await delay(60);}
test('server-authoritative second-floor climb and sniper shot through an upper window', {timeout:45000},async()=>{
 const proc=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3112'}});const clients=[];
 try{
 await new Promise((resolve,reject)=>{proc.stdout.once('data',resolve);proc.once('error',reject);});
 const a=await connect();clients.push(a);a.send({type:'join',map:'depot'});await wait(()=>a.self);
 const b=await connect();clients.push(b);b.send({type:'join',code:a.code});await wait(()=>b.self);
 await Promise.all([
 (async()=>{await walk(a,{right:true},p=>p?.x>=-8);await walk(a,{forward:true},p=>p?.z<=3.2);await walk(a,{right:true},p=>p?.x>=-6.1);await walk(a,{forward:true},p=>p?.z<=-3.4);assert.ok(a.self.y>3.15);await walk(a,{left:true},p=>p?.x<=-8);await walk(a,{back:true},p=>p?.z>=1);await walk(a,{left:true},p=>p?.x<=-9.8);await walk(a,{back:true},p=>p?.z>=3.3);})(),
 (async()=>{await walk(b,{left:true},p=>p?.x<=-12);await walk(b,{back:true},p=>p?.z>=10);await walk(b,{right:true},p=>p?.x>=-9.8);})()
 ]);
 assert.ok(a.self.y>3.15&&a.self.y<3.25);assert.ok(b.self.y<.1);
 a.send({type:'weapon',index:8});await wait(()=>a.self.weapon===8&&!a.self.reload);
 const dx=b.self.x-a.self.x,dz=b.self.z-a.self.z,distance=Math.hypot(dx,dz);
 a.send({type:'input',yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(b.self.y+.9-(a.self.y+1.65),distance),input:{ads:true}});a.send({type:'shoot'});
 await wait(()=>b.self.hp<100);assert.equal(b.self.hp,45);assert.ok(b.events.some(e=>e.type==='hurt'));
 }finally{for(const p of clients)p.socket.close();proc.kill();}
});
