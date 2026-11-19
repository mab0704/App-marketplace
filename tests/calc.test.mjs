import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { calcular, precoMinimo, precoComTerminacao } = require('../src/calc.js');

const base = {
  preco: 100,
  custo: 30,
  embalagem: 5,
  outros: 0,
  frete: 20,
  taxaFixa: 5,
  comissaoPct: 10,
  impostoPct: 6,
  afiliadoPct: 0,
  cupomPct: 0,
  cupomValor: 0,
  acosPct: 10,
};

test('cascata de custos e margem antes e depois de ADS', () => {
  const r = calcular(base);
  assert.equal(r.valor, 100);
  assert.ok(Math.abs(r.comissao - 10) < 1e-9);
  assert.ok(Math.abs(r.imposto - 6) < 1e-9);
  // receita líquida = 100 - 10 - 6 - 5 - 20 = 59; margem antes = 59 - 30 - 5 = 24
  assert.ok(Math.abs(r.margemAntes - 24) < 1e-9);
  assert.ok(Math.abs(r.margemAntesPct - 0.24) < 1e-9);
  // ADS = 10% de 100 = 10; margem depois = 14
  assert.ok(Math.abs(r.ads - 10) < 1e-9);
  assert.ok(Math.abs(r.margemDepois - 14) < 1e-9);
  assert.ok(Math.abs(r.margemDepoisPct - 0.14) < 1e-9);
});

test('cupom percentual e em reais reduz o valor cobrado', () => {
  const r = calcular({ ...base, cupomPct: 10, cupomValor: 5 });
  // cupom = 10 + 5 = 15; valor cobrado = 85
  assert.ok(Math.abs(r.cupom - 15) < 1e-9);
  assert.ok(Math.abs(r.valor - 85) < 1e-9);
});

test('afiliado entra como custo sobre o valor cobrado', () => {
  const r = calcular({ ...base, afiliadoPct: 5 });
  assert.ok(Math.abs(r.afiliado - 5) < 1e-9);
  assert.ok(Math.abs(r.margemAntes - 19) < 1e-9);
});

test('vírgula decimal é aceita nos campos', () => {
  const r = calcular({ ...base, preco: '100,00', custo: '30,5' });
  assert.ok(Math.abs(r.custo - 30.5) < 1e-9);
});

test('preço mínimo para margem de 20% depois de ADS fecha a conta', () => {
  const p = precoMinimo(base, { margemPct: 20 });
  // fixos = 5 + 20 + 30 + 5 = 60; denom = 1 - 0.10 - 0.06 - 0.10 - 0.20 = 0.54
  assert.ok(Math.abs(p - 60 / 0.54) < 1e-9);
  const check = calcular({ ...base, preco: p });
  assert.ok(Math.abs(check.margemDepoisPct - 0.2) < 1e-9);
});

test('preço mínimo antes de ADS ignora o ACOS', () => {
  const p = precoMinimo(base, { margemPct: 20, incluiAds: false });
  // denom = 1 - 0.10 - 0.06 - 0.20 = 0.64
  assert.ok(Math.abs(p - 60 / 0.64) < 1e-9);
});

test('preço mínimo retorna null quando a meta é impossível', () => {
  assert.equal(precoMinimo({ ...base, comissaoPct: 60, impostoPct: 30 }, { margemPct: 20 }), null);
});

test('terminação R$ x,90 sempre fica igual ou acima do preço', () => {
  assert.equal(precoComTerminacao(49.2), 49.9);
  assert.equal(precoComTerminacao(49.95), 50.9);
  assert.equal(precoComTerminacao(49.9), 49.9);
  assert.equal(precoComTerminacao(0), null);
});

test('preço para margem desejada entrega exatamente essa margem', () => {
  const { precoParaMargem } = require('../src/calc.js');
  const p = precoParaMargem(base, 25, true);
  const r = calcular({ ...base, preco: p });
  assert.ok(Math.abs(r.margemDepoisPct - 0.25) < 1e-9);
  const pSem = precoParaMargem(base, 25, false);
  assert.ok(Math.abs(calcular({ ...base, preco: pSem }).margemAntesPct - 0.25) < 1e-9);
});
