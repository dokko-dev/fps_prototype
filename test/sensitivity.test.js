import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readSensitivity,saveSensitivity,lookSensitivity} from '../public/sensitivity.js';
test('sensitivity defaults survive invalid or blocked storage and apply separate ADS scale',()=>{
 assert.deepEqual(readSensitivity({getItem:()=>'{broken'}),{hip:1,ads:1});
 assert.deepEqual(readSensitivity({getItem:()=>'{"hip":100,"ads":"bad"}'}),{hip:3,ads:1});
 assert.equal(saveSensitivity({setItem:()=>{throw Error('blocked');}},{hip:1,ads:1}),false);
 assert.equal(lookSensitivity({hip:2,ads:.5},false,75),.004);
 assert.equal(lookSensitivity({hip:2,ads:.5},true,75),.002);
 assert.ok(lookSensitivity({hip:1,ads:1},true,15)<lookSensitivity({hip:1,ads:1},false,75));
});
