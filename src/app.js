(function () {
  const C = window.Calc;
  const STORE_KEY = 'precificacao-ml-v2';
  const $ = (id) => document.getElementById(id);
  const num = (v) => {
    const x = Number(String(v ?? '').replace(',', '.'));
    return Number.isFinite(x) ? x : 0;
  };

  const brl = (v) => (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const pctFmt = (v) => (Number.isFinite(v) ? v * 100 : 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Armazenamento ---------- */
  const AJUSTES_PADRAO = { comissaoPct: '', taxaFixa: '', impostoPct: '', afiliadoPct: '', acosPct: '', margemMinPct: '20' };

  function carregar() {
    try {
      const d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (d && Array.isArray(d.produtos)) {
        return { produtos: d.produtos, ajustes: { ...AJUSTES_PADRAO, ...(d.ajustes || {}) }, historico: Array.isArray(d.historico) ? d.historico : [] };
      }
    } catch (_) { /* sem armazenamento ou dados corrompidos */ }
    return { produtos: [], ajustes: { ...AJUSTES_PADRAO }, historico: [] };
  }

  let dados = carregar();

  function salvar() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(dados));
    } catch (_) {
      toast('Não foi possível salvar neste navegador.');
    }
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- Cálculo a partir do cadastro ---------- */
  function entradaBase(prod) {
    const aj = dados.ajustes;
    return {
      custo: prod.custo,
      embalagem: prod.embalagem,
      outros: prod.outros,
      frete: prod.frete,
      comissaoPct: prod.comissaoPct !== '' && prod.comissaoPct != null ? prod.comissaoPct : aj.comissaoPct,
      taxaFixa: aj.taxaFixa,
      impostoPct: aj.impostoPct,
      afiliadoPct: aj.afiliadoPct,
      acosPct: aj.acosPct,
      margemMinPct: aj.margemMinPct === '' ? 20 : aj.margemMinPct,
    };
  }

  function produtoSel() {
    return dados.produtos.find((p) => p.id === ui.sel) || null;
  }

  function statusDe(r, pct, valor) {
    if (r.valor <= 0) return { cls: '', txt: 'Defina o preço' };
    if (valor < 0) return { cls: 'bad', txt: 'Prejuízo' };
    if (pct < r.margemMin) return { cls: 'bad', txt: 'Abaixo da meta' };
    if (pct < r.margemMin + 0.05) return { cls: 'warn', txt: 'Perto da meta' };
    return { cls: 'ok', txt: 'Dentro da meta' };
  }

  /* ---------- Estado da tela de precificação ---------- */
  const ui = { sel: null, modo: 'margem' };

  function lerCupomEMargem() {
    return {
      cupomPct: $('p-cupomPct').value,
      cupomValor: $('p-cupomValor').value,
      incluiAds: $('p-ads').checked,
      margem: num($('p-margem').value),
      preco: num($('p-preco').value),
    };
  }

  function calcularPrecificacao() {
    const prod = produtoSel();
    if (!prod) return null;
    const f = lerCupomEMargem();
    const base = { ...entradaBase(prod), cupomPct: f.cupomPct, cupomValor: f.cupomValor };

    let preco;
    let exato = null;
    if (ui.modo === 'margem') {
      exato = C.precoParaMargem(base, f.margem, f.incluiAds);
      if (exato == null) return { erro: 'Essa margem não fecha com as taxas atuais. Revise os Ajustes.' };
      preco = C.precoComTerminacao(exato);
    } else {
      preco = f.preco;
    }
    const r = C.calcular({ ...base, preco });
    const minimoParaMeta = C.precoParaMargem(base, r.margemMin * 100, f.incluiAds);
    return { prod, r, preco, exato, f, minimoParaMeta };
  }

  function renderPrecificar() {
    const temProdutos = dados.produtos.length > 0;
    $('sem-produtos').hidden = temProdutos;
    $('painel').hidden = !temProdutos;
    if (!temProdutos) return;

    // Select de produtos
    const sel = $('sel-produto');
    const qCalc = ($('busca-calc').value || '').trim().toLowerCase();
    const ordenados = [...dados.produtos]
      .filter((p) => !qCalc || `${p.nome} ${p.sku}`.toLowerCase().includes(qCalc))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    if (ordenados.length && !ordenados.some((p) => p.id === ui.sel)) ui.sel = ordenados[0].id;
    sel.innerHTML = ordenados.length
      ? ordenados.map((p) => `<option value="${esc(p.id)}" ${p.id === ui.sel ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')
      : '<option value="">Nenhum produto encontrado</option>';
    if (!ordenados.length) {
      $('prod-resumo').innerHTML = '';
      $('btn-usar').disabled = true;
      return;
    }

    const prod = produtoSel();
    const custos = [
      ['Custo', prod.custo],
      ['Embalagem', prod.embalagem],
      ['Frete', prod.frete],
      ['Outros', prod.outros],
    ];
    $('prod-resumo').innerHTML = custos.map(([l, v]) => `<span>${l}<b>${brl(v)}</b></span>`).join('');

    // Modo
    document.querySelectorAll('.segmented button').forEach((b) => b.classList.toggle('is-on', b.dataset.modo === ui.modo));
    $('campo-margem').hidden = ui.modo !== 'margem';
    $('campo-preco').hidden = ui.modo !== 'preco';
    $('preco-titulo').textContent = ui.modo === 'margem' ? 'Preço para essa margem' : 'Preço que você definiu';

    const res = calcularPrecificacao();
    const botao = $('btn-usar');
    if (!res || res.erro) {
      $('alerta').textContent = res ? res.erro : '';
      $('preco-final').textContent = '-';
      $('preco-info').textContent = '';
      $('margem-pct').textContent = '0%';
      $('margem-rs').textContent = brl(0);
      botao.disabled = true;
      return;
    }
    botao.disabled = false;

    const { r, f, preco, exato, minimoParaMeta } = res;
    const pctPrincipal = f.incluiAds ? r.margemDepoisPct : r.margemAntesPct;
    const valorPrincipal = f.incluiAds ? r.margemDepois : r.margemAntes;
    $('hero-label').textContent = f.incluiAds ? 'Margem depois de ADS' : 'Margem antes de ADS';
    $('margem-pct').textContent = pctFmt(pctPrincipal);
    $('margem-rs').textContent = brl(valorPrincipal);

    const st = statusDe(r, pctPrincipal, valorPrincipal);
    const chip = $('status');
    chip.textContent = st.txt;
    chip.className = 'chip' + (st.cls ? ' ' + st.cls : '');

    const fill = $('meter-fill');
    fill.style.width = Math.max(0, Math.min(pctPrincipal / 0.4, 1)) * 100 + '%';
    fill.style.background = st.cls === 'bad' ? 'var(--bad)' : st.cls === 'warn' ? 'var(--warn)' : st.cls === 'ok' ? 'var(--ok)' : 'var(--accent)';
    $('meter-goal').style.left = Math.min(r.margemMin / 0.4, 1) * 100 + '%';

    const alertas = [];
    if (!prod.comissaoPct && !dados.ajustes.comissaoPct) alertas.push('Defina a comissão nos Ajustes para um cálculo confiável.');
    if (r.valor > 0 && r.margemDepois < 0) alertas.push('Com essas taxas e ADS, cada venda dá prejuízo.');
    $('alerta').textContent = alertas.join(' ');

    // Preço sugerido / verificação
    if (ui.modo === 'margem') {
      $('preco-final').textContent = brl(preco);
      $('preco-info').textContent = `Preço exato mínimo ${brl(exato)}. Arredondado para fechar em ,90.`;
    } else {
      $('preco-final').textContent = brl(preco);
      if (minimoParaMeta == null) {
        $('preco-info').textContent = 'Meta mínima não fecha com as taxas atuais.';
      } else if (preco >= minimoParaMeta) {
        $('preco-info').textContent = `Atinge sua margem mínima. Preço mínimo para essa meta: ${brl(minimoParaMeta)}.`;
      } else {
        $('preco-info').textContent = `Abaixo do mínimo para a meta de ${pctFmt(r.margemMin)}: use pelo menos ${brl(C.precoComTerminacao(minimoParaMeta))}.`;
      }
    }

    $('antes-pct').textContent = pctFmt(r.margemAntesPct);
    $('antes-rs').textContent = brl(r.margemAntes);
    $('ads-rs').textContent = brl(r.ads);
    $('ads-pct').textContent = (r.valor > 0 ? pctFmt(r.ads / r.valor) : '0%') + ' do valor cobrado';

    montarCascata(r);
  }

  function montarCascata(r) {
    const linhas = [
      { label: 'Valor cobrado do comprador', v: r.valor, tipo: 'total' },
      { label: 'Comissão Mercado Livre', v: -r.comissao },
      { label: 'Programa de afiliados', v: -r.afiliado },
      { label: 'Imposto', v: -r.imposto },
      { label: 'Taxa fixa', v: -r.taxaFixa },
      { label: 'Frete', v: -r.frete },
      { label: 'Custo do produto', v: -r.custo },
      { label: 'Embalagem', v: -r.embalagem },
      { label: 'Outros custos', v: -r.outros },
      { label: 'Margem antes de ADS', v: r.margemAntes, tipo: 'total pos' },
      { label: 'ADS', v: -r.ads, tipo: 'ads' },
      { label: 'Margem depois de ADS', v: r.margemDepois, tipo: 'total pos' },
    ].filter((l) => l.v !== 0 || l.tipo);
    const base = Math.max(r.valor, 1);
    $('cascata').innerHTML = linhas
      .map((l) => {
        const classes = (l.tipo || 'neg').split(' ');
        const largura = Math.min(Math.abs(l.v) / base, 1) * 100;
        const sinal = l.v < 0 ? '−' : '';
        return `<li>
          <div class="wf-row ${classes.join(' ')}"><span>${l.label}</span><span>${sinal}${brl(Math.abs(l.v))}</span></div>
          <div class="wf-bar"><i style="width:${largura.toFixed(1)}%"></i></div>
        </li>`;
      })
      .join('');
  }

  /* ---------- Produtos ---------- */
  function margemDoPrecoAtual(p) {
    if (p.precoAtual == null || p.precoAtual === '') return null;
    const r = C.calcular({ ...entradaBase(p), preco: p.precoAtual });
    return { r, pct: r.margemDepoisPct, valor: r.margemDepois };
  }

  function iniciais(nome) {
    const partes = String(nome).trim().split(/\s+/).filter(Boolean);
    const txt = (partes[0] || '?').charAt(0) + (partes.length > 1 ? partes[partes.length - 1].charAt(0) : '');
    return txt.toUpperCase();
  }

  function renderProdutos() {
    const q = $('busca').value.trim().toLowerCase();
    const todos = dados.produtos;
    const lista = todos
      .filter((p) => !q || `${p.nome} ${p.sku} ${p.categoria}`.toLowerCase().includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    // Indicadores
    const comPreco = todos.filter((p) => p.precoAtual != null && p.precoAtual !== '');
    const abaixo = comPreco.filter((p) => {
      const m = margemDoPrecoAtual(p);
      return m && m.pct < m.r.margemMin;
    });
    $('st-total').textContent = String(todos.length);
    $('st-com-preco').textContent = String(comPreco.length);
    $('st-abaixo').textContent = String(abaixo.length);
    $('qtd-produtos').textContent = `${todos.length} ${todos.length === 1 ? 'produto' : 'produtos'}`;

    const alvo = $('lista-produtos');
    if (!lista.length) {
      alvo.innerHTML = `<div class="card empty-line">${todos.length ? 'Nenhum produto encontrado.' : 'Seu cadastro está vazio. Toque em + Novo ou importe uma planilha.'}</div>`;
      return;
    }

    // Agrupa por categoria
    const grupos = new Map();
    for (const p of lista) {
      const cat = p.categoria || 'Sem categoria';
      if (!grupos.has(cat)) grupos.set(cat, []);
      grupos.get(cat).push(p);
    }
    const cats = [...grupos.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    alvo.innerHTML = cats
      .map((cat) => {
        const itens = grupos.get(cat)
          .map((p) => {
            const m = margemDoPrecoAtual(p);
            const detalhe = [p.sku, `custo ${brl(p.custo)}`].filter(Boolean).join(' · ');
            let lado = '<span class="muted">Sem preço</span>';
            if (m) {
              const st = statusDe(m.r, m.pct, m.valor);
              lado = `<strong>${brl(p.precoAtual)}</strong><span class="chip ${st.cls}">${pctFmt(m.pct)} depois de ADS</span>`;
            }
            return `<li data-id="${esc(p.id)}">
              <span class="initials" aria-hidden="true">${esc(iniciais(p.nome))}</span>
              <div class="info"><strong>${esc(p.nome)}</strong><span>${esc(detalhe)}</span></div>
              <div class="side">${lado}</div>
            </li>`;
          })
          .join('');
        return `<div class="cat-title"><h2>${esc(cat)}</h2><span>${grupos.get(cat).length}</span></div>
          <ul class="group produtos">${itens}</ul>`;
      })
      .join('');
  }

  /* Folha de cadastro */
  const sheet = $('sheet');
  const form = sheet;

  function abrirFolha(id) {
    const p = id ? dados.produtos.find((x) => x.id === id) : null;
    form.reset();
    form.elements.id.value = p ? p.id : '';
    if (p) {
      for (const k of ['nome', 'sku', 'categoria', 'custo', 'embalagem', 'frete', 'outros', 'comissaoPct']) {
        form.elements[k].value = p[k] ?? '';
      }
    }
    $('sheet-titulo').textContent = p ? 'Editar produto' : 'Novo produto';
    $('sheet-excluir').hidden = !p;
    $('backdrop').hidden = false;
    sheet.hidden = false;
    setTimeout(() => form.elements.nome.focus(), 260);
  }

  function fecharFolha() {
    sheet.hidden = true;
    $('backdrop').hidden = true;
  }

  function lerFolha() {
    const e = form.elements;
    return {
      id: e.id.value || uid(),
      nome: e.nome.value.trim(),
      sku: e.sku.value.trim(),
      categoria: e.categoria.value.trim(),
      custo: num(e.custo.value),
      embalagem: num(e.embalagem.value),
      frete: num(e.frete.value),
      outros: num(e.outros.value),
      comissaoPct: e.comissaoPct.value === '' ? '' : num(e.comissaoPct.value),
    };
  }

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const p = lerFolha();
    if (!p.nome) {
      toast('Informe o nome do produto.');
      form.elements.nome.focus();
      return;
    }
    const idx = dados.produtos.findIndex((x) => x.id === p.id);
    if (idx >= 0) {
      p.precoAtual = dados.produtos[idx].precoAtual;
      dados.produtos[idx] = p;
    } else {
      dados.produtos.push(p);
    }
    salvar();
    fecharFolha();
    renderTudo();
    toast(idx >= 0 ? 'Produto atualizado' : 'Produto cadastrado');
  });

  $('sheet-cancelar').addEventListener('click', fecharFolha);
  $('backdrop').addEventListener('click', fecharFolha);
  $('sheet-excluir').addEventListener('click', () => {
    const id = form.elements.id.value;
    const p = dados.produtos.find((x) => x.id === id);
    if (!p || !confirm(`Excluir "${p.nome}"?`)) return;
    dados.produtos = dados.produtos.filter((x) => x.id !== id);
    if (ui.sel === id) ui.sel = null;
    salvar();
    fecharFolha();
    renderTudo();
    toast('Produto excluído');
  });

  $('lista-produtos').addEventListener('click', (ev) => {
    const li = ev.target.closest('li[data-id]');
    if (li) abrirFolha(li.dataset.id);
  });

  $('btn-novo').addEventListener('click', () => abrirFolha(null));
  $('busca').addEventListener('input', renderProdutos);

  /* ---------- Importação e backup ---------- */
  const normChave = (k) =>
    String(k).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');

  const MAPA = { nome: 'nome', sku: 'sku', categoria: 'categoria', custo: 'custo', embalagem: 'embalagem', outros: 'outros', frete: 'frete', comissao: 'comissaoPct', comissaopct: 'comissaoPct' };

  function numImport(v) {
    let s = String(v ?? '').trim().replace(/[R$\s]/g, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const x = Number(s);
    return Number.isFinite(x) ? x : 0;
  }

  function normalizarRegistro(obj) {
    const p = { nome: '', sku: '', categoria: '', custo: 0, embalagem: 0, frete: 0, outros: 0, comissaoPct: '' };
    for (const [k, v] of Object.entries(obj)) {
      const campo = MAPA[normChave(k)];
      if (!campo) continue;
      if (campo === 'nome' || campo === 'sku' || campo === 'categoria') p[campo] = String(v ?? '').trim();
      else if (campo === 'comissaoPct') p[campo] = String(v ?? '').trim() === '' ? '' : numImport(v);
      else p[campo] = numImport(v);
    }
    return p;
  }

  function lerCSV(texto) {
    const linhas = texto.split(/\r?\n/).filter((l) => l.trim());
    if (linhas.length < 2) return [];
    const sep = linhas[0].includes(';') ? ';' : ',';
    const cab = linhas[0].split(sep).map((c) => c.replace(/^"|"$/g, ''));
    return linhas.slice(1).map((l) => {
      const cols = l.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
      const obj = {};
      cab.forEach((c, i) => (obj[c] = cols[i]));
      return obj;
    });
  }

  function importarTexto(texto, nomeArquivo) {
    let registros;
    const trecho = texto.trimStart();
    if (/\.json$/i.test(nomeArquivo) || trecho.startsWith('[') || trecho.startsWith('{')) {
      const j = JSON.parse(texto);
      if (j && Array.isArray(j.produtos)) registros = j.produtos;
      else if (Array.isArray(j)) registros = j;
      else throw new Error('formato');
      if (j && j.ajustes && typeof j.ajustes === 'object') {
        dados.ajustes = { ...AJUSTES_PADRAO, ...j.ajustes };
      }
    } else {
      registros = lerCSV(texto);
    }

    let criados = 0;
    let atualizados = 0;
    for (const reg of registros) {
      const p = normalizarRegistro(reg);
      if (!p.nome) continue;
      const existente = dados.produtos.find(
        (x) => (p.sku && x.sku && x.sku.toLowerCase() === String(p.sku).toLowerCase()) || x.nome.toLowerCase() === p.nome.toLowerCase()
      );
      if (existente) {
        Object.assign(existente, p);
        atualizados++;
      } else {
        dados.produtos.push({ ...p, id: uid() });
        criados++;
      }
    }
    return { criados, atualizados };
  }

  $('btn-importar').addEventListener('click', () => $('arquivo').click());
  $('arquivo').addEventListener('change', async (ev) => {
    const arq = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!arq) return;
    try {
      const texto = await arq.text();
      const { criados, atualizados } = importarTexto(texto, arq.name);
      salvar();
      renderTudo();
      toast(`Importação: ${criados} novos, ${atualizados} atualizados`);
    } catch (_) {
      toast('Não consegui ler o arquivo. Use CSV ou o backup JSON.');
    }
  });

  $('btn-exportar').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'precificacao-backup.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Backup gerado');
  });

  /* ---------- Precificar: eventos ---------- */
  $('sel-produto').addEventListener('change', (ev) => {
    ui.sel = ev.target.value;
    renderPrecificar();
  });
  document.querySelectorAll('.segmented button').forEach((b) =>
    b.addEventListener('click', () => {
      ui.modo = b.dataset.modo;
      renderPrecificar();
    })
  );
  $('busca-calc').addEventListener('input', renderPrecificar);
  ['p-margem', 'p-preco', 'p-cupomPct', 'p-cupomValor', 'p-ads'].forEach((id) => $(id).addEventListener('input', renderPrecificar));
  $('btn-usar').addEventListener('click', () => {
    const res = calcularPrecificacao();
    if (!res || res.erro) return;
    res.prod.precoAtual = res.preco;
    dados.historico.unshift({
      id: uid(),
      nome: res.prod.nome,
      preco: res.preco,
      margemPct: res.f.incluiAds ? res.r.margemDepoisPct : res.r.margemAntesPct,
      modo: ui.modo,
      criadoEm: Date.now(),
    });
    dados.historico = dados.historico.slice(0, 200);
    salvar();
    toast(`Preço ${brl(res.preco)} salvo em ${res.prod.nome}`);
    renderTudo();
  });

  /* ---------- Ajustes ---------- */
  document.querySelectorAll('[data-aj]').forEach((el) => {
    el.value = dados.ajustes[el.dataset.aj] ?? '';
    el.addEventListener('input', () => {
      dados.ajustes[el.dataset.aj] = el.value;
      salvar();
      renderPrecificar();
      renderProdutos();
    });
  });

  $('btn-apagar').addEventListener('click', () => {
    if (!confirm('Apagar todos os produtos e ajustes deste navegador? Faça um backup antes.')) return;
    dados = { produtos: [], ajustes: { ...AJUSTES_PADRAO }, historico: [] };
    ui.sel = null;
    salvar();
    document.querySelectorAll('[data-aj]').forEach((el) => (el.value = dados.ajustes[el.dataset.aj] ?? ''));
    renderTudo();
    toast('Dados apagados');
  });

  /* ---------- Navegação e avisos ---------- */
  function irPara(nome) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('is-active', s.dataset.screen === nome));
    document.querySelectorAll('.tab').forEach((t) => {
      const on = t.dataset.tab === nome;
      t.classList.toggle('is-active', on);
      if (on) t.setAttribute('aria-current', 'page');
      else t.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
  }

  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => irPara(t.dataset.tab)));
  document.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => irPara(b.dataset.ir)));

  let toastTimer;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function renderHistorico() {
    const lista = dados.historico;
    $('qtd-historico').textContent = `${lista.length} ${lista.length === 1 ? 'registro' : 'registros'}`;
    const alvo = $('lista-historico');
    if (!lista.length) {
      alvo.innerHTML = '<div class="card empty-line">Nenhum preço usado ainda. Ao tocar em "Usar no produto", o registro aparece aqui.</div>';
      return;
    }
    const hoje = new Date().toDateString();
    const ontem = new Date(Date.now() - 864e5).toDateString();
    const titulo = (ts) => {
      const d = new Date(ts);
      if (d.toDateString() === hoje) return 'Hoje';
      if (d.toDateString() === ontem) return 'Ontem';
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    };
    const grupos = new Map();
    for (const h of lista) {
      const t = titulo(h.criadoEm);
      if (!grupos.has(t)) grupos.set(t, []);
      grupos.get(t).push(h);
    }
    alvo.innerHTML = [...grupos.entries()]
      .map(([t, itens]) => `<div class="day-title">${esc(t)}</div><ul class="group hist">${itens
        .map((h) => {
          const hora = new Date(h.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const st = h.margemPct < (Number(dados.ajustes.margemMinPct) || 20) / 100 ? 'bad' : 'ok';
          return `<li><div class="info"><strong>${esc(h.nome)}</strong><span>${hora} · ${h.modo === 'margem' ? 'por margem' : 'por preço'}</span></div>
            <div class="side"><strong>${brl(h.preco)}</strong><span class="chip ${st}">${pctFmt(h.margemPct)}</span></div></li>`;
        })
        .join('')}</ul>`)
      .join('');
  }

  $('btn-limpar-historico').addEventListener('click', () => {
    if (!dados.historico.length || !confirm('Apagar todo o histórico de preços?')) return;
    dados.historico = [];
    salvar();
    renderHistorico();
    toast('Histórico apagado');
  });

  function renderTudo() {
    renderPrecificar();
    renderProdutos();
    renderHistorico();
  }

  renderTudo();
})();
