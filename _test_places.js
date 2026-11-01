const { searchPlaces, isInChina } = require('./backend/src/services/places');
(async () => {
  const tests = [
    ['东京', { lng: 139.6917, lat: 35.6895 }],
    ['巴黎', { lng: 2.3522, lat: 48.8566 }],
    ['杭州', { lng: 120.155, lat: 30.274 }],
  ];
  for (const [city, center] of tests) {
    const inCn = isInChina(center);
    const t0 = Date.now();
    const r = await searchPlaces(city, { center, limit: 200 });
    console.log(`\n=== ${city} inChina=${inCn} provider=${r.provider} 耗时=${Date.now() - t0}ms`);
    console.log(`   total=${r.total} byCategory=${JSON.stringify(r.byCategory)}`);
    console.log('   样例:', (r.places || []).slice(0, 8).map(p => `${p.name}(${p.category})`).join(' / '));
  }
})();
