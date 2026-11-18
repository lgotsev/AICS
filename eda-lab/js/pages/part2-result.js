/* Част II · 2.3 Резултат: сравнение преди / след, сваляне на данните и на кода */
(function (E) {
  const S = E.S, ui = E.ui, f = E.fmt;

  function pythonScript(cfg) {
    const C = E.CLEAN_CODE;
    return `# Подготовка на данните – генерирано от EDA Лаборатория
import numpy as np
import pandas as pd

df = pd.read_csv("survey_raw.csv")
valid_cities = ["София", "Пловдив", "Варна", "Бургас", "Русе", "Стара Загора", "Плевен"]

# 1. Грешки в данните: ${E.CLEAN_OPTIONS.errors.find(o => o.v === cfg.errors).l}
${C.errors[cfg.errors]}

# 2. Дублирани записи: ${E.CLEAN_OPTIONS.duplicates.find(o => o.v === cfg.duplicates).l}
${C.duplicates[cfg.duplicates]}

# 3. Нерелевантни признаци: ${E.CLEAN_OPTIONS.irrelevant.find(o => o.v === cfg.irrelevant).l}
${C.irrelevant[cfg.irrelevant]}

# 4. Екстремни стойности: ${E.CLEAN_OPTIONS.outliers.find(o => o.v === cfg.outliers).l}
${C.outliers[cfg.outliers]}

# 5. Липсващи стойности: ${E.CLEAN_OPTIONS.missingNum.find(o => o.v === cfg.missingNum).l} / ${E.CLEAN_OPTIONS.missingCat.find(o => o.v === cfg.missingCat).l}
${C.missingNum[cfg.missingNum]}
${C.missingCat[cfg.missingCat]}

# Проверка
print(df.isna().sum())
print(df.duplicated().sum())
df.to_csv("survey_clean.csv")
`;
  }

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
          <button class="btn gold" data-act="py">Скрипт на Python за почистването</button>
        </div>
        <p class="small muted" style="margin-top:10px">Файловете са в UTF-8 и се отварят в Excel, pandas и R. Скриптът повтаря избраните в 2.1 методи и може да се използва в упражненията.</p>
        ${E.code(pythonScript(cfg), 'Преглед на скрипта')}
      </div>`;
    },
    actions: {
      csvClean() { const c = E.cleaned(); download('survey_clean.csv', toCSV(c.rows, ['id'].concat(c.columns.filter(k => k !== 'id'))), 'text/csv;charset=utf-8'); },
      csvRaw() { download('survey_raw.csv', toCSV(E.RAW, E.COLUMNS.map(c => c.key)), 'text/csv;charset=utf-8'); },
      py() { download('clean_survey.py', pythonScript(E.state.cfg), 'text/x-python;charset=utf-8'); }
    }
  });
})(window.EDA);
