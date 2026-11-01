/* =========================================================
 * WANDERGO PLATFORM · 环球地图引擎 map.js
 * - 手帐风（journal / scrapbook）平面地图：单层 geo，彻底去掉「伪 3D」四层堆叠
 * - 性能：只有 1 个 geo 图层，滚轮缩放不再重绘 10 层
 * - 手绘小山纹样按真实高程感铺在西部地形区，东部平原留白
 * - 点击标点：镜头平滑飞至该点（flyTo 补间动画）
 * - 点击空白省份：飞至该省中心（china.js 自带 centroid）
 * - 已打卡目的地：金色印章 + 光环点亮
 * 依赖：echarts 4.9 + data.js + core.js
 * ========================================================= */
const CHARTS={};let mapMode='cn';
/* 底图与 ECharts 本体已内置到 js/lib/。
 * 远端 CDN 在部分网络环境（含国内直连 / 代理异常）会长时间挂起，此时
 * 原来的「只试远端」逻辑会让 createWanderMap 永远拿不到 echarts，
 * 地图画布保持空白。现在本地优先，CDN 只作为兜底。 */
function loadECharts(cb){
  const urls=[
   ['js/lib/echarts.min.js','https://cdn.jsdelivr.net/npm/echarts@4.9.0/dist/echarts.min.js','https://unpkg.com/echarts@4.9.0/dist/echarts.min.js'],
   ['js/lib/china.js','https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/js/china.js','https://unpkg.com/echarts@4.9.0/map/js/china.js'],
   ['js/lib/world.js','https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/js/world.js','https://unpkg.com/echarts@4.9.0/map/js/world.js']
  ];
  let i=0;
  (function next(){
    if(i>=urls.length){cb(true);return}
    const list=urls[i];let j=0;
    (function tryOne(){
      if(j>=list.length){ if(i===0){cb(false);return} i++;next();return }
      const src=list[j++];
      const s=document.createElement('script');
      /* 单个源挂起 8 秒就换下一个，避免代理卡死时整页空白 */
      const timer=setTimeout(()=>{s.onload=null;s.onerror=null;s.remove();tryOne()},8000);
      s.src=src;
      s.onload=()=>{clearTimeout(timer);i++;next()};
      s.onerror=()=>{clearTimeout(timer);s.remove();tryOne()};
      document.head.appendChild(s);
    })();
  })();
}
/* 手帐风配色：米黄纸张 + 低饱和的莫兰迪色块，和站点深色底 / 金色主色能共存 */
const GEO_PAL=['#e8d5b7','#cfe0d8','#f0d8c8','#d8dcb8','#e6d6e8','#c8dce8','#f2e0b8','#d4c8b0','#cfe4d4','#e8ccc8'];
/* 手帐风的纸面底色 */
const PAPER={bg:'#f7f1e3',land:'#efe4cd',line:'#c9b79a',ink:'#6b5c47'};
function hexShade(hex,amt){
  const n=parseInt(hex.slice(1),16);let r=n>>16,g=(n>>8)&255,b=n&255;
  const t=amt<0?0:255,p=Math.abs(amt);
  r=Math.round(r+(t-r)*p);g=Math.round(g+(t-g)*p);b=Math.round(b+(t-b)*p);
  return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
/* 单层平面着色：每个省一个纯色块（不用逐省渐变，重绘成本从 34 个 gradient 降到 34 个颜色） */
function regionColors(map){
  try{
    const feats=echarts.getMap(map).geoJson.features;
    return feats.map(f=>{
      const n=f.properties.name||'';let h=0;for(let i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))>>>0;
      const base=GEO_PAL[h%GEO_PAL.length];
      return {name:n,itemStyle:{areaColor:base}};
    });
  }catch(e){return []}
}
/* ---- 图标（普通 / 点亮金圈发光版） ---- */
function mkIcon(ch){
  return 'image://data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><text x="32" y="46" font-size="38" text-anchor="middle">'+ch+'</text></svg>');
}
function litIconURL(ch){
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72">'
   +'<circle cx="36" cy="36" r="26" fill="rgba(255,205,88,.22)"/>'
   +'<circle cx="36" cy="36" r="19" fill="rgba(255,196,64,.45)" stroke="#ffd76a" stroke-width="3"/>'
   +'<text x="36" y="50" font-size="36" text-anchor="middle">'+ch+'</text></svg>';
  return 'image://data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function spotSeries(list,litIds){
  return {type:'effectScatter',coordinateSystem:'geo',geoIndex:0,rippleEffect:{brushType:'stroke',scale:3.4},
    symbolSize:9,itemStyle:{color:'#ff6b57',shadowBlur:12,shadowColor:'rgba(255,107,87,.7)'},
    data:list.map(s=>({name:s.n,value:[s.lng,s.lat],id:s.id})),zlevel:2};
}
function iconSeries(list,litIds){
  litIds=litIds||new Set();
  return {type:'scatter',coordinateSystem:'geo',geoIndex:0,zlevel:3,symbolSize:27,cursor:'pointer',
    emphasis:{scale:1.35},
    symbol:(v,p)=>litIds.has(p.data.id)?litIconURL(ICO[p.data.id]||'📍'):mkIcon(ICO[p.data.id]||'📍'),
    data:list.map(s=>({name:s.n,value:[s.lng,s.lat],id:s.id}))};
}
/* 点亮金环涟漪层 */
function litSeries(list,litIds){
  litIds=litIds||new Set();
  const data=list.filter(s=>litIds.has(s.id)).map(s=>({name:s.n,value:[s.lng,s.lat],id:s.id}));
  return {type:'effectScatter',coordinateSystem:'geo',geoIndex:0,zlevel:2.5,rippleEffect:{brushType:'stroke',scale:5.2,period:3.2},
    symbolSize:16,itemStyle:{color:'#ffd76a',shadowBlur:22,shadowColor:'rgba(255,205,88,.9)'},
    data,z:5};
}
function lineSeries(list){
  return {type:'lines',coordinateSystem:'geo',geoIndex:0,zlevel:1,
    effect:{show:true,period:4.2,trailLength:.55,symbol:'arrow',symbolSize:5,color:'#f0d488'},
    lineStyle:{color:'#e7c76d',width:1.1,opacity:.32,curveness:.28},
    data:list.map(s=>({coords:[[116.40,39.90],[s.lng,s.lat]],id:s.id}))};
}
/* ================= 手帐风平面地图：单层 geo =================
 * 旧实现用 4 个侧壁层 + 顶面叠出「纵深」，本质是平面图层上下位移（伪 3D），
 * 且每次 georoam 要对 10 个 geo 同步 setOption，缩放必然卡。
 * 现在只保留 1 层：纸面底色 + 莫兰迪色块 + 虚线省界 + 手写体地名。 */
