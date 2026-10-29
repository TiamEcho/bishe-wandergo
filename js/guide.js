/* =========================================================
 * WANDERGO · 模块导览 guide.js
 * 模块菜单栏 → 子功能真实菜单栏 → 图文介绍面板
 * 每个子功能：理念 + 实现效果 + 配图 + 预览(视频/实况)
 * ========================================================= */

/* 配图统一走 AI 生成接口（与 data.js IMGAPI 同一端点），禁止占位图 */
function gdImg(prompt){
  return 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt='
    + encodeURIComponent(prompt) + '&image_size=landscape_16_9';
}
const GD_STYLE=', flat vector illustration, warm travel palette with soft gold accents, clean modern app hero art, gentle lighting, high detail, no text, no watermark';

const GUIDE=[
 {id:'map',p:'map.html',ic:'🌍',n:'环球地图',t:'plan',d:'五层 3D 地图，滚轮缩放以鼠标为焦点，点标点飞过去，打卡过的城市点亮金色。',
  sub:[
   {ic:'🗺',n:'五层 3D 地图',idea:'把「世界是一本书」做成能摸到的样子：地图不只是工具，而是故事的舞台。',effect:'中国/世界地图五层立体挤出，省份名白色高亮，昼夜主题下都清晰可见。',
    img:'layered 3D world map floating above clouds with golden location pins, deep navy night palette'+GD_STYLE},
   {ic:'🔍',n:'滚轮缩放',idea:'探索应该像望远镜一样自然，指哪看哪。',effect:'滚轮以鼠标位置为焦点平滑缩放，不飘不卡，缩到省级别自动显示城市标点。',
    img:'telescope zooming into a glowing map region, magnifying glass over travel map'+GD_STYLE},
   {ic:'✈️',n:'点击飞行',idea:'点到哪里，镜头就飞到哪里，像坐上纸飞机。',effect:'点击省份或标点，相机沿平滑曲线飞过去并自动聚焦到该目的地。',
    img:'paper airplane flying over a miniature world map leaving a dotted trail'+GD_STYLE},
   {ic:'🏅',n:'足迹点亮',idea:'去过的地方值得被点亮，足迹即勋章。',effect:'打卡过的城市图标变成金色并带呼吸光晕，点开可看当时的打卡详情。',
    img:'golden medal pins lighting up one by one on a night map'+GD_STYLE}
  ]},
 {id:'ai',p:'ai.html',ic:'🤖',n:'AI 旅行规划',t:'plan',d:'输入一句话（城市 + 天数 + 预算），AI 按模块输出完整攻略。',
  sub:[
   {ic:'🗺️',n:'路线规划',idea:'把「啃完全网攻略」这件事交给 AI，人只负责心动。',effect:'输入目的地和偏好，3 秒生成含交通方式、路线、时间的完整方案。',
    img:'travel route planning on a glowing map with numbered stops and transport icons'+GD_STYLE},
   {ic:'🍜',n:'美食推荐',idea:'一座城的灵魂藏在碗里。',effect:'结合位置和个人口味，智能推荐附近美食并串成一条不走回头路的美食动线。',
    img:'asian street food stalls with noodle bowls and skewers, cozy night market'+GD_STYLE},
   {ic:'🚗',n:'出行安排',idea:'好的行程像呼吸一样有节奏，不赶路也不无聊。',effect:'自动规划行程时间表，合理分配景点游览时间和交通衔接，含休息点与雨天备案。',
    img:'travel itinerary timeline with car train and walking icons, morning to night schedule'+GD_STYLE},
   {ic:'📊',n:'人流分析',idea:'避开人潮，才能把风景看进心里。',effect:'分时段客流饼图可视化展示，标注最佳游览时段与拥挤预警，数据实时刷新。',
    img:'colorful pie charts and crowd heat visualization over a scenic spot'+GD_STYLE},
   {ic:'🏨',n:'住宿对比',idea:'住得对，旅行就成功了一半。',effect:'酒店 / 民宿 / 青旅三类卡片并排展示，优缺点直给，按预算自动高亮最合适的选择。',
    img:'three cozy lodging options side by side, hotel room, homestay and hostel bunk'+GD_STYLE},
   {ic:'🎵',n:'BGM 自选',idea:'每段旅程都该有自己的主题曲。',effect:'内置抖音热榜 30 首 BGM，像拍视频配歌一样可搜可换，生成的攻略自带配乐。',
    img:'music notes floating over a travel photo album, headphones on a suitcase'+GD_STYLE}
  ]},
 {id:'search',p:'search.html',ic:'🔍',n:'全站搜索',t:'content',d:'一个关键词搜遍视频、图文、攻略、词条，带多维筛选。',
  sub:[
   {ic:'🔎',n:'关键词搜索',idea:'想起一个词，就能回到那段旅程。',effect:'标题、正文、地点、话题全字段匹配，支持多个词同时收窄。',
    img:'search bar glowing over a stream of travel photos and video cards'+GD_STYLE},
   {ic:'🎛',n:'多维筛选',idea:'好内容是筛出来的。',effect:'平台 / 地区 / 时间 / 排序四组圆角下拉，跟随主题配色，自由组合收窄结果。',
    img:'filter chips and rounded dropdown panels over a content grid'+GD_STYLE},
   {ic:'📍',n:'地点收录',idea:'搜地名时，先告诉你这个地方本身。',effect:'命中地点库时置顶「地点收录」卡片排，一键直达地图标点或 AI 规划。',
    img:'row of destination cards with location pins above a map'+GD_STYLE},
   {ic:'🏷',n:'词条联动',idea:'词条是内容的经络。',effect:'搜索词命中词条时展示相关词条卡，点击直接进词条主页看全部关联内容。',
    img:'hashtag chips connecting travel photos like a constellation'+GD_STYLE}
  ]},
 {id:'community',p:'community.html',ic:'💬',n:'旅行社区',t:'content',d:'多平台真实攻略聚合，每张卡都标注来源平台与发布时间。',
  sub:[
   {ic:'🧲',n:'多平台聚合',idea:'真实攻略散落在全网，我们把它们请到一处。',effect:'B站真实爬虫数据 + 站内发布已上线，抖音 / 小红书 / YouTube / Instagram 优质内容持续收录，全部标注来源。',
    img:'many platform icons feeding into one warm travel feed'+GD_STYLE},
   {ic:'🔖',n:'来源标注',idea:'尊重原创，从署名开始。',effect:'每张卡片标注来源平台、作者昵称与发布时间，可一键跳回原平台支持创作者。',
    img:'content card with author badge and source ribbon, respectful credit'+GD_STYLE},
   {ic:'💗',n:'想去收藏',idea:'心动要及时存档。',effect:'点亮「想去」把地点收进心愿清单，与地图足迹和 AI 规划联动。',
    img:'heart glowing over a bucket list notebook with destination stickers'+GD_STYLE},
   {ic:'💬',n:'评论讨论',idea:'攻略的下半篇，是评论区写的。',effect:'帖子详情页支持评论、点赞与词条挂载，讨论沉淀成新攻略。',
    img:'friendly chat bubbles over a travel photo, community discussion'+GD_STYLE}
  ]},
 {id:'topic',p:'topic.html',ic:'🏷',n:'词条广场',t:'content',d:'每个词条是一条旅行线索，点进去全是带该词条的帖子。',
  sub:[
   {ic:'🏷',n:'词条聚合',idea:'一个词条，就是一条旅行线索。',effect:'词条主页聚合所有关联帖子与视频，按热度实时排序，追一条线索看尽一种玩法。',
    img:'hashtag flag on top of a hill of travel photos and notes'+GD_STYLE},
   {ic:'📦',n:'离线数据包',idea:'没有网，也不能没有灵感。',effect:'爬虫数据导出为离线 JSON 包，断网或纯静态部署（GitHub Pages）环境下照常浏览。',
    img:'traveler reading offline map on a train, offline package box with photos'+GD_STYLE},
   {ic:'🔥',n:'热度排序',idea:'热闹的地方，一定有它的道理。',effect:'词条按帖子数与互动量计算热度，广场一眼看到当下最火的旅行话题。',
    img:'leaderboard of glowing hashtag chips with flame icons'+GD_STYLE}
  ]},
 {id:'recommend',p:'recommend.html',ic:'🎯',n:'猜你喜欢',t:'content',d:'基于评分矩阵的协同过滤推荐，冷启动用热门兜底。',
  sub:[
   {ic:'👥',n:'相似用户推荐',idea:'口味相近的人，已经替你提前踩过点。',effect:'基于评分行为矩阵找到与你最像的旅行者，把他们高分的景点推给你。',
    img:'two travelers silhouettes overlapping with shared stars between them'+GD_STYLE},
   {ic:'🧩',n:'相似景点推荐',idea:'喜欢喀纳斯的人，大概率也会爱上禾木。',effect:'从景点共现评分中挖掘相似目的地，补齐你没想过但会喜欢的选项。',
    img:'puzzle pieces of scenic photos connecting into a bigger picture'+GD_STYLE},
   {ic:'🌡',n:'热门兜底',idea:'新用户也值得被认真对待。',effect:'冷启动阶段用全站热门与高评分内容兜底，推荐页永远不会空白。',
    img:'welcoming campfire with trending travel polaroids around it'+GD_STYLE}
  ]},
 {id:'checkin',p:'checkin.html',ic:'📍',n:'打卡成册',t:'record',d:'发布打卡攻略 / 视频合集 / Plog，自动生成纪念册。',
  sub:[
   {ic:'🗺',n:'去哪儿搜索',idea:'打卡的第一步，是说出那个地名。',effect:'全国省市 + 海外目的地库，输入即联想，选中自动带出坐标与封面图。',
    img:'search box with destination suggestions dropping down over a map'+GD_STYLE},
   {ic:'🎬',n:'视频 / 图文打卡',idea:'视频负责氛围，图文负责细节。',effect:'视频合集与 Plog 两种形态自由选，模板化排版，一分钟发出一条高质量打卡。',
    img:'phone screen showing video clip and photo grid of a trip'+GD_STYLE},
   {ic:'🎵',n:'BGM 配乐',idea:'回忆是有声音的。',effect:'打卡可挂抖音热榜 BGM，搜索即配，纪念册播放时自动响起那首歌。',
    img:'vinyl record over travel journal with music notes'+GD_STYLE},
   {ic:'📖',n:'自动成册',idea:'最好的纪念品，是自己攒出来的那本册子。',effect:'打卡内容自动排版成纪念册，封面、目录、页码全生成，可分享可回看。',
    img:'open travel scrapbook with photos tickets and handwritten notes'+GD_STYLE}
  ]},
 {id:'memories',p:'memories.html',ic:'🎬',n:'旅行纪念视频',t:'record',d:'打卡视频精选播放器，30 种合成 BGM 随时切换。',
  sub:[
   {ic:'▶️',n:'视频播放器',idea:'把路上的风，再放一遍。',effect:'沉浸式播放器支持合集连播与全屏，视频卡一点就进放映厅。',
    img:'cozy mini cinema playing a travel video, warm projector light'+GD_STYLE},
   {ic:'🎼',n:'BGM 曲库',idea:'同一支视频，换首歌就是另一种心情。',effect:'30 首 WebAudio 合成 BGM 即点即换，风格从清新到史诗，自动记住你的偏好。',
    img:'music shelf with colorful record covers over travel footage'+GD_STYLE}
  ]},
 {id:'workbench',p:'workbench.html',ic:'🧳',n:'旅行工作台',t:'record',d:'手账工坊、协同计划（记账分摊 / 投票）、文创素材库。',
  sub:[
   {ic:'📔',n:'手账工坊',idea:'手账，是慢下来的旅行。',effect:'模板化手账页面，机酒确认单粘贴进去自动识别归档，省去誊抄。',
    img:'desk with open journal washi tapes and flight tickets, cozy crafting'+GD_STYLE},
   {ic:'💰',n:'记账分摊',idea:'谈钱不伤感情，糊涂账才伤。',effect:'多人同行记账自动分摊，谁垫付谁应付一目了然，结算方案一键生成。',
    img:'friends splitting a bill with a clean ledger and coins'+GD_STYLE},
   {ic:'🗳',n:'投票决策',idea:'去哪吃？投票三秒解决。',effect:'同行成员实时投票选景点选餐厅，结果自动同步进行程表。',
    img:'ballot cards with destination photos dropping into a box'+GD_STYLE}
  ]},
 {id:'wheel',p:'wheel.html',ic:'🎡',n:'旅行大转盘',t:'fun',d:'不知道去哪？让转盘替你决定。',
  sub:[
   {ic:'🎡',n:'随机转盘',idea:'选择困难症的解药，是交给命运三秒钟。',effect:'国内 / 国外两组目的地等分扇区，高速旋转后稳稳停在结果卡片上。',
    img:'fortune wheel with destination names and a golden pointer, festive lights'+GD_STYLE},
   {ic:'🧭',n:'一键规划',idea:'运气负责选点，AI 负责安排。',effect:'转盘结果一键跳转 AI 规划，目的地自动带入，直接生成完整攻略。',
    img:'compass and sparkles over a freshly generated travel plan'+GD_STYLE}
  ]},
 {id:'novel',p:'novel.html',ic:'📖',n:'跟着小说去旅行',t:'fun',d:'每部小说都藏着一座城。',
  sub:[
   {ic:'📚',n:'文学地图',idea:'每部小说都藏着一座城。',effect:'经典作品与真实地理一一对应：悲惨世界·巴黎、古都·京都、风之影·巴塞罗那，名场面发生地都标在图上。',
    img:'open novel with a city rising from its pages, paris rooftops'+GD_STYLE},
   {ic:'🤖',n:'氛围路线',idea:'跟着书走，旅行就有了旁白。',effect:'AI 按小说氛围生成主题路线，每个点位配一段书中原文当路书。',
    img:'traveler walking a lamplit street with book quotes floating around'+GD_STYLE}
  ]},
 {id:'prince',p:'prince.html',ic:'👑',n:'跟着小王子去旅行',t:'fun',d:'沿 B612 航线：落日、玫瑰、狐狸与星空。',
  sub:[
   {ic:'🪐',n:'B612 航线',idea:'把小王子去过的地方，串成一条真的能走的航线。',effect:'落日、玫瑰、狐狸与星空站点逐一点亮，童话意象对应地球上的真实坐标。',
    img:'little prince standing on tiny planet with a flight route among stars'+GD_STYLE},
   {ic:'🌅',n:'落日收集',idea:'有一天，我看了四十四次落日。',effect:'全球落日观赏地清单，附最佳时间与机位建议，陪你收集每一次日落。',
    img:'person watching a giant warm sunset over the sea, silhouette'+GD_STYLE}
  ]},
 {id:'me',p:'me.html',ic:'🧭',n:'个人中心',t:'record',d:'足迹统计、评分管理、徽章墙与同步状态。',
  sub:[
   {ic:'👣',n:'足迹统计',idea:'数字不会说谎，它记得你走过的每一步。',effect:'打卡数、点亮省份、累计里程与徽章墙一页看全，成就感直接拉满。',
    img:'footprints trail across a map leading to trophies and badges'+GD_STYLE},
   {ic:'⭐',n:'评分管理',idea:'你的每一颗星，都在训练你的专属推荐。',effect:'已评分景点集中管理，改分后推荐结果实时重算，越评越准。',
    img:'hand placing golden stars onto scenic cards'+GD_STYLE},
   {ic:'🔄',n:'同步状态',idea:'本地要快，云端要稳。',effect:'后端在线 / 离线状态实时可见，离线时数据自动落本地，联网后自动续传。',
    img:'cloud and phone syncing glowing data streams, checkmark shield'+GD_STYLE}
  ]}
];

