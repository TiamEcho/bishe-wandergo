/* =========================================================
 * 链接解析：B 站视频 / 小红书笔记 / 抖音视频
 * 设备指纹与 Cookie 均为空，只读公开页面与公开接口；
 * 任一平台解析失败一律降级返回 { type, url, error }，不抛异常给前端
 * ========================================================= */
const express = require('express');
const cheerio = require('cheerio');

const router = express.Router();

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const TIMEOUT = 12000;

/* 带超时的 fetch，避免第三方站点挂起把接口拖死 */
async function get(url, opts = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts.timeout || TIMEOUT);
  try {
    return await fetch(url, {
      redirect: 'follow',
      signal: ctl.signal,
      headers: {
        'user-agent': opts.ua || UA,
        'accept-language': 'zh-CN,zh;q=0.9',
        ...(opts.headers || {})
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

async function getText(url, opts) {
  const r = await get(url, opts);
  return r.text();
}

async function getJSON(url, opts) {
  const r = await get(url, opts);
  return r.json();
}

/* 从任意输入里抠出第一个 http(s) 链接（抖音分享文案里带一大堆说明文字） */
function pickUrl(input) {
  const s = String(input || '');
  /* 分享文案里的链接常紧贴中文（「…xhslink.com/a/abc快来看吧」），
   * 因此遇到非 ASCII 字符或空白/标点即视为链接结束 */
  const m = s.match(/https?:\/\/[\x21-\x7e]+/);
  if (!m) return s.trim();
  return m[0].replace(/[.,;:!?)\]}'"]+$/, '');
}

/* ---------------- B 站 ----------------
 * view  接口：x/web-interface/view?aid=或bvid= → 标题 / 简介 / 时长
 * player 接口：x/player/v2?aid=&cid= → 字幕列表（subtitle.subtitles[].subtitle_url）
 * 都需要带 Referer，否则返回 -403 */
const BILI_HEADERS = { Referer: 'https://www.bilibili.com/', Origin: 'https://www.bilibili.com' };

function biliId(url) {
  const bv = url.match(/BV[0-9A-Za-z]{10}/);
  if (bv) return { bvid: bv[0] };
  const av = url.match(/\/av(\d+)/i);
  if (av) return { aid: av[1] };
  return null;
}

/* 字幕正文：优先中文字幕，拼接所有片段 content；失败返回空串 */
async function biliSubtitle(aid, cid, bvid) {
  try {
    const q = `aid=${aid || ''}&cid=${cid || ''}${bvid ? `&bvid=${bvid}` : ''}`;
    const j = await getJSON(`https://api.bilibili.com/x/player/v2?${q}`, { headers: BILI_HEADERS });
    const subs = (j && j.data && j.data.subtitle && j.data.subtitle.subtitles) || [];
    if (!subs.length) return '';
    const zh = subs.find(s => /zh|ai-zh|中文/i.test(`${s.lan}${s.lan_doc}`)) || subs[0];
    if (!zh || !zh.subtitle_url) return '';
    const su = await getJSON(zh.subtitle_url.startsWith('//') ? 'https:' + zh.subtitle_url : zh.subtitle_url);
    return (su.body || []).map(x => x.content).join(' ').trim();
  } catch (e) {
    return '';
  }
}

/* view 接口的 data.tag 实测恒为空数组，标签另走 x/tag/archive/tags */
async function biliTags(bvid, aid) {
  try {
    const q = bvid ? `bvid=${bvid}` : `aid=${aid}`;
    const j = await getJSON(`https://api.bilibili.com/x/tag/archive/tags?${q}`, { headers: BILI_HEADERS });
    return ((j && j.data) || []).map(t => t && (t.tag_name || t.name)).filter(Boolean);
  } catch (e) {
    return [];
  }
}

async function parseBilibili(rawUrl) {
  const url = pickUrl(rawUrl);
  const id = biliId(url);
  if (!id) return { type: 'bilibili', url, error: '未识别到 BV 号 / av 号' };
  const q = id.bvid ? `bvid=${id.bvid}` : `aid=${id.aid}`;
  const j = await getJSON(`https://api.bilibili.com/x/web-interface/view?${q}`, { headers: BILI_HEADERS });
  if (!j || j.code !== 0 || !j.data) {
    return { type: 'bilibili', url, error: (j && j.message) || '解析失败' };
  }
  const d = j.data;
  let tags = (d.tag || []).map(t => t.tag_name).filter(Boolean);
  if (!tags.length) tags = await biliTags(d.bvid, d.aid);
  const subtitle = await biliSubtitle(d.aid, d.cid, d.bvid);
  return {
    type: 'bilibili',
    url,
    title: d.title || '',
    desc: d.desc || '',
    tags,
    subtitle,
    /* 附带的展示字段：封面 / 时长 / UP 主 / 播放量 */
    cover: d.pic || '',
    duration: d.duration || 0,
    author: (d.owner && d.owner.name) || '',
    view: d.stat ? d.stat.view : 0
  };
}

/* ---------------- 小红书 ----------------
 * 公开笔记页首屏渲染里带 window.__INITIAL_STATE__，能直接拿到标题 / 正文 / 图集；
 * 拿不到就退回 cheerio 解析 meta[og:*] 与结构化内容，再不行按反爬降级 */
function xhsFromState(html) {
  const m = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*<\/script>/);
  if (!m) return null;
  let state;
  try {
    /* 页面里是 JS 字面量：undefined / NaN 不是合法 JSON，先换成 null */
    state = JSON.parse(m[1].replace(/\bundefined\b/g, 'null'));
  } catch (e) {
    return null;
  }
  const note = state.note || {};
  const detail = note.noteDetailMap || {};
  const first = Object.keys(detail).map(k => detail[k] && detail[k].note).find(Boolean);
  const n = first || note.note || {};
  const images = (n.imageList || []).map(i => i.urlDefault || i.url || i.urlPre || '')
    .map(u => (u.startsWith('//') ? 'https:' + u : u)).filter(Boolean);
  if (!n.title && !n.desc && !images.length) return null;
  return { title: n.title || '', content: n.desc || '', images };
}

function xhsFromHtml(html) {
  const $ = cheerio.load(html);
  const title = ($('meta[property="og:title"]').attr('content') || $('#detail-title').text() || '').trim();
  const content = ($('meta[property="og:description"]').attr('content') || $('#detail-desc').text() || '').trim();
  const images = [];
  $('meta[property="og:image"]').each((_, el) => {
    const v = $(el).attr('content');
    if (v) images.push(v);
  });
  $('.swiper-slide img, .note-slider img').each((_, el) => {
    const v = $(el).attr('src') || $(el).attr('data-src');
    if (v && /^https?:/.test(v)) images.push(v);
  });
  return { title, content, images: [...new Set(images)] };
}

async function parseXiaohongshu(rawUrl) {
  const url = pickUrl(rawUrl);
  try {
    const html = await getText(url, {
      ua: UA,
      /* 不带 Cookie 访问会被跳到验证页，带上基础头尽量拿到首屏 HTML */
      headers: { referer: 'https://www.xiaohongshu.com/' }
    });
    const r = xhsFromState(html) || xhsFromHtml(html);
    /* 反爬页也会带 og:image（站内默认图），没拿到标题和正文一律按降级处理 */
    if (r && (r.title || r.content)) {
      return { type: 'xiaohongshu', url, title: r.title, content: r.content, images: r.images };
    }
    return { type: 'xiaohongshu', url, error: '解析失败' };
  } catch (e) {
    return { type: 'xiaohongshu', url, error: '解析失败' };
  }
}

/* ---------------- 抖音 ----------------
 * 分享短链（v.douyin.com）先跟随跳转拿到真实作品页，再从页面内嵌的 RENDER_DATA
 * 里读标题 / 描述 / 作者；短链也可直接走 iesdouyin 分享页，兜底再试一次 */
function douyinFromRenderData(html) {
  const m = html.match(/id="RENDER_DATA"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  let data;
  try {
    data = JSON.parse(decodeURIComponent(m[1]));
  } catch (e) {
    return null;
  }
  /* RENDER_DATA 结构随版本变化，递归找第一个带 desc + author 的节点 */
  let hit = null;
  (function walk(o) {
    if (hit || !o || typeof o !== 'object') return;
    if (typeof o.desc === 'string' && (o.author || o.authorInfo)) {
      hit = o;
      return;
    }
    for (const k in o) walk(o[k]);
  })(data);
  if (!hit) return null;
  const au = hit.author || hit.authorInfo || {};
  return {
    title: hit.desc || '',
    desc: hit.desc || '',
    author: au.nickname || au.name || ''
  };
}

function douyinFromHtml(html) {
  const $ = cheerio.load(html);
  const title = ($('meta[property="og:title"]').attr('content') || $('title').text() || '')
    .replace(/\s*-\s*抖音\s*$/, '').trim();
  const desc = ($('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '').trim();
  const author = ($('meta[property="og:author"]').attr('content') || '').trim();
  if (!title && !desc) return null;
  /* 风控骨架页只有站点通用文案（「在抖音记录美好生活…」），不是作品内容，按失败处理 */
  if (/在抖音记录美好生活|记录美好生活/.test(title + desc) && !author) return null;
  return { title, desc, author };
}

/* 移动分享页（iesdouyin /share/video/<id>/）服务端渲染，带 window._ROUTER_DATA，
 * 里面是完整作品数据；桌面 www.douyin.com/video/<id> 现在只返回加密壳，没有数据 */
const UA_MOBILE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function douyinFromRouterData(html) {
  const m = html.match(/window\._ROUTER_DATA\s*=\s*(\{[\s\S]*?\})\s*<\/script>/);
  if (!m) return null;
  let data;
  try {
    data = JSON.parse(m[1]);
  } catch (e) {
    return null;
  }
  const loader = (data && data.loaderData) || {};
  /* video_(id)/page.presentInfo.infoList[0] = 作品信息，desc 在 item.desc */
  for (const k of Object.keys(loader)) {
    const page = loader[k];
    if (!page || typeof page !== 'object') continue;
    const list = (page.videoInfoRes && page.videoInfoRes.item_list) || (page.presentInfo && page.presentInfo.infoList) || [];
    const item = list.map(x => x && (x.item || x.aweme)).find(Boolean);
    if (item) {
      const au = item.author || {};
      const desc = item.desc || '';
      return {
        title: desc.split('\n')[0].slice(0, 80) || desc,
        desc,
        author: au.nickname || ''
      };
    }
  }
  return null;
}

/* 短链 → 作品 id：跟随跳转后从最终 URL 里取数字 id */
function douyinId(url) {
  /* www.douyin.com/video/<id>、iesdouyin.com/share/video/<id>、/note/<id> */
  const m = String(url).match(/(?:video|note)\/(\d{8,})/);
  return m ? m[1] : '';
}

async function douyinShare(id) {
  const html = await getText(`https://www.iesdouyin.com/share/video/${id}/`, { ua: UA_MOBILE });
  return douyinFromRouterData(html) || douyinFromHtml(html);
}

async function parseDouyin(rawUrl) {
  const url = pickUrl(rawUrl);
  try {
    /* ① 已经是作品页：直接按 id 取移动分享页 */
    let id = douyinId(url);
    let d = id ? await douyinShare(id) : null;
    /* ② 短链或未拿到 id：先跟随跳转，从最终地址里取 id 再试一次 */
    if (!d || !(d.title || d.desc)) {
      const r = await get(url, { ua: UA_MOBILE, headers: { referer: 'https://www.douyin.com/' } });
      const finalUrl = r.url || url;
      id = id || douyinId(finalUrl);
      if (id) d = await douyinShare(id);
      /* ③ 兜底：桌面页 RENDER_DATA / og 标签 */
      if (!d || !(d.title || d.desc)) {
        const html = await r.text();
        d = douyinFromRenderData(html) || douyinFromHtml(html);
      }
    }
    if (d && (d.title || d.desc)) {
      return { type: 'douyin', url, title: d.title, desc: d.desc, author: d.author || '' };
    }
    return { type: 'douyin', url, error: '解析失败' };
  } catch (e) {
    return { type: 'douyin', url, error: '解析失败' };
  }
}

/* ---------------- 路由 ---------------- */

function platformOf(url) {
  if (/bilibili\.com|b23\.tv/i.test(url)) return 'bilibili';
  if (/xiaohongshu\.com|xhslink\.com/i.test(url)) return 'xiaohongshu';
  if (/douyin\.com|iesdouyin\.com/i.test(url)) return 'douyin';
  return '';
}

async function parseAny(link) {
  const url = pickUrl(link);
  const p = platformOf(url);
  if (p === 'bilibili') return parseBilibili(url);
  if (p === 'xiaohongshu') return parseXiaohongshu(url);
  if (p === 'douyin') return parseDouyin(url);
  return { type: 'unknown', url, error: '暂不支持该平台' };
}

/* POST /api/link-parse  body: { url } */
router.post('/link-parse', async (req, res, next) => {
  try {
    const raw = (req.body && req.body.url) || req.query.url;
    const url = pickUrl(raw);
    if (!url || !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ ok: false, message: '请提供合法的链接' });
    }
    const data = await parseAny(url);
    res.json({ ok: !data.error, data });
  } catch (e) { next(e); }
});

/* GET /api/link-parse?url=... 便于直接浏览器调试 */
router.get('/link-parse', async (req, res, next) => {
  try {
    const url = pickUrl(req.query.url);
    if (!url || !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ ok: false, message: '请提供合法的链接' });
    }
    const data = await parseAny(url);
    res.json({ ok: !data.error, data });
  } catch (e) { next(e); }
});

module.exports = router;
module.exports.parseBilibili = parseBilibili;
module.exports.parseXiaohongshu = parseXiaohongshu;
module.exports.parseDouyin = parseDouyin;