function baseGeo(map){
  return {map:map,roam:'scale',scaleLimit:{min:.8,max:8},
    zoom:map==='china'?1.18:1.06,center:map==='china'?[104.5,36.5]:[8,26],
    layoutCenter:['50%','50%'],layoutSize:'88%'};
}
function geoLayers(map,opts){
  opts=opts||{};
  map=map==='cn'?'china':map;
  const g=baseGeo(map);
  g.regions=regionColors(map);
  g.itemStyle={
    areaColor:PAPER.land,
    borderColor:'rgba(140,118,88,.62)',
    borderWidth:1,
    borderType:'dashed',
    shadowColor:'rgba(120,98,70,.20)',
    shadowBlur:10,
    shadowOffsetY:3
  };
  g.emphasis={label:{show:false},itemStyle:{areaColor:'#f7e6b8'}};
  /* 省份名：手写感的棕色，带纸白描边，像贴在手帐上的标签 */
  g.label={show:opts.labelShow!==false,color:PAPER.ink,fontWeight:600,
    fontFamily:'"Kaiti SC","STKaiti",KaiTi,"Songti SC",serif',
    fontSize:map==='china'?10.5:8.5,opacity:.95,
    textBorderColor:'rgba(255,252,244,.92)',textBorderWidth:2.5};
  return [g];
}
/* ---- 手绘小山：用 geo 坐标系上的 scatter 铺点，按「西部多山、东部平原」分布 ----
 * 参考真实地形：青藏 / 新疆 / 四川西部 / 云贵为山区，华北平原、长江中下游留白。
 * 每个点是 SVG 小三角山，带雪顶和手绘抖动感。 */
