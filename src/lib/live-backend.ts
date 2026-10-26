import {createClient} from '@supabase/supabase-js';
import {configuration,validateUpload} from './core';
import {workspaceSchema} from './model';
let configError:unknown;
let config:ReturnType<typeof configuration>=null;
try{config=configuration(import.meta.env.VITE_SUPABASE_URL||'',import.meta.env.VITE_SUPABASE_ANON_KEY||'');}catch(e){configError=e;}
export const backend=config?createClient(config.url,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:window.localStorage,flowType:'pkce'}}):null;
export {configError};
const api=import.meta.env.VITE_API_URL==='same-origin'?window.location.origin:String(import.meta.env.VITE_API_URL||'').replace(/\/$/,'');
export class WorkspaceNetworkError extends Error{constructor(){super('WORKSPACE_NETWORK');}}
async function request(path:string,init:RequestInit={}){
 if(!backend||!api||!/^https:\/\//.test(api)&&!/^http:\/\/127\.0\.0\.1:\d+$/.test(api))throw Error('CONFIG_INVALID');
 const {data,error}=await backend.auth.getSession();if(error||!data.session)throw Error('PERMISSION_DENIED');
 const headers=new Headers(init.headers);headers.set('Authorization','Bearer '+data.session.access_token);let response:Response;
 try{response=await fetch(api+path,{...init,headers,credentials:'omit',cache:'no-store'});}catch{throw new WorkspaceNetworkError();}
 if(!response.ok){const body=await response.json().catch(()=>({}));throw Error(body.error?.code||'SERVER_ERROR');}return response;
}
export async function rpc<T=unknown>(name:string,args:Record<string,unknown>={}):Promise<T>{const response=await request('/api/rpc/'+encodeURIComponent(name),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(args)});return (await response.json()).data as T;}
export async function loadWorkspace(familyId?:string){return workspaceSchema.parse(await rpc(familyId?'rpc_family_workspace':'rpc_workspace',familyId?{p_family_id:familyId}:{}));}
export async function uploadDocument(_familyId:string,documentId:string,file:File){await validateUpload(file);await request('/api/documents/'+encodeURIComponent(documentId),{method:'PUT',headers:{'Content-Type':file.type,'X-File-Name':encodeURIComponent(file.name)},body:file});}
export async function documentUrl(path:string){const documentId=path.split('/').at(-2);if(!documentId)throw Error('VALIDATION');const result=await request('/api/documents/'+encodeURIComponent(documentId));const url=URL.createObjectURL(await result.blob());setTimeout(()=>URL.revokeObjectURL(url),300000);return url;}
