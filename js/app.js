/* Обвивка на приложението: състояние, навигация, свързване на контролите, страничен панел */
(function (E) {
  const state = E.state = { source: 'raw', cfg: { ...E.DEFAULT_CFG } };

  let cleanCache = null, rawAn = null;
  E.cleaned = () => {
    const key = JSON.stringify(state.cfg);
    if (!cleanCache || cleanCache.key !== key) cleanCache = { key, res: E.clean(E.RAW, state.cfg) };
    return cleanCache.res;
  };
  E.rawAnalysis = () => (rawAn = rawAn || E.analyze(E.RAW));
  E.current = () => {
    if (state.source === 'clean') { const c = E.cleaned(); return { rows: c.rows, columns: c.columns, clean: true, label: 'почистените данни' }; }
    return { rows: E.RAW, columns: E.COLUMNS.map(c => c.key), clean: false, label: 'суровите данни' };
  };

  E.label = k => { const c = E.COL[k]; return c ? c.label + (c.unit ? ` (${c.unit})` : '') : k; };

  /* ---------- Навигация ---------- */
  E.pages = {};
  E.page = (route, def) => { def.st = def.st || {}; E.pages[route] = def; };
  const NAV = [
    { group: null, items: [{ r: '', n: '', t: 'Начало' }] },
    {
      group: 'I. Предварителен анализ (EDA)', items: [
        { r: 'overview', n: '1.1', t: 'Преглед на данните' },
        { r: 'quality', n: '1.2', t: 'Качество на данните' },
        { r: 'descriptive', n: '1.3', t: 'Описателни статистики' },
        { r: 'distributions', n: '1.4', t: 'Разпределения' },
        { r: 'relations', n: '1.5', t: 'Взаимовръзки и класове' },
        { r: 'protocol', n: '1.6', t: 'Протокол на констатациите' }
      ]
    },
    {
      group: 'II. Подготовка на данните', items: [
        { r: 'cleaning', n: '2.1', t: 'Почистване' },
        { r: 'join', n: '2.2', t: 'Трансформации', head: true },
        { r: 'join', n: 'а', t: 'Обединяване', sub: true },
        { r: 'aggregate', n: 'б', t: 'Агрегиране', sub: true },
        { r: 'scaling', n: 'в', t: 'Мащабиране', sub: true },
        { r: 'power', n: 'г', t: 'Степенни трансформации', sub: true },
        { r: 'encoding', n: 'д', t: 'Кодиране', sub: true },
        { r: 'binning', n: 'е', t: 'Дискретизация', sub: true },
        { r: 'feature', n: 'ж', t: 'Нов признак', sub: true },
        { r: 'reduction', n: 'з', t: 'Редуциране на размерността', sub: true },
        { r: 'result', n: '2.3', t: 'Резултат' }
      ]
    }
  ];
  E.NAV = NAV;

  function renderNav(route) {
    const html = NAV.map(g => `<div class="nav-group">${g.group ? `<div class="nav-title">${g.group}</div>` : ''}<div class="nav">${g.items.map(it => {
      const active = !it.head && it.r === route;
      return `<a href="#/${it.r}" class="${it.sub ? 'sub' : ''} ${active ? 'active' : ''}"><span class="num">${it.n}</span><span>${it.t}</span></a>`;
    }).join('')}</div></div>`).join('');
    document.getElementById('sidebar').innerHTML = html + '<div class="footer" style="margin:24px 10px 0">Учебен набор от данни: 210 записа, 10 признака. Данните са генерирани и не се отнасят до реални хора.</div>';
  }

  let currentRoute = null;
  function render(resetScroll) {
    const route = location.hash.replace(/^#\/?/, '');
    const page = E.pages[route] || E.pages[''];
    const main = document.getElementById('main');
    const y = window.scrollY;
    renderNav(E.pages[route] ? route : '');
    const sw = document.getElementById('sourceSwitch');
    sw.hidden = !page.source;
    document.querySelectorAll('#sourceSeg button').forEach(b => b.classList.toggle('on', b.dataset.source === state.source));
    try {
      main.innerHTML = page.render(page.st) + '<div class="footer">EDA Лаборатория · учебно приложение по анализ на данни</div>';
      if (page.after) page.after(main, page.st);
    } catch (err) {
      console.error(err);
      main.innerHTML = `<div class="card note warn"><b>Грешка при показване на страницата.</b><br>${E.esc(err.message)}</div>`;
    }
    document.title = (page.title ? page.title + ' · ' : '') + 'EDA Лаборатория';
    if (resetScroll) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); } else window.scrollTo(0, y);
    currentRoute = route;
  }
  E.refresh = () => render(false);
  E.currentPage = () => E.pages[currentRoute] || E.pages[''];

  /* ---------- Свързване на контролите ---------- */
  function valueOf(el) {
    if (el.type === 'checkbox') return el.checked;
    if (el.dataset.type === 'num' || el.type === 'range' || el.type === 'number') return Number(el.value);
    return el.value;
  }
  function onChange(e) {
    const el = e.target;
    const page = E.currentPage();
    if (el.dataset.bind) { page.st[el.dataset.bind] = valueOf(el); E.refresh(); }
    else if (el.dataset.cfg) { state.cfg[el.dataset.cfg] = el.value; E.refresh(); }
  }
  function onInput(e) {
    const el = e.target;
    if (el.type === 'range' && el.dataset.bind) {
      const out = document.querySelector(`[data-out="${el.dataset.bind}"]`);
      if (out) out.textContent = el.value;
    }
  }
  function onClick(e) {
    const t = e.target.closest('[data-set],[data-act],[data-cfgset],[data-source]');
    if (!t) return;
    const page = E.currentPage();
    if (t.dataset.source) { state.source = t.dataset.source; E.refresh(); return; }
    if (t.dataset.set) { const v = t.dataset.value; page.st[t.dataset.set] = t.dataset.type === 'num' ? Number(v) : v; E.refresh(); return; }
    if (t.dataset.cfgset) { state.cfg[t.dataset.cfgset] = t.dataset.value; E.refresh(); return; }
    if (t.dataset.act && page.actions && page.actions[t.dataset.act]) page.actions[t.dataset.act](t, page.st, e);
  }

  /* ---------- Страничен панел ---------- */
  E.openDrawer = (title, html) => {
    document.getElementById('drawerTitle').textContent = title;
    document.getElementById('drawerBody').innerHTML = html;
    document.getElementById('drawerBody').scrollTop = 0;
    document.getElementById('drawer').classList.add('open');
    document.getElementById('drawer').setAttribute('aria-hidden', 'false');
    document.getElementById('backdrop').classList.add('open');
    document.body.classList.add('drawer-open');
  };
  E.closeDrawer = () => {
    document.getElementById('drawer').classList.remove('open');
    document.getElementById('drawer').setAttribute('aria-hidden', 'true');
    document.getElementById('backdrop').classList.remove('open');
    document.body.classList.remove('drawer-open');
    document.querySelectorAll('td.selected').forEach(td => td.classList.remove('selected'));
  };

  /* ---------- Помощни елементи ---------- */
  E.ui = {
    select(bind, options, value, label) {
      const opts = options.map(o => (typeof o === 'string' ? { v: o, l: o } : o));
      return `<label class="control">${label || ''}<select data-bind="${bind}">${opts.map(o => `<option value="${E.esc(o.v)}" ${String(o.v) === String(value) ? 'selected' : ''}>${E.esc(o.l)}</option>`).join('')}</select></label>`;
    },
    seg(bind, options, value, opts = {}) {
      return `<div class="seg">${options.map(o => `<button data-${opts.cfg ? 'cfgset' : 'set'}="${bind}" data-value="${E.esc(o.v)}" ${opts.num ? 'data-type="num"' : ''} class="${String(o.v) === String(value) ? 'on' : ''}">${E.esc(o.l)}</button>`).join('')}</div>`;
    },
    range(bind, min, max, step, value, label) {
      return `<label class="control">${label}: <span data-out="${bind}" class="counter">${value}</span><input type="range" data-bind="${bind}" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
    },
    check(bind, value, label) {
      return `<label class="check"><input type="checkbox" data-bind="${bind}" ${value ? 'checked' : ''}> ${label}</label>`;
    },
    numOptions: (keys = E.NUMERIC) => keys.map(k => ({ v: k, l: E.label(k) })),
    catOptions: (keys = E.CATEGORICAL) => keys.map(k => ({ v: k, l: E.COL[k].label })),
    stat(label, value, formula, hint, cls) {
      return `<div class="stat ${cls || ''}"><div class="label">${label}</div><div class="value">${value}</div>${formula ? `<div class="formula">${formula}</div>` : ''}${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
    },
    head(eyebrow, title, lead) {
      return `<div class="page-head"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}</div>`;
    },
    chart(title, svg) { return `<div class="chart-box">${title ? `<div class="chart-title">${title}</div>` : ''}${svg}</div>`; },
    table(headers, rows, opts = {}) {
      return `<div class="table-wrap"${opts.maxh ? ` style="max-height:${opts.maxh}px"` : ''}><table class="data ${opts.cls || ''}"><thead><tr>${headers.map(h => `<th class="${h.num ? 'num' : ''}">${h.l !== undefined ? h.l : h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td class="${headers[i] && headers[i].num ? 'num' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
  };

  // Блок с код на Python; коментарите (#) се оцветяват
  E.code = (py, title) => `<details class="code"><summary>${title || 'Код на Python (pandas)'}</summary><pre>${E.esc(py.trim()).split('\n').map(l => l.replace(/(^|\s)(#.*)$/, '$1<span class="c">$2</span>')).join('\n')}</pre></details>`;

  E.colorOfCat = (key, value) => {
    const vals = E.COL[key].values || [];
    const i = vals.indexOf(value);
    return i >= 0 ? E.PALETTE[i % E.PALETTE.length] : '#9aa1ad';
  };

  E.start = () => {
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);
    document.addEventListener('click', onClick);
    document.getElementById('drawerClose').addEventListener('click', E.closeDrawer);
    document.getElementById('backdrop').addEventListener('click', E.closeDrawer);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') E.closeDrawer(); });
    document.getElementById('menuBtn').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
    document.getElementById('sidebar').addEventListener('click', e => { if (e.target.closest('a')) document.getElementById('sidebar').classList.remove('open'); });
    window.addEventListener('hashchange', () => { E.closeDrawer(); render(true); });
    render(true);
  };
})(window.EDA);
