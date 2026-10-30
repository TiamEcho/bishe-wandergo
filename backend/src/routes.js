/* =========================================================
 * 路由层：/api/search、/api/checkin、/api/collect-guide
 * ========================================================= */
const express = require('express');
const dbx = require('./db');
const { collectGuide } = require('./collector');
const { aiStatus, extractEntities, chat } = require('./dots');
const { localExtract } = require('./extract');

const router = express.Router();

/* 攻略 / 打卡 → 前端卡片统一结构（字段与 js/search.js 的 srCard 对齐） */
function toItem(row, kind) {
  const isGuide = kind === 'guide';
  return {
    id: `${isGuide ? 'g' : 'c'}${row.id}`,
    title: isGuide ? (row.title || '旅行攻略') : `${row.city || ''} · ${row.spot || '打卡记录'}`,
    content: isGuide ? (row.content || '') : (row.text || ''),
    cover: row.cover || '',
    nick: isGuide ? (row.source || '公开网络') : (row.user || '旅行者'),
    location: row.city || '',
    topics: row.city || '',
    likeCount: row.like_count || 0,
    commentCount: row.comment_count || 0,
    createdAt: row.created_at || '',
    source: isGuide ? (row.source || 'web') : 'checkin',
    type: isGuide ? (row.type || 'note') : 'checkin',
    city: row.city || '',
    entityType: isGuide ? 'guide' : 'checkin',
    sourceUrl: isGuide ? (row.source_url || '') : '',
    srcId: isGuide ? String(row.ext_id || '').replace(/^crawl-/, '') : ''   // 便于前端复用原有详情弹窗
  };
}

/* 健康检查 / 演示用状态 */
router.get('/health', (req, res) => {
  res.json({
    ok: true, time: dbx.now(), ai: aiStatus(),
    stats: dbx.stats()
  });
});

/* ① GET /api/search?q=城市名 —— 打卡记录 + 攻略 + 实体 */
router.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim();
  const limit = Math.min(Number(req.query.limit) || 60, 200);

  const guides = dbx.searchGuides(q, limit);
  const checkins = dbx.searchCheckins(q, Math.min(limit, 40));

  /* 城市判定：优先用别名表（洱海→大理），其次城市名包含匹配，最后回退到 q 本身 */
  let city = dbx.cityOf(q) || (dbx.CITY_NAMES.find(c => q && (q.includes(c) || c.includes(q))) || null);
  if (!city) {
    const tally = new Map();
    [...guides, ...checkins].forEach(r => { if (r.city) tally.set(r.city, (tally.get(r.city) || 0) + 1); });
    city = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || q || null;
  }

  /* 实体检索：先按原文匹配，再用判定出的城市补一轮（搜「洱海」也能拿到大理的实体） */
  let entities = dbx.searchEntities(q, 30);
  if (city && city !== q) {
    const seen = new Set(entities.map(e => `${e.type}:${e.name}`));
    const extra = dbx.searchEntities(city, 30).filter(e => !seen.has(`${e.type}:${e.name}`));
    entities = entities.concat(extra).slice(0, 30);
  }

  const items = [
    ...guides.map(g => toItem(g, 'guide')),
    ...checkins.map(c => toItem(c, 'checkin'))
  ].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  res.json({
    ok: true,
    q,
    city,
    engine: 'sqlite',
    ai: aiStatus(),
    stats: { checkins: checkins.length, guides: guides.length, entities: entities.length, total: items.length },
    checkins,
    guides,
    entities: entities.map(e => ({ name: e.name, type: e.type, city: e.city, mention: e.mention })),
    items
  });
});

/* 兼容 search.js 现有的一次性拉取：GET /api/post/list */
router.get('/post/list', (req, res) => {
  const limit = Math.min(Number(req.query.pageSize || req.query.limit) || 200, 300);
  const offset = Number(req.query.offset) || 0;
  const guides = dbx.searchGuides('', limit + offset).slice(offset);
  const checkins = dbx.searchCheckins('', 40);
  const items = [...guides.map(g => toItem(g, 'guide')), ...checkins.map(c => toItem(c, 'checkin'))];
  res.json({ ok: true, total: items.length, list: items, items });
});

