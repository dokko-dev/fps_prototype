import * as THREE from 'three';
import {WEAPONS,MAPS,speed,movePlayer,groundHeight,isGrounded} from './shared.js';
import {readSensitivity,saveSensitivity,lookSensitivity,DEFAULT_SENSITIVITY} from './sensitivity.js';
import {createSoldier} from './soldier.js';
import {buildArena} from './arena.js';
import {createGun,disposeGroup} from './guns.js';
const $=id=>document.getElementById(id),canvas=$('game');
const text=(id,value)=>{const node=$(id);if(node.textContent!==String(value))node.textContent=String(value);};
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance',precision:'mediump'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color('#b4cdd8');scene.fog=new THREE.Fog('#b4cdd8',25,85);
const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.05,100);camera.rotation.order='YXZ';
scene.add(new THREE.HemisphereLight(0xddeaff,0x555044,1.5));const sun=new THREE.DirectionalLight(0xffe8c2,3.2);sun.position.set(-8,20,6);sun.castShadow=true;sun.shadow.bias=-.00025;sun.shadow.normalBias=.035;sun.shadow.radius=2;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-20;sun.shadow.camera.right=20;sun.shadow.camera.top=20;sun.shadow.camera.bottom=-20;scene.add(sun);
let mapId='bridge',world=buildArena(mapId);scene.add(world);renderer.shadowMap.needsUpdate=true;
function selectWorld(id){const sky={bridge:'#b4cdd8',hills:'#b6cee0',depot:'#d6c8b1'}[id];scene.background.set(sky);scene.fog.color.set(sky);if(id===mapId)return;scene.remove(world);disposeGroup(world);mapId=id;world=buildArena(id);scene.add(world);renderer.shadowMap.needsUpdate=true;applyMaterialQuality();}
let gun=createGun(0),flash=gun.userData.flash,gunIndex=0;gun.visible=false;camera.add(gun);scene.add(camera);
const gunMat=new THREE.MeshStandardMaterial({color:0x222b26,roughness:.6});
function changeGun(index){if(index===gunIndex)return;ads=false;camera.remove(gun);disposeGroup(gun);gun=createGun(index);gunIndex=index;flash=gun.userData.flash;camera.add(gun);canvas.dataset.weapon=String(index);}
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
let ads=false,predicted=null,seq=0,pending=[],accumulator=0,hurtUntil=0,lastCommandAt=0;
function controls(){return {forward:!!keys.KeyW,back:!!keys.KeyS,left:!!keys.KeyA,right:!!keys.KeyD,sprint:!!(keys.ShiftLeft||keys.ShiftRight)&&!ads,jump:!!keys.Space,ads};}
function sendControls(){if(me)send({type:'input',yaw,pitch,input:controls()});}
function clearControls(){keys={};firing=false;ads=false;sendControls();}
function reconcile(state){
 const previous=me;me=state;
 if(!predicted||previous?.life!==me.life){predicted={...me};pending=[];yaw=me.yaw;pitch=0;accumulator=0;}
 else{pending=pending.filter(c=>c.seq>me.ack);predicted={...me};for(const c of pending)if(me.hp>0)movePlayer(predicted,c.input,c.yaw,1/60,mapId);}
 if(pending.length>180){pending=[];predicted={...me};}
}

