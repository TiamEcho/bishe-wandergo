/* =========================================================
 * WANDERGO PLATFORM · AI 旅行规划 ai.js
 * 模块化输出 + 每模块可点开详情 + 交通可视化图表 + 平台比价跳转
 * + 路线图（按 Day 分色）+ 雨天/疲惫备案 + 老人小孩注意事项
 * ========================================================= */
function matchPlan(q){
  for(const k in PLANS){if(q.includes(k))return PLANS[k]}
  const hit=SPOTS.find(s=>q.includes(s.n)||q.includes(s.city));
  if(hit){const base=PLANS['大理'];return {...base,dest:hit.city+' · '+hit.n,days:'2-3 天',routeDays:[[hit.id]],spots:[hit.id,...base.spots.filter(i=>i!==hit.id).slice(0,2)]}}
  return null;
}
/* ---- ECharts 引擎按需加载（AI 页首次用到时自动加载，加载完统一回调） ---- */
let __ecQ=null;
function ensureECharts(cb){
  if(window.echarts)return cb(true);
  if(__ecQ){__ecQ.push(cb);return}
  __ecQ=[cb];
  loadECharts(ok=>{const q=__ecQ;__ecQ=null;q.forEach(f=>f(ok))});
}
/* ---- 城市锚点硬坐标（用于 POI_ROUTE fallback 坐标的区域修正） ---- */
const POI_ANCHORS={
 '大理':[100.164,25.680],
 '九寨':[103.918,33.262],
 '日本':[135.768,34.974],   /* 京都 */
 '巴黎':[2.352,48.857],
 '冰岛':[-21.940,64.147],   /* 雷克雅未克 */
 '三亚':[109.508,18.247],
 '张家界':[110.479,29.119],
 '清迈':[98.985,18.788],
 '马尔代夫':[73.510,4.200]
};
function fixPOIRoute(route){
  if(!route)return;
  for(const k in route){
    const arr=route[k];if(!Array.isArray(arr)||!arr.length)continue;
    const anc=POI_ANCHORS[k];if(!anc)continue;
    /* 把所有 POI 平移到锚点区域（保持 md5 偏移的相对关系） */
    const cur={lng:0,lat:0},n={lng:0,lat:0};
    arr.forEach(p=>{cur.lng+=p.lng;cur.lat+=p.lat});
    cur.lng/=arr.length;cur.lat/=arr.length;
    const dLng=anc[0]-cur.lng,dLat=anc[1]-cur.lat;
    arr.forEach(p=>{p.lng=+((p.lng+dLng).toFixed(4));p.lat=+((p.lat+dLat).toFixed(4))});
  }
}
fixPOIRoute(window.POI_ROUTE);
function planKeyOf(p){for(const k in PLANS)if(PLANS[k]===p)return k;return ''}
function runAI(q){
  q=(q||'').trim();if(!q)return toast('先告诉 AI 你想去哪儿吧 ✍️');
  window.scrollTo({top:$('.ai-hero-box').getBoundingClientRect().top+window.scrollY-90,behavior:'smooth'});
  const pipe=$('#pipeline');pipe.classList.add('show');
  const steps=$$('.step');steps.forEach(s=>s.classList.remove('doing','done'));
  $('#modGrid').classList.remove('show');$('#planHead').classList.remove('show');
  let p=0;$('#pipeBar').style.width='4%';
  const total=2600,seg=total/4;let si=0;
  const t1=setInterval(()=>{
    if(si>0&&steps[si-1]){steps[si-1].classList.remove('doing');steps[si-1].classList.add('done')}
    if(si<4){steps[si].classList.add('doing');p=Math.min(97,(si+1)/4*96);$('#pipeBar').style.width=p+'%';si++}
    else{clearInterval(t1);steps[3].classList.remove('doing');steps[3].classList.add('done');$('#pipeBar').style.width='100%';setTimeout(()=>{pipe.classList.remove('show');showPlan(matchPlan(q))},420)}
  },seg);
}
$('#aiGo').onclick=()=>runAI($('#aiInput').value);
$('#aiInput').addEventListener('keydown',e=>{if(e.key==='Enter')runAI(e.target.value)});
$$('#aiChips button').forEach(b=>b.onclick=()=>{$('#aiInput').value=b.textContent;runAI(b.textContent)});
function planRoute(plan){
  /* 由 routeDays 生成路线数据（每日不同颜色，首点打旗标） */
  const segs=(plan.routeDays||[plan.spots.slice(0,1)]).map((ids,di)=>({
    day:di+1,points:ids.map(id=>spotById(id)).filter(Boolean).map(s=>({id:s.id,lng:s.lng,lat:s.lat,n:s.n}))
  })).filter(sg=>sg.points.length);
  return segs;
}
function showPlan(plan){
  const grid=$('#modGrid');
  if(!plan){grid.classList.add('show');grid.innerHTML='<div class="mod col-12">暂未收录该目的地，试试：大理 / 张家界 / 成都九寨 / 日本 / 清迈 / 巴黎 / 冰岛 / 马尔代夫 / 三亚，或点击地图上的景点让 AI 规划 ✨</div>';$('#planHead').classList.remove('show');return}
  $('#planHead').innerHTML=`<div class="t">🧩 AI 已为你规划 · <b>${plan.dest}</b> · ${plan.days} · 出发地 <b>${plan.from||'你的城市'}</b> · 参考预算 <b>${fmt(plan.budget)}</b></div><button class="btn line" onclick="document.getElementById('aiInput').focus()">换个问法重新规划</button>`;
  $('#planHead').classList.add('show');
  const dcs=['#e7c76d','#7ea6d9','#6cc47a','#e58fb1','#9a86d9'];
  let bg='';plan.budgetItems.forEach((b,i)=>bg+=`--dc${i+1}:${dcs[i]};`);
  grid.innerHTML=`
  <div class="mod col-12 clickable" style="animation-delay:.05s" onclick="openMod('spots','${plan.dest}')">
    <h4><span class="mi">🏞</span>景点推荐（含图标分析）<span class="go">查看详情 →</span></h4>
    <div class="spot-mini-list">${plan.spots.map(id=>{const s=spotById(id);if(!s)return'';return `<div class="spot-mini" onclick="event.stopPropagation();openSpot('${s.id}')"><img src="${IMG(P[s.id])}" loading="lazy"><div><h5>${s.n}</h5><div class="city">${s.city} · ${s.tag}</div><div class="icon-chips"><span class="hl">⭐${s.rating}</span><span>💰${s.price}</span><span>⏱${s.hrs}</span><span>🚄${s.traf.split('（')[0]}</span><span>👫 情侣友好</span><span>🎒 背包友好</span></div></div></div>`}).join('')}</div>
  </div>
  <div class="mod col-12" style="animation-delay:.1s">
    <h4><span class="mi">🗺</span>行程路线图 · 白底蓝线 · 区域聚焦<span class="go">景点 + 住宿 + 美食 一线串联</span></h4>
    <div class="rt-toolbar">
      <div class="rt-modes" id="rtModes"></div>
      <div class="rt-meta" id="rtMeta"></div>
    </div>
    <div id="aiRouteMap" class="route-map-box lite"></div>
    <div class="rt-legend">
      <span><i class="rdot" style="background:#3a7bfd"></i>行程路线（起 / 序号 / 终 = 游览顺序）</span>
      <span><i class="rdot" style="background:#ff8a3d"></i>🏨 住宿</span>
      <span><i class="rdot" style="background:#22b573"></i>🍜 美食</span>
      <span>🖱 滚轮缩放 · 可拖拽 · 悬停看详情</span>
    </div>
    <div class="rt-food">
      <div class="rt-food-head">🍜 你最喜欢吃啥？选个口味，地图把这类店点亮给你</div>
      <div class="food-chips" id="foodChips"></div>
      <div class="rt-food-hit" id="foodHit"></div>
    </div>
    <div class="rt-cmts">
      <div class="rt-food-head">💬 评论区留言 · 这条路线靠不靠谱，你说了算</div>
      <div class="cmt-list" id="cmtList"></div>
      <div class="cmt-form"><input id="cmtInput" maxlength="120" placeholder="写下你的建议、想吃的东西或私藏点位…"><button class="btn gold" id="cmtSend" type="button">发布</button></div>
    </div>
  </div>
  <div class="mod col-6 clickable" style="animation-delay:.15s" onclick="openMod('transport','${plan.dest}')">
    <h4><span class="mi">🚄</span>出行方式 · 可视化对比<span class="go">图表 + 平台比价 →</span></h4>
    ${plan.transport.map(t=>`<div class="trow"><span class="tm">${t.m}</span><div><div class="bar"><i style="width:${t.s*100}%"></i></div><div style="font-size:10.5px;color:var(--muted);margin-top:2px">${t.note} · 约 ${t.t}</div></div><span class="tp">${t.p}</span></div>`).join('')}
  </div>
  <div class="mod col-6 clickable" style="animation-delay:.25s" onclick="openMod('budget','${plan.dest}')" >
    <h4><span class="mi">💰</span>价格规划<span class="go">查看明细 →</span></h4>
    <div class="donut-row" style="${bg}">
      <div class="donut"><b>${fmt(plan.budget).replace('¥ ','¥')}<i>总预算</i></b></div>
      <div class="dlegend">${plan.budgetItems.map(b=>`<div class="li"><span><i style="background:var(${b.c})"></i>${b.k}</span><span>${fmt(b.v)}</span></div>`).join('')}</div>
    </div>
  </div>
  <div class="mod col-6 clickable" style="animation-delay:.3s" onclick="openMod('planb','${plan.dest}')">
    <h4><span class="mi">☔</span>行程备案 · 雨天 / 累了怎么办<span class="go">查看备案 →</span></h4>
    <div class="planb-tags"><span>🌧 下雨备案</span><span>☕ 休息点</span><span>🛋 犯懒方案</span></div>
    <div class="mod-blist"><div><b>下雨：</b>${plan.planB.rain.slice(0,42)}…</div><div><b>累了：</b>${plan.planB.rest.slice(0,42)}…</div></div>
  </div>
  <div class="mod col-6 clickable" style="animation-delay:.35s" onclick="openMod('crowd','${plan.dest}')">
    <h4><span class="mi">👪</span>同行人群注意 · 老人 / 小孩 / 情侣<span class="go">查看提示 →</span></h4>
    <div class="mod-blist"><div><b>👶 小孩：</b>${plan.crowd.kid.slice(0,40)}…</div><div><b>👵 老人：</b>${plan.crowd.elder.slice(0,40)}…</div><div><b>💑 情侣：</b>${plan.crowd.couple.slice(0,40)}…</div></div>
  </div>
  <div class="mod col-6 clickable" style="animation-delay:.45s" onclick="openMod('video','${plan.dest}')">
    <h4><span class="mi">🎬</span>打卡视频推荐 · 带 BGM<span class="go">查看详情 →</span></h4>
    <div class="vcards">${plan.videos.map((v,i)=>`<div class="vcard" onclick="event.stopPropagation();openVideo({t:'${v.t}',loc:'${v.loc}',imgs:['${v.imgs.join("','")}'],bgm:'${v.bgm}'})"><img src="${IMG(P[v.imgs[0]])}" loading="lazy"><span class="play"><i>▶</i></span><span class="vtag">♪ BGM</span><div class="vfoot"><h6>${v.t}</h6><p>📍 ${v.loc}</p></div></div>`).join('')}</div>
  </div>
  <div class="mod col-6 clickable" style="animation-delay:.55s" onclick="openMod('plog','${plan.dest}')">
    <h4><span class="mi">📷</span>Plog 推荐<span class="go">查看详情 →</span></h4>
    <div class="vcards">${plan.plogs.map(v=>`<div class="vcard" onclick="event.stopPropagation();openPlog('${v.t}','${plan.dest}','${v.img}','${encodeURIComponent(v.txt)}')"><img src="${IMG(P[v.img])}" loading="lazy"><div class="vfoot"><h6>${v.t}</h6><p>📍 ${plan.dest}</p></div></div>`).join('')}</div>
  </div>
  <div class="mod col-12" style="animation-delay:.6s;border-style:dashed"><h4><span class="mi">💡</span>AI 省钱贴士</h4><p style="font-size:12.5px;color:var(--ink-2)">${plan.tips}</p></div>`;
  grid.classList.add('show');
  /* 渲染路线小地图（百度风白底蓝线 + 住宿/美食点位 + 出行方式切换） */
  setTimeout(()=>{
    const el=$('#aiRouteMap');if(!el)return;
    ensureECharts(ok=>{
      if(!ok){el.innerHTML='<div class="rt-fallback">🗺 地图引擎加载失败（网络异常），请刷新重试</div>';return}
      const key=planKeyOf(plan);
      const poi=(typeof POI_ROUTE!=='undefined'&&POI_ROUTE[key])?POI_ROUTE[key]:null;
      let segs;
      if(poi&&poi.route&&poi.route.length){
        const days={};poi.route.forEach(p=>{(days[p.day]=days[p.day]||[]).push(p)});
        segs=Object.keys(days).sort((a,b)=>a-b).map(d=>({day:+d,points:days[d]}));
      }else segs=planRoute(plan);
      if(!segs.length){el.innerHTML='<div class="rt-fallback">该目的地暂无路线数据</div>';return}
      const allPts=segs.flatMap(sg=>sg.points);
      const isCN=allPts.every(p=>{const s=spotById(p.id);return s?s.rg==='cn':(p.lng>72&&p.lng<136&&p.lat>16&&p.lat<54)});
      const stays=poi?(poi.stays||[]):[],eats=poi?(poi.eats||[]):[];
      window.__rt=createLiteRouteMap('aiRouteMap',isCN?'china':'world',{segs:segs,stays:stays,eats:eats,mode:rtMode,
        onSpot:id=>{if(spotById(id))openSpot(id)}});
      renderRtModes();renderRtStats();renderFoodChips(eats);renderCmts(key||plan.dest);
    });
  },60);
}
/* ---- 路线模块：出行方式切换 / 里程时间统计 ---- */
let rtMode=localStorage.getItem('fmw_rt_mode')||'drive';
function renderRtModes(){
  const box=$('#rtModes');if(!box)return;
  box.innerHTML=Object.keys(RT_MODES).map(k=>`<button type="button" class="${k===rtMode?'on':''}" data-m="${k}">${RT_MODES[k].label}</button>`).join('');
  box.querySelectorAll('button').forEach(b=>b.onclick=()=>{
    rtMode=b.dataset.m;localStorage.setItem('fmw_rt_mode',rtMode);
    renderRtModes();renderRtStats();
    if(window.__rt)window.__rt.setMode(rtMode);
  });
}
function renderRtStats(){
  const el=$('#rtMeta');if(!el||!window.__rt)return;
  const st=rtStats(window.__rt.segs,rtMode);
  el.innerHTML=`📏 全程约 <b>${st.km}</b> km · ${RT_MODES[rtMode].label}约 <b>${st.timeTxt}</b> · 途径 <b>${st.stops}</b> 站`;
}
/* ---- 路线模块：美食偏好（你最喜欢吃啥） ---- */
const FOOD_KINDS=['🌶 川湘辣','🍜 面食粉类','🍣 日韩料理','🥘 当地小吃','🥗 轻食素食','🍰 甜品咖啡'];
let foodPref=localStorage.getItem('fmw_food_pref')||'';
function renderFoodChips(eats){
  const box=$('#foodChips');if(!box)return;
  box.innerHTML=FOOD_KINDS.map(k=>`<button type="button" class="${k===foodPref?'on':''}">${k}</button>`).join('');
  const apply=()=>{
    const hitEl=$('#foodHit');if(!hitEl)return;
    const hit=(eats||[]).filter(e=>!foodPref||e.kind2===foodPref);
    hitEl.innerHTML=foodPref
      ?(hit.length?`✅ 已为你点亮 ${hit.length} 家「${foodPref}」：<b>${hit.map(h=>h.n).join('、')}</b>（地图绿色 🍜 标记）`
        :`这片区域暂未收录「${foodPref}」类美食，在下方评论区告诉我们你想吃啥 👇`)
      :'';
  };
  box.querySelectorAll('button').forEach(b=>b.onclick=()=>{
    foodPref=b.textContent===foodPref?'':b.textContent;
    localStorage.setItem('fmw_food_pref',foodPref);
    box.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.textContent===foodPref));
    if(window.__rt)window.__rt.setEatFilter(foodPref);
    apply();
  });
  apply();
}
/* ---- 路线模块：评论区留言（本地持久化，登录后显示昵称） ---- */
const CMT_KEY='fmw_ai_cmts';
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function readCmts(k){try{const all=JSON.parse(localStorage.getItem(CMT_KEY)||'{}');return all[k]||[]}catch(e){return[]}}
function renderCmts(k){
  const list=$('#cmtList');if(!list)return;
  const arr=readCmts(k);
  list.innerHTML=arr.length
    ?arr.map(c=>`<div class="cmt"><b>${escHtml(c.u)}</b><span>${c.t}</span><p>${escHtml(c.txt)}</p></div>`).join('')
    :'<div class="cmt-empty">还没有留言，抢个沙发～ 说说这条路线，或者你想吃的美食</div>';
  const send=$('#cmtSend');
  if(send)send.onclick=()=>{
    const inp=$('#cmtInput'),txt=(inp.value||'').trim();
    if(!txt)return toast('先写点内容再发布 ✍️');
    let all={};try{all=JSON.parse(localStorage.getItem(CMT_KEY)||'{}')}catch(e){}
    (all[k]=all[k]||[]).unshift({
      u:(typeof user!=='undefined'&&user&&(user.nick||user.name))||'旅行者',
      t:new Date().toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}),
      txt:txt.slice(0,120)});
    try{localStorage.setItem(CMT_KEY,JSON.stringify(all))}catch(e){}
    inp.value='';renderCmts(k);toast('💬 留言成功');
  };
}
/* ---- 平台比价数据（跳转真实平台检索页） ---- */
const CMP={
 fly:[['携程机票','https://flights.ctrip.com/','🛫','比价航司与退改规则'],['飞猪旅行','https://www.fligo.com/','🧳','会员常有大额立减'],['去哪儿','https://www.qunar.com/','🔎','低价票聚合搜索']],
 rail:[['12306 官方','https://www.12306.cn/index/','🚄','候补+官方无溢价'],['携程火车票','https://trains.ctrip.com/','🎫','跨城联程方便'],['高铁管家','https://www.gaotie.cn/','📱','时刻表查询']],
 car:[['租租车','https://www.zuzuche.com/','🚗','境外租车比价'],['携程租车','https://car.ctrip.com/','🚙','国内门店多'],['高德路线规划','https://ditu.amap.com/','🗺️','算真实里程与过路费']],
 bus:[['巴士管家','https://www.chebada.com/','🚌','长途汽车票'],['携程汽车票','https://bus.ctrip.com/','🚐','城际大巴']]
};
function fuelHtml(plan){
  if(!plan.dist)return '<div class="fuel-box">🚤 该目的地以船 / 水上飞机上岛，不涉及自驾油费。</div>';
  const km=plan.dist, oil=(km*2*8/100*7.8).toFixed(0), toll=(km*2*.45).toFixed(0), total=(+oil+ +toll).toFixed(0);
  return `<div class="fuel-box">⛽ <b>自驾燃油费估算</b>（往返 ${km*2} km）<br>
   · 油耗按 8L/100km · 油价按 ¥7.8/L → 油费 <b>¥${oil}</b><br>
   · 过路费按 ¥0.45/km → 过路费 <b>¥${toll}</b><br>
   · 合计约 <b>¥${total}</b>（实际以车型 / 路线为准）· <a href="https://ditu.amap.com/" target="_blank" style="color:var(--gold)">高德地图输入起终点算精确油费 →</a></div>`;
}
function openMod(kind,dest){
  const plan=matchPlan(dest)||PLANS['大理'];
  if(kind==='spots'){
    openModal(`<button class="mx" onclick="closeModal()">✕</button><div style="padding:24px"><h3 style="font-size:18px;font-weight:900;margin-bottom:4px">🏞 ${plan.dest} · 景点清单</h3><p style="font-size:12px;color:var(--muted);margin-bottom:14px">含名称、地址、坐标、建议时长与交通衔接，可直接用于地图标点</p>
    ${plan.spots.map(id=>{const s=spotById(id);return s?`<div class="spot-mini" style="margin-bottom:10px" onclick="closeModal();openSpot('${s.id}')"><img src="${IMG(P[s.id])}"><div><h5>${s.n}</h5><div class="city">🏠 ${s.addr}</div><div class="icon-chips"><span class="hl">🌐 ${s.lng.toFixed(3)}, ${s.lat.toFixed(3)}</span><span>⏱ ${s.hrs}</span><span>🚄 ${s.traf}</span><span>💰 ${s.price}</span></div></div></div>`:''}).join('')}</div>`,true);
  }else if(kind==='transport'){
    openModal(`<button class="mx" onclick="closeModal()">✕</button><div style="padding:24px"><h3 style="font-size:18px;font-weight:900;margin-bottom:12px">🚄 ${plan.dest} · 出行方式对比</h3>
    <div class="cmp-chart" id="cmpChart"></div>
    <table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-top:8px">${'<tr style="color:var(--muted);text-align:left"><th style="padding:7px 4px;border-bottom:1px solid var(--line)">方式</th><th style="padding:7px 4px;border-bottom:1px solid var(--line)">耗时</th><th style="padding:7px 4px;border-bottom:1px solid var(--line)">参考价</th><th style="padding:7px 4px;border-bottom:1px solid var(--line)">舒适度</th></tr>'}${plan.transport.map(t=>`<tr><td style="padding:9px 4px;border-bottom:1px dashed var(--line);font-weight:700">${t.m}</td><td style="padding:9px 4px;border-bottom:1px dashed var(--line)">${t.t}</td><td style="padding:9px 4px;border-bottom:1px dashed var(--line);color:var(--gold);font-weight:700">${t.p}</td><td style="padding:9px 4px;border-bottom:1px dashed var(--line)">${'★'.repeat(Math.round(t.s*5))}</td></tr>`).join('')}</table>
    ${fuelHtml(plan)}
    <h4 style="font-size:14px;font-weight:900;margin:16px 0 4px">🛒 平台比价 · 跳转查询实时价（哪个平台划算自己比）</h4>
    <div class="cmp-grid">${(CMP[plan.__kind]||[...CMP.fly,...CMP.rail]).map(c=>`<a class="cmp-card" href="${c[1]}" target="_blank"><span class="cp-i">${c[2]}</span><b>${c[0]}</b><span>${c[3]}</span></a>`).join('')}</div>
    <p class="cmp-note">💡 价格随季节波动，建议 2-3 个平台交叉比价后再下单；出行前确认退改规则。</p></div>`,true);
    drawCmpChart(plan);
  }else if(kind==='budget'){
    const dcs=['#e7c76d','#7ea6d9','#6cc47a','#e58fb1','#9a86d9'];let bg='';plan.budgetItems.forEach((b,i)=>bg+=`--dc${i+1}:${dcs[i]};`);
    openModal(`<button class="mx" onclick="closeModal()">✕</button><div style="padding:24px"><h3 style="font-size:18px;font-weight:900;margin-bottom:12px">💰 ${plan.dest} · 价格规划明细</h3>
    <div class="donut-row" style="${bg}"><div class="donut"><b>${fmt(plan.budget)}<i>总预算</i></b></div><div class="dlegend">${plan.budgetItems.map(b=>`<div class="li"><span><i style="background:var(${b.c})"></i>${b.k}</span><span>${fmt(b.v)}</span></div>`).join('')}</div></div>
    <p style="font-size:12px;color:var(--muted);margin-top:12px">💡 ${plan.tips}</p></div>`);
  }else if(kind==='planb'){
    openModal(`<button class="mx" onclick="closeModal()">✕</button><div style="padding:24px"><h3 style="font-size:18px;font-weight:900;margin-bottom:12px">☔ ${plan.dest} · 行程备案</h3>
    <div class="mod-blist" style="font-size:13px">
      <div><b>🌧 如果那天下雨：</b>${plan.planB.rain}</div>
      <div><b>☕ 如果逛累了 / 想找地方坐坐：</b>${plan.planB.rest}</div>
      <div><b>🛋 如果突然不想去逛了：</b>${plan.planB.lazy}</div>
    </div>
    <p style="font-size:12px;color:var(--muted);margin-top:12px">💡 备案由 AI 结合目的地室内场景与本地生活数据生成，帮你把意外变成体验。</p></div>`);
  }else if(kind==='crowd'){
    openModal(`<button class="mx" onclick="closeModal()">✕</button><div style="padding:24px"><h3 style="font-size:18px;font-weight:900;margin-bottom:12px">👪 ${plan.dest} · 同行人群注意事项</h3>
    <div class="crowd-row"><span class="cw">👶 小孩</span><span>${plan.crowd.kid}</span></div>
    <div class="crowd-row"><span class="cw">👵 老人</span><span>${plan.crowd.elder}</span></div>
    <div class="crowd-row"><span class="cw">💑 情侣</span><span>${plan.crowd.couple}</span></div>
    <p style="font-size:12px;color:var(--muted);margin-top:12px">💡 按人群生成的安全与健康提示，出发前记得再核对天气与景区公告。</p></div>`);
  }else if(kind==='video'){
    openVideo(plan.videos[0]);
  }else if(kind==='plog'){
    const v=plan.plogs[0];openPlog(v.t,plan.dest,v.img,encodeURIComponent(v.txt));
  }
}
/* ---- 交通可视化图表 ---- */
function drawCmpChart(plan){
  if(!window.echarts){ensureECharts(()=>drawCmpChart(plan));return}
  const el=document.getElementById('cmpChart');if(!el)return;
  const kinds=plan.transport.map(t=>t.m.includes('飞')?'fly':t.m.includes('高铁')||t.m.includes('火车')?'rail':t.m.includes('自驾')||t.m.includes('租车')?'car':'bus');
  plan.__kind=kinds[0];
  const parseP=p=>{const m=String(p).replace(/,/g,'').match(/(\d+(?:\.\d+)?)/);return m?+m[1]:0};
  const parseT=t=>{const h=String(t).match(/(\d+(?:\.\d+)?)\s*h/);return h?+h[1]:0};
  const c=echarts.init(el);
  c.setOption({backgroundColor:'transparent',
    tooltip:{trigger:'axis',backgroundColor:'rgba(15,23,42,.92)',borderColor:'rgba(231,199,109,.4)',textStyle:{color:'#fff',fontSize:12}},
    legend:{data:['参考价(¥)','耗时(h)','舒适度(百分制)'],textStyle:{color:'#cfd6e6',fontSize:11},top:0},
    grid:{left:46,right:16,top:34,bottom:26},
    xAxis:{type:'category',data:plan.transport.map(t=>t.m),axisLabel:{color:'#cfd6e6',fontSize:11},axisLine:{lineStyle:{color:'rgba(255,255,255,.25)'}}},
    yAxis:{type:'value',axisLabel:{color:'#8b93a7',fontSize:10},splitLine:{lineStyle:{color:'rgba(255,255,255,.08)'}}},
    series:[
      {name:'参考价(¥)',type:'bar',data:plan.transport.map(t=>parseP(t.p)),itemStyle:{color:'#e7c76d',borderRadius:[6,6,0,0]},label:{show:true,position:'top',color:'#e7c76d',fontSize:10}},
      {name:'耗时(h)',type:'bar',data:plan.transport.map(t=>parseT(t.t)),itemStyle:{color:'#7ea6d9',borderRadius:[6,6,0,0]},label:{show:true,position:'top',color:'#7ea6d9',fontSize:10}},
      {name:'舒适度(百分制)',type:'bar',data:plan.transport.map(t=>Math.round(t.s*100)),itemStyle:{color:'#6cc47a',borderRadius:[6,6,0,0]},label:{show:true,position:'top',color:'#6cc47a',fontSize:10}}
    ]});
}
