/* =========================================================
 * 协同过滤推荐算法 recommend.js
 *
 * 与论文第 4.4 节一一对应：
 *   4.4.1 buildMatrix —— 用户-景点偏好矩阵构建（行为加权）
 *   4.4.2 userCF      —— 基于用户的协同过滤 UserCF（余弦相似度）
 *   4.4.3 itemCF      —— 基于物品的协同过滤 ItemCF
 *   4.4.4 recommend   —— 0.5 / 0.5 加权融合 + Top-N + 冷启动兜底
 *
 * 行为权重（论文表 4-7）：评分 1~5 分直接取分值，收藏 3 分，打卡 4 分；
 * 同一用户对同一景点有多条行为时取最高权重，不做累加。
 * ========================================================= */
const dbx = require('./db');

/* 行为 → 权重基线，评分行为用实际分值覆盖 */
const WEIGHT = { rating: 0, favorite: 3, checkin: 4, comment: 2 };
/* 冷启动阈值：有效行为数少于该值直接走热门兜底 */
const COLD_START_MIN = 3;
/* 相似邻居数量（默认值；userCF 可通过 opts.K 覆盖，用于论文中的 K 值对比实验） */
const K_NEIGHBOR = 20;
/* 最小共同评分项，低于该值视为相似度不可信 */
const MIN_CO_RATE = 2;

/* ---------- 4.4.1 偏好矩阵构建 ---------- */
/* 返回 { byUser: Map<userId, Map<spotKey, score>>, byItem: Map<spotKey, Map<userId, score>> } */
function buildMatrix(rows) {
  const byUser = new Map();
  const byItem = new Map();

  const put = (userId, spotKey, score) => {
    if (!userId || !spotKey) return;
    const u = Number(userId);
    const key = String(spotKey);
    if (!byUser.has(u)) byUser.set(u, new Map());
    const um = byUser.get(u);
    /* 同景点取最高权重 */
    if (!um.has(key) || um.get(key) < score) um.set(key, score);

    if (!byItem.has(key)) byItem.set(key, new Map());
    const im = byItem.get(key);
    if (!im.has(u) || im.get(u) < score) im.set(u, score);
  };

  for (const r of rows) {
    const action = String(r.action || '');
    const base = action === 'rating' ? Number(r.score != null ? r.score : r.weight) : (WEIGHT[action] != null ? WEIGHT[action] : Number(r.weight) || 0);
    /* 评分行为：rating_record 的 score 在 rows.score 上；user_behavior 的 weight 已等于分值 */
    const score = action === 'rating' ? (Number(r.score) || Number(r.weight) || 0) : base;
    if (score > 0) put(r.user_id, r.spot_key, score);
  }
  return { byUser, byItem };
}

/* ---------- 余弦相似度 ---------- */
/* a, b 为 Map<key, score> */
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const [k, v] of a) {
    na += v * v;
    const bv = b.get(k);
    if (bv != null) dot += v * bv;
  }
  for (const [, v] of b) nb += v * v;
  if (!na || !nb) return 0;
  return dot / Math.sqrt(na * nb);
}

/* 共同评分项数量 */
function commonCount(a, b) {
  let n = 0;
  for (const k of a.keys()) if (b.has(k)) n++;
  return n;
}

/* ---------- 4.4.2 UserCF ---------- */
/* 返回 { spotKey: { score, sim, by, base } } */
function userCF(byUser, userId, candidates, opts = {}) {
  const K = Number(opts.K) || K_NEIGHBOR;
  const MIN_CO = opts.MIN_CO_RATE != null ? Number(opts.MIN_CO_RATE) : MIN_CO_RATE;
  const mine = byUser.get(Number(userId));
  const out = {};
  if (!mine || mine.size === 0) return out;

  /* 计算与其他用户的相似度，取 Top-K */
  const sims = [];
  for (const [uid, vec] of byUser) {
    if (uid === Number(userId)) continue;
    if (commonCount(mine, vec) < MIN_CO) continue;
    const sim = cosine(mine, vec);
    if (sim > 0.01) sims.push({ uid, vec, sim });
  }
  sims.sort((a, b) => b.sim - a.sim);
  const neighbors = sims.slice(0, K);
  if (!neighbors.length) return out;

  for (const key of candidates) {
    let num = 0, den = 0, best = null;
    for (const nb of neighbors) {
      const s = nb.vec.get(key);
      if (s == null) continue;
      num += nb.sim * s;
      den += nb.sim;
      if (!best || nb.sim > best.sim) best = { sim: nb.sim, uid: nb.uid };
    }
    if (den > 0) {
      out[key] = {
        score: num / den,
        sim: Math.min(1, den / 6),
        by: best ? best.uid : null,
        base: 'uc'
      };
    }
  }
  return out;
}

/* ---------- 4.4.3 ItemCF ---------- */
/* 返回 { spotKey: { score, sim, base, anchor } } */
function itemCF(byUser, byItem, userId, candidates) {
  const mine = byUser.get(Number(userId));
  const out = {};
  if (!mine || mine.size === 0) return out;

  for (const key of candidates) {
    const iv = byItem.get(key);
    if (!iv) continue;
    let num = 0, den = 0, best = null;
    for (const [mid, myScore] of mine) {
      if (mid === key) continue;
      const mv = byItem.get(mid);
      if (!mv) continue;
      const sim = cosine(iv, mv);
      if (sim <= 0.02) continue;
      num += sim * myScore;
      den += sim;
      if (!best || sim > best.sim) best = { sim, mid };
    }
    if (den > 0) {
      out[key] = {
        score: num / den,
        sim: Math.min(1, den / 4),
        anchor: best ? best.mid : null,
        base: 'ic'
      };
    }
  }
  return out;
}

