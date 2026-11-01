/* =========================================================
 * 路由层：/api/search、/api/checkin、/api/collect-guide
 * ========================================================= */
const express = require('express');
const path = require('path');
const fs = require('fs');
const dbx = require('./db');
const { collectGuide } = require('./collector');
const { aiStatus, extractEntities, chat } = require('./dots');
const { localExtract } = require('./extract');
const { planRoute } = require('./plan');
const { searchCitySpots } = require('./services/scenicSpotSearch');
const { recommend } = require('./recommend');

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
router.get('/health', async (req, res, next) => {
  try {
    res.json({
      ok: true, time: dbx.now(), db: dbx.dialect, ai: aiStatus(),
      stats: await dbx.stats()
    });
  } catch (e) { next(e); }
});

/* ① GET /api/search?q=城市名 —— 打卡记录 + 攻略 + 实体 */
router.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(Number(req.query.limit) || 60, 200);

    let guides = await dbx.searchGuides(q, limit);
    const checkins = await dbx.searchCheckins(q, Math.min(limit, 40));

    /* 城市判定：优先用别名表（洱海→大理），其次城市名包含匹配，最后回退到 q 本身 */
    let city = dbx.cityOf(q) || (dbx.CITY_NAMES.find(c => q && (q.includes(c) || c.includes(q))) || null);
    if (!city) {
      const tally = new Map();
      [...guides, ...checkins].forEach(r => { if (r.city) tally.set(r.city, (tally.get(r.city) || 0) + 1); });
      city = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || q || null;
    }

    /* 城市已明确时，剔除命中词只出现在正文里的异地攻略（如搜「大理」却带出西藏帖） */
    if (city) {
      const sameCity = guides.filter(g => g.city === city);
      if (sameCity.length) guides = sameCity;
    }

    /* 实体检索：先按原文匹配，再用判定出的城市补一轮（搜「洱海」也能拿到大理的实体） */
    let entities = await dbx.searchEntities(q, 30);
    if (city && city !== q) {
      const seen = new Set(entities.map(e => `${e.type}:${e.name}`));
      const extra = (await dbx.searchEntities(city, 30)).filter(e => !seen.has(`${e.type}:${e.name}`));
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
      engine: dbx.dialect,
      ai: aiStatus(),
      stats: { checkins: checkins.length, guides: guides.length, entities: entities.length, total: items.length },
      checkins,
      guides,
      entities: entities.map(e => ({ name: e.name, type: e.type, city: e.city, mention: e.mention })),
      items
    });
  } catch (e) { next(e); }
});

/* 兼容 search.js 现有的一次性拉取：GET /api/post/list */
router.get('/post/list', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.pageSize || req.query.limit) || 200, 300);
    const offset = Number(req.query.offset) || 0;
    const guides = (await dbx.searchGuides('', limit + offset)).slice(offset);
    const checkins = await dbx.searchCheckins('', 40);
    const items = [...guides.map(g => toItem(g, 'guide')), ...checkins.map(c => toItem(c, 'checkin'))];
    res.json({ ok: true, total: items.length, list: items, items });
  } catch (e) { next(e); }
});

/* 社区帖子：列表 / 详情 / 发布 / 评论 / 点赞 / 视频源 */
router.get('/posts', async (req, res, next) => {
  try {
    const r = await dbx.listPosts({
      offset: req.query.offset, limit: req.query.limit,
      sort: req.query.sort, type: req.query.type, topic: req.query.topic
    });
    res.json({ ok: true, total: r.total, list: r.list, items: r.list });
  } catch (e) { next(e); }
});

/* 词条列表 / 词条详情：前端 api.js 的 topics() / topicDetail() 打的就是这两个路径，
   之前后端没有实现，社区页与词条页一直拿不到分类数据 */
router.get('/topic/list', async (req, res, next) => {
  try {
    const kw = String(req.query.kw || '').trim();
    let list = await dbx.listTopics();
    if (kw) list = list.filter(t => (t.name + t.description + t.code).includes(kw));
    res.json({ ok: true, total: list.length, list });
  } catch (e) { next(e); }
});

