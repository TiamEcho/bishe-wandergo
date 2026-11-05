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
 ['岘港','越南',108.20,16.05,['巴拿山','美溪海滩','会安古城'],'ab','4 天'],
 ['日本','日本',135.77,34.97,['浅草寺','伏见稻荷大社','清水寺','心斋桥'],'ab','5 天',['东京','京都','大阪','关西']],
 ['马尔代夫','马尔代夫',73.51,4.20,['马累市区','天堂岛','水上屋度假村','浮潜珊瑚礁'],'ab','5 天'],
 ['清迈','泰国',98.99,18.79,['契迪龙寺','塔佩门','宁曼路','素贴山双龙寺'],'ab','4 天'],
 ['九寨','四川',103.92,33.26,['九寨沟风景区','五花海','诺日朗瀑布','黄龙风景区'],'cn','3 天',['九寨沟']]
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
    openHrs:'以景区公告为准',bestTime:'day',needBook:false,dur:180,
    __virtual:true,
    tag:'AI 收录 · '+(prov||city||'目的地'),
    desc:name+' —— AI 行程库收录的代表性点位。出发前建议再核对景区开放时间、门票政策与天气。'};
  SPOTS.push(s);
  if(typeof ICO!=='undefined'&&!ICO[id])ICO[id]='📍';
  return s;
}
/* 渲染前过滤：虚拟占位点没有真实图片与介绍，不进景点卡片列表，避免出现「只有名字」的空卡 */
function realSpots(ids){
  return ids.map(id=>spotById(id)).filter(s=>s&&!s.__virtual);
}
/* ================= 站内景点库（js/spots_crawl.json）接入前端候选池 =================
 * data.js 的 SPOTS 每个城市只手工精编 1-2 个，上海只有外滩、东京只有浅草寺，
 * 而 570 条人工整理坐标的景点库只喂给了后端，所以前端本地匹配出来的行程
 * 永远是「1 个景点」。这里把整库转成 SPOTS 结构补进候选池：
 *   ① 按需加载，失败（file:// 直开 / 网络异常）静默跳过，退回原有行为
 *   ② 同城已有同名精编景点时不重复插入，精编数据（描述/开放时间）优先
 *   ③ id 加 lib_ 前缀，避免与 data.js 的 id 冲突 */
let __libReady=null;
function loadSpotLib(){
  if(__libReady)return __libReady;
  __libReady=new Promise(res=>{
    if(typeof fetch!=='function'||!location.protocol.startsWith('http'))return res(0);
    fetch('js/spots_crawl.json').then(r=>r.ok?r.json():[]).then(list=>{
      if(!Array.isArray(list))return res(0);
      const key=s=>s.city+'|'+s.n;
      const has=new Set(SPOTS.map(key));
      let added=0;
      list.forEach(it=>{
        if(!it||!it.name||it.lng==null||it.lat==null)return;
        const k=it.city+'|'+it.name;
        if(has.has(k))return;
        has.add(k);added++;
        SPOTS.push({
          id:'lib_'+it.spot_id,n:it.name,city:it.city||'',rg:it.region==='ab'?'ab':'cn',
          addr:it.address||((it.city||'')+' · '+it.name),lng:+it.lng,lat:+it.lat,
          hrs:it.hours||'2-3 小时',traf:it.traffic||'当地交通可达',
          price:it.price||'以景区公示为准',rating:+(it.rating||4.5),
          openHrs:'以景区公告为准',bestTime:'day',needBook:false,dur:180,
          tag:it.tags||'景点',desc:it.desc||'',__lib:true
        });
      });
      res(added);
    }).catch(()=>res(0));
  });
  return __libReady;
}
function geoMatch(q){
  let best=null;
  for(const e of GEO_DB){
    const names=[e[0],...(e[7]||[])];
    for(const n of names){if(q.includes(n)&&(!best||n.length>best[0].length)){best=e;break}}
  }
  return best;
}
/* ================= 行程生成核心：候选池 + 打分，不再依赖任何硬编码行程 =================
 * 输入：城市锚点（已收录城市取其 SPOTS，未收录走 GEO_DB 点位）、天数、偏好
 * 输出：spots（按天分好组）+ 每天的时刻表（含三餐、开放时间、预约提示）
 */
/* 偏好 → 命中加分的标签关键词 / 加分维度 */
const PREF_RULES={
 cheap:{tag:['免费','老街','市井','古城','夜游','公园'],w:.6,note:'优先免费与高性价比点位'},
 comfort:{tag:['温泉','度假','海景','园林','艺术','咖啡'],w:.8,note:'优先舒适度与体验密度'},
 photo:{tag:['日落','云海','夜景','出片','风景','湖景','海景'],w:1.0,note:'优先出片时段与光线'}
};
const INTEREST_KEYS=['历史','自然','美食','摄影','亲子','夜游','购物','海岛','温泉','艺术'];
/* 兴趣词 → 景点标签里的同义词。标签是「历史 · 宫廷」「夜景 · 都市」这种写法，
 * 直接对「历史」整词比对会漏掉「遗迹 / 古建 / 博物馆」这一大批点位 */
const INTEREST_SYN={
 '历史':['历史','遗迹','遗址','古建','古城','古镇','博物馆','纪念馆','文物','王朝','红色','故里','祠堂'],
 '自然':['自然','山水','湖泊','湖景','海子','森林','草原','雪山','瀑布','峡谷','湿地','地质'],
 '美食':['美食','小吃','夜市','市场','茶','咖啡','美食街','老街'],
 '摄影':['摄影','日落','出片','夜景','云海','机位','观景','天台'],
 '亲子':['亲子','乐园','动物园','水族','科技馆','海洋','游乐园','迪士尼'],
 '夜游':['夜游','夜景','夜市','灯光','酒吧'],
 '购物':['购物','商圈','百货','市集','步行街','免税'],
 '海岛':['海岛','海滩','沙滩','海岸','岛'],
 '温泉':['温泉','汤泉','泡池'],
 '艺术':['艺术','美术馆','展览','剧场','书店','文创','建筑','设计']
};
function interestOf(interests){
  const t=String(interests||'');
  return INTEREST_KEYS.filter(k=>t.includes(k));
}
/* 一个点位命中了几类兴趣（整词匹配同义词表，不再只比第一个字） */
function interestHit(s,ints){
  if(!ints.length)return 0;
  const tags=String(s.tag||'')+' '+String(s.n||'');
  let hit=0;
  ints.forEach(k=>{
    if((INTEREST_SYN[k]||[k]).some(w=>tags.includes(w)))hit++;
  });
  return hit;
}
/* 单景点打分：评分 + 兴趣命中 + 最佳时段适配 + 偏好加成 - 车程惩罚 */
function scoreSpot(s,ctx){
  let sc=(s.rating||4.5)*10;
  const tags=(s.tag||'')+' '+(s.n||'');
  /* 长途出行成本高，兴趣权重放大（命中 +18/类、不搭 -16）；短途保持原比例 */
  const isLong=ctx.tripType==='长途';
  if(ctx.ints.length){
    const hit=interestHit(s,ctx.ints);
    sc+=hit*(isLong?18:12);           /* 命中一类兴趣加分，命中两类及以上再加 8 */
    if(hit>=2)sc+=8;
    if(!hit)sc-=isLong?16:10;         /* 用户明确选了兴趣，完全不搭的点排后面 */
  }
  const pr=PREF_RULES[ctx.pref]||PREF_RULES.cheap;
  pr.tag.forEach(k=>{if(tags.includes(k))sc+=6*pr.w});
  if(ctx.used.has(s.id))sc-=999;                      /* 已排过的不重复 */
  if(s.dur>=420)sc+=6;                                /* 大景区优先，撑得住一天 */
  if(ctx.maxDrive){                                   /* 同城多点时，离锚点越远越扣分 */
    const d=rtDist({lng:ctx.anchor[0],lat:ctx.anchor[1]},s);
    /* 短途对距离更敏感（>30km 就开始扣），长途可接受更大车程（>90km 才扣） */
    const safe=isLong?90:30, k=isLong?.25:.45;
    if(d>safe)sc-=Math.min(30,(d-safe)*k);
  }
  return sc;
}
/* 从候选池按分数取前 n 个（同城为主，不足再用同区近邻兜底）
 * 小众保底：大热门（评分高 + 无兴趣标签也排前面）会把名额占满，
 *   这里给每天预留 1 个「小众 / 文艺 / 街区 / 市集」点位，
 *   名额不够时从已选中的最弱一个换成最靠前的小众点位 */
const NICHE_TAGS=['小众','文艺','街区','市集','书店','咖啡馆','文创','巷','弄'];
function isNiche(s){
  const tags=String(s.tag||'')+' '+String(s.n||'');
  return NICHE_TAGS.some(w=>tags.includes(w));
}
function pickSpots(pool,n,ctx,dayCount){
  const sorted=pool.slice().sort((a,b)=>scoreSpot(b,ctx)-scoreSpot(a,ctx));
  const out=sorted.slice(0,n);
  const days=Math.max(1,dayCount||1);
  const nicheWant=Math.min(days,out.length);        /* 每天 1 个小众点位 */
  const have=out.filter(isNiche).length;
  if(have>=nicheWant)return out;
  /* 候补小众点位：只从「未被选中的同城点位」里取，分数最高的优先 */
  const spare=sorted.filter(s=>!out.includes(s)&&isNiche(s));
  let need=nicheWant-have;
  for(const cand of spare){
    if(need<=0)break;
    /* 换掉已选中分数最低、且不是小众的那个 */
    const dropPool=out.filter(s=>!isNiche(s)).sort((a,b)=>scoreSpot(a,ctx)-scoreSpot(b,ctx));
    const drop=dropPool[0];
    if(!drop)break;
    out.splice(out.indexOf(drop),1,cand);
    need--;
  }
  return out;
}
/* ---- 住宿：没有酒店库，按「当天最后一个景点 + 预算档」给建议，
 * 位置锚在当天收尾处，避免出现「住城东、逛城西」这种来回折返 ---- */
function hotelOf(daySpots,city,pref){
  if(!daySpots.length)return null;
  const last=daySpots[daySpots.length-1];
  /* 片区名：取最靠近开头的那一级行政区。
   * 「上海市黄浦区中山东一路」→ 黄浦；「东京都墨田区本所1丁目」→ 墨田；
   * 没有区县就退回城市名。用 non-greedy 从前往后切，避免把「市」吃进区名 */
  let area='';
  const addr=String(last.addr||'');
  const mArea=addr.match(/^(?:.{2,6}?[市都道府县])?(.{2,5}?[新]?)(?:区|县)/);
  const mCity=addr.match(/^([\u4e00-\u9fa5]{2,4}?)市/);
  if(mArea)area=mArea[1]+'区';
  else if(mCity)area=mCity[1];
  if(!area)area=last.city||city;
  const lv=pref==='comfort'
    ?{t:'舒适型酒店 / 精品民宿',p:'¥500-900',note:'优先带早餐与地铁口的连锁中高端'}
    :{t:'经济型酒店 / 青旅',p:'¥180-350',note:'选地铁 1km 内，晚上回得来最重要'};
  return {n:area+' · '+lv.t,area,lng:last.lng,lat:last.lat,price:lv.p,note:lv.note};
}
/* ---- 三餐：按城市美食库就近绑定当天景点 ---- */
function eatCandidates(city){
  const raw=eatsOf(city)||[];
  /* EATS 是 4 元组（带位置），EATS_BY_REG 是 3 元组，统一成对象 */
  return raw.map(e=>({n:e[0],note:e[1],price:e[2],near:e[3]||''}));
}
/* 选一家离当天景点最近的餐厅；used 用于同一天早/午/晚不重样 */
function pickEat(list,daySpots,used){
  if(!list||!list.length)return null;
  const anchor=daySpots[0];
  const score=e=>{
    let s=0;
    if(used.has(e.n))s-=100;
    if(anchor&&e.near){
      const hit=daySpots.find(s2=>(s2.n||'').includes(e.near)||(s2.city||'').includes(e.near)||(s2.addr||'').includes(e.near));
      if(hit)s+=30;
    }
    return s;
  };
  return list.slice().sort((a,b)=>score(b)-score(a))[0];
}
/* 时间段 → 具体时刻（出发基准 09:00，按停留时长顺延） */
function minToHHMM(m){const h=Math.floor(m/60)%24,mm=Math.round(m%60);return String(h).padStart(2,'0')+':'+String(mm).padStart(2,'0')}
/* 一天的时刻表：上午景点 → 午餐 → 下午景点 → 晚餐 → 夜游，全部按时间顺序顺延 */
function buildTimeline(ids,city,opts){
  const list=ids.map(spotById).filter(Boolean);
  const eats=eatCandidates(city);
  const used=new Set(),placed=new Set();
  const order={morning:0,day:1,sunset:2,night:3,all:1};
  const sorted=list.slice().sort((a,b)=>(order[a.bestTime]??1)-(order[b.bestTime]??1));
  const items=[];
  const GAP=20;                       /* 景点之间的赶路缓冲 */
  const pushSpot=(s,startMin)=>{
    if(!s||placed.has(s.id))return startMin;
    placed.add(s.id);
    const dur=s.dur||180;
    items.push({type:'spot',id:s.id,n:s.n,start:startMin,end:startMin+dur,dur,
      openHrs:s.openHrs||'',needBook:!!s.needBook,bookNote:s.bookNote||'',traf:s.traf||'',price:s.price||''});
    return startMin+dur;
  };
  /* 早餐 08:00 */
  const be=pickEat(eats,sorted,used);
  if(be){used.add(be.n);items.push({type:'eat',meal:'早餐',n:be.n,note:be.note,price:be.price,start:8*60,end:8*60+45})}
  /* 每个景点只归属一个时段：上午 / 下午 / 晚上 */
  const morning=[],afternoon=[],evening=[];
  sorted.forEach(s=>{
    const bt=s.bestTime;
    if(bt==='night'||bt==='sunset')evening.push(s);
    else if(bt==='morning')morning.push(s);
    else afternoon.push(s);
  });
  /* 上午：morning 优先；没有 morning 时把分数最高的一个提到上午 */
  if(!morning.length&&(afternoon.length||evening.length)){
    const first=afternoon.length?afternoon.shift():evening.shift();
    if(first)morning.push(first);
  }
  let cur=9*60;
  morning.forEach(s=>{cur=pushSpot(s,cur)+GAP});
  /* 午餐：12:30 后，且不早于上午结束 */
  const le=pickEat(eats,sorted,used);
  if(le){
    used.add(le.n);
    const ls=Math.max(12*60+30,cur);
    items.push({type:'eat',meal:'午餐',n:le.n,note:le.note,price:le.price,start:ls,end:ls+50});
    cur=ls+50;
  }
  /* 下午 */
  cur=Math.max(cur,13*60+40);
  afternoon.forEach(s=>{cur=pushSpot(s,cur)+GAP});
  /* 晚餐：18:30 后，且不早于下午结束 */
  const di=pickEat(eats,sorted,used);
  if(di){
    used.add(di.n);
    const ds=Math.max(18*60+30,cur);
    items.push({type:'eat',meal:'晚餐',n:di.n,note:di.note,price:di.price,start:ds,end:ds+70});
    cur=ds+70;
  }
  /* 晚上 / 夜游 */
  cur=Math.max(cur,19*60+40);
  evening.forEach(s=>{cur=pushSpot(s,cur)+15});
  /* 兜底：仍未被安排的点位接在最后 */
  let tail=items.reduce((m,it)=>Math.max(m,it.end),cur);
  sorted.filter(s=>!placed.has(s.id)).forEach(s=>{tail=pushSpot(s,tail)+15});
  items.sort((a,b)=>a.start-b.start);
  return items;
}
/* 把景点按天切分：大景区独占一天（dur>=420），其余每天 3-4 个；
 * 总点位多于 天数*4 时，多出来的按「备选」均摊到每天，不再挤掉 */