let gdT='all',gdMod=null,gdSub=0;

/* ---------- 渲染 ---------- */
function gdNav(){
  const q=(document.getElementById('gdQ').value||'').trim().toLowerCase();
  const rows=GUIDE.filter(g=>(gdT==='all'||g.t===gdT)&&(!q||(g.n+g.d+g.sub.map(s=>s.n+s.idea+s.effect).join('')).toLowerCase().includes(q)));
  const nav=document.getElementById('gdNav');
  const main=document.getElementById('gdMain');
  document.getElementById('gdEmpty').style.display=rows.length?'none':'';
  if(!rows.length){nav.innerHTML='';main.innerHTML='';return}
  if(!rows.some(g=>g.id===gdMod))gdMod=rows[0].id;
  nav.innerHTML=rows.map((g,i)=>`<button class="gd-mitem ${g.id===gdMod?'on':''}" data-id="${g.id}" style="animation-delay:${i*.05}s">
    <span class="mic">${g.ic}</span><span class="mn">${g.n}</span></button>`).join('');
  nav.querySelectorAll('.gd-mitem').forEach(b=>b.onclick=()=>gdSelect(b.dataset.id,0,true));
  gdDetail();
}

function gdDetail(){
  const g=GUIDE.find(x=>x.id===gdMod);if(!g)return;
  if(gdSub>=g.sub.length)gdSub=0;
  const s=g.sub[gdSub];
  const main=document.getElementById('gdMain');
  main.innerHTML=`
   <div class="gd-head" key="${g.id}">
     <span class="gd-hic">${g.ic}</span>
     <div class="gd-ht">
       <h3>${g.n}</h3>
       <p>${g.d}</p>
     </div>
     <a class="gd-hopen" href="${g.p}">打开模块 →</a>
   </div>
   <div class="gd-subbar" id="gdSubBar">
     ${g.sub.map((x,i)=>`<button class="gd-sitem ${i===gdSub?'on':''}" data-i="${i}" style="animation-delay:${i*.08}s">
        <span class="sic">${x.ic}</span><span>${x.n}</span></button>`).join('')}
   </div>
   <div class="gd-panel" id="gdPanel">
     <div class="gd-fig">
       <span class="gd-figic">${s.ic}</span>
       <img src="${gdImg(s.img)}" alt="${s.n} 示意图" loading="lazy" onerror="this.remove()">
       <span class="gd-figbd">${s.ic} ${s.n}</span>
     </div>
     <div class="gd-info">
       <h4>${s.n}</h4>
       <div class="gd-block"><span class="gd-lb">💡 理念</span><p>${s.idea}</p></div>
       <div class="gd-block"><span class="gd-lb">✨ 实现效果</span><p>${s.effect}</p></div>
       <div class="gd-actions">
         <button class="gd-prev-btn" id="gdPrevBtn">▶ 预览</button>
         <a class="gd-goto" href="${g.p}">进入 ${g.n} 实操 →</a>
       </div>
     </div>
   </div>`;
  document.getElementById('gdSubBar').querySelectorAll('.gd-sitem').forEach(b=>b.onclick=()=>{
    gdSub=+b.dataset.i;gdDetail();
  });
  document.getElementById('gdPrevBtn').onclick=()=>gdOpenDemo(g,s);
}

