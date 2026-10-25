import {describe,it,expect} from 'vitest';
import {customerStage,type CustomerStage} from './journey';
describe('one task at a time',()=>{
 it('requires payment, preparation and an actually submitted questionnaire before the dashboard',()=>{
  let stage:CustomerStage='payment';
  stage=customerStage(stage,{type:'dashboard'});expect(stage).toBe('payment');
  stage=customerStage(stage,{type:'pay'});expect(stage).toBe('paid');
  expect(customerStage(stage,{type:'pay'})).toBe('paid');
  expect(customerStage(stage,{type:'dashboard'})).toBe('paid');
  stage=customerStage(stage,{type:'start'});expect(stage).toBe('questionnaire');
  expect(customerStage(stage,{type:'submit',submitted:false})).toBe('questionnaire');
  expect(customerStage(stage,{type:'dashboard'})).toBe('questionnaire');
  stage=customerStage(stage,{type:'submit',submitted:true});expect(stage).toBe('complete');
  expect(customerStage(stage,{type:'pay'})).toBe('complete');
  expect(customerStage(stage,{type:'dashboard'})).toBe('dashboard');
 });
});
