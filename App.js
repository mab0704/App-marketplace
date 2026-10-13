import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculate } from './src/calculator.mjs';

const KEY = '@bemchic/calculadora/v1';
const initial = { price:'', cost:'', packaging:'', shipping:'', fee:'', commission:'', tax:'', returns:'', discount:'', ads:'', adsMode:'fixed', target:'15' };
const money = n => n == null ? 'Indisponível' : n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const pct = n => `${n.toFixed(2).replace('.',',')}%`;
const fields = [ ['price','Preço anunciado','R$'], ['discount','Desconto do vendedor','%'], ['cost','Custo do produto','R$'], ['packaging','Embalagem','R$'], ['shipping','Frete pago pelo vendedor','R$'], ['commission','Comissão','%'], ['fee','Taxa fixa por venda','R$'], ['tax','Impostos sobre a venda','%'], ['returns','Provisão para devoluções','%'], ['target','Margem desejada','%'] ];
function resultOf(v) { try { return {data:calculate(v)}; } catch (e) { return {error:e.message}; } }
function Button({label,onPress,active=false}) { return <Pressable accessibilityRole="button" accessibilityState={{selected:active}} onPress={onPress} style={[s.button,active&&s.selected]}><Text style={[s.buttonText,active&&s.selectedText]}>{label}</Text></Pressable>; }
function Metric({label,value,large=false}) { return <View style={s.metric}><Text style={s.muted}>{label}</Text><Text style={large?s.large:s.value}>{value}</Text></View>; }
export default function App() { return <SafeAreaProvider><Calculator /></SafeAreaProvider>; }
function Calculator() {
  const [market,setMarket] = useState('Shopee');
  const [tab,setTab] = useState('Calcular');
  const [profiles,setProfiles] = useState({Shopee:{...initial},'Mercado Livre':{...initial}});
  const [history,setHistory] = useState([]);
  const [ready,setReady] = useState(false);
  const [storageError,setStorageError] = useState('');
  useEffect(() => { let alive=true; AsyncStorage.getItem(KEY).then(raw=>{
    if (!alive || !raw) return;
    const saved=JSON.parse(raw);
    if (saved.version !== 1 || !saved.profiles || !Array.isArray(saved.history)) throw new Error('Formato inválido');
    const restored = {};
    for (const name of ['Shopee','Mercado Livre']) {
      restored[name] = {...initial};
      for (const key of Object.keys(initial)) if (typeof saved.profiles[name]?.[key] === 'string') restored[name][key]=saved.profiles[name][key];
    }
    setProfiles(restored);
    setHistory(saved.history.filter(x=>x && ['Shopee','Mercado Livre'].includes(x.market) && x.values && !resultOf(x.values).error).slice(0,30));
  }).catch(()=>{if(alive)setStorageError('Não foi possível recuperar os dados salvos.');}).finally(()=>{if(alive)setReady(true);}); return ()=>{alive=false;}; },[]);
  const values = profiles[market]; const result = resultOf(values); const r = result.data;
  const update = (key,value) => setProfiles(p=>({...p,[market]:{...p[market],[key]:value}}));
  async function persist(nextHistory) {
    try { await AsyncStorage.setItem(KEY,JSON.stringify({version:1,profiles,history:nextHistory})); setStorageError(''); return true; }
    catch { setStorageError('Não foi possível salvar neste aparelho. Tente novamente.'); return false; }
  }
  async function save() {
    if (!r) return;
    const next = [{id:String(Date.now()),date:new Date().toISOString(),market,values:{...values}},...history].slice(0,30);
    if(await persist(next)){setHistory(next);Alert.alert('Simulação salva','Os dados estão guardados somente neste aparelho.');}
  }
  const missing = ['commission','fee','shipping','tax'].some(k=>values[k]==='');
  if (!ready) return <SafeAreaView style={s.safe}><Text style={s.title}>Carregando calculadora…</Text></SafeAreaView>;
  return <SafeAreaView style={s.safe}><StatusBar barStyle="dark-content"/><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <Text style={s.brand}>BEM CHIC • SELLER TOOLS</Text><Text style={s.title}>Cada venda,\numa decisão melhor.</Text><Text style={s.subtitle}>Precificação para marketplaces</Text>
    <View style={s.row}>{['Calcular','Comparar','Histórico'].map(t=><Button key={t} label={t} active={tab===t} onPress={()=>setTab(t)}/>)}</View>
    {!!storageError&&<Text accessibilityRole="alert" style={s.warning}>{storageError}</Text>}
    {tab==='Calcular'&&<>
      <View style={s.row}>{Object.keys(profiles).map(m=><Button key={m} label={m} active={market===m} onPress={()=>setMarket(m)}/>)}</View>
      <View style={s.card}><Text style={s.heading}>Custos e condições</Text><Text style={s.note}>Preencha as taxas do seu anúncio. Não há tabela oficial automática. Valores em branco entram como zero.</Text>
        {market==='Mercado Livre'&&<Text style={s.note}>Use a comissão do seu tipo de anúncio e categoria e o custo de frete efetivamente cobrado.</Text>}
        {market==='Shopee'&&<Text style={s.note}>Inclua os custos dos programas e condições aplicáveis à sua conta na comissão e na taxa fixa.</Text>}
        <View style={s.grid}>{fields.map(([key,label,unit])=><View key={key} style={s.field}><Text style={s.label}>{label}</Text><View style={s.inputWrap}><Text style={s.unit}>{unit}</Text><TextInput accessibilityLabel={`${label} em ${unit}`} keyboardType="decimal-pad" value={values[key]} onChangeText={v=>update(key,v)} placeholder="0,00" placeholderTextColor="#89958f" maxLength={14} style={s.input}/></View></View>)}</View>
      </View>
      <View style={s.card}><Text style={s.heading}>Publicidade</Text><View style={s.row}>{[['fixed','R$ / venda'],['percent','ACOS %'],['roas','ROAS']].map(([mode,label])=><Button key={mode} label={label} active={values.adsMode===mode} onPress={()=>{setProfiles(p=>({...p,[market]:{...p[market],adsMode:mode,ads:''}}));}}/>)}</View>
        <Text style={s.label}>{values.adsMode==='fixed'?'Custo de Ads por venda':values.adsMode==='percent'?'ACOS estimado (%)':'ROAS estimado (ex.: 15)'}</Text><TextInput style={[s.inputWrap,s.singleInput]} accessibilityLabel="Valor de publicidade" keyboardType="decimal-pad" value={values.ads} onChangeText={v=>update('ads',v)} placeholder="0" maxLength={14}/>
        <Text style={s.note}>Escolha um único método. ROAS e ACOS simulam uma venda atribuída aos anúncios; não representam o TACOS da operação.</Text>
      </View>
      {missing&&<Text style={s.warning}>Comissão, taxa fixa, frete ou impostos ainda não preenchidos. Informe 0 quando não houver cobrança.</Text>}
      {r?<><View style={[s.result,r.contribution<0&&s.loss]}><Text style={s.resultLabel}>MARGEM DE CONTRIBUIÇÃO</Text><Text style={s.resultMoney}>{money(r.contribution)}</Text><Text style={s.resultSub}>{pct(r.margin)} da receita após desconto • por venda</Text><Text style={s.resultSub}>{r.contribution<0?'A venda está dando prejuízo antes das despesas fixas.':'Valor disponível para cobrir despesas fixas e gerar lucro.'}</Text></View>
      <View style={s.card}><Text style={s.heading}>Seu preço, com estratégia</Text><Metric label="Preço anunciado para a margem desejada" value={money(r.suggestedPrice)} large/><Metric label="Preço anunciado de equilíbrio" value={money(r.breakEven)}/>{r.suggestedPrice===null&&<Text style={s.warning}>Os percentuais não permitem atingir essa meta. Revise custos, Ads ou margem.</Text>}<Text style={s.note}>Considera o desconto informado. Taxas e frete constantes: se mudarem por faixa de preço, recalcule.</Text></View>
      <View style={s.card}><Text style={s.heading}>Para onde vai o dinheiro</Text>{[['Receita após desconto',r.revenue],['Produto, embalagem, frete e taxa fixa',r.fixed],['Comissão',r.commissionCost],['Impostos',r.taxCost],['Provisão para devoluções',r.returnCost],['Publicidade',r.adsCost],['Total de custos variáveis',r.totalCost]].map(([label,value])=><Metric key={label} label={label} value={money(value)}/>)}</View>
      <View style={s.card}><Text style={s.heading}>Limites de publicidade</Text><Metric label="ACOS simulado" value={pct(r.acos)}/><Metric label="ROAS simulado" value={r.roas===null?'Sem investimento':`${r.roas.toFixed(2)}x`}/><Metric label="Máximo de Ads para contribuição zero" value={money(r.maxAds)}/><Metric label="ROAS de equilíbrio" value={r.breakEvenRoas===null?'Inviável antes dos Ads':`${r.breakEvenRoas.toFixed(2)}x`}/></View>
      <Button label="Salvar simulação no aparelho" active onPress={save}/></>:<Text accessibilityRole="alert" style={s.warning}>{result.error}</Text>}
    </>}
    {tab==='Comparar'&&<><Text style={s.heading}>Compare a contribuição por venda</Text><Text style={s.note}>Cada canal usa os valores preenchidos na calculadora. Para comparar o mesmo produto, use o mesmo custo nos dois.</Text>{Object.entries(profiles).map(([name,v])=>{const res=resultOf(v);return <View key={name} style={s.card}><Text style={s.heading}>{name}</Text>{res.data?<><Metric label="Preço anunciado" value={money(Number(v.price.replace(',','.')))}/><Metric label="Contribuição por venda" value={money(res.data.contribution)} large/><Metric label="Margem após Ads" value={pct(res.data.margin)}/><Metric label="Preço para a meta" value={money(res.data.suggestedPrice)}/></>:<Text style={s.note}>{res.error}</Text>}<Button label="Editar valores" onPress={()=>{setMarket(name);setTab('Calcular');}}/></View>;})}</>}
    {tab==='Histórico'&&<><Text style={s.heading}>Suas últimas 30 simulações</Text>{history.length===0&&<Text style={s.note}>Nenhuma simulação salva. Preencha os custos e toque em salvar.</Text>}{history.map(item=>{const data=resultOf(item.values).data;return <View key={item.id} style={s.card}><Text style={s.heading}>{item.market}</Text><Text style={s.note}>{new Date(item.date).toLocaleString('pt-BR')}</Text><Metric label="Contribuição por venda" value={money(data?.contribution)}/><Button label="Carregar simulação" onPress={()=>{setProfiles(p=>({...p,[item.market]:{...initial,...item.values}}));setMarket(item.market);setTab('Calcular');}}/></View>;})}{history.length>0&&<Button label="Apagar histórico" onPress={()=>Alert.alert('Apagar histórico?','Essa ação remove as simulações salvas neste aparelho.',[{text:'Cancelar',style:'cancel'},{text:'Apagar',style:'destructive',onPress:async()=>{if(await persist([]))setHistory([]);}}])}/>}</>}
    <Text style={s.footer}>Margem de contribuição não é lucro líquido. Despesas fixas e pró-labore não estão descontados. Impostos, comissão e provisão são calculados sobre a receita após desconto. Provisão é uma estimativa simplificada de perdas com devoluções.</Text>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#f3f5f1'},content:{padding:22,paddingBottom:42,gap:18,width:'100%',maxWidth:760,alignSelf:'center'},brand:{fontSize:11,letterSpacing:2,color:'#32604c',fontWeight:'800'},title:{fontSize:32,lineHeight:38,fontWeight:'800',color:'#173d2e'},subtitle:{fontSize:15,color:'#66736b',marginTop:-8},row:{flexDirection:'row',flexWrap:'wrap',gap:8},button:{paddingVertical:13,paddingHorizontal:15,borderRadius:14,backgroundColor:'#e5ebe4',flexGrow:1,alignItems:'center'},selected:{backgroundColor:'#1b513d'},buttonText:{color:'#365345',fontSize:13,fontWeight:'700'},selectedText:{color:'#fff'},card:{backgroundColor:'#fff',borderRadius:22,padding:20,gap:14},heading:{fontSize:19,fontWeight:'700',color:'#233f31'},note:{fontSize:12,lineHeight:19,color:'#67736a'},grid:{flexDirection:'row',flexWrap:'wrap',gap:14},field:{width:'47%',flexGrow:1},label:{fontSize:12,fontWeight:'600',color:'#4d6053',marginBottom:7},inputWrap:{flexDirection:'row',alignItems:'center',borderRadius:12,borderWidth:1,borderColor:'#dce4dc',backgroundColor:'#fafbf8',minHeight:50},unit:{fontSize:12,color:'#738074',paddingLeft:12},input:{flex:1,padding:12,fontSize:17,color:'#193d2a',minWidth:50},singleInput:{padding:13,fontSize:18,color:'#193d2a'},result:{backgroundColor:'#194f3a',borderRadius:24,padding:24,gap:10},loss:{backgroundColor:'#8b3c35'},resultLabel:{color:'#cde6d5',fontSize:10,letterSpacing:1.5,fontWeight:'700'},resultMoney:{color:'#fff',fontSize:42,fontWeight:'800'},resultSub:{color:'#e1ece5',fontSize:13,lineHeight:20},metric:{gap:4,paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#edf0ea'},muted:{fontSize:12,color:'#69776c'},value:{fontSize:18,color:'#263d30',fontWeight:'600'},large:{fontSize:29,color:'#20503a',fontWeight:'800'},warning:{backgroundColor:'#fff0d5',padding:14,borderRadius:12,color:'#775312',fontSize:12,lineHeight:19},footer:{fontSize:11,lineHeight:18,color:'#798278'}});
