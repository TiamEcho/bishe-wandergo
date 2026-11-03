/* =========================================================
 * 数据层：PostgreSQL（生产）/ SQLite（本地无 DATABASE_URL 时）
 *
 * 生产：在 Render 创建 Postgres 后，DATABASE_URL 会自动注入，数据持久保存
 * 本地：不配 DATABASE_URL 时仍用 better-sqlite3，方便离线开发
 *
 * 两种驱动统一暴露成同一套接口：
 *   dbx.all(sql, params)  -> Promise<row[]>
 *   dbx.get(sql, params)  -> Promise<row|null>
 *   dbx.run(sql, params)  -> Promise<{ changes, lastId }>
 *   dbx.seed() / stats() / searchGuides() / ... （均为 async）
 *
 * SQL 统一使用 ? 占位符；Postgres 下自动转成 $1,$2...
 * ========================================================= */
const path = require('path');
const fs = require('fs');
const { localExtract } = require('./extract');

const ROOT = path.resolve(__dirname, '..', '..');   // 项目根目录
const USE_PG = !!process.env.DATABASE_URL;

/* ---------------- 驱动抽象 ---------------- */
let impl;

if (USE_PG) {
  /* ---------- PostgreSQL（pg 驱动） ---------- */
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL)
      ? false
      : { rejectUnauthorized: false }
  });

  /* ? 占位符 → $1 $2 ...（跳过字符串字面量里的 ?，本项目的 SQL 里没有这种用法） */
  const toPg = sql => {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
  };

  impl = {
    dialect: 'postgres',
    raw: pool,
    async all(sql, params = []) {
      const r = await pool.query(toPg(sql), params);
      return r.rows;
    },
    async get(sql, params = []) {
      const r = await pool.query(toPg(sql), params);
      return r.rows[0] || null;
    },
    async run(sql, params = []) {
      /* INSERT 需要拿自增 id 时自动补 RETURNING id */
      const needId = /^\s*insert/i.test(sql) && !/returning/i.test(sql);
      const r = await pool.query(toPg(sql) + (needId ? ' RETURNING id' : ''), params);
      return { changes: r.rowCount, lastId: r.rows[0] ? r.rows[0].id : null };
    },
    async exec(sql) {
      await pool.query(sql);
    },
    async tx(fn) {
      /* 种子数据初始化用；单连接事务 */
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const ctx = {
          all: async (s, p = []) => (await client.query(toPg(s), p)).rows,
          get: async (s, p = []) => (await client.query(toPg(s), p)).rows[0] || null,
          run: async (s, p = []) => {
            const needId = /^\s*insert/i.test(s) && !/returning/i.test(s);
            const r = await client.query(toPg(s) + (needId ? ' RETURNING id' : ''), p);
            return { changes: r.rowCount, lastId: r.rows[0] ? r.rows[0].id : null };
          }
        };
        const out = await fn(ctx);
        await client.query('COMMIT');
        return out;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
  };
} else {
  /* ---------- SQLite（better-sqlite3） ---------- */
  const Database = require('better-sqlite3');
  const DATA_DIR = process.env.DB_DIR || path.join(__dirname, '..', 'data');
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const sdb = new Database(path.join(DATA_DIR, 'wandergo.db'));
  sdb.pragma('journal_mode = WAL');

  impl = {
    dialect: 'sqlite',
    raw: sdb,
    async all(sql, params = []) { return sdb.prepare(sql).all(...params); },
    async get(sql, params = []) { return sdb.prepare(sql).get(...params) || null; },
    async run(sql, params = []) {
      const r = sdb.prepare(sql).run(...params);
      return { changes: r.changes, lastId: Number(r.lastInsertRowid) };
    },
    async exec(sql) { sdb.exec(sql); },
    async tx(fn) {
      const ctx = {
        all: impl.all, get: impl.get, run: impl.run
      };
      /* better-sqlite3 的事务要求同步函数，这里用 IMMEDIATE 手动包一层 */
      sdb.exec('BEGIN IMMEDIATE');
      try {
        const out = await fn(ctx);
        sdb.exec('COMMIT');
        return out;
      } catch (e) {
        try { sdb.exec('ROLLBACK'); } catch { /* ignore */ }
        throw e;
      }
    }
  };
}

