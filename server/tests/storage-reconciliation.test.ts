import {test,expect} from 'vitest';
import {reconcileStorage} from '../../scripts/storage-reconciliation';
const fixture=()=>({documents:[{id:'d1',storage_path:'new'}],versions:[{document_id:'d1',object_key:'old',size:2},{document_id:'d1',object_key:'new',size:3}],objects:[{key:'old',size:2},{key:'new',size:3}]});
test('retains historical versions and does not mutate inventory',()=>{
 const data=fixture(),before=structuredClone(data);
 expect(reconcileStorage(data)).toEqual({missingObjects:[],unreferencedCandidates:[],sizeMismatches:[],currentWithoutVersion:[]});expect(data).toEqual(before);
});
test('detects missing current file and mismatched historical size',()=>{
 const data=fixture();data.objects=[{key:'old',size:9}];
 expect(reconcileStorage(data)).toMatchObject({missingObjects:['new'],sizeMismatches:['old']});
});
test('unreferenced objects are candidates only and current files without versions stay referenced',()=>{
 const data=fixture();data.versions=[];data.objects.push({key:'orphan',size:1});
 expect(reconcileStorage(data)).toMatchObject({unreferencedCandidates:['old','orphan'],currentWithoutVersion:['d1']});
});
test('duplicate object records fail rather than conceal contradictory inventory',()=>{
 const data=fixture();data.objects.push({key:'new',size:4});expect(()=>reconcileStorage(data)).toThrow('INVALID_OBJECT_INVENTORY');
});
