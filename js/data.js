/* Наборът от данни: учебна извадка (първите 17 реда, подбрани ръчно) +
   генерирани редове със същата структура и внедрени проблеми. */
(function (E) {
  const S = E.S;

  const CITIES = ['София', 'Пловдив', 'Варна', 'Бургас', 'Русе', 'Стара Загора', 'Плевен'];
  const EDU = ['Основно', 'Средно', 'Бакалавър', 'Магистър', 'Доктор'];

  // Речник на данните: описание и допустими стойности на всеки признак
  const COLUMNS = [
    { key: 'id', label: 'ID', type: 'id', unit: '', desc: 'Номер на записа (анкетата)', allowed: 'цяло число, уникално' },
    { key: 'gender', label: 'Пол', type: 'nominal', values: ['М', 'Ж'], unit: '', desc: 'Пол на респондента', allowed: 'М, Ж' },
    { key: 'age', label: 'Възраст', type: 'int', unit: 'години', domain: [0, 110], desc: 'Навършени години', allowed: '0 – 110' },
    { key: 'experience', label: 'Стаж', type: 'int', unit: 'години', domain: [0, 60], desc: 'Трудов стаж', allowed: '0 – 60 и не повече от възрастта − 14' },
    { key: 'education', label: 'Образование', type: 'ordinal', values: EDU, unit: '', desc: 'Най-висока завършена степен', allowed: EDU.join(' < ') },
    { key: 'city', label: 'Град', type: 'nominal', values: CITIES, unit: '', desc: 'Град на живеене', allowed: CITIES.join(', ') },
    { key: 'height', label: 'Височина', type: 'float', unit: 'cm', domain: [100, 230], desc: 'Ръст', allowed: '100 – 230 cm' },
    { key: 'weight', label: 'Тегло', type: 'float', unit: 'kg', domain: [30, 250], desc: 'Телесно тегло', allowed: '30 – 250 kg' },
    { key: 'income', label: 'Доход', type: 'float', unit: '€/месец', domain: [0, Infinity], desc: 'Нетен месечен доход в евро', allowed: '≥ 0 €' },
    { key: 'country', label: 'Държава', type: 'nominal', values: ['България'], unit: '', desc: 'Държава на живеене', allowed: 'България' }
  ];

  const TYPE_LABEL = {
    id: 'Идентификатор',
    int: 'Количествена, дискретна (цели числа)',
    float: 'Количествена, непрекъсната (реални числа)',
    nominal: 'Категорийна, номинална (без естествен ред)',
    ordinal: 'Категорийна, порядкова (с естествен ред)'
  };

  const r = (id, gender, age, experience, education, city, height, weight, income) =>
    ({ id, gender, age, experience, education, city, height, weight, income, country: 'България' });

  // Учебна извадка: всеки вид проблем се среща поне веднъж
  const TEACHING = [
    r(1001, 'М', 34, 10, 'Магистър', 'София', 181, 82.4, 1850),
    r(1002, 'Ж', 28, 5, 'Бакалавър', 'Пловдив', 166, null, 1320),
    r(1003, 'М', 156, 30, 'Доктор', 'Варна', 177, 79.0, 2600),
    r(1004, 'Ж', 41, 17, 'Средно', 'Бургас', 162, 64.5, null),
    r(1001, 'М', 34, 10, 'Магистър', 'София', 181, 82.4, 1850),
    r(1005, 'М', null, 12, 'Бакалавър', 'Русе', 175, 77.3, 1410),
    r(1006, 'Ж', 45, 21, 'Магистър', 'София', 168, 61.0, 14500),
    r(1007, 'Ж', 29, 6, 'Бакалавър', 'Стара Загора', 1.64, 55.5, 1180),
    r(1008, 'М', 38, 14, 'Магистър', 'Сотия', 179, 84.0, 2050),
    r(1009, 'Ж', 22, 1, 'Средно', 'Варна', 164, null, null),
    r(1010, 'М', 51, 27, null, 'София', 183, 88.5, 2400),
    r(1011, 'X', 33, 9, 'Бакалавър', 'Пловдив', 165, 58.0, 1290),
    r(1012, 'м', 47, 23, 'Средно', 'Плевен', 176, 91.0, 1250),
    r(1013, 'Ж', 36, 12, 'Доктор', 'Бургас', 170, 67.0, 2300),
    r(1014, 'М', 26, 3, 'Бакалавър', 'София', 192, 142.0, 1500),
    r(1015, 'Ж', 36, 12, 'Доктор', 'Бургас', 170, 67.0, 2300),
    r(1016, 'Ж', 39, 15, 'Магистър', 'Варна ', 167, 63.2, -350)
  ];

  function generate() {
    const rnd = S.rng(20261118);
    const nrm = rnd.normal;
    const pick = (items, probs) => {
      const u = rnd(); let acc = 0;
      for (let i = 0; i < items.length; i++) { acc += probs[i]; if (u < acc) return items[i]; }
      return items[items.length - 1];
    };
    const EDU_MULT = { Основно: 0.75, Средно: 1, Бакалавър: 1.3, Магистър: 1.55, Доктор: 1.85 };
    const CITY_MULT = { София: 1.3, Пловдив: 1.05, Варна: 1.05, Бургас: 1, Русе: 0.9, 'Стара Загора': 0.95, Плевен: 0.85 };
    const START = { Основно: 17, Средно: 19, Бакалавър: 23, Магистър: 24, Доктор: 28 };

    const rows = [];
    for (let i = 0; i < 190; i++) {
      const gender = rnd() < 0.5 ? 'М' : 'Ж';
      const education = pick(EDU, [0.06, 0.3, 0.34, 0.24, 0.06]);
      let age = Math.max(19, Math.min(67, Math.round(40 + 11 * nrm())));
      if (age < START[education] + 1) age = START[education] + 1 + Math.floor(rnd() * 4);
      const experience = Math.max(0, Math.round(age - START[education] - 1 - rnd() * 4));
      const height = Math.round(gender === 'М' ? 178 + 7 * nrm() : 165 + 6 * nrm());
      const bmi = 24.5 + (gender === 'М' ? 1 : -0.8) + 3 * nrm() + 0.04 * (age - 40);
      const weight = Math.round(bmi * (height / 100) ** 2 * 10) / 10;
      const city = pick(CITIES, [0.34, 0.18, 0.15, 0.12, 0.08, 0.07, 0.06]);
      const income = Math.round((780 * EDU_MULT[education] * CITY_MULT[city] * (1 + 0.012 * experience) * Math.exp(0.32 * nrm())) / 10) * 10;
      rows.push(r(1017 + i, gender, age, experience, education, city, height, weight, income));
    }

    // Внедрени проблеми в генерираните редове (детерминирано)
    const used = new Set();
    const slot = col => {
      for (;;) {
        const i = Math.floor(rnd() * rows.length);
        if (!used.has(i + '|' + col)) { used.add(i + '|' + col); return i; }
      }
    };
    const missing = { age: 3, experience: 2, height: 3, weight: 5, income: 7, education: 3, city: 2 };
    Object.entries(missing).forEach(([col, k]) => { for (let j = 0; j < k; j++) rows[slot(col)][col] = null; });

    rows[slot('city')].city = 'sofia';
    rows[slot('city')].city = 'Пловдв';
    rows[slot('city')].city = 'ВАРНА';
    rows[slot('gender')].gender = 'Мъж';
    rows[slot('gender')].gender = 'ж';
    rows[slot('age')].age = -3;
    rows[slot('weight')].weight = 0;
    rows[slot('height')].height = 1.79;
    const logic = rows[slot('experience')];
    logic.age = 24; logic.experience = 15;
    rows[slot('income')].income = 9800;
    rows[slot('weight')].weight = 128.5;

    // Дублирани записи: два точни и един по съдържание (нов ID)
    const dupA = { ...rows[23] }, dupB = { ...rows[118] }, dupC = { ...rows[71], id: 1207 };
    rows.splice(60, 0, dupA);
    rows.splice(150, 0, dupB);
    rows.push(dupC);
    return rows;
  }

  // Справочна таблица за обединяване (население – приблизителни стойности)
  const CITY_TABLE = [
    { city: 'София', region: 'Югозападен', population: 1280000 },
    { city: 'Пловдив', region: 'Южен централен', population: 345000 },
    { city: 'Варна', region: 'Североизточен', population: 330000 },
    { city: 'Бургас', region: 'Югоизточен', population: 200000 },
    { city: 'Русе', region: 'Северен централен', population: 140000 },
    { city: 'Стара Загора', region: 'Югоизточен', population: 120000 },
    { city: 'Плевен', region: 'Северозападен', population: 95000 },
    { city: 'Велико Търново', region: 'Северен централен', population: 65000 }
  ];

  E.COLUMNS = COLUMNS;
  E.COL = Object.fromEntries(COLUMNS.map(c => [c.key, c]));
  E.TYPE_LABEL = TYPE_LABEL;
  E.CITIES = CITIES;
  E.EDU = EDU;
  E.CITY_TABLE = CITY_TABLE;
  E.NUMERIC = ['age', 'experience', 'height', 'weight', 'income'];
  E.CATEGORICAL = ['gender', 'education', 'city'];
  E.TEACHING_COUNT = TEACHING.length;
  E.RAW = TEACHING.map(x => ({ ...x })).concat(generate());
  E.RAW.forEach((row, i) => { row._row = i + 1; });
})(window.EDA);
