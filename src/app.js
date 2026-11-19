(function () {
  const { calcular, precoMinimo, precoComTerminacao } = window.Calc;

  const KEY = 'calc-ml-produtos-v1';
  const ESCALA_MAX = 0.4; // barra de 0% a 40% de margem
  const form = document.getElementById('form');
  const $ = (id) => document.getElementById(id);

  const brl = (v) => (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const pctFmt = (v) => (Number.isFinite(v) ? v * 100 : 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';

  function lerForm() {
    const dados = {};
    for (const el of form.elements) {
      if (el.name) dados[el.name] = el.value;
    }
    return dados;
  }

  function preencherForm(dados) {
    for (const el of form.elements) {
      if (el.name) el.value = dados[el.name] ?? (el.name === 'margemMinPct' ? '20' : '');
    }
  }

  function montarCascata(r) {
    const linhas = [
      { label: 'Valor cobrado do comprador', v: r.valor, tipo: 'total' },
      { label: 'Comissão Mercado Livre', v: -r.comissao, tipo: 'neg' },
      { label: 'Programa de afiliados', v: -r.afiliado, tipo: 'neg' },
      { label: 'Imposto', v: -r.imposto, tipo: 'neg' },
      { label: 'Taxa fixa', v: -r.taxaFixa, tipo: 'neg' },
      { label: 'Frete', v: -r.frete, tipo: 'neg' },
      { label: 'Custo do produto', v: -r.custo, tipo: 'neg' },
      { label: 'Embalagem', v: -r.embalagem, tipo: 'neg' },
      { label: 'Outros custos', v: -r.outros, tipo: 'neg' },
      { label: 'Margem antes de ADS', v: r.margemAntes, tipo: 'total pos' },
      { label: 'ADS', v: -r.ads, tipo: 'ads' },
      { label: 'Margem depois de ADS', v: r.margemDepois, tipo: 'total pos' },
    ];
    const base = Math.max(r.valor, 1);
    $('cascata').innerHTML = linhas
      .filter((l) => !(l.v === 0 && l.tipo === 'neg'))
      .map((l) => {
        const largura = Math.min(Math.abs(l.v) / base, 1) * 100;
        const sinal = l.v < 0 ? '−' : '';
        return `<li>
          <div class="wf-row ${l.tipo.split(' ')[0]} ${l.tipo.includes('pos') ? 'pos' : ''}">
            <span>${l.label}</span>
            <span>${sinal}${brl(Math.abs(l.v))}</span>
          </div>
          <div class="wf-bar"><i style="width:${largura.toFixed(1)}%"></i></div>
        </li>`;
      })
      .join('');
  }

  function status(r) {
    const p = r.margemDepoisPct;
    if (r.valor <= 0) return { cls: '', txt: 'Preencha os dados' };
    if (r.margemDepois < 0) return { cls: 'bad', txt: 'Prejuízo por venda' };
    if (p < r.margemMin) return { cls: 'bad', txt: 'Abaixo da meta' };
    if (p < r.margemMin + 0.05) return { cls: 'warn', txt: 'Perto da meta' };
    return { cls: 'ok', txt: 'Dentro da meta' };
  }

  function render() {
    const dados = lerForm();
    const r = calcular(dados);
    const st = status(r);

    $('margem-depois-pct').textContent = pctFmt(r.margemDepoisPct);
    $('margem-depois-rs').textContent = brl(r.margemDepois);
    $('margem-antes-pct').textContent = pctFmt(r.margemAntesPct);
    $('margem-antes-rs').textContent = brl(r.margemAntes);
    $('ads-rs').textContent = brl(r.ads);
    $('ads-pct').textContent = (r.valor > 0 ? pctFmt(r.ads / r.valor) : '0%') + ' do valor cobrado';

    const pill = $('status');
    pill.textContent = st.txt;
    pill.className = 'pill' + (st.cls ? ' ' + st.cls : '');

    const fill = $('meter-fill');
    fill.style.width = Math.max(0, Math.min(r.margemDepoisPct / ESCALA_MAX, 1)) * 100 + '%';
    fill.style.background = st.cls === 'bad' ? 'var(--bad)' : st.cls === 'warn' ? 'var(--warn)' : st.cls === 'ok' ? 'var(--ok)' : 'var(--accent)';
    $('meter-goal').style.left = Math.min(r.margemMin / ESCALA_MAX, 1) * 100 + '%';

    const alertas = [];
    if (!dados.comissaoPct) alertas.push('Preencha a comissão da sua categoria para um cálculo confiável.');
    if (r.valor > 0 && r.margemDepois < 0) alertas.push('Cada venda dá prejuízo com essas taxas e ADS.');
    $('alerta').textContent = alertas.join(' ');

    // Sugestões de preço
    const pAds = precoMinimo(dados, { incluiAds: true });
    const pSem = precoMinimo(dados, { incluiAds: false });
    const pFinal = precoComTerminacao(pAds);
    $('sug-ads').textContent = pAds ? brl(pAds) : 'Meta impossível';
    $('sug-sem-ads').textContent = pSem ? brl(pSem) : 'Meta impossível';
    $('sug-final').textContent = pFinal ? brl(pFinal) : '-';
    if (pFinal) {
      const rf = calcular({ ...dados, preco: pFinal });
      $('sug-final-info').textContent = `Margem depois de ADS nesse preço: ${pctFmt(rf.margemDepoisPct)}`;
    } else {
      $('sug-final-info').textContent = 'Revise as taxas: a meta não fecha com esses percentuais.';
    }

    montarCascata(r);
  }

  // Produtos salvos (armazenamento local do navegador, com proteção)
  function lerSalvos() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch (_) {
      return [];
    }
  }

  function gravarSalvos(lista) {
    try {
      localStorage.setItem(KEY, JSON.stringify(lista));
    } catch (_) {
      /* navegador sem armazenamento: segue sem salvar */
    }
  }

  function renderSalvos() {
    const lista = lerSalvos();
    const ul = $('lista-salvos');
    if (!lista.length) {
      ul.innerHTML = '<li class="empty">Nenhum produto salvo ainda.</li>';
      return;
    }
    ul.innerHTML = lista
      .map((p, i) => {
        const r = calcular(p.dados);
        return `<li>
          <div class="info">
            <strong></strong>
            <span>${pctFmt(r.margemDepoisPct)} depois de ADS · ${brl(r.preco)}</span>
          </div>
          <div class="actions">
            <button type="button" data-acao="abrir" data-i="${i}">Abrir</button>
            <button type="button" class="danger" data-acao="excluir" data-i="${i}">Excluir</button>
          </div>
        </li>`;
      })
      .join('');
    ul.querySelectorAll('.info strong').forEach((el, i) => {
      el.textContent = lista[i].nome;
    });
  }

  $('btn-salvar').addEventListener('click', () => {
    const nome = $('nome-produto').value.trim() || 'Produto sem nome';
    const lista = lerSalvos();
    lista.unshift({ nome, dados: lerForm(), salvoEm: Date.now() });
    gravarSalvos(lista.slice(0, 50));
    $('nome-produto').value = '';
    renderSalvos();
  });

  $('lista-salvos').addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-acao]');
    if (!btn) return;
    const lista = lerSalvos();
    const item = lista[Number(btn.dataset.i)];
    if (btn.dataset.acao === 'abrir' && item) {
      preencherForm(item.dados);
      $('nome-produto').value = item.nome;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (btn.dataset.acao === 'excluir') {
      lista.splice(Number(btn.dataset.i), 1);
      gravarSalvos(lista);
      renderSalvos();
    }
  });

  $('btn-limpar').addEventListener('click', () => {
    preencherForm({});
    render();
  });

  form.addEventListener('input', render);

  preencherForm({});
  renderSalvos();
  render();
})();