router.get('/topic/detail', async (req, res, next) => {
  try {
    const code = String(req.query.code || '').trim();
    const offset = Number(req.query.offset) || 0;
    if (!code) return res.status(400).json({ ok: false, message: 'code 不能为空' });
    const all = await dbx.listTopics();
    const topic = all.find(t => t.code === code)
      || { code, name: dbx.TOPIC_NAMES[code] || code, description: '', postCount: 0, heat: 0 };
    const r = await dbx.listPosts({ topic: code, sort: 'top', offset, limit: 30 });
    res.json({ ok: true, topic, total: r.total, list: r.list, items: r.list });
  } catch (e) { next(e); }
});

/* 帖子详情：前端 postDetail() 用 /api/post/detail?id=xx&nick=xx，
   返回结构与 api.js 期待的一致（post / comments / liked） */
router.get('/post/detail', async (req, res, next) => {
  try {
    const p = await dbx.getPost(req.query.id);
    if (!p) return res.status(404).json({ ok: false, message: '帖子不存在' });
    const comments = await dbx.listPostComments(p.id);
    /* liked 回显：优先用 token 里的用户，其次用查询串里的 nick */
    let nick = req.query.nick ? String(req.query.nick) : '';
    const uid = userOf(req);
    if (uid) nick = nick || String(uid);
    const liked = nick ? await dbx.hasPostLike(p.id, nick) : false;
    res.json({ ok: true, post: p, comments, liked });
  } catch (e) { next(e); }
});

/* 点赞开关：api.js 的 postLike() 调用这个地址，返回 {ok, liked, count}。
   身份取 token → body.nick 的顺序，保证同一用户重复点击不会重复计数。 */
router.post('/post/like/toggle', async (req, res, next) => {
  try {
    const b = req.body || {};
    const postId = String(b.postId || b.id || '').trim();
    if (!postId) return res.status(400).json({ ok: false, message: '缺少 postId' });
    const uid = userOf(req);
    const who = uid ? String(uid) : String(b.nick || '').trim();
    if (!who) return res.status(401).json({ ok: false, message: '请先登录后再点赞' });
    const r = await dbx.addPostLike(postId, who);
    res.json({ ok: true, liked: r.liked, count: r.likeCount });
  } catch (e) { next(e); }
});

router.get('/posts/:id', async (req, res, next) => {
  try {
    const p = await dbx.getPost(req.params.id);
    if (!p) return res.status(404).json({ ok: false, message: '帖子不存在' });
    p.comments = await dbx.listPostComments(p.id);
    res.json({ ok: true, post: p });
  } catch (e) { next(e); }
});

router.post('/posts', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.content && !b.title && !(b.images && b.images.length) && !b.videoUrl && !b.videoSrc) {
      return res.status(400).json({ ok: false, message: '内容不能为空' });
    }
    const r = await dbx.addPost(b);
    res.status(r.created ? 201 : 200).json({ ok: true, created: r.created, post: r.post });
  } catch (e) { next(e); }
});

router.get('/posts/:id/comments', async (req, res, next) => {
  try {
    res.json({ ok: true, list: await dbx.listPostComments(req.params.id) });
  } catch (e) { next(e); }
});

router.post('/posts/:id/comments', async (req, res, next) => {
  try {
    const content = (req.body && req.body.content) || '';
    if (!String(content).trim()) return res.status(400).json({ ok: false, message: '评论不能为空' });
    await dbx.addPostComment(req.params.id, (req.body && req.body.nick) || '旅行者', content);
    res.status(201).json({ ok: true, list: await dbx.listPostComments(req.params.id) });
  } catch (e) { next(e); }
});

/* 点赞：带上用户昵称做去重，同一用户重复点击不会重复累加 */
router.post('/posts/:id/like', async (req, res, next) => {
  try {
    const nick = String((req.body && req.body.nick) || '').trim();
    res.json({ ok: true, ...(await dbx.addPostLike(req.params.id, nick)) });
  } catch (e) { next(e); }
});

