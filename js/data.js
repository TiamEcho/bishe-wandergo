/* =========================================================
 * WANDERGO · Fly Me to the World —— 数据模块 data.js
 * 图片 AI 生成参数 / 景点图标与清单（含坐标） / 社区动态 / AI 方案
 * ========================================================= */

/* ================= 图片助手 ================= */
const IMGAPI='https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=';
const IMG=(p,s)=>IMGAPI+encodeURIComponent(p)+'&image_size='+(s||'landscape_4_3');
const P={
 hero:'starry night sky over sea of clouds with glowing golden flight routes and aurora, crescent moon, dreamy fairy tale travel illustration, deep navy and gold',
 gugong:'Forbidden City Beijing red walls and golden roofs under clear blue sky, imperial palace travel photography',
 bund:'Shanghai Bund skyline at dusk with Oriental Pearl tower and Huangpu river reflections, travel photography',
 bmy:'Terracotta army warriors in Xian China ancient pit, warm museum lighting, travel photography',
 erhai:'Erhai lake in Dali Yunnan China at golden sunrise, sailboats on calm water, distant green mountains, soft mist, travel photography',
 jzg:'Jiuzhaigou valley China turquoise multicolored lakes with autumn forest and waterfalls, travel photography',
 xihu:'West Lake Hangzhou China pagoda and arched bridge with willow trees in misty morning, travel photography',
 ys:'Yangshuo Guilin karst mountains and Li river with bamboo raft at golden sunset, travel photography',
 ylw:'Yalong Bay Sanya China white sand beach with palm trees and turquoise sea, sunny travel photography',
 qhh:'Qinghai lake China vast blue lake with yellow rapeseed flowers and distant snow mountains, travel photography',
 pala:'Potala palace Lhasa Tibet China on red hill under deep blue sky, white and red palace, travel photography',
 senso:'Senso-ji temple Tokyo Japan with red pagoda and giant lantern under blue sky, travel photography',
 inari:'Fushimi Inari shrine Kyoto Japan thousands of vermillion torii gates tunnel, travel photography',
 paris:'Eiffel tower Paris at warm golden dusk, Seine river reflections and glowing street lamps, travel photography',
 oia:'Santorini Greece white houses and blue domes overlooking the Aegean sea at sunset, travel photography',
 ubud:'Ubud Bali Indonesia emerald rice terraces with palm trees and morning mist, travel photography',
 gp:'Grand Palace Bangkok Thailand golden spires and temple under sunny sky, travel photography',
 mbs:'Marina Bay Sands Singapore skyline with Gardens by the Bay supertrees at night, travel photography',
 ice:'Iceland golden circle landscape, Gullfoss waterfall with rainbow and aurora sky, dramatic travel photography',
 cp:'Central Park New York autumn colors with Manhattan skyline, travel photography',
 opera:'Sydney opera house and harbour bridge at golden sunset Australia, travel photography',
 panda:'Giant panda eating bamboo in Chengdu China with red hotpot element on table, cute travel photography',
 shibuya:'Shibuya crossing Tokyo at night with neon lights and crowds, travel photography',
 qroad:'Road trip van driving on highway near Qinghai lake with snow mountains, travel photography',
 pool:'Santorini infinity pool overlooking caldera at sunset, travel photography',
 wall:'Xian ancient city wall at night with red lanterns glowing, travel photography',
 greatwall:'Mutianyu Great Wall China winding over autumn mountains with red and golden foliage, travel photography',
 zjj:'Zhangjiajie national forest park China towering sandstone pillars in mist, Avatar mountains, travel photography',
 huangshan:'Huangshan Yellow Mountain China granite peaks with pine trees above sea of clouds at sunrise, travel photography',
 gulangyu:'Gulangyu island Xiamen China colonial architecture with flowers and sea view, sunny day, travel photography',
 luguhu:'Lugu lake China Yunnan crystal blue water with wooden boats and green hills, morning mist, travel photography',
 cbs:'Changbai mountain Tianchi crater lake China with snow mountain reflection, clear day, travel photography',
 chiangmai:'Chiang Mai old city Thailand golden temple with monks and lanterns, warm afternoon light, travel photography',
 maldives:'Maldives overwater villas with turquoise lagoon aerial view, white sand, travel photography',
 sagrada:'Sagrada Familia Barcelona Spain colorful stained glass interior light, Gaudi architecture, travel photography',
 dubai:'Burj Khalifa Dubai skyline at dusk with fountain show lights below, travel photography',
 queenstown:'Queenstown New Zealand lake Wakatipu with Remarkables mountains and autumn trees, travel photography',
 rovaniemi:'Santa Claus village Rovaniemi Finland snow cabins reindeer and northern lights sky, travel photography'
};

const ICO={gugong:'🏯',bund:'🌃',bmy:'⚔️',erhai:'🚲',jzg:'🏞️',xihu:'🛶',ys:'🎋',ylw:'🏖️',qhh:'🌼',pala:'🙏',greatwall:'🧱',zjj:'⛰️',huangshan:'🌄',gulangyu:'🎹',luguhu:'🛶',cbs:'🏔️',senso:'🏮',inari:'⛩️',paris:'🗼',oia:'🌅',ubud:'🌾',gp:'👑',mbs:'🌳',ice:'❄️',cp:'🍂',opera:'🎭',chiangmai:'🛕',maldives:'🏝️',sagrada:'⛪',dubai:'🏙️',queenstown:'🪂',rovaniemi:'🎅'};
const iconURL=ch=>'image://data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><text x="32" y="46" font-size="38" text-anchor="middle">'+ch+'</text></svg>');

