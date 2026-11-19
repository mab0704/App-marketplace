# Calculadora de Precificação para Mercado Livre

Calcula a margem de contribuição antes e depois de ADS, com custos de comissão, afiliados, cupons, impostos, embalagem, frete e taxa fixa. Também sugere o preço mínimo para atingir a margem desejada.

## Como usar

Abra `index.html` no navegador, ou publique a pasta em qualquer hospedagem de site estático. Não precisa instalar nada para usar.

1. Preencha o preço anunciado e os custos do produto.
2. Preencha a comissão da sua categoria e a taxa fixa por venda, conferindo na tabela oficial do Mercado Livre, porque esses valores mudam.
3. Informe o imposto efetivo, o cupom que você paga e o percentual do programa de afiliados.
4. Informe o ACOS médio dos seus ADS para ver a margem depois de ADS.
5. Salve o produto para comparar depois.

## Como o cálculo funciona

- **Valor cobrado** = preço anunciado menos o cupom pago pelo vendedor. Comissão, afiliados e imposto incidem sobre esse valor.
- **Margem antes de ADS** = valor cobrado menos comissão, afiliados, imposto, taxa fixa, frete, custo do produto, embalagem e outros custos.
- **Margem depois de ADS** = margem antes de ADS menos o gasto de ADS (valor cobrado × ACOS).
- **Percentual** = margem em reais dividida pelo valor cobrado.
- **Preço mínimo** = custos fixos ÷ (1 menos os percentuais variáveis menos a margem desejada), ajustado pelo cupom.

## Testes

```
npm test
```

Os testes conferem a cascata de custos, cupons, afiliados, o preço mínimo e o arredondamento para terminação ,90.

## Arquivos

- `index.html`: telas e formulário
- `styles.css`: visual, com modo claro e escuro
- `src/calc.js`: regras de cálculo, sem dependências
- `src/app.js`: ligação entre formulário, resultados e produtos salvos
- `tests/calc.test.mjs`: testes do cálculo
