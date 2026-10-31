import {describe,it,expect,vi} from 'vitest';
import {signInWithGoogle} from './google';
describe('Google sign in',()=>{
 it('requests the Google provider and returns to the same site workspace',async()=>{const signInWithOAuth=vi.fn().mockResolvedValue({error:null});await signInWithGoogle({signInWithOAuth},'https://example.test');expect(signInWithOAuth).toHaveBeenCalledWith({provider:'google',options:{redirectTo:'https://example.test/#/overview'}});});
 it('reports provider errors rather than pretending sign in succeeded',async()=>{const error=new Error('provider unavailable');await expect(signInWithGoogle({signInWithOAuth:vi.fn().mockResolvedValue({error})},'https://example.test')).rejects.toBe(error);});
});
