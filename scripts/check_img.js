/* 检查 js/data.js 里 IMG 的实际行为：海外景点是否命中实拍图、国内是否回落到 AI 出图。
 * 仅用于本地自检：node scripts/check_img.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = { window: {}, document: undefined, localStorage: undefined, console };
sandbox.window = sandbox;
vm.createContext(sandbox);
['js/spot_photos.js', 'js/data.js'].forEach(f => {
  let code = fs.readFileSync(path.join(ROOT, f), 'utf8');
  /* const 声明在 vm 里不会挂到全局，转成 var 便于自检取值 */
  code = code.replace(/^const (IMG|SPOTS|P)=/gm, (m, n) => 'var ' + n + '=');
  vm.runInContext(code, sandbox, { filename: f });
});

const IMG = sandbox.IMG, SPOTS = sandbox.SPOTS;
const gallery = require(path.join(ROOT, 'js', 'spots_crawl.json'));
const rr = ['首尔', '釜山', '济州岛', '东京', '曼谷'];
rr.forEach(city => {
  const list = gallery.filter(s => s.city === city);
  const real = list.filter(s => !String(IMG(city + '|' + s.name)).includes('text_to_image'));
  console.log(`${city}: ${real.length}/${list.length} 命中实拍图`);
  list.slice(0, 3).forEach(s => console.log('  ', s.name, '→', String(IMG(city + '|' + s.name)).slice(0, 90)));
});
const cn = SPOTS.find(s => s.rg === 'cn');
console.log('国内样例', cn && cn.n, '→', String(IMG(cn.id)).slice(0, 100));
