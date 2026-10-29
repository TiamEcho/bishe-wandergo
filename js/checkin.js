/* =========================================================
 * WANDERGO PLATFORM · 打卡 checkin.js
 * 打卡发布（攻略/视频合集/Plog）+ 纪念册 + 徽章奖励 + 排行榜
 * ========================================================= */
let ckImgs=[],ckLock=false,ckType='post';
/* 目的地解析：优先景点 id，其次城市地名（来自 DEST_LIST），返回统一结构的 spot 对象 */
function ckResolveDest(v){
  if(!v)return null;
  const s=spotById(v);if(s)return s;
  const d=DEST_LIST.find(x=>x[0]===v);if(!d)return null;
  const ab=d[2]==='国外';
  return {id:'d_'+d[0],n:d[0],city:d[0]+' · '+d[1],rg:ab?'ab':'cn'};
}
function initCk(){
  const sel=$('#ckDest');
  sel.innerHTML=destOptionsHtml();
  $('#ckDate').value=new Date().toISOString().slice(0,10);
  addCostRow();
  $('#addCost').onclick=addCostRow;
  $('#upZone').onclick=()=>$('#ckFiles').click();
  $('#ckFiles').onchange=e=>{[...e.target.files].forEach(f=>{
    if(f.type.startsWith('image/')){downscale(f,url=>{ckImgs.push({type:'img',url,name:f.name});renderPv()})}
    else if(f.type.startsWith('video/')){ckImgs.push({type:'video',url:URL.createObjectURL(f),name:f.name});renderPv()}
    else toast('仅支持图片/视频文件');
  });e.target.value=''};
  $$('#moods button').forEach(b=>b.onclick=()=>{$$('#moods button').forEach(x=>x.classList.toggle('on',x===b))});
  $$('#ckTypeTabs button').forEach(b=>b.onclick=()=>{ckType=b.dataset.t;$$('#ckTypeTabs button').forEach(x=>x.classList.toggle('on',x===b));
    $('#typeHint').textContent={post:'📝 打卡攻略：图文 + 花费明细，会成为别人的真实攻略',video:'🎬 打卡视频合集：视频 + 图片 + BGM，自动生成可播放的打卡视频',plog:'📷 Plog：图片 + 碎片化文字，记录旅途的松弛感'}[ckType]});
  $('#ckForm').onsubmit=submitCk;
  /* 深度链接预选 */
  const d=WGO.q('dest');
  if(d&&spotById(d))sel.value=d;
}
function addCostRow(){
  if(mountCostVue()){costStore.rows.push({k:'🚄 交通',v:''});return}
  const d=document.createElement('div');d.className='cost-row';
  d.innerHTML=`<select><option>🚄 交通</option><option>🏨 住宿</option><option>🍜 餐饮</option><option>🎫 门票</option><option>🛍 其他</option></select><input type="number" min="0" placeholder="金额 ¥" oninput="sumCost()"><button type="button" class="del" onclick="this.parentNode.remove();sumCost()">✕</button>`;
  $('#costRows').appendChild(d);
}
/* ---- 花费明细：Vue 3 岛屿（每行选择、金额、合计都是响应式） ---- */
let costStore=null,costApp=null;
function mountCostVue(){
  if(costApp||!window.Vue||!$('#costRows'))return costApp;
  costStore=Vue.reactive({rows:[]});   /* 首行由 addCostRow 统一 push，避免重复行 */
  costApp=Vue.createApp({
    setup(){
      const total=Vue.computed(()=>costStore.rows.reduce((a,r)=>a+(+r.v||0),0));
      Vue.watch(total,v=>{const el=document.querySelector('#costSum');if(el)el.textContent='¥ '+v.toLocaleString('zh-CN')},{immediate:true});
      return{store:costStore,total};
    },
    template:`
      <div class="cost-row" v-for="(r,i) in store.rows" :key="i">
        <select v-model="r.k">
          <option>🚄 交通</option><option>🏨 住宿</option><option>🍜 餐饮</option>
          <option>🎫 门票</option><option>🛍 其他</option>
        </select>
        <input type="number" min="0" placeholder="金额 ¥" v-model="r.v">
        <button type="button" class="del" @click="store.rows.splice(i,1)">✕</button>
      </div>`
  }).mount('#costRows');
  return costApp;
}
function sumCost(){
  if(costApp)return costStore.rows.reduce((a,r)=>a+(+r.v||0),0);
  let t=0;$$('#costRows input').forEach(i=>t+=+i.value||0);$('#costSum').textContent='¥ '+t.toLocaleString('zh-CN');return t;
}
function downscale(file,cb){
  const r=new FileReader();r.onload=e=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');const w=Math.min(760,im.width);c.width=w;c.height=im.height*w/im.width;c.getContext('2d').drawImage(im,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',.72))};im.src=e.target.result};r.readAsDataURL(file);
}
function renderPv(){
  $('#upPreviews').innerHTML=ckImgs.map((it,i)=>`<div class="pv">${it.type==='img'?`<img src="${it.url}">`:`<video src="${it.url}" muted></video><span class="vtag">视频</span>`}<span class="x" onclick="ckImgs.splice(${i},1);renderPv()">✕</span></div>`).join('');
}
function submitCk(e){
  e.preventDefault();
  if(ckLock)return;ckLock=true;setTimeout(()=>ckLock=false,1500);
  if(!user){openAuth();toast('登录后即可打卡并同步纪念册 ✨');return}
  const spot=ckResolveDest($('#ckDest').value);if(!spot)return toast('请选择目的地');
  const text=$('#ckText').value.trim()||'这一站没有留下太多文字，但照片都记得。';
  const mood=$('#moods button.on')?$('#moods button.on').textContent:'😌 治愈放松';
  const bgm=$('#ckBgm').value;
  const costs=costApp
    ? costStore.rows.filter(r=>+r.v>0).map(r=>({k:r.k,v:+r.v}))
    : (()=>{const arr=[];$$('#costRows .cost-row').forEach(r=>{const k=r.querySelector('select').value,v=+r.querySelector('input').value||0;if(v)arr.push({k,v})});return arr})();
  const total=costs.reduce((a,b)=>a+b.v,0);
  const rec={id:'ck'+Date.now(),dest:spot.n,city:spot.city,date:$('#ckDate').value,text,mood,bgm,type:ckType,costs,total,
    imgs:ckImgs.filter(i=>i.type==='img').map(i=>i.url).slice(0,4),hasVideo:ckImgs.some(i=>i.type==='video')};
  const albums=JSON.parse(localStorage.getItem('fmw_albums')||'[]');albums.unshift(rec);localStorage.setItem('fmw_albums',JSON.stringify(albums));
  const posts=JSON.parse(localStorage.getItem('fmw_posts')||'[]');
  posts.unshift({id:rec.id,u:user.nick,c:'#c98a2e',loc:spot.city+' · '+spot.n,rg:spot.rg,type:ckType==='video'?'video':ckType==='plog'?'plog':'img',time:'刚刚',txt:rec.text+'（'+mood+'）',likes:0,cmts:0,imgs:[spot.id],bgm:bgm==='none'?null:bgm,plat:'go'});
  localStorage.setItem('fmw_posts',JSON.stringify(posts));
  /* 上报后端（不阻塞） */
  WGOAPI.pushCheckin({nick:user.nick,spot:spot.n,city:spot.city,date:rec.date,text:rec.text,total,mood});
  renderAlbums();renderRewards();renderRanks();
  ckImgs=[];renderPv();$('#ckText').value='';$('#costRows').innerHTML='';addCostRow();sumCost();
  openAlbum(rec);
  toast('打卡成功！纪念册已生成并同步社区 · 足迹已在地图点亮 ✨','ok');
}
function renderAlbums(){
  const albums=JSON.parse(localStorage.getItem('fmw_albums')||'[]');
  $('#albumsGrid').innerHTML=albums.length?albums.map(a=>`<div class="album-card" onclick='openAlbumById("${a.id}")'>
    <span class="tape"></span>
    <img src="${a.imgs[0]||IMG(P.gugong)}">
    <div class="ab"><h5>${a.dest}</h5><p>${a.date} · ${a.city}</p><div class="am"><span>💰 <b>${fmt(a.total)}</b></span><span>${a.mood}</span></div></div></div>`).join('')
  :'<div class="empty-tip">还没有纪念册 · 提交一次打卡就会自动生成第一页 ✨</div>';
}
function openAlbumById(id){const a=JSON.parse(localStorage.getItem('fmw_albums')||'[]').find(x=>x.id===id);if(a)openAlbum(a)}
function openAlbum(a){
  const costsHtml=a.costs.map(c=>`<div class="li"><span>${c.k}</span><span>${fmt(c.v)}</span></div>`).join('');
  const photos=(a.imgs.length?a.imgs:[IMG(P.gugong),IMG(P.erhai)]).slice(0,4);
  const spot=SPOTS.find(s=>s.n===a.dest);
  openModal(`<div class="album-modal">
    <div class="album-inner"><span class="tape"></span>
      <div class="album-cover"><img src="${a.imgs[0]||IMG(P.gugong,'landscape_16_9')}"><div class="cap">🪄 ${a.dest} · ${a.date} · ${a.city}</div></div>
      <div class="album-route"><span>🏠 家</span><span class="fly">✈️ - - - - -</span><span>📍 ${a.dest}</span><span class="fly">- - - - ✈️</span><span>🏠 带着故事回家</span></div>
      <div class="album-quote">“${a.text}” —— ${a.mood}</div>
      <div class="album-photos">${photos.map(u=>`<img src="${u}">`).join('')}</div>
      <div class="album-stats"><span>💰 实际花费 <b>${fmt(a.total)}</b></span>${a.costs.map(c=>`<span>${c.k} <b>${fmt(c.v)}</b></span>`).join('')}${a.hasVideo?'<span>🎬 含打卡视频</span>':''}${a.bgm&&a.bgm!=='none'?`<span class="bgm-btn" style="cursor:pointer" onclick="toggleBgm('${a.bgm}')">♪ 播放纪念册 BGM</span>`:''}</div>
      <div class="album-sync">✔ 已同步到社区动态，成为其他旅行者的真实攻略</div>
      <div class="dbtns"><button class="btn line" onclick="closeModal()">收起纪念册</button>${spot?`<button class="btn line" onclick="WGO.go('map.html',{spot:'${spot.id}'})">🗺 看地图足迹</button>`:''}<button class="btn gold" onclick="WGO.go('community.html')">去社区看看</button></div>
    </div></div>`);
}
/* ================= 奖励体系 ================= */
function myVideosCount(){return JSON.parse(localStorage.getItem('fmw_posts')||'[]').filter(p=>p.type==='video'&&p.plat==='go').length}
function renderRewards(){
  const albums=JSON.parse(localStorage.getItem('fmw_albums')||'[]');
  const n=albums.length,v=myVideosCount();
  /* 同城榜单判定 */
  const inTop=rankMe('city')<=10;
  $('#rewardGrid').innerHTML=BADGES.map(b=>{
    const cur=b.id==='b4'?v:n;
    const got=b.id==='b6'?inTop:cur>=b.need;
    return `<div class="badge-card ${got?'got':''}">${got?'':'<span class="lock">🔒</span>'}
      <span class="bi">${b.icon}</span><b>${b.name}</b><p>${b.desc}</p>
      <div class="prog"><i style="width:${Math.min(100,cur/b.need*100)}%"></i></div>
      <p style="margin-top:5px;color:${got?'var(--gold)':'var(--muted)'}">${got?'✔ 已解锁':`${Math.min(cur,b.need)}/${b.need}`}</p></div>`}).join('');
}
/* ================= 排行榜 ================= */
function rankMe(scope){
  const n=JSON.parse(localStorage.getItem('fmw_albums')||'[]').length;
  const list=scope==='nation'?RANK_NATION.map(x=>x.n):RANK_CITY[$('#rankCity').value].map(x=>x.n);
  let r=1;list.forEach(x=>{if(x>n)r++});return r;
}
function renderRanks(){
  const n=JSON.parse(localStorage.getItem('fmw_albums')||'[]').length;
  const nick=user?user.nick:'（未登录）';
  const city=$('#rankCity').value;
  /* 全国榜 */
  const nation=[...RANK_NATION.map(x=>({...x,me:false})),{u:nick,n,me:true}].sort((a,b)=>b.n-a.n).slice(0,10);
  const meRankN=nation.findIndex(x=>x.me)+1;
  $('#rankNation').innerHTML=nation.map((x,i)=>`<div class="rank-row ${x.me?'me':''}"><span class="rk">${i+1}</span><b>${x.u}${x.me?' · 我':''}</b><span class="cnt">${x.n} 次</span></div>`).join('')
    +`<div class="rank-row me" style="margin-top:8px"><span class="rk">—</span><b>我的全国名次</b><span class="cnt">No.${meRankN}</span></div>`;
  /* 同城榜 */
  const cityL=[...RANK_CITY[city].map(x=>({...x,me:false})),{u:nick,n,me:true}].sort((a,b)=>b.n-a.n).slice(0,10);
  const meRankC=cityL.findIndex(x=>x.me)+1;
  $('#rankCityList').innerHTML=cityL.map((x,i)=>`<div class="rank-row ${x.me?'me':''}"><span class="rk">${i+1}</span><b>${x.u}${x.me?' · 我':''}</b><span class="cnt">${x.n} 次</span></div>`).join('')
    +`<div class="rank-row me" style="margin-top:8px"><span class="rk">—</span><b>我的「${city}」名次</b><span class="cnt">No.${meRankC}</span></div>`;
  /* 奖励提示 */
  const tip=$('#rankTip');
  tip.innerHTML=meRankC<=3?`🏆 你已进入「${city}」同城榜 TOP3！可到个人中心领取<b style="color:var(--gold)">城市旅行家电子勋章 + 文创九折券</b>`
    :meRankC<=10?`🎉 你已进入「${city}」同城榜 TOP10，解锁「同城之光」徽章！`
    :`再打卡 ${Math.max(1,RANK_CITY[city][RANK_CITY[city].length-1].n-n+1)} 次即可冲进同城榜 TOP10，领取小奖励 ✨`;
}
document.addEventListener('DOMContentLoaded',()=>{
  if($('#ckForm'))initCk();
  renderAlbums&&renderAlbums();
  if($('#rewardGrid'))renderRewards();
  if($('#rankNation')){renderRanks();$('#rankCity').onchange=renderRanks}
});
