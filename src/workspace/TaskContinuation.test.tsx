import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {workspaceSchema} from '../lib/model';
import {TaskContinuation} from './TaskContinuation';
import {IntakeReview} from '../families/IntakeReview';
const w=()=>workspaceSchema.parse({profile:{id:'client',name:'Client',active:true,role:'client'},permissions:[],families:[{id:'f',name:'Family',case_number:'F',status:'waiting_docs',onboarding_pct:100}],services:[],familyServices:[],documents:[],analysisTasks:[],executionTasks:[],meetings:[],meetingItems:[],professionals:[],professionalServices:[],representatives:[],profiles:[],notifications:[],timeline:[],audit:[],settings:{},automations:[],templates:[],documentTypes:[],limit:500});
describe('explicit continuation after a task',()=>{
 it('offers a real route to the next linked request after the upload',()=>{const data=w();data.documents=[{id:'d',family_id:'f',name:'File',key:'file',type:'file',status:'pending'}];data.familyTasks=[{id:'t',family_id:'f',title:'Confirm upload',details:'',owner_role:'client',owner_name:'Client',due_on:'2030-01-01',visible_to_client:true,status:'open',revision:1,updated_at:'2026-01-01',document_id:'d'}];const html=renderToStaticMarkup(<TaskContinuation w={data} message="Received"/>);expect(html).toContain('#/families/f/followups?focus=t');expect(html).toContain('Confirm upload');});
 it('offers a clear exit when nothing else is required',()=>{const html=renderToStaticMarkup(<TaskContinuation w={w()} message="Done"/>);expect(html).toContain('href="#/overview"');expect(html).toContain('אין כרגע פעולה נוספת');});
 it('reviews submitted answers without editable fields or validation',()=>{const data=w(),family={...data.families[0],answers:{h_first:'ישראל',marital:'single'}};const html=renderToStaticMarkup(<IntakeReview family={family} w={data} onContinue={()=>{}}/>);expect(html).toContain('ישראל');expect(html).toContain('לפרק הבא בסקירה');expect(html).not.toMatch(/<(input|form|textarea|select)\b/);});
});
