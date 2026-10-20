// Open the focused mobile menu through its real, keyboard-accessible control.
export async function openClientNavigation(page){
 const menu=page.getByRole('button',{name:'תפריט ותיק',exact:true});
 if(await menu.isVisible())await menu.click();
}