/* ---------------- 建表 ---------------- */
const DDL = impl.dialect === 'postgres'
  ? `
CREATE TABLE IF NOT EXISTS guide(
  id            SERIAL PRIMARY KEY,
  ext_id        TEXT UNIQUE,
  title         TEXT NOT NULL,
  content       TEXT,
  city          TEXT,
  cover         TEXT,
  source        TEXT,
  source_url    TEXT,
  type          TEXT,
  like_count    INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at    TEXT
);
CREATE TABLE IF NOT EXISTS checkin(
  id         SERIAL PRIMARY KEY,
  "user"     TEXT,
  city       TEXT,
  spot       TEXT,
  text       TEXT,
  mood       TEXT,
  cost       DOUBLE PRECISION DEFAULT 0,
  cover      TEXT,
  source     TEXT DEFAULT 'web',
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS entity(
  id         SERIAL PRIMARY KEY,
  guide_id   INTEGER,
  city       TEXT,
  type       TEXT,
  name       TEXT,
  mention    INTEGER DEFAULT 1,
  engine     TEXT,
  created_at TEXT,
  UNIQUE(guide_id, type, name)
);
CREATE TABLE IF NOT EXISTS app_user(
  id         SERIAL PRIMARY KEY,
  username   TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  nick       TEXT,
  city       TEXT,
  role       TEXT DEFAULT 'user',
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS scenic_spot(
  id        SERIAL PRIMARY KEY,
  spot_key  TEXT UNIQUE,
  name      TEXT NOT NULL,
  city      TEXT,
  province  TEXT,
  lng       DOUBLE PRECISION,
  lat       DOUBLE PRECISION,
  rating    DOUBLE PRECISION DEFAULT 0,
  heat      INTEGER DEFAULT 0,
  price     TEXT,
  tags      TEXT,
  cover     TEXT,
  intro     TEXT,
  poi_type  TEXT DEFAULT '景区',
  source    TEXT
);
CREATE TABLE IF NOT EXISTS rating_record(
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  spot_key   TEXT NOT NULL,
  score      DOUBLE PRECISION NOT NULL,
  created_at TEXT,
  UNIQUE(user_id, spot_key)
);
CREATE TABLE IF NOT EXISTS favorite_record(
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  spot_key   TEXT NOT NULL,
  created_at TEXT,
  UNIQUE(user_id, spot_key)
);
CREATE TABLE IF NOT EXISTS comment(
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER,
  spot_key   TEXT,
  content    TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS user_behavior(
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  spot_key   TEXT NOT NULL,
  action     TEXT NOT NULL,
  weight     DOUBLE PRECISION DEFAULT 1,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_guide_city  ON guide(city);
CREATE INDEX IF NOT EXISTS idx_check_city  ON checkin(city);
CREATE INDEX IF NOT EXISTS idx_entity_name ON entity(name);
CREATE INDEX IF NOT EXISTS idx_rating_user ON rating_record(user_id);
CREATE INDEX IF NOT EXISTS idx_rating_spot ON rating_record(spot_key);
CREATE INDEX IF NOT EXISTS idx_fav_user    ON favorite_record(user_id);
CREATE INDEX IF NOT EXISTS idx_behav_user  ON user_behavior(user_id);
CREATE INDEX IF NOT EXISTS idx_spot_key    ON scenic_spot(spot_key);
`
  : `
CREATE TABLE IF NOT EXISTS guide(
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ext_id        TEXT UNIQUE,
  title         TEXT NOT NULL,
  content       TEXT,
  city          TEXT,
  cover         TEXT,
  source        TEXT,
  source_url    TEXT,
  type          TEXT,
  like_count    INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at    TEXT
);
CREATE TABLE IF NOT EXISTS checkin(
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user       TEXT,
  city       TEXT,
  spot       TEXT,
  text       TEXT,
  mood       TEXT,
  cost       REAL DEFAULT 0,
  cover      TEXT,
  source     TEXT DEFAULT 'web',
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS entity(
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  guide_id   INTEGER,
  city       TEXT,
  type       TEXT,
  name       TEXT,
  mention    INTEGER DEFAULT 1,
  engine     TEXT,
  created_at TEXT,
  UNIQUE(guide_id, type, name)
);
CREATE TABLE IF NOT EXISTS app_user(
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  nick       TEXT,
  city       TEXT,
  role       TEXT DEFAULT 'user',
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS scenic_spot(
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  spot_key  TEXT UNIQUE,
  name      TEXT NOT NULL,
  city      TEXT,
  province  TEXT,
  lng       REAL,
  lat       REAL,
  rating    REAL DEFAULT 0,
  heat      INTEGER DEFAULT 0,
  price     TEXT,
  tags      TEXT,
  cover     TEXT,
  intro     TEXT,
  poi_type  TEXT DEFAULT '景区',
  source    TEXT
);
CREATE TABLE IF NOT EXISTS rating_record(
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  spot_key   TEXT NOT NULL,
  score      REAL NOT NULL,
  created_at TEXT,
  UNIQUE(user_id, spot_key)
);
CREATE TABLE IF NOT EXISTS favorite_record(
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  spot_key   TEXT NOT NULL,
  created_at TEXT,
  UNIQUE(user_id, spot_key)
);
CREATE TABLE IF NOT EXISTS comment(
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER,
  spot_key   TEXT,
  content    TEXT,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS user_behavior(
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  spot_key   TEXT NOT NULL,
  action     TEXT NOT NULL,
  weight     REAL DEFAULT 1,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_guide_city  ON guide(city);
CREATE INDEX IF NOT EXISTS idx_check_city  ON checkin(city);
CREATE INDEX IF NOT EXISTS idx_entity_name ON entity(name);
CREATE INDEX IF NOT EXISTS idx_rating_user ON rating_record(user_id);
CREATE INDEX IF NOT EXISTS idx_rating_spot ON rating_record(spot_key);
CREATE INDEX IF NOT EXISTS idx_fav_user    ON favorite_record(user_id);
CREATE INDEX IF NOT EXISTS idx_behav_user  ON user_behavior(user_id);
CREATE INDEX IF NOT EXISTS idx_spot_key    ON scenic_spot(spot_key);
`;

