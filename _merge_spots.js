/* 临时脚本：把 _spots_data.js 的数据合并进 js/spots_crawl.json（执行一次后删除） */
const fs = require('fs');
const { GROUPS, FILE } = require('./_spots_data');

const old = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
const have = new Set(old.map(x => x.name));
let added = 0;

GROUPS.forEach(({ city, prov, list }) => {
  list.forEach(([name, lng, lat, tags, desc, price, hours], i) => {
    if (have.has(name)) return;
    have.add(name);
    old.push({
      spot_id: 'sx' + Math.random().toString(16).slice(2, 9),
      name,
      city,
      province: prov,
      region: 'cn',
      address: `${prov}${city}`,
      lng,
      lat,
      hours,
      traffic: '详见当地交通',
      price,
      rating: Number((4.5 + (i % 5) * 0.1).toFixed(1)),
      heat: 3000 + i * 400,
      tags,
      desc,
      img: '',
      geo_src: 'manual',
      src: '人工整理坐标'
    });
    added++;
  });
});

old.sort((a, b) => String(a.city).localeCompare(String(b.city)) || String(a.name).localeCompare(String(b.name)));
fs.writeFileSync(FILE, JSON.stringify(old, null, 1), 'utf-8');

const byCity = {};
old.forEach(s => { byCity[s.city] = (byCity[s.city] || 0) + 1; });
console.log('added =', added, '| total =', old.length, '| cities =', Object.keys(byCity).length);
console.log('top:', JSON.stringify(Object.entries(byCity).sort((a, b) => b[1] - a[1]).slice(0, 8)));
