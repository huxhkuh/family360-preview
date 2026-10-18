import {describe,it,expect} from 'vitest';
import {readRoute,routeHash,type RouteState} from './navigation';
describe('record routes',()=>{
 it.each<RouteState>([
  {page:'families',id:'family 1',tab:'documents'},
  {page:'tasks',kind:'execution',id:'task-1',family:'f1'},
  {page:'meetings',id:'m1',stage:'discussion',topic:'item-1'},
  {page:'families',q:'משפחת בדיקה'},
  {page:'families',q:'שם',cursor:JSON.stringify({id:'f1',created_at:'2026-01-01T00:00:00Z'})},
  {page:'overview',filter:'late'},
  {page:'followups',family:'f1',filter:'closed'}
 ])('round trips %j',route=>expect(readRoute(routeHash(route))).toEqual(route));
 it.each(['#/families/f1/private','#/tasks/wrong/a','#/meetings/m1/extra','#/meetings/m1?stage=unknown','#/families/%ZZ','#/unknown'])('rejects unknown or malformed route %s',hash=>expect(readRoute(hash).page).toBe('missing'));
 it('leaves auth callback fragments to the auth flow',()=>expect(readRoute('#access_token=redacted')).toEqual({page:'overview'}));
});
