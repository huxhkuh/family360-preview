export type StorageInventory={
 documents:{id:string;storage_path:string|null}[];
 versions:{document_id:string;object_key:string;size:number}[];
 objects:{key:string;size:number}[];
};
// Read-only comparison. Orphan candidates are never instructions to delete:
// snapshots can be incomplete, and uploads can still be in progress.
export function reconcileStorage(input:StorageInventory){
 const objects=new Map<string,number>(),references=new Set<string>();
 for(const object of input.objects){
  if(!object.key||!Number.isSafeInteger(object.size)||object.size<0||objects.has(object.key))throw Error('INVALID_OBJECT_INVENTORY');
  objects.set(object.key,object.size);
 }
 const currentWithoutVersion:string[]=[],sizeMismatches:string[]=[];
 for(const version of input.versions){
  if(!version.object_key||!version.document_id||!Number.isSafeInteger(version.size)||version.size<0)throw Error('INVALID_VERSION_INVENTORY');
  references.add(version.object_key);
  if(objects.has(version.object_key)&&objects.get(version.object_key)!==version.size)sizeMismatches.push(version.object_key);
 }
 for(const doc of input.documents){
  if(!doc.id||!(doc.storage_path===null||typeof doc.storage_path==='string'&&doc.storage_path.length))throw Error('INVALID_DOCUMENT_INVENTORY');
  if(!doc.storage_path)continue;
  references.add(doc.storage_path);
  if(!input.versions.some(v=>v.document_id===doc.id&&v.object_key===doc.storage_path))currentWithoutVersion.push(doc.id);
 }
 return {
  missingObjects:[...references].filter(key=>!objects.has(key)).sort(),
  unreferencedCandidates:[...objects.keys()].filter(key=>!references.has(key)).sort(),
  sizeMismatches:[...new Set(sizeMismatches)].sort(),
  currentWithoutVersion:currentWithoutVersion.sort(),
 };
}
