import {beforeEach,describe,expect,it} from 'vitest';
import {clientNavActive,clientQuestionnaireRoute} from './client-navigation';
import {readRoute,routeHash} from './navigation';
import {loadWorkspace,resetDemo,selectRole} from './backend';
beforeEach(()=>{resetDemo();selectRole('client');});
describe('client questionnaire navigation',()=>{
 it('opens the sole accessible family directly',async()=>{
  const w=await loadWorkspace();const route=clientQuestionnaireRoute(w);
  expect(route).toEqual({page:'families',id:'f1',tab:'questionnaire'});
  expect(readRoute(routeHash(route))).toEqual(route);
  expect(clientNavActive(route)).toBe('questionnaire');
  expect(clientNavActive({...route,tab:'documents'})).toBe('families');
 });
 it('does not guess a family when none or several are available',async()=>{
  const w=await loadWorkspace();
  expect(clientQuestionnaireRoute({families:[]})).toEqual({page:'questionnaire'});
  expect(clientQuestionnaireRoute({families:[w.families[0],{...w.families[0],id:'other'}]})).toEqual({page:'questionnaire'});
  expect(readRoute('#/questionnaire')).toEqual({page:'questionnaire'});
 });
});
