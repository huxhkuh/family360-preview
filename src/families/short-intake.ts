import {CHAPTERS, type Answers, type Chapter, type LegacyField} from './questionnaire-definition';

export const shortIntakeVersion = 'short-2026-11';

const firstMeetingFields = new Set([
 'marital', 'city', 'address', 'h_first', 'h_last', 'h_id', 'h_id_issue_date', 'h_dob', 'h_phone', 'h_email',
 'w_first', 'w_id', 'w_id_issue_date', 'w_dob', 'w_phone', 'children_count',
 'h_emp', 'w_emp', 'h_kollel_monthly', 'w_kollel_monthly', 'h_employers', 'w_employers', 'h_gross', 'w_gross',
 'h_biz_income', 'w_biz_income', 'h_biz_registration', 'w_biz_registration',
 'housing', 'owns_property', 'rent_amount', 'rent_aid_now',
 'has_mortgage', 'mort_bank', 'mort_refi', 'mort_refi_year', 'has_car', 'has_multiple_cars', 'car_cover',
]);

function intakeFields(fields: LegacyField[]) {
 const result: LegacyField[] = [];
 for (const field of fields) {
  if (field.k === 'children') {
   result.push({k:'children_count', l:'כמה ילדים יש במשפחה?', type:'number'});
   continue;
  }
  if (!firstMeetingFields.has(field.k)) continue;
  if (field.k === 'w_gross') result.push({k:'w_employers', l:'מספר מעסיקים', type:'number', cond:field.cond});
  result.push(['h_gross','w_gross'].includes(field.k)
   ? {...field, l:'שכר חודשי ברוטו מכל המעסיקים יחד (₪)'} : field);
 }
 return result;
}

const descriptions: Record<string,string> = {
 family:'פרטי ההרשמה מופיעים כאן. אפשר לערוך אותם ולהשלים את הרכב המשפחה.',
 work:'מה העיסוק של כל אחד מבני הבית ומה ההכנסה ממנו?',
 mortgage:'באיזה בנק מתנהלת המשכנתא והאם כבר מחזרתם אותה?',
 insurance:'כמה פרטים על הרכב והכיסוי שלו.',
};

export const shortChapters: Chapter[] = CHAPTERS.flatMap(chapter => {
 const secs = chapter.secs.flatMap(section => {
  const fields = intakeFields(section.fields || []);
  if (!fields.length) return [];
  if (fields[0].k === 'children_count') return [{t:'ילדים', fields}];
  if (chapter.key === 'insurance') return [{t:'רכב המשפחה', fields}];
  return [{...section, fields}];
 });
 return secs.length ? [{...chapter, desc:descriptions[chapter.key] || chapter.desc, secs}] : [];
});

// The saved version keeps earlier submissions readable with their original fields.
export function intakeChapters(answers: Answers) {
 return answers.intake_version === shortIntakeVersion ? shortChapters : CHAPTERS;
}

export function intakeServices<T>(answers: Answers, services: T[]): T[] {
 return answers.intake_version === shortIntakeVersion ? [] : services;
}
