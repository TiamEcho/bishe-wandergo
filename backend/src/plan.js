/* =========================================================
 * AI 行程规划（/api/plan/route）
 * 流程：
 *   ① 收集景点：大模型生成（可选）→ 站内景点库补足 → 共 10-12 个，不分天
 *   ② 分区：国内 fanCluster 扇形均分；海外 ringSplit 按距离连续分块
 *   ③ 每天至少 3 个景点：站内库余量补位 → 从最挤那天拆一半
 *   ④ 高德周边检索：每个景点 1-2 家餐厅，当天最后一家附近 1 家住宿
 * 任何一步缺少外部条件（无 AMAP_KEY / 无 DOTS_API_KEY）都会降级，接口始终返回可用结构。
 * ========================================================= */
const dbx = require('./db');
const amap = require('./amap');
const { chatJson } = require('./dots');
const { localEats } = require('./eats');
const { searchPlaces, resolveCenter, isOverseas, geocodeOverseas } = require('./services/places');
const { dist, bearing, fanCluster, ringSplit } = require('./planner');

const PLAN_SYSTEM = `你是资深旅行规划师。请为用户的目的地推荐 10-12 个真实的景点 / 打卡点。
要求：
1) 只输出严格 JSON，不要解释、不要 markdown 代码块；
2) 景点必须真实存在，优先选当地人认可的代表性点位（含自然风景、人文古迹、街区夜市等不同类型）；
3) 不要输出餐厅、酒店、行政区名（如「朝阳区」）、省份名（如「西藏」）；
4) 格式：{"spots":[{"name":"景点名","city":"所在城市"}]}`;

/* ---- 站内景点库：城市匹配 ----
 * 只认「城市 / 省份完全相等」，以及「景点库里的城市名包含查询词」这一种包含关系
 * （查「上海」能命中库里的「上海市」）。
 * 绝对不能反过来用 city.includes(s.city)：查「上海」时 s.city 为「北京」这类空串或
 * 任意子串都会命中，线上实测导致成都 / 上海都返回北京的故宫博物院。 */
function cityHit(name, city) {
  if (!name || !city) return false;
  return name === city || name.includes(city);
}
function poolOfCity(city, rg) {
  return dbx.SPOTS.filter(s => s.name && s.lng != null &&
    (cityHit(s.city, city) || cityHit(s.province, city)) &&
    (!rg || !s.region || s.region === rg));
}

/* 站内库不足时的近邻补位：半径收紧到 60km 且要求同省，
   否则「杭州」可能混进苏州的周庄、山塘街，单日里程直接飙到 150km */
function nearPool(center, exclude, limit = 14) {
  const has = new Set(exclude.map(s => s.name));
  const provs = new Set(exclude.map(s => s.province).filter(Boolean));
  return dbx.SPOTS
    .filter(s => s.name && s.lng != null && !has.has(s.name))
    .filter(s => (s.province ? provs.has(s.province) : true))
    .map(s => ({ s, d: dist(center, s) }))
    .filter(x => x.d < 60)
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map(x => x.s);
}

function toSpot(s) {
  return {
    id: s.spot_id || s.id || s.name,
    name: s.name,
    city: s.city || '',
    address: s.address || '',
    lng: Number(s.lng),
    lat: Number(s.lat),
    rating: Number(s.rating) || 0,
    price: s.price || '',
    hours: s.hours || '',
    traffic: s.traffic || '',
    tags: s.tags || '',
    desc: s.desc || '',
    img: s.img || ''
  };
}

/* 检索结果 → 站内结构（category 保留「购物 / 文创 / 美食 / 休闲 / 文化」标签） */
function fromAmap(p) {
  return {
    id: p.id, name: p.name, city: p.city || '', address: p.address || '',
    lng: p.lng, lat: p.lat, rating: p.rating || 0, price: p.price || '',
    hours: p.hours || '', traffic: '', tags: p.category || '', desc: '',
    img: '', category: p.category || '景点', type: p.type || '',
    source: p.source || ''
  };
}

