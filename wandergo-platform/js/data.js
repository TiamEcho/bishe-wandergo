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
/* ================= BGM 曲库 · 文创素材库 ================= */
const BGM_LIST=[
 ['fresh','清新漫步','🌿'],['calm','宁静夜航','🌙'],['retro','复古胶片','📼'],
 ['city','城市流行','🏙️'],['jazz','慵懒爵士','🎷'],['folk','民谣旅途','🪕'],
 ['lofi','Lo-fi 陪伴','🎧'],['epic','史诗远行','🏔️'],['elect','电子律动','⚡']
];
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

const PLANS={
 '大理':{dest:'大理',days:'3 天 2 晚',budget:3000,spots:['erhai','ys','qhh'],transport:[{m:'✈️ 飞机',t:'约 3h 20m',p:'¥1,280 起',s:.92,note:'直飞大理机场'},{m:'🚄 高铁',t:'约 11h',p:'¥780 起',s:.74,note:'昆明中转'},{m:'🚗 自驾',t:'约 16h',p:'¥1,100 油费过路',s:.6,note:'沿途可玩昆明'}],
   budgetItems:[{k:'交通',v:1280,c:'--dc1'},{k:'住宿',v:840,c:'--dc2'},{k:'餐饮',v:520,c:'--dc3'},{k:'门票/体验',v:240,c:'--dc4'},{k:'其他',v:120,c:'--dc5'}],
   videos:[{t:'环海西路骑行 vlog',loc:'大理 · 洱海',imgs:['erhai','ys','ylw'],bgm:'fresh'},{t:'才村码头日出 4K',loc:'大理 · 才村',imgs:['erhai','xihu'],bgm:'calm'}],
   plogs:[{t:'湖边咖啡的一下午',img:'erhai',txt:'才村码头的下午，风把云吹得很慢。点一杯手冲，把环海西路骑到日落——这份松弛感，就是来大理的理由。'}],
   tips:'住宿选才村/龙龛码头一带，海景房提前 2 周订更便宜；电动车记得选续航 80km+。'},
 '九寨':{dest:'成都 · 九寨沟',days:'4 天 3 晚',budget:3600,spots:['jzg','bmy'],transport:[{m:'✈️ 飞机',t:'2h + 1.5h 车',p:'¥1,500 起',s:.9,note:'成都转九黄机场'},{m:'🚌 大巴',t:'约 8h',p:'¥320',s:.62,note:'直达沟口'},{m:'🚗 自驾',t:'约 7.5h',p:'¥900',s:.7,note:'川西风光在路上'}],
   budgetItems:[{k:'交通',v:1500,c:'--dc1'},{k:'住宿',v:960,c:'--dc2'},{k:'餐饮',v:600,c:'--dc3'},{k:'门票/观光车',v:430,c:'--dc4'},{k:'其他',v:110,c:'--dc5'}],
   videos:[{t:'九寨沟彩色海子混剪',loc:'阿坝 · 九寨沟',imgs:['jzg','qhh'],bgm:'fresh'},{t:'成都 24 小时吃播',loc:'成都',imgs:['panda'],bgm:'retro'}],
   plogs:[{t:'高原上的一天',img:'jzg',txt:'早上七点进沟抢第一批观光车，五彩池在阳光下蓝得不真实。记得带巧克力，海拔面前糖分是正义。'}],
   tips:'沟口住宿最方便；早晚温差 15℃+，冲锋衣必带；门票提前 3 天在官方公众号预约。'},
 '日本':{dest:'东京 · 京都',days:'6 天 5 晚',budget:12000,spots:['senso','inari','mbs'],transport:[{m:'✈️ 直飞',t:'约 3h',p:'¥2,600 起',s:.94,note:'上海/北京出发'},{m:'🚄 新干线',t:'2h 15m',p:'¥550',s:.86,note:'东京-京都'},{m:'🚇 地铁周游券',t:'—',p:'¥160/天',s:.8,note:'市内通勤'}],
   budgetItems:[{k:'机票',v:2600,c:'--dc1'},{k:'住宿',v:4200,c:'--dc2'},{k:'餐饮',v:2200,c:'--dc3'},{k:'交通',v:1500,c:'--dc4'},{k:'购物/其他',v:1500,c:'--dc5'}],
   videos:[{t:'京都千本鸟居漫步',loc:'京都 · 伏见稻荷',imgs:['inari','senso'],bgm:'calm'},{t:'东京霓虹夜行记',loc:'东京 · 涩谷',imgs:['shibuya','mbs'],bgm:'retro'}],
   plogs:[{t:'红叶季的京都清晨',img:'inari',txt:'六点半的伏见稻荷几乎没有人，朱红鸟居在晨光里一路向上。山腰的小茶屋卖现烤麻糬，比任何网红店都好吃。'}],
   tips:'办日本签证需 10 个工作日；现金+微信双备；ICOCA 卡关西通用；红叶季住宿提前 1 个月。'},
 '巴黎':{dest:'巴黎',days:'5 天 4 晚',budget:20000,spots:['paris'],transport:[{m:'✈️ 直飞',t:'约 11h',p:'¥6,800 起',s:.88,note:'国内直飞 CDG'},{m:'🚇 地铁 Navigo',t:'周卡',p:'¥240',s:.85,note:'市内全通'},{m:'🚲 Vélib 共享单车',t:'按次',p:'¥15',s:.7,note:'塞纳河畔骑行'}],
   budgetItems:[{k:'机票',v:6800,c:'--dc1'},{k:'住宿',v:7200,c:'--dc2'},{k:'餐饮',v:3200,c:'--dc3'},{k:'门票/博物馆通票',v:1600,c:'--dc4'},{k:'交通/其他',v:1200,c:'--dc5'}],
   videos:[{t:'塞纳河黄昏航拍',loc:'巴黎 · 埃菲尔铁塔',imgs:['paris'],bgm:'calm'}],
   plogs:[{t:'左岸咖啡与铁塔的整点闪灯',img:'paris',txt:'战神广场的草坪上野餐等闪灯，九点整铁塔真的会bling bling。博物馆通票排队能省两小时。'}],
   tips:'申根签证材料早备；地铁防扒手；博物馆通票 4 日票最划算；周日很多店休息。'},
 '冰岛':{dest:'冰岛环岛',days:'7 天 6 晚',budget:25000,spots:['ice'],transport:[{m:'✈️ 转机',t:'约 17h',p:'¥8,500 起',s:.8,note:'北欧中转'},{m:'🚗 租车 SUV',t:'全程',p:'¥6,000/周',s:.92,note:'环岛必备'},{m:'🚌 一日游巴士',t:'按线路',p:'¥600/条',s:.65,note:'不想自驾可选'}],
   budgetItems:[{k:'机票',v:8500,c:'--dc1'},{k:'租车+油费',v:7000,c:'--dc2'},{k:'住宿',v:6000,c:'--dc3'},{k:'蓝湖/项目',v:2200,c:'--dc4'},{k:'餐饮/其他',v:1300,c:'--dc5'}],
   videos:[{t:'极光延时摄影',loc:'冰岛 · 黄金圈',imgs:['ice','qhh'],bgm:'calm'}],
   plogs:[{t:'在世界尽头追光',img:'ice',txt:'晚上十点，向导突然熄了车灯——绿色的光带在头顶舞了二十分钟。冰岛教会我：计划和运气各占一半。'}],
   tips:'秋冬必须租 SUV；极光预报App 每天看；超市自炊省一半餐费；蓝湖需提前订时段。'},
 '三亚':{dest:'三亚',days:'4 天 3 晚',budget:4500,spots:['ylw'],transport:[{m:'✈️ 飞机',t:'约 3h',p:'¥1,600 起',s:.9,note:'多城市直飞'},{m:'🚗 租车',t:'全程',p:'¥1,200',s:.82,note:'海棠湾-亚龙湾方便'},{m:'🚕 打车',t:'按次',p:'¥60-150',s:.7,note:'市内灵活'}],
   budgetItems:[{k:'机票',v:1600,c:'--dc1'},{k:'酒店(海景)',v:1500,c:'--dc2'},{k:'餐饮/海鲜',v:800,c:'--dc3'},{k:'潜水/项目',v:450,c:'--dc4'},{k:'交通/其他',v:150,c:'--dc5'}],
   videos:[{t:'亚龙湾航拍日落',loc:'三亚 · 亚龙湾',imgs:['ylw','erhai'],bgm:'fresh'}],
   plogs:[{t:'椰林、沙滩和一个什么都不做的下午',img:'ylw',txt:'亚龙湾的沙真的细，赤脚走不硌脚。海鲜加工店自己买比店里的便宜一半，记得看秤。'}],
   tips:'旺季机票酒店提前 3 周；防晒 50+ 必备；海鲜去第一市场自选加工；免税店最后一天再去买。'},
 '张家界':{dest:'张家界',days:'4 天 3 晚',budget:3200,spots:['zjj','huangshan','greatwall'],transport:[{m:'✈️ 飞机',t:'约 2.5h',p:'¥1,100 起',s:.88,note:'直飞张家界荷花机场'},{m:'🚄 高铁',t:'约 6.5h',p:'¥640 起',s:.82,note:'长沙中转很顺'},{m:'🚌 大巴',t:'约 9h',p:'¥300',s:.58,note:'预算之选'}],
   budgetItems:[{k:'交通',v:1100,c:'--dc1'},{k:'住宿(武陵源)',v:920,c:'--dc2'},{k:'餐饮',v:560,c:'--dc3'},{k:'门票/索道',v:500,c:'--dc4'},{k:'其他',v:120,c:'--dc5'}],
   videos:[{t:'袁家界云海延时',loc:'张家界 · 武陵源',imgs:['zjj','huangshan'],bgm:'fresh'},{t:'玻璃桥挑战实录',loc:'张家界 · 大峡谷',imgs:['zjj','greatwall'],bgm:'retro'}],
   plogs:[{t:'阿凡达的悬浮山找到了',img:'zjj',txt:'早上进袁家界时云雾未散，石柱从云里冒出来的一瞬间真的会失语。山上猴群凶，零食藏好！'}],
   tips:'四日票足够玩遍核心景区；住武陵源门口最方便；天门山要单独买票且提前订 A 线；雨后一天云海概率最高。'},
 '清迈':{dest:'清迈',days:'5 天 4 晚',budget:5500,spots:['chiangmai','gp','ubud'],transport:[{m:'✈️ 直飞',t:'约 3.5h',p:'¥2,200 起',s:.9,note:'广州/昆明直飞多'},{m:'🛵 摩托车',t:'全程',p:'¥80/天',s:.85,note:'古城代步神器'},{m:'🚐 双条车',t:'按次',p:'¥6-10',s:.7,note:'招手即停'}],
   budgetItems:[{k:'机票',v:2200,c:'--dc1'},{k:'住宿',v:1400,c:'--dc2'},{k:'餐饮/夜市',v:800,c:'--dc3'},{k:'厨房课程/大象营',v:700,c:'--dc4'},{k:'交通/其他',v:400,c:'--dc5'}],
   videos:[{t:'清迈古城的一天',loc:'清迈 · 契迪龙寺',imgs:['chiangmai','gp'],bgm:'calm'},{t:'丛林飞跃全程记录',loc:'清迈 · 湄林',imgs:['ubud','chiangmai'],bgm:'fresh'}],
   plogs:[{t:'周日夜市的人间烟火',img:'chiangmai',txt:'从塔佩门一路吃到古城另一头，芒果糯米饭 20 块，按摩 40 块一小时。清迈的成本结构对钱包极其友好。'}],
   tips:'11-2 月凉季最舒服；寺庙进殿要过膝；泰北菜偏辣可以要求 not spicy；办落地签备好现金和照片。'},
 '马尔代夫':{dest:'马尔代夫',days:'5 天 4 晚',budget:18000,spots:['maldives','ylw','oia'],transport:[{m:'✈️ 直飞',t:'约 8h',p:'¥6,500 起',s:.92,note:'多城市直飞马累'},{m:'🚤 快艇上岛',t:'20-60min',p:'含在套餐',s:.88,note:'近距环礁'},{m:'🚁 水上飞机',t:'20-40min',p:'¥2,000 起',s:.95,note:'远景看环礁超值'}],
   budgetItems:[{k:'机票',v:6500,c:'--dc1'},{k:'度假村(一价全包)',v:8500,c:'--dc2'},{k:'上岛交通',v:1500,c:'--dc3'},{k:'出海项目',v:1000,c:'--dc4'},{k:'小费/其他',v:500,c:'--dc5'}],
   videos:[{t:'水上屋清晨航拍',loc:'马尔代夫 · 北马累环礁',imgs:['maldives','ylw'],bgm:'calm'},{t:'与鲸鲨同游',loc:'马尔代夫 · 南阿里环礁',imgs:['maldives','oia'],bgm:'fresh'}],
   plogs:[{t:'推开房门就是泻湖',img:'maldives',txt:'浮潜一次看到 4 只海龟 1 只礁鲨。一价全包真的省心，冰箱饮料随便拿，落日巡航配香槟是标配。'}],
   tips:'一价全包比半包省心也更省；选带浮梯的房型；淡季 5-10 月价格低 30%；自带浮潜面镜更卫生。'}
};

