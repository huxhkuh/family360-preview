export type CustomerStage='payment'|'paid'|'questionnaire'|'complete'|'dashboard';
export type CustomerAction={type:'pay'}|{type:'start'}|{type:'submit';submitted:boolean}|{type:'dashboard'};
export function customerStage(stage:CustomerStage,action:CustomerAction):CustomerStage{
 if(stage==='payment'&&action.type==='pay')return 'paid';
 if(stage==='paid'&&action.type==='start')return 'questionnaire';
 if(stage==='questionnaire'&&action.type==='submit'&&action.submitted)return 'complete';
 if(stage==='complete'&&action.type==='dashboard')return 'dashboard';
 return stage;
}