/* ---------- 热门兜底（冷启动） ---------- */
function popular(spots, exclude, topN) {
  const list = spots
    .filter(s => !exclude.has(String(s.spot_key)))
    .sort((a, b) => (Number(b.heat) || 0) - (Number(a.heat) || 0) || (Number(b.rating) || 0) - (Number(a.rating) || 0))
    .slice(0, topN);
  const maxHeat = list.length ? Math.max(...list.map(s => Number(s.heat) || 1)) : 1;
  return list.map(s => ({
    id: s.spot_key,
    name: s.name,
    city: s.city,
    score: Number(s.rating) || 0,
    match: Math.round((s.rating || 4) * 20),
    why: `热门兜底 · 全站热度前 ${Math.min(topN, list.length)}（冷启动）`,
    algo: 'popular',
    heat: Number(s.heat) || 0,
    _norm: (Number(s.heat) || 0) / maxHeat
  }));
}

/* ---------- 4.4.4 融合推荐 ---------- */
/**
 * @param {number|string} userId 目标用户
 * @param {object} opts { topN, behaviorRows, spots }
 * @returns {{ mode, list, stats }}
 */
async function recommend(userId, opts = {}) {
  const topN = Math.max(1, Math.min(Number(opts.topN) || 10, 50));
  const rows = opts.behaviorRows || await dbx.allBehaviors();
  const spots = opts.spots || await dbx.listSpots(2000);
  const spotMap = new Map(spots.map(s => [String(s.spot_key), s]));

  const { byUser, byItem } = buildMatrix(rows);
  const mine = byUser.get(Number(userId));

  /* 冷启动：无行为或行为过少，走热门兜底 */
  if (!mine || mine.size < COLD_START_MIN) {
    return {
      mode: 'popular',
      list: popular(spots, new Set(mine ? [...mine.keys()] : []), topN),
      stats: { behaviors: mine ? mine.size : 0, algo: 'popular', need: COLD_START_MIN }
    };
  }

  /* 候选集：全站景点中剔除该用户已有行为的 */
  const candidates = spots
    .map(s => String(s.spot_key))
    .filter(k => !mine.has(k));

  const uc = userCF(byUser, userId, candidates);
  const ic = itemCF(byUser, byItem, userId, candidates);

  /* 0.5 / 0.5 加权融合 */
  const merged = new Map();
  for (const key of candidates) {
    const a = uc[key];
    const b = ic[key];
    if (!a && !b) continue;
    const score = (a ? a.score : 0) * 0.5 + (b ? b.score : 0) * 0.5;
    const sim = Math.max(a ? a.sim : 0, b ? b.sim : 0);
    const picked = (a && b) ? (a.score >= b.score ? a : b) : (a || b);
    merged.set(key, { score, sim, picked, hasUC: !!a, hasIC: !!b });
  }

  /* 融合结果为空时退回热门兜底 */
  if (!merged.size) {
    return {
      mode: 'popular',
      list: popular(spots, new Set([...mine.keys()]), topN),
      stats: { behaviors: mine.size, algo: 'popular-fallback', need: COLD_START_MIN }
    };
  }

  const list = [...merged.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, topN)
    .map(([key, v]) => {
      const s = spotMap.get(key) || {};
      const why = explain(v, spotMap);
      return {
        id: key,
        name: s.name || key,
        city: s.city || '',
        score: Number(v.score.toFixed(3)),
        /* 匹配度归一化到百分制，供前端卡片展示 */
        match: Math.min(99, Math.max(30, Math.round((v.score / 5) * 100))),
        why,
        algo: v.hasUC && v.hasIC ? 'uc+ic' : (v.hasUC ? 'usercf' : 'itemcf'),
        rating: Number(s.rating) || 0,
        price: s.price || '',
        tags: s.tags || '',
        cover: s.cover || '',
        lng: s.lng,
        lat: s.lat
      };
    });

  return {
    mode: 'cf',
    list,
    stats: { behaviors: mine.size, algo: 'UserCF+ItemCF', topN, candidates: candidates.length }
  };
}

/* 生成推荐理由：把算法内部的 id 翻译成可读文案 */
function explain(v, spotMap) {
  const p = v.picked || {};
  if (p.base === 'uc') {
    return `与你口味相近的用户也在关注（相似度 ${Math.round((p.sim || 0) * 100)}%）`;
  }
  if (p.base === 'ic') {
    const anchor = spotMap.get(String(p.anchor));
    const nm = anchor ? anchor.name : p.anchor;
    return `与你评过高分的「${nm}」相似度 ${Math.round((p.sim || 0) * 100)}%`;
  }
  return '综合协同过滤推荐';
}

/* ---------- 实验评估用：给定矩阵直接计算 Top-N ---------- */
/* 不查库，便于离线交叉验证 */
function recommendFromMatrix(matrix, userId, candidates, topN = 10, opts = {}) {
  const { byUser, byItem } = matrix;
  const mine = byUser.get(Number(userId));
  if (!mine) return [];
  const uc = userCF(byUser, userId, candidates, opts);
  const ic = itemCF(byUser, byItem, userId, candidates);
  const merged = new Map();
  for (const key of candidates) {
    const a = uc[key], b = ic[key];
    if (!a && !b) continue;
    merged.set(key, (a ? a.score : 0) * 0.5 + (b ? b.score : 0) * 0.5);
  }
  return [...merged.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN).map(([id, score]) => ({ id, score }));
}

module.exports = {
  WEIGHT, COLD_START_MIN, K_NEIGHBOR, MIN_CO_RATE,
  buildMatrix, cosine, userCF, itemCF, popular, recommend, recommendFromMatrix
};
