/* Част II · 2.1 Почистване на данните */
(function (E) {
  const S = E.S, ui = E.ui, f = E.fmt;

  const OPTIONS = {
    errors: [
      { v: 'fix', l: 'Корекция по речника', d: 'Формат, синоними, латиница и правописни грешки се коригират към най-близката допустима стойност; грешната мерна единица се преобразува. Стойностите без надеждна корекция стават NaN.', p: '+ запазва записите и информацията · − корекцията може да е грешна, ако съвпадението е двусмислено' },
      { v: 'nan', l: 'Превръщане в липсваща стойност (NaN)', d: 'Всяка грешна стойност се изтрива и после се запълва в стъпка 5.', p: '+ просто и безопасно · − губи се информация, която е можело да се спаси' },
      { v: 'drop', l: 'Премахване на записа', d: 'Целият ред с грешка се изтрива.', p: '+ няма съмнителни стойности · − губят се и верните стойности от реда' },
      { v: 'none', l: 'Без промяна', d: 'За сравнение: грешките остават в данните.', p: '− грешките изкривяват статистиките и създават фалшиви категории' }
    ],
    duplicates: [
      { v: 'all', l: 'Премахване на точните и на дубликатите по съдържание', d: 'Сравняват се всички признаци, а после всички без ID. Запазва се първото срещане.', p: '+ премахва и повторно въведени хора с нов номер · − двама различни души с еднакви данни биха се слели (тук малко вероятно)' },
      { v: 'exact', l: 'Само точните дубликати', d: 'Премахват се редове, които съвпадат изцяло, включително ID.', p: '+ напълно безопасно · − пропуска повторенията с различен ID' },
      { v: 'none', l: 'Без промяна', d: 'Дубликатите остават.', p: '− едни и същи хора тежат двойно в статистиките' }
    ],
    irrelevant: [
      { v: 'drop', l: 'Премахване на ID и константните признаци', d: 'ID остава само като индекс на записа; „Държава“ има една стойност и се премахва.', p: '+ моделът не „запомня“ номерата и не обработва безполезни колони' },
      { v: 'none', l: 'Без промяна', d: 'Признаците остават.', p: '− шум за модела, излишни изчисления' }
    ],
    outliers: [
      { v: 'none', l: 'Запазване (без промяна)', d: 'Екстремните стойности са реални случаи и остават. Влиянието им може да се намали по-късно с логаритмична трансформация.', p: '+ не се губи информация · − влияят на средното и на стандартното отклонение' },
      { v: 'cap', l: 'Ограничаване до границите (capping, winsorization)', d: 'Стойностите над горната граница Q3 + 1,5·IQR стават равни на нея; аналогично за долната.', p: '+ записите се запазват, влиянието намалява · − изкуствено натрупване на стойности при границата' },
      { v: 'remove', l: 'Премахване на записите', d: 'Редовете с поне една екстремна стойност се изтриват.', p: '+ „чисти“ разпределения · − губят се реални, понякога най-интересните случаи' }
    ],
    missingNum: [
      { v: 'median', l: 'Медиана', d: 'Липсващите се заместват с медианата на признака.', p: '+ устойчива към екстремни стойности · − намалява дисперсията, създава „пик“' },
      { v: 'mean', l: 'Средно аритметично', d: 'Липсващите се заместват със средното.', p: '+ запазва средното · − чувствително към екстремни стойности, намалява дисперсията' },
      { v: 'group', l: 'Медиана по групи', d: 'Височина и тегло: медианата според пола. Доход, възраст и стаж: медианата според образованието.', p: '+ отчита структурата на данните · − групата също трябва да е известна' },
      { v: 'knn', l: 'K най-близки съседи (KNN, k = 5)', d: 'Стойността е средното на петте най-сходни записа по останалите стандартизирани признаци.', p: '+ най-реалистични стойности · − по-бавно, зависи от мащаба на признаците' },
      { v: 'drop', l: 'Премахване на записите', d: 'Редове с липсваща количествена стойност се изтриват.', p: '+ няма „измислени“ стойности · − губят се много записи и може да се внесе изместване' },
      { v: 'none', l: 'Без промяна', d: 'Липсващите остават.', p: '− повечето модели не приемат NaN' }
    ],
    missingCat: [
      { v: 'mode', l: 'Мода', d: 'Заместване с най-честата категория.', p: '+ просто · − засилва най-честия клас' },
      { v: 'unknown', l: 'Отделна категория „Неизвестно“', d: 'Липсата става отделна стойност.', p: '+ запазва информацията, че стойността липсва · − появява се нова категория' },
      { v: 'drop', l: 'Премахване на записите', d: 'Редове с липсваща категорийна стойност се изтриват.', p: '− губят се записи' },
      { v: 'none', l: 'Без промяна', d: 'Липсващите остават.', p: '' }
    ]
  };

  const CODE = {
    errors: {
      fix: `# Уеднаквяване на формата
df["city"] = df["city"].str.strip()
df["gender"] = df["gender"].str.upper().replace({"МЪЖ": "М", "ЖЕНА": "Ж"})
# Корекция по речник (правописни грешки, латиница)
df["city"] = df["city"].replace({"Сотия": "София", "Пловдв": "Пловдив", "sofia": "София", "ВАРНА": "Варна"})
# Търсене на най-сходната допустима стойност (fuzzy matching)
from difflib import get_close_matches
valid = ["София", "Пловдив", "Варна", "Бургас", "Русе", "Стара Загора", "Плевен"]
df["city"] = df["city"].apply(lambda c: c if c in valid or pd.isna(c) else (get_close_matches(c, valid, n=1) or [None])[0])
# Грешна мерна единица: метри → сантиметри
df.loc[df["height"] < 3, "height"] *= 100
# Невъзможни стойности → NaN
df.loc[~df["age"].between(0, 110), "age"] = np.nan
df.loc[~df["weight"].between(30, 250), "weight"] = np.nan
df.loc[df["income"] < 0, "income"] = np.nan
df.loc[~df["gender"].isin(["М", "Ж"]), "gender"] = np.nan
df.loc[df["experience"] > df["age"] - 14, "experience"] = np.nan`,
      nan: `df.loc[~df["age"].between(0, 110), "age"] = np.nan
df.loc[~df["gender"].isin(["М", "Ж"]), "gender"] = np.nan
df.loc[~df["city"].isin(valid_cities), "city"] = np.nan
# ... аналогично за останалите признаци`,
      drop: `mask = df["age"].between(0, 110) & df["gender"].isin(["М", "Ж"]) & df["city"].isin(valid_cities)
df = df[mask]`,
      none: '# без промяна'
    },
    duplicates: {
      all: `df = df.drop_duplicates()                                   # точни
df = df.drop_duplicates(subset=df.columns.drop("id"))         # по съдържание`,
      exact: 'df = df.drop_duplicates(keep="first")',
      none: '# без промяна'
    },
    irrelevant: { drop: 'df = df.set_index("id").drop(columns=["country"])\n# константни признаци в общия случай: df.loc[:, df.nunique() > 1]', none: '# без промяна' },
    outliers: {
      none: '# екстремните стойности се запазват',
      cap: `for col in ["age", "experience", "height", "weight", "income"]:
    q1, q3 = df[col].quantile([0.25, 0.75])
    iqr = q3 - q1
    df[col] = df[col].clip(lower=q1 - 1.5 * iqr, upper=q3 + 1.5 * iqr)`,
      remove: `num = ["age", "experience", "height", "weight", "income"]
q1, q3 = df[num].quantile(0.25), df[num].quantile(0.75)
iqr = q3 - q1
inside = ~((df[num] < q1 - 1.5 * iqr) | (df[num] > q3 + 1.5 * iqr)).any(axis=1)
df = df[inside]`
    },
    missingNum: {
      median: 'num = ["age", "experience", "height", "weight", "income"]\ndf[num] = df[num].fillna(df[num].median())',
      mean: 'num = ["age", "experience", "height", "weight", "income"]\ndf[num] = df[num].fillna(df[num].mean())',
      group: `df["height"] = df["height"].fillna(df.groupby("gender")["height"].transform("median"))
df["weight"] = df["weight"].fillna(df.groupby("gender")["weight"].transform("median"))
df["income"] = df["income"].fillna(df.groupby("education")["income"].transform("median"))`,
      knn: `from sklearn.impute import KNNImputer
from sklearn.preprocessing import StandardScaler
num = ["age", "experience", "height", "weight", "income"]
scaler = StandardScaler()
z = scaler.fit_transform(df[num])
df[num] = scaler.inverse_transform(KNNImputer(n_neighbors=5).fit_transform(z))`,
      drop: 'df = df.dropna(subset=["age", "experience", "height", "weight", "income"])',
      none: '# без промяна'
    },
    missingCat: {
      mode: 'for col in ["gender", "education", "city"]:\n    df[col] = df[col].fillna(df[col].mode()[0])',
      unknown: 'df[["gender", "education", "city"]] = df[["gender", "education", "city"]].fillna("Неизвестно")',
      drop: 'df = df.dropna(subset=["gender", "education", "city"])',
      none: '# без промяна'
    }
  };
  E.CLEAN_CODE = CODE;
  E.CLEAN_OPTIONS = OPTIONS;

  const options = key => `<div class="options">${OPTIONS[key].map(o => `<label class="option ${E.state.cfg[key] === o.v ? 'on' : ''}"><input type="radio" name="${key}" value="${o.v}" data-cfg="${key}" ${E.state.cfg[key] === o.v ? 'checked' : ''}><span><b>${o.l}</b><br><span class="small">${o.d}</span>${o.p ? `<br><span class="pros">${o.p}</span>` : ''}</span></label>`).join('')}</div>`;

  const logTable = (log, limit = 60) => (log.length ? ui.table(['Ред', 'Признак', 'Преди', 'След', 'Бележка'], log.slice(0, limit).map(l => [l.row, E.COL[l.col] ? E.COL[l.col].label : l.col, `<code>${E.esc(E.cellText(l.before))}</code>`, typeof l.after === 'string' && l.after.startsWith('ред') ? `<span class="muted">${l.after}</span>` : `<code>${E.esc(E.cellText(l.after))}</code>`, E.esc(l.sub || l.note || '')]), { maxh: 300, cls: 'compact' }) + (log.length > limit ? `<p class="small muted">… и още ${log.length - limit}</p>` : '') : '<p class="muted small">Няма промени.</p>');

  const step = (n, title, problem, body) => `<div class="card"><div class="step"><div class="step-num">${n}</div><div><h2>${title}</h2><p class="muted">${problem}</p>${body}</div></div></div>`;

  E.page('cleaning', {
    title: 'Почистване', source: false,
    st: { ov: 'income', mv: 'weight' },
    render(st) {
      const cfg = E.state.cfg;
      const raw = E.RAW.map(x => ({ ...x }));
      const a0 = E.rawAnalysis();
      const s1 = E.steps.errors(raw, cfg.errors);
      const s2 = E.steps.duplicates(s1.rows, cfg.duplicates);
      const s4 = E.steps.outliers(s2.rows, cfg.outliers);
      const s5 = E.steps.missing(s4.rows, cfg.missingNum, cfg.missingCat);
      const final = E.cleaned();
      const aFinal = E.analyze(final.rows, final.columns);

      // Стъпка 4: преди / след за избран признак
      const ov = st.ov;
      const before4 = S.nums(s2.rows.map(r => r[ov])), after4 = S.nums(s4.rows.map(r => r[ov]));
      // Стъпка 5: преди / след
      const mv = st.mv;
      const before5 = S.nums(s4.rows.map(r => r[mv])), after5 = S.nums(s5.rows.map(r => r[mv]));
      const isCatMv = false;
      const lo = Math.min(...after5, ...before5), hi = Math.max(...after5, ...before5);
      const bins = S.binCount(after5, 'sturges') + 6;
      const imputed = s5.log.filter(l => l.col === mv && l.before === null).length;
      const sdB = S.std(before5), sdA = S.std(after5);

      return `
      ${ui.head('Част II · 2.1', 'Почистване на данните', 'Пет стъпки в препоръчания ред. Изберете метод за всяка стъпка: ефектът се вижда веднага, а изборът важи за „Почистени“ данни навсякъде в приложението.')}
      <div class="card">
        <div class="order"><span class="o">1. Грешки</span><span class="arrow">→</span><span class="o">2. Дубликати</span><span class="arrow">→</span><span class="o">3. Нерелевантни признаци</span><span class="arrow">→</span><span class="o">4. Екстремни стойности</span><span class="arrow">→</span><span class="o">5. Липсващи стойности</span></div>
        <p class="small" style="margin:12px 0 0">Защо в този ред: корекцията на грешки може да разкрие нови дубликати (например „Варна␣“ и „Варна“). Екстремните стойности се обработват преди запълването, за да не изкривят средното, с което се запълва. Запълването е последно, защото използва вече почистените стойности.</p>
        <div class="row" style="margin-top:14px"><span class="small"><b>Резултат:</b> ${E.RAW.length} → ${final.rows.length} записа, ${E.COLUMNS.length} → ${final.columns.length} признака. Оставащи проблеми: липсващи ${aFinal.totals.missing}, грешки ${aFinal.totals.errors}, дубликати ${aFinal.totals.duplicates}.</span><button class="btn ghost" data-act="defaults">Възстанови препоръчаните методи</button><a class="btn" href="#/result">Към резултата →</a></div>
      </div>

      ${step(1, 'Грешки в данните', `Открити: ${a0.totals.errors} грешни стойности (формат, правопис, мерна единица, невъзможни и нелогични стойности).`, `
        ${options('errors')}
        <h3>Ефект</h3>
        <p class="small">Променени клетки: <b>${s1.log.length}</b>${cfg.errors === 'fix' ? `, от тях коригирани: <b>${s1.log.filter(l => l.after !== null).length}</b>, превърнати в NaN: <b>${s1.log.filter(l => l.after === null).length}</b>` : ''}${cfg.errors === 'drop' ? `, премахнати записи: <b>${E.RAW.length - s1.rows.length}</b>` : ''}.</p>
        ${cfg.errors !== 'none' ? logTable(s1.log) : ''}
        ${E.code(CODE.errors[cfg.errors])}`)}

      ${step(2, 'Дублирани записи', `Открити: ${Object.keys(a0.rowIssues).length} повторени записа.`, `
        ${options('duplicates')}
        <h3>Ефект</h3>
        ${s2.log.length ? ui.table(['Премахнат ред', 'ID', 'Повтаря ред', 'Вид'], s2.log.map(l => [l.row, l.id, l.of, l.sub]), { cls: 'compact' }) : '<p class="muted small">Няма премахнати записи.</p>'}
        ${cfg.errors === 'fix' && cfg.duplicates !== 'none' ? '<p class="small muted">Проверката е след корекцията на грешките, затова открива и дубликати, които преди корекцията изглеждат различни.</p>' : ''}
        ${E.code(CODE.duplicates[cfg.duplicates])}`)}

      ${step(3, 'Нерелевантни признаци (шум)', 'ID е уникален за всеки запис, а „Държава“ има една и съща стойност навсякъде. И двата признака не носят информация за анализа.', `
        ${options('irrelevant')}
        <h3>Ефект</h3>
        <p class="small">Признаци: ${E.COLUMNS.length} → <b>${final.columns.length}</b>. ${final.log.irrelevant.length ? `Премахнати: ${final.log.irrelevant.map(k => E.COL[k].label).join(', ')}.` : ''}</p>
        <div class="note small">Шумът е и случайната грешка при измерване: например кантар, който показва ±0,5 kg. Той не се премахва като колона, а се намалява с изглаждане (усредняване, закръгляне, дискретизация) или с повече наблюдения.</div>
        ${E.code(CODE.irrelevant[cfg.irrelevant])}`)}

      ${step(4, 'Екстремни стойности', `Открити: ${a0.totals.outliers} стойности извън границите по правилото на IQR, главно в дохода и теглото.`, `
        ${options('outliers')}
        <h3>Ефект</h3>
        <div class="controls">${ui.select('ov', ui.numOptions(), ov, 'Признак')}</div>
        <div class="grid-2">
          ${ui.chart('Преди', E.chart.boxplot({ groups: [{ label: E.COL[ov].label, values: before4 }], h: 260, yLabel: E.label(ov) }))}
          ${ui.chart('След', E.chart.boxplot({ groups: [{ label: E.COL[ov].label, values: after4, color: E.C.gold }], h: 260, yLabel: E.label(ov) }))}
        </div>
        <p class="small">Променени стойности: <b>${s4.log.length}</b>${cfg.outliers === 'remove' ? `, премахнати записи: <b>${s2.rows.length - s4.rows.length}</b>` : ''}. Средно: ${f(S.mean(before4))} → ${f(S.mean(after4))}; стандартно отклонение: ${f(S.std(before4))} → ${f(S.std(after4))}.</p>
        ${cfg.outliers !== 'none' ? logTable(s4.log, 30) : ''}
        ${E.code(CODE.outliers[cfg.outliers])}`)}

      ${step(5, 'Липсващи стойности', `Открити в суровите данни: ${a0.totals.missing}. Преди тази стъпка, след предишните, липсват: ${s4.rows.reduce((s, r) => s + E.NUMERIC.concat(E.CATEGORICAL).filter(k => r[k] === null || r[k] === undefined).length, 0)} стойности.`, `
        <h3>Количествени признаци</h3>
        ${options('missingNum')}
        <h3>Категорийни признаци</h3>
        ${options('missingCat')}
        <h3>Ефект</h3>
        <div class="controls">${ui.select('mv', ui.numOptions(), mv, 'Признак')}</div>
        ${ui.chart(`Разпределение: преди (само наличните стойности) и след запълването`, E.chart.histogram({ series: [{ values: after5, color: E.C.gold, label: 'След запълването', opacity: 0.75 }, { values: before5, color: E.C.navy2, label: 'Преди (наличните)', opacity: 0.75 }], bins, lo, hi, xLabel: E.label(mv), w: 900, h: 320 }))}
        <div class="grid-4" style="margin-top:12px">
          ${ui.stat('Запълнени стойности', imputed)}
          ${ui.stat('Средно', `${f(S.mean(before5))} → ${f(S.mean(after5))}`)}
          ${ui.stat('Медиана', `${f(S.median(before5))} → ${f(S.median(after5))}`)}
          ${ui.stat('Стандартно отклонение', `${f(sdB)} → ${f(sdA)}`, sdA < sdB ? 'намалява' : '', '', sdA < sdB * 0.99 ? 'gold' : '')}
        </div>
        ${(cfg.missingNum === 'median' || cfg.missingNum === 'mean') && imputed ? '<div class="note small">Всички липсващи получават една и съща стойност, затова в хистограмата се появява „пик“, а стандартното отклонение намалява. Запълването по групи или KNN дава по-реалистично разпределение.</div>' : ''}
        ${s5.log.some(l => l.note) ? `<div class="note navy small">След запълването е проверена съгласуваността между възраст и стаж: ${s5.log.filter(l => l.note).length} стойности са коригирани, за да не се получи стаж, по-голям от възрастта − 14.</div>` : ''}
        ${!isCatMv ? logTable(s5.log.filter(l => l.col === mv), 30) : ''}
        ${E.code(CODE.missingNum[cfg.missingNum] + '\n\n' + CODE.missingCat[cfg.missingCat])}`)}
      `;
    },
    actions: {
      defaults() { E.state.cfg = { ...E.DEFAULT_CFG }; E.refresh(); }
    }
  });
})(window.EDA);
