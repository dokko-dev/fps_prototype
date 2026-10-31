import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {WebSocket} from 'ws';
import {WEAPONS,speed,blocked} from '../public/shared.js';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(fn,timeout=8000){const start=Date.now();while(!fn()){if(Date.now()-start>timeout)throw Error('Timed out');await delay(20);}return fn();}
function connect(){return new Promise(resolve=>{const socket=new WebSocket('ws://127.0.0.1:3111');const c={socket,events:[],state:null,send:m=>socket.send(JSON.stringify(m))};socket.on('message',b=>{const m=JSON.parse(b);c.events.push(m);if(m.type==='state')c.state=m.players; if(m.type==='joined')c.id=m.id;});socket.on('open',()=>resolve(c));});}
test('10 distinct weapons, health-scale damage, weight and map collision',()=>{
 assert.equal(WEAPONS.length,10);assert.deepEqual(['권총','샷건','기관단총','소총','저격소총'].map(t=>WEAPONS.filter(w=>w.type===t).length),[2,2,1,3,2]);
 assert.ok(WEAPONS.every(w=>w.damage>=10&&w.damage<=20));for(const key of ['damage','recoil','weight'])assert.equal(new Set(WEAPONS.map(w=>w[key])).size,10);assert.ok(speed(0)>speed(9));assert.ok(speed(0,true)>speed(0));assert.ok(blocked(0,0));assert.ok(blocked(10,0),'canal cannot be walked on');assert.equal(blocked(0,6),false,'bridge deck is walkable');assert.ok(blocked(14,0));assert.equal(blocked(-10,11),false);
});
test('real multiplayer: rooms, movement, silent walk, sprint, jump, body/head damage, cadence, reload and respawn', {timeout:30000},async()=>{
 const proc=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3111'}});const sockets=[];
 try{await new Promise((resolve,reject)=>{proc.stdout.once('data',resolve);proc.once('error',reject);});
 const health=await fetch('http://127.0.0.1:3111/health');assert.equal(health.status,200);assert.deepEqual(await health.json(),{status:'ok'});
 const a=await connect();sockets.push(a);a.send({type:'join'});await wait(()=>a.id);const room=a.events.find(e=>e.type==='joined').code;
 a.send({type:'shoot'});await wait(()=>a.events.some(e=>e.type==='tracer'));assert.equal(a.events.find(e=>e.type==='tracer').ends.length,1);await delay(300);assert.equal(a.events.find(e=>e.type==='tracer').ends[0][2],-14,'tracer stops at arena wall');
 const bad=await connect();sockets.push(bad);bad.send({type:'join',code:'NOPE00'});await wait(()=>bad.events.some(e=>e.type==='error'));
 const b=await connect();sockets.push(b);b.send({type:'join',code:room});await wait(()=>b.id&&a.state?.length===2);
 const c=await connect();sockets.push(c);c.send({type:'join',code:room});await wait(()=>c.events.some(e=>e.type==='error'));
 const self=x=>x.state?.find(p=>p.id===x.id);
 await wait(()=>self(a)&&self(b));a.send({type:'input',yaw:Math.atan2(-20,22),pitch:0,input:{}});a.send({type:'shoot'});await delay(350);assert.equal(self(b).hp,100,'central cover blocks bullets');
 a.send({type:'input',yaw:0,pitch:0,input:{right:true}});b.send({type:'input',yaw:Math.PI,pitch:0,input:{left:true}});
 await wait(()=>self(b)?.x>13.3);b.send({type:'input',input:{}});await wait(()=>self(a)?.x>13.3);a.send({type:'input',input:{}});await delay(80);
 assert.equal(b.events.filter(e=>e.type==='sound'&&e.kind==='step').length,0,'walking is silent');
 const aim=()=>{const p=self(a),q=a.state.find(p=>p.id===b.id);return {yaw:Math.atan2(-(q.x-p.x),-(q.z-p.z)),dist:Math.hypot(q.x-p.x,q.z-p.z)};};
 a.send({type:'input',...aim(),pitch:Math.atan2(-.7,aim().dist),input:{}});a.send({type:'shoot'});await wait(()=>self(b).hp===86);assert.ok(b.events.some(e=>e.type==='tracer'&&e.id===a.id),'opponent receives shot paths');assert.equal(self(a).ammo,12);
 a.send({type:'shoot'});await delay(80);assert.equal(self(b).hp,86,'fire interval enforced');
 await delay(300);a.send({type:'input',yaw:aim().yaw,pitch:0,input:{}});a.send({type:'shoot'});await wait(()=>self(b).hp===58);
 a.send({type:'reload'});await wait(()=>self(a).reload);await wait(()=>!self(a).reload);assert.equal(self(a).ammo,15);
 for(let n=0;n<3;n++){a.send({type:'shoot'});await delay(300);}await wait(()=>self(b).hp===0);assert.equal(self(a).kills,1);await wait(()=>self(b).hp===100);
 a.send({type:'input',yaw:0,pitch:0,input:{forward:true,sprint:true,jump:true}});await wait(()=>self(a).y>.2);a.send({type:'input',input:{forward:true,sprint:true}});await wait(()=>b.events.some(e=>e.type==='sound'&&e.kind==='step'));a.send({type:'input',input:{}});
 a.send({type:'weapon',index:9});await wait(()=>self(a).weapon===9);assert.equal(self(a).reload,true);a.send({type:'shoot'});await wait(()=>a.events.some(e=>e.type==='shootBlocked'));await wait(()=>!self(a).reload);assert.equal(self(a).ammo,5);
 }finally{sockets.forEach(c=>c.socket.close());proc.kill();}
});
