import {admin, familyAccess, type Actor} from './auth';
import {Database, requireThat} from './db';

// Legacy presence-only building block retained for compatibility. The connected
// document/brief workflow and its scoped provider live in ai-workflow.ts.
type Fact = {source: string; label: string; value: string};
export type MeetingDraftInput = {facts: Fact[]};
export type MeetingDraftProvider = (input: MeetingDraftInput) => Promise<unknown>;
export type MeetingDraft = {items: {text: string; sources: string[]}[]; facts: Fact[]; disclaimer: string};

const fields = [
 {key: 'marital', label: 'מצב משפחתי'},
 {key: 'housing', label: 'סידור מגורים'},
 {key: 'has_mortgage', label: 'משכנתא'},
 {key: 'savings', label: 'חסכונות'},
 {key: 'ins', label: 'ביטוחים'},
] as const;

/** The injected provider only receives presence indicators and case counts;
 * no names, identifiers, free text, financial amounts or document contents. */
export async function prepareMeetingDraft(db: Database, actor: Actor, familyId: unknown, provider?: MeetingDraftProvider): Promise<MeetingDraft> {
 requireThat(actor.profile.active && ['admin','representative'].includes(actor.profile.role));
 if (actor.profile.role === 'admin') admin(actor);
 const family = await familyAccess(db, actor, familyId);
 requireThat(typeof provider === 'function', 'SERVICE_NOT_CONFIGURED', 503);
 const answers = family.answers && typeof family.answers === 'object' && !Array.isArray(family.answers) ? family.answers : {};
 const facts: Fact[] = fields.map(({key,label}) => {
  const value = answers[key];
  const present = value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);
  return {source:`questionnaire:${key}`,label,value:present ? 'נמסרה תשובה' : 'לא נמסרה תשובה'};
 });
 const documentRow = await db.statement("SELECT COUNT(*) AS total FROM documents WHERE family_id=? AND COALESCE(optional,0)=0 AND status IN ('missing','rejected')", [family.id]).first<{total: number}>();
 const taskRow = await db.statement("SELECT COUNT(*) AS total FROM family_tasks WHERE family_id=? AND status IN ('open','in_progress')", [family.id]).first<{total: number}>();
 facts.push({source:'documents:missing',label:'בקשות מסמכים חסרות או שנדחו',value:String(Number(documentRow?.total || 0))});
 facts.push({source:'tasks:open',label:'משימות פתוחות',value:String(Number(taskRow?.total || 0))});
 const generated = await provider({facts});
 requireThat(generated && typeof generated === 'object' && !Array.isArray(generated), 'VALIDATION', 400);
 const items = (generated as {items?: unknown}).items;
 requireThat(Array.isArray(items) && items.length <= 12, 'VALIDATION', 400);
 const allowed = new Set(facts.map(f => f.source));
 const result = items.map(item => {
  requireThat(item && typeof item === 'object' && !Array.isArray(item), 'VALIDATION', 400);
  const {text, sources} = item as {text?: unknown; sources?: unknown};
  requireThat(typeof text === 'string' && text.trim().length > 0 && text.length <= 600, 'VALIDATION', 400);
  requireThat(Array.isArray(sources) && sources.length > 0 && sources.length <= facts.length && sources.every(source => typeof source === 'string' && allowed.has(source)), 'VALIDATION', 400);
  return {text: text.trim(), sources: [...new Set(sources as string[])]};
 });
 return {items: result, facts, disclaimer: 'טיוטה לבדיקה אנושית. מקור מצורף אינו מבטיח שהניסוח או ההסקה נכונים.'};
}
