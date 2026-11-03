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
CREATE TABLE IF NOT EXISTS post(
  id            SERIAL PRIMARY KEY,
  post_key      TEXT UNIQUE,
  title         TEXT,
  content       TEXT,
  cover         TEXT,
  images        TEXT,
  location      TEXT,
  topics        TEXT,
  type          TEXT DEFAULT 'plog',
  client        TEXT DEFAULT 'go',
  bgm           TEXT,
  nick          TEXT,
  avatar        TEXT,
  user_id       INTEGER,
  source        TEXT,
  source_url    TEXT,
  video_url     TEXT,
  video_src     TEXT,
  spot_key      TEXT,
  like_count    INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at    TEXT
);
CREATE TABLE IF NOT EXISTS app_comment(
  id         SERIAL PRIMARY KEY,
  post_key   TEXT NOT NULL,
  nick       TEXT,
  content    TEXT NOT NULL,
  created_at TEXT
);
/* 点赞记录表：靠唯一约束保证「同一用户对同一帖子只能点一次」 */
CREATE TABLE IF NOT EXISTS post_like(
  id         SERIAL PRIMARY KEY,
  post_key   TEXT NOT NULL,
  nick       TEXT NOT NULL,
  created_at TEXT,
  UNIQUE(post_key, nick)
);
CREATE INDEX IF NOT EXISTS idx_post_created ON post(id);
CREATE INDEX IF NOT EXISTS idx_cmt_post     ON app_comment(post_key);
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
CREATE TABLE IF NOT EXISTS post(
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  post_key      TEXT UNIQUE,
  title         TEXT,
  content       TEXT,
  cover         TEXT,
  images        TEXT,
  location      TEXT,
  topics        TEXT,
  type          TEXT DEFAULT 'plog',
  client        TEXT DEFAULT 'go',
  bgm           TEXT,
  nick          TEXT,
  avatar        TEXT,
  user_id       INTEGER,
  source        TEXT,
  source_url    TEXT,
  video_url     TEXT,
  video_src     TEXT,
  spot_key      TEXT,
  like_count    INTEGER DEFAULT 0,
  view_count    INTEGER DEFAULT 0,
  quality       DOUBLE PRECISION DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at    TEXT
);
CREATE TABLE IF NOT EXISTS app_comment(
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post_key   TEXT NOT NULL,
  nick       TEXT,
  content    TEXT NOT NULL,
  created_at TEXT
);
/* 点赞记录表：靠唯一约束保证「同一用户对同一帖子只能点一次」 */
CREATE TABLE IF NOT EXISTS post_like(
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post_key   TEXT NOT NULL,
  nick       TEXT NOT NULL,
  created_at TEXT,
  UNIQUE(post_key, nick)
);
CREATE INDEX IF NOT EXISTS idx_post_created ON post(id);
CREATE INDEX IF NOT EXISTS idx_cmt_post     ON app_comment(post_key);
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

/* 爬虫帖 → post 表。
 * 三个问题一并解决：
 *   1) 以前只写 guide 表、丢掉 nick 和 topics，这里完整保留；
 *   2) 以前 source/client 是错标的平台（B站链接标成 douyin/xhs/ins），这里按链接域名回填真实来源；
 *   3) 以前 guide 表有行就整体跳过，新抓的数据进不来；这里按 source_url 去重，每次启动都增量同步。 */