const SPOTS=[
 {id:'gugong',n:'故宫博物院',city:'北京',rg:'cn',addr:'北京市东城区景山前街4号',lng:116.397,lat:39.918,hrs:'3-4 小时',traf:'地铁1号线天安门东站',price:'¥60',rating:4.9,tag:'历史 · 宫廷',desc:'六百年紫禁城，红墙黄瓦间收藏着明清两代的天气与心事。'},
 {id:'bund',n:'外滩',city:'上海',rg:'cn',addr:'上海市黄浦区中山东一路',lng:121.490,lat:31.240,hrs:'2-3 小时',traf:'地铁2/10号线南京东路站',price:'免费',rating:4.8,tag:'夜景 · 都市',desc:'万国建筑博览群对望陆家嘴天际线，夜色中最像电影的一公里。'},
 {id:'bmy',n:'秦始皇兵马俑',city:'西安',rg:'cn',addr:'西安市临潼区秦陵镇',lng:109.278,lat:34.384,hrs:'半天',traf:'地铁9号线+游5路公交',price:'¥120',rating:4.9,tag:'历史 · 世界遗产',desc:'地下军阵沉默两千年，站在一号坑前仍会起鸡皮疙瘩。'},
 {id:'erhai',n:'洱海生态廊道',city:'大理',rg:'cn',addr:'大理市环海西路·才村码头段',lng:100.164,lat:25.790,hrs:'半天-1天',traf:'环海骑行 / 包车',price:'免费',rating:4.8,tag:'湖景 · 慢生活',desc:'风花雪月之城，骑行环海看日出，才村码头的清晨值得早起。'},
 {id:'jzg',n:'九寨沟',city:'阿坝州',rg:'cn',addr:'阿坝州九寨沟县漳扎镇',lng:103.918,lat:33.262,hrs:'1 天',traf:'景区观光车（沟内换乘）',price:'¥169+',rating:4.9,tag:'彩林 · 海子',desc:'九寨归来不看水，五彩池和诺日朗瀑布是自然的调色盘。'},
 {id:'xihu',n:'西湖',city:'杭州',rg:'cn',addr:'杭州市西湖区龙井路1号',lng:120.142,lat:30.243,hrs:'3-4 小时',traf:'地铁1号线龙翔桥站',price:'免费',rating:4.8,tag:'园林 · 江南',desc:'苏堤春晓、雷峰夕照，一步一景的江南秘境。'},
 {id:'ys',n:'阳朔遇龙河',city:'桂林',rg:'cn',addr:'桂林市阳朔县遇龙河景区',lng:110.420,lat:24.760,hrs:'1 天',traf:'高铁阳朔站+景区接驳',price:'竹筏 ¥240',rating:4.7,tag:'山水 · 竹筏',desc:'竹筏漂过喀斯特峰林，人在画中游的教科书样本。'},
 {id:'ylw',n:'亚龙湾',city:'三亚',rg:'cn',addr:'三亚市吉阳区亚龙湾国家旅游度假区',lng:109.646,lat:18.208,hrs:'半天',traf:'机场巴士 / 打车约 40 分钟',price:'免费',rating:4.7,tag:'海滩 · 度假',desc:'天下第一湾，细白沙和椰林足够发呆一整个下午。'},
 {id:'qhh',n:'青海湖·二郎剑',city:'海北州',rg:'cn',addr:'海南州共和县环湖东路',lng:100.460,lat:36.640,hrs:'半天',traf:'西宁包车 / 环湖班线',price:'¥90',rating:4.7,tag:'湖泊 · 花海',desc:'七月的油菜花海接天连着湖蓝，公路旅行的天堂。'},
 {id:'pala',n:'布达拉宫',city:'拉萨',rg:'cn',addr:'拉萨市城关区北京中路宫前巷35号',lng:91.117,lat:29.658,hrs:'3-4 小时',traf:'公交24路 / 老城区步行',price:'¥200',rating:4.9,tag:'圣殿 · 高原',desc:'红山之巅的圣殿，转经筒的声音里全是虔诚。'},
 {id:'greatwall',n:'慕田峪长城',city:'北京',rg:'cn',addr:'北京市怀柔区渤海镇慕田峪村',lng:116.568,lat:40.432,hrs:'半天',traf:'东直门 916 路+专线 / 景区班车',price:'¥40（缆车另计）',rating:4.9,tag:'长城 · 秋色',desc:'比八达岭人少景美，缆车上山俯瞰红叶里的长城最出片。'},
 {id:'zjj',n:'张家界国家森林公园',city:'张家界',rg:'cn',addr:'张家界市武陵源区军地坪',lng:110.540,lat:29.315,hrs:'1-2 天',traf:'张家界西站+景区巴士',price:'¥224（四日票）',rating:4.8,tag:'奇峰 · 阿凡达',desc:'三千奇峰拔地而起，袁家界就是《阿凡达》哈利路亚山的原型。'},
 {id:'huangshan',n:'黄山',city:'黄山市',rg:'cn',addr:'黄山市黄山区汤口镇',lng:118.166,lat:30.130,hrs:'1-2 天',traf:'高铁黄山北站+景区换乘',price:'¥190（缆车另计）',rating:4.8,tag:'云海 · 奇松',desc:'五岳归来不看山，黄山归来不看岳，日出云海一生必看一次。'},
 {id:'gulangyu',n:'鼓浪屿',city:'厦门',rg:'cn',addr:'厦门市思明区鼓浪屿',lng:118.067,lat:24.444,hrs:'1 天',traf:'轮渡码头上岛（提前购票）',price:'船票 ¥35 起',rating:4.6,tag:'海岛 · 文艺',desc:'万国建筑与钢琴声，文艺小店之间随手一拍都是明信片。'},
 {id:'luguhu',n:'泸沽湖',city:'丽江 · 盐源',rg:'cn',addr:'云南宁蒗县与四川盐源县交界',lng:100.788,lat:27.710,hrs:'1-2 天',traf:'丽江包车约 4h / 班线车',price:'¥70',rating:4.8,tag:'高原湖泊 · 摩梭',desc:'水性杨花开满湖面时最美，猪槽船划进晨雾里像画。'},
 {id:'cbs',n:'长白山天池',city:'延边',rg:'cn',addr:'吉林省延边州安图县长白山景区',lng:128.055,lat:42.004,hrs:'1 天',traf:'高铁白河站+景区巴士',price:'¥105（倒站车另计）',rating:4.7,tag:'火山天池 · 温泉',desc:'十六峰环抱的天池，运气好能遇到无风的镜面时刻。'},
 {id:'senso',n:'浅草寺',city:'东京',rg:'ab',addr:'日本东京都台东区浅草2-3-1',lng:139.797,lat:35.712,hrs:'2 小时',traf:'地铁银座线浅草站',price:'免费',rating:4.7,tag:'古寺 · 和风',desc:'雷门大灯笼下抽一支签，仲见世的烟火气一路铺到本堂。'},
 {id:'inari',n:'伏见稻荷大社',city:'京都',rg:'ab',addr:'日本京都市伏见区深草薮之内町68',lng:135.773,lat:34.967,hrs:'3 小时',traf:'JR奈良线稻荷站',price:'免费',rating:4.8,tag:'千本鸟居',desc:'万座朱红鸟居连成隧道，走到半山已值回整趟机票。'},
 {id:'paris',n:'埃菲尔铁塔',city:'巴黎',rg:'ab',addr:'法国巴黎战神广场',lng:2.294,lat:48.858,hrs:'3 小时',traf:'地铁6号线 Bir-Hakeim 站',price:'€29',rating:4.8,tag:'地标 · 夜景',desc:'整点闪灯五分钟，塞纳河畔的浪漫会准时营业。'},
 {id:'oia',n:'伊亚小镇',city:'圣托里尼',rg:'ab',addr:'希腊圣托里尼岛北端伊亚镇',lng:25.376,lat:36.462,hrs:'半天',traf:'费拉镇巴士中转约 25 分钟',price:'免费',rating:4.8,tag:'爱琴海 · 落日',desc:'蓝顶白墙与全世界最著名的落日，观众席请提前一小时占位。'},
 {id:'ubud',n:'乌布梯田',city:'巴厘岛',rg:'ab',addr:'印尼巴厘岛乌布德格拉朗',lng:115.262,lat:-8.507,hrs:'半天',traf:'包车 / 摩托车',price:'约 ¥20',rating:4.6,tag:'梯田 · 丛林',desc:'德格拉朗的绿色指纹，秋千荡出去就是整个丛林。'},
 {id:'gp',n:'大皇宫·玉佛寺',city:'曼谷',rg:'ab',addr:'泰国曼谷 Phra Nakhon 区',lng:100.485,lat:13.750,hrs:'3 小时',traf:'MRT Sanam Chai 站步行',price:'500฿',rating:4.6,tag:'金顶 · 王室',desc:'曼谷最闪的地方，金色尖顶在正午的阳光里会发光。'},
 {id:'mbs',n:'滨海湾花园',city:'新加坡',rg:'ab',addr:'新加坡滨海湾花园 18 Marina Gardens Dr',lng:103.864,lat:1.282,hrs:'半天',traf:'地铁 Bayfront 站',price:'室外免费',rating:4.8,tag:'未来感 · 夜景',desc:'擎天大树的灯光秀每晚两场，金沙酒店是天幕的背景板。'},
 {id:'ice',n:'黄金圈·蓝湖',city:'雷克雅未克',rg:'ab',addr:'冰岛首都区·黄金圈环线',lng:-21.940,lat:64.150,hrs:'1 天',traf:'租车自驾 / 一日游巴士',price:'¥600+',rating:4.9,tag:'极光 · 地热',desc:'瀑布彩虹、间歇泉和蓝湖温泉，运气好整晚都是极光。'},
 {id:'cp',n:'中央公园',city:'纽约',rg:'ab',addr:'美国纽约曼哈顿中区',lng:-73.966,lat:40.782,hrs:'3 小时',traf:'地铁 B/C 线 72 街站',price:'免费',rating:4.7,tag:'都市绿洲',desc:'钢铁森林中央的四季，秋天的红叶配天际线最出片。'},
 {id:'opera',n:'歌剧院·海港大桥',city:'悉尼',rg:'ab',addr:'澳大利亚悉尼便利朗角',lng:151.215,lat:-33.857,hrs:'2-3 小时',traf:'火车 Circular Quay 站',price:'外观免费',rating:4.8,tag:'海岸 · 地标',desc:'白帆歌剧院与钢架大桥同框，环形码头的黄昏金黄透亮。'},
 {id:'chiangmai',n:'契迪龙寺·古城',city:'清迈',rg:'ab',addr:'泰国清迈老城区 Phra Sing 路',lng:98.985,lat:18.788,hrs:'1-2 天',traf:'机场 15 分钟车程 / 古城内双条车',price:'约 ¥10/寺',rating:4.7,tag:'古城 · 夜市',desc:'兰纳古城的慢节奏，周日夜市从城门一直摆到肌理深处。'},
 {id:'maldives',n:'马累环礁·水上屋',city:'马尔代夫',rg:'ab',addr:'马尔代夫马累北环礁',lng:73.510,lat:4.200,hrs:'4-5 天',traf:'马累机场快艇/水上飞机',price:'度假村套餐 ¥8,000+',rating:4.9,tag:'海岛 · 蜜月',desc:'一岛一酒店的终极海岛，出门就是果冻色泻湖。'},
 {id:'sagrada',n:'圣家堂',city:'巴塞罗那',rg:'ab',addr:'西班牙巴塞罗那 Mallorca 街 401 号',lng:2.174,lat:41.404,hrs:'2-3 小时',traf:'地铁 L2/L5 Sagrada Família 站',price:'€26 起',rating:4.9,tag:'高迪 · 教堂',desc:'建了140年还没建完，下午的光透过彩窗把大厅染成森林。'},
 {id:'dubai',n:'哈利法塔·喷泉',city:'迪拜',rg:'ab',addr:'阿联酋迪拜 Downtown',lng:55.274,lat:25.197,hrs:'半天',traf:'地铁红线 Burj Khalifa/Dubai Mall 站',price:'观景台 ¥400 起',rating:4.7,tag:'摩天 · 购物',desc:'828 米的世界第一高，塔下音乐喷泉每半小时一场。'},
 {id:'queenstown',n:'瓦卡蒂普湖·皇后镇',city:'皇后镇',rg:'ab',addr:'新西兰南岛皇后镇湖区',lng:168.660,lat:-45.031,hrs:'2 天',traf:'皇后镇机场即达 / 镇内步行',price:'免费（项目另计）',rating:4.8,tag:'湖景 · 极限',desc:'世界冒险之都，白天跳伞蹦极，傍晚湖边啃一块 Fergburger。'},
 {id:'rovaniemi',n:'圣诞老人村',city:'罗瓦涅米',rg:'ab',addr:'芬兰罗瓦涅米北极圈 66°32′',lng:25.840,lat:66.543,hrs:'1 天',traf:'罗瓦涅米机场巴士 20 分钟',price:'免费（项目另计）',rating:4.6,tag:'极圈 · 冰雪',desc:'一脚跨过北极圈线，哈士奇雪橇和驯鹿雪场就在旁边。'}
];
const spotById=id=>SPOTS.find(s=>s.id===id);

