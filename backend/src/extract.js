/* =========================================================
 * 实体抽取：本地规则引擎（大模型不可用时的降级方案）
 * 供 db.js（种子数据初始化）与 dots.js（AI 失败兜底）共用
 * ========================================================= */

/* 常见美食词典（命中即计入，不做分词） */
const FOOD_WORDS = [
  '火锅', '烧烤', '米线', '过桥米线', '拉面', '牛肉面', '刀削面', '肠粉', '生煎', '小笼包',
  '烤鸭', '烧鹅', '烧腊', '螺蛳粉', '麻辣烫', '串串', '酸汤鱼', '椰子鸡', '羊肉泡馍',
  '肉夹馍', '凉皮', '早茶', '点心', '豆花', '豆腐脑', '冰粉', '糖水', '甜品', '蛋糕',
  '咖啡', '奶茶', '酸奶', '冰淇淋', '啤酒', '葡萄酒', '清酒', '海鲜', '生蚝', '烧肉',
  '寿司', '拉粉', '米粉', '饵块', '乳扇', '鲜花饼', '鲜花饼', '菌子', '汽锅鸡', '火腿'
];

/* 地名后缀（用于从自由文本里切出景区/地点名） */
const PLACE_SUFFIX = [
  '古城', '古镇', '古村', '老街', '古街', '街区', '岛', '湖', '山', '峰', '峡谷', '瀑布',
  '湿地', '草原', '沙漠', '雪山', '温泉', '海滩', '沙滩', '码头', '公园', '植物园', '动物园',
  '博物馆', '美术馆', '纪念馆', '图书馆', '寺', '庙', '宫', '塔', '桥', '大桥', '广场', '市场',
  '步行街', '夜市', '巷', '胡同', '村', '镇', '景区', '遗址', '城墙', '长城', '天池', '海湾'
];

/* 商圈/街区类后缀 */
const DIST_SUFFIX = ['商圈', '夜市', '步行街', '商业街', '老街', '风情街', '文创园', '创意园', '市集', '街区', '购物中心', '广场'];

const STOP = new Set([
  '这个', '那个', '我们', '他们', '你们', '这里', '那里', '哪里', '什么', '怎么', '可以', '一个',
  '非常', '真的', '就是', '因为', '所以', '但是', '而且', '如果', '然后', '已经', '还有', '没有',
  '第一次', '小时', '分钟', '门票', '攻略', '视频', '旅行', '旅游', '打卡', '分享', '推荐'
]);

function clean(s) {
  return String(s || '').replace(/[^\u4e00-\u9fa5A-Za-z0-9·\-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function countOf(text, name) {
  if (!name) return 0;
  return (text.split(name).length - 1);
}

/* 从文本里按后缀切出候选地名词 */
function bySuffix(text, suffixes, min = 2, max = 6) {
  const out = [];
  const re = new RegExp(`([\\u4e00-\\u9fa5]{${min},${max}})(${suffixes.join('|')})`, 'g');
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = m[1] + m[2];
    const head = m[1];
    if (STOP.has(head) || STOP.has(name)) continue;
    out.push(name);
  }
  return out;
}

/**
 * 本地实体抽取
 * @param {string} text 攻略正文
 * @param {object} opt  { city, spotNames:[], cityNames:[] }
 * @returns {{places:Array, foods:Array, districts:Array}}
 */
function localExtract(text, opt = {}) {
  const body = clean(text);
  const places = new Map();
  const foods = new Map();
  const districts = new Map();

  const add = (map, name, type) => {
    if (!name || name.length < 2) return;
    const c = countOf(body, name);
    if (!c) return;
    const old = map.get(name) || { name, mention: 0 };
    old.mention = Math.max(old.mention, c);
    map.set(name, old);
  };

  // 1) 已收录景点 / 城市名优先（准确率高）
  (opt.spotNames || []).forEach(n => add(places, n));
  (opt.cityNames || []).forEach(n => add(places, n));

  // 2) 后缀规则切词
  bySuffix(body, PLACE_SUFFIX).forEach(n => add(places, n));
  bySuffix(body, DIST_SUFFIX, 2, 5).forEach(n => add(districts, n));

  // 3) 美食词典
  FOOD_WORDS.forEach(n => { if (body.includes(n)) add(foods, n); });
  // 4) 「XX米线 / XX烤肉」这类带有地名前缀的菜名
  bySuffix(body, ['米线', '烤肉', '烤鱼', '火锅', '小吃', '面馆', '烧烤', '甜品店', '茶室'], 2, 5)
    .forEach(n => add(foods, n));

  // 5) 同名实体去重（既是商圈又是地点时归到商圈）
  districts.forEach((_, k) => places.delete(k));

  return {
    places: [...places.values()].sort((a, b) => b.mention - a.mention).slice(0, 12),
    foods: [...foods.values()].sort((a, b) => b.mention - a.mention).slice(0, 10),
    districts: [...districts.values()].sort((a, b) => b.mention - a.mention).slice(0, 8)
  };
}

/* 宽松 JSON 解析：兼容 ```json``` 包裹、前后有解释文字的情况 */
function parseJsonLoose(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  let s = String(raw).trim();
  s = s.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const i = s.indexOf('{');
  const j = s.lastIndexOf('}');
  if (i >= 0 && j > i) s = s.slice(i, j + 1);
  try { return JSON.parse(s); } catch { return null; }
}

/* 把 AI 返回的 {places, foods, districts} 归一化成统一结构 */
function normalizeAi(obj, { city = '', spotNames = [], cityNames = [], text = '' } = {}) {
  const pick = (v, type) => {
    const arr = Array.isArray(v) ? v : (typeof v === 'string' ? v.split(/[、,，;；\s]+/) : []);
    const map = new Map();
    arr.forEach(it => {
      const name = typeof it === 'string' ? it : (it && (it.name || it.word || it.text));
      if (!name) return;
      const mention = typeof it === 'object' && it.mention ? Number(it.mention) : countOf(text, name) || 1;
      const cur = map.get(name) || { name, mention: 0 };
      cur.mention = Math.max(cur.mention, mention);
      map.set(name, cur);
    });
    return [...map.values()].sort((a, b) => b.mention - a.mention).slice(0, type === 'places' ? 12 : 8);
  };
  return { places: pick(obj.places || obj.place, 'places'), foods: pick(obj.foods || obj.food, 'foods'), districts: pick(obj.districts || obj.area || obj.district, 'districts') };
}

module.exports = { localExtract, parseJsonLoose, normalizeAi, clean };