function splitDays(ids,reqDays,tripType){
  const list=ids.map(spotById).filter(Boolean);
  const d=Math.max(1,reqDays||1);
  const days=Array.from({length:d},()=>[]);
  const heavy=list.filter(s=>(s.dur||180)>=400);
  const light=list.filter(s=>(s.dur||180)<400);
  /* 每天配比：大景区（迪士尼 / 登山这种 dur>=400）独占一天；
   * 其余按「上午 1 + 下午 1 + 夜间 1」的骨架走，单日打卡点上限按行程类型区分：
   * 短途 3 个（节奏慢）、长途 4 个（行程长、单位时间效率更高），超出就推到下一天 */
  const DAILY_MAX=String(tripType||'').trim()==='长途'?4:3;
  let di=0;
  heavy.forEach(s=>{while(days[di%d].length)di++;days[di%d].push(s.id);di++});
  light.forEach(s=>{
    let k=0,guard=0;
    while(days[di%d].length>=DAILY_MAX&&guard++<d*4)di++;
    days[di%d].push(s.id);di++;
  });
  /* 空白天：从已有天数里挪一个过来，保证 Day1..DayN 都有内容 */
  for(let i=0;i<d;i++){
    if(days[i].length)continue;
    const src=days.reduce((a,b)=>a.length>b.length?a:b,[]);
    if(src.length>1)days[i].push(src.pop());
  }
  /* 每天内部按时刻顺序排：morning → day → sunset → night；
   * 同样时段内按距离城市中心由近到远，保证当天单向推进不折返。
   * 住宿片区跟着最后一个景点走，所以排序必须在 hotelOf 之前定下来 */
  const ord={morning:0,day:1,sunset:2,night:3};
  const cLat=days.flat().map(id=>spotById(id)).filter(Boolean);
  const ctr=cLat.length
    ?{lng:cLat.reduce((a,s)=>a+s.lng,0)/cLat.length,lat:cLat.reduce((a,s)=>a+s.lat,0)/cLat.length}
    :null;
  days.forEach(arr=>arr.sort((a,b)=>{
    const x=spotById(a),y=spotById(b);
    const dx=(ord[x&&x.bestTime]??1)-(ord[y&&y.bestTime]??1);
    if(dx)return dx;
    if(ctr&&x&&y)return rtDist(ctr,x)-rtDist(ctr,y);
    return (y&&y.rating||0)-(x&&x.rating||0);
  }));
  return days;
}
/* ================= 打卡视频推荐：B 站旅行 UP 主 demo 素材 =================
 * 现阶段用固定的 B 站旅行 Vlog 链接做演示，卡片封面用景点本地图。
 * 后续接入链接解析后，这里换成后端返回的真实视频（标题 / UP 主 / 封面 / bvid 都由接口给）。
 * ext 是 B 站搜索关键词：没有精确视频时，点卡片也能跳到同主题的真实结果页。 */
const VLOG_UPS={
  lai:{up:'赖导AboutLai',tag:'人文纪实',bili:'https://space.bilibili.com/1019112796',bvs:['BV1ry4y1L7CR','BV1XR4y1z7dT']},
  links:{up:'Linksphotograph',tag:'摄影徒步',bili:'https://space.bilibili.com/1867038',bvs:['BV1bG4y1J7kQ','BV1jQ4y1i7yq']},
  vivi:{up:'万能小维',tag:'深度旅行',bili:'https://space.bilibili.com/352495385',bvs:['BV1LT4y1k7Jv','BV1tK4y1Y7AH']}
};
/* 视频标题模板：{s} 景点名、{c} 城市名 */
const VLOG_TPL={
  lai:['在{s}走了一天，人文感拉满','{c}不那么热门的一天｜{s}','{s}：慢慢走才看得见的细节'],
  links:['{s}的清晨与黄昏｜拍到手软','背着相机爬{s}，值得吗','{c}户外徒步｜{s}沿线记录'],
  vivi:['{c}深度游｜{s}这一站别错过','{s}到底怎么玩｜本地节奏','从{s}出发，{c}的一天']
};
/* 按规划的景点顺序挑 2-3 条视频，UP 主轮换，保证同一个行程里不重复 */
function pickVlogCards(spotIds,destName,cityName){
  const ids=(spotIds||[]).filter(Boolean).slice(0,3);
  if(!ids.length)return [];
  const ups=Object.keys(VLOG_UPS);
  const n=Math.min(3,Math.max(2,ids.length));
  return ids.slice(0,n).map((sid,i)=>{
    const up=VLOG_UPS[ups[i%ups.length]];
    const s=typeof spotById==='function'?spotById(sid):null;
    const sName=(s&&s.n)||destName;
    const tpl=VLOG_TPL[ups[i%ups.length]][i%VLOG_TPL[ups[i%ups.length]].length];
    const title=tpl.replace(/\{s\}/g,sName).replace(/\{c\}/g,cityName||destName);
    return {
      t:title,loc:sName,imgs:[sid,sid],
      up:up.up,upTag:up.tag,upUrl:up.bili,
      /* bvid 直链 B 站视频页（新窗口打开，不内嵌播放） */
      url:'https://www.bilibili.com/video/'+(up.bvs[i%up.bvs.length]||''),
      ext:'https://search.bilibili.com/all?keyword='+encodeURIComponent(sName+' 旅行 vlog')
    };
  });
}
/* 用「候选池 + 打分」为任意目的地生成完整规划（无硬编码行程） */
function genPlan(e,reqDays){
  const [name,prov,lng,lat,spotNames,rg,days]=e;
  const city=name===prov?prov:name;
  const useDays=typeof reqDays==='number'?(reqDays||1):(parseInt(days)||2);
  /* 模板点位通常只有 3-4 个，按天数补足：至少 5 个，1 天 5 个、多天按 2 天/个 递增（上限 10） */
  const wantN=Math.min(10,Math.max(5,useDays*2+1));
  let names=spotNames.slice();
  if(names.length<wantN){
    /* 用同区已收录的真实景点补齐，仍不够才用模板地名兜底 */
    const extra=SPOTS.filter(s=>s.rg===rg&&!names.includes(s.n)&&
      rtDist({lng,lat},s)<900).sort((a,b)=>rtDist({lng,lat},a)-rtDist({lng,lat},b));
    for(const s of extra){
      if(names.length>=wantN)break;
      names.push(s.n);
    }
  }
  const spots=names.map(n=>geoSpot(n,city,prov,lng,lat,rg).id);
  const far=rg==='cn'&&(lng<100||lat>42);
  const budget=rg==='ab'?9000:far?4500:2800;
  const b=[['交通',.38],['住宿',.30],['餐饮',.16],['门票/体验',.10]];
  const budgetItems=b.map((x,i)=>({k:x[0],v:Math.round(budget*x[1]/10)*10,c:'--dc'+(i+1)}));
  budgetItems.push({k:'其他',v:budget-budgetItems.reduce((s,x)=>s+x.v,0),c:'--dc5'});
  const transport=rg==='ab'?[
    {m:'✈️ 国际航班',t:'视航线',p:'¥3,000 起',s:.85,note:'提前 4-6 周订票更划算'},
    {m:'🚕 当地交通',t:'按次',p:'¥30-120',s:.7,note:'出租车 / 网约车 / 公交'},
    {m:'🚗 租车自驾',t:'全程',p:'¥350/天',s:.8,note:'需国际驾照认证件'}]:[
    {m:'✈️ 飞机',t:far?'约 4-6h':'约 1.5-3h',p:far?'¥1,500 起':'¥600 起',s:.9,note:far?'直飞或省会中转':'多城市直飞'},
    {m:'🚄 高铁/火车',t:far?'约 10h+':'约 2-5h',p:far?'¥800 起':'¥260 起',s:.75,note:'12306 提前购票'},
    {m:'🚗 自驾',t:'按路线',p:'油费+过路费',s:.7,note:'灵活自由，适合环线'}];
  const eats=eatCandidates(city);
  /* 与已收录城市同构：切分天数 → 每天时刻表（含三餐）+ 预约清单 */
  const routeDays=splitDays(spots,useDays);
  const timelines=routeDays.map(ids=>buildTimeline(ids,city));
  const bookList=[];
  routeDays.forEach((ids,di)=>ids.forEach(id=>{
    const s=spotById(id);
    if(s&&s.needBook)bookList.push({day:di+1,n:s.n,note:s.bookNote||'需提前预约，建议出发前 1-3 天确认余票'});
  }));
  return {__gen:true,dest:name,days:useDays+' 天',from:'你的城市',prov:e[1]||'',budget:budget,budgetItems:budgetItems,
    __center:{lng,lat},__reqDays:useDays,
    spots:spots,routeDays,timelines,bookList,eats,
    transport:transport,dist:rg==='ab'?0:far?2600:900,
    planB:{rain:'如遇降雨，改走'+name+'市区内的博物馆 / 老街 / 茶馆等室内场景，雨后光线反而通透出片。',rest:'逛累了找一家当地咖啡馆 / 茶馆歇脚，或回酒店午休 1 小时再出发。',lazy:'不想赶路就砍掉最远的一个点位，核心景区慢游半天也是完整的一天。'},
    crowd:{kid:'带娃优先选缆车 / 观光车接驳的点位，少走台阶；备齐防晒与常用药。',elder:'行程节奏放缓，每天核心点位不超过 2 个；'+(far?'高原 / 长途注意身体状况，行前做基础检查。':'注意景区接驳车末班时间。'),couple:name+'的日出 / 日落时段人少光好，适合拍照；可安排一顿当地特色晚餐。'},
    videos:pickVlogCards(spots,name,city),
    plogs:[{t:'在'+name+'的慢时光',img:spots[0],txt:name+'的旅行不必赶路：挑一个好天气，把节奏放慢，随手一拍都是明信片。更多真实打卡可去社区搜索「'+name+'」看看大家怎么玩。'}],
    tips:'该目的地由 AI 模板库即时生成规划：点位为代表性推荐，订票前请用上方平台比价核价；社区里有大量「'+name+'」相关真实打卡与评论可参考。'
  };
}
/* ================= 扇形分区（本地实现，与后端 planner.js 保持一致） =================
 * 以城市中心为锚点，按方位角把 360° 均分成 N 份（N = 天数），每个扇形内的景点归同一天，
 * 天内按距中心由近到远排序 → 路线从中心向外单向推进，不走回头路。
 * 后端 /api/plan/route 不可用时由前端自己算，保证线上线下效果一致。 */
