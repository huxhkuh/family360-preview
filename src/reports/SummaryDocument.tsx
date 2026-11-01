import {useRef} from 'react';
import {BrandLogo} from '../branding/Brand';
import {Icon} from '../icons';
import {summaryTemplate,type SummarySnapshot} from './conversation-summary';
import './conversation-summary.css';

export function printSummary(node:HTMLElement){
 document.getElementById('conversation-summary-print')?.remove();const frame=document.createElement('iframe');frame.id='conversation-summary-print';frame.title='הדפסת סיכום השיחה';frame.style.cssText='position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0';document.body.append(frame);
 const doc=frame.contentDocument;if(!doc){frame.remove();return;}doc.documentElement.lang='he';doc.documentElement.dir='rtl';doc.title='מסודרים 360 — סיכום השיחה';
 let css='';for(const sheet of [...document.styleSheets])try{for(const rule of [...sheet.cssRules])if(rule.cssText.includes('summary-paper')||rule.cssText.startsWith('@font-face'))css+=rule.cssText.replace(/url\(["']?([^"')]+)["']?\)/g,(_,url)=>'url("'+new URL(url,sheet.href||document.baseURI).href+'")');}catch{}
 const style=doc.createElement('style');style.textContent=css+'\n@page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;direction:rtl;font-family:"Assistant Variable",Arial,sans-serif;color:#173f33} .summary-paper{width:100%!important;max-width:none!important;margin:0!important;box-shadow:none!important;border-radius:0!important;font-size:12px!important;print-color-adjust:exact;-webkit-print-color-adjust:exact}.summary-paper .summary-cover{padding:22px!important}.summary-paper .summary-content{padding:20px 22px!important}.summary-paper .summary-cover h1{font-size:34px!important}.summary-paper .summary-topic{break-inside:avoid}.summary-paper .summary-signoff{break-inside:avoid}';doc.head.append(style);
 const copy=node.cloneNode(true) as HTMLElement;const originals=node.querySelectorAll('img');copy.querySelectorAll('img').forEach((img,i)=>{img.src=originals[i].src;});doc.body.append(copy);
 frame.contentWindow?.addEventListener('afterprint',()=>frame.remove(),{once:true});void Promise.all([doc.fonts.ready,...[...doc.images].map(img=>img.decode().catch(()=>{}))]).then(()=>frame.contentWindow?.print());
}
const date=(value:string)=>new Date(value).toLocaleDateString('he-IL');
export function SummaryDocument({snapshot,approved=false}:{snapshot:SummarySnapshot;approved?:boolean}){
 const paper=useRef<HTMLDivElement>(null);
 return <section className="summary-preview" aria-label="תצוגת סיכום השיחה"><div className="summary-preview-tools"><span>{approved?'הגרסה שאושרה למשפחה':'טיוטה לבדיקת הנציג'}</span><button className="ghost" onClick={()=>paper.current&&printSummary(paper.current)}><Icon name="report"/>הדפסה או שמירה כ־PDF</button></div><div className="summary-paper" ref={paper} data-summary-family={snapshot.family_id}>
 <header className="summary-cover"><div className="summary-masthead"><div><span>ליווי כלכלי למשפחה</span><strong>{summaryTemplate.title}</strong></div><BrandLogo mode="dark"/></div><div className="summary-recipient"><span>לכבוד</span><h1>{snapshot.family_name}</h1><div className="summary-cover-rule"/></div><dl className="summary-meta"><div><dt>מספר התיק</dt><dd><bdi>{snapshot.case_number}</bdi></dd></div><div><dt>תאריך הסיכום</dt><dd>{date(snapshot.created_at)}</dd></div><div><dt>הנציג המלווה</dt><dd>{snapshot.representative_name}</dd></div></dl></header>
 <div className="summary-content">{snapshot.intro&&<p className="summary-intro">{snapshot.intro}</p>}<h2><span>01</span>{summaryTemplate.topics}</h2>{snapshot.topics.map((topic,i)=><article className="summary-topic" key={topic.key}><div className="summary-topic-head"><span className="summary-topic-number">{String(i+1).padStart(2,'0')}</span><h3>{topic.title}</h3><span className="summary-decision">{topic.decision}</span></div>{topic.text&&<p>{topic.text}</p>}</article>)}{!snapshot.topics.length&&<p className="summary-empty-paper">הנושאים שייבחרו לסיכום יופיעו כאן.</p>}
 {snapshot.next.length>0&&<section className="summary-next"><h2><span>02</span>{summaryTemplate.next}</h2>{snapshot.next.map(step=><div key={step.id}><strong>{step.title}</strong><span>{step.owner}</span>{step.due_on&&<time>{date(step.due_on)}</time>}</div>)}</section>}
 <footer className="summary-signoff">{snapshot.closing&&<p>{snapshot.closing}</p>}<div><strong>{summaryTemplate.brand}</strong><span>{approved?`אושר בידי ${snapshot.approved_by} · ${date(snapshot.approved_at)}`:'טיוטה לבדיקת הנציג · טרם אושרה למשפחה'}</span></div><small>סיכום השיחה והצעדים שסוכמו, נכון למועד אישורו.</small></footer></div></div></section>;
}
