import metadata from './schema-metadata.json';
export type Row=Record<string,any>;
export class ApiError extends Error {constructor(public code:string,public status=400){super(code);}}
export function requireThat(condition:unknown,code='PERMISSION_DENIED',status=403):asserts condition{if(!condition)throw new ApiError(code,status);}
const definitions:Record<string,{json:string[];boolean:string[];columns:string[]}>=metadata;
const extras:Record<string,string[]>={profiles:['token_valid_after'],families:['preferred_channel','questionnaire_reviews'],documents:['optional','purpose','subject','period','source_hint','consent'],family_tasks:['document_id','request_kind','source_id','source_kind'],meeting_followups:['document_id'],notifications:['target_kind','target_id']};
const newTables:Record<string,string[]>={partners:['id','profile_id','name','code','active'],referrals:['id','public_id','partner_id','family_id','registered_at','status'],commission_entries:['id','partner_id','kind','referral_id','amount_agorot','note','created_at','created_by'],final_reports:['id','meeting_id','family_id','revision','status','content','snapshot','updated_at'],final_report_history:['id','report_id','revision','snapshot'],document_versions:['id','document_id','object_key','file_name','mime_type','size','sha256','uploaded_by','created_at']};
for(const [name,columns]of Object.entries(newTables))definitions[name]={columns,json:name.startsWith('final_report')?['content','snapshot']:[],boolean:name==='partners'?['active']:[]};
for(const [name,columns]of Object.entries(extras))definitions[name].columns.push(...columns);
definitions.families.json.push('questionnaire_reviews');definitions.documents.json.push('consent');definitions.documents.boolean.push('optional');
export const now=()=>new Date().toISOString();
export const uuid=()=>crypto.randomUUID();
export function decode(table:string,row:Row):Row{const data={...row};for(const key of definitions[table]?.json||[])if(typeof data[key]==='string')data[key]=JSON.parse(data[key]);for(const key of definitions[table]?.boolean||[])if(data[key]!=null)data[key]=Boolean(data[key]);return data;}
function encoded(table:string,key:string,value:any){if(value==null)return null;if(definitions[table]?.json.includes(key))return JSON.stringify(value);if(typeof value==='boolean')return Number(value);return value;}
export class Database{
 constructor(public binding:D1Database){}
 statement(sql:string,values:unknown[]=[]){return this.binding.prepare(sql).bind(...values);}
 async rows(table:string,where='1=1',values:unknown[]=[],suffix=''){requireThat(!!definitions[table],'SERVER_ERROR',500);return (await this.statement(`SELECT * FROM "${table}" WHERE ${where} ${suffix}`,values).all<Row>()).results.map(r=>decode(table,r));}
 async one(table:string,id:unknown){requireThat(typeof id==='string'&&id.length<=150,'VALIDATION',400);return (await this.rows(table,'id=?',[id]))[0];}
 async required(table:string,id:unknown){const row=await this.one(table,id);requireThat(row);return row;}
 async version(){return Number(await this.statement('SELECT version FROM database_revision WHERE id=1').first('version'));}
 insert(table:string,data:Row){const keys=Object.keys(data);requireThat(keys.length&&keys.every(k=>definitions[table]?.columns.includes(k)),'SERVER_ERROR',500);return this.statement(`INSERT INTO "${table}" (${keys.map(k=>`"${k}"`).join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,keys.map(k=>encoded(table,k,data[k])));}
 patch(table:string,id:string,data:Row){const keys=Object.keys(data);requireThat(keys.length&&keys.every(k=>k!=='id'&&definitions[table]?.columns.includes(k)),'SERVER_ERROR',500);return this.statement(`UPDATE "${table}" SET ${keys.map(k=>`"${k}"=?`).join(',')} WHERE id=?`,[...keys.map(k=>encoded(table,k,data[k])),id]);}
 async commit(version:number,actor:Row,action:string,entity:string,entityId:string|null,statements:D1PreparedStatement[]){
  const guard=uuid();
  const start=this.statement('UPDATE database_revision SET version=version+1 WHERE id=1 AND version=? AND EXISTS(SELECT 1 FROM profiles WHERE id=? AND active=1)',[version,actor.id]);
  const assert=this.statement('INSERT INTO transaction_assertions(id,valid) VALUES (?,CASE WHEN changes()=1 THEN 1 ELSE 0 END)',[guard]);
  const audit=this.insert('audit_log',{id:uuid(),actor_profile_id:actor.id,actor_role:actor.role,action,entity_type:entity,entity_id:entityId,created_at:now(),metadata:{}});
  try{await this.binding.batch([start,assert,...statements,audit,this.statement('DELETE FROM transaction_assertions WHERE id=?',[guard])]);}catch{throw new ApiError('CONFLICT',409);}
 }
}
