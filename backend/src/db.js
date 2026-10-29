/* =========================================================
 * SQLite 数据层：建表 + 首次启动自动灌入种子数据
 * 种子来源：js/spots_crawl.json（景点）、js/posts_crawl.json（爬虫攻略）
 * ========================================================= */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { localExtract } = require('./extract');

const ROOT = path.resolve(__dirname, '..', '..');          // 项目根目录
const DATA_DIR = process.env.DB_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'wandergo.db'));
db.pragma('journal_mode = WAL');

/* ---------------- 建表 ---------------- */
db.exec(`
CREATE TABLE IF NOT EXISTS guide(
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ext_id        TEXT UNIQUE,              -- 去重键（原帖 id / 外链）
  title         TEXT NOT NULL,
  content       TEXT,
  city          TEXT,
  cover         TEXT,
  source        TEXT,                     -- bilibili / xiaohongshu / system ...
  source_url    TEXT,
  type          TEXT,                     -- video / note / guide
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
  type       TEXT,                        -- place / food / district
  name       TEXT,
  mention    INTEGER DEFAULT 1,
  engine     TEXT,                        -- dots / local
  created_at TEXT,
  UNIQUE(guide_id, type, name)
);
CREATE INDEX IF NOT EXISTS idx_guide_city  ON guide(city);
CREATE INDEX IF NOT EXISTS idx_check_city  ON checkin(city);
CREATE INDEX IF NOT EXISTS idx_entity_name ON entity(name);
`);

/* ---------------- 种子数据 ---------------- */
function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return null; }
}
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
  重庆: ['重庆', '洪崖洞'],
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

