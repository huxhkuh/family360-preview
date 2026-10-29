import {expect,it} from 'vitest';
import {parseReview} from './review-model';
import raw from './isaac-review-2026-10-29.json?raw';
it('preserves all of Isaac’s review on import and export',()=>{
 const source=JSON.parse(raw);
 expect(Object.keys(source.entries).length).toBeGreaterThan(50);
 expect(parseReview(raw)).toEqual(source);
});
