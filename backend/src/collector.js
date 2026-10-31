/* =========================================================
 * 采集 + AI 分析：POST /api/collect-guide 的业务实现
 * 采集顺序（有则用，无则降级）：
 *   1) 离线爬虫包 js/posts_crawl.json
 *   2) 景点库自动拼装
 * 之后逐篇调用大模型抽取地名/美食/商圈，写入 entity 表
 * ========================================================= */
const dbx = require('./db');
const { extractEntities } = require('./dots');

const AI_MAX = Number(process.env.AI_MAX_PER_REQUEST || 5);   // 单次请求最多调用几次 AI

/* 组合目的地拆分："东京 · 京都"、"东京/京都"、"东京 京都" → ["东京","京都"] */
function splitKeywords(kw) {
  return String(kw || '')
    .split(/[·•、,，/／\s]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function buildFromSpots(keyword) {
  const kws = splitKeywords(keyword);
  const hits = [];
  const seen = new Set();
  for (const k of kws) {
    for (const s of dbx.SPOTS) {
      const key = s.spot_id || s.name;
      if (seen.has(key)) continue;
      if ((s.city && s.city.includes(k)) || (s.name && s.name.includes(k)) ||
          (s.tags && s.tags.includes(k))) {
        seen.add(key);
        hits.push(s);
        if (hits.length >= 6) break;
      }
    }
    if (hits.length >= 6) break;
  }
  return hits.map((s, i) => ({
    title: `${s.name}游玩攻略`,
    content: `${s.name}位于${s.city}，${s.desc || ''} 建议游玩 ${s.hours || '半天'}，门票：${s.price || '以景区公告为准'}。交通：${s.traffic || '详见当地交通'}。特色：${s.tags || '旅行打卡'}。周边可以顺路逛${s.city}的老街与本地小吃街。`,
    city: s.city,
    cover: s.img || '',
    source: 'system',
    source_url: `#spot-${s.spot_id || i}`,
    type: 'guide',
    ext_id: `spot-${s.spot_id || i}`
  }));
}

/* 离线爬虫包 → guide 候选 */
function crawlFromJson(kw) {
  return dbx.crawlCandidates(kw, 8).map(p => ({
    title: p.title || '旅行攻略',
    content: p.content && p.content !== '-' ? p.content : `${p.title}（${p.location || ''}）`,
    city: dbx.guessCity(`${p.title || ''} ${p.content || ''}`, p.location),
    cover: p.cover || '',
    source: p.source || 'web',
    source_url: p.sourceUrl || p.videoUrl || '',
    type: p.type || 'note',
    like_count: p.likeCount || 0,
    comment_count: p.commentCount || 0,
    created_at: p.createdAt || dbx.now(),
    ext_id: `crawl-${p.id}`
  }));
}

async function collectGuide(keyword) {
  const kw = String(keyword || '').trim();
  if (!kw) return { ok: false, message: 'keyword 不能为空' };
  const city = dbx.cityOf(kw) || dbx.guessCity(kw, '') || kw;

  let guides = [];
  let collected = 0;
  let created = 0;
  let collectedFrom = '';
  let engine = 'local';
  let aiDone = [];

  /* 1) 离线爬虫包 → 景点库兜底（组合目的地逐个拆分检索） */
  let candidates = crawlFromJson(kw);
  collectedFrom = 'crawl-json';
  if (!candidates.length) {
    for (const k of splitKeywords(kw)) {
      candidates = crawlFromJson(k);
      if (candidates.length) { collectedFrom = 'crawl-json'; break; }
    }
  }
  if (!candidates.length) {
    candidates = buildFromSpots(kw);
    collectedFrom = 'spot-library';
  }
  /* 采集词是具体城市时，剔除正文顺带提及该词的异地内容 */
  if (candidates.length && dbx.CITY_NAMES.includes(city)) {
    const sameCity = candidates.filter(c => c.city === city);
    if (sameCity.length) candidates = sameCity;
  }
  if (!candidates.length) {
    return {
      ok: true,
      keyword: kw,
      city,
      collectedFrom,
      collected: 0,
      created: 0,
      engine: 'local',
      guides: [],
      entities: { places: [], foods: [], districts: [] },
      ai: [],
      empty: true,
      message: `暂时没有「${kw}」的本地攻略数据。可尝试城市名、景点名或稍后重新采集。`
    };
  }

  for (const c of candidates) {
    const r = await dbx.addGuide(c);
    if (r.row) guides.push({ ...r.row, created: r.created });
  }
  collected = candidates.length;
  created = guides.filter(g => g.created).length;

  /* 2) AI 抽取实体（限制次数，避免一次请求打爆模型） */
  for (const g of guides.slice(0, AI_MAX)) {
    const text = `${g.title} ${g.content || ''}`;
    const r = await extractEntities(text, {
      city: g.city, spotNames: dbx.SPOT_NAMES, cityNames: dbx.CITY_NAMES
    });
    engine = r.engine;
    await dbx.addEntities(g.id, g.city, r, r.engine);
    aiDone.push({ guide_id: g.id, title: g.title, city: g.city, engine: r.engine, error: r.error || null });
  }

  /* 3) 汇总该城市的实体（供前端展示） */
  let rows = await dbx.searchEntities(kw, 24);
  if (!rows.length && city && city !== kw) rows = await dbx.searchEntities(city, 24);
  const pick = t => rows.filter(x => x.type === t).map(x => ({ name: x.name, mention: x.mention || 1, city: x.city }));

  return {
    ok: true,
    keyword: kw,
    city,
    collectedFrom,
    collected,
    created,
    engine,
    guides: guides.map(g => ({
      id: g.id, title: g.title, city: g.city, source: g.source,
      source_url: g.source_url, cover: g.cover, created: g.created
    })),
    entities: { places: pick('place'), foods: pick('food'), districts: pick('district') },
    ai: aiDone
  };
}

module.exports = { collectGuide };
