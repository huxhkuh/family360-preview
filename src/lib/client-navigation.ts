import type {Workspace} from './model';
import type {RouteState} from './navigation';
export function clientQuestionnaireRoute(w:Pick<Workspace,'families'>):RouteState{
 return w.families.length===1?{page:'families',id:w.families[0].id,tab:'questionnaire'}:{page:'questionnaire'};
}
export function clientNavActive(route:RouteState){return route.page==='families'&&route.id&&route.tab==='questionnaire'?'questionnaire':route.page;}
