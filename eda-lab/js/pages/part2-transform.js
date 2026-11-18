/* Част II · 2.2 Трансформации. Работят върху почистените данни (методите от 2.1). */
(function (E) {
  const S = E.S, ui = E.ui, f = E.fmt;
  const cleanRows = () => E.cleaned().rows;
  const base = () => `<div class="note navy small">Трансформациите се прилагат върху почистените данни (${cleanRows().length} записа) с методите, избрани в <a href="#/cleaning">2.1 Почистване</a>.</div>`;

  /* ---------- а) Обединяване ---------- */
  E.page('join', {
    title: 'Обединяване', st: { how: 'left', src: 'raw' },
    render(st) {
      const rows = st.src === 'raw' ? E.RAW : cleanRows();
      const res = E.T.join(rows, E.CITY_TABLE, st.how);
      const full = E.T.join(rows, E.CITY_TABLE, 'outer');
      const left = full.filter(r => r._m === 'left').length, both = full.filter(r => r._m === 'both').length, right = full.filter(r => r._m === 'right').length;
      const unmatched = full.filter(r => r._m === 'left');
      const ucities = [...new Set(unmatched.map(r => r.city))];
      const HOW = { inner: 'Вътрешно (inner)', left: 'Ляво (left)', right: 'Дясно (right)', outer: 'Пълно външно (outer)' };
      const DESC = {
        inner: 'Само записите, които имат съвпадение и в двете таблици. Записите с грешен или липсващ град изчезват.',
        left: 'Всички анкети; регион и население се добавят, ако има съвпадение, иначе остават NULL. Най-често използваното.',
        right: 'Всички градове от справочника; градове без анкети също се появяват (Велико Търново).',
        outer: 'Всичко от двете таблици, със NULL там, където няма съвпадение.'
      };
      const preview = res.slice(0, 12);
      return `
      ${ui.head('Част II · 2.2 а', 'Обединяване на данни (join, merge)', 'Добавяне на признаци от друга таблица по общ ключ. Тук към анкетите се добавят регионът и населението на града от справочна таблица.')}
      <div class="grid-2">
        <div class="card"><h3>Справочна таблица „Градове“</h3>${ui.table(['Град (ключ)', 'Регион', { l: 'Население (прибл.)', num: true }], E.CITY_TABLE.map(c => [c.city, c.region, f(c.population)]), { cls: 'compact' })}</div>
        <div class="card">
          <h3>Вид на обединяването</h3>
          <div class="controls">${ui.seg('how', Object.entries(HOW).map(([v, l]) => ({ v, l })), st.how)}</div>
          <div class="controls">${ui.seg('src', [{ v: 'raw', l: 'Сурови анкети' }, { v: 'clean', l: 'Почистени анкети' }], st.src)}</div>
          <p class="small">${DESC[st.how]}</p>
          ${E.chart.venn({ how: st.how, left, both, right })}
          <p class="small muted">Резултат: <b>${res.length}</b> реда. В диаграмата: анкети без съвпадение, анкети със съвпадение, градове без анкети.</p>
        </div>
      </div>
      <div class="card">
        <h3>Анкети без съвпадение (${unmatched.length})</h3>
        ${unmatched.length ? `<p class="small">Ключът не съвпада за: ${ucities.map(c => `<code>${E.esc(E.cellText(c))}</code>`).join(', ')}.</p>${st.src === 'raw' ? '<div class="note small">Записите с грешно изписан град („Сотия“, „sofia“, „Варна␣“) не се свързват. Превключете на „Почистени анкети“: след корекцията остават само тези с липсващ град. Затова грешките се почистват преди обединяването.</div>' : ''}` : '<p class="muted small">Всички анкети имат съвпадение.</p>'}
      </div>
      <div class="card">
        <h3>Резултат (първите ${preview.length} реда)</h3>
        ${ui.table(['Ред', 'ID', 'Град', 'Регион', { l: 'Население', num: true }, 'Образование', { l: 'Доход', num: true }], preview.map(r => [r._row || '—', r.id === undefined ? '<span class="muted">NULL</span>' : r.id, E.esc(E.cellText(r.city)), r.region ? r.region : '<span class="muted">NULL</span>', r.population ? f(r.population) : '<span class="muted">NULL</span>', r.education === undefined ? '<span class="muted">NULL</span>' : E.esc(E.cellText(r.education)), r.income === undefined ? '<span class="muted">NULL</span>' : f(r.income)]), { cls: 'compact' })}
        ${E.code(`cities = pd.DataFrame({"city": [...], "region": [...], "population": [...]})
merged = df.merge(cities, on="city", how="${st.how}", indicator=True)
merged["_merge"].value_counts()      # both / left_only / right_only
# Конкатенация (обединяване по редове) на таблици със същите колони:
all_data = pd.concat([df_2025, df_2026], ignore_index=True)`)}
      </div>`;
    }
  });

  /* ---------- б) Агрегиране ---------- */
  E.page('aggregate', {
    title: 'Агрегиране', st: { by: 'city', col: 'income', fn: 'mean', by2: 'none' },
    render(st) {
      const rows = E.T.join(cleanRows(), E.CITY_TABLE, 'left');
      const BY = [{ v: 'city', l: 'Град' }, { v: 'region', l: 'Регион (след обединяване)' }, { v: 'education', l: 'Образование' }, { v: 'gender', l: 'Пол' }];
      const FN = [{ v: 'mean', l: 'Средно (mean)' }, { v: 'median', l: 'Медиана (median)' }, { v: 'count', l: 'Брой (count)' }, { v: 'sum', l: 'Сума (sum)' }, { v: 'min', l: 'Минимум (min)' }, { v: 'max', l: 'Максимум (max)' }, { v: 'std', l: 'Ст. отклонение (std)' }];
      let res = E.T.aggregate(rows, st.by, st.col, st.fn);
      const orderVals = st.by === 'education' ? E.EDU : null;
      res = orderVals ? orderVals.map(v => res.find(r => r.group === v)).filter(Boolean).concat(res.filter(r => !orderVals.includes(r.group))) : res.sort((a, b) => b.value - a.value);
      const fnL = FN.find(x => x.v === st.fn).l.split(' (')[0].toLowerCase();
      let pivot = '';
      if (st.by2 !== 'none' && st.by2 !== st.by) {
        const g1 = res.map(r => r.group);
        const vals2 = st.by2 === 'education' ? E.EDU : [...new Set(rows.map(r => r[st.by2]))].filter(v => v !== null && v !== undefined).sort((a, b) => String(a).localeCompare(String(b), 'bg'));
        const cell = (a, b) => { const sub = rows.filter(r => r[st.by] === a && r[st.by2] === b); return sub.length ? E.T.aggregate(sub, st.by, st.col, st.fn)[0].value : NaN; };
        pivot = `<h3 style="margin-top:18px">Обобщаваща таблица (pivot table)</h3>${ui.table([BY.find(b => b.v === st.by).l.split(' (')[0] + ' \\ ' + BY.find(b => b.v === st.by2).l.split(' (')[0]].concat(vals2.map(v => ({ l: E.esc(v), num: true }))), g1.map(a => [`<b>${E.esc(a)}</b>`].concat(vals2.map(b => f(cell(a, b))))), { cls: 'compact' })}`;
      }
      return `
      ${ui.head('Част II · 2.2 б', 'Агрегиране на данни (group by)', 'Групиране на записите по категория и обобщаване на всяка група с една стойност. Резултатът е по-малка таблица на по-високо ниво: например среден доход по град вместо доход на всеки човек.')}
      ${base()}
      <div class="card">
        <div class="controls">
          ${ui.select('by', BY, st.by, 'Групирай по')}
          ${ui.select('col', ui.numOptions(), st.col, 'Признак')}
          ${ui.select('fn', FN, st.fn, 'Агрегираща функция')}
          ${ui.select('by2', [{ v: 'none', l: '—' }].concat(BY.filter(b => b.v !== st.by)), st.by2, 'Втори признак (pivot)')}
        </div>
        <div class="grid-2" style="grid-template-columns:3fr 2fr">
          ${ui.chart(`${E.COL[st.col].label}: ${fnL} по ${BY.find(b => b.v === st.by).l.split(' (')[0].toLowerCase()}`, E.chart.bar({ labels: res.map(r => String(r.group)), values: res.map(r => r.value), color: E.C.navy2, rotate: res.length > 4, yLabel: st.fn === 'count' ? 'Брой' : E.label(st.col) }))}
          <div>${ui.table(['Група', { l: 'Записи', num: true }, { l: fnL, num: true }], res.map(r => [E.esc(r.group), r.n, f(r.value)]), { cls: 'compact' })}</div>
        </div>
        ${pivot}
        <div class="note small">Агрегирането намалява обема на данните, но губи детайла: средният доход по град не казва нищо за разсейването в града. Затова често се агрегира с няколко функции наведнъж.</div>
        ${E.code(`df.groupby("${st.by}")["${st.col}"].${st.fn}()
df.groupby("${st.by}").agg(n=("${st.col}", "count"), avg=("${st.col}", "mean"), med=("${st.col}", "median"))
${st.by2 !== 'none' ? `pd.pivot_table(df, values="${st.col}", index="${st.by}", columns="${st.by2}", aggfunc="${st.fn}")` : `# обобщаваща таблица: pd.pivot_table(df, values="${st.col}", index="${st.by}", columns="gender", aggfunc="${st.fn}")`}`)}
      </div>`;
    }
  });

  /* ---------- в) Мащабиране ---------- */
  E.page('scaling', {
    title: 'Мащабиране', st: { v: 'income', method: 'zscore' },
    render(st) {
      const rows = cleanRows();
      const M = { minmax: 'Нормализация min-max', zscore: 'Стандартизация (z-оценка)', robust: 'Робастно мащабиране' };
      const FORM = { minmax: "x' = (x − min) / (max − min) → [0; 1]", zscore: "z = (x − x̄) / s → средно 0, ст. отклонение 1", robust: "x' = (x − медиана) / IQR → устойчиво към екстремни стойности" };
      const vals = S.nums(rows.map(r => r[st.v]));
      const sc = E.T.scale(vals, st.method);
      const out = vals.map(sc.f);
      const allScaled = E.NUMERIC.map(k => { const v = S.nums(rows.map(r => r[k])); const t = E.T.scale(v, st.method); return { label: E.COL[k].label, values: v.map(t.f) }; });
      const allRaw = E.NUMERIC.map(k => ({ label: E.COL[k].label, values: S.nums(rows.map(r => r[k])) }));
      const params = Object.entries(sc.params).map(([k, v]) => `${{ min: 'min', max: 'max', mean: 'x̄', std: 's', median: 'медиана', iqr: 'IQR' }[k]} = ${f(v)}`).join(', ');
      const d0 = S.describe(vals), d1 = S.describe(out);
      return `
      ${ui.head('Част II · 2.2 в', 'Мащабиране (нормализация и стандартизация)', 'Привеждане на признаците към сравним мащаб. Доходът е в хиляди, а стажът в десетки: без мащабиране методите, които използват разстояния, практически „виждат“ само дохода.')}
      ${base()}
      <div class="card">
        <div class="controls">${ui.select('v', ui.numOptions(), st.v, 'Признак')}${ui.seg('method', Object.entries(M).map(([v, l]) => ({ v, l })), st.method)}</div>
        <p><b>${M[st.method]}:</b> <code>${FORM[st.method]}</code><br><span class="small muted">Параметри за „${E.COL[st.v].label}“: ${params}</span></p>
        <div class="grid-2">
          ${ui.chart('Преди', E.chart.histogram({ values: vals, xLabel: E.label(st.v), legend: false, h: 260 }))}
          ${ui.chart('След', E.chart.histogram({ series: [{ values: out, color: E.C.gold, label: 'След' }], xLabel: 'мащабирана стойност', legend: false, h: 260 }))}
        </div>
        <div class="grid-4" style="margin-top:12px">
          ${ui.stat('Средно', `${f(d0.mean)} → ${f(d1.mean, 3)}`)}${ui.stat('Ст. отклонение', `${f(d0.std)} → ${f(d1.std, 3)}`)}${ui.stat('Мин. / макс.', `${f(d1.min, 2)} / ${f(d1.max, 2)}`)}${ui.stat('Скосеност', `${f(d0.skew, 2)} → ${f(d1.skew, 2)}`, 'не се променя')}
        </div>
        <div class="note small">Мащабирането е линейно: променя мерната единица и положението, но <b>не</b> и формата на разпределението. Скосеността остава същата. За промяна на формата → <a href="#/power">степенни трансформации</a>. ${st.method === 'minmax' ? 'Min-max е чувствително към екстремни стойности: една голяма стойност „свива“ всички останали към 0.' : ''}</div>
      </div>
      <div class="card">
        <h3>Всички количествени признаци: преди и след</h3>
        <div class="grid-2">
          ${ui.chart('Преди: различни мащаби', E.chart.boxplot({ groups: allRaw, h: 300 }))}
          ${ui.chart(`След: ${M[st.method].toLowerCase()}`, E.chart.boxplot({ groups: allScaled.map(g => ({ ...g, color: E.C.gold })), h: 300 }))}
        </div>
        ${E.code(`from sklearn.preprocessing import MinMaxScaler, StandardScaler, RobustScaler
num = ["age", "experience", "height", "weight", "income"]
scaler = ${{ minmax: 'MinMaxScaler()', zscore: 'StandardScaler()', robust: 'RobustScaler()' }[st.method]}
df[num] = scaler.fit_transform(df[num])
# Важно: при модели параметрите се изчисляват само върху обучаващите данни (fit), а после се прилагат към тестовите (transform).`)}
      </div>`;
    }
  });

  /* ---------- г) Степенни трансформации ---------- */
  E.page('power', {
    title: 'Степенни трансформации', st: { v: 'income', method: 'log' },
    render(st) {
      const rows = cleanRows();
      const M = { log: 'Логаритъм ln(x)', log1p: 'ln(1 + x)', sqrt: 'Корен квадратен √x', cbrt: 'Кубичен корен ∛x' };
      const vals = S.nums(rows.map(r => r[st.v]));
      const t = S.nums(E.T.power(vals, st.method));
      const lost = vals.length - t.length;
      const d0 = S.describe(vals), d1 = S.describe(t);
      return `
      ${ui.head('Част II · 2.2 г', 'Степенни трансформации (логаритъм, корен)', 'Нелинейни трансформации, които „свиват“ големите стойности повече от малките. Така дясно скосено разпределение става по-симетрично, а влиянието на екстремните стойности намалява.')}
      ${base()}
      <div class="card">
        <div class="controls">${ui.select('v', ui.numOptions(), st.v, 'Признак')}${ui.seg('method', Object.entries(M).map(([v, l]) => ({ v, l })), st.method)}</div>
        ${lost ? `<div class="note warn small">${lost} стойности не могат да се трансформират (логаритъм от 0 или от отрицателно число не съществува). За признаци с нули се ползва ln(1 + x).</div>` : ''}
        <div class="grid-2">
          ${ui.chart('Преди', E.chart.histogram({ values: vals, normal: true, bins: 24, xLabel: E.label(st.v), h: 270 }))}
          ${ui.chart(`След: ${M[st.method]}`, E.chart.histogram({ series: [{ values: t, color: E.C.gold, label: 'Честота' }], normal: true, bins: 24, xLabel: M[st.method], h: 270 }))}
        </div>
        <div class="grid-2" style="margin-top:12px">
          ${ui.chart('Q-Q преди', E.chart.qq({ values: vals, h: 240, w: 420 }))}
          ${ui.chart('Q-Q след', E.chart.qq({ values: t, h: 240, w: 420 }))}
        </div>
        <div class="grid-4" style="margin-top:12px">
          ${ui.stat('Скосеност', `${f(d0.skew, 2)} → ${f(d1.skew, 2)}`, '', E.interpSkew(d1.skew), Math.abs(d1.skew) < Math.abs(d0.skew) ? 'gold' : '')}
          ${ui.stat('Ексцес', `${f(d0.kurt, 2)} → ${f(d1.kurt, 2)}`, '', E.interpKurt(d1.kurt))}
          ${ui.stat('Екстремни (IQR)', `${vals.filter(v => v < S.fences(vals).lo || v > S.fences(vals).hi).length} → ${t.filter(v => v < S.fences(t).lo || v > S.fences(t).hi).length}`)}
          ${ui.stat('Обратно преобразуване', { log: 'eˣ', log1p: 'eˣ − 1', sqrt: 'x²', cbrt: 'x³' }[st.method], 'за тълкуване на резултатите')}
        </div>
        <div class="note small">Логаритъмът е най-силен, коренът квадратен е по-мек. При лявo скосени признаци трансформацията се прилага към (max + 1 − x). Обобщение на тези трансформации е трансформацията на Бокс–Кокс (Box-Cox), която подбира степента автоматично.</div>
        ${E.code(`import numpy as np
df["${st.v}_t"] = np.${{ log: 'log', log1p: 'log1p', sqrt: 'sqrt', cbrt: 'cbrt' }[st.method]}(df["${st.v}"])
df[["${st.v}", "${st.v}_t"]].skew()
# Бокс–Кокс (само за положителни стойности):
from scipy import stats
df["${st.v}_bc"], lam = stats.boxcox(df["${st.v}"])`)}
      </div>`;
    }
  });

  /* ---------- д) Кодиране ---------- */
  E.page('encoding', {
    title: 'Кодиране', st: { gender: 'onehot', city: 'onehot', education: 'ordinal', drop: 'no' },
    render(st) {
      const rows = cleanRows().slice(0, 10);
      const all = cleanRows();
      const cols = [];
      const enc = {};
      const catVals = k => { const vals = E.COL[k].values.filter(v => all.some(r => r[k] === v)).sort((a, b) => a.localeCompare(b, 'bg')); if (all.some(r => r[k] === 'Неизвестно')) vals.push('Неизвестно'); return vals; };
      E.CATEGORICAL.forEach(k => {
        const m = st[k], vals = catVals(k);
        if (m === 'onehot') {
          const use = st.drop === 'yes' ? vals.slice(1) : vals;
          use.forEach(v => cols.push({ k, v, l: `${E.COL[k].label}_${v}` }));
          enc[k] = r => use.map(v => (r[k] === v ? 1 : 0));
        } else if (m === 'label') {
          const sorted = [...vals].sort((a, b) => a.localeCompare(b, 'bg'));
          cols.push({ k, l: `${E.COL[k].label} (етикет)` });
          enc[k] = r => [sorted.indexOf(r[k])];
          enc[k].map = sorted;
        } else {
          cols.push({ k, l: `${E.COL[k].label} (ред)` });
          enc[k] = r => [E.EDU.indexOf(r[k])];
          enc[k].map = E.EDU;
        }
      });
      const before = 3, after = cols.length;
      const opt = (k, list) => ui.select(k, list, st[k], E.COL[k].label);
      const maps = E.CATEGORICAL.filter(k => enc[k].map).map(k => `<div class="enc"><b>${E.COL[k].label}:</b> ${enc[k].map.map((v, i) => `${E.esc(v)} → ${i}`).join(' · ')}</div>`).join('');
      const warn = [];
      if (st.city === 'label') warn.push('Град е номинален признак: етикетите внушават, че например „Русе“ (4) е „между“ „Пловдив“ (3) и „София“ (5). Линейните модели и KNN ще използват тази фалшива подредба.');
      if (st.gender === 'label') warn.push('При два класа етикетното кодиране е равносилно на една двоична колона и е приемливо.');
      if (st.education === 'onehot') warn.push('При one-hot кодиране на образованието се губи информацията, че степените са подредени.');
      if (st.education === 'label') warn.push('Етикетното кодиране подрежда образованието по азбучен ред (Бакалавър, Доктор, Магистър, …), а не по степен. Използвайте порядково кодиране.');
      return `
      ${ui.head('Част II · 2.2 д', 'Кодиране на категорийни признаци', 'Повечето алгоритми работят само с числа. Начинът на кодиране зависи от вида на признака: номинален или порядков.')}
      ${base()}
      <div class="card">
        <div class="controls">
          ${opt('gender', [{ v: 'onehot', l: 'One-hot' }, { v: 'label', l: 'Етикетно (label)' }])}
          ${opt('city', [{ v: 'onehot', l: 'One-hot' }, { v: 'label', l: 'Етикетно (label)' }])}
          ${opt('education', [{ v: 'ordinal', l: 'Порядково (ordinal)' }, { v: 'onehot', l: 'One-hot' }, { v: 'label', l: 'Етикетно (label)' }])}
          ${ui.select('drop', [{ v: 'no', l: 'Не' }, { v: 'yes', l: 'Да (drop_first)' }], st.drop, 'Премахни първата one-hot колона')}
        </div>
        <div class="grid-3">
          ${ui.stat('Категорийни колони преди', before)}
          ${ui.stat('Числови колони след', after, '', after > 8 ? 'One-hot кодирането увеличава размерността: по една колона на категория.' : '', after > 8 ? 'gold' : '')}
          ${ui.stat('Капан на фиктивните променливи', st.drop === 'yes' ? 'избегнат' : 'възможен', '', 'При one-hot сумата на колоните на признак е винаги 1. За линейна регресия една колона е излишна (мултиколинеарност); премахва се с drop_first.')}
        </div>
        ${warn.map(w => `<div class="note small">${w}</div>`).join('')}
        ${maps}
        <h3 style="margin-top:16px">Първите 10 записа след кодирането</h3>
        <div class="table-wrap"><table class="data compact"><thead><tr><th>Пол</th><th>Град</th><th>Образование</th>${cols.map(c => `<th class="num" style="background:var(--navy-2)">${E.esc(c.l)}</th>`).join('')}</tr></thead><tbody>
          ${rows.map(r => `<tr><td>${E.esc(r.gender)}</td><td>${E.esc(r.city)}</td><td>${E.esc(r.education)}</td>${E.CATEGORICAL.flatMap(k => enc[k](r)).map(v => `<td class="num" ${v === 1 && cols.length > 3 ? 'style="font-weight:700;color:var(--navy)"' : ''}>${v}</td>`).join('')}</tr>`).join('')}
        </tbody></table></div>
        ${E.code(`# One-hot
df = pd.get_dummies(df, columns=["gender", "city"]${st.drop === 'yes' ? ', drop_first=True' : ''})
# Порядково кодиране с изричен ред
order = ["Основно", "Средно", "Бакалавър", "Магистър", "Доктор"]
df["education"] = pd.Categorical(df["education"], categories=order, ordered=True).codes
# Етикетно кодиране (scikit-learn, азбучен ред)
from sklearn.preprocessing import LabelEncoder
df["city_label"] = LabelEncoder().fit_transform(df["city"])`)}
      </div>`;
    }
  });

  /* ---------- е) Дискретизация ---------- */
  E.page('binning', {
    title: 'Дискретизация', st: { v: 'age', method: 'custom', k: 4 },
    render(st) {
      const rows = cleanRows();
      const vals = S.nums(rows.map(r => r[st.v]));
      const CUSTOM = { age: [0, 30, 45, 60, Infinity], experience: [0, 5, 15, 30, Infinity], income: [0, 1000, 1500, 2500, Infinity], height: [0, 160, 170, 180, Infinity], weight: [0, 60, 75, 90, Infinity] };
      const CL = { age: ['до 29', '30–44', '45–59', '60+'], experience: ['до 4', '5–14', '15–29', '30+'], income: ['до 999 €', '1000–1499 €', '1500–2499 €', '2500+ €'], height: ['под 160', '160–169', '170–179', '180+'], weight: ['под 60', '60–74', '75–89', '90+'] };
      const d = E.T.discretize(vals, st.method, st.k, CUSTOM[st.v]);
      const labels = st.method === 'custom' ? CL[st.v] : d.labels;
      const assignIdx = x => { for (let i = 0; i < d.edges.length - 1; i++) if (x < d.edges[i + 1] || i === d.edges.length - 2) return i; return -1; };
      const counts = labels.map(() => 0);
      vals.forEach(x => { const i = assignIdx(x); if (i >= 0) counts[i]++; });
      const M = { width: 'Равни интервали (equal width)', quantile: 'Равни честоти (квантили)', custom: 'Предметни граници' };
      return `
      ${ui.head('Част II · 2.2 е', 'Дискретизация (binning)', 'Превръщане на количествен признак в порядков: стойностите се групират в интервали. Използва се за по-лесно тълкуване, за намаляване на шума и за модели, които работят с категории.')}
      ${base()}
      <div class="card">
        <div class="controls">${ui.select('v', ui.numOptions(), st.v, 'Признак')}${ui.seg('method', Object.entries(M).map(([v, l]) => ({ v, l })), st.method)}${st.method !== 'custom' ? ui.range('k', 2, 10, 1, st.k, 'Брой интервали') : ''}</div>
        <div class="grid-2">
          ${ui.chart('Изходно разпределение с границите на интервалите', E.chart.histogram({ values: vals, bins: 24, xLabel: E.label(st.v), markers: d.edges.filter(Number.isFinite).slice(1, -1).map(e => ({ x: e, label: 'граница', color: E.C.red, dash: '4 3' })), legend: false, h: 280 }))}
          ${ui.chart('Брой записи в интервал', E.chart.bar({ labels, values: counts, color: E.C.gold, rotate: labels.length > 5, h: 280 }))}
        </div>
        ${ui.table(['Интервал', 'Граници', { l: 'Записи', num: true }, { l: 'Дял', num: true }], labels.map((l, i) => [`<b>${E.esc(l)}</b>`, `[${f(d.edges[i])}; ${Number.isFinite(d.edges[i + 1]) ? f(d.edges[i + 1]) : '∞'})`, counts[i], E.pct(counts[i] / vals.length)]), { cls: 'compact' })}
        <div class="note small"><b>Равни интервали</b>: еднаква ширина, но различен брой записи; чувствителни към екстремни стойности. <b>Равни честоти</b>: приблизително еднакъв брой записи във всеки интервал. <b>Предметни граници</b>: определени от смисъла, например възрастови групи; най-лесни за тълкуване.</div>
        ${E.code(st.method === 'quantile' ? `df["${st.v}_bin"] = pd.qcut(df["${st.v}"], q=${st.k})` : st.method === 'width' ? `df["${st.v}_bin"] = pd.cut(df["${st.v}"], bins=${st.k})` : `df["${st.v}_group"] = pd.cut(df["${st.v}"], bins=[${CUSTOM[st.v].map(x => (Number.isFinite(x) ? x : 'np.inf')).join(', ')}],
                         labels=[${CL[st.v].map(x => `"${x}"`).join(', ')}], right=False)`)}
      </div>`;
    }
  });

  /* ---------- ж) Нов признак ---------- */
  E.page('feature', {
    title: 'Нов признак',
    render() {
      const rows = cleanRows().filter(r => S.isNum(r.weight) && S.isNum(r.height));
      const bmi = rows.map(r => r.weight / (r.height / 100) ** 2);
      const CAT = [['Поднормено', 0, 18.5], ['Нормално', 18.5, 25], ['Наднормено', 25, 30], ['Затлъстяване', 30, Infinity]];
      const counts = CAT.map(([, a, b]) => bmi.filter(x => x >= a && x < b).length);
      const pr = (a, b) => S.pearson(a, b);
      const w = rows.map(r => r.weight), h = rows.map(r => r.height);
      const inc = cleanRows().filter(r => S.isNum(r.income) && S.isNum(r.experience));
      return `
      ${ui.head('Част II · 2.2 ж', 'Конструиране на нови признаци (feature engineering)', 'Създаване на нов признак от съществуващите, когато комбинацията носи повече смисъл от всеки поотделно. Пример: индекс на телесната маса (ИТМ) от тегло и височина.')}
      ${base()}
      <div class="card">
        <p><b>ИТМ</b> <code>= тегло (kg) / височина² (m²)</code>. Теглото само по себе си зависи от височината; ИТМ отделя „пълнотата“ от ръста.</p>
        <div class="grid-2">
          ${ui.chart('Разпределение на ИТМ', E.chart.histogram({ values: bmi, bins: 22, normal: true, xLabel: 'ИТМ (kg/m²)', markers: [{ x: 18.5, label: '18,5', color: E.C.red, dash: '4 3' }, { x: 25, label: '25', color: E.C.red, dash: '4 3' }, { x: 30, label: '30', color: E.C.red, dash: '4 3' }], legend: false, h: 280 }))}
          ${ui.chart('Категории по ИТМ (СЗО)', E.chart.bar({ labels: CAT.map(c => c[0]), values: counts, color: [E.C.navy3, E.C.navy2, E.C.gold, '#a4502e'], h: 280 }))}
        </div>
        <div class="grid-3" style="margin-top:12px">
          ${ui.stat('r(тегло, височина)', f(pr(w, h), 2), '', 'Теглото силно зависи от ръста.')}
          ${ui.stat('r(ИТМ, височина)', f(pr(bmi, h), 2), '', 'ИТМ почти не зависи от ръста: носи нова информация.', 'gold')}
          ${ui.stat('r(ИТМ, тегло)', f(pr(bmi, w), 2))}
        </div>
        <h3 style="margin-top:18px">Други примери за нови признаци в този набор</h3>
        <ul class="tight">
          <li><b>Възраст при започване на работа</b> = възраст − стаж</li>
          <li><b>Доход на година стаж</b> = доход / (стаж + 1); среден за набора: ${f(S.mean(inc.map(r => r.income / (r.experience + 1))))} €</li>
          <li><b>Годишен доход</b> = месечен доход × 12</li>
          <li><b>Живее в столицата</b> = 1, ако град = София, иначе 0</li>
          <li>От дата (ако имаше): ден от седмицата, месец, сезон, работен или почивен ден</li>
        </ul>
        ${E.code(`df["bmi"] = df["weight"] / (df["height"] / 100) ** 2
df["bmi_cat"] = pd.cut(df["bmi"], bins=[0, 18.5, 25, 30, np.inf],
                       labels=["Поднормено", "Нормално", "Наднормено", "Затлъстяване"], right=False)
df["start_age"] = df["age"] - df["experience"]
df["is_capital"] = (df["city"] == "София").astype(int)`)}
      </div>`;
    }
  });

  /* ---------- з) Редуциране на размерността ---------- */
  E.page('reduction', {
    title: 'Редуциране на размерността', st: { thr: 0.8, log: true, color: 'education' },
    render(st) {
      const rows = cleanRows().filter(r => E.NUMERIC.every(k => S.isNum(r[k])) && (!st.log || r.income > 0));
      const keys = E.NUMERIC;
      const X = rows.map(r => keys.map(k => (k === 'income' && st.log ? Math.log(r.income) : r[k])));
      const pca = S.pca(X);
      const labels = keys.map(k => (k === 'income' && st.log ? 'ln(Доход)' : E.COL[k].label));
      let cum = 0, need = 0;
      pca.explained.some((e, i) => { cum += e; need = i + 1; return cum >= 0.9; });
      const pairs = [];
      keys.forEach((a, i) => keys.forEach((b, j) => { if (j > i && Math.abs(pca.corr[i][j]) >= st.thr) pairs.push([i, j, pca.corr[i][j]]); }));
      const meanAbs = i => S.mean(pca.corr[i].filter((_, j) => j !== i).map(Math.abs));
      const gk = st.color;
      const groups = E.COL[gk].values.filter(v => rows.some(r => r[gk] === v)).map(v => ({ key: v, label: v, color: E.colorOfCat(gk, v) }));
      const pts = pca.scores.map((s, i) => ({ x: s[0], y: s[1], g: rows[i][gk], tip: `Ред ${rows[i]._row}: PC1 = ${f(s[0], 2)}, PC2 = ${f(s[1], 2)}` }));
      return `
      ${ui.head('Част II · 2.2 з', 'Редуциране на размерността', 'По-малко признаци с минимална загуба на информация. Два подхода: <b>подбор на признаци</b> (премахваме излишните) и <b>извличане на признаци</b> (комбинираме ги в нови, например с анализ на главните компоненти, PCA).')}
      ${base()}
      <div class="card">
        <h2>1. Подбор на признаци (feature selection)</h2>
        <ul class="tight">
          <li><b>Нерелевантни признаци</b>: ID и константата „Държава“ ${E.state.cfg.irrelevant === 'drop' ? 'вече са премахнати в 2.1 (стъпка 3)' : 'все още не са премахнати; изберете това в 2.1, стъпка 3'}.</li>
          <li><b>Признаци с ниска дисперсия</b>: почти константни признаци носят малко информация.</li>
          <li><b>Силно корелирани признаци</b>: ако два признака са почти линейно зависими, единият е излишен.</li>
        </ul>
        <div class="controls">${ui.range('thr', 0.5, 0.95, 0.05, st.thr, 'Праг за |r|')}</div>
        ${pairs.length ? ui.table(['Двойка', { l: 'r', num: true }, 'Предложение'], pairs.map(([i, j, r]) => { const drop = meanAbs(i) >= meanAbs(j) ? i : j; return [`${labels[i]} – ${labels[j]}`, f(r, 3), `Премахване на <b>${labels[drop]}</b> (по-силно свързан с останалите)`]; }), { cls: 'compact' }) : `<p class="muted small">Няма двойки с |r| ≥ ${f(st.thr, 2)}.</p>`}
        ${E.code(`corr = df[num].corr().abs()
upper = corr.where(np.triu(np.ones(corr.shape), k=1).astype(bool))
to_drop = [c for c in upper.columns if (upper[c] >= ${st.thr}).any()]
df = df.drop(columns=to_drop)
# Ниска дисперсия: from sklearn.feature_selection import VarianceThreshold`)}
      </div>
      <div class="card">
        <h2>2. Анализ на главните компоненти (Principal Component Analysis, PCA)</h2>
        <p class="small">PCA построява нови, некорелирани признаци (главни компоненти) като линейни комбинации на стандартизираните изходни признаци. Първата компонента обяснява най-голяма част от дисперсията, втората най-голяма от останалата и т.н. Изчислено върху ${rows.length} пълни записа и ${keys.length} признака.</p>
        <div class="controls">${ui.check('log', st.log, 'Логаритъм на дохода преди PCA')}${ui.select('color', ui.catOptions(['education', 'gender', 'city']), st.color, 'Оцвети по клас')}</div>
        <div class="grid-2">
          ${ui.chart('Обяснена дисперсия (scree plot)', E.chart.scree({ explained: pca.explained, threshold: 0.9 }))}
          ${ui.chart('Записите в пространството на PC1 и PC2', E.chart.scatter({ points: pts, groups, xLabel: `PC1 (${E.pct(pca.explained[0])})`, yLabel: `PC2 (${E.pct(pca.explained[1])})`, r: 3.5 }))}
        </div>
        <div class="grid-3" style="margin-top:12px">
          ${ui.stat('Компоненти за 90% от дисперсията', `${need} от ${keys.length}`, '', `Размерността намалява от ${keys.length} на ${need} при загуба на около ${E.pct(1 - cum, 0)} от информацията.`, 'gold')}
          ${ui.stat('PC1 + PC2', E.pct(pca.explained[0] + pca.explained[1]), 'натрупан дял', 'Колко от разнообразието се вижда на двумерната диаграма.')}
          ${ui.stat('Собствени стойности', pca.eig.map(e => f(e.value, 2)).join(' · '), 'правило на Кайзер: λ > 1', `Компоненти с λ > 1: ${pca.eig.filter(e => e.value > 1).length}`)}
        </div>
        <h3 style="margin-top:16px">Тегла на признаците в компонентите (loadings)</h3>
        <div class="table-wrap"><table class="data compact"><thead><tr><th>Признак</th>${pca.eig.map((_, i) => `<th class="num">PC${i + 1}</th>`).join('')}</tr></thead><tbody>
          ${labels.map((l, j) => `<tr><td><b>${l}</b></td>${pca.eig.map(e => { const v = e.vector[j]; return `<td class="num" style="${Math.abs(v) >= 0.5 ? 'font-weight:700;color:var(--navy);background:var(--gold-soft)' : ''}">${f(v, 2)}</td>`; }).join('')}</tr>`).join('')}
        </tbody></table></div>
        <p class="small muted" style="margin-top:8px">Оцветени са теглата с |w| ≥ 0,5. Например компонента с големи тегла на възрастта и стажа може да се тълкува като „житейски опит“, а такава с тегло и височина като „телесни размери“.</p>
        <div class="note small">Преди PCA признаците задължително се стандартизират, иначе доходът (в хиляди) ще доминира първата компонента. Новите компоненти са по-трудни за тълкуване от изходните признаци.</div>
        ${E.code(`from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
num = ["age", "experience", "height", "weight", "income"]
X = df[num].dropna().copy()
${st.log ? 'X["income"] = np.log(X["income"])\n' : ''}Z = StandardScaler().fit_transform(X)
pca = PCA().fit(Z)
pca.explained_variance_ratio_          # дял на всяка компонента
pca.explained_variance_ratio_.cumsum() # натрупан дял
scores = PCA(n_components=${need}).fit_transform(Z)
loadings = pd.DataFrame(pca.components_.T, index=num, columns=[f"PC{i+1}" for i in range(len(num))])`)}
      </div>`;
    }
  });
})(window.EDA);
