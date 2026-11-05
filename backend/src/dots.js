/* =========================================================
 * 大模型接入（OpenAI 兼容协议）：从攻略文本里抽取「地名 / 美食 / 商圈」
 * 默认智谱 GLM（glm-4-flash 免费）；未配置 DOTS_API_KEY 或调用失败 → 本地规则抽取
 * ========================================================= */
const { localExtract, parseJsonLoose, normalizeAi } = require('./extract');

const BASE = (process.env.DOTS_API_BASE || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/$/, '');
const MODEL = process.env.DOTS_MODEL || 'glm-4-flash';
const KEY = process.env.DOTS_API_KEY || '';
const CHAT_PATH = process.env.DOTS_CHAT_PATH || '/chat/completions';
const TIMEOUT = Number(process.env.DOTS_TIMEOUT || 18000);

/* ================= 可选模型列表（自选 AI 模型） =================
 * 优先调服务端 /models（OpenAI 兼容协议统一有该接口）拿到真实可用模型；
 * 拉取失败（无 Key / 网络异常）退回 DOTS_MODELS 环境变量或默认模型，
 * 保证前端下拉框在任何情况下都有内容可选项 */
const MODEL_INFO = {
  'glm-4-flash': { label: 'GLM-4-Flash', desc: '免费 · 速度最快' },
  'glm-4-air': { label: 'GLM-4-Air', desc: '轻量 · 成本低' },
  'glm-4-airx': { label: 'GLM-4-AirX', desc: '极速 · 高并发更稳' },
  'glm-4-long': { label: 'GLM-4-Long', desc: '长文本 · 适合整篇攻略' },
  'glm-4-plus': { label: 'GLM-4-Plus', desc: '高智能 · 规划质量最好' },
  'glm-4': { label: 'GLM-4', desc: '通用旗舰版' },
  'dots3-note-prev': { label: 'Dots3 Note', desc: '默认 · 笔记与攻略理解' }
};

/* 白名单：远端列表 + 环境变量列表 + 默认模型 */
let CATALOG = (process.env.DOTS_MODELS || '').split(',').map(s => s.trim()).filter(Boolean);
if (!CATALOG.length) CATALOG = [MODEL];

let CATALOG_AT = 0;   /* 上次刷新时间，10 分钟内不重复请求远端 */
let CATALOG_TASK = null;

/* 远端模型列表（带 10 分钟缓存），返回 [{id,label,desc}] */
function loadCatalog() {
  const fresh = CATALOG_AT && Date.now() - CATALOG_AT < 10 * 60 * 1000;
  if (fresh || CATALOG_TASK) return CATALOG_TASK || Promise.resolve(CATALOG);
  CATALOG_TASK = (async () => {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 5000);
      const r = await fetch(`${BASE}/models`, {
        headers: KEY ? { Authorization: `Bearer ${KEY}` } : {},
        signal: ctl.signal
      });
      clearTimeout(timer);
      const j = await r.json();
      const ids = ((j && j.data) || []).map(m => m && m.id).filter(Boolean);
      if (ids.length) {
        CATALOG = ids;
        CATALOG_AT = Date.now();
      }
    } catch (e) { /* 保持旧列表 */ }
    return CATALOG;
  })().finally(() => { CATALOG_TASK = null; });
  return CATALOG_TASK;
}

/* 校验客户端传来的模型名，只允许白名单内的值 */
function pickModel(m) {
  const v = String(m || '').trim();
  return CATALOG.includes(v) ? v : MODEL;
}

/* 供前端下拉框使用：当前可用模型 + 默认值 */
async function modelList() {
  const ids = await loadCatalog();
  return {
    default: MODEL,
    configured: !!KEY,
    list: ids.map(id => ({
      id,
      label: (MODEL_INFO[id] && MODEL_INFO[id].label) || id,
      desc: (MODEL_INFO[id] && MODEL_INFO[id].desc) || '服务端可用模型'
    }))
  };
}


