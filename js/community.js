/* =========================================================
 * WANDERGO PLATFORM · 社区 community.js
 * 动态流（视频/Vlog/Plog/图文）+ 多平台筛选 + 4K 精选 + 话题热度榜
 * ========================================================= */
let feedFilter='all',platFilter='all',heatSort='heat',feedSort='top',feedKw='';
/* ---- 后端社区数据（含 B 站爬虫帖）：首次进页面拉一次，筛选时复用缓存；
   后端不在线时降级读取 js/posts_crawl.json（由爬虫导出脚本生成，仍是真实抓取数据） ---- */
let dbPosts=[],dbLoaded=false,topicDefs=[];
async function ensureDb(){
  if(dbLoaded)return;
  const [p,t]=await Promise.all([WGOAPI.postList('','top',0,300),WGOAPI.topics()]);
  if(t&&t.ok){
    topicDefs=t.list;
    window.TW_TOPIC_NAMES=window.TW_TOPIC_NAMES||{};
    t.list.forEach(x=>window.TW_TOPIC_NAMES[x.code]=x.name);
  }
  if(p&&p.ok)dbPosts=p.list.map(mapApiPost);
  /* 离线降级：本地数据包（爬虫真实数据导出） */
  if((!dbPosts.length||!topicDefs.length)&&typeof twLocalData==='function'){
    const b=await twLocalData();
    if(b){
      if(!topicDefs.length&&b.topics&&b.topics.length){
        topicDefs=b.topics;
        window.TW_TOPIC_NAMES=window.TW_TOPIC_NAMES||{};
        b.topics.forEach(x=>window.TW_TOPIC_NAMES[x.code]=x.name);
      }
      if(!dbPosts.length&&b.posts&&b.posts.length)dbPosts=b.posts.map(mapApiPost);
    }
  }
  dbLoaded=true;
}
/* 关键词搜索：命中标题 / 正文 / 地点 / 作者 / 词条名 */
function kwHit(p){
  if(!feedKw)return true;
  const k=feedKw.toLowerCase();
  const names=window.TW_TOPIC_NAMES||{};
  const hay=[p.txt,p.content,p.loc,p.u,(p.topics||[]).map(t=>(topicById(t)||{}).name||names[t]||t).join(' ')].join(' ').toLowerCase();
  return hay.includes(k);
}
/* 时间戳：后端帖用 createdAt，静态演示帖解析「x 小时前 / x 天前」等相对时间 */
function postTs(p){
  if(p._ts)return p._ts;
  let ts=0;
  const c=p.createdAt||'';
  if(c){const d=new Date(String(c).replace(' ','T'));if(!isNaN(d))ts=d.getTime()}
  if(!ts){
    const t=p.time||'';const now=Date.now();let m;
    if(m=/(\d+)\s*小时前/.exec(t))ts=now-m[1]*3600e3;
    else if(m=/(\d+)\s*天前/.exec(t))ts=now-m[1]*86400e3;
    else if(/昨天/.test(t))ts=now-86400e3;
    else if(m=/(\d{1,2})-(\d{1,2})/.exec(t)){const d=new Date();d.setMonth(+m[1]-1);d.setDate(+m[2]);ts=d.getTime()}
    else ts=now;
  }
  p._ts=ts;return ts;
}
/* 区域筛选沿用景点库：关联了景点就按景点所在区域；
   未关联景点的（多为爬虫帖）按地点文案里的国外地名推断，保证「国外」筛选可用 */
