/* =========================================================
 * WANDERGO PLATFORM · 协同过滤推荐 recommend.js
 * UserCF + ItemCF（余弦相似度）+ 热门兜底（冷启动）
 * 后端 /api/recommend 优先，离线自动切换本地算法
 * ========================================================= */
function getRates(){return JSON.parse(localStorage.getItem('fmw_rates')||'{}')}
function setRate(id,v){const r=getRates();r[id]=v;localStorage.setItem('fmw_rates',JSON.stringify(r))}
function myRateNames(){const r=getRates();return Object.keys(r).map(id=>spotById(id)?spotById(id).n:id)}
/* ---- 余弦相似度 ---- */
function cosine(a,b){ /* a,b: {item:score} */
  let dot=0,na=0,nb=0;
  for(const k in a){na+=a[k]*a[k];if(b[k]!=null)dot+=a[k]*b[k]}
  for(const k in b)nb+=b[k]*b[k];
  if(!na||!nb)return 0;
  return dot/Math.sqrt(na*nb);
}
/* ---- UserCF ---- */
function userCF(myRates,cands){
  const sims=RATE_USERS.map(u=>({u,sim:cosine(myRates,u.r)})).filter(x=>x.sim>0.01).sort((a,b)=>b.sim-a.sim).slice(0,10);
  const out={};
  cands.forEach(id=>{
    let num=0,den=0,best=null;
    sims.forEach(({u,sim})=>{
      if(u.r[id]!=null){num+=sim*u.r[id];den+=sim;
        if(!best||sim*u.r[id]>best.score)best={by:u.u,score:sim*u.r[id],item:myRatesItemName(u.r,id)}}
    });
    if(den>0)out[id]={score:num/den,why:(best?`与你口味相近的「${best.by}」也爱 ${best.item||'这里'}`:'相似用户推荐'),sim:den?Math.min(1,den/6):0};
  });
  return out;
}
function myRatesItemName(r,skip){for(const k in r){if(k!==skip&&spotById(k))return spotById(k).n}return null}
/* ---- ItemCF：物品共现相似度 ---- */
function itemCF(myRates,cands){
  /* 构建物品向量（用户维度） */
  const items={};RATE_USERS.forEach(u=>{for(const k in u.r){(items[k]=items[k]||{})[u.u]=u.r[k]}});
  Object.keys(myRates).forEach(k=>{(items[k]=items[k]||{})['我']=myRates[k]});
  const out={};
  cands.forEach(id=>{
    if(!items[id])return;
    let num=0,den=0,best=null;
    for(const mid in myRates){
      if(mid===id||!items[mid])continue;
      const sim=cosine(items[id],items[mid]);
      if(sim>0.02){num+=sim*myRates[mid];den+=sim;
        if(!best||sim>best.sim)best={sim,name:spotById(mid)?spotById(mid).n:mid}}
    }
    if(den>0)out[id]={score:num/den,why:best?`与你评过高分的「${best.name}」相似度 ${(best.sim*100)|0}%`:'同类偏好推荐',sim:Math.min(1,den/4)};
  });
  return out;
}
/* ---- 热门兜底 ---- */
function popular(cands){
  const out={};
  cands.forEach(id=>{const s=spotById(id);if(s)out[id]={score:s.rating,why:'热门兜底 · 全站高分目的地（冷启动）',sim:s.rating/5}});
  return out;
}
/* ---- 融合推荐 ---- */
function localRecommend(topN=8){
  const myRates=getRates();
  const rated=new Set(Object.keys(myRates));
  const checked=new Set(JSON.parse(localStorage.getItem('fmw_albums')||'[]').map(a=>SPOTS.find(s=>s.n===a.dest)||{}).filter(s=>s.id).map(s=>s.id));
  const cands=SPOTS.map(s=>s.id).filter(id=>!rated.has(id)&&!checked.has(id));
  let res;
  if(Object.keys(myRates).length===0){res=popular(cands);return {mode:'热门兜底（冷启动：先给几个景点评分试试）',list:rank(res,topN)}}
  const uc=userCF(myRates,cands),ic=itemCF(myRates,cands);
  const mix={};
  cands.forEach(id=>{
    const a=uc[id],b=ic[id];
    if(a||b)mix[id]={score:(a?a.score:0)*.5+(b?b.score:0)*.5,why:(a&&b&&a.score>b.score?a:b).why,sim:Math.max(a?a.sim:0,b?b.sim:0)};
  });
  res=Object.keys(mix).length?mix:popular(cands);
  return {mode:Object.keys(myRates).length?'UserCF + ItemCF 融合推荐':'热门兜底',list:rank(res,topN)};
}
function rank(res,topN){
  return Object.entries(res).map(([id,v])=>({id,...v,match:Math.round(Math.min(.99,v.sim||0)*100)||Math.round(v.score/5*88)}))
    .sort((a,b)=>b.score-a.score).slice(0,topN);
}
/* ---- 渲染（Vue 3 岛屿：卡片列表数据驱动，页面其余动态效果保持原生） ---- */
let recStore=null,recApp=null;
function mountRecVue(){
  if(recApp||!window.Vue||!$('#recGrid'))return recApp;
  recStore=Vue.reactive({items:[]});
  recApp=Vue.createApp({
    setup(){return{store:recStore}},
    methods:{open(id){openSpot(id)}},
    template:`
      <div class="rec-card" v-for="(x,i) in store.items" :key="x.id" :style="{animationDelay:(i*0.05)+'s'}" @click="open(x.id)">
        <div class="rc-img"><img :src="x.img" loading="lazy">
          <span class="match">🎯 匹配 {{x.match}}%</span>
          <span class="src">{{x.srcLabel}}</span></div>
        <div class="rc-body"><h5>{{x.name}} <span style="font-size:11px;color:var(--muted)">· {{x.city}}</span></h5>
        <div class="why">{{x.why}}</div>
        <div class="rc-meta"><span>⭐ {{x.rating}}</span><span>💰 {{x.price}}</span><span>{{x.tag}}</span></div></div>
      </div>
      <div class="empty-tip" v-if="!store.items.length">暂无推荐</div>`
  }).mount('#recGrid');
  return recApp;
}
function renderRec(apiList,apiMode){
  const box=$('#recGrid');
  let list,mode;
  if(apiList&&apiList.length){mode=apiMode;list=apiList.map(x=>({id:x.id,match:x.match||Math.round((x.score||4)*20),why:x.why||'后端协同过滤推荐',score:x.score||4}))}
  else{const r=localRecommend(8);list=r.list;mode=r.mode}
  $('#recMode').textContent='🧮 当前算法：'+mode+(WGOAPI.status()===false?'（后端离线 · 本地演示数据）':'');
  const vm=list.map((x,i)=>{const s=spotById(x.id);if(!s)return null;const src=recSrcOf(x.id);
    return {id:x.id,match:x.match,why:x.why,name:s.n,city:s.city,rating:s.rating,price:s.price,tag:s.tag,
      img:IMG(P[x.id],'landscape_16_9'),
      srcLabel:src.p==='WANDERGO 站内'?'🧭 站内精选':(PLAT_LBL[src.p]||'📷 '+src.p)+' '+src.by}}).filter(Boolean);
  if(mountRecVue()){recStore.items=vm;return}
  /* Vue 未加载时的兜底渲染 */
  box.innerHTML=vm.map((x,i)=>`<div class="rec-card" style="animation-delay:${i*.05}s" onclick="openSpot('${x.id}')">
      <div class="rc-img"><img src="${x.img}" loading="lazy">
        <span class="match">🎯 匹配 ${x.match}%</span><span class="src">${x.srcLabel}</span></div>
      <div class="rc-body"><h5>${x.name} <span style="font-size:11px;color:var(--muted)">· ${x.city}</span></h5>
      <div class="why">${x.why}</div>
      <div class="rc-meta"><span>⭐ ${x.rating}</span><span>💰 ${x.price}</span><span>${x.tag}</span></div></div></div>`).join('')||'<div class="empty-tip">暂无推荐</div>';
}
function renderRates(){
  const myRates=getRates();
  const albums=JSON.parse(localStorage.getItem('fmw_albums')||'[]');
  const checkedIds=albums.map(a=>SPOTS.find(s=>s.n===a.dest)).filter(Boolean).map(s=>s.id);
  const pool=(checkedIds.length?checkedIds:['erhai','gugong','ylw','ice','chiangmai','zjj','paris','inari']).slice(0,8);
  $('#rateStrip').innerHTML=pool.map(id=>{const s=spotById(id);if(!s)return'';const cur=myRates[id]||0;
    return `<div class="rate-item"><img src="${IMG(P[id])}"><b>${s.n}</b>
    <div class="stars">${[1,2,3,4,5].map(v=>`<button class="${v<=cur?'on':''}" data-id="${id}" data-v="${v}">★</button>`).join('')}</div></div>`}).join('');
  $$('#rateStrip .stars button').forEach(b=>b.onclick=()=>{setRate(b.dataset.id,+b.dataset.v);renderRates();renderRec();toast('⭐ 已评分 '+b.dataset.v+' 星，推荐已刷新')});
}
function renderRec(apiList,apiMode){
  const box=$('#recGrid');
  let list,mode;
  if(apiList&&apiList.length){mode=apiMode;list=apiList.map(x=>({id:x.id,match:x.match||Math.round((x.score||4)*20),why:x.why||'后端协同过滤推荐',score:x.score||4}))}
  else{const r=localRecommend(8);list=r.list;mode=r.mode}
  $('#recMode').textContent='🧮 当前算法：'+mode+(WGOAPI.status()===false?'（后端离线 · 本地演示数据）':'');
  box.innerHTML=list.map((x,i)=>{const s=spotById(x.id);if(!s)return'';const src=recSrcOf(x.id);
    return `<div class="rec-card" style="animation-delay:${i*.05}s" onclick="openSpot('${x.id}')">
      <div class="rc-img"><img src="${IMG(P[x.id],'landscape_16_9')}" loading="lazy">
        <span class="match">🎯 匹配 ${x.match}%</span>
        <span class="src">${src.p==='WANDERGO 站内'?'🧭 站内精选':(PLAT_LBL[src.p]||'📷 '+src.p)+' '+src.by}</span></div>
      <div class="rc-body"><h5>${s.n} <span style="font-size:11px;color:var(--muted)">· ${s.city}</span></h5>
      <div class="why">${x.why}</div>
      <div class="rc-meta"><span>⭐ ${s.rating}</span><span>💰 ${s.price}</span><span>${s.tag}</span></div></div></div>`}).join('')||'<div class="empty-tip">暂无推荐</div>';
}
async function refreshRec(){
  if(user){
    const r=await WGOAPI.recommend(8);
    if(r&&r.ok&&r.list&&r.list.length){renderRec(r.list,'Spring Boot 后端 UserCF（MySQL 评分数据）');return}
  }
  renderRec(null);
}
function apiChipRender(){
  const up=WGOAPI.status();
  const chip=$('#apiChip');
  chip.className='api-chip '+(up===true?'on':up===false?'off':'');
  chip.innerHTML=`<span class="dot"></span>${up===true?'Spring Boot 后端在线 · MySQL 已连接':up===false?'后端离线 · 本地演示模式（启动 D:\\wandergo-backend 可切换）':'正在探测后端…'}`;
}
/* ---- 爬虫数据源 ---- */
async function renderCrawl(){
  let data=null;
  try{const r=await fetch('js/spots_crawl.json');if(r.ok)data=await r.json()}catch(e){}
  if(!data||!data.length){$('#crawlGrid').innerHTML='<div class="empty-tip">暂未生成爬虫数据 · 运行 D:\\wandergo-crawler\\run.bat 一键抓取</div>';return}
  $('#crawlCount').textContent=data.length;
  $('#crawlGrid').innerHTML=data.slice(0,12).map(x=>`<div class="crawl-card"><b>${x.name}</b>
    <div class="cc-meta">📍 ${x.province} ${x.city} · ${x.tags||(x.cat||'')}<br>⭐ ${x.rating||x.score} · 热度 ${x.heat}</div>
    <span class="cc-src">🕷 爬虫来源：${x.src||'百度百科5A名录+OSM坐标'}</span></div>`).join('')
    +(data.length>12?`<div class="crawl-card" style="display:grid;place-items:center;color:var(--muted)">… 其余 ${data.length-12} 条存于 MySQL 数据库</div>`:'');
}
window.onUserRefresh=()=>{refreshRec();apiChipRender()};
document.addEventListener('DOMContentLoaded',()=>{
  renderRates();refreshRec();apiChipRender();renderCrawl();
  setTimeout(apiChipRender,2200);
});
