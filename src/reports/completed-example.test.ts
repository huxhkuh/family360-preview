import {beforeEach,it,expect} from 'vitest';
import {loadCompletedFamilyExample,loadWorkspace,resetDemo,selectRole} from '../lib/backend';
import {reportReadiness} from './report-data';
import {summarizeReportFacts} from '../growth/report-facts';
import {readComparison,comparisonDelta} from '../meetings/comparison';
beforeEach(resetDemo);
it('loads an explicitly fictional, coherent closed case with proposal and measured results kept distinct',async()=>{
 const meetingId=loadCompletedFamilyExample(),w=await loadWorkspace(),report=w.finalReports.find(r=>r.meeting_id===meetingId)!;
 expect(reportReadiness(w,meetingId)).toEqual([]);expect(w.families.find(f=>f.id==='f1')?.status).toBe('completed');expect(report.status).toBe('approved');
 expect(w.documents.filter(d=>d.family_id==='f1')).toHaveLength(4);expect(w.documents.filter(d=>d.family_id==='f1').every(d=>d.status==='approved'&&d.file_name?.includes('לא הועלה קובץ'))).toBe(true);
 const proposal=w.analysisTasks.find(t=>t.id==='example-analysis')!;expect(comparisonDelta(readComparison(proposal.financial?.comparison))).toBe(60);
 const totals=summarizeReportFacts(report.snapshot!.facts);expect(totals.realized).toMatchObject({monthly_agorot:5500,annual_agorot:66000,one_off_agorot:12000});expect(totals.potential).toMatchObject({monthly_agorot:500,annual_agorot:6000});
 expect(w.executionTasks.find(t=>t.id==='example-execution')?.status).toBe('completed');selectRole('client');const client=await loadWorkspace();expect(client.finalReports).toHaveLength(1);expect(JSON.stringify(client.finalReports)).not.toContain('תיעוד פנימי לדוגמה');
});
it('remains isolated from unrelated cases and resets cleanly',async()=>{loadCompletedFamilyExample();expect((await loadWorkspace()).families.find(f=>f.id==='f2')?.name).toBe('משפחת כהן');resetDemo();selectRole('representative');expect((await loadWorkspace()).finalReports).toEqual([]);});
