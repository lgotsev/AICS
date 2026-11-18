/* Откриване на проблеми в данните. Нищо не е зададено „на ръка“:
   всичко се изчислява по речника на данните и по самите стойности. */
(function (E) {
  const S = E.S;

  const SYNONYMS = { 'мъж': 'М', 'жена': 'Ж', 'm': 'М', 'f': 'Ж' };
  const LAT = { a: 'а', b: 'б', v: 'в', g: 'г', d: 'д', e: 'е', z: 'з', i: 'и', j: 'й', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р', s: 'с', t: 'т', u: 'у', f: 'ф', h: 'х', c: 'ц', y: 'ъ' };
  const translit = s => s.toLowerCase().replace(/sht/g, 'щ').replace(/zh/g, 'ж').replace(/sh/g, 'ш').replace(/ch/g, 'ч').replace(/ts/g, 'ц').replace(/yu/g, 'ю').replace(/ya|ia$/g, m => (m === 'ia' ? 'ия' : 'я')).replace(/[a-z]/g, ch => LAT[ch] || ch);

  E.ISSUE = {
    missing: { label: 'Липсваща стойност', group: 'Липсващи стойности', color: '#c4422f' },
    format: { label: 'Грешка във формата', group: 'Грешки в данните', color: '#7a3e9d' },
    error: { label: 'Грешна стойност', group: 'Грешки в данните', color: '#7a3e9d' },
    outlier: { label: 'Екстремна стойност', group: 'Екстремни стойности', color: '#d0731c' },
    duplicate: { label: 'Дублиран запис', group: 'Дублирани записи', color: '#1f7f86' },
    irrelevant: { label: 'Нерелевантен признак (шум)', group: 'Нерелевантни данни', color: '#6b7280' }
  };

  function checkCategory(col, v) {
    if (v === null || v === undefined || v === '') return { type: 'missing', msg: 'Стойността липсва (NULL / NaN).' };
    const dict = col.values;
    if (dict.includes(v) || v === 'Неизвестно') return null;
    const t = String(v).trim();
    if (t !== v && dict.includes(t)) return { type: 'format', sub: 'Излишен интервал', msg: `Стойността съдържа излишен интервал: „${v}“.`, fix: t };
    const byCase = dict.find(d => d.toLowerCase() === t.toLowerCase());
    if (byCase) return { type: 'format', sub: 'Различен регистър', msg: `Записът се различава само по главни/малки букви: „${v}“ вместо „${byCase}“.`, fix: byCase };
    const syn = SYNONYMS[t.toLowerCase()];
    if (syn && dict.includes(syn)) return { type: 'format', sub: 'Различно кодиране', msg: `Категорията е записана по друг начин: „${v}“ вместо кода „${syn}“.`, fix: syn };
    if (/[a-z]/i.test(t)) {
      const tr = translit(t);
      const m = dict.find(d => d.toLowerCase() === tr) || (tr.length > 3 ? dict.find(d => S.levenshtein(d.toLowerCase(), tr) <= 1) : undefined);
      if (m) return { type: 'format', sub: 'Латиница вместо кирилица', msg: `Стойността е изписана на латиница: „${v}“ вместо „${m}“.`, fix: m };
    }
    let best = null, bestD = Infinity;
    dict.forEach(d => { const dist = S.levenshtein(t.toLowerCase(), d.toLowerCase()); if (dist < bestD) { bestD = dist; best = d; } });
    if (t.length > 3 && bestD <= 2) return { type: 'error', sub: 'Правописна грешка', msg: `„${v}“ не е в речника. Най-близката допустима стойност е „${best}“ (разстояние на Левенщайн ${bestD}).`, fix: best };
    return { type: 'error', sub: 'Невалидна категория', msg: `„${v}“ не е допустима стойност. Допустими са: ${dict.join(', ')}.`, fix: null };
  }

  function checkNumber(col, v, row) {
    if (v === null || v === undefined || Number.isNaN(v)) return { type: 'missing', msg: 'Стойността липсва (NULL / NaN).' };
    const [lo, hi] = col.domain;
    if (col.key === 'height' && v > 0 && v < 3) return { type: 'error', sub: 'Грешна мерна единица', msg: `${v} изглежда въведено в метри, а признакът е в сантиметри.`, fix: Math.round(v * 100) };
    if (v < lo || v > hi) {
      const sub = v < 0 ? 'Отрицателна стойност' : 'Невъзможна стойност';
      return { type: 'error', sub, msg: `${v} ${col.unit} е извън допустимия диапазон (${col.allowed}).`, fix: null };
    }
    if (col.key === 'experience' && S.isNum(row.age) && row.age >= 0 && row.age <= 110 && v > row.age - 14)
      return { type: 'error', sub: 'Логическо несъответствие', msg: `Стаж ${v} години при възраст ${row.age} години е невъзможен (стажът не може да е по-голям от възрастта − 14).`, fix: null };
    return null;
  }

  /* Резултат: issues по клетки, по редове, по колони и обобщение */
  E.analyze = (rows, columns) => {
    columns = columns || E.COLUMNS.map(c => c.key);
    const cells = {};
    const add = (i, k, iss) => { (cells[i + '|' + k] = cells[i + '|' + k] || []).push(iss); };
    const fences = {};
    const perCol = {};

    columns.forEach(k => {
      const col = E.COL[k];
      perCol[k] = { missing: 0, format: 0, error: 0, outlier: 0, unique: new Set(rows.map(x => x[k]).filter(v => v !== null && v !== undefined)).size };
      if (col.type === 'id') return;
      const clean = [];
      rows.forEach((row, i) => {
        const v = row[k];
        const iss = col.values ? checkCategory(col, v) : checkNumber(col, v, row);
        if (iss) { add(i, k, iss); perCol[k][iss.type]++; } else if (!col.values) clean.push(v);
      });
      if (!col.values && clean.length > 3) {
        const f = S.fences(clean);
        const m = S.mean(clean), sd = S.std(clean);
        fences[k] = { ...f, mean: m, sd };
        rows.forEach((row, i) => {
          const v = row[k];
          const has = cells[i + '|' + k];
          if (has || !S.isNum(v)) return;
          if (v < f.lo || v > f.hi) {
            add(i, k, { type: 'outlier', sub: v > f.hi ? 'Над горната граница' : 'Под долната граница', msg: `${E.fmt(v)} ${col.unit} е извън границите по правилото на IQR [${E.fmt(f.lo)}; ${E.fmt(f.hi)}]. z = ${E.fmt((v - m) / sd, 2)}.` });
            perCol[k].outlier++;
          }
        });
      }
    });

    // Дублирани записи
    const rowIssues = {};
    const exact = new Map(), content = new Map();
    const keysNoId = columns.filter(k => k !== 'id');
    rows.forEach((row, i) => {
      const sigAll = JSON.stringify(columns.map(k => row[k]));
      const sigContent = JSON.stringify(keysNoId.map(k => row[k]));
      if (exact.has(sigAll)) rowIssues[i] = { type: 'duplicate', sub: 'Точен дубликат', of: exact.get(sigAll), msg: `Редът е идентичен с ред ${rows[exact.get(sigAll)]._row}, включително ID.` };
      else if (content.has(sigContent)) rowIssues[i] = { type: 'duplicate', sub: 'Дубликат по съдържание', of: content.get(sigContent), msg: `Всички стойности съвпадат с ред ${rows[content.get(sigContent)]._row}, различен е само ID. Вероятно един човек е въведен два пъти.` };
      if (!exact.has(sigAll)) exact.set(sigAll, i);
      if (!content.has(sigContent)) content.set(sigContent, i);
    });

    // Нерелевантни признаци
    const colIssues = {};
    columns.forEach(k => {
      const col = E.COL[k];
      const u = perCol[k].unique;
      if (col.type === 'id') colIssues[k] = { type: 'irrelevant', sub: 'Идентификатор', msg: 'Стойностите са (почти) уникални за всеки запис. ID не носи информация за явлението и при моделиране е шум: моделът може да „запомни“ номерата.' };
      else if (u === 1) colIssues[k] = { type: 'irrelevant', sub: 'Константа', msg: 'Признакът има една и съща стойност във всички записи (нулева дисперсия). Не различава записите и не носи информация.' };
    });

    const count = t => Object.values(cells).flat().filter(x => x.type === t).length;
    return {
      cells, rowIssues, colIssues, fences, perCol,
      totals: {
        missing: count('missing'), errors: count('error') + count('format'), outliers: count('outlier'),
        duplicates: Object.keys(rowIssues).length, irrelevant: Object.keys(colIssues).length
      }
    };
  };
})(window.EDA);
