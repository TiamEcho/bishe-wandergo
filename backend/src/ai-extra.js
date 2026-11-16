/* =========================================================
 * 平台 AI 能力扩展 ai-extra.js
 * 1) aiPalette   —— 旅行途中「AI 配色搭配」（替代前端 Math.random）
 * 2) aiJournal   —— 旅行手账文案生成（替代前端静态模板拼接）
 * 3) aiQueryPlan —— 智能搜索：把自然语言需求解析成检索条件 + 检索建议
 *
 * 三者统一走 dots.js 的通用 JSON 对话（DOTS_* 那套 OpenAI 兼容配置），
 * 未配置 Key / 调用失败时走本地确定性规则，保证接口永远有可用返回。
 * 返回值统一带 engine 字段：'dots' 表示真模型输出，'local' 表示规则降级。
 * ========================================================= */
const { chatJson } = require('./dots');

/* ---------------- 通用工具 ---------------- */
const clamp = (v, lo, hi, dft) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return dft;
  return Math.min(hi, Math.max(lo, n));
};
const wrapHue = h => ((Math.round(Number(h) || 0) % 360) + 360) % 360;

/* ---------------- 1) AI 配色搭配 ---------------- */
/* 前端 hue/sat 为 HSL 的 H 与 S，mode 是搭配模式：
 * mono 单色 / comp 互补 / ana 类似 / tri 三角 */
const MODE_CN = { mono: '单色和谐', comp: '互补撞色', ana: '类似邻近', tri: '三角和谐' };
const MODE_STEP = { mono: 0, comp: 180, ana: 30, tri: 120 };

const PALETTE_SYSTEM = `你是旅行手账的配色师。用户给出当前主色的 HSL 值（色相 H 0-360、饱和度 S 0-100）、
搭配模式和目的地城市。请产出一组适合做旅行手账封面的配色。
要求：只输出严格 JSON，不要解释、不要 markdown。格式：
{"name":"配色方案名（4-8 个中文字）","mode":"mono|comp|ana|tri","note":"一句 20 字以内的说明",
 "colors":[{"role":"主色","h":210,"s":48,"l":54},{"role":"辅色","h":32,"s":52,"l":60},{"role":"点缀色","h":8,"s":66,"l":56}]}
要求 colors 恰好 3 项，h 为 0-360 整数、s 与 l 为 0-100 整数；三种颜色对比清晰，
符合给定的搭配模式，整体风格贴合目的地城市的气质。`;

function localPalette(hue, sat, mode) {
  const step = MODE_STEP[mode] != null ? MODE_STEP[mode] : 0;
  const h = wrapHue(hue);
  const s = clamp(sat, 10, 90, 48);
  const colors = mode === 'mono'
    ? [{ role: '主色', h, s, l: 46 }, { role: '辅色', h: wrapHue(h + 12), s: clamp(s - 10, 10, 90, 38), l: 66 }, { role: '点缀色', h: wrapHue(h + 24), s, l: 32 }]
    : [{ role: '主色', h, s, l: 48 }, { role: '辅色', h: wrapHue(h + step), s: clamp(s - 6, 10, 90, 42), l: 52 }, { role: '点缀色', h: wrapHue(h + step + 30), s: clamp(s + 10, 10, 92, 58), l: 60 }];
  return { engine: 'local', name: MODE_CN[mode] || '和谐配色', mode: mode || 'mono', note: '按色彩学规则推算的搭配方案', colors };
}

/**
 * AI 配色搭配
 * @param {object} p { hue, sat, mode, city, purpose }
 */