/* ================= 扩展：AI 方案增强数据（出发地/路线/备案/人群/自驾里程） ================= */
Object.assign(PLANS['大理'],{
 from:'上海',dist:2300,routeDays:[['erhai'],['ys'],['qhh']],
 planB:{rain:'下雨改走室内：大理床单厂艺术区 + 喜洲匠志集扎染博物馆；洱海边咖啡馆躲雨也很出片。',rest:'才村码头「海豚阿德书店」/ 环海西路中途「云水花田」咖啡馆，落地窗看海歇脚。',lazy:'不想环海骑行就改乘电动摆渡车，或干脆订海景房躺平看云。'},
 crowd:{kid:'环海骑行选亲子双人车并戴好头盔；苍山索道海拔较高，给娃备薄外套。',elder:'古城石板路多，建议舒适运动鞋、放缓节奏；高反风险低但别赶行程。',couple:'龙龛码头日出 + 理想邦拍照，包一辆电动车环海最出片。'}});
Object.assign(PLANS['九寨'],{
 from:'成都',dist:400,routeDays:[['jzg'],['bmy']],
 planB:{rain:'雨天改看《九寨·藏谜》演出，或回藏家客栈围炉喝酥油茶。',rest:'沟口游客中心休息区有热饮和氧气吧，走累了先回撤休息。',lazy:'体力不足就只走树正寨—诺日朗瀑布精华段，其余坐观光车看窗外的海子。'},
 crowd:{kid:'高原河谷早晚冷，儿童备抓绒衣；栈道湿滑请牵好手。',elder:'景区海拔 2000-3100m，老人行前查血压、备便携氧气，勿剧烈行走。',couple:'五彩池清晨人少光美，适合牵手慢拍。'}});