/* ② POST /api/checkin —— 新增打卡（同时保留 /api/checkin/add 兼容旧前端） */
async function createCheckin(req, res, next) {
  try {
    const b = req.body || {};
    if (!b.city && !b.spot && !b.text) {
      return res.status(400).json({ ok: false, message: 'city / spot / text 至少填一项' });
    }
    const row = await dbx.addCheckin({
      user: b.user || b.nick || '旅行者',
      city: b.city || dbx.guessCity(`${b.spot || ''} ${b.text || ''}`, ''),
      spot: b.spot || '',
      text: b.text || '',
      mood: b.mood || '😌 治愈放松',
      cost: b.cost || b.total || 0,
      cover: b.cover || (Array.isArray(b.imgs) ? b.imgs[0] : ''),
      source: b.source || 'web'
    });
    res.status(201).json({ ok: true, id: row.id, checkin: row, stats: await dbx.stats() });
  } catch (e) { next(e); }
}
router.post('/checkin', createCheckin);
router.post('/checkin/add', createCheckin);

/* ③ POST /api/collect-guide —— 关键词触发采集 + AI 实体抽取 */
router.post('/collect-guide', async (req, res) => {
  try {
    const keyword = (req.body && (req.body.keyword || req.body.q || req.body.city)) || req.query.keyword;
    if (!String(keyword || '').trim()) {
      return res.status(400).json({ ok: false, message: 'keyword 不能为空' });
    }
    const out = await collectGuide(keyword);
    res.status(out.ok ? 200 : 500).json(out);
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
router.get('/videos', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 40, 100);
    /* 从 guide 表取视频类攻略 */
    const rows = await dbx.all(
      `SELECT id, title, content, city, cover, source, source_url, type, created_at
       FROM guide WHERE type = 'video' OR source IN ('bilibili','douyin','xhs','kuaishou','yt','ins')
       ORDER BY created_at DESC LIMIT ?`, [limit]
    );

    const seen = new Set(rows.map(r => r.id));
    const fallback = (() => {
      /* 直接读 posts_crawl.json 的视频帖 */
      const p = path.join(__dirname, '..', '..', 'js', 'posts_crawl.json');
      try {
        const obj = JSON.parse(fs.readFileSync(p, 'utf-8'));
        return (obj.posts || []).filter(p => p.type === 'video').slice(0, 20);
      } catch { return []; }
    })();

  const list = rows.map(r => ({
    id: 'g' + r.id,
    title: r.title || '旅行视频',
    city: r.city || '',
    cover: r.cover || '',
    source: r.source || 'web',
    sourceUrl: r.source_url || '',
    playUrl: r.source_url ? '/api/video/stream?src=' + encodeURIComponent(r.source_url) : '',
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
      playUrl: p.videoUrl ? '/api/video/stream?src=' + encodeURIComponent(p.videoUrl) : '',
      type: 'video',
      content: (p.content && p.content !== '-' ? p.content : '').slice(0, 200)
    });
  });

    res.json({ ok: true, total: list.length, list: list.slice(0, limit) });
  } catch (e) { next(e); }
});

/* ⑤b GET /api/video/stream?src= —— 视频流代理：把外站直链转成同源可播地址，
 * 顺便解决 B 站 / 抖音 CDN 的 Referer 防盗链，手机和别的电脑都能播。
 * 传入的是 bilibili 网页地址时，先解析出真实 mp4 直链再代理。
 * 支持 Range（拖动进度条），边下边发，不整段读进内存。 */
const _VIDEO_HOSTS = /(^|\.)(bilivideo\.com|bilibili\.com|douyin\.com|douyinpic\.com|douyinvod\.com|ixigua\.com|kuaishou\.com|hdslb\.com|ytimg\.com|googlevideo\.com|akamaized\.net|cloudfront\.net|aliyuncs\.com|myqcloud\.com|qiniucdn\.com)$/i;
const _UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

