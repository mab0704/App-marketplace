/*
 * Motor de cálculo da calculadora de precificação para Mercado Livre.
 * Funções puras, sem acesso ao DOM, para poderem ser testadas.
 *
 * Convenções:
 * - Valores em reais (R$) são números.
 * - Percentuais de entrada vêm em porcentagem (ex.: 14 para 14%).
 * - Base das taxas e da margem: "valor cobrado" = preço anunciado menos o cupom
 *   pago pelo vendedor. Margem % = margem em R$ / valor cobrado.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Calc = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const num = (v) => {
    const x = Number(String(v ?? '').replace(',', '.'));
    return Number.isFinite(x) ? x : 0;
  };
  const pct = (v) => num(v) / 100;

  function normalizar(e) {
    return {
      preco: num(e.preco),
      custo: num(e.custo),
      embalagem: num(e.embalagem),
      outros: num(e.outros),
      frete: num(e.frete),
      taxaFixa: num(e.taxaFixa),
      comissao: pct(e.comissaoPct),
      imposto: pct(e.impostoPct),
      afiliado: pct(e.afiliadoPct),
      cupomPct: pct(e.cupomPct),
      cupomValor: num(e.cupomValor),
      acos: pct(e.acosPct),
      margemMin: e.margemMinPct === undefined ? 0.2 : pct(e.margemMinPct),
    };
  }

  /**
   * Calcula a cascata de custos e a margem antes e depois de ADS.
   */
  function calcular(entrada) {
    const e = normalizar(entrada);
    const cupom = e.preco * e.cupomPct + e.cupomValor;
    const valor = Math.max(e.preco - cupom, 0);

    const comissao = valor * e.comissao;
    const afiliado = valor * e.afiliado;
    const imposto = valor * e.imposto;
    const receitaLiquida = valor - comissao - afiliado - imposto - e.taxaFixa - e.frete;
    const custos = e.custo + e.embalagem + e.outros;

    const margemAntes = receitaLiquida - custos;
    const ads = valor * e.acos;
    const margemDepois = margemAntes - ads;

    return {
      preco: e.preco,
      cupom,
      valor,
      comissao,
      afiliado,
      imposto,
      taxaFixa: e.taxaFixa,
      frete: e.frete,
      custo: e.custo,
      embalagem: e.embalagem,
      outros: e.outros,
      ads,
      margemAntes,
      margemAntesPct: valor > 0 ? margemAntes / valor : 0,
      margemDepois,
      margemDepoisPct: valor > 0 ? margemDepois / valor : 0,
      margemMin: e.margemMin,
    };
  }

  /**
   * Preço anunciado mínimo para atingir a margem alvo (em %).
   * incluiAds decide se o ACOS entra no cálculo (margem depois de ADS) ou não.
   * Retorna null quando não há preço que atinja a meta com essas taxas.
   */
  function precoMinimo(entrada, { margemPct, incluiAds = true } = {}) {
    const e = normalizar(entrada);
    const alvo = margemPct === undefined ? e.margemMin : pct(margemPct);
    if (e.cupomPct >= 1) return null;

    const fixos = e.taxaFixa + e.frete + e.custo + e.embalagem + e.outros;
    const variaveis = e.comissao + e.afiliado + e.imposto + (incluiAds ? e.acos : 0);
    const denom = 1 - variaveis - alvo;
    if (denom <= 0) return null;

    const valor = fixos / denom;
    return (valor + e.cupomValor) / (1 - e.cupomPct);
  }

  /**
   * Arredonda para cima no formato R$ x,90 (ex.: 49,90 ou 120,90).
   */
  function precoComTerminacao(p) {
    if (!p || p <= 0) return null;
    let c = Math.floor(p) + 0.9;
    if (c < p) c += 1;
    return Math.round(c * 100) / 100;
  }

  return { calcular, precoMinimo, precoComTerminacao, normalizar };
});
