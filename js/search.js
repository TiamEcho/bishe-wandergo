/* =========================================================
 * WANDERGO · 独立搜索页 search.js
 * 关键词 + 形式 / 平台 / 地区 / 时间 / 排序 多维筛选
 * 数据源：后端 API → 离线爬虫数据包 posts_crawl.json → data.js 内置 POSTS
 * ========================================================= */
let srState={kw:'',form:'all',plat:'',rg:'',time:'all',sort:'new'};
let srPool=[],srBundle=null,srPage=1,SR_PAGE=18;
let srReady=null;   /* 离线池加载完成的 Promise，后端结果要等它回来再合并 */

/* ---------- 后端接入（backend/ 里的 Express + SQLite） ----------
 * 只做增量：接口可用则用后端数据，不可用则完全沿用原有离线数据，页面结构不变。
 */
const SR_API=(typeof WGOAPI!=='undefined'&&(WGOAPI.base||WGOAPI.BASE))||'http://localhost:8080';
let srAi=null;      // 最近一次 /api/search 返回的实体（地名/美食/商圈）与统计

/* 调用 GET /api/search，成功则用返回结果替换卡片池 */
/* 搜索页的唤醒提示条：与 ai.js 的 wakeTip 同一套样式，这里单独实现避免跨文件依赖 */
function srWakeTip(show,sec){
  let el=document.getElementById('srWakeTip');
  if(!show){if(el)el.classList.remove('on');return}
  if(!el){
    el=document.createElement('div');
    el.id='srWakeTip';el.className='wake-tip';
    document.body.appendChild(el);
  }
  el.innerHTML='<span class="wt-dot"></span><b>正在唤醒服务中…</b>'
    +'<span class="wt-sub">后端休眠时首次搜索需 30–50 秒'+(sec?'，已等待 '+sec+' 秒':'')
    +'；本地结果已先展示，服务醒来后自动补充线上帖子</span>';
  el.classList.add('on');
}
async function srSearchApi(kw){
  try{
    /* 冷启动：先探活，实例未醒就显示唤醒提示并每 3 秒重试（最多 2 分钟），
     * 醒来的那一刻再发起正式搜索；本地池已经在页面上，用户不会看到空白 */
    if(typeof WGOAPI!=='undefined'&&WGOAPI.warm&&WGOAPI.status()!==true){
      const ok=await WGOAPI.warm({max:120000,onWait:sec=>srWakeTip(true,sec)});
      srWakeTip(false);
      if(!ok)return null;
    }
    const ctl=new AbortController();
    /* 与 api.js 的 T_REQ 对齐：30 秒 */
    const timer=setTimeout(()=>ctl.abort(),30000);
    const r=await fetch(`${SR_API}/api/search?q=${encodeURIComponent(kw||'')}&limit=80`,{signal:ctl.signal});
    clearTimeout(timer);
    if(!r.ok)return null;
    const d=await r.json();
    if(!d||!Array.isArray(d.items)||!d.items.length)return null;
    srAi={city:d.city,entities:d.entities||[],stats:d.stats||{},engine:d.engine||'',ai:d.ai||null};
    /* 这里是「合并」而不是「替换」：后端只抓到 B 站/站内帖，
       一替换就会把离线包里的 小红书 / Instagram / YouTube 全删掉，
       表现就是搜什么平台都只剩几条、国外平台一条都没有。按 id 去重，后端优先。 */
    const seen=new Set(d.items.map(x=>String(x.id)));
    const keep=srPool.filter(p=>!seen.has(String(p.id)));
    srPool=[...d.items.map(srNormalizeApi),...keep];
    srPage=1;srPaint();
    return d;
  }catch(e){return null}
  finally{srWakeTip(false)}
}

