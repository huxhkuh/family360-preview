// Open the focused mobile menu through its real, keyboard-accessible control.
export async function openClientNavigation(page){
 const menu=page.getByRole('button',{name:'תפריט ותיק',exact:true});
 if(await menu.isVisible())await menu.click();
}
// Required synthetic identifiers for tests that exercise chapter navigation.
export async function fillRequiredContactAnswers(page){
 for(const [key,value] of Object.entries({h_id:'000000018',h_phone:'0500000000',h_email:'demo@example.invalid',w_id:'000000026'})){
  const field=page.locator(`[data-answer-key="${key}"]`);if(await field.isVisible())await field.fill(value);
 }
}
