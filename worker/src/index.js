/* =========================================================
 * WANDERGO · Render 后端保活 Worker
 * Cloudflare Cron Trigger 定时请求 /api/health?ping=1，
 * 让 Render 免费实例不进入 15 分钟休眠，避免答辩时冷启动。
 * ========================================================= */

const DEFAULT_TARGET = 'https://wandergo-backend-v2.onrender.com';
/* 休眠中的实例会挂起连接，必须给足 30 秒，否则会被 Worker 自己掐断 */
const PING_TIMEOUT = 30000;

function target(env) {
  return (env && env.TARGET) || DEFAULT_TARGET;
}

async function ping(env) {
  const url = target(env).replace(/\/+$/, '') + '/api/health?ping=1';
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'wandergo-keepalive' },
      signal: AbortSignal.timeout(PING_TIMEOUT)
    });
    const ms = Date.now() - t0;
    let data = null;
    try { data = await res.json(); } catch (_) {}
    const ok = res.ok;
    console.log(`[keepalive] ${ok ? 'OK' : 'FAIL'} ${res.status} ${ms}ms ${url}`);
    return { ok, status: res.status, ms, url, data };
  } catch (e) {
    const ms = Date.now() - t0;
    console.log(`[keepalive] ERROR ${ms}ms ${url} :: ${e && e.message}`);
    return { ok: false, status: 0, ms, url, error: String((e && e.message) || e) };
  }
}

export default {
  /* 定时触发：由 wrangler.toml 的 triggers.crons 驱动 */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(ping(env));
  },

  /* 手动触发：浏览器访问 Worker 域名即可立刻探活一次，方便验收 */
  async fetch(request, env) {
    const r = await ping(env);
    return new Response(JSON.stringify({ cron: 'manual', ...r }), {
      status: r.ok ? 200 : 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }
};