/* bilibili 网页地址 → mp4 直链（带 5 分钟缓存，避免每次播放都请求 B 站接口） */
const _biliCache = new Map();
async function resolveBili(url) {
  const bv = (/(BV[0-9A-Za-z]{10})/.exec(url) || [])[1];
  if (!bv) return '';
  const hit = _biliCache.get(bv);
  if (hit && Date.now() - hit.at < 300000) return hit.url;
  const H = { 'User-Agent': _UA, 'Referer': 'https://www.bilibili.com/' };
  const view = await (await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bv}`, { headers: H })).json();
  const cid = view && view.data && view.data.cid;
  if (!cid) return '';
  const pu = await (await fetch(
    `https://api.bilibili.com/x/player/playurl?bvid=${bv}&cid=${cid}&qn=64&fnval=1&platform=html5&high_quality=1`,
    { headers: H })).json();
  const mp4 = pu && pu.data && pu.data.durl && pu.data.durl[0] && pu.data.durl[0].url;
  if (!mp4) return '';
  _biliCache.set(bv, { url: mp4, at: Date.now() });
  return mp4;
}

/* 代理限流：防止有人拿这个接口当免费 CDN 刷外站视频流量。
 * 1) 单 IP 每分钟最多 30 次请求；
 * 2) 同一 IP + 同一视频最多 3 个并发连接（播放器拖动进度条会并发开多个 Range 请求，留足余量）；
 * 3) 全局同时转发上限 20 路，超出直接 429，避免把 Render 免费实例的带宽打满。 */
const _RL_WINDOW = 60000, _RL_MAX_PER_IP = 30, _RL_MAX_CONN_PER_IP = 3, _RL_MAX_CONN_ALL = 20;
const _rlHits = new Map();   // ip -> [时间戳]
const _rlConns = new Map();  // ip -> 当前并发数
let _rlConnsAll = 0;

function _rlClientIp(req) { return req.ip || req.socket.remoteAddress || 'unknown'; }

/* 每分钟固定窗口计数，窗口过期清理，Map 不会无限增长 */
function _rlAllowHit(ip) {
  const now = Date.now();
  const arr = (_rlHits.get(ip) || []).filter(t => now - t < _RL_WINDOW);
  if (arr.length >= _RL_MAX_PER_IP) { _rlHits.set(ip, arr); return false; }
  arr.push(now); _rlHits.set(ip, arr);
  return true;
}

