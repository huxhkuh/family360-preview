import {hasOwnedProperty,type Answers} from '../families/questionnaire-definition';
import {employed} from '../lib/employment';
import {DOCUMENT_CATALOG,type CatalogDocument} from '../families/document-catalog';
export type Preparation=CatalogDocument;
// A question does not imply a document request. Only these explicit rules offer preparation.
export function documentPreparation(a:Answers):Preparation[]{
 const keys=new Set<string>();
 for(const person of ['h','w'] as const){
  if(person==='w'&&a.marital!=='married')continue;
  if(employed(a,person,'emp'))keys.add('payslips_'+person);
  if(employed(a,person,'self'))keys.add('tax_assessment_'+person);
  if(a[person+'_id']){keys.add('identity_'+person);keys.add('clearinghouse_auth_'+person);}
 }
 if(a.housing==='rent')keys.add('rental_contract');
 if(hasOwnedProperty(a)&&a.has_mortgage==='yes')keys.add('mortgage_balance');
 if(Number(a.bank_count)>0)keys.add('bank_identity');
 if(['own','rent','family'].includes(a.housing)){keys.add('municipal_bill');keys.add('electricity_bill');}
 if(Array.isArray(a.savings)&&a.savings.includes('pension'))keys.add('pension_report');
 return DOCUMENT_CATALOG.filter(d=>keys.has(d.key)&&d.requirement!=='pending');
}
