export type PageName='overview'|'questionnaire'|'families'|'tasks'|'meetings'|'followups'|'notifications'|'admin'|'referrals'|'telephone'|'missing';
export type RouteState={page:PageName;id?:string;tab?:string;kind?:string;family?:string;q?:string;filter?:string;stage?:string;topic?:string;cursor?:string;focus?:string};
const pages=['overview','questionnaire','families','tasks','meetings','followups','notifications','admin','referrals','telephone'];
const tabs=['overview','questionnaire','documents','services','tasks','meetings','followups'];
export function readRoute(hash:string):RouteState{
 if(!hash.startsWith('#/'))return {page:'overview'};
 try{
  const [path,query='']=hash.slice(2).split('?');const parts=path.split('/').filter(Boolean).map(decodeURIComponent);
  const [page='overview',a,b]=parts;const params=new URLSearchParams(query);
  if(!pages.includes(page)||parts.length>3)return {page:'missing'};
  const r:RouteState={page:page as PageName};
  if(page==='families'&&a){r.id=a;r.tab=b||'overview';if(!tabs.includes(r.tab))return {page:'missing'};}
  else if(page==='tasks'){r.kind=a||'analysis';if(!['analysis','execution'].includes(r.kind))return {page:'missing'};if(b)r.id=b;}
  else if(page==='meetings'&&a){if(b)return {page:'missing'};r.id=a;}
  else if(a)return {page:'missing'};
  for(const key of ['family','q','filter','stage','topic','cursor','focus'] as const){const v=params.get(key);if(v)r[key]=v;}
  if(r.stage&&!['prepare','discussion','summary','checklist'].includes(r.stage))return {page:'missing'};
  return r;
 }catch{return {page:'missing'};}
}
export function routeHash(r:RouteState){
 const parts:string[]=[r.page];
 if(r.page==='families'&&r.id)parts.push(r.id,r.tab||'overview');
 if(r.page==='tasks'){parts.push(r.kind||'analysis');if(r.id)parts.push(r.id);}
 if(r.page==='meetings'&&r.id)parts.push(r.id);
 const query=new URLSearchParams();for(const key of ['family','q','filter','stage','topic','cursor','focus'] as const)if(r[key])query.set(key,r[key]!);
 return '#/'+parts.map(encodeURIComponent).join('/')+(query.size?'?'+query:'');
}
