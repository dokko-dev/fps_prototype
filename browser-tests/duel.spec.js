import {test,expect} from '@playwright/test';
test('WebGL lobby, two-player room and loadout selection',async({browser})=>{
 const a=await browser.newPage(),b=await browser.newPage();const errors=[];
 for(const page of [a,b])page.on('pageerror',e=>errors.push(e.message));
 await a.goto('/');await expect(a.locator('h1')).toContainText('시야 밖의 적');
 expect(await a.locator('canvas').evaluate(c=>!!c.getContext('webgl2'))).toBe(true);
 await a.locator('#create').click();await expect(a.locator('#hud')).toBeVisible();
 await a.locator('#enter').click();
 await expect.poll(()=>a.evaluate(()=>document.pointerLockElement?.id)).toBe('game');
 await a.mouse.click(640,360);
 await expect(a.locator('#ammo')).toHaveText('14 / 15');
 await expect.poll(()=>a.locator('canvas').getAttribute('data-shots')).toBe('1');
 await a.evaluate(()=>document.exitPointerLock());
 const code=(await a.locator('#room').textContent()).match(/[A-F0-9]{6}/)[0];
 await b.goto('/');await b.locator('#code').fill(code);await b.locator('#join').click();
 await expect(a.locator('#score')).toHaveText('0  :  0');await expect(b.locator('#hp')).toHaveText('100');
 await a.locator('#armory').click();await expect(a.locator('.weapon')).toHaveCount(10);
 await a.locator('.weapon').nth(9).click();await expect(a.locator('#weaponname')).toContainText('SR8');
 await a.locator('#closeweapons').click();await expect(a.locator('#weapons')).toBeHidden();
 await a.locator('#enter').click();
 await expect.poll(()=>a.evaluate(()=>document.pointerLockElement?.id)).toBe('game');
 await expect(a.locator('#pause')).toBeHidden();
 await expect(a.locator('#room')).toBeVisible();
 await expect(a.locator('#ammo')).toHaveText('5 / 5');
 await a.mouse.down({button:'right'});
 await expect(a.locator('#scope')).toBeVisible();
 await expect(a.locator('#scopezoom')).toHaveText('6×');
 await expect.poll(async()=>Number(await a.locator('canvas').getAttribute('data-fov'))).toBeLessThan(16);
 await a.screenshot({path:'test-results/sniper-scope.png'});
 await a.mouse.up({button:'right'});await expect(a.locator('#scope')).toBeHidden();
 await a.mouse.click(640,360);
 await expect(a.locator('#ammo')).toHaveText('4 / 5');
 await a.keyboard.press('r');
 await a.screenshot({path:'test-results/lobby-duel.png'});
 expect(errors).toEqual([]);await a.close();await b.close();
});

test('three selectable maps, immediate stop under 100 ms latency, rifle dot and distinct models',async({browser})=>{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.routeWebSocket('**/*',ws=>{const server=ws.connectToServer();server.onMessage(message=>setTimeout(()=>ws.send(message),100));});
 for(const map of ['hills','depot']){
 await page.goto('/');await expect(page.locator('#map option')).toHaveCount(3);await page.locator('#map').selectOption(map);await page.locator('#create').click();
 await expect(page.locator('#score')).toContainText(map==='hills'?'GREEN RIDGE':'DUST DEPOT');
 await page.locator('#enter').click();await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.id)).toBe('game');
 const position=async()=>JSON.parse(await page.locator('canvas').getAttribute('data-position'));
 const before=await position();await page.keyboard.down('KeyD');await expect.poll(async()=>(await position())[0]).toBeGreaterThan(before[0]+.3);await page.keyboard.up('KeyD');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const stop=await position();await page.waitForTimeout(350);const after=await position();
 expect(stop[0]).toBeGreaterThan(before[0]+.3);expect(Math.abs(after[0]-stop[0])).toBeLessThan(.12);
 await page.screenshot({path:'test-results/'+map+'.png'});
 if(map==='hills'){
 await page.evaluate(()=>document.exitPointerLock());await page.locator('#armory').click();await page.locator('.weapon').nth(5).click();await expect(page.locator('#weaponname')).toContainText('AR4');await page.locator('#closeweapons').click();await page.locator('#enter').click();
 await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.id)).toBe('game');await page.mouse.down({button:'right'});await expect(page.locator('#reddot')).toBeVisible();await expect(page.locator('#scope')).toBeHidden();await expect.poll(async()=>Number(await page.locator('canvas').getAttribute('data-fov'))).toBeLessThan(57);await page.screenshot({path:'test-results/rifle-dot.png'});await page.mouse.up({button:'right'});
 }
 }
 expect(errors).toEqual([]);await page.close();
});

test('sensitivity settings persist, reset and open during a match',async({page})=>{
 await page.goto('/');await page.locator('#lobbysettings').click();await expect(page.getByRole('dialog')).toBeVisible();
 await page.locator('#hipsensitivity').fill('1.75');await page.locator('#adssensitivity').fill('0.55');await expect(page.locator('#hipvalue')).toHaveText('1.75×');await expect(page.locator('#adsvalue')).toHaveText('0.55×');
 await page.locator('#closesettings').click();await page.reload();await page.locator('#lobbysettings').click();await expect(page.locator('#hipsensitivity')).toHaveValue('1.75');await expect(page.locator('#adssensitivity')).toHaveValue('0.55');
 await page.locator('#quality').selectOption('low');await page.reload();await page.locator('#lobbysettings').click();await expect(page.locator('#quality')).toHaveValue('low');
 await page.locator('#resetsensitivity').click();await expect(page.locator('#hipsensitivity')).toHaveValue('1');await expect(page.locator('#adssensitivity')).toHaveValue('1');await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toBeHidden();
 await page.locator('#create').click();await expect(page.locator('#hud')).toBeVisible();await page.locator('#pausesettings').click();await expect(page.getByRole('dialog')).toBeVisible();await page.locator('#closesettings').click();await page.locator('#enter').click();await expect.poll(()=>page.evaluate(()=>document.pointerLockElement?.id)).toBe('game');
});

test('batched rendering keeps draw calls bounded in all maps',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL/i.test(m.text()))errors.push(m.text());});
 for(const map of ['bridge','hills','depot']){
 await page.goto('/');await page.locator('#map').selectOption(map);await page.locator('#create').click();await expect(page.locator('#hud')).toBeVisible();
 await expect.poll(async()=>Number(await page.locator('canvas').getAttribute('data-drawcalls'))).toBeGreaterThan(0);
 await page.waitForTimeout(4500); // Measure after shader warmup and automatic resolution adjustment.
 const stats=await page.locator('canvas').evaluate((c,map)=>({map,draws:c.dataset.drawcalls,triangles:c.dataset.triangles,resolution:c.dataset.resolution,fps:c.dataset.fps}),map);
 console.log('Render metrics:',stats);expect(Number(stats.draws)).toBeLessThan(40);
 await expect(page.locator('#performance')).toContainText('FPS');await page.screenshot({path:'test-results/optimized-'+map+'.png'});
 }
 expect(errors).toEqual([]);
});
