/* =========================================================
 * WANDERGO · 模块导览 guide.js
 * 每个模块：真实界面实时预览（iframe）+ 三步操作说明 + 功能点
 * ========================================================= */
const GUIDE=[
 {p:'map.html',ic:'🌍',n:'环球地图',t:'plan',d:'五层 3D 地图，滚轮缩放以鼠标为焦点，点标点飞过去，打卡过的城市点亮金色。',s:['滚动滚轮放大到想去的区域','点金色标点看景点详情','点空白省份飞到省中心'],f:['3D 地图','滚轮缩放','点击飞行','足迹点亮']},
 {p:'ai.html',ic:'🤖',n:'AI 旅行规划',t:'plan',d:'输入一句话（城市 + 天数 + 预算），AI 按模块输出完整攻略。',s:['在搜索框写「新疆喀纳斯 6 天」，回车','看进度条提示的思考步骤，约 3 秒','用右侧「模块」栏跳到美食 / 人流饼图 / 住宿对比 / BGM 自选'],f:['路线图','交通比价','预算拆分','美食推荐','分时段人流饼图','住宿优缺点对比','BGM 自选']},
 {p:'search.html',ic:'🔍',n:'全站搜索',t:'content',d:'一个关键词搜遍视频、图文、攻略、词条，带多维筛选。',s:['点顶部搜索框输入「新疆」','回车进入独立搜索页','用平台 / 地区 / 时间 / 排序四个筛选收窄结果'],f:['关键词联想','平台筛选','地区筛选','时间筛选','四种排序','词条联动']},
 {p:'community.html',ic:'💬',n:'旅行社区',t:'content',d:'多平台真实攻略聚合，每张卡都标注来源平台与发布时间。',s:['用顶部搜索框或筛选条找内容','切换「最新 / 最热」看排序','点卡片进详情，点亮「想去」地点收藏'],f:['全字段搜索','最新/最热','来源标注','想去收藏','评论讨论']},
 {p:'topic.html',ic:'🏷',n:'词条广场',t:'content',d:'每个词条是一条旅行线索，点进去全是带该词条的帖子。',s:['在广场点任意词条卡片','看词条下的帖子流与热度','在帖子下发评论参与讨论'],f:['词条热度','帖子流','评论讨论','离线数据包']},
 {p:'recommend.html',ic:'🎯',n:'猜你喜欢',t:'content',d:'基于评分矩阵的协同过滤推荐，冷启动用热门兜底。',s:['先给几个景点打星','系统算出相似用户与相似景点','看推荐结果里的来源平台标注'],f:['UserCF','ItemCF','热门兜底','来源标注']},
 {p:'checkin.html',ic:'📍',n:'打卡成册',t:'record',d:'发布打卡攻略 / 视频合集 / Plog，自动生成纪念册。',s:['在「去了哪儿」搜索并选择地点','选 3 张图、挑一首 BGM（可搜抖音热榜）','提交生成纪念册，同步到社区'],f:['目的地搜索','BGM 搜索','攻略成册','纪念册','徽章榜']},
 {p:'memories.html',ic:'🎬',n:'旅行纪念视频',t:'record',d:'打卡视频精选播放器，30 种合成 BGM 随时切换。',s:['点任意视频卡片进播放器','在播放器里换 BGM 风格','收藏进纪念册'],f:['视频播放器','BGM 曲库','纪念册']},
 {p:'workbench.html',ic:'🧳',n:'旅行工作台',t:'record',d:'手账工坊、协同计划（记账分摊 / 投票）、文创素材库。',s:['新建一份行程手账','粘贴机酒信息自动识别','和同伴分摊费用、投票选景点'],f:['手账','记账分摊','投票','文创库']},
 {p:'wheel.html',ic:'🎡',n:'旅行大转盘',t:'fun',d:'不知道去哪？让转盘替你决定。',s:['选国内 / 国外','点开始，转盘等分扇区高速旋转','停在结果卡片，一键跳 AI 规划'],f:['国内/国外','随机转盘','一键规划']},
 {p:'novel.html',ic:'📖',n:'跟着小说去旅行',t:'fun',d:'每部小说都藏着一座城。',s:['选一本小说','看故事发生地与名场面','让 AI 按小说氛围规划路线'],f:['文学地图','名场面','路线生成']},
 {p:'prince.html',ic:'👑',n:'跟着小王子去旅行',t:'fun',d:'沿 B612 航线：落日、玫瑰、狐狸与星空。',s:['点航线上的站点','看落日与玫瑰的故事','导出这条童话路线'],f:['B612 航线','落日','极光']},
 {p:'me.html',ic:'🧭',n:'个人中心',t:'record',d:'足迹统计、评分管理、徽章墙与同步状态。',s:['查看足迹与打卡记录','管理已评分的景点','看后端同步在线 / 离线状态'],f:['足迹统计','评分管理','同步状态']}
];
let gdForm='all';
function gdCard(g){
  return `<article class="gd-card" data-t="${g.t}" data-k="${(g.n+g.d+(g.f||[]).join('')).toLowerCase()}">
    <div class="gd-prev">
      <iframe src="${g.p}" loading="lazy" tabindex="-1" scrolling="no" title="${g.n} 界面预览"></iframe>
      <span class="gd-badge">${g.ic} ${g.n}</span>
      <a class="gd-open" href="${g.p}">打开模块 →</a>
    </div>
    <div class="gd-body">
      <p class="gd-desc">${g.d}</p>
      <ol class="gd-steps">${g.s.map(x=>`<li>${x}</li>`).join('')}</ol>
      <div class="gd-feats">${(g.f||[]).map(x=>`<span>${x}</span>`).join('')}</div>
    </div>
  </article>`;
}
function gdPaint(){
  const q=(document.getElementById('gdQ').value||'').trim().toLowerCase();
  const rows=GUIDE.filter(g=>(gdForm==='all'||g.t===gdForm)&&(!q||(g.n+g.d+(g.f||[]).join('')).toLowerCase().includes(q)));
  document.getElementById('gdGrid').innerHTML=rows.length?rows.map(gdCard).join('')
    :'<div class="gd-empty">没有匹配的模块，换个词试试～</div>';
}
document.addEventListener('DOMContentLoaded',()=>{
  gdPaint();
  document.getElementById('gdQ').oninput=gdPaint;
  document.querySelectorAll('#gdTabs button').forEach(b=>b.onclick=()=>{
    gdForm=b.dataset.f;
    document.querySelectorAll('#gdTabs button').forEach(x=>x.classList.toggle('on',x===b));
    gdPaint();
  });
});
