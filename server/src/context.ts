import {z} from 'zod';
import {Database,now,uuid,requireThat,type Row} from './db';
import {type Actor,has,familyAccess} from './auth';
export class Context{
 statements:D1PreparedStatement[]=[];
 constructor(public db:Database,public actor:Actor,public version:number){}
 insert(table:string,row:Row){this.statements.push(this.db.insert(table,row));return row;}
 patch(table:string,row:Row,data:Row){const patch={...data};if('updated_at'in row)patch.updated_at=new Date(Math.max(Date.now(),Date.parse(row.updated_at||'1970-01-01')+1)).toISOString();this.statements.push(this.db.patch(table,row.id,patch));return {...row,...patch};}
 async staffFamily(id:unknown,permission='families.edit'){return familyAccess(this.db,this.actor,id,permission);}
 event(familyId:string,title:string){this.insert('timeline_events',{id:uuid(),family_id:familyId,title,actor_profile_id:this.actor.profile.id,created_at:now()});}
 notify(profileId:string|null,familyId:string,title:string){if(profileId)this.insert('notifications',{id:uuid(),profile_id:profileId,family_id:familyId,title,created_at:now()});}
 async notifyRep(familyId:string,title:string){const f=await this.db.required('families',familyId);if(f.representative_id){const r=await this.db.one('representatives',f.representative_id);if(r?.active)this.notify(r.profile_id,f.id,title);}}
}
export const idSchema=z.string().min(1).max(150);
export const shortText=z.string().trim().min(1).max(200);
export const dateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s);
export const timestamp=z.string().refine(s=>Number.isFinite(Date.parse(s)));
export function parse<T>(schema:z.ZodType<T>,value:unknown):T{const result=schema.safeParse(value);requireThat(result.success,'VALIDATION',400);return result.data;}
export function expected(actual:unknown,value:unknown){requireThat(actual===value,'CONFLICT',409);}
export function stateIn(row:Row,statuses:string[]){requireThat(statuses.includes(row.status),'INVALID_STATE',409);}
export const staff=(c:Context)=>requireThat(has(c.actor,'families.edit'));
