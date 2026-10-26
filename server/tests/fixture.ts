import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {Database,type Row} from '../src/db';
import type {Actor} from '../src/auth';
export function fixture(){
 const sqlite=new DatabaseSync(':memory:');for(const f of readdirSync(new URL('../migrations/',import.meta.url)).sort())sqlite.exec(readFileSync(new URL('../migrations/'+f,import.meta.url),'utf8'));
 class Statement{
  values:any[]=[];constructor(public sql:string){} bind(...values:any[]){this.values=values;return this;}
  async all(){return {success:true,results:sqlite.prepare(this.sql).all(...this.values),meta:{}};}
  async first(column?:string){const row=sqlite.prepare(this.sql).get(...this.values) as Row|undefined;return column?row?.[column]??null:row??null;}
  async run(){return {success:true,meta:sqlite.prepare(this.sql).run(...this.values)};}
 }
 const binding={prepare:(sql:string)=>new Statement(sql),batch:async(statements:Statement[])=>{sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}} as unknown as D1Database;
 const db=new Database(binding);const insert=(table:string,row:Row)=>{const keys=Object.keys(row);sqlite.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>typeof row[k]==='object'&&row[k]!==null?JSON.stringify(row[k]):typeof row[k]==='boolean'?Number(row[k]):row[k]));};
 for(const [id,role]of [['admin','admin'],['rep','representative'],['otherrep','representative'],['client','client'],['otherclient','client'],['pro','professional'],['otherpro','professional'],['marketer','marketer']])insert('profiles',{id,auth_user_id:id,name:'Synthetic '+id,role,active:1,email:id+'@example.invalid'});
 const permissions=['families.edit','documents.manage','analysis.send','analysis.approve','execution.send','execution.approve'];
 insert('representatives',{id:'r1',profile_id:'rep',permissions});insert('representatives',{id:'r2',profile_id:'otherrep',permissions});
 insert('professionals',{id:'p1',profile_id:'pro'});insert('professionals',{id:'p2',profile_id:'otherpro'});
 insert('partners',{id:'partner',profile_id:'marketer',name:'Synthetic marketer',code:'test-code'});
 insert('families',{id:'f1',name:'Synthetic A',case_number:'TEST-A',client_profile_id:'client',representative_id:'r1',internal_notes:'PRIVATE NOTE',phone:'0500000000',contact_name:'Synthetic A'});
 insert('families',{id:'f2',name:'Synthetic B',case_number:'TEST-B',client_profile_id:'otherclient',representative_id:'r2',internal_notes:'OTHER PRIVATE NOTE'});
 insert('services',{id:'s1',key:'bank',name:'Synthetic service'});for(const id of ['p1','p2'])insert('professional_services',{id:'ps-'+id,professional_id:id,service_id:'s1'});
 insert('family_services',{id:'fs1',family_id:'f1',service_id:'s1'});insert('family_services',{id:'fs2',family_id:'f2',service_id:'s1'});
 insert('document_types',{id:'dt1',key:'statement',name:'Synthetic statement'});for(const n of [1,2])insert('documents',{id:'d'+n,family_id:'f'+n,key:'statement',name:'Synthetic document',document_type_id:'dt1'});
 const actor=async(id:string,aal='aal2'):Promise<Actor>=>{const profile=await db.required('profiles',id);return {profile,permissions:id==='rep'||id==='otherrep'?permissions:[],representative:id==='rep'||id==='otherrep'?(await db.rows('representatives','profile_id=?',[id]))[0]:undefined,professional:id==='pro'||id==='otherpro'?(await db.rows('professionals','profile_id=?',[id]))[0]:undefined,partner:id==='marketer'?(await db.required('partners','partner')):undefined,aal,authId:id,email:id+'@example.invalid',issuedAt:Math.floor(Date.now()/1000)};};
 return {sqlite,db,binding,insert,actor};
}
