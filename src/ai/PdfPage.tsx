import {useEffect,useRef,useState} from 'react';
import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&inline';

export default function PdfPage({url,page}:{url:string;page:number}){
 const canvas=useRef<HTMLCanvasElement>(null),host=useRef<HTMLDivElement>(null);const [error,setError]=useState('');
 useEffect(()=>{let cancelled=false;setError('');if(!GlobalWorkerOptions.workerPort)GlobalWorkerOptions.workerPort=new PdfWorker();const task=getDocument({url});
  void task.promise.then(async doc=>{if(cancelled)return;if(page>doc.numPages)throw Error('PAGE');const sheet=await doc.getPage(page);const natural=sheet.getViewport({scale:1});const scale=Math.min(1.7,(host.current?.clientWidth||600)/natural.width);const view=sheet.getViewport({scale});const target=canvas.current;if(cancelled||!target)return;const ratio=Math.min(devicePixelRatio||1,2);target.width=view.width*ratio;target.height=view.height*ratio;target.style.width='100%';target.style.height='auto';await sheet.render({canvas:target,viewport:view,transform:[ratio,0,0,ratio,0,0]}).promise;}).catch(()=>{if(!cancelled)setError('לא הצלחנו להציג את העמוד. אפשר לפתוח את הקובץ המקורי.');});
  return()=>{cancelled=true;void task.destroy();};
 },[url,page]);
 return <div ref={host} className="ai-pdf-page">{error?<p role="alert">{error}</p>:<canvas ref={canvas} aria-label={`עמוד ${page} מהמסמך המקורי`}/>}<a href={url+'#page='+page} target="_blank" rel="noreferrer">פתיחת הקובץ המקורי · עמוד {page}</a></div>;
}