function message(text){$('notice').textContent=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').textContent='',2600);}
function send(data){if(ws?.readyState===1)ws.send(JSON.stringify(data));}
function join(value){if(ws?.readyState===0)return;let joined=false;$('error').textContent='서버에 연결하는 중…';ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}`);ws.onopen=()=>send({type:'join',code:value,map:$('map').value});ws.onmessage=e=>{const m=JSON.parse(e.data);
 if(m.type==='error'){$('error').textContent=m.message;ws.close();}
 if(m.type==='joined'){joined=true;myId=m.id;code=m.code;selectWorld(m.map);$('lobby').hidden=true;$('hud').hidden=false;$('pause').hidden=false;$('room').textContent='ROOM / '+code+' · 복사';$('error').textContent='';}
 if(m.type==='state'){players=m.players;const own=players.find(p=>p.id===myId);if(!own)return;reconcile(own);changeGun(me.weapon);updateHUD();}
 if(m.type==='shot'){recoil+=m.recoil*.008;pitch=Math.min(1.45,pitch+m.recoil*.005);if(me?.weapon===4)yaw+=(Math.random()-.5)*.012;tone(100,.06,.15);if(m.hit){$('hitmarker').hidden=false;$('hitmarker').style.color=m.head?'#ffb36c':'#d8fc71';clearTimeout(hitTimer);hitTimer=setTimeout(()=>$('hitmarker').hidden=true,130);}}
 if(m.type==='pong')ping=Math.round(performance.now()-m.at);
 if(m.type==='hurt'){hurtUntil=performance.now()+700;$('damage').dataset.hits=String(Number($('damage').dataset.hits||0)+1);}
 if(m.type==='tracer')showTracers(m);
 if(m.type==='shootBlocked')message(m.reason);
 if(m.type==='kill')message(m.killer===myId?'처치 확인'+(m.head?' · HEADSHOT':''):'전사 · 3초 후 재투입');
 if(m.type==='sound'&&m.id!==myId&&me){const d=Math.hypot(m.x-me.x,m.z-me.z);if(d<22)tone(m.kind==='step'?70:160,.08,(1-d/22)*.13,(m.x-me.x)/15);}
 };ws.onerror=()=>{$('error').textContent='서버 연결에 실패했습니다. 서버 주소를 확인해 주세요.';};ws.onclose=()=>{if(joined){$('connection').textContent='연결 끊김';message('연결이 끊어졌습니다. 방을 나간 뒤 다시 접속하세요.');document.exitPointerLock();}else if(!$('error').textContent||$('error').textContent.includes('연결하는'))$('error').textContent='서버에 연결할 수 없습니다.';};}
let sensitivity;
try{sensitivity=readSensitivity(window.localStorage);}catch{sensitivity={...DEFAULT_SENSITIVITY};}
function syncSensitivity(){for(const key of ['hip','ads']){$(key+'sensitivity').value=sensitivity[key];$(key+'value').value=sensitivity[key].toFixed(2)+'×';}}
function persistSensitivity(){let saved=false;try{saved=saveSensitivity(window.localStorage,sensitivity);}catch{}$('sensitivitystatus').textContent=saved?'적용 및 자동 저장되었습니다.':'이 접속에 적용되었습니다. 브라우저에서 저장을 허용하지 않습니다.';}
function openSettings(){document.exitPointerLock();clearControls();syncSensitivity();$('settings').showModal();}
$('lobbysettings').onclick=openSettings;$('pausesettings').onclick=openSettings;$('closesettings').onclick=()=>$('settings').close();
for(const key of ['hip','ads'])$(key+'sensitivity').oninput=e=>{sensitivity[key]=Number(e.target.value);syncSensitivity();persistSensitivity();};
$('resetsensitivity').onclick=()=>{sensitivity={...DEFAULT_SENSITIVITY};syncSensitivity();persistSensitivity();};
syncSensitivity();
$('create').onclick=()=>join('');$('join').onclick=()=>join($('code').value);$('code').onkeydown=e=>{if(e.key==='Enter')join($('code').value);};
$('room').onclick=()=>{navigator.clipboard?.writeText(code).then(()=>message('방 코드가 복사되었습니다.')).catch(()=>message('방 코드: '+code));};
$('enter').onclick=()=>{audio??=new AudioContext();audio.resume();canvas.requestPointerLock();};
$('leave').onclick=()=>location.reload();
function armory(open){$('weapons').hidden=!open;if(open){document.exitPointerLock();clearControls();}}
$('armory').onclick=()=>armory(true);$('closeweapons').onclick=()=>armory(false);
WEAPONS.forEach((w,i)=>{const button=document.createElement('button');button.className='weapon'+(i===0?' active':'');button.innerHTML=`<b>${String(i+1).padStart(2,'0')} / ${w.name}</b><small>${w.type} · ${w.damage}${w.pellets?' 총합 / '+w.pellets+' 펠릿':''} DMG · 반동 ${w.recoil}<br>${w.weight} kg · 걷기 ${speed(i).toFixed(1)} m/s · ${w.mag}발</small>`;button.onclick=()=>{send({type:'weapon',index:i});document.querySelectorAll('.weapon').forEach(b=>b.classList.remove('active'));button.classList.add('active');};$('weaponlist').append(button);});
document.addEventListener('pointerlockchange',()=>{const locked=document.pointerLockElement===canvas;$('pause').hidden=locked;if(!locked)clearControls();});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement!==canvas)return;const scale=lookSensitivity(sensitivity,ads,camera.fov);yaw-=e.movementX*scale;pitch=Math.max(-1.45,Math.min(1.45,pitch-e.movementY*scale));});
document.addEventListener('keydown',e=>{if(!myId||e.target.tagName==='INPUT')return;if(['Space','KeyW','KeyA','KeyS','KeyD'].includes(e.code))e.preventDefault();if(e.code==='KeyB'&&!e.repeat)armory($('weapons').hidden);if(document.pointerLockElement!==canvas)return;keys[e.code]=true;sendControls();if(e.code==='KeyR')send({type:'reload'});});
document.addEventListener('keyup',e=>{keys[e.code]=false;sendControls();});window.addEventListener('blur',()=>{clearControls();});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('mousedown',e=>{if(document.pointerLockElement!==canvas)return;if(e.button===2){ads=true;sendControls();}if(e.button===0){firing=true;hasSemi=false;fire(performance.now());}});
document.addEventListener('mouseup',e=>{if(e.button===2){ads=false;sendControls();}if(e.button===0){firing=false;hasSemi=false;}});
function fire(time){if(!me||document.pointerLockElement!==canvas)return; const w=WEAPONS[me.weapon];if(firing&&(!hasSemi||w.auto)&&time-lastFire>w.interval&&me.hp>0&&!me.reload){sendControls();send({type:'shoot'});lastFire=time;hasSemi=true;}
}
function tone(f,duration,volume,pan=0){if(!audio)return;const o=audio.createOscillator(),g=audio.createGain(),p=audio.createStereoPanner();o.type='triangle';o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(25,audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);p.pan.value=Math.max(-1,Math.min(1,pan));o.connect(g).connect(p).connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}
function updateHUD(){const w=WEAPONS[me.weapon];text('hp',me.hp);$('hpbar').style.width=me.hp+'%';text('weaponname',w.name+' / '+w.type);text('firemode',w.auto?'FULL AUTO':me.weapon===9?'BOLT ACTION':'SEMI AUTO');text('mapname',MAPS.find(m=>m.id===mapId).name);text('ammo',me.reload?'재장전…':`${me.ammo} / ${w.mag}`);text('score',`${me.kills}  :  ${players.find(p=>p.id!==myId)?.kills||0}`);text('matchstatus',players.length<2?'상대 대기 중 · 사격 연습 가능':'LIVE / 1V1 DUEL');gun.visible=me.hp>0;}

function enemy(){const group=createSoldier();scene.add(group);return group;}
let quality='auto';try{const saved=localStorage.getItem('blindspot.quality.v1');if(['auto','low','medium','high'].includes(saved))quality=saved;}catch{}
let resolution=1,frameAverage=16.7,sampleFrames=0,sampleStart=performance.now(),lastQualityChange=performance.now(),ping=0;
const targetVector=new THREE.Vector3();
function applyMaterialQuality(){world.traverse(o=>{if(!o.material)return;const m=o.material;if(m.userData.originalBump===undefined)m.userData.originalBump=m.bumpMap||null;const bump=quality==='high'?m.userData.originalBump:null;if(m.bumpMap!==bump){m.bumpMap=bump;m.needsUpdate=true;}});}
function setQuality(value){quality=value;const profiles={auto:[.85,false],low:[.65,false],medium:[1,true],high:[1.5,true]},[ratio,shadows]=profiles[quality];resolution=Math.min(devicePixelRatio,ratio);renderer.setPixelRatio(resolution);renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=shadows;sun.shadow.mapSize.set(quality==='high'?1024:512,quality==='high'?1024:512);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}renderer.shadowMap.needsUpdate=true;scene.traverse(o=>{if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.needsUpdate=true;});applyMaterialQuality();$('quality').value=value;try{localStorage.setItem('blindspot.quality.v1',value);}catch{}lastQualityChange=performance.now();}
$('quality').onchange=e=>setQuality(e.target.value);setQuality(quality);
setInterval(()=>{if(ws?.readyState===1)send({type:'ping',at:performance.now()});},2000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearControls();previous=performance.now();frameAverage=16.7;sampleStart=previous;sampleFrames=0;});
let previous=performance.now();function frame(time){requestAnimationFrame(frame);if(document.hidden){previous=time;return;}const dt=Math.min(.1,(time-previous)/1000);previous=time;recoil*=Math.exp(-dt*15);
 if(me){
 accumulator=Math.min(.1,accumulator+dt);
 while(accumulator>=1/60){const input=controls(),active=input.forward||input.back||input.left||input.right||input.jump||!isGrounded(predicted,mapId);if(active||time-lastCommandAt>=100){const c={type:'input',seq:++seq,yaw,pitch,input};send(c);pending.push(c);if(me.hp>0)movePlayer(predicted,input,yaw,1/60,mapId);lastCommandAt=time;}accumulator-=1/60;}
 const view={...predicted};if(me.hp>0)movePlayer(view,controls(),yaw,accumulator,mapId);camera.position.set(view.x,view.y+1.65,view.z);canvas.dataset.position=JSON.stringify([view.x,view.y,view.z].map(v=>Number(v.toFixed(3))));camera.rotation.set(pitch+recoil,yaw,0);
 const w=WEAPONS[me.weapon],scoped=ads&&w.type==='저격소총'&&me.hp>0;
 const zoom=me.weapon===9?6:4,targetFov=ads?(scoped?THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(75/2))/zoom)):55):75;
 if(Math.abs(camera.fov-targetFov)>.01){camera.fov=THREE.MathUtils.lerp(camera.fov,targetFov,1-Math.exp(-dt*20));camera.updateProjectionMatrix();}
 $('scope').hidden=!scoped;text('scopezoom',zoom+'×');$('reddot').hidden=!(ads&&w.type==='소총');$('crosshair').hidden=ads;
 canvas.dataset.aim=scoped?'scope':ads?'ads':'hip';canvas.dataset.fov=camera.fov.toFixed(1);
 gun.visible=me.hp>0&&!scoped;gun.position.set(ads?0:.26,ads?-.135:-.25,-.43);gun.position.z+=recoil*.6;gun.rotation.x=recoil*.35;gun.position.y+=ads?0:Math.sin(time*.01)*((keys.KeyW||keys.KeyA||keys.KeyD||keys.KeyS)? .008:0);
 $('damage').style.opacity=String(Math.max(0,Math.min(.75,(hurtUntil-time)/700)));

 fire(time);
 for(const p of players){if(p.id===myId)continue;if(!opponents.has(p.id))opponents.set(p.id,enemy());const model=opponents.get(p.id);const target=targetVector.set(p.x,p.y,p.z);if(!model.userData.ready||model.position.distanceTo(target)>5){model.position.copy(target);model.userData.ready=true;}else model.position.lerp(target,1-Math.exp(-dt*20));model.rotation.y=p.yaw;const moving=model.position.distanceTo(target)>.03;for(const [index,leg]of model.userData.legs.entries())leg.rotation.x=moving?Math.sin(time*.012+index*Math.PI)*.35:0;model.visible=p.hp>0;}
 for(const [id,model]of opponents)if(!players.some(p=>p.id===id)){scene.remove(model);disposeGroup(model);opponents.delete(id);}
 }else{camera.position.set(18,14,19);camera.lookAt(0,0,0);}
 flash.visible=time<flashUntil;
 for(let i=tracers.length-1;i>=0;i--){const t=tracers[i];t.line.material.opacity=Math.max(0,(t.expires-time)/120);if(time>=t.expires){scene.remove(t.line);t.line.geometry.dispose();t.line.material.dispose();tracers.splice(i,1);}}
 renderer.render(scene,camera);
 if(!document.hidden){
 const elapsed=time-sampleStart;sampleFrames++;
 if(elapsed>=1000){const fps=Math.round(sampleFrames*1000/elapsed);frameAverage=elapsed/sampleFrames;text('performance',`${fps} FPS · ${ping} ms`);canvas.dataset.drawcalls=String(renderer.info.render.calls);canvas.dataset.triangles=String(renderer.info.render.triangles);canvas.dataset.resolution=resolution.toFixed(2);canvas.dataset.fps=String(fps);sampleStart=time;sampleFrames=0;
 if(quality==='auto'&&time-lastQualityChange>2000){let next=resolution;if(frameAverage>23)next=Math.max(.5,resolution*.75);else if(frameAverage<15&&resolution<Math.min(devicePixelRatio,1))next=Math.min(1,resolution+.05);if(Math.abs(next-resolution)>.01){resolution=next;renderer.setPixelRatio(resolution);renderer.setSize(innerWidth,innerHeight);lastQualityChange=time;}}
 }
 }

}requestAnimationFrame(frame);window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

function syncMapCards(){for(const card of document.querySelectorAll('[data-map]')){const active=card.dataset.map===$('map').value;card.classList.toggle('selected',active);card.setAttribute('aria-pressed',String(active));}}
for(const map of MAPS){const card=document.createElement('button');card.type='button';card.dataset.map=map.id;card.className='mapcard';card.innerHTML=`<span class="mapicon mapicon-${map.id}"></span><b>${map.name.split(' · ')[0]}</b><small>${map.name.split(' · ')[1]}</small>`;card.onclick=()=>{$('map').value=map.id;selectWorld(map.id);syncMapCards();};$('mapcards').append(card);}
for(const map of MAPS){const option=document.createElement('option');option.value=map.id;option.textContent=map.name;$('map').append(option);}$('map').onchange=()=>{selectWorld($('map').value);syncMapCards();};syncMapCards();
