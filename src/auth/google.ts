import type {SupabaseClient} from '@supabase/supabase-js';
export async function signInWithGoogle(auth:Pick<SupabaseClient['auth'],'signInWithOAuth'>,origin:string){
 const result=await auth.signInWithOAuth({provider:'google',options:{redirectTo:origin+'/#/overview'}});
 if(result.error)throw result.error;
}