/* ================= 数据：同城补充景点（仅进入 SPOTS 池，不影响已有卡片/统计） ================= */
const SPOT_EXTRA=[
 {id:'cangshan',n:'苍山',city:'大理',rg:'cn',addr:'大理市苍山世界地质公园',lng:100.130,lat:25.680,hrs:'半天',traf:'感通索道/洗马潭索道',price:'¥120 起（含索道）',rating:4.7,tag:'雪山 · 云海',desc:'十九峰十八溪，索道上去看云海翻涌，玉带路徒步最出片。'},
 {id:'xizhou',n:'喜洲古镇',city:'大理',rg:'cn',addr:'大理市喜洲镇',lng:100.130,lat:25.860,hrs:'半天',traf:'古城打车约 30 分钟',price:'免费',rating:4.6,tag:'白族 · 古建',desc:'白族民居博物馆、转角楼和喜洲粑粑，麦田最绿是四月。'},
 {id:'shuanglang',n:'双廊古镇',city:'大理',rg:'cn',addr:'大理市双廊镇',lng:100.190,lat:25.900,hrs:'半天-1天',traf:'环海东路自驾 / 包车',price:'免费',rating:4.7,tag:'海景 · 日落',desc:'洱海东岸的海景小镇，日落时分整片湖面都是金色。'},
 /* ---- 九寨 / 成都 ---- */
 {id:'huanglong',n:'黄龙风景区',city:'阿坝州',rg:'cn',addr:'阿坝州松潘县黄龙乡',lng:103.824,lat:32.754,hrs:'1 天',traf:'九黄机场包车约 1.5h / 川主寺班车',price:'¥170（索道另计）',rating:4.8,tag:'钙化池 · 彩池',desc:'三千多个钙化彩池顺山而下，五彩池在阳光下像打翻的眼影盘。'},
 {id:'kuanzhai',n:'宽窄巷子',city:'成都',rg:'cn',addr:'成都市青羊区长顺上街',lng:104.055,lat:30.669,hrs:'半天',traf:'地铁4号线宽窄巷子站',price:'免费',rating:4.5,tag:'老街 · 市井',desc:'三条清代巷子拼成的成都样本，掏耳朵、盖碗茶、龙抄手一次体验完。'},
 {id:'wuhou',n:'武侯祠·锦里',city:'成都',rg:'cn',addr:'成都市武侯区武侯祠大街231号',lng:104.043,lat:30.646,hrs:'半天',traf:'地铁3号线高升桥站',price:'¥50（锦里免费）',rating:4.6,tag:'三国 · 夜游',desc:'红墙竹影配三国故事，出门锦里的灯笼一亮就是最成都的夜。'},
 {id:'panda',n:'成都大熊猫繁育基地',city:'成都',rg:'cn',addr:'成都市成华区熊猫大道1375号',lng:104.147,lat:30.733,hrs:'半天',traf:'地铁3号线熊猫大道站+接驳',price:'¥55',rating:4.8,tag:'萌宠 · 亲子',desc:'早上的熊猫最活跃，七点半进园能看到滚滚吃早饭的全部细节。'},
 /* ---- 张家界 ---- */
 {id:'tianmen',n:'天门山',city:'张家界',rg:'cn',addr:'张家界市永定区官黎坪',lng:110.476,lat:29.050,hrs:'1 天',traf:'市区索道站直达（A 线）',price:'¥278（含索道）',rating:4.8,tag:'玻璃栈道 · 天门洞',desc:'7.5 公里索道直接上天，玻璃栈道贴着崖壁，999 级天梯上面就是天门洞。'},
 {id:'baofeng',n:'宝峰湖',city:'张家界',rg:'cn',addr:'张家界市武陵源区宝峰路',lng:110.500,lat:29.330,hrs:'半天',traf:'武陵源城区打车 10 分钟',price:'¥96（含游船）',rating:4.5,tag:'高峡平湖 · 山歌',desc:'高峡出平湖，坐船听土家阿妹唱山歌，两岸峰林倒影是慢下来的张家界。'},
 {id:'fron',n:'芙蓉镇',city:'湘西',rg:'cn',addr:'湘西州永顺县王村镇',lng:109.810,lat:28.670,hrs:'半天',traf:'张吉怀高铁芙蓉镇站 / 张家界车程 1.5h',price:'¥100',rating:4.6,tag:'瀑布 · 古镇',desc:'挂在瀑布上的千年古镇，夜幕亮灯后整条街都浮在水汽里。'},
 /* ---- 清迈 ---- */
 {id:'doi',n:'素贴山双龙寺',city:'清迈',rg:'ab',addr:'泰国清迈素贴山 Suthep 路',lng:98.921,lat:18.805,hrs:'半天',traf:'红色双条车从清迈大学上山约 30 分钟',price:'30฿',rating:4.7,tag:'金塔 · 俯瞰',desc:'306 级台阶上去是金色佛塔，平台上能俯瞰整个清迈盆地的夜色。'},
 {id:'nimman',n:'宁曼路',city:'清迈',rg:'ab',addr:'泰国清迈 Nimmanhaemin 路',lng:98.967,lat:18.797,hrs:'半天',traf:'双条车 / Grab 约 10 分钟',price:'免费',rating:4.5,tag:'咖啡 · 文创',desc:'几十家精品咖啡馆与买手店挤在几条巷子里，清迈的审美都在这。'},
 {id:'elephant',n:'美旺大象营',city:'清迈',rg:'ab',addr:'泰国清迈湄旺县',lng:98.650,lat:18.930,hrs:'1 天',traf:'营地接送车约 1.5h',price:'¥400 起',rating:4.7,tag:'大象 · 公益',desc:'不骑乘的观察型营地，给大象做药球、河边洗澡，是更体面的相处方式。'},
 {id:'thapae',n:'塔佩门·周日夜市',city:'清迈',rg:'ab',addr:'泰国清迈 Tha Phae 门',lng:98.993,lat:18.787,hrs:'3 小时',traf:'古城步行可达 / 双条车',price:'免费',rating:4.6,tag:'古城 · 夜市',desc:'红砖城墙下喂鸽子，周日傍晚整条 Ratchadamnoen 路变成小吃长龙。'},
 /* ---- 马尔代夫 ---- */
 {id:'mushi',n:'马累鱼市·老星期五清真寺',city:'马累',rg:'ab',addr:'马尔代夫马累 Malé 岛',lng:73.509,lat:4.175,hrs:'半天',traf:'机场快艇 15 分钟 + 步行',price:'免费',rating:4.4,tag:'市井 · 人文',desc:'上岛前的半日空档：金枪鱼堆到脚踝的鱼市，和珊瑚石砌成的古清真寺。'},
 {id:'banana',n:'香蕉礁浮潜点',city:'马尔代夫',rg:'ab',addr:'北马累环礁 Banana Reef',lng:73.480,lat:4.280,hrs:'半天',traf:'度假村多尼船约 20 分钟',price:'含在出海项目',rating:4.8,tag:'浮潜 · 珊瑚',desc:'马尔代夫第一个海洋保护区，垂直的珊瑚墙下常驻海龟与成群玻璃鱼。'},
 {id:'sandbank',n:'无人沙洲野餐',city:'马尔代夫',rg:'ab',addr:'北马累环礁 私人沙洲',lng:73.450,lat:4.320,hrs:'半天',traf:'多尼船包船约 15 分钟',price:'¥800 起（含餐）',rating:4.9,tag:'私享 · 泻湖',desc:'退潮时露出的一圈白沙，四面全是渐变青蓝，桌上只摆你和海。'},
 /* ---- 日本：东京 / 京都 ---- */
 {id:'skytree',n:'东京晴空塔',city:'东京',rg:'ab',addr:'日本东京都墨田区押上1-1-2',lng:139.811,lat:35.710,hrs:'2-3 小时',traf:'地铁半藏门线押上站',price:'¥180 起',rating:4.7,tag:'俯瞰 · 夜景',desc:'350 米展望台看东京摊成一片灯海，天气好能望到富士山的剪影。'},
 {id:'shibuya',n:'涩谷十字路口',city:'东京',rg:'ab',addr:'日本东京都涩谷区道玄坂',lng:139.700,lat:35.659,hrs:'2 小时',traf:'JR 涩谷站八公口',price:'免费',rating:4.6,tag:'霓虹 · 都市',desc:'一次绿灯三千人同时过街，站在二楼窗边看比走进去更震撼。'},
 {id:'teamlab',n:'teamLab 无界美术馆',city:'东京',rg:'ab',addr:'日本东京都江东区青海1-3-8',lng:139.781,lat:35.620,hrs:'3 小时',traf:'临海线东京电讯站步行 5 分钟',price:'¥200 起',rating:4.8,tag:'沉浸 · 数字艺术',desc:'光、水与镜面组成的无边空间，雨天的最佳去处，走进去会迷路。'},
 {id:'kinkakuji',n:'金阁寺',city:'京都',rg:'ab',addr:'日本京都市北区金阁寺町1',lng:135.729,lat:35.039,hrs:'1.5 小时',traf:'市营巴士 12/59 路金阁寺前',price:'¥25',rating:4.7,tag:'名园 · 倒影',desc:'两层金箔贴在池边，风一停，水面上的另一座金阁也完整了。'},
 {id:'arashiyama',n:'岚山竹林·渡月桥',city:'京都',rg:'ab',addr:'日本京都市右京区嵯峨',lng:135.677,lat:35.009,hrs:'半天',traf:'JR 嵯峨岚山站 / 岚电岚山站',price:'免费',rating:4.8,tag:'竹林 · 山水',desc:'竹叶把光筛成细线，走到渡月桥正好是保津川最开阔的一段。'},
 /* ---- 巴黎 ---- */
 {id:'louvre',n:'卢浮宫',city:'巴黎',rg:'ab',addr:'法国巴黎里沃利街',lng:2.338,lat:48.861,hrs:'半天',traf:'地铁1/7号线 Palais Royal 站',price:'€22',rating:4.9,tag:'艺术 · 世界遗产',desc:'从《蒙娜丽莎》到胜利女神，真要全看完得三天，抓三件镇馆之宝就够。'},
 {id:'orsay',n:'奥赛博物馆',city:'巴黎',rg:'ab',addr:'法国巴黎荣誉军团街1号',lng:2.326,lat:48.860,hrs:'3 小时',traf:'地铁12号线 Solférino 站',price:'€16',rating:4.8,tag:'印象派 · 大钟',desc:'火车站改建的博物馆，透过巨型钟面看塞纳河，光比画还好看。'},
 {id:'montmartre',n:'蒙马特高地·圣心堂',city:'巴黎',rg:'ab',addr:'法国巴黎第十八区',lng:2.343,lat:48.887,hrs:'半天',traf:'地铁2号线 Anvers 站',price:'免费（登顶另计）',rating:4.7,tag:'山城 · 艺术家',desc:'台阶上的街头画家、小丘广场的画摊，日落时整座巴黎铺在脚下。'},
 /* ---- 冰岛 ---- */
 {id:'thingvellir',n:'辛格维利尔国家公园',city:'雷克雅未克',rg:'ab',addr:'冰岛黄金圈 Þingvellir',lng:-21.130,lat:64.256,hrs:'半天',traf:'租车自驾约 50 分钟',price:'免费（停车费）',rating:4.7,tag:'裂谷 · 世界遗产',desc:'欧亚与北美两大板块的裂缝里走路，脚下就是地球的接缝。'},
 {id:'gullfoss',n:'黄金瀑布',city:'雷克雅未克',rg:'ab',addr:'冰岛黄金圈 Gullfoss',lng:-20.120,lat:64.327,hrs:'1.5 小时',traf:'租车自驾约 1.5h',price:'免费',rating:4.9,tag:'瀑布 · 彩虹',desc:'两级跌水砸进峡谷，水雾里几乎天天挂着彩虹，站近点会被淋透。'},
 {id:'vik',n:'维克黑沙滩',city:'维克',rg:'ab',addr:'冰岛南岸 Reynisfjara',lng:-19.045,lat:63.404,hrs:'半天',traf:'1 号公路自驾约 2.5h',price:'免费',rating:4.9,tag:'黑沙滩 · 玄武岩',desc:'黑砂、玄武岩柱与海里冒出的雷尼斯岩，注意疯狗浪，别背对海。'},
 /* ---- 三亚 ---- */
 {id:'wuzhizhou',n:'蜈支洲岛',city:'三亚',rg:'cn',addr:'三亚市海棠湾镇蜈支洲岛',lng:109.766,lat:18.311,hrs:'1 天',traf:'后海码头乘船上岛',price:'¥136（含船票）',rating:4.8,tag:'海岛 · 浮潜',desc:'三亚最好的浮潜点，能见度十米起，环岛电瓶车一路都是观景台。'},
 {id:'yalong',n:'呀诺达雨林',city:'三亚',rg:'cn',addr:'三亚市保亭县三道镇',lng:109.640,lat:18.450,hrs:'1 天',traf:'景区直通车约 1h',price:'¥128',rating:4.6,tag:'雨林 · 溯溪',desc:'热带雨林里的空中栈道与踏瀑戏水，太阳再毒里面也是凉的。'},
 {id:'houhai',n:'后海村',city:'三亚',rg:'cn',addr:'三亚市海棠湾后海村',lng:109.760,lat:18.330,hrs:'半天',traf:'海棠湾打车 20 分钟',price:'免费（冲浪课 ¥300 起）',rating:4.6,tag:'冲浪 · 渔村',desc:'国内最容易入门的冲浪湾，浪温柔、教练多，傍晚的村口全是晒伤的人。'}
];
SPOT_EXTRA.forEach(s=>{if(!SPOTS.some(x=>x.id===s.id)){SPOTS.push(s);
  if(typeof P!=='undefined'&&!P[s.id])P[s.id]='travel photography of '+s.n+' '+s.city+', scenic landmark, natural light, high quality';
  if(typeof ICO!=='undefined'&&!ICO[s.id])ICO[s.id]=s.rg==='ab'?'🌍':'🏔️';}});
/* 全量补图：任何景点都要有配图，否则卡片会显示 src="undefined" */
SPOTS.forEach(s=>{if(typeof P!=='undefined'&&!P[s.id])
  P[s.id]='travel photography of '+(s.n||s.city)+', scenic landmark, natural light, high quality';});

/* ================= 可实施性字段：开放时间 / 最佳时段 / 是否预约 / 建议停留 =================
 * 只有「时段特征」是重活，按 id 精写；其余（开放时间、是否需预约、停留时长）按关键词规则推算，
 * 保证 70+ 景点全部有值，AI 侧可以直接拿来排时刻表。
 */