const SYSTEM = `你是旅游攻略信息抽取引擎。请从用户给出的攻略文本中抽取三类实体：
1) places 地名/景点（如「洱海」「故宫博物院」「伏见稻荷大社」）
2) foods 美食物产（如「过桥米线」「烤鸭」「鲜花饼」）
3) districts 商圈/街区（如「三里屯」「南锣鼓巷」「告庄西双景夜市」）
要求：只输出严格 JSON，不要解释、不要 markdown。格式：
{"places":[{"name":"洱海","mention":2}],"foods":[{"name":"饵块","mention":1}],"districts":[{"name":"大理古城","mention":1}]}
mention 表示该实体在文本中出现的次数（估算即可，最少 1）。不要编造文本中不存在的内容。`;

/**
 * 通用 JSON 对话：给定 system + user，返回解析后的对象；未配置 Key 或失败返回 null
 * @param {string} system 系统提示词
 * @param {string} user   用户内容
 */
async function chatJson(system, user, timeout, model) {
  if (!KEY) return null;
  const useModel = pickModel(model);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout || TIMEOUT);
  try {
    const res = await fetch(`${BASE}${CHAT_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: useModel,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0.6
      }),
      signal: ctl.signal
    });
    if (!res.ok) return null;
    const j = await res.json();
    const txt = (((j.choices || [])[0] || {}).message || {}).content || '';
    return parseJsonLoose(txt);
  } catch (e) {
    console.warn('[dots] chatJson', e.name === 'AbortError' ? 'timeout' : String(e.message || e));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 调用大模型抽取实体
 * @param {string} text 攻略正文
 * @param {object} ctx  { city, spotNames, cityNames }
 */
async function extractEntities(text, ctx = {}, model) {
  const cfgOk = !!KEY;
  const useModel = pickModel(model);

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
          model: useModel,
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

      if (!res.ok) throw new Error(`AI API ${res.status}`);
      const data = await res.json();
      const raw = data?.choices?.[0]?.message?.content
        || data?.output_text
        || (typeof data?.content === 'string' ? data.content : null)
        || data?.data?.content;
      const obj = parseJsonLoose(raw);
      if (!obj) throw new Error('AI 返回不是合法 JSON');
      const norm = normalizeAi(obj, { city: ctx.city, spotNames: ctx.spotNames, cityNames: ctx.cityNames, text });
      return { engine: 'dots', model: useModel, ...norm };
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

/* =========================================================
 * 通用对话：WanderGo AI 助手悬浮球
 * 未配置 Key 或调用失败 → 降级为本地关键词回复
 * ========================================================= */
const CHAT_SYSTEM = `你是 WanderGo 旅游平台的 AI 助手，语气亲切、专业。你可以：
1) 回答旅行相关问题（目的地推荐、行程规划、交通、美食、住宿、天气、预算等）
2) 根据用户描述推荐合适的城市或景点
3) 帮忙分析攻略视频里的关键信息

【行程规划强制约束】当用户要求生成多日行程时：
- 必须按用户输入的旅行天数，逐天输出完整行程（Day1、Day2、Day3…直到返程日），不得省略任何一天
- 每一天都必须包含：上午/下午/晚上的时段划分 + 景点名称 + 交通方式 + 美食推荐
- 明确：天数不足属于严重错误，不得合并天数，不得省略
- 输出格式为结构化列表，每天一个区块，包含 day 字段
- 末尾再补一句总结
请逐天输出，不要合并天数，不要省略。

