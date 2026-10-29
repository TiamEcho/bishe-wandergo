/* =========================================================
 * WANDERGO · 独立搜索页 search.js
 * 关键词 + 形式 / 平台 / 地区 / 时间 / 排序 多维筛选
 * 数据源：后端 API → 离线爬虫数据包 posts_crawl.json → data.js 内置 POSTS
 * ========================================================= */
let srState={kw:'',form:'all',plat:'',rg:'',time:'all',sort:'new'};
let srPool=[],srBundle=null,srPage=1,SR_PAGE=18;

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
  if(p.cover&&/^https?:/.test(p.cover))return p.cover;
  return '';
}
/* 兜底封面：外站封面被反爬/跨域拦截时，用本地景点图库的图顶上，卡片不留白 */
function srFallbackCover(p){
  const probe=(p.title||'')+' '+(p.content||'')+' '+(p.location||'');
  let id=p.spotId||'';
  if(!id||typeof P==='undefined'||!P[id]){
    const s=(typeof SPOTS!=='undefined'?SPOTS:[]).find(x=>x.n&&probe.includes(x.n))||
            (typeof SPOTS!=='undefined'?SPOTS:[]).find(x=>x.city&&probe.includes(x.city));
    id=s?s.id:'erhai';
  }
  return (typeof P!=='undefined'&&P[id]&&typeof IMG==='function')?IMG(P[id],'landscape_4_3'):'';
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
  const m={bilibili:'📺 B站',douyin:'🎵 抖音',xhs:'📕 小红书',kuaishou:'⚡ 快手',ins:'📸 IG',yt:'▶️ YouTube',go:'🧭 站内'};
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
    createdAt:p.createdAt||'',source:p.source||'go',type:p.type||'post',bgm:p.bgm||''
  };
}
async function srLoad(){
  const out=[];
  try{
    const r=await axios.get(WGOAPI.BASE+'/api/post/list',{params:{pageSize:200,sort:'new'},timeout:4500});
    const rows=(r.data&&(r.data.rows||r.data.data||r.data.list))||[];
    rows.forEach(p=>out.push(srNormalizeApi(p)));
  }catch(e){}
  if(!out.length&&!srBundle){
    try{
      const r=await fetch('js/posts_crawl.json?v=1118');srBundle=await r.json();
      (srBundle.posts||[]).forEach(p=>out.push(srNormalizeApi(p)));
    }catch(e){}
  }
  /* 站内本地发布内容也纳入搜索 */
  try{
    JSON.parse(localStorage.getItem('fmw_posts')||'[]').forEach(p=>out.push({
      id:p.id,title:p.txt||'',content:p.txt||'',txt:p.txt||'',cover:'',nick:p.u,
      location:p.loc||'',topics:'',likeCount:p.likes||0,commentCount:p.cmts||0,
      createdAt:'',source:'go',type:p.type==='video'?'video':p.type==='plog'?'plog':'post',_ts:Date.now()-1000,bgm:p.bgm
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
    ?`<img src="${cov}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`
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
  if(!q||(!spots.length&&!dests.length)){box.innerHTML='';return}
  const spotHtml=spots.map(s=>`<a class="sr-pchip" href="map.html?spot=${encodeURIComponent(s.id)}">
      <i>${(typeof ICO!=='undefined'&&ICO[s.id])||'📍'}</i><b>${srEsc(s.n)}</b><em>${srEsc(s.city)} · ${srEsc(s.tag||'')}</em></a>`).join('');
  const destHtml=dests.map(d=>`<a class="sr-pchip" href="ai.html?dest=${encodeURIComponent(d[0])}">
      <i>🧭</i><b>${srEsc(d[0])}</b><em>${srEsc(d[1])} · AI 规划</em></a>`).join('');
  box.innerHTML=`<span class="lb">📍 地点收录 <i>${spots.length+dests.length}</i></span>${spotHtml}${destHtml}`;
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
      :`<div class="sr-empty-box">没有匹配的词条 😢<br><span>试试「海岛」「亲子」「穷游」这类词，或切回「全部」看内容</span></div>`;
    if(more)more.style.display='none';
    return;
  }
  if(filters)filters.style.display='';
  const rows=srApply();
  const {spots,dests}=srPlaceHits(srState.kw.trim().toLowerCase());
  if(cnt)cnt.textContent=`「${srState.kw||'全部'}」共 ${rows.length} 条内容${spots.length+dests.length?' · 地点 '+(spots.length+dests.length)+' 个':''}`;
  const show=rows.slice(0,srPage*SR_PAGE);
  grid.innerHTML=show.length?show.map(srCard).join('')
    :`<div class="sr-empty-box">没有匹配的内容 😢<br><span>换个关键词，或把「平台 / 地区 / 时间」筛选放宽试试；也可以直接去 <a href="ai.html?dest=${encodeURIComponent(srState.kw)}">AI 规划</a> 生成一份行程</span></div>`;
  if(more)more.style.display=rows.length>show.length?'inline-flex':'none';
}
function srOpen(id){
  if(typeof openDbPost==='function'){openDbPost(id);return}
  const p=srPool.find(x=>String(x.id)===String(id));
  if(p&&p.sourceUrl)window.open(p.sourceUrl,'_blank');
}
function srSearch(kw){
  srState.kw=kw||'';srPage=1;
  history.replaceState(null,'',location.pathname+'?kw='+encodeURIComponent(srState.kw));
  srRenderTopics();srPaint();
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
  srPool=await srLoad();
  srRenderTopics();srPaint();
});
