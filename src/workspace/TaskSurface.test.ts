import {describe,it,expect} from 'vitest';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {RecordFocus,TaskSupport} from './TaskSurface';
const record=(id:string)=>h('article',{'data-record-id':id,key:id},h('input',{defaultValue:id}));
describe('focused task surface',()=>{
 it('keeps ordinary lists intact without an explicit focus',()=>{const html=renderToStaticMarkup(h(RecordFocus,{title:'Others',children:[record('a'),record('b')]}));expect(html).not.toContain('<details');expect(html).toContain('value="a"');expect(html).toContain('value="b"');});
 it('places only the selected record before a closed disclosure, keeping other forms mounted',()=>{const html=renderToStaticMarkup(h(RecordFocus,{focus:'b',title:'Others',children:[record('a'),record('b')]}));expect(html.indexOf('data-record-id="b"')).toBeLessThan(html.indexOf('<details'));expect(html.indexOf('value="a"')).toBeGreaterThan(html.indexOf('<details'));expect(html).not.toContain(' open=');});
 it('does not silently substitute another record for a missing or unauthorized deep link',()=>{const html=renderToStaticMarkup(h(RecordFocus,{focus:'unknown',title:'Others',children:[record('a')]}));expect(html).toContain('role="status"');expect(html.indexOf('data-record-id="a"')).toBeGreaterThan(html.indexOf('<details'));});
 it('supports explicit record identities on components without duplicate DOM anchors',()=>{const Card=({recordId}:{recordId:string})=>record(recordId);const html=renderToStaticMarkup(h(RecordFocus,{focus:'a',title:'Others',children:[h(Card,{recordId:'a',key:'a'})]}));expect(html).not.toContain('<details');expect(html.match(/data-record-id="a"/g)).toHaveLength(1);});
 it('leaves context visible on unselected list routes',()=>{expect(renderToStaticMarkup(h(TaskSupport,{active:false,title:'Tools',children:h('button',null,'Create')}))).toBe('<button>Create</button>');});
});
