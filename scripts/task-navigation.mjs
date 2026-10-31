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
  const required=page.locator('article.document[data-document-required=true]').filter({has:page.getByRole('button',{name:'צירוף קובץ דוגמה בלבד',exact:true})});
  if(!await required.count())return;
  await required.first().getByRole('button',{name:'צירוף קובץ דוגמה בלבד',exact:true}).click();
 }
 throw new Error('Required documents did not settle after attachment');
}
