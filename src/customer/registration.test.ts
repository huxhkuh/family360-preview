import {describe,it,expect} from 'vitest';
import {registrationSchema} from './registration';
import {answerAutofill} from '../families/autofill';
describe('registration and browser field identity',()=>{
 it('normalizes contact data without changing the phone format',()=>expect(registrationSchema.parse({first:' ישראל ',last:' לדוגמה ',email:' Person@Example.com ',phone:'0500000000'})).toEqual({first:'ישראל',last:'לדוגמה',email:'person@example.com',phone:'0500000000'}));
 it.each([{first:'',last:'לדוגמה',email:'a@b.com',phone:'0500000000'},{first:'ישראל',last:'לדוגמה',email:'female',phone:'0500000000'},{first:'ישראל',last:'לדוגמה',email:'a@b.com',phone:'123'}])('rejects invalid registration data',data=>expect(registrationSchema.safeParse(data).success).toBe(false));
 it('identifies email and separates household members',()=>{expect(answerAutofill('h_email').autoComplete).toBe('section-primary email');expect(answerAutofill('w_phone').autoComplete).toBe('section-partner tel');expect(answerAutofill('children.0.dob').autoComplete).toBe('section-child0 bday');expect(answerAutofill('marital').autoComplete).toBe('off');expect(answerAutofill('h_id').autoComplete).toBe('off');});
});
