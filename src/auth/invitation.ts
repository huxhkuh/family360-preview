type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
const storageKey='f360.pending-agent-invitation';
const valid=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export function clearInvitation(storage:Store){try{storage.removeItem(storageKey);}catch{/* Storage may be blocked. */}}
export function captureInvitation(hash:string,storage:Store,now=Date.now()):string{
 const params=new URLSearchParams(hash.replace(/^#/,''));const token=params.get('agent-invite');
 if(token!==null){
  clearInvitation(storage);
  if(!valid(token))return '';
  try{storage.setItem(storageKey,JSON.stringify({token,expiresAt:now+7*86400000}));}catch{/* Keep in memory for this page. */}
  return token;
 }
 try{
  const saved=JSON.parse(storage.getItem(storageKey)||'null');
  if(saved&&valid(saved.token)&&Number.isFinite(saved.expiresAt)&&saved.expiresAt>now)return saved.token;
 }catch{/* Malformed or inaccessible storage is not an invitation. */}
 clearInvitation(storage);return '';
}
export function invitationLink(origin:string,token:string){
 const url=new URL(origin);
 if(!valid(token)||!['http:','https:'].includes(url.protocol))throw new Error('VALIDATION');
 return `${url.origin}/#agent-invite=${token}`;
}