Object.assign(PLANS['日本'],{
 from:'上海',dist:450,routeDays:[['senso','mbs'],['inari']],
 planB:{rain:'雨天首选 teamLab 无界美术馆 / 京都铁道博物馆，室内遛一天不亏。',rest:'涩谷「蔦屋书店」、京都东山 % Arabica 咖啡，坐下来歇脚看街景。',lazy:'买一张地铁一日券，挑两三家咖啡店慢慢晃，也是旅行。'},
 crowd:{kid:'迪士尼与 JR 儿童票规则提前查；日本商场母婴室完善。',elder:'地铁楼梯多，优先乘电梯；刷 ICOCA 老人卡有折扣。',couple:'鸭川河岸散步 + 先斗町居酒屋是经典夜景路线。'}});
Object.assign(PLANS['巴黎'],{
 from:'上海',dist:60,routeDays:[['paris']],
 planB:{rain:'雨天正好逛卢浮宫 / 奥赛室内馆，排队的人反而更少。',rest:'花神咖啡馆一杯热巧、卢森堡公园长椅，都是标准巴黎式休息。',lazy:'买博物馆通票挑 2-3 个精华馆，其余时间塞纳河边发呆。'},
 crowd:{kid:'铁塔草坪与塞纳河边适合遛娃；国立博物馆 18 岁以下免费。',elder:'地铁注意防扒，老人建议打车；大馆均有轮椅租借。',couple:'蒙马特高地日落 + 艺术桥挂锁是必做清单。'}});
