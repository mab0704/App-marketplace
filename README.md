# Calculadora de Precificação para Mercado Livre

Calcula a margem de contribuição antes e depois de ADS, com custos de comissão, afiliados, cupons, impostos, embalagem, frete e taxa fixa. Também sugere o preço mínimo para atingir a margem desejada.

## Como usar

Abra `index.html` no navegador, ou publique a pasta em qualquer hospedagem estática. Não precisa instalar nada.

1. **Ajustes:** informe comissão padrão, taxa fixa, imposto, afiliados e ACOS médio. Confira a comissão na tabela oficial do Mercado Livre.
2. **Produtos:** cadastre cada produto (custo, embalagem, frete e outros custos) ou importe sua planilha em CSV. O CSV pode usar ponto e vírgula ou vírgula, com as colunas: nome, sku, categoria, custo, embalagem, outros, frete, comissao.
3. **Precificar:** escolha o produto do cadastro e um dos modos:
   - **Por margem:** informe a margem de contribuição desejada. O app calcula o preço mínimo e sugere o fechamento em ,90.
   - **Por preço:** informe o preço que quer praticar. O app mostra a margem e diz se atinge a meta.
4. Toque em **Usar no produto** para guardar o preço no cadastro.

Os dados ficam salvos no navegador. Faça o backup em JSON pela tela Produtos.

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

- `index.html`: telas (Calcular, Histórico, Produtos, Ajustes)
- `styles.css`: visual, com modo claro e escuro
- `src/calc.js`: regras de cálculo, sem dependências
- `src/app.js`: cadastro, importação, precificação e ajustes
- `tests/calc.test.mjs`: testes do cálculo