const FAN_R=6371, FAN_RAD=Math.PI/180;
function fanDist(a,b){
  const dLa=(b.lat-a.lat)*FAN_RAD, dLo=(b.lng-a.lng)*FAN_RAD;
  const s=Math.sin(dLa/2)**2+Math.cos(a.lat*FAN_RAD)*Math.cos(b.lat*FAN_RAD)*Math.sin(dLo/2)**2;
  return 2*FAN_R*Math.asin(Math.sqrt(s));
}
function fanBearing(anchor,p){
  let deg=Math.atan2(p.lat-anchor.lat,p.lng-anchor.lng)*180/Math.PI;
  if(deg<0)deg+=360;
  return deg;
}
/* 去重：同名景点只保留最早出现的那一天，空出的位置从 spare 里补 */
function dedupeSpotDays(days,spare){
  const seen=new Set(), pool=(spare||[]).slice(), removed=[], filled=[];
  const want=days.map(d=>d.length);
  const out=days.map(day=>{
    const kept=[];
    day.forEach(s=>{
      const k=s.n||s.id;
      if(seen.has(k)){removed.push(k);return}
      seen.add(k);kept.push(s);
    });
    return kept;
  });
  out.forEach((day,i)=>{
    while(day.length<want[i]&&pool.length){
      let pick=-1,best=Infinity;
      pool.forEach((c,ci)=>{
        const sameCity=day.some(s=>s.city&&c.city&&s.city===c.city);
        const ref=day[day.length-1];
        const d=ref?fanDist(ref,c):9999;
        const sc=d-(sameCity?30:0);
        if(sc<best){best=sc;pick=ci}
      });
      if(pick<0)break;
      const cand=pool.splice(pick,1)[0];
      const k=cand.n||cand.id;
      if(seen.has(k))continue;
      seen.add(k);day.push(cand);filled.push(cand.n);
    }
  });
  return {days:out,removed,filled};
}
/* 扇形分区：按方位角排序 → 均分 360° → 容量均衡 → 天内由近到远 */
function fanCluster(spots,center,dayCount){
  const n=Math.max(1,dayCount|0);
  if(!center||!spots.length)return Array.from({length:n},()=>[]);
  const list=spots.filter(s=>s&&s.lng!=null&&s.lat!=null)
    .map(s=>({s,ang:fanBearing(center,s),d:fanDist(center,s)}))
    .sort((a,b)=>a.ang-b.ang);
  if(!list.length||n===1)return [list.slice().sort((a,b)=>a.d-b.d).map(x=>x.s)];
  const step=360/n, buckets=Array.from({length:n},()=>[]);
  list.forEach(it=>buckets[Math.min(n-1,Math.floor(it.ang/step))].push(it));
  const cap=Math.ceil(list.length/n);
  for(let r=0;r<n*2;r++){
    const over=buckets.findIndex(b=>b.length>cap);
    if(over<0)break;
    const short=buckets.findIndex((b,i)=>b.length<cap&&i!==over);
    if(short<0)break;
    const b=buckets[over];
    /* 从靠近缺额扇形的那一侧让点，保证方位角连续 */
    buckets[short].push(short>over?b.pop():b.shift());
    buckets[short].sort((x,y)=>x.ang-y.ang);
  }
  /* 扇区为空：把「与空扇区角距最近」的超额扇区拆一半过去（与后端一致） */
  const angGap=(i,k)=>{
    const co=k=>(k+0.5)*step;
    const diff=Math.abs(co(i)-co(k));
    return Math.min(diff,360-diff);
  };
  for(let r=0;r<n;r++){
    const short=buckets.findIndex(b=>b.length===0);
    if(short<0)break;
    let big=-1,bestGap=Infinity;
    buckets.forEach((b,i)=>{
      if(i===short||b.length<2)return;
      const g=angGap(short,i);
      if(g<bestGap){bestGap=g;big=i}
    });
    if(big<0)break;
    const sortedBig=buckets[big].slice().sort((x,y)=>x.d-y.d);
    const half=sortedBig.slice(Math.ceil(sortedBig.length/2));
    const keep=new Set(half);
    buckets[big]=sortedBig.filter(x=>!keep.has(x));
    buckets[short]=half;
  }
  return buckets.map(b=>b.sort((x,y)=>x.d-y.d).map(x=>x.s));
}
/* 具体时刻表：每天从 9:00 起，每个景点 150 分钟 + 20 分钟赶路，三餐按时间就近插入 */
function buildFanTimeline(spots,city){
  const items=[]; let cur=9*60; const GAP=20, DUR=150;
  const eats=eatCandidates(city);
  const used=new Set();
  spots.forEach((s,k)=>{
    const it={type:'spot',id:s.id,n:s.n,start:cur,end:cur+DUR,dur:DUR,
      openHrs:s.openHrs||'',needBook:!!s.needBook,bookNote:s.bookNote||'',
      traf:s.traf||'',price:s.price||''};
    items.push(it);
    cur+=DUR;
    if(k===0&&cur>=12*60){
      const e=pickEat(eats,spots,used);
      if(e){used.add(e.n);items.push({type:'eat',meal:'午餐',n:e.n,note:e.note,price:e.price,start:12*60+30,end:13*60+20});cur=13*60+20}
    }
    if(k===spots.length-1){
      const e=pickEat(eats,spots,used);
      if(e){used.add(e.n);items.push({type:'eat',meal:'晚餐',n:e.n,note:e.note,price:e.price,start:18*60+30,end:19*60+40});}
    }
    cur+=GAP;
  });
  return items.sort((a,b)=>a.start-b.start);
}
/* 本地扇形分区：把 matchPlan 选出的点位重排成「每天一个扇形 + 由近到远」 */
function fanApply(plan){
  const center=plan.__center;
  if(!center||!plan.routeDays||plan.routeDays.length<1)return plan;
  const ids=plan.spots.filter(id=>{const s=spotById(id);return s&&s.lng!=null});
  if(ids.length<3)return plan;
  const daily=fanCluster(ids.map(spotById),center,plan.routeDays.length);
  /* 每天至少 3 个景点（与后端一致）：不足的那天从最多那天拆一半过来 */
  const MIN=Math.min(Math.floor(ids.length/daily.length),3);
  for(let g=0;g<daily.length*8;g++){
    let thin=-1;
    daily.forEach((l,i)=>{if(thin<0||l.length<daily[thin].length)thin=i});
    if(thin<0||daily[thin].length>=MIN)break;
    let src=-1;
    daily.forEach((l,i)=>{if(i!==thin&&l.length>=MIN&&(src<0||l.length>daily[src].length))src=i});
    if(src<0)break;
    const half=daily[src].slice().sort((a,b)=>fanDist(center,a)-fanDist(center,b))
      .slice(Math.ceil(daily[src].length/2));
    const mv=new Set(half.map(s=>s.id));
    daily[src]=daily[src].filter(s=>!mv.has(s.id));
    daily[thin].push(...half);
  }
  plan.routeDays=daily.map(list=>list.map(s=>s.id));
  plan.timelines=plan.routeDays.map(list=>buildFanTimeline(list,plan.prov||plan.dest));
  plan.__fan=plan.routeDays.map(list=>{
    const angs=list.map(s=>fanBearing(center,s)).sort((a,b)=>a-b);
    return {bearing:[Math.round(angs[0]),Math.round(angs[angs.length-1])],
      km:Math.round(list.slice(1).reduce((a,s,i)=>a+fanDist(list[i],s),0)*10)/10};
  });
  return plan;
}
/* 把后端 /api/plan/route 的结果落到前端 plan 结构上 */
function applyRemotePlan(plan,remote){
  if(!plan||!remote||!remote.ok||!Array.isArray(remote.plan)||!remote.plan.length)return false;
  const routeDays=[],timelines=[],fan=[];
  remote.plan.forEach(d=>{
    const items=[]; const ids=[];
    (d.spots||[]).forEach(it=>{
      const s=geoSpot(it.name,it.city||plan.prov||plan.dest,plan.prov||plan.dest,it.lng,it.lat,
        (spotById(it.id)||{}).rg||'cn');
      if(it.lng!=null&&it.lat!=null){s.lng=it.lng;s.lat=it.lat}
      if(it.address)s.addr=it.address;
      /* 后端标注的类别（景点/购物/文创/美食/休闲/文化）+ 高德原始 type，前端可据此显示标签 */
      if(it.tags)s.tag=it.tags;
      if(it.amapType)s.__amapType=it.amapType;
      /* 四分类（景区/美食/打卡点/购物）：行程卡片标签与地图配色都按它走 */
      if(it.poiType)s.__poiType=it.poiType;
      if(!ids.includes(s.id))ids.push(s.id);
      items.push({type:'spot',id:s.id,n:s.n,start:it.start,end:it.end,dur:it.dur||150,
        openHrs:s.openHrs||'',needBook:!!s.needBook,bookNote:s.bookNote||'',traf:s.traf||'',price:it.price||s.price||'',
        restaurants:it.restaurants||[],hotel:it.hotel||null,
        distanceFromCenter:it.distanceFromCenter});
    });
    if(!ids.length)return;
    routeDays.push(ids);timelines.push(items);
    fan.push({bearing:d.bearingRange||[],km:d.routeKm||0,hotel:d.hotel||null});
  });
  if(!routeDays.length)return false;
  plan.spots=routeDays.flat().filter((id,i,a)=>a.indexOf(id)===i);
  plan.routeDays=routeDays;
  /* 后端只给景点行，三餐和「入住」都在前端补：
   * 之前这里直接用 remote 的景点列表覆盖 timelines，页面就只剩景点，
   * 变成「说好每天含三餐，实际一条餐饮行都没有」。
   * 三餐时间不能照搬 buildTimeline（它按本地 09:00 起算），
   * 必须跟着后端景点行的真实时间落位，否则会和景点时间重叠。 */
  const city=plan.prov||plan.dest||'';
  /* 餐厅轮转跨天共享：每天各建一个 used 会让三天早餐都是同一家 */
  const eatRotor={row:0};
  plan.timelines=timelines.map((items,di)=>{
    const keep=items.filter(it=>it.type==='spot').sort((a,b)=>(a.start||0)-(b.start||0));
    const eats=eatCandidates(city);
    if(!keep.length||!eats.length)return items;
    const mkEat=(meal,start,endAt)=>{
      const e=eats[eatRotor.row++%eats.length];
      const dur=meal==='晚餐'?70:meal==='午餐'?50:45;
      return {type:'eat',meal,n:e.n,note:e.note,price:e.price,start,end:endAt!=null?endAt:start+dur};
    };
    const out=keep.slice();
    /* 早餐：第一个景点开始前 30 分钟结束；景点 09:00 开始正好接得上 08:00-08:45 */
    const first=keep[0].start||9*60;
    if(first>=8*60+45)out.push(mkEat('早餐',Math.max(7*60+30,first-60)));
    /* 午餐：后端景点是 11:50-14:20 这种整块，本身就跨过饭点。
     * 优先塞进「两个景点之间的空档」；空档不够就把后面的景点整体顺延，
     * 保证午餐至少 50 分钟 —— 20 分钟的午休等于没有，实测会显得很赶。 */
    const lunchAt=(()=>{
      const LUNCH=50;
      for(let i=0;i<keep.length;i++){
        const end=keep[i].end||((keep[i].start||0)+(keep[i].dur||150));
        if(end<11*60+30)continue;                       /* 还没到饭点 */
        const next=keep[i+1];
        const nextStart=next?(next.start||0):null;
        const start=end;
        /* 有下一个景点且空档放不下：把这一天剩下的景点整体后移 */
        if(nextStart!=null&&nextStart-start<LUNCH){
          const shift=LUNCH-(nextStart-start);
          for(let k=i+1;k<keep.length;k++){
            keep[k].start=(keep[k].start||0)+shift;
            if(keep[k].end!=null)keep[k].end+=shift;
          }
        }
        return {start,end:start+LUNCH};
      }
      return {start:12*60+30,end:12*60+30+LUNCH};
    })();
    out.push(mkEat('午餐',lunchAt.start,lunchAt.end));
    /* 晚餐：紧跟当天最后一个景点结束（原先固定 20:00 开始，
     * 午餐顺延后最后一个景点被推到 20:30 才结束，晚餐就和它撞上了） */
    const last=keep.reduce((a,b)=>((b.end||0)>(a.end||0)?b:a),keep[0]);
    const lastEnd=last.end||((last.start||0)+(last.dur||150));
    out.push(mkEat('晚餐',Math.max(18*60+30,lastEnd+10)));
    return out.sort((a,b)=>(a.start||0)-(b.start||0));
  });
  /* 住宿建议同理：后端有真实酒店就用后端的，没有就按当天收尾景点补 */
  plan.hotels=routeDays.map((ids,di)=>{
    const h=(fan[di]&&fan[di].hotel)||null;
    if(h&&h.name)return {n:h.name,price:h.price||'',note:h.distance?('距当天最后一个景点 '+Math.round(h.distance)+' m'):'当天收尾景点附近',lng:h.location?String(h.location).split(',')[0]:null,lat:h.location?String(h.location).split(',')[1]:null};
    return hotelOf(ids.map(spotById).filter(Boolean),city,plan.pref);
  });
  plan.__fan=fan;
  plan.__center=remote.center||plan.__center;
  plan.__engine=remote.engine||null;
  const dl=(plan.timelines||[]).flat().filter(i=>i.type==='spot');
  plan.__poiCount=dl.filter(i=>(i.restaurants||[]).length&&!(i.restaurants||[])[0].local).length;
  return true;
}
/* 唯一性校验：同一景点不得出现在两天 */
function assertUniqueDays(plan){
  const seen=new Set();
  (plan.routeDays||[]).forEach((ids,i)=>{
    plan.routeDays[i]=ids.filter(id=>{if(seen.has(id))return false;seen.add(id);return true});
  });
  const keep=new Set(plan.routeDays.flat());
  plan.spots=(plan.spots||[]).filter(id=>keep.has(id));
  return plan;
}
/* ---- 请求后端规划：不可用 / 超时返回 null，由本地算法兜底 ---- */
async function fetchRemotePlan(city,days,want){
  if(typeof WGOAPI==='undefined'||!WGOAPI.planRoute)return null;
  try{
    /* 冷启动场景先探活：实例未醒就直接走本地兜底，别让用户干等 55 秒 */
    if(WGOAPI.warm&&WGOAPI.status()!==true&&backendCold===false){
      warmBackend();   /* 后台继续唤醒，醒了下一轮规划就能用上后端数据 */
      return null;
    }
    const r=await WGOAPI.planRoute(city,days,want);
    return (r&&r.ok&&Array.isArray(r.plan)&&r.plan.length)?r:null;
  }catch(_){return null}
}
/* 冷门城市兜底：静态库 / GEO_DB 都没收录时，从后端 scenic_spot 取该城景点。
 * fetch-pois.js 拉的高德 POI 只进数据库，前端不动这一步就会报「没有识别到目的地」。
 * 拿到数据后写回 SPOTS 再跑一次本地算法，后续排序 / 三餐 / 时刻表全部复用原有逻辑。 */
