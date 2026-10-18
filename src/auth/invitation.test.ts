import {it,expect} from 'vitest';
import {captureInvitation,clearInvitation,invitationLink} from './invitation';
const token='a'.repeat(64);
function store(){const m=new Map<string,string>();return {getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v);},removeItem:(k:string)=>{m.delete(k);}};}
it('captures a fragment invitation and persists it for email-confirmation return',()=>{
 const s=store();expect(captureInvitation('#agent-invite='+token,s,100)).toBe(token);expect(captureInvitation('',s,200)).toBe(token);
});
it('does not accept forged tokens or treat an auth redirect as an invitation',()=>{
 const s=store();expect(captureInvitation('#agent-invite=invalid',s,100)).toBe('');expect(captureInvitation('#access_token=secret',s,100)).toBe('');
});
it('expires local pending tokens and clears them on completion',()=>{
 const s=store();captureInvitation('#agent-invite='+token,s,1);expect(captureInvitation('',s,8*86400000)).toBe('');
 captureInvitation('#agent-invite='+token,s,10);clearInvitation(s);expect(captureInvitation('',s,11)).toBe('');
});
it('handles blocked or corrupted browser storage without breaking login',()=>{
 const broken={getItem:()=>{throw new Error();},setItem:()=>{throw new Error();},removeItem:()=>{throw new Error();}};
 expect(captureInvitation('#agent-invite='+token,broken,100)).toBe(token);expect(captureInvitation('',broken,100)).toBe('');expect(()=>clearInvitation(broken)).not.toThrow();
 const corrupt={...store(),getItem:()=>'{bad'};expect(captureInvitation('',corrupt,100)).toBe('');
});
it('creates same-origin fragment links, never query-string capabilities',()=>{
 expect(invitationLink('https://example.com/path',token)).toBe('https://example.com/#agent-invite='+token);
 expect(()=>invitationLink('javascript:alert(1)',token)).toThrow();expect(()=>invitationLink('https://example.com','bad')).toThrow();
});
