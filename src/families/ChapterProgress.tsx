import {useEffect,useId,useRef} from 'react';
import type {chapterProgress} from './chapter-progress';
import './chapter-progress.css';

export function ChapterProgress({steps,current,onSelect,compact=false}:{compact?:boolean;steps:ReturnType<typeof chapterProgress>;current:string;onSelect:(key:string)=>void}){
 const prefix=useId();const track=useRef<HTMLOListElement>(null);
 const keys=steps.map(s=>s.chapter.key).join(',');
 useEffect(()=>{const list=track.current;const button=list?.querySelector<HTMLButtonElement>('[aria-current=step]');if(list&&button){const rect=button.getBoundingClientRect();const box=list.getBoundingClientRect();list.scrollBy({left:rect.left-box.left-(box.width-rect.width)/2,behavior:'instant'});}},[current,keys]);
 return <div className="chapter-process">{!compact&&<p className="chapter-process-hint">אפשר לחזור לכל פרק ולתקן. שדות שמולאו עדיין דורשים שמירה; אפשר להשאיר פרקי רשות ריקים; תשובות שהוזנו נבדקות לפני השליחה.</p>}<nav aria-label="פרקי השאלון"><ol ref={track}>{steps.map(({chapter,required,remaining,invalid},index)=><li key={chapter.key} className={current===chapter.key?'current':required&&remaining===0&&!invalid?'filled':''}>
  <button type="button" aria-label={chapter.title} aria-describedby={`${prefix}-${chapter.key}`} aria-current={current===chapter.key?'step':undefined} onClick={()=>onSelect(chapter.key)}>
   <span className="process-node" aria-hidden="true">{index+1}</span><span className="process-title">{chapter.title}</span><span className="process-state" id={`${prefix}-${chapter.key}`}>{current===chapter.key?'כאן עכשיו · ':''}{invalid?(invalid===1?'שדה אחד לתיקון':`${invalid} שדות לתיקון`):!required?'פרק רשות':remaining?(remaining===1?'שדה אחד להשלמה':`${remaining} שדות להשלמה`):'שדות החובה מולאו'}</span>
  </button>
 </li>)}</ol></nav><p className="chapter-process-mobile">גללו לצדדים כדי לראות את כל הפרקים.</p></div>;
}
