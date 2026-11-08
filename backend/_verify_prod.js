const B = 'https://wandergo-backend-v2.onrender.com';
const get = async (p, o) => {
  const r = await fetch(B + p, { signal: AbortSignal.timeout(45000), headers: { 'Cache-Control': 'no-cache' }, ...o });
  const t = await r.text();
  return { status: r.status, body: t };
};
const post = (p, data) => get(p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

const show = (label, r, max = 700) => {
  console.log('\n===== ' + label + ' =====');
  console.log('HTTP ' + r.status);
  console.log(r.body.length > max ? r.body.slice(0, max) + ' ...[截断]' : r.body);
};

(async () => {
  show('① /api/health', await get('/api/health'));

  console.log('\n===== ② /api/models =====');
  const m = await get('/api/models');
  console.log('HTTP ' + m.status);
  console.log(m.body.slice(0, 900));

  show('③ B站', await post('/api/link-parse', { url: 'https://www.bilibili.com/video/BV15yXGBxE9U/' }));
  show('③b B站短链b23', await post('/api/link-parse', { url: 'https://b23.tv/BV15yXGBxE9U' }));
  show('④ 小红书(xhslink分享文案)', await post('/api/link-parse', {
    url: '66 小鹿发布了一篇小红书笔记，快来看吧！ 😆 Yb0oUx8lXhGyxv6 😆 http://xhslink.com/a/3tWmJ1x9gUY，复制本条信息，打开【小红书】App查看精彩内容！'
  }));
  show('⑤ 抖音(分享文案)', await post('/api/link-parse', {
    url: '7.94 复制打开抖音，看看【旅行小张的作品】大理洱海的一天 https://v.douyin.com/iRNBho6u/ 复制此链接，打开Dou音搜索，直接观看视频！'
  }));
})();
