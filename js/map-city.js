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
    border: null,            /* {prov, city, dist} 三级行政边界图层 */
    cityCode: '',            /* 当前城市对应的地级市 adcode，用于加载区县切片 */
    showBorders: true,
    curSpot: null
  };

  /* 当前城市 -> 地级市 adcode（geo/manifest.js 里的 alias，键与 CITY_ALIAS 一致） */
  function cityCodeOf(city) {
    const idx = window.GEO_INDEX || {};
    return (idx.alias && idx.alias[city]) ? String(idx.alias[city]) : '';
  }

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
      minZoom: 4,
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
    /* 行政边界分三层，按当前缩放级别切换显示：
         z<=5  省界      z6-8  地级市界      z>=9  区县界（聚焦城市时加载切片）
       Canvas 渲染 + 只在缩放结束后重绘，避免滚轮过程中卡顿 */
    state.border = {
      prov: L.layerGroup().addTo(map),
      city: L.layerGroup(),
      dist: L.layerGroup()
    };
    state.layer = L.layerGroup().addTo(map);
    state.map = map;
    bindPopupEvents();
    map.on('zoomend moveend', scheduleBorders);
    /* 窗口尺寸变化时 Leaflet 必须 invalidateSize，否则右侧出现灰边 */
    window.addEventListener('resize', () => { map.invalidateSize(); redrawBorders(); });
    return map;
  }

  /* ---------- 行政边界图层 ---------- */
  const borderStyle = level => level === 'prov'
    ? { color: '#C98A2E', weight: 1.6, opacity: 0.75, fill: false, interactive: false }
    : level === 'city'
      ? { color: '#C98A2E', weight: 1.3, opacity: 0.6, fill: false, interactive: false }
      : { color: '#8FB7D9', weight: 0.9, opacity: 0.55, dashArray: '4 3', fill: false, interactive: false };

  /* 三级边界共用同一个 Canvas renderer：新建的 renderer 在图层组未挂到地图时
     不会参与 setSize/redraw，会画成空白。共用 + 挂图后手动 redraw 最稳。 */
  let borderRenderer = null;
  /* L.Canvas 没有公开的 redraw()，重绘走内部的 _redraw（Leaflet 1.9.4 实测存在） */
  function redrawBorders() {
    if (borderRenderer && typeof borderRenderer._redraw === 'function') borderRenderer._redraw();
  }
  function addGeoJSON(group, fc, level, tooltip) {
    if (!borderRenderer) borderRenderer = L.canvas({ padding: 0.4, tolerance: 6 }).addTo(state.map);
    const made = L.geoJSON(fc, {
      style: () => borderStyle(level),
      renderer: borderRenderer,
      onEachFeature: (f, layer) => {
        if (tooltip && f.properties && f.properties.name) layer.bindTooltip(f.properties.name, { sticky: true, className: 'cm-btip' });
      }
    }).addTo(group);
    /* 图层组可能处于「未加入地图」状态，加入后统一重绘 */
    if (state.map.hasLayer(group)) redrawBorders();
    else group.once('add', () => setTimeout(redrawBorders, 30));
    return made;
  }

  /* 全国省级 / 地级市边界：随页面按需加载，只加载一次 */
  const liteLoaded = { prov: false, city: false, national: false };
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => res();
      s.onerror = () => rej(new Error(src));
      document.head.appendChild(s);
    });
  }
  let nationPromise = null;
  function loadNational() {
    if (nationPromise) return nationPromise;
    nationPromise = Promise.all([
      loadScript('geo/china-provinces.js?v=1170'),
      loadScript('geo/china-cities.js?v=1170')
    ]).then(() => {
      const prov = window.GEO_PROVINCES || [];
      const cities = window.GEO_CITIES || [];
      /* 省界与地级市界直接用各自的完整多边形，样式区分层级 */
      addGeoJSON(state.border.prov, { type: 'FeatureCollection', features: prov.map(p => ({ type: 'Feature', properties: { name: p.n }, geometry: p.g })) }, 'prov', true);
      addGeoJSON(state.border.city, { type: 'FeatureCollection', features: cities.filter(c => c.g).map(c => ({ type: 'Feature', properties: { name: c.n }, geometry: c.g })) }, 'city', true);
      liteLoaded.national = true;
      applyBorders();
    });
    return nationPromise;
  }

  /* 当前城市的切片：该市 & 同省邻市边界 + 该市区县边界 */
  let slicePromise = null, sliceKey = '';
  function loadSlice(code) {
    if (sliceKey === code && slicePromise) return slicePromise;
    sliceKey = code;
    state.border.dist.clearLayers();
    slicePromise = loadScript('geo/cities/' + code + '.js?v=1170').then(() => {
      const sl = window.GEO_SLICE;
      if (!sl || sl.c !== code) return;
      /* 全国层没加载完成时，用切片里的同省城市先顶上 */
      if (!liteLoaded.national && !state.border.city.getLayers().length) {
        addGeoJSON(state.border.city, { type: 'FeatureCollection', features: (sl.cities || []).map(c => ({ type: 'Feature', properties: { name: c.n }, geometry: c.g })) }, 'city', true);
      }
      addGeoJSON(state.border.dist, { type: 'FeatureCollection', features: (sl.districts || []).map(d => ({ type: 'Feature', properties: { name: d.n }, geometry: d.g })) }, 'dist', true);
      scheduleBorders();
    }).catch(() => { });
    return slicePromise;
  }

  /* 按缩放级别切换显示哪一层；防抖，滚轮过程中不重绘 */
  let borderTimer = 0;
  function scheduleBorders() {
    clearTimeout(borderTimer);
    borderTimer = setTimeout(applyBorders, 160);
  }
  function applyBorders() {
    if (!state.map || !state.border) return;
    const z = state.map.getZoom();
    const on = state.showBorders;
    const prov = state.border.prov, city = state.border.city, dist = state.border.dist;
    const wantProv = on && z <= 7;
    const wantCity = on && z >= 6 && z <= 10;
    const wantDist = on && z >= 9;
    [[prov, wantProv], [city, wantCity], [dist, wantDist]].forEach(([g, w]) => {
      if (w && !state.map.hasLayer(g)) g.addTo(state.map);
      if (!w && state.map.hasLayer(g)) state.map.removeLayer(g);
    });
    if (borderRenderer) redrawBorders();
    /* 级联加载：任何级别都需要省界底图，落到城市级时补全国地级市 */
    if (on && (wantProv || wantCity || wantDist) && !liteLoaded.prov) loadNational();
    if (on && wantCity && !liteLoaded.national) loadNational();
    if (on && wantDist && state.cityCode) loadSlice(state.cityCode);

    const tag = document.getElementById('cmZoomTag');
    if (tag) {
      const lv = z <= 5 ? '省域视图' : z <= 8 ? '城市视图' : z <= 11 ? '区县视图' : '街区视图';
      tag.textContent = lv + ' · z' + z.toFixed(z % 1 ? 1 : 0);
    }
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
    /* 先本地落一份，保证断网 / 后端冷启动时也能立刻看到绿色对勾
       注意：lsRead 是「全部城市」的记录，追加后整体写回，不能只写当前城市的新记录 */
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
        /* 服务端有记录就用它作为主数据；本地那些「没上报成功」的再补进来。
           按 spotId + 正文双重比对，避免把同景点多次打卡的本地记录误删 */
        const key = x => `${x.spotId}|${String(x.content || '').trim()}`;
        const seen = new Set(r.list.map(key));
        const localOnly = lsOfCity(state.city).filter(x => !seen.has(key(x)));
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

  /* ---------- 图层开关：行政边界 / 景点标记 ---------- */
  function setupLayerToggles() {
    const b = document.getElementById('cmBorders');
    if (b) b.onchange = () => { state.showBorders = b.checked; applyBorders(); };
    const s = document.getElementById('cmSpots');
    if (s) s.onchange = () => {
      if (!state.layer) return;
      if (s.checked) { if (!state.map.hasLayer(state.layer)) state.layer.addTo(state.map); }
      else if (state.map.hasLayer(state.layer)) state.map.removeLayer(state.layer);
    };
  }

  /* ---------- 城市切换 ---------- */
  function setupCitySwitch() {
    const sel = document.getElementById('cmCity');
    if (!sel) return;
    if (sel.options.length !== allCities().length) {
      const cities = allCities();
      sel.innerHTML = cities.map(c => `<option value="${c.city}"${c.city === state.city ? ' selected' : ''}>${c.city}（${c.count}）</option>`).join('');
    } else {
      sel.value = state.city;
    }
    sel.onchange = () => {
      location.href = 'map-city.html?city=' + encodeURIComponent(sel.value);
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
    state.cityCode = cityCodeOf(state.city);

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
    setupLayerToggles();
    applyBorders();

    findSpot();
    loadServerRecords();
  }

  /* ---------- 深度链接：?spot= 自动定位 ---------- */
  function findSpot() {
    if (!wantSpot) return;
    /* 目标景点不在当前城市（城市名写法不同）时，按 spot id 反查真实城市再加载 */
    if (!state.spots.some(s => s.id === wantSpot)) {
      const all = typeof SPOTS !== 'undefined' ? SPOTS : [];
      const hit = all.find(s => s.id === wantSpot);
      if (hit) {
        const ck = cityCanon(hit.city);
        state.city = ck;
        state.cityCode = cityCodeOf(ck);
        state.spots = all.filter(s => cityCanon(s.city) === ck && typeof s.lat === 'number' && typeof s.lng === 'number');
        const title = document.getElementById('cmTitle');
        if (title) title.textContent = ck;
        const sel = document.getElementById('cmCity');
        if (sel) sel.value = ck;
        clearMarkers();
        drawMarkers();
        renderList();
        renderWall();
        renderStat();
        fitCity();
      }
    }
    setTimeout(() => {
      focusSpot(wantSpot);
      if (openCkNow) setTimeout(() => openCheckin(wantSpot), 900);
    }, 300);
  }

  /* 清空标记，避免切换城市后残留上一个城市的点 */
  function clearMarkers() {
    if (!state.layer) return;
    state.layer.clearLayers();
    state.markers.clear();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
