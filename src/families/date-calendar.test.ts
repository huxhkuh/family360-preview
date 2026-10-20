import {describe,expect,it} from 'vitest';
import {isoDate,parseDate,moveMonth,monthDays} from './date-calendar';
describe('date calendar',()=>{
 it('round-trips local dates without timezone shifts',()=>{
  expect(isoDate(parseDate('1990-01-01')!)).toBe('1990-01-01');
  expect(isoDate(parseDate('2024-02-29')!)).toBe('2024-02-29');
 });
 it('rejects nonexistent dates and partial values',()=>{
  for(const value of ['2023-02-29','2024-04-31','2024-13-01','2024-01-00','', '2024-1-1'])expect(parseDate(value)).toBeNull();
 });
 it('clamps month and year changes without rolling past the destination month',()=>{
  expect(isoDate(moveMonth(parseDate('2024-01-31')!,1))).toBe('2024-02-29');
  expect(isoDate(moveMonth(parseDate('2024-02-29')!,12))).toBe('2025-02-28');
  expect(isoDate(moveMonth(parseDate('2024-01-31')!,-1))).toBe('2023-12-31');
 });
 it('includes a continuous six-week Sunday-first grid across year boundaries',()=>{
  const days=monthDays(parseDate('2026-12-20')!);
  expect(days).toHaveLength(42);expect(days[0].getDay()).toBe(0);
  expect(isoDate(days[0])).toBe('2026-11-29');expect(isoDate(days[41])).toBe('2027-01-09');
 });
});
