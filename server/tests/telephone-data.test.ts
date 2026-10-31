import {afterEach,beforeEach,expect,test} from 'vitest';
import {fixture} from './fixture';
import {telephoneData} from '../src/telephone-data';

let f:ReturnType<typeof fixture>;
beforeEach(()=>{f=fixture();});
afterEach(()=>{f.sqlite.close();});

test('speaks only the authenticated client workspace, omitting internal and other family information',async()=>{
 f.insert('family_tasks',{id:'visible',family_id:'f1',title:'משימה גלויה',details:'private details',owner_role:'client',visible_to_client:1,due_on:'2026-11-01',created_by:'rep',updated_by:'rep'});
 f.insert('family_tasks',{id:'hidden',family_id:'f1',title:'משימה סודית',details:'private',owner_role:'representative',visible_to_client:0,due_on:'2026-11-01',created_by:'rep',updated_by:'rep'});
 f.insert('family_tasks',{id:'other',family_id:'f2',title:'משימה של תיק אחר',details:'private',owner_role:'client',visible_to_client:1,due_on:'2026-11-01',created_by:'otherrep',updated_by:'otherrep'});
 f.insert('meetings',{id:'m1',family_id:'f1',status:'scheduled',scheduled_at:'2026-11-02T10:00:00Z',note:'SECRET MEETING NOTE'});
 f.insert('notifications',{id:'n1',family_id:'f1',profile_id:'client',title:'עדכון גלוי',body:'המסמכים נבדקים'});
 const result=await telephoneData(f.db,await f.actor('client'),'f1');
 expect(result.tasks.join(' ')).toContain('משימה גלויה');expect(result.documents.join(' ')).toContain('Synthetic document');expect(result.meetings.join(' ')).toContain('פגישה');expect(result.updates.join(' ')).toContain('עדכון גלוי');
 const serialized=JSON.stringify(result);for(const secret of ['משימה סודית','משימה של תיק אחר','SECRET MEETING NOTE','PRIVATE NOTE','private details'])expect(serialized).not.toContain(secret);
 await expect(telephoneData(f.db,await f.actor('client'),'f2')).rejects.toThrow();
});

test('rejects staff and disabled clients and provides clear empty sections',async()=>{
 await expect(telephoneData(f.db,await f.actor('rep'),'f1')).rejects.toThrow();
 const actor=await f.actor('client');f.sqlite.exec("UPDATE profiles SET active=0 WHERE id='client'");
 await expect(telephoneData(f.db,actor,'f1')).rejects.toThrow();
 f.sqlite.exec("UPDATE profiles SET active=1 WHERE id='client'");
 const result=await telephoneData(f.db,actor,'f1');expect(result.tasks).toEqual(['אין כרגע משימות פתוחות.']);expect(result.updates).toEqual(['אין כרגע עדכונים נוספים.']);
});
