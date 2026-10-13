# Bem Chic Calculadora — iOS e Android

Primeira versão em React Native + Expo, com interface em português. Calcula contribuição por venda, preço para margem desejada, equilíbrio e limites de Ads. Esta etapa disponibiliza apenas Shopee CNPJ, sem comparação entre canais. Salva até 30 simulações locais; registros anteriores do Mercado Livre são preservados, mas ficam ocultos.

## Executar

Requer Node.js 20.19.4+ e npm.

```sh
npm install
npx expo install --check
npm test
npm start
```

Este projeto usa Expo SDK 55, React Native 0.83.10 e React 19.2. Use uma versão compatível do Expo Go ou um development build. Para compilação local: `npm run android` (Android Studio) e `npm run ios` (macOS + Xcode).

## Gerar instaladores

Com uma conta Expo configurada no seu ambiente:

```sh
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile production
```

O perfil preview gera APK Android. Distribuição iOS/TestFlight e publicação dependem de conta Apple Developer, assinatura, configuração do projeto EAS e revisão da loja. Android Play Store usa o perfil production. As contas e credenciais devem ser configuradas pelo proprietário, nunca enviadas por chat nem commitadas.

## Regras Shopee desta etapa

Tabela fornecida pelo usuário em 12/10/2026, identificada por `shopee-cnpj-2026-10-user-v1`. Não há sincronização automática com a plataforma. O resultado indexado do comunicado Shopee de 18/09/2026 corrobora o ajuste de R$ 4,00 para R$ 4,50 em 01/10/2026; o corpo completo da página não ficou acessível para confirmar as demais condições. Referência: https://seller.br.shopee.cn/edu/article/26839/Comissao-para-vendedores-CNPJ-e-CPF-em-2026

| Preço efetivo por item | Comissão | Taxa por item | Pix potencial | Frete ao comprador, até |
| --- | --- | --- | --- | --- |
| Abaixo de R$ 9 | 20% | 50% do preço | 0% | R$ 20 |
| R$ 9 a R$ 79,99 | 20% | R$ 4,50 | 0% | R$ 20 |
| R$ 80 a R$ 99,99 | 14% | R$ 16 | 5% | R$ 30 |
| R$ 100 a R$ 199,99 | 14% | R$ 20 | 5% | R$ 30 |
| R$ 200 a R$ 499,99 | 14% | R$ 26 | 5% | R$ 40 |
| R$ 500 ou mais | 14% | R$ 26 | 8% | R$ 40 |

- Campanha de destaque opcional: mais 2,5% da receita, desativada por padrão; exibida separadamente.
- Limites adotados para fechar as lacunas do texto recebido: frete de R$ 40 a partir de R$ 200 e Pix de 8% a partir de R$ 500. São premissas de implementação a confirmar na conta do vendedor.
- Base adotada: preço anunciado após desconto financiado pelo vendedor, antes de subsídios promocionais. A seleção da faixa usa essa mesma base.
- Pix e frete são benefícios informativos do comprador: não entram como receita extra, despesa ou redução automática de custo do vendedor. O frete informado é o custo efetivamente suportado pelo vendedor. Não se simula a base fiscal específica de uma venda Pix.
- CPF fica pendente: o texto recebido não define completamente a taxa regressiva abaixo de R$ 12. O adicional de R$ 3 acima de 450 pedidos/90 dias não se aplica ao CNPJ e não é cobrado nesta etapa.
- O cálculo representa uma venda concluída. Cancelamentos, devoluções, reembolsos e compensações de disputa não são apurados transação a transação; a provisão de perdas é uma estimativa distinta de comissão.
- Não há regra legal automática vinculando abertura de CNPJ a R$ 81 mil: esse número está associado ao limite do regime MEI, não a uma autorização geral de comércio informal até esse valor.

## Premissas financeiras

- Contribuição = receita após desconto − produto − embalagem − frete do vendedor − taxa por item − comissão − campanha − impostos − provisão para devoluções − Ads.
- Impostos e provisão incidem sobre a receita após desconto. Bases tributárias específicas precisam ser conferidas para cada operação.
- Ads: R$/venda OU percentual (ACOS) OU receita/ROAS, nunca somados entre si. TACOS não é estimado sem faturamento total e investimento total no período.
- O motor procura o menor preço anunciado em centavos que atinge a meta, avaliando cada faixa de taxa separadamente. Inclui a taxa proporcional de 50% abaixo de R$ 9 e valida a faixa após arredondamento. Preço de equilíbrio usa meta zero. Valores acima de R$ 1 bilhão não são sugeridos.
- Frete, produto e outros custos informados permanecem constantes durante a sugestão; se variarem com o preço, devem ser revistos.
- Margem de contribuição não é lucro líquido: despesas fixas mensais e pró-labore não foram deduzidos.
- Cálculos internos mantêm precisão; exibição em reais arredonda a centavos. O arredondamento transacional efetivo da plataforma pode produzir diferenças de centavos.
- Histórico antigo mantém sua fórmula original. O botão “Recalcular com a tabela atual” aplica explicitamente a nova tabela ao carregar a simulação.

## Dados e privacidade

Sem login, backend, telemetria ou chaves de marketplace. O botão salvar persiste os perfis e o histórico localmente via AsyncStorage (não criptografado). Desinstalar pode apagar os dados. O repositório é público: não inclua dados comerciais sensíveis. O app não promete backup ou sincronização entre aparelhos.

## Validação e limites

Validação nesta entrega: 11 testes passaram; exportação dos bundles iOS e Android concluída com Expo/Metro. Builds nativos e testes em aparelhos não foram executados.

`npm test` valida fórmulas, desconto, meta, equilíbrio, modos de Ads e entradas inválidas. Antes de distribuir, execute builds nativos e valide em iOS e Android reais, incluindo teclado, acessibilidade, persistência e layouts. Esta entrega de código não equivale a um aplicativo publicado nas lojas.
