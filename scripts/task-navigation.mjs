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
