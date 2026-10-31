import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {fixture} from './fixture';
import {prepareMeetingDraft, type MeetingDraftProvider} from '../src/ai-meeting';

let f: ReturnType<typeof fixture>;
beforeEach(() => { f = fixture(); });
afterEach(() => f.sqlite.close());

test('prepares a sourced draft with minimised inputs and no writes', async () => {
 f.sqlite.prepare('UPDATE families SET answers=? WHERE id=?').run(JSON.stringify({marital:'married',h_first:'PRIVATE NAME',h_id:'123456789',notes:'PRIVATE TEXT'}),'f1');
 const before = await f.db.version();
 const provider = vi.fn<MeetingDraftProvider>(async () => ({items:[{text:'המצב המשפחתי מולא.',sources:['questionnaire:marital']}]}));
 const draft = await prepareMeetingDraft(f.db, await f.actor('rep'), 'f1', provider);
 expect(provider).toHaveBeenCalledOnce();
 const payload = JSON.stringify(provider.mock.calls[0][0]);
 expect(payload).not.toContain('PRIVATE');
 expect(payload).not.toContain('123456789');
 expect(payload).not.toContain('0500000000');
 expect(payload).not.toContain('f1');
 expect(draft.items[0].sources).toEqual(['questionnaire:marital']);
 expect(draft.disclaimer).toContain('טיוטה לבדיקה אנושית');
 expect(await f.db.version()).toBe(before);
});

test.each(['client','otherrep','pro','marketer'])('%s cannot access another case or invoke provider', async role => {
 const provider = vi.fn<MeetingDraftProvider>(async () => ({items:[]}));
 await expect(prepareMeetingDraft(f.db, await f.actor(role), 'f1', provider)).rejects.toThrow('PERMISSION_DENIED');
 expect(provider).not.toHaveBeenCalled();
});

test('requires MFA for administrator and an explicitly supplied provider', async () => {
 const provider = vi.fn<MeetingDraftProvider>(async () => ({items:[]}));
 await expect(prepareMeetingDraft(f.db, await f.actor('admin','aal1'), 'f1', provider)).rejects.toThrow('MFA_REQUIRED');
 await expect(prepareMeetingDraft(f.db, await f.actor('rep'), 'f1')).rejects.toThrow('SERVICE_NOT_CONFIGURED');
 expect(provider).not.toHaveBeenCalled();
});

test('rejects provider output with invented or absent sources', async () => {
 const actor = await f.actor('rep');
 for (const sources of [['not-a-source'], []]) {
  await expect(prepareMeetingDraft(f.db, actor, 'f1', async () => ({items:[{text:'טענה',sources}]}))).rejects.toThrow('VALIDATION');
 }
});
