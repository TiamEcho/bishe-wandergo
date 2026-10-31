/* =========================================================
 * 本地美食库读取：从 js/data.js 解析 EATS / EATS_BY_REG / CITY_REGION
 * 后端不引入前端脚本，直接用 vm 在一个沙箱里执行取值，避免重复维护一份数据。
 * ========================================================= */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let cache = null;
function load() {
  if (cache) return cache;
  const file = path.resolve(__dirname, '..', '..', 'js', 'data.js');
  cache = { EATS: {}, EATS_BY_REG: {}, CITY_REGION: {} };
  if (!fs.existsSync(file)) return cache;
  try {
    const src = fs.readFileSync(file, 'utf-8');
    /* 整个 data.js 在沙箱里执行一次即可拿到常量；它只依赖少量全局，运行时不会报错 */
    const sandbox = { console };
    vm.createContext(sandbox);
    try { vm.runInContext(src, sandbox, { timeout: 3000, filename: 'data.js' }); } catch (_) { /* 后续常量已赋值部分仍可取 */ }
    Object.assign(cache, {
      EATS: sandbox.EATS || {},
      EATS_BY_REG: sandbox.EATS_BY_REG || {},
      CITY_REGION: sandbox.CITY_REGION || {}
    });
  } catch (e) {
    console.warn('[eats] 解析 data.js 失败，餐饮兜底走通用文案', e.message || e);
  }
  return cache;
}

/* city → [{name, note, price, area}] */
function localEats(city, fallbackCity) {
  const { EATS, EATS_BY_REG, CITY_REGION } = load();
  const pick = (c) => {
    if (!c) return null;
    if (EATS[c]) return EATS[c];
    const reg = CITY_REGION[c] || '国内';
    return EATS_BY_REG[reg] || EATS_BY_REG['国内'] || null;
  };
  const raw = pick(city) || pick(fallbackCity) || EATS_BY_REG['国内'] || [];
  return raw.map(e => ({
    name: e[0], note: e[1], price: e[2], area: e[3] || ''
  })).filter(x => x.name);
}

module.exports = { localEats, load };
