/* =========================================================
 * WANDERGO · 帖子详情 / 点赞 / 评论（postdetail.js）
 * 被 community.html 与 topic.html 共用：
 *   - 后端帖子（含 B 站爬虫抓取的 Vlog 与评论）走 openDbPost(id)
 *   - 站内静态帖子仍走 community.js 自己的 openPost
 * ========================================================= */
/* B 站来源在 PLAT 里补一项，社区筛选与卡片角标都靠它 */
if (typeof PLAT !== 'undefined' && !PLAT.bili) PLAT.bili = { n: 'B站', i: '📺' };

/* 后端新增的三首曲目在 data.js 的 BGM_LIST 里没有，这里补名字映射，
   否则卡片会显示成「♪ BGM」看不出是哪首 */
const TW_EXTRA_BGM = { sakura: '🌸 樱花列车', ocean: '🌊 海浪白噪', sunny: '☀️ 公路阳光' };

const TW = {
  /* 所有用户产生的内容进 innerHTML 前必须转义，防止昵称/正文里带标签把页面打乱 */
  esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },
  /* 封面兜底：爬虫帖有 cover，站内帖只有 spotId，就用景点图库里的图 */
  cover(p) {
    if (p.cover) return p.cover;
    if (p.spotId && typeof P !== 'undefined' && P[p.spotId]) return IMG(P[p.spotId]);
    if (typeof P !== 'undefined' && P.erhai) return IMG(P.erhai);
    return '';
  },
  bgmName(code) {
    if (!code) return '';
    if (TW_EXTRA_BGM[code]) return TW_EXTRA_BGM[code];
    const b = (typeof BGM_LIST !== 'undefined' ? BGM_LIST : []).find(x => x[0] === code);
    return b ? b[2] + ' ' + b[1] : '';
  },
  /* 新曲目没有对应的 WebAudio 预设，映射到风格最接近的既有一首，保证点击有声音 */
  playBgm(code) {
    const alias = { sakura: 'fresh', ocean: 'calm', sunny: 'city' };
    const name = alias[code] || code || 'fresh';
    const on = (typeof toggleBgm === 'function') ? toggleBgm(name) : false;
    if (on) toast('♪ 正在播放 ' + (TW.bgmName(code) || name));
  },
  platOf(p) {
    const key = p.client === 'bilibili' ? 'bili' : (p.client || 'go');
    return PLAT[key] || PLAT.go;
  },
  typeLabel(p) {
    return p.type === 'video' ? '🎬 打卡视频' : p.type === 'plog' ? '📷 Plog' : '🖼 图文';
  },
  /* 从 B 站链接里取出 BV 号，用于内嵌播放器 */
  bvid(url) {
    const m = /(BV[0-9A-Za-z]{10})/.exec(url || '');
    return m ? m[1] : '';
  },
  /* 当前登录用户：core.js 里 user 是 let 全局变量，跨脚本可读；读不到就看 localStorage */
  me() {
    try {
      if (typeof user !== 'undefined' && user && user.nick) return user;
    } catch (e) { /* 某些页面没加载 core.js */ }
    try { return JSON.parse(localStorage.getItem('fmw_user') || 'null'); } catch (e) { return null; }
  },
  requireLogin() {
    if (TW.me()) return true;
    toast('请先登录后再互动 ✈️');
    if (typeof openAuth === 'function') openAuth('login');
    return false;
  }
};

/* ---------------- 离线数据包（js/posts_crawl.json，由爬虫导出脚本生成） ----------------
 * GitHub Pages 等纯静态环境下后端不在线，词条 / 帖子 / 评论从这里降级读取，
 * 数据仍是爬虫从 B 站公开接口真实抓取的内容，带 source_url 可溯源 */
