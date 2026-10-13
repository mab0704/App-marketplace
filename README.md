# Bem Chic Calculadora — iOS e Android

Primeira versão em React Native + Expo, com interface em português. Calcula contribuição por venda, preço para margem desejada, equilíbrio e limites de Ads. Compara Shopee e Mercado Livre e salva até 30 simulações no aparelho.

## Executar

Requer Node.js 20.19.4+ e npm.

```sh
npm install
npx expo install --check
npm test
npm start
```

Este projeto usa Expo SDK 55, React Native 0.83.2 e React 19.2. Use uma versão compatível do Expo Go ou um development build. Para compilação local: `npm run android` (Android Studio) e `npm run ios` (macOS + Xcode).

## Gerar instaladores

Com uma conta Expo configurada no seu ambiente:

```sh
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile production
```

O perfil preview gera APK Android. Distribuição iOS/TestFlight e publicação dependem de conta Apple Developer, assinatura, configuração do projeto EAS e revisão da loja. Android Play Store usa o perfil production. As contas e credenciais devem ser configuradas pelo proprietário, nunca enviadas por chat nem commitadas.

## Premissas financeiras

- Todas as taxas são manuais; não há tabela oficial, sincronização ou integração com marketplaces.
- Campos vazios valem zero, com aviso quando faltam comissão, taxa fixa, frete ou impostos.
- Receita = preço anunciado × (1 − desconto do vendedor).
- Contribuição = receita − produto − embalagem − frete do vendedor − taxa fixa − comissão − impostos − provisão para devoluções − Ads.
- Comissão, impostos e provisão incidem sobre receita após desconto. Ajuste o modelo antes de usar situações com base de cálculo diferente.
- Ads: R$/venda OU percentual (ACOS) OU receita/ROAS. Nunca soma os três métodos.
- Preço anunciado sugerido = (custos fixos por venda + Ads fixo) / (1 − percentuais variáveis − Ads percentual − margem desejada) / (1 − desconto). Arredonda para cima no centavo.
- Os custos fixos por venda não são despesas fixas mensais. A contribuição não é lucro líquido.
- Faixas de tarifas, teto de comissão, subsídios, parcelamento, cupons da plataforma e regras tributárias específicas não são automatizados. Recalcule se as condições mudarem com o preço.
- ROAS/ACOS são simulações de venda atribuída. TACOS exige investimento total e faturamento total no mesmo período e não é exibido sem esses dados.
- A provisão de devoluções é uma estimativa percentual de perda; não é um cálculo detalhado de logística reversa e recuperação do produto.

## Dados e privacidade

Sem login, backend, telemetria ou chaves de marketplace. O botão salvar persiste os dois perfis e o histórico localmente via AsyncStorage (não criptografado). Desinstalar pode apagar os dados. O repositório é público: não inclua dados comerciais sensíveis. O app não promete backup ou sincronização entre aparelhos.

## Validação e limites

`npm test` valida fórmulas, desconto, meta, equilíbrio, modos de Ads e entradas inválidas. Antes de distribuir, execute builds nativos e valide em iOS e Android reais, incluindo teclado, acessibilidade, persistência e layouts. Esta entrega de código não equivale a um aplicativo publicado nas lojas.
