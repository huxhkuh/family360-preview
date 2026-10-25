import {useEffect,useId,useState,type InputHTMLAttributes} from 'react';
type Catalog={cities:string[];streets:Record<string,string[]>};
let catalogRequest:Promise<Catalog>|undefined;
function catalog(){
 return catalogRequest??=fetch(import.meta.env.BASE_URL+'data/address-catalog.json').then(async response=>{if(!response.ok)throw Error('ADDRESS_CATALOG');return response.json() as Promise<Catalog>;}).catch(error=>{catalogRequest=undefined;throw error;});
}
const normalize=(text:string)=>text.normalize('NFKC').replace(/[״"׳']/g,'').replace(/[-־]/g,' ').trim();
export function AddressLookup({kind,city,value,onChange,answerKey,required,id:inputId,'aria-invalid':invalid,'aria-describedby':describedBy}:{kind:'city'|'address';city:string;value:string;onChange:(value:string)=>void;answerKey:string;required:boolean}&Pick<InputHTMLAttributes<HTMLInputElement>,'id'|'aria-invalid'|'aria-describedby'>){
 const id=useId();const [data,setData]=useState<Catalog>();const [failed,setFailed]=useState(false);
 useEffect(()=>{let alive=true;catalog().then(data=>{if(alive)setData(data);}).catch(()=>{if(alive)setFailed(true);});return()=>{alive=false;};},[]);
 const selectedCity=data?.cities.find(name=>normalize(name)===normalize(city));
 const options=kind==='city'?data?.cities||[]:selectedCity?data?.streets[selectedCity]||[]:[];
 const query=normalize(value);const matches=options.filter(option=>normalize(option).includes(query)).slice(0,40);
 return <><input id={inputId} data-answer-key={answerKey} aria-invalid={invalid} aria-required={required} value={value} onChange={event=>onChange(event.target.value)} list={id} autoComplete={kind==='city'?'address-level2':'street-address'} maxLength={500} aria-describedby={[describedBy,id+'-hint'].filter(Boolean).join(' ')}/><datalist id={id}>{matches.map(option=><option value={option} key={option}/>)}</datalist><small id={id+'-hint'} className="hint">{failed?'רשימת ההצעות אינה זמינה כרגע. אפשר להקליד את הכתובת כרגיל.':kind==='city'?'התחילו להקליד ובחרו יישוב מהרשימה. אם אינו מופיע, אפשר להזין ידנית.':!city?'בחרו יישוב כדי לקבל הצעות לרחוב. אפשר גם להזין כתובת ידנית.':'בחרו רחוב והוסיפו מספר בית ודירה. אפשר גם להזין כתובת ידנית.'}</small></>;
}
