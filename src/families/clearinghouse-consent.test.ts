import {beforeEach,describe,expect,it} from 'vitest';
import {loadWorkspace,resetDemo,selectRole,rpc} from '../lib/backend';
import {clearinghouseConsent} from './clearinghouse-consent';
import {validDemoAnswers} from './questionnaire-fixture';
beforeEach(()=>{resetDemo();selectRole('client');});
async function prepare(){const w=await loadWorkspace();await rpc('rpc_save_family',{p_family_id:'f1',p_expected_updated_at:w.families[0].updated_at,p_patch:{answers:validDemoAnswers}});return rpc<{id:string}>('rpc_demo_prepare_document',{p_family_id:'f1',p_key:'clearinghouse_auth_h'});}
const payload=(id:string)=>({p_document_id:id,p_signer:'ישראל לדוגמה',p_consent:true,p_text:clearinghouseConsent.text,p_version:clearinghouseConsent.version});
describe('demonstrated clearinghouse consent',()=>{
 it('saves an explicit signature with the exact text, version, recipient and time',async()=>{const d=await prepare();await rpc('rpc_sign_document',payload(d.id));const w=await loadWorkspace();expect(w.documents.find(doc=>doc.id===d.id)).toMatchObject({status:'signed',consent:{...clearinghouseConsent,signer:'ישראל לדוגמה',signed_at:expect.any(String)}});await expect(rpc('rpc_sign_document',payload(d.id))).rejects.toThrow('INVALID_STATE');});
 it('rejects unchecked consent, altered text, missing name and stale version',async()=>{const d=await prepare();for(const patch of [{p_consent:false},{p_text:'different'},{p_signer:''},{p_version:'old'}])await expect(rpc('rpc_sign_document',{...payload(d.id),...patch})).rejects.toThrow('VALIDATION');expect((await loadWorkspace()).documents.find(doc=>doc.id===d.id)?.status).toBe('missing');});
 it('does not let a representative or professional sign for the client',async()=>{const d=await prepare();for(const role of ['representative','professional'] as const){selectRole(role);await expect(rpc('rpc_sign_document',payload(d.id))).rejects.toThrow('PERMISSION_DENIED');}});
});
