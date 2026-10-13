import { calculate, parseNumber } from './calculator.mjs';

// Tabela informada pelo usuário em 12/10/2026. Não é sincronizada com a Shopee.
export const RULE_VERSION = 'shopee-cnpj-2026-10-user-v1';
export const BANDS = [
  { min:0, max:9, commission:20, fee:0, feeRate:0.5 },
  { min:9, max:80, commission:20, fee:4.5, feeRate:0 },
  { min:80, max:100, commission:14, fee:16, feeRate:0 },
  { min:100, max:200, commission:14, fee:20, feeRate:0 },
  { min:200, max:500, commission:14, fee:26, feeRate:0 },
  { min:500, max:Infinity, commission:14, fee:26, feeRate:0 },
];
export function shopeeFees(revenue, campaign = false) {
  if (!Number.isFinite(revenue) || revenue <= 0) throw new Error('Informe um preço maior que zero.');
  const band = BANDS.find(b => revenue >= b.min && revenue < b.max);
  return { commission:band.commission, fee:band.fee + band.feeRate * revenue,
    campaignRate:campaign ? 2.5 : 0, pixPercent: revenue >= 500 ? 8 : revenue >= 80 ? 5 : 0,
    freightSubsidy: revenue >= 200 ? 40 : revenue >= 80 ? 30 : 20 };
}
export function calculateShopee(values) {
  if (values.sellerType && values.sellerType !== 'CNPJ') throw new Error('Esta versão aplica apenas a tabela CNPJ.');
  if (values.ruleVersion && values.ruleVersion !== RULE_VERSION) throw new Error('Versão da tabela não suportada.');
  const price = parseNumber(values.price ?? 0);
  const discount = parseNumber(values.discount ?? 0);
  const q = 1 - discount / 100;
  if (q <= 0) throw new Error('O desconto deve ser menor que 100%.');
  const fees = shopeeFees(price * q, values.campaign === 'yes');
  const effective = { ...values, commission:fees.commission + fees.campaignRate, fee:fees.fee };
  const r = calculate(effective);
  const tax = parseNumber(values.tax ?? 0) / 100;
  const returns = parseNumber(values.returns ?? 0) / 100;
  const ads = parseNumber(values.ads ?? 0);
  const mode = values.adsMode ?? 'fixed';
  const adsRate = mode === 'roas' ? 1 / ads : mode === 'percent' ? ads / 100 : 0;
  const fixedAds = mode === 'fixed' ? ads : 0;
  const baseCost = ['cost','packaging','shipping'].reduce((n,k)=>n+parseNumber(values[k]??0),0) + fixedAds;
  function minimumPrice(margin) {
    const candidates = [];
    for (const band of BANDS) {
      const denominator = 1 - (band.commission + fees.campaignRate)/100 - band.feeRate - tax - returns - adsRate - margin;
      if (denominator <= 0) continue;
      const raw = Math.max(band.min, (baseCost + band.fee)/denominator) / q;
      let cents = Math.max(1, Math.ceil(raw * 100 - 1e-7));
      // Validate after rounding; don't assume a continuous tariff across thresholds.
      for (let step=0; step<3; step++,cents++) {
        const candidate = cents / 100;
        const revenue = candidate*q;
        if (revenue < band.min || revenue >= band.max || candidate > 1e9) continue;
        const f = shopeeFees(revenue, values.campaign === 'yes');
        const check = calculate({...values,price:candidate,commission:f.commission+f.campaignRate,fee:f.fee});
        if (check.margin + 1e-9 >= margin*100) {candidates.push(candidate);break;}
      }
    }
    return candidates.length ? Math.min(...candidates) : null;
  }
  return { ...r, fees, ruleVersion:RULE_VERSION,
    commissionCost:r.revenue*fees.commission/100,
    campaignCost:r.revenue*fees.campaignRate/100,
    breakEven:minimumPrice(0), suggestedPrice:minimumPrice(parseNumber(values.target??0)/100) };
}
