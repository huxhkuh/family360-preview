import {beforeEach,describe,it,expect} from 'vitest';
import {loadWorkspace,resetDemo,selectRole} from '../lib/backend';
import {workQueue} from '../lib/work-queue';
import {reportContentSchema} from '../reports/report-data';
describe('continuous representative ownership through the final report',()=>{
 beforeEach(()=>{resetDemo();selectRole('representative');});
 const ready=async()=>{const w=await loadWorkspace();w.followUps=[];w.familyTasks=[];w.familyServices=[];w.analysisTasks=[];w.executionTasks=[];return w;};
 it('puts report preparation back into the work queue when treatment is closed',async()=>{const w=await ready();const row=workQueue(w).find(r=>r.id==='final-report:m1');expect(row).toMatchObject({mine:true,approval:false,target:{page:'meetings',id:'m1',stage:'summary'}});});
 it('distinguishes a draft awaiting review from an approved report',async()=>{const w=await ready();w.finalReports=[{...reportContentSchema.parse({context:'',outcome:'',recommendations:'',no_savings_reason:'',facts:[]}),id:'report',meeting_id:'m1',family_id:'f1',status:'draft',snapshot:null,revision:1,updated_at:new Date().toISOString()}];expect(workQueue(w).find(r=>r.id==='final-report:m1')).toMatchObject({approval:true,label:'לבדיקת הדוח'});w.finalReports[0].status='approved';expect(workQueue(w).some(r=>r.id==='final-report:m1')).toBe(false);});
 it('does not claim that the final report is ready while any family follow-up remains open',async()=>{const w=await ready();w.familyTasks=[{id:'pending',family_id:'f1',title:'בדיקה נוספת',details:'',owner_role:'representative',owner_name:'הנציג',visible_to_client:false,due_on:'2026-12-01',status:'open',revision:1,updated_at:new Date().toISOString()}];expect(workQueue(w).some(r=>r.id==='final-report:m1')).toBe(false);});
 it('does not assign another representative’s final report to the current representative',async()=>{const w=await ready();w.families.find(f=>f.id==='f1')!.representative_id='other';expect(workQueue(w).find(r=>r.id==='final-report:m1')?.mine).toBe(false);});
 it('does not expose report work in client or professional queues',async()=>{const w=await ready();for(const role of ['client','professional'] as const){w.profile.role=role;expect(workQueue(w).some(r=>r.id.startsWith('final-report:'))).toBe(false);}});
});