async function aiPalette(p = {}) {
  const hue = wrapHue(p.hue);
  const sat = clamp(p.sat, 5, 95, 48);
  const mode = MODE_STEP[p.mode] != null ? p.mode : 'mono';
  const city = String(p.city || '').slice(0, 20);

  const user = `当前主色：H=${hue} S=${sat}\n搭配模式：${MODE_CN[mode]}（${mode}）\n目的地：${city || '未指定'}`;
  const obj = await chatJson(PALETTE_SYSTEM, user, 12000);
  const arr = obj && Array.isArray(obj.colors) ? obj.colors : null;
  /* 模型输出必须过一遍校验：数量不是 3、色值越界都退回本地方案 */
  if (arr && arr.length === 3 && arr.every(c => Number.isFinite(Number(c.h)))) {
    return {
      engine: 'dots',
      name: String(obj.name || MODE_CN[mode]).slice(0, 16),
      mode,
      note: String(obj.note || '').slice(0, 40),
      colors: arr.map((c, i) => ({
        role: String(c.role || ['主色', '辅色', '点缀色'][i]).slice(0, 6),
        h: wrapHue(c.h),
        s: clamp(c.s, 5, 95, sat),
        l: clamp(c.l, 8, 92, 52)
      }))
    };
  }
  return localPalette(hue, sat, mode);
}

/* ---------------- 2) AI 手账文案 ---------------- */
const JOURNAL_SYSTEM = `你是旅行手账文案师。用户给出目的地城市、景点名称、景点标签、建议游玩时长与交通方式，
以及需要的天数（1-7）。请写一份可直接排进手账的逐日正文。
要求：只输出严格 JSON，不要解释、不要 markdown。格式：
{"title":"手账标题（8-14 字）","summary":"开篇一句（20-40 字）",
 "days":[{"title":"当天小标题（6-12 字）","text":"当天正文（40-90 字，具体到时段与动作，可提美食与拍照时机）"}]}
days 的条数必须等于用户要求的天数。语言温暖、具体、有画面感，不要出现「第一天第二天」这类空泛表达，
不要编造不存在的地名，只围绕给定的城市与景点展开。`;

/* 本地降级：与前端原 jnDays 模板同源，保证无 Key 时文案风格不突变 */
function localJournal(spot, days) {
  const n = clamp(days, 1, 7, 3);
  const city = spot.city || '目的地';
  const name = spot.n || spot.name || city;
  const tag = spot.tag || '经典打卡';
  const base = [
    { title: '抵达 ' + city, text: '初见 ' + name + '，傍晚沿街慢行，尝一份本地人推荐的小吃，把旅行的第一页留给惊喜。' },
    { title: name + ' 全日深度', text: '上午直奔 ' + tag + ' 主题游览；' + (spot.traf || '当地交通可达') + '；黄昏光线最柔，记得占好机位拍下属于你的那一帧。' },
    { title: '返程与手信', text: '睡到自然醒，带走 ' + city + ' 的限定文创与味觉记忆，把这一页留给下一次重逢的理由。' }
  ];
  const out = [];
  for (let i = 0; i < n; i++) out.push(base[Math.min(i, base.length - 1)]);
  return { engine: 'local', title: city + ' 手账 · ' + name, summary: '把 ' + city + ' 的慢时光，一页一页收进手账。', days: out };
}

/**
 * AI 手账文案
 * @param {object} p { city, spot, tag, hours, traffic, days }
 */
async function aiJournal(p = {}) {
  const spot = String(p.spot || '').slice(0, 40);
  const city = String(p.city || '').slice(0, 20);
  const days = clamp(p.days, 1, 7, 3);
  if (!spot && !city) return { engine: 'local', error: '缺少景点', ...localJournal({}, days) };

  const user = `目的地城市：${city || '未指定'}\n景点名称：${spot || '未指定'}\n景点标签：${String(p.tag || '').slice(0, 40) || '未指定'}\n建议游玩时长：${String(p.hours || '').slice(0, 20) || '未指定'}\n交通方式：${String(p.traffic || '').slice(0, 40) || '未指定'}\n需要写 ${days} 天`;

  const obj = await chatJson(JOURNAL_SYSTEM, user, 25000);
  const arr = obj && Array.isArray(obj.days) ? obj.days : null;
  if (arr && arr.length === days && arr.every(d => d && d.text)) {
    return {
      engine: 'dots',
      title: String(obj.title || (city + ' 手账')).slice(0, 30),
      summary: String(obj.summary || '').slice(0, 80),
      days: arr.map(d => ({
        title: String(d.title || '').slice(0, 24),
        text: String(d.text).slice(0, 240)
      }))
    };
  }
  return localJournal({ city, n: spot, tag: p.tag, traf: p.traffic }, days);
}

