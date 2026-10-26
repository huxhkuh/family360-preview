import { describe,it,expect } from 'vitest';
import { configuration, conditionMatches, priority, validateUpload, safeMessage } from './core';
describe('configuration boundary',()=>{
 it('requires real configuration',()=>{expect(configuration('','')).toBeNull();expect(()=>configuration('https://YOUR-PROJECT.supabase.co','key')).toThrow();});
 it('rejects secret keys',()=>{expect(()=>configuration('https://a.supabase.co','sb_secret_abc')).toThrow();});
 it('accepts public key with secure endpoint',()=>{expect(configuration('https://a.supabase.co','sb_publishable_abc')?.url).toBe('https://a.supabase.co');});
 it('rejects remote plaintext endpoints',()=>{expect(()=>configuration('http://a.example.com','public')).toThrow();});
});
describe('explainable rules',()=>{
 it('unknown operators fail closed',()=>{expect(conditionMatches({x:1},{field:'x',op:'execute',value:1})).toBe(false);});
 it('missing data is not a negative answer',()=>{expect(conditionMatches({},{field:'x',op:'not_equals',value:'yes'})).toBe(false);});
 it('missing comparison operand fails closed',()=>{expect(conditionMatches({x:1},{field:'x',op:'not_equals'})).toBe(false);});
 it('supports numeric thresholds and list membership',()=>{expect(conditionMatches({n:'42'},{field:'n',op:'gt',value:40})).toBe(true);expect(conditionMatches({a:['yes']},{field:'a',op:'contains',value:'yes'})).toBe(true);});
 it('matches primitive equality without coercing undefined',()=>{expect(conditionMatches({x:'yes'},{field:'x',op:'equals',value:'yes'})).toBe(true);expect(conditionMatches({x:'no'},{field:'x',op:'not_equals',value:'yes'})).toBe(true);expect(conditionMatches({x:3},{field:'x',op:'lt',value:4})).toBe(true);});
 it('existence rejects empty arrays and null',()=>{for(const x of [undefined,null,'',[]]) expect(conditionMatches({x},{field:'x',op:'exists'})).toBe(false);expect(conditionMatches({x:0},{field:'x',op:'exists'})).toBe(true);});
 it('priority ignores completed tasks and explains overdue work',()=>{
  expect(priority([{status:'completed',due_at:'2000-01-01'}],[],Date.parse('2026-01-01')).score).toBe(0);
  const p=priority([{status:'assigned',due_at:'2000-01-01'}],[{status:'missing'}],Date.parse('2026-01-01'));
  expect(p.score).toBeGreaterThan(0);expect(p.reasons).toHaveLength(2);
 });
});
describe('untrusted files',()=>{
 it('checks extension and size',async()=>{
  await expect(validateUpload(new File(['abc'],'bad.exe',{type:'application/pdf'}))).rejects.toThrow();
  await expect(validateUpload(new File([],'empty.pdf',{type:'application/pdf'}))).rejects.toThrow();
 });
 it('rejects content that is not actually a PDF',async()=>{await expect(validateUpload(new File(['<script>'],'x.pdf',{type:'application/pdf'}))).rejects.toThrow();});
 it('accepts a PDF signature',async()=>{await expect(validateUpload(new File(['%PDF-1.7\n'],'x.pdf',{type:'application/pdf'}))).resolves.toBeUndefined();});
 it('does not expose raw server details',()=>{expect(safeMessage(new Error('secret password and SQL stack'))).not.toContain('secret');expect(safeMessage({message:'CONFLICT: revision'})).toContain('הנתונים השתנו');});
 it('explains Auth failures without exposing server messages or personal details',()=>{
  expect(safeMessage({code:'weak_password',message:'private server detail'})).toContain('12 תווים');
  expect(safeMessage({code:'over_email_send_rate_limit',message:'private address'})).toContain('מגבלת שליחת');
  expect(safeMessage({code:'email_address_not_authorized',message:'private address'})).toContain('שירות הדוא״ל');
  expect(safeMessage({code:'unknown_private_code',message:'private detail'})).not.toContain('private');
  expect(safeMessage({code:'constructor',message:'private detail'})).toBeTypeOf('string');
 });
 it('recognizes legacy Supabase password rejection without leaking raw requirements',()=>{
  const message=safeMessage(new Error('Password should be at least 1212 characters.'));
  expect(message).toContain('דרישות האבטחה');expect(message).not.toContain('1212');
 });
});