const AB_HINTS=['东京','京都','大阪','日本','巴黎','冰岛','圣托里尼','希腊','巴厘岛','曼谷','泰国','新加坡','纽约','美国','悉尼','澳大利亚','巴塞罗那','西班牙','马尔代夫','迪拜','皇后镇','新西兰','芬兰','瑞士','土耳其','埃及','摩洛哥','威尼斯','意大利','伦敦','英国','首尔','韩国','岘港','越南','仙本那','马来西亚'];
function regionOf(spotId,loc){
  const s=(typeof SPOTS!=='undefined'?SPOTS:[]).find(x=>x.id===spotId);
  if(s)return s.rg;
  if(loc&&AB_HINTS.some(k=>String(loc).includes(k)))return 'ab';
  return 'cn';
}
/* 后端 / 离线包 Post → 社区卡片字段，和静态帖保持同一套渲染契约 */
const PLAT_ALIAS={bilibili:'bili',bili:'bili',xiaohongshu:'xhs',redbook:'xhs',youtube:'yt',instagram:'ins',douyin:'douyin',kuaishou:'kuaishou',user:'go',go:'go',web:'go'};
function normPlat(p){
  const k=p.client||p.source||'go';
  return PLAT_ALIAS[k]||k;
}
function mapApiPost(p){
  const codes=(p.topics||'').split(',').filter(Boolean);
  return {
    id:p.id,db:true,type:p.type,spotId:p.spotId||'',
    plat:normPlat(p),
    rg:regionOf(p.spotId,p.location),
    img:TW.cover(p),u:p.nick||'旅行者',c:'linear-gradient(135deg,#e7c76d,#cfa24a)',
    time:(p.createdAt||'').replace('T',' ').slice(5,16),createdAt:(p.createdAt||'').replace('T',' '),
    loc:p.location||'',
    txt:p.title||'',content:p.content||'',topics:codes,bgm:p.bgm||'',
    likes:p.likeCount||0,cmts:p.commentCount||0,real:p.source==='user'||p.source==='go',liked:false,
    /* 爬虫质量分 + 播放量：卡片上展示，排序也用它 */
    quality:p.quality||0,views:p.viewCount||0,
    sourceUrl:p.sourceUrl||''
  };
}
/* ---- 帖子流：Vue 3 岛屿渲染（筛选/点赞为响应式，页面其余动效保持原生） ---- */
let feedStore=null,feedApp=null;
function decoratePost(p){
  const pl=PLAT[p.plat||'go']||PLAT.go;
  const names=window.TW_TOPIC_NAMES||{};
  return Object.assign({},p,{
    /* 与 renderFeed 保持同一套封面规则：dataURL / http(s) 直接用，否则当景点 id 交给 IMG() */
    img:(()=>{const r=p.img||(p.imgs&&p.imgs[0])||'';return /^(https?:|data:)/.test(r)?r:(r?IMG(r):'')})(),
    /* 外站 CDN 防盗链导致 onerror 时，Vue 模版绑定这个兜底图 */
    imgFb:(()=>{const f=typeof TW!=='undefined'&&TW.coverFallback?TW.coverFallback({title:p.txt||p.title||'',location:p.loc||'',spotId:p.spotId||''}):IMG(p.spotId||'erhai');return String(f||'').replace(/'/g,'&#39;')})(),
    platName:pl.n,platIcon:pl.i,platKey:p.plat||'go',
    bgmLabel:p.bgm?(p._bgmName||(typeof TW!=='undefined'?TW.bgmName(p.bgm):'')||BGMI(p.bgm)):'',
    chips:(p.topics||[]).filter(t=>topicById(t)||names[t]).map(t=>({id:t,name:(topicById(t)||{}).name||names[t]})),
    liked:!!p.liked
  });
}
function mountFeedVue(){
  if(feedApp||!window.Vue||!$('#feedGrid'))return feedApp;
  feedStore=Vue.reactive({items:[]});
  feedApp=Vue.createApp({
    setup(){return{store:feedStore}},
    methods:{
      openFeedPost(p){if(p&&p.db)openDbPost(p.id);else openPost(p.id)},
      /* 后端帖子的点赞写 MySQL，静态帖保持本地演示交互 */
      async like(p,e){
        e.stopPropagation();
        if(!p.db){p.liked=!p.liked;p.likes+=p.liked?1:-1;return}
        if(!TW.requireLogin())return;
        const r=await WGOAPI.postLike(p.id);
        if(!r||!r.ok){toast((r&&r.msg)||'点赞失败，请确认后端已启动');return}
        p.liked=r.liked;p.likes=r.count;
      },
      topic(t,e){e.stopPropagation();openTopic(t.id)},
      imgErr(p,e){e.target.onerror=null;const f=p.imgFb||(p.spotId?IMG(p.spotId):IMG('erhai'));if(f&&f!==e.target.src)e.target.src=f}
    },
    template:`
      <div class="post" v-for="p in store.items" :key="p.id" @click="openFeedPost(p)" style="cursor:pointer">
        <div class="pimg">
          <img :src="p.img" loading="lazy" referrerpolicy="no-referrer" @error="imgErr(p,$event)">
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
      <div class="empty-tip" v-if="!store.items.length">没有匹配的内容，换个关键词或筛选条件试试～</div>`
  }).mount('#feedGrid');
  return feedApp;
}
async function renderFeed(){
  await ensureDb();
  const mine=JSON.parse(localStorage.getItem('fmw_posts')||'[]');
  /* 同一内容可能同时出现在后端与本地/静态包里（id 不同但标题作者相同），先去重，避免卡片重复 */
  const raw=[...dbPosts,...mine,...POSTS];
  const seenKey=new Set();
  const all=raw.filter(p=>{
    const k=String(p.sourceUrl||'').trim()||(String(p.u||'')+'|'+String(p.txt||''));
    if(seenKey.has(k))return false;
    seenKey.add(k);return true;
  });
  const list=all.filter(p=>(feedFilter==='all'?true:feedFilter==='video'||feedFilter==='plog'?p.type===feedFilter:p.rg===feedFilter)&&(platFilter==='all'?true:p.plat===platFilter)&&kwHit(p));
  /* 优质优先（默认）：爬虫质量分 + 播放量，再叠本站互动；点赞/评论高的往前排，
     没有质量分的老数据按互动加权排在后面，不会顶掉真实热门的优质内容 */
  list.sort((a,b)=>{
    if(feedSort==='top'){
      const sa=(a.quality||0)*10+Math.log10((a.views||0)+1)*6+a.likes*0.5+a.cmts*1.5;
      const sb=(b.quality||0)*10+Math.log10((b.views||0)+1)*6+b.likes*0.5+b.cmts*1.5;
      return sb-sa;
    }
    if(feedSort==='hot')return (b.likes*3+b.cmts*5)-(a.likes*3+a.cmts*5);
    return postTs(b)-postTs(a);
  });
  if(mountFeedVue()){feedStore.items=list.map(decoratePost);return}
  const names=window.TW_TOPIC_NAMES||{};
  $('#feedGrid').innerHTML=list.map(p=>{
    const pl=PLAT[p.plat||'go']||PLAT.go;
    const typeTag=p.type==='video'?'<span class="tagpill ab">🎬 打卡视频</span>':p.type==='plog'?'<span class="tagpill cn">📷 Plog</span>':'';
    const realTag=p.real?'<span class="tagpill real">真实攻略</span>':'';
    const chips=(p.topics||[]).map(t=>(topicById(t)||names[t])?`<span class="topic-chip" onclick="event.stopPropagation();openTopic('${t}')"># ${(topicById(t)||{}).name||names[t]}</span>`:'').join('');
    /* 封面优先级：用户上传的真实照片 > imgs 里的图（可能是 URL 也可能是景点 id）> 宠物图兜底。
       imgs 里若是景点 id，交给 IMG(id) 按名字出图；直接拼 IMG(P[id]) 会得到 prompt=undefined */
    const rawImg=p.img||(p.imgs&&p.imgs[0])||'';
    const img=/^(https?:|data:)/.test(rawImg)
      ?rawImg
      :IMG(rawImg||'erhai');
    /* 外站 CDN 有防盗链，onerror 时换一张按名字生成的图，而不是留白 */
    const imgFb=typeof TW!=='undefined'&&TW.coverFallback
      ?TW.coverFallback({title:p.txt||p.title||'',location:p.loc||'',spotId:p.spotId||''})
      :IMG(p.spotId||'erhai');
    const onErr=/^data:/.test(img)?'':'this.onerror=null;this.src=\''+imgFb.replace(/'/g,'&#39;')+'\'';
    const act=p.db?`onclick="event.stopPropagation();twToggleLike(${p.id},this)"`:`onclick="event.stopPropagation();likePost(this,'${p.id}')"`;
    /* 视频卡片：后端在线走后端代理直链，任何设备都能播；离线则退回 B 站内嵌 / 站内模拟 */
    const vUrl=(p.videoUrl||p.playUrl||p.sourceUrl||'');
    const vSrc=(p.type==='video'&&vUrl&&typeof TW!=='undefined'&&TW.playUrl)?TW.playUrl(vUrl):'';
    const openAct=p.db?'openDbPost('+p.id+')':'openPost(\''+p.id+'\')';
    const playAct=p.type==='video'
      ?(vSrc?`onclick="event.stopPropagation();twPlayVideo('${TW.esc(String(p.id))}')"`:`onclick="event.stopPropagation();${openAct}"`)
      :'';
    return `<div class="post" onclick="${p.db?'openDbPost('+p.id+')':'openPost(\''+p.id+'\')'}" style="cursor:pointer">
      <div class="pimg">
        <img src="${img}" loading="lazy" referrerpolicy="no-referrer" onerror="${onErr}">
        ${p.type==='video'?'<span class="vbadge" '+playAct+'><i>▶</i></span><span class="moren">'+(p.db?(TW.bgmName(p.bgm)||''):BGMI(p.bgm))+'</span>':''}
        ${p.type==='plog'?'<span class="moren">📷 Plog</span>':''}
        <span class="plat pb-${p.plat||'go'}" style="position:absolute;top:9px;right:9px">${pl.i} ${pl.n}</span>
      </div>
      <div class="pbody">
        <div class="pu"><span class="av" style="background:${p.c}">${p.u[0]}</span><div><h5>${p.u}</h5><p>${p.time} · 📍 ${p.loc}</p></div></div>
        <p class="ptxt">${p.txt}</p>
        <div class="tchips">${chips}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:9px;align-items:center">${typeTag}${realTag}<span class="more-link">查看全文 →</span></div>
        <div class="pfoot"><span class="act" ${act}>♡ <i style="font-style:normal" class="ln">${p.likes}</i></span><span>💬 ${p.cmts}</span><span style="margin-left:auto;font-size:10.5px">${pl.n}</span></div>
      </div></div>`}).join('')||'<div class="empty-tip">没有匹配的内容，换个关键词或筛选条件试试～</div>';
}
$$('#feedTabs > button').forEach(b=>b.onclick=()=>{feedFilter=b.dataset.f;$$('#feedTabs > button').forEach(x=>x.classList.toggle('on',x===b));renderFeed()});
$$('#platTabs button').forEach(b=>b.onclick=()=>{platFilter=b.dataset.p;$$('#platTabs button').forEach(x=>x.classList.toggle('on',x===b));renderFeed()});
/* ---- 动态流排序：最新（发布时间倒序，默认）/ 最热（点赞+评论加权） ---- */
$$('#feedSort .mini').forEach(b=>b.onclick=()=>{feedSort=b.dataset.s;$$('#feedSort .mini').forEach(x=>x.classList.toggle('on',x===b));renderFeed()});
/* ---- 社区搜索：地点 / 关键词 → 标题、正文、地点、作者、词条全字段匹配 ---- */
function doCommunitySearch(){
  feedKw=($('#twSearch').value||'').trim();
  const acts=$('#twSearchActs');
  if(feedKw){
    acts.style.display='flex';
    $('#twSearchHint').textContent='「'+feedKw+'」的社区搜索结果：';
  }else acts.style.display='none';
  renderFeed();
  const g=$('#feedGrid');if(g)g.scrollIntoView({behavior:'smooth'});
}
if($('#twSearchGo')){
  $('#twSearchGo').onclick=doCommunitySearch;
  $('#twSearch').addEventListener('keydown',e=>{if(e.key==='Enter')doCommunitySearch()});
  $('#twSearchAI').onclick=()=>{if(feedKw)WGO.go('ai.html',{dest:feedKw})};
  $('#twSearchTopic').onclick=()=>{WGO.go('topic.html',{kw:feedKw})};
  $('#twSearchClear').onclick=()=>{$('#twSearch').value='';feedKw='';$('#twSearchActs').style.display='none';renderFeed()};
}
function likePost(el,id){el.classList.toggle('liked');const n=el.querySelector('.ln');n.textContent=+n.textContent+(el.classList.contains('liked')?1:-1);el.firstChild.textContent=el.classList.contains('liked')?'♥ ':'♡ '}
/* ---- 精选 4K 摄影 ---- */
function renderFeatured(){
  $('#featStrip').innerHTML=FEATURED.map((f,i)=>`<div class="feat-card" onclick="openFeat(${i})"><img src="${IMG(P[f.img],'landscape_16_9')}" loading="lazy" style="cursor:zoom-in" onclick="event.stopPropagation();openViewer(this,'${f.t.replace(/'/g,'')} · ${f.loc.replace(/'/g,'')}')"><span class="plat pb-${f.plat}">${PLAT[f.plat].i} ${PLAT[f.plat].n}</span><span class="fourk">4K</span><div class="fc-info"><h5>${f.t}</h5><p>📍 ${f.loc} · 📷 ${f.by}</p></div></div>`).join('');
  if(typeof watchImgs==='function')watchImgs($('#featStrip'));
}
function openFeat(i){
  const f=FEATURED[i];if(!f)return;
  const src=IMG(P[f.img],'landscape_16_9');
  openModal(`<div class="fd-img big" onclick="openViewer(this.querySelector('img'),'${f.t.replace(/'/g,'')} · ${f.loc.replace(/'/g,'')}')"><img src="${src}" style="cursor:zoom-in"><span class="fourk">4K ULTRA HD</span><span class="plat pb-${f.plat}" style="position:absolute;top:10px;right:44px">${PLAT[f.plat].i} ${PLAT[f.plat].n}</span><span class="fd-zoom">🔍 点击看大图</span></div>
    <div class="dbody"><h3 style="font-size:18px;font-weight:900">${f.t}</h3>
    <div class="fd-meta">📍 ${f.loc} · 📷 ${f.by}</div>
    <p class="fd-body">这张入选「精选 4K 摄影」的作品由 AI 图片引擎按 4K 超清规格渲染，完整保留了拍摄现场的光影与色彩层次。</p></div>`);
}
/* ---- 话题热度榜：热度与帖子数由 MySQL 统计，爬虫新增词条也会出现在榜上 ---- */
function renderTopics(){
  ensureDb().then(()=>{
    const list=topicDefs.length?topicDefs.map(t=>({code:t.code,name:t.name,heat:t.heat||0,count:t.postCount||0,source:t.source}))
      :TOPICS.map(t=>({code:t.id,name:t.name,heat:t.heat,count:t.spots.length,source:'system'}));
    list.sort((a,b)=>heatSort==='count'?b.count-a.count:b.heat-a.heat);
    $('#heatList').innerHTML=list.map((t,i)=>`<div class="heat-row" onclick="openTopic('${t.code}')">
      <span class="rk ${i<3?'top':''}">${i+1}</span>
      <div class="hi"><h5># ${t.name}</h5><p>${t.count} 条帖子 · 点击进入词条页看全部内容${t.source==='crawl'?' · 🕷 爬虫词条':''}</p><div class="hbar"><i style="width:${Math.min(100,t.heat)}%"></i></div></div>
      <div class="hn"><b>${t.heat}</b><span class="up">${t.count} 帖</span></div></div>`).join('');
  });
}
$$('.sorter .mini').forEach(b=>b.onclick=()=>{heatSort=b.dataset.s;$$('.sorter .mini').forEach(x=>x.classList.toggle('on',x===b));renderTopics()});
/* 词条不再用弹窗，统一跳到独立词条页（能发布、能评论、能分享链接） */
function openTopic(tid){
  if(!tid)return;
  WGO.go('topic.html',{id:tid});
}
/* ---- 帖子详情 ---- */
function openPost(pid){
  const p=(JSON.parse(localStorage.getItem('fmw_posts')||'[]').find(x=>x.id===pid))||POSTS.find(x=>x.id===pid);if(!p)return;
  const pl=PLAT[p.plat||'go']||PLAT.go;
  const chips=(p.topics||[]).map(t=>topicById(t)?`<span class="topic-chip" onclick="event.stopPropagation();openTopic('${t}')"># ${topicById(t).name}</span>`:'').join('');
  const rawImgs=p.userImgs&&p.userImgs.length?p.userImgs:(p.imgs||['erhai']);
  const imgSrc=k=>p.userImgs&&p.userImgs.length?k:(P[k]?IMG(P[k]):IMG(k));
  const gal=rawImgs.map(k=>`<img src="${imgSrc(k)}" onclick="openImgLightbox('${k}')">`).join('');
  const videoBtn=p.type==='video'?`<button class="btn gold" style="width:100%;margin:10px 0" onclick="openVideo({t:'${(p.txt||'').slice(0,16)}…',loc:'${p.loc}',imgs:['${(p.imgs||['erhai']).join("','")}'],bgm:'${p.bgm||'fresh'}'})">▶ 播放打卡视频（${BGMI(p.bgm)}）</button>`:'';
  openModal(`<div class="fd-img big"><img src="${imgSrc(rawImgs[0])}" style="cursor:zoom-in" onclick="openViewer(this,'${(p.loc||'').replace(/'/g,'')}')">${p.type==='video'?'<span class="vbadge"><i>▶</i></span>':''}<span class="plat pb-${p.plat||'go'}" style="position:absolute;top:10px;right:10px">${pl.i} ${pl.n}</span></div>
    <div class="dbody">
    <div class="pu"><span class="av" style="background:${p.c}">${p.u[0]}</span><div><h5>${p.u}</h5><p>${p.time} · 📍 ${p.loc}</p></div></div>
    <p class="fd-body">${p.txt}</p>
    ${p.full?`<p class="fd-more">📖 <b>正文 · 攻略细节</b><br>${p.full}</p>`:''}
    ${chips?`<div class="chips" style="margin:10px 2px">${chips}</div>`:''}
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px">${p.type==='video'?'<span class="tagpill ab">🎬 打卡视频</span>':p.type==='plog'?'<span class="tagpill cn">📷 Plog</span>':''}${p.real?'<span class="tagpill real">真实攻略</span>':''}</div>
    ${videoBtn}
    <div class="fd-gal">${gal}</div>
    <div class="pfoot" style="border-top:1px solid var(--line);padding-top:11px"><span>♥ ${p.likes}</span><span>💬 ${p.cmts}</span><span>⭐ 收藏 ${Math.round(p.likes/2.6)}</span><span style="margin-left:auto;font-size:10.5px">${pl.n}</span></div>
    <div class="dbtns">${p.imgs[0]&&spotById(p.imgs[0])?`<button class="btn line" onclick="WGO.go('map.html',{spot:'${p.imgs[0]}'})">🗺 在地图查看</button><button class="btn gold" onclick="WGO.go('ai.html',{dest:'${p.loc.split(' ')[0]}'})">🤖 AI 规划同款</button>`:''}</div></div>`);
}
function openImgLightbox(k){
  const s=spotById(k);
  openModal(`<div class="fd-img big"><img src="${IMG(k,'landscape_16_9')}"><span class="fourk">4K ULTRA HD</span></div>
    <div class="dbody"><h3 style="font-size:16px;font-weight:900">${s?s.n:'旅行瞬间'}</h3><div class="fd-meta">${s?'📍 '+s.city+' · '+s.tag:'📷 现场花絮'}</div>
    ${s?`<p class="fd-body">${s.desc}</p><div class="dbtns"><button class="btn gold" onclick="closeModal();setTimeout(()=>openSpot('${s.id}'),200)">📍 查看景点攻略</button></div>`:''}</div>`,true);
}
document.addEventListener('DOMContentLoaded',()=>{renderFeed();renderFeatured();renderTopics();
  /* 深度链接：帖子 id 是数字说明在 MySQL 里，走后端详情；否则是静态演示帖 */
  const pid=WGO.q('post');
  if(pid)setTimeout(()=>{ /^\d+$/.test(pid)?openDbPost(pid):openPost(pid) },300);
  const tid=WGO.q('topic');if(tid)setTimeout(()=>openTopic(tid),300);
  /* 深度链接：community.html?kw=新疆 直接带搜索词进来（推荐模块 / 首页搜索跳转用） */
  const kw=WGO.q('kw');if(kw&&$('#twSearch')){$('#twSearch').value=kw;doCommunitySearch()}
});
