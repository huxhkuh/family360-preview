import {test,expect} from 'vitest';
import {changedAnswerKeys,snapshotAffected} from './questionnaire-changes';
import {meetingRpc} from '../lib/demo-meeting';

test('detects added, removed and nested answer edits without object ordering noise',()=>{
 expect([...changedAnswerKeys({a:{b:1,c:2}},{a:{c:2,b:1}})]).toEqual([]);
 expect([...changedAnswerKeys({children:[{name:'A'}],old:1},{children:[{name:'B'}],new:2})]).toEqual(['children','old','new']);
 expect(snapshotAffected([{key:'children'}],new Set(['children']))).toBe(true);
 expect(snapshotAffected(null,new Set(['children']))).toBe(false);
});
test('demo mirrors affected-professional routing and preserves the task snapshot',()=>{
 const family={id:'f1',updated_at:'2026-10-29T00:00:00Z',onboarding_pct:100,answers:{city:'A'}};
 const state={families:[family],notifications:[] as any[],analysisTasks:[{family_id:'f1',professional_id:'p',task_number:'A-1',status:'assigned',snapshot:[{key:'city',value:'A'}]}],executionTasks:[],professionals:[{id:'p',profile_id:'professional1',active:true,profile_active:true}]};
 const save=(city:string)=>meetingRpc('/rest/v1/rpc/rpc_save_family',{p_family_id:'f1',p_expected_updated_at:family.updated_at,p_patch:{answers:{city}}},state,'client',()=>state);
 save('B');expect(state.notifications.map(n=>n.audience)).toEqual(['representative','professional']);expect(state.notifications[1].profile_id).toBe('professional1');
 save('B');expect(state.notifications).toHaveLength(2);expect(state.analysisTasks[0].snapshot[0].value).toBe('A');
});
