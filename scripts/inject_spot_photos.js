/* 在所有引用 js/data.js 的页面里，于 data.js 之前插入 js/spot_photos.js（实拍图清单）。
 * 幂等：已插入过的会跳过。运行：node scripts/inject_spot_photos.js */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
const TAG = '<script src="js/spot_photos.js?v=1114"></script>';
const RE = /<script src="js\/data\.js[^"]*"><\/script>/;

let n = 0;
files.forEach(f => {
  const p = path.join(ROOT, f);
  let t = fs.readFileSync(p, 'utf8');
  if (t.includes('js/spot_photos.js')) return;
  const m = t.match(RE);
  if (!m) return;
  t = t.replace(RE, TAG + '\n' + m[0]);
  fs.writeFileSync(p, t, 'utf8');
  n++;
});
console.log(`已为 ${n} 个页面注入实拍图清单`);
