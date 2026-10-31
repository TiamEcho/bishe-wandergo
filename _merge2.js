const { GROUPS } = require('./_spots_data');
const fs = require('fs');
const FILE = './js/spots_crawl.json';
const all = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
const seen = new Set(all.map(x => x.city + '|' + x.name));
let added = 0;
GROUPS.forEach(g => {
  g.list.forEach((r, i) => {
    const key = g.city + '|' + r[0];
    if (seen.has(key)) return;
    seen.add(key);
    all.push({
      spot_id: 'lib_' + g.city + '_' + i,
      name: r[0], city: g.city, province: g.prov, region: 'cn',
      address: g.city, lng: r[1], lat: r[2], hours: r[6] || '',
      traffic: '', price: r[5] || '', rating: 4.5, heat: 60,
      tags: r[3] || '', desc: r[4] || '', img: '',
      geo_src: 'manual', src: '人工整理坐标'
    });
    added++;
  });
});
all.sort((a, b) => (a.city || '').localeCompare(b.city || '') || String(a.name).localeCompare(String(b.name)));
fs.writeFileSync(FILE, JSON.stringify(all, null, 1), 'utf-8');
console.log('added', added, 'total', all.length, 'cities', new Set(all.map(x => x.city)).size);
console.log(GROUPS.map(g => g.city + ':' + g.list.length).join(' '));
