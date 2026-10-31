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
CREATE INDEX IF NOT EXISTS idx_guide_city  ON guide(city);
CREATE INDEX IF NOT EXISTS idx_check_city  ON checkin(city);
CREATE INDEX IF NOT EXISTS idx_entity_name ON entity(name);
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
CREATE INDEX IF NOT EXISTS idx_guide_city  ON guide(city);
CREATE INDEX IF NOT EXISTS idx_check_city  ON checkin(city);
CREATE INDEX IF NOT EXISTS idx_entity_name ON entity(name);
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

/* 再读一次 data.js 的 33 个精编景点（正则取 id/n/city/tag/desc），补全「景点名 → 城市」别名与打卡种子 */
const DATA_SPOTS = (() => {
  try {
    const txt = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf-8');
    const re = /\{id:'([^']+)',n:'([^']+)',city:'([^']+)'[^\n]*?tag:'([^']*)',desc:'([^']*)'/g;
    const out = [];
    let m;
    while ((m = re.exec(txt)) !== null) {
      out.push({ spot_id: m[1], name: m[2], city: m[3].split('·')[0].trim(), tags: m[4], desc: m[5] });
    }
    return out;
  } catch { return []; }
})();
const ALL_SPOTS = [...SPOTS, ...DATA_SPOTS];
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

async function seed() {
  await impl.exec(DDL);

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

module.exports = {
  dialect: impl.dialect,
  raw: impl.raw,
  all: impl.all, get: impl.get, run: impl.run,
  seed, stats, searchGuides, searchCheckins, searchEntities,
  addCheckin, addGuide, addEntities, crawlCandidates,
  SPOTS: ALL_SPOTS, CITY_NAMES, SPOT_NAMES, guessCity, now,
  cityOf: term => ALIAS.get(String(term || '').trim()) || null
};
