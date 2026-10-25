import {getQuestionHelp} from './questionnaire-help';
import {CompanionPortrait} from '../companion/Companion';
import {useEffect,useId,useRef,useState} from 'react';

export function QuestionHelp({fieldKey,label,option}:{fieldKey:string;label:string;option?:string}){
 const id=useId();const [open,setOpen]=useState(false);const card=useRef<HTMLDivElement>(null);const trigger=useRef<HTMLElement>(null);
 useEffect(()=>{
  const node=card.current;if(!node)return;
  if(!open){if(node.matches(':popover-open'))node.hidePopover();return;}
  const position=()=>{const rect=trigger.current?.getBoundingClientRect();if(!rect)return;const width=Math.min(370,innerWidth-24);node.style.width=width+'px';const height=node.getBoundingClientRect().height;node.style.left=Math.max(12,Math.min(rect.right-width,innerWidth-width-12))+'px';node.style.top=Math.max(12,Math.min(rect.bottom+8,innerHeight-height-12))+'px';};
  node.showPopover();position();addEventListener('resize',position);addEventListener('scroll',position,true);
  return()=>{removeEventListener('resize',position);removeEventListener('scroll',position,true);};
 },[open]);
 const help=getQuestionHelp(fieldKey,option);
 if(!help)return null;
 return <details className="question-help" open={open} onToggle={e=>{if(e.target===e.currentTarget)setOpen(e.currentTarget.open);}}><summary ref={trigger} aria-label={`הסבר על ${label}`} aria-controls={id}><span aria-hidden="true">?</span></summary><div ref={card} id={id} popover="auto" role="note" aria-label={`הסבר על ${label}`} onToggle={e=>{if(e.target===e.currentTarget&&!e.currentTarget.matches(':popover-open'))setOpen(false);}} className="question-help-body question-help-with-companion"><CompanionPortrait pose="explain"/><div className="speech-bubble"><strong>{label}</strong><p>{help.meaning}</p><p>{help.guidance}</p>{help.more?<details className="question-help-more"><summary>דוגמה ופרטים נוספים</summary>{help.example&&<p className="question-help-example">{help.example}</p>}<p>{help.more}</p></details>:help.example&&<p className="question-help-example"><b>לדוגמה: </b>{help.example}</p>}<button type="button" className="text-button" onClick={()=>{setOpen(false);trigger.current?.focus();}}>סגירת ההסבר</button></div></div></details>;
}