/* 精写：bestTime 取值 morning / day / sunset / night / all —— 决定它排在一天中的哪个位置 */
const SPOT_TIME={
 gugong:['08:30-17:00','morning',true,210,'每周一闭馆，需实名提前 7 天在官网/小程序预约'],
 bund:['全天','sunset',false,90,''],
 bmy:['08:30-17:00','morning',true,180,'需实名预约，建议 8:30 开馆即入'],
 erhai:['全天','sunset',false,240,''],
 jzg:['07:00-18:00','morning',true,420,'实名预约 + 观光车换乘，一次进沟'],
 xihu:['全天','morning',false,180,''],
 ys:['08:00-17:30','morning',false,300,''],
 ylw:['全天','sunset',false,240,''],
 qhh:['全天','day',false,240,''],
 pala:['09:00-16:00','morning',true,210,'需提前 1-7 天预约，旺季常约满，藏历节日闭宫'],
 greatwall:['07:30-17:30','morning',false,240,''],
 zjj:['07:00-18:00','morning',true,480,'四日票需实名，首次入园需安检预约'],
 huangshan:['06:30-16:30','morning',true,480,'需提前预约门票与索道，看日出需住山上'],
 gulangyu:['全天','morning',true,300,'轮渡需提前 1-3 天订票，旺季一票难求'],
 luguhu:['全天','sunset',false,300,''],
 cbs:['07:00-16:00','morning',true,420,'天池能见度看天气，建议上午上山'],
 senso:['06:00-17:00','morning',false,120,''],
 inari:['全天','morning',false,180,''],
 paris:['09:30-23:00','sunset',true,180,'登顶需官网预约时段，整点闪灯 5 分钟'],
 oia:['全天','sunset',false,240,''],
 ubud:['06:00-18:00','morning',false,240,''],
 gp:['08:30-15:30','morning',true,180,'需过膝长衣，门口租纱笼'],
 mbs:['05:00-02:00','night',false,240,'灯光秀 19:45 / 20:45 两场，室外区免费'],
 ice:['全天','day',true,480,'蓝湖温泉需提前订时段，租车自驾必备'],
 cp:['06:00-01:00','day',false,180,''],
 opera:['09:00-20:30','sunset',false,150,''],
 chiangmai:['06:00-20:00','morning',false,300,''],
 maldives:['全天','all',true,0,'一价全包套餐需提前订，含三餐与浮潜'],
 sagrada:['09:00-20:00','day',true,180,'必须官网预约时段，现场基本无票'],
 dubai:['08:30-23:00','night',true,240,'观景台需预约，喷泉 18:00 后每 30 分钟'],
 queenstown:['全天','day',false,480,''],
 rovaniemi:['09:00-19:00','night',false,300,'极光需夜间 KP 指数高，1 号公路夜间慎驾'],
 cangshan:['08:00-17:00','morning',true,240,'索道分感通/洗马潭两条，需看天气开放'],
 xizhou:['全天','morning',false,180,''],
 shuanglang:['全天','sunset',false,240,''],
 huanglong:['07:00-17:00','morning',true,300,'高海拔慢走，索道上行步行下'],
 kuanzhai:['全天','sunset',false,180,''],
 wuhou:['08:00-20:00','night',false,180,'锦里夜间灯笼最好看'],
 panda:['07:30-18:00','morning',true,240,'需提前 1-3 天预约，7:30 进园看熊猫吃早饭'],
 tianmen:['08:00-16:00','morning',true,300,'A/B/C 线需提前选线购票，恶劣天气停运'],
 baofeng:['08:00-17:30','day',false,180,''],
 fron:['全天','night',true,240,'19:00 亮灯后最美，需购古镇门票'],
 doi:['06:00-20:00','sunset',false,180,''],
 nimman:['10:00-22:00','day',false,180,''],
 elephant:['08:00-17:00','morning',true,420,'公益营地需提前订，含接送与午餐'],
 thapae:['16:00-24:00','night',false,150,'周日夜市 17:00 开市'],
 mushi:['07:00-17:00','morning',false,120,''],
 banana:['08:00-17:00','morning',false,180,''],
 sandbank:['09:00-16:00','day',true,180,'需提前 1 天预约并自带防晒'],
 skytree:['09:00-21:00','night',false,150,''],
 shibuya:['全天','night',false,120,''],
 teamlab:['10:00-21:00','day',true,180,'需提前线上购票选时段'],
 kinkakuji:['09:00-17:00','morning',false,90,''],
 arashiyama:['全天','morning',false,240,''],
 louvre:['09:00-18:00','morning',true,240,'周二闭馆，需官网预约时段票'],
 orsay:['09:30-18:00','day',true,180,'周一闭馆'],
 montmartre:['06:00-22:30','sunset',false,180,''],
 thingvellir:['全天','day',false,180,''],
 gullfoss:['全天','day',false,90,''],
 vik:['全天','day',false,150,'注意疯狗浪，勿背对海'],
 wuzhizhou:['08:00-17:30','morning',true,360,'需提前购船票，末班船 17:30 前返回'],
 yalong:['08:30-17:00','day',true,300,''],
 houhai:['全天','sunset',false,180,'']
};
SPOTS.forEach(s=>{
  const t=SPOT_TIME[s.id];
  if(t){s.openHrs=t[0];s.bestTime=t[1];s.needBook=t[2];s.dur=t[3];s.bookNote=t[4]||'';return}
  /* 规则兜底：开放时间按名称语义推，停留时长按 hrs 文本推，预约按票务类型推 */
  const n=s.n||'';
  s.openHrs=/夜市|步行街|廊道|沙滩|广场|湖|海|河|山|镇|村/.test(n)?'全天/日出-日落':'09:00-17:00';
  s.bestTime=/夜|塔|桥|喷泉|街/.test(n)?'night':/日落|海|湖|滩/.test(n)?'sunset':'day';
  s.needBook=/¥|€|\$/.test(String(s.price||''))&&!/免费|外观免费/.test(String(s.price||''));
  s.dur=/(1-2 天|1 天)/.test(s.hrs||'')?420:/(半天)/.test(s.hrs||'')?240:180;
  s.bookNote='';
});

