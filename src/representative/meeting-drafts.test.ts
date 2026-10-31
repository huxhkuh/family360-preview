import {describe,it,expect} from 'vitest';
import {workspaceSchema} from '../lib/model';
import {draftOptions,clientDraft,professionalDraft} from './meeting-drafts';
function workspace(role:'representative'|'client'='representative'){
 return workspaceSchema.parse({profile:{id:'p',name:'נציג',active:true,role},permissions:['*'],families:[{id:'f',name:'משפחה',case_number:'1',status:'new'}],services:[{id:'s',key:'mortgage',name:'משכנתא',active:true,trigger_conditions:[],client_fields:[],professional_fields:[],required_documents:[]},{id:'x',key:'other',name:'תחום אחר',active:true,trigger_conditions:[],client_fields:[],professional_fields:[],required_documents:[]}],familyServices:[{id:'fs',family_id:'f',service_id:'s',status:'active',analysis_task_id:null,execution_task_id:null}],documents:[{id:'d',family_id:'f',name:'דוח משכנתא',key:'doc',type:'file',status:'missing'},{id:'o',family_id:'f',name:'מסמך רשות',key:'optional',type:'file',status:'missing',optional:true}],analysisTasks:[],executionTasks:[],meetings:[],meetingItems:[],professionals:[],professionalServices:[],representatives:[],profiles:[],notifications:[],timeline:[],audit:[],settings:{},automations:[],templates:[],documentTypes:[],limit:500});
}
describe('drafts from case data',()=>{
 it('only prepares a message about a missing required document in the selected case',()=>{const w=workspace();expect(clientDraft(w,'f','d')).toContain('דוח משכנתא');expect(clientDraft(w,'f','o')).toBeNull();expect(clientDraft(w,'f','unknown')).toBeNull();});
 it('only prepares a professional request for a selected service in that case',()=>{const w=workspace();expect(professionalDraft(w,'f','s')).toContain('משכנתא');expect(professionalDraft(w,'f','x')).toBeNull();expect(professionalDraft(w,'other','s')).toBeNull();});
 it('returns no drafts for an unauthorized role and handles absent data',()=>{const w=workspace();expect(draftOptions(workspace('client'),'f')).toBeNull();w.documents=[];w.familyServices=[];expect(draftOptions(w,'f')?.documents).toEqual([]);expect(clientDraft(w,'f','d')).toBeNull();expect(professionalDraft(w,'f','s')).toBeNull();});
});