/* ---------- 预览模态框：有视频放视频，无视频放页面实况 ---------- */
function gdOpenDemo(g,s){
  const m=document.getElementById('gdModal');
  const box=document.getElementById('gdModalBody');
  document.getElementById('gdModalTitle').textContent=`${g.ic} ${g.n} · ${s.n}`;
  if(s.video){
    box.innerHTML=`<video src="${s.video}" controls autoplay style="width:100%;border-radius:12px"></video>`;
  }else{
    box.innerHTML=`<div class="gd-live-tip">页面实况演示 · 可滚动可点击</div>
      <iframe src="${g.p}" class="gd-live" title="${g.n} 实况演示"></iframe>`;
  }
  m.classList.add('open');
  document.body.style.overflow='hidden';
}
function gdCloseDemo(){
  const m=document.getElementById('gdModal');
  m.classList.remove('open');
  document.getElementById('gdModalBody').innerHTML='';
  document.body.style.overflow='';
}

function gdSelect(id,sub,scroll){
  gdMod=id;gdSub=sub||0;
  gdNav();
  if(scroll)document.getElementById('gdMain').scrollIntoView({behavior:'smooth',block:'start'});
}

/* ---------- 启动 ---------- */
document.addEventListener('DOMContentLoaded',()=>{
  const h=(location.hash||'').replace('#','');
  if(h&&GUIDE.some(g=>g.id===h))gdMod=h;
  gdNav();
  document.getElementById('gdQ').oninput=gdNav;
  document.querySelectorAll('#gdTabs button').forEach(b=>b.onclick=()=>{
    gdT=b.dataset.f;
    document.querySelectorAll('#gdTabs button').forEach(x=>x.classList.toggle('on',x===b));
    gdNav();
  });
  document.getElementById('gdModal').addEventListener('click',e=>{
    if(e.target.id==='gdModal'||e.target.closest('.gd-mclose'))gdCloseDemo();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')gdCloseDemo()});
});
