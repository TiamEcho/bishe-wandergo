/* =========================================================
 * MediaCrawler 内容采集模块（backend/services/mediaCrawler.js）
 *
 * MediaCrawler 是独立部署在本机的 Python 项目，本模块负责：
 *   1) 按城市动态改写它的 config/base_config.py 中的 KEYWORDS
 *   2) child_process.spawn 启动 python main.py 执行采集
 *   3) 读取 data/ 目录下本次新生成的 JSON
 *   4) 归一后写入 SQLite 的 guide 表
 *   5) 逐篇调用 Dots Studio（src/dots.js 的 extractEntities）抽取实体入库
 *
 * 未配置 MEDIACRAWLER_PATH 时不会启动任何子进程，接口返回结构化错误，
 * 上层（collector）自动回落到离线爬虫包，不影响演示。
 * ========================================================= */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dbx = require('../src/db');
const { extractEntities } = require('../src/dots');

/* ---------------- 配置（全部来自 backend/.env） ---------------- */
const MC_PATH = String(process.env.MEDIACRAWLER_PATH || '').trim();
const PY_BIN = String(process.env.MEDIACRAWLER_PYTHON || (process.platform === 'win32' ? 'python' : 'python3')).trim();
const PLATFORM = String(process.env.MEDIACRAWLER_PLATFORM || 'xhs').trim();
const TIMEOUT = Number(process.env.MEDIACRAWLER_TIMEOUT || 150000);            // 默认 150 秒，与前端等待上限一致
const MC_MAX = Number(process.env.MEDIACRAWLER_MAX_ITEMS || 20);                // 单次最多入库条数
const AI_MAX = Number(process.env.AI_MAX_PER_REQUEST || 5);                     // 单次最多调用几次 AI
/* 默认启动参数：小红书 + 扫码登录 + 关键词搜索模式 */
const ARGS = String(process.env.MEDIACRAWLER_ARGS || `--platform ${PLATFORM} --lt qrcode --type search`).trim();

const CONFIG_FILE = () => path.join(MC_PATH, 'config', 'base_config.py');

/* ---------------- 状态（供 /api/health 与管理端展示） ---------------- */
function status() {
  const exists = !!MC_PATH && fs.existsSync(MC_PATH);
  const cfg = exists ? CONFIG_FILE() : '';
  const cfgExists = !!cfg && fs.existsSync(cfg);
  return {
    configured: !!MC_PATH,
    path: MC_PATH,
    exists,
    config: cfg,
    configExists: cfgExists,
    python: PY_BIN,
    platform: PLATFORM,
    args: ARGS,
    timeoutMs: TIMEOUT,
    ready: exists && cfgExists
  };
}

/* 关键词规则：搜「重庆」→ ["重庆旅游攻略","重庆美食","重庆打卡"] */
function keywordsFor(city) {
  const c = String(city || '').trim() || '旅行';
  return [`${c}旅游攻略`, `${c}美食`, `${c}打卡`];
}

/* ---------------- 改写 base_config.py 的 KEYWORDS ---------------- */
function patchKeywords(city) {
  const cfg = CONFIG_FILE();
  if (!fs.existsSync(cfg)) {
    throw new Error(`找不到 MediaCrawler 配置文件：${cfg}（请检查 MEDIACRAWLER_PATH）`);
  }
  const kws = keywordsFor(city);
  const src = fs.readFileSync(cfg, 'utf8');
  /* MediaCrawler 官方的 KEYWORDS 是英文逗号分隔的字符串（KEYWORDS = "a,b"），不是数组 */
  const line = `KEYWORDS = ${JSON.stringify(kws.join(','))}`;
  const re = /^KEYWORDS\s*=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\[[\s\S]*?\])/m;
  const next = re.test(src) ? src.replace(re, line) : `${src.replace(/\s*$/, '')}\n${line}\n`;
  fs.writeFileSync(cfg, next, 'utf8');
  return { config: cfg, keywords: kws, replaced: re.test(src) };
}