/* ================= 数据：社区动态 ================= */
const POSTS=[
 {id:'p1',u:'阿澈的镜头',c:'#5b82b8',loc:'大理 · 洱海生态廊道',rg:'cn',type:'video',time:'2 小时前',txt:'清晨六点的洱海日出，我把风的声音都录进去了，BGM 一开就是旅行的味道 ✨',likes:328,cmts:42,imgs:['erhai','ys','ylw'],bgm:'calm',real:true},
 {id:'p2',u:'麦芽糖不甜',c:'#e58fb1',loc:'成都 · 大熊猫基地',rg:'cn',type:'img',time:'5 小时前',txt:'看完滚滚直接去吃火锅，成都的一天就是这样圆滚滚的 🐼🍲',likes:256,cmts:31,imgs:['panda'],real:true},
 {id:'p3',u:'旅行的意义L',c:'#6cc47a',loc:'东京 · 涩谷',rg:'ab',type:'video',time:'昨天 21:40',txt:'涩谷的人潮与霓虹，剪了个 30 秒的卡点视频，BGM 是深夜的电子感 🎬',likes:412,cmts:56,imgs:['shibuya','senso','mbs'],bgm:'retro',real:true},
 {id:'p4',u:'盐系少女日记',c:'#c98a2e',loc:'青海湖 · 环湖公路',rg:'cn',type:'plog',time:'昨天 15:12',txt:'PLOG | 青海湖自驾：加油站泡面比什么都香，雪山在副驾一路陪我们。',likes:189,cmts:22,imgs:['qroad','qhh'],real:true},
 {id:'p5',u:'Vera在流浪',c:'#9a86d9',loc:'圣托里尼 · 伊亚',rg:'ab',type:'plog',time:'3 天前',txt:'PLOG | 无限泳池与爱琴海的落日，原来白与蓝真的可以治愈一切。',likes:502,cmts:77,imgs:['pool','oia'],real:true},
 {id:'p6',u:'长安一梦',c:'#e06a5e',loc:'西安 · 城墙',rg:'cn',type:'img',time:'3 天前',txt:'夜爬西安城墙，灯笼亮起来的那一刻梦回长安 🏮',likes:233,cmts:29,imgs:['wall'],real:true}
];
/* ================= 多平台 · 话题 · 4K 精选 ================= */
const PLAT={douyin:{n:'抖音',i:'🎵'},xhs:{n:'小红书',i:'📕'},kuaishou:{n:'快手',i:'⚡'},ins:{n:'Instagram',i:'📸'},yt:{n:'YouTube',i:'▶️'},go:{n:'WANDERGO',i:'✈️'}};
POSTS.push(
 {id:'p7',u:'山河探测器',c:'#3f6fa8',loc:'张家界 · 袁家界',rg:'cn',type:'video',time:'1 天前',txt:'无人机穿过云海拍阿凡达悬浮山，竖屏直出，3 秒上头 ⛰️',likes:521,cmts:63,imgs:['zjj','huangshan'],bgm:'fresh',real:true,plat:'douyin',topics:['t4']},
 {id:'p8',u:'芒果糯米饭',c:'#d98fae',loc:'清迈 · 周日夜市',rg:'ab',type:'plog',time:'2 天前',txt:'PLOG | 从塔佩门一路吃到古城尽头：芒果饭 20、按摩 40/小时，清迈物价太友好 🥭',likes:278,cmts:35,imgs:['chiangmai','gp'],real:true,plat:'xhs',topics:['t6','t5']},
 {id:'p9',u:'北极星旅记',c:'#2f4f7f',loc:'冰岛 · 黄金圈',rg:'ab',type:'video',time:'3 天前',txt:'追到极光那晚，整片天空都在跳舞。4K 直出，记得开最高清晰度 🌌',likes:689,cmts:94,imgs:['ice','cp'],bgm:'calm',real:true,plat:'yt',topics:['t1']},
 {id:'p10',u:'高迪迷弟',c:'#8f7ac9',loc:'巴塞罗那 · 圣家堂',rg:'ab',type:'img',time:'4 天前',txt:'下午四点半的受立面，光透过彩窗洒进来的瞬间，全场安静了 ⛪',likes:344,cmts:48,imgs:['sagrada'],real:true,plat:'ins',topics:['t2']}
);
const POST_EXTRA={
 p1:{plat:'douyin',topics:['t1'],full:'凌晨五点半从才村码头下水，日出把整片洱海染成金色。路线：才村码头 → 龙龛生态廊道，骑行 12km 约 2 小时；花费：电动车 40/天 + 早餐 15；建议 6:30 前到，人少光好。'},
 p2:{plat:'douyin',topics:['t6'],full:'滚滚看完直接地铁 3 号线去春熙路，套餐 88 两人吃到扶墙。熊猫基地 7:30 开园就进，上午滚滚最活跃，门票 55。'},
 p3:{plat:'yt',topics:['t5'],full:'涩谷十字路口站了半小时，就等一个红灯变绿的瞬间。回程绕去黄金街居酒屋，人均 120。东京地铁 72h 票是穷游神器。'},
 p4:{plat:'xhs',topics:['t5'],full:'西宁租车 120/天，环湖西路 G109 沿途全是机位；加油站泡面 12 块配雪山景观位，值回票价。7-8 月油菜花开最美。'},
 p5:{plat:'ins',topics:['t3'],full:'伊亚悬崖酒店无线泳池提前 3 个月订，住 3 晚均 2200/晚；落日位要 18:30 前去蓝顶教堂占位；ATV 租车最划算。'},
 p6:{plat:'kuaishou',topics:[],full:'夜爬城墙票 45，从永宁门上，骑一圈 14km 约 1.5 小时；灯笼 19:00 亮灯，护城河倒影机位在南门东侧桥上。'}
};
POSTS.forEach(p=>{if(POST_EXTRA[p.id])Object.assign(p,POST_EXTRA[p.id])});
const FEATURED=[
 {img:'erhai',t:'洱海日出 · 金色时刻',loc:'大理 · 才村码头',by:'阿澈的镜头',plat:'xhs'},
 {img:'ice',t:'极光之舞 · 4K 直出',loc:'冰岛 · 黄金圈',by:'北极星旅记',plat:'yt'},
 {img:'oia',t:'爱琴海蓝白梦境',loc:'圣托里尼 · 伊亚',by:'Vera在流浪',plat:'ins'},
 {img:'zjj',t:'云海石林 · 悬浮山',loc:'张家界 · 袁家界',by:'山河探测器',plat:'douyin'},
 {img:'inari',t:'千本鸟居 · 橙红隧道',loc:'京都 · 伏见稻荷',by:'旅行的意义L',plat:'ins'},
 {img:'qhh',t:'油菜花海与雪线',loc:'青海湖 · 二郎剑',by:'盐系少女日记',plat:'xhs'}
];
const TOPICS=[
 {id:'t1',name:'世界上幸福度最高的旅行地',heat:96,up:12,desc:'源自联合国幸福报告与全网旅行热度指数：慢节奏、高治愈感的目的地',spots:['ice','cp','paris','oia'],fit:{'情侣出行':72,'亲子家庭':68,'独自背包':90,'摄影出片':95,'美食寻味':60}},
 {id:'t2',name:'樱花季限定 · 春日物语',heat:92,up:24,desc:'3-4 月樱花前线追花攻略，吉野樱与染井吉野的浪漫追逐',spots:['senso','inari','mbs'],fit:{'情侣出行':93,'亲子家庭':74,'独自背包':70,'摄影出片':96,'美食寻味':80}},
 {id:'t3',name:'海岛蜜月天花板',heat:88,up:8,desc:'一岛一酒店、果冻色泻湖，婚礼与蜜月的地表最强选项',spots:['maldives','oia','ylw'],fit:{'情侣出行':99,'亲子家庭':60,'独自背包':45,'摄影出片':88,'美食寻味':75}},
 {id:'t4',name:'带娃看世界 · 亲子游',heat:85,up:15,desc:'遛娃友好度拉满：自然课堂、索道玻璃桥与温泉的组合',spots:['zjj','cbs','ylw','greatwall'],fit:{'情侣出行':62,'亲子家庭':98,'独自背包':50,'摄影出片':70,'美食寻味':78}},
 {id:'t5',name:'一人背包 · 穷游日记',heat:83,up:19,desc:'人均 3K 以内的深度路线，一个人也要走得很远',spots:['chiangmai','luguhu','qhh'],fit:{'情侣出行':55,'亲子家庭':40,'独自背包':97,'摄影出片':82,'美食寻味':90}},
 {id:'t6',name:'舌尖上的旅行',heat:90,up:11,desc:'为一顿饭奔赴一座城：夜市、老字号与街头小吃的朝圣',spots:['chiangmai','ys','cp'],fit:{'情侣出行':85,'亲子家庭':72,'独自背包':88,'摄影出片':65,'美食寻味':99}}
];
const topicById=id=>TOPICS.find(t=>t.id===id);
/* ================= 地点词库：帖子正文「想去」地点标注 / 社区搜索建议用 ================= */
const CITY_KEYS=['北京','上海','天津','重庆','哈尔滨','长春','沈阳','大连','石家庄','太原','呼和浩特','呼伦贝尔','济南','青岛','威海','烟台','南京','苏州','常州','无锡','杭州','宁波','温州','合肥','黄山','福州','厦门','泉州','南昌','庐山','婺源','郑州','洛阳','开封','武汉','宜昌','恩施','长沙','张家界','凤凰','广州','深圳','珠海','佛山','潮汕','南宁','桂林','阳朔','北海','海口','三亚','成都','九寨沟','稻城','色达','贵阳','黔东南','昆明','大理','丽江','香格里拉','西双版纳','拉萨','日喀则','林芝','西安','延安','兰州','敦煌','张掖','西宁','茶卡','银川','中卫','乌鲁木齐','喀什','伊犁','喀纳斯','吐鲁番','阿勒泰','香港','澳门','台北','东京','京都','大阪','巴黎','冰岛','清迈','曼谷','马尔代夫','巴厘岛','圣托里尼','新加坡','纽约','悉尼','巴塞罗那','迪拜','皇后镇','瑞士','土耳其','埃及','摩洛哥','威尼斯','伦敦','首尔','岘港','仙本那'];
/* 从一段文本里提取提到的地点（城市 + 景点名），供「想去」点亮与搜索建议 */
function extractPlaces(text){
  const t=String(text||'');if(!t)return [];
  const out=[];
  CITY_KEYS.forEach(c=>{if(t.includes(c)&&!out.includes(c))out.push(c)});
  (typeof SPOTS!=='undefined'?SPOTS:[]).forEach(s=>{if((t.includes(s.n)||(s.city&&t.includes(s.city)))&&!out.includes(s.n))out.push(s.n)});
  return out.slice(0,6);
}
/* 想去清单：本地持久化（后端在线时同时写库），key=地点名 */
function readWants(){try{return JSON.parse(localStorage.getItem('fmw_wants')||'{}')}catch(e){return{}}}
function toggleWant(name,from){
  const w=readWants();
  if(w[name]){delete w[name];localStorage.setItem('fmw_wants',JSON.stringify(w));return false}
  w[name]={t:Date.now(),from:from||''};
  localStorage.setItem('fmw_wants',JSON.stringify(w));
  if(typeof WGOAPI!=='undefined'&&WGOAPI.wantToggle)WGOAPI.wantToggle(name,from);
  return true;
}
/* ================= BGM 曲库 · 文创素材库 ================= */
/* 每条：[代号, 曲名, 图标, 类别标签]，标签用于搜索匹配（热榜 / 治愈 / 鼓点 / 国风…） */
const BGM_LIST=[
 ['fresh','清新漫步','🌿','治愈 轻快'],['calm','宁静夜航','🌙','治愈 助眠'],['retro','复古胶片','📼','复古 胶片'],
 ['city','城市流行','🏙️','热榜 流行'],['jazz','慵懒爵士','🎷','咖啡 慵懒'],['folk','民谣旅途','🪕','民谣 公路'],
 ['lofi','Lo-fi 陪伴','🎧','学习 陪伴'],['epic','史诗远行','🏔️','大片 航拍'],['elect','电子律动','⚡','热榜 鼓点'],
 ['douyin_hot','抖音热榜·心动节拍','🔥','热榜 抖音 鼓点'],['douyin_soft','抖音热榜·温柔慢放','💗','热榜 抖音 温柔'],
 ['douyin_vlog','抖音热榜·Vlog 开场','🎬','热榜 抖音 Vlog'],['sunset','落日飞车','🌇','浪漫 黄昏'],
 ['wave','海浪白噪','🌊','白噪 海边'],['rain','雨落窗沿','🌧️','白噪 下雨'],['cafe','午后咖啡馆','☕','咖啡 午后'],
 ['mountain','雪山长风','🏔','壮阔 风光'],['desert','大漠孤烟','🏜️','壮阔 西北'],['grass','草原牧歌','🐎','民谣 草原'],
 ['guofeng','国风·琵琶行','🏮','国风 琵琶'],['guzheng','国风·古筝流水','🎐','国风 古筝'],['erhu','国风·二胡叙事','🎻','国风 二胡'],
 ['piano','钢琴独白','🎹','纯音乐 钢琴'],['guitar','木吉他旅程','🎸','纯音乐 吉他'],['cello','大提琴暮色','🎼','纯音乐 弦乐'],
 ['cute','萌系跳跃','🐰','可爱 轻快'],['anime','动漫燃向','⚡','动漫 热血'],['prince','小王子·星球漫游','👑','童话 梦幻'],
 ['travel','旅行进行曲','✈️','旅行 出发'],['night','城市夜行','🌃','夜景 电子']
];
const BGM_NAME=code=>{const b=BGM_LIST.find(x=>x[0]===code);return b?b[1]:''};
const BGM_ICON=code=>{const b=BGM_LIST.find(x=>x[0]===code);return b?b[2]:'♪'};
/* ================= 打卡目的地库：全国省市 + 主要旅行城市 + 国外 ================= */
/* 每条：[名称, 所属省/国, 大区]，供「去了哪儿」下拉与搜索使用（景点表之外的地点兜底） */
const DEST_LIST=[
 ['北京','北京','华北'],['天津','天津','华北'],['石家庄','河北','华北'],['承德','河北','华北'],['秦皇岛','河北','华北'],['张家口','河北','华北'],['保定','河北','华北'],
 ['太原','山西','华北'],['大同','山西','华北'],['平遥','山西','华北'],['五台山','山西','华北'],
 ['呼和浩特','内蒙古','华北'],['呼伦贝尔','内蒙古','华北'],['满洲里','内蒙古','华北'],['锡林郭勒','内蒙古','华北'],['阿拉善','内蒙古','华北'],
 ['沈阳','辽宁','东北'],['大连','辽宁','东北'],['丹东','辽宁','东北'],['长春','吉林','东北'],['延吉','吉林','东北'],['长白山','吉林','东北'],
 ['哈尔滨','黑龙江','东北'],['雪乡','黑龙江','东北'],['漠河','黑龙江','东北'],['齐齐哈尔','黑龙江','东北'],
 ['上海','上海','华东'],['南京','江苏','华东'],['苏州','江苏','华东'],['常州','江苏','华东'],['无锡','江苏','华东'],['扬州','江苏','华东'],['镇江','江苏','华东'],['徐州','江苏','华东'],['南通','江苏','华东'],
 ['杭州','浙江','华东'],['宁波','浙江','华东'],['温州','浙江','华东'],['绍兴','浙江','华东'],['嘉兴','浙江','华东'],['舟山','浙江','华东'],['莫干山','浙江','华东'],
 ['合肥','安徽','华东'],['黄山','安徽','华东'],['宏村','安徽','华东'],['九华山','安徽','华东'],
 ['福州','福建','华东'],['厦门','福建','华东'],['泉州','福建','华东'],['武夷山','福建','华东'],['平潭','福建','华东'],
 ['南昌','江西','华东'],['庐山','江西','华东'],['婺源','江西','华东'],['景德镇','江西','华东'],['三清山','江西','华东'],
 ['济南','山东','华东'],['青岛','山东','华东'],['烟台','山东','华东'],['威海','山东','华东'],['泰安','山东','华东'],['曲阜','山东','华东'],
 ['郑州','河南','华中'],['洛阳','河南','华中'],['开封','河南','华中'],['少林寺','河南','华中'],['老君山','河南','华中'],
 ['武汉','湖北','华中'],['宜昌','湖北','华中'],['恩施','湖北','华中'],['神农架','湖北','华中'],
 ['长沙','湖南','华中'],['张家界','湖南','华中'],['凤凰','湖南','华中'],['芙蓉镇','湖南','华中'],['衡山','湖南','华中'],
 ['广州','广东','华南'],['深圳','广东','华南'],['珠海','广东','华南'],['佛山','广东','华南'],['潮汕','广东','华南'],['惠州','广东','华南'],['开平','广东','华南'],
 ['南宁','广西','华南'],['桂林','广西','华南'],['阳朔','广西','华南'],['北海','广西','华南'],['涠洲岛','广西','华南'],['龙脊梯田','广西','华南'],
 ['海口','海南','华南'],['三亚','海南','华南'],['万宁','海南','华南'],['陵水','海南','华南'],
 ['成都','四川','西南'],['九寨沟','四川','西南'],['稻城','四川','西南'],['色达','四川','西南'],['峨眉山','四川','西南'],['都江堰','四川','西南'],['四姑娘山','四川','西南'],['康定','四川','西南'],
 ['重庆','重庆','西南'],['贵阳','贵州','西南'],['黔东南','贵州','西南'],['荔波','贵州','西南'],['黄果树','贵州','西南'],['西江千户苗寨','贵州','西南'],
 ['昆明','云南','西南'],['大理','云南','西南'],['丽江','云南','西南'],['香格里拉','云南','西南'],['西双版纳','云南','西南'],['泸沽湖','云南','西南'],['腾冲','云南','西南'],['元阳梯田','云南','西南'],['梅里雪山','云南','西南'],
 ['拉萨','西藏','西南'],['日喀则','西藏','西南'],['林芝','西藏','西南'],['纳木错','西藏','西南'],['珠峰大本营','西藏','西南'],['阿里','西藏','西南'],
 ['西安','陕西','西北'],['延安','陕西','西北'],['华山','陕西','西北'],['榆林','陕西','西北'],
 ['兰州','甘肃','西北'],['敦煌','甘肃','西北'],['张掖','甘肃','西北'],['嘉峪关','甘肃','西北'],['甘南','甘肃','西北'],['天水','甘肃','西北'],
 ['西宁','青海','西北'],['茶卡','青海','西北'],['青海湖','青海','西北'],['大柴旦','青海','西北'],['玉树','青海','西北'],
 ['银川','宁夏','西北'],['中卫','宁夏','西北'],['沙坡头','宁夏','西北'],
 ['乌鲁木齐','新疆','西北'],['喀什','新疆','西北'],['伊犁','新疆','西北'],['喀纳斯','新疆','西北'],['吐鲁番','新疆','西北'],['阿勒泰','新疆','西北'],['禾木','新疆','西北'],['赛里木湖','新疆','西北'],['独库公路','新疆','西北'],['塔县','新疆','西北'],['库车','新疆','西北'],['哈密','新疆','西北'],
 ['香港','香港','港澳台'],['澳门','澳门','港澳台'],['台北','台湾','港澳台'],['垦丁','台湾','港澳台'],['花莲','台湾','港澳台'],
 ['东京','日本','国外'],['京都','日本','国外'],['大阪','日本','国外'],['北海道','日本','国外'],['冲绳','日本','国外'],['富士山','日本','国外'],
 ['首尔','韩国','国外'],['济州岛','韩国','国外'],['釜山','韩国','国外'],
 ['曼谷','泰国','国外'],['清迈','泰国','国外'],['普吉岛','泰国','国外'],['苏梅岛','泰国','国外'],
 ['新加坡','新加坡','国外'],['吉隆坡','马来西亚','国外'],['仙本那','马来西亚','国外'],['巴厘岛','印度尼西亚','国外'],['岘港','越南','国外'],['河内','越南','国外'],['胡志明市','越南','国外'],
 ['马尔代夫','马尔代夫','国外'],['斯里兰卡','斯里兰卡','国外'],
 ['巴黎','法国','国外'],['尼斯','法国','国外'],['普罗旺斯','法国','国外'],['伦敦','英国','国外'],['爱丁堡','英国','国外'],
 ['罗马','意大利','国外'],['威尼斯','意大利','国外'],['佛罗伦萨','意大利','国外'],['米兰','意大利','国外'],
 ['巴塞罗那','西班牙','国外'],['马德里','西班牙','国外'],['里斯本','葡萄牙','国外'],
 ['圣托里尼','希腊','国外'],['雅典','希腊','国外'],['瑞士','瑞士','国外'],['因特拉肯','瑞士','国外'],['少女峰','瑞士','国外'],
 ['冰岛','冰岛','国外'],['挪威','挪威','国外'],['特罗姆瑟','挪威','国外'],['芬兰','芬兰','国外'],['罗瓦涅米','芬兰','国外'],
 ['土耳其','土耳其','国外'],['伊斯坦布尔','土耳其','国外'],['卡帕多奇亚','土耳其','国外'],
 ['埃及','埃及','国外'],['摩洛哥','摩洛哥','国外'],['马拉喀什','摩洛哥','国外'],['舍夫沙万','摩洛哥','国外'],
 ['迪拜','阿联酋','国外'],['纽约','美国','国外'],['洛杉矶','美国','国外'],['旧金山','美国','国外'],['夏威夷','美国','国外'],
 ['悉尼','澳大利亚','国外'],['墨尔本','澳大利亚','国外'],['皇后镇','新西兰','国外'],['开普敦','南非','国外'],['里约热内卢','巴西','国外']
];
/* 生成「去了哪儿」下拉：优先用景点表（带 id），再按大区补充城市地名（value 用地名） */
function destOptionsHtml(){
  const d=typeof SPOTS!=='undefined'?SPOTS:[];
  const used=new Set();
  let html='<optgroup label="⭐ 精选景点（可直接打卡点亮地图）">';
  html+=d.map(s=>{used.add(s.city);return `<option value="${s.id}">${s.n} · ${s.city}</option>`}).join('');
  html+='</optgroup>';
  const regions=['华北','东北','华东','华中','华南','西南','西北','港澳台','国外'];
  regions.forEach(r=>{
    const items=DEST_LIST.filter(x=>x[2]===r);
    if(!items.length)return;
    html+=`<optgroup label="${r}">`+items.map(x=>`<option value="${x[0]}">${x[0]} · ${x[1]}</option>`).join('')+'</optgroup>';
  });
  return html;
}