/* ---------------- 种子数据 ---------------- */
const readJson = p => {
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return null; }
};

/* 插入攻略：SQLite 用 INSERT OR IGNORE，Postgres 用 ON CONFLICT DO NOTHING */
const GUIDE_COLS = '(ext_id,title,content,city,cover,source,source_url,type,like_count,comment_count,created_at)';
const guideInsertSql = () => (impl.dialect === 'postgres'
  ? `INSERT INTO guide ${GUIDE_COLS} VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING`
  : `INSERT OR IGNORE INTO guide ${GUIDE_COLS} VALUES (?,?,?,?,?,?,?,?,?,?,?)`);

const ENTITY_COLS = '(guide_id,city,type,name,mention,engine,created_at)';
const entityInsertSql = () => (impl.dialect === 'postgres'
  ? `INSERT INTO entity ${ENTITY_COLS} VALUES (?,?,?,?,?,?,?) ON CONFLICT DO NOTHING`
  : `INSERT OR IGNORE INTO entity ${ENTITY_COLS} VALUES (?,?,?,?,?,?,?)`);

const CHECKIN_COLS = `(${impl.dialect === 'postgres' ? '"user"' : 'user'},city,spot,text,mood,cost,cover,source,created_at)`;
const SPOTS = readJson(path.join(ROOT, 'js', 'spots_crawl.json')) || [];
const CRAWL = readJson(path.join(ROOT, 'js', 'posts_crawl.json')) || { posts: [] };

/* 再读一次 data.js 的精编景点，补全「景点名 → 城市」别名与打卡种子。
 * 必须解析坐标：plan.js 的 poolOfCity 会过滤掉没有 lng 的条目，
 * 之前只取 id/n/city/tag/desc，导致东京、京都这些海外精编景点全部被丢弃 */
const DATA_SPOTS = (() => {
  try {
    const txt = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf-8');
    /* 先按「景点对象开头」切块，再在块内分别取坐标，避免坐标缺失的条目把整条正则卡死 */
    const re = /\{id:'([^']+)',n:'([^']+)',city:'([^']+)'([^\n]*)/g;
    const out = [];
    let m;
    while ((m = re.exec(txt)) !== null) {
      const line = m[4] || '';
      const grab = key => {
        const r = new RegExp(`,${key}:('([^']*)'|(-?[\\d.]+))`).exec(line);
        return r ? (r[2] != null ? r[2] : r[3]) : '';
      };
      const lng = Number(grab('lng'));
      const lat = Number(grab('lat'));
      out.push({
        spot_id: m[1],
        name: m[2],
        city: m[3].split('·')[0].trim(),
        lng: Number.isFinite(lng) && lng !== 0 ? lng : null,
        lat: Number.isFinite(lat) && lat !== 0 ? lat : null,
        address: grab('addr'),
        hours: grab('hrs'),
        price: grab('price'),
        traffic: grab('traf'),
        rating: Number(grab('rating')) || 0,
        region: grab('rg') || 'cn',
        tags: grab('tag'),
        desc: grab('desc'),
        geo_src: 'manual',
        src: 'data.js 精编'
      });
    }
    return out;
  } catch { return []; }
})();
/* 两个库合并去重：spots_crawl.json 与 data.js 收录了大量同一景点，
 * 「武侯祠 / 武侯祠·锦里」「成都大熊猫繁育研究基地 / 成都大熊猫繁育基地」
 * 这种名称互相包含的，保留 crawl 版（有评分 / 热度 / 人工坐标），
 * 否则同一天会出现两个几乎一样的景点 */
const sameSpot = (a, b) => a === b ||
  (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a)));
const ALL_SPOTS = [
  ...SPOTS,
  ...DATA_SPOTS.filter(d => !SPOTS.some(s => s.city === d.city && sameSpot(s.name, d.name)))
];
const CITY_NAMES = [...new Set(ALL_SPOTS.map(s => s.city).filter(Boolean))];
const SPOT_NAMES = ALL_SPOTS.map(s => s.name).filter(Boolean);