/* ---------------- 启动 Python 子进程 ---------------- */
function runPython() {
  return new Promise(resolve => {
    const startedAt = Date.now();
    let out = '';
    let err = '';
    let child;
    try {
      /* pyexecjs（抖音签名）需要一个 JS 运行时：注入便携版 Node 的目录与 EXECJS_RUNTIME */
      const nodeDir = process.env.WGO_NODE_DIR || '';
      const env = { ...process.env, EXECJS_RUNTIME: 'Node' };
      if (nodeDir) env.Path = `${nodeDir};${env.Path || ''}`;
      child = spawn(PY_BIN, ['main.py', ...ARGS.split(/\s+/).filter(Boolean)], {
        cwd: MC_PATH,
        windowsHide: false,   // 让 Chromium 窗口可见（二维码/验证码需要人工操作）
        env
      });
    } catch (e) {
      return resolve({ spawned: false, error: String(e.message || e), startedAt });
    }

    let timedOut = false;
    let done = false;
    const finish = payload => { if (!done) { done = true; resolve(payload); } };
    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill(); } catch (e) { /* 已退出 */ }
    }, TIMEOUT);

    if (child.stdout) child.stdout.on('data', d => { out = (out + d).slice(-4000); });
    if (child.stderr) child.stderr.on('data', d => { err = (err + d).slice(-4000); });
    child.on('error', e => {
      clearTimeout(timer);
      finish({ spawned: false, error: String(e.message || e), startedAt });
    });
    child.on('close', code => {
      clearTimeout(timer);
      finish({
        spawned: true, exitCode: code, timeout: timedOut,
        stdout: out, stderr: err, startedAt, finishedAt: Date.now()
      });
    });
  });
}

/* ---------------- 读取 data/ 下本次新生成的 JSON ---------------- */
function walkJson(dir, depth, out) {
  if (depth < 0) return;
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (depth > 0) walkJson(p, depth - 1, out); }
    else if (/\.(json|jsonl)$/i.test(e.name)) { out.push(p); }
  }
}

function readFreshItems(since) {
  const base = path.join(MC_PATH, 'data');
  if (!fs.existsSync(base)) return { files: [], items: [], dataDir: base };
  const all = [];
  walkJson(base, 3, all);
  const files = all
    .filter(f => { try { return fs.statSync(f).mtimeMs >= since; } catch (e) { return false; } })
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    .slice(0, 3);

  const items = [];
  for (const f of files) {
    try {
      const raw = fs.readFileSync(f, 'utf8').trim();
      if (!raw) continue;
      if (/\.jsonl$/i.test(f)) {
        /* MediaCrawler 默认输出 JSONL：每行一条完整 JSON 记录 */
        for (const ln of raw.split(/\r?\n/)) {
          const s = ln.trim();
          if (!s) continue;
          try { const o = JSON.parse(s); if (o && typeof o === 'object') items.push(o); } catch (e) { /* 跳过坏行 */ }
        }
        continue;
      }
      const j = JSON.parse(raw);
      const arr = Array.isArray(j) ? j : (j.data || j.items || j.list || []);
      if (Array.isArray(arr)) items.push(...arr);
    } catch (e) { /* 跳过坏文件 */ }
  }
  return { files, items, dataDir: base };
}

/* ---------------- 归一成 guide 表的结构 ---------------- */
function md5(s) { return crypto.createHash('md5').update(String(s)).digest('hex').slice(0, 12); }

function tsToStr(v) {
  if (!v) return dbx.now();
  let n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (n > 1e12) n = n;              // 毫秒
  else if (n > 1e9) n = n * 1000;   // 秒 → 毫秒
  try { return new Date(n).toISOString().slice(0, 19).replace('T', ' '); }
  catch (e) { return dbx.now(); }
}

