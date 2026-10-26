import {FinalReportPanel} from '../reports/FinalReportPanel';
import {useRetainedState,useWorkingDrafts} from '../lib/draft-guard';
import {CallContext} from './CallContext';
import {MeetingBrief} from './MeetingBrief';
import {ResourceLibrary} from '../resources/ResourceLibrary';
import {RentReminder} from '../families/PreparationTip';
import {MeetingControls} from './MeetingControls';
import {ComparisonDetails} from './ComparisonDetails';
import {comparisonGaps,readComparison} from './comparison';
import './comparison.css';
import {CallReference} from './CallReference';
import {useEffect,useRef,useState} from 'react';
import type {Meeting,MeetingItem,Workspace} from '../lib/model';
import {rpc} from '../lib/backend';
import {AsyncButton,Badge,Empty,Field,SaveForm} from '../ui';
import {Icon} from '../icons';
import {TopicChecklist} from './TopicChecklist';
import {availableMeetingTopics} from './topic-catalog';
import {FollowUps} from '../followups/FollowUps';
import {clientSummary,decisionNext,decisionOptions,meetingProgress,nextOpenTopic} from './meeting-flow';

function TopicEvidence({children,id}:{children:React.ReactNode;id:string}){const [open,setOpen]=useRetainedState('evidence:'+id,()=>window.innerWidth>1100);return <details className="topic-evidence" open={open} onToggle={e=>{if(e.currentTarget.open!==open)setOpen(e.currentTarget.open);}}><summary>ממצאים והשוואה — כל הפרטים</summary>{children}</details>;}
function PublicSummary({items}:{items:MeetingItem[]}){
 const visible=clientSummary(items);
 return <section className="client-summary" aria-label="סיכום גלוי ללקוח"><h2>הנושאים וההחלטות שלכם</h2><p className="muted">הסיכום מציג את המידע וההחלטות שנשמרו בנושאים המשותפים איתכם.</p>{visible.map(i=><article key={i.id}><div className="section-heading"><h3>{i.title||'נושא לשיחה'}</h3><Badge status={i.client_decision||'undecided'}/></div><p>{i.client_summary||'עדיין לא הוזן סיכום לנושא זה.'}</p><p className="after-decision"><strong>המשך הטיפול: </strong>{decisionNext(i.client_decision,'client')}</p></article>)}{!visible.length&&<Empty>עדיין אין נושאים ששותפו עם המשפחה בשיחה זו.</Empty>}</section>;
}

