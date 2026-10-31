import {describe,expect,it} from 'vitest';
import type {Workspace} from '../lib/model';
import {workloadSummary} from './workload-summary';

function fixture():Workspace{return {
 profile:{id:'admin',role:'admin'},permissions:['*'],
 families:[{id:'f1',name:'א',status:'new',onboarding_pct:0},{id:'f2',name:'ב',status:'active',onboarding_pct:100,representative_id:'r1'}],
 representatives:[{id:'r1',name:'נציג לדוגמה',active:true,profile_id:'rep'}],familyTasks:[{id:'t1',family_id:'f2',title:'פעולה',owner_role:'representative',owner_name:'נציג לדוגמה',due_on:'2026-11-01',status:'open'}],familyServices:[],services:[],analysisTasks:[],executionTasks:[],professionals:[],meetings:[],followUps:[],finalReports:[],
 documents:[{id:'d1',family_id:'f1',name:'נדרש',status:'missing',optional:false},{id:'d2',family_id:'f1',name:'נדחה',status:'rejected',optional:false},{id:'d3',family_id:'f2',name:'רשות',status:'missing',optional:true},{id:'d4',family_id:'not-loaded',name:'אחר',status:'missing',optional:false}],
 familiesTruncated:true,followUpsTruncated:false,familyWorkTruncated:false,
 } as unknown as Workspace;}

describe('סיכום עומס למנהל',()=>{
 it('סופר תיקים בנפרד ממסמכים ומציין כשהנתונים חלקיים',()=>{
  const result=workloadSummary(fixture(),new Date('2026-10-29T12:00:00Z'));
  expect(result).toMatchObject({families:2,waiting:2,missingDocuments:1,documentCount:2,limited:true});
  expect(result?.representatives).toEqual([{id:'r1',name:'נציג לדוגמה',items:1}]);
 });
 it('אינו זמין לתפקידים אחרים',()=>{
  const w=fixture();w.profile.role='professional';expect(workloadSummary(w)).toBeNull();
  w.profile.role='client';expect(workloadSummary(w)).toBeNull();
 });
});
