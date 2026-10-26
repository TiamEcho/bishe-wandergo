/* =========================================================
 * WANDERGO PLATFORM · 旅行大转盘 wheel.js
 * 分层选择（国内 省→市 / 国外 国家→州）· SVG 等分扇区
 * 命中后：别针钉住 + 结果小卡 + 震动弹窗 + 本页历史详情
 * 历史记录区块使用 Vue 3 岛屿渲染（页面其余动效保持原生）
 * ========================================================= */
const SLICE_COLORS=['#f3da96','#a8c8e8','#b7e0b2','#f2b8c6','#c9b2e8','#a2ded8','#f0c890','#8fbfe0','#e8d9a0','#b0d0a8','#f6c8a0','#c8d8f0','#e8c0d8','#bcdfe8'];
const HIST_KEY='fmw_wheel_hist';
let wkScope='cn',wkProv='江苏',wkCity='',cands=[],spinning=false,rot=0,hitIdx=-1;
let histStore=null,histApp=null;

/* ---------------- 选择器 ---------------- */
function provNames(sc){return REGIONS[sc].map(g=>g.p)}
/** 把用户输入（省份名 / 国家名 / 城市名 / 州名）解析成 {prov,city} */
function resolvePlace(raw,scope){
  const v=String(raw||'').trim().replace(/(省|市|自治区|特别行政区|州|地区)$/,'');
  if(!v)return null;
  const names=provNames(scope);
  const p=names.find(x=>x===v)||names.find(x=>x.startsWith(v))||names.find(x=>x.includes(v));
  if(p)return {prov:p,city:''};
  for(const g of REGIONS[scope]){
    const c=g.c.find(x=>x===v||x.startsWith(v)||x.includes(v));
    if(c)return {prov:g.p,city:c};
  }
  return null;
}
/** 统一落地：校验 → 回填输入框 → 重建城市列表 → 重绘扇区 */
function applySelection(prov,city){
  wkProv=prov;
  const cs=citiesOf(prov,wkScope);
  wkCity=city&&cs.indexOf(city)>-1?city:'';
  const inp=$('#provInput');
  if(inp)inp.value=prov;
  fillCitySelect();
  buildWheel();
}
function initPicker(){
  const inp=$('#provInput'),dl=$('#provList');
  dl.innerHTML=provNames(wkScope).map(p=>`<option value="${p}">`).join('');
  inp.value=wkProv;
  fillCitySelect();
  $('#rgSeg').addEventListener('click',e=>{
    const b=e.target.closest('button[data-rg]');if(!b)return;
    $$('#rgSeg button').forEach(x=>x.classList.toggle('on',x===b));
    wkScope=b.dataset.rg;
    $('#provLabel').textContent=wkScope==='cn'?'省份':'国家';
    $('#cityLabel').textContent=wkScope==='cn'?'城市（地级市）':'州 / 地区';
    $('#provInput').placeholder=wkScope==='cn'?'输入或选择省份，如：江苏、浙江、广东':'可搜索国家，如：日本、冰岛、法国';
    $('#provList').innerHTML=provNames(wkScope).map(p=>`<option value="${p}">`).join('');
    applySelection(provNames(wkScope)[0],'');
  });
  /* 输入 / 选择省份·国家：解析到有效区划就立即重绘扇区 */
  const onPick=()=>{
    const hit=resolvePlace(inp.value,wkScope);
    if(!hit)return;                         /* 还在输入中，先不动 */
    if(hit.prov===wkProv&&!hit.city)return;
    applySelection(hit.prov,hit.city||(hit.prov===wkProv?wkCity:''));
  };
  inp.addEventListener('input',onPick);
  inp.addEventListener('change',()=>{
    const hit=resolvePlace(inp.value,wkScope);
    if(!hit){toast('没有找到「'+inp.value.trim()+'」，请从下拉列表中选择');inp.value=wkProv;return}
    applySelection(hit.prov,hit.city||'');
  });
  $('#citySel').addEventListener('change',e=>{
    wkCity=e.target.value;buildWheel();
    toast(wkCity?('🎯 只转「'+wkCity+'」'):('🎲 在 '+wkProv+' 全域随机'));
  });
  $('#buildBtn').onclick=()=>{
    const hit=resolvePlace(inp.value,wkScope);
    if(!hit){toast('没有找到「'+inp.value.trim()+'」，请从下拉列表中选择');inp.value=wkProv;return}
    applySelection(hit.prov,hit.city||($('#citySel').value||''));
    toast(wkCity?('🎯 只转「'+wkCity+'」'):('🎡 已按 '+wkProv+' 等分成 '+cands.length+' 份'),'ok');
  };
  document.addEventListener('keydown',e=>{
    if(e.code==='Space'&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();spin()}
  });
}
function fillCitySelect(){
  const cities=citiesOf(wkProv,wkScope);
  const sel=$('#citySel');
  sel.innerHTML=`<option value="">🎲 全部（${cities.length} 个候选）</option>`+cities.map(c=>`<option value="${c}">${c}</option>`).join('');
  sel.value=wkCity;
}