function DecisionEditor({item,meetingId,refresh,onDirtyChange,w,onSaved,nextLabel}:{item:MeetingItem;meetingId:string;refresh:()=>Promise<void>;onDirtyChange:(dirty:boolean)=>void;w:Workspace;onSaved:()=>void;nextLabel:string}){
 const mounted=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const existing=w.followUps.find(t=>t.item_id===item.id&&['open','in_progress'].includes(t.status));
 const initial={decision:item.client_decision||'undecided',note:item.decision_note||'',instructions:item.execution_instructions||'',include:!!existing,title:existing?.title||`לחזור למשפחה בנושא ${item.title||'ההחלטה'}`,due:existing?.due_on||'',owner:existing?.owner_role||'representative',shared:existing?.visible_to_client||false};
 const [work,setWork]=useRetainedState('decision:'+meetingId+':'+item.id,()=>({draft:initial,saved:initial,revision:existing?.revision??null,followupId:existing?.id||crypto.randomUUID()}),v=>JSON.stringify(v.draft)!==JSON.stringify(v.saved),item.title||'החלטה בשיחה');
 const {draft,saved,revision,followupId}=work;const setDraft=(draft:typeof initial)=>setWork(prev=>({...prev,draft}));
 const dirty=JSON.stringify(draft)!==JSON.stringify(saved);const [discard,setDiscard]=useState(false);
 useEffect(()=>{if(!dirty)setWork({draft:initial,saved:initial,revision:existing?.revision??null,followupId:existing?.id||followupId});},[item.client_decision,item.decision_note,item.execution_instructions,existing?.id,existing?.revision]);
 useEffect(()=>{onDirtyChange(false);},[onDirtyChange]);
 return <SaveForm protectDraft={false} label="שמירת החלטה ותיעוד" submitActions={<div className="call-save-actions"><button className="primary" type="submit" name="intent" value="next" disabled={draft.decision==='undecided'}>{nextLabel}</button><button className="ghost" type="submit" name="intent" value="stay">שמירת החלטה ותיעוד</button>{draft.decision==='undecided'&&<small>בחרו החלטה כדי לשמור ולהמשיך. אפשר לשמור תיעוד ולחזור להחלטה בהמשך.</small>}</div>} successMessage="ההחלטה והתיעוד נשמרו. אפשר לעבור לנושא הבא או לחזור לשיחה בהמשך." save={async(_data,action)=>{
  if(w.workflowV2Enabled&&draft.decision==='thinking'&&draft.include){
   const result=await rpc<{revision:number}>('rpc_save_decision_followup',{p_meeting_id:meetingId,p_item_id:item.id,p_decision:draft.decision,p_note:draft.note,p_instructions:draft.instructions,p_followup_id:followupId,p_expected_revision:revision,p_followup:{title:draft.title,details:existing?.details||'',owner_role:draft.owner,due_on:draft.due,visible_to_client:draft.shared}});
   setWork(prev=>({...prev,revision:result.revision}));
  }else await rpc('rpc_meeting_action',{p_meeting_id:meetingId,p_action:'decision',p_payload:{item_id:item.id,client_decision:draft.decision,decision_note:draft.note,execution_instructions:draft.instructions,approved_actions:item.approved_actions||[]}});
  await refresh();setWork(prev=>({...prev,saved:draft}));
  if(mounted.current&&action==='next'&&draft.decision!=='undecided')onSaved();
 }}><Field label="מה הלקוח החליט?"><select value={draft.decision} onChange={e=>setDraft({...draft,decision:e.target.value,include:e.target.value==='thinking'&&w.workflowV2Enabled?true:draft.include})}>{decisionOptions.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></Field><p className="hint">{decisionNext(draft.decision)}</p>{draft.decision==='thinking'&&w.workflowV2Enabled&&<section className="followup-editor"><h3>הצעד הבא לאחר ההחלטה</h3><label><input type="checkbox" checked={draft.include} onChange={e=>setDraft({...draft,include:e.target.checked})}/>{existing?'עדכון משימת ההמשך הקיימת יחד עם ההחלטה':'יצירת משימת המשך יחד עם ההחלטה'}</label>{draft.include&&<><Field label="פעולת ההמשך"><input required minLength={3} maxLength={200} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></Field><div className="fields"><Field label="אחראי להמשך"><select value={draft.owner} onChange={e=>setDraft({...draft,owner:e.target.value as 'client'|'representative',shared:e.target.value==='client'||draft.shared})}><option value="representative">הנציג המטפל</option>{item.visible_to_client&&<option value="client">המשפחה</option>}</select></Field><Field label="מועד חזרה"><input type="date" required value={draft.due} onChange={e=>setDraft({...draft,due:e.target.value})}/></Field></div><label><input type="checkbox" checked={draft.shared} disabled={draft.owner==='client'||!item.visible_to_client} onChange={e=>setDraft({...draft,shared:e.target.checked})}/>הצגת פעולת ההמשך ללקוח</label><p className="hint">ההערה הפנימית והוראות הביצוע אינן מועתקות למשימה. אין שליחת הודעה.</p></>}{existing&&!draft.include&&<p>משימת ההמשך הקיימת תישאר ללא שינוי.</p>}</section>}<div className="internal-fields"><p className="eyebrow"><Icon name="insurance"/> תיעוד פנימי — אינו מוצג ללקוח</p><Field label="תיעוד ההחלטה לצוות"><textarea maxLength={5000} value={draft.note} onChange={e=>setDraft({...draft,note:e.target.value})}/></Field><details className="call-execution-notes" open={saved.instructions?true:undefined}><summary>הוראות לביצוע · לפי הצורך</summary><Field label="הוראות לביצוע"><textarea maxLength={5000} value={draft.instructions} onChange={e=>setDraft({...draft,instructions:e.target.value})}/></Field></details></div><p className="muted" role="status">{dirty?'טיוטה נשמרת במעבר בין נושאים · ההחלטה טרם נשמרה בתיק':'מוצג התיעוד שנשמר בתיק'}</p>{dirty&&<button type="button" className="ghost" onClick={()=>setDiscard(true)}>ביטול טיוטת ההחלטה</button>}{discard&&<div className="hint"><p>לבטל את הטיוטה ולחזור להחלטה השמורה?</p><button type="button" onClick={()=>{setDraft(saved);setDiscard(false);}}>כן, ביטול הטיוטה</button><button type="button" className="ghost" onClick={()=>setDiscard(false)}>המשך עריכה</button></div>}</SaveForm>;
}

export function MeetingSession({meeting:m,w,edit,refresh,onDirtyChange,leave,back,openFamily,stage='',topic,onView}:{meeting:Meeting;w:Workspace;edit:boolean;refresh:()=>Promise<void>;onDirtyChange:(dirty:boolean)=>void;leave:()=>boolean;back:()=>void;openFamily:(id:string,target?:import('../lib/workflow').Destination)=>void;stage?:string;topic?:string;onView:(patch:{stage?:string;topic?:string})=>void}){
 const working=useWorkingDrafts();const pendingDecisions=working.pending('decision:'+m.id+':');
 const meetingTopics=availableMeetingTopics(w.questionnaireV2Enabled);
 const items=w.meetingItems.filter(i=>i.meeting_id===m.id).sort((a,b)=>(a.sort_order??0)-(b.sort_order??0)||a.id.localeCompare(b.id));
 const [initialTopic]=useState(()=>items.find(i=>i.visible_to_client&&(!i.client_decision||i.client_decision==='undecided'))?.id||items[0]?.id||'');
 const selected=topic||initialTopic;
 const setStage=(stage:string)=>onView({stage});
 const [dirty,setDirty]=useState(false);
 const [notice,setNotice]=useState('');
 const topicHeading=useRef<HTMLHeadingElement>(null);
 const decisionPanel=useRef<HTMLElement>(null);
 const previousTopic=useRef<string|undefined>(undefined);
 const viewGeneration=useRef(0);
 useEffect(()=>{viewGeneration.current++;return()=>{viewGeneration.current++;};},[m.id,stage,topic]);
 const closed=['completed','cancelled'].includes(m.status);
 const activeStage=edit&&stage==='checklist'&&w.topicChecksEnabled?'checklist':!edit||closed?'summary':(stage==='checklist'?'':stage)||(m.status==='scheduled'?'prepare':'discussion');
 const current=items.find(i=>i.id===selected)||items.find(i=>i.visible_to_client&&(!i.client_decision||i.client_decision==='undecided'))||items[0];
 const progress=meetingProgress(items);
 const family=w.families.find(f=>f.id===m.family_id);
 const checked=meetingTopics.filter(t=>w.topicChecks.some(c=>c.meeting_id===m.id&&c.topic_key===t.key&&c.result!=='pending')).length;
 const checksPending=w.topicChecksEnabled&&checked<meetingTopics.length;
 const nextTopic=current?nextOpenTopic(items,current.id):undefined;
 const nextStage=checksPending?'checklist':'summary';
 const steps=[['prepare','הכנה לשיחה'],['discussion','נושאים והחלטות'],...(w.topicChecksEnabled?[['checklist','בדיקת נושאים נוספים']]:[]),['summary','סיכום והמשך']];
 useEffect(()=>{onDirtyChange(dirty);return()=>onDirtyChange(false);},[dirty,onDirtyChange]);
 useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});},[activeStage]);
 useEffect(()=>{
  if(activeStage!=='discussion')return;
  const changed=previousTopic.current!==undefined&&previousTopic.current!==current?.id;
  previousTopic.current=current?.id;
  const frame=requestAnimationFrame(()=>{topicHeading.current?.focus({preventScroll:true});if(changed)topicHeading.current?.scrollIntoView({block:'start',behavior:'instant'});});
  return()=>cancelAnimationFrame(frame);
 },[activeStage,current?.id]);
 const move=(action:()=>void)=>{if(!leave())return;setNotice('');action();};
 const continueAfterSave=()=>{
  setDirty(false);setNotice('ההחלטה בנושא '+(current?.title||'זה')+' נשמרה.');
  if(nextTopic)onView({stage:'discussion',topic:nextTopic.id});else setStage(nextStage);
 };
 const start=async()=>{const generation=viewGeneration.current;await rpc('rpc_meeting_action',{p_meeting_id:m.id,p_action:'start'});await refresh();if(generation===viewGeneration.current)setStage('discussion');};
 const guidance=activeStage==='prepare'
  ?['מתכוננים לפתיחת השיחה','מוודאים עם מי מדברים ועוברים בקצרה על הנושאים שהוכנו. כשהלקוח על הקו, מתחילים.']
  :activeStage==='discussion'
  ?[current?.visible_to_client?'מסבירים, מקשיבים ומתעדים החלטה':'בודקים את התיעוד הפנימי',current?.visible_to_client?'מסבירים את המצב והחלופה, מבררים מה מתאים למשפחה, ושומרים כדי להתקדם.':'הנושא הזה מיועד לצוות בלבד. הוא אינו חלק מהסיכום הגלוי למשפחה.']
  :activeStage==='checklist'
  ?['בודקים אם יש עוד משהו שדורש טיפול','שואלים את השאלה שמופיעה בכל נושא, מסמנים תוצאה וממשיכים. אם נדרש בירור, קובעים אחראי ומועד.']
  :m.status==='completed'
  ?['השיחה הסתיימה והסיכום נשמר','ממשיכים לטפל בהחלטות ובמשימות שסוכמו עם המשפחה.']
  :m.status==='cancelled'
  ?['הפגישה בוטלה','אפשר לעיין בתיעוד שנשמר ולתאם פגישה חדשה דרך תיק המשפחה.']
  :[progress.missing.length?'משלימים החלטות לפני הסיום':'מסכמים עם המשפחה את הצעד הבא',progress.missing.length?'חוזרים לנושאים הפתוחים ומתעדים החלטה. לאחר מכן עוברים על הסיכום ועל המשימות.':'קוראים יחד את הסיכום, מוודאים מי מטפל ובאיזה מועד, ואז מסיימים את הפגישה.'];
 return <div className={edit?'call-session':'meeting-summary-view'}>
  <button className="ghost" onClick={back}>חזרה למסך הקודם</button>
  <header className="page-title call-title"><div><p className="eyebrow">שיחת נציג · {m.scheduled_at?new Date(m.scheduled_at).toLocaleString('he-IL',{dateStyle:'medium',timeStyle:'short'}):'מועד טרם נקבע'} · {{phone:'שיחה טלפונית',video:'שיחת וידאו',zoom:'שיחת וידאו',inperson:'פגישה פרונטלית'}[m.type||'']||'פרטי השיחה'}</p><h1>{family?.name||'שיחת נציג'}</h1></div>{family&&<button className="text-button" onClick={()=>openFamily(family.id)}>לתיק המשפחה</button>}</header>
  {edit&&<div className="call-contact-bar" aria-label="פרטי הלקוח והתקדמות השיחה"><div><div className="call-person"><strong>{family?.name||'המשפחה בשיחה'}</strong><small>{family?.contact_name||'איש קשר טרם הוגדר'}</small></div>{family?.phone?<bdi className="call-phone">{family.phone}</bdi>:<span>טלפון טרם הוגדר</span>}<Badge status={m.status}/></div><div className="call-progress"><span>{progress.decided} מתוך {progress.total} החלטות נשמרו</span>{progress.total>0&&<progress max={progress.total} value={progress.decided} aria-label="החלטות שנשמרו"/>}<small>{dirty||pendingDecisions.length>0?'יש טיוטות שטרם נשמרו בתיק':'מוצגים הנתונים שנשמרו'}</small></div></div>}
  {!edit&&<Badge status={m.status}/>}
  {edit&&<nav className="meeting-steps" aria-label="שלבי השיחה">{steps.map(([key,label],index)=><button key={key} aria-current={activeStage===key?'step':undefined} aria-label={key==='checklist'?'רשימת בדיקה · '+meetingTopics.length+' נושאים':undefined} className={activeStage===key?'selected':'ghost'} disabled={closed&&!['summary','checklist'].includes(key)} onClick={()=>{if(key!==activeStage)move(()=>setStage(key));}}><span>{index+1}</span>{label}{key==='checklist'&&<small>{checked}/{meetingTopics.length}</small>}</button>)}</nav>}
  {edit&&<section className="call-guidance" aria-label="מה עושים עכשיו"><div><p className="eyebrow">{closed?'מצב הפגישה':'עכשיו בשיחה'}</p><h2>{guidance[0]}</h2><p>{guidance[1]}</p></div>{activeStage==='summary'&&!closed&&progress.missing[0]&&<button className="primary" onClick={()=>move(()=>onView({stage:'discussion',topic:progress.missing[0].id}))}>להחלטה הבאה שחסרה</button>}</section>}
  {notice&&<p className="success call-saved-notice" role="status">{notice}</p>}
  {edit&&family&&<><CallContext w={w} family={family} meeting={m} refresh={refresh}/><CallReference family={family} w={w}/></>}
  {edit&&w.workflowV2Enabled&&<MeetingControls meeting={m} refresh={refresh} leave={leave}/>}
  {activeStage==='checklist'&&<TopicChecklist w={w} meeting={m} refresh={refresh} onDirtyChange={setDirty} leave={leave} onComplete={()=>move(()=>setStage('summary'))}/>}
  {activeStage==='prepare'&&<section className="card meeting-preparation">
   {w.profile.role!=='representative'&&<MeetingBrief items={items} w={w} familyId={m.family_id}/>}
   <h2>מגיעים לשיחה עם תמונה מסודרת</h2><p className="call-opening"><strong>אפשר לפתוח כך: </strong>״נעבור יחד על מה שבדקנו, נחליט מה מתאים לכם, ובסוף נסכם מי עושה מה ומתי.״</p>
   <div className="call-preparation-action"><div><strong>{progress.total} המלצות מוכנות לשיחה</strong><p className="muted">מתקדמים נושא־נושא. בכל שלב אפשר לחזור ולעדכן.</p></div>{m.status==='scheduled'?<AsyncButton className="primary" disabled={!items.length} action={start}>התחלת פגישה</AsyncButton>:<button className="primary" onClick={()=>setStage('discussion')}>חזרה לנושאים</button>}</div>
   <h3>הנושאים שנעבור עליהם</h3>{items.map(i=><button className="agenda-link" key={i.id} onClick={()=>move(()=>onView({topic:i.id,stage:'discussion'}))}><span>{i.title||'נושא לשיחה'}</span><span className="muted">{i.visible_to_client?'משותף עם הלקוח':'פנימי לצוות'} · {comparisonGaps(readComparison(i.financial?.comparison)).length} פרטי השוואה להשלמה</span></button>)}
   {!items.length&&<Empty>אין נושאים בשיחה. יש לבדוק את התיק לפני תחילת השיחה.</Empty>}
   {w.profile.role==='representative'&&<MeetingBrief items={items} w={w} familyId={m.family_id}/>}
   <details><summary>על הנתונים שהוכנו לשיחה</summary><p className="muted">השיחה מציגה עותק של הממצאים שאושרו בעת תיאומה. ניתוח שעודכן לאחר מכן אינו מתעדכן כאן אוטומטית. עוברים על תאריך הבדיקה, בסיס החישוב והתנאים; נתון חסר מבקשים להשלים לפני החלטה.</p></details>
  </section>}
 {edit&&pendingDecisions.length>0&&<section className="draft-tray" aria-label="טיוטות החלטה בשיחה"><strong>{pendingDecisions.length} טיוטות החלטה שטרם נשמרו בתיק</strong><span>אפשר לעבור בין נושאים ולחזור. סיום השיחה יתאפשר לאחר שמירה או ביטול של הטיוטות.</span>{pendingDecisions.map(d=><button className="ghost" key={d.key} onClick={()=>move(()=>onView({stage:'discussion',topic:d.key.slice(('decision:'+m.id+':').length)}))}>חזרה לטיוטה: {d.label}</button>)}</section>}
  {activeStage==='discussion'&&<>
   <nav className="meeting-agenda" aria-label="נושאי השיחה">{items.map((i,index)=><button key={i.id} aria-current={current?.id===i.id?'page':undefined} className={current?.id===i.id?'active':''} onClick={()=>{if(i.id!==current?.id)move(()=>onView({topic:i.id}));}}><span className="topic-number">{index+1}</span><span><strong>{i.title||'נושא לשיחה'}</strong><small>{i.visible_to_client?'גלוי ללקוח':'פנימי לצוות'}</small><Badge status={i.client_decision||'undecided'}/>{pendingDecisions.some(d=>d.key==='decision:'+m.id+':'+i.id)&&<span className="draft-dot">טיוטה</span>}</span></button>)}</nav>
   {current?<section className="meeting-topic call-topic"><header className="call-topic-heading"><p className="eyebrow">נושא {items.indexOf(current)+1} מתוך {items.length} · {current.visible_to_client?'משותף עם הלקוח':'פנימי לצוות'}</p><h2 ref={topicHeading} tabIndex={-1}>{current.title||'נושא לשיחה'}</h2></header><div className="call-topic-columns"><div className="call-explanation">
    <p className="call-question"><strong>{current.visible_to_client?'שאלה למשפחה: ':'לבדיקה פנימית: '}</strong>{current.visible_to_client?'״אחרי שעברנו על האפשרויות, איך תרצו להתקדם בנושא הזה?״':'מה צריך לתאם בצוות כדי לקדם את הטיפול?'}</p>
    <button className="call-decision-shortcut" onClick={()=>{decisionPanel.current?.scrollIntoView({block:'start',behavior:'instant'});decisionPanel.current?.querySelector('select')?.focus({preventScroll:true});}}>לתיעוד ההחלטה</button><TopicEvidence key={current.id} id={current.id}><ComparisonDetails value={current.financial?.comparison} currentSituation={current.current_situation} recommendation={current.recommendation}/>
    <details className="summary-preview"><summary>{current.visible_to_client?'הסיכום שמוצג ללקוח בנושא זה':'הסיכום הפנימי בנושא זה'}</summary><p>{current.client_summary||'טרם הוזן סיכום.'}</p></details></TopicEvidence>
   </div><aside ref={decisionPanel} className="call-decision" aria-label="תיעוד ההחלטה"><h3>מה סיכמנו?</h3><p className="call-decision-topic">{current.title||'נושא לשיחה'}</p>{m.status==='in_progress'?<DecisionEditor w={w} key={current.id} item={current} meetingId={m.id} refresh={refresh} onDirtyChange={setDirty} onSaved={continueAfterSave} nextLabel={nextTopic?'שמירה והמשך לנושא הבא':checksPending?'שמירה והמשך לרשימת הבדיקה':'שמירה והמשך לסיכום'}/>:<><p className="hint">אפשר לעיין בממצאים כעת. תיעוד החלטות זמין לאחר תחילת הפגישה.</p><AsyncButton className="primary" action={start}>התחלת פגישה</AsyncButton></>}</aside></div></section>:<Empty>אין נושאים להצגה.</Empty>}
   <div className="call-stage-actions">{w.topicChecksEnabled&&<button onClick={()=>move(()=>setStage('checklist'))}>להמשך בדיקת הנושאים</button>}<button className="ghost" onClick={()=>move(()=>setStage('summary'))}>לבדיקת הסיכום והמשך הטיפול</button></div>
  </>}
  {activeStage==='summary'&&<>
   {edit&&m.status==='in_progress'&&checksPending&&<p className="hint">ברשימת הבדיקה נבדקו {checked} מתוך {meetingTopics.length} נושאים. <button className="text-button" onClick={()=>move(()=>setStage('checklist'))}>להשלמת הבדיקה</button></p>}
   <section className="card"><p className="eyebrow">{edit?'תצוגת הסיכום הגלוי ללקוח':'סיכום השיחה'}</p>{m.status==='cancelled'&&<p className="hint">השיחה בוטלה. המשך הטיפול יתואם עם הנציג.</p>}{!closed&&<p className="hint">השיחה טרם הסתיימה. מוצגות רק ההחלטות שכבר נשמרו.</p>}<PublicSummary items={items}/>{family?.answers?.housing==='rent'&&<RentReminder/>}{w.resourceLibraryEnabled&&<details className="summary-resources"><summary>קישורים ופרטי קשר להמשך</summary><ResourceLibrary version={w}/></details>}</section>
   <section className="card"><FollowUps openFamily={openFamily} w={w} refresh={refresh} meetingId={m.id} onDirtyChange={setDirty} leave={leave}/>{edit&&w.followUpsEnabled&&<details className="summary-preview"><summary>תצוגת משימות ההמשך של הלקוח</summary><FollowUps openFamily={openFamily} w={w} refresh={refresh} meetingId={m.id} onDirtyChange={setDirty} leave={leave} preview/></details>}</section>
   {edit&&m.status==='in_progress'&&<section className="card meeting-finish"><h2>בדיקה לפני סיום השיחה</h2>{progress.missing.length>0?<><p>נותרו {progress.missing.length} נושאים גלויים ללא החלטה. חזרו אליהם לפני הסיום:</p>{progress.missing.map(i=><button className="ghost" key={i.id} onClick={()=>move(()=>onView({topic:i.id,stage:'discussion'}))}>{i.title}</button>)}</>:<p>כל הנושאים הגלויים כוללים החלטה שמורה. נושאים שאושרו ימתינו לשיוך לביצוע; נושאים למחשבה יישארו למעקב הנציג.</p>}<p className="muted">סיום השיחה מעדכן את מצב התחומים בתיק. הוא אינו שולח מייל ואינו משייך בעל מקצוע אוטומטית.</p><AsyncButton className="primary" disabled={progress.missing.length>0||dirty||pendingDecisions.length>0||!items.length} action={async()=>{await rpc('rpc_finish_meeting',{p_meeting_id:m.id,p_force:false});await refresh();}}>סיום הפגישה ושמירת הסיכום</AsyncButton></section>}
   {edit&&m.status==='completed'&&<section className="card"><h2>המשך הטיפול באחריות הנציג</h2><button className="primary" onClick={()=>openFamily(m.family_id,'services')}>לשיוך בתחומי הטיפול</button><p>בדקו בתיק המשפחה אילו תחומים ממתינים לשיוך לביצוע ואילו נושאים ממתינים להחלטת המשפחה.</p><p className="muted">התיעוד הפנימי שנשמר נגיש כאן לצוות המורשה.</p>{items.filter(i=>i.decision_note||i.execution_instructions).map(i=><details key={i.id}><summary>{i.title} — תיעוד פנימי</summary><p>{i.decision_note}</p><p>{i.execution_instructions}</p></details>)}</section>}
   <FinalReportPanel w={w} meeting={m} refresh={refresh}/>
  </>}
 </div>;
}
