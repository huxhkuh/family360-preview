// @ts-nocheck
export function meetingRpc(path,args,state,role,workspace){
const staff=role==='representative'||role==='admin';const randomUUID=()=>crypto.randomUUID();const send=(value,status=200)=>{if(status>=400)throw new Error(value.message);return value;};
   if(path==='/rest/v1/rpc/rpc_meeting_action'||path==='/rest/v1/rpc/rpc_finish_meeting'){
    if(!staff)return send({message:'PERMISSION_DENIED'},403);
    const meeting=state.meetings.find(m=>m.id===args.p_meeting_id);
    if(!meeting)return send({message:'PERMISSION_DENIED'},403);
    const items=state.meetingItems.filter(i=>i.meeting_id===meeting.id);
    if(path.endsWith('rpc_finish_meeting')){
     if(meeting.status!=='in_progress')return send({message:'INVALID_STATE'},400);
     if(items.some(i=>i.visible_to_client&&(!i.client_decision||i.client_decision==='undecided')))return send({message:'UNDECIDED_ITEMS'},400);
     meeting.status='completed';
     for(const item of items){const service=state.familyServices.find(s=>s.id===item.family_service_id);if(service)service.status={progress:'client_approved_execution',thinking:'client_thinking',declined:'client_declined',no_action:'no_execution_needed'}[item.client_decision]||service.status;}
     return send(null);
    }
    if(args.p_action==='start'&&meeting.status==='scheduled'){meeting.status='in_progress';return send(null);}
    if(args.p_action==='decision'&&meeting.status==='in_progress'){
     const item=items.find(i=>i.id===args.p_payload?.item_id);
     if(!item||!['progress','thinking','declined','no_action','undecided'].includes(args.p_payload.client_decision))return send({message:'VALIDATION'},400);
     for(const key of ['client_decision','decision_note','execution_instructions','approved_actions'])item[key]=args.p_payload[key];
     return send(null);
    }
    return send({message:'INVALID_STATE'},400);
   }
   if(path==='/rest/v1/rpc/rpc_save_meeting_topic'){
    const m=state.meetings.find(m=>m.id===args.p_meeting_id);const old=state.topicChecks.find(c=>c.meeting_id===m?.id&&c.topic_key===args.p_topic_key);
    if(!staff||!m)return send({message:'PERMISSION_DENIED'},403);
    if(!['in_progress','completed'].includes(m.status))return send({message:'INVALID_STATE'},400);
    if((old?.revision||0)!==args.p_expected_revision)return send({message:'CONFLICT'},409);
    if(!['pending','not_relevant','no_action','follow_up'].includes(args.p_result))return send({message:'VALIDATION'},400);
    let taskId=old?.followup_id||null;const p=args.p_followup;
    if(args.p_result!=='follow_up'&&state.followUps.some(t=>t.id===taskId&&['open','in_progress'].includes(t.status)))return send({message:'INVALID_STATE'},400);
    if(p){
     if(taskId||args.p_result!=='follow_up'||!p.title?.trim()||!p.due_on||!['client','representative'].includes(p.owner_role)||p.owner_role==='client'&&!p.visible_to_client)return send({message:'VALIDATION'},400);
     taskId=randomUUID();state.followUps.push({...p,id:taskId,meeting_id:m.id,family_id:m.family_id,item_id:null,owner_name:p.owner_role==='client'?'המשפחה':'נציג לדוגמה',status:'open',revision:1,updated_at:new Date().toISOString()});
    }
    if(args.p_result==='follow_up'&&!taskId)return send({message:'VALIDATION'},400);
    const row={id:old?.id||randomUUID(),meeting_id:m.id,topic_key:args.p_topic_key,result:args.p_result,note:args.p_note,followup_id:taskId,revision:(old?.revision||0)+1,updated_at:new Date().toISOString()};
    if(old)Object.assign(old,row);else state.topicChecks.push(row);return send(row);
   }
   if(path==='/rest/v1/rpc/rpc_save_meeting_followup'){

    const meeting=state.meetings.find(m=>m.id===args.p_meeting_id);const p=args.p_payload;const old=state.followUps.find(t=>t.id===args.p_id);
    if(!staff||!meeting)return send({message:'PERMISSION_DENIED'},403);
    if(!['in_progress','completed'].includes(meeting.status))return send({message:'INVALID_STATE'},400);
    if(!p||typeof p.title!=='string'||p.title.trim().length<3||!p.due_on||!['client','representative'].includes(p.owner_role)||(p.owner_role==='client'&&!p.visible_to_client)||p.item_id&&!state.meetingItems.some(i=>i.id===p.item_id&&i.meeting_id===meeting.id&&(!p.visible_to_client||i.visible_to_client)))return send({message:'VALIDATION'},400);
    if(old&&old.revision!==args.p_expected_revision)return send({message:'CONFLICT'},409);
    const row={id:args.p_id,meeting_id:meeting.id,family_id:meeting.family_id,item_id:p.item_id||null,title:p.title.trim(),details:p.details||'',owner_role:p.owner_role,owner_name:p.owner_staff?'נציג לדוגמה':meeting.family_id==='f1'?'ישראל לוי':'המשפחה',due_on:p.due_on,visible_to_client:p.visible_to_client,status:old?.status||'open',revision:(old?.revision||0)+1,updated_at:new Date().toISOString()};
    if(old)Object.assign(old,row);else state.followUps.push(row);return send(row);
   }
   if(path==='/rest/v1/rpc/rpc_set_followup_status'){
    const task=state.followUps.find(t=>t.id===args.p_id);
    if(!task||!staff&&!(task.family_id==='f1'&&task.visible_to_client&&task.owner_role==='client'))return send({message:'PERMISSION_DENIED'},403);
    if(!['open','in_progress','completed','cancelled'].includes(args.p_status)||role==='client'&&args.p_status==='cancelled')return send({message:'VALIDATION'},400);
    if(task.revision!==args.p_expected_revision)return send({message:'CONFLICT'},409);
    task.status=args.p_status;task.revision++;task.updated_at=new Date().toISOString();return send(null);
   }
   // Local draft/contact editing. Other mutations fail closed.

   if(path==='/rest/v1/rpc/rpc_save_family'){
    const f=state.families.find(f=>f.id===args.p_family_id&&(staff||f.id==='f1'));
    if(!f)return send({message:'PERMISSION_DENIED'},403);
    if(args.p_expected_updated_at!==f.updated_at)return send({message:'CONFLICT'},409);
    const allowed=staff?['answers','contact_name','phone','email','internal_notes']:['answers','contact_name','phone','email'];
    for(const key of allowed)if(Object.hasOwn(args.p_patch,key))f[key]=args.p_patch[key];
    f.updated_at=new Date().toISOString();return send(workspace(role).families.find(row=>row.id===f.id));
   }

return undefined;
}
