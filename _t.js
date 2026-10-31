const { planRoute } = require('./backend/src/plan');

(async () => {
  const cities = process.argv.slice(2).length ? process.argv.slice(2) : ['杭州'];
  for (const c of cities) {
    const r = await planRoute(c, 3, 12);
    console.log('\n===', c, 'days=', r.days, 'engine=', JSON.stringify(r.engine));
    r.plan.forEach(d => {
      console.log(`Day${d.day} spots=${d.spots.length} km=${d.routeKm} bear=${JSON.stringify(d.bearingRange)}`);
      d.spots.forEach(s => console.log('   -', s.name, '|', s.city, '| eats=', (s.restaurants || []).length, '|', (s.restaurants || []).map(x => x.name).join(',')));
      console.log('   hotel=', d.hotel && d.hotel.name);
    });
  }
})();