/* ---- ① 收集景点 ----------------------------------------------------
 * 国内：高德关键词检索为主，AI 建议 + 站内库兜底
 * 海外：站内精编库 → AI 生成景点名 + Nominatim 坐标 → OSM 兜底
 *   海外不能靠检索：高德境外覆盖几乎为零，OSM 的 POI 密度又堆满
 *   小型美术馆和无名公园（实测浅草寺、晴空塔这类地标反而不在结果里），
 *   所以海外的景点名单只能靠站内精编 + 大模型的常识。
 * ------------------------------------------------------------------- */
async function collectSpots(city, want) {
  const libPool = poolOfCity(city).map(toSpot);
  const byName = new Map(libPool.map(s => [s.name, s]));
  let aiNames = [];

  /* 中心点：站内库均值 → 高德地理编码 → 已知海外城市表 → 默认北京
   * 必须先于检索确定：路由层要靠它判定走国内高德还是海外 OSM */
  let center = null;
  if (libPool.length) {
    center = {
      lng: libPool.reduce((a, s) => a + s.lng, 0) / libPool.length,
      lat: libPool.reduce((a, s) => a + s.lat, 0) / libPool.length
    };
  }
  const geo = await amap.geocodeCity(city);
  if (geo) center = { lng: geo.lng, lat: geo.lat };
  center = resolveCenter(city, center) || { lng: 116.397, lat: 39.908 };

  const overseas = isOverseas(city, center);

  /* 按目的地自动选源，返回结构一致（places 已带 category 与 source）。
   * 站内库已凑满就不再检索：既省一次高德请求，也避免把人工整理的地标
   * 换成检索出来的无名公园 */
  const skipSearch = libPool.length >= want;
  const found = skipSearch
    ? { places: [], provider: 'skip' }
    : await searchPlaces(city, { center, limit: 200, skipOsm: skipSearch });
  const poiPool = (found.places || []).map(fromAmap);

  const chosen = [];
  const push = s => {
    if (!s || chosen.length >= want) return;
    if (chosen.some(c => c.name === s.name)) return;
    chosen.push(s);
  };

  /* --- 海外：站内精编库打底，数量不够再让大模型补名单 --- */
  if (overseas) {
    /* 1) 站内精编景点：坐标、描述、评分都是人工整理，质量最高 */
    libPool
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .forEach(push);

    /* 2) 大模型补名单：站内库不够时才调，避免白花钱 */
    if (chosen.length < want) {
      const j = await chatJson(PLAN_SYSTEM, `目的地：${city}\n请推荐 ${want} 个景点。`);
      const names = j && Array.isArray(j.spots)
        ? j.spots.map(x => String((x && x.name) || '').trim()).filter(Boolean)
        : [];

      /* 逐个地理编码，并发 4：Nominatim 有每秒 1 次的礼貌限制 */
      const pending = names
        .filter(n => !chosen.some(c => c.name.includes(n) || n.includes(c.name)))
        .slice(0, Math.max(0, want - chosen.length) + 4);

      let cursor = 0;
      const worker = async () => {
        while (cursor < pending.length && chosen.length < want) {
          const name = pending[cursor++];
          const g = await geocodeOverseas(name, city);
          if (!g) continue;
          push({
            id: 'geo_' + name, name, city, address: g.display.split(',').slice(0, 2).join(','),
            lng: g.lng, lat: g.lat, rating: 0, price: '', hours: '', traffic: '',
            tags: '大模型推荐', desc: '', img: '', category: '景点', source: 'geo'
          });
        }
      };
      await Promise.all(Array.from({ length: 4 }, worker));
    }

    /* 3) 仍不够：用 OSM 检索结果按知名度补位（此时只当兜底用） */
    if (chosen.length < want) {
      poiPool
        .filter(p => p.category !== '美食')
        .sort((a, b) => dist(center, a) - dist(center, b))
        .forEach(push);
    }
  } else {
    /* --- 国内：站点覆盖度优先，不足再让大模型补名单 ---
     * 之前一律先调大模型，站内库的「东方明珠 / 上海迪士尼 / 和平饭店」这类
     * 高热度打卡点根本没机会进场，12 个名额全被 AI 报的地名占满。 */
    if (libPool.length < want) {
      const j = await chatJson(PLAN_SYSTEM, `目的地：${city}\n请推荐 ${want} 个景点。`);
      if (j && Array.isArray(j.spots)) {
        aiNames = j.spots.map(x => String((x && x.name) || '').trim()).filter(Boolean);
      }
    }

    /* 0) 站内库高热度景点优先（东方明珠 / 迪士尼 / 和平饭店这类必打卡点） */
    libPool.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0)).forEach(push);

    /* 1) AI 点名的景点优先：站内库 → 检索池 → 地理编码 */
    for (const name of aiNames) {
      if (chosen.length >= want) break;
      const hit = byName.get(name)
        || libPool.find(s => s.name.includes(name) || name.includes(s.name))
        || poiPool.find(s => s.name.includes(name) || name.includes(s.name));
      if (hit) { push(hit); continue; }
      const g = await amap.geocodeCity(city + name);
      if (!g) continue;
      push({
        id: 'am_' + name, name, city, address: city + name, lng: g.lng, lat: g.lat,
        rating: 0, price: '', hours: '', traffic: '', tags: '关键词检索', desc: '', img: ''
      });
    }

    /* 2) 检索池：按「类别均衡 + 评分 + 距中心由近及远」排序后补入，
     *    保证购物 / 文创 / 美食 / 休闲 / 文化都有机会进入行程，而不是清一色风景名胜；
     *    站内库已凑满时整段跳过，否则每次都要白等一遍高德检索 */
    if (chosen.length < want) {
      const cats = ['景点', '购物', '文创', '美食', '休闲', '文化'];
      const buckets = {};
      poiPool.forEach(s => (buckets[s.category || '景点'] = buckets[s.category || '景点'] || []).push(s));
      Object.keys(buckets).forEach(k => buckets[k].sort((a, b) =>
        (b.rating - a.rating) || (dist(center, a) - dist(center, b))));
      let guard = 0;
      while (chosen.length < want && guard++ < poiPool.length * 2) {
        cats.forEach(k => {
          const s = (buckets[k] || []).shift();
          if (s) push(s);
        });
      }
    }

    /* 3) 近邻补位：同城库已全部入场后仍不足，才补 60km 内同省景点 */
    if (chosen.length < want) nearPool(center, libPool, 30).map(toSpot).forEach(push);
  }

  /* 命中来源统计：站内库的 id 是 spot_xxx / 纯名称，
   * 检索结果一定是 am_ / osm_ / geo_ 前缀 */
  const isRemote = c => /^(am_|osm_|geo_)/.test(String(c.id));

  return {
    chosen: chosen.slice(0, want),
    /* 近邻余量：同城库不够时，60km 内同省的补位候选，供「某天景点太少」时回捞 */
    rest: chosen.length >= want
      ? []
      : nearPool(center, libPool, 30).map(toSpot).filter(s => !chosen.some(c => c.name === s.name)),
    center,
    libraryHit: chosen.filter(c => !isRemote(c)).length,
    amapHit: chosen.filter(c => String(c.id).startsWith('am_')).length,
    osmHit: chosen.filter(c => String(c.id).startsWith('osm_')).length,
    scanned: poiPool.length,
    provider: found.provider || 'none',
    overseas,
    /* 美食类候选：海外城市没有本地美食库，餐饮兜底改从这里按距离挑最近的两家 */
    foodPool: poiPool.filter(p => p.category === '美食')
  };
}