/* 每 10 分钟清理一次长期未活动的 IP 记录 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, arr] of _rlHits) {
    const keep = arr.filter(t => now - t < _RL_WINDOW);
    if (keep.length) _rlHits.set(ip, keep); else _rlHits.delete(ip);
  }
}, 600000).unref?.();

router.get('/video/stream', async (req, res) => {
  let src = String(req.query.src || '');
  if (!/^https?:\/\//i.test(src)) return res.status(400).send('src 必须是 http(s) 直链');
  let u; try { u = new URL(src) } catch { return res.status(400).send('src 非法') }
  if (!_VIDEO_HOSTS.test(u.hostname)) return res.status(403).send('仅代理已接入的视频平台域名');

  /* 进入限流判定：任一条件不满足就拒绝，并且不占用并发计数 */
  const ip = _rlClientIp(req);
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!_rlAllowHit(ip)) return res.status(429).send('请求过于频繁，请稍后再试');
  const conn = _rlConns.get(ip) || 0;
  if (conn >= _RL_MAX_CONN_PER_IP || _rlConnsAll >= _RL_MAX_CONN_ALL) {
    return res.status(429).send('视频并发连接过多，请稍后再试');
  }
  _rlConns.set(ip, conn + 1); _rlConnsAll++;
  /* 无论正常结束、客户端中断还是异常，都要把并发计数还回去 */
  let _rlReleased = false;
  const releaseSlot = () => {
    if (_rlReleased) return;
    _rlReleased = true;
    const c = (_rlConns.get(ip) || 1) - 1;
    if (c > 0) _rlConns.set(ip, c); else _rlConns.delete(ip);
    _rlConnsAll = Math.max(0, _rlConnsAll - 1);
  };
  res.on('close', releaseSlot);
  res.on('finish', releaseSlot);

  try {
    /* 网页地址（非直链）先解析成真实视频流地址 */
    if (!/\.(mp4|m3u8|flv|webm)(\?|$)/i.test(u.pathname) && /bilibili\.com$/i.test(u.hostname)) {
      const real = await resolveBili(src).catch(() => '');
      if (!real) return res.status(404).send('该视频暂无法解析播放地址，请使用站内来源观看');
      src = real; u = new URL(src);
    }
    /* 按来源站点带 Referer：抖音链带 bilibili 的 Referer 会被拒 */
    const referer = /douyin|ixigua|douyinvod/i.test(u.hostname) ? 'https://www.douyin.com/'
      : /kuaishou/i.test(u.hostname) ? 'https://www.kuaishou.com/'
      : 'https://www.bilibili.com/';
    const headers = { 'User-Agent': _UA, 'Referer': referer };
    if (req.headers.range) headers.Range = req.headers.range;
    const r = await fetch(src, { headers, redirect: 'follow' });
    if (!r.ok && r.status !== 206) return res.status(r.status).send('上游视频不可用');
    res.status(r.status);
    ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag']
      .forEach(k => { const v = r.headers.get(k); if (v) res.setHeader(k, v) });
    if (!res.getHeader('content-type')) res.setHeader('content-type', 'video/mp4');
    if (!res.getHeader('accept-ranges')) res.setHeader('accept-ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    /* 流式转发：前端先到先播，大文件也不会把内存打满 */
    if (!r.body) return res.end();
    const reader = r.body.getReader();
    res.on('close', () => { try { reader.cancel() } catch (_) {} });
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(Buffer.from(value))) await new Promise(ok => res.once('drain', ok));
    }
    res.end();
  } catch (e) {
    if (!res.headersSent) res.status(502).send('视频代理失败：' + String(e.message || e));
    else res.end();
  }
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
      guide = await dbx.get('SELECT * FROM guide WHERE id = ?', [gid]);
    } else if (videoId.startsWith('crawl-')) {
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
      if (!isNaN(gid)) guide = await dbx.get('SELECT * FROM guide WHERE id = ?', [gid]);
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

/* ⑦ POST /api/plan/route —— 景点收集 + 分区 + 周边餐饮住宿
 * body: { city:string, days:number, want?:number }
 * 国内：高德检索 + AI 建议 → 扇形分区
 * 海外：站内精编库 + AI 名单 → 按距离连续分块 */
router.post('/plan/route', async (req, res) => {
  try {
    const b = req.body || {};
    const city = String(b.city || req.query.city || '').trim();
    if (!city) return res.status(400).json({ ok: false, message: 'city 不能为空' });
    const out = await planRoute(city, b.days, b.want);
    res.json(out);
  } catch (e) {
    console.error('[plan/route]', e);
    res.status(500).json({ ok: false, message: '规划失败', error: String(e.message || e) });
  }
});

/* ⑧ GET /api/plan/spots?city=杭州&limit=200 —— 城市可玩点检索
 * 6 组关键词（景区 / 步行街 / 文创园 / 美食街 / 公园 / 博物馆）各翻 3 页，
 * 合并按名称去重，返回带 category 的完整列表，用于前端「换一个景点」替换池 */
router.get('/plan/spots', async (req, res) => {
  try {
    const city = String(req.query.city || '').trim();
    if (!city) return res.status(400).json({ ok: false, message: 'city 不能为空' });
    const out = await searchCitySpots(city, { limit: req.query.limit });
    res.json(out);
  } catch (e) {
    console.error('[plan/spots]', e);
    res.status(500).json({ ok: false, message: '检索失败', error: String(e.message || e) });
  }
});

/* =========================================================
 * 用户 / 评分 / 收藏 / 推荐（论文第 4 章：协同过滤模块）
 * ========================================================= */

/* JWT（HS256）签名：载荷只放 uid / username / role，不含任何敏感信息。
   密钥优先取环境变量 JWT_SECRET，未配置时用固定的开发默认值（仅本地演示）。 */
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'wandergo-dev-secret-change-me';
const JWT_EXPIRES = '7d';

function makeToken(u) {
  return jwt.sign(
    { uid: u.id, username: u.username, role: u.role || 'user' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

/* 从 Authorization: Bearer <jwt> 中验签并取出 user_id；签名错误或过期返回 null */
function userOf(req) {
  const auth = String(req.headers.authorization || '');
  if (!auth.startsWith('Bearer ')) return null;
  try {
    const p = jwt.verify(auth.slice(7), JWT_SECRET);
    const id = Number(p && p.uid);
    return id || null;
  } catch {
    return null;
  }
}

/* 取当前登录用户整行（需要 role 判断时用） */
async function currentUser(req) {
  const id = userOf(req);
  if (!id) return null;
  return dbx.findUserById(id);
}
/* 昵称 → user_id：前端很多接口只传 nick，这里做一次解析 */
async function resolveUser(nick) {
  const name = String(nick || '').trim();
  if (!name) return null;
  const u = await dbx.findUser(name);
  return u ? u.id : null;
}

/* ⑨ POST /api/user/register */
router.post('/user/register', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ ok: false, message: '用户名和密码不能为空' });
    }
    const r = await dbx.createUser(username, password, username);
    res.json({
      ok: true, created: r.created, uid: r.user.id,
      nick: r.user.nick || r.user.username, token: makeToken(r.user)
    });
  } catch (e) { next(e); }
});