const MOUNTAIN_BELTS=[
  /* [经度, 纬度, 半径(度), 数量, 类型]  类型: snow=雪山  hill=丘陵 */
  [ 98.0, 33.5, 8.5, 26,'snow'],   /* 青藏高原 */
  [ 88.0, 41.5, 6.0, 12,'snow'],   /* 天山 */
  [102.5, 31.0, 4.2, 12,'snow'],   /* 川西雪山 */
  [103.0, 26.5, 3.6, 10,'hill'],   /* 云贵高原 */
  [111.5, 24.8, 2.6,  7,'hill'],   /* 南岭 */
  [113.5, 37.5, 2.2,  6,'hill'],   /* 太行山 */
  [107.5, 34.2, 2.4,  6,'hill'],   /* 秦岭 */
  [127.5, 42.5, 3.0,  5,'hill']    /* 长白山地 */
];
const MT_SVG_SNOW='<svg xmlns="http://www.w3.org/2000/svg" width="40" height="34">'
 +'<path d="M20 3 L34 30 L6 30 Z" fill="#d9c9ac" stroke="#a8906e" stroke-width="1.4" stroke-linejoin="round"/>'
 +'<path d="M20 3 L25.5 14 L22.5 12 L19.5 15.5 L16 12.5 L14.5 14 Z" fill="#fdfaf2" stroke="#a8906e" stroke-width=".8" stroke-linejoin="round"/>'
 +'</svg>';
const MT_SVG_HILL='<svg xmlns="http://www.w3.org/2000/svg" width="34" height="26">'
 +'<path d="M17 4 C22 4 30 20 30 22 L4 22 C4 20 12 4 17 4 Z" fill="#cdd9bd" stroke="#9aa886" stroke-width="1.3" stroke-linejoin="round"/>'
 +'</svg>';
