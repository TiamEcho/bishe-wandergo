/* =========================================================
 * WANDERGO PLATFORM · AI 旅行规划 ai.js
 * 模块化输出 + 每模块可点开详情 + 交通可视化图表 + 平台比价跳转
 * + 路线图（按 Day 分色）+ 雨天/疲惫备案 + 老人小孩注意事项
 * ========================================================= */
/* ================= 全国省市目的地库（AI 兜底规划） =================
 * 用户输入任意国内省 / 市 / 自治区（含新疆、西藏、内蒙等远距离目的地）或热门国外城市，
 * 只要词库里能匹配到，就按模板生成一份完整模块化规划，不再提示「暂未收录」。
 * 格式：[名称, 所属省, 经度, 纬度, [代表点位…], 'cn'|'ab', 建议天数, [别名…]]
 * 省级条目锚点取最经典环线区域；市级条目锚点取市中心。 */
const GEO_DB=[
 /* ---- 省级 / 自治区（锚点=经典环线） ---- */
 ['新疆','新疆',86.90,48.70,['喀纳斯湖','禾木村','五彩滩','白哈巴村'],'cn','5-6 天'],
 ['西藏','西藏',91.12,29.66,['布达拉宫','大昭寺·八廓街','纳木错','羊卓雍措'],'cn','5-6 天'],
 ['内蒙古','内蒙古',119.77,49.21,['呼伦贝尔大草原','莫日格勒河','满洲里国门','额尔古纳湿地'],'cn','4-5 天',['内蒙']],
 ['黑龙江','黑龙江',126.63,45.75,['冰雪大世界','中央大街','圣索菲亚教堂','中国雪乡'],'cn','3-4 天'],
 ['吉林','吉林',128.05,42.00,['长白山天池','魔界雾凇','延边朝鲜族民俗园'],'cn','3 天'],
 ['辽宁','辽宁',121.62,38.92,['大连星海广场','老虎滩海洋公园','沈阳故宫'],'cn','3 天'],
 ['河北','河北',114.51,38.04,['承德避暑山庄','北戴河','山海关'],'cn','2-3 天'],
 ['山西','山西',112.55,37.87,['平遥古城','云冈石窟','五台山','壶口瀑布'],'cn','3-4 天'],
 ['陕西','陕西',108.94,34.34,['秦始皇兵马俑','西安城墙','大唐不夜城','华山'],'cn','3-4 天'],
 ['河南','河南',112.45,34.62,['龙门石窟','少林寺','清明上河园','老君山'],'cn','3 天'],
 ['山东','山东',120.38,36.07,['青岛栈桥','八大关','泰山','崂山'],'cn','3 天'],
 ['江苏','江苏',120.30,31.57,['苏州拙政园','南京中山陵','无锡鼋头渚','周庄古镇'],'cn','3-4 天'],
 ['浙江','浙江',120.15,30.28,['西湖','乌镇','普陀山','千岛湖'],'cn','3 天'],
 ['安徽','安徽',118.17,30.13,['黄山风景区','宏村','西递','九华山'],'cn','3 天'],
 ['福建','福建',118.07,24.44,['鼓浪屿','霞浦滩涂','永定土楼','泉州开元寺'],'cn','3-4 天'],
 ['江西','江西',114.93,25.83,['庐山','婺源篁岭','景德镇','滕王阁'],'cn','3 天'],
 ['湖北','湖北',114.30,30.59,['黄鹤楼','东湖','恩施大峡谷','神农架'],'cn','3-4 天'],
 ['湖南','湖南',111.98,29.11,['张家界国家森林公园','天门山','凤凰古城','橘子洲'],'cn','4 天'],
 ['广东','广东',113.26,23.13,['广州塔','长隆旅游度假区','潮汕牌坊街','珠海情侣路'],'cn','3 天'],
 ['广西','广西',110.29,25.27,['桂林漓江','阳朔遇龙河','龙脊梯田','北海涠洲岛'],'cn','3-4 天'],
 ['海南','海南',110.20,20.04,['三亚亚龙湾','蜈支洲岛','海口骑楼老街','万宁日月湾'],'cn','4 天'],
 ['四川','四川',104.07,30.57,['成都大熊猫繁育研究基地','宽窄巷子','都江堰','青城山'],'cn','3-4 天'],
 ['贵州','贵州',106.71,26.60,['黄果树瀑布','西江千户苗寨','荔波小七孔','镇远古镇'],'cn','4 天'],
 ['云南','云南',102.83,24.88,['昆明滇池','大理洱海','丽江古城','香格里拉普达措'],'cn','5-6 天'],
 ['甘肃','甘肃',94.66,40.14,['敦煌莫高窟','鸣沙山月牙泉','张掖七彩丹霞','嘉峪关'],'cn','4-5 天'],
 ['青海','青海',97.15,36.62,['青海湖','茶卡盐湖','塔尔寺','翡翠湖'],'cn','4-5 天'],
 ['宁夏','宁夏',106.23,38.49,['沙坡头','镇北堡西部影城','西夏王陵'],'cn','2-3 天'],
 ['台湾','台湾',121.56,25.03,['台北101','日月潭','阿里山','垦丁'],'cn','4-5 天'],
 ['香港','香港',114.17,22.32,['维多利亚港','太平山顶','香港迪士尼'],'cn','2-3 天'],
 ['澳门','澳门',113.55,22.19,['大三巴牌坊','官也街','澳门旅游塔'],'cn','1-2 天'],
 /* ---- 热门市级目的地 ---- */
 ['常州','江苏',119.97,31.78,['中华恐龙园','天目湖','淹城春秋乐园','青果巷'],'cn','2-3 天'],
 ['苏州','江苏',120.62,31.30,['拙政园','平江路','苏州博物馆','金鸡湖'],'cn','2 天'],
 ['南京','江苏',118.80,32.06,['中山陵','夫子庙','玄武湖','牛首山'],'cn','2-3 天'],
 ['无锡','江苏',120.30,31.57,['鼋头渚','灵山大佛','拈花湾'],'cn','2 天'],
 ['成都','四川',104.07,30.67,['大熊猫繁育研究基地','宽窄巷子','都江堰','锦里'],'cn','3 天'],
 ['重庆','重庆',106.55,29.56,['洪崖洞','解放碑','长江索道','武隆天生三桥'],'cn','3 天'],
 ['天津','天津',117.20,39.13,['五大道','天津之眼','古文化街','滨海图书馆'],'cn','2 天'],
 ['青岛','山东',120.38,36.07,['栈桥','八大关','崂山','小麦岛公园'],'cn','2-3 天'],
 ['威海','山东',122.12,37.51,['火炬八街','刘公岛','成山头'],'cn','2 天'],
 ['长沙','湖南',112.94,28.23,['橘子洲','岳麓山','超级文和友','IFS国金中心'],'cn','2-3 天'],
 ['武汉','湖北',114.30,30.59,['黄鹤楼','东湖绿道','昙华林','江汉路'],'cn','2-3 天'],
 ['丽江','云南',100.23,26.88,['丽江古城','玉龙雪山','束河古镇','蓝月谷'],'cn','3 天'],
 ['昆明','云南',102.83,24.88,['滇池','石林','翠湖公园','斗南花市'],'cn','2-3 天'],
 ['哈尔滨','黑龙江',126.63,45.75,['冰雪大世界','中央大街','圣索菲亚教堂','松花江铁路桥'],'cn','2-3 天'],
 ['大连','辽宁',121.61,38.91,['星海广场','老虎滩','金石滩','渔人码头'],'cn','2-3 天'],
 ['洛阳','河南',112.45,34.62,['龙门石窟','白马寺','洛邑古城','老君山'],'cn','2-3 天'],
 ['乌鲁木齐','新疆',87.62,43.83,['天山天池','国际大巴扎','红山公园'],'cn','2-3 天'],
 ['喀什','新疆',75.99,39.47,['喀什古城','艾提尕尔清真寺','帕米尔高原·塔县'],'cn','3 天'],
 ['伊犁','新疆',81.30,43.92,['那拉提草原','赛里木湖','喀拉峻草原','霍城薰衣草'],'cn','4 天'],
 ['敦煌','甘肃',94.66,40.14,['莫高窟','鸣沙山月牙泉','雅丹魔鬼城'],'cn','2-3 天'],
 ['贵阳','贵州',106.71,26.60,['黔灵山公园','甲秀楼','青岩古镇'],'cn','2 天'],
 ['呼和浩特','内蒙古',111.75,40.84,['大召寺','塞上老街','敕勒川草原'],'cn','2 天'],
 ['珠海','广东',113.57,22.27,['情侣路','长隆海洋王国','外伶仃岛'],'cn','2 天'],
 ['佛山','广东',113.12,23.02,['祖庙','岭南天地','顺德清晖园'],'cn','1-2 天'],
 ['泉州','福建',118.68,24.87,['开元寺','西街','蟳埔村','清源山'],'cn','2 天'],
 ['宁波','浙江',121.55,29.87,['天一阁','东钱湖','老外滩'],'cn','2 天'],
 /* ---- 热门国外目的地（补充已有方案之外） ---- */
 ['瑞士','瑞士',7.85,46.69,['少女峰','因特拉肯','布里恩茨湖','卢塞恩'],'ab','5 天'],
 ['土耳其','土耳其',34.83,38.64,['卡帕多奇亚热气球','格雷梅露天博物馆','伊斯坦布尔蓝色清真寺'],'ab','6 天'],
 ['埃及','埃及',31.13,29.98,['吉萨金字塔群','狮身人面像','卢克索神庙'],'ab','5 天'],
 ['摩洛哥','摩洛哥',-5.26,35.17,['舍夫沙万蓝色小镇','撒哈拉沙漠·梅尔祖卡','马拉喀什老城','菲斯古城'],'ab','6 天'],
 ['威尼斯','意大利',12.32,45.44,['圣马可广场','叹息桥','彩色岛'],'ab','3 天'],
 ['伦敦','英国',-0.12,51.50,['大本钟','伦敦眼','大英博物馆'],'ab','4 天'],
 ['首尔','韩国',126.98,37.57,['景福宫','明洞','首尔塔'],'ab','4 天'],
 ['仙本那','马来西亚',118.62,4.48,['马布岛','卡帕莱','敦沙卡兰海洋公园'],'ab','4 天'],
 ['岘港','越南',108.20,16.05,['巴拿山','美溪海滩','会安古城'],'ab','4 天']
];
/* ---- 兜底规划工具：伪随机偏移 / 动态注册景点 ---- */
function __h(s){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h}
function __off(s,span){return ((__h(s)%1000)/1000-.5)*span}
let __geoSeq=0;
/* 生成点位前先复用已有景点（如「布达拉宫」已有完整数据），没有再注册占位景点 */
function geoSpot(name,city,prov,lng,lat,rg){
  let s=SPOTS.find(x=>x.n===name||x.n.includes(name)||name.includes(x.n));
  if(s)return s;
  const id='g'+(++__geoSeq)+'_'+__h(name).toString(36);
  s={id,n:name,city:city||prov,rg:rg||'cn',addr:(prov?prov+' · ':'')+(city&&city!==prov?city+' · ':'')+name,
    lng:+(lng+__off(name,.18)).toFixed(4),lat:+(lat+__off(name+'y',.12)).toFixed(4),
    hrs:'2-4 小时',traf:'当地交通可达',price:'以景区公示为准',rating:4.5,
    tag:'AI 收录 · '+(prov||city||'目的地'),
    desc:name+' —— AI 行程库收录的代表性点位。出发前建议再核对景区开放时间、门票政策与天气。'};
  SPOTS.push(s);
  if(typeof P!=='undefined'&&!P[id])P[id]='travel photography of '+name+' '+(city||prov||'')+', scenic landmark, natural light, high quality';
  if(typeof ICO!=='undefined'&&!ICO[id])ICO[id]='📍';
  return s;
}
function geoMatch(q){
  let best=null;
  for(const e of GEO_DB){
    const names=[e[0],...(e[7]||[])];
    for(const n of names){if(q.includes(n)&&(!best||n.length>best[0].length)){best=e;break}}
  }
  return best;
}
/* 用模板为任意已收录省市生成完整规划（结构与其它 PLANS 完全一致，前端模块照常用） */
function genPlan(e){
  const [name,prov,lng,lat,spotNames,rg,days]=e;
  const city=name===prov?prov:name;
  const spots=spotNames.map(n=>geoSpot(n,city,prov,lng,lat,rg).id);
  const far=rg==='cn'&&(lng<100||lat>42);
  const budget=rg==='ab'?9000:far?4500:2800;
  const b=[['交通',.38],['住宿',.30],['餐饮',.16],['门票/体验',.10]];
  let acc=0;const budgetItems=b.map((x,i)=>({k:x[0],v:Math.round(budget*x[1]/10)*10,c:'--dc'+(i+1)}));
  budgetItems.push({k:'其他',v:budget-budgetItems.reduce((s,x)=>s+x.v,0),c:'--dc5'});
  const transport=rg==='ab'?[
    {m:'✈️ 国际航班',t:'视航线',p:'¥3,000 起',s:.85,note:'提前 4-6 周订票更划算'},
    {m:'🚕 当地交通',t:'按次',p:'¥30-120',s:.7,note:'出租车 / 网约车 / 公交'},
    {m:'🚗 租车自驾',t:'全程',p:'¥350/天',s:.8,note:'需国际驾照认证件'}]:[
    {m:'✈️ 飞机',t:far?'约 4-6h':'约 1.5-3h',p:far?'¥1,500 起':'¥600 起',s:.9,note:far?'直飞或省会中转':'多城市直飞'},
    {m:'🚄 高铁/火车',t:far?'约 10h+':'约 2-5h',p:far?'¥800 起':'¥260 起',s:.75,note:'12306 提前购票'},
    {m:'🚗 自驾',t:'按路线',p:'油费+过路费',s:.7,note:'灵活自由，适合环线'}];
  return {
    __gen:true,dest:name,days:days,from:'你的城市',budget:budget,budgetItems:budgetItems,
    spots:spots,routeDays:[spots.slice(0,1),spots.slice(1,2),spots.slice(2)].filter(a=>a.length),
    transport:transport,dist:rg==='ab'?0:far?2600:900,
    planB:{rain:'如遇降雨，改走'+name+'市区内的博物馆 / 老街 / 茶馆等室内场景，雨后光线反而通透出片。',rest:'逛累了找一家当地咖啡馆 / 茶馆歇脚，或回酒店午休 1 小时再出发。',lazy:'不想赶路就砍掉最远的一个点位，核心景区慢游半天也是完整的一天。'},
    crowd:{kid:'带娃优先选缆车 / 观光车接驳的点位，少走台阶；备齐防晒与常用药。',elder:'行程节奏放缓，每天核心点位不超过 2 个；'+(far?'高原 / 长途注意身体状况，行前做基础检查。':'注意景区接驳车末班时间。'),couple:name+'的日出 / 日落时段人少光好，适合拍照；可安排一顿当地特色晚餐。'},
    videos:[{t:name+'旅行记录 · 打卡合集',loc:name,imgs:[spots[0],spots[1]||spots[0]],bgm:'fresh'},{t:name+'慢节奏 vlog',loc:name,imgs:[spots[1]||spots[0],spots[2]||spots[0]],bgm:'calm'}],
    plogs:[{t:'在'+name+'的慢时光',img:spots[0],txt:name+'的旅行不必赶路：挑一个好天气，把节奏放慢，随手一拍都是明信片。更多真实打卡可去社区搜索「'+name+'」看看大家怎么玩。'}],
    tips:'该目的地由 AI 模板库即时生成规划：点位为代表性推荐，订票前请用上方平台比价核价；社区里有大量「'+name+'」相关真实打卡与评论可参考。'
  };
}
function matchPlan(q){
  q=q||'';
  for(const k in PLANS){if(q.includes(k))return PLANS[k]}
  const hit=SPOTS.find(s=>q.includes(s.n)||(s.city&&q.includes(s.city)));
  if(hit){const base=PLANS['大理'];return {...base,dest:hit.city+' · '+hit.n,days:'2-3 天',routeDays:[[hit.id]],spots:[hit.id,...base.spots.filter(i=>i!==hit.id).slice(0,2)]}}
  const g=geoMatch(q);
  if(g)return genPlan(g);
  return null;
}
/* ---- ECharts 引擎按需加载（AI 页首次用到时自动加载，加载完统一回调） ---- */
let __ecQ=null;
function ensureECharts(cb){
  if(window.echarts)return cb(true);
  if(__ecQ){__ecQ.push(cb);return}
  __ecQ=[cb];
  loadECharts(ok=>{const q=__ecQ;__ecQ=null;q.forEach(f=>f(ok))});
}
/* ---- 城市锚点硬坐标（用于 POI_ROUTE fallback 坐标的区域修正） ---- */
const POI_ANCHORS={
 '大理':[100.164,25.680],
 '九寨':[103.918,33.262],
 '日本':[135.768,34.974],   /* 京都 */
 '巴黎':[2.352,48.857],
 '冰岛':[-21.940,64.147],   /* 雷克雅未克 */
 '三亚':[109.508,18.247],
 '张家界':[110.479,29.119],
 '清迈':[98.985,18.788],
 '马尔代夫':[73.510,4.200]
};
function fixPOIRoute(route){
  if(!route)return;
  for(const k in route){
    const arr=route[k];if(!Array.isArray(arr)||!arr.length)continue;
    const anc=POI_ANCHORS[k];if(!anc)continue;
    /* 把所有 POI 平移到锚点区域（保持 md5 偏移的相对关系） */
    const cur={lng:0,lat:0},n={lng:0,lat:0};
    arr.forEach(p=>{cur.lng+=p.lng;cur.lat+=p.lat});
    cur.lng/=arr.length;cur.lat/=arr.length;
    const dLng=anc[0]-cur.lng,dLat=anc[1]-cur.lat;
    arr.forEach(p=>{p.lng=+((p.lng+dLng).toFixed(4));p.lat=+((p.lat+dLat).toFixed(4))});
  }
}
fixPOIRoute(window.POI_ROUTE);
function planKeyOf(p){for(const k in PLANS)if(PLANS[k]===p)return k;return ''}
function runAI(q){
  q=(q||'').trim();if(!q)return toast('先告诉 AI 你想去哪儿吧 ✍️');
  window.scrollTo({top:$('.ai-hero-box').getBoundingClientRect().top+window.scrollY-90,behavior:'smooth'});
  const pipe=$('#pipeline');pipe.classList.add('show');
  const steps=$$('.step');steps.forEach(s=>s.classList.remove('doing','done'));
  $('#modGrid').classList.remove('show');$('#planHead').classList.remove('show');
  let p=0;$('#pipeBar').style.width='4%';
  const total=2600,seg=total/4;let si=0;
  const t1=setInterval(()=>{
    if(si>0&&steps[si-1]){steps[si-1].classList.remove('doing');steps[si-1].classList.add('done')}
    if(si<4){steps[si].classList.add('doing');p=Math.min(97,(si+1)/4*96);$('#pipeBar').style.width=p+'%';si++}
    else{clearInterval(t1);steps[3].classList.remove('doing');steps[3].classList.add('done');$('#pipeBar').style.width='100%';setTimeout(()=>{pipe.classList.remove('show');showPlan(matchPlan(q))},420)}
  },seg);
}
$('#aiGo').onclick=()=>runAI($('#aiInput').value);
$('#aiInput').addEventListener('keydown',e=>{if(e.key==='Enter')runAI(e.target.value)});
$$('#aiChips button').forEach(b=>b.onclick=()=>{$('#aiInput').value=b.textContent;runAI(b.textContent)});
function planRoute(plan){
  /* 由 routeDays 生成路线数据（每日不同颜色，首点打旗标） */
  const segs=(plan.routeDays||[plan.spots.slice(0,1)]).map((ids,di)=>({
    day:di+1,points:ids.map(id=>spotById(id)).filter(Boolean).map(s=>({id:s.id,lng:s.lng,lat:s.lat,n:s.n}))
  })).filter(sg=>sg.points.length);
  return segs;
}
function showPlan(plan){
  const grid=$('#modGrid');
  if(!plan){grid.classList.add('show');grid.innerHTML='<div class="mod col-12">没有识别到目的地 🤔 全国各省 / 市 / 自治区均已收录（含新疆、西藏、内蒙古、黑龙江等远距离目的地），试试直接输入地名，如：<b>常州 / 新疆 / 西藏 / 内蒙古 / 长沙 / 青岛 / 瑞士 / 土耳其</b>，或点击地图上的景点让 AI 规划 ✨</div>';$('#planHead').classList.remove('show');return}
  $('#planHead').innerHTML=`<div class="t">🧩 AI 已为你规划 · <b>${plan.dest}</b> · ${plan.days} · 出发地 <b>${plan.from||'你的城市'}</b> · 参考预算 <b>${fmt(plan.budget)}</b></div><button class="btn line" onclick="document.getElementById('aiInput').focus()">换个问法重新规划</button>`;
  $('#planHead').classList.add('show');
  const dcs=['#e7c76d','#7ea6d9','#6cc47a','#e58fb1','#9a86d9'];
  let bg='';plan.budgetItems.forEach((b,i)=>bg+=`--dc${i+1}:${dcs[i]};`);
  grid.innerHTML=`
  <div class="mod col-12 clickable" style="animation-delay:.05s" onclick="openMod('spots','${plan.dest}')">
    <h4><span class="mi">🏞</span>景点推荐（含图标分析）<span class="go">查看详情 →</span></h4>
    <div class="spot-mini-list">${plan.spots.map(id=>{const s=spotById(id);if(!s)return'';return `<div class="spot-mini" onclick="event.stopPropagation();openSpot('${s.id}')"><img src="${IMG(P[s.id])}" loading="lazy"><div><h5>${s.n}</h5><div class="city">${s.city} · ${s.tag}</div><div class="icon-chips"><span class="hl">⭐${s.rating}</span><span>💰${s.price}</span><span>⏱${s.hrs}</span><span>🚄${s.traf.split('（')[0]}</span><span>👫 情侣友好</span><span>🎒 背包友好</span></div></div></div>`}).join('')}</div>
  </div>
  <div class="mod col-12" style="animation-delay:.1s">
    <h4><span class="mi">🗺</span>行程路线图 · 白底蓝线 · 区域聚焦<span class="go">景点 + 住宿 + 美食 一线串联</span></h4>
    <div class="rt-toolbar">
      <div class="rt-modes" id="rtModes"></div>
      <div class="rt-meta" id="rtMeta"></div>
    </div>
    <div id="aiRouteMap" class="route-map-box lite"></div>
    <div class="rt-legend">
      <span><i class="rdot" style="background:#3a7bfd"></i>行程路线（起 / 序号 / 终 = 游览顺序）</span>
      <span><i class="rdot" style="background:#ff8a3d"></i>🏨 住宿</span>
      <span><i class="rdot" style="background:#22b573"></i>🍜 美食</span>
      <span>🖱 滚轮缩放 · 可拖拽 · 悬停看详情</span>
    </div>
    <div class="rt-food">
      <div class="rt-food-head">🍜 你最喜欢吃啥？选个口味，地图把这类店点亮给你</div>
      <div class="food-chips" id="foodChips"></div>
      <div class="rt-food-hit" id="foodHit"></div>
    </div>
    <div class="rt-cmts">
      <div class="rt-food-head">💬 评论区留言 · 这条路线靠不靠谱，你说了算</div>
      <div class="cmt-list" id="cmtList"></div>
      <div class="cmt-form"><input id="cmtInput" maxlength="120" placeholder="写下你的建议、想吃的东西或私藏点位…"><button class="btn gold" id="cmtSend" type="button">发布</button></div>
    </div>
  </div>
  <div class="mod col-6 clickable" style="animation-delay:.15s" onclick="openMod('transport','${plan.dest}')">
    <h4><span class="mi">🚄</span>出行方式 · 可视化对比<span class="go">图表 + 平台比价 →</span></h4>
    ${plan.transport.map(t=>`<div class="trow"><span class="tm">${t.m}</span><div><div class="bar"><i style="width:${t.s*100}%"></i></div><div style="font-size:10.5px;color:var(--muted);margin-top:2px">${t.note} · 约 ${t.t}</div></div><span class="tp">${t.p}</span></div>`).join('')}
  </div>
  <div class="mod col-6 clickable" style="animation-delay:.25s" onclick="openMod('budget','${plan.dest}')" >
    <h4><span class="mi">💰</span>价格规划<span class="go">查看明细 →</span></h4>
    <div class="donut-row" style="${bg}">
      <div class="donut"><b>${fmt(plan.budget).replace('¥ ','¥')}<i>总预算</i></b></div>
      <div class="dlegend">${plan.budgetItems.map(b=>`<div class="li"><span><i style="background:var(${b.c})"></i>${b.k}</span><span>${fmt(b.v)}</span></div>`).join('')}</div>
    </div>
  </div>
  <div class="mod col-6 clickable" style="animation-delay:.3s" onclick="openMod('planb','${plan.dest}')">
    <h4><span class="mi">☔</span>行程备案 · 雨天 / 累了怎么办<span class="go">查看备案 →</span></h4>
    <div class="planb-tags"><span>🌧 下雨备案</span><span>☕ 休息点</span><span>🛋 犯懒方案</span></div>
    <div class="mod-blist"><div><b>下雨：</b>${plan.planB.rain.slice(0,42)}…</div><div><b>累了：</b>${plan.planB.rest.slice(0,42)}…</div></div>
  </div>
  <div class="mod col-6 clickable" style="animation-delay:.35s" onclick="openMod('crowd','${plan.dest}')">
    <h4><span class="mi">👪</span>同行人群注意 · 老人 / 小孩 / 情侣<span class="go">查看提示 →</span></h4>
    <div class="mod-blist"><div><b>👶 小孩：</b>${plan.crowd.kid.slice(0,40)}…</div><div><b>👵 老人：</b>${plan.crowd.elder.slice(0,40)}…</div><div><b>💑 情侣：</b>${plan.crowd.couple.slice(0,40)}…</div></div>
  </div>
  <div class="mod col-6 clickable" style="animation-delay:.45s" onclick="openMod('video','${plan.dest}')">
    <h4><span class="mi">🎬</span>打卡视频推荐 · 带 BGM<span class="go">查看详情 →</span></h4>
    <div class="vcards">${plan.videos.map((v,i)=>`<div class="vcard" onclick="event.stopPropagation();openVideo({t:'${v.t}',loc:'${v.loc}',imgs:['${v.imgs.join("','")}'],bgm:'${v.bgm}'})"><img src="${IMG(P[v.imgs[0]])}" loading="lazy"><span class="play"><i>▶</i></span><span class="vtag">♪ BGM</span><div class="vfoot"><h6>${v.t}</h6><p>📍 ${v.loc}</p></div></div>`).join('')}</div>
  </div>
  <div class="mod col-6 clickable" style="animation-delay:.55s" onclick="openMod('plog','${plan.dest}')">
    <h4><span class="mi">📷</span>Plog 推荐<span class="go">查看详情 →</span></h4>
    <div class="vcards">${plan.plogs.map(v=>`<div class="vcard" onclick="event.stopPropagation();openPlog('${v.t}','${plan.dest}','${v.img}','${encodeURIComponent(v.txt)}')"><img src="${IMG(P[v.img])}" loading="lazy"><div class="vfoot"><h6>${v.t}</h6><p>📍 ${plan.dest}</p></div></div>`).join('')}</div>
  </div>
  <div class="mod col-12" style="animation-delay:.6s;border-style:dashed"><h4><span class="mi">💡</span>AI 省钱贴士</h4><p style="font-size:12.5px;color:var(--ink-2)">${plan.tips}</p></div>`;
  grid.classList.add('show');
  /* 渲染路线小地图（百度风白底蓝线 + 住宿/美食点位 + 出行方式切换） */
  setTimeout(()=>{
    const el=$('#aiRouteMap');if(!el)return;
    ensureECharts(ok=>{
      if(!ok){el.innerHTML='<div class="rt-fallback">🗺 地图引擎加载失败（网络异常），请刷新重试</div>';return}
      const key=planKeyOf(plan);
      const poi=(typeof POI_ROUTE!=='undefined'&&POI_ROUTE[key])?POI_ROUTE[key]:null;
      let segs;
      if(poi&&poi.route&&poi.route.length){
        const days={};poi.route.forEach(p=>{(days[p.day]=days[p.day]||[]).push(p)});
        segs=Object.keys(days).sort((a,b)=>a-b).map(d=>({day:+d,points:days[d]}));
      }else segs=planRoute(plan);
      if(!segs.length){el.innerHTML='<div class="rt-fallback">该目的地暂无路线数据</div>';return}
      const allPts=segs.flatMap(sg=>sg.points);
      const isCN=allPts.every(p=>{const s=spotById(p.id);return s?s.rg==='cn':(p.lng>72&&p.lng<136&&p.lat>16&&p.lat<54)});
      const stays=poi?(poi.stays||[]):[],eats=poi?(poi.eats||[]):[];
      window.__rt=createLiteRouteMap('aiRouteMap',isCN?'china':'world',{segs:segs,stays:stays,eats:eats,mode:rtMode,
        onSpot:id=>{if(spotById(id))openSpot(id)}});
      renderRtModes();renderRtStats();renderFoodChips(eats);renderCmts(key||plan.dest);
    });
  },60);
}
/* ---- 路线模块：出行方式切换 / 里程时间统计 ---- */
let rtMode=localStorage.getItem('fmw_rt_mode')||'drive';
function renderRtModes(){
  const box=$('#rtModes');if(!box)return;
  box.innerHTML=Object.keys(RT_MODES).map(k=>`<button type="button" class="${k===rtMode?'on':''}" data-m="${k}">${RT_MODES[k].label}</button>`).join('');
  box.querySelectorAll('button').forEach(b=>b.onclick=()=>{
    rtMode=b.dataset.m;localStorage.setItem('fmw_rt_mode',rtMode);
    renderRtModes();renderRtStats();
    if(window.__rt)window.__rt.setMode(rtMode);
  });
}
function renderRtStats(){
  const el=$('#rtMeta');if(!el||!window.__rt)return;
  const st=rtStats(window.__rt.segs,rtMode);
  el.innerHTML=`📏 全程约 <b>${st.km}</b> km · ${RT_MODES[rtMode].label}约 <b>${st.timeTxt}</b> · 途径 <b>${st.stops}</b> 站`;
}
/* ---- 路线模块：美食偏好（你最喜欢吃啥） ---- */
const FOOD_KINDS=['🌶 川湘辣','🍜 面食粉类','🍣 日韩料理','🥘 当地小吃','🥗 轻食素食','🍰 甜品咖啡'];
let foodPref=localStorage.getItem('fmw_food_pref')||'';
function renderFoodChips(eats){
  const box=$('#foodChips');if(!box)return;
  box.innerHTML=FOOD_KINDS.map(k=>`<button type="button" class="${k===foodPref?'on':''}">${k}</button>`).join('');
  const apply=()=>{
    const hitEl=$('#foodHit');if(!hitEl)return;
    const hit=(eats||[]).filter(e=>!foodPref||e.kind2===foodPref);
    hitEl.innerHTML=foodPref
      ?(hit.length?`✅ 已为你点亮 ${hit.length} 家「${foodPref}」：<b>${hit.map(h=>h.n).join('、')}</b>（地图绿色 🍜 标记）`
        :`这片区域暂未收录「${foodPref}」类美食，在下方评论区告诉我们你想吃啥 👇`)
      :'';
  };
  box.querySelectorAll('button').forEach(b=>b.onclick=()=>{
    foodPref=b.textContent===foodPref?'':b.textContent;
    localStorage.setItem('fmw_food_pref',foodPref);
    box.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.textContent===foodPref));
    if(window.__rt)window.__rt.setEatFilter(foodPref);
    apply();
  });
  apply();
}
/* ---- 路线模块：评论区留言（本地持久化，登录后显示昵称） ---- */
const CMT_KEY='fmw_ai_cmts';
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function readCmts(k){try{const all=JSON.parse(localStorage.getItem(CMT_KEY)||'{}');return all[k]||[]}catch(e){return[]}}
function renderCmts(k){
  const list=$('#cmtList');if(!list)return;
  const arr=readCmts(k);
  list.innerHTML=arr.length
    ?arr.map(c=>`<div class="cmt"><b>${escHtml(c.u)}</b><span>${c.t}</span><p>${escHtml(c.txt)}</p></div>`).join('')
    :'<div class="cmt-empty">还没有留言，抢个沙发～ 说说这条路线，或者你想吃的美食</div>';
  const send=$('#cmtSend');
  if(send)send.onclick=()=>{
    const inp=$('#cmtInput'),txt=(inp.value||'').trim();
    if(!txt)return toast('先写点内容再发布 ✍️');
    let all={};try{all=JSON.parse(localStorage.getItem(CMT_KEY)||'{}')}catch(e){}
    (all[k]=all[k]||[]).unshift({
      u:(typeof user!=='undefined'&&user&&(user.nick||user.name))||'旅行者',
      t:new Date().toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}),
      txt:txt.slice(0,120)});
    try{localStorage.setItem(CMT_KEY,JSON.stringify(all))}catch(e){}
    inp.value='';renderCmts(k);toast('💬 留言成功');
  };
}
/* ---- 平台比价数据（跳转真实平台检索页） ---- */
const CMP={
 fly:[['携程机票','https://flights.ctrip.com/','🛫','比价航司与退改规则'],['飞猪旅行','https://www.fligo.com/','🧳','会员常有大额立减'],['去哪儿','https://www.qunar.com/','🔎','低价票聚合搜索']],
 rail:[['12306 官方','https://www.12306.cn/index/','🚄','候补+官方无溢价'],['携程火车票','https://trains.ctrip.com/','🎫','跨城联程方便'],['高铁管家','https://www.gaotie.cn/','📱','时刻表查询']],
 car:[['租租车','https://www.zuzuche.com/','🚗','境外租车比价'],['携程租车','https://car.ctrip.com/','🚙','国内门店多'],['高德路线规划','https://ditu.amap.com/','🗺️','算真实里程与过路费']],
 bus:[['巴士管家','https://www.chebada.com/','🚌','长途汽车票'],['携程汽车票','https://bus.ctrip.com/','🚐','城际大巴']]
};
function fuelHtml(plan){
  if(!plan.dist)return '<div class="fuel-box">🚤 该目的地以船 / 水上飞机上岛，不涉及自驾油费。</div>';
  const km=plan.dist, oil=(km*2*8/100*7.8).toFixed(0), toll=(km*2*.45).toFixed(0), total=(+oil+ +toll).toFixed(0);
  return `<div class="fuel-box">⛽ <b>自驾燃油费估算</b>（往返 ${km*2} km）<br>
   · 油耗按 8L/100km · 油价按 ¥7.8/L → 油费 <b>¥${oil}</b><br>
   · 过路费按 ¥0.45/km → 过路费 <b>¥${toll}</b><br>
   · 合计约 <b>¥${total}</b>（实际以车型 / 路线为准）· <a href="https://ditu.amap.com/" target="_blank" style="color:var(--gold)">高德地图输入起终点算精确油费 →</a></div>`;
}
function openMod(kind,dest){
  const plan=matchPlan(dest)||PLANS['大理'];
  if(kind==='spots'){
    openModal(`<button class="mx" onclick="closeModal()">✕</button><div style="padding:24px"><h3 style="font-size:18px;font-weight:900;margin-bottom:4px">🏞 ${plan.dest} · 景点清单</h3><p style="font-size:12px;color:var(--muted);margin-bottom:14px">含名称、地址、坐标、建议时长与交通衔接，可直接用于地图标点</p>
    ${plan.spots.map(id=>{const s=spotById(id);return s?`<div class="spot-mini" style="margin-bottom:10px" onclick="closeModal();openSpot('${s.id}')"><img src="${IMG(P[s.id])}"><div><h5>${s.n}</h5><div class="city">🏠 ${s.addr}</div><div class="icon-chips"><span class="hl">🌐 ${s.lng.toFixed(3)}, ${s.lat.toFixed(3)}</span><span>⏱ ${s.hrs}</span><span>🚄 ${s.traf}</span><span>💰 ${s.price}</span></div></div></div>`:''}).join('')}</div>`,true);
  }else if(kind==='transport'){
    openModal(`<button class="mx" onclick="closeModal()">✕</button><div style="padding:24px"><h3 style="font-size:18px;font-weight:900;margin-bottom:12px">🚄 ${plan.dest} · 出行方式对比</h3>
    <div class="cmp-chart" id="cmpChart"></div>
    <table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-top:8px">${'<tr style="color:var(--muted);text-align:left"><th style="padding:7px 4px;border-bottom:1px solid var(--line)">方式</th><th style="padding:7px 4px;border-bottom:1px solid var(--line)">耗时</th><th style="padding:7px 4px;border-bottom:1px solid var(--line)">参考价</th><th style="padding:7px 4px;border-bottom:1px solid var(--line)">舒适度</th></tr>'}${plan.transport.map(t=>`<tr><td style="padding:9px 4px;border-bottom:1px dashed var(--line);font-weight:700">${t.m}</td><td style="padding:9px 4px;border-bottom:1px dashed var(--line)">${t.t}</td><td style="padding:9px 4px;border-bottom:1px dashed var(--line);color:var(--gold);font-weight:700">${t.p}</td><td style="padding:9px 4px;border-bottom:1px dashed var(--line)">${'★'.repeat(Math.round(t.s*5))}</td></tr>`).join('')}</table>
    ${fuelHtml(plan)}
    <h4 style="font-size:14px;font-weight:900;margin:16px 0 4px">🛒 平台比价 · 跳转查询实时价（哪个平台划算自己比）</h4>
    <div class="cmp-grid">${(CMP[plan.__kind]||[...CMP.fly,...CMP.rail]).map(c=>`<a class="cmp-card" href="${c[1]}" target="_blank"><span class="cp-i">${c[2]}</span><b>${c[0]}</b><span>${c[3]}</span></a>`).join('')}</div>
    <p class="cmp-note">💡 价格随季节波动，建议 2-3 个平台交叉比价后再下单；出行前确认退改规则。</p></div>`,true);
    drawCmpChart(plan);
  }else if(kind==='budget'){
    const dcs=['#e7c76d','#7ea6d9','#6cc47a','#e58fb1','#9a86d9'];let bg='';plan.budgetItems.forEach((b,i)=>bg+=`--dc${i+1}:${dcs[i]};`);
    openModal(`<button class="mx" onclick="closeModal()">✕</button><div style="padding:24px"><h3 style="font-size:18px;font-weight:900;margin-bottom:12px">💰 ${plan.dest} · 价格规划明细</h3>
    <div class="donut-row" style="${bg}"><div class="donut"><b>${fmt(plan.budget)}<i>总预算</i></b></div><div class="dlegend">${plan.budgetItems.map(b=>`<div class="li"><span><i style="background:var(${b.c})"></i>${b.k}</span><span>${fmt(b.v)}</span></div>`).join('')}</div></div>
    <p style="font-size:12px;color:var(--muted);margin-top:12px">💡 ${plan.tips}</p></div>`);
  }else if(kind==='planb'){
    openModal(`<button class="mx" onclick="closeModal()">✕</button><div style="padding:24px"><h3 style="font-size:18px;font-weight:900;margin-bottom:12px">☔ ${plan.dest} · 行程备案</h3>
    <div class="mod-blist" style="font-size:13px">
      <div><b>🌧 如果那天下雨：</b>${plan.planB.rain}</div>
      <div><b>☕ 如果逛累了 / 想找地方坐坐：</b>${plan.planB.rest}</div>
      <div><b>🛋 如果突然不想去逛了：</b>${plan.planB.lazy}</div>
    </div>
    <p style="font-size:12px;color:var(--muted);margin-top:12px">💡 备案由 AI 结合目的地室内场景与本地生活数据生成，帮你把意外变成体验。</p></div>`);
  }else if(kind==='crowd'){
    openModal(`<button class="mx" onclick="closeModal()">✕</button><div style="padding:24px"><h3 style="font-size:18px;font-weight:900;margin-bottom:12px">👪 ${plan.dest} · 同行人群注意事项</h3>
    <div class="crowd-row"><span class="cw">👶 小孩</span><span>${plan.crowd.kid}</span></div>
    <div class="crowd-row"><span class="cw">👵 老人</span><span>${plan.crowd.elder}</span></div>
    <div class="crowd-row"><span class="cw">💑 情侣</span><span>${plan.crowd.couple}</span></div>
    <p style="font-size:12px;color:var(--muted);margin-top:12px">💡 按人群生成的安全与健康提示，出发前记得再核对天气与景区公告。</p></div>`);
  }else if(kind==='video'){
    openVideo(plan.videos[0]);
  }else if(kind==='plog'){
    const v=plan.plogs[0];openPlog(v.t,plan.dest,v.img,encodeURIComponent(v.txt));
  }
}
/* ---- 交通可视化图表 ---- */
function drawCmpChart(plan){
  if(!window.echarts){ensureECharts(()=>drawCmpChart(plan));return}
  const el=document.getElementById('cmpChart');if(!el)return;
  const kinds=plan.transport.map(t=>t.m.includes('飞')?'fly':t.m.includes('高铁')||t.m.includes('火车')?'rail':t.m.includes('自驾')||t.m.includes('租车')?'car':'bus');
  plan.__kind=kinds[0];
  const parseP=p=>{const m=String(p).replace(/,/g,'').match(/(\d+(?:\.\d+)?)/);return m?+m[1]:0};
  const parseT=t=>{const h=String(t).match(/(\d+(?:\.\d+)?)\s*h/);return h?+h[1]:0};
  const c=echarts.init(el);
  c.setOption({backgroundColor:'transparent',
    tooltip:{trigger:'axis',backgroundColor:'rgba(15,23,42,.92)',borderColor:'rgba(231,199,109,.4)',textStyle:{color:'#fff',fontSize:12}},
    legend:{data:['参考价(¥)','耗时(h)','舒适度(百分制)'],textStyle:{color:'#cfd6e6',fontSize:11},top:0},
    grid:{left:46,right:16,top:34,bottom:26},
    xAxis:{type:'category',data:plan.transport.map(t=>t.m),axisLabel:{color:'#cfd6e6',fontSize:11},axisLine:{lineStyle:{color:'rgba(255,255,255,.25)'}}},
    yAxis:{type:'value',axisLabel:{color:'#8b93a7',fontSize:10},splitLine:{lineStyle:{color:'rgba(255,255,255,.08)'}}},
    series:[
      {name:'参考价(¥)',type:'bar',data:plan.transport.map(t=>parseP(t.p)),itemStyle:{color:'#e7c76d',borderRadius:[6,6,0,0]},label:{show:true,position:'top',color:'#e7c76d',fontSize:10}},
      {name:'耗时(h)',type:'bar',data:plan.transport.map(t=>parseT(t.t)),itemStyle:{color:'#7ea6d9',borderRadius:[6,6,0,0]},label:{show:true,position:'top',color:'#7ea6d9',fontSize:10}},
      {name:'舒适度(百分制)',type:'bar',data:plan.transport.map(t=>Math.round(t.s*100)),itemStyle:{color:'#6cc47a',borderRadius:[6,6,0,0]},label:{show:true,position:'top',color:'#6cc47a',fontSize:10}}
    ]});
}