/* ---------------- 3) 智能搜索：自然语言 → 检索条件 ---------------- */
const INTERESTS = ['历史', '自然', '美食', '摄影', '亲子', '夜游', '购物', '海岛', '温泉', '艺术'];
const BUDGET_CN = { low: '经济', mid: '中等', high: '高预算' };

const SEARCH_SYSTEM = `你是旅游平台的搜索意图解析器。用户输入一句自然语言检索需求（可能是城市、景点、美食、天数、预算、同行人等的任意组合），
请解析成结构化检索条件。
要求：只输出严格 JSON，不要解释、不要 markdown。格式：
{"city":"城市名，没有则空串","keywords":["检索关键词，1-5 个"],
 "interests":["从 历史/自然/美食/摄影/亲子/夜游/购物/海岛/温泉/艺术 中选，最多 3 个，没有则空数组"],
 "days":天数整数，未提及填 0,"budget":"low|mid|high，未提及填 mid",
 "summary":"一句话复述用户需求（20 字以内）"}
不要编造用户没有提到的城市或兴趣。`;

function localQueryPlan(q) {
  const t = String(q || '').trim();
  const interests = INTERESTS.filter(k => t.includes(k)).slice(0, 3);
  /* 用库内真实城市名做最长匹配（不引循环依赖，db 在函数内惰性加载） */
  let city = '';
  try {
    const { CITY_NAMES } = require('./db');
    for (const c of CITY_NAMES || []) if (c && t.includes(c) && c.length > city.length) city = c;
  } catch (e) { /* 无词表时留空 */ }
  const daysM = t.match(/(\d+)\s*天/);
  const budget = /便宜|省钱|穷游|预算低|经济/.test(t) ? 'low'
    : /高端|奢华|不差钱|预算足/.test(t) ? 'high' : 'mid';
  const clean = t.replace(/[，,。！!？?、]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 5);
  return {
    engine: 'local',
    city,
    keywords: clean.length ? clean : [t].filter(Boolean),
    interests,
    days: daysM ? Number(daysM[1]) : 0,
    budget,
    summary: t.slice(0, 20)
  };
}

/**
 * 智能搜索意图解析
 * @param {string} q 用户自然语言输入
 */
async function aiQueryPlan(q) {
  const text = String(q || '').trim().slice(0, 200);
  if (!text) return { engine: 'local', city: '', keywords: [], interests: [], days: 0, budget: 'mid', summary: '' };
  const obj = await chatJson(SEARCH_SYSTEM, text, 12000);
  if (obj && (obj.city != null || Array.isArray(obj.keywords))) {
    const its = Array.isArray(obj.interests) ? obj.interests.filter(x => INTERESTS.includes(x)).slice(0, 3) : [];
    const kws = Array.isArray(obj.keywords) ? obj.keywords.map(k => String(k).slice(0, 20)).filter(Boolean).slice(0, 5) : [];
    return {
      engine: 'dots',
      city: String(obj.city || '').slice(0, 20),
      keywords: kws,
      interests: its,
      days: clamp(obj.days, 0, 30, 0),
      budget: ['low', 'mid', 'high'].includes(obj.budget) ? obj.budget : 'mid',
      summary: String(obj.summary || '').slice(0, 40)
    };
  }
  return localQueryPlan(text);
}

module.exports = { aiPalette, aiJournal, aiQueryPlan, localPalette, localJournal, localQueryPlan, BUDGET_CN };
