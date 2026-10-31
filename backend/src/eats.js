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
    /* data.js 里 EATS / EATS_BY_REG / CITY_REGION 都是 const，脚本作用域执行完不会挂到 sandbox 上，
       所以用正则把这三段字面量抠出来单独求值 */
    const grab = name => {
      const m = new RegExp(`const\\s+${name}\\s*=\\s*([\\{\\[])`).exec(src);
      if (!m) return null;
      const start = m.index + m[0].length - 1;
      const open = m[1];
      const close = open === '{' ? '}' : ']';
      let depth = 0, quote = '', esc = false;
      for (let i = start; i < src.length; i++) {
        const ch = src[i];
        if (quote) {
          if (esc) esc = false;
          else if (ch === '\\') esc = true;
          else if (ch === quote) quote = '';
          continue;
        }
        if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
        if (ch === open) depth++;
        else if (ch === close && --depth === 0) {
          return vm.runInNewContext('(' + src.slice(start, i + 1) + ')', {}, { timeout: 2000 });
        }
      }
      return null;
    };
    Object.assign(cache, {
      EATS: grab('EATS') || {},
      EATS_BY_REG: grab('EATS_BY_REG') || {},
      CITY_REGION: grab('CITY_REGION') || {}
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
