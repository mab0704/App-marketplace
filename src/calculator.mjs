export function parseNumber(value) {
  const text = String(value).trim();
  if (!text) return 0;
  if (!/^\d+(?:[.,]\d+)?$/.test(text)) throw new Error('Use números positivos, sem separador de milhar.');
  const n = Number(text.replace(',', '.'));
  if (!Number.isFinite(n) || n > 1e9) throw new Error('Valor fora do limite.');
  return n;
}

export function calculate(values) {
  const keys = ['price','discount','cost','packaging','shipping','fee','commission','tax','returns','ads','target'];
  const v = Object.fromEntries(keys.map(k => [k, parseNumber(values[k] ?? 0)]));
  for (const k of ['discount','commission','tax','returns','target']) {
    if (v[k] >= 100) throw new Error('Percentuais devem ser menores que 100%.');
  }
  const mode = values.adsMode ?? 'fixed';
  if (!['fixed','percent','roas'].includes(mode)) throw new Error('Modo de Ads inválido.');
  if (mode === 'roas' && v.ads <= 0) throw new Error('ROAS deve ser maior que zero.');
  if (mode === 'percent' && v.ads >= 100) throw new Error('ACOS deve ser menor que 100%.');
  const revenue = v.price * (1 - v.discount / 100);
  if (revenue <= 0) throw new Error('Informe um preço de venda maior que zero.');
  const adsRate = mode === 'roas' ? 1 / v.ads : mode === 'percent' ? v.ads / 100 : 0;
  const adsFixed = mode === 'fixed' ? v.ads : 0;
  const rate = (v.commission + v.tax + v.returns) / 100;
  const fixed = v.cost + v.packaging + v.shipping + v.fee;
  const beforeAds = revenue * (1 - rate) - fixed;
  const adsCost = adsFixed + revenue * adsRate;
  const contribution = beforeAds - adsCost;
  const denominator = 1 - rate - adsRate;
  const targetDenominator = denominator - v.target / 100;
  const priceFor = d => d > 0 ? Math.ceil(((fixed + adsFixed) / d / (1 - v.discount / 100) - 1e-9) * 100) / 100 : null;
  return { revenue, contribution, margin: contribution / revenue * 100, beforeAds, adsCost,
    commissionCost: revenue * v.commission / 100, taxCost: revenue * v.tax / 100,
    returnCost: revenue * v.returns / 100, fixed, totalCost: revenue - contribution,
    breakEven: priceFor(denominator), suggestedPrice: priceFor(targetDenominator),
    acos: adsCost / revenue * 100, roas: adsCost > 0 ? revenue / adsCost : null,
    maxAds: Math.max(0, beforeAds), breakEvenRoas: beforeAds > 0 ? revenue / beforeAds : null };
}
