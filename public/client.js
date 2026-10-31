import * as THREE from 'three';
import {WEAPONS,BOXES,speed} from './shared.js';
const $=id=>document.getElementById(id),canvas=$('game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.toneMapping=THREE.ACESFilmicToneMapping;
const scene=new THREE.Scene();scene.background=new THREE.Color('#9bab9c');scene.fog=new THREE.Fog('#9bab9c',25,65);
const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.05,100);camera.rotation.order='YXZ';
scene.add(new THREE.HemisphereLight(0xdbe6cf,0x38463d,2));const sun=new THREE.DirectionalLight(0xffedc8,3);sun.position.set(-8,20,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-20;sun.shadow.camera.right=20;sun.shadow.camera.top=20;sun.shadow.camera.bottom=-20;scene.add(sun);
function box(x,y,z,w,h,d,color){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.85}));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;}
// A canal separates the bases; the center deck is the only crossing.
box(0,-2.5,0,29,.3,14,'#307d8b');
box(0,-.25,10.75,29,.5,7.5,'#828b79');box(0,-.25,-10.75,29,.5,7.5,'#828b79');
box(0,-.25,0,8.3,.5,14,'#65727a');
for(const [x,y,z,w,h,d]of BOXES){box(x,y,z,w,h,d,h<1.5?'#8b9696':'#7b806a');}
// Bridge pylons, overhead beams and suspension cables (decoration).
for(const z of [-6,6]){
 for(const x of [-4.6,4.6]){box(x,2.8,z,.55,5.6,.55,'#b5bdac');box(x,-1.5,z,.8,3,.8,'#59666a');}
 box(0,5.4,z,9.7,.45,.55,'#a4afa1');
}
for(let z=-6;z<=6;z+=1.5){box(-4.4,1.5,z,.1,1.6,.1,'#acb3a6');box(4.4,1.5,z,.1,1.6,.1,'#acb3a6');box(0,.012,z,.14,.025,.7,'#d9c478');}
for(const x of [-4.4,4.4])box(x,2.25,0,.12,.12,14,'#acb3a6');
for(const [x,z]of [[-10,11],[10,-11]]){const ring=new THREE.Mesh(new THREE.RingGeometry(.8,1,48),new THREE.MeshBasicMaterial({color:z>0?0x9bf0ff:0xffb58b,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(x,.02,z);scene.add(ring);}
const gun=new THREE.Group();camera.add(gun);scene.add(camera);
const gunMat=new THREE.MeshStandardMaterial({color:0x222b26,metalness:.65,roughness:.35});
function gunPart(w,h,d,x,y,z,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),color?new THREE.MeshStandardMaterial({color}):gunMat);m.position.set(x,y,z);gun.add(m);}
gunPart(.13,.16,.45,.26,-.23,-.43);gunPart(.11,.2,.13,.26,-.36,-.27);gunPart(.075,.075,.35,.26,-.20,-.73);gunPart(.14,.035,.22,.26,-.14,-.38,0xb6c49b);gunPart(.18,.14,.25,.26,-.4,-.18,0x566344);
const flash=new THREE.Mesh(new THREE.SphereGeometry(.085,8,6),new THREE.MeshBasicMaterial({color:0xffe3a0}));flash.position.set(.26,-.2,-.93);flash.visible=false;gun.add(flash);
let flashUntil=0;const tracers=[];
function showTracers(event){
 const own=event.id===myId;
 if(own){flash.visible=true;flashUntil=performance.now()+80;canvas.dataset.shots=String(Number(canvas.dataset.shots||0)+1);}
 for(const endpoint of event.ends){
 const start=new THREE.Vector3(...event.origin);
 if(own){camera.updateMatrixWorld();gun.updateMatrixWorld();flash.getWorldPosition(start);}
 const geometry=new THREE.BufferGeometry().setFromPoints([start,new THREE.Vector3(...endpoint)]);
 const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:own?0xffe7a1:0xffb96b,transparent:true,opacity:.9}));
 scene.add(line);tracers.push({line,expires:performance.now()+120});
 }
}
let ws,myId,code,players=[],me,yaw=0,pitch=0,keys={},firing=false,lastFire=0,hasSemi=false,recoil=0,noticeTimer,hitTimer,audio;
const opponents=new Map();
function message(text){$('notice').textContent=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').textContent='',2600);}
function send(data){if(ws?.readyState===1)ws.send(JSON.stringify(data));}
function join(value){if(ws?.readyState===0)return;let joined=false;$('error').textContent='서버에 연결하는 중…';ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}`);ws.onopen=()=>send({type:'join',code:value});ws.onmessage=e=>{const m=JSON.parse(e.data);
 if(m.type==='error'){$('error').textContent=m.message;ws.close();}
 if(m.type==='joined'){joined=true;myId=m.id;code=m.code;$('lobby').hidden=true;$('hud').hidden=false;$('pause').hidden=false;$('room').textContent='ROOM / '+code+' · 복사';$('error').textContent='';}
 if(m.type==='state'){players=m.players;const first=!me;me=players.find(p=>p.id===myId);if(!me)return;if(first){yaw=me.yaw;pitch=0;}updateHUD();}
 if(m.type==='shot'){recoil+=m.recoil*.008;pitch=Math.min(1.45,pitch+m.recoil*.005);tone(100,.06,.15);if(m.hit){$('hitmarker').hidden=false;$('hitmarker').style.color=m.head?'#ffb36c':'#d8fc71';clearTimeout(hitTimer);hitTimer=setTimeout(()=>$('hitmarker').hidden=true,130);}}
 if(m.type==='tracer')showTracers(m);
 if(m.type==='shootBlocked')message(m.reason);
 if(m.type==='kill')message(m.killer===myId?'처치 확인'+(m.head?' · HEADSHOT':''):'전사 · 3초 후 재투입');
 if(m.type==='sound'&&m.id!==myId&&me){const d=Math.hypot(m.x-me.x,m.z-me.z);if(d<22)tone(m.kind==='step'?70:160,.08,(1-d/22)*.13,(m.x-me.x)/15);}
 };ws.onerror=()=>{$('error').textContent='서버 연결에 실패했습니다. 서버 주소를 확인해 주세요.';};ws.onclose=()=>{if(joined){$('connection').textContent='연결 끊김';message('연결이 끊어졌습니다. 방을 나간 뒤 다시 접속하세요.');document.exitPointerLock();}else if(!$('error').textContent||$('error').textContent.includes('연결하는'))$('error').textContent='서버에 연결할 수 없습니다.';};}
$('create').onclick=()=>join('');$('join').onclick=()=>join($('code').value);$('code').onkeydown=e=>{if(e.key==='Enter')join($('code').value);};
$('room').onclick=()=>{navigator.clipboard?.writeText(code).then(()=>message('방 코드가 복사되었습니다.')).catch(()=>message('방 코드: '+code));};
$('enter').onclick=()=>{audio??=new AudioContext();audio.resume();canvas.requestPointerLock();};
$('leave').onclick=()=>location.reload();
function armory(open){$('weapons').hidden=!open;if(open){document.exitPointerLock();keys={};firing=false;}}
$('armory').onclick=()=>armory(true);$('closeweapons').onclick=()=>armory(false);
WEAPONS.forEach((w,i)=>{const button=document.createElement('button');button.className='weapon'+(i===0?' active':'');button.innerHTML=`<b>${String(i+1).padStart(2,'0')} / ${w.name}</b><small>${w.type} · ${w.damage}${w.pellets?' 총합 / '+w.pellets+' 펠릿':''} DMG · 반동 ${w.recoil}<br>${w.weight} kg · 걷기 ${speed(i).toFixed(1)} m/s · ${w.mag}발</small>`;button.onclick=()=>{send({type:'weapon',index:i});document.querySelectorAll('.weapon').forEach(b=>b.classList.remove('active'));button.classList.add('active');};$('weaponlist').append(button);});
document.addEventListener('pointerlockchange',()=>{$('pause').hidden=document.pointerLockElement===canvas;keys={};firing=false;});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement!==canvas)return;yaw-=e.movementX*.002;pitch=Math.max(-1.45,Math.min(1.45,pitch-e.movementY*.002));});
document.addEventListener('keydown',e=>{if(!myId||e.target.tagName==='INPUT')return;if(['Space','KeyW','KeyA','KeyS','KeyD'].includes(e.code))e.preventDefault();if(e.code==='KeyB'&&!e.repeat)armory($('weapons').hidden);if(document.pointerLockElement!==canvas)return;keys[e.code]=true;if(e.code==='KeyR')send({type:'reload'});});
document.addEventListener('keyup',e=>keys[e.code]=false);window.addEventListener('blur',()=>{keys={};firing=false;});
document.addEventListener('mousedown',e=>{if(e.button===0&&document.pointerLockElement===canvas){firing=true;hasSemi=false;fire(performance.now());}});document.addEventListener('mouseup',()=>{firing=false;hasSemi=false;});
function fire(time){if(!me||document.pointerLockElement!==canvas)return; const w=WEAPONS[me.weapon];if(firing&&(!hasSemi||w.auto)&&time-lastFire>w.interval&&me.hp>0&&!me.reload){send({type:'input',yaw,pitch,input:{forward:!!keys.KeyW,back:!!keys.KeyS,left:!!keys.KeyA,right:!!keys.KeyD,sprint:!!(keys.ShiftLeft||keys.ShiftRight)}});send({type:'shoot'});lastFire=time;hasSemi=true;}
}
function tone(f,duration,volume,pan=0){if(!audio)return;const o=audio.createOscillator(),g=audio.createGain(),p=audio.createStereoPanner();o.type='triangle';o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(25,audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);p.pan.value=Math.max(-1,Math.min(1,pan));o.connect(g).connect(p).connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}
function updateHUD(){const w=WEAPONS[me.weapon];$('hp').textContent=me.hp;$('hpbar').style.width=me.hp+'%';$('weaponname').textContent=w.name+' / '+w.type;$('ammo').textContent=me.reload?'재장전…':`${me.ammo} / ${w.mag}`;$('score').textContent=players.length<2?'BRIDGE YARD · 혼자 사격 연습 가능 · 방 코드를 공유하세요':`${me.kills}  :  ${players.find(p=>p.id!==myId).kills}`;gun.visible=me.hp>0;}
setInterval(()=>{if(me)send({type:'input',yaw,pitch,input:{forward:!!keys.KeyW,back:!!keys.KeyS,left:!!keys.KeyA,right:!!keys.KeyD,sprint:!!(keys.ShiftLeft||keys.ShiftRight),jump:!!keys.Space}});},1000/30);
function enemy(){const group=new THREE.Group();const mat=new THREE.MeshStandardMaterial({color:0xb67a51});const body=new THREE.Mesh(new THREE.BoxGeometry(.64,1.1,.64),mat);body.position.y=.85;const head=new THREE.Mesh(new THREE.BoxGeometry(.48,.5,.48),new THREE.MeshStandardMaterial({color:0xd2b390}));head.position.y=1.65;group.add(body,head);for(const x of [-.19,.19]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.22,.6,.3),gunMat);leg.position.set(x,.3,0);group.add(leg);}scene.add(group);return group;}
let previous=performance.now();function frame(time){requestAnimationFrame(frame);const dt=Math.min(.05,(time-previous)/1000);previous=time;recoil*=Math.exp(-dt*15);
 if(me){camera.position.set(me.x,me.y+1.65,me.z);camera.rotation.set(pitch+recoil,yaw,0);gun.position.y=Math.sin(time*.01)*(keys.KeyW||keys.KeyA||keys.KeyD||keys.KeyS? .008:0);gun.scale.z=WEAPONS[me.weapon].type==='권총'?.8:1.35;
 fire(time);
 for(const p of players){if(p.id===myId)continue;if(!opponents.has(p.id))opponents.set(p.id,enemy());const model=opponents.get(p.id);model.position.set(p.x,p.y,p.z);model.rotation.y=p.yaw;model.visible=p.hp>0;}
 for(const [id,model]of opponents)if(!players.some(p=>p.id===id)){scene.remove(model);opponents.delete(id);}
 }else{camera.position.set(18,14,19);camera.lookAt(0,0,0);}
 flash.visible=time<flashUntil;
 for(let i=tracers.length-1;i>=0;i--){const t=tracers[i];t.line.material.opacity=Math.max(0,(t.expires-time)/120);if(time>=t.expires){scene.remove(t.line);t.line.geometry.dispose();t.line.material.dispose();tracers.splice(i,1);}}
 renderer.render(scene,camera);
}requestAnimationFrame(frame);window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