/* 名称 → 城市 的别名表（景点名 / 城市名 / 省份名） */
const ALIAS = new Map();
ALL_SPOTS.forEach(s => {
  if (s.name) ALIAS.set(s.name, s.city);
  if (s.city) ALIAS.set(s.city, s.city);
  if (s.province) ALIAS.set(s.province, s.city);
});
/* 常见的城市 + 景区简称补充，提升按城市名搜索的命中率 */
Object.entries({
  大理: ['大理', '洱海', '双廊', '喜洲', '苍山'],
  丽江: ['丽江', '玉龙雪山', '束河', '泸沽湖'],
  三亚: ['三亚', '亚龙湾', '海棠湾'],
  厦门: ['厦门', '鼓浪屿', '曾厝垵'],
  成都: ['成都', '宽窄巷子', '锦里', '太古里'],
  重庆: ['重庆', '洪崖洞', '解放碑'],
  西安: ['西安', '兵马俑', '回民街'],
  杭州: ['杭州', '西湖', '灵隐'],
  苏州: ['苏州', '平江路', '山塘街'],
  北京: ['北京', '故宫', '长城', '南锣鼓巷'],
  上海: ['上海', '外滩', '武康路'],
  桂林: ['桂林', '阳朔', '遇龙河'],
  张家界: ['张家界', '武陵源'],
  哈尔滨: ['哈尔滨', '中央大街'],
  拉萨: ['拉萨', '布达拉宫'],
  敦煌: ['敦煌', '莫高窟'],
  清迈: ['清迈', '契迪龙寺'],
  京都: ['京都', '伏见稻荷'],
  东京: ['东京', '浅草寺']
}).forEach(([city, names]) => names.forEach(n => ALIAS.set(n, city)));
const ALIAS_KEYS = [...ALIAS.keys()].sort((a, b) => b.length - a.length);

/* 检索扩展词：查询词 / 别名全称 / 别名去掉「市、县、区、山」等尾字。
   短词（≤2 字）不参与，长词额外派生短核心词，避免「大表姐西藏旅行」因含「大」被「大理」命中。 */
const fullWordOf = w => ({ 大理: '大理古城', 丽江: '丽江古城' }[w] || w);
function expandTerms(kw) {
  const terms = new Set();
  const add = t => {
    if (!t || t.length < 2) return;
    terms.add(t);
    for (const suffix of ['古城', '雪山', '景区', '风景区', '古镇', '山', '湖', '市', '县', '区']) {
      if (t.length - suffix.length >= 2 && t.endsWith(suffix)) {
        terms.add(t.slice(0, -suffix.length));
        break;
      }
    }
  };
  add(kw);
  const city = ALIAS.get(kw);
  if (city) {
    add(city);
    ALIAS_KEYS.forEach(alias => { if (ALIAS.get(alias) === city) add(fullWordOf(alias)); });
  }
  return [...terms];
}

