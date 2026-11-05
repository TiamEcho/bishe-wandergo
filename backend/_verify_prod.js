const B = 'https://wandergo-backend-v2.onrender.com';
const items = [
  ['B站-共享链接', 'https://www.bilibili.com/video/BV15yXGBxE9U/?share_source=copy_web'],
  ['B站-短链b23', 'https://b23.tv/BV15yXGBxE9U'],
  ['小红书-分享文案', '66 小鹿发布了一篇小红书笔记，快来看吧！ 😆 Yb0oUx8lXhGyxv6 😆 http://xhslink.com/a/3tWmJ1x9gUY，复制本条信息，打开【小红书】App查看精彩内容！'],
  ['抖音-分享文案', '7.94 复制打开抖音，看看【旅行小张的作品】大理洱海的一天 # 旅行 https://v.douyin.com/iRNBho6u/ 复制此链接，打开Dou音搜索，直接观看视频！']
];
(async () => {
  for (const [name, url] of items) {
    try {
      const r = await fetch(B + '/api/link-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(45000)
      });
      const j = await r.json();
      const d = j.data || {};
      console.log('===', name, '| HTTP', r.status, '| ok=' + j.ok);
      if (d.type === 'bilibili') {
        console.log('  title   :', d.title);
        console.log('  author  :', d.author, '| view:', d.view, '| duration:', d.duration);
        console.log('  cover   :', d.cover ? 'YES' : 'EMPTY', '|', String(d.cover).slice(0, 70));
        console.log('  desc    :', String(d.desc).slice(0, 60));
        console.log('  tags    :', JSON.stringify(d.tags));
        console.log('  subtitle:', d.subtitle === '' ? 'EMPTY(该视频/游客态无CC字幕)' : JSON.stringify(String(d.subtitle).slice(0, 80)));
      } else {
        console.log('  url     :', d.url);
        console.log('  error   :', d.error || '(none)');
        if (d.title) console.log('  title   :', d.title);
      }
    } catch (e) { console.log('===', name, 'ERR', e.name, e.message); }
  }
})();