/* ---------------- 转盘绘制（SVG 等分） ---------------- */
const polar=(r,deg)=>{const a=(deg-90)*Math.PI/180;return [210+r*Math.cos(a),210+r*Math.sin(a)]};
function arcPath(r,a0,a1){
  const R=190,[x0,y0]=polar(R,a0),[x1,y1]=polar(R,a1);
  const large=(a1-a0)>180?1:0;
  return `M 210 210 L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
}
function buildWheel(){
  cands=wheelCandidates(wkScope,wkProv,wkCity);
  const n=cands.length||1,step=360/n;
  /* 字号 / 半径 / 截断长度按扇区数量自适应，保证文字不糊在一起 */
  const fs=n<=8?15:n<=12?13:n<=16?11.5:n<=20?10.5:9.5;
  const rad=n<=8?108:n<=12?117:n<=16?127:142;
  const ly=210-rad;
  const arcLen=2*Math.PI*rad/n;
  const maxLen=Math.max(2,Math.min(6,Math.floor(arcLen/(fs*0.95))));
  const labels=cands.map((c,i)=>{
    const mid=n===1?0:(i+.5)*step, flip=mid>90&&mid<270;
    const txt=c.label.length>maxLen?c.label.slice(0,maxLen)+'…':c.label;
    return `<g transform="rotate(${mid} 210 210)">
      <text x="210" y="${ly}" text-anchor="middle" dominant-baseline="middle"
        ${flip?`transform="rotate(180 210 ${ly})"`:''}
        font-size="${fs}" font-weight="700" fill="#12203a"
        style="paint-order:stroke;stroke:rgba(255,255,255,.42);stroke-width:2.2px">${txt}</text></g>`;
  }).join('');
  const slices=n===1
    ? `<circle cx="210" cy="210" r="190" fill="${SLICE_COLORS[0]}" stroke="rgba(11,20,36,.55)" stroke-width="1.5" data-i="0"/>`
    : cands.map((c,i)=>{
      const a0=i*step,a1=(i+1)*step;
      return `<path d="${arcPath(190,a0,a1)}" fill="${SLICE_COLORS[i%SLICE_COLORS.length]}" stroke="rgba(11,20,36,.55)" stroke-width="1.5" data-i="${i}"/>`;
    }).join('');
  $('#wheelDisc').innerHTML=`<svg viewBox="0 0 420 420" class="wk-svg" aria-label="旅行转盘">
    <circle cx="210" cy="210" r="193" fill="#0d1729" stroke="rgba(231,199,109,.5)" stroke-width="3"/>
    <g id="wkSlices">${slices}</g>
    <g class="wk-labels">${labels}</g>
    <circle cx="210" cy="210" r="52" fill="#0d1729" stroke="rgba(231,199,109,.45)" stroke-width="2"/>
  </svg>`;
  rot=0;hitIdx=-1;
  $('#wheelDisc').style.transition='';$('#wheelDisc').style.transform='rotate(0deg)';
  $('#wkPin').classList.remove('on');
  $('#wheelMeta').textContent=`候选 ${cands.length} 个 · 每个扇区 ${(360/n).toFixed(1)}° · 点击中间 GO 或按空格`;
  $('#pickTip').innerHTML=wkCity
    ? `已选：<b>${wkProv} · ${wkCity}</b>${cands.length>1?'，该城市已收录 '+cands.length+' 个景点，扇区平均分成 '+cands.length+' 份':'，暂未收录景点，AI 仍可为你规划'}`
    : `已选：<b>${wkProv}</b> · ${cands.length} 个候选，扇区将平均分成 ${cands.length} 份`;
  if(!cands.length){$('#wheelMeta').textContent='该范围暂无候选，请换一个省份/国家';}
}
function sliceEls(){return $$('#wheelDisc [data-i]')}

/* ---------------- 转动 ---------------- */
function spin(){
  if(spinning||!cands.length)return;
  spinning=true;
  $('#wkPin').classList.remove('on');
  sliceEls().forEach(el=>el.classList.remove('hit'));
  const n=cands.length,step=360/n;
  const idx=Math.floor(Math.random()*n);
  const mid=(idx+.5)*step;
  const jitter=(Math.random()-.5)*step*.5;
  const need=((360-mid-jitter)-(rot%360)+360)%360;
  rot+=360*6+need;                 /* 多转 6 圈再落点 */
  const disc=$('#wheelDisc');
  disc.style.transition='transform 4.6s cubic-bezier(.12,.68,.06,1)';
  disc.style.transform=`rotate(${rot}deg)`;
  setTimeout(()=>{land(idx)},4700);
}
function land(idx){
  spinning=false;hitIdx=idx;
  const c=cands[idx];
  const el=$(`#wheelDisc [data-i="${idx}"]`);
  if(el)el.classList.add('hit');
  const pin=$('#wkPin');
  pin.classList.add('on');
  pin.textContent='📍';
  showResult(c);
  pushHist(c);
  vibrate();
  popup(c);
  toast('🎉 命运选定：'+c.label+'！','ok');
}
/* 手机震动（支持的设备才有效，桌面静默） */
function vibrate(){try{navigator.vibrate&&navigator.vibrate([70,50,120])}catch(e){}}

