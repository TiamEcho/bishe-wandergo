/* =========================================================
 * WANDERGO PLATFORM · 旅行工作台 workbench.js
 * 手账工坊 / 协同计划 / 文创素材库
 * ========================================================= */
$$('#wbTabs button').forEach(b=>b.onclick=()=>{
  $$('#wbTabs button').forEach(x=>x.classList.toggle('on',x===b));
  $('#wbJournal').style.display=b.dataset.w==='journal'?'':'none';
  $('#wbCollab').style.display=b.dataset.w==='collab'?'':'none';
  $('#wbShops').style.display=b.dataset.w==='shops'?'':'none';
});
/* ---- 手账工坊 ---- */
function jnHue(name){let h=0;for(let i=0;i<name.length;i++)h=(h*31+name.charCodeAt(i))>>>0;return h%360}
function jnPal(spot){const h=jnHue(spot.city||spot.n);return{main:`hsl(${h},48%,46%)`,deep:`hsl(${h},50%,26%)`,bg:`hsl(${h},34%,93%)`}}
const JSTYLES={draw:{n:'手绘线稿',bd:'2px dashed',r:'14px',f:'"Kaiti SC","楷体",serif'},water:{n:'水彩晕染',bd:'0',r:'24px',f:'"Yuanti SC","幼圆","Microsoft YaHei",serif'},film:{n:'复古胶片',bd:'3px double',r:'8px',f:'Georgia,serif'}};
let jnMode='ai';
function jnDays(spot){return[
 {t:'抵达 '+spot.city,d:'初见 '+spot.n+'，'+spot.desc+' 傍晚沿街慢行，尝一份本地人推荐的小吃，把旅行的第一页留给惊喜。'},
 {t:spot.n+' 全日深度',d:'上午直奔 '+spot.tag+' 主题游览；'+spot.traf+'；黄昏时分光线最柔，记得占好机位拍下属于你的那一帧。'},
 {t:'返程与手信',d:'睡到自然醒，带走 '+spot.city+' 的限定文创与味觉记忆，把这一页留给下一次重逢的理由。'}]}