/* ② POST /api/checkin —— 新增打卡（同时保留 /api/checkin/add 兼容旧前端） */
function createCheckin(req, res) {
  const b = req.body || {};
  if (!b.city && !b.spot && !b.text) {
    return res.status(400).json({ ok: false, message: 'city / spot / text 至少填一项' });
  }
  const row = dbx.addCheckin({
    user: b.user || b.nick || '旅行者',
    city: b.city || dbx.guessCity(`${b.spot || ''} ${b.text || ''}`, ''),
    spot: b.spot || '',
    text: b.text || '',
    mood: b.mood || '😌 治愈放松',
    cost: b.cost || b.total || 0,
    cover: b.cover || (Array.isArray(b.imgs) ? b.imgs[0] : ''),
    source: b.source || 'web'
  });
  res.status(201).json({ ok: true, id: row.id, checkin: row, stats: dbx.stats() });
}
router.post('/checkin', createCheckin);
router.post('/checkin/add', createCheckin);

/* ③ POST /api/collect-guide —— 关键词触发采集 + AI 实体抽取 */
router.post('/collect-guide', async (req, res) => {
  try {
    const keyword = (req.body && (req.body.keyword || req.body.q || req.body.city)) || req.query.keyword;
    const out = await collectGuide(keyword);
    res.status(out.ok ? 200 : 400).json(out);
  } catch (e) {
    console.error('[collect-guide]', e);
    res.status(500).json({ ok: false, message: '采集失败', error: String(e.message || e) });
  }
});

/* =========================================================
 * AI 智能体悬浮球相关接口
 * ========================================================= */

/* ④ POST /api/chat —— 通用对话 */
router.post('/chat', async (req, res) => {
  try {
    const message = (req.body && req.body.message) || '';
    const history = Array.isArray(req.body && req.body.history) ? req.body.history : [];
    if (!String(message).trim()) {
      return res.status(400).json({ ok: false, message: 'message 不能为空' });
    }
    const r = await chat(message, history);
    res.json({ ok: true, engine: r.engine, reply: r.reply, model: r.model || null, error: r.error || null });
  } catch (e) {
    console.error('[chat]', e);
    res.status(500).json({ ok: false, message: '对话失败', error: String(e.message || e) });
  }
});

/* ⑤ GET /api/videos —— 攻略视频列表（供 AI 分析视频选择） */
router.get('/videos', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 40, 100);
  /* 从 guide 表取视频类攻略 */
  const rows = dbx.db.prepare(
    `SELECT id, title, content, city, cover, source, source_url, type, created_at
     FROM guide WHERE type = 'video' OR source IN ('bilibili','douyin','xhs','kuaishou','yt','ins')
     ORDER BY created_at DESC LIMIT ?`
  ).all(limit);

  /* 再补一批离线爬虫包里的视频（去重 ext_id） */
  const CRAWL = (() => {
    try { return require('./db').crawlCandidates || null; } catch { return null; }
  })();
  const seen = new Set(rows.map(r => r.id));
  const fallback = (dbx.crawlCandidates ? (() => {
    /* crawlCandidates 需要关键词，这里直接读 posts_crawl.json 的视频帖 */
    const fs = require('fs'); const path = require('path');
    const p = path.join(__dirname, '..', '..', 'js', 'posts_crawl.json');
    try {
      const obj = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return (obj.posts || []).filter(p => p.type === 'video').slice(0, 20);
    } catch { return []; }
  })() : []);

  const list = rows.map(r => ({
    id: 'g' + r.id,
    title: r.title || '旅行视频',
    city: r.city || '',
    cover: r.cover || '',
    source: r.source || 'web',
    sourceUrl: r.source_url || '',
    type: r.type || 'video',
    content: (r.content || '').slice(0, 200)
  }));
  fallback.forEach(p => {
    const key = 'crawl-' + p.id;
    if (seen.has(key)) return;
    seen.add(key);
    list.push({
      id: key,
      title: p.title || '旅行视频',
      city: dbx.guessCity(`${p.title || ''} ${p.content || ''}`, p.location) || '',
      cover: p.cover || '',
      source: p.source || 'web',
      sourceUrl: p.videoUrl || p.sourceUrl || '',
      type: 'video',
      content: (p.content && p.content !== '-' ? p.content : '').slice(0, 200)
    });
  });

  res.json({ ok: true, total: list.length, list: list.slice(0, limit) });
});

