export const DEFAULT_SENSITIVITY={hip:1,ads:1};
const KEY='blindspot.sensitivity.v1';
function normalize(value){return typeof value==='number'&&Number.isFinite(value)?Math.max(.1,Math.min(3,value)):1;}
export function readSensitivity(storage){try{const saved=JSON.parse(storage.getItem(KEY));return {hip:normalize(saved?.hip),ads:normalize(saved?.ads)};}catch{return {...DEFAULT_SENSITIVITY};}}
export function saveSensitivity(storage,settings){try{storage.setItem(KEY,JSON.stringify(settings));return true;}catch{return false;}}
export function lookSensitivity(settings,ads,fov){return .002*settings.hip*(ads?settings.ads*Math.tan(fov*Math.PI/360)/Math.tan(75*Math.PI/360):1);}