function matchPlanRemote(q,reqDays,opt){
  if(typeof WGOAPI==='undefined'||!WGOAPI.spotCity)return Promise.resolve(null);
  /* 只取「市 / 县 / 区」前面的主体，避免把「想去潮州玩两天」整句当城市名 */
  const m=String(q||'').match(/([\u4e00-\u9fa5]{2,6}?)(?:市|县|区)?(?:$|\s|\d)/);
  const city=m?m[1]:'';
  if(!city)return Promise.resolve(null);
  return WGOAPI.spotCity(city).then(r=>{
    const list=(r&&r.ok&&r.spots)||[];
    if(!list.length)return null;
    const has=new Set(SPOTS.map(s=>s.city+'|'+s.n));
    let added=0;
    list.forEach(it=>{
      if(!it||!it.name||it.lng==null||it.lat==null)return;
      const k=(it.city||city)+'|'+it.name;
      if(has.has(k))return;
      has.add(k);added++;
      SPOTS.push({
        id:'rm_'+encodeURIComponent(it.spot_key||it.name),
        n:it.name,city:it.city||city,rg:'cn',
        addr:(it.city||city)+' · '+it.name,
        lng:+it.lng,lat:+it.lat,
        hrs:'2-3 小时',traf:'当地交通可达',price:it.price||'以景区公示为准',
        rating:+(it.rating||0)||4.3,openHrs:'以景区公告为准',
        bestTime:'day',needBook:false,dur:180,
        tag:it.tags||it.poi_type||'景点',desc:it.desc||'',
        __poiType:it.poi_type||''
      });
    });
    if(!added)return null;
    return matchPlan(q,reqDays,opt);
  }).catch(()=>null);
}
/* 行程生成：城市定位 → 同城候选池打分 → 按天数取点位 → 三餐/预约 → 每天时刻表 */
function matchPlan(q,reqDays,opt){
  q=q||'';
  opt=opt||{};
  const ints=interestOf(opt.interests);
  const pref=opt.pref||'cheap';
  /* 行程类型：短途节奏慢、点位少；长途点位多、兴趣权重更高 */
  const tripType=String(opt.tripType||'').trim()==='长途'?'长途':'短途';
  const isLong=tripType==='长途';
  /* ① 定位城市：先找景点名，再找城市名，最后走 GEO_DB */
  const bySpot=SPOTS.find(s=>s.n&&q.includes(s.n));
  let city='',rg='cn',anchor=null;
  if(bySpot){city=bySpot.city;rg=bySpot.rg;anchor=[bySpot.lng,bySpot.lat]}
  else{
    const byCity=SPOTS.find(s=>s.city&&q.includes(s.city));
    if(byCity){city=byCity.city;rg=byCity.rg;anchor=[byCity.lng,byCity.lat]}
  }
  if(!city){
    /* 用景点库覆盖到的城市名（city 字段本身）再兜一次，支持「北京 3 天」这类纯城市输入 */
    const cities=[...new Set(SPOTS.map(s=>s.city))].sort((a,b)=>b.length-a.length);
    const hitCity=cities.find(c=>q.includes(c));
    if(hitCity){const s=SPOTS.find(x=>x.city===hitCity);city=hitCity;rg=s.rg;anchor=[s.lng,s.lat]}
  }
  if(!city){
    const g=geoMatch(q);
    if(g)return genPlan(g,reqDays);
    /* 静态库与 GEO_DB 都没收录的冷门城市（如潮州、景德镇），
     * 改问后端 scenic_spot 表：那里有 fetch-pois.js 新拉的高德 POI */
    return matchPlanRemote(q,reqDays,opt);
  }
  /* ② 候选池：同城全部景点；单城不足 3 个时，补同区近邻（80km 内，绝不跨地域） */
  const used=new Set();
  let pool=SPOTS.filter(s=>s.city===city&&s.rg===rg);
  if(bySpot)used.add(bySpot.id);
  if(pool.length<3){
    const near=SPOTS.filter(s=>s.rg===rg&&s.city!==city&&!used.has(s.id)&&
      rtDist({lng:anchor[0],lat:anchor[1]},s)<80).map(s=>s.id);
    pool=pool.concat(SPOTS.filter(s=>(s.city===city&&s.rg===rg)||near.includes(s.id)));
  }
  /* ③ 按天数与行程类型决定取几个点位：
   *    短途每天 2 个（上午 / 下午，节奏慢）、长途每天 3 个（上午 / 下午 / 夜间），
   *    再各加 1 个大景区名额，所以短途 1 天 3 个、3 天 7 个；长途 1 天 4 个、3 天 10 个 */
  const reqD=Math.max(1,reqDays||2);
  const perDay=isLong?3:2;
  const need=Math.min(reqD*perDay+1,pool.length);
  const ctx={used,ints,pref,anchor,maxDrive:true,tripType};
  let picked=pickSpots(pool,Math.min(need,pool.length),ctx,reqD);
  if(picked.length<need){
    /* 同城已排完：用同区 120km 内的真实景点再补一轮，不造占位点 */
    const has=new Set(picked.map(s=>s.id));
    const extra=SPOTS.filter(s=>s.rg===rg&&!has.has(s.id)&&!s.__virtual&&
      rtDist({lng:anchor[0],lat:anchor[1]},s)<120);
    if(extra.length){
      pool=pool.concat(extra);
      picked=pickSpots(pool,Math.min(need,pool.length),ctx,reqD);
    }
  }
  /* 用户勾了兴趣，但同城候选池里一个都对不上 —— 明确告知，而不是装作按兴趣排了 */
  let interestNote='';
  if(ints.length){
    const hitCount=pool.filter(s=>interestHit(s,ints)>0).length;
    const lost=ints.filter(k=>!pool.some(s=>interestHit(s,[k])>0));
    if(!hitCount){
      interestNote='该城市暂未收录「'+ints.join('/')+'」类点位，本次按评分与距离排序。';
    }else if(lost.length){
      interestNote='「'+lost.join('/')+'」类点位该城市暂缺，已按「'+
        ints.filter(k=>!lost.includes(k)).join('/')+'」偏好排序。';
    }
  }
  const spots=picked.map(s=>s.id);
  const dest=bySpot?bySpot.n:city;
  const meta=(typeof DEST_META!=='undefined'&&DEST_META[dest])||{};
  const ab=rg==='ab';
  /* ④ 预算：按天与地区档位，三餐人均从美食库取平均，落到「餐饮」科目里 */
  const eats=eatCandidates(city);
  const eatAvg=eats.length?Math.round(eats.reduce((a,e)=>a+(Number(String(e.price).replace(/[^\d]/g,''))||60),0)/eats.length):60;
  const dayBase=ab?2600:1400;
  const total=Math.max(1800,Math.round((dayBase*reqD+eatAvg*3*reqD*0.6)/100)*100);
  const ratio=pref==='comfort'
    ?[['交通',.34],['住宿',.32],['餐饮',.19],['门票/体验',.11]]
    :[['交通',.28],['住宿',.27],['餐饮',.22],['门票/体验',.17]];
  const budgetItems=ratio.map((x,i)=>({k:x[0],v:Math.round(total*x[1]/10)*10,c:'--dc'+(i+1)}));
  budgetItems.push({k:'其他',v:Math.max(0,total-budgetItems.reduce((s,x)=>s+x.v,0)),c:'--dc5'});
  /* ⑤ 时刻表：每天按 bestTime 排序 + 三餐就近绑定 + 当天收尾处的住宿建议 */
  const routeDays=splitDays(spots,reqD,tripType);
  const timelines=routeDays.map(ids=>buildTimeline(ids,city));
  const hotels=routeDays.map(ids=>hotelOf(ids.map(spotById).filter(Boolean),city,pref));
  const bookList=[];
  routeDays.forEach((ids,di)=>ids.forEach(id=>{
    const s=spotById(id);
    if(s&&s.needBook)bookList.push({day:di+1,n:s.n,note:s.bookNote||'需提前预约，建议出发前 1-3 天确认余票'});
  }));
  return {
    __pool:true,dest:dest,prov:city,__ab:ab,from:meta.from||'你的城市',
    days:reqD+' 天',__reqDays:reqD,__tripType:tripType,
    __center:{lng:anchor[0],lat:anchor[1]},
    spots,routeDays,timelines,bookList,eats,hotels,interestNote,
    budget:total,budgetItems,
    transport:ab?[
      {m:'✈️ 国际航班',t:'视航线',p:'¥3,000 起',s:.85,note:'提前 4-6 周订票更划算'},
      {m:'🚕 当地交通',t:'按次',p:'¥30-120',s:.7,note:'出租车 / 网约车 / 公交'},
      {m:'🚗 租车自驾',t:'全程',p:'¥350/天',s:.8,note:'需国际驾照认证件'}]:[
      {m:'✈️ 飞机',t:'约 1.5-4h',p:'¥600 起',s:.9,note:'多城市直飞，远距离首选'},
      {m:'🚄 高铁/火车',t:'约 2-6h',p:'¥260 起',s:.75,note:'12306 提前购票'},
      {m:'🚗 自驾',t:'按路线',p:'油费+过路费',s:.7,note:'灵活自由，适合环线'}],
    dist:meta.dist||0,
    planB:meta.planB||{rain:'如遇降雨，改走'+city+'市区内的博物馆 / 老街 / 茶馆等室内场景，雨后光线反而更通透。',rest:'逛累了就近找一家咖啡馆或茶馆歇脚，或回酒店午休 1 小时再出发。',lazy:'不想赶路就把最远的点位砍掉，核心景区慢游半天也算完整的一天。'},
    crowd:meta.crowd||{kid:'带娃优先选有观光车接驳的点位，少走台阶，备齐防晒与常用药。',elder:'每天核心点位不超过 2 个，注意景区接驳车末班时间。',couple:city+'的日出 / 日落时段人少光好，适合拍照。'},
    videos:pickVlogCards(spots,dest,city),
    plogs:[{t:'在'+city+'的慢时光',img:spots[0],txt:city+'的旅行不必赶路：挑一个好天气，把节奏放慢，随手一拍都是明信片。'}],
    tips:(meta.tips?meta.tips+' ':'')+(interestNote?interestNote+' ':'')+'行程由「景点库候选池 + 兴趣打分」实时生成：共 '+spots.length+' 个打卡点，分 '+reqD+' 天排布，每天 = 打卡点 + 三餐 + 住宿建议；开放时间与预约政策请以景区当日公告为准。'
  };
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
  const fixArr=(arr,anc)=>{
    if(!Array.isArray(arr)||!arr.length||!anc)return;
    const cur={lng:0,lat:0};
    arr.forEach(p=>{cur.lng+=p.lng;cur.lat+=p.lat});
    cur.lng/=arr.length;cur.lat/=arr.length;
    const dLng=anc[0]-cur.lng,dLat=anc[1]-cur.lat;
    arr.forEach(p=>{p.lng=+((p.lng+dLng).toFixed(4));p.lat=+((p.lat+dLat).toFixed(4))});
  };
  for(const k in route){
    const anc=POI_ANCHORS[k];if(!anc)continue;
    const obj=route[k];if(!obj)continue;
    fixArr(obj.route,anc);fixArr(obj.stays,anc);fixArr(obj.eats,anc);
  }
}
fixPOIRoute(POI_ROUTE);
/* 计算旅行天数（返程 - 出发 + 1） */
function calcDays(){
  const s=$('#fStart').value,e=$('#fEnd').value;
  if(!s||!e){$('#fDays').textContent='1 天';syncTripType(1);return 1}
  const d=Math.round((new Date(e)-new Date(s))/86400000)+1;
  const n=Math.max(1,d);$('#fDays').textContent=n+' 天';syncTripType(n);return n;
}
/* 天数与行程类型联动：只给建议，不强制改用户的选择 */
function syncTripType(days){
  const tip=$('#tripTypeTip');if(!tip)return;
  const n=days||calcDaysQuiet();
  const cur=(($$('#fTripType button.on')[0]||{dataset:{}}).dataset.type)||'短途';
  const suggest=n<=3?'短途':'长途';
  if(cur===suggest){
    tip.textContent='当前 '+n+' 天，适合'+suggest;
    tip.classList.remove('on');
  }else{
    tip.textContent='当前 '+n+' 天，更接近'+suggest+'（仍按所选的'+cur+'推荐）';
    tip.classList.add('on');
  }
}
function calcDaysQuiet(){
  const s=$('#fStart').value,e=$('#fEnd').value;
  if(!s||!e)return 1;
  return Math.max(1,Math.round((new Date(e)-new Date(s))/86400000)+1);
}
/* 读取表单，拼接查询文本供 matchPlan 识别目的地 */
function readForm(){
  const from=$('#fFrom').value.trim();
  const dest=$('#fDest').value.trim();
  const days=calcDays();
  const traffic=[...$$('#fTraffic button.on')].map(b=>b.dataset.k);
  const budget=Number(($('#fBudgetOpt')||{}).value||0);
  const pref=($('#fPref')||{}).value||'cheap';
  const stay=$('#fStay').value;
  const interests=[...$$('#fInterests button.on')].map(b=>b.textContent).join('、');
  const tripType=($$('#fTripType button.on')[0]||{dataset:{}}).dataset.type||'短途';
  const special=$('#fSpecial').value.trim();
  return {from,dest,days,traffic,budget,pref,stay,interests,tripType,special,
    query:dest+(interests?' '+interests:'')+(special?' '+special:'')};
}
/* ---- 交通规划：按起点→目的地估算距离，再按用户勾选的方式组合分段 ---- */
const CITY_COORD={
 '北京':[116.41,39.90],'上海':[121.47,31.23],'广州':[113.26,23.13],'深圳':[114.06,22.55],
 '成都':[104.07,30.67],'重庆':[106.55,29.56],'杭州':[120.15,30.28],'南京':[118.80,32.06],
 '武汉':[114.30,30.59],'西安':[108.94,34.34],'长沙':[112.94,28.23],'郑州':[113.63,34.75],
 '昆明':[102.83,24.88],'贵阳':[106.71,26.60],'南宁':[108.37,22.82],'福州':[119.30,26.08],
 '厦门':[118.09,24.48],'南昌':[115.86,28.68],'合肥':[117.28,31.86],'济南':[117.00,36.65],
 '青岛':[120.38,36.07],'天津':[117.20,39.13],'沈阳':[123.43,41.80],'大连':[121.61,38.91],
 '哈尔滨':[126.63,45.75],'长春':[125.32,43.82],'石家庄':[114.51,38.04],'太原':[112.55,37.87],
 '呼和浩特':[111.75,40.84],'银川':[106.23,38.49],'兰州':[103.83,36.06],'西宁':[101.78,36.62],
 '乌鲁木齐':[87.62,43.83],'拉萨':[91.11,29.65],'海口':[110.20,20.04],'三亚':[109.51,18.25],
 '大理':[100.16,25.68],'丽江':[100.23,26.88],'昆明南':[102.83,24.88],'宁波':[121.55,29.87],
 /* 以下为 SPOTS 里出现但原表缺失的城市：保证「直接搜景点名」时里程 / 交通不出错 */
 '阿坝州':[102.22,31.90],'九寨沟县':[103.92,33.26],'海北州':[100.90,36.96],
 '黄山市':[118.17,30.13],'延边':[129.51,42.89],'阿坝':[102.22,31.90],
 '湘西':[109.74,28.31],'马累':[73.51,4.17],'维克':[-19.01,63.42],
 '苏州':[120.62,31.30],'无锡':[120.30,31.57],'常州':[119.97,31.78],'温州':[120.70,28.00],
 '桂林':[110.29,25.27],'张家界':[110.48,29.12],'洛阳':[112.45,34.62],'开封':[114.31,34.80],
 '威海':[122.12,37.51],'烟台':[121.39,37.54],'珠海':[113.57,22.27],'佛山':[113.12,23.02],
 '东莞':[113.75,23.02],'泉州':[118.68,24.87],'徐州':[117.28,34.20],'兰州西':[103.83,36.06]
};
const TRAFFIC_META={
 bus:{icon:'🚌',name:'长途大巴',v:70,comfort:.55,fixed:20,perKm:.32,minP:40,note:'城乡 / 景区接驳最灵活'},
 rail:{icon:'🚄',name:'动车高铁',v:210,comfort:.85,fixed:40,perKm:.45,minP:60,note:'准点、性价比高，优先推荐'},
 train:{icon:'🚂',name:'普速火车',v:95,comfort:.62,fixed:25,perKm:.22,minP:35,note:'夜间卧铺可省一晚住宿'},
 plane:{icon:'✈️',name:'飞机',v:700,comfort:.95,fixed:180,perKm:.62,minP:320,note:'远距离最省时间，含机建燃油'}
};
/* 城市名容错：取用户输入里能命中的城市 */
function cityCoordOf(name){
  if(!name)return null;
  if(CITY_COORD[name])return CITY_COORD[name];
  for(const k in CITY_COORD)if(name.includes(k))return CITY_COORD[k];
  const g=geoMatch(name);
  return g?[g[2],g[3]]:null;
}
function kmBetween(a,b){
  if(!a||!b)return 0;
  const R=6371,r=Math.PI/180;
  const dLat=(b[1]-a[1])*r,dLng=(b[0]-a[0])*r;
  const h=Math.sin(dLat/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dLng/2)**2;
  return Math.round(2*R*Math.asin(Math.sqrt(h))*1.18); /* ×1.18 折算实际铁路 / 公路里程 */
}
function legTimeTxt(km,v){
  const h=km/v;const hh=Math.floor(h),mm=Math.round((h-hh)*60);
  return (hh?hh+'h':'')+(mm?mm+'min':'')||'30min';
}
/* 生成主线路段（起点 → 目的地），按勾选方式与偏好挑出最优组合 */
function planMainLeg(km,traffic,pref){
  const modes=(traffic&&traffic.length?traffic:['rail','plane']).map(k=>TRAFFIC_META[k]?k:'rail');
  const cost=k=>Math.max(TRAFFIC_META[k].minP,Math.round((TRAFFIC_META[k].fixed+km*TRAFFIC_META[k].perKm)/10)*10);
  const time=k=>km/TRAFFIC_META[k].v+0.6;
  const score=k=>pref==='comfort'
    ? time(k)-TRAFFIC_META[k].comfort*1.6               /* 舒适优先：时间短、舒适度高 */
    : cost(k)/60+time(k)*0.35;                          /* 经济划算：以票价为主 */
  const sorted=modes.slice().sort((a,b)=>score(a)-score(b));
  const best=sorted[0];
  const segs=[{m:TRAFFIC_META[best].icon+' '+TRAFFIC_META[best].name,t:legTimeTxt(km,TRAFFIC_META[best].v),p:'¥'+cost(best),s:TRAFFIC_META[best].comfort,note:TRAFFIC_META[best].note}];
  /* 混合分段：中远距离且勾选了多种方式时，补充「枢纽中转」备选更便宜 / 更舒适的组合 */
  if(modes.length>1&&km>400){
    const alt=sorted[1];
    if(pref==='cheap'&&cost(alt)>=cost(best)){
      /* 经济模式给出「枢纽换乘更省」的提示段 */
      segs.push({m:'🔁 分段换乘方案',t:legTimeTxt(km,TRAFFIC_META[alt].v)+' + ',p:'¥'+Math.max(30,Math.round(cost(alt)*0.82/10)*10),s:Math.min(.95,TRAFFIC_META[alt].comfort+.05),note:'换乘一次可省约 15-20% 票款'});
    }else if(pref==='comfort'&&time(alt)>time(best)){
      segs.push({m:'🔁 备选换乘',t:legTimeTxt(km,TRAFFIC_META[alt].v),p:'¥'+cost(alt),s:TRAFFIC_META[alt].comfort,note:'一等座 / 商务座更宽松'});
    }
  }
  if(km<80&&!modes.includes('bus'))segs.push({m:'🚌 大巴 / 城际公交',t:legTimeTxt(Math.max(30,km),70),p:'¥'+Math.max(15,Math.round(km*0.32/5)*5),s:.55,note:'短途直达，无需提前抢票'});
  segs.push({m:'🏨 目的地接驳',t:'按次 20-40min',p:'¥30-80',s:.65,note:'高铁站 / 机场到酒店，打车或景区直通车'});
  return segs;
}
/* 后端冷启动探活状态：null=探活中 / false=仍在唤醒 / true=已就绪。
 * 必须在模块作用域——runAI 里赋值，finishPlan 里读取；
 * 写在 runAI 内部就变成局部变量，finishPlan 会直接 ReferenceError */
