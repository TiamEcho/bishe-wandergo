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

/* ---------------- 帖子详情弹窗 ---------------- */
async function openDbPost(id) {
  const me = TW.me();
  const nick = me ? me.nick : '';
  const r = await WGOAPI.postDetail(id, nick);
  if (!r || !r.ok) { toast((r && r.msg) || '帖子加载失败，请确认后端已启动'); return; }
  const p = r.post;
  const pl = TW.platOf(p);
  const cover = TW.cover(p);
  const bv = TW.bvid(p.videoUrl || p.sourceUrl);
  const topicChips = (p.topics || '').split(',').filter(Boolean)
    .map(c => `<span class="tw-chip" onclick="closeModal();setTimeout(()=>WGO.go('topic.html',{id:'${TW.esc(c)}'}),160)"># ${TW.esc((window.TW_TOPIC_NAMES || {})[c] || c)}</span>`).join('');
  const bgm = TW.bgmName(p.bgm);

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
      ${videoBlock}
      <div class="tw-detail-acts">
        <button class="tw-like-btn ${r.liked ? 'on' : ''}" id="twLikeBtn" onclick="twToggleLike(${p.id},this)">
          <span>${r.liked ? '♥' : '♡'}</span><span id="twLikeNum">${p.likeCount || 0}</span>
        </button>
        <span style="font-size:12px;color:var(--muted)">💬 <b id="twCmtNum">${p.commentCount || 0}</b> 条讨论</span>
        ${p.sourceUrl ? `<a class="tw-src-link" href="${TW.esc(p.sourceUrl)}" target="_blank" rel="noopener">↗ 在原平台查看</a>` : ''}
        ${p.spotId ? `<button class="tw-btn ghost sm" onclick="closeModal();setTimeout(()=>WGO.go('map.html',{spot:'${TW.esc(p.spotId)}'}),160)">🗺 地图查看</button>` : ''}
      </div>
      <div class="tw-cmt-head">💬 讨论区 <span style="font-size:11px;color:var(--muted);font-weight:500">站内评论 + 平台真实评论</span></div>
      <div class="tw-cmt-box">
        <textarea id="twCmtInput" maxlength="500" placeholder="说点什么… 你的经验会成为别人的攻略"></textarea>
        <button class="tw-btn gold sm" onclick="twSendComment(${p.id})">发布</button>
      </div>
      <div class="tw-cmt-list" id="twCmtList">${renderComments(r.comments || [])}</div>
      <p class="src-note" style="margin-top:14px">${p.source === 'bilibili'
        ? '📺 本条 Vlog 与评论由后端爬虫通过 B 站公开接口抓取，保留原始链接可溯源；不下载视频、不抓取私密数据。'
        : '✈️ 本条内容由站内用户发布，评论实时写入 MySQL。'}</p>
    </div>`, true);
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

/* 点赞：先写库再改 UI，失败则回滚，不做「假点赞」 */
async function twToggleLike(postId, btn) {
  if (!TW.requireLogin()) return;
  btn.disabled = true;
  const r = await WGOAPI.postLike(postId);
  btn.disabled = false;
  if (!r || !r.ok) { toast((r && r.msg) || '点赞失败，请确认后端已启动'); return; }
  btn.classList.toggle('on', r.liked);
  btn.querySelector('span').textContent = r.liked ? '♥' : '♡';
  const num = btn.querySelector('#twLikeNum') || btn.querySelectorAll('span')[1];
  if (num) num.textContent = r.count;
}

/* 评论：成功后直接插到列表顶部并同步计数，不用整页重载 */
async function twSendComment(postId) {
  if (!TW.requireLogin()) return;
  const box = document.getElementById('twCmtInput');
  const content = (box.value || '').trim();
  if (!content) { toast('评论内容不能为空'); return; }
  if (content.length > 500) { toast('评论最多 500 字'); return; }
  const r = await WGOAPI.postComment(postId, content);
  if (!r || !r.ok) { toast((r && r.msg) || '评论失败，请确认后端已启动'); return; }
  box.value = '';
  const list = document.getElementById('twCmtList');
  if (list) {
    const empty = list.querySelector('.tw-empty');
    if (empty) list.innerHTML = '';
    list.insertAdjacentHTML('afterbegin', renderComments([r.comment]));
  }
  const n = document.getElementById('twCmtNum');
  if (n) n.textContent = r.count;
  toast('评论已发布 ✈️');
}