let __twLocal = null;
async function twLocalData() {
  if (__twLocal) return __twLocal;
  try {
    const r = await fetch('js/posts_crawl.json?v=1119');
    __twLocal = await r.json();
  } catch (e) { __twLocal = { topics: [], posts: [], comments: {} }; }
  return __twLocal;
}
/* 离线互动：点赞 / 评论在后端不可用时落 localStorage，刷新不丢 */
function localLikes() { try { return JSON.parse(localStorage.getItem('fmw_plikes') || '{}') } catch (e) { return {} } }
function localCmts(id) { try { return (JSON.parse(localStorage.getItem('fmw_pcmts') || '{}'))[id] || [] } catch (e) { return [] } }
function saveLocalCmt(id, cmt) {
  let all = {}; try { all = JSON.parse(localStorage.getItem('fmw_pcmts') || '{}') } catch (e) { }
  (all[id] = all[id] || []).unshift(cmt);
  localStorage.setItem('fmw_pcmts', JSON.stringify(all));
}

/* ---------------- 帖子详情弹窗 ---------------- */
async function openDbPost(id) {
  const me = TW.me();
  const nick = me ? me.nick : '';
  const r = await WGOAPI.postDetail(id, nick);
  if (r && r.ok) return renderDbPostModal(r.post, r.comments || [], !!r.liked, true);
  /* 后端离线：从本地爬虫数据包降级渲染，互动走 localStorage */
  const b = await twLocalData();
  const lp = (b.posts || []).find(x => String(x.id) === String(id));
  if (!lp) { toast((r && r.msg) || '帖子加载失败，请确认后端已启动'); return; }
  const cmts = [].concat(localCmts(lp.id), (b.comments || {})[lp.id] || []);
  renderDbPostModal(lp, cmts, !!localLikes()[lp.id], false);
}
function renderDbPostModal(p, comments, liked, online) {
  const pl = TW.platOf(p);
  const cover = TW.cover(p);
  const bv = TW.bvid(p.videoUrl || p.sourceUrl);
  const topicChips = (p.topics || '').split(',').filter(Boolean)
    .map(c => `<span class="tw-chip" onclick="closeModal();setTimeout(()=>WGO.go('topic.html',{id:'${TW.esc(c)}'}),160)"># ${TW.esc((window.TW_TOPIC_NAMES || {})[c] || c)}</span>`).join('');
  const bgm = TW.bgmName(p.bgm);
  /* 「想去」地点标注：从标题+正文+定位里识别城市/景点，点亮即收藏进想去清单 */
  const wantPlaces = (typeof extractPlaces === 'function') ? extractPlaces((p.title || '') + ' ' + (p.content || '') + ' ' + (p.location || '')) : [];
  const wants = (typeof readWants === 'function') ? readWants() : {};
  const wantChips = wantPlaces.length
    ? `<div class="tw-wants"><span class="lbl">📍 文中提到的地点 · 想去就点亮：</span>${wantPlaces.map(w => `<button class="want-chip ${wants[w] ? 'on' : ''}" onclick="twToggleWant('${TW.esc(w)}','${TW.esc(String(p.id))}',this)">${wants[w] ? '✨' : '📍'} ${TW.esc(w)}</button>`).join('')}</div>`
    : '';

  const videoBlock = p.type === 'video'
    ? (bv
      ? `<div class="tw-video-prev"><iframe src="//player.bilibili.com/player.html?bvid=${bv}&page=1&autoplay=0&high_quality=1" scrolling="no" frameborder="0" allowfullscreen="true"></iframe></div>`
      : (p.videoUrl && /\.(mp4|webm|m3u8)(\?|$)/i.test(p.videoUrl)
        ? `<div class="tw-video-prev"><video src="${TW.esc(p.videoUrl)}" controls playsinline></video></div>`
        : `<div class="tw-detail-acts"><button class="tw-btn gold" onclick="twPlayLocal('${TW.esc(p.spotId || 'erhai')}','${TW.esc((p.title || '').slice(0, 14))}')">▶ 播放打卡视频（${TW.esc(bgm || '原声')}）</button></div>`))
    : '';

  openModal(`<button class="mx" onclick="closeModal()">✕</button>
    <div class="tw-detail-cover">
      <img src="${TW.esc(cover)}" referrerpolicy="no-referrer" alt="">
      <span class="badge">${pl.i} ${pl.n} · ${TW.typeLabel(p)}</span>
    </div>
    <div class="tw-detail-body">
      <h3>${TW.esc(p.title || '旅行瞬间')}</h3>
      <div class="tw-detail-meta">
        <span class="av">${TW.esc((p.nick || '旅')[0])}</span>
        <b style="font-size:12.5px;color:var(--ink)">${TW.esc(p.nick || '旅行者')}</b>
        <span>${TW.esc(p.createdAt || '')}</span>
        ${p.location ? `<span>📍 ${TW.esc(p.location)}</span>` : ''}
        ${bgm ? `<span style="color:var(--gold);cursor:pointer" onclick="TW.playBgm('${TW.esc(p.bgm)}')">♪ ${TW.esc(bgm)}</span>` : ''}
      </div>
      <p class="tw-detail-txt">${TW.esc(p.content || '')}</p>
      ${topicChips ? `<div class="tw-chips" style="margin-bottom:6px">${topicChips}</div>` : ''}
      ${wantChips}
      ${videoBlock}
      <div class="tw-detail-acts">
        <button class="tw-like-btn ${liked ? 'on' : ''}" id="twLikeBtn" onclick="twToggleLike('${TW.esc(String(p.id))}',this)">
          <span>${liked ? '♥' : '♡'}</span><span id="twLikeNum">${p.likeCount || 0}</span>
        </button>
        <span style="font-size:12px;color:var(--muted)">💬 <b id="twCmtNum">${p.commentCount || 0}</b> 条讨论</span>
        ${p.sourceUrl ? `<a class="tw-src-link" href="${TW.esc(p.sourceUrl)}" target="_blank" rel="noopener">↗ 在原平台查看</a>` : ''}
        ${p.spotId ? `<button class="tw-btn ghost sm" onclick="closeModal();setTimeout(()=>WGO.go('map.html',{spot:'${TW.esc(p.spotId)}'}),160)">🗺 地图查看</button>` : ''}
        <button class="tw-btn ghost sm" onclick="closeModal();setTimeout(()=>WGO.go('ai.html',{dest:'${TW.esc((wantPlaces[0] || p.location || p.title || '').split(/[ ·]/)[0])}'}),160)">🤖 AI 规划同款</button>
      </div>
      <div class="tw-cmt-head">💬 讨论区 <span style="font-size:11px;color:var(--muted);font-weight:500">站内评论 + 平台真实评论</span></div>
      <div class="tw-cmt-box">
        <textarea id="twCmtInput" maxlength="500" placeholder="说点什么… 你的经验会成为别人的攻略"></textarea>
        <button class="tw-btn gold sm" onclick="twSendComment('${TW.esc(String(p.id))}')">发布</button>
      </div>
      <div class="tw-cmt-list" id="twCmtList">${renderComments(comments)}</div>
      <p class="src-note" style="margin-top:14px">${p.source === 'bilibili'
        ? '📺 本条 Vlog 与评论由后端爬虫通过 B 站公开接口抓取，保留原始链接可溯源；不下载视频、不抓取私密数据。'
        : '✈️ 本条内容由站内用户发布，评论实时写入 MySQL。'}${online ? '' : ' 当前为离线数据包模式：点赞 / 评论暂存在本地。'}</p>
    </div>`, true);
}

