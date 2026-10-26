/* =========================================================
 * WANDERGO PLATFORM · 社区 community.js
 * 动态流（视频/Vlog/Plog/图文）+ 多平台筛选 + 4K 精选 + 话题热度榜
 * ========================================================= */
let feedFilter='all',platFilter='all',heatSort='heat';
/* ---- 帖子流：Vue 3 岛屿渲染（筛选/点赞为响应式，页面其余动效保持原生） ---- */
let feedStore=null,feedApp=null;
function decoratePost(p){
  const pl=PLAT[p.plat||'go'];
  return Object.assign({},p,{
    img:p.imgs&&p.imgs[0]?IMG(P[p.imgs[0]]):'',
    platName:pl.n,platIcon:pl.i,platKey:p.plat||'go',
    bgmLabel:p.bgm?BGMI(p.bgm):'',
    chips:(p.topics||[]).filter(t=>topicById(t)).map(t=>({id:t,name:topicById(t).name})),
    liked:false
  });
}
function mountFeedVue(){
  if(feedApp||!window.Vue||!$('#feedGrid'))return feedApp;
  feedStore=Vue.reactive({items:[]});
  feedApp=Vue.createApp({
    setup(){return{store:feedStore}},
    methods:{
      openPost(p){openPost(p.id)},
      like(p,e){e.stopPropagation();p.liked=!p.liked;p.likes+=p.liked?1:-1},
      topic(t,e){e.stopPropagation();openTopic(t.id)}
    },
    template:`
      <div class="post" v-for="p in store.items" :key="p.id" @click="openPost(p)" style="cursor:pointer">
        <div class="pimg">
          <img :src="p.img" loading="lazy">
          <template v-if="p.type==='video'"><span class="vbadge"><i>▶</i></span><span class="moren">{{p.bgmLabel}}</span></template>
          <span class="moren" v-if="p.type==='plog'">📷 Plog</span>
          <span class="plat" :class="'pb-'+p.platKey" style="position:absolute;top:9px;right:9px">{{p.platIcon}} {{p.platName}}</span>
        </div>
        <div class="pbody">
          <div class="pu"><span class="av" :style="{background:p.c}">{{p.u[0]}}</span>
            <div><h5>{{p.u}}</h5><p>{{p.time}} · 📍 {{p.loc}}</p></div></div>
          <p class="ptxt">{{p.txt}}</p>
          <div class="tchips">
            <span class="topic-chip" v-for="t in p.chips" :key="t.id" @click="topic(t,$event)"># {{t.name}}</span>
          </div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:9px;align-items:center">
            <span class="tagpill ab" v-if="p.type==='video'">🎬 打卡视频</span>
            <span class="tagpill cn" v-if="p.type==='plog'">📷 Plog</span>
            <span class="tagpill real" v-if="p.real">真实攻略</span>
            <span class="more-link">查看全文 →</span>
          </div>
          <div class="pfoot">
            <span class="act" :class="{liked:p.liked}" @click="like(p,$event)">{{p.liked?'♥':'♡'}} <i style="font-style:normal" class="ln">{{p.likes}}</i></span>
            <span>💬 {{p.cmts}}</span>
            <span style="margin-left:auto;font-size:10.5px">{{p.platName}}</span>
          </div>
        </div>
      </div>
      <div class="empty-tip" v-if="!store.items.length">该平台暂无内容，试试其他平台筛选～</div>`
  }).mount('#feedGrid');
  return feedApp;
}
function renderFeed(){
  const mine=JSON.parse(localStorage.getItem('fmw_posts')||'[]');
  const all=[...mine,...POSTS];
  const list=all.filter(p=>(feedFilter==='all'?true:feedFilter==='video'||feedFilter==='plog'?p.type===feedFilter:p.rg===feedFilter)&&(platFilter==='all'?true:p.plat===platFilter));
  if(mountFeedVue()){feedStore.items=list.map(decoratePost);return}
  $('#feedGrid').innerHTML=list.map(p=>{
    const pl=PLAT[p.plat||'go'];
    const typeTag=p.type==='video'?'<span class="tagpill ab">🎬 打卡视频</span>':p.type==='plog'?'<span class="tagpill cn">📷 Plog</span>':'';
    const realTag=p.real?'<span class="tagpill real">真实攻略</span>':'';
    const chips=(p.topics||[]).map(t=>topicById(t)?`<span class="topic-chip" onclick="event.stopPropagation();openTopic('${t}')"># ${topicById(t).name}</span>`:'').join('');
    return `<div class="post" onclick="openPost('${p.id}')" style="cursor:pointer">
      <div class="pimg">
        <img src="${IMG(P[p.imgs[0]])}" loading="lazy">
        ${p.type==='video'?'<span class="vbadge"><i>▶</i></span><span class="moren">'+BGMI(p.bgm)+'</span>':''}
        ${p.type==='plog'?'<span class="moren">📷 Plog</span>':''}
        <span class="plat pb-${p.plat||'go'}" style="position:absolute;top:9px;right:9px">${pl.i} ${pl.n}</span>
      </div>
      <div class="pbody">
        <div class="pu"><span class="av" style="background:${p.c}">${p.u[0]}</span><div><h5>${p.u}</h5><p>${p.time} · 📍 ${p.loc}</p></div></div>
        <p class="ptxt">${p.txt}</p>
        <div class="tchips">${chips}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:9px;align-items:center">${typeTag}${realTag}<span class="more-link">查看全文 →</span></div>
        <div class="pfoot"><span class="act" onclick="event.stopPropagation();likePost(this,'${p.id}')">♡ <i style="font-style:normal" class="ln">${p.likes}</i></span><span>💬 ${p.cmts}</span><span style="margin-left:auto;font-size:10.5px">${pl.n}</span></div>
      </div></div>`}).join('')||'<div class="empty-tip">该平台暂无内容，试试其他平台筛选～</div>';
}
$$('#feedTabs button').forEach(b=>b.onclick=()=>{feedFilter=b.dataset.f;$$('#feedTabs button').forEach(x=>x.classList.toggle('on',x===b));renderFeed()});
$$('#platTabs button').forEach(b=>b.onclick=()=>{platFilter=b.dataset.p;$$('#platTabs button').forEach(x=>x.classList.toggle('on',x===b));renderFeed()});
function likePost(el,id){el.classList.toggle('liked');const n=el.querySelector('.ln');n.textContent=+n.textContent+(el.classList.contains('liked')?1:-1);el.firstChild.textContent=el.classList.contains('liked')?'♥ ':'♡ '}
/* ---- 精选 4K 摄影 ---- */
function renderFeatured(){
  $('#featStrip').innerHTML=FEATURED.map((f,i)=>`<div class="feat-card" onclick="openFeat(${i})"><img src="${IMG(P[f.img],'landscape_16_9')}" loading="lazy"><span class="plat pb-${f.plat}">${PLAT[f.plat].i} ${PLAT[f.plat].n}</span><span class="fourk">4K</span><div class="fc-info"><h5>${f.t}</h5><p>📍 ${f.loc} · 📷 ${f.by}</p></div></div>`).join('');
}
function openFeat(i){
  const f=FEATURED[i];if(!f)return;
  openModal(`<div class="fd-img big"><img src="${IMG(P[f.img],'landscape_16_9')}"><span class="fourk">4K ULTRA HD</span><span class="plat pb-${f.plat}" style="position:absolute;top:10px;right:44px">${PLAT[f.plat].i} ${PLAT[f.plat].n}</span></div>
    <div class="dbody"><h3 style="font-size:18px;font-weight:900">${f.t}</h3>
    <div class="fd-meta">📍 ${f.loc} · 📷 ${f.by}</div>
    <p class="fd-body">这张入选「精选 4K 摄影」的作品由 AI 图片引擎按 4K 超清规格渲染，完整保留了拍摄现场的光影与色彩层次。</p>
    <p class="src-note">🖼 声明：精选图片由 AI 引擎按 4K 规格重渲染生成，场景信息来自创作者真实打卡（${PLAT[f.plat].n} · ${f.by}）。</p></div>`);
}
/* ---- 话题热度榜 ---- */
function renderTopics(){
  const list=[...TOPICS].sort((a,b)=>heatSort==='heat'?b.heat-a.heat:b.up-a.up);
  $('#heatList').innerHTML=list.map((t,i)=>`<div class="heat-row" onclick="openTopic('${t.id}')">
    <span class="rk ${i<3?'top':''}">${i+1}</span>
    <div class="hi"><h5># ${t.name}</h5><p>${t.spots.length} 个关联目的地 · 点击查看人群适配图表</p><div class="hbar"><i style="width:${t.heat}%"></i></div></div>
    <div class="hn"><b>${t.heat}</b><span class="up">▲ 涨幅 ${t.up}%</span></div></div>`).join('');
}
$$('.sorter .mini').forEach(b=>b.onclick=()=>{heatSort=b.dataset.s;$$('.sorter .mini').forEach(x=>x.classList.toggle('on',x===b));renderTopics()});
function openTopic(tid){
  const t=topicById(tid);if(!t)return;
  const posts=POSTS.filter(p=>(p.topics||[]).includes(tid));
  const fitRows=Object.entries(t.fit).map(([k,v])=>`<div class="fitrow"><span>${k}</span><div class="fbar"><i data-w="${v}"></i></div><b>${v}</b></div>`).join('');
  const spotChips=t.spots.map(id=>{const s=spotById(id);return s?`<span class="topic-chip" onclick="closeModal();setTimeout(()=>openSpot('${id}'),200)">📍 ${s.n}</span>`:''}).join('');
  const postRows=posts.map(p=>`<div class="mini-post" onclick="openPost('${p.id}')"><img src="${IMG(P[p.imgs[0]])}"><div style="flex:1;min-width:0"><h5>${PLAT[p.plat||'go'].i} ${PLAT[p.plat||'go'].n} · ${p.u}</h5><p>${p.txt}</p></div><span class="more-link">查看 →</span></div>`).join('')||'<p class="fd-note">该话题暂无帖子，欢迎打卡补充～</p>';
  openModal(`<div class="dbody">
    <div class="topic-head"><div><div class="kick">TOPIC COMMUNITY · 话题社区</div><h3 style="font-size:18px;font-weight:900"># ${t.name}</h3><p style="color:var(--muted);font-size:12.5px;margin-top:4px">${t.desc}</p></div>
    <div class="hn big" style="text-align:right;flex:none"><b style="font-size:26px;font-weight:900;color:var(--gold)">${t.heat}</b><span class="up" style="display:block;font-size:10.5px;color:var(--ok)">▲ 涨幅 ${t.up}%</span></div></div>
    <h4 class="fd-sec">📊 人群适配度分析（适合哪种旅行方式）</h4>
    <div class="fitwrap">${fitRows}</div>
    <h4 class="fd-sec">🗺 话题目的地索引</h4><div class="chips">${spotChips}</div>
    <h4 class="fd-sec">💬 话题社区 · 精选帖子</h4>${postRows}
    <p class="src-note">📊 声明：热度指数与人群适配度由 AI 爬虫对全网社交平台（抖音 / 小红书 / 快手 / Instagram / YouTube 等）及本站真实打卡数据抓取、清洗后加权整理生成，仅供参考，不构成出行承诺。</p></div>`);
  setTimeout(()=>$$('#modalBox .fbar i').forEach(el=>el.style.width=el.dataset.w+'%'),80);
}
/* ---- 帖子详情 ---- */
function openPost(pid){
  const p=(JSON.parse(localStorage.getItem('fmw_posts')||'[]').find(x=>x.id===pid))||POSTS.find(x=>x.id===pid);if(!p)return;
  const pl=PLAT[p.plat||'go'];
  const chips=(p.topics||[]).map(t=>topicById(t)?`<span class="topic-chip" onclick="event.stopPropagation();openTopic('${t}')"># ${topicById(t).name}</span>`:'').join('');
  const gal=p.imgs.map(k=>`<img src="${IMG(P[k])}" onclick="openImgLightbox('${k}')">`).join('');
  const videoBtn=p.type==='video'?`<button class="btn gold" style="width:100%;margin:10px 0" onclick="openVideo({t:'${(p.txt||'').slice(0,16)}…',loc:'${p.loc}',imgs:['${p.imgs.join("','")}'],bgm:'${p.bgm||'fresh'}'})">▶ 播放打卡视频（${BGMI(p.bgm)}）</button>`:'';
  openModal(`<div class="fd-img big"><img src="${IMG(P[p.imgs[0]])}">${p.type==='video'?'<span class="vbadge"><i>▶</i></span>':''}<span class="plat pb-${p.plat||'go'}" style="position:absolute;top:10px;right:10px">${pl.i} ${pl.n}</span></div>
    <div class="dbody">
    <div class="pu"><span class="av" style="background:${p.c}">${p.u[0]}</span><div><h5>${p.u}</h5><p>${p.time} · 📍 ${p.loc}</p></div></div>
    <p class="fd-body">${p.txt}</p>
    ${p.full?`<p class="fd-more">📖 <b>正文 · 攻略细节</b><br>${p.full}</p>`:''}
    ${chips?`<div class="chips" style="margin:10px 2px">${chips}</div>`:''}
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px">${p.type==='video'?'<span class="tagpill ab">🎬 打卡视频</span>':p.type==='plog'?'<span class="tagpill cn">📷 Plog</span>':''}${p.real?'<span class="tagpill real">真实攻略</span>':''}</div>
    ${videoBtn}
    <div class="fd-gal">${gal}</div>
    <div class="pfoot" style="border-top:1px solid var(--line);padding-top:11px"><span>♥ ${p.likes}</span><span>💬 ${p.cmts}</span><span>⭐ 收藏 ${Math.round(p.likes/2.6)}</span><span style="margin-left:auto;font-size:10.5px">${pl.n}</span></div>
    <div class="dbtns">${p.imgs[0]&&spotById(p.imgs[0])?`<button class="btn line" onclick="WGO.go('map.html',{spot:'${p.imgs[0]}'})">🗺 在地图查看</button><button class="btn gold" onclick="WGO.go('ai.html',{dest:'${p.loc.split(' ')[0]}'})">🤖 AI 规划同款</button>`:''}</div>
    <p class="src-note">声明：内容来源为 ${pl.n} 创作者 / 站内真实打卡同步 · 正文含路线、花费与踩坑提示 · 图片由 AI 引擎按原场景重渲染，仅供参考。</p></div>`);
}
function openImgLightbox(k){
  const s=spotById(k);
  openModal(`<div class="fd-img big"><img src="${IMG(P[k],'landscape_16_9')}"><span class="fourk">4K ULTRA HD</span></div>
    <div class="dbody"><h3 style="font-size:16px;font-weight:900">${s?s.n:'旅行瞬间'}</h3><div class="fd-meta">${s?'📍 '+s.city+' · '+s.tag:'📷 现场花絮'}</div>
    ${s?`<p class="fd-body">${s.desc}</p><div class="dbtns"><button class="btn gold" onclick="closeModal();setTimeout(()=>openSpot('${s.id}'),200)">📍 查看景点攻略</button></div>`:''}</div>`,true);
}
document.addEventListener('DOMContentLoaded',()=>{renderFeed();renderFeatured();renderTopics();
  /* 深度链接 */
  const pid=WGO.q('post');if(pid)setTimeout(()=>openPost(pid),300);
  const tid=WGO.q('topic');if(tid)setTimeout(()=>openTopic(tid),300);
});
