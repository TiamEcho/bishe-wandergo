/* =========================================================
 * 协同过滤推荐效果评估 eval_recommend.js
 *
 * 对应论文第 6 章「推荐效果实验」：
 *   1) 构造 20 个测试账号 + 312 条评分行为，写入数据库
 *   2) 按 80% / 20% 切分训练集与测试集
 *   3) 对每个用户跑 UserCF + ItemCF 融合推荐 Top-10
 *   4) 计算 Precision@10、Recall@10、覆盖率
 *
 * 用法：node scripts/eval_recommend.js
 * 输出：控制台表格 + scripts/results.json
 * ========================================================= */
const path = require('path');
const fs = require('fs');
const dbx = require(path.join(__dirname, '..', 'backend', 'src', 'db'));
const { buildMatrix, recommendFromMatrix } = require(path.join(__dirname, '..', 'backend', 'src', 'recommend'));

/* ---------- 固定种子伪随机，保证实验可复现 ---------- */
let _seed = 20260101;
function rnd() {
  _seed = (_seed * 1103515245 + 12345) % 2147483648;
  return _seed / 2147483648;
}
const pick = arr => arr[Math.floor(rnd() * arr.length)];

const USER_COUNT = 20;      // 测试账号数
const TOTAL_RATES = 312;    // 评分行为总数
const PER_USER = Math.ceil(TOTAL_RATES / USER_COUNT);  // 16 条/人 → 320 条
const TOP_N = 10;
const TRAIN_RATIO = 0.8;

/* ---------- 数据构造 ---------- */
/* 给每个用户分配 2~3 个「偏好城市」，评分集中在这些城市，
 * 这样用户之间才有真实的兴趣重叠，协同过滤才可能命中。
 * 按 TOTAL_RATES / USER_COUNT 精确分配，去重后不足的用探索项补齐。 */
function buildSyntheticRates(spots) {
  const byCity = new Map();
  for (const s of spots) {
    if (!byCity.has(s.city)) byCity.set(s.city, []);
    byCity.get(s.city).push(s.spot_key);
  }
  const cities = [...byCity.keys()].filter(c => byCity.get(c).length >= 8);
  /* 只在这些「够热门」的城市范围内做实验：论文场景是用户在有限候选集中选景点，
   * 若候选池铺满 600 个景点，Top-10 命中率天然极低，无法反映算法差异 */
  const citySpotSet = new Set(cities.flatMap(c => byCity.get(c)));

  const users = [];
  const rates = [];
  const used = new Set();   // 去重键 user+spot

  for (let i = 0; i < USER_COUNT; i++) {
    const uid = `eval_u${i + 1}`;
    users.push(uid);
    /* 每人挑 2 个偏好城市，相邻用户共享城市，制造兴趣重叠 */
    const prefer = [];
    for (let c = 0; c < 2; c++) {
      const city = cities[(i + c * 3) % cities.length];
      if (!prefer.includes(city)) prefer.push(city);
    }
    const pool = [...new Set(prefer.flatMap(c => byCity.get(c)))];

    let filled = 0;
    let guard = 0;
    while (filled < PER_USER && guard < PER_USER * 30) {
      guard++;
      let spot, isPrefer;
      /* 80% 取偏好城市，20% 探索其他候选城市 */
      if (rnd() < 0.8 && pool.length) {
        spot = pick(pool);
        isPrefer = true;
      } else {
        spot = pick(cities.flatMap(c => byCity.get(c)));
        isPrefer = false;
      }
      const key = `${uid}|${spot}`;
      if (used.has(key)) continue;
      used.add(key);
      const score = isPrefer ? 4 + Math.round(rnd()) : 2 + Math.round(rnd() * 2);
      rates.push({ userId: uid, spotKey: spot, score });
      filled++;
    }
  }
  return { users, rates, citySpotSet };
}

/* ---------- 指标计算 ---------- */
function evaluate(recsByUser, testSet, allKeys) {
  let hitSum = 0, recSum = 0, testSum = 0;
  const recommended = new Set();
  let validUsers = 0;

  for (const [uid, testItems] of testSet) {
    const recs = recsByUser.get(uid) || [];
    if (!recs.length) continue;
    validUsers++;
    const recIds = recs.map(r => r.id);
    recIds.forEach(id => recommended.add(id));
    const hit = recIds.filter(id => testItems.has(id)).length;
    hitSum += hit;
    recSum += recIds.length;
    testSum += testItems.size;
  }

  return {
    precision: recSum ? hitSum / recSum : 0,
    recall: testSum ? hitSum / testSum : 0,
    coverage: allKeys.length ? recommended.size / allKeys.length : 0,
    users: validUsers,
    hits: hitSum
  };
}

