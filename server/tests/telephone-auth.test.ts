import {test,expect} from 'vitest';
import {fixture} from './fixture';
import {createTelephoneBinding,issueTelephoneCode,verifyTelephoneCode,resolveTelephoneSession,revokeTelephoneBinding,normalizeTelephone} from '../src/telephone-auth';

const secret='test-secret-with-at-least-32-bytes';
test('phone normalization and verified bindings cannot cross clients or share an active phone',async()=>{
 const f=fixture(); try {
  expect(normalizeTelephone('050-123-4567')).toBe('+972501234567');
  expect(()=>normalizeTelephone('123')).toThrow('INVALID_PHONE');
  await expect(createTelephoneBinding(f.binding,'f1','otherclient','0501234567','rep')).rejects.toThrow('INVALID_CLIENT_BINDING');
  await createTelephoneBinding(f.binding,'f1','client','0501234567','rep');
  await expect(createTelephoneBinding(f.binding,'f2','otherclient','0501234567','otherrep')).rejects.toThrow();
 }finally{f.sqlite.close();}
});
test('OTP is delivered only to verified number, rate limited, single use, and revocation removes access',async()=>{
 const f=fixture(); try {
  const id=await createTelephoneBinding(f.binding,'f1','client','0501234567','rep');
  let code=''; const delivery=async(phone:string,value:string)=>{expect(phone).toBe('+972501234567');code=value;};
  expect(await issueTelephoneCode(f.binding,'0501234567',secret,delivery)).toBe(true);
  expect(await issueTelephoneCode(f.binding,'0501234567',secret,delivery)).toBe(false);
  expect(await verifyTelephoneCode(f.binding,'0501234567','999999'===code?'999998':'999999',secret)).toBeNull();
  const token=await verifyTelephoneCode(f.binding,'0501234567',code,secret);
  expect(token).toBeTruthy();
  expect(await verifyTelephoneCode(f.binding,'0501234567',code,secret)).toBeNull();
  expect(await resolveTelephoneSession(f.binding,token!,secret)).toEqual({familyId:'f1',bindingId:id,clientProfileId:'client'});
  await revokeTelephoneBinding(f.binding,id);
  expect(await resolveTelephoneSession(f.binding,token!,secret)).toBeNull();
 }finally{f.sqlite.close();}
});
test('expired codes, exhausted attempts, failed delivery and inactive clients cannot authenticate',async()=>{
 const f=fixture(); try {
  await createTelephoneBinding(f.binding,'f1','client','0501234567','rep');
  let code='';
  await issueTelephoneCode(f.binding,'0501234567',secret,async(_phone,value)=>{code=value;});
  for(let n=0;n<5;n++) expect(await verifyTelephoneCode(f.binding,'0501234567',code==='000000'?'000001':'000000',secret)).toBeNull();
  expect(await verifyTelephoneCode(f.binding,'0501234567',code,secret)).toBeNull();
  f.sqlite.prepare('UPDATE telephone_challenges SET issued_at=0').run();
  expect(await issueTelephoneCode(f.binding,'0501234567',secret,async()=>{})).toBe(false);
  f.sqlite.prepare('UPDATE telephone_bindings SET locked_until=1').run();
  expect(await issueTelephoneCode(f.binding,'0501234567',secret,async()=>{throw new Error('failed');})).toBe(false);
  expect(await verifyTelephoneCode(f.binding,'0501234567',code,secret)).toBeNull();
  f.sqlite.prepare('UPDATE telephone_challenges SET issued_at=0').run();
  await issueTelephoneCode(f.binding,'0501234567',secret,async(_phone,value)=>{code=value;});
  f.sqlite.prepare('UPDATE telephone_challenges SET expires_at=0').run();
  expect(await verifyTelephoneCode(f.binding,'0501234567',code,secret)).toBeNull();
  f.sqlite.prepare('UPDATE profiles SET active=0 WHERE id=?').run('client');
  expect(await issueTelephoneCode(f.binding,'0501234567',secret,async()=>{})).toBe(false);
 }finally{f.sqlite.close();}
});
test('parallel verification cannot redeem the same code twice',async()=>{
 const f=fixture(); try {
  await createTelephoneBinding(f.binding,'f1','client','0501234567','rep');
  let code=''; await issueTelephoneCode(f.binding,'0501234567',secret,async(_phone,value)=>{code=value;});
  const results=await Promise.all([verifyTelephoneCode(f.binding,'0501234567',code,secret),verifyTelephoneCode(f.binding,'0501234567',code,secret)]);
  expect(results.filter(Boolean)).toHaveLength(1);
 }finally{f.sqlite.close();}
});
test('failed attempts accumulate across newly issued codes',async()=>{
 const f=fixture(); try {
  await createTelephoneBinding(f.binding,'f1','client','0501234567','rep');
  let code=''; const deliver=async(_phone:string,value:string)=>{code=value;};
  for(let n=0;n<5;n++){
   expect(await issueTelephoneCode(f.binding,'0501234567',secret,deliver)).toBe(true);
   expect(await verifyTelephoneCode(f.binding,'0501234567',code==='000000'?'000001':'000000',secret)).toBeNull();
   f.sqlite.prepare('UPDATE telephone_challenges SET issued_at=0').run();
  }
  expect(await issueTelephoneCode(f.binding,'0501234567',secret,deliver)).toBe(false);
 }finally{f.sqlite.close();}
});
