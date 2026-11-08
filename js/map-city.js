/* =========================================================
 * WANDERGO · 城市地图（map-city.js）
 * Leaflet 1.9.4 + OSM 底图：城市景点标点 / 点击弹窗 / 图文打卡 / 已打卡换色
 *
 * URL 参数：
 *   ?city=大理           城市名（走 core.js 的 cityCanon 归一，兼容「北京市」写法）
 *   ?spot=erhai          自动定位到该景点并打开弹窗（行程卡 pin 跳转用）
 *   ?ck=1                定位后直接展开打卡表单
 * ========================================================= */
(function () {
  'use strict';

  const q = typeof WGO !== 'undefined' ? WGO.q : (k => new URLSearchParams(location.search).get(k));
  const cityKey = cityCanon(q('city') || '') || '全部';
  const wantSpot = q('spot') || '';
  const openCkNow = q('ck') === '1';

  /* 当前登录用户：core.js 的 user 全局变量，读不到再兜底 localStorage */
  function me() {
    try { if (typeof user !== 'undefined' && user && user.nick) return user; } catch (e) { /* 无 core */ }
    try { return JSON.parse(localStorage.getItem('fmw_user') || 'null'); } catch (e) { return null; }
  }

  const state = {
    city: cityKey,
    spots: [],
    checked: new Set(),      /* 已打卡 spot_id */
    records: [],             /* 本地打卡记录（立即回显，服务端返回后合并） */
    markers: new Map(),      /* spotId -> L.marker */
    map: null,
    layer: null,
    curSpot: null
  };

  /* ---------- 本地打卡缓存：只用于「立即变绿 + 离线可见」，
     正式数据以数据库为准，每次进页面都会从 /api/checkin/* 拉回来覆盖 ---------- */
  const LS_KEY = 'fmw_ck_spots_v2';
  function lsRead() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (e) { return []; }
  }
  function lsWrite(list) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(list.slice(-300))); } catch (e) { /* 配额满忽略 */ }
  }
  function lsOfCity(city) {
    return lsRead().filter(r => cityCanon(r.city) === city);
  }

  /* ---------- 图片压缩：上传前压到 760px / 0.72，控制单条打卡体积 ---------- */
  function downscale(file, cb) {
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const max = 760;
        let w = im.width, h = im.height;
        if (w > max || h > max) {
          const r = Math.min(max / w, max / h);
          w = Math.round(w * r); h = Math.round(h * r);
        }
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(im, 0, 0, w, h);
        cb(cv.toDataURL('image/jpeg', 0.72));
      };
      im.onerror = () => cb('');
      im.src = fr.result;
    };
    fr.onerror = () => cb('');
    fr.readAsDataURL(file);
  }

  /* ---------- 标记图标：普通=金色圆点，已打卡=绿色对勾 ---------- */
  function iconOf(spot, checked) {
    const cls = checked ? 'cm-dot on' : 'cm-dot';
    const ico = checked ? '✓' : '';
    return L.divIcon({
      className: 'cm-ico',
      html: `<span class="${cls}"><i>${ico}</i></span>`,
      iconSize: [30, 38],
      iconAnchor: [15, 34],
      popupAnchor: [0, -30]
    });
  }

  /* ---------- 弹窗内容：名称 / 评分 / 图片 / 打卡按钮 ---------- */
  function popupHtml(s) {
    const ck = state.checked.has(s.id);
    const recs = state.records.filter(r => r.spotId === s.id);
    const last = recs[0];
    return `<div class="cm-pop">
      <div class="cm-pop-img"><img src="${IMG(s.id)}" alt="${s.n}" loading="lazy" referrerpolicy="no-referrer"></div>
      <div class="cm-pop-body">
        <h4>${s.n}${ck ? '<span class="cm-ok">✓ 已打卡</span>' : ''}</h4>
        <div class="cm-pop-meta"><span class="cm-star">⭐ ${s.rating}</span><span>📍 ${s.city}</span><span>${s.tag || ''}</span></div>
        <p class="cm-pop-addr">${s.addr || ''}</p>
        ${last && last.text ? `<p class="cm-pop-last">💬 ${String(last.text).slice(0, 60)}</p>` : ''}
        <div class="cm-pop-btns">
          <button class="cm-btn gold" data-ck="${s.id}">${ck ? '📸 再次打卡' : '📸 打卡'}</button>
          <button class="cm-btn" data-detail="${s.id}">查看详情</button>
        </div>
      </div>
    </div>`;
  }

  function popupOf(s) {
    const pop = L.popup({ maxWidth: 280, minWidth: 250, closeButton: true, autoPanPadding: [30, 30] })
      .setLatLng([s.lat, s.lng])
      .setContent(popupHtml(s));
    return pop;
  }

  /* 弹窗内按钮：用事件委托，避免每次重渲染都重新绑 */
  function bindPopupEvents() {
    state.map.on('popupopen', e => {
      const el = e.popup.getElement();
      if (!el) return;
      el.querySelectorAll('[data-ck]').forEach(b => {
        b.onclick = ev => { ev.stopPropagation(); openCheckin(b.dataset.ck); };
      });
      el.querySelectorAll('[data-detail]').forEach(b => {
        b.onclick = ev => { ev.stopPropagation(); if (typeof openSpot === 'function') openSpot(b.dataset.detail); };
      });
    });
  }

  /* ---------- 标记重绘 ---------- */
  function drawMarkers() {
    if (!state.layer) return;
    state.layer.clearLayers();
    state.markers.clear();
    state.spots.forEach(s => {
      const m = L.marker([s.lat, s.lng], { icon: iconOf(s, state.checked.has(s.id)), title: s.n, riseOnHover: true })
        .bindPopup(popupOf(s))
        .addTo(state.layer);
      state.markers.set(s.id, m);
    });
  }

  function refreshOne(sid) {
    const s = state.spots.find(x => x.id === sid);
    const m = state.markers.get(sid);
    if (!s || !m) return;
    m.setIcon(iconOf(s, state.checked.has(sid)));
    m.setPopupContent(popupHtml(s));
  }

  /* ---------- 地图初始化 ---------- */
  function initMap() {
    const map = L.map('cmMap', {
      zoomControl: true,
      minZoom: 3,
      maxZoom: 18,
      /* 缩放动画：wheelDebounce 让滚轮连续转动时不会每一帧都重排 */
      wheelPxPerZoomLevel: 90,
      wheelDebounceTime: 60,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      preferCanvas: true,
      attributionControl: true
    });
    /* OSM 底图：{s} 子域 + OSM tile 缓存友好的 URL，keepBuffer 让缩小时少白屏 */
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: 'abc',
      keepBuffer: 6,
      updateWhenZooming: false,
      updateWhenIdle: false,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
    }).addTo(map);
    /* 省/市/区边界线：OSM 标准图自带行政边界描边，这里再叠一层
       「城市范围圆 + 中心点」的轻量辅助层，让城市层级一眼可见 */
    state.layer = L.layerGroup().addTo(map);
    state.map = map;
    bindPopupEvents();
    /* 窗口尺寸变化时 Leaflet 必须 invalidateSize，否则右侧出现灰边 */
    window.addEventListener('resize', () => map.invalidateSize());
    return map;
  }

  function fitCity() {
    if (!state.spots.length) return;
    if (state.spots.length === 1) {
      state.map.setView([state.spots[0].lat, state.spots[0].lng], 12, { animate: true });
      return;
    }
    const b = L.latLngBounds(state.spots.map(s => [s.lat, s.lng]));
    state.map.fitBounds(b, { padding: [40, 40], maxZoom: 13, animate: true });
  }

  /* ---------- 左侧景点列表 ---------- */
  function renderList() {
    const box = document.getElementById('cmList');
    if (!box) return;
    if (!state.spots.length) {
      box.innerHTML = `<div class="cm-empty">这个城市暂时没有景点数据<br><span>换一个城市试试</span></div>`;
      return;
    }
    box.innerHTML = state.spots.map(s => {
      const ck = state.checked.has(s.id);
      return `<div class="cm-li${ck ? ' on' : ''}" data-go="${s.id}">
        <div class="cm-li-no${ck ? ' on' : ''}">${ck ? '✓' : ''}</div>
        <div class="cm-li-tx"><b>${s.n}</b><span>⭐ ${s.rating} · ${s.tag || s.hrs || ''}</span></div>
        <button class="cm-li-ck" data-ck="${s.id}">打卡</button>
      </div>`;
    }).join('');
    box.querySelectorAll('[data-go]').forEach(el => {
      el.onclick = e => {
        if (e.target.closest('[data-ck]')) return;
        focusSpot(el.dataset.go);
      };
    });
    box.querySelectorAll('[data-ck]').forEach(b => {
      b.onclick = e => { e.stopPropagation(); openCheckin(b.dataset.ck); };
    });
  }

  function focusSpot(sid) {
    const s = state.spots.find(x => x.id === sid);
    const m = state.markers.get(sid);
    if (!s || !m) return;
    state.map.flyTo([s.lat, s.lng], Math.max(state.map.getZoom(), 13), { duration: 0.7 });
    m.openPopup();
    const li = document.querySelector(`.cm-li[data-go="${sid}"]`);
    if (li) { li.classList.add('hot'); setTimeout(() => li.classList.remove('hot'), 1200); li.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }

  /* ---------- 打卡表单 ---------- */
  let ckImgs = [];
  function openCheckin(sid) {
    const s = state.spots.find(x => x.id === sid);
    if (!s) return;
    const u = me();
    ckImgs = [];
    const html = `<button class="mx" onclick="closeModal()">✕</button>
      <div class="cm-ck">
        <div class="cm-ck-hero"><img src="${IMG(s.id)}" alt="${s.n}" referrerpolicy="no-referrer">
          <div><h3>${s.n}</h3><p>📍 ${s.city} · ⭐ ${s.rating}</p></div></div>
        <div class="cm-ck-row">
          <label>打卡人</label>
          <input id="ckNick" maxlength="20" value="${u && u.nick ? String(u.nick).replace(/"/g, '&quot;') : ''}" placeholder="旅行者">
        </div>
        <div class="cm-ck-row">
          <label>本次评分</label>
          <div class="cm-stars" id="ckStars">${[1, 2, 3, 4, 5].map(i => `<button type="button" data-v="${i}">★</button>`).join('')}</div>
        </div>
        <div class="cm-ck-row">
          <label>打卡内容</label>
          <textarea id="ckText" maxlength="300" placeholder="这次最难忘的瞬间……（最多 300 字）"></textarea>
        </div>
        <div class="cm-ck-row">
          <label>打卡图片</label>
          <div class="cm-ck-imgs" id="ckImgs">
            <label class="cm-ck-add">＋<input type="file" accept="image/*" multiple hidden id="ckFile"></label>
          </div>
          <p class="cm-ck-tip">最多 4 张，前端压到 760px 后直接存数据库</p>
        </div>
        <div class="cm-ck-foot">
          <span id="ckMsg"></span>
          <button class="btn gold" id="ckSubmit">提交打卡</button>
        </div>
      </div>`;
    openModal(html);
    /* 星级 */
    let rating = 5;
    const stars = document.getElementById('ckStars');
    const paintStars = () => [...stars.children].forEach(b => b.classList.toggle('on', +b.dataset.v <= rating));
    [...stars.children].forEach(b => { b.onclick = () => { rating = +b.dataset.v; paintStars(); }; });
    paintStars();
    /* 选图 */
    document.getElementById('ckFile').onchange = e => {
      const files = [...e.target.files].slice(0, 4 - ckImgs.length);
      files.forEach(f => downscale(f, url => {
        if (!url || ckImgs.length >= 4) return;
        ckImgs.push(url);
        renderCkImgs();
      }));
      e.target.value = '';
    };
    renderCkImgs();
    document.getElementById('ckSubmit').onclick = () => submitCheckin(s, rating);
  }

  function renderCkImgs() {
    const box = document.getElementById('ckImgs');
    if (!box) return;
    box.querySelectorAll('.cm-ck-th').forEach(n => n.remove());
    ckImgs.forEach((u, i) => {
      const d = document.createElement('div');
      d.className = 'cm-ck-th';
      d.innerHTML = `<img src="${u}" alt=""><span data-i="${i}">✕</span>`;
      d.querySelector('span').onclick = () => { ckImgs.splice(i, 1); renderCkImgs(); };
      box.insertBefore(d, box.querySelector('.cm-ck-add'));
    });
    box.querySelector('.cm-ck-add').style.display = ckImgs.length >= 4 ? 'none' : '';
  }

  async function submitCheckin(s, rating) {
    const nickEl = document.getElementById('ckNick');
    const textEl = document.getElementById('ckText');
    const msg = document.getElementById('ckMsg');
    const btn = document.getElementById('ckSubmit');
    const nick = (nickEl.value || '').trim() || '旅行者';
    const text = (textEl.value || '').trim();
    if (!text && !ckImgs.length) { msg.textContent = '写点文字或传张图吧'; return; }
    btn.disabled = true; btn.textContent = '提交中…';
    msg.textContent = '';
    const rec = {
      spotId: s.id, spot: s.n, city: state.city,
      user: nick, content: text, rating, imgs: ckImgs.slice(),
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    /* 先本地落一份，保证断网 / 后端冷启动时也能立刻看到绿色对勾 */
    const ls = lsRead(); ls.push(rec); lsWrite(ls);
    state.checked.add(s.id);
    state.records.unshift(rec);
    refreshOne(s.id);
    renderList();
    renderWall();
    renderStat();

    let ok = false;
    try {
      const r = await WGOAPI.postCheckin({
        user: nick, city: state.city, cityName: state.city, spot: s.n, spotId: s.id,
        content: text, rating, imgs: rec.imgs, source: 'map-city'
      });
      ok = !!(r && r.ok);
    } catch (e) { ok = false; }
    btn.disabled = false; btn.textContent = '提交打卡';
    if (ok) {
      if (typeof closeModal === 'function') closeModal();
      if (typeof toast === 'function') toast('打卡成功 ✓ 已记录到「' + s.n + '」');
      loadServerRecords();
    } else {
      msg.textContent = '后端暂时不可达，已先存本机，稍后可再试';
      if (typeof toast === 'function') toast('已本地保存，后端未连通');
    }
  }

  /* 顶部统计：已打卡 x / 总景点 y */
  function renderStat() {
    const el = document.getElementById('cmStat');
    if (el) el.textContent = `已打卡 ${state.checked.size} / ${state.spots.length} 处`;
  }

  /* ---------- 打卡记录墙 ---------- */
  function renderWall() {
    const box = document.getElementById('cmWall');
    if (!box) return;
    const list = state.records.slice(0, 30);
    if (!list.length) {
      box.innerHTML = `<div class="cm-empty small">还没有打卡记录<br><span>点地图上的标记开始打卡</span></div>`;
      return;
    }
    box.innerHTML = list.map(r => {
      const spot = state.spots.find(s => s.id === r.spotId);
      const cover = (r.imgs && r.imgs[0]) || '';
      return `<div class="cm-wall-i">
        ${cover ? `<img src="${cover}" alt="" loading="lazy">` : `<div class="cm-wall-no">📸</div>`}
        <div class="cm-wall-tx">
          <b>${r.user || '旅行者'} <i>打卡了</i> ${spot ? spot.n : r.spot}</b>
          <p>${String(r.content || '').slice(0, 50) || '（无文字）'}</p>
          <span>${'★'.repeat(Math.round(r.rating || 0))} · ${(r.createdAt || '').slice(5, 16)}</span>
        </div>
      </div>`;
    }).join('');
  }

  /* ---------- 服务端数据：覆盖本地缓存（数据库是唯一权威） ---------- */
  async function loadServerRecords() {
    try {
      const r = await WGOAPI.checkinsByCity(state.city);
      if (r && r.ok && Array.isArray(r.list)) {
        /* 服务端有记录就用它作为主数据，本地未上报成功的再补进来 */
        const ids = new Set(r.list.map(x => x.spotId));
        const localOnly = lsOfCity(state.city).filter(x => !ids.has(x.spotId) && !r.list.some(y => y.spot === x.spot && y.content === x.content));
        state.records = r.list.concat(localOnly);
        state.checked = new Set(state.records.map(x => x.spotId).filter(Boolean));
        drawMarkers(); renderList(); renderWall(); renderStat();
      }
    } catch (e) { /* 离线：保留本地数据 */ }
    /* 补一次「我的打卡」：别的城市打卡过的也会在切换城市后变绿 */
    try {
      const u = me();
      const r2 = await WGOAPI.myCheckinSpots(u && u.nick ? u.nick : '');
      if (r2 && r2.ok && Array.isArray(r2.list)) {
        r2.list.forEach(id => state.checked.add(id));
        drawMarkers(); renderList(); renderWall(); renderStat();
      }
    } catch (e) { /* 忽略 */ }
  }

  /* ---------- 城市切换 ---------- */
  function setupCitySwitch() {
    const sel = document.getElementById('cmCity');
    if (!sel) return;
    const cities = allCities();
    sel.innerHTML = cities.map(c => `<option value="${c.city}"${c.city === state.city ? ' selected' : ''}>${c.city}（${c.count}）</option>`).join('');
    sel.onchange = () => {
      const sp = q('spot');
      const url = 'map-city.html?city=' + encodeURIComponent(sel.value);
      location.href = url;
    };
  }

  /* ---------- 启动 ---------- */
  function boot() {
    const all = typeof SPOTS !== 'undefined' ? SPOTS : [];
    if (state.city === '全部') {
      /* 没传 city：默认落在景点最多的城市，保证首屏一定有内容 */
      const first = allCities()[0];
      state.city = first ? first.city : '';
    }
    state.spots = all.filter(s => cityCanon(s.city) === state.city && typeof s.lat === 'number' && typeof s.lng === 'number');

    const title = document.getElementById('cmTitle');
    if (title) title.textContent = state.city || '城市';
    const sub = document.getElementById('cmSub');
    if (sub) sub.textContent = `${state.spots.length} 个景点 · 点击标记查看详情并打卡`;
    document.title = (state.city || '城市') + '地图 · WANDERGO';

    /* 左侧 Tab：景点列表 / 打卡记录墙 */
    document.querySelectorAll('.cm-tabs [data-tab]').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.cm-tabs [data-tab]').forEach(b => b.classList.toggle('on', b === btn));
        const wall = btn.dataset.tab === 'wall';
        document.getElementById('cmList').style.display = wall ? 'none' : '';
        document.getElementById('cmWall').style.display = wall ? '' : 'none';
      };
    });

    /* 本地缓存先上色，服务端数据随后覆盖 */
    const local = lsOfCity(state.city);
    state.records = local.slice().reverse();
    state.checked = new Set(local.map(r => r.spotId).filter(Boolean));

    initMap();
    drawMarkers();
    renderList();
    renderWall();
    fitCity();

    renderStat();
    setupCitySwitch();

    if (wantSpot) {
      setTimeout(() => {
        focusSpot(wantSpot);
        if (openCkNow) setTimeout(() => openCheckin(wantSpot), 900);
      }, 300);
    }
    loadServerRecords();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