let backendCold=null,waken=0;
/* 后端连不上时的统一提示条：一直显示到探活成功（或本次规划结束） */
function wakeTip(show,sec){
  let el=document.getElementById('wakeTip');
  if(!show){if(el)el.classList.remove('on');return}
  if(!el){
    el=document.createElement('div');
    el.id='wakeTip';el.className='wake-tip';
    document.body.appendChild(el);
  }
  el.innerHTML='<span class="wt-dot"></span><b>正在唤醒服务中…</b>'
    +'<span class="wt-sub">后端实例休眠时首次访问需 30–50 秒'+(sec?'，已等待 '+sec+' 秒':'')
    +'；可先用本地数据浏览，数据稍后自动同步</span>';
  el.classList.add('on');
}
/* 探活 + 轮询：后端已热时第一次 ping 秒回，不打扰用户；未醒则显示唤醒提示并每 3 秒重试 */
function warmBackend(){
  if(typeof WGOAPI==='undefined'||!WGOAPI.warm)return Promise.resolve(null);
  if(WGOAPI.status()===true)return Promise.resolve(true);
  return WGOAPI.warm({max:120000,onWait:sec=>{backendCold=false;waken=sec;wakeTip(true,sec)}})
    .then(r=>{
      backendCold=!!r;
      if(r){wakeTip(false);toast('✅ 后端服务已唤醒，正在同步线上数据…')}
      return r;
    });
}
function runAI(){
  const f=readForm();
  if(!f.from)return toast('请先填写出发地（起点）📍');
  if(!f.dest)return toast('请先填写目的地城市 ✍️');
  disposeItineraryMap();
  const pipe=$('#pipeline');pipe.classList.add('show');
  /* 进度条出现后再滚到进度条位置，避免继续停留在页面顶部 */
  requestAnimationFrame(()=>{
    const y=pipe.getBoundingClientRect().top+window.scrollY-90;
    window.scrollTo({top:Math.max(0,y),behavior:'smooth'});
  });
  const steps=$$('.step');steps.forEach(s=>s.classList.remove('doing','done'));
  $('#modGrid').classList.remove('show');$('#planHead').classList.remove('show');$('#itin3col').classList.remove('show');
  let p=0;$('#pipeBar').style.width='4%';
  const total=2600,seg=total/4;let si=0;
  const tip=$('#pipeTip');
  let left=Math.round(total/1000);
  const TIPS=['正在解析你的出行需求…','正在聚合全网真实攻略…','正在清洗数据、剔除广告…','正在模块化生成方案…'];
  if(tip)tip.textContent='AI 正在思考：'+TIPS[0]+' · 约 '+left+' 秒';
  /* 探活：Render 免费实例冷启动要 30–50 秒，未就绪时页面右下角显示
   * 「正在唤醒服务中…」并每 3 秒轮询重试；后端已热时一次 ping 秒回，提示不闪 */
  backendCold=null;waken=0;
  warmBackend().then(ok=>{
    if(!ok&&tip)tip.textContent='后端暂未唤醒，先用本地算法生成行程…';
  });
  const t2=setInterval(()=>{
    left--;const idx=Math.min(3,Math.floor((total-left*1000)/seg));
    if(tip&&backendCold!==false){if(left>0)tip.textContent='AI 正在思考：'+TIPS[idx]+' · 约 '+left+' 秒';else tip.textContent='马上完成，正在排版模块…'}
    if(left<=0)clearInterval(t2);
  },1000);
  const t1=setInterval(()=>{
    if(si>0&&steps[si-1]){steps[si-1].classList.remove('doing');steps[si-1].classList.add('done')}
    if(si<4){steps[si].classList.add('doing');p=Math.min(97,(si+1)/4*96);$('#pipeBar').style.width=p+'%';si++}
    else{
      clearInterval(t1);clearInterval(t2);
      steps[3].classList.remove('doing');steps[3].classList.add('done');$('#pipeBar').style.width='100%';
      finishPlan(f,pipe,tip);
    }
  },seg);
}
/* 收尾：先本地算出基础行程，再请求后端「去重 + 扇形分区 + 周边餐饮住宿」；
 * 后端不可用（未部署 / 超时 / 无 Key）时用前端本地扇形分区兜底，结果结构一致 */
async function finishPlan(f,pipe,tip){
  /* 站内景点库必须先就位再匹配：否则「上海」只能匹配到 data.js 里的外滩 1 个点 */
  await loadSpotLib();
  /* 可能是本地同步结果，也可能是冷门城市走后端兜底的 Promise，统一 await */
  let plan=await matchPlan(f.query,f.days,{interests:f.interests,pref:f.pref,tripType:f.tripType});
  const reqD=Math.max(1,f.days||2);
  if(plan){
    const cold=backendCold===false;
    if(tip)tip.textContent=cold?'后端正在冷启动，已用本地算法排好行程（数据稍后自动同步）…':'正在按方位角分区 · 串联周边餐饮与住宿…';
    const remote=plan.__pool?(cold?null:await fetchRemotePlan(plan.prov||plan.dest,reqD,0)):null;
    if(!remote&&cold){
      /* 冷启动不等了：先出本地结果解冻界面，后端唤醒后再静默刷新一次 */
      fanApply(plan);assertUniqueDays(plan);
      pipe.classList.remove('show');showPlan(plan,f);
      fetchRemotePlan(plan.prov||plan.dest,reqD,0).then(r=>{
        if(r){applyRemotePlan(plan,r);assertUniqueDays(plan);showPlan(plan,f)}
      });
      return;
    }
    if(remote){
      applyRemotePlan(plan,remote);
    }else{
      fanApply(plan);
    }
    assertUniqueDays(plan);
  }else{
    /* 没认出目的地：matchPlan 返回 null，直接给提示文案，不走 showPlan 的算路流程
     * （applyPrefs 会往 plan 上写 from，对 null 赋值会抛 TypeError） */
    toast('没有识别到目的地 🤔 试试直接输入地名，如：常州 / 新疆 / 西藏 / 长沙 / 青岛 / 瑞士 / 土耳其');
  }
  pipe.classList.remove('show');
  showPlan(plan,f);
}
$('#aiGo').onclick=()=>runAI();
/* 日期联动天数 */
$('#fStart').addEventListener('change',calcDays);
$('#fEnd').addEventListener('change',calcDays);
/* 兴趣标签多选 */
$$('#fInterests button').forEach(b=>b.onclick=()=>b.classList.toggle('on'));
/* 行程类型单选：短途 / 长途 */
$$('#fTripType button').forEach(b=>b.onclick=()=>{
  $$('#fTripType button').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');
  syncTripType();
});
syncTripType();
/* 交通方式多选（大巴 / 动车 / 火车 / 飞机，可混合分段） */
$$('#fTraffic button').forEach(b=>b.onclick=()=>b.classList.toggle('on'));
function planRoute(plan){
  /* 由 routeDays 生成路线数据（每日不同颜色，首点打旗标） */
  const segs=(plan.routeDays||[plan.spots.slice(0,1)]).map((ids,di)=>({
    day:di+1,points:ids.map(id=>spotById(id)).filter(Boolean)
      .map(s=>({id:s.id,lng:s.lng,lat:s.lat,n:s.n,poiType:poiTypeOf(s)}))
  })).filter(sg=>sg.points.length);
  return segs;
}
/* ================= 双栏行程结果（时间轴 + 地图） ================= */
/* 生成当日主题短句（取首个景点的标签或名称关键词） */
function dayTheme(spots){
  if(!spots.length)return'自由探索';
  const s=spotById(spots[0]);
  if(!s)return'精彩一日';
  if(s.tag){const t=s.tag.split(/[·\/]/)[0].trim();if(t)return t}
  return s.n.length>6?s.n.slice(0,6):s.n;
}
/* 星级渲染（rating 4.5 → ★★★★☆） */
function starsOf(rating){
  const r=Math.round(rating||0);
  return'★'.repeat(Math.min(5,r))+'☆'.repeat(5-Math.min(5,r));
}
/* 人流趋势小折线（CSS 柱状模拟，8 个时段） */
function sparkBars(seed){
  let h=__h(seed||'spark');
  return Array.from({length:8},()=>{h=(h*1103515245+12345)&0x7fffffff;return 20+((h%1000)/1000)*80}).map(v=>`<i style="height:${v.toFixed(0)}%"></i>`).join('');
}
/* 总览页顶部的预约 / 三餐提醒汇总 */
function bookBanner(plan){
  const books=plan.bookList||[];
  const eatDays=(plan.timelines||[]).filter(t=>t.some(i=>i.type==='eat')).length;
  if(!books.length&&!eatDays)return '';
  const bookHtml=books.length
    ?`<div class="bk-row"><b>📌 需要提前预约（${books.length} 项）</b>${books.map(b=>`<span class="tl-badge">Day ${b.day} · ${escHtml(b.n)}</span>`).join('')}</div>`
    :'';
  return `<div class="book-banner">${bookHtml}<div class="bk-row"><b>🍽 三餐已排入行程</b><span class="tl-eat-chip">每天 早 / 午 / 晚 就近匹配 · 共 ${eatDays} 天</span></div></div>`;
}
let __itinCurDay=-1,__itinMap=null,__itinVersion=0;
/* ---- 行程条目：景点 / 餐饮 / 住宿统一成一种可拖拽行 ----
 * data-kind + data-day + data-key 三元组唯一标识一条：
 *   spot  → key 是景点 id
 *   eat   → key 是 eatRank 里的下标（一条餐饮 = 一个对象）
 *   hotel → key 是 hotelRank 里的下标 */
/* ===== 地点四分类：景区 / 美食 / 打卡点 / 购物 =====
 * 行程卡片标签、地图 marker 配色共用这一套映射，避免两处各写一份对不上。
 * 后端已给 poiType 时直接用；本地兜底生成的景点没有该字段，按名称与标签猜。
 * 挂成 var + window 属性：ai.js / map.js 加载顺序不固定，避免重复声明报错 */
var POI_CLS={'景区':'spot','美食':'food','打卡点':'photo','购物':'shop'};
var POI_COLOR={'景区':'#c9a227','美食':'#e0653f','打卡点':'#2f9e8f','购物':'#7a5cc4'};
window.POI_CLS=POI_CLS;window.POI_COLOR=POI_COLOR;
function poiTypeOf(p){
  if(!p)return '景区';
  if(p.__poiType&&POI_CLS[p.__poiType])return p.__poiType;
  const hay=[p.n,p.tag,p.__amapType].filter(Boolean).join(' ');
  if(/美食|小吃|餐饮|餐厅|夜市|菜馆|火锅|茶/.test(hay))return '美食';
  if(/购物|商场|商圈|步行街|市集|百货/.test(hay))return '购物';
  if(/打卡|地标|观景|文创|艺术|街区/.test(hay))return '打卡点';
  return '景区';
}
window.poiTypeOf=poiTypeOf;
function tlRowHtml(c,di,order){
  if(c.t==='spot'){
    const p=c.p,it=p.__itl||{};
    const rests=(it.restaurants||[]).slice(0,2);
    /* 地点类型标签（景区/美食/打卡点/购物）：冷门城市会补进餐饮与商圈，
     * 卡片上必须一眼看出这一站是什么性质，否则用户以为全是景点 */
    const pt=poiTypeOf(p);
    const ptTag=pt?`<span class="tl-type t-${POI_CLS[pt]||'spot'}">${pt}</span>`:'';
    const restHtml=rests.length?`<div class="tl-near"><span class="tl-near-l">🍽 附近餐饮</span>${rests.map(r=>`<span class="tl-near-i">${escHtml(r.name)}${r.rating?' ⭐'+r.rating:''}${r.price?' · '+escHtml(String(r.price)):''}</span>`).join('')}</div>`:'';
    return `<li class="tl-item" draggable="true" data-kind="spot" data-day="${di}" data-key="${escHtml(p.id)}" data-index="${p.index}"><span class="tl-time" data-slot="spot:${escHtml(p.id)}">—</span><div class="tl-body"><h5><span class="journey-number">${p.index+1}</span>${escHtml(p.n)}${ptTag}${it.needBook?'<span class="tl-badge">需预约</span>':''}</h5><p>🕘 开放 ${escHtml(it.openHrs||p.openHrs||'以景区公告为准')} · 游玩约 ${Math.round((it.dur||180)/60*10)/10} 小时${it.distanceFromCenter!=null?' · 距市中心约 '+it.distanceFromCenter+' km':''}</p>${it.needBook&&it.bookNote?`<p class="tl-book">📌 ${escHtml(it.bookNote)}</p>`:''}${restHtml}<div class="tl-media"><img src="${IMG(p.id)}" data-key="${escHtml(p.id)}" alt="${escHtml(p.n)}" loading="lazy"><button type="button" class="journey-detail" data-open="${p.id}">查看景点详情</button></div></div></li>`;
  }
  if(c.t==='eat'){
    const it=c.it;
    return `<li class="tl-item tl-eat" draggable="true" data-kind="eat" data-day="${di}" data-key="${c.k}" data-order="${order}"><span class="tl-time" data-slot="eat:${c.k}">—</span><div class="tl-body"><h5>🍽 ${escHtml(it.meal||'用餐')} · ${escHtml(it.n)}</h5><p>${escHtml(it.note||'')}${it.price?' · 人均 '+escHtml(String(it.price)):''}</p></div></li>`;
  }
  const h=c.h;
  return `<li class="tl-item tl-stay" draggable="true" data-kind="hotel" data-day="${di}" data-key="${c.k}" data-order="${order}"><span class="tl-time" data-slot="hotel:${c.k}">入住</span><div class="tl-body"><h5>🏨 ${escHtml(h.n)}</h5><p>${escHtml(h.note||'')}${h.price?' · 参考价 '+escHtml(String(h.price)):''}</p></div></li>`;
}
/* 一次拖拽的结果落到 plan：改所属天 + 改同类条目里的相对顺序，
 * 然后按「景点 → 餐饮 → 住宿」整体重排每条的先后，并把时刻重算一遍 */
function applyMove(plan,mv){
  const {kind,key,fromDay,toDay,beforeKey}=mv;
  if(kind==='spot'){
    const src=(plan.routeDays[fromDay]||[]).filter(id=>id!==key);
    const dst=fromDay===toDay?src:(plan.routeDays[toDay]||[]).slice();
    if(fromDay!==toDay)plan.routeDays[fromDay]=src;
    const at=dst.indexOf(beforeKey);
    dst.splice(at<0?dst.length:at,0,key);
    plan.routeDays[toDay]=dst;
    plan.spots=plan.routeDays.flat();
  }
  const list=mv.list;                       /* 该类的有序数组（eatRank / hotelRank 或拼好的用餐列表） */
  if(!list)return;
  const cur=list.find(x=>String(x.__k)===String(key));
  if(!cur)return;
  cur.day=toDay;
  const others=list.filter(x=>x!==cur);
  const idx=others.findIndex(x=>String(x.__k)===String(beforeKey));
  others.splice(idx<0?others.length:idx,0,cur);
  list.length=0;list.push(...others);
}
/* 按拖动后的顺序重算每条的先后序号 + 起止时刻（09:00 起，景点 150 分钟、正餐 50 分钟，行间 20 分钟） */
function retimePlan(plan){
  const lines=[];
  (plan.routeDays||[]).forEach((ids,day)=>ids.forEach(id=>lines.push({k:'spot:'+id,day})));
  (plan.eatRank||[]).forEach(e=>lines.push({k:'eat:'+e.__k,day:e.day,e}));
  (plan.hotelRank||[]).forEach(h=>lines.push({k:'hotel:'+h.__k,day:h.day,h}));
  const byDay={};
  lines.forEach(x=>(byDay[x.day]=byDay[x.day]||[]).push(x));
  Object.keys(byDay).forEach(d=>{
    let cur=9*60;
    byDay[d].forEach(x=>{
      if(x.h){x.h.t0=null;x.h.t1=null;return}
      const dur=x.e?({早餐:45,午餐:50,晚餐:70}[x.e.meal]||60):150;
      x.t0=cur;x.t1=cur+dur;cur+=dur+20;
    });
  });
  /* 回写到 timelines / eats / hotels —— 这三份是渲染和保存走的数据 */
  plan.timelines=plan.routeDays.map((ids,di)=>{
    const old=(plan.__itl||[])[di]||[];
    return ids.map(id=>{
      const it=old.find(x=>x.id===id)||{type:'spot',id,dur:150};
      const ln=lines.find(l=>l.k==='spot:'+id);
      return {...it,type:'spot',id,n:(spotById(id)||{}).n||it.n,start:ln.t0,end:ln.t1,dur:150};
    });
  });
  plan.eats=plan.routeDays.map((_,di)=>(plan.eatRank||[]).filter(e=>e.day===di)
    .map(e=>({type:'eat',meal:e.meal,n:e.n,note:e.note,price:e.price,start:e.t0,end:e.t1})));
  plan.hotels=plan.routeDays.map((_,di)=>(plan.hotelRank||[]).filter(h=>h.day===di).map(h=>h.__h));
}
/* 时刻回填：把 retimePlan 算出的起止时间写到对应条目的时间列 */
function fillTimes(plan,cards){
  const put=(slot,txt)=>{const el=cards.querySelector(`[data-slot="${slot}"]`);if(el)el.textContent=txt};
  (plan.routeDays||[]).forEach((ids,di)=>{
    ((plan.timelines&&plan.timelines[di])||[]).forEach(it=>{
      if(it.id!=null&&it.start!=null)put('spot:'+it.id,minToHHMM(it.start)+'-'+minToHHMM(it.end));
    });
    ((plan.eatRank||[]).filter(e=>e.day===di)).forEach(e=>{
      if(e.t0!=null)put('eat:'+e.__k,minToHHMM(e.t0)+'-'+minToHHMM(e.t1));
    });
  });
}
/* 拖拽：HTML5 DnD（桌面）+ touch 兜底（移动端）。
 * 放到某条上 = 插到它前面；放到某天空白处 = 追加到当天末尾 */