/* ⑩ POST /api/user/login */
router.post('/user/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    const u = await dbx.verifyUser(username, password);
    if (!u) return res.status(401).json({ ok: false, message: '用户名或密码错误' });
    res.json({ ok: true, uid: u.id, nick: u.nick || u.username, role: u.role || 'user', token: makeToken(u) });
  } catch (e) { next(e); }
});

/* ⑪ POST /api/rating/add —— 评分入库并刷新偏好矩阵 */
router.post('/rating/add', async (req, res, next) => {
  try {
    const b = req.body || {};
    const uid = userOf(req) || await resolveUser(b.nick || b.username);
    if (!uid) return res.status(401).json({ ok: false, message: '请先登录' });
    const spotId = String(b.spotId || b.spot_key || '').trim();
    if (!spotId) return res.status(400).json({ ok: false, message: 'spotId 不能为空' });
    const out = await dbx.addRating(uid, spotId, b.score);
    res.json(out);
  } catch (e) { next(e); }
});

/* ⑫ POST /api/favorite/toggle */
router.post('/favorite/toggle', async (req, res, next) => {
  try {
    const b = req.body || {};
    const uid = userOf(req) || await resolveUser(b.nick);
    if (!uid) return res.status(401).json({ ok: false, message: '请先登录' });
    const spotId = String(b.spotId || b.spot_key || '').trim();
    if (!spotId) return res.status(400).json({ ok: false, message: 'spotId 不能为空' });
    res.json(await dbx.toggleFavorite(uid, spotId));
  } catch (e) { next(e); }
});

/* ⑬ GET /api/recommend?nick=&n= —— UserCF + ItemCF 融合推荐 */
router.get('/recommend', async (req, res, next) => {
  try {
    const n = Math.min(Number(req.query.n) || 8, 50);
    const uid = userOf(req) || await resolveUser(req.query.nick);
    /* 游客：直接给热门榜，前端按同一结构渲染 */
    if (!uid) {
      const spots = await dbx.rankSpots('hot', req.query.city, n);
      return res.json({
        ok: true, mode: 'popular', algo: 'popular',
        list: spots.map(s => ({
          id: s.spot_key, name: s.name, city: s.city,
          score: Number(s.rating) || 0, match: Math.round((s.rating || 4) * 20),
          why: '热门兜底 · 未登录用户', algo: 'popular',
          rating: Number(s.rating) || 0, price: s.price || '', tags: s.tags || '', cover: s.cover || ''
        }))
      });
    }
    const out = await recommend(uid, { topN: n });
    res.json({ ok: true, mode: out.mode, ...out.stats, list: out.list });
  } catch (e) { next(e); }
});

