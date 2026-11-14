/* 修正 js/poi_route.js：
 *   1) 海外城市的 fallback 坐标是爬虫按中国经纬度瞎填的（巴黎埃菲尔铁塔写成 103.99/35.18），
 *      凡是能在 spots_crawl.json 里按名字找到的，一律改用库里的真实坐标；
 *   2) 库里没有的海外城市（首尔 / 釜山 / 济州岛）直接补一组真实坐标的点位，
 *      保证「AI 规划 → 行程地图」和「地图打卡 → 城市规划」都能画出正确的点。
 * 运行：node scripts/fix_poi_route.js  （幂等，可重复执行） */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const POI_PATH = path.join(ROOT, 'js', 'poi_route.js');
const DB = require(path.join(ROOT, 'js', 'spots_crawl.json'));

/* 海外城市名（与 poi_route.js 现有键保持一致） */
const OVERSEAS = new Set(['日本', '巴黎', '冰岛', '清迈', '马尔代夫']);

/* ---- 韩国补充点位：真实经纬度（保留 3 位小数，与库内其它海外点位精度一致） ---- */
const KR = {
  首尔: [
    ['景福宫', 126.977, 37.579], ['北村韩屋村', 126.985, 37.582], ['昌德宫', 126.991, 37.579],
    ['明洞', 126.984, 37.563], ['南山首尔塔', 126.988, 37.551], ['弘大', 126.923, 37.556],
    ['广藏市场', 126.999, 37.570], ['乐天世界塔', 127.102, 37.512], ['清溪川', 126.978, 37.569],
    ['梨花洞壁画村', 127.006, 37.580], ['汉江公园', 126.995, 37.528], ['东大门设计广场', 127.009, 37.566]
  ],
  釜山: [
    ['海云台海水浴场', 129.160, 35.159], ['广安里海水浴场', 129.118, 35.153],
    ['甘川洞文化村', 129.010, 35.097], ['札嘎其市场', 129.030, 35.097],
    ['龙头山公园·釜山塔', 129.033, 35.101], ['南浦洞', 129.030, 35.100],
    ['海东龙宫寺', 129.223, 35.188], ['东莱市场', 129.081, 35.205],
    ['太宗台', 129.086, 35.053], ['松岛海水浴场', 129.018, 35.076],
    ['西面商圈', 129.060, 35.157], ['BIFF 广场', 129.026, 35.098]
  ],
  济州岛: [
    ['城山日出峰', 126.942, 33.459], ['汉拿山国立公园', 126.988, 33.362],
    ['牛岛', 126.950, 33.500], ['涉地可支', 126.930, 33.425],
    ['柱状节理带', 126.716, 33.238], ['天帝渊瀑布', 126.711, 33.249],
    ['天地渊瀑布', 126.719, 33.246], ['正房瀑布', 126.735, 33.245],
    ['龙头岩', 126.515, 33.516], ['东门传统市场', 126.528, 33.511],
    ['济州泰迪熊博物馆', 126.376, 33.253], ['山君不离', 126.833, 33.383],
    ['挟才海水浴场', 126.310, 33.400], ['涯月邑海岸', 126.330, 33.460],
    ['万丈窟', 126.716, 33.454], ['雪绿茶博物馆', 126.356, 33.307]
  ]
};

const src = fs.readFileSync(POI_PATH, 'utf8');
const head = src.slice(0, src.indexOf('const POI_ROUTE='));
const body = src.slice(src.indexOf('const POI_ROUTE='));
const m = { exports: {} };
new Function('module', body.replace('const POI_ROUTE=', 'module.exports='))(m);
const P = m.exports;

/* 库索引：名称 → 坐标（同名优先取海外条目） */
const byName = new Map();
DB.forEach(s => {
  if (s.lng == null || s.lat == null) return;
  byName.set(s.name, s);
});

let fixed = 0, kept = 0;
Object.keys(P).forEach(city => {
  if (!OVERSEAS.has(city)) return;
  (P[city].route || []).forEach(it => {
    const hit = byName.get(it.n);
    if (hit) {
      if (hit.lng !== it.lng || hit.lat !== it.lat) fixed++;
      it.lng = hit.lng;
      it.lat = hit.lat;
      it.src = 'lib';
    } else {
      kept++;
    }
  });
});

/* ---- 韩国三城：整组写入（已存在则覆盖，坐标以这里为准） ---- */
Object.entries(KR).forEach(([city, list]) => {
  const eats = (P[city] && P[city].eats) || [];
  P[city] = {
    route: list.map(([n, lng, lat], i) => ({
      id: 'kr_' + city + '_' + (i + 1), n, lng, lat, src: 'manual', day: Math.floor(i / 4) + 1
    })),
    eats
  };
});

/* 与源文件一致的序列化风格：2 空格缩进 */
const out = head + 'const POI_ROUTE=' + JSON.stringify(P, null, 1) + ';\n';
fs.writeFileSync(POI_PATH, out, 'utf8');
console.log(`poi_route.js 已更新：修正海外坐标 ${fixed} 条，未匹配 ${kept} 条，补齐韩国三城 ${Object.values(KR).reduce((a, l) => a + l.length, 0)} 条`);
