import {describe,it,expect} from 'vitest';
import {draftAfterSave} from './form-draft';
describe('native form save reconciliation',()=>{
 it('clears only the exact submitted draft',()=>{const values={name:['saved'],permissions:[]};expect(draftAfterSave({values,baseline:{name:['old'],permissions:['edit']}},values)).toBeNull();});
 it('keeps edits made after navigating back while an earlier save is pending',()=>{const submitted={name:['first']},newer={name:['second'],permissions:['edit']};expect(draftAfterSave({values:newer,baseline:{name:['old']}},submitted)).toEqual({values:newer,baseline:submitted});});
});
