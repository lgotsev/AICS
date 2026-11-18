/* Почистване и трансформации. Всяка стъпка връща нови редове и дневник
   с това какво е променено, за да може да се покаже „преди / след“. */
(function (E) {
  const S = E.S;
  const INT_COLS = ['age', 'experience', 'height'];
  const roundCol = (k, v) => (k === 'income' ? Math.round(v / 10) * 10 : INT_COLS.includes(k) ? Math.round(v) : Math.round(v * 10) / 10);

  E.DEFAULT_CFG = { errors: 'fix', duplicates: 'all', irrelevant: 'drop', outliers: 'none', missingNum: 'median', missingCat: 'mode' };

  const GROUP_BY = { height: 'gender', weight: 'gender', income: 'education', age: 'education', experience: 'education' };

  E.steps = {
    errors(rows, method) {
      const a = E.analyze(rows);
      const log = [];
      if (method === 'none') return { rows, log };
      const drop = new Set();
      const out = rows.map((row, i) => {
        const nr = { ...row };
        E.COLUMNS.forEach(c => {
          const iss = (a.cells[i + '|' + c.key] || []).find(x => x.type === 'error' || x.type === 'format');
          if (!iss) return;
          const before = row[c.key];
          if (method === 'drop') { drop.add(i); log.push({ row: row._row, col: c.key, before, after: 'ред премахнат', sub: iss.sub }); return; }
          const after = method === 'fix' && iss.fix !== null && iss.fix !== undefined ? iss.fix : null;
          nr[c.key] = after;
          log.push({ row: row._row, col: c.key, before, after, sub: iss.sub });
        });
        return nr;
      });
      return { rows: out.filter((_, i) => !drop.has(i)), log };
    },

    duplicates(rows, method) {
      if (method === 'none') return { rows, log: [] };
      const a = E.analyze(rows);
      const log = [];
      const keep = rows.filter((row, i) => {
        const d = a.rowIssues[i];
        if (!d) return true;
        if (method === 'exact' && d.sub !== 'Точен дубликат') return true;
        log.push({ row: row._row, of: rows[d.of]._row, sub: d.sub, id: row.id });
        return false;
      });
      return { rows: keep, log };
    },

    outliers(rows, method, cols = E.NUMERIC) {
      if (method === 'none') return { rows, log: [] };
      const log = [];
      const f = {};
      cols.forEach(k => { f[k] = S.fences(rows.map(x => x[k])); });
      if (method === 'remove') {
        const keep = rows.filter(row => {
          const bad = cols.filter(k => S.isNum(row[k]) && (row[k] < f[k].lo || row[k] > f[k].hi));
          bad.forEach(k => log.push({ row: row._row, col: k, before: row[k], after: 'ред премахнат' }));
          return !bad.length;
        });
        return { rows: keep, log, fences: f };
      }
      const out = rows.map(row => {
        const nr = { ...row };
        cols.forEach(k => {
          const v = row[k];
          if (!S.isNum(v)) return;
          const c = Math.min(Math.max(v, f[k].lo), f[k].hi);
          if (c !== v) { nr[k] = roundCol(k, c); log.push({ row: row._row, col: k, before: v, after: nr[k] }); }
        });
        return nr;
      });
      return { rows: out, log, fences: f };
    },

    missing(rows, numMethod, catMethod) {
      const log = [];
      let out = rows.map(x => ({ ...x }));
      if (numMethod === 'drop' || catMethod === 'drop') {
        const cols = (numMethod === 'drop' ? E.NUMERIC : []).concat(catMethod === 'drop' ? E.CATEGORICAL : []);
        out = out.filter(row => {
          const miss = cols.filter(k => row[k] === null || row[k] === undefined);
          miss.forEach(k => log.push({ row: row._row, col: k, before: null, after: 'ред премахнат' }));
          return !miss.length;
        });
      }
      if (numMethod !== 'none' && numMethod !== 'drop') {
        const src = out.map(x => ({ ...x }));
        E.NUMERIC.forEach(k => {
          const vals = S.nums(src.map(x => x[k]));
          const fill = numMethod === 'mean' ? S.mean(vals) : S.median(vals);
          src.forEach((row, i) => {
            if (S.isNum(row[k])) return;
            let v = fill;
            if (numMethod === 'group') {
              const g = GROUP_BY[k];
              const gv = S.nums(src.filter(x => x[g] === row[g] && row[g] !== null).map(x => x[k]));
              if (gv.length) v = S.median(gv);
            } else if (numMethod === 'knn') v = knnFill(src, i, k, 5);
            out[i][k] = roundCol(k, v);
            log.push({ row: row._row, col: k, before: null, after: out[i][k] });
          });
        });
        // Запълнените стойности минават отново през правилата за съгласуваност:
        // стажът не може да надхвърля възрастта − 14
        out.forEach((row, i) => {
          if (!S.isNum(row.age) || !S.isNum(row.experience) || row.experience <= row.age - 14) return;
          const ageImp = !S.isNum(src[i].age), expImp = !S.isNum(src[i].experience);
          if (expImp || (!ageImp && !expImp)) {
            const before = row.experience; row.experience = Math.max(0, row.age - 14);
            log.push({ row: row._row, col: 'experience', before, after: row.experience, note: 'съгласуване с възрастта' });
          } else {
            const before = row.age; row.age = row.experience + 14;
            log.push({ row: row._row, col: 'age', before, after: row.age, note: 'съгласуване със стажа' });
          }
        });
      }
      if (catMethod === 'mode' || catMethod === 'unknown') {
        E.CATEGORICAL.forEach(k => {
          const m = S.mode(out.map(x => x[k]).filter(v => v !== null && v !== undefined)).values[0];
          out.forEach(row => {
            if (row[k] !== null && row[k] !== undefined) return;
            row[k] = catMethod === 'mode' ? m : 'Неизвестно';
            log.push({ row: row._row, col: k, before: null, after: row[k] });
          });
        });
      }
      return { rows: out, log };
    }
  };

  // K най-близки съседи върху стандартизираните останали количествени признаци
  function knnFill(rows, i, k, K) {
    const feats = E.NUMERIC.filter(f => f !== k);
    const st = {};
    feats.forEach(f => { const v = S.nums(rows.map(x => x[f])); st[f] = { m: S.mean(v), s: S.std(v) || 1 }; });
    const me = rows[i];
    const cand = [];
    rows.forEach((row, j) => {
      if (j === i || !S.isNum(row[k])) return;
      let d = 0, used = 0;
      feats.forEach(f => {
        if (S.isNum(me[f]) && S.isNum(row[f])) { d += ((me[f] - row[f]) / st[f].s) ** 2; used++; }
      });
      if (used) cand.push({ d: Math.sqrt(d / used), v: row[k] });
    });
    cand.sort((a, b) => a.d - b.d);
    return S.mean(cand.slice(0, K).map(c => c.v));
  }

  // Пълният процес на почистване в препоръчания ред
  E.clean = (raw, cfg) => {
    cfg = { ...E.DEFAULT_CFG, ...cfg };
    const log = {};
    let rows = raw.map(x => ({ ...x }));
    let res = E.steps.errors(rows, cfg.errors); rows = res.rows; log.errors = res.log;
    res = E.steps.duplicates(rows, cfg.duplicates); rows = res.rows; log.duplicates = res.log;
    const columns = cfg.irrelevant === 'drop' ? E.COLUMNS.map(c => c.key).filter(k => k !== 'id' && k !== 'country') : E.COLUMNS.map(c => c.key);
    log.irrelevant = cfg.irrelevant === 'drop' ? ['id', 'country'] : [];
    res = E.steps.outliers(rows, cfg.outliers); rows = res.rows; log.outliers = res.log;
    res = E.steps.missing(rows, cfg.missingNum, cfg.missingCat); rows = res.rows; log.missing = res.log;
    return { rows, columns, log, cfg };
  };

  /* ---------- Трансформации ---------- */
  E.T = {
    join(rows, table, how) {
      const map = new Map(table.map(t => [t.city, t]));
      const used = new Set();
      const out = [];
      if (how !== 'right') {
        rows.forEach(r => {
          const t = map.get(r.city);
          if (t) { used.add(t.city); out.push({ ...r, region: t.region, population: t.population, _m: 'both' }); }
          else if (how !== 'inner') out.push({ ...r, region: null, population: null, _m: 'left' });
        });
      } else {
        table.forEach(t => {
          const ms = rows.filter(r => r.city === t.city);
          if (ms.length) { used.add(t.city); ms.forEach(r => out.push({ ...r, region: t.region, population: t.population, _m: 'both' })); }
          else out.push({ city: t.city, region: t.region, population: t.population, _m: 'right' });
        });
      }
      if (how === 'outer') table.forEach(t => { if (!used.has(t.city)) out.push({ city: t.city, region: t.region, population: t.population, _m: 'right' }); });
      return out;
    },

    aggregate(rows, by, col, fn) {
      const groups = new Map();
      rows.forEach(r => {
        const g = r[by] === null || r[by] === undefined ? 'NULL' : r[by];
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(r[col]);
      });
      const F = {
        count: v => v.length, mean: v => S.mean(S.nums(v)), median: v => S.median(S.nums(v)),
        sum: v => S.sum(S.nums(v)), min: v => Math.min(...S.nums(v)), max: v => Math.max(...S.nums(v)), std: v => S.std(S.nums(v))
      };
      return [...groups.entries()].map(([g, v]) => ({ group: g, n: v.length, value: F[fn](v) }));
    },

    scale(values, method) {
      const v = S.nums(values);
      if (method === 'minmax') { const lo = Math.min(...v), hi = Math.max(...v); return { f: x => (x - lo) / (hi - lo), params: { min: lo, max: hi } }; }
      if (method === 'robust') { const f = S.fences(v); const med = S.median(v); return { f: x => (x - med) / f.iqr, params: { median: med, iqr: f.iqr } }; }
      const m = S.mean(v), s = S.std(v);
      return { f: x => (x - m) / s, params: { mean: m, std: s } };
    },

    power(values, method) {
      const fn = { log: Math.log, log1p: Math.log1p, sqrt: Math.sqrt, cbrt: Math.cbrt }[method];
      return values.map(v => (S.isNum(v) && (method === 'cbrt' || v > (method === 'log' ? 0 : -1e-12)) ? fn(v) : null));
    },

    discretize(values, method, k, custom) {
      const v = S.nums(values);
      let edges;
      if (method === 'custom') edges = custom;
      else if (method === 'quantile') { const s = S.sorted(v); edges = []; for (let i = 0; i <= k; i++) edges.push(S.quantileSorted(s, i / k)); }
      else { const lo = Math.min(...v), hi = Math.max(...v); edges = []; for (let i = 0; i <= k; i++) edges.push(lo + ((hi - lo) * i) / k); }
      edges = [...new Set(edges)];
      const labels = edges.slice(0, -1).map((e, i) => {
        const a = Math.round(e), b = Math.round(edges[i + 1]);
        return i === edges.length - 2 && method === 'custom' && !Number.isFinite(edges[i + 1]) ? `${a}+` : `${a}–${b}`;
      });
      const assign = x => {
        if (!S.isNum(x)) return null;
        for (let i = 0; i < edges.length - 1; i++) if (x < edges[i + 1] || i === edges.length - 2) return x >= edges[i] || i === 0 ? labels[i] : null;
        return null;
      };
      return { edges, labels, assign };
    }
  };
})(window.EDA);
