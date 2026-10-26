import {Database,ApiError,requireThat,type Row} from './db';
import {authenticate,type Env,type Actor} from './auth';
import {Context} from './context';
import {workspace} from './workspace';
import {families,familyOperations} from './families';
import {tasks,taskOperations} from './tasks';
import {meetings,meetingOperations} from './meetings';
import {reports,reportOperations} from './reports';
import {administrative,adminOperations} from './admin';
import {offers,offerOperations} from './offers';
import {documents,documentOperations,boundedBody,upload,download} from './documents';
import {invitations,invitationOperations} from './invitations';
const routes=new Map<string,(c:Context,name:string,args:Row)=>Promise<unknown>>();
for(const [names,handler]of [[familyOperations,families],[taskOperations,tasks],[meetingOperations,meetings],[reportOperations,reports],[adminOperations,administrative],[offerOperations,offers],[documentOperations,documents],[invitationOperations,invitations]] as const)for(const name of names)routes.set(name,handler);
export const supportedOperations=['rpc_workspace','rpc_family_workspace',...routes.keys()];
export async function dispatch(db:Database,actor:Actor,version:number,name:string,args:Row){
 if(name==='rpc_workspace'||name==='rpc_family_workspace')return workspace(db,actor,name==='rpc_family_workspace'?args.p_family_id:undefined);
 const handler=routes.get(name);requireThat(handler,'UNKNOWN_OPERATION',404);const c=new Context(db,actor,version);const result=await handler(c,name,args);const target=[args.p_document_id,args.p_task_id,args.p_meeting_id,args.p_family_id,args.p_id].find(v=>typeof v==='string'&&v.length<=150)||null;if(c.statements.length)await db.commit(version,actor.profile,name,'operation',target,c.statements);return result??null;
}
const publicErrors=new Set(['VALIDATION','CONFLICT','INVALID_STATE','PERMISSION_DENIED','MFA_REQUIRED','UNAUTHENTICATED','SERVICE_NOT_CONFIGURED','NOT_FOUND','FILE_SIZE','FILE_TYPE','UNKNOWN_OPERATION','QUESTIONNAIRE_INCOMPLETE','UNDECIDED_ITEMS','INELIGIBLE_PROFESSIONAL','INVITE_INVALID','INVITE_LIMIT','INVITE_ACCOUNT_CONFLICT','INSUFFICIENT_BALANCE','REPORT_INCOMPLETE','REPORT_TREATMENT_OPEN','REPORT_QUESTIONNAIRE_CHANGED','DUPLICATE_FACT','RATE_LIMITED']);
export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const origin=request.headers.get('Origin');const allowed=(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);const headers=new Headers({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Origin'});
  if(origin&&allowed.includes(origin)){headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Methods','GET,POST,PUT,OPTIONS');headers.set('Access-Control-Allow-Headers','Authorization,Content-Type,X-File-Name');headers.set('Access-Control-Max-Age','600');}
  const response=(body:unknown,status=200)=>Response.json(body,{status,headers});
  try{
   requireThat(!origin||allowed.includes(origin),'PERMISSION_DENIED');if(request.method==='OPTIONS')return new Response(null,{status:204,headers});const url=new URL(request.url);
   if(url.pathname==='/health'&&request.method==='GET')return response({status:'ok',environment:env.ENVIRONMENT,authConfigured:env.AUTH_ENABLED==='true'});
   const db=new Database(env.DB);const version=await db.version();const actor=await authenticate(request,env,db);
   const window=Math.floor(Date.now()/60000);const rate=await db.statement('INSERT INTO rate_limits(key,window,count) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET window=excluded.window,count=CASE WHEN rate_limits.window=excluded.window THEN rate_limits.count+1 ELSE 1 END RETURNING count',[actor.profile.id,window]).first<number>('count');requireThat((rate||0)<=120,'RATE_LIMITED',429);
   const c=new Context(db,actor,version);const docPath=url.pathname.match(/^\/api\/documents\/([^/]+)$/);
   if(docPath&&request.method==='PUT')return response(await upload(c,env,request,decodeURIComponent(docPath[1])));
   if(docPath&&request.method==='GET'){const file=await download(c,env,decodeURIComponent(docPath[1]));headers.forEach((v,k)=>file.headers.set(k,v));return file;}
   const rpc=url.pathname.match(/^\/api\/rpc\/(rpc_[a-z_]+)$/);requireThat(rpc&&request.method==='POST','NOT_FOUND',404);requireThat(request.headers.get('Content-Type')?.split(';')[0]==='application/json','VALIDATION',400);
   let args:unknown;try{args=JSON.parse(new TextDecoder().decode(await boundedBody(request,256*1024)));}catch(e){if(e instanceof ApiError)throw e;throw new ApiError('VALIDATION');}requireThat(args&&typeof args==='object'&&!Array.isArray(args),'VALIDATION',400);
   return response({data:await dispatch(db,actor,version,rpc[1],args as Row)});
  }catch(e){const code=e instanceof Error&&publicErrors.has(e.message)?e.message:'SERVER_ERROR';const status=e instanceof ApiError?e.status:code==='CONFLICT'?409:code==='SERVER_ERROR'?500:400;return response({error:{code}},status);}
 }
};
