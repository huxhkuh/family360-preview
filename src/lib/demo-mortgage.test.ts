import {describe,expect,it} from 'vitest';
import {workspaceSchema} from './model';
import {comparisonDelta,comparisonGaps,readComparison} from '../meetings/comparison';
import {installMortgageDemo,mortgageDemoDocuments,mortgageScenario,type MortgageDemoState} from './demo-mortgage';

const state=():MortgageDemoState=>({families:[],services:[],familyServices:[],documents:[],analysisTasks:[],professionalServices:[],documentTypes:[],notifications:[],timeline:[]});
const at=Date.parse('2026-11-15T10:00:00Z');

describe('synthetic mortgage presentation fixture',()=>{
 it('compares equal principal and term with consistent amortization, fees and break-even',()=>{
  const s=mortgageScenario,r=s.currentAnnualRate/1200;
  expect(s.monthlyCurrent*(1-(1+r)**-s.months)/r).toBeCloseTo(s.principal,6);
  expect(s.monthlyCurrent).toBeCloseTo(4434.635337,6);
  expect(s.monthlyProposed).toBeCloseTo(4182.724652,6);
  expect(s.monthlySaving).toBeCloseTo(251.910685,6);
  expect(s.netSaving).toBeCloseTo(s.totalCurrent-s.totalProposedInclCosts,6);
  expect(s.netSaving).toBeCloseTo(53958.56,2);
  expect(s.breakEvenMonths).toBe(26);
  expect((s.breakEvenMonths-1)*s.monthlySaving).toBeLessThan(s.setupCost);
  expect(s.breakEvenMonths*s.monthlySaving).toBeGreaterThanOrEqual(s.setupCost);
  expect(s.householdNetIncome).toBe(s.firstNetIncome+s.secondNetIncome);
 });

 it('installs one editable complete analysis and three approved task-shared PDFs',()=>{
  const w=state();expect(installMortgageDemo(w,at)).toBe('a-mortgage-demo');
  const task=w.analysisTasks[0],family=w.families[0];
  expect(task.status).toBe('in_progress');
  expect(task.professional_id).toBe('pro1');
  expect(task.family_id).toBe(family.id);
  expect(task.snapshot!.length).toBeGreaterThan(10);
  expect(task.current_situation).toContain('סינתטית');
  expect(task.client_summary).toContain('טרם ניתן אישור לביצוע');
  const c=readComparison(task.financial?.comparison);
  expect(comparisonGaps(c)).toEqual([]);
  expect(comparisonDelta(c)).toBe(251.91);
  expect(c.status).toBe('estimate');
  expect(c.conditions).toContain('אינן הצעת בנק');
  expect(w.documents.map(doc=>doc.storage_path)).toEqual(mortgageDemoDocuments.map(doc=>doc.path));
  expect(w.documents.every(doc=>doc.status==='approved'&&doc.mime_type==='application/pdf'&&doc.family_id===family.id)).toBe(true);
  expect(w.taskDocuments!.every(share=>share.task_id===task.id&&share.kind==='analysis'&&share.revoked_at===null)).toBe(true);
  expect(w.taskDocuments!.map(share=>share.document_id)).toEqual(w.documents.map(doc=>doc.id));
  expect(family.email).toMatch(/@example\.invalid$/);
  expect(family.phone).toBe('');
  expect(workspaceSchema.pick({families:true,services:true,familyServices:true,documents:true,analysisTasks:true,professionalServices:true,documentTypes:true,notifications:true,timeline:true}).safeParse(w).success).toBe(true);
 });

 it('can reload the example without duplicate records or altering unrelated demo data',()=>{
  const w=state();w.timeline.push({id:'keep',family_id:'other-family',title:'unrelated demo',created_at:new Date(at).toISOString()});
  installMortgageDemo(w,at);installMortgageDemo(w,at+1000);
  expect(w.families).toHaveLength(1);
  expect(w.analysisTasks).toHaveLength(1);
  expect(w.documents).toHaveLength(3);
  expect(w.taskDocuments).toHaveLength(3);
  expect(w.notifications).toHaveLength(1);
  expect(w.timeline).toHaveLength(2);
  expect(w.timeline.find(row=>row.id==='keep')?.title).toBe('unrelated demo');
 });
});