回答简洁有条理，适当使用 emoji，避免过长。`;

/* 本地降级回复：关键词匹配，保证离线也能用 */
function localReply(message) {
  const t = String(message || '').trim();
  if (!t) return '你好！我是 WanderGo AI 助手，可以问我旅行相关的问题，比如「推荐一个适合周末游的城市」「大理有什么必吃美食」「去冰岛要带什么」。也可以点上方「选择视频分析」让我帮你拆解攻略视频~';
  if (/你好|hi|hello|在吗/i.test(t)) return '你好呀！我是 WanderGo AI 助手 🤖 想聊点旅行的什么？可以问我目的地推荐、行程规划、美食住宿，或者让我帮你分析攻略视频~';
  if (/推荐.*城市|去哪玩|去哪旅行|目的地/.test(t)) return '推荐几个热门方向：国内👉大理（洱海日出+古城慢生活）、重庆（洪崖洞夜景+火锅）、西安（兵马俑+回民街）、三亚（海岛度假）；国外👉东京（涩谷+浅草寺）、冰岛（极光+黄金圈）、清迈（古城+夜市）。告诉我你的偏好（季节/预算/天数），我帮你细化~';
  if (/大理|洱海/.test(t)) return '大理 3 天 2 晚推荐：Day1 洱海生态廊道骑行+喜洲古镇；Day2 苍山索道+大理古城夜游；Day3 双廊发呆+挖色镇。必吃：饵块、乳扇、鲜花饼、野生菌火锅 🍄';
  if (/重庆|火锅|洪崖洞/.test(t)) return '重庆必玩：洪崖洞夜景、解放碑、李子坝轻轨穿楼、磁器口古镇。必吃：重庆火锅、小面、酸辣粉、毛血旺 🌶️ 建议住解放碑附近，去哪都方便。';
  if (/西安|兵马俑|回民街/.test(t)) return '西安 3 天：Day1 兵马俑+华清宫；Day2 陕西历史博物馆+大雁塔+回民街；Day3 古城墙骑行+钟鼓楼。必吃：肉夹馍、凉皮、羊肉泡馍、biangbiang面 😋';
  if (/冰岛|极光/.test(t)) return '冰岛追极光攻略：9月-3月是极光季，推荐住雷克雅未克+自驾黄金圈（辛格维利尔国家公园、间歇泉、黄金瀑布）。必带：防风外套、相机三脚架、暖宝宝。预算约 2.5w/人（7天）🌌';
  if (/预算|多少钱|花费/.test(t)) return '预算参考：国内短途 2-4k / 人（3天），国内长线 5-8k / 人（5-7天）；东南亚 6-10k / 人，日本 1.2-1.8w / 人，欧洲/冰岛 2-3w+ / 人。告诉我目的地和天数，我帮你拆预算~';
  if (/美食|吃什么|必吃/.test(t)) return '各地必吃速查：北京-烤鸭/炸酱面；上海-生煎/小笼包；成都-火锅/串串/担担面；广州-早茶/肠粉；西安-肉夹馍/羊肉泡馍；重庆-火锅/小面；大理-饵块/乳扇；长沙-臭豆腐/茶颜悦色 🥢';
  if (/住宿|住哪|酒店|民宿/.test(t)) return '选住宿建议：优先「交通便利+评分4.5+」。第一次去住市中心/景区附近；预算有限选青旅或连锁；想体验当地选民宿。告诉我城市和预算，我给具体推荐~';
  return `关于「${t}」，我的建议是：先确定目的地和天数，再按「景点→交通→住宿→美食」四块拆解。你可以告诉我更具体的信息（想去哪、几天、预算多少），我帮你出一份详细方案 ✈️`;
}

/**
 * 通用对话
 * @param {string} message 用户输入
 * @param {Array} history 历史消息 [{role,content}]
 */
async function chat(message, history = [], model) {
  const cfgOk = !!KEY;
  const useModel = pickModel(model);
  if (cfgOk) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), TIMEOUT);
      const messages = [
        { role: 'system', content: CHAT_SYSTEM },
        ...history.slice(-6),
        { role: 'user', content: String(message).slice(0, 3000) }
      ];
      const res = await fetch(`${BASE}${CHAT_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({ model: useModel, temperature: 0.7, stream: false, messages }),
        signal: ctl.signal
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`AI API ${res.status}`);
      const data = await res.json();
      const raw = data?.choices?.[0]?.message?.content
        || data?.output_text
        || (typeof data?.content === 'string' ? data.content : null)
        || data?.data?.content;
      if (!raw) throw new Error('AI 返回为空');
      return { engine: 'dots', model: useModel, reply: String(raw) };
    } catch (e) {
      return { engine: 'local', fallback: true, error: String(e.message || e), reply: localReply(message) };
    }
  }
  return { engine: 'local', configured: false, reply: localReply(message) };
}

module.exports = { extractEntities, aiStatus, chat, chatJson, modelList, pickModel };
