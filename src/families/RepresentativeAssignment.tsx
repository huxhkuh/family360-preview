import {useState} from 'react';
import type {Family,Workspace} from '../lib/model';
import {rpc} from '../lib/backend';
import {Field,Panel,SaveForm,textValue} from '../ui';

export function RepresentativeAssignment({family,w,refresh}:{family:Family;w:Workspace;refresh:()=>Promise<void>}){
 const [saved,setSaved]=useState(false);
 const eligible=w.representatives.filter(r=>r.active&&w.profiles.some(p=>p.id===r.profile_id&&p.active&&p.role==='representative'));
 const current=eligible.find(r=>r.id===family.representative_id);
 return <Panel title="הנציג שמרכז את התיק">{current?<p role={saved?'status':undefined}>התיק באחריות {current.name}.</p>:<><p>בחרו נציג פעיל. התיק יופיע בתור העבודה שלו לאחר השיוך.</p>{eligible.length?<SaveForm label="שיוך הנציג לתיק" save={async d=>{await rpc('rpc_assign_family_representative',{p_family_id:family.id,p_representative_id:textValue(d,'representative'),p_expected_updated_at:family.updated_at});await refresh();setSaved(true);}}><Field label="נציג לטיפול"><select name="representative" required defaultValue=""><option value="">בחרו נציג</option>{eligible.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></Field></SaveForm>:<p className="hint">אין נציג פעיל שניתן לשייך. יש להפעיל נציג באזור הניהול, ואז לחזור לכאן. <a href="#/admin">לניהול הנציגים</a></p>}</>}</Panel>;
}