function mtIcon(kind){
  return 'image://data:image/svg+xml;charset=utf-8,'+encodeURIComponent(kind==='snow'?MT_SVG_SNOW:MT_SVG_HILL);
}
/* 伪随机（固定种子，保证每次渲染山的位置一样，不会刷新就换山） */
function mtRand(seed){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
function mountainData(){
  const out=[];
  let seed=20261101;
  MOUNTAIN_BELTS.forEach(([lng,lat,r,cnt,kind])=>{
    const rnd=mtRand(seed+=7919);
    for(let i=0;i<cnt;i++){
      /* 极坐标撒点 + 向内偏置，避免均匀铺满显得机械 */
      const a=rnd()*Math.PI*2, d=Math.sqrt(rnd())*r*.92;
      const lng2=lng+Math.cos(a)*d*1.25, lat2=lat+Math.sin(a)*d*.82;
      out.push({value:[+lng2.toFixed(3),+lat2.toFixed(3)],kind,
        symbolSize:kind==='snow'?14+rnd()*12:10+rnd()*8});
    }
  });
  return out;
}
function mountainSeries(){
  const d=mountainData();
  return [
    {type:'scatter',coordinateSystem:'geo',zlevel:0,silent:true,
      symbol:(v,p)=>mtIcon(p.data.kind),
      symbolSize:(v,p)=>p.data.symbolSize,
      itemStyle:{opacity:.52},
      data:d.filter(x=>x.kind==='snow')},
    {type:'scatter',coordinateSystem:'geo',zlevel:0,silent:true,
      symbol:(v,p)=>mtIcon(p.data.kind),
      symbolSize:(v,p)=>p.data.symbolSize,
      itemStyle:{opacity:.45},
      data:d.filter(x=>x.kind==='hill')}
  ];
}
/* ---- 手帐装饰：云朵 / 太阳 / 罗盘，放在海域和空白处 ---- */
const DECOR_SVG={
  cloud:'<svg xmlns="http://www.w3.org/2000/svg" width="54" height="30"><path d="M12 24 C4 24 4 14 12 14 C12 6 24 4 27 12 C32 8 42 12 41 20 C47 20 47 24 41 24 Z" fill="#fdfaf2" stroke="#c9b79a" stroke-width="1.2" stroke-linejoin="round"/></svg>',
  sun:'<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="9" fill="#f3d98b" stroke="#d0b05e" stroke-width="1.3"/><g stroke="#d0b05e" stroke-width="1.4" stroke-linecap="round"><line x1="20" y1="2" x2="20" y2="7"/><line x1="20" y1="33" x2="20" y2="38"/><line x1="2" y1="20" x2="7" y2="20"/><line x1="33" y1="20" x2="38" y2="20"/><line x1="7" y1="7" x2="11" y2="11"/><line x1="29" y1="29" x2="33" y2="33"/><line x1="33" y1="7" x2="29" y2="11"/><line x1="11" y1="29" x2="7" y2="33"/></g></svg>'
};
function decorIcon(k){return 'image://data:image/svg+xml;charset=utf-8,'+encodeURIComponent(DECOR_SVG[k])}
function decorSeries(mode){
  if(mode==='cn'){
    return [{type:'scatter',coordinateSystem:'geo',zlevel:0,silent:true,symbolSize:30,
      symbol:()=>decorIcon('cloud'),itemStyle:{opacity:.55},
      data:[{value:[122.5,29.5]},{value:[88.0,45.5]},{value:[127.0,44.0]}]}];
  }
  return [{type:'scatter',coordinateSystem:'geo',zlevel:0,silent:true,symbolSize:24,
    symbol:()=>decorIcon('cloud'),itemStyle:{opacity:.5},
    data:[{value:[-30,45]},{value:[10,52]},{value:[105,10]},{value:[-45,-20]}]}];
}
/* ================= 镜头飞行（单层 geo 补间） ================= */
function flyTo(chart,target,targetZoom,dur){
  dur=dur||950;
  const o=chart.getOption(),top=o.geo&&o.geo[0];if(!top)return;
  const fromC=(top.center&&top.center[0]!=null)?top.center.slice():[104.5,36.5];
  const fromZ=top.zoom||1;
  const t0=performance.now();
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  function frame(now){
    const k=Math.min(1,(now-t0)/dur),e=ease(k);
    const c=[fromC[0]+(target[0]-fromC[0])*e,fromC[1]+(target[1]-fromC[1])*e];
    const z=fromZ+(targetZoom-fromZ)*e;
    chart.setOption({geo:{center:c,zoom:z}},{notMerge:false,lazyUpdate:true,silent:true});
    if(k<1)requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
function syncMapGeo(c){
  if(!c)return;const o=c.getOption(),t=o.geo&&o.geo[0];
  c.resize();
  if(t&&t.zoom!=null)c.setOption({geo:{zoom:t.zoom,center:t.center}});
}
WGO.onResize(()=>Object.values(CHARTS).forEach(syncMapGeo));
window.addEventListener('resize',()=>{clearTimeout(window.__winRzT);window.__winRzT=setTimeout(()=>Object.values(CHARTS).forEach(syncMapGeo),150)});
if(window.ResizeObserver){const _ro=new ResizeObserver(()=>{clearTimeout(window.__mapRzT);window.__mapRzT=setTimeout(()=>Object.values(CHARTS).forEach(syncMapGeo),160)});
  setTimeout(()=>['chinaMap','worldMap','routeMap','aiRouteMap'].forEach(id=>{const el=document.getElementById(id);if(el)_ro.observe(el)}),0);}
/* ================= 创建地图实例 ================= */
function createWanderMap(elId,mode,opts){
  opts=opts||{};
  const el=document.getElementById(elId);if(!el||!window.echarts)return null;
  const c=echarts.init(el);
  /* 装饰层（小山 / 云朵）垫在最底，标点与航线在上 */
  const series=[...(mode==='cn'||mode==='china'?mountainSeries():[]),...decorSeries(mode)];
  if(opts.flights)series.push(lineSeries(opts.flights===true?(opts.spots||[]):opts.flights));
  if(opts.route)series.push(...routeSeries(opts.route));
  if(opts.spots){series.push(spotSeries(opts.spots));series.push(iconSeries(opts.spots,opts.litIds));series.push(litSeries(opts.spots,opts.litIds))}
  c.setOption({backgroundColor:PAPER.bg,
    tooltip:{trigger:'item',backgroundColor:'rgba(250,245,233,.97)',borderColor:'rgba(201,183,154,.9)',textStyle:{color:'#6b5c47',fontSize:12},
      extraCssText:'box-shadow:0 8px 24px rgba(120,98,70,.24);border-radius:10px;',
      formatter:p=>p.data&&p.data.id?('<b>'+p.data.name+'</b><br>'+(opts.litIds&&opts.litIds.has(p.data.id)?'✨ 已点亮 · ':'')+'点击标点查看详情'):(p.name||'')},
    geo:geoLayers(mode,opts),series});
  c.on('click',p=>{
    if(p.data&&p.data.id){ /* 标点：详情 + 镜头飞过去 */
      flyTo(c,[p.data.value[0],p.data.value[1]],Math.max((c.getOption().geo[0]||{}).zoom||1,2.6));
      if(opts.onSpot)opts.onSpot(p.data.id);
    }else if(p.componentType==='geo'&&p.name){ /* 空白省份：飞到省中心 */
      try{
        const f=echarts.getMap(mode==='cn'?'china':mode).geoJson.features.find(f=>(f.properties.name||'')===p.name);
        const cp=f&&f.properties&&f.properties.cp;
        if(cp)flyTo(c,[cp[0],cp[1]],2.4);
      }catch(e){}
    }
  });
  /* 单层 geo 下 ECharts 自己维护 zoom / center，无需在 georoam 里再 setOption。
     旧代码每次滚轮都同步重绘全部 geo 层，是缩放卡顿的主因。 */
  c.__wgo={mode,opts,default:{center:(mode==='cn'||mode==='china')?[104.5,36.5]:[8,26],zoom:(mode==='cn'||mode==='china')?1.18:1.06}};
  return c;
}
/* ================= AI 路线层：按 Day 分色连线 + 起点旗标 + 顺序标号 ================= */
const DAY_COLORS=['#e7c76d','#7ea6d9','#6cc47a','#e58fb1','#9a86d9'];
function routeSeries(route){
  /* route: [{day:1,color,points:[{id,lng,lat,n}]}] */
  const series=[];
  const allPts=[];
  route.forEach((seg,di)=>{
    const col=seg.color||DAY_COLORS[di%DAY_COLORS.length];
    const coords=seg.points.map(p=>[p.lng,p.lat]);
    seg.points.forEach(p=>allPts.push({...p,day:seg.day,color:col,idx:allPts.length+1}));
    if(coords.length>=2){
      series.push({type:'lines',coordinateSystem:'geo',geoIndex:0,zlevel:4,
        effect:{show:true,period:3.6,trailLength:.4,symbol:'arrow',symbolSize:6,color:col},
        lineStyle:{color:col,width:2.6,opacity:.85,curveness:.15},
        data:[{coords}]});
    }
  });
  if(allPts.length){
    series.push({type:'scatter',coordinateSystem:'geo',geoIndex:0,zlevel:6,symbolSize:30,cursor:'pointer',
      symbol:(v,p)=>mkIcon(ICO[p.data.id]||'📍'),
      data:allPts.map(p=>({name:p.n,value:[p.lng,p.lat],id:p.id}))});
    series.push({type:'effectScatter',coordinateSystem:'geo',geoIndex:0,zlevel:5,
      rippleEffect:{brushType:'fill',scale:2.6,period:3},
      symbolSize:7,
      itemStyle:{color:allPts[0].color},
      data:allPts.map((p,i)=>({name:p.n,value:[p.lng,p.lat],id:p.id,
        label:{show:true,formatter:'D'+p.day+'-'+(i===0?'🚩':p.idx),position:'top',color:'#fff',fontSize:10,fontWeight:700,textBorderColor:'#000',textBorderWidth:2},
        itemStyle:{color:p.color}}))});
  }
  return series;
}
function zoomBy(chart,factor){
  if(!chart)return;const o=chart.getOption(),t=o.geo&&o.geo[0];if(!t)return;
  const z=Math.min(8,Math.max(.8,(t.zoom||1)*factor));
  const c=chart.__wgo&&chart.__wgo.default?chart.__wgo.default.center:[104.5,36.5];
  flyTo(chart,t.center&&t.center[0]!=null?t.center:c,z,450);
}
function resetView(chart){if(!chart)return;const d=chart.__wgo.default;flyTo(chart,d.center,d.zoom,700)}

/* ================= 浅色「百度风」路线图 liteRouteMap =================
 * 白底 + 蓝色路线 + 行程区域自动聚焦（把那一块地区单独框出来）
 * 节点：景点（起/序号/终 蓝钉，按 Day 顺序串联）+ 住宿（🏨 橙）+ 美食（🍜 绿）
 * 出行方式可切换：自驾 / 公交 / 骑行 / 步行（线型与时间估算随之变化）
 * ========================================================= */
const RT_BLUE='#2196F3';
const RT_MODES={
 drive:{label:'🚗 自驾/打车',speed:42,line:{color:'#2196F3',width:4,type:'solid',opacity:.95,shadowBlur:10,shadowColor:'rgba(33,150,243,.5)',shadowOffsetY:2}},
 transit:{label:'🚌 公交/地铁',speed:22,line:{color:'#00a870',width:4,type:'dashed',opacity:.95,shadowBlur:8,shadowColor:'rgba(0,168,112,.4)'}},
 bike:{label:'🚴 骑行',speed:14,line:{color:'#7c5cff',width:3.5,type:'dashed',opacity:.95}},
 walk:{label:'🚶 步行',speed:4.6,line:{color:'#f59e0b',width:3.5,type:'dotted',opacity:.95}}
};
function rtDist(a,b){ /* haversine 球面距离 km */
  const R=6371,dLa=(b.lat-a.lat)*Math.PI/180,dLo=(b.lng-a.lng)*Math.PI/180;
  const s=Math.sin(dLa/2)*Math.sin(dLa/2)+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLo/2)*Math.sin(dLo/2);
  return 2*R*Math.asin(Math.sqrt(s));
}
function rtStats(segs,modeKey){
  let km=0,stops=0;
  const all=[];
  segs.slice().sort((a,b)=>a.day-b.day).forEach(sg=>sg.points.forEach(p=>all.push(p)));
  stops=all.length;
  for(let i=1;i<all.length;i++)km+=rtDist(all[i-1],all[i]);
  const sp=(RT_MODES[modeKey]||RT_MODES.drive).speed,h=km/sp;
  const timeTxt=h<=0?'0 分钟':h<1?Math.max(5,Math.round(h*60))+' 分钟':h<10?(Math.round(h*10)/10)+' 小时':Math.round(h)+' 小时';
  return {km:Math.round(km*10)/10,timeTxt,stops};
}
/* 按实际容器像素拟合 geo 倍率，不使用瓦片地图的 zoom 级别。 */
function rtFitView(pts,chart){
  const lngs=pts.map(p=>p.lng),lats=pts.map(p=>p.lat);
  const center=[(Math.min(...lngs)+Math.max(...lngs))/2,(Math.min(...lats)+Math.max(...lats))/2];
  const width=chart.getWidth(),height=chart.getHeight();
  const padding=Math.min(48,width*.18,height*.18);
  let zoom=1;
  chart.setOption({geo:{center,zoom}});
  const probes=pts.concat([{lng:center[0]-.015,lat:center[1]-.015},{lng:center[0]+.015,lat:center[1]+.015}]);
  const pixels=probes.map(p=>chart.convertToPixel({geoIndex:0},[p.lng,p.lat]));
  const dx=Math.max(...pixels.map(p=>Math.abs(p[0]-width/2))),dy=Math.max(...pixels.map(p=>Math.abs(p[1]-height/2)));
  zoom=Math.min((width/2-padding)/Math.max(dx,.001),(height/2-padding)/Math.max(dy,.001))*.96;
  chart.setOption({geo:{center,zoom}});
  // 用实际路线点再次校验，确保数字标记留在内边距之内。
  for(let i=0;i<12;i++){
    const inside=pts.every(p=>{const xy=chart.convertToPixel({geoIndex:0},[p.lng,p.lat]);return xy&&Number.isFinite(xy[0])&&Number.isFinite(xy[1])&&xy[0]>=padding&&xy[0]<=width-padding&&xy[1]>=padding&&xy[1]<=height-padding});
    if(inside)break;
    zoom*=.8;chart.setOption({geo:{center,zoom}});
  }
  return {center,zoom};
}
function liteGeo(map){
  return {map:map,roam:true,zoom:1,center:map==='china'?[104.5,36.5]:[0,20],
    layoutCenter:['50%','50%'],layoutSize:'88%',
    label:{show:true,color:'#9aa7ba',fontSize:9},
    itemStyle:{areaColor:'#eff3f9',borderColor:'#ffffff',borderWidth:1.2},
    emphasis:{label:{show:false},itemStyle:{areaColor:'#e2ebff'}}};
}
/**
 * 创建浅色路线图
 * opts: {segs:[{day,points:[{id,lng,lat,n}]}], stays:[{n,lng,lat,price}], eats:[{n,lng,lat,kind2}],
 *        mode:'drive', onSpot(id), onSelect(index,id)}
 * 返回 {chart,setMode,setEatFilter,segs,select,focusRoute,resize,dispose}
 */
function createLiteRouteMap(elId,mode,opts){
  opts=opts||{};
  const el=document.getElementById(elId);if(!el||!window.echarts)return null;
  const c=echarts.init(el);
  const segs=(opts.segs||[]).slice().sort((a,b)=>a.day-b.day);
  const stays=opts.stays||[],eats=opts.eats||[];
  let curMode=opts.mode||'drive',eatFilter='',selectedIndex=-1;
  function orderedPts(){const arr=[];segs.forEach(sg=>sg.points.forEach(p=>arr.push({...p,day:sg.day})));return arr}
  function seriesOf(){
    const series=[];
    const all=orderedPts();
    if(all.length>=2){
      series.push({type:'lines',coordinateSystem:'geo',zlevel:3,polyline:true,
        effect:{show:true,period:4.5,trailLength:0,symbol:'arrow',symbolSize:8,color:RT_BLUE},
        lineStyle:{color:RT_BLUE,width:4,opacity:.95},silent:true,
        data:[{coords:all.map(p=>[p.lng,p.lat])}]});
    }
    if(all.length){
      series.push({id:'route-stops',type:'scatter',coordinateSystem:'geo',zlevel:6,cursor:'pointer',
        symbol:'circle',
        symbolSize:(value,params)=>params.dataIndex===selectedIndex?36:30,
        itemStyle:{color:RT_BLUE,borderColor:'#fff',borderWidth:2},
        emphasis:{itemStyle:{color:'#1D4ED8',borderWidth:3}},
        label:{show:true,position:'inside',color:'#fff',fontSize:12,fontWeight:800,
          formatter:p=>String(p.dataIndex+1)},
        data:all.map((p,i)=>({name:p.n,value:[p.lng,p.lat],id:p.id,__rt:{kind:'spot',day:p.day,index:i}}))});
      series.push({type:'scatter',coordinateSystem:'geo',zlevel:5,symbolSize:1,silent:true,
        label:{show:true,position:'right',distance:6,color:'#33415c',fontSize:11,fontWeight:600,
          formatter:p=>p.name,backgroundColor:'rgba(255,255,255,.85)',padding:[2,5],borderRadius:4},
        itemStyle:{color:'transparent'},
        data:all.map(p=>({name:p.n,value:[p.lng,p.lat]}))});
    }
    stays.forEach(s=>{
      series.push({type:'scatter',coordinateSystem:'geo',zlevel:5,symbolSize:24,cursor:'pointer',
        symbol:'circle',itemStyle:{color:'#ff8a3d',borderColor:'#fff',borderWidth:2,shadowBlur:7,shadowColor:'rgba(255,138,61,.5)'},
        label:{show:true,position:'inside',formatter:'🏨',fontSize:11},
        data:[{name:s.n,value:[s.lng,s.lat],__rt:{kind:'stay',price:s.price||''}}]});
      series.push({type:'scatter',coordinateSystem:'geo',zlevel:4,symbolSize:1,silent:true,
        label:{show:true,position:'bottom',distance:4,color:'#b25a1b',fontSize:10,formatter:s.n,
          backgroundColor:'rgba(255,255,255,.85)',padding:[1,4],borderRadius:4},
        itemStyle:{color:'transparent'},data:[{name:s.n,value:[s.lng,s.lat]}]});
    });
    eats.filter(e=>!eatFilter||e.kind2===eatFilter).forEach(s=>{
      series.push({type:'scatter',coordinateSystem:'geo',zlevel:5,symbolSize:22,cursor:'pointer',
        symbol:'circle',itemStyle:{color:'#22b573',borderColor:'#fff',borderWidth:2,shadowBlur:7,shadowColor:'rgba(34,181,115,.5)'},
        label:{show:true,position:'inside',formatter:'🍜',fontSize:10},
        data:[{name:s.n,value:[s.lng,s.lat],__rt:{kind:'eat',kind2:s.kind2||''}}]});
      series.push({type:'scatter',coordinateSystem:'geo',zlevel:4,symbolSize:1,silent:true,
        label:{show:true,position:'bottom',distance:4,color:'#157a4c',fontSize:10,formatter:s.n,
          backgroundColor:'rgba(255,255,255,.85)',padding:[1,4],borderRadius:4},
        itemStyle:{color:'transparent'},data:[{name:s.n,value:[s.lng,s.lat]}]});
    });
    return series;
  }
  function render(){
    const all=orderedPts().concat(stays).concat(eats);
    const gOpt=liteGeo(mode);
    c.setOption({backgroundColor:'#ffffff',
      tooltip:{trigger:'item',backgroundColor:'rgba(255,255,255,.97)',borderColor:'#d5deea',
        textStyle:{color:'#33415c',fontSize:12},extraCssText:'box-shadow:0 6px 20px rgba(30,50,90,.18);border-radius:8px;',
        formatter:p=>{
          const r=p.data&&p.data.__rt;if(!r)return p.name||'';
          if(r.kind==='spot')return '<b>D'+r.day+' · '+p.name+'</b><br>🎫 行程第 '+r.day+' 天 · '+(RT_MODES[curMode].label);
          if(r.kind==='stay')return '<b>🏨 '+p.name+'</b><br>住宿 · '+(r.price||'丰俭由人');
          if(r.kind==='eat')return '<b>🍜 '+p.name+'</b><br>'+(r.kind2||'美食');
          return p.name||'';
        }},
      geo:gOpt,series:seriesOf()},true);
    if(all.length)rtFitView(all,c);
  }
  function select(index){
    selectedIndex=index;
    c.setOption({series:[{id:'route-stops',symbolSize:(value,params)=>params.dataIndex===selectedIndex?36:30}]});
    c.dispatchAction({type:'downplay',seriesId:'route-stops'});
    c.dispatchAction({type:'highlight',seriesId:'route-stops',dataIndex:index});
  }
  c.on('click',p=>{
    const r=p.data&&p.data.__rt;
    if(r&&r.kind==='spot'){
      select(r.index);
      if(opts.onSelect)opts.onSelect(r.index,p.data.id);
      else if(p.data.id&&opts.onSpot)opts.onSpot(p.data.id);
    }
  });
  render();
  function resize(){if(c.isDisposed())return;c.resize();focusRoute()}
  function focusRoute(){const all=orderedPts().concat(stays).concat(eats);if(all.length&&!c.isDisposed())rtFitView(all,c)}
  const observer=window.ResizeObserver?new ResizeObserver(resize):null;
  if(observer)observer.observe(el);else window.addEventListener('resize',resize);
  return {chart:c,segs:segs,select,
    setMode(k){curMode=k;render()},
    setEatFilter(k){eatFilter=k;render()},
    resize,focusRoute,
    dispose(){if(observer)observer.disconnect();else window.removeEventListener('resize',resize);if(!c.isDisposed())c.dispose()}};
}