const SHOPS=[
 {city:'北京',name:'春风习习 · 前门书店',type:'书店咖啡',addr:'东城区长巷五条19号',hours:'10:00-22:00（周一店休）',feat:'四合院改造的河边书店，三联文创首发款，二楼窗位正对三里河公园水系，适合午后发呆',near:'qhh'},
 {city:'北京',name:'凝和庙文创 · 和玺彩画系列',type:'博物馆文创',addr:'东城区什锦花园胡同23号',hours:'9:30-17:00',feat:'把和玺彩画纹样做成胶带、冰箱贴与丝巾，冷门但质感极高，伴手礼天花板',near:'greatwall'},
 {city:'上海',name:'多抓鱼循环商店',type:'二手书店',addr:'徐汇区安福路300号',hours:'11:00-22:00',feat:'循环好书+自营帆布与徽章，安福路武康路段City Walk顺路王，常有限量书票',near:'cp'},
 {city:'苏州',name:'苏州博物馆文创部',type:'博物馆文创',addr:'姑苏区东北街204号（馆内出口处）',hours:'9:00-17:00（周一闭馆）',feat:'贝聿铭建筑同款文具、秘色瓷莲花曲奇、文徵明手植紫藤种子，网红级伴手礼',near:'ys'},
 {city:'成都',name:'方所成都店',type:'美学书店',addr:'锦江区中纱帽街8号远洋太古里B2',hours:'10:00-22:30',feat:'地下藏经洞式空间，艺术画册与川蜀主题文创齐备，出门就是大慈寺与太古里',near:'jzg'},
 {city:'大理',name:'海豚阿德书店',type:'独立书店',addr:'大理古城叶榆路204号',hours:'10:30-21:30',feat:'苍山脚下的旅行文学据点，云南风物手账与植物标本明信片，可代寄慢递',near:'erhai'},
 {city:'京都',name:'祗园 小津商店',type:'手作杂货',addr:'京都市东山区祗园町北侧',hours:'11:00-19:00（不定休）',feat:'老铺手抄纸与舞伎主题一笔笺，店主会按用途帮你搭配和纸信封',near:'inari'},
 {city:'巴黎',name:'Le Bon Marché 文创层',type:'买手百货',addr:'24 Rue de Sèvres, 75007',hours:'10:00-20:00（周日11:00）',feat:'左岸百年百货，法式插画笔记本与博物馆联名胶带一次集齐，楼下食品馆可顺路',near:'paris'}
];

/* ================= 城市元数据（替代原 PLANS 行程模板） =================
 * 只保留「与城市强绑定、无法从景点推导」的信息：出发地参考、市内通达度、目的地级贴士、备案与人群提示。
 * 行程景点 / 天数 / 预算 / 三餐 / 时刻表全部由 SPOTS + EATS 实时生成，不再硬编码行程。
 */
const DEST_META={
 '大理':{from:'上海',dist:2300,mood:'慢生活',
   tips:'住宿选才村 / 龙龛码头一带，海景房提前 2 周订更便宜；电动车选续航 80km+ 的。',
   planB:{rain:'下雨改走室内：床单厂艺术区 + 喜洲匠志集扎染博物馆；洱海边咖啡馆躲雨也出片。',rest:'才村码头旁书店 / 环海西路咖啡馆，落地窗看海歇脚。',lazy:'不想骑行就改乘环海摆渡车，或订海景房躺平看云。'},
   crowd:{kid:'环海骑行选亲子车并戴头盔；苍山索道海拔较高，给娃备薄外套。',elder:'古城石板路多，穿舒适运动鞋、放缓节奏。',couple:'龙龛码头日出 + 理想邦拍照，包一辆电动车环海最出片。'}},
 '九寨':{from:'成都',dist:400,mood:'高原山水',
   tips:'沟口住宿最方便；早晚温差 15℃+，冲锋衣必带；门票提前在官方公众号预约。',
   planB:{rain:'雨天改看《九寨·藏谜》演出，或回客栈围炉喝酥油茶。',rest:'沟口游客中心有热饮和氧气吧，走累先回撤休息。',lazy:'只走树正寨—诺日朗瀑布精华段，其余坐观光车看窗外海子。'},
   crowd:{kid:'高原河谷早晚冷，儿童备抓绒衣；栈道湿滑请牵好手。',elder:'景区海拔 2000-3100m，行前查血压、备便携氧气，勿剧烈行走。',couple:'清晨的五彩池人少光美，适合慢慢拍。'}},
 '日本':{from:'上海',dist:450,mood:'都市与古都',
   tips:'签证需 10 个工作日；ICOCA 卡关西通用；红叶季住宿提前 1 个月。',
   planB:{rain:'雨天首选 teamLab 无界美术馆 / 京都铁道博物馆，室内遛一天不亏。',rest:'涩谷书店、京都东山咖啡店，坐下来歇脚看街景。',lazy:'买一张地铁一日券，挑两三家咖啡店慢慢晃也是旅行。'},
   crowd:{kid:'JR 与乐园儿童票规则提前查；日本商场母婴室完善。',elder:'地铁楼梯多，优先乘电梯；刷交通卡有长者优惠。',couple:'鸭川河岸散步 + 先斗町居酒屋是经典夜景路线。'}},
 '巴黎':{from:'上海',dist:60,mood:'艺术之都',
   tips:'申根签证材料早备；地铁注意防扒；博物馆通票 4 日票最划算；周日很多店休息。',
   planB:{rain:'雨天正好逛卢浮宫 / 奥赛室内馆，排队的人反而更少。',rest:'花神咖啡馆一杯热巧、卢森堡公园长椅，都是标准巴黎式休息。',lazy:'买博物馆通票挑 2-3 个精华馆，其余时间塞纳河边发呆。'},
   crowd:{kid:'铁塔草坪与塞纳河边适合遛娃；国立博物馆 18 岁以下免费。',elder:'地铁注意防扒，老人建议打车；大馆均有轮椅租借。',couple:'蒙马特高地日落 + 塞纳河游船是必做清单。'}},
 '冰岛':{from:'雷克雅未克',dist:1330,mood:'极地风光',
   tips:'秋冬必须租 SUV；每天看极光预报；超市自炊省一半餐费；蓝湖需提前订时段。',
   planB:{rain:'天气差就改蓝湖温泉 / 国家博物馆，极光等 KP 指数高再追。',rest:'1 号公路沿途加油站都有热狗和咖啡，随停随歇。',lazy:'只玩黄金圈 + 蓝湖短线，不硬环岛。'},
   crowd:{kid:'黄金圈步道有护栏，注意防风保暖；地热区别越界。',elder:'租 SUV 选自动挡 + 加热座椅；夜间驾驶交给年轻同伴。',couple:'极光玻璃屋躺着看光带。'}},
 '三亚':{from:'广州',dist:850,mood:'海岛度假',
   tips:'旺季机票酒店提前 3 周；防晒 50+ 必备；海鲜去第一市场自选加工；免税店最后一天再买。',
   planB:{rain:'雨天改逛国际免税城 + 亚特兰蒂斯水族馆，室内也精彩。',rest:'酒店大堂吧、第一市场一杯老盐柠檬水。',lazy:'酒店私享沙滩躺平一天，也是度假的一部分。'},
   crowd:{kid:'亚龙湾浪小适合娃玩水；全程防晒、及时补涂。',elder:'海鲜选清蒸少辣；附近医院距离远，备好常用药。',couple:'日落帆船 + 海棠湾沙滩酒吧。'}},
 '张家界':{from:'长沙',dist:320,mood:'奇峰云海',
   tips:'四日票足够玩遍核心景区；住武陵源门口最方便；天门山需单独购票并提前订 A 线；雨后云海概率最高。',
   planB:{rain:'雨后恰是云海概率最高的时候，坐百龙天梯上山看云瀑更值。',rest:'武陵源游客中心、溪布街小吃街歇脚。',lazy:'只走袁家界精华环线，其余全靠观光车接驳。'},
   crowd:{kid:'山上猴群会抢食，零食收好；恐高的娃慎选玻璃栈道。',elder:'台阶多，多坐索道与百龙天梯；山里温差大备外套。',couple:'大峡谷玻璃桥 + 夜间民俗演出。'}},
 '清迈':{from:'广州',dist:150,mood:'古城慢游',
   tips:'11-2 月凉季最舒服；寺庙进殿要过膝；泰北菜偏辣可要求不辣；落地签备现金和照片。',
   planB:{rain:'雨季下午常有阵雨：上午排寺庙，下午改泰式烹饪课 / 按摩。',rest:'宁曼路咖啡店、古城小馆，冰拿铁续命。',lazy:'双条车环古城一圈，塔佩门喂鸽子。'},
   crowd:{kid:'大象营选「观察型」营地；夜市人多牵好手。',elder:'寺庙进殿过膝，备一条纱笼；双条车谈好价再上车。',couple:'周日夜市 + 天灯节是顶配浪漫。'}},
 '马尔代夫':{from:'上海',dist:0,mood:'海岛度假',
   tips:'一价全包比半包省心也更省；选带浮梯的房型；淡季价格低 30%；自带浮潜面镜更卫生。',
   planB:{rain:'降雨多为一阵：改做水疗 Spa / 水上中心浮潜课。',rest:'水屋露台吊床 + 无边泳池，躺着等雨停。',lazy:'一价全包躺玩：三餐 + 酒水 + 浮潜全含。'},
   crowd:{kid:'儿童俱乐部可托管；浮潜必须穿救生衣。',elder:'水上屋栈道防滑；选带私人泳池的沙屋更稳妥。',couple:'落日巡航 + 沙滩私宴，提前 2 天预订。'}}
};

