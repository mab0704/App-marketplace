import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, parseNumber } from '../src/calculator.mjs';
const base = { price: 100, cost: 30, packaging: 2, shipping: 5, fee: 4, commission: 20, tax: 6, returns: 2, ads: 10, adsMode: 'fixed', target: 15 };
test('deduz todos os custos sem chamar contribuição de lucro líquido', () => {
  const r = calculate(base); assert.equal(r.contribution, 21); assert.equal(r.margin, 21); assert.equal(r.totalCost,79);
});
test('ROAS 15 corresponde a 6,67% de ACOS', () => {
  const r = calculate({...base, adsMode:'roas', ads:15}); assert.ok(Math.abs(r.acos - 100/15) < 1e-9);
});
test('preço sugerido alcança a meta nos três modos com desconto', () => {
  for (const adsMode of ['fixed','percent','roas']) {
    const input = {...base, discount:10, adsMode}; const r = calculate(input);
    assert.ok(calculate({...input, price:r.suggestedPrice}).margin >= 15 - 1e-8);
    assert.ok(calculate({...input, price:r.breakEven}).contribution >= -1e-8);
  }
});
test('não recomenda preço quando a soma percentual inviabiliza a meta', () => {
  assert.equal(calculate({...base, commission:80, target:20}).suggestedPrice,null);
});
test('validação rejeita texto, negativo, infinito, preço zero e ROAS zero', () => {
  for (const price of ['abc','-2','Infinity',0]) assert.throws(() => calculate({...base,price}));
  assert.throws(() => calculate({...base,adsMode:'roas',ads:0}));
  assert.equal(parseNumber('29,90'),29.9);
});
test('sem Ads não inventa ROAS; prejuízo antes de Ads não admite orçamento', () => {
  assert.equal(calculate({...base,ads:0}).roas,null);
  const r = calculate({...base,cost:100}); assert.equal(r.maxAds,0); assert.equal(r.breakEvenRoas,null);
});