/* ---------------- 结果卡 ---------------- */
function showResult(c){
  const spot=c.spotId?spotById(c.spotId):null;
  const box=$('#wRes');
  if(spot){
    box.innerHTML=`
      <div class="wk-rcard show">
        <div class="wk-rimg"><img src="${IMG(P[spot.id],'landscape_16_9')}" alt="${spot.n}">
          <span class="wk-tagpin">📍 ${c.label}</span></div>
        <div class="wk-rbody">
          <h4>${spot.n}</h4>
          <p class="wk-rsub">${spot.city} · ${spot.tag} · ⭐ ${spot.rating}</p>
          <div class="wk-rmeta"><span>💰 ${spot.price}</span><span>⏱ ${spot.hrs}</span><span>🚌 ${spot.traf}</span></div>
          <div class="wk-rbtns">
            <button class="btn gold" onclick="goAI('${spot.city}')">🤖 AI 规划这趟</button>
            <button class="btn line" onclick="WGO.go('map.html',{spot:'${spot.id}'})">🗺 看地图</button>
            <button class="btn line" onclick="spin()">🎡 再转一次</button>
          </div>
        </div>
      </div>`;
  }else{
    box.innerHTML=`
      <div class="wk-rcard show">
        <div class="wk-rimg wk-rimg-ph"><span>${c.label}</span></div>
        <div class="wk-rbody">
          <h4>${c.label}</h4>
          <p class="wk-rsub">${c.sub} · 该地暂未收录景点数据</p>
          <div class="wk-rmeta"><span>🧭 城市漫步</span><span>🍜 在地小吃</span><span>🏞 周边一日游</span></div>
          <div class="wk-rbtns">
            <button class="btn gold" onclick="goAI('${c.label}')">🤖 让 AI 规划 ${c.label}</button>
            <button class="btn line" onclick="spin()">🎡 再转一次</button>
          </div>
          <p class="src-note" style="margin-top:10px">该城市尚未收录进景点库，AI 会基于区域数据生成完整行程；也可以到管理端补充景点。</p>
        </div>
      </div>`;
  }
}
function goAI(dest){WGO.go('ai.html',{dest})}

/* ---------------- 震动弹窗 ---------------- */
let popTimer;
function popup(c){
  let el=$('#wkPop');
  if(!el){el=document.createElement('div');el.id='wkPop';el.className='wk-pop';document.body.appendChild(el)}
  el.innerHTML=`<div class="wk-pop-ic">🎯</div>
    <div><b>哦！这次去 ${c.label}</b><p>${c.sub} · 转盘已经帮你决定了</p></div>
    <button class="wk-pop-x" onclick="this.parentNode.classList.remove('show')">✕</button>`;
  el.classList.remove('show');void el.offsetWidth;   /* 重置动画 */
  el.classList.add('show');
  clearTimeout(popTimer);popTimer=setTimeout(()=>el.classList.remove('show'),5200);
}

