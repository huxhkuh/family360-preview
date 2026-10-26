// Standard HTML autocomplete tokens; stored questionnaire answer keys stay unchanged.
export function answerAutofill(key:string){
 const child=key.match(/^children\.(\d+)\.(name|dob)$/);
 const person=child?`child${child[1]}`:key.startsWith('w_')?'partner':'primary';
 const part=child?child[2]:key.replace(/^[hw]_/, '');
 const token:Record<string,string>={first:'given-name',last:'family-name',email:'email',phone:'tel',dob:'bday',name:'name',city:'address-level2',address:'street-address',work:'organization'};
 const detail=token[part];
 return {name:`${person}_${key.replace(/[^a-z0-9]/gi,'_')}`,autoComplete:detail?`section-${person} ${detail}`:'off'};
}
