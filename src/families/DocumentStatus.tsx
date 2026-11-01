import type {Document} from '../lib/model';
import {Badge} from '../ui';

export function DocumentStatus({doc}:{doc:Document}){
 if(!doc.optional||!['missing','rejected'].includes(doc.status))return <Badge status={doc.status}/>;
 const clearinghouse=doc.type==='signature'&&/^clearinghouse_auth_[hw]$/.test(doc.key);
 return <span className="badge">{doc.status==='rejected'?'התקבלה הערה · רשות':clearinghouse?'חתימה לפני פנייה למסלקה':doc.type==='signature'?'לבירור עם הנציג':'טרם צורף · רשות'}</span>;
}
