import {describe,it,expect} from 'vitest';
import {workspaceSchema} from '../lib/model';
import {meetingBrief} from './meeting-brief';
function workspace(role:'representative'|'client'='representative'){
 return workspaceSchema.parse({profile:{id:'p',name:'נציג',active:true,role},permissions:['*'],families:[{id:'f',name:'משפחה',case_number:'1',status:'new',answers:{marital:'married',city:'דוגמה'}}],services:[],familyServices:[],documents:[{id:'d',family_id:'f',name:'תלוש',key:'payslip',type:'file',status:'missing'},{id:'other',family_id:'other',name:'אחר',key:'other',type:'file',status:'missing'}],analysisTasks:[],executionTasks:[],meetings:[],meetingItems:[],professionals:[],professionalServices:[],representatives:[],profiles:[],notifications:[],timeline:[],audit:[],settings:{},automations:[],templates:[],documentTypes:[],limit:500});
}
describe('meetingBrief',()=>{
 it('uses questionnaire answers and limits document results to the selected family',()=>{const b=meetingBrief(workspace(),'f');expect(b?.answered.some(i=>i.key==='city'&&i.value==='דוגמה')).toBe(true);expect(b?.missing.some(i=>i.key==='h_first')).toBe(true);expect(b?.documents.map(d=>d.id)).toEqual(['d']);});
 it('classifies malformed answers as requiring review instead of a reported answer',()=>{const w=workspace();w.families[0].answers={city:{bad:true}};const b=meetingBrief(w,'f');expect(b?.answered.some(i=>i.key==='city')).toBe(false);expect(b?.missing.some(i=>i.key==='city'&&i.value==='נדרש בירור לגבי מבנה הנתון')).toBe(true);});
 it('classifies an unknown option as requiring review',()=>{const w=workspace();w.families[0].answers={marital:'invalid'};const b=meetingBrief(w,'f');expect(b?.answered.some(i=>i.key==='marital')).toBe(false);expect(b?.missing.some(i=>i.key==='marital')).toBe(true);});
 it('does not return another role or an unknown family',()=>{expect(meetingBrief(workspace('client'),'f')).toBeNull();expect(meetingBrief(workspace(),'other')).toBeNull();});
});