function srQ(){try{return WGO.q('kw')||''}catch(e){return''}}
function srHash(s){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h}
function srRegion(p){
  if(p.rg)return p.rg;
  const loc=(p.location||p.loc||'')+' '+(p.title||'');
  const ab=['东京','京都','巴黎','伦敦','纽约','冰岛','瑞士','土耳其','埃及','摩洛哥','首尔','大阪','曼谷','新加坡','巴厘','马尔代夫','圣托里尼','威尼斯','仙本那','岘港','越南','日本','韩国','泰国','法国','英国','意大利','西班牙','美国','澳大利亚','新西兰','迪拜'];
  return ab.some(k=>loc.includes(k))?'ab':'cn';
}
function srTs(p){
  if(p._ts!=null)return p._ts;
  const s=p.createdAt||'';
  let t=0;
  if(s){t=new Date(s.replace(/-/g,'/')).getTime()||0}
  if(!t){const m=String(p.time||'').match(/(\d+)\s*(分钟|小时|天)前/);if(m){const n=+m[1];t=Date.now()-n*(m[2]==='分钟'?6e4:m[2]==='小时'?36e5:864e5)}}
  p._ts=t||Date.now()-srHash(p.id||p.title||'')% (864e5*90);
  return p._ts;
}
function srEsc(s){
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function srCover(p){
  /* 爬虫收进来的 B站/抖音封面是外站 CDN 地址：带防盗链、会挂、也会拖慢首屏。
   * 种子数据用的 Unsplash 图同理（海外 CDN，国内加载常常超时）。
   * 这些域名一律不用外链封面，直接走下面 srFallbackCover 的本地景点图库。 */
  const c=p.cover||'';
  if(!/^https?:/.test(c))return '';
  if(/hdslb\.com|bilivideo\.com|douyinpic\.com|douyinvod\.com|ixigua\.com|kuaishou\.com|unsplash\.com|pexels\.com|picsum\.photos/i.test(c))return '';
  return c;
}
/* 省份/大区 → 景点库里的城市：爬虫标题多写「西藏」「川西」「内蒙」，很少写具体城市 */
const SR_REGION={'西藏':'拉萨','藏区':'拉萨','川西':'阿坝州','四川':'阿坝州','九寨':'阿坝州',
  '云南':'大理','大理':'大理','丽江':'丽江 · 盐源','湖南':'张家界','湘西':'湘西','安徽':'黄山市',
  '黄山':'黄山市','吉林':'延边','长白山':'延边','海南':'三亚','福建':'厦门','江苏':'苏州',
  '浙江':'杭州','青海':'海北州','广西':'桂林','北京':'北京','上海':'上海','广东':'广州',
  '新疆':'乌鲁木齐','内蒙':'呼伦贝尔'};
/* 景点相关度打分：帖子标题/正文/定位里出现越多景点信息，得分越高。
 * 不只是「全名包含」，还做前缀模糊匹配——爬虫标题写成「故宫半日游」也能命中「故宫博物院」。 */
function srSpotScore(s,probe){
  let sc=0;
  const n=s.n||'';
  if(n&&probe.includes(n))sc=100+n.length;              /* 景点全名命中，越长越具体 */
  else if(n.length>=2){
    for(const L of [3,2]){                              /* 前缀模糊：故宫博物院 ← 故宫 */
      const pre=n.slice(0,L);
      if(pre.length>=2&&probe.includes(pre)){sc=60+L;break}
    }
  }
  if(s.city&&probe.includes(s.city))sc+=20;
  /* 省份别名命中本景点所在城市：西藏→拉萨、川西→阿坝州 */
  for(const k in SR_REGION){
    if(probe.includes(k)&&SR_REGION[k]===s.city){sc+=14;break}
  }
  if(s.tag){
    s.tag.split(/[·\s/、]+/).filter(t=>t&&t.length>=2)
      .forEach(t=>{if(probe.includes(t))sc+=8});
  }
  return sc;
}
/* 兜底封面：外站封面被反爬/跨域拦截时，用本地景点图库的图顶上，卡片不留白。
 * 按相关度排序后取前几张，再用帖子 id 哈希轮流选一张：
 * 同一城市的多个帖子不会全挤在同一张图上，但同一条帖子每次刷新是稳定的。 */
function srFallbackCover(p){
  const probe=(p.title||'')+' '+(p.content||'')+' '+(p.location||'')+' '+(p.topics||'');
  let id=p.spotId||'';
  if(!id||typeof P==='undefined'||!P[id]){
    const spots=(typeof SPOTS!=='undefined'?SPOTS:[]);
    const scored=spots.map(s=>[srSpotScore(s,probe),s]).filter(x=>x[0]>0)
      .sort((a,b)=>b[0]-a[0]).slice(0,4).map(x=>x[1]);
    if(scored.length){
      const seed=String(p.id||p.title||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0);
      id=scored[seed%scored.length].id;
    }else{
      /* 一条都没命中：也不要所有帖子都用同一张图，按 id 在全库散列 */
      const seed=String(p.id||p.title||'x').split('').reduce((a,c)=>a+c.charCodeAt(0),0);
      id=(spots.length?spots[seed%spots.length]:{id:'erhai'}).id;
    }
  }
  /* IMG 现在接受景点 id / 中文名，内部按「英文地名 + 场景」生成提示词；
     旧写法 IMG(P[id]) 在 id 不在 P 里时会退化成 prompt=undefined */
  return typeof IMG==='function'?IMG(id,'landscape_4_3'):'';
}
/* 地点收录：关键词命中景点库 / 全国地点库时单独列一排，避免「巴黎」这种没有帖子就显示无结果 */
function srPlaceHits(q){
  if(!q)return {spots:[],dests:[]};
  const spots=(typeof SPOTS!=='undefined'?SPOTS:[])
    .filter(s=>[s.n,s.city,s.tag,s.desc,s.addr].filter(Boolean).join(' ').toLowerCase().includes(q))
    .slice(0,8);
  const dests=(typeof DEST_LIST!=='undefined'?DEST_LIST:[])
    .filter(d=>String(d[0]).toLowerCase().includes(q))
    .slice(0,8);
  return {spots,dests};
}
function srFmtTime(p){
  const t=srTs(p);if(!t)return '';
  const d=new Date(t),now=new Date();
  const same=d.toDateString()===now.toDateString();
  const hm=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  if(same)return '今天 '+hm;
  const diff=Math.floor((now-t)/864e5);
  if(diff<7)return diff+' 天前';
  return (d.getMonth()+1)+'月'+d.getDate()+'日';
}
function srPlatLabel(p){
  const m={bilibili:'📺 B站',bili:'📺 B站',douyin:'🎵 抖音',xhs:'📕 小红书',xiaohongshu:'📕 小红书',kuaishou:'⚡ 快手',ins:'📸 IG',instagram:'📸 IG',yt:'▶️ YouTube',youtube:'▶️ YouTube',go:'🧭 站内',web:'🧭 站内'};
  return m[p.source||p.plat]||'🧭 站内';
}
function srTypeOf(p){
  const t=p.type||'post';
  if(t==='video')return 'video';
  if(t==='plog')return 'plog';
  return 'guide';
}
function srMatch(p,q){
  if(!q)return true;
  const s=[p.title,p.content,p.txt,p.location,p.loc,p.nick,p.u,p.topics].filter(Boolean).join(' ').toLowerCase();
  return q.split(/\s+/).every(w=>s.includes(w));
}
function srNormalizeApi(p){
  return {
    id:String(p.id),title:p.title||'',content:p.content||'',txt:p.content||'',
    cover:p.cover||'',videoUrl:p.videoUrl||'',sourceUrl:p.sourceUrl||'',
    nick:p.nick||p.u||'',location:p.location||p.loc||'',topics:p.topics||'',
    likeCount:+p.likeCount||+p.likes||0,commentCount:+p.commentCount||+p.cmts||0,
    createdAt:p.createdAt||'',source:p.source||p.client||'go',type:p.type||'post',bgm:p.bgm||'',
    srcId:p.srcId||'',spotId:p.spotId||''
  };
}
async function srLoad(){
  const out=[];
  try{
    const r=await axios.get(WGOAPI.BASE+'/api/post/list',{params:{pageSize:200,sort:'new'},timeout:4500});
    const rows=(r.data&&(r.data.rows||r.data.data||r.data.list))||[];
    rows.forEach(p=>out.push(srNormalizeApi(p)));
  }catch(e){}
  /* 离线包始终并入（去重）：后端可能只入库了 B 站，抖音 / 小红书 / IG / YouTube
     的抓取结果只在数据包里，否则这些平台永远搜不到 */
  if(!srBundle){
    try{
      const r=await fetch('js/posts_crawl.json?v=1125');
      if(r&&r.ok)srBundle=await r.json();
    }catch(e){}
  }
  if(srBundle){
    const seen=new Set(out.map(x=>String(x.id)));
    (srBundle.posts||[]).forEach(p=>{
      const n=srNormalizeApi(p);
      if(!seen.has(n.id)){seen.add(n.id);out.push(n)}
    });
  }
  /* 站内本地发布内容也纳入搜索 */
  try{
    JSON.parse(localStorage.getItem('fmw_posts')||'[]').forEach(p=>out.push({
      id:p.id,title:p.txt||'',content:p.txt||'',txt:p.txt||'',cover:p.img||(p.imgs&&p.imgs[0])||'',nick:p.u,
      location:p.loc||'',topics:'',likeCount:p.likes||0,commentCount:p.cmts||0,spotId:p.spotId||'',
      createdAt:'',source:'go',type:p.type==='video'?'video':p.type==='plog'?'plog':'post',_ts:Date.now()-1000,bgm:p.bgm,_local:true
    }));
  }catch(e){}
  return out;
}
function srRenderHots(){
  const box=document.getElementById('srHots');if(!box)return;
  const hot=['新疆','喀纳斯','西藏','呼和浩特','呼伦贝尔','喀什','citywalk','美食','日落','自驾','冰岛','瑞士'];
  box.innerHTML='<span class="lb">热门搜索</span>'+hot.map(k=>`<button class="sr-hot" data-k="${k}">${k}</button>`).join('');
  box.querySelectorAll('.sr-hot').forEach(b=>b.onclick=()=>{document.getElementById('srKw').value=b.dataset.k;srSearch(b.dataset.k)});
}
function srRenderTopics(){
  const box=document.getElementById('srTopicRow');if(!box)return;
  const rows=(srBundle&&srBundle.topics)||[];
  const hits=rows.filter(t=>!srState.kw||(t.name||'').includes(srState.kw)||(t.description||'').includes(srState.kw)).slice(0,10);
  if(!hits.length){box.innerHTML='';return}
  box.innerHTML='<span class="lb">🏷 相关词条</span>'+hits.map(t=>`<a class="sr-tchip" href="topic.html?id=${encodeURIComponent(t.code)}">${t.name}<i>${t.postCount||0}</i></a>`).join('');
}
function srApply(){
  const q=srState.kw.trim().toLowerCase();
  let rows=srPool.filter(p=>srMatch(p,q));
  if(srState.form!=='all')rows=rows.filter(p=>srTypeOf(p)===srState.form);
  if(srState.plat)rows=rows.filter(p=>(p.source||p.plat||'go')===srState.plat);
  if(srState.rg)rows=rows.filter(p=>srRegion(p)===srState.rg);
  if(srState.time!=='all'){
    const lim=Date.now()-(+srState.time)*864e5;
    rows=rows.filter(p=>srTs(p)>=lim);
  }
  const s=srState.sort;
  rows.sort((a,b)=>{
    if(s==='hot')return ((b.likeCount*3+b.commentCount*5)-(a.likeCount*3+a.commentCount*5));
    if(s==='like')return b.likeCount-a.likeCount;
    if(s==='cmt')return b.commentCount-a.commentCount;
    return srTs(b)-srTs(a);
  });
  return rows;
}
function srCard(p){
  const cov=srCover(p);
  const fb=srFallbackCover(p);
  const t=srTypeOf(p);
  const badge=t==='video'?'🎬 视频':t==='plog'?'📷 图文':'📝 攻略';
  const style=fb?` style="background-image:url('${fb}');background-size:cover;background-position:center"`:'';
  const coverHtml=cov
    ?`<img src="${cov}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'">`
    :'';
  const tags=(p.topics||'').split(',').filter(Boolean).slice(0,3).map(x=>`<span>#${srEsc(x)}</span>`).join('')
    +(p.location?`<span>📍${srEsc(p.location)}</span>`:'');
  return `<article class="sr-card ${t}" onclick="srOpen('${srEsc(p.id)}')">
    <div class="sr-cover"${style}>${coverHtml}<span class="bd">${badge}</span><span class="bd src">${srPlatLabel(p)}</span>${t==='video'?'<span class="vplay"><i>▶</i></span>':''}</div>
    <div class="sr-body">
      <h4>${srEsc((p.title||p.content||'旅行记录').slice(0,46))}</h4>
      ${p.content?`<p>${srEsc(p.content.replace(/\s+/g,' ').slice(0,54))}</p>`:''}
      <div class="sr-tags">${tags}</div>
      <div class="sr-foot"><span class="u">${srEsc((p.nick||'旅行者').slice(0,10))}</span><span class="tm">${srFmtTime(p)}</span>
        <span class="lk">♥ ${p.likeCount}</span><span class="cm">💬 ${p.commentCount}</span></div>
    </div>
  </article>`;
}
/* 词条 Tab：直接渲染词条卡，而不是去帖子里过滤 type=topics */
function srTopicRows(){
  const rows=(srBundle&&srBundle.topics)||[];
  const q=srState.kw.trim().toLowerCase();
  return rows.filter(t=>!q||((t.name||'')+(t.description||'')+(t.code||'')).toLowerCase().includes(q));
}
function srTopicCard(t){
  const cov=`<div class="sr-cover topic-cov"><span class="temoji">🏷</span><span class="bd">词条</span><span class="bd src">${t.postCount||0} 帖</span></div>`;
  return `<a class="sr-card topic" href="topic.html?id=${encodeURIComponent(t.code)}">
    ${cov}
    <div class="sr-body">
      <h4># ${srEsc(t.name)}</h4>
      <p>${srEsc((t.description||'和这个词条相关的真实旅行记录都会聚合在这里').slice(0,56))}</p>
      <div class="sr-foot"><span class="u">🏷 ${srEsc(t.code||'')}</span><span class="tm">${t.postCount||0} 条内容</span></div>
    </div>
  </a>`;
}
/* 关键词命中的地点/景点，独立一排「地点收录」，点景点进地图、点城市进 AI 规划 */
function srRenderPlaces(){
  const box=document.getElementById('srPlaces');if(!box)return;
  const q=srState.kw.trim().toLowerCase();
  const {spots,dests}=srPlaceHits(q);
  /* 后端 AI 抽取的实体（地名 / 美食 / 商圈），仅在有关键词时展示，避免堆满 */
  const ai=(q&&srAi&&srAi.entities)?srAi.entities.slice(0,9):[];
  const aiHtml=ai.map(e=>{
    const ico=e.type==='food'?'🍜':e.type==='district'?'🏙':'📍';
    const tp=e.type==='food'?'美食':e.type==='district'?'商圈':'地点';
    return `<a class="sr-pchip" href="search.html?kw=${encodeURIComponent(e.name)}">
      <i>${ico}</i><b>${srEsc(e.name)}</b><em>${tp} · AI 抽取 ×${e.mention||1}</em></a>`;
  }).join('');
  if((!q||(!spots.length&&!dests.length))&&!ai.length){box.innerHTML='';return}
  const spotHtml=spots.map(s=>`<a class="sr-pchip" href="map.html?spot=${encodeURIComponent(s.id)}">
      <i>${(typeof ICO!=='undefined'&&ICO[s.id])||'📍'}</i><b>${srEsc(s.n)}</b><em>${srEsc(s.city)} · ${srEsc(s.tag||'')}</em></a>`).join('');
  const destHtml=dests.map(d=>`<a class="sr-pchip" href="ai.html?dest=${encodeURIComponent(d[0])}">
      <i>🧭</i><b>${srEsc(d[0])}</b><em>${srEsc(d[1])} · AI 规划</em></a>`).join('');
  const total=spots.length+dests.length+ai.length;
  box.innerHTML=`<span class="lb">📍 地点收录 <i>${total}</i>${ai.length?' · AI 实体':''}</span>${spotHtml}${destHtml}${aiHtml}`;
}
function srPaint(){
  const grid=document.getElementById('srGrid');
  const cnt=document.getElementById('srCount');
  const more=document.getElementById('srLoadMore');
  const filters=document.getElementById('srFilters');
  srRenderPlaces();
  /* 词条 Tab 走独立渲染：词条不是帖子，不能按帖子的 type 过滤 */
  if(srState.form==='topics'){
    const rows=srTopicRows();
    if(filters)filters.style.display='none';
    if(cnt)cnt.textContent=`「${srState.kw||'全部'}」共 ${rows.length} 个词条`;
    grid.innerHTML=rows.length?rows.map(srTopicCard).join('')
      :(typeof emptyArt==='function'
        ?emptyArt('没有匹配的词条','试试「海岛」「亲子」「穷游」这类词，或切回「全部」看内容；换个城市试试也可以')
        :`<div class="sr-empty-box">没有匹配的词条 😢</div>`);
    if(more)more.style.display='none';
    return;
  }
  if(filters)filters.style.display='';
  const rows=srApply();
  const {spots,dests}=srPlaceHits(srState.kw.trim().toLowerCase());
  if(cnt)cnt.textContent=`「${srState.kw||'全部'}」共 ${rows.length} 条内容${spots.length+dests.length?' · 地点 '+(spots.length+dests.length)+' 个':''}`;
  const show=rows.slice(0,srPage*SR_PAGE);
  grid.innerHTML=show.length?show.map(srCard).join('')
    :(typeof emptyArt==='function'
      ?emptyArt('没有匹配的内容','换个关键词，或把「平台 / 地区 / 时间」筛选放宽试试；也可以直接去 <a href="ai.html?dest='+encodeURIComponent(srState.kw)+'">AI 规划</a> 生成一份行程')
      :`<div class="sr-empty-box">没有匹配的内容 😢</div>`);
  if(more)more.style.display=rows.length>show.length?'inline-flex':'none';
  /* 图片兜底：外站封面挂了就用本地景点图顶上，不留白 */
  if(typeof watchImgs==='function')watchImgs(grid);
}
function srOpen(id){
  const p=srPool.find(x=>String(x.id)===String(id));
  /* 后端返回的攻略：还原成原帖 id，复用已有详情弹窗 */
  const pid=(p&&p.srcId)?p.srcId:(/^\d+$/.test(String(id))?String(id):'');
  if(pid&&typeof openDbPost==='function'){openDbPost(pid);return}
  if(p&&p.sourceUrl){window.open(p.sourceUrl,'_blank');return}
  if(p&&typeof openModal==='function'){srDetailModal(p);return}
  if(p&&p.sourceUrl)window.open(p.sourceUrl,'_blank');
}
/* 打卡记录的轻量详情（复用站内弹窗样式，不新增 CSS） */
function srDetailModal(p){
  const isCheckin=p.type==='checkin';
  openModal(`<button class="mx" onclick="closeModal()">✕</button>
    <div class="tw-detail-body" style="padding:22px 20px">
      <span class="tw-chip">${isCheckin?'📍 打卡记录':'📝 攻略'}</span>
      <h3 style="margin:8px 0 6px">${srEsc(p.title||'旅行记录')}</h3>
      <div style="font-size:11.5px;color:var(--muted);margin-bottom:10px">📍 ${srEsc(p.location||'—')} · ${srFmtTime(p)} · ${srEsc(p.nick||'旅行者')}</div>
      <p style="font-size:13px;line-height:1.85;color:var(--ink-2)">${srEsc(p.content||'暂无更多内容')}</p>
    </div>`);
}
function srSearch(kw){
  srState.kw=kw||'';srPage=1;srAi=null;
  history.replaceState(null,'',location.pathname+'?kw='+encodeURIComponent(srState.kw));
  srRenderTopics();srPaint();
  /* 必须等离线池加载完再合并后端结果：早一点返回时 srPool 还是空的，
     合并等于没合，小红书 / Instagram / YouTube 的内容会整批丢掉 */
  Promise.resolve(srReady).then(()=>srSearchApi(srState.kw));
}
function srBind(){
  const inp=document.getElementById('srKw');
  inp.value=srQ();
  srState.kw=inp.value;
  document.getElementById('srGo').onclick=()=>srSearch(inp.value.trim());
  inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();srSearch(inp.value.trim())}};
  document.querySelectorAll('#srTabs button').forEach(b=>b.onclick=()=>{
    srState.form=b.dataset.f;srPage=1;
    document.querySelectorAll('#srTabs button').forEach(x=>x.classList.toggle('on',x===b));
    srRenderTopics();srPaint();
  });
  ['fPlat:plat','fRg:rg','fTime:time','fSort:sort'].forEach(k=>{
    const [id,key]=k.split(':');
    const el=document.getElementById(id);
    el.onchange=()=>{srState[key]=el.value;srPage=1;srPaint()};
  });
  document.getElementById('srReset').onclick=()=>{
    srState={kw:srState.kw,form:'all',plat:'',rg:'',time:'all',sort:'new'};srPage=1;
    document.querySelectorAll('#srTabs button').forEach((x,i)=>x.classList.toggle('on',i===0));
    document.getElementById('fPlat').value='';document.getElementById('fRg').value='';
    document.getElementById('fTime').value='all';document.getElementById('fSort').value='new';
    srPaint();
  };
  document.getElementById('srLoadMore').onclick=()=>{srPage++;srPaint()};
}
document.addEventListener('DOMContentLoaded',async()=>{
  srRenderHots();srBind();
  srReady=srLoad().then(rows=>{srPool=rows;return rows});
  srPool=await srReady;
  srRenderTopics();srPaint();
  srSearchApi(srState.kw);      // 首屏若带 ?kw= 也走一次后端搜索
});