/* ================= 城市美食库（用于把三餐排进行程时间轴） =================
 * 每条：[店名或品类, 一句话亮点, 人均, 位置关键词（用于就近匹配当天景点）]
 * 未收录的城市走 EATS_BY_REG 按省/地区兜底，保证任何目的地都能排出三餐。
 */
const EATS={
 '北京':[['四季民福烤鸭（故宫店）','故宫角楼对面，片皮蘸糖，11 点前取号不用等','¥150','故宫'],['姚记炒肝','鼓楼边老字号，炒肝配包子，早餐人气爆棚','¥20','鼓楼'],['护国寺小吃','豆汁焦圈驴打滚一次集齐，本地人早餐','¥25','护国寺'],['海碗居','炸酱面手擀，面码七样摆满一桌','¥45','西城'],['南锣鼓巷文宇奶酪','双皮奶配桂花，逛胡同时的解暑站','¥25','南锣鼓巷']],
 '上海':[['大壶春（云南南路）','生煎褶朝下煎到焦脆，先咬一口放汤','¥30','云南南路'],['小杨生煎','经典连锁，皮薄汁多，随时能吃','¥35','南京东路'],['阿娘面馆','葱油拌面配辣肉，老上海早饭','¥30','大世界'],['南翔馒头店','豫园百年小笼，蟹粉季必点','¥80','豫园'],['老吉士','本帮熏鱼和红烧肉，需提前订位','¥160','徐汇']],
 '大理':[['段公子私房菜','古城内白族菜，酸辣鱼和乳扇是招牌','¥65','古城'],['才村码头鱼庄','现捞洱海鱼做酸汤，边吃边看湖','¥70','才村'],['喜洲破酥粑粑','现烤酥皮，甜咸两种，趁热吃','¥10','喜洲'],['双廊小馆','海景位看日落，菌子季记得问当天货','¥80','双廊'],['人民路夜市','烤乳扇、饵块、梅子酒，边走边吃','¥40','人民路']],
 '丽江':[['腊排骨火锅','纳西土火锅，排骨炖到脱骨','¥70','古城'],['鸡豆凉粉','街头小吃，酸辣开胃','¥10','四方街'],['丽江粑粑','千层酥皮，配酥油茶','¥8','束河']],
 '成都':[['大龙燚火锅','牛油锅底，毛肚七上八下','¥110','春熙路'],['甘记肥肠粉','红薯粉配肥肠，麻辣鲜香','¥20','宽窄巷子'],['龙抄手','红油抄手配甜水面','¥35','春熙路'],['蛋烘糕','街头现烤，奶油或肉松馅','¥8','太古里'],['老妈兔头','双流老牌，麻辣卤透','¥25','武侯祠']],
 '九寨沟':[['藏家土火锅','牦牛肉配野菜，锅庄舞边吃边看','¥90','漳扎镇'],['九寨沟口川菜馆','家常川菜，量足价实','¥50','沟口'],['酥油茶配糌粑','高原补充热量最快','¥20','漳扎镇']],
 '张家界':[['三下锅','腊肉肥肠内脏一锅炖，本地招牌','¥65','武陵源'],['溪布街小吃','葛根粉、烤香肠一条街','¥35','溪布街'],['土家腊肉炒蕨菜','山野菜配老腊肉','¥48','天子山'],['张家界米粉','早餐一碗，码子随便加','¥12','市区']],
 '三亚':[['第一市场海鲜加工','自选海鲜找店加工，看清秤再买','¥150','第一市场'],['清补凉','椰奶芋圆西瓜，解暑必备','¥15','解放路'],['文昌鸡饭','白切蘸桔子汁','¥60','海棠湾'],['后海村渔家小炒','冲浪完来一顿，价格实在','¥55','后海村']],
 '杭州':[['知味观','虾爆鳝面与小笼，老字号早点','¥45','湖滨'],['外婆家','杭帮家常，茶香鸡必点','¥70','西湖'],['新白鹿','性价比排队王，东坡肉厚实','¥65','武林'],['葱包桧','街头现烤小食','¥8','河坊街']],
 '西安':[['老米家泡馍','自己掰馍才正宗，配糖蒜','¥38','回民街'],['子午路张记肉夹馍','腊汁肉酥烂，白吉馍现烤','¥15','南门'],['biangbiang面','宽面泼油，一根管饱','¥22','钟楼'],['甑糕','糯米红枣甜糯，早餐限定','¥8','洒金桥']],
 '清迈':[['Khao Soi Khun Yai','泰北咖喱面，只在午市开','¥25','古城北'],['芒果糯米饭','夜市现切，淋椰浆','¥20','周日夜市'],['Ristr8to 咖啡','拉花冠军店，冰拿铁续命','¥25','宁曼路'],['泰式烹饪课','半天学时含市集采买','¥180','古城'],['双条车路边烧烤','一串 10 铢，配糯米','¥15','塔佩门']],
 '东京':[['筑地场外市场','玉子烧、海胆盖饭，早上去最新鲜','¥120','筑地'],['一兰拉面','独格坐席，豚骨浓汤','¥60','涩谷'],['天妇罗近藤','米其林级天妇罗定食','¥250','银座'],['便利店限定','饭团 + 关东煮，便宜好吃','¥30','全城']],
 '京都':[['% Arabica 东山','河边小店，看鸭川喝拿铁','¥40','东山'],['锦市场','豆乳甜甜圈、渍物边走边吃','¥60','四条'],['本家第一旭','酱油拉面，本地人排队','¥55','京都站'],['汤豆腐怀石','南禅寺周边，清淡禅意','¥220','南禅寺']],
 '巴黎':[['花神咖啡馆','圣日耳曼德佩，热巧与可颂','¥120','圣日耳曼'],['L\'As du Fallafel','玛黑区最火的炸鹰嘴豆丸子','¥60','玛黑'],['Bouillon Chartier','1896 年老店，法式家常平价','¥150','歌剧院'],['街角面包房','可颂 + 法棍，早餐标配','¥30','全城']],
 '冰岛':[['Bæjarins Beztu 热狗','雷克雅未克港边小亭，羊肉热狗','¥45','港口'],['N1 加油站热狗','环岛路上随处补给','¥35','全岛'],['羊肉汤','冰岛传统，暖身首选','¥95','市区'],['超市自炊','Bónus 买食材回民宿做','¥60','全岛']],
 '马尔代夫':[['度假村主餐厅','一价全包含三餐自助','¥0（含）','度假岛'],['沙滩私宴','落日时分的两人晚餐，需预订','¥800','沙洲'],['马累鱼市加工','金枪鱼现买现烤','¥60','马累'],['水上屋下午茶','露台甜点配泻湖景','¥120','水屋']],
 '纽约':[['Katz\'s Deli','百年熏牛肉三明治，两人份','¥180','下东区'],['Joe\'s Pizza','纽约式薄底披萨单片','¥35','格林威治'],['Shake Shack','麦迪逊广场公园起源店','¥90','麦迪逊'],['中央公园热狗车','散步顺手买一份','¥30','中央公园']],
 '悉尼':[['Sydney Fish Market','现开生蚝与海鲜拼盘','¥200','鱼市场'],['The Rocks 酒吧','岩石区历史街区，配本地啤酒','¥150','岩石区'],['Flat White 咖啡','澳洲咖啡文化代表','¥35','全城']],
 '新加坡':[['天天海南鸡饭','麦士威熟食中心排队王','¥35','牛车水'],['松发肉骨茶','胡椒汤底配油条','¥55','克拉码头'],['老巴刹沙嗲','夜晚露天炭烤一条街','¥60','CBD']]
};
/* 地区兜底（城市未收录时按省/大区匹配） */
const EATS_BY_REG={
 '云南':[['过桥米线','滚汤现烫，仪式感拉满','¥28'],['汽锅鸡','原汤蒸制，清甜','¥68'],['烤乳扇','奶香拉丝，街边小吃','¥10'],['菌子火锅','雨季限定，认准正规店','¥120']],
 '四川':[['火锅','牛油锅底配毛肚鸭肠','¥90'],['钵钵鸡','冷串串，红油微辣','¥35'],['甜水面','甜辣粗面，口感特别','¥12'],['蛋烘糕','街头甜点，边走边吃','¥8']],
 '重庆':[['小面','二两碱水面上麻辣浇头','¥12'],['九宫格火锅','老锅底越煮越香','¥95'],['酸辣粉','红薯粉配豌豆','¥10'],['烤脑花','夜市必点','¥18']],
 '贵州':[['酸汤鱼','红酸汤配稻花鱼','¥88'],['丝娃娃','蘸水卷饼，清爽','¥20'],['肠旺面','肥肠血旺配脆哨','¥15']],
 '广西':[['螺蛳粉','酸笋是灵魂','¥15'],['桂林米粉','卤水配锅烧','¥12'],['啤酒鱼','阳朔招牌','¥88'],['油茶','恭城打油茶','¥15']],
 '广东':[['早茶','虾饺烧卖凤爪一盅两件','¥70'],['烧鹅','皮脆肉嫩配酸梅酱','¥68'],['潮汕牛肉火锅','现切八秒即熟','¥110'],['肠粉','早餐之王','¥12']],
 '湖南':[['臭豆腐','外脆内嫩，黑色外皮','¥10'],['口味虾','夜宵顶流','¥98'],['剁椒鱼头','蒸出来的鲜辣','¥88'],['米粉','码子随你加','¥15']],
 '湖北':[['热干面','芝麻酱拌碱面','¥8'],['豆皮','糯米配蛋皮','¥10'],['排骨藕汤','湖北人的家常','¥38']],
 '福建':[['沙茶面','沙茶酱汤头','¥18'],['海蛎煎','蚵仔煎配甜辣酱','¥20'],['土笋冻','敢吃才是真吃货','¥15']],
 '浙江':[['片儿川','雪菜笋片肉片面','¥18'],['小笼包','皮薄汁多','¥20'],['西湖醋鱼','杭帮经典','¥78']],
 '江苏':[['鸭血粉丝汤','深夜食堂标配','¥15'],['盐水鸭','咸鲜紧实','¥45'],['蟹粉小笼','秋季限定','¥48'],['大煮干丝','扬州早茶名品','¥28']],
 '山东':[['煎饼卷大葱','山东人的浪漫','¥10'],['把子肉','济南快餐灵魂','¥18'],['海鲜大咖','青岛排档','¥128']],
 '陕西':[['肉夹馍','腊汁肉配白吉馍','¥12'],['羊肉泡馍','自己掰馍才正宗','¥38'],['甑糕','糯米红枣，甜糯','¥8']],
 '甘肃':[['兰州牛肉面','一清二白三红四绿','¥12'],['驴肉黄面','敦煌特色','¥28'],['杏皮水','解腻冰饮','¥6']],
 '青海':[['手抓羊肉','清水煮，蘸蒜泥','¥78'],['酿皮','厚切配辣油','¥10'],['尕面片','汤面片，暖胃','¥15']],
 '新疆':[['大盘鸡','皮带面拌进汤汁','¥68'],['烤包子','馕坑现打','¥5/个'],['手抓饭','黄萝卜配羊腿','¥28']],
 '西藏':[['藏面','碱面配牦牛肉汤','¥12'],['甜茶','一壶茶坐一下午','¥10'],['牦牛肉火锅','高原限定','¥120']],
 '内蒙古':[['手把肉','清水煮羊肉蘸椒盐','¥88'],['咸奶茶配奶皮子','锅茶配炒米','¥30'],['烤羊排','草原炭火直烤','¥98']],
 '东北':[['锅包肉','酸甜挂汁','¥45'],['杀猪菜','酸菜白肉血肠','¥58'],['烤冷面','街头顶流','¥10'],['铁锅炖','贴饼子炖大鹅','¥128']],
 '海南':[['清补凉','椰奶芋圆西瓜','¥15'],['文昌鸡','白切蘸桔子汁','¥68'],['海鲜市场加工','买完找店做','¥120']],
 '国内':[['本地人气早餐店','看门口排队的准没错','¥20'],['老字号招牌菜','认准本地人常去的馆子','¥60'],['夜市小吃','一条街吃到底','¥40'],['菜市场熟食','最便宜的当地味道','¥25']],
 '国外':[['本地市场美食','先去菜市场逛一圈','¥60'],['招牌本地菜','认准门口排队的店','¥120'],['街边小吃','看人多的地方买','¥30'],['便利店限定','便宜又好吃','¥25']]
};
/* 城市 → 省/地区 映射（供美食兜底） */
const CITY_REGION={
 '北京':'北京','上海':'上海','天津':'天津','重庆':'重庆','杭州':'浙江','宁波':'浙江','温州':'浙江','苏州':'江苏','无锡':'江苏','常州':'江苏',
 '南京':'江苏','成都':'四川','九寨沟':'四川','阿坝州':'四川','阿坝':'四川','黄龙':'四川','广州':'广东','深圳':'广东','珠海':'广东','佛山':'广东',
 '张家界':'湖南','湘西':'湖南','凤凰':'湖南','长沙':'湖南','大理':'云南','丽江':'云南','泸沽湖':'云南','西双版纳':'云南','昆明':'云南',
 '西安':'陕西','延安':'陕西','华山':'陕西','兰州':'甘肃','敦煌':'甘肃','西宁':'青海','青海湖':'青海','海北州':'青海',
 '乌鲁木齐':'新疆','喀什':'新疆','伊犁':'新疆','拉萨':'西藏','呼和浩特':'内蒙古','哈尔滨':'东北','长春':'东北','沈阳':'东北','大连':'东北','延边':'东北',
 '三亚':'海南','海口':'海南','厦门':'福建','泉州':'福建','福州':'福建','武汉':'湖北','南昌':'湖南','合肥':'江苏',
 '济南':'山东','青岛':'山东','烟台':'山东','威海':'山东','桂林':'广西','阳朔':'广西','南宁':'广西','贵阳':'贵州',
 '桂林阳朔':'广西','黄山':'江苏','黄山市':'江苏','深圳西': '广东'
};
/* 取某城市的三餐候选池：优先城市库，其次地区兜底 */
function eatsOf(city){
  if(city&&EATS[city])return EATS[city];
  const reg=(city&&CITY_REGION[city])||'国内';
  return EATS_BY_REG[reg]||EATS_BY_REG['国内'];
}