function bindDrag(plan,cards,repaint){
  let drag=null;
  const clear=()=>{
    cards.querySelectorAll('.dragging').forEach(el=>el.classList.remove('dragging'));
    cards.querySelectorAll('.drop-before').forEach(el=>el.classList.remove('drop-before'));
    cards.querySelectorAll('.drag-over').forEach(el=>el.classList.remove('drag-over'));
  };
  const mvFrom=(el,toDay,beforeKey)=>({
    kind:el.dataset.kind,key:el.dataset.key,fromDay:+el.dataset.day,toDay,beforeKey,
    list:el.dataset.kind==='eat'?plan.eatRank:(el.dataset.kind==='hotel'?plan.hotelRank:null)
  });
  cards.querySelectorAll('.tl-item[draggable]').forEach(el=>{
    el.addEventListener('dragstart',e=>{
      drag=el;el.classList.add('dragging');
      try{e.dataTransfer.setData('text/plain',el.dataset.key);e.dataTransfer.effectAllowed='move'}catch(_){}
    });
    el.addEventListener('dragend',()=>{drag=null;clear()});
  });
  cards.querySelectorAll('.timeline[data-day]').forEach(ul=>{
    ul.addEventListener('dragover',e=>{
      if(!drag)return;
      e.preventDefault();
      clear();ul.classList.add('drag-over');
      const over=[...ul.querySelectorAll('.tl-item[draggable]')].find(x=>x!==drag&&x.getBoundingClientRect().top>e.clientY-8);
      if(over)over.classList.add('drop-before');
    });
    ul.addEventListener('dragleave',e=>{if(!ul.contains(e.relatedTarget))ul.classList.remove('drag-over')});
    ul.addEventListener('drop',e=>{
      if(!drag)return;
      e.preventDefault();
      const toDay=+ul.dataset.day;
      const over=[...ul.querySelectorAll('.tl-item[draggable]')].find(x=>x!==drag&&x.getBoundingClientRect().top>e.clientY-8);
      const mv=mvFrom(drag,toDay,over?over.dataset.key:null);
      clear();drag=null;
      applyMove(plan,mv);
      retimePlan(plan);
      savePlanEdits(plan);
      repaint();
      toast('已调整：行程顺序与时间已重新排布');
    });
  });
  /* 移动端：长按 200ms 后进入拖拽，松手落在哪条上面就插到它前面 */
  let touchEl=null,touchTimer=null;
  cards.querySelectorAll('.tl-item[draggable]').forEach(el=>{
    el.addEventListener('touchstart',()=>{
      touchTimer=setTimeout(()=>{touchEl=el;el.classList.add('dragging')},200);
    },{passive:true});
    el.addEventListener('touchmove',()=>{
      if(!touchEl)clearTimeout(touchTimer);
    },{passive:true});
    el.addEventListener('touchend',e=>{
      clearTimeout(touchTimer);
      if(!touchEl){touchEl=null;return}
      const t=e.changedTouches[0];
      const under=document.elementFromPoint(t.clientX,t.clientY);
      const li=under&&under.closest('.tl-item[draggable]');
      const ul=under&&under.closest('.timeline[data-day]');
      const src=touchEl;
      clear();
      touchEl=null;
      if(!ul){return}
      const mv=mvFrom(src,+ul.dataset.day,li&&li!==src?li.dataset.key:null);
      applyMove(plan,mv);
      retimePlan(plan);
      savePlanEdits(plan);
      repaint();
      toast('已调整：行程顺序与时间已重新排布');
    });
  });
}
/* 首次渲染前把「餐饮 / 住宿」摊成两份可拖动的有序列表（eatRank / hotelRank）。
 * 之后拖拽只改这两份列表和 routeDays，再回写 timelines / eats / hotels */
function ensureRanks(plan){
  if(plan.eatRank&&plan.hotelRank)return;
  plan.__itl=(plan.timelines||[]).map(t=>t.slice());
  plan.eatRank=[];plan.hotelRank=[];
  (plan.timelines||[]).forEach((items,di)=>{
    items.filter(it=>it.type==='eat').forEach((it,k)=>{
      plan.eatRank.push({__k:di+'-'+k,day:di,meal:it.meal||'用餐',n:it.n,note:it.note||'',price:it.price||''});
    });
  });
  (plan.hotels||[]).forEach((h,di)=>{
    if(!h||!h.n)return;
    plan.hotelRank.push({__k:'h'+di,day:di,__h:h});
  });
  retimePlan(plan);
}
/* 拖动结果持久化：刷新页面后仍是调整过的顺序 */
const PLAN_EDIT_KEY='fmw_plan_edit';
function savePlanEdits(plan){
  try{
    localStorage.setItem(PLAN_EDIT_KEY,JSON.stringify({
      dest:plan.dest,
      routeDays:plan.routeDays,
      eatRank:(plan.eatRank||[]).map(e=>({__k:e.__k,day:e.day,meal:e.meal,n:e.n,note:e.note,price:e.price})),
      hotelRank:(plan.hotelRank||[]).map(h=>({__k:h.__k,day:h.day,__h:h.__h}))
    }));
  }catch(_){}
}
/* 生成新行程（换城市 / 重新规划）时旧的手动调整作废 */
function clearPlanEdits(){try{localStorage.removeItem(PLAN_EDIT_KEY)}catch(_){}}
function disposeItineraryMap(){
  __itinVersion++;
  if(__itinMap){__itinMap.dispose();__itinMap=null}
}
function renderItinerary3col(plan){
  const box=$('#itin3col');if(!box)return;
  ensureRanks(plan);
  disposeItineraryMap();
  const days=(plan.routeDays&&plan.routeDays.length)?plan.routeDays:[plan.spots.slice(0,1)];
  const segs=days.map((ids,i)=>({day:i+1,points:ids.map(spotById).filter(Boolean).map(s=>({...s}))}));
  if(!segs.some(s=>s.points.length)){box.classList.remove('show');box.innerHTML='';return}
  const req=plan.__reqDays||0;
  if(req&&days.length<req)setTimeout(()=>toast(`行程生成不完整：请求 ${req} 天，仅生成 ${days.length} 天，请重新生成或增加景点`),500);
  box.classList.add('show');
  box.innerHTML=`<div class="journey-tabs" role="tablist" aria-label="行程天数"><button type="button" role="tab" data-day="-1">总览</button>${days.map((_,i)=>`<button type="button" role="tab" data-day="${i}">Day ${i+1}</button>`).join('')}</div>
    <div class="journey-grid"><div class="journey-cards" id="journeyCards" role="tabpanel"></div>
    <section class="journey-map-panel"><div class="journey-map-head"><div><h3>行程地图</h3><p id="journeyStats"></p></div><button type="button" id="journeyFocus">聚焦路线</button></div><div id="journeyMap" class="journey-map"></div><p class="journey-map-note">地理轮廓示意 · 连线非道路导航 · 距离与交通时间为估算</p></section></div>`;
  function paintDay(idx){
    disposeItineraryMap();
    const version=__itinVersion;
    __itinCurDay=idx;
    const selected=idx<0?segs:[segs[idx]];
    let number=0;
    /* 每个景点按出现顺序编号，span 项也带 index 以便与地图联动 */
    const indexed=selected.map(sg=>({...sg,points:sg.points.map(p=>
    ({...p,index:number++,
      /* 附上后端给的行程条目（开放时间 / 预约 / 周边餐饮 / 距离），卡片里要用 */
      __itl:(((plan.timelines||[])[sg.day-1])||[]).find(it=>it.id===p.id)||null}))}));
    const cards=box.querySelector('#journeyCards');
    cards.scrollTop=0;
    const tlHtml=(idx<0?bookBanner(plan):'')+selected.map((sg,si)=>{
      const di=sg.day-1;
      const todaySpots=indexed[si].points;
      /* 景点 / 餐饮 / 住宿统一成同一份可拖拽条目：
       * 之前餐饮和住宿只是挂在景点卡片上的附属文字（或末尾单独一行），
       * 用户想把「晚饭换个地方」「酒店挪到第二天」根本没法调。
       * 同一天内的先后顺序：景点 → 餐饮 → 住宿，与 retimePlan 的重排规则一致 */
      const eatsOfDay=(plan.eatRank||[]).filter(e=>e.day===di);
      const hotelsOfDay=(plan.hotelRank||[]).filter(h=>h.day===di);
      const cardsOfDay=todaySpots.map(p=>({t:'spot',p,__k:'spot:'+p.id}));
      eatsOfDay.forEach(e=>cardsOfDay.push({t:'eat',k:e.__k,it:e}));
      hotelsOfDay.forEach(h=>cardsOfDay.push({t:'hotel',k:h.__k,h:h.__h}));
      cardsOfDay.forEach((c,i)=>c.__o=i);
      const rows=cardsOfDay.map(c=>tlRowHtml(c,di,c.__o)).join('');
      /* 扇形分区说明：当天景点相对市中心的方位角区间 → 证明路线单向推进不绕回 */
      const fan=(plan.__fan||[])[di]||{};
      const ang=fan.bearing&&fan.bearing.length===2?fan.bearing:null;
      const fanTip=ang?`<p class="journey-fan">🧭 本日路线位于市中心 ${ang[0]}°–${ang[1]}° 方位扇形内 · 由近及远单向推进${fan.km?' · 约 '+fan.km+' km':''}</p>`:'';
      const head=`<li class="tl-head"><span class="tl-time"></span><div class="tl-body"><h5>拖动可调整顺序</h5><span class="tl-hint">景点 / 餐饮 / 住宿都能移动，也能拖到后面几天</span></div></li>`;
      return `<section class="journey-day" data-day="${di}"><h3>Day ${sg.day} · ${escHtml(dayTheme(todaySpots.map(p=>p.id)))}</h3>${fanTip}<ul class="timeline" data-day="${di}">${head+rows}</ul></section>`;
    }).join('');
    cards.innerHTML=tlHtml;
    box.querySelectorAll('[role="tab"]').forEach(b=>{const on=+b.dataset.day===idx;b.classList.toggle('on',on);b.setAttribute('aria-selected',String(on))});
    const all=indexed.flatMap(s=>s.points);
    function select(index,scroll){
      const card=cards.querySelector(`[data-index="${index}"]`);if(!card)return;
      cards.querySelectorAll('.tl-item').forEach(c=>c.classList.toggle('selected',c===card));
      if(__itinMap)__itinMap.select(index);
      // 只滚动卡片列表，移动端地图始终留在列表上方。
      if(scroll)cards.scrollTo({top:cards.scrollTop+card.getBoundingClientRect().top-cards.getBoundingClientRect().top-12,behavior:'smooth'});
    }
    cards.querySelectorAll('.tl-item[data-index]').forEach(item=>{
      const index=+item.dataset.index;
      item.onclick=()=>select(index,false);
    });
    cards.querySelectorAll('[data-open]').forEach(b=>b.onclick=e=>{e.stopPropagation();openSpot(b.dataset.open)});
    /* 时刻回填：重排后的时间写在 data-slot 对应的时间列 */
    fillTimes(plan,cards);
    bindDrag(plan,cards,()=>paintDay(__itinCurDay));
    const stats=rtStats(indexed,rtMode);
    box.querySelector('#journeyStats').textContent=`约 ${stats.km} km · ${stats.timeTxt} · ${stats.stops} 站`;
    const el=box.querySelector('#journeyMap');
    const fresh=document.createElement('div');fresh.id='journeyMap';fresh.className='journey-map';el.replaceWith(fresh);
    fresh.textContent='地图加载中…';
    box.querySelector('#journeyFocus').onclick=()=>{if(__itinMap)__itinMap.focusRoute()};
    ensureECharts(ok=>{
      if(version!==__itinVersion||!fresh.isConnected||box.querySelector('#journeyMap')!==fresh)return;
      if(!ok){fresh.textContent='地图引擎加载失败，请刷新重试';return}
      fresh.textContent='';
      const isCN=all.every(p=>p.rg==='cn');
      const draw=cityGeo=>{
        __itinMap=createLiteRouteMap('journeyMap',isCN?'china':'world',
          {segs:indexed,cityGeo:cityGeo,city:plan.dest||plan.prov||'',mode:rtMode,onSelect:index=>select(index,true)});
      };
      /* 只对国内单城行程加载边界；城市已下到 geo/ 就圈选，没下到就按原方式按点位拟合 */
      if(isCN)loadCityGeo(plan.dest||plan.prov||'',draw);else draw(null);
    });
  }
  box.querySelectorAll('[role="tab"]').forEach(b=>b.onclick=()=>paintDay(+b.dataset.day));
  paintDay(-1);
}
/* ---- 按用户填写的信息覆盖模板里的交通 / 预算（起点、混合方式、预算档位、偏好） ---- */
function applyPrefs(plan,f){
  if(!plan||!f)return plan;
  const from=f.from||plan.from||'你的城市';
  plan.from=from;
  const km=kmBetween(cityCoordOf(from),cityCoordOf(plan.dest)||cityCoordOf(plan.prov||''));
  plan.dist=km||plan.dist||0;
  if(km){
    const legs=planMainLeg(km,f.traffic,f.pref);
    plan.transport=legs.map(x=>({m:x.m,t:x.t,p:x.p,s:x.s,note:x.note}));
    plan.__km=km;
    /* 交通费取主段票价重算预算，避免与前面「出行方式」模块自相矛盾 */
    const main=Number(String(legs[0].p).replace(/[^\d]/g,''))||0;
    const fallback=f.pref==='comfort'?Math.max(plan.budget,3800):Math.min(plan.budget,3000);
    const total=f.budget>0?Math.max(f.budget,main+Math.max(400,f.budget*.15)):Math.max(fallback,main*1.8);
    const ratio=f.pref==='comfort'
      ?[['交通',.34],['住宿',.32],['餐饮',.19],['门票/体验',.11]]
      :[['交通',.28],['住宿',.27],['餐饮',.22],['门票/体验',.17]];
    const items=ratio.map((x,i)=>({k:x[0],v:Math.round(total*x[1]/10)*10,c:'--dc'+(i+1)}));
    items.push({k:'其他',v:Math.max(0,total-items.reduce((s,x)=>s+x.v,0)),c:'--dc5'});
    plan.budgetItems=items;
    plan.budget=items.reduce((s,x)=>s+x.v,0);
    plan.__pref=f.pref;plan.__budgetCap=f.budget;
  }
  return plan;
}
function showPlan(plan,f){
  clearPlanEdits();
  plan=applyPrefs(plan,f);
  const grid=$('#modGrid');
  disposeItineraryMap();
  if(!plan){grid.classList.add('show');grid.innerHTML='<div class="mod col-12">没有识别到目的地 🤔 全国各省 / 市 / 自治区均已收录（含新疆、西藏、内蒙古、黑龙江等远距离目的地），试试直接输入地名，如：<b>常州 / 新疆 / 西藏 / 内蒙古 / 长沙 / 青岛 / 瑞士 / 土耳其</b>，或点击地图上的景点让 AI 规划 ✨</div>';$('#planHead').classList.remove('show');$('#itin3col').classList.remove('show');$('#itin3col').innerHTML='';return}
  $('#planHead').innerHTML=`<div class="t">🧩 AI 已为你规划 · <b>${plan.dest}</b> · ${plan.days} · <b>${escHtml(plan.from||'你的城市')}</b> → ${escHtml(plan.dest)}${plan.__km?' · 约 '+plan.__km+' km':''} · ${plan.__pref==='comfort'?'舒适优先':'经济划算'} · 参考总预算 <b>${fmt(plan.budget)}</b>/人</div><button class="btn line" onclick="document.getElementById('fDest').focus();window.scrollTo({top:document.querySelector('.ai-hero-box').offsetTop-90,behavior:'smooth'})">换个问法重新规划</button>`;
  $('#planHead').classList.add('show');
  /* 双栏行程结果（卡片 + 地图） */
  renderItinerary3col(plan);
  const dcs=['#e7c76d','#7ea6d9','#6cc47a','#e58fb1','#9a86d9'];
  let bg='';plan.budgetItems.forEach((b,i)=>bg+=`--dc${i+1}:${dcs[i]};`);
  grid.innerHTML=`
  <div class="mod col-12 clickable" style="animation-delay:.05s" onclick="openMod('spots','${plan.dest}')">
    <h4><span class="mi">🏞</span>景点推荐（含图标分析）<span class="go">查看详情 →</span></h4>
    <div class="spot-mini-list">${realSpots(plan.spots).map(s=>`<div class="spot-mini" onclick="event.stopPropagation();openSpot('${s.id}')"><img class="zoomable" src="${IMG(s.id)}" data-key="${escHtml(s.id)}" loading="lazy" onclick="event.stopPropagation();openViewer(this,'${s.n.replace(/'/g,'')}')"><div><h5>${s.n}</h5><div class="city">${s.city} · ${s.tag}</div><div class="icon-chips"><span class="hl">⭐${s.rating}</span><span>💰${s.price}</span><span>⏱${s.hrs}</span><span>🚄${s.traf.split('（')[0]}</span><span>👫 情侣友好</span><span>🎒 背包友好</span></div></div></div>`).join('')}</div>
  </div>
  <div class="mod col-12" style="animation-delay:.1s">
    <h4>路线交流</h4>
    <div class="rt-cmts">
      <div class="rt-food-head">💬 评论区留言 · 这条路线靠不靠谱，你说了算</div>
      <div class="cmt-list" id="cmtList"></div>
      <div class="cmt-form"><input id="cmtInput" maxlength="120" placeholder="写下你的建议、想吃的东西或私藏点位…"><button class="btn gold" id="cmtSend" type="button">发布</button></div>
    </div>
  </div>
  <div class="mod col-6 clickable" style="animation-delay:.15s" onclick="openMod('transport','${plan.dest}')">
    <h4><span class="mi">🚄</span>出行方式 · ${escHtml(plan.from||'你的城市')} → ${escHtml(plan.dest)}${plan.__km?'（约 '+plan.__km+' km）':''}<span class="go">图表 + 平台比价 →</span></h4>
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
    <h4><span class="mi">🎬</span>打卡视频推荐 · 攻略 vlog<span class="go">查看详情 →</span></h4>
    <div class="vlog-grid">${plan.videos.map((v,i)=>`<a class="vlog-card" href="${v.url}" target="_blank" rel="noopener noreferrer" style="animation-delay:${.5+i*.08}s" onclick="event.stopPropagation()">
      <div class="vl-thumb"><img src="${IMG(v.imgs[0])}" data-key="${escHtml(v.imgs[0])}" loading="lazy" alt="${escHtml(v.t)}">
        <span class="vl-play"><i>▶</i></span><span class="vl-bili">B站</span></div>
      <div class="vl-body"><h6>${escHtml(v.t)}</h6>
        <p class="vl-up"><span class="vl-ava">${escHtml((v.up||'UP').charAt(0))}</span>${escHtml(v.up)}<em>${escHtml(v.upTag||'')}</em></p>
        <p class="vl-meta">📍 ${escHtml(v.loc)} · <span class="vl-go">去 B 站看 →</span></p></div>
    </a>`).join('')}</div>
  </div>
  ${foodModHtml(plan)}
  ${crowdModHtml(plan)}
  ${hotelModHtml(plan)}
  <div class="mod col-6 clickable" style="animation-delay:.55s" onclick="openMod('plog','${plan.dest}')">
    <h4><span class="mi">📷</span>Plog 推荐<span class="go">查看详情 →</span></h4>
    <div class="vcards">${plan.plogs.map(v=>`<div class="vcard" onclick="event.stopPropagation();openPlog('${v.t}','${plan.dest}','${v.img}','${encodeURIComponent(v.txt)}')"><img src="${IMG(v.img)}" data-key="${escHtml(v.img)}" loading="lazy"><div class="vfoot"><h6>${v.t}</h6><p>📍 ${plan.dest}</p></div></div>`).join('')}</div>
  </div>
  <div class="mod col-12" style="animation-delay:.6s;border-style:dashed"><h4><span class="mi">💡</span>AI 省钱贴士</h4><p style="font-size:12.5px;color:var(--ink-2)">${plan.tips}</p></div>
  <div class="mod col-12" id="aiEntMod" style="animation-delay:.65s">
    <h4><span class="mi">🤖</span>AI 实体抽取 · ${plan.dest}<span class="go" id="aiEntRetry">重新采集 →</span></h4>
    <div class="mod-blist" id="aiEntBody"><div>正在调用 AI 从真实攻略原文里抽取地名 / 美食 / 商圈…</div></div>
  </div>`;
  grid.classList.add('show');
  /* 给本次渲染出的所有图片挂出图兜底：占位图 / 加载失败时按 imgChain 换更通用的提示词 */
  if(typeof watchImgs==='function')watchImgs(grid);
  aiEntSync(plan);
  /* 侧边模块导航：可展开/收起，点击定位到对应模块 */
  buildRail(plan);
  /* 新模块：人流饼图（等 DOM 就绪） */
  setTimeout(()=>initPlanExtras(plan),40);
  renderCmts(plan.dest);
}
/* ---- AI 实体：调用后端 POST /api/collect-guide（采集 + AI 抽取） ---- */
/* 采集走离线爬虫包 / 景点库，通常 1 秒内返回；20 秒超时足够兜底 */
const AI_ENT_TIMEOUT = 20000;
let __aiEntDown=false;
async function aiEntSync(plan){
  const dest=typeof plan==='string'?plan:plan.dest;
  const body=document.getElementById('aiEntBody');if(!body)return;
  const retry=document.getElementById('aiEntRetry');
  if(retry)retry.onclick=()=>{__aiEntDown=false;aiEntSync(plan)};
  /* 已知后端不可达：直接收起模块，不再发请求，避免控制台反复报 ERR_CONNECTION_REFUSED */
  if(__aiEntDown){const mod=document.getElementById('aiEntMod');if(mod)mod.remove();return}
  body.innerHTML='<div>正在调用 AI 从真实攻略原文里抽取地名 / 美食 / 商圈…</div>';
  const base=(typeof WGOAPI!=='undefined'&&WGOAPI.base)||'';
  if(!base){const mod=document.getElementById('aiEntMod');if(mod)mod.remove();return}
  let d=null,errMsg='';
  try{
    const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),AI_ENT_TIMEOUT);
    const r=await fetch(base+'/api/collect-guide',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({keyword:dest}),signal:ctl.signal
    });
    clearTimeout(timer);
    let j=null;
    try{ j=await r.json(); }catch(_){}
    if(!r.ok){ errMsg=(j&&j.message)||('HTTP '+r.status); throw new Error(errMsg); }
    d=j;
    if(!d||!d.ok){ errMsg=(d&&d.message)||'no data'; throw new Error(errMsg); }
  }catch(e){
    if(e&&e.name==='AbortError'){
      /* 采集太慢而不是后端挂了：保留模块，给出重试提示 */
      body.innerHTML='<div>采集超时（已等 20 秒）。可点右上角「重新采集」重试。</div>';
      return;
    }
    if(errMsg){
      /* 后端在线但采集失败（未配置路径 / 没有产出 / 超时）：保留模块并给出原因 */
      body.innerHTML=`<div>采集未完成：${escHtml(errMsg)}</div>`;
      return;
    }
    /* 连接被拒 / 跨域拦截：标记离线，本次会话内不再请求，模块直接收起 */
    __aiEntDown=true;
    const mod=document.getElementById('aiEntMod');if(mod)mod.remove();return;
  }
  __aiEntDown=false;
  const added=(typeof plan==='object')?aiEntApply(plan,d):0;
  renderAiEnt(body,d,added);
}
/* 实体抽取结果只做展示，不再补进行程景点列表：
 * 抽取到的多是「西藏」「北京」这类地名，直接塞进景点池会造出无名无图的伪景点。
 * 只有能对上真实景点库（SPOTS）的条目才允许作为「参考点位」展示。 */
