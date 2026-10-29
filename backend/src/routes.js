/* =========================================================
 * 路由层：/api/search、/api/checkin、/api/collect-guide
 * ========================================================= */
const express = require('express');
const dbx = require('./db');
const { collectGuide } = require('./collector');
const { aiStatus } = require('./dots');
const mcCrawler = require('../services/mediaCrawler');

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
    mediaCrawler: mcCrawler.status(),
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

module.exports = router;
