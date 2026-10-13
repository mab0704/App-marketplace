import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateShopee, shopeeFees, RULE_VERSION } from '../src/shopee.mjs';
const base={price:79.99,cost:30,packaging:2,shipping:0,tax:6,returns:1,ads:5,adsMode:'fixed',target:20,ruleVersion:RULE_VERSION};
test('faixas CNPJ nos limites, inclusive R$ 9 e R$ 500',()=>{
  for(const [price,commission,fee,pix,freight] of [[8,20,4,0,20],[9,20,4.5,0,20],[79.99,20,4.5,0,20],[80,14,16,5,30],[99.99,14,16,5,30],[100,14,20,5,30],[199.99,14,20,5,30],[200,14,26,5,40],[499.99,14,26,5,40],[500,14,26,8,40]]){
    const f=shopeeFees(price);assert.equal(f.commission,commission);assert.equal(f.fee,fee);assert.equal(f.pixPercent,pix);assert.equal(f.freightSubsidy,freight);
  }
});
test('campanha acrescenta 2,5% uma vez e benefícios não viram receita',()=>{
 const normal=calculateShopee({...base,price:100});const campaign=calculateShopee({...base,price:100,campaign:'yes'});
 assert.equal(normal.revenue,100);assert.equal(normal.commissionCost,14);assert.equal(normal.fees.fee,20);
 assert.equal(campaign.campaignCost,2.5);assert.ok(Math.abs(normal.contribution-campaign.contribution-2.5)<1e-9);
});
test('desconto do vendedor determina faixa; comissão manual não interfere',()=>{
 const r=calculateShopee({...base,price:100,discount:21,commission:0,fee:0});assert.equal(r.revenue,79);assert.equal(r.fees.fee,4.5);assert.equal(r.fees.commission,20);
});
test('preço mínimo por faixa coincide com busca exaustiva em centavos',()=>{
 // Independent arithmetic oracle covers jumps, discount, low-price rule and Ads modes.
 for(const cost of [0,2,29.9,45,65,100]) for(const discount of [0,10]) for(const mode of ['fixed','percent','roas']) {
  const v={...base,cost,discount,adsMode:mode,ads:mode==='roas'?15:5};const r=calculateShopee(v);
  for(const [target,actual] of [[0,r.breakEven],[20,r.suggestedPrice]]){
   let expected=null;
   for(let cents=1;cents<=50000;cents++){
    const revenue=cents/100*(1-discount/100);
    const fixedFee=revenue<9?revenue/2:revenue<80?4.5:revenue<100?16:revenue<200?20:26;
    const commission=revenue<80?.2:.14;
    const ads=mode==='fixed'?5:mode==='percent'?revenue*.05:revenue/15;
    const contribution=revenue*(1-commission-.06-.01)-cost-2-fixedFee-ads;
    if(contribution/revenue*100+1e-9>=target){expected=cents/100;break;}
   }
   assert.equal(actual,expected,JSON.stringify({cost,discount,mode,target}));
  }
 }
});
test('meta inviável e perfil CPF não produzem recomendação enganosa',()=>{
 assert.equal(calculateShopee({...base,target:95}).suggestedPrice,null);
 assert.throws(()=>calculateShopee({...base,sellerType:'CPF'}));
});