function jnRender(mode){
  jnMode=mode;
  const spot=spotById($('#jnSpot').value)||SPOTS[0],st=JSTYLES[$('#jnStyle').value],pal=jnPal(spot);
  const sty=`--p:${pal.main};--pd:${pal.deep};--pb:${pal.bg};border:${st.bd} var(--pd);border-radius:${st.r};font-family:${st.f}`;
  const head=`<div class="jn-card jn-head" contenteditable="true" style="${sty}">
    <div class="jn-kick">${mode==='ai'?'🤖 AI 生成':'📷 自由创作'} · ${st.n}风 · 配色取自「${spot.city}」</div>
    <h3>${spot.city} 手账 · ${spot.n}</h3>
    <p>📍 ${spot.city} · ${spot.tag}<br>⏱ 建议游玩 ${spot.hrs}<br>🚏 ${spot.traf}</p>
    <div class="jn-stamp">WANDERGO TRAVEL JOURNAL · ${new Date().toLocaleDateString('zh-CN')}</div></div>`;
  const dayCards=jnDays(spot).map((d,i)=>`<div class="jn-card" contenteditable="true" style="${sty}">
    <span class="jn-day">DAY ${i+1}</span><h4>${d.t}</h4>
    <img src="${IMG(P[spot.id],'landscape_16_9')}" alt="${spot.n}"><p>${d.d}</p>
    <div class="jn-foot">✍️ 点击文字即可修改 · ${st.n}风</div></div>`).join('');
  $('#jnCards').innerHTML=head+dayCards+`<div class="jn-actions"><button class="btn gold" onclick="jnExport()">🖼 导出手账图片</button><button class="btn line" onclick="toggleBgm('calm');toast('♪ 手账 BGM · 宁静夜航')">♪ 手账 BGM</button></div>`;
}
$('#jnSpot').innerHTML=SPOTS.map(s=>`<option value="${s.id}">${s.n} · ${s.city}</option>`).join('');
$('#jnGen').onclick=()=>{jnRender('ai');toast('🤖 手账已生成 · 配色按「'+($('#jnSpot').selectedOptions[0].text.split(' · ')[1]||'目的地')+'」自动推荐')};
$('#jnFree').onclick=()=>{jnRender('free');toast('📷 自由创作模式 · 散落的照片与心得填进来')};
$('#jnStyle').onchange=$('#jnSpot').onchange=()=>{if($('#jnCards .jn-card'))jnRender(jnMode)};
function jnExport(){
  const spot=spotById($('#jnSpot').value)||SPOTS[0],pal=jnPal(spot);
  const cv=document.createElement('canvas');cv.width=1080;cv.height=1440;const g=cv.getContext('2d');
  const grd=g.createLinearGradient(0,0,0,1440);grd.addColorStop(0,pal.bg);grd.addColorStop(1,pal.main);g.fillStyle=grd;g.fillRect(0,0,1080,1440);
  g.strokeStyle=pal.deep;g.lineWidth=6;g.strokeRect(40,40,1000,1360);
  g.fillStyle=pal.deep;g.font='900 82px "Microsoft YaHei",sans-serif';g.fillText(spot.city+' 手账',80,190);
  g.font='36px "Microsoft YaHei",sans-serif';g.fillStyle='#fff';g.fillText('📍 '+spot.n+' · '+spot.tag,80,260);
  const img=new Image();img.crossOrigin='anonymous';
  const finish=()=>{try{const a=document.createElement('a');a.download='wandergo-'+spot.city+'-手账.png';a.href=cv.toDataURL('image/png');a.click();toast('🖼 手账图片已导出')}
    catch(e){g.fillStyle='rgba(255,255,255,.9)';g.fillRect(80,330,920,500);g.fillStyle=pal.deep;g.font='30px sans-serif';g.fillText('✈️ '+spot.n,110,560);g.font='24px sans-serif';g.fillText('（图片跨域受限，已用纯排版导出）',110,610);
      const a=document.createElement('a');a.download='wandergo-'+spot.city+'-手账.png';a.href=cv.toDataURL('image/png');a.click();toast('🖼 已导出（纯排版模式）')}};
  img.onload=()=>{g.drawImage(img,80,330,920,500);
    g.fillStyle='#fff';g.font='32px "Microsoft YaHei",sans-serif';
    jnDays(spot).forEach((d,i)=>g.fillText('DAY '+(i+1)+' · '+d.t,80,920+i*88));
    g.font='24px sans-serif';g.fillText('WANDERGO TRAVEL JOURNAL · '+new Date().toLocaleDateString('zh-CN'),80,1340);finish()};
  img.onerror=finish;img.src=IMG(P[spot.id],'landscape_16_9');
}
/* ---- 协同计划 ---- */
let CT=JSON.parse(localStorage.getItem('fmw_ct')||'[]'),
    EX=JSON.parse(localStorage.getItem('fmw_ex')||'[]'),
    VT=JSON.parse(localStorage.getItem('fmw_vt')||'null')||[
      {id:'v1',q:'Day2 去卢浮宫还是奥赛美术馆？',a:3,b:1},{id:'v2',q:'住民宿还是连锁酒店？',a:2,b:2}];