/* ---- ④ 周边餐饮 / 住宿 ---- */
async function attachPoi(day, idx, lastIdx, city, foodPool = [], overseas = false) {
  /* 当天最后一家景点：搜住宿（1 家） */
  const spot = day[idx];
  const out = { restaurants: [], hotel: null };

  /* 海外城市跳过：高德对境外坐标的周边检索必然为空，
   * 只会白等一个超时（15s × 每天景点数） */
  if (amap.isOn() && !overseas) {
    const rs = await amap.restaurantAround(spot.lng, spot.lat, 500, 6);
    out.restaurants = rs.slice(0, 2).map(r => ({
      name: r.name, address: r.address, location: r.location,
      rating: r.rating, price: r.price, distance: Math.round(r.distance || 0)
    }));
    if (idx === lastIdx) {
      const hs = await amap.hotelAround(spot.lng, spot.lat, 1500, 4);
      if (hs.length) {
        const h = hs[0];
        out.hotel = {
          name: h.name, address: h.address, location: h.location,
          rating: h.rating, price: h.price, distance: Math.round(h.distance || 0)
        };
      }
    }
  }

  /* 无 Key / 检索为空：用站内本地美食库兜底，保证每天都有餐饮建议。
   * 按 idx 轮转取，避免同一城市的每家景点都推同样的两家（东京只有 4 条本地美食，
   * 之前每天都是筑地场外市场 + 一兰拉面）。
   * 海外城市在 eats.js 里没有条目时，回落到检索池里的美食类点位 */
  if (!out.restaurants.length) {
    const raw = localEats(city, spot.city || city) || [];
    if (raw.length) {
      const start = (idx * 2) % raw.length;
      out.restaurants = [0, 1]
        .map(k => raw[(start + k) % raw.length])
        .filter(Boolean)
        .map(e => ({
          name: e.name, address: (spot.city || city) + '本地推荐', location: '',
          rating: 0, price: e.price ? String(e.price) : '', distance: 0, local: true
        }));
    }
  }
  if (!out.restaurants.length) {
    /* 从检索池里挑离当前景点最近的两家餐厅 */
    const near = (foodPool || [])
      .map(f => ({ f, d: dist(spot, f) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    out.restaurants = near.length
      ? near.map(x => ({
        name: x.f.name, address: x.f.address || '', location: '',
        rating: 0, price: '', distance: Math.round(x.d * 1000), local: true
      }))
      : [{ name: `${spot.name}附近餐厅`, address: '就近选择当地餐馆', location: '', rating: 0, price: '', distance: 0, local: true }];
  }
  if (idx === lastIdx && !out.hotel) {
    out.hotel = {
      name: `${spot.name}周边住宿`, address: (spot.city || city) + ' · 建议就近选择',
      location: '', rating: 0, price: '', distance: 0, local: true
    };
  }
  return out;
}

/**
 * 生成行程
 * @param {string} city 目的地
 * @param {number} days 天数
 * @param {number} want 景点总数（默认 10-12）
 */
async function planRoute(city, days, want) {
  amap.clearLastError();
  const d = Math.max(1, Number(days) || 2);
  /* ④ 收集景点：AI 生成（20 个）→ 去重 → 按方位角排序预分组 → 扇形分区 →
   *    某天景点偏少时从最多那天借一个 → 周边餐饮住宿 */
  const wantSpots = Math.min(20, Math.max(12, d * 4));
  const { chosen, rest, center, libraryHit, amapHit, osmHit, scanned, provider, foodPool, overseas } =
    await collectSpots(city, wantSpots);

  /* ② 排序 + 分区：国内按方位角排序后扇形均分（景点成片分布，均分最均衡）；
   *    海外按距中心排序后连续分块（人工挑选的离散点，均分会切出
   *    「一天全在 40km 外、一天只剩 2 个」这种极端分配） */
  const ordered = chosen.slice().sort((a, b) => bearing(center, a) - bearing(center, b));
  const n = Math.min(d, Math.max(1, Math.ceil(ordered.length / 3)));
  const near = ordered.slice().sort((a, b) => dist(center, a) - dist(center, b));
  const fanDays = overseas ? ringSplit(near, center, n) : fanCluster(ordered, center, n);

  /* ③b 天数回归：景点全挤在同一侧时扇区可能为空，先保证每天都有分配 */
  const used = new Set(fanDays.flat().map(s => s.name));
  fanDays.forEach(list => {
    if (list.length) return;
    while (rest.length && !list.length) {
      const cand = rest.shift();
      if (used.has(cand.name)) continue;
      used.add(cand.name);
      list.push(cand);
    }
  });

  /* ③c 每天至少 3 个景点：优先补方位角相邻的站内库余量（rest，同省 60km 内），
   *     余量不够再从「最挤那天」拆一半过来（景点全挤在同一侧时必走这一步） */
  const totalAvail = chosen.length + rest.filter(x => !used.has(x.name)).length;
  const MIN_PER_DAY = Math.min(Math.floor(totalAvail / n), 3);
  const dayDist = (list, pt) => (list.length ? Math.min(...list.map(c => dist(c, pt))) : 9999);
  const restPool = rest.filter(x => !used.has(x.name));
  for (let guard = 0; guard < n * 8; guard++) {
    /* thin = 景点最少的那一天；它已达标说明所有天都达标 */
    const thin = fanDays.reduce((acc, l, i) =>
      (acc < 0 || l.length < fanDays[acc].length ? i : acc), -1);
    if (thin < 0 || fanDays[thin].length >= MIN_PER_DAY) break;
    const target = fanDays[thin];
    const mid = (thin + 0.5) * (360 / n);
    const angGap = s => {
      const diff = Math.abs(bearing(center, s) - mid);
      return Math.min(diff, 360 - diff);
    };

    /* 1) 站内库余量：同扇区内取角距最近的，否则退化为离该天最近的 */
    let best = -1, bestScore = Infinity;
    restPool.forEach((c, ci) => {
      if (used.has(c.name)) return;
      const score = angGap(c) < 360 / n ? angGap(c) : 180 + dayDist(target, c);
      if (score < bestScore) { bestScore = score; best = ci; }
    });
    if (best >= 0 && bestScore < 180) {
      const cand = restPool.splice(best, 1)[0];
      used.add(cand.name);
      target.push(cand);
      continue;
    }

    /* 2) 余量耗尽：从最多那天拆一半过来 */
    let src = -1;
    fanDays.forEach((l, i) => {
      if (i !== thin && l.length >= MIN_PER_DAY && (src < 0 || l.length > fanDays[src].length)) src = i;
    });
    if (src < 0) break;
    const half = fanDays[src].slice().sort((a, b) => dist(center, a) - dist(center, b))
      .slice(Math.ceil(fanDays[src].length / 2));
    const move = new Set(half);
    fanDays[src] = fanDays[src].filter(x => !move.has(x));
    target.push(...half);
  }

  /* ④ 每天按距中心由近到远 → 顺序推进；再加餐饮与住宿 */
  const out = [];
  for (let i = 0; i < fanDays.length; i++) {
    const list = fanDays[i];
    if (!list.length) { out.push({ day: i + 1, spots: [] }); continue; }
    const sorted = list.slice().sort((a, b) => dist(center, a) - dist(center, b));
    const items = [];
    let start = 9 * 60;
    for (let k = 0; k < sorted.length; k++) {
      const s = sorted[k];
      const poi = await attachPoi(sorted, k, sorted.length - 1, city, foodPool, overseas);
      const dur = 150;
      items.push({
        type: 'spot', id: s.id, name: s.name, city: s.city, address: s.address,
        lng: s.lng, lat: s.lat, rating: s.rating, price: s.price, hours: s.hours,
        traffic: s.traffic, desc: s.desc, tags: s.tags, amapType: s.type,
        start, end: start + dur, dur,
        distanceFromCenter: Math.round(dist(center, s) * 10) / 10,
        restaurants: poi.restaurants, hotel: poi.hotel
      });
      start += dur + 20;
    }
    /* 当天路线总里程：相邻景点球面距离之和，用于前端展示「单向推进」 */
    let km = 0;
    for (let k = 1; k < sorted.length; k++) km += dist(sorted[k - 1], sorted[k]);
    out.push({
      day: i + 1,
      spots: items,
      hotel: items.length ? items[items.length - 1].hotel : null,
      routeKm: Math.round(km * 10) / 10,
      bearingRange: (() => {
        const angs = sorted.map(s => bearing(center, s));
        return [Math.round(Math.min(...angs)), Math.round(Math.max(...angs))];
      })(),
      /* 景点太分散时的提示：单日里程超过 80km 说明当天跨区，前端可提示调整天数 */
      warn: km > 80 ? `当天跨度约 ${Math.round(km)}km，景点较分散，建议增加天数或包车` : ''
    });
  }

  return {
    ok: true,
    city,
    days: out.length,
    center,
    engine: {
      provider,                                  /* amap=国内高德 / osm=海外 OpenStreetMap / none */
      amap: amap.isOn(),
      ai: !!process.env.DOTS_API_KEY,
      /* 高德最近一次报错：线上排查用（Key 失效 / 配额 / IP 白名单 / 超时），
       * 正常时不返回，避免把内部错误塞进正常响应 */
      amapError: amap.getLastError() || null,
      libraryHit, amapHit, osmHit, scanned
    },
    dedup: { removed: [], filled: [] },
    plan: out
  };
}

module.exports = { planRoute, collectSpots };
