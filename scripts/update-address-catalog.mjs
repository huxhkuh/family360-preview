// Import public geographic names only. The app never sends typed addresses to this API.
import {mkdir,writeFile} from 'node:fs/promises';
const resources={cities:'5c78e9fa-c2e2-4771-93ff-7f400a12f7ba',streets:'9ad3862c-8391-4b2f-84a4-2d4c68625f4b'};
async function readRows(resource){
 const rows=[];let total=Infinity;
 while(rows.length<total){
  const url=new URL('https://data.gov.il/api/3/action/datastore_search');url.search=new URLSearchParams({resource_id:resource,limit:'10000',offset:String(rows.length)}).toString();
  const response=await fetch(url);if(!response.ok)throw Error('Catalog request failed: '+response.status);
  const body=await response.json();if(!body.success||!Array.isArray(body.result?.records)||!Number.isInteger(body.result.total))throw Error('Invalid catalog response');
  total=body.result.total;if(!body.result.records.length&&rows.length<total)throw Error('Incomplete catalog');rows.push(...body.result.records);
 }
 return rows;
}
const [cities,rows]=await Promise.all([readRows(resources.cities),readRows(resources.streets)]);
const byCode=new Map(cities.map(row=>[String(row['סמל_ישוב']).trim(),row['שם_ישוב'].trim()]));
const streets={};for(const row of rows){const city=byCode.get(String(row['סמל_ישוב']).trim()),street=row['שם_רחוב'].trim();if(city&&street&&Number(row['סמל_רחוב'])<9000)(streets[city]??=new Set()).add(street);}
const result={source:'https://data.gov.il/he/datasets/population_authority/321',cities_source:'https://data.gov.il/he/datasets/population_authority/citiesandsettelments',retrieved_on:new Date().toISOString().slice(0,10),cities:[...new Set(byCode.values())].filter(Boolean).sort(),streets:Object.fromEntries(Object.entries(streets).map(([city,names])=>[city,[...names].sort()]))};
if(result.cities.length<1000||Object.keys(result.streets).length<500)throw Error('Unexpectedly small catalog; existing file preserved');
await mkdir('public/data',{recursive:true});await writeFile('public/data/address-catalog.json',JSON.stringify(result));console.log('Saved public address catalog: '+result.cities.length+' localities.');
