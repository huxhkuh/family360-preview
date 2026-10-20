import {getQuestionHelp} from './questionnaire-help';
import {CompanionPortrait} from '../companion/Companion';

export function QuestionHelp({fieldKey,label,option}:{fieldKey:string;label:string;option?:string}){
 const help=getQuestionHelp(fieldKey,option);
 if(!help)return null;
 return <details className="question-help"><summary aria-label={`הסבר על ${label}`}><span aria-hidden="true">?</span></summary><div className="question-help-body question-help-with-companion"><CompanionPortrait pose="explain"/><div className="speech-bubble"><strong>{label}</strong><p>{help.meaning}</p><p>{help.guidance}</p>{help.more?<details className="question-help-more"><summary>דוגמה ופרטים נוספים</summary>{help.example&&<p className="question-help-example">{help.example}</p>}<p>{help.more}</p></details>:help.example&&<p className="question-help-example"><b>לדוגמה: </b>{help.example}</p>}</div></div></details>;
}
