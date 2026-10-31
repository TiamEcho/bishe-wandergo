/* =========================================================
 * WanderGo 后端入口：Express + PostgreSQL / SQLite
 * 启动：cd backend && npm start
 * 端口：默认 8080（与 js/api.js 里的本地地址一致）
 * 数据库：线上配 DATABASE_URL（Render Postgres）自动用 Postgres，本地不配则用 SQLite
 * ========================================================= */
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

/* 轻量 .env 读取（避免额外依赖） */
(function loadEnv() {
  const p = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(p)) return;
  fs.readFileSync(p, 'utf-8').split(/\r?\n/).forEach(line => {
    const s = line.trim();
    if (!s || s.startsWith('#')) return;
    const i = s.indexOf('=');
    if (i < 0) return;
    const k = s.slice(0, i).trim();
    const v = s.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[k]) process.env[k] = v;
  });
})();

const dbx = require('./db');
const routes = require('./routes');

const app = express();
const PORT = Number(process.env.PORT || 8080);
const ROOT = path.resolve(__dirname, '..', '..');

app.use(cors());                                  // 允许 127.0.0.1:8765 等静态服务跨域调用
app.use(express.json({ limit: '2mb' }));
app.use('/api', routes);

app.use('/api', (req, res) => res.status(404).json({ ok: false, message: `未知接口 ${req.method} ${req.originalUrl}` }));

/* 统一错误出口：数据库异常等返回 500，前端可读到 message */
app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ ok: false, message: '服务器内部错误', error: String(err.message || err) });
});

/* 可选：同一端口直接托管前端（http://localhost:8080/index.html） */
if (process.env.SERVE_STATIC !== 'off') {
  app.use(express.static(ROOT, { extensions: ['html'] }));
}

(async () => {
  const seedInfo = await dbx.seed();       // 建表 + 首次灌种子数据（异步，Postgres 需要 await）
  const st = await dbx.stats();

  app.listen(PORT, () => {
    console.log('----------------------------------------------------');
    console.log(`  WanderGo backend  http://localhost:${PORT}`);
    console.log(`  静态前端          http://localhost:${PORT}/index.html`);
    console.log(`  数据库            ${dbx.dialect === 'postgres' ? 'PostgreSQL（持久）' : 'SQLite（本地文件）'}`);
    console.log(`  种子数据          ${seedInfo.seeded ? '已初始化' : '已存在，跳过'} | guides ${st.guides} / checkins ${st.checkins} / entities ${st.entities}`);
    console.log(`  大模型            ${process.env.DOTS_API_KEY ? '已配置 Key' : '未配置 Key（实体抽取走本地规则）'}`);
    console.log('----------------------------------------------------');
  });
})().catch(e => {
  console.error('[startup] 初始化失败：', e);
  process.exit(1);
});