function guessCity(text, locHint) {
  /* 地址字段（如「B站 · 西藏」）优先于正文判定，避免正文里的「大表姐」被当成「大理」 */
  const loc = String(locHint || '');
  if (loc) {
    const hit = ALIAS_KEYS.find(k => loc.includes(k));
    if (hit) return ALIAS.get(hit);
    const parts = loc.split(/·|\||-|\/|\s+/).map(s => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  const body = `${text || ''} ${locHint || ''}`;
  for (const k of ALIAS_KEYS) {
    if (body.includes(k)) return ALIAS.get(k);
  }
  return null;
}

const now = () => {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

/* 景点入库：把 ALL_SPOTS 同步进 scenic_spot，作为推荐算法的物品全集 */
async function seedSpots() {
  const cnt = await impl.get('SELECT COUNT(*) AS c FROM scenic_spot');
  if (Number(cnt.c) > 0) return Number(cnt.c);
  const sql = impl.dialect === 'postgres'
    ? `INSERT INTO scenic_spot (spot_key,name,city,province,lng,lat,rating,heat,price,tags,cover,intro,poi_type,source)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING`
    : `INSERT OR IGNORE INTO scenic_spot (spot_key,name,city,province,lng,lat,rating,heat,price,tags,cover,intro,poi_type,source)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
  let n = 0;
  for (const s of ALL_SPOTS) {
    if (!s.name || !s.city) continue;
    const r = await impl.run(sql, [
      String(s.spot_id || s.name), s.name, s.city, s.province || '',
      Number.isFinite(Number(s.lng)) ? Number(s.lng) : null,
      Number.isFinite(Number(s.lat)) ? Number(s.lat) : null,
      Number(s.rating) || 0, Number(s.heat) || 0,
      String(s.price == null ? '' : s.price), String(s.tags || s.cat || ''),
      s.img || s.cover || '', String(s.desc || '').slice(0, 500),
      classifyPoi(s.tags || s.cat, '景区'), 'seed'
    ]);
    n += r.changes;
  }
  return n;
}

/* ---------------- 地点分类（P0-2） ----------------
 * poi_type：景区 / 美食 / 打卡点 / 购物 —— 冷门城市兜底时按类型均衡挑选
 * source  ：数据来源（data.js 精编 / amap 高德 / 站内爬库），便于排查与去重
 * --------------------------------------------------- */
const POI_TYPES = ['景区', '美食', '打卡点', '购物'];

/* 高德 POI 的 type 字符串 → 四分类。
 * 顺序很重要：高德景区标签里常带「名胜」「旅游景点」，这里先认景区，
 * 否则「柯岩风景区（风景名胜;风景名胜;国家级景点）」会被误判成打卡点 */
function classifyPoi(amapType, fallback) {
  const t = String(amapType || '');
  if (/风景名胜|国家级景点|旅游景点|公园|景区|园林|寺|庙|教堂|古迹|遗址|古镇|博物馆|美术馆|展览|纪念馆/.test(t)) return '景区';
  if (/餐饮|美食|小吃|夜市|茶艺|咖啡|甜品|酒吧|餐厅|快餐厅/.test(t)) return '美食';
  if (/购物|商场|超市|商业街|步行街|专卖|市场|奥特莱斯|免税/.test(t)) return '购物';
  if (/地标|观景|游乐|休闲|体育|摄影|文化|科教|艺术|广场|绿地/.test(t)) return '打卡点';
  return POI_TYPES.includes(fallback) ? fallback : '打卡点';
}

/* 老库补列：Postgres 用 ADD COLUMN IF NOT EXISTS；SQLite 3.35+ 也支持，
 * 旧版本会抛错，此时按 PRAGMA 结果判断后再加，保证本地环境同样能升级 */
async function migrateSpotColumns() {
  if (impl.dialect === 'postgres') {
    await impl.exec("ALTER TABLE scenic_spot ADD COLUMN IF NOT EXISTS poi_type TEXT DEFAULT '景区'");
    await impl.exec('ALTER TABLE scenic_spot ADD COLUMN IF NOT EXISTS source TEXT');
    return;
  }
  const cols = await impl.all("PRAGMA table_info('scenic_spot')");
  const has = n => cols.some(c => c.name === n);
  if (!has('poi_type')) await impl.exec("ALTER TABLE scenic_spot ADD COLUMN poi_type TEXT DEFAULT '景区'");
  if (!has('source')) await impl.exec('ALTER TABLE scenic_spot ADD COLUMN source TEXT');
}

/* 老数据回填：迁移前入库的景点 source 为空、poi_type 可能为空，
 * 统一补成「站内精编」，否则前端按类型筛选时这些老景点会整批消失 */
async function backfillSpotColumns() {
  await impl.exec("UPDATE scenic_spot SET poi_type = '景区' WHERE poi_type IS NULL OR poi_type = ''");
  await impl.exec("UPDATE scenic_spot SET source = 'seed' WHERE source IS NULL OR source = ''");
}

/* 批量写入高德 POI（scripts/fetch-pois.js 与 /api/admin/spot/save 共用）。
 * 已有同名景点不覆盖人工数据，只补齐空着的分类 / 来源 */
async function upsertPois(city, list, source) {
  const sql = impl.dialect === 'postgres'
    ? `INSERT INTO scenic_spot (spot_key,name,city,province,lng,lat,rating,heat,price,tags,cover,intro,poi_type,source)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT (spot_key) DO UPDATE SET poi_type = EXCLUDED.poi_type, source = EXCLUDED.source`
    : `INSERT INTO scenic_spot (spot_key,name,city,province,lng,lat,rating,heat,price,tags,cover,intro,poi_type,source)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(spot_key) DO UPDATE SET poi_type = excluded.poi_type, source = excluded.source`;
  let n = 0;
  for (const p of list || []) {
    if (!p || !p.name) continue;
    const key = String(p.spot_key || p.id || `${city}|${p.name}`);
    await impl.run(sql, [
      key, p.name, city, p.province || '', p.lng == null ? null : Number(p.lng),
      p.lat == null ? null : Number(p.lat), Number(p.rating) || 0, Number(p.heat) || 0,
      String(p.price == null ? '' : p.price), String(p.tags || ''),
      p.cover || '', String(p.intro || p.desc || '').slice(0, 500),
      classifyPoi(p.amap_type || p.type, p.poi_type), source || p.source || 'amap'
    ]);
    n++;
  }
  return n;
}

/* 城市级分类统计：GET /api/spot/index 用它给前端「冷门城市仍有打卡点」做证明 */
async function spotTypesByCity() {
  const rows = await impl.all(
    `SELECT city, poi_type, COUNT(*) AS c FROM scenic_spot
     WHERE city IS NOT NULL AND city <> '' GROUP BY city, poi_type ORDER BY city`
  );
  const out = {};
  rows.forEach(r => {
    const t = r.poi_type || '景区';
    out[r.city] = out[r.city] || { total: 0 };
    out[r.city][t] = Number(r.c) || 0;
    out[r.city].total += Number(r.c) || 0;
  });
  return out;
}

async function seed() {
  await impl.exec(DDL);
  /* 老库补列：CREATE TABLE IF NOT EXISTS 不会给已存在的表加列，
   * 线上 Postgres 的 scenic_spot 建表早于 poi_type / source，必须显式迁移 */
  await migrateSpotColumns();
  await backfillSpotColumns();
  await seedSpots();

  const g = await impl.get('SELECT COUNT(*) AS c FROM guide');
  const guideCount = Number(g ? g.c : 0);
  if (guideCount > 0) return { seeded: false, guides: guideCount };

  const result = await impl.tx(async ctx => {
    /* 1) 爬虫攻略 → guide */
    let nGuide = 0;
    for (const p of (CRAWL.posts || [])) {
      const text = `${p.title || ''} ${p.content && p.content !== '-' ? p.content : ''}`;
      const r = await ctx.run(guideInsertSql(), [
        `crawl-${p.id}`, p.title || '旅行攻略',
        p.content && p.content !== '-' ? p.content : '',
        guessCity(text, p.location), p.cover || '', p.source || 'web',
        p.sourceUrl || p.videoUrl || '', p.type || 'note',
        p.likeCount || 0, p.commentCount || 0, p.createdAt || now()
      ]);
      nGuide += r.changes;
    }

    /* 2) 景点 → 演示打卡记录（每个城市取 1~2 条，保证按城市搜索有内容） */
    const seen = new Map();
    let idx = 0;
    for (const s of ALL_SPOTS) {
      const cnt = seen.get(s.city) || 0;
      if (cnt >= 2 || !s.city) continue;
      seen.set(s.city, cnt + 1);
      const price = parseFloat(String(s.price).replace(/[^\d.]/g, '')) || (20 + idx * 3);
      await ctx.run(
        `INSERT INTO checkin ${CHECKIN_COLS} VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          '旅行者小W', s.city, s.name,
          s.desc || `${s.name}打卡完成，值得一来。`,
          ['😌 治愈放松', '🤩 惊喜满满', '🚶 慢慢逛'][idx % 3],
          price, s.img || '', 'seed',
          new Date(Date.now() - idx * 36e5).toISOString().slice(0, 19).replace('T', ' ')
        ]
      );
      idx++;
    }

    /* 3) 对存量攻略跑一次本地实体抽取，作为 AI 结果的基线 */
    const guides = await ctx.all('SELECT id,title,content,city FROM guide');
    const sqlEntity = entityInsertSql();
    for (const gd of guides) {
      const r = localExtract(`${gd.title} ${gd.content || ''}`, {
        city: gd.city, spotNames: SPOT_NAMES, cityNames: CITY_NAMES
      });
      const pairs = [['place', r.places], ['food', r.foods], ['district', r.districts]];
      for (const [type, arr] of pairs) {
        for (const e of arr) {
          await ctx.run(sqlEntity, [gd.id, gd.city, type, e.name, e.mention, 'local', now()]);
        }
      }
    }
    return { nGuide };
  });

  const st = await stats();
  return { seeded: true, guides: st.guides, checkins: st.checkins, entities: st.entities, inserted: result.nGuide };
}

