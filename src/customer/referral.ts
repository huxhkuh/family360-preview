const KEY='f360.referral';
const MAX_AGE=30*24*60*60*1000;
type StorageLike=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export function captureReferral(search:string,storage:StorageLike,now=Date.now()){
 const code=new URLSearchParams(search).get('ref');
 if(code&&/^[a-zA-Z0-9_-]{1,50}$/.test(code))storage.setItem(KEY,JSON.stringify({code,at:now}));
}
export function pendingReferral(storage:StorageLike,now=Date.now()):string|undefined{
 try{const data=JSON.parse(storage.getItem(KEY)||'null');if(data&&typeof data.code==='string'&&/^[a-zA-Z0-9_-]{1,50}$/.test(data.code)&&typeof data.at==='number'&&data.at<=now&&now-data.at<=MAX_AGE)return data.code;storage.removeItem(KEY);}catch{storage.removeItem(KEY);}
 return undefined;
}
export function clearReferral(storage:StorageLike){storage.removeItem(KEY);}
export function browserReferral(){try{return pendingReferral(localStorage);}catch{return undefined;}}
export function rememberBrowserReferral(search:string){try{captureReferral(search,localStorage);}catch{/* Storage may be unavailable. */}}
export function clearBrowserReferral(){try{clearReferral(localStorage);}catch{/* The case is already created. */}}
