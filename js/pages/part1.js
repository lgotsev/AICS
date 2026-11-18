/* Част I. Предварителен анализ на данните (Exploratory Data Analysis) */
(function (E) {
  const S = E.S, ui = E.ui, f = E.fmt;
  const ISS = () => E.ISSUE;

  // Методи за решаване по вид проблем (кратко, за страничния панел)
  const METHODS = {
    missing: ['Премахване на записа (listwise deletion), ако липсите са малко и случайни', 'Запълване (imputation) със средно аритметично, медиана или мода', 'Запълване по групи, например медиана на височината според пола', 'Запълване по K най-близки съседи (KNN imputation)', 'За категорийни признаци: отделна категория „Неизвестно“'],
    error: ['Корекция по речника на допустимите стойности', 'Търсене на най-сходната допустима стойност по разстоянието на Левенщайн (fuzzy matching) за правописни грешки', 'Превръщане в липсваща стойност (NaN) и последващо запълване', 'Премахване на записа, ако не може да се коригира'],
    format: ['Уеднаквяване на формата: премахване на интервали, единен регистър', 'Съпоставяне със синоними и речник на кодовете', 'Транслитерация, ако е използвана латиница'],
    outlier: ['Първо проверка: грешка ли е или реален, но рядък случай', 'Ограничаване до граници (capping, winsorization)', 'Логаритмична трансформация при скосени признаци', 'Премахване на записа, ако е сигурно, че е некоректен', 'Използване на робастни мерки: медиана и IQR вместо средно и стандартно отклонение'],
    duplicate: ['Премахване на повторенията с drop_duplicates(), като се запазва първото срещане', 'Проверка по съдържание, без ID: един човек може да е въведен с два различни номера'],
    irrelevant: ['Премахване на признака преди моделиране', 'ID се запазва само като индекс за идентификация на записа']
  };

  const issueBox = (iss) => {
    const meta = ISS()[iss.type];
    return `<div class="issue-box" style="border-left-color:${meta.color}"><h4 style="color:${meta.color}">${meta.label}${iss.sub ? ' · ' + E.esc(iss.sub) : ''}</h4><p class="small" style="margin:0 0 6px">${E.esc(iss.msg)}</p>${iss.fix !== undefined && iss.fix !== null ? `<p class="small" style="margin:0 0 6px">Предложена корекция: <b>${E.esc(E.cellText(iss.fix))}</b></p>` : ''}<div class="small muted"><b>Методи за решаване:</b></div><ul class="method-list">${METHODS[iss.type].map(m => `<li>${m}</li>`).join('')}</ul><a class="small" href="#/cleaning">→ Към „2.1 Почистване“</a></div>`;
  };

  function encodingInfo(k, v) {
    const col = E.COL[k];
    const valid = col.values.includes(v);
    let s = '<h4 style="margin-top:16px">Кодиране на категорийния признак</h4>';
    if (!valid) s += '<div class="note warn small">Стойността не е в речника. Ако се кодира без корекция, ще се появи отделна, фалшива категория. Първо се коригира.</div>';
    if (col.type === 'ordinal') {
      s += `<p class="small">Признакът е <b>порядков</b>: категориите имат естествен ред. Подходящо е <b>порядково кодиране (ordinal encoding)</b>, което запазва реда:</p><div class="enc">${col.values.map((c, i) => `${c === v ? '<b>' : ''}${E.esc(c)} → ${i}${c === v ? ' ◀' : ''}${c === v ? '</b>' : ''}`).join('<br>')}</div>`;
      s += `<p class="small">Алтернатива е <b>one-hot кодиране</b>, когато не искаме моделът да приема, че разстоянията между степените са равни.</p>`;
    } else {
      const sorted = [...col.values].sort((a, b) => a.localeCompare(b, 'bg'));
      s += `<p class="small"><b>1. Етикетно кодиране (label encoding)</b> присвоява цяло число на всяка категория (подредени по азбучен ред, както в scikit-learn):</p><div class="enc">${sorted.map((c, i) => `${c === v ? '<b>' : ''}${E.esc(c)} → ${i}${c === v ? ' ◀' : ''}${c === v ? '</b>' : ''}`).join('<br>')}</div>`;
      if (sorted.length > 2) s += '<div class="note small">Внимание: признакът е номинален. Етикетното кодиране внушава ред и разстояние между категориите, каквито няма. Подходящо е главно за дървовидни модели.</div>';
      const names = sorted.map(c => `${col.label}_${c}`);
      s += `<p class="small"><b>2. One-hot кодиране (фиктивни променливи, dummy variables)</b> създава по една двоична колона за всяка категория (pandas ги подрежда по азбучен ред):</p><div class="enc">${names.map(E.esc).join(' | ')}<br>${sorted.map(c => (c === v ? '<b>1</b>' : '0')).join(' | ')}</div>`;
      if (col.values.length === 2) s += '<p class="small muted">При две категории е достатъчна една колона (drop_first=True): например Пол_М = 1 за мъж и 0 за жена.</p>';
    }
    return s;
  }

  /* ================= 1.1 Преглед на данните ================= */
  E.page('overview', {
    title: 'Преглед на данните', source: false,
    st: { mode: 'student', view: 'teaching', pg: 0, found: new Set() },
    render(st) {
      const a = E.rawAnalysis();
      const rows = E.RAW;
      const cols = E.COLUMNS;
      // Общ брой проблеми в учебната извадка
      const T = E.TEACHING_COUNT;
      const targets = new Set();
      Object.keys(a.cells).forEach(key => { const [i, k] = key.split('|'); if (+i < T) targets.add(`c:${i}:${k}`); });
      Object.keys(a.rowIssues).forEach(i => { if (+i < T) targets.add(`d:${i}`); });
      Object.keys(a.colIssues).forEach(k => targets.add(`k:${k}`));
      const found = [...targets].filter(t => st.found.has(t)).length;
      const teacher = st.mode === 'teacher';
      const show = t => teacher || st.found.has(t);

      const per = 25;
      const start = st.view === 'teaching' ? 0 : st.pg * per;
      const end = st.view === 'teaching' ? T : Math.min(rows.length, start + per);
      const pages = Math.ceil(rows.length / per);

      const head = `<tr><th class="rownum">#</th>${cols.map(c => {
        const ci = a.colIssues[c.key];
        const cls = ci && show(`k:${c.key}`) ? 'iss-irrelevant' : '';
        return `<th class="colhead ${cls}" data-act="col" data-c="${c.key}" title="Профил на признака">${c.label}${c.unit ? `<br><span style="font-weight:400;font-size:.78em;opacity:.8">${c.unit}</span>` : ''}</th>`;
      }).join('')}</tr>`;
      let body = '';
      for (let i = start; i < end; i++) {
        const row = rows[i];
        const dup = a.rowIssues[i];
        body += `<tr><td class="rownum">${row._row}</td>`;
        cols.forEach(c => {
          const v = row[c.key];
          const iss = a.cells[i + '|' + c.key];
          let cls = 'cell';
          if (v === null || v === undefined) cls += ' null';
          if (iss && show(`c:${i}:${c.key}`)) cls += ' iss-' + iss[0].type;
          else if (dup && show(`d:${i}`)) cls += ' iss-duplicate';
          else if (a.colIssues[c.key] && show(`k:${c.key}`)) cls += ' iss-irrelevant';
          const num = typeof v === 'number';
          body += `<td class="${cls}${num ? ' num' : ''}" data-act="cell" data-r="${i}" data-c="${c.key}">${E.esc(E.cellText(v))}</td>`;
        });
        body += '</tr>';
      }

      const legend = Object.entries(ISS()).filter(([k]) => k !== 'format').map(([, m]) => `<span><i class="pill-dot" style="background:${m.color}"></i>${m.group}</span>`).join('');
      const numCount = cols.filter(c => c.type === 'int' || c.type === 'float').length;

      return `
      ${ui.head('Част I · 1.1', 'Преглед на данните', 'Първата стъпка е да разберем какво съдържат данните: колко са записите, какви са признаците и от какъв тип. Тук суровите данни се разглеждат клетка по клетка.')}
      <div class="grid-5">
        ${ui.stat('Записи (редове)', rows.length)}
        ${ui.stat('Признаци (колони)', cols.length)}
        ${ui.stat('Количествени', numCount, '', 'цели и реални числа')}
        ${ui.stat('Категорийни', cols.filter(c => c.values).length, '', 'номинални и порядкови')}
        ${ui.stat('Идентификатори', cols.filter(c => c.type === 'id').length, '', '', 'gold')}
      </div>
      <div class="card" style="margin-top:20px">
        <h2>Речник на данните</h2>
        <p class="muted small">Речникът описва всеки признак и допустимите му стойности. По него по-късно се откриват грешките.</p>
        ${ui.table(['Признак', 'Тип на променливата', 'Мерна единица', 'Допустими стойности', 'Описание'], cols.map(c => [`<b>${c.label}</b>`, E.TYPE_LABEL[c.type], c.unit || '—', E.esc(c.allowed), c.desc]))}
      </div>
      <div class="card">
        <div class="row" style="justify-content:space-between">
          <h2 style="margin:0">Таблица с данни</h2>
          <div class="row">
            ${ui.seg('mode', [{ v: 'student', l: 'Режим „Студент“' }, { v: 'teacher', l: 'Режим „Преподавател“' }], st.mode)}
            ${ui.seg('view', [{ v: 'teaching', l: `Учебна извадка (${T})` }, { v: 'all', l: `Всички записи (${rows.length})` }], st.view)}
          </div>
        </div>
        <p class="small muted" style="margin-top:10px">${teacher ? 'Всички проблеми са оцветени.' : 'Клетките не са оцветени. Кликнете върху клетка, за да проверите дали в нея има проблем. Кликнете върху заглавие на колона за профил на признака.'}</p>
        ${!teacher && st.view === 'teaching' ? `<div class="row" style="margin:6px 0 4px"><span>Открити:</span> <span class="counter">${found} от ${targets.size}</span><div class="progress"><div style="width:${(100 * found) / targets.size}%"></div></div>${found ? '<button class="btn ghost" data-act="reset">Започни отначало</button>' : ''}${found === targets.size ? '<span class="badge gold">Всички проблеми са открити!</span>' : ''}</div>` : ''}
        <div class="legend-row">${legend}</div>
        <div class="table-wrap"><table class="data discover">${'<thead>' + head + '</thead>'}<tbody>${body}</tbody></table></div>
        ${st.view === 'all' ? `<div class="row" style="margin-top:12px"><button class="btn ghost" data-act="prev" ${st.pg === 0 ? 'disabled' : ''}>← Предишни</button><span class="muted small">Редове ${start + 1}–${end} от ${rows.length} · страница ${st.pg + 1} от ${pages}</span><button class="btn ghost" data-act="next" ${st.pg >= pages - 1 ? 'disabled' : ''}>Следващи →</button></div>` : ''}
        <div class="note navy small">Подсказка за студентите: проверете за празни клетки, стойности извън речника, невъзможни стойности, повторени редове, необичайно големи или малки числа и колони, които не носят информация.</div>
      </div>`;
    },
    actions: {
      reset(el, st) { st.found = new Set(); E.refresh(); },
      prev(el, st) { st.pg = Math.max(0, st.pg - 1); E.refresh(); },
      next(el, st) { st.pg += 1; E.refresh(); },
      cell(el, st) {
        const i = +el.dataset.r, k = el.dataset.c;
        const a = E.rawAnalysis();
        const row = E.RAW[i], col = E.COL[k], v = row[k];
        const iss = a.cells[i + '|' + k] || [];
        const dup = a.rowIssues[i];
        iss.forEach(() => st.found.add(`c:${i}:${k}`));
        if (dup) st.found.add(`d:${i}`);
        if (a.colIssues[k]) st.found.add(`k:${k}`);
        let html = `<dl class="kv"><dt>Признак</dt><dd><b>${col.label}</b></dd><dt>Тип</dt><dd>${E.TYPE_LABEL[col.type]}</dd>${col.unit ? `<dt>Мерна единица</dt><dd>${col.unit}</dd>` : ''}<dt>Стойност</dt><dd><code>${E.esc(E.cellText(v))}</code></dd><dt>Ред / ID</dt><dd>${row._row} / ${E.esc(row.id)}</dd><dt>Допустими</dt><dd>${E.esc(col.allowed)}</dd></dl>`;
        if (!iss.length && !dup && !a.colIssues[k]) html += '<div class="note navy small">В тази клетка не е открит проблем.</div>';
        iss.forEach(x => { html += issueBox(x); });
        if (dup) html += issueBox(dup);
        if (a.colIssues[k]) html += issueBox(a.colIssues[k]);
        if ((col.type === 'int' || col.type === 'float') && S.isNum(v) && a.fences[k]) {
          const fc = a.fences[k];
          const valid = S.nums(E.RAW.map((r, j) => ((a.cells[j + '|' + k] || []).some(x => x.type === 'error') ? null : r[k])));
          html += `<h4 style="margin-top:16px">Позиция спрямо останалите стойности</h4>${E.chart.position({ value: v, fences: fc, median: S.median(valid), min: Math.min(...valid), max: Math.max(...valid), color: iss.length ? ISS()[iss[0].type].color : E.C.navy })}
          <p class="small muted">Тъмната кутия е между Q1 и Q3, линията в нея е медианата, светлата ивица са границите по правилото на IQR (Q1 − 1,5·IQR; Q3 + 1,5·IQR).<br>z-оценка: <b>${f((v - fc.mean) / fc.sd, 2)}</b> (колко стандартни отклонения е стойността от средното).</p>`;
        }
        if (col.values && k !== 'country') html += encodingInfo(k, v);
        E.openDrawer(`Клетка: ${col.label}, ред ${row._row}`, html);
        E.refresh();
        const td = document.querySelector(`td[data-r="${i}"][data-c="${k}"]`);
        if (td) td.classList.add('selected');
      },
      col(el, st) {
        const k = el.dataset.c, col = E.COL[k], a = E.rawAnalysis();
        if (a.colIssues[k]) st.found.add(`k:${k}`);
        const vals = E.RAW.map(r => r[k]);
        const pc = a.perCol[k];
        let html = `<dl class="kv"><dt>Описание</dt><dd>${col.desc}</dd><dt>Тип</dt><dd>${E.TYPE_LABEL[col.type]}</dd><dt>Допустими</dt><dd>${E.esc(col.allowed)}</dd><dt>Брой стойности</dt><dd>${vals.length - pc.missing} от ${vals.length}</dd><dt>Липсващи</dt><dd>${pc.missing} (${E.pct(pc.missing / vals.length)})</dd><dt>Уникални</dt><dd>${pc.unique}</dd><dt>Грешки</dt><dd>${pc.error + pc.format}</dd>${col.values ? '' : `<dt>Екстремни</dt><dd>${pc.outlier}</dd>`}</dl>`;
        if (a.colIssues[k]) html += issueBox(a.colIssues[k]);
        if (col.type === 'int' || col.type === 'float') {
          const d = S.describe(vals);
          html += `<h4>Описателни статистики (сурови данни, включително грешките)</h4>${ui.table(['Мярка', { l: 'Стойност', num: true }], [['Средно', f(d.mean)], ['Медиана', f(d.median)], ['Стандартно отклонение', f(d.std)], ['Минимум', f(d.min)], ['Максимум', f(d.max)], ['Скосеност', f(d.skew, 2)], ['Ексцес', f(d.kurt, 2)]], { cls: 'compact' })}`;
          html += `<div style="margin-top:10px">${E.chart.histogram({ values: vals, w: 440, h: 240, xLabel: E.label(k), legend: false })}</div>`;
        } else if (col.values) {
          const m = new Map();
          vals.forEach(v => { const key = v === null ? 'NULL' : v; m.set(key, (m.get(key) || 0) + 1); });
          const items = [...m.entries()].sort((x, y) => y[1] - x[1]);
          html += `<h4>Честоти на стойностите</h4>${ui.table(['Стойност', { l: 'Брой', num: true }, 'В речника?'], items.map(([v, c]) => [`<code>${E.esc(E.cellText(v === 'NULL' ? null : v))}</code>`, c, v === 'NULL' ? 'липсва' : col.values.includes(v) ? '✓' : '<b style="color:var(--c-error)">✗</b>']), { cls: 'compact' })}`;
        } else if (col.type === 'id') {
          html += `<p class="small">Уникални ID: ${pc.unique} при ${vals.length} записа. Разликата се дължи на точните дубликати.</p>`;
        }
        E.openDrawer(`Признак: ${col.label}`, html);
        E.refresh();
      }
    }
  });

  /* ================= 1.2 Качество на данните ================= */
  E.page('quality', {
    title: 'Качество на данните', source: true,
    render() {
      const cur = E.current();
      const a = E.analyze(cur.rows, cur.columns);
      const n = cur.rows.length;
      const cols = cur.columns;
      const I = ISS();
      const cellList = type => Object.entries(a.cells).flatMap(([key, arr]) => arr.filter(x => (Array.isArray(type) ? type.includes(x.type) : x.type === type)).map(x => ({ i: +key.split('|')[0], k: key.split('|')[1], x })));
      const errs = cellList(['error', 'format']), outs = cellList('outlier');
      const dups = Object.entries(a.rowIssues);
      const tot = a.totals;
      const statIss = (meta, value, sub) => `<div class="stat issue" style="border-top-color:${meta.color}"><div class="label">${meta.group}</div><div class="value" style="color:${meta.color}">${value}</div><div class="formula">${sub}</div></div>`;
      const colRows = cols.map(k => {
        const pc = a.perCol[k], c = E.COL[k];
        const bar = `<div style="background:var(--navy-soft);border-radius:4px;height:8px;width:120px"><div style="background:${I.missing.color};height:8px;border-radius:4px;width:${(120 * pc.missing) / n}px"></div></div>`;
        return [`<b>${c.label}</b>`, `<span class="small">${E.TYPE_LABEL[c.type].split(' (')[0]}</span>`, pc.missing, E.pct(pc.missing / n), bar, pc.error + pc.format, c.values ? '—' : pc.outlier, pc.unique, a.colIssues[k] ? `<span class="badge">${a.colIssues[k].sub}</span>` : ''];
      });
      return `
      ${ui.head('Част I · 1.2', 'Качество на данните', `Систематичен преглед на всички признаци за петте вида проблеми. Изчисленията са върху ${cur.label} (${n} записа).`)}
      ${cur.clean ? '<div class="note navy">Показани са почистените данни. Сравнете с „Сурови“, за да видите какво е решено и какво остава.</div>' : ''}
      <div class="grid-5">
        ${statIss(I.missing, tot.missing, `${E.pct(tot.missing / (n * cols.length))} от всички клетки`)}
        ${statIss(I.error, tot.errors, 'грешни стойности и формат')}
        ${statIss(I.duplicate, tot.duplicates, 'повторени записа')}
        ${statIss(I.outlier, tot.outliers, 'по правилото на IQR')}
        ${statIss(I.irrelevant, tot.irrelevant, 'ID и константи')}
      </div>
      <div class="card" style="margin-top:20px">
        <h2>Профил по признаци</h2>
        ${ui.table(['Признак', 'Тип', { l: 'Липсващи', num: true }, { l: '%', num: true }, '', { l: 'Грешки', num: true }, { l: 'Екстремни', num: true }, { l: 'Уникални', num: true }, 'Бележка'], colRows)}
        ${E.code(`df.info()                      # типове и брой непразни стойности
df.isna().sum()                # липсващи по признак
df.isna().mean() * 100         # дял на липсващите в %
df.nunique()                   # брой уникални стойности
df.duplicated().sum()          # точни дубликати
df.drop(columns="id").duplicated().sum()   # дубликати по съдържание`)}
      </div>
      <div class="grid-2">
        <div class="card"><h3>Дял на липсващите стойности</h3>${E.chart.bar({ labels: cols.map(k => E.COL[k].label), values: cols.map(k => a.perCol[k].missing / n), color: I.missing.color, rotate: true, h: 300, yFmt: v => E.fmt(v * 100, 1) + '%', valueFmt: v => (v ? E.fmt(v * 100, 1) + '%' : '') })}</div>
        <div class="card"><h3>Карта на липсващите стойности</h3><p class="small muted">Всяка червена черта е празна клетка. Ако чертите се групират в едни и същи редове, липсите вероятно не са случайни.</p>${E.chart.missingMap({ rows: cur.rows, cols: cols.filter(k => k !== 'id') })}</div>
      </div>
      <div class="card">
        <h3>Грешки в данните (${errs.length})</h3>
        <p class="small muted">Открити по речника на данните: стойности извън допустимите, грешен формат, грешна мерна единица, логически несъответствия между признаци.</p>
        ${errs.length ? ui.table(['Ред', 'Признак', 'Стойност', 'Вид', 'Предложена корекция'], errs.map(e => [cur.rows[e.i]._row, E.COL[e.k].label, `<code>${E.esc(E.cellText(cur.rows[e.i][e.k]))}</code>`, e.x.sub, e.x.fix !== undefined && e.x.fix !== null ? `<code>${E.esc(E.cellText(e.x.fix))}</code>` : '<span class="muted">няма → NaN</span>']), { maxh: 340 }) : '<p class="muted">Няма грешки.</p>'}
      </div>
      <div class="grid-2">
        <div class="card">
          <h3>Дублирани записи (${dups.length})</h3>
          ${dups.length ? ui.table(['Ред', 'ID', 'Повтаря ред', 'Вид'], dups.map(([i, d]) => [cur.rows[i]._row, cur.rows[i].id === undefined ? '—' : cur.rows[i].id, cur.rows[d.of]._row, d.sub])) : '<p class="muted">Няма дублирани записи.</p>'}
          <p class="small muted" style="margin-top:8px"><b>Точен дубликат</b>: всички стойности, включително ID, съвпадат. <b>Дубликат по съдържание</b>: съвпада всичко освен ID.</p>
        </div>
        <div class="card">
          <h3>Нерелевантни признаци (шум)</h3>
          ${Object.keys(a.colIssues).length ? Object.entries(a.colIssues).map(([k, x]) => `<div class="issue-box" style="border-left-color:${I.irrelevant.color}"><h4>${E.COL[k].label} · ${x.sub}</h4><p class="small" style="margin:0">${x.msg}</p></div>`).join('') : '<p class="muted">Нерелевантните признаци са премахнати.</p>'}
          <p class="small muted">Шум са и случайните грешки при измерване или въвеждане. Те не се виждат като отделна колона, а като разсейване около истинската стойност.</p>
        </div>
      </div>
      <div class="card">
        <h3>Екстремни стойности (${outs.length})</h3>
        <p class="small muted">Правило на IQR: стойност е екстремна, ако е под Q1 − 1,5·IQR или над Q3 + 1,5·IQR. Невъзможните стойности (например възраст 156) са отчетени като грешки, а не като екстремни.</p>
        ${outs.length ? ui.table(['Ред', 'Признак', { l: 'Стойност', num: true }, { l: 'Долна граница', num: true }, { l: 'Горна граница', num: true }, 'Посока'], outs.map(o => [cur.rows[o.i]._row, E.COL[o.k].label, f(cur.rows[o.i][o.k]), f(a.fences[o.k].lo), f(a.fences[o.k].hi), o.x.sub]), { maxh: 300 }) : '<p class="muted">Няма екстремни стойности.</p>'}
        <div class="note small">Екстремна не означава грешна. Доход от 14 500 € е възможен, но рядък. Решението дали да се запази, ограничи или трансформира зависи от целта на анализа.</div>
        ${E.code(`q1, q3 = df["income"].quantile([0.25, 0.75])
iqr = q3 - q1
lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
outliers = df[(df["income"] < lo) | (df["income"] > hi)]`)}
      </div>`;
    }
  });

  /* ================= 1.3 Описателни статистики ================= */
  const interpSkew = s => (Math.abs(s) < 0.5 ? 'приблизително симетрично' : Math.abs(s) < 1 ? (s > 0 ? 'умерено скосено надясно (положителна скосеност)' : 'умерено скосено наляво (отрицателна скосеност)') : s > 0 ? 'силно скосено надясно: дълга „опашка“ към големите стойности' : 'силно скосено наляво: дълга „опашка“ към малките стойности');
  const interpKurt = k => (k > 1 ? 'лептокуртично (заострено): повече екстремни стойности от нормалното' : k < -1 ? 'платикуртично (сплеснато): по-малко екстремни стойности от нормалното' : 'близко до нормалното (мезокуртично)');
  E.interpSkew = interpSkew; E.interpKurt = interpKurt;

  E.page('descriptive', {
    title: 'Описателни статистики', source: true,
    st: { v: 'income', cat: 'education', sandbox: '2, 4, 4, 4, 5, 5, 7, 9' },
    render(st) {
      const cur = E.current();
      // Невалидните стойности (напр. възраст 156) влизат в суровите статистики – така се вижда ефектът им
      const desc = E.NUMERIC.map(k => [k, S.describe(cur.rows.map(r => r[k]))]);
      const d = S.describe(cur.rows.map(r => r[st.v]));
      const unit = E.COL[st.v].unit;
      const modeTxt = d.mode.count > 1 ? `${d.mode.values.slice(0, 3).map(x => f(x)).join('; ')}${d.mode.values.length > 3 ? '…' : ''}` : 'няма (всички различни)';
      const modeHint = d.mode.count > 1 ? `среща се ${d.mode.count} пъти${d.mode.values.length > 1 ? `; ${d.mode.values.length} моди` : ''}` : '';

      // Категорийни
      const catCol = E.COL[st.cat];
      const cv = cur.rows.map(r => r[st.cat]);
      const freq = new Map();
      cv.forEach(v => { const key = v === null || v === undefined ? 'NULL' : v; freq.set(key, (freq.get(key) || 0) + 1); });
      const order = catCol.type === 'ordinal' ? catCol.values : [...freq.keys()].filter(x => x !== 'NULL').sort((x, y) => freq.get(y) - freq.get(x));
      const items = [...new Set(order.filter(x => freq.has(x)).concat([...freq.keys()]))];
      const cm = S.mode(cv.filter(v => v !== null && v !== undefined));
      let ordMedian = '';
      if (catCol.type === 'ordinal') {
        const codes = cv.map(v => catCol.values.indexOf(v)).filter(i => i >= 0);
        const med = S.sorted(codes)[Math.floor((codes.length - 1) / 2)];
        ordMedian = catCol.values[med];
      }

      // Пясъчник
      const sb = st.sandbox.split(/[;,\s]+/).map(x => Number(x.replace(',', '.'))).filter(Number.isFinite);
      const sd = sb.length >= 2 ? S.describe(sb) : null;
      let sandbox = '<p class="muted">Въведете поне две числа.</p>';
      if (sd) {
        const m = sd.mean;
        sandbox = `${ui.table(['xᵢ', { l: 'xᵢ − x̄', num: true }, { l: '(xᵢ − x̄)²', num: true }], sb.map(x => [f(x), f(x - m, 3), f((x - m) ** 2, 3)]).concat([[`<b>Σ = ${f(S.sum(sb), 3)}</b>`, '<b>0</b>', `<b>${f(sb.reduce((s, x) => s + (x - m) ** 2, 0), 3)}</b>`]]), { cls: 'compact' })}
        <div class="grid-4" style="margin-top:12px">
          ${ui.stat('Средно x̄', f(sd.mean, 3), `${f(S.sum(sb), 3)} / ${sb.length}`)}
          ${ui.stat('Медиана', f(sd.median, 3), sb.length % 2 ? 'средният елемент' : 'средно на двата средни')}
          ${ui.stat('Мода', sd.mode.count > 1 ? sd.mode.values.map(x => f(x)).join('; ') : 'няма', sd.mode.count > 1 ? `${sd.mode.count} пъти` : '')}
          ${ui.stat('Размах', f(sd.range, 3), `${f(sd.max)} − ${f(sd.min)}`)}
          ${ui.stat('Дисперсия s²', f(sd.variance, 3), `${f(sb.reduce((s, x) => s + (x - m) ** 2, 0), 3)} / (${sb.length} − 1)`)}
          ${ui.stat('Стандартно отклонение s', f(sd.std, 3), `√${f(sd.variance, 3)}`)}
          ${ui.stat('Скосеност', f(sd.skew, 3), sb.length < 3 ? 'нужни са ≥ 3 числа' : '')}
          ${ui.stat('Ексцес', f(sd.kurt, 3), sb.length < 4 ? 'нужни са ≥ 4 числа' : '')}
        </div>`;
      }

      return `
      ${ui.head('Част I · 1.3', 'Описателни статистики', `Числови характеристики, които обобщават признака: къде е центърът, колко са разпръснати стойностите и каква е формата на разпределението. Изчислени върху ${cur.label}.`)}
      <div class="card">
        <h2>Обобщение на количествените признаци</h2>
        ${!cur.clean ? '<div class="note warn small">В суровите данни влизат и грешните стойности: възраст 156 и −3, тегло 0, височина 1,64 m, отрицателен доход. Те изкривяват средното и разсейването. Превключете на „Почистени“ горе, за да сравните.</div>' : ''}
        ${ui.table(['Признак', { l: 'n', num: true }, { l: 'Липсващи', num: true }, { l: 'Средно', num: true }, { l: 'Ст. откл.', num: true }, { l: 'Мин.', num: true }, { l: 'Q1', num: true }, { l: 'Медиана', num: true }, { l: 'Q3', num: true }, { l: 'Макс.', num: true }, { l: 'Скосеност', num: true }, { l: 'Ексцес', num: true }],
          desc.map(([k, x]) => [`<b>${E.label(k)}</b>`, x.n, x.missing, f(x.mean), f(x.std), f(x.min), f(x.q1), f(x.median), f(x.q3), f(x.max), f(x.skew, 2), f(x.kurt, 2)]))}
        ${E.code(`df.describe()          # n, средно, ст. отклонение, мин., квартили, макс.
df.skew(numeric_only=True)   # скосеност
df.kurt(numeric_only=True)   # ексцес (спрямо нормалното = 0)`)}
      </div>
      <div class="card">
        <div class="controls">${ui.select('v', ui.numOptions(), st.v, 'Признак')}</div>
        <h3>Мерки за централна тенденция</h3>
        <div class="grid-3">
          ${ui.stat('Средно аритметично (mean)', f(d.mean) + ' ' + unit, 'x̄ = Σxᵢ / n', 'Чувствително към екстремни стойности: една голяма стойност го „дърпа“.')}
          ${ui.stat('Медиана (median)', f(d.median) + ' ' + unit, '50-и перцентил', 'Половината стойности са под нея. Устойчива (робастна) към екстремни стойности.')}
          ${ui.stat('Мода (mode)', modeTxt, modeHint, 'Най-често срещаната стойност. При непрекъснати признаци е малко информативна; най-полезна е при категорийни.')}
        </div>
        <div style="margin-top:12px">${E.chart.strip({ values: cur.rows.map(r => r[st.v]), markers: [{ x: d.mean, label: 'Средно', color: E.C.gold }, { x: d.median, label: 'Медиана', color: E.C.navy, dash: '6 4' }] })}</div>
        ${Math.abs(d.mean - d.median) > 0.1 * d.std ? `<div class="note small">Средното (${f(d.mean)}) и медианата (${f(d.median)}) се различават забележимо. Това е признак за скосено разпределение или за екстремни стойности.</div>` : ''}
        <h3 style="margin-top:18px">Мерки за разсейване</h3>
        <div class="grid-5">
          ${ui.stat('Размах (range)', f(d.range), 'R = max − min', 'Зависи само от двете крайни стойности.')}
          ${ui.stat('Дисперсия (variance)', f(d.variance), 's² = Σ(xᵢ − x̄)² / (n − 1)', `Мерна единица: (${unit})².`)}
          ${ui.stat('Стандартно отклонение', f(d.std), 's = √s²', `Средно отклонение от средното, в ${unit}.`)}
          ${ui.stat('Междуквартилен размах', f(d.iqr), 'IQR = Q3 − Q1', 'Разсейване на средните 50% от стойностите. Робастна мярка.')}
          ${ui.stat('Коефициент на вариация', E.pct(d.cv), 'CV = s / x̄', 'Относително разсейване. Позволява сравнение на признаци с различни единици.')}
        </div>
        <h3 style="margin-top:18px">Форма на разпределението</h3>
        <div class="grid-2">
          ${ui.stat('Скосеност (skewness)', f(d.skew, 3), 'g₁ = m₃ / m₂^(3/2), с корекция за извадка', `Разпределението е ${interpSkew(d.skew)}. При нормално разпределение скосеността е 0.`)}
          ${ui.stat('Ексцес (kurtosis)', f(d.kurt, 3), 'g₂ = m₄ / m₂² − 3, с корекция за извадка', `Разпределението е ${interpKurt(d.kurt)}. При нормално разпределение ексцесът е 0.`)}
        </div>
        <p class="small muted" style="margin-top:8px">Тук ексцесът е <b>спрямо нормалното</b> (excess kurtosis), както в pandas. В някои учебници се ползва без изваждането на 3; тогава нормалното разпределение има ексцес 3. Подробно → <a href="#/distributions">1.4 Разпределения</a>.</p>
      </div>
      <div class="card">
        <h2>Категорийни признаци</h2>
        <div class="controls">${ui.select('cat', ui.catOptions(), st.cat, 'Признак')}</div>
        <div class="grid-2">
          <div>${ui.table(['Стойност', { l: 'Брой', num: true }, { l: 'Дял', num: true }], items.map(v => [v === 'NULL' ? '<span class="muted">NULL</span>' : `<code>${E.esc(E.cellText(v))}</code>${catCol.values.includes(v) ? '' : ' <span class="badge" style="background:#ecdff3;color:var(--c-error)">извън речника</span>'}`, freq.get(v), E.pct(freq.get(v) / cv.length)]), { cls: 'compact' })}</div>
          <div>
            ${ui.stat('Мода', E.esc(cm.values.join(', ')), `${cm.count} от ${cv.length}`, 'Единствената мярка за централна тенденция, допустима за номинални признаци.')}
            ${catCol.type === 'ordinal' ? `<div style="margin-top:12px">${ui.stat('Медиана (порядков признак)', ordMedian, 'по реда ' + catCol.values.join(' < '), 'За порядкови признаци медианата има смисъл, защото категориите могат да се подредят. Средно аритметично няма смисъл.')}</div>` : '<div class="note small" style="margin-top:12px">За номинални признаци медиана и средно нямат смисъл: категориите не могат да се подредят.</div>'}
          </div>
        </div>
        ${E.code(`df["${st.cat}"].value_counts(dropna=False)              # честоти
df["${st.cat}"].value_counts(normalize=True)            # дялове
df["${st.cat}"].mode()                                  # мода`)}
      </div>
      <div class="card">
        <h2>Изчисляване стъпка по стъпка</h2>
        <p class="small muted">Въведете малка редица от числа, за да видите как се изчисляват мерките на ръка.</p>
        <div class="controls"><label class="control">Числа, разделени със запетая или интервал<input type="text" data-bind="sandbox" value="${E.esc(st.sandbox)}" style="min-width:320px"></label></div>
        ${sandbox}
      </div>`;
    }
  });

  /* ================= 1.4 Разпределения ================= */
  function gallery(kind, p) {
    const rnd = S.rng(11 + kind.length), z = rnd.normal, n = 600;
    const out = [];
    for (let i = 0; i < n; i++) {
      let x;
      if (kind === 'normal') x = 50 + 10 * z();
      else if (kind === 'right') x = Math.exp((p / 50) * z());
      else if (kind === 'left') x = -Math.exp((p / 50) * z());
      else if (kind === 'lepto') { const df = p; let c = 0; for (let j = 0; j < df; j++) c += z() ** 2; x = z() / Math.sqrt(c / df); }
      else if (kind === 'platy') { let s = 0; for (let j = 0; j < p; j++) s += rnd(); x = s / p; }
      else { const d = p / 20; x = (rnd() < 0.5 ? -d : d) + z(); }
      out.push(x);
    }
    return out;
  }
  const GAL = {
    normal: { l: 'Нормално', param: null, text: 'Симетрично, камбановидно. Средно = медиана = мода. Около 68% от стойностите са в ±1σ, 95% в ±2σ, 99,7% в ±3σ.' },
    right: { l: 'Скосено надясно', param: ['Сила на скосеността', 10, 60, 25], text: 'Дълга опашка вдясно. Средно > медиана. Типично за доходи, цени, времена за изчакване. Помага логаритмична трансформация.' },
    left: { l: 'Скосено наляво', param: ['Сила на скосеността', 10, 60, 25], text: 'Дълга опашка вляво. Средно < медиана. Пример: възраст при пенсиониране, резултати от лесен тест.' },
    lepto: { l: 'Лептокуртично', param: ['Степени на свобода (t-разпределение)', 3, 30, 4], text: 'Заострен връх и „тежки“ опашки: повече екстремни стойности, отколкото при нормалното. Пример: финансова доходност. Ексцес > 0.' },
    platy: { l: 'Платикуртично', param: ['Брой събирани равномерни стойности', 1, 6, 1], text: 'Сплеснат връх и леки опашки. При 1 е равномерно разпределение (ексцес ≈ −1,2). Увеличете броя: сумата на равномерни стойности се доближава до нормално (централна гранична теорема).' },
    bimodal: { l: 'Двувърхово', param: ['Разстояние между върховете', 0, 70, 50], text: 'Два върха. Обикновено означава смесени групи, например мъже и жени при височината. Средното попада в „долината“ и не е типична стойност.' }
  };

  E.page('distributions', {
    title: 'Разпределения', source: true,
    st: { v: 'income', rule: 'sturges', bins: 0, normal: true, marks: true, gal: 'right', p: {} },
    render(st) {
      const cur = E.current();
      const vals = S.nums(cur.rows.map(r => r[st.v]));
      const d = S.describe(vals);
      const k = st.bins || S.binCount(vals, st.rule);
      const jb = S.jarqueBera(vals);
      const g = GAL[st.gal];
      const pv = g.param ? (st.p[st.gal] !== undefined ? st.p[st.gal] : g.param[3]) : null;
      const gv = gallery(st.gal, pv);
      const gd = S.describe(gv);
      const markers = st.marks ? [{ x: d.mean, label: 'Средно', color: E.C.gold }, { x: d.median, label: 'Медиана', color: E.C.navy, dash: '6 4' }] : [];
      return `
      ${ui.head('Част I · 1.4', 'Разпределения', `Как са разпределени стойностите на признака. Три диаграми, които се допълват: хистограма, кутийна диаграма и Q-Q диаграма. Изчислени върху ${cur.label}.`)}
      <div class="card">
        <div class="controls">
          ${ui.select('v', ui.numOptions(), st.v, 'Признак')}
          ${ui.select('rule', [{ v: 'sturges', l: 'Стърджис: ⌈log₂ n⌉ + 1' }, { v: 'sqrt', l: 'Корен квадратен: ⌈√n⌉' }, { v: 'fd', l: 'Фрийдман–Диаконис: 2·IQR·n^(−1/3)' }], st.rule, 'Правило за броя интервали')}
          ${ui.range('bins', 0, 60, 1, st.bins, 'Ръчно (0 = по правилото)')}
          ${ui.check('normal', st.normal, 'Нормална крива')}
          ${ui.check('marks', st.marks, 'Средно и медиана')}
        </div>
        <div class="grid-2">
          ${ui.chart(`Хистограма (${k} интервала)`, E.chart.histogram({ values: vals, bins: k, normal: st.normal, markers, xLabel: E.label(st.v) }))}
          ${ui.chart('Кутийна диаграма (box plot)', E.chart.boxplot({ groups: [{ label: E.COL[st.v].label, values: vals }], yLabel: E.label(st.v) }))}
        </div>
        <div class="grid-2" style="margin-top:16px">
          ${ui.chart('Q-Q диаграма спрямо нормалното разпределение', E.chart.qq({ values: vals, yLabel: E.label(st.v) }))}
          <div>
            <div class="grid-2">
              ${ui.stat('Скосеност', f(d.skew, 3), '', interpSkew(d.skew))}
              ${ui.stat('Ексцес', f(d.kurt, 3), '', interpKurt(d.kurt))}
            </div>
            <div style="margin-top:12px">${ui.stat('Тест на Жарке–Бера за нормалност', `JB = ${f(jb.jb, 2)}`, jb.p < 0.001 ? 'p < 0,001' : `p = ${f(jb.p, 3)}`, jb.p < 0.05 ? 'p < 0,05: отхвърляме хипотезата, че разпределението е нормално.' : 'p ≥ 0,05: нямаме основание да отхвърлим нормалността.', 'gold')}</div>
            <div class="note navy small" style="margin-top:12px"><b>Как се четат диаграмите.</b><br>
            <b>Хистограма</b>: височината на стълбчето е броят стойности в интервала. Сравнете с червената нормална крива.<br>
            <b>Кутийна диаграма</b>: кутията е от Q1 до Q3, линията е медианата, златният ромб е средното, „мустачките“ стигат до най-крайните стойности в границите, оранжевите точки са екстремни.<br>
            <b>Q-Q диаграма</b>: ако точките лежат по червената права, разпределението е близо до нормалното. Извивка нагоре вдясно означава дясна скосеност; S-образна форма означава тежки или леки опашки.</div>
          </div>
        </div>
        ${E.code(`import matplotlib.pyplot as plt
from scipy import stats

df["${st.v}"].plot.hist(bins="${st.rule === 'fd' ? 'fd' : st.rule}")      # хистограма
df.boxplot(column="${st.v}")                     # кутийна диаграма
stats.probplot(df["${st.v}"].dropna(), dist="norm", plot=plt)   # Q-Q диаграма
stats.jarque_bera(df["${st.v}"].dropna())        # тест за нормалност`)}
      </div>
      <div class="card">
        <h2>Галерия на формите на разпределение</h2>
        <p class="small muted">Синтетични данни (600 стойности), за да се види как формата се отразява на скосеността и ексцеса.</p>
        <div class="controls">${ui.seg('gal', Object.entries(GAL).map(([v, x]) => ({ v, l: x.l })), st.gal)}</div>
        ${g.param ? `<div class="controls"><label class="control">${g.param[0]}: <span data-out="galp" class="counter">${pv}</span><input type="range" data-act-range="galp" min="${g.param[1]}" max="${g.param[2]}" step="1" value="${pv}" data-gal="${st.gal}"></label></div>` : ''}
        <div class="grid-2">
          ${ui.chart(g.l, E.chart.histogram({ values: gv, bins: 30, normal: true, markers: [{ x: gd.mean, label: 'Средно', color: E.C.gold }, { x: gd.median, label: 'Медиана', color: E.C.navy, dash: '6 4' }] }))}
          <div>
            <p>${g.text}</p>
            <div class="grid-2">${ui.stat('Скосеност', f(gd.skew, 2), '', interpSkew(gd.skew))}${ui.stat('Ексцес', f(gd.kurt, 2), '', interpKurt(gd.kurt))}</div>
            <div style="margin-top:12px">${E.chart.qq({ values: gv, h: 260 })}</div>
          </div>
        </div>
      </div>`;
    },
    after(main, st) {
      const r = main.querySelector('[data-act-range="galp"]');
      if (!r) return;
      r.addEventListener('input', () => { main.querySelector('[data-out="galp"]').textContent = r.value; });
      r.addEventListener('change', () => { st.p[r.dataset.gal] = Number(r.value); E.refresh(); });
    }
  });

  /* ================= 1.5 Взаимовръзки и класове ================= */
  const strength = r => { const a = Math.abs(r); return a < 0.1 ? 'практически няма връзка' : a < 0.3 ? 'слаба' : a < 0.5 ? 'умерена' : a < 0.7 ? 'значителна' : a < 0.9 ? 'силна' : 'много силна'; };
  E.strength = strength;

  E.page('relations', {
    title: 'Взаимовръзки и класове', source: true,
    st: { x: 'height', y: 'weight', color: 'gender', fit: true, method: 'pearson', cls: 'education', num: 'income' },
    render(st) {
      const cur = E.current();
      const rows = cur.rows;
      const p = S.pairs(rows, st.x, st.y);
      const r = S.pearson(p.x, p.y), rho = S.spearman(p.x, p.y);
      const groupKey = st.color === 'none' ? null : st.color;
      const groupVals = groupKey ? [...new Set(rows.map(x => x[groupKey]))] : [];
      const ordered = groupKey ? E.COL[groupKey].values.filter(v => groupVals.includes(v)).concat(groupVals.filter(v => !E.COL[groupKey].values.includes(v))) : [];
      const groups = groupKey ? ordered.map(v => ({ key: String(v), label: v === null || v === undefined ? 'NULL' : E.cellText(v), color: E.colorOfCat(groupKey, v) })) : null;
      const points = p.idx.map((i, t) => ({ x: p.x[t], y: p.y[t], g: groupKey ? String(rows[i][groupKey]) : null, tip: `Ред ${rows[i]._row}: ${E.COL[st.x].label} = ${f(p.x[t])}, ${E.COL[st.y].label} = ${f(p.y[t])}` }));

      const M = E.NUMERIC.map(a => E.NUMERIC.map(b => { const q = S.pairs(rows, a, b); return st.method === 'pearson' ? S.pearson(q.x, q.y) : S.spearman(q.x, q.y); }));
      const strong = [];
      E.NUMERIC.forEach((a, i) => E.NUMERIC.forEach((b, j) => { if (j > i && Math.abs(M[i][j]) >= 0.7) strong.push(`${E.COL[a].label} и ${E.COL[b].label} (r = ${f(M[i][j], 2)})`); }));

      // Класове
      const cc = E.COL[st.cls];
      const cvals = rows.map(x => x[st.cls]);
      const present = [...new Set(cvals)];
      const cats = cc.values.filter(v => present.includes(v)).concat(present.filter(v => !cc.values.includes(v)));
      const counts = cats.map(c => cvals.filter(v => v === c).length);
      const valid = counts.filter((_, i) => cc.values.includes(cats[i]));
      const ratio = Math.max(...valid) / Math.max(1, Math.min(...valid));
      const catLabel = c => (c === null || c === undefined ? 'NULL' : E.cellText(c));
      const grp = cats.map(c => ({ label: catLabel(c), values: rows.filter(x => x[st.cls] === c).map(x => x[st.num]), color: E.colorOfCat(st.cls, c) }));
      const invalidCats = cats.filter(c => !cc.values.includes(c));

      return `
      ${ui.head('Част I · 1.5', 'Взаимовръзки и класове', `Как признаците са свързани помежду си и как се различават разпределенията в отделните класове. Изчислени върху ${cur.label}.`)}
      <div class="card">
        <h2>Диаграма на разсейване (scatter plot)</h2>
        <div class="controls">
          ${ui.select('x', ui.numOptions(), st.x, 'Ос X')}
          ${ui.select('y', ui.numOptions(), st.y, 'Ос Y')}
          ${ui.select('color', [{ v: 'none', l: 'Без оцветяване' }].concat(ui.catOptions()), st.color, 'Оцвети по клас')}
          ${ui.check('fit', st.fit, 'Регресионна права')}
        </div>
        <div class="grid-2" style="grid-template-columns:2fr 1fr">
          ${ui.chart('', E.chart.scatter({ points, groups, fit: st.fit, xLabel: E.label(st.x), yLabel: E.label(st.y) }))}
          <div>
            ${ui.stat('Корелация на Пиърсън (r)', f(r, 3), 'линейна връзка', `Връзката е ${strength(r)}${Math.abs(r) >= 0.1 ? (r > 0 ? ', положителна' : ', отрицателна') : ''}. Двойки стойности: ${p.x.length}.`)}
            <div style="margin-top:12px">${ui.stat('Корелация на Спирман (ρ)', f(rho, 3), 'монотонна връзка по рангове', 'Устойчива към екстремни стойности. Ако се различава много от r, причината често са екстремни стойности или нелинейна връзка.', 'gold')}</div>
            <div style="margin-top:12px">${ui.stat('Коефициент на детерминация', f(r * r, 3), 'r²', `${E.pct(r * r)} от вариацията на единия признак се обяснява линейно от другия.`)}</div>
          </div>
        </div>
        <div class="note small">Корелацията не означава причинно-следствена връзка. Двата признака може да зависят от трети, например стажът и доходът зависят от възрастта.</div>
      </div>
      <div class="card">
        <h2>Корелационна матрица</h2>
        <div class="controls">${ui.seg('method', [{ v: 'pearson', l: 'Пиърсън' }, { v: 'spearman', l: 'Спирман' }], st.method)}</div>
        <div class="grid-2" style="grid-template-columns:3fr 2fr">
          ${ui.chart('', E.chart.heatmap({ labels: E.NUMERIC.map(k => E.COL[k].label), matrix: M }))}
          <div>
            <p class="small">Тъмносиньо: силна положителна връзка. Златисто: отрицателна. Бяло: няма линейна връзка. По диагонала е 1, защото всеки признак е напълно корелиран със себе си.</p>
            ${strong.length ? `<div class="note"><b>Силни корелации (|r| ≥ 0,7):</b><ul class="tight">${strong.map(x => `<li>${x}</li>`).join('')}</ul>Силно свързаните признаци носят почти една и съща информация (мултиколинеарност). Това е основание за <a href="#/reduction">редуциране на размерността</a>.</div>` : ''}
          </div>
        </div>
        ${E.code(`df.corr(method="${st.method}", numeric_only=True)
import seaborn as sns
sns.heatmap(df.corr(numeric_only=True), annot=True, cmap="RdBu_r", vmin=-1, vmax=1)`)}
      </div>
      <div class="card">
        <h2>Матрица от диаграми на разсейване (scatter matrix)</h2>
        <p class="small muted">Всички двойки количествени признаци наведнъж. По диагонала: хистограма на признака.</p>
        ${ui.chart('', E.chart.scatterMatrix({ rows, keys: E.NUMERIC, labels: E.NUMERIC.map(k => E.COL[k].label) }))}
        ${E.code('pd.plotting.scatter_matrix(df[["age", "experience", "height", "weight", "income"]], diagonal="hist")\n# или: sns.pairplot(df, hue="gender")')}
      </div>
      <div class="card">
        <h2>Разпределение по класове</h2>
        <div class="controls">${ui.select('cls', ui.catOptions(), st.cls, 'Клас')}${ui.select('num', ui.numOptions(), st.num, 'Количествен признак')}</div>
        ${invalidCats.filter(c => c !== null && c !== undefined).length ? `<div class="note warn small">В ${cur.label} има стойности извън речника (${invalidCats.filter(c => c !== null && c !== undefined).map(c => `<code>${E.esc(catLabel(c))}</code>`).join(', ')}). Те се появяват като отделни, фалшиви класове. Това е още една причина грешките да се почистят преди анализа.</div>` : ''}${invalidCats.some(c => c === null || c === undefined) ? '<div class="note small">Записите с липсващ клас са показани като група NULL. При анализ по класове те трябва да се запълнят или изключат.</div>' : ''}
        <div class="grid-2">
          ${ui.chart('Брой записи по клас', E.chart.bar({ labels: cats.map(catLabel), values: counts, color: cats.map(c => E.colorOfCat(st.cls, c)), rotate: cats.length > 4 }))}
          ${ui.chart(`${E.COL[st.num].label} по клас`, E.chart.boxplot({ groups: grp, yLabel: E.label(st.num), rotate: cats.length > 4 }))}
        </div>
        <div class="grid-2" style="margin-top:16px">
          <div>${ui.table(['Клас', { l: 'n', num: true }, { l: 'Дял', num: true }, { l: 'Средно', num: true }, { l: 'Медиана', num: true }, { l: 'Ст. откл.', num: true }], grp.map((g2, i) => { const v = S.nums(g2.values); return [`<i class="pill-dot" style="background:${g2.color}"></i>${E.esc(g2.label)}`, counts[i], E.pct(counts[i] / rows.length), f(S.mean(v)), f(S.median(v)), f(S.std(v))]; }), { cls: 'compact' })}</div>
          <div>
            ${ui.stat('Съотношение на дисбаланса', f(ratio, 1) + ' : 1', 'най-голям / най-малък валиден клас', ratio > 3 ? 'Класовете са дисбалансирани. При класификация моделът ще „предпочита“ големия клас; помагат претегляне, презаписване на малкия клас (oversampling) или стратифицирано разделяне.' : 'Класовете са сравнително балансирани.', ratio > 3 ? 'gold' : '')}
          </div>
        </div>
        ${E.code(`df["${st.cls}"].value_counts()
df.groupby("${st.cls}")["${st.num}"].agg(["count", "mean", "median", "std"])
sns.boxplot(data=df, x="${st.cls}", y="${st.num}")`)}
      </div>`;
    }
  });

  /* ================= 1.6 Протокол на констатациите ================= */
  E.page('protocol', {
    title: 'Протокол на констатациите', source: false,
    render() {
      const a = E.rawAnalysis();
      const I = ISS();
      const cells = Object.entries(a.cells).flatMap(([key, arr]) => arr.map(x => ({ k: key.split('|')[1], i: +key.split('|')[0], x })));
      const by = (type) => { const m = {}; cells.filter(c => (Array.isArray(type) ? type.includes(c.x.type) : c.x.type === type)).forEach(c => { m[c.k] = (m[c.k] || 0) + 1; }); return m; };
      const list = m => Object.entries(m).map(([k, v]) => `${E.COL[k].label}: ${v}`).join(' · ');
      const subs = {};
      cells.filter(c => c.x.type === 'error' || c.x.type === 'format').forEach(c => { subs[c.x.sub] = (subs[c.x.sub] || 0) + 1; });
      const dupl = Object.values(a.rowIssues);
      // Статистики върху валидните стойности (без грешните)
      const validVals = k => S.nums(E.RAW.map((r, i) => ((a.cells[i + '|' + k] || []).some(x => x.type === 'error' || x.type === 'format') ? null : r[k])));
      const skewed = E.NUMERIC.map(k => [k, S.skew(validVals(k))]).filter(([, s]) => Math.abs(s) > 1);
      const ranges = E.NUMERIC.map(k => { const v = validVals(k); return [k, Math.min(...v), Math.max(...v)]; });
      const corr = [];
      E.NUMERIC.forEach((x, i) => E.NUMERIC.forEach((y, j) => {
        if (j <= i) return;
        const vx = E.RAW.map((r, t) => ((a.cells[t + '|' + x] || []).some(z => z.type === 'error') ? null : r[x]));
        const vy = E.RAW.map((r, t) => ((a.cells[t + '|' + y] || []).some(z => z.type === 'error') ? null : r[y]));
        const rows = vx.map((v, t) => ({ a: v, b: vy[t] }));
        const p = S.pairs(rows, 'a', 'b');
        const r = S.pearson(p.x, p.y);
        if (Math.abs(r) >= 0.7) corr.push(`${E.COL[x].label} и ${E.COL[y].label} (r = ${f(r, 2)})`);
      }));
      const edu = E.RAW.map(r => r.education).filter(v => E.EDU.includes(v));
      const eduCounts = E.EDU.map(c => [c, edu.filter(v => v === c).length]);
      const minEdu = eduCounts.reduce((m, x) => (x[1] < m[1] ? x : m));

      const item = (color, title, text, link, linkText) => `<div class="protocol-item"><div class="bar" style="background:${color}"></div><div><b>${title}</b><div class="small" style="margin-top:3px">${text}</div></div>${link ? `<a class="btn ghost" href="#/${link}">${linkText} →</a>` : ''}</div>`;

      return `
      ${ui.head('Част I · 1.6', 'Протокол на констатациите', 'Обобщение на всичко, открито при предварителния анализ на суровите данни. Всяка констатация води към метода за решаване в Част II.')}
      <div class="card">
        <h2>А. Проблеми с качеството → почистване</h2>
        ${item(I.error.color, `1. Грешки в данните: ${a.totals.errors}`, `${Object.entries(subs).map(([k, v]) => `${k}: ${v}`).join(' · ')}<br>По признаци: ${list(by(['error', 'format']))}`, 'cleaning', 'Стъпка 1')}
        ${item(I.duplicate.color, `2. Дублирани записи: ${dupl.length}`, `Точни дубликати: ${dupl.filter(d => d.sub === 'Точен дубликат').length} · по съдържание (различен ID): ${dupl.filter(d => d.sub !== 'Точен дубликат').length}`, 'cleaning', 'Стъпка 2')}
        ${item(I.irrelevant.color, `3. Нерелевантни признаци: ${a.totals.irrelevant}`, Object.entries(a.colIssues).map(([k, x]) => `${E.COL[k].label} (${x.sub.toLowerCase()})`).join(' · '), 'cleaning', 'Стъпка 3')}
        ${item(I.outlier.color, `4. Екстремни стойности: ${a.totals.outliers}`, `${list(by('outlier'))}. Трябва да се реши дали са реални случаи или грешки.`, 'cleaning', 'Стъпка 4')}
        ${item(I.missing.color, `5. Липсващи стойности: ${a.totals.missing}`, `${list(by('missing'))}. Грешките, които не могат да се коригират, ще добавят още липсващи стойности.`, 'cleaning', 'Стъпка 5')}
      </div>
      <div class="card">
        <h2>Б. Особености на разпределенията и връзките → трансформации</h2>
        ${item(E.C.gold, 'Скосени разпределения', skewed.length ? skewed.map(([k, s]) => `${E.COL[k].label}: скосеност ${f(s, 2)} (${interpSkew(s)})`).join('<br>') : 'Няма силно скосени признаци.', 'power', 'Степенни трансформации')}
        ${item(E.C.gold, 'Различни мащаби на признаците', ranges.map(([k, lo, hi]) => `${E.COL[k].label}: ${f(lo)} – ${f(hi)}`).join(' · ') + '<br>Методите, базирани на разстояния (KNN, k-means, PCA), ще се влияят най-вече от признака с най-голям мащаб.', 'scaling', 'Мащабиране')}
        ${item(E.C.gold, 'Силно корелирани признаци', corr.length ? corr.join(' · ') + '<br>Носят почти една и съща информация.' : 'Няма.', 'reduction', 'Редуциране')}
        ${item(E.C.gold, 'Категорийни признаци', 'Пол и Град са номинални, Образование е порядков. Повечето модели изискват числови входове.', 'encoding', 'Кодиране')}
        ${item(E.C.gold, 'Дисбаланс на класовете', `Образование: най-малкият клас е „${minEdu[0]}“ с ${minEdu[1]} записа. ${eduCounts.map(([c, n]) => `${c}: ${n}`).join(' · ')}`, 'relations', 'Към 1.5')}
        ${item(E.C.gold, 'Данни в отделна таблица', 'Регионът и населението на градовете са в справочна таблица. Обединяването по „Град“ ще се провали за записите с грешно изписан град.', 'join', 'Обединяване')}
      </div>
      <div class="note navy">Препоръчан ред: първо грешките (за да не се броят като отделни категории и да не изкривяват статистиките), после дубликатите (корекциите могат да разкрият нови), нерелевантните признаци, екстремните стойности и накрая липсващите (запълването използва вече почистените стойности).</div>`;
    }
  });
})(window.EDA);
