/* =========================================================
 * WANDERGO PLATFORM · 个人中心 me.js
 * 打卡记录 / 徽章墙 / 评分列表三块由 Vue 3 岛屿渲染
 * ========================================================= */

/* ---------- Vue 岛屿：三个列表共用一个挂载器 ---------- */
const meStores={
  ck:{list:[]},   /* 我的打卡记录 */
  badge:{list:[]},/* 徽章墙 */
  rate:{list:[]}  /* 我的评分 */
};
const meApps={ck:null,badge:null,rate:null};

function mountMeVue(key,sel,template,methods){
  const el=$(sel);
  if(!el||!window.Vue)return null;
  if(meApps[key])return meApps[key];
  const st=Vue.reactive(meStores[key]);
  meApps[key]=Vue.createApp({setup(){return{store:st}},methods:methods||{},template}).mount(sel);
  return meApps[key];
}

/* ---------- 打卡记录 ---------- */
function renderMyChecks(albums){
  const vm=albums.map(a=>({
    id:a.id,dest:a.dest,text:a.text,mood:a.mood,costTxt:fmt(a.total),
    d:a.date.slice(5).replace('-','/'),city:a.city.slice(0,3)
  }));
  const app=mountMeVue('ck','#myCkList',`
      <div class="mycheck" style="cursor:pointer" v-for="a in store.list" :key="a.id" @click="open(a.id)">
        <span class="d">{{a.d}}<br>{{a.city}}</span>
        <div><b>{{a.dest}}</b><p>{{a.text}}</p></div>
        <span class="cost">{{a.costTxt}}</span>
      </div>
      <div class="empty-tip" style="padding:18px" v-if="!store.list.length">暂无打卡记录 · 去「我的打卡」创建第一条 ✨</div>`,
    {open(id){openAlbumById(id)}});
  if(app){meStores.ck.list=vm;return true}
  return false;
}

/* ---------- 徽章墙 ---------- */
function renderMeBadges(albums){
  const n=albums.length;
  const vm=BADGES.map(b=>{const got=b.need<=n;return {id:b.id,icon:b.icon,name:b.name,desc:b.desc,got}});
  const app=mountMeVue('badge','#meBadges',`
      <span class="badge-pill" :class="{got:b.got}" :title="b.desc" v-for="b in store.list" :key="b.id">
        {{b.icon}} {{b.name}}{{b.got?' ✔':''}}
      </span>`,null);
  if(app){meStores.badge.list=vm;return true}
  return false;
}

/* ---------- 评分列表 ---------- */
function renderMeRates(rates){
  const vm=Object.entries(rates).map(([id,v])=>{
    const s=spotById(id);if(!s)return null;
    return {id,name:s.n,city:s.city,rating:s.rating,
      img:IMG(P[id]),stars:'★'.repeat(v)+'☆'.repeat(5-v)};
  }).filter(Boolean);
  const app=mountMeVue('rate','#meRates',`
      <div class="rate-row" v-for="r in store.list" :key="r.id">
        <img :src="r.img">
        <div><b>{{r.name}}</b><p>{{r.city}} · ⭐{{r.rating}}</p></div>
        <span class="stars">{{r.stars}}</span>
        <button class="btn line" style="padding:4px 10px;font-size:11px" @click="del(r.id)">删除</button>
      </div>
      <div class="empty-tip" style="padding:14px" v-if="!store.list.length">暂无评分 · 去「猜你喜欢」给景点打星，协同过滤会越来越懂你 🎯</div>`,
    {del(id){delRate(id)}});
  if(app){meStores.rate.list=vm;return true}
  return false;
}

function refreshMe(){
  const albums=JSON.parse(localStorage.getItem('fmw_albums')||'[]');
  const total=albums.reduce((a,b)=>a+b.total,0);
  const cities=new Set(albums.map(a=>a.city));
  if(user){$('#meAv').textContent=user.nick[0];$('#meName').textContent=user.nick;
    $('#meLv').textContent=(user.from==='api'?'✈️ 旅行者 Lv.2 · 已同步 MySQL':'✈️ 旅行者 Lv.2 · 本地模式');$('#logoutBtn2').textContent='退出登录';}
  else{$('#meAv').textContent='旅';$('#meName').textContent='未登录旅行者';$('#meLv').textContent='🧭 预览模式';$('#logoutBtn2').textContent='去登录';}
  $('#msCk').textContent=albums.length;$('#msCost').textContent='¥'+total.toLocaleString('zh-CN');$('#msCity').textContent=cities.size;
  const lit=litSet();
  $('#msLit').textContent=lit.size;

  /* 打卡记录：Vue 优先，未加载 Vue 时走原生拼接兜底 */
  if(!renderMyChecks(albums)){
    $('#myCkList').innerHTML=albums.length?albums.map(a=>`<div class="mycheck" style="cursor:pointer" onclick='openAlbumById("${a.id}")'><span class="d">${a.date.slice(5).replace('-','/')}<br>${a.city.slice(0,3)}</span><div><b>${a.dest}</b><p>${a.text}</p></div><span class="cost">${fmt(a.total)}</span></div>`).join('')
    :'<div class="empty-tip" style="padding:18px">暂无打卡记录 · 去「我的打卡」创建第一条 ✨</div>';
  }
  /* 徽章 */
  if(!renderMeBadges(albums)){
    $('#meBadges').innerHTML=BADGES.map(b=>{const got=b.need<=albums.length;return `<span class="badge-pill ${got?'got':''}" title="${b.desc}">${b.icon} ${b.name}${got?' ✔':''}</span>`}).join('');
  }
  /* 评分记录 */
  const rates=(typeof getRates==='function')?getRates():{};
  if(!renderMeRates(rates)){
    const entries=Object.entries(rates);
    $('#meRates').innerHTML=entries.length?entries.map(([id,v])=>{const s=spotById(id);return s?`<div class="rate-row"><img src="${IMG(P[id])}"><div><b>${s.n}</b><p>${s.city} · ⭐${s.rating}</p></div><span class="stars">${'★'.repeat(v)}${'☆'.repeat(5-v)}</span><button class="btn line" style="padding:4px 10px;font-size:11px" onclick="delRate('${id}')">删除</button></div>`:''}).join('')
    :'<div class="empty-tip" style="padding:14px">暂无评分 · 去「猜你喜欢」给景点打星，协同过滤会越来越懂你 🎯</div>';
  }
}
function delRate(id){const r=getRates();delete r[id];localStorage.setItem('fmw_rates',JSON.stringify(r));refreshMe();toast('已删除该评分')}
window.onUserRefresh=refreshMe;
document.addEventListener('DOMContentLoaded',()=>{
  refreshMe();
  $('#meCkBtn').onclick=()=>WGO.go('checkin.html');
  /* 后端状态探测 */
  WGOAPI.req('/api/user/list').then(r=>{
    const up=r!==null;
    const el=$('#apiState');if(!el)return;
    el.className='api-chip '+(up?'on':'off');
    el.innerHTML=`<span class="dot"></span>${up?'Spring Boot 后端在线 · MySQL 已连接 · 注册/打卡/评分均入库':'后端离线 · 数据保存在浏览器本地（启动 D:\\wandergo-backend 后自动切换）'}`;
  });
  setTimeout(()=>{const el=$('#apiState');if(!el)return;if(el.textContent.includes('探测')){el.className='api-chip off';el.innerHTML='<span class="dot"></span>后端离线 · 数据保存在浏览器本地（启动 D:\\wandergo-backend 后自动切换）'}},2500);
});
