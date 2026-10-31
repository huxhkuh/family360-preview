import {test,expect} from 'vitest';
import {clientFamily} from '../src/workspace';
test('client family projection denies future internal columns by default',()=>{
 const result=clientFamily({id:'f1',name:'Synthetic',answers:{city:'Synthetic city'},updated_at:'2030-01-01',internal_notes:'private',questionnaire_reviews:{},future_internal_risk_note:'private',client_profile_id:'private-profile',created_by:'private-staff'});
 expect(result).toEqual({id:'f1',name:'Synthetic',answers:{city:'Synthetic city'},updated_at:'2030-01-01'});
});
