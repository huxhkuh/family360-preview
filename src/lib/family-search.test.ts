import {describe,it,expect} from 'vitest';
import {familyMatches} from './family-search';
import type {Family} from './model';
const family:Family={id:'f',name:'משפחת דוגמה',case_number:'CASE-12',status:'new',phone:'050-123-4567',contact_name:'איש קשר',email:'Example@EXAMPLE.invalid'};
describe('family lookup using authorized contact fields',()=>{
 it.each(['0501234567','050 123 4567','(050)123-4567','+972501234567','00972 50 123 4567','1234567'])('finds equivalent phone input %s',query=>expect(familyMatches(family,query)).toBe(true));
 it('also finds an internationally stored phone using local format',()=>expect(familyMatches({...family,phone:'+972 50 123 4567'},'050-1234567')).toBe(true));
 it.each(['CASE-12','case-12','example@example.invalid','איש קשר','דוגמה','  '])('finds text %s',query=>expect(familyMatches(family,query)).toBe(true));
 it.each(['---','+','0507654321','missing','abc0501234567'])('does not match unrelated input %s',query=>expect(familyMatches(family,query)).toBe(false));
 it('does not search hidden questionnaire data',()=>expect(familyMatches({...family,phone:null,answers:{h_phone:'0501234567'}},'0501234567')).toBe(false));
});
