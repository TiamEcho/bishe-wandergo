/* =========================================================
 * WANDERGO PLATFORM · 个人中心 me.js
 * ========================================================= */
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
  /* 打卡记录 */
  $('#myCkList').innerHTML=albums.length?albums.map(a=>`<div class="mycheck" style="cursor:pointer" onclick='openAlbumById("${a.id}")'><span class="d">${a.date.slice(5).replace('-','/')}<br>${a.city.slice(0,3)}</span><div><b>${a.dest}</b><p>${a.text}</p></div><span class="cost">${fmt(a.total)}</span></div>`).join('')
  :'<div class="empty-tip" style="padding:18px">暂无打卡记录 · 去「我的打卡」创建第一条 ✨</div>';
  /* 徽章 */
  const n=albums.length;
  $('#meBadges').innerHTML=BADGES.map(b=>{const got=b.need<=n;return `<span class="badge-pill ${got?'got':''}" title="${b.desc}">${b.icon} ${b.name}${got?' ✔':''}</span>`}).join('');
  /* 评分记录 */
  const rates=getRates();
  const entries=Object.entries(rates);
  $('#meRates').innerHTML=entries.length?entries.map(([id,v])=>{const s=spotById(id);return s?`<div class="rate-row"><img src="${IMG(P[id])}"><div><b>${s.n}</b><p>${s.city} · ⭐${s.rating}</p></div><span class="stars">${'★'.repeat(v)}${'☆'.repeat(5-v)}</span><button class="btn line" style="padding:4px 10px;font-size:11px" onclick="delRate('${id}')">删除</button></div>`:''}).join('')
  :'<div class="empty-tip" style="padding:14px">暂无评分 · 去「猜你喜欢」给景点打星，协同过滤会越来越懂你 🎯</div>';
}
function delRate(id){const r=getRates();delete r[id];localStorage.setItem('fmw_rates',JSON.stringify(r));refreshMe();toast('已删除该评分')}
window.onUserRefresh=refreshMe;
document.addEventListener('DOMContentLoaded',()=>{
  refreshMe();
  $('#meCkBtn').onclick=()=>WGO.go('checkin.html');
  /* 后端状态探测 */
  WGOAPI.req('/api/user/list').then(r=>{
    const up=r!==null;
    $('#apiState').className='api-chip '+(up?'on':'off');
    $('#apiState').innerHTML=`<span class="dot"></span>${up?'Spring Boot 后端在线 · MySQL 已连接 · 注册/打卡/评分均入库':'后端离线 · 数据保存在浏览器本地（启动 D:\\wandergo-backend 后自动切换）'}`;
  });
  setTimeout(()=>{if($('#apiState').textContent.includes('探测')){$('#apiState').className='api-chip off';$('#apiState').innerHTML='<span class="dot"></span>后端离线 · 数据保存在浏览器本地（启动 D:\\wandergo-backend 后自动切换）'}},2500);
});
