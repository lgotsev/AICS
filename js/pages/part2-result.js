/* Част II · 2.3 Резултат: сравнение преди / след, сваляне на данните и на кода */
(function (E) {
  const S = E.S, ui = E.ui, f = E.fmt;

  /* ---------- Тетрадка за Google Colab ---------- */
  const DATA_URL = 'https://aics-sigma.vercel.app/data/survey_raw.csv';

  const PY = {
    setup: `import re
import numpy as np
import pandas as pd
from difflib import get_close_matches

NUM = ["age", "experience", "height", "weight", "income"]
CAT = ["gender", "education", "city"]
VALID = {
    "gender": ["М", "Ж"],
    "education": ["Основно", "Средно", "Бакалавър", "Магистър", "Доктор"],
    "city": ["София", "Пловдив", "Варна", "Бургас", "Русе", "Стара Загора", "Плевен"],
}

def round_half_up(s, d=0):
    """Закръгляне с 0,5 нагоре, както в приложението."""
    k = 10.0 ** d
    return np.floor(s * k + 0.5) / k

DIGITS = {"age": 0, "experience": 0, "height": 0, "weight": 1, "income": -1}

def round_where(df, mask):
    """Закръгля само запълнените или ограничените клетки: възраст, стаж и височина
    до цяло число, тегло до 1 знак, доход до 10 €."""
    for col, d in DIGITS.items():
        if col in df and col in mask:
            df.loc[mask[col], col] = round_half_up(df.loc[mask[col], col], d)
    return df

def invalid_mask(df):
    """True там, където стойността нарушава речника на данните."""
    m = pd.DataFrame(False, index=df.index, columns=df.columns)
    for col, vals in VALID.items():
        m[col] = df[col].notna() & ~df[col].isin(vals + ["Неизвестно"])
    age_ok = df["age"].between(0, 110)
    m["age"] = df["age"].notna() & ~age_ok
    m["height"] = df["height"].notna() & ~df["height"].between(100, 230)
    m["weight"] = df["weight"].notna() & ~df["weight"].between(30, 250)
    m["income"] = df["income"] < 0
    m["experience"] = df["experience"].notna() & (
        ~df["experience"].between(0, 60) | (age_ok & (df["experience"] > df["age"] - 14))
    )
    return m`,

    load: `URL = "${DATA_URL}"
try:
    df = pd.read_csv(URL)
    print("Данните са заредени от сайта.")
except Exception as err:
    print("Неуспешно зареждане от сайта:", err)
    print("Качете файла survey_raw.csv, свален от страница 2.3 на приложението.")
    from google.colab import files
    uploaded = files.upload()
    df = pd.read_csv(next(iter(uploaded)))

print("Записи и признаци:", df.shape)
df.head(17)`,

    overview: `df.info()
print("\\nЛипсващи стойности по признак:")
print(df.isna().sum())
print("\\nСтойности, които нарушават речника на данните:")
print(invalid_mask(df).sum())
print("\\nТочни дубликати:", df.duplicated().sum())
print("Повторения по съдържание (без id):", df.drop(columns="id").duplicated().sum())`,

    errors: {
      fix: `SYNONYMS = {"мъж": "М", "жена": "Ж"}
LAT = str.maketrans("abvgdezijklmnoprstufhcy", "абвгдезийклмнопрстуфхцъ")

def translit(s):
    s = s.lower()
    for a, b in [("sht", "щ"), ("zh", "ж"), ("sh", "ш"), ("ch", "ч"), ("ts", "ц"), ("yu", "ю"), ("ya", "я")]:
        s = s.replace(a, b)
    s = re.sub(r"ia$", "ия", s)
    return s.translate(LAT)

def fix_category(v, valid):
    if pd.isna(v) or v in valid:
        return v
    t = str(v).strip()                                    # излишни интервали
    for d in valid:
        if t.lower() == d.lower():                        # различен регистър
            return d
    if SYNONYMS.get(t.lower()) in valid:                  # друго кодиране („Мъж“)
        return SYNONYMS[t.lower()]
    if re.search("[a-zA-Z]", t):                          # латиница вместо кирилица
        for d in valid:
            if translit(t) == d.lower():
                return d
    if len(t) > 3:                                        # правописна грешка: най-сходната допустима стойност
        close = get_close_matches(t, valid, n=1, cutoff=0.8)
        if close:
            return close[0]
    return v                                              # без надеждна корекция

before = df.copy()
for col, valid in VALID.items():
    df[col] = df[col].apply(fix_category, valid=valid)

# Грешна мерна единица: височина в метри вместо в сантиметри
df.loc[df["height"] < 3, "height"] = round_half_up(df["height"] * 100)

# Останалите нарушения (невъзможни, отрицателни, нелогични стойности) стават NaN
bad = invalid_mask(df)
for col in bad.columns[bad.any()]:
    df.loc[bad[col], col] = np.nan

changed = (before != df) & ~(before.isna() & df.isna())
print("Коригирани клетки:", int((changed & df.notna()).sum().sum()))
print("Превърнати в NaN:", int(bad.sum().sum()))`,
      nan: `bad = invalid_mask(df)
print("Грешни стойности:", int(bad.sum().sum()))
for col in bad.columns[bad.any()]:
    df.loc[bad[col], col] = np.nan`,
      drop: `bad = invalid_mask(df)
n0 = len(df)
df = df[~bad.any(axis=1)]
print("Премахнати записи с грешки:", n0 - len(df))`,
      none: `print("Грешките остават:", int(invalid_mask(df).sum().sum()))`
    },

    duplicates: {
      all: `n0 = len(df)
df = df.drop_duplicates()                                  # точни дубликати
df = df.drop_duplicates(subset=df.columns.drop("id"))      # повторения по съдържание (различен id)
print("Премахнати дубликати:", n0 - len(df))`,
      exact: `n0 = len(df)
df = df.drop_duplicates()
print("Премахнати точни дубликати:", n0 - len(df))`,
      none: `print("Дубликатите остават:", df.drop(columns="id").duplicated().sum())`
    },

    irrelevant: {
      drop: `ids = df.pop("id")                                # id не участва в анализа; пазим го само за идентификация
constant = df.columns[df.nunique(dropna=False) <= 1]
df = df.drop(columns=constant)
print("Премахнати константни признаци:", list(constant))`,
      none: 'print("Признаците остават:", list(df.columns))'
    },

    outliers: {
      none: `for col in NUM:
    q1, q3 = df[col].quantile([0.25, 0.75])
    iqr = q3 - q1
    n = ((df[col] < q1 - 1.5 * iqr) | (df[col] > q3 + 1.5 * iqr)).sum()
    print(f"{col}: {n} екстремни стойности (запазват се)")`,
      cap: `before = df[NUM].copy()
for col in NUM:
    q1, q3 = df[col].quantile([0.25, 0.75])
    iqr = q3 - q1
    lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    n = ((df[col] < lo) | (df[col] > hi)).sum()
    df[col] = df[col].clip(lo, hi)
    print(f"{col}: ограничени {n} стойности до [{lo:.1f}; {hi:.1f}]")
df = round_where(df, (df[NUM] != before) & before.notna())`,
      remove: `q1, q3 = df[NUM].quantile(0.25), df[NUM].quantile(0.75)
iqr = q3 - q1
outside = (df[NUM] < q1 - 1.5 * iqr) | (df[NUM] > q3 + 1.5 * iqr)
n0 = len(df)
df = df[~outside.any(axis=1)]
print("Премахнати записи с екстремни стойности:", n0 - len(df))`
    },

    missingNum: {
      median: 'df[NUM] = df[NUM].fillna(df[NUM].median())',
      mean: 'df[NUM] = df[NUM].fillna(df[NUM].mean())',
      group: `GROUP = {"height": "gender", "weight": "gender", "income": "education", "age": "education", "experience": "education"}
src = df.copy()
for col, g in GROUP.items():
    group_median = src.groupby(g)[col].transform("median")
    df[col] = df[col].fillna(group_median).fillna(src[col].median())   # ако групата е неизвестна – общата медиана`,
      knn: `from sklearn.impute import KNNImputer
mean, std = df[NUM].mean(), df[NUM].std()
Z = (df[NUM] - mean) / std                                  # стандартизация преди търсенето на съседи
df[NUM] = KNNImputer(n_neighbors=5).fit_transform(Z) * std.values + mean.values`,
      drop: `n0 = len(df)
df = df.dropna(subset=NUM)
print("Премахнати записи с липсващи количествени стойности:", n0 - len(df))`,
      none: 'print("Липсващите количествени стойности остават:", int(df[NUM].isna().sum().sum()))'
    },

    consistency: `df = round_where(df, was_na)
# Проверка за съгласуваност след запълването: стажът не може да е по-голям от възрастта − 14
bad = df["experience"] > df["age"] - 14
only_age = was_na["age"] & ~was_na["experience"]
df.loc[bad & only_age, "age"] = df["experience"] + 14
df.loc[bad & ~only_age, "experience"] = (df["age"] - 14).clip(lower=0)
print("Съгласувани стойности:", int(bad.sum()))`,

    missingCat: {
      mode: 'for col in CAT:\n    df[col] = df[col].fillna(df[col].mode()[0])',
      unknown: 'df[CAT] = df[CAT].fillna("Неизвестно")',
      drop: `n0 = len(df)
df = df.dropna(subset=CAT)
print("Премахнати записи с липсващи категорийни стойности:", n0 - len(df))`,
      none: 'print("Липсващите категорийни стойности остават:", int(df[CAT].isna().sum().sum()))'
    },

    save: `if "id" not in df:
    df.insert(0, "id", ids)                               # връщаме номера на записа
df.to_csv("survey_clean.csv", index=False, encoding="utf-8-sig")
try:
    from google.colab import files
    files.download("survey_clean.csv")
except ImportError:
    print("Файлът survey_clean.csv е записан в текущата папка.")`
  };

  function notebookCells(cfg) {
    const OPT = E.CLEAN_OPTIONS;
    const o = (k, v) => OPT[k].find(x => x.v === v);
    const c = E.cleaned();
    const means = E.NUMERIC.map(k => `    "${k}": ${S.mean(S.nums(c.rows.map(r => r[k]))).toFixed(2)},`).join('\n');
    const md = t => ({ type: 'markdown', src: t });
    const code = t => ({ type: 'code', src: t });
    const methodMd = (n, title, k, v, extra) => md(`## ${n}. ${title}\n\n**Избран метод:** ${o(k, v).l}\n\n${o(k, v).d}${o(k, v).p ? `\n\n*${o(k, v).p}*` : ''}${extra ? '\n\n' + extra : ''}`);
    const numImputed = cfg.missingNum !== 'none' && cfg.missingNum !== 'drop';
    return [
      md(`# Подготовка на данните за анализ\n\nТетрадката е генерирана от **EDA Лаборатория** (страница 2.3) и повтаря почистването с методите, избрани в 2.1.\n\n**Как се работи:** изпълнявайте клетките една по една отгоре надолу (Shift + Enter). Ред на стъпките: грешки → дубликати → нерелевантни признаци → екстремни стойности → липсващи стойности.`),
      md('## 0. Подготовка\n\nБиблиотеки, речник на допустимите стойности и помощни функции.'),
      code(PY.setup),
      md(`## Зареждане на суровите данни\n\nДанните се четат директно от сайта на приложението. Ако няма връзка, клетката ще поиска да качите файла \`survey_raw.csv\` (бутон „Сурови данни (CSV)“ на страница 2.3).`),
      code(PY.load),
      md('## Първи поглед (диагноза)\n\nКолко са липсващите стойности, нарушенията на речника и дубликатите преди почистването.'),
      code(PY.overview),
      methodMd(1, 'Грешки в данните', 'errors', cfg.errors),
      code(PY.errors[cfg.errors]),
      methodMd(2, 'Дублирани записи', 'duplicates', cfg.duplicates, 'Проверката е след корекцията на грешките, защото корекциите могат да разкрият нови дубликати.'),
      code(PY.duplicates[cfg.duplicates]),
      methodMd(3, 'Нерелевантни признаци', 'irrelevant', cfg.irrelevant),
      code(PY.irrelevant[cfg.irrelevant]),
      methodMd(4, 'Екстремни стойности', 'outliers', cfg.outliers, 'Правило на IQR: екстремна е стойност под Q1 − 1,5·IQR или над Q3 + 1,5·IQR.'),
      code(PY.outliers[cfg.outliers]),
      methodMd(5, 'Липсващи стойности: количествени признаци', 'missingNum', cfg.missingNum),
      code((numImputed ? 'was_na = df[NUM].isna()   # запомняме кои клетки ще бъдат запълнени\n' : '') + PY.missingNum[cfg.missingNum] + (numImputed ? '\n\n' + PY.consistency : '')),
      methodMd(5, 'Липсващи стойности: категорийни признаци', 'missingCat', cfg.missingCat),
      code(PY.missingCat[cfg.missingCat]),
      md(`## Проверка\n\nСлед почистването данните трябва да нямат липсващи стойности, нарушения на речника и дубликати. Средните стойности се сравняват с тези в приложението.${cfg.missingNum === 'knn' ? '\n\n*При KNN са възможни минимални разлики заради равни разстояния между съседи.*' : ''}`),
      code(`print("Записи:", len(df), "| в приложението: ${c.rows.length}")
print("Липсващи стойности:", int(df.isna().sum().sum()))
print("Нарушения на речника:", int(invalid_mask(df).sum().sum()))
print("Дубликати:", df.duplicated().sum())

expected = pd.Series({
${means}
})
comparison = pd.DataFrame({"тетрадка": df[NUM].mean().round(2), "приложение": expected})
comparison["съвпада"] = (comparison["тетрадка"] - comparison["приложение"]).abs() < 0.01
comparison`),
      code('df.describe().round(2)'),
      md('## Запис на почистените данни'),
      code(PY.save)
    ];
  }

  function notebook(cfg) {
    const lines = t => { const a = t.split('\n'); return a.map((l, i) => (i < a.length - 1 ? l + '\n' : l)); };
    return JSON.stringify({
      cells: notebookCells(cfg).map(c => (c.type === 'markdown'
        ? { cell_type: 'markdown', metadata: {}, source: lines(c.src) }
        : { cell_type: 'code', execution_count: null, metadata: {}, outputs: [], source: lines(c.src) })),
      metadata: { colab: { provenance: [], name: 'eda_cleaning.ipynb' }, kernelspec: { name: 'python3', display_name: 'Python 3' }, language_info: { name: 'python' } },
      nbformat: 4, nbformat_minor: 0
    }, null, 1);
  }
  const notebookPreview = cfg => notebookCells(cfg).filter(c => c.type === 'code').map(c => c.src).join('\n\n# ' + '-'.repeat(60) + '\n\n');
  E.notebook = notebook;

  function toCSV(rows, cols) {
    const q = v => (v === null || v === undefined ? '' : typeof v === 'number' ? String(v) : /[",\n;]/.test(v) || v !== v.trim() ? `"${String(v).replace(/"/g, '""')}"` : v);
    return '﻿' + [cols.join(',')].concat(rows.map(r => cols.map(k => q(r[k])).join(','))).join('\n');
  }
  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  E.page('result', {
    title: 'Резултат',
    render() {
      const cfg = E.state.cfg;
      const c = E.cleaned();
      const a0 = E.rawAnalysis(), a1 = E.analyze(c.rows, c.columns);
      const L = c.log;
      const OPT = E.CLEAN_OPTIONS;
      const lab = (k, v) => OPT[k].find(o => o.v === v).l;
      const cmp = (label, b, a, good) => `<tr><td>${label}</td><td class="num">${b}</td><td class="num"><b>${a}</b></td><td>${good ? '✓' : ''}</td></tr>`;
      const numRows = E.NUMERIC.map(k => {
        const d0 = S.describe(E.RAW.map(r => r[k])), d1 = S.describe(c.rows.map(r => r[k]));
        return [`<b>${E.label(k)}</b>`, `${f(d0.mean)} → <b>${f(d1.mean)}</b>`, `${f(d0.median)} → <b>${f(d1.median)}</b>`, `${f(d0.std)} → <b>${f(d1.std)}</b>`, `${f(d0.min)} … ${f(d0.max)} → <b>${f(d1.min)} … ${f(d1.max)}</b>`, `${f(d0.skew, 2)} → <b>${f(d1.skew, 2)}</b>`];
      });
      return `
      ${ui.head('Част II · 2.3', 'Резултат от подготовката', 'Сравнение на суровите и почистените данни. След почистването данните отново минават през проверката от Част I: това е повторната итерация в процеса.')}
      <div class="grid-2">
        <div class="card">
          <h3>Избрани методи</h3>
          <ol class="tight">
            <li>Грешки: <b>${lab('errors', cfg.errors)}</b> · ${L.errors.length} промени</li>
            <li>Дубликати: <b>${lab('duplicates', cfg.duplicates)}</b> · ${L.duplicates.length} премахнати</li>
            <li>Нерелевантни признаци: <b>${lab('irrelevant', cfg.irrelevant)}</b>${L.irrelevant.length ? ' · ' + L.irrelevant.map(k => E.COL[k].label).join(', ') : ''}</li>
            <li>Екстремни стойности: <b>${lab('outliers', cfg.outliers)}</b> · ${L.outliers.length} промени</li>
            <li>Липсващи: <b>${lab('missingNum', cfg.missingNum)}</b> / <b>${lab('missingCat', cfg.missingCat)}</b> · ${L.missing.length} промени</li>
          </ol>
          <a class="btn ghost" href="#/cleaning">← Промени методите</a>
        </div>
        <div class="card">
          <h3>Качество преди и след</h3>
          <div class="table-wrap"><table class="data compact"><thead><tr><th>Показател</th><th class="num">Сурови</th><th class="num">Почистени</th><th></th></tr></thead><tbody>
            ${cmp('Записи', E.RAW.length, c.rows.length)}
            ${cmp('Признаци', E.COLUMNS.length, c.columns.length)}
            ${cmp('Липсващи стойности', a0.totals.missing, a1.totals.missing, !a1.totals.missing)}
            ${cmp('Грешки в данните', a0.totals.errors, a1.totals.errors, !a1.totals.errors)}
            ${cmp('Дублирани записи', a0.totals.duplicates, a1.totals.duplicates, !a1.totals.duplicates)}
            ${cmp('Нерелевантни признаци', a0.totals.irrelevant, a1.totals.irrelevant, !a1.totals.irrelevant)}
            ${cmp('Екстремни стойности (IQR)', a0.totals.outliers, a1.totals.outliers)}
          </tbody></table></div>
          ${a1.totals.outliers ? `<p class="small muted" style="margin-top:8px">Екстремните стойности се оценяват наново върху почистените данни. ${cfg.outliers === 'cap' ? 'След ограничаването и запълването квартилите се променят и границите се изместват, затова някои ограничени стойности отново излизат малко извън новите граници.' : cfg.outliers === 'none' ? 'Те са запазени умишлено като реални случаи; за намаляване на влиянието им виж логаритмичната трансформация.' : ''}</p>` : ''}
        </div>
      </div>
      <div class="card">
        <h3>Описателни статистики: сурови → почистени</h3>
        ${ui.table(['Признак', 'Средно', 'Медиана', 'Ст. отклонение', 'Диапазон', 'Скосеност'], numRows, { cls: 'compact' })}
        <p class="small muted" style="margin-top:8px">Най-голяма е промяната там, където е имало невъзможни стойности: възрастта (156 и −3) и височината (1,64 m).</p>
      </div>
      <div class="card">
        <h3>Разпределения: сурови и почистени</h3>
        <div class="grid-2">${E.NUMERIC.map(k => {
          const b = S.nums(E.RAW.map(r => r[k])), a = S.nums(c.rows.map(r => r[k]));
          const lo = Math.min(...a), hi = Math.max(...a);
          return ui.chart(E.label(k), E.chart.histogram({ series: [{ values: b.filter(v => v >= lo && v <= hi), color: E.C.navy2, label: 'Сурови', opacity: 0.55 }, { values: a, color: E.C.gold, label: 'Почистени', opacity: 0.6 }], lo, hi, bins: 18, h: 250, xLabel: E.label(k) }) + (b.some(v => v < lo || v > hi) ? `<p class="small muted" style="margin:4px 6px">Извън показания диапазон остават сурови стойности: ${b.filter(v => v < lo || v > hi).map(v => f(v)).join('; ')}</p>` : ''));
        }).join('')}</div>
      </div>
      <div class="card">
        <h3>Сваляне</h3>
        <div class="row">
          <button class="btn" data-act="csvClean">Почистени данни (CSV)</button>
          <button class="btn ghost" data-act="csvRaw">Сурови данни (CSV)</button>
          <button class="btn gold" data-act="py">Тетрадка за Google Colab (.ipynb)</button>
        </div>
        <p class="small muted" style="margin-top:10px">CSV файловете са в UTF-8 и се отварят в Excel, pandas и R. Тетрадката повтаря избраните в 2.1 методи, зарежда данните директно от сайта и накрая сравнява резултата с приложението.</p>
        <div class="note navy small"><b>Отваряне в Colab:</b> colab.research.google.com → File → Upload notebook → изберете свалената тетрадка. Изпълнявайте клетките една по една с Shift + Enter.</div>
        ${E.code(notebookPreview(cfg), 'Преглед на кода в тетрадката')}
      </div>`;
    },
    actions: {
      csvClean() { const c = E.cleaned(); download('survey_clean.csv', toCSV(c.rows, ['id'].concat(c.columns.filter(k => k !== 'id'))), 'text/csv;charset=utf-8'); },
      csvRaw() { download('survey_raw.csv', toCSV(E.RAW, E.COLUMNS.map(c => c.key)), 'text/csv;charset=utf-8'); },
      py() { download('eda_cleaning.ipynb', notebook(E.state.cfg), 'application/x-ipynb+json;charset=utf-8'); }
    }
  });
})(window.EDA);