function guessCity(text, locHint) {
  const body = `${text || ''} ${locHint || ''}`;
  for (const k of ALIAS_KEYS) {
    if (body.includes(k)) return ALIAS.get(k);
  }
  if (locHint) {
    const parts = String(locHint).split(/·|\||-|\/|\s+/).map(s => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return null;
}

const now = () => {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

function seed() {
  const guideCount = db.prepare('SELECT COUNT(*) c FROM guide').get().c;
  if (guideCount > 0) return { seeded: false, guides: guideCount };

  const insertGuide = db.prepare(`INSERT OR IGNORE INTO guide
    (ext_id,title,content,city,cover,source,source_url,type,like_count,comment_count,created_at)
    VALUES (@ext_id,@title,@content,@city,@cover,@source,@source_url,@type,@like_count,@comment_count,@created_at)`);
  const insertEntity = db.prepare(`INSERT OR IGNORE INTO entity
    (guide_id,city,type,name,mention,engine,created_at) VALUES (?,?,?,?,?,'local',?)`);

  const tx = db.transaction(() => {
    /* 1) 爬虫攻略 → guide */
    (CRAWL.posts || []).forEach(p => {
      const text = `${p.title || ''} ${p.content && p.content !== '-' ? p.content : ''}`;
      const city = guessCity(text, p.location);
      insertGuide.run({
        ext_id: `crawl-${p.id}`,
        title: p.title || '旅行攻略',
        content: p.content && p.content !== '-' ? p.content : '',
        city,
        cover: p.cover || '',
        source: p.source || 'web',
        source_url: p.sourceUrl || p.videoUrl || '',
        type: p.type || 'note',
        like_count: p.likeCount || 0,
        comment_count: p.commentCount || 0,
        created_at: p.createdAt || now()
      });
    });

    /* 2) 景点 → 演示打卡记录（每个城市取 1~2 条，保证按城市搜索有内容） */
    const insertCheckin = db.prepare(`INSERT INTO checkin
      (user,city,spot,text,mood,cost,cover,source,created_at) VALUES (?,?,?,?,?,?,?,'seed',?)`);
    const seen = new Map();
    ALL_SPOTS.forEach((s, i) => {
      const cnt = seen.get(s.city) || 0;
      if (cnt >= 2 || !s.city) return;
      seen.set(s.city, cnt + 1);
      const price = parseFloat(String(s.price).replace(/[^\d.]/g, '')) || (20 + i * 3);
      insertCheckin.run(
        '旅行者小W', s.city, s.name,
        s.desc || `${s.name}打卡完成，值得一来。`,
        ['😌 治愈放松', '🤩 惊喜满满', '🚶 慢慢逛'][i % 3],
        price, s.img || '',
        new Date(Date.now() - i * 36e5).toISOString().slice(0, 19).replace('T', ' ')
      );
    });

    /* 3) 对存量攻略跑一次本地实体抽取，作为 AI 结果的基线 */
    for (const g of db.prepare('SELECT id,title,content,city FROM guide').all()) {
      const r = localExtract(`${g.title} ${g.content || ''}`, { city: g.city, spotNames: SPOT_NAMES, cityNames: CITY_NAMES });
      [['place', r.places], ['food', r.foods], ['district', r.districts]].forEach(([type, arr]) => {
        arr.forEach(e => insertEntity.run(g.id, g.city, type, e.name, e.mention, now()));
      });
    }
  });
  tx();

  return {
    seeded: true,
    guides: db.prepare('SELECT COUNT(*) c FROM guide').get().c,
    checkins: db.prepare('SELECT COUNT(*) c FROM checkin').get().c,
    entities: db.prepare('SELECT COUNT(*) c FROM entity').get().c
  };
}

/* ---------------- 查询/写入方法 ---------------- */
function stats() {
  return {
    guides: db.prepare('SELECT COUNT(*) c FROM guide').get().c,
    checkins: db.prepare('SELECT COUNT(*) c FROM checkin').get().c,
    entities: db.prepare('SELECT COUNT(*) c FROM entity').get().c,
    cities: db.prepare('SELECT COUNT(DISTINCT city) c FROM guide WHERE city IS NOT NULL').get().c
  };
}

function searchGuides(q, limit = 60) {
  if (!q) {
    return db.prepare('SELECT * FROM guide ORDER BY created_at DESC LIMIT ?').all(limit);
  }
  const like = `%${q}%`;
  return db.prepare(`
    SELECT DISTINCT g.* FROM guide g
    LEFT JOIN entity e ON e.guide_id = g.id
    WHERE g.city LIKE ? OR g.title LIKE ? OR g.content LIKE ? OR e.name LIKE ?
    ORDER BY g.created_at DESC LIMIT ?`).all(like, like, like, like, limit);
}

function searchCheckins(q, limit = 40) {
  if (!q) return db.prepare('SELECT * FROM checkin ORDER BY created_at DESC LIMIT ?').all(limit);
  const like = `%${q}%`;
  return db.prepare(`SELECT * FROM checkin
    WHERE city LIKE ? OR spot LIKE ? OR text LIKE ?
    ORDER BY created_at DESC LIMIT ?`).all(like, like, like, limit);
}

function searchEntities(q, limit = 30) {
  if (!q) {
    return db.prepare(`SELECT type,name,MAX(city) city,SUM(mention) mention FROM entity
      GROUP BY type,name ORDER BY mention DESC LIMIT ?`).all(limit);
  }
  const like = `%${q}%`;
  return db.prepare(`SELECT type,name,MAX(city) city,SUM(mention) mention FROM entity
    WHERE name LIKE ? OR city LIKE ?
    GROUP BY type,name ORDER BY mention DESC LIMIT ?`).all(like, like, limit);
}

function addCheckin(d) {
  const r = db.prepare(`INSERT INTO checkin (user,city,spot,text,mood,cost,cover,source,created_at)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(
    d.user || '匿名旅行者', d.city || '', d.spot || '', d.text || '',
    d.mood || '😌 治愈放松', Number(d.cost) || 0, d.cover || '', d.source || 'web', now()
  );
  return db.prepare('SELECT * FROM checkin WHERE id = ?').get(r.lastInsertRowid);
}

/* 攻略入库（返回是否新增，用于采集去重统计） */
function addGuide(g) {
  const ext = g.ext_id || (g.source_url ? `${g.source}-${g.source_url}` : null);
  const info = db.prepare(`INSERT OR IGNORE INTO guide
    (ext_id,title,content,city,cover,source,source_url,type,like_count,comment_count,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    ext, g.title, g.content || '', g.city || null, g.cover || '', g.source || 'web',
    g.source_url || '', g.type || 'guide', g.like_count || 0, g.comment_count || 0, g.created_at || now()
  );
  if (info.changes === 0) {
    const row = ext ? db.prepare('SELECT * FROM guide WHERE ext_id = ?').get(ext) : null;
    return { created: false, row };
  }
  return { created: true, row: db.prepare('SELECT * FROM guide WHERE id = ?').get(info.lastInsertRowid) };
}

/* 写入实体（同一篇攻略同类型同名去重） */
function addEntities(guideId, city, entities, engine) {
  const stmt = db.prepare(`INSERT OR IGNORE INTO entity
    (guide_id,city,type,name,mention,engine,created_at) VALUES (?,?,?,?,?,?,?)`);
  let n = 0;
  [['place', entities.places], ['food', entities.foods], ['district', entities.districts]]
    .forEach(([type, arr]) => {
      (arr || []).forEach(e => {
        const info = stmt.run(guideId, city || null, type, e.name, e.mention || 1, engine || 'local', now());
        n += info.changes;
      });
    });
  return n;
}

/* 采集时从原始爬虫包里捞取候选（相当于"采集"这一步的离线数据源） */
function crawlCandidates(keyword, limit = 8) {
  const kw = String(keyword || '').trim();
  if (!kw) return [];
  const like = `${kw}`;
  return (CRAWL.posts || []).filter(p => {
    const body = `${p.title || ''} ${p.content || ''} ${p.location || ''} ${p.topics || ''}`;
    return body.includes(kw);
  }).slice(0, limit);
}

module.exports = {
  db, seed, stats, searchGuides, searchCheckins, searchEntities,
  addCheckin, addGuide, addEntities, crawlCandidates,
  SPOTS: ALL_SPOTS, CITY_NAMES, SPOT_NAMES, guessCity, now,
  cityOf: term => ALIAS.get(String(term || '').trim()) || null
};
