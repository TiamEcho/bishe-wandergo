/* =========================================================
 * Dots Studio 大模型接入：从攻略文本里抽取「地名 / 美食 / 商圈」
 * 未配置 DOTS_API_KEY 或调用失败 → 自动降级为本地规则抽取
 * ========================================================= */
const { localExtract, parseJsonLoose, normalizeAi } = require('./extract');

const BASE = (process.env.DOTS_API_BASE || 'https://note3-prev-api.askdiandian.com/v1').replace(/\/$/, '');
const MODEL = process.env.DOTS_MODEL || 'dots3-note-prev';
const KEY = process.env.DOTS_API_KEY || '';
const CHAT_PATH = process.env.DOTS_CHAT_PATH || '/chat/completions';
const TIMEOUT = Number(process.env.DOTS_TIMEOUT || 18000);

const SYSTEM = `你是旅游攻略信息抽取引擎。请从用户给出的攻略文本中抽取三类实体：
1) places 地名/景点（如「洱海」「故宫博物院」「伏见稻荷大社」）
2) foods 美食物产（如「过桥米线」「烤鸭」「鲜花饼」）
3) districts 商圈/街区（如「三里屯」「南锣鼓巷」「告庄西双景夜市」）
要求：只输出严格 JSON，不要解释、不要 markdown。格式：
{"places":[{"name":"洱海","mention":2}],"foods":[{"name":"饵块","mention":1}],"districts":[{"name":"大理古城","mention":1}]}
mention 表示该实体在文本中出现的次数（估算即可，最少 1）。不要编造文本中不存在的内容。`;

/**
 * 调用 Dots Studio 抽取实体
 * @param {string} text 攻略正文
 * @param {object} ctx  { city, spotNames, cityNames }
 */
async function extractEntities(text, ctx = {}) {
  const cfgOk = !!KEY;

  if (cfgOk) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), TIMEOUT);
      const res = await fetch(`${BASE}${CHAT_PATH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${KEY}`
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.1,
          stream: false,
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: `城市：${ctx.city || '未知'}\n攻略文本：\n${String(text).slice(0, 4000)}` }
          ]
        }),
        signal: ctl.signal
      });
      clearTimeout(timer);

      if (!res.ok) throw new Error(`Dots API ${res.status}`);
      const data = await res.json();
      const raw = data?.choices?.[0]?.message?.content
        || data?.output_text
        || (typeof data?.content === 'string' ? data.content : null)
        || data?.data?.content;
      const obj = parseJsonLoose(raw);
      if (!obj) throw new Error('AI 返回不是合法 JSON');
      const norm = normalizeAi(obj, { city: ctx.city, spotNames: ctx.spotNames, cityNames: ctx.cityNames, text });
      return { engine: 'dots', model: MODEL, ...norm };
    } catch (e) {
      const fb = localExtract(text, ctx);
      return { engine: 'local', fallback: true, error: String(e.message || e), ...fb };
    }
  }

  return { engine: 'local', configured: false, ...localExtract(text, ctx) };
}

/* 供前端/管理页展示 AI 状态 */
function aiStatus() {
  return { base: BASE, model: MODEL, configured: !!KEY, endpoint: `${BASE}${CHAT_PATH}` };
}

module.exports = { extractEntities, aiStatus };