function aiEntApply(plan,d){
  if(!plan||!d||!d.entities)return 0;
  const places=(d.entities.places||[]).filter(p=>p&&p.name);
  if(!places.length)return 0;
  /* 命中真实景点的数量，仅用于文案提示，不改动 plan.spots / routeDays */
  return places.filter(p=>SPOTS.some(s=>s.n===p.name||s.n.includes(p.name)||p.name.includes(s.n))).length;
}
function renderAiEnt(body,d,added){
  const row=(ico,label,arr)=>arr&&arr.length
    ?`<div><b>${ico} ${label}</b>${arr.slice(0,8).map(x=>escHtml(x.name)).join(' · ')}</div>`:'';
  const p=row('📍','地名',d.entities.places);
  const f=row('🍜','美食',d.entities.foods);
  const s=row('🏙','商圈',d.entities.districts);
  const meta=`<div><b>📊 本次采集</b>${d.collected} 条内容 · 新增入库 ${d.created} 条 · 抽取引擎 ${d.engine==='dots'?'AI 大模型':'本地规则（未配置 API Key）'}${added?` · 其中 ${added} 个可对上站内景点库`:''}</div>`;
  body.innerHTML=(p||f||s)
    ?(p+f+s+meta)
    :`<div>${escHtml(d.message||`暂未从「${d.keyword||''}」相关攻略里抽取到实体，换个目的地或稍后重试。`)}</div>${meta}`;
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
  const f=$('#rtFocus');if(f)f.onclick=()=>{if(window.__rt)window.__rt.focusRoute()};
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
async function openMod(kind,dest){
  /* matchPlan 对冷门城市返回 Promise，这里 await 后两种情况都能拿到 plan */
  const plan=await matchPlan(dest);
  if(!plan)return toast('没有识别到该目的地，换个地名试试');
  if(kind==='spots'){
    openModal(`<button class="mx" onclick="closeModal()">✕</button><div style="padding:24px"><h3 style="font-size:18px;font-weight:900;margin-bottom:4px">🏞 ${plan.dest} · 景点清单</h3><p style="font-size:12px;color:var(--muted);margin-bottom:14px">含名称、地址、坐标、建议时长与交通衔接，可直接用于地图标点</p>
    ${plan.spots.map(id=>{const s=spotById(id);return s?`<div class="spot-mini" style="margin-bottom:10px" onclick="closeModal();openSpot('${s.id}')"><img src="${IMG(s.id)}"><div><h5>${s.n}</h5><div class="city">🏠 ${s.addr}</div><div class="icon-chips"><span class="hl">🌐 ${s.lng.toFixed(3)}, ${s.lat.toFixed(3)}</span><span>⏱ ${s.hrs}</span><span>🚄 ${s.traf}</span><span>💰 ${s.price}</span></div></div></div>`:''}).join('')}</div>`,true);
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
    /* 详情弹窗同样列真实视频卡片，点击直接去 B 站 */
    openModal(`<button class="mx" onclick="closeModal()">✕</button><div style="padding:24px"><h3 style="font-size:18px;font-weight:900;margin-bottom:12px">🎬 ${plan.dest} · 攻略 Vlog</h3>
    <div class="vlog-grid">${plan.videos.map(v=>`<a class="vlog-card" href="${v.url}" target="_blank" rel="noopener noreferrer">
      <div class="vl-thumb"><img src="${IMG(v.imgs[0])}" data-key="${escHtml(v.imgs[0])}" loading="lazy" alt="${escHtml(v.t)}"><span class="vl-play"><i>▶</i></span><span class="vl-bili">B站</span></div>
      <div class="vl-body"><h6>${escHtml(v.t)}</h6><p class="vl-up"><span class="vl-ava">${escHtml((v.up||'UP').charAt(0))}</span>${escHtml(v.up)}<em>${escHtml(v.upTag||'')}</em></p><p class="vl-meta">📍 ${escHtml(v.loc)} · <span class="vl-go">去 B 站看 →</span></p></div>
    </a>`).join('')}</div>
    <p style="font-size:12px;color:var(--muted);margin-top:12px">💡 当前为演示素材，均为 B 站公开的旅行 Vlog 视频，点击卡片在新窗口打开。接入视频链接解析后将自动匹配真实相关视频。</p></div>`);
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

/* ================= 新增模块：美食 / 人流饼图 / 住宿对比 ================= */
/* 地方代表性美食库（按省/城市，真实菜名与大致价位，供推荐与平台检索） */
const FOOD_BY_REG={
 '新疆':[['大盘鸡','皮带面拌进汤汁，两人份正好','¥68'],['烤包子','馕坑现打，羊肉洋葱馅','¥5/个'],['手抓饭','黄萝卜+羊腿，油亮喷香','¥28'],['酸奶粽子','蜂蜜酸奶浇凉粽，解暑','¥12']],
 '西藏':[['藏面','碱面配牦牛肉汤，早餐首选','¥12'],['甜茶','一壶茶坐一下午','¥10'],['牦牛肉火锅','高原限定，暖身','¥120'],['糌粑','青稞炒面配酥油茶','¥15']],
 '内蒙古':[['手把肉','清水煮羊肉蘸椒盐','¥88'],['咸奶茶+奶皮子','锅茶配炒米','¥30'],['烤羊排','草原炭火直烤','¥98'],['莜面窝窝','蘸羊肉汤','¥20']],
 '云南':[['过桥米线','滚汤现烫，仪式感拉满','¥28'],['汽锅鸡','原汤蒸制，清甜','¥68'],['烤乳扇','奶香拉丝，街边小吃','¥10'],['菌子火锅','雨季限定，认准正规店','¥120']],
 '四川':[['火锅','牛油锅底+毛肚鸭肠','¥90'],['钵钵鸡','冷串串，红油微辣','¥35'],['甜水面','甜辣粗面，口感特别','¥12'],['蛋烘糕','街头甜点，边走边吃','¥8']],
 '重庆':[['小面','二两碱水面上麻辣浇头','¥12'],['火锅','九宫格老锅','¥95'],['酸辣粉','红薯粉配豌豆','¥10'],['烤脑花','夜市必点','¥18']],
 '贵州':[['酸汤鱼','红酸汤+稻花鱼','¥88'],['丝娃娃','蘸水卷饼，清爽','¥20'],['肠旺面','肥肠血旺配脆哨','¥15'],['豆腐圆子','外脆内嫩','¥10']],
 '广西':[['螺蛳粉','酸笋是灵魂','¥15'],['桂林米粉','卤水+锅烧','¥12'],['啤酒鱼','阳朔招牌','¥88'],['油茶','恭城打油茶','¥15']],
 '广东':[['早茶','虾饺烧卖凤爪一盅两件','¥70'],['烧鹅','皮脆肉嫩配酸梅酱','¥68'],['潮汕牛肉火锅','现切八秒即熟','¥110'],['肠粉','早餐之王','¥12']],
 '陕西':[['肉夹馍','腊汁肉+白吉馍','¥12'],['羊肉泡馍','自己掰馍才正宗','¥38'],['biangbiang面','宽面泼油','¥20'],['甑糕','糯米红枣，甜糯','¥8']],
 '甘肃':[['兰州牛肉面','一清二白三红四绿','¥12'],['灰豆子','甜口小吃','¥8'],['驴肉黄面','敦煌特色','¥28'],['杏皮水','解腻冰饮','¥6']],
 '青海':[['手抓羊肉','清水煮，蘸蒜泥','¥78'],['酿皮','厚切配辣油','¥10'],['尕面片','汤面片，暖胃','¥15'],['酸奶','老酸奶撒白糖','¥8']],
 '湖南':[['臭豆腐','黑色外皮，外脆内嫩','¥10'],['口味虾','夜宵顶流','¥98'],['剁椒鱼头','蒸出来的鲜辣','¥88'],['米粉','码子随你加','¥15']],
 '湖北':[['热干面','芝麻酱拌碱面','¥8'],['豆皮','糯米+蛋皮','¥10'],['排骨藕汤','湖北人的家常','¥38'],['小龙虾','油焖大虾','¥98']],
 '福建':[['沙茶面','沙茶酱汤头','¥18'],['海蛎煎','蚵仔煎配甜辣酱','¥20'],['土笋冻','敢吃才是真吃货','¥15'],['佛跳墙','宴席硬菜','¥198']],
 '浙江':[['片儿川','雪菜笋片肉片面','¥18'],['小笼包','皮薄汁多','¥20'],['西湖醋鱼','杭帮经典','¥78'],['葱包桧','街头小吃','¥8']],
 '江苏':[['鸭血粉丝汤','南京人的深夜食堂','¥15'],['盐水鸭','咸鲜紧实','¥45'],['蟹粉小笼','秋季限定','¥48'],['大煮干丝','扬州早茶名品','¥28']],
 '山东':[['煎饼卷大葱','山东人的浪漫','¥10'],['把子肉','济南快餐灵魂','¥18'],['海鲜大咖','青岛排档','¥128'],['甜沫','咸口早餐粥','¥6']],
 '北京':[['烤鸭','片皮蘸糖，卷饼','¥168'],['炸酱面','手擀面配面码','¥25'],['卤煮','重口味爱好者的朝圣','¥30'],['豆汁焦圈','勇者挑战','¥12']],
 '上海':[['生煎','底部焦脆，先咬一口','¥12'],['小笼包','南翔流派','¥25'],['葱油拌面','极简但上头','¥15'],['蟹壳黄','酥皮小点心','¥8']],
 '东北':[['锅包肉','酸甜挂汁','¥45'],['杀猪菜','酸菜白肉血肠','¥58'],['烤冷面','街头顶流','¥10'],['铁锅炖','贴饼子炖大鹅','¥128']],
 '海南':[['清补凉','椰奶+芋圆+西瓜','¥15'],['文昌鸡','白切蘸桔子汁','¥68'],['海鲜市场加工','买完找店做','¥120'],['椰子饭','椰香糯米','¥20']],
 '国外':[['当地市场美食','先去本地市场逛一圈','¥60'],['招牌本地菜','认准门口排队的店','¥120'],['街边小吃','看人多的地方买','¥30'],['便利店限定','便宜又好吃','¥25']]
};
function foodRegion(plan){
  const p=plan.prov||'',d=plan.dest||'';
  const keys=Object.keys(FOOD_BY_REG);
  if(keys.includes(p))return p;
  for(const k of keys){if(k!=='国外'&&d.includes(k))return k}
  if(p.includes('黑龙江')||p.includes('吉林')||p.includes('辽宁'))return '东北';
  const map={'河北':'北京','天津':'北京','山西':'陕西','河南':'陕西','安徽':'江苏','江西':'湖南','台湾':'福建','香港':'广东','澳门':'广东','宁夏':'甘肃','上海':'上海','北京':'北京','重庆':'重庆'};
  if(map[p])return map[p];
  if(plan.__ab||/东京|京都|巴黎|伦敦|纽约|瑞士|土耳其|冰岛|埃及|摩洛哥|首尔|曼谷|新加坡|巴厘|马尔代夫/.test(d))return '国外';
  return '四川';
}
function foodModHtml(plan){
  const reg=foodRegion(plan),arr=FOOD_BY_REG[reg]||FOOD_BY_REG['四川'];
  const dest=plan.dest;
  const dp='https://www.dianping.com/search/keyword/0/0_'+encodeURIComponent(dest+'美食');
  const mt='https://i.meituan.com/s/'+encodeURIComponent(dest+'美食');
  return `<div class="mod col-12" style="animation-delay:.5s">
    <h4><span class="mi">🍜</span>${dest} 必吃美食推荐 · ${reg}风味<span class="go">看评价 / 点外卖 →</span></h4>
    <div class="food-grid">${arr.map(f=>`<div class="food-card"><div class="fh"><b>${f[0]}</b><span>${f[2]}</span></div><p>${f[1]}</p></div>`).join('')}</div>
    <div class="food-links">
      <a href="${dp}" target="_blank" rel="noopener">🏮 大众点评 · 看真实评分</a>
      <a href="${mt}" target="_blank" rel="noopener">🛵 美团 · 到店 / 外卖</a>
      <a href="https://www.ele.me" target="_blank" rel="noopener">🥡 饿了么 · 酒店点餐</a>
      <a href="https://www.taobao.com" target="_blank" rel="noopener">🛒 淘宝闪购 · 零食补给</a>
    </div>
    <p class="mod-note">菜名与价位为当地代表性推荐，评分请点上方平台看实时数据；社区里搜「${dest} 美食」还能看到真实打卡。</p>
  </div>`;
}
let __crowdPlan=null;
/* 时段划分：与时刻表区间对齐 */
const CROWD_SEGS=[
  {name:'08:00-11:00 上午',s:8*60,e:11*60,c:'--dc1'},
  {name:'11:00-14:00 午间',s:11*60,e:14*60,c:'--dc2'},
  {name:'14:00-17:00 下午',s:14*60,e:17*60,c:'--dc3'},
  {name:'17:00-20:00 傍晚',s:17*60,e:20*60,c:'--dc4'}
];
/* 拥挤度权重：早去人少、傍晚夜景点位更挤 —— 用来修正「停留时长」占比 */
function crowdWeight(s,seg){
  const bt=s.bestTime||'day';
  if(seg.s===8*60)return bt==='morning'?0.6:1.0;
  if(seg.s===11*60)return 1.15;
  if(seg.s===14*60)return bt==='sunset'?1.1:1.0;
  return (bt==='night'||bt==='sunset')?1.3:0.85;
}
/* 按真实时刻表统计每个时段的拥挤占比（不再用随机数） */
function crowdSegments(){
  const plan=__crowdPlan;
  const acc=CROWD_SEGS.map(()=>0);
  let total=0;
  if(plan&&plan.timelines&&plan.timelines.length){
    const perDay=1/plan.timelines.length;
    plan.timelines.forEach(tl=>{
      tl.filter(it=>it.type==='spot').forEach(it=>{
        const s=spotById(it.id);if(!s)return;
        CROWD_SEGS.forEach((seg,i)=>{
          const ov=Math.max(0,Math.min(it.end,seg.e)-Math.max(it.start,seg.s));
          if(ov>0){const w=ov*crowdWeight(s,seg)*perDay;acc[i]+=w;total+=w}
        });
      });
    });
  }
  if(total<=0)return CROWD_SEGS.map(sg=>({name:sg.name,value:25,c:sg.c}));
  return CROWD_SEGS.map((sg,i)=>({name:sg.name,value:Math.round(acc[i]/total*1000)/10,c:sg.c}));
}
/* 每个景点的最佳到访时段建议 */
function crowdSpotRows(){
  const plan=__crowdPlan;if(!plan||!plan.timelines)return '';
  const seen=new Set(),rows=[];
  plan.timelines.forEach((tl,di)=>tl.filter(it=>it.type==='spot').forEach(it=>{
    if(seen.has(it.id))return;seen.add(it.id);
    const s=spotById(it.id);if(!s||s.__virtual)return;
    const bt=s.bestTime||'day';
    const hint=bt==='morning'?'开门后 2 小时内人最少，光线也最柔'
      :bt==='sunset'?'日落前 1 小时到位，占好机位'
      :bt==='night'?'入夜后灯光最好，20:00 前收尾'
      :'上午与傍晚各一段高峰，避开 11:00-14:00';
    rows.push(`<div class="crowd-spot"><b>${escHtml(s.n)}</b><span>${minToHHMM(it.start)}-${minToHHMM(it.end)}</span><em>Day ${di+1} · ${escHtml(hint)}</em></div>`);
  }));
  return rows.length?`<div class="crowd-legend">${rows.join('')}</div>`:'';
}
function crowdModHtml(plan){
  return `<div class="mod col-6" style="animation-delay:.6s">
    <h4><span class="mi">👥</span>景点人流量分析 · 分时段饼图<span class="go" onclick="refreshCrowd()">🔄 刷新</span></h4>
    <div id="crowdPie" class="pie-box"></div>
    <div id="crowdLegend">${crowdSpotRows()}</div>
    <div class="crowd-foot"><span id="crowdTip">按本次行程时刻表估算</span><i class="pulse"></i></div>
  </div>`;
}
function hotelModHtml(plan){
  const d=plan.dest;
  const types=[
    {k:'🏨 酒店',p:'¥380 / 晚',pros:['前台 24h，安全感高','隔音与床品稳定，睡得好','可寄存行李、叫车方便'],cons:['价格偏高，旺季翻倍','风格同质化，出片一般'],sc:[88,92,62,86,55]},
    {k:'🛏 青旅',p:'¥95 / 床',pros:['便宜，适合背包独行','能拼车拼饭，认识同伴','位置多在老城核心'],cons:['多人间私密性差','隔音一般，作息互相影响'],sc:[93,70,96,48,60]},
    {k:'🏡 民宿',p:'¥520 / 晚',pros:['设计感强，随手出片','有厨房 / 露台，适合长住','老板常给本地私藏线路'],cons:['服务不稳定，看房东','位置可能偏远，需自驾'],sc:[74,80,66,72,95]}
  ];
  const dims=['位置','卫生','性价比','安静度','出片'];
  return `<div class="mod col-12" style="animation-delay:.65s">
    <h4><span class="mi">🏨</span>${d} 住宿推荐分析 · 酒店 / 青旅 / 民宿<span class="go">优缺点一眼看清 →</span></h4>
    <div class="hotel-grid">${types.map(t=>`
      <div class="hotel-card">
        <div class="hh"><b>${t.k}</b><span>${t.p}</span></div>
        <div class="hbars">${dims.map((dm,i)=>`<div class="hb"><span>${dm}</span><i><b style="width:${t.sc[i]}%"></b></i><em>${t.sc[i]}</em></div>`).join('')}</div>
        <div class="hpros">${t.pros.map(x=>`<div>✔ ${x}</div>`).join('')}</div>
        <div class="hcons">${t.cons.map(x=>`<div>✘ ${x}</div>`).join('')}</div>
        <a class="hlink" href="https://hotels.ctrip.com/hotels/list?city=0&keyword=${encodeURIComponent(d)}" target="_blank" rel="noopener">去携程比价 →</a>
      </div>`).join('')}</div>
    <p class="mod-note">评分维度为同类住宿的普遍画像（非单一商家），下单前请到平台上核对真实评论与近期差评。</p>
  </div>`;
}
/* ================= 侧边模块导航 ================= */
/* ---- 模块导航：Vue 3 岛屿（列表与高亮状态数据驱动） ---- */
let railStore=null,railApp=null;
function mountRailVue(items){
  const el=document.getElementById('railList');
  if(!el||!window.Vue)return null;
  /* 先写入数据再挂载，避免挂载时读到空数组导致列表不渲染 */
  if(railStore)railStore.items=items;
  if(railApp)return railApp;
  railStore=Vue.reactive({items});
  railApp=Vue.createApp({
    setup(){return{store:railStore}},
    methods:{jump(i){const m=document.querySelectorAll('#modGrid .mod')[i];if(!m)return;
      m.scrollIntoView({behavior:'smooth',block:'center'});
      m.classList.add('flash');setTimeout(()=>m.classList.remove('flash'),900)}},
    template:`
      <button class="rail-item" v-for="(x,i) in store.items" :key="i" @click="jump(i)">
        <span>{{x.icon}}</span>{{x.name}}
      </button>`
  }).mount(el);
  railStore.items=items;
  Vue.nextTick(()=>{railStore.items=items});
  return railApp;
}
function buildRail(plan){
  const rail=document.getElementById('modRail'),list=document.getElementById('railList');
  const grid=document.getElementById('modGrid');
  if(!rail||!list||!grid)return;
  const mods=[...grid.querySelectorAll('.mod')];
  const vm=mods.map((m,i)=>{
    const t=m.querySelector('h4');
    const icon=t&&t.querySelector('.mi')?t.querySelector('.mi').textContent:'🧩';
    let name=t?t.textContent.replace(icon,'').replace(/查看详情.*|看评价.*|🔄 刷新/,'').trim():('模块 '+(i+1));
    return {icon,name:name.slice(0,9)};
  });
  if(mountRailVue(vm)){rail.classList.add('show');return}
  /* Vue 未加载时的兜底渲染 */
  list.innerHTML=vm.map((x,i)=>`<button class="rail-item" data-i="${i}"><span>${x.icon}</span>${x.name}</button>`).join('');
  list.querySelectorAll('.rail-item').forEach(b=>b.onclick=()=>{
    const m=mods[+b.dataset.i];if(!m)return;
    m.scrollIntoView({behavior:'smooth',block:'center'});
    m.classList.add('flash');setTimeout(()=>m.classList.remove('flash'),900);
  });
  rail.classList.add('show');
}
document.addEventListener('DOMContentLoaded',()=>{
  const tg=document.getElementById('railToggle');
  if(tg)tg.onclick=()=>{
    const rail=document.getElementById('modRail');
    rail.classList.toggle('collapsed');
    const saved=rail.classList.contains('collapsed')?'1':'0';
    localStorage.setItem('fmw_rail_collapsed',saved);
  };
  if(localStorage.getItem('fmw_rail_collapsed')==='1')document.getElementById('modRail')?.classList.add('collapsed');
});

let __crowdInst=null;
/* 读取当前主题的 CSS 变量真实色值（ECharts 不认 var()） */
function cssVar(name,fallback){
  const v=getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v||fallback;
}
function refreshCrowd(){
  const el=document.getElementById('crowdPie');if(!el)return;
  const segs=crowdSegments();
  const tip=document.getElementById('crowdTip');
  if(tip)tip.textContent='按本次行程时刻表估算 · '+new Date().toLocaleTimeString('zh-CN');
  const ink2=cssVar('--ink-2','#c3cede'),panel=cssVar('--panel','#121d36'),line=cssVar('--line','rgba(255,255,255,.09)');
  const dc=[cssVar('--dc1','#e7c76d'),cssVar('--dc2','#7ea6d9'),cssVar('--dc3','#6cc47a'),cssVar('--dc4','#e58fb1')];
  const fallback=()=>{el.innerHTML=segs.map((s,i)=>`<div class="pie-fb"><span>${s.name}</span><i><b style="width:${s.value*2}%;background:${dc[i]}"></b></i><em>${s.value}%</em></div>`).join('')};
  ensureECharts(ok=>{
    if(!ok){fallback();return}
    if(!__crowdInst||__crowdInst.getDom()!==el){__crowdInst=echarts.init(el)}
    __crowdInst.setOption({backgroundColor:'transparent',
      tooltip:{trigger:'item',backgroundColor:panel,borderColor:line,textStyle:{color:ink2,fontSize:12},formatter:'{b}<br/>占比 {d}%'},
      color:dc,
      series:[{type:'pie',radius:['46%','74%'],center:['50%','52%'],avoidLabelOverlap:true,
        itemStyle:{borderColor:panel,borderWidth:2,borderRadius:6},
        label:{color:ink2,fontSize:11,formatter:'{b}\n{d}%'},
        labelLine:{lineStyle:{color:line}},
        data:segs.map(s=>({name:s.name,value:s.value}))}]},true);
    __crowdInst.resize();
  });
}
function initPlanExtras(plan){
  /* 人流饼图：绑定本次行程，按时刻表一次性计算（不再定时抽样刷新） */
  __crowdPlan=plan||null;
  refreshCrowd();
}
/* 主题切换后重算配色 */
document.addEventListener('themechange',()=>{if(document.getElementById('crowdPie'))refreshCrowd()});
