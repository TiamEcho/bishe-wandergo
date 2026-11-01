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
 * 边界自适应：方位角不是均匀分布的（景点常挤在市中心 90° 范围内），
 *   均分会让某些扇形空着、另一些塞满，所以从「均分」逐步放宽到「同片区聚成一簇」，
 *   取第一组能让每天景点数达到目标（ceil(总数/n)）的边界。
 * 容量均衡：某天仍超额时，把「角距最接近分界」的点让给相邻缺额天。
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

  /* 扇区为空：把「与空扇区角距最近」的超额扇区拆一半过去，
   * 景点都挤在市中心同侧时（方位角跨度很小）常见，保证每天都有可走的点 */
  const angGap = (i, k) => {
    const centerOf = k => (k + 0.5) * step;
    const diff = Math.abs(centerOf(i) - centerOf(k));
    return Math.min(diff, 360 - diff);
  };
  for (let round = 0; round < n; round++) {
    const short = buckets.findIndex(b => b.length === 0);
    if (short < 0) break;
    let big = -1, bestGap = Infinity;
    buckets.forEach((b, i) => {
      if (i === short || b.length < 2) return;
      const g = angGap(short, i);
      if (g < bestGap) { bestGap = g; big = i; }
    });
    if (big < 0) break;
    const sortedBig = buckets[big].slice().sort((x, y) => x.d - y.d);
    const half = sortedBig.slice(Math.ceil(sortedBig.length / 2));
    const keep = new Set(half);
    buckets[big] = sortedBig.filter(x => !keep.has(x));
    buckets[short] = half;
  }

  /* 每天内部：由近到远 */
  return buckets.map(b => b.sort((x, y) => x.d - y.d).map(x => x.s));
}

/* 连续分块：按方位角排序后，从「最长的角度空档」处切开，
 * 再按顺序切成 n 段，每段内部由近到远。
 * 用于海外城市：景点是人工挑选的离散点，方位角分布不像国内那样成片，
 * 均分扇形会出现某天景点全在 40km 外、另一天只剩 2 个的情况。 */
function ringSplit(spots, center, dayCount) {
  const n = Math.max(1, dayCount | 0);
  const list = spots.filter(s => s && s.lng != null && s.lat != null)
    .map(s => ({ s, ang: bearing(center, s), d: dist(center, s) }))
    .sort((a, b) => a.ang - b.ang);

  if (!list.length) return Array.from({ length: n }, () => []);
  if (n === 1 || list.length <= n) {
    return Array.from({ length: n }, (_, i) => (list[i] ? [list[i].s] : []));
  }

  /* 找最大角距，从那里断开，避免同一片区被拆到首尾两天 */
  let cut = 0, gap = -1;
  for (let i = 0; i < list.length; i++) {
    const next = i === list.length - 1 ? list[0].ang + 360 : list[i + 1].ang;
    if (next - list[i].ang > gap) { gap = next - list[i].ang; cut = (i + 1) % list.length; }
  }
  const ring = list.slice(cut).concat(list.slice(0, cut));

  const base = Math.floor(ring.length / n);
  const extra = ring.length % n;
  const out = [];
  let p = 0;
  for (let i = 0; i < n; i++) {
    const size = base + (i < extra ? 1 : 0);
    out.push(ring.slice(p, p + size).sort((x, y) => x.d - y.d).map(x => x.s));
    p += size;
  }
  return out;
}

module.exports = { dist, bearing, deduplicateSpots, fanCluster, ringSplit };