/* 「想去」地点点亮：本地清单一键收藏/取消，后端在线时同步写库 */
function twToggleWant(name, from, btn) {
  const on = toggleWant(name, 'post:' + from);
  if (btn) { btn.classList.toggle('on', on); btn.innerHTML = (on ? '✨ ' : '📍 ') + TW.esc(name); }
  toast(on ? ('已收藏「' + name + '」到想去清单 ✨') : ('已取消「' + name + '」的想去标记'));
}

function renderComments(list) {
  if (!list.length) {
    return `<div class="tw-empty"><b>💭</b>还没有讨论，来抢第一条评论～</div>`;
  }
  return list.map(c => `<div class="tw-cmt">
    <span class="av">${TW.esc((c.nick || '旅')[0])}</span>
    <div class="bub">
      <b>${TW.esc(c.nick || '旅行者')}</b>${c.source === 'bilibili' ? '<span class="tag">B站</span>' : ''}
      <p>${TW.esc(c.content || '')}</p>
      <div class="t"><span>${TW.esc(c.createdAt || '')}</span>${c.likeCount ? `<span>♥ ${c.likeCount}</span>` : ''}</div>
    </div>
  </div>`).join('');
}

/* 站内视频没有真实文件，用景点图轮播 + BGM 模拟播放（与 core.js 的播放器一致） */
function twPlayLocal(spotId, title) {
  const keys = (typeof P !== 'undefined' && P[spotId]) ? [spotId, 'erhai', 'oia'] : ['erhai', 'oia'];
  openVideo({ t: title || '打卡视频', loc: 'WANDERGO 社区', imgs: keys, bgm: 'fresh' });
}