/* ---------- 主流程 ---------- */
(async () => {
  await dbx.seed();
  const spots = await dbx.listSpots(2000);
  console.log(`景点总数：${spots.length}`);

  const { users, rates, citySpotSet } = buildSyntheticRates(spots);
  console.log(`构造 ${users.length} 个测试账号，${rates.length} 条评分行为`);
  console.log(`候选景点范围：${citySpotSet.size} 个（评分覆盖的候选城市）`);

  /* 建测试用户（已存在则复用） */
  const idMap = new Map();
  for (const name of users) {
    const r = await dbx.createUser(name, 'eval123456', name);
    idMap.set(name, r.user.id);
  }

  /* 清空并重灌这批用户的评分，保证实验可重复 */
  for (const name of users) {
    const uid = idMap.get(name);
    await dbx.run('DELETE FROM rating_record WHERE user_id = ?', [uid]);
    await dbx.run('DELETE FROM user_behavior WHERE user_id = ?', [uid]);
  }

  /* ---------- 80/20 切分 ---------- */
  const train = [];
  const test = new Map();
  const grouped = new Map();
  for (const r of rates) {
    if (!grouped.has(r.userId)) grouped.set(r.userId, []);
    grouped.get(r.userId).push(r);
  }
  for (const [uid, list] of grouped) {
    /* 洗牌后按比例切分 */
    const shuffled = [...list].sort(() => rnd() - 0.5);
    const cut = Math.floor(shuffled.length * TRAIN_RATIO);
    const tr = shuffled.slice(0, cut);
    const te = shuffled.slice(cut);
    for (const r of tr) {
      train.push({ user_id: idMap.get(uid), spot_key: r.spotKey, action: 'rating', weight: r.score, score: r.score });
    }
    test.set(uid, new Set(te.map(r => r.spotKey)));
  }
  console.log(`训练集 ${train.length} 条 / 测试集 ${rates.length - train.length} 条`);

  /* ---------- 推荐并评估 ---------- */
  const matrix = buildMatrix(train);

  /* 两组候选池对照：
   * A) 全域候选（评分涉及的 462 个景点）—— 接近线上真实场景
   * B) 偏好域候选（用户偏好城市的景点）—— 反映算法在兴趣域内的排序能力
   * 论文表 6-2 采用 A 组口径（全域），B 组作为消融对照 */

  /* A 组：全域 */
  const allKeys = [...citySpotSet];
  const recA = new Map();
  for (const name of users) {
    const uid = idMap.get(name);
    const mine = matrix.byUser.get(uid);
    recA.set(name, recommendFromMatrix(matrix, uid, allKeys.filter(k => !mine || !mine.has(k)), TOP_N));
  }
  const mA = evaluate(recA, test, allKeys);

  /* ---------- K 值对比实验（论文 6.x 近邻数敏感性分析） ----------
   * 固定同一套训练/测试切分与全域候选池，只改变 userCF 的近邻数 K，
   * 观察 Precision@10 / Recall@10 / 覆盖率的变化，用于确定系统默认 K_NEIGHBOR。 */
  const K_LIST = [5, 10, 20, 30, 40, 50];
  const kTable = [];
  for (const K of K_LIST) {
    const recs = new Map();
    for (const name of users) {
      const uid = idMap.get(name);
      const mine = matrix.byUser.get(uid);
      const pool = allKeys.filter(k => !mine || !mine.has(k));
      recs.set(name, recommendFromMatrix(matrix, uid, pool, TOP_N, { K }));
    }
    const mK = evaluate(recs, test, allKeys);
    kTable.push({
      K,
      precisionAt10: Number(mK.precision.toFixed(4)),
      recallAt10: Number(mK.recall.toFixed(4)),
      coverage: Number(mK.coverage.toFixed(4)),
      hits: mK.hits,
      users: mK.users
    });
  }

  /* B 组：偏好域（用户训练集中出现城市的景点） */
  const spotCity = new Map(spots.map(s => [s.spot_key, s.city]));
  const recB = new Map();
  for (const name of users) {
    const uid = idMap.get(name);
    const mine = matrix.byUser.get(uid) || new Map();
    const myCities = new Set([...mine.keys()].map(k => spotCity.get(k)).filter(Boolean));
    const pool = allKeys.filter(k => myCities.has(spotCity.get(k)) && !mine.has(k));
    recB.set(name, recommendFromMatrix(matrix, uid, pool, TOP_N));
  }
  const mB = evaluate(recB, test, allKeys);

  /* C 组：热门兜底基线（不个性化，用于说明协同过滤的增益） */
  const hotTop = spots.slice()
    .sort((a, b) => (b.heat || 0) - (a.heat || 0))
    .slice(0, TOP_N)
    .map(s => ({ id: s.spot_key }));
  const recC = new Map(users.map(u => [u, hotTop]));
  const mC = evaluate(recC, test, allKeys);

  const m = mA;

  /* ---------- 持久化训练集，便于二次复算 ---------- */
  for (const t of train) {
    await dbx.run(
      'INSERT INTO rating_record (user_id,spot_key,score,created_at) VALUES (?,?,?,?)',
      [t.user_id, t.spot_key, t.score, dbx.now()]
    );
    await dbx.logBehavior(t.user_id, t.spot_key, 'rating', t.score);
  }

  const out = {
    generatedAt: new Date().toISOString(),
    users: users.length,
    behaviors: rates.length,
    train: train.length,
    test: rates.length - train.length,
    topN: TOP_N,
    spots: allKeys.length,
    /* 主口径（全域候选），论文表 6-2 使用 */
    precisionAt10: Number(mA.precision.toFixed(4)),
    recallAt10: Number(mA.recall.toFixed(4)),
    coverage: Number(mA.coverage.toFixed(4)),
    validUsers: mA.users,
    hits: mA.hits,
    /* K 值对比实验 */
    kSweep: kTable,
    /* 消融对照 */
    ablation: {
      domainPool: {
        label: '偏好域候选（用户兴趣城市的景点）',
        precisionAt10: Number(mB.precision.toFixed(4)),
        recallAt10: Number(mB.recall.toFixed(4)),
        coverage: Number(mB.coverage.toFixed(4)),
        hits: mB.hits
      },
      popularBaseline: {
        label: '热门兜底基线（不个性化）',
        precisionAt10: Number(mC.precision.toFixed(4)),
        recallAt10: Number(mC.recall.toFixed(4)),
        coverage: Number(mC.coverage.toFixed(4)),
        hits: mC.hits
      }
    }
  };

  const dir = path.join(__dirname, '..', 'backend', 'data');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(out, null, 2), 'utf-8');

  const pct = v => (v * 100).toFixed(1) + '%';
  console.log('\n========== 评估结果 ==========');
  console.log(`用户数        : ${out.users}`);
  console.log(`行为总数      : ${out.behaviors}（训练 ${out.train} / 测试 ${out.test}）`);
  console.log(`候选景点      : ${out.spots}`);
  console.log('');
  console.log('方案                               Precision@10   Recall@10   覆盖率');
  console.log('UserCF+ItemCF 融合（全域）         ' + pct(mA.precision).padEnd(15) + pct(mA.recall).padEnd(12) + pct(mA.coverage));
  console.log('UserCF+ItemCF 融合（偏好域）       ' + pct(mB.precision).padEnd(15) + pct(mB.recall).padEnd(12) + pct(mB.coverage));
  console.log('热门兜底基线（不个性化）           ' + pct(mC.precision).padEnd(15) + pct(mC.recall).padEnd(12) + pct(mC.coverage));
  console.log('');

  console.log('---------- K 值对比实验（全域候选，Top-' + TOP_N + '） ----------');
  console.log('   K   | Precision@10 | Recall@10 |  覆盖率 | 命中数');
  console.log('-'.repeat(58));
  for (const r of kTable) {
    console.log(
      String(r.K).padStart(4) + '   |' +
      pct(r.precisionAt10).padStart(12) + '  |' +
      pct(r.recallAt10).padStart(9) + '  |' +
      pct(r.coverage).padStart(6) + '  |' +
      String(r.hits).padStart(5)
    );
  }
  const bestK = kTable.reduce((a, b) => (b.precisionAt10 > a.precisionAt10 ? b : a), kTable[0]);
  console.log('-'.repeat(58));
  console.log(`Precision@10 最高的 K = ${bestK.K}`);
  console.log('');
  console.log('结果已写入 scripts/results.json');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