/* ⑥ POST /api/analyze-video —— 分析攻略视频，返回结构化结果 */
router.post('/analyze-video', async (req, res) => {
  try {
    const videoId = (req.body && req.body.videoId) || '';
    if (!videoId) return res.status(400).json({ ok: false, message: 'videoId 不能为空' });

    /* 解析视频：g{id} 走 guide 表，crawl-{id} 走离线包，其余也尝试 guide 表 */
    let guide = null;
    let title = ''; let content = ''; let city = ''; let cover = '';

    if (videoId.startsWith('g')) {
      const gid = Number(videoId.slice(1));
      guide = dbx.db.prepare('SELECT * FROM guide WHERE id = ?').get(gid);
    } else if (videoId.startsWith('crawl-')) {
      const fs = require('fs'); const path = require('path');
      const p = path.join(__dirname, '..', '..', 'js', 'posts_crawl.json');
      const obj = JSON.parse(fs.readFileSync(p, 'utf-8'));
      const raw = (obj.posts || []).find(p => String(p.id) === videoId.slice(6));
      if (raw) {
        guide = {
          title: raw.title, content: raw.content && raw.content !== '-' ? raw.content : '',
          city: dbx.guessCity(`${raw.title || ''} ${raw.content || ''}`, raw.location),
          cover: raw.cover || '', source: raw.source || 'web', source_url: raw.videoUrl || ''
        };
      }
    } else {
      /* 兼容直接传 guide id */
      const gid = Number(videoId);
      if (!isNaN(gid)) guide = dbx.db.prepare('SELECT * FROM guide WHERE id = ?').get(gid);
    }

    if (!guide) {
      return res.status(404).json({ ok: false, message: '未找到该视频' });
    }

    title = guide.title || '旅行视频';
    content = `${guide.title || ''}\n${guide.content || ''}`;
    city = guide.city || dbx.guessCity(content, '') || '';
    cover = guide.cover || '';

    /* 1) 实体抽取（AI 优先，本地兜底） */
    const ext = await extractEntities(content, {
      city, spotNames: dbx.SPOT_NAMES, cityNames: dbx.CITY_NAMES
    });
    const spots = (ext.places || []).slice(0, 6).map(e => e.name);
    const foods = (ext.foods || []).slice(0, 6).map(e => e.name);
    const districts = (ext.districts || []).slice(0, 4).map(e => e.name);

    /* 2) 推荐路线：取前 3 个景点串成一日路线 */
    const routeSpots = spots.slice(0, 4);
    const route = routeSpots.length
      ? routeSpots.map((s, i) => `${i + 1}. ${s}`).join(' → ')
      : `${city}市区精华一日游`;

    /* 3) 住宿建议：基于城市/商圈 */
    const stayArea = districts[0] || (city ? `${city}市中心` : '景区附近');
    const hotels = [
      `${stayArea}附近连锁酒店（交通便利，性价比高）`,
      city ? `${city}特色民宿（体验当地生活）` : '景区民宿（沉浸式体验）',
      '高端度假酒店（适合放松度假）'
    ];

    /* 4) 摘要：让 AI 生成一句话总结（降级则拼装） */
    let summary = `这是${city ? city + '的' : ''}旅行攻略视频，核心景点 ${spots.length} 处，推荐美食 ${foods.length} 种。`;
    if (ext.engine === 'dots') {
      try {
        const sr = await chat(`请用一句话总结下面这篇攻略的亮点：\n标题：${title}\n内容：${content.slice(0, 600)}`, []);
        if (sr.reply) summary = sr.reply;
      } catch { /* 忽略摘要失败 */ }
    }

    res.json({
      ok: true,
      videoId,
      title,
      city,
      cover,
      engine: ext.engine,
      summary,
      spots,
      route,
      foods,
      hotels,
      districts
    });
  } catch (e) {
    console.error('[analyze-video]', e);
    res.status(500).json({ ok: false, message: '视频分析失败', error: String(e.message || e) });
  }
});

module.exports = router;
