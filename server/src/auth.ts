import {createClient} from '@supabase/supabase-js';
import {Database,ApiError,requireThat,uuid,type Row} from './db';
export interface Env{DB:D1Database;DOCUMENTS:R2Bucket;SUPABASE_URL:string;SUPABASE_PUBLISHABLE_KEY:string;ALLOWED_ORIGINS:string;ENVIRONMENT:string;AUTH_ENABLED:string}
export interface Actor{profile:Row;permissions:string[];representative?:Row;professional?:Row;partner?:Row;aal:string;authId:string;email:string;issuedAt:number}
export async function authenticate(request:Request,env:Env,db:Database):Promise<Actor>{
 requireThat(env.AUTH_ENABLED==='true','SERVICE_NOT_CONFIGURED',503);
 const token=request.headers.get('Authorization')?.match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1];requireThat(token&&token.length<12000,'UNAUTHENTICATED',401);
 requireThat(/^https:\/\/[^/]+\.supabase\.co$/.test(env.SUPABASE_URL)&&!!env.SUPABASE_PUBLISHABLE_KEY,'SERVICE_NOT_CONFIGURED',503);
 const auth=createClient(env.SUPABASE_URL,env.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}).auth;
 // getClaims verifies signature (JWKS or Auth server for legacy symmetric keys).
 const verified=await auth.getClaims(token);requireThat(!verified.error&&verified.data?.claims,'UNAUTHENTICATED',401);
 const claims=verified.data.claims;const epoch=Math.floor(Date.now()/1000);
 requireThat(claims.iss===env.SUPABASE_URL+'/auth/v1'&&claims.aud==='authenticated'&&claims.role==='authenticated'&&typeof claims.sub==='string'&&typeof claims.exp==='number'&&claims.exp>epoch&&typeof claims.iat==='number'&&claims.iat<=epoch+30,'UNAUTHENTICATED',401);
 // Revalidate the Auth account; a locally valid JWT is insufficient for a deleted/banned account.
 const user=await auth.getUser(token);requireThat(!user.error&&user.data.user?.id===claims.sub&&!!user.data.user.email_confirmed_at,'UNAUTHENTICATED',401);
 let profile=(await db.rows('profiles','auth_user_id=?',[claims.sub]))[0];
 if(!profile){
  const displayName=String(user.data.user.user_metadata?.name||'לקוח חדש').trim().slice(0,150)||'לקוח חדש';
  // Auth metadata can supply a display name, never a role, permission or account state.
  await db.statement("INSERT INTO profiles(id,auth_user_id,role,name,email) VALUES (?,?,'client',?,?) ON CONFLICT(auth_user_id) DO NOTHING",[uuid(),claims.sub,displayName,user.data.user.email||null]).run();
  profile=(await db.rows('profiles','auth_user_id=?',[claims.sub]))[0];
 }
 requireThat(profile?.active&&claims.iat>=profile.token_valid_after,'PERMISSION_DENIED');
 const actor:Actor={profile,permissions:[],aal:String(claims.aal||''),authId:claims.sub,email:user.data.user.email||'',issuedAt:claims.iat};
 if(profile.role==='admin')requireThat(actor.aal==='aal2','MFA_REQUIRED');
 if(profile.role==='representative'){actor.representative=(await db.rows('representatives','profile_id=? AND active=1',[profile.id]))[0];requireThat(actor.representative);actor.permissions=actor.representative.permissions;}
 if(profile.role==='professional'){actor.professional=(await db.rows('professionals','profile_id=? AND active=1',[profile.id]))[0];requireThat(actor.professional);}
 if(profile.role==='marketer'){actor.partner=(await db.rows('partners','profile_id=? AND active=1',[profile.id]))[0];requireThat(actor.partner);}
 return actor;
}
export function has(actor:Actor,permission:string){return actor.profile.role==='admin'||actor.profile.role==='representative'&&actor.permissions.includes(permission);}
export function admin(actor:Actor){requireThat(actor.profile.role==='admin');requireThat(actor.aal==='aal2','MFA_REQUIRED');}
export function familyFilter(actor:Actor){if(actor.profile.role==='admin'||has(actor,'families.view_all'))return {sql:'1=1',values:[]};if(actor.profile.role==='representative')return {sql:'representative_id=?',values:[actor.representative!.id]};if(actor.profile.role==='client')return {sql:'client_profile_id=?',values:[actor.profile.id]};return {sql:'0=1',values:[]};}
export async function familyAccess(db:Database,actor:Actor,id:unknown,permission?:string){const family=await db.required('families',id);const allowed=actor.profile.role==='admin'||actor.profile.role==='client'&&family.client_profile_id===actor.profile.id||actor.profile.role==='representative'&&(family.representative_id===actor.representative?.id||has(actor,'families.view_all'));requireThat(allowed&&(!permission||has(actor,permission)));return family;}
export async function documentAccess(db:Database,actor:Actor,id:unknown,write=false){const doc=await db.required('documents',id);if(actor.profile.role!=='professional'){await familyAccess(db,actor,doc.family_id,write&&actor.profile.role!=='client'?'documents.manage':undefined);return doc;}
 requireThat(!write&&actor.professional);const shared=await db.statement(`SELECT td.id FROM task_documents td LEFT JOIN analysis_tasks a ON a.id=td.analysis_task_id LEFT JOIN execution_tasks e ON e.id=td.execution_task_id WHERE td.document_id=? AND td.revoked_at IS NULL AND ((a.professional_id=? AND a.family_id=?) OR (e.professional_id=? AND e.family_id=?)) LIMIT 1`,[doc.id,actor.professional.id,doc.family_id,actor.professional.id,doc.family_id]).first();requireThat(shared);return doc;
}
export async function taskAccess(db:Database,actor:Actor,table:'analysis_tasks'|'execution_tasks',id:unknown,permission?:string){const task=await db.required(table,id);if(actor.profile.role==='professional'){requireThat(!permission&&task.professional_id===actor.professional?.id);return task;}requireThat(['admin','representative'].includes(actor.profile.role));await familyAccess(db,actor,task.family_id,permission);return task;}
