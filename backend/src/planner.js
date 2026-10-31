/* =========================================================
 * 行程分区核心：景点去重 + 扇形分区（按方位角均分）
 * 纯函数，不依赖数据库 / 网络，前后端可共用同一套算法。
 * 前端 js/ai.js 里有等价实现（offlinePlanner），保持一致。
 * ========================================================= */

/* 两点球面距离（km） */
function dist(a, b) {
  const R = 6371;
  const dLa = (b.lat - a.lat) * Math.PI / 180;
  const dLo = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(dLa / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/* 相对锚点的方位角：0° = 正东，逆时针递增；北（-90°）归一到 90° */
function bearing(anchor, p) {
  const dLng = p.lng - anchor.lng;
  const dLat = p.lat - anchor.lat;
  let deg = Math.atan2(dLat, dLng) * 180 / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

/* 一、景点去重：同名景点只保留在最早出现的那一天。
 * 被移除的位置由 spare（未排入任何天的候选）按「同区域优先」补位，
 * 保证每天数量不变。返回 {days, removed, filled} */
function deduplicateSpots(days, spare) {
  const seen = new Set();
  const pool = Array.isArray(spare) ? spare.slice() : [];
  const removed = [];
  const filled = [];
  const want = days.map(d => d.length);           /* 记录改造前每天的目标数量 */

  const out = days.map(day => {
    const kept = [];
    day.forEach(s => {
      const key = s.name || s.id;
      if (seen.has(key)) { removed.push({ name: key, id: s.id }); return; }
      seen.add(key);
      kept.push(s);
    });
    return kept;
  });

  /* 用备选补位：优先同 city，其次离该天已有景点最近 */
  out.forEach((day, i) => {
    while (day.length < want[i] && pool.length) {
      let pick = -1, best = Infinity;
      pool.forEach((c, ci) => {
        const sameCity = day.some(s => s.city && c.city && s.city === c.city);
        const ref = day[day.length - 1] || null;
        const d = ref && ref.lng != null ? dist(ref, c) : 9999;
        const score = d - (sameCity ? 30 : 0);     /* 同城直接减 30km，等效优先 */
        if (score < best) { best = score; pick = ci; }
      });
      if (pick < 0) break;
      const cand = pool.splice(pick, 1)[0];
      if (seen.has(cand.name || cand.id)) continue;
      seen.add(cand.name || cand.id);
      day.push(cand);
      filled.push({ day: i + 1, name: cand.name });
    }
  });
  return { days: out, removed, filled };
}

/* 二、扇形分区：按相对城市中心的方位角排序，把 360° 均分成 n 份。
 * 容量均衡：扇形内景点过多时，把「角距最接近分界」的点让给相邻扇形。
 * 同一天内按距中心由近到远排序 → 路线从中心向外单向推进，不折返。 */
function fanCluster(spots, center, dayCount) {
  const n = Math.max(1, dayCount | 0);
  const list = spots.filter(s => s && s.lng != null && s.lat != null)
    .map(s => ({ s, ang: bearing(center, s), d: dist(center, s) }))
    .sort((a, b) => a.ang - b.ang);

  if (!list.length) return Array.from({ length: n }, () => []);
  if (n === 1) return [list.slice().sort((a, b) => a.d - b.d).map(x => x.s)];

  const step = 360 / n;
  const buckets = Array.from({ length: n }, () => []);
  list.forEach(it => {
    const k = Math.min(n - 1, Math.floor(it.ang / step));
    buckets[k].push(it);
  });

  /* 容量均衡：目标每天 ceil(总数/n)，把超额扇形里最靠边界的点移给缺额邻居 */
  const cap = Math.ceil(list.length / n);
  for (let round = 0; round < n * 2; round++) {
    const over = buckets.findIndex(b => b.length > cap);
    if (over < 0) break;
    const short = buckets.findIndex((b, i) => b.length < cap && i !== over);
    if (short < 0) break;
    const b = buckets[over];
    /* 移出靠近 short 一侧边界的点：over 在 short 顺时针侧就让出末尾，反之让出开头 */
    const give = short > over ? b.pop() : b.shift();
    buckets[short].push(give);
    buckets[short].sort((x, y) => x.ang - y.ang);
  }

  /* 每天内部：由近到远 */
  return buckets.map(b => b.sort((x, y) => x.d - y.d).map(x => x.s));
}

module.exports = { dist, bearing, deduplicateSpots, fanCluster };
