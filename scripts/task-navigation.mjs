import {openClientNavigation} from './client-navigation.mjs';
// Follow the disclosed UI only when a test intentionally requests secondary tools.
export async function revealTaskContent(page,selector){
 const target=page.locator(selector);
 for(let n=0;n<8;n++){
  const closed=page.locator('details.task-support:not([open])').filter({has:target});
  if(!await closed.count())return;
  await closed.first().locator(':scope > summary').click();
 }
 throw new Error('Too many nested task disclosures for '+selector);
}

// Required document obligations are completed through the same sample action available to clients.
export async function attachRequiredSamples(page){
 for(let attempts=0;attempts<30;attempts++){
  const compact=page.locator('article.client-document-row.awaiting-document[data-document-required=true][data-document-type=file]');
  if(await compact.count()){
   await compact.first().getByRole('button').click();
   await page.locator('article.document[data-task-document=true]').getByRole('button',{name:'צירוף קובץ דוגמה בלבד',exact:true}).click();
   await openClientNavigation(page);await page.getByRole('navigation',{name:'ניווט ראשי'}).getByRole('button',{name:'התיק שלנו',exact:true}).click();
   continue;
  }
  const required=page.locator('article.document[data-document-required=true]').filter({has:page.getByRole('button',{name:'צירוף קובץ דוגמה בלבד',exact:true})});
  if(!await required.count())return;
  await required.first().getByRole('button',{name:'צירוף קובץ דוגמה בלבד',exact:true}).click();
 }
 throw new Error('Required documents did not settle after attachment');
}

export async function openDocumentDetail(doc){
 if(await doc.evaluate(el=>el.classList.contains('client-document-row')))await doc.getByRole('button').click();
}
