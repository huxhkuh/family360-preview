import {type Env,type Actor} from './auth';
import {ApiError,Database} from './db';
import {issueTelephoneCode,verifyTelephoneCode,resolveTelephoneSession,normalizeTelephone} from './telephone-auth';
import {telephoneData} from './telephone-data';
import {storeVoiceMessage} from './telephone-messages';

// Internal state only: the adapter must keep it on the server and bind it to an
// authenticated provider call. Never serialize this state to provider responses or logs.
export type TelephoneState =
 | {step:'start'}
 | {step:'phone';mode:'request'|'existing'}
 | {step:'code';phone:string}
 | {step:'menu';token:string}
 | {step:'record';token:string};
export type TelephoneEvent =
 | {type:'start'}
 | {type:'digits';value:string}
 | {type:'recording';sourceEvent:string;bytes:Uint8Array};
export type TelephoneResult = {state:TelephoneState;prompt:string;action:'digits'|'record'};

const menu='למצב הטיפול הקישו 1. למשימות הקישו 2. למסמכים הקישו 3. לפגישות הקישו 4. לעדכונים הקישו 5. להשארת הודעה הקישו 6.';
const startPrompt='שלום. לקבלת קוד אישי הקישו 1. אם כבר קיבלתם קוד הקישו 2.';
const phonePrompt='שלום, לקבלת מידע אישי הקישו את מספר הטלפון המאומת שלכם וסולמית.';
const codePrompt='אם המספר מאומת וניתן לשלוח אליו קוד, תתקבל שיחה עם קוד אישי. הקישו את הקוד וסולמית, או חזרו לקו לאחר קבלתו.';
const unavailable='לא ניתן לאמת את הפרטים או שהקוד פג. נסו שוב או פנו לנציג.';
const expired='הזיהוי הסתיים. יש להזדהות מחדש. '+startPrompt;
const response=(state:TelephoneState,prompt:string,action:'digits'|'record'='digits'):TelephoneResult=>({state,prompt,action});

/**
 * No HTTP or provider interface is exposed here. Caller must authenticate the
 * provider, protect the internal state, deduplicate events and avoid logging
 * inputs, outputs and errors containing credentials or personal information.
 */
export function createTelephoneFlow(db:Database,env:Env,secret:string,deliver:(phone:string,code:string)=>Promise<void>){
 return async (state:TelephoneState|null,event:TelephoneEvent):Promise<TelephoneResult>=>{
  if(event.type==='start'||!state)return response({step:'start'},startPrompt);
  if(state.step==='start'&&event.type==='digits'&&(event.value==='1'||event.value==='2'))return response({step:'phone',mode:event.value==='1'?'request':'existing'},phonePrompt);
  if(state.step==='phone'&&event.type==='digits'){
   try{
    if(state.mode==='request')await issueTelephoneCode(db.binding,event.value,secret,deliver);
    else {
     // Validate the number without issuing a replacement challenge.
     normalizeTelephone(event.value);
    }
   }catch(error){
    if(!(error instanceof Error&&error.message==='INVALID_PHONE'))throw error;
    return response(state,'מספר הטלפון אינו תקין. '+phonePrompt);
   }
   return response({step:'code',phone:event.value},state.mode==='request'?codePrompt:'הקישו את הקוד שקיבלתם וסולמית.');
  }
  if(state.step==='code'&&event.type==='digits'){
   const token=await verifyTelephoneCode(db.binding,state.phone,event.value,secret);
   return token?response({step:'menu',token},menu):response(state,unavailable);
  }
  if(state.step==='menu'||state.step==='record'){
   const session=await resolveTelephoneSession(db.binding,state.token,secret);
   if(!session)return response({step:'start'},expired);
   if(state.step==='record'&&event.type==='recording'){
    try{await storeVoiceMessage(db,env,session.familyId,event.sourceEvent,event.bytes);}
    catch(error){
     if(error instanceof ApiError&&error.code==='NO_ACTIVE_REPRESENTATIVE')return response({step:'menu',token:state.token},'לא ניתן להשאיר הודעה כרגע. אנא פנו למוקד. '+menu);
     throw error;
    }
    return response({step:'menu',token:state.token},'ההודעה נשמרה והועברה לטיפול. '+menu);
   }
   if(event.type==='digits'){
    if(event.value==='0')return response({step:'menu',token:state.token},menu);
    if(state.step==='menu'&&event.value==='6')return response({step:'record',token:state.token},'לאחר הצליל הקליטו הודעה לנציג. ניתן להקליט עד שתי דקות.','record');
    if(state.step==='menu'&&['1','2','3','4','5'].includes(event.value)){
     const profile=await db.required('profiles',session.clientProfileId);
     const actor:Actor={profile,permissions:[],aal:'',authId:'',email:'',issuedAt:0};
     const information=await telephoneData(db,actor,session.familyId);
     const content=event.value==='1'?information.status:event.value==='2'?information.tasks.join(' '):event.value==='3'?information.documents.join(' '):event.value==='4'?information.meetings.join(' '):information.updates.join(' ');
     return response({step:'menu',token:state.token},content+' '+menu);
    }
   }
  }
  return response(state,'הבחירה לא נקלטה. נסו שוב.');
 };
}
