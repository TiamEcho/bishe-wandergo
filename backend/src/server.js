/* =========================================================
 * WanderGo 后端入口：Express + SQLite
 * 启动：cd backend && npm start
 * 端口：默认 8080（与 js/api.js 里的本地地址一致）
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

/* 可选：同一端口直接托管前端（http://localhost:8080/index.html） */
if (process.env.SERVE_STATIC !== 'off') {
  app.use(express.static(ROOT, { extensions: ['html'] }));
}

const seedInfo = dbx.seed();
const st = dbx.stats();

app.listen(PORT, () => {
  console.log('----------------------------------------------------');
  console.log(`  WanderGo backend  http://localhost:${PORT}`);
  console.log(`  静态前端          http://localhost:${PORT}/index.html`);
  console.log(`  种子数据          ${seedInfo.seeded ? '已初始化' : '已存在，跳过'} | guides ${st.guides} / checkins ${st.checkins} / entities ${st.entities}`);
  console.log(`  Dots Studio       ${process.env.DOTS_API_KEY ? '已配置 Key' : '未配置 Key（实体抽取走本地规则）'}`);
  const mc = require('../services/mediaCrawler').status();
  console.log(`  MediaCrawler      ${mc.ready ? `就绪 | ${mc.platform} | ${mc.path}` : '未配置（MEDIACRAWLER_PATH 为空或路径不存在，采集走离线爬虫包）'}`);
  console.log('----------------------------------------------------');
});
