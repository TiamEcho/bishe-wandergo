/* 从 js/spots_crawl.json 生成「景点名 → 维基共享资源实拍图」清单（js/spot_photos.js）。
 * 前端 IMG() 会优先取这里的实拍图，取不到才回落到 AI 出图。
 * 运行：node scripts/build_spot_photos.js */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const spots = JSON.parse(fs.readFileSync(path.join(ROOT, 'js', 'spots_crawl.json'), 'utf8'));

const EN_CITY = { 首尔: 'Seoul', 釜山: 'Busan', 济州岛: 'Jeju', 东京: 'Tokyo', 京都: 'Kyoto', 曼谷: 'Bangkok' };

/* 按「城市|景点名」建索引，避免同名景点串图 */
const out = {};
spots.forEach(s => {
  if (!s.img) return;
  out[s.city + '|' + s.name] = s.img;
  /* 国内城市直接按景点名也能命中（国内景点重名率低） */
  if (s.region === 'cn' && !out['*|' + s.name]) out['*|' + s.name] = s.img;
});

const body = `/* 由 scripts/build_spot_photos.js 自动生成，勿手改。
 * 数据来源：维基共享资源（Wikimedia Commons）实拍照片，免费可商用。
 * key 格式：「城市|景点名」精确匹配，或「*|景点名」跨城市匹配。 */
window.WGO_SPOT_PHOTOS=${JSON.stringify(out)};
`;

fs.writeFileSync(path.join(ROOT, 'js', 'spot_photos.js'), body, 'utf8');
console.log(`js/spot_photos.js 生成完成，共 ${Object.keys(out).length} 条实拍图`);