Object.assign(PLANS['冰岛'],{
 from:'雷克雅未克',dist:1330,routeDays:[['ice']],
 planB:{rain:'天气差就改蓝湖温泉 / 冰岛国家博物馆，极光等 KP 指数高再追。',rest:'环岛 1 号公路沿途 N1 加油站都有热狗和咖啡，随停随歇。',lazy:'只玩黄金圈 + 蓝湖短线，不硬环岛。'},
 crowd:{kid:'黄金圈步道有护栏，孩子注意防风保暖；地热区别越界。',elder:'租 SUV 选自动挡+加热座椅；夜间驾驶交给年轻同伴。',couple:'极光玻璃屋躺着看光带，是顶配浪漫。'}});
Object.assign(PLANS['三亚'],{
 from:'广州',dist:850,routeDays:[['ylw']],
 planB:{rain:'雨天改逛国际免税城 + 亚特兰蒂斯水族馆，室内也精彩。',rest:'亚龙湾酒店大堂吧、第一市场一杯老盐柠檬水。',lazy:'酒店私享沙滩躺平一天，也是度假的一部分。'},
 crowd:{kid:'亚龙湾浪小适合娃玩水；全程防晒 50+、及时补涂。',elder:'海鲜选清蒸少辣；酒店备常用药，附近医院距离远。',couple:'日落帆船 + 海棠湾沙滩酒吧。'}});