/* ---------------- 历史（Vue 岛屿 + 本页详情） ---------------- */
function pushHist(c){
  const list=readHist();
  list.unshift({id:'w'+Date.now(),label:c.label,sub:c.sub,spotId:c.spotId||null,
    t:new Date().toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}),ts:Date.now()});
  localStorage.setItem(HIST_KEY,JSON.stringify(list.slice(0,24)));
  syncHist();
}
function readHist(){try{return JSON.parse(localStorage.getItem(HIST_KEY)||'[]')}catch(e){return []}}
function syncHist(){if(histStore)histStore.items=readHist().map(decorateHist)}
function decorateHist(h){
  const s=h.spotId?spotById(h.spotId):null;
  return Object.assign({},h,{img:s?IMG(P[s.id],'landscape_4_3'):null,rating:s?s.rating:null,tag:s?s.tag:'未收录景点'});
}
function mountHistVue(){
  if(histApp||!window.Vue||!$('#wHist'))return histApp;
  histStore=Vue.reactive({items:readHist().map(decorateHist)});
  histApp=Vue.createApp({
    setup(){return{store:histStore}},
    methods:{
      openItem(h){openHistModal(h)},           /* 关键：页内弹窗，绝不跳转 */
      ai(h){goAI(h.sub||h.label)}
    },
    template:`
      <div class="wk-hcard" v-for="h in store.items" :key="h.id" @click="openItem(h)">
        <div class="wk-himg">
          <img v-if="h.img" :src="h.img" loading="lazy" :alt="h.label">
          <div v-else class="wk-hph"><span>🧭</span></div>
          <span class="wk-htime">{{h.t}}</span>
        </div>
        <div class="wk-hbody">
          <b>{{h.label}}</b>
          <p>{{h.sub}} · {{h.tag}}<span v-if="h.rating"> · ⭐{{h.rating}}</span></p>
          <span class="wk-hlink">点击在本页查看详情 →</span>
        </div>
      </div>
      <div class="empty-tip" v-if="!store.items.length">还没有转盘记录，转一次试试 ✨</div>`
  }).mount('#wHist');
  return histApp;
}
/* 历史详情：本页 openModal，不跳页 */
function openHistModal(h){
  const s=h.spotId?spotById(h.spotId):null;
  openModal(`<button class="mx" onclick="closeModal()">✕</button>
    <div class="dbody">
      <div class="wk-hm-img">${s?`<img src="${IMG(P[s.id],'landscape_16_9')}" alt="${s.n}">`:`<div class="wk-hph big"><span>🧭 ${h.label}</span></div>`}</div>
      <h3 style="font-size:19px;font-weight:900;margin:6px 0 4px">🎡 ${s?s.n:h.label}</h3>
      <p class="wk-rsub">${h.sub} · 转盘时间 ${h.t}</p>
      ${s?`<div class="wk-rmeta" style="margin:10px 0"><span>⭐ ${s.rating}</span><span>💰 ${s.price}</span><span>⏱ ${s.hrs}</span><span>🚌 ${s.traf}</span></div>
      <p class="fd-body">${s.desc}</p>`:`<p class="fd-body">这个城市还没有收录景点数据，可以让 AI 直接规划一趟 ${h.label} 的行程。</p>`}
      <div class="wk-rbtns" style="justify-content:flex-start;margin-top:14px">
        <button class="btn gold" onclick="closeModal();goAI('${h.sub||h.label}')">🤖 AI 规划</button>
        ${s?`<button class="btn line" onclick="closeModal();WGO.go('map.html',{spot:'${s.id}'})">🗺 看地图</button>`:''}
        <button class="btn line" onclick="closeModal()">留在本页</button>
      </div>
    </div>`);
}

document.addEventListener('DOMContentLoaded',()=>{
  wkProv='江苏';                 /* 示例：江苏 13 个地级市 → 13 等分扇区 */
  initPicker();
  buildWheel();
  mountHistVue();
  syncHist();
  $('#spinBtn').onclick=spin;
});