/* 点赞：先写库再改 UI；后端离线时降级为本地记录，不制造「假成功」 */
async function twToggleLike(postId, btn) {
  if (!TW.requireLogin()) return;
  btn.disabled = true;
  const r = await WGOAPI.postLike(postId);
  btn.disabled = false;
  if (r && r.ok) {
    btn.classList.toggle('on', r.liked);
    btn.querySelector('span').textContent = r.liked ? '♥' : '♡';
    const num = btn.querySelector('#twLikeNum') || btn.querySelectorAll('span')[1];
    if (num) num.textContent = r.count;
    return;
  }
  /* 离线兜底：点赞状态存 localStorage */
  const lk = localLikes();
  const on = !lk[postId];
  lk[postId] = on;
  if (!on) delete lk[postId];
  localStorage.setItem('fmw_plikes', JSON.stringify(lk));
  btn.classList.toggle('on', on);
  btn.querySelector('span').textContent = on ? '♥' : '♡';
  const num = btn.querySelector('#twLikeNum') || btn.querySelectorAll('span')[1];
  if (num) num.textContent = Math.max(0, (+num.textContent || 0) + (on ? 1 : -1));
  toast(on ? '已点赞（离线模式，记录在本地）♥' : '已取消点赞');
}

/* 评论：后端在线写 MySQL 并置顶插入；离线时写 localStorage 并标注「本地」 */
async function twSendComment(postId) {
  if (!TW.requireLogin()) return;
  const box = document.getElementById('twCmtInput');
  const content = (box.value || '').trim();
  if (!content) { toast('评论内容不能为空'); return; }
  if (content.length > 500) { toast('评论最多 500 字'); return; }
  const r = await WGOAPI.postComment(postId, content);
  let cmt;
  if (r && r.ok) {
    cmt = r.comment;
    const n = document.getElementById('twCmtNum');
    if (n) n.textContent = r.count;
  } else {
    const me = TW.me();
    cmt = { nick: (me && me.nick ? me.nick : '旅行者') + '（本地）', content: content, createdAt: new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }), likeCount: 0, source: 'local' };
    saveLocalCmt(postId, cmt);
    const n = document.getElementById('twCmtNum');
    if (n) n.textContent = (+n.textContent || 0) + 1;
  }
  box.value = '';
  const list = document.getElementById('twCmtList');
  if (list) {
    const empty = list.querySelector('.tw-empty');
    if (empty) list.innerHTML = '';
    list.insertAdjacentHTML('afterbegin', renderComments([cmt]));
  }
  toast(r && r.ok ? '评论已发布 ✈️' : '评论已发布（离线模式，保存在本地）💬');
}