/* ---------------- 查询/写入方法 ---------------- */
async function stats() {
  const g = await impl.get('SELECT COUNT(*) AS c FROM guide');
  const c = await impl.get('SELECT COUNT(*) AS c FROM checkin');
  const e = await impl.get('SELECT COUNT(*) AS c FROM entity');
  const ci = await impl.get('SELECT COUNT(DISTINCT city) AS c FROM guide WHERE city IS NOT NULL');
  return {
    guides: Number(g.c), checkins: Number(c.c),
    entities: Number(e.c), cities: Number(ci.c)
  };
}

/* 多个检索词走「城市优先 + 正文长词」的分层匹配，不再对全字段做 %q% 模糊，
   避免搜索「大理」时把标题含「大」字的西藏帖子带出来。 */
async function searchGuides(q, limit = 60) {
  if (!q) {
    return impl.all('SELECT * FROM guide ORDER BY created_at DESC LIMIT ?', [limit]);
  }
  const terms = expandTerms(q);
  const cityWhere = terms.map(() => 'g.city LIKE ?').join(' OR ');
  const bodyWhere = terms.filter(t => t.length >= 2).map(() => 'g.title LIKE ? OR g.content LIKE ?').join(' OR ');
  const params = [...terms.map(t => `%${t}%`), ...terms.filter(t => t.length >= 2).flatMap(t => [`%${t}%`, `%${t}%`])];
  /* ORDER BY 的 CASE 表达式必须出现在 SELECT 列表中（Postgres DISTINCT 限制），
     因此拆成子查询再排序，兼容 SQLite 与 PostgreSQL */
  return impl.all(`
    SELECT * FROM (
      SELECT g.*, (CASE WHEN ${cityWhere} THEN 1 ELSE 0 END) AS _hit
      FROM guide g
      WHERE ${cityWhere} OR ${bodyWhere}
    ) t
    ORDER BY _hit DESC, created_at DESC
    LIMIT ?`, [...params, ...terms.map(t => `%${t}%`), limit]);
}

async function searchCheckins(q, limit = 40) {
  if (!q) return impl.all('SELECT * FROM checkin ORDER BY created_at DESC LIMIT ?', [limit]);
  const terms = expandTerms(q);
  const cityWhere = terms.map(() => 'city LIKE ?').join(' OR ');
  const bodyWhere = terms.filter(t => t.length >= 2).map(() => 'spot LIKE ? OR text LIKE ?').join(' OR ');
  const params = [...terms.map(t => `%${t}%`), ...terms.filter(t => t.length >= 2).flatMap(t => [`%${t}%`, `%${t}%`])];
  return impl.all(`SELECT * FROM (
      SELECT c.*, (CASE WHEN ${cityWhere} THEN 1 ELSE 0 END) AS _hit
      FROM checkin c
      WHERE ${cityWhere} OR ${bodyWhere}
    ) t
    ORDER BY _hit DESC, created_at DESC
    LIMIT ?`, [...params, ...terms.map(t => `%${t}%`), limit]);
}