async function seedCrawlPosts() {
  const posts = (CRAWL.posts || []);
  if (!posts.length) return 0;
  const pick = (p, ...keys) => {
    for (const k of keys) if (p[k] != null && p[k] !== '') return p[k];
    return '';
  };
  /* 按 source_url 域名判定真实平台，覆盖数据里手抄错的标注 */
  const platOf = url => {
    const u = String(url || '');
    if (/bilibili\.com/i.test(u)) return 'bilibili';
    if (/douyin\.com/i.test(u)) return 'douyin';
    if (/xiaohongshu\.com|xhslink/i.test(u)) return 'xhs';
    if (/youtube\.com|youtu\.be/i.test(u)) return 'yt';
    if (/instagram\.com/i.test(u)) return 'ins';
    if (/kuaishou\.com/i.test(u)) return 'kuaishou';
    return '';
  };
  let n = 0;
  for (const p of posts) {
    const srcUrl = String(pick(p, 'sourceUrl', 'source_url') || '');
    const key = 'c#' + (srcUrl || pick(p, 'id') || Math.random().toString(36).slice(2));
    const title = String(pick(p, 'title') || '').trim();
    if (!title) continue;
    const plat = platOf(srcUrl) || platOf(pick(p, 'videoUrl', 'video_url'))
      || (pick(p, 'source') === 'user' ? 'go' : String(pick(p, 'source') || 'bilibili'));
    const vals = [
      title, String(pick(p, 'content') || '') === '-' ? '' : String(pick(p, 'content') || ''),
      pick(p, 'cover'), JSON.stringify(p.images || (p.cover ? [p.cover] : [])),
      pick(p, 'location'), pick(p, 'topics'), pick(p, 'type') || 'plog',
      plat, pick(p, 'bgm'), pick(p, 'nick') || '旅行者',
      String(pick(p, 'nick') || 'B').slice(0, 1),
      plat === 'go' ? 'user' : 'crawl', srcUrl,
      pick(p, 'videoUrl', 'video_url'), '',
      pick(p, 'spotId', 'spot_key'),
      Number(pick(p, 'likeCount', 'likes')) || 0,
      Number(pick(p, 'viewCount', 'views')) || 0,
      Number(pick(p, 'quality')) || 0,
      Number(pick(p, 'commentCount')) || 0,
      String(pick(p, 'createdAt', 'created_at') || now())
    ];
    const exist = await impl.get('SELECT id FROM post WHERE post_key = ?', [key]);
    if (exist) {
      await impl.run(
        `UPDATE post SET title=?,content=?,cover=?,images=?,location=?,topics=?,type=?,client=?,bgm=?,
           nick=?,avatar=?,source=?,source_url=?,video_url=?,video_src=?,spot_key=?,
           like_count=?,view_count=?,quality=?,comment_count=?,created_at=? WHERE post_key=?`,
        [...vals, key]
      );
    } else {
      await impl.run(
        `INSERT INTO post (title,content,cover,images,location,topics,type,client,bgm,nick,avatar,
                           source,source_url,video_url,video_src,spot_key,like_count,view_count,quality,
                           comment_count,created_at,post_key)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [...vals, key]
      );
      n++;
    }
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
  /* 老库升级：post 表可能在建表语句里还没有 view_count / quality，补列不报错即可 */
  for (const [col, type] of [['view_count', 'INTEGER DEFAULT 0'], ['quality', 'DOUBLE PRECISION DEFAULT 0']]) {
    try {
      await impl.exec(`ALTER TABLE post ADD COLUMN ${col} ${type}`);
    } catch (e) { /* 列已存在 */ }
  }
  await seedSpots();
  /* 内置管理员账号：管理端接口需要 role='admin'，没有则补一个，已存在则不动 */
  try {
    const adm = await impl.get("SELECT id FROM app_user WHERE username = 'admin'");
    if (!adm) {
      await impl.run(
        'INSERT INTO app_user (username,password,nick,city,role,created_at) VALUES (?,?,?,?,?,?)',
        ['admin', hashPwd('admin123'), '管理员', '', 'admin', now()]
      );
    }
  } catch (e) { /* 表结构异常时忽略，不影响主流程 */ }
  /* 爬虫帖单独灌，且每次都跑：新抓的数据能立刻进来，不受 guide 表是否已初始化影响 */
  const nCrawl = await seedCrawlPosts();

  const g = await impl.get('SELECT COUNT(*) AS c FROM guide');
  const guideCount = Number(g ? g.c : 0);
  if (guideCount > 0) return { seeded: false, guides: guideCount, crawlPosts: nCrawl };

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

/* ---------------- 社区帖子 / 评论（社区攻略流） ---------------- */

/* 词条码 → 展示名 / 描述，与爬虫 community_crawler.py 的 build_topics 保持一致 */
const TOPIC_NAMES = {
  t1: '世界上幸福度最高的旅行地', t2: '樱花季限定 · 春日物语', t3: '海岛蜜月天花板',
  t4: '带娃看世界 · 亲子游', t5: '一人背包 · 穷游日记', t6: '舌尖上的旅行',
  citywalk: '城市漫步 Citywalk',
  'd-food': '美食探店', 'd-drive': '自驾公路', 'd-hike': '徒步登山', 'd-guide': '攻略干货',
  'd-film': '航拍影像', 'd-city': '城市漫游', 'd-vlog': '旅行 Vlog'
};
const TOPIC_DESC = {
  t1: '慢节奏、高治愈感的目的地', t2: '3-4 月樱花前线追花攻略', t3: '一岛一酒店、果冻色泻湖',
  t4: '遛娃友好度拉满的自然课堂', t5: '人均 3K 以内的深度路线', t6: '为一顿饭奔赴一座城',
  citywalk: '压马路、逛街区，用脚步丈量一座城',
  'd-food': '街头小吃、老字号与夜市吃播', 'd-drive': '公路片、环线与越野穿越',
  'd-hike': '雪山、露营与野外穿越', 'd-guide': '花费、路线、行程与避坑清单',
  'd-film': '航拍、延时与电影感短片', 'd-city': '压马路、逛街区、喝咖啡',
  'd-vlog': '真实记录的旅行 Vlog 日常'
};

/* 统一成前端 renderDbPostModal 需要的字段结构 */
function postRow(r) {
  if (!r) return null;
  let images = [];
  try { images = JSON.parse(r.images || '[]') || []; } catch { images = []; }
  return {
    id: r.post_key || ('p' + r.id),
    title: r.title || '', content: r.content || '',
    cover: r.cover || images[0] || '', images,
    location: r.location || '', topics: r.topics || '',
    type: r.type || 'plog', client: r.client || 'go',
    bgm: r.bgm || '', nick: r.nick || '旅行者', avatar: r.avatar || '',
    source: r.source || 'go', sourceUrl: r.source_url || '',
    videoUrl: r.video_url || '', videoSrc: r.video_src || '',
    spotId: r.spot_key || '',
    likeCount: Number(r.like_count) || 0, commentCount: Number(r.comment_count) || 0,
    viewCount: Number(r.view_count) || 0, quality: Number(r.quality) || 0,
    createdAt: r.created_at || ''
  };
}

/* 帖子列表：sort = top（优质优先，默认）/ hot / new，可按词条码筛选 */
async function listPosts(opts = {}) {
  const offset = Math.max(Number(opts.offset) || 0, 0);
  const limit = Math.min(Number(opts.limit) || 20, 300);
  const type = opts.type || '';
  const topic = opts.topic || '';
  const sort = opts.sort || 'top';
  /* 优质优先：爬虫质量分打底，再叠加本站真实互动，保证「次一些的往后放」 */
  const order = sort === 'new'
    ? 'id DESC'
    : sort === 'hot'
      ? '(like_count * 3 + comment_count * 5) DESC, id DESC'
      : '(COALESCE(quality,0) + like_count * 0.5 + comment_count * 1.5) DESC, id DESC';
  const conds = [];
  const params = [];
  if (type) { conds.push('type = ?'); params.push(type); }
  /* topics 是逗号分隔串，前后补逗号后按 ,码, 精确匹配，避免 t1 命中 t1x */
  if (topic) { conds.push("(',' || topics || ',') LIKE ?"); params.push(`%,${topic},%`); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const rows = await impl.all(
    `SELECT * FROM post ${where} ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, limit, offset]
  );
  const cnt = await impl.get(`SELECT COUNT(*) AS c FROM post ${where}`, params);
  return { total: Number(cnt ? cnt.c : 0), list: rows.map(postRow) };
}

/* 词条列表：按 post 表实际分桶统计，postCount / heat 都是真实值 */
async function listTopics() {
  const rows = await impl.all('SELECT topics FROM post WHERE topics IS NOT NULL AND topics <> \'\'');
  const tally = new Map();
  for (const r of rows) {
    for (const c of String(r.topics).split(',')) {
      if (c) tally.set(c, (tally.get(c) || 0) + 1);
    }
  }
  const list = [...tally.entries()].map(([code, count]) => ({
    code, name: TOPIC_NAMES[code] || code,
    description: TOPIC_DESC[code] || '',
    postCount: count,
    heat: Math.min(99, 60 + count * 2),
    source: code.startsWith('d-') ? 'crawl' : 'system'
  }));
  /* 运营主题优先展示，内容类型排在后面 */
  const rank = c => {
    const i = ['t1', 't2', 't3', 't4', 't5', 't6', 'citywalk'].indexOf(c);
    return i < 0 ? 100 : i;
  };
  return list.sort((a, b) => rank(a.code) - rank(b.code) || b.postCount - a.postCount);
}

/* 单帖详情（在线/离线一致）：id 依次匹配 post_key、数字主键、爬虫 ext_id
 *
 * 注意 id 的「前缀 + 自增主键」约定由 toItem() 生成：
 *   g{guide.id}   → 攻略（guide 表，ext_id 是 crawl-{原始爬虫id}，与自增 id 不同源）
 *   c{checkin.id} → 打卡（checkin 表）
 * 所以 g12 必须按 guide.id=12 查，不能简单拼成 crawl-12，否则全部 404。 */
async function getPost(id) {
  const key = String(id || '').trim();
  if (!key) return null;
  let row = await impl.get('SELECT * FROM post WHERE post_key = ?', [key]);
  if (!row && /^\d+$/.test(key)) row = await impl.get('SELECT * FROM post WHERE id = ?', [Number(key)]);
  if (row) return postRow(row);

  /* 前端卡片 id 形如 g1 / c63，拆出前缀与表内自增主键 */
  const m = key.match(/^([gc])(\d+)$/);
  if (m) {
    const numId = Number(m[2]);
    if (m[1] === 'g') {
      const g = await impl.get('SELECT * FROM guide WHERE id = ?', [numId]);
      if (g) return postRow(guideToPost(g, key));
    } else {
      const c = await impl.get('SELECT * FROM checkin WHERE id = ?', [numId]);
      if (c) return postRow(checkinToPost(c, key));
    }
  }

  /* 兼容旧链接：可能是纯数字主键或 crawl-xx 形式的 ext_id */
  const g = await impl.get('SELECT * FROM guide WHERE ext_id = ? OR ext_id = ?', [key, 'crawl-' + key]);
  if (!g) return null;
  return postRow(guideToPost(g, key));
}

/* guide 行 → post 结构。用固定前缀保证同一篇攻略的详情 id 与列表 id 一致 */
function guideToPost(g, id) {
  return {
    post_key: id || ('g' + g.id), title: g.title, content: g.content, cover: g.cover,
    images: '[]', location: g.city, topics: g.city, type: g.type || 'note',
    nick: g.source || '公开网络', source: g.source, source_url: g.source_url,
    video_url: (g.type === 'video' ? g.source_url : ''), like_count: g.like_count,
    comment_count: g.comment_count, created_at: g.created_at
  };
}

/* checkin 行 → post 结构。checkin 表只有基础字段，缺失的用默认值补齐 */
function checkinToPost(c, id) {
  return {
    post_key: id || ('c' + c.id),
    title: `${c.city || ''} · ${c.spot || '打卡记录'}`,
    content: c.text || '', cover: c.cover || '',
    images: '[]',
    location: c.city || '', topics: c.city || '', type: 'checkin',
    nick: c.user || '旅行者', source: 'checkin', source_url: '',
    video_url: '', like_count: 0,
    comment_count: 0, created_at: c.created_at || ''
  };
}

/* 发帖入库：post_key 若已存在则复用（前端重试不产生重复） */
async function addPost(p = {}) {
  const nick = p.nick || '旅行者';
  const createdAt = p.createdAt || now();
  const key = String(p.id || p.postKey || '').trim()
    || ('u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
  const old = await impl.get('SELECT * FROM post WHERE post_key = ?', [key]);
  if (old) return { created: false, post: postRow(old) };

  const images = JSON.stringify(p.images || (p.cover ? [p.cover] : []));
  const info = await impl.run(
    `INSERT INTO post (post_key,title,content,cover,images,location,topics,type,client,bgm,nick,avatar,
                       user_id,source,source_url,video_url,video_src,spot_key,like_count,comment_count,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      key, p.title || '', p.content || '', p.cover || (p.images && p.images[0]) || '', images,
      p.location || '', p.topics || '', p.type || 'plog', p.client || 'go', p.bgm || '',
      nick, p.avatar || '', p.userId || null, p.source || 'go', p.sourceUrl || '',
      p.videoUrl || '', p.videoSrc || '', p.spotId || '', Number(p.likeCount) || 0, 0, createdAt
    ]
  );
  return { created: true, post: postRow(await impl.get('SELECT * FROM post WHERE id = ?', [info.lastId])) };
}

async function listPostComments(postKey) {
  const rows = await impl.all(
    'SELECT * FROM app_comment WHERE post_key = ? ORDER BY id DESC LIMIT 200', [String(postKey)]
  );
  return rows.map(r => ({ nick: r.nick || '旅行者', content: r.content || '', createdAt: r.created_at || '' }));
}

async function addPostComment(postKey, nick, content) {
  const key = String(postKey || '').trim();
  const txt = String(content || '').trim();
  if (!key || !txt) throw new Error('评论内容不能为空');
  const r = await impl.run(
    'INSERT INTO app_comment (post_key,nick,content,created_at) VALUES (?,?,?,?)',
    [key, nick || '旅行者', txt.slice(0, 500), now()]
  );
  await impl.run('UPDATE post SET comment_count = comment_count + 1 WHERE post_key = ?', [key]);
  return { id: r.lastId };
}

/* 点赞开关：按「帖子 + 用户」去重，同一用户重复点赞不会重复累加。
 * 传了 nick（已登录用户）时做真正的 toggle：已点过则取消，没点过则累加；
 * 没传时（老调用方 / 游客）保留原来的直接 +1 行为，避免破坏现有调用。 */
async function addPostLike(postKey, nick) {
  const key = String(postKey || '').trim();
  const who = String(nick || '').trim();
  const cur = async () => {
    const row = await impl.get('SELECT like_count FROM post WHERE post_key = ?', [key]);
    return Number(row ? row.like_count : 0);
  };
  if (!who) {
    await impl.run('UPDATE post SET like_count = like_count + 1 WHERE post_key = ?', [key]);
    return { liked: true, likeCount: await cur() };
  }
  /* 已点过 → 取消点赞，计数减一（不会减到负数） */
  const hit = await impl.get('SELECT id FROM post_like WHERE post_key = ? AND nick = ?', [key, who]);
  if (hit) {
    await impl.run('DELETE FROM post_like WHERE post_key = ? AND nick = ?', [key, who]);
    await impl.run('UPDATE post SET like_count = CASE WHEN like_count > 0 THEN like_count - 1 ELSE 0 END WHERE post_key = ?', [key]);
    return { liked: false, likeCount: await cur() };
  }
  /* 没点过 → 记录这次点赞并累加；唯一约束兜住并发重复插入 */
  try {
    await impl.run('INSERT INTO post_like (post_key, nick, created_at) VALUES (?,?,?)', [key, who, now()]);
  } catch { /* 已被并发请求插入，视为已点赞 */ }
  await impl.run('UPDATE post SET like_count = like_count + 1 WHERE post_key = ?', [key]);
  return { liked: true, likeCount: await cur() };
}

/* 查询某用户是否点过赞，用于详情页回显已赞状态 */
async function hasPostLike(postKey, nick) {
  const key = String(postKey || '').trim();
  const who = String(nick || '').trim();
  if (!key || !who) return false;
  const row = await impl.get('SELECT id FROM post_like WHERE post_key = ? AND nick = ?', [key, who]);
  return !!row;
}



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
  listPosts, getPost, addPost, listPostComments, addPostComment, addPostLike, hasPostLike,
  listTopics, seedCrawlPosts, TOPIC_NAMES,
  listSpots, getSpot, rankSpots, seedSpots, listSpotsByType,
  upsertPois, spotTypesByCity, classifyPoi, POI_TYPES, migrateSpotColumns, backfillSpotColumns,
  SPOTS: ALL_SPOTS, DATA_SPOTS, CITY_NAMES, SPOT_NAMES, guessCity, now,
  cityOf: term => ALIAS.get(String(term || '').trim()) || null
};
