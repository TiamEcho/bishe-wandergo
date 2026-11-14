/* 给所有页面加 <meta name="referrer" content="no-referrer">：
 * B 站（i0.hdslb.com）等站外图片会校验 Referer，带 GitHub Pages 的 Referer 时
 * 部分场景会被拦截，导致视频封面空白。幂等，可重复执行。 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TAG = '<meta name="referrer" content="no-referrer">';
const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));

let n = 0;
files.forEach(f => {
  const p = path.join(ROOT, f);
  let t = fs.readFileSync(p, 'utf8');
  if (t.includes('name="referrer"')) return;
  if (!t.includes('<head>')) return;
  t = t.replace('<head>', '<head>\n' + TAG);
  fs.writeFileSync(p, t, 'utf8');
  n++;
});
console.log(`已为 ${n} 个页面加上 no-referrer`);
