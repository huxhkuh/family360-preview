import {z} from 'zod';
type TelephoneState={families:{id:string;updated_at?:string;preferred_channel?:string;representative_id?:string}[];familyContacts:Record<string,unknown>[];familyTasks:Record<string,unknown>[];timeline:Record<string,unknown>[]};
const call=z.object({p_id:z.string().min(1).max(100),p_family_id:z.string(),p_expected_updated_at:z.string(),p_verified:z.literal(true),p_summary:z.string().trim().min(3).max(3000),p_channel:z.enum(['internet','phone']),p_callback:z.boolean(),p_due_on:z.string()});
export function telephoneOperation(name:string,args:Record<string,unknown>,state:TelephoneState,role:string){
 if(name!=='rpc_telephone_contact')return undefined;
 if(!['admin','representative'].includes(role))throw Error('PERMISSION_DENIED');
 const parsed=call.safeParse(args);if(!parsed.success)throw Error('VALIDATION');const a=parsed.data;
 const family=state.families.find(f=>f.id===a.p_family_id);if(!family)throw Error('PERMISSION_DENIED');
 const requestKey=JSON.stringify({summary:a.p_summary,channel:a.p_channel,callback:a.p_callback,due:a.p_due_on});
 const previous=state.familyContacts.find(c=>c.id===a.p_id);if(previous){if(previous.family_id!==family.id||previous.request_key!==requestKey)throw Error('CONFLICT');return previous;}
 if(family.updated_at!==a.p_expected_updated_at)throw Error('CONFLICT');
 if(a.p_callback&&(!/^\d{4}-\d{2}-\d{2}$/.test(a.p_due_on)||!Number.isFinite(Date.parse(a.p_due_on))||new Date(a.p_due_on).toISOString().slice(0,10)!==a.p_due_on))throw Error('VALIDATION');
 const at=new Date().toISOString(),taskId=a.p_callback?'callback:'+a.p_id:null;
 const contact={request_key:requestKey,id:a.p_id,family_id:family.id,kind:'phone',summary:a.p_summary,occurred_at:at,author_name:role==='admin'?'מנהל לדוגמה':'נציג לדוגמה',next_task_id:taskId};
 state.familyContacts.push(contact);
 if(taskId)state.familyTasks.push({id:taskId,family_id:family.id,title:'לחזור למשפחה בעקבות הפנייה הטלפונית',details:'יש לעיין בתיעוד הקשר לפני החזרה.',owner_role:'representative',owner_name:'הנציג המטפל',due_on:a.p_due_on,visible_to_client:true,status:'open',revision:1,updated_at:at});
 family.preferred_channel=a.p_channel;family.updated_at=new Date(Math.max(Date.now(),Date.parse(family.updated_at||'0')+1)).toISOString();
 state.timeline.push({id:'phone:'+a.p_id,family_id:family.id,title:a.p_callback?'תועדה פנייה טלפונית ונקבעה חזרה':'תועדה פנייה טלפונית',created_at:at});return contact;
}