/* 小红书数量是字符串：「9.2万」「1142」，统一转整数 */
function parseCount(v) {
  if (v == null) return 0;
  const s = String(v).trim();
  if (!s) return 0;
  const m = /^([\d.]+)\s*万$/.exec(s);
  if (m) return Math.round(parseFloat(m[1]) * 10000);
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function normalize(raw, city) {
  const title = String(raw.title || raw.desc || raw.content || '').trim().slice(0, 120)
    || `${city}旅行笔记`;
  const content = String(raw.desc || raw.content || raw.title || '').trim();
  const url = String(raw.note_url || raw.share_url || raw.url || '');
  /* image_list 在小红书里是逗号分隔的字符串，不是数组 */
  let cover = '';
  if (Array.isArray(raw.image_list)) cover = String(raw.image_list[0] || '');
  else if (typeof raw.image_list === 'string') cover = raw.image_list.split(',')[0].trim();
  if (!cover) cover = String(raw.cover || raw.video_url || raw.avatar || '');
  const extSrc = raw.note_id || raw.aweme_id || raw.id || md5(title + url);
  return {
    ext_id: `mc-${extSrc}`,
    title,
    content,
    city: String(raw.city || raw.ip_location || city || ''),
    cover,
    source: 'mediacrawler',
    source_url: url,
    type: (raw.type === 'video' || raw.video_url) ? 'video' : 'guide',
    like_count: parseCount(raw.liked_count || raw.digg_count),
    comment_count: parseCount(raw.comment_count),
    created_at: tsToStr(raw.time || raw.create_time || raw.last_modify_ts)
  };
}

/* =========================================================
 * 主流程：采集 → 入库 → AI 抽取
 * @param {string} city 城市名（如「重庆」）
 * @returns {Promise<object>} ok / code / message / keywords / files / items / guides / engine
 * ========================================================= */
async function collectToDb(city) {
  const st = status();
  if (!st.ready) {
    return {
      ok: false,
      code: 'NOT_CONFIGURED',
      message: `MediaCrawler 未就绪：请在 backend/.env 设置 MEDIACRAWLER_PATH 指向本机 MediaCrawler 目录，`
        + `并确认其中存在 config/base_config.py 与 main.py（当前路径：${MC_PATH || '空'}）`
    };
  }

  let cs;
  try {
    cs = patchKeywords(city);
  } catch (e) {
    return { ok: false, code: 'CONFIG_PATCH_FAILED', message: String(e.message || e) };
  }

  const run = await runPython();
  if (!run.spawned) {
    return {
      ok: false, code: 'SPAWN_FAILED',
      message: `无法启动 Python（${PY_BIN}）：${run.error || '未知原因'}。`
        + `请确认已安装 Python 并加入 PATH，或用 MEDIACRAWLER_PYTHON 指定解释器绝对路径。`,
      keywords: cs.keywords
    };
  }

  /* 只认本次启动之后写入的文件（留 3 秒容差） */
  const { files, items, dataDir } = readFreshItems(run.startedAt - 3000);

  if (!items.length) {
    return {
      ok: false,
      code: run.timeout ? 'TIMEOUT' : 'NO_DATA',
      message: run.timeout
        ? `采集超时（${TIMEOUT}ms）：MediaCrawler 需要扫码登录，建议先手动跑一次并保持登录态，`
          + `再调大 MEDIACRAWLER_TIMEOUT。`
        : `采集进程已结束但没有产出数据：请检查 ${dataDir} 是否生成 JSON，`
          + `以及 MediaCrawler 是否已完成扫码登录。`,
      keywords: cs.keywords,
      config: cs.config,
      files,
      exitCode: run.exitCode,
      stdoutTail: (run.stdout || '').slice(-800),
      stderrTail: (run.stderr || '').slice(-800)
    };
  }

  /* 归一 → 入库 */
  const candidates = items
    .filter(x => x && (x.title || x.desc || x.content))
    .slice(0, MC_MAX)
    .map(x => normalize(x, city));

  const guides = [];
  for (const c of candidates) {
    const r = dbx.addGuide(c);
    if (r.row) guides.push({ ...r.row, created: r.created });
  }

  /* AI 实体抽取（Dots Studio，未配 Key 时自动走本地规则） */
  const ai = [];
  let engine = 'local';
  for (const g of guides.slice(0, AI_MAX)) {
    const r = await extractEntities(`${g.title} ${g.content || ''}`, {
      city: g.city, spotNames: dbx.SPOT_NAMES, cityNames: dbx.CITY_NAMES
    });
    engine = r.engine;
    dbx.addEntities(g.id, g.city, r, r.engine);
    ai.push({ guide_id: g.id, title: g.title, engine: r.engine, error: r.error || null });
  }

  return {
    ok: true,
    code: 'OK',
    keywords: cs.keywords,
    config: cs.config,
    files,
    items: candidates,
    guides,
    created: guides.filter(g => g.created).length,
    engine,
    ai,
    exitCode: run.exitCode,
    timeout: run.timeout,
    stats: dbx.stats(),
    stdoutTail: (run.stdout || '').slice(-400),
    stderrTail: (run.stderr || '').slice(-400)
  };
}

module.exports = { status, keywordsFor, patchKeywords, collectToDb, readFreshItems, normalize };
