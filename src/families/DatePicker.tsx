import {useId,useLayoutEffect,useRef,useState,type InputHTMLAttributes,type KeyboardEvent} from 'react';
import {createPortal} from 'react-dom';
import {Icon} from '../icons';
import {isoDate,parseDate,moveMonth,monthDays} from './date-calendar';
import './date-picker.css';

type Props=Omit<InputHTMLAttributes<HTMLInputElement>,'type'|'value'|'onChange'> & {value:string;label:string;onValueChange:(value:string)=>void};
const months=Array.from({length:12},(_,i)=>new Intl.DateTimeFormat('he-IL',{month:'long'}).format(new Date(2020,i,1)));
const fullDate=new Intl.DateTimeFormat('he-IL',{day:'numeric',month:'long',year:'numeric'});
export function DatePicker({value,onValueChange,label,...props}:Props){
 const popupId=useId(),input=useRef<HTMLInputElement>(null),trigger=useRef<HTMLButtonElement>(null),popup=useRef<HTMLDivElement>(null);
 const [open,setOpen]=useState(false),[cursor,setCursor]=useState(()=>parseDate(value)||new Date());
 const [position,setPosition]=useState({top:0,left:0});
 const today=isoDate(new Date()),min=typeof props.min==='string'?props.min:undefined,max=typeof props.max==='string'?props.max:undefined;
 const allowed=(date:string)=>(!min||date>=min)&&(!max||date<=max);
 const close=(restore=false)=>{setOpen(false);if(restore)trigger.current?.focus({preventScroll:true});};
 function show(){
  if(input.current?.matches(':disabled')||props.readOnly)return;
  const selected=parseDate(value)||new Date();
  setCursor(parseDate(max&&isoDate(selected)>max?max:min&&isoDate(selected)<min?min:isoDate(selected))||selected);
  setOpen(true);
 }
 function select(date:string){
  if(input.current?.matches(':disabled')){close();return;}
  onValueChange(date);close();input.current?.focus({preventScroll:true});
 }
 useLayoutEffect(()=>{
  if(!open)return;
  function positionPopup(){
   const box=input.current?.getBoundingClientRect(),panel=popup.current;if(!box||!panel)return;
   const w=panel.offsetWidth,h=panel.offsetHeight;
   setPosition({left:Math.max(12,Math.min(box.right-w,innerWidth-w-12)),top:Math.max(12,Math.min(box.bottom+8+h<=innerHeight-12?box.bottom+8:box.top-h-8,innerHeight-h-12))});
  }
  positionPopup();
  popup.current?.querySelector<HTMLButtonElement>('[data-calendar-date][tabindex="0"]')?.focus({preventScroll:true});
  const outside=(e:PointerEvent)=>{if(!popup.current?.contains(e.target as Node)&&!trigger.current?.contains(e.target as Node))close();};
  const escape=(e:globalThis.KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close(true);}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  window.addEventListener('resize',positionPopup);window.addEventListener('scroll',positionPopup,true);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);window.removeEventListener('resize',positionPopup);window.removeEventListener('scroll',positionPopup,true);};
 },[open]);
 function navigate(next:Date,focus=false){
  if(!allowed(isoDate(next)))next=parseDate(min&&isoDate(next)<min?min:max||'')||next;
  setCursor(next);
  if(focus)requestAnimationFrame(()=>popup.current?.querySelector<HTMLButtonElement>(`[data-calendar-date="${isoDate(next)}"]`)?.focus({preventScroll:true}));
 }
 function onDayKey(e:KeyboardEvent<HTMLButtonElement>,day:Date){
  const offsets:Record<string,number>={ArrowRight:-1,ArrowLeft:1,ArrowUp:-7,ArrowDown:7,Home:-day.getDay(),End:6-day.getDay()};
  let next:Date;
  if(e.key in offsets){next=new Date(day);next.setDate(next.getDate()+offsets[e.key]);}
  else if(e.key==='PageUp'||e.key==='PageDown')next=moveMonth(day,(e.key==='PageUp'?-1:1)*(e.shiftKey?12:1));
  else return;
  e.preventDefault();navigate(next,true);
 }
 const days=monthDays(cursor),firstYear=Math.min(1900,cursor.getFullYear()),lastYear=Math.max(new Date().getFullYear()+20,cursor.getFullYear());
 return <div className="date-picker">
  <input {...props} ref={input} type="date" value={value} onChange={e=>onValueChange(e.target.value)} onKeyDown={e=>{props.onKeyDown?.(e);if(e.altKey&&e.key==='ArrowDown'){e.preventDefault();show();}}}/>
  <button ref={trigger} className="date-picker-toggle" type="button" disabled={props.disabled||props.readOnly} aria-label={`פתיחת לוח שנה: ${label}`} aria-expanded={open} aria-controls={open?popupId:undefined} aria-haspopup="dialog" onClick={()=>open?close():show()}><Icon name="meetings"/></button>
  {open&&createPortal(<div ref={popup} id={popupId} role="dialog" aria-label={`בחירת תאריך: ${label}`} className="date-calendar" dir="rtl" style={position} onKeyDown={e=>{
   if(e.key!=='Tab')return;
   const controls=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),select')).filter(el=>el.tabIndex>=0);
   if(e.shiftKey&&document.activeElement===controls[0]||!e.shiftKey&&document.activeElement===controls.at(-1)){e.preventDefault();close(true);}
  }} onBlur={e=>{if(e.relatedTarget&&!e.currentTarget.contains(e.relatedTarget as Node)&&e.relatedTarget!==trigger.current)close();}}>
   <header className="date-calendar-heading"><div><span>בחירת תאריך</span><strong>{label}</strong></div><button type="button" aria-label="סגירת לוח שנה" onClick={()=>close(true)}>×</button></header>
   <div className="date-calendar-controls">
    <button type="button" aria-label="החודש הקודם" disabled={!!min&&isoDate(new Date(cursor.getFullYear(),cursor.getMonth(),0))<min} onClick={()=>navigate(moveMonth(cursor,-1))}>‹</button>
    <label><span className="date-calendar-sr">חודש</span><select aria-label="חודש" value={cursor.getMonth()} onChange={e=>navigate(moveMonth(cursor,Number(e.target.value)-cursor.getMonth()))}>{months.map((month,i)=><option key={month} value={i}>{month}</option>)}</select></label>
    <label><span className="date-calendar-sr">שנה</span><select aria-label="שנה" value={cursor.getFullYear()} onChange={e=>navigate(moveMonth(cursor,(Number(e.target.value)-cursor.getFullYear())*12))}>{Array.from({length:lastYear-firstYear+1},(_,i)=>firstYear+i).filter(y=>(!min||y>=Number(min.slice(0,4)))&&(!max||y<=Number(max.slice(0,4)))).reverse().map(y=><option key={y} value={y}>{y}</option>)}</select></label>
    <button type="button" aria-label="החודש הבא" disabled={!!max&&isoDate(new Date(cursor.getFullYear(),cursor.getMonth()+1,1))>max} onClick={()=>navigate(moveMonth(cursor,1))}>›</button>
   </div>
   <p className="date-calendar-sr" aria-live="polite">{months[cursor.getMonth()]} {cursor.getFullYear()}</p>
   <div className="date-calendar-grid" role="grid" aria-label={`${months[cursor.getMonth()]} ${cursor.getFullYear()}`}>
    <div role="row" className="date-calendar-weekdays">{['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'].map(d=><span role="columnheader" key={d}>{d}</span>)}</div>
    {Array.from({length:6},(_,week)=><div role="row" key={week}>{days.slice(week*7,week*7+7).map(day=>{const iso=isoDate(day);return <span role="gridcell" aria-selected={iso===value} key={iso}><button type="button" data-calendar-date={iso} data-outside={day.getMonth()!==cursor.getMonth()} aria-current={iso===today?'date':undefined} aria-label={fullDate.format(day)} disabled={!allowed(iso)} tabIndex={iso===isoDate(cursor)?0:-1} onKeyDown={e=>onDayKey(e,day)} onClick={()=>select(iso)}>{day.getDate()}</button></span>;})}</div>)}
   </div>
   <footer><button type="button" disabled={!allowed(today)} onClick={()=>select(today)}>היום</button><span>יום / חודש / שנה</span><button type="button" disabled={!value} onClick={()=>select('')}>ניקוי</button></footer>
  </div>,document.body)}
 </div>;
}
