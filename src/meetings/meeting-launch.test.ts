import {describe,it,expect} from 'vitest';
import type {Meeting,Workspace} from '../lib/model';
import {canLaunchMeetings,meetingLaunches} from './meeting-launch';

const meeting=(id:string,status='scheduled',scheduled_at:string|null='2026-10-21T10:00:00Z'):Meeting=>({id,status,scheduled_at,family_id:'family',type:'phone'});
const workspace=(meetings:Meeting[]):Pick<Workspace,'profile'|'permissions'|'meetings'>=>({
 profile:{id:'rep',name:'נציג',role:'representative',active:true},permissions:['families.edit'],meetings,
});

describe('meeting launch from home',()=>{
 it('resumes an in-progress call ahead of overdue and upcoming meetings without mutating the workspace',()=>{
  const rows=[meeting('later','scheduled','2026-10-22T10:00:00Z'),meeting('old','scheduled','2026-10-20T10:00:00Z'),meeting('active','in_progress')];
  expect(meetingLaunches(workspace(rows)).map(m=>m.id)).toEqual(['active','old','later']);
  expect(rows.map(m=>m.id)).toEqual(['later','old','active']);
 });
 it('excludes closed meetings and leaves absent or invalid dates after dated calls',()=>{
  const rows=[meeting('missing','scheduled',null),meeting('invalid','scheduled','invalid'),meeting('done','completed'),meeting('cancelled','cancelled'),meeting('next')];
  expect(meetingLaunches(workspace(rows)).map(m=>m.id)).toEqual(['next','invalid','missing']);
 });
 it('requires both a staff role and the existing edit permission',()=>{
  const w=workspace([meeting('call')]);
  for(const role of ['client','professional'] as const){w.profile.role=role;expect(canLaunchMeetings(w)).toBe(false);expect(meetingLaunches(w)).toEqual([]);}
  w.profile.role='representative';w.permissions=[];expect(meetingLaunches(w)).toEqual([]);
  w.profile.role='admin';w.permissions=['*'];expect(canLaunchMeetings(w)).toBe(true);expect(meetingLaunches(w)).toHaveLength(1);
 });
 it('returns no fabricated meeting when there are no open calls',()=>{
  expect(meetingLaunches(workspace([]))).toEqual([]);
  expect(meetingLaunches(workspace([meeting('done','completed')]))).toEqual([]);
 });
});