async function searchEntities(q, limit = 30) {
  if (!q) {
    return impl.all(`SELECT type,name,MAX(city) AS city,SUM(mention) AS mention FROM entity
      GROUP BY type,name ORDER BY mention DESC LIMIT ?`, [limit]);
  }
  const terms = expandTerms(q);
  const cityWhere = terms.map(() => 'city LIKE ?').join(' OR ');
  const nameWhere = terms.map(() => 'name LIKE ?').join(' OR ');
  const params = [...terms.map(t => `%${t}%`), ...terms.map(t => `%${t}%`)];
  return impl.all(`SELECT type,name,MAX(city) AS city,SUM(mention) AS mention FROM (
      SELECT e.*, (CASE WHEN ${cityWhere} THEN 1 ELSE 0 END) AS _hit
      FROM entity e
      WHERE ${cityWhere} OR ${nameWhere}
    ) t
    GROUP BY type,name
    ORDER BY MAX(_hit) DESC, mention DESC
    LIMIT ?`, [...params, ...terms.map(t => `%${t}%`), limit]);
}

async function addCheckin(d) {
  const u = impl.dialect === 'postgres' ? '"user",' : 'user,';
  const r = await impl.run(
    `INSERT INTO checkin (${u}city,spot,text,mood,cost,cover,source,created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      d.user || '匿名旅行者', d.city || '', d.spot || '', d.text || '',
      d.mood || '😌 治愈放松', Number(d.cost) || 0, d.cover || '', d.source || 'web', now()
    ]
  );
  return impl.get('SELECT * FROM checkin WHERE id = ?', [r.lastId]);
}

/* 攻略入库（返回是否新增，用于采集去重统计） */
async function addGuide(g) {
  const ext = g.ext_id || (g.source_url ? `${g.source}-${g.source_url}` : null);
  const cols = `(ext_id,title,content,city,cover,source,source_url,type,like_count,comment_count,created_at)`;
  const vals = [
    ext, g.title, g.content || '', g.city || null, g.cover || '', g.source || 'web',
    g.source_url || '', g.type || 'guide', g.like_count || 0, g.comment_count || 0, g.created_at || now()
  ];

  const info = impl.dialect === 'postgres'
    ? await impl.run(`INSERT INTO guide ${cols} VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING`, vals)
    : await impl.run(`INSERT OR IGNORE INTO guide ${cols} VALUES (?,?,?,?,?,?,?,?,?,?,?)`, vals);

  if (info.changes === 0) {
    const row = ext ? await impl.get('SELECT * FROM guide WHERE ext_id = ?', [ext]) : null;
    return { created: false, row };
  }
  return { created: true, row: await impl.get('SELECT * FROM guide WHERE id = ?', [info.lastId]) };
}

/* 写入实体（同一篇攻略同类型同名去重） */
async function addEntities(guideId, city, entities, engine) {
  let n = 0;
  const groups = [['place', entities.places], ['food', entities.foods], ['district', entities.districts]];
  for (const [type, arr] of groups) {
    for (const e of (arr || [])) {
      const r = impl.dialect === 'postgres'
        ? await impl.run(
          `INSERT INTO entity (guide_id,city,type,name,mention,engine,created_at)
           VALUES (?,?,?,?,?,?,?) ON CONFLICT DO NOTHING`,
          [guideId, city || null, type, e.name, e.mention || 1, engine || 'local', now()]
        )
        : await impl.run(
          `INSERT OR IGNORE INTO entity (guide_id,city,type,name,mention,engine,created_at)
           VALUES (?,?,?,?,?,?,?)`,
          [guideId, city || null, type, e.name, e.mention || 1, engine || 'local', now()]
        );
      n += r.changes;
    }
  }
  return n;
}

/* 采集时从原始爬虫包里捞取候选（相当于"采集"这一步的离线数据源）；
   用 expandTerms 过滤掉单字词，防止「大理」命中标题含「大」字的无关内容。 */
function crawlCandidates(keyword, limit = 8) {
  const kw = String(keyword || '').trim();
  if (!kw) return [];
  const terms = expandTerms(kw);

  return (CRAWL.posts || []).filter(p => {
    const body = `${p.title || ''} ${p.content || ''} ${p.location || ''} ${p.topics || ''}`;
    return terms.some(term => body.includes(term));
  }).slice(0, limit);
}

/* ---------------- 用户 / 评分 / 收藏 / 行为（推荐模块数据） ---------------- */

/* 密码散列：等同论文 4.5 的 MD5(SHA1(pwd))，不引入新依赖 */
function hashPwd(pwd) {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(crypto.createHash('sha1').update(String(pwd)).digest('hex')).digest('hex');
}

async function findUser(username) {
  return impl.get('SELECT * FROM app_user WHERE username = ?', [String(username || '')]);
}

async function findUserById(id) {
  return impl.get('SELECT * FROM app_user WHERE id = ?', [Number(id)]);
}

/* 注册：用户名已存在则直接返回该用户（前端幂等） */
async function createUser(username, password, nick, city) {
  const name = String(username || '').trim();
  if (!name) throw new Error('用户名不能为空');
  const old = await findUser(name);
  if (old) return { created: false, user: old };
  const info = await impl.run(
    'INSERT INTO app_user (username,password,nick,city,role,created_at) VALUES (?,?,?,?,?,?)',
    [name, hashPwd(password), nick || name, city || '', 'user', now()]
  );
  return { created: true, user: await findUserById(info.lastId) };
}

/* 登录：校验密码，返回用户或 null */
async function verifyUser(username, password) {
  const u = await findUser(username);
  if (!u || u.password !== hashPwd(password)) return null;
  return u;
}

/* 评分写入：同一用户同一景点覆盖（UNIQUE 约束），并同步一条加权行为 */
async function addRating(userId, spotKey, score) {
  const s = Math.max(1, Math.min(5, Number(score) || 0));
  const sql = impl.dialect === 'postgres'
    ? `INSERT INTO rating_record (user_id,spot_key,score,created_at) VALUES (?,?,?,?)
       ON CONFLICT (user_id,spot_key) DO UPDATE SET score = EXCLUDED.score, created_at = EXCLUDED.created_at`
    : `INSERT INTO rating_record (user_id,spot_key,score,created_at) VALUES (?,?,?,?)
       ON CONFLICT(user_id,spot_key) DO UPDATE SET score = excluded.score, created_at = excluded.created_at`;
  await impl.run(sql, [userId, spotKey, s, now()]);
  await logBehavior(userId, spotKey, 'rating', s);
  return { ok: true, score: s };
}

/* 收藏切换：存在则删，不存在则加 */
async function toggleFavorite(userId, spotKey) {
  const old = await impl.get('SELECT id FROM favorite_record WHERE user_id = ? AND spot_key = ?', [userId, spotKey]);
  if (old) {
    await impl.run('DELETE FROM favorite_record WHERE id = ?', [old.id]);
    return { ok: true, on: false };
  }
  await impl.run('INSERT INTO favorite_record (user_id,spot_key,created_at) VALUES (?,?,?)', [userId, spotKey, now()]);
  await logBehavior(userId, spotKey, 'favorite', 3);
  return { ok: true, on: true };
}

/* 行为流水：供推荐算法按权重构建偏好矩阵 */
async function logBehavior(userId, spotKey, action, weight) {
  await impl.run(
    'INSERT INTO user_behavior (user_id,spot_key,action,weight,created_at) VALUES (?,?,?,?,?)',
    [userId, spotKey, action, Number(weight) || 1, now()]
  );
}

/* 全量行为：推荐算法一次读入内存，避免 N+1 查询 */
async function allBehaviors() {
  return impl.all('SELECT user_id, spot_key, action, weight FROM user_behavior');
}

async function listSpots(limit = 500) {
  return impl.all('SELECT * FROM scenic_spot ORDER BY heat DESC, rating DESC LIMIT ?', [limit]);
}

async function getSpot(spotKey) {
  return impl.get('SELECT * FROM scenic_spot WHERE spot_key = ?', [spotKey]);
}

/* 同城 + 类型检索：冷门城市兜底时按 景区/美食/打卡点/购物 分池挑选，
 * 避免整条行程全是风景名胜、没有吃饭逛街的地方 */
async function listSpotsByType(city, poiType, limit = 30) {
  const order = 'heat DESC, rating DESC';
  if (city && poiType) {
    return impl.all(
      `SELECT * FROM scenic_spot WHERE city = ? AND poi_type = ? ORDER BY ${order} LIMIT ?`,
      [city, poiType, limit]
    );
  }
  if (city) {
    return impl.all(`SELECT * FROM scenic_spot WHERE city = ? ORDER BY ${order} LIMIT ?`, [city, limit]);
  }
  return impl.all(`SELECT * FROM scenic_spot ORDER BY ${order} LIMIT ?`, [limit]);
}

/* 热门榜：按热度 / 评分排序，用于冷启动兜底与排行榜 */
async function rankSpots(scope, city, limit = 20) {
  const order = scope === 'rating' ? 'rating DESC, heat DESC' : 'heat DESC, rating DESC';
  if (city) {
    return impl.all(`SELECT * FROM scenic_spot WHERE city = ? ORDER BY ${order} LIMIT ?`, [city, limit]);
  }
  return impl.all(`SELECT * FROM scenic_spot ORDER BY ${order} LIMIT ?`, [limit]);
}

module.exports = {
  dialect: impl.dialect,
  raw: impl.raw,
  all: impl.all, get: impl.get, run: impl.run,
  seed, stats, searchGuides, searchCheckins, searchEntities,
  addCheckin, addGuide, addEntities, crawlCandidates,
  hashPwd, findUser, findUserById, createUser, verifyUser,
  addRating, toggleFavorite, logBehavior, allBehaviors,
  listSpots, getSpot, rankSpots, seedSpots, listSpotsByType,
  upsertPois, spotTypesByCity, classifyPoi, POI_TYPES, migrateSpotColumns, backfillSpotColumns,
  SPOTS: ALL_SPOTS, DATA_SPOTS, CITY_NAMES, SPOT_NAMES, guessCity, now,
  cityOf: term => ALIAS.get(String(term || '').trim()) || null
};