/* ================= 扩展：协同过滤评分种子矩阵（UserCF/ItemCF 演示数据） ================= */
const RATE_USERS=[
 {u:'青柠汽水',r:{erhai:5,ys:5,luguhu:5,xihu:4,qhh:4,jzg:4,chiangmai:3}},
 {u:'慢半拍',r:{erhai:4,ys:4,xihu:5,luguhu:4,qhh:3,gulangyu:4}},
 {u:'苍山雪',r:{erhai:5,jzg:5,luguhu:4,qhh:4,pala:4,cbs:3}},
 {u:'城墙根',r:{gugong:5,bmy:5,greatwall:5,xihu:4,bund:4}},
 {u:'长安客',r:{bmy:5,gugong:4,greatwall:5,huangshan:4,zjj:3}},
 {u:'水墨江南',r:{xihu:5,gulangyu:4,ys:4,bund:4,huangshan:4}},
 {u:'海岛控Mia',r:{ylw:5,maldives:5,oia:5,ubud:4,mbs:4}},
 {u:'浪花日记',r:{ylw:4,maldives:4,oia:5,ubud:5,gp:3}},
 {u:'果冻海',r:{maldives:5,ylw:5,oia:4,opera:4,mbs:3}},
 {u:'霓虹漫步',r:{senso:4,mbs:5,cp:5,paris:4,dubai:4,opera:4}},
 {u:'都市观察员',r:{bund:5,cp:4,dubai:4,paris:4,mbs:4,senso:3}},
 {u:'午夜东京',r:{senso:5,mbs:4,dubai:4,cp:3,paris:3}},
 {u:'极光猎人',r:{ice:5,queenstown:5,rovaniemi:5,cbs:4}},
 {u:'追光者',r:{ice:5,cbs:4,queenstown:4,rovaniemi:4,pala:3}},
 {u:'雪线之上',r:{rovaniemi:5,ice:4,queenstown:4,cbs:4,pala:4}},
 {u:'夜市胃',r:{chiangmai:5,gp:4,ys:4,cp:4,senso:4}},
 {u:'芒果饭',r:{chiangmai:5,gp:5,ubud:4,senso:3}},
 {u:'高迪迷',r:{sagrada:5,paris:5,oia:4,ice:3,dubai:3}},
 {u:'教堂钟声',r:{sagrada:5,paris:4,oia:4,mbs:3}},
 {u:'背包十年',r:{qhh:5,luguhu:4,chiangmai:4,bmy:3,ice:4,erhai:4}},
 {u:'亲子车队',r:{zjj:4,cbs:4,greatwall:4,ylw:5,jzg:4,gugong:4}},
 {u:'摄影老炮',r:{zjj:5,huangshan:5,jzg:5,qhh:4,oia:4,ice:4}},
 {u:'云海常客',r:{huangshan:5,zjj:4,jzg:4,cbs:3,pala:4}},
 {u:'环球小互',r:{paris:4,dubai:4,maldives:4,opera:4,queenstown:4,ice:3,sagrada:3}}
];
/* 推荐卡片 4K 图片灵感来源（版权标注） */
const REC_SRC={
 erhai:{p:'小红书',by:'@阿澈的镜头'},ice:{p:'YouTube',by:'@北极星旅记'},oia:{p:'Instagram',by:'@Vera在流浪'},
 zjj:{p:'抖音',by:'@山河探测器'},inari:{p:'Instagram',by:'@旅行的意义L'},qhh:{p:'小红书',by:'@盐系少女日记'},
 chiangmai:{p:'小红书',by:'@芒果糯米饭'},sagrada:{p:'Instagram',by:'@高迪迷弟'},senso:{p:'抖音',by:'@午夜东京'},
 maldives:{p:'小红书',by:'@海岛控Mia'},ylw:{p:'小红书',by:'@浪花日记'},paris:{p:'抖音',by:'@环球小互'},
 gugong:{p:'小红书',by:'@城墙根'},bmy:{p:'抖音',by:'@长安客'},xihu:{p:'小红书',by:'@水墨江南'},
 luguhu:{p:'抖音',by:'@青柠汽水'},jzg:{p:'抖音',by:'@摄影老炮'},huangshan:{p:'抖音',by:'@云海常客'},
 greatwall:{p:'小红书',by:'@亲子车队'},ubud:{p:'Instagram',by:'@浪花日记'},queenstown:{p:'YouTube',by:'@极光猎人'},
 rovaniemi:{p:'YouTube',by:'@雪线之上'},cp:{p:'Instagram',by:'@都市观察员'},mbs:{p:'抖音',by:'@霓虹漫步'}
};
const recSrcOf=id=>REC_SRC[id]||{p:'WANDERGO 站内',by:'官方精选'};

/* ================= 扩展：打卡奖励 & 排行榜数据 ================= */
const BADGES=[
 {id:'b1',name:'初见世界',need:1,icon:'🌱',desc:'完成第一次打卡'},
 {id:'b2',name:'城市漫游者',need:3,icon:'🚶',desc:'累计打卡 3 次'},
 {id:'b3',name:'旅行新星',need:5,icon:'⭐',desc:'累计打卡 5 次，解锁周边九折券'},
 {id:'b4',name:'金镜头创作者',need:3,icon:'🎥',desc:'发布 3 条打卡视频，解锁会员体验卡'},
 {id:'b5',name:'环球达人',need:10,icon:'🌍',desc:'累计打卡 10 次，解锁定制行李牌'},
 {id:'b6',name:'同城之光',need:1,icon:'🏆',desc:'进入同城打卡榜 TOP10'}
];
const RANK_NATION=[
 {u:'山河旅行社',n:128},{u:'极光猎人',n:96},{u:'海岛控Mia',n:87},{u:'背包十年',n:76},
 {u:'摄影老炮',n:71},{u:'青柠汽水',n:64},{u:'午夜东京',n:58},{u:'城墙根',n:52},
 {u:'浪花日记',n:47},{u:'云海常客',n:43}
];
const RANK_CITY={
 '北京':[{u:'城墙根',n:52},{u:'胡同串子',n:31},{u:'京味老炮',n:27},{u:'五道口浪人',n:19},{u:'故宫守夜人',n:15}],
 '上海':[{u:'霓虹漫步',n:44},{u:'武康路常客',n:28},{u:'外滩教授',n:22},{u:'咖啡因战士',n:17},{u:'洋山港水手',n:12}],
 '广州':[{u:'芒果饭',n:39},{u:'早茶特种兵',n:25},{u:'珠江夜航员',n:20},{u:'老西关阿婆',n:14},{u:'白云山速通王',n:11}],
 '成都':[{u:'苍山雪',n:36},{u:'火锅巡礼员',n:24},{u:'熊猫饲养员',n:18},{u:'九眼桥民谣手',n:13},{u:'盖碗茶教授',n:10}]
};

/* ================= 扩展：旅行大转盘候选 ================= */
const WHEEL_POOL={
 cn:['erhai','xihu','ylw','qhh','jzg','zjj','gugong','bmy','pala','luguhu','gulangyu','huangshan','cbs','bund'],
 ab:['paris','oia','inari','senso','ice','maldives','chiangmai','mbs','ubud','gp','sagrada','dubai','queenstown','rovaniemi','cp','opera']
};