/* ⑭ GET /api/spot/list —— 景点全集（供推荐页、地图、管理端复用） */
router.get('/spot/list', async (req, res, next) => {
  try {
    const kw = String(req.query.kw || '').trim();
    const limit = Math.min(Number(req.query.limit) || 500, 2000);
    let rows = await dbx.listSpots(limit);
    if (kw) {
      const k = kw.toLowerCase();
      rows = rows.filter(s => `${s.name} ${s.city} ${s.tags}`.toLowerCase().includes(k));
    }
    res.json({ ok: true, total: rows.length, list: rows });
  } catch (e) { next(e); }
});

/* ⑮ GET /api/rank?scope=hot|rating&city= */
router.get('/rank', async (req, res, next) => {
  try {
    const scope = req.query.scope === 'rating' ? 'rating' : 'hot';
    const city = String(req.query.city || '').trim();
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const rows = await dbx.rankSpots(scope, city, limit);
    res.json({ ok: true, scope, city: city || null, list: rows });
  } catch (e) { next(e); }
});

/* =========================================================
 * 管理端（论文 3.x 后台管理模块）
 * 权限：需携带有效 JWT 且 role = 'admin'，否则 403
 * ========================================================= */
async function requireAdmin(req, res) {
  const u = await currentUser(req);
  if (!u) { res.status(401).json({ ok: false, message: '未登录或登录已过期' }); return null; }
  if (u.role !== 'admin') { res.status(403).json({ ok: false, message: '需要管理员权限' }); return null; }
  return u;
}

/* GET /api/admin/overview —— 后台首页四块统计卡 */
router.get('/admin/overview', async (req, res, next) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const s = await dbx.stats();
    const spot = await dbx.get('SELECT COUNT(*) AS c FROM scenic_spot');
    const user = await dbx.get('SELECT COUNT(*) AS c FROM app_user');
    const post = await dbx.get('SELECT COUNT(*) AS c FROM post');
    const rating = await dbx.get('SELECT COUNT(*) AS c FROM rating_record');
    const comment = await dbx.get('SELECT COUNT(*) AS c FROM comment');
    /* 前端 admin.js 的统计卡直接读顶层字段，这里保持扁平结构；
       comment 表当前没有审核状态列，待审核数先按 0 返回 */
    res.json({
      ok: true,
      users: Number(user.c),
      spots: Number(spot.c),
      posts: Number(post.c),
      ratings: Number(rating.c),
      comments: Number(comment.c),
      pending: 0,
      guides: s.guides, checkins: s.checkins, entities: s.entities, cities: s.cities
    });
  } catch (e) { next(e); }
});

/* GET /api/admin/spot/list?kw= —— 景点维护列表 */
router.get('/admin/spot/list', async (req, res, next) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const kw = String(req.query.kw || '').trim().toLowerCase();
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    let rows = await dbx.listSpots(limit);
    if (kw) rows = rows.filter(s => `${s.name} ${s.city} ${s.tags}`.toLowerCase().includes(kw));
    /* 数据库字段是 spot_key，管理端表格绑定的是 spotId，这里做一次映射；
       scenic_spot 表没有 region 列，按有没有 province 判断国内/国外 */
    const list = rows.map(s => ({
      ...s,
      spotId: s.spot_key,
      region: s.province ? 'cn' : 'ab'
    }));
    res.json({ ok: true, total: list.length, list });
  } catch (e) { next(e); }
});

/* GET /api/admin/user/list —— 用户管理列表（不返回密码散列） */
router.get('/admin/user/list', async (req, res, next) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const rows = await dbx.all(
      'SELECT id, username, nick, city, role, created_at FROM app_user ORDER BY id ASC'
    );
    res.json({ ok: true, total: rows.length, list: rows });
  } catch (e) { next(e); }
});

module.exports = router;
module.exports.makeToken = makeToken;