const MEMS=[['小王',7],['阿澄',12],['Vera',19],['老周',38]];
$('#wbMems').innerHTML=MEMS.map(m=>`<span class="wb-mem" title="${m[0]}" style="background:hsl(${m[1]},50%,45%)">${m[0][0]}</span>`).join('');
function ctClass(t){return /机场|航班|MU|CA|CZ|HU|[A-Z]{2}\d{3,4}|→/.test(t)?['✈️ 机票','fly']:/酒店|民宿|Hotel|住宿|\d晚/.test(t)?['🏨 住宿','stay']:/高铁|火车|G\d+|D\d+/.test(t)?['🚄 交通','rail']:['📅 日程','plan']}
function renderCT(){
  $('#ctList').innerHTML=CT.map((t,i)=>`<div class="ct-item"><span class="ct-tag ${t.c}">${t.e}</span><span class="ct-tx" contenteditable="true">${t.t}</span><button class="ct-del" onclick="ctDel(${i})">✕</button></div>`).join('')||'<div class="empty-tip">暂无条目 · 粘贴机酒信息试试（多人共建，条目全员可改）</div>';
}
$('#ctParse').onclick=()=>{
  const lines=$('#ctInput').value.split('\n').map(s=>s.trim()).filter(Boolean);
  if(!lines.length)return toast('先粘贴机酒信息，每行一条');
  lines.forEach(t=>{const[e,c]=ctClass(t);CT.push({t,e,c})});
  $('#ctInput').value='';localStorage.setItem('fmw_ct',JSON.stringify(CT));renderCT();
  toast('🧾 已识别 '+lines.length+' 条 · 已同步给 4 位同行人');
};
function ctDel(i){CT.splice(i,1);localStorage.setItem('fmw_ct',JSON.stringify(CT));renderCT()}
function renderEX(){
  const sum=EX.reduce((a,b)=>a+b.a,0);
  $('#exList').innerHTML=EX.map((x,i)=>`<div class="ct-item"><span style="flex:1">${x.n}</span><b style="color:var(--gold)">¥${x.a}</b><button class="ct-del" onclick="exDel(${i})">✕</button></div>`).join('')||'<div class="empty-tip">还没有记账</div>';
  $('#exTotal').innerHTML=sum?`本单合计 <b>¥${sum}</b> · ${MEMS.length} 人协同，人均 <b>¥${Math.round(sum/MEMS.length)}</b>`:'';
}
$('#exAdd').onclick=()=>{
  const n=$('#exName').value.trim(),a=+$('#exAmt').value;
  if(!n||!a)return toast('填写名目和金额');
  EX.push({n,a});$('#exName').value='';$('#exAmt').value='';
  localStorage.setItem('fmw_ex',JSON.stringify(EX));renderEX();toast('💰 已记账 · 自动人均分摊');
};
function exDel(i){EX.splice(i,1);localStorage.setItem('fmw_ex',JSON.stringify(EX));renderEX()}
function renderVT(){
  $('#vtList').innerHTML=VT.map(v=>{const tot=v.a+v.b||1;return `<div class="vt-item"><p>${v.q}</p>
    <div class="vt-bars"><div class="vt-bar"><i style="width:${v.a/tot*100}%"></i><span>👍 赞成 ${v.a}</span></div>
    <div class="vt-bar alt"><i style="width:${v.b/tot*100}%"></i><span>👎 反对 ${v.b}</span></div></div>
    <div class="vt-btns"><button onclick="vtVote('${v.id}',1)">投赞成</button><button onclick="vtVote('${v.id}',-1)">投反对</button></div></div>`}).join('');
}
function vtVote(id,d){const v=VT.find(x=>x.id===id);if(!v)return;d>0?v.a++:v.b++;
  localStorage.setItem('fmw_vt',JSON.stringify(VT));renderVT();toast(d>0?'👍 已投赞成票':'👎 已投反对票')}
$('#vtAdd').onclick=()=>{const q=$('#vtInput').value.trim();if(!q)return toast('填写提案内容');
  VT.push({id:'v'+Date.now(),q,a:0,b:0});$('#vtInput').value='';
  localStorage.setItem('fmw_vt',JSON.stringify(VT));renderVT();toast('🗳 投票已发起 · 已通知同行人')};
/* ---- 文创素材库 ---- */
const SHOP_CITY=[...new Set(SHOPS.map(s=>s.city))];let shopCity='all';
function renderShops(){
  $('#shopTabs').innerHTML=['all',...SHOP_CITY].map(c=>`<button class="${c===shopCity?'on':''}" data-c="${c}">${c==='all'?'🌐 全部':c}</button>`).join('');
  $$('#shopTabs button').forEach(b=>b.onclick=()=>{shopCity=b.dataset.c;renderShops()});
  $('#shopGrid').innerHTML=SHOPS.filter(s=>shopCity==='all'||s.city===shopCity).map(s=>{
    const sp=spotById(s.near);
    return `<div class="shop-card"><div class="shop-top"><h4>${s.name}</h4><span class="shop-type">${s.type}</span></div>
    <p class="shop-row">📍 ${s.addr}</p><p class="shop-row">🕐 ${s.hours}</p>
    <p class="shop-feat">${s.feat}</p>
    ${sp?`<button class="shop-near" onclick="openSpot('${sp.id}')">🧭 顺路 · ${sp.n}（点击看景点攻略）</button>`:''}</div>`}).join('')||'<div class="empty-tip">该城市暂无收录</div>';
}
document.addEventListener('DOMContentLoaded',()=>{renderCT();renderEX();renderVT();renderShops();
  /* 深度链接：workbench.html?shop=xx 切到文创库 */
  const shop=WGO.q('shop');
  if(shop){const btn=document.querySelector('#wbTabs [data-w="shops"]');if(btn)btn.click();
    setTimeout(()=>{const card=[...document.querySelectorAll('.shop-card')].find(c=>c.querySelector('h4').textContent===shop);if(card){card.style.outline='2px solid var(--gold)';card.scrollIntoView({block:'center'})}if(SHOPS.find(s=>s.name===shop))openSpot(SHOPS.find(s=>s.name===shop).near)},260)}
});