Object.assign(PLANS['张家界'],{
 from:'长沙',dist:320,routeDays:[['zjj']],
 planB:{rain:'雨后恰是云海概率最高的时候，坐百龙天梯上山看云瀑更值。',rest:'武陵源标志门游客中心、溪布街小吃街歇脚。',lazy:'只走袁家界精华环线，其余全靠观光车接驳。'},
 crowd:{kid:'山上猴群会抢食，零食收好；恐高的娃慎选玻璃桥。',elder:'台阶多，多坐索道与百龙天梯；山里温差大备外套。',couple:'大峡谷玻璃桥 + 夜看《魅力湘西》。'}});
Object.assign(PLANS['清迈'],{
 from:'广州',dist:150,routeDays:[['chiangmai'],['gp']],
 planB:{rain:'雨季下午常有阵雨：上午排寺庙，下午改泰式烹饪课 / 按摩。',rest:'宁曼路 Ristr8to 咖啡、古城 The Baristro，冰拿铁续命。',lazy:'双条车环古城一圈，塔佩门喂鸽子。'},
 crowd:{kid:'大象营选「观察型」营地；夜市人多牵好手。',elder:'寺庙进殿过膝，备一条纱笼；双条车谈好价再上车。',couple:'周日夜市 + 11 月天灯节是顶配浪漫。'}});
Object.assign(PLANS['马尔代夫'],{
 from:'上海',dist:0,routeDays:[['maldives']],
 planB:{rain:'降雨多为一阵：改做水疗 Spa / 水上中心浮潜课。',rest:'水屋露台吊床 + 无边泳池，躺着等雨停。',lazy:'一价全包躺玩：三餐+酒水+浮潜全含。'},
 crowd:{kid:'儿童俱乐部可托管；浮潜必须穿救生衣。',elder:'水上屋栈道防滑；选带私人泳池的沙屋更稳妥。',couple:'落日巡航 + 沙滩私宴，提前 2 天预订。'}});

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
