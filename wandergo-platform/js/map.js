/* =========================================================
 * WANDERGO PLATFORM · 3D 地图引擎 map.js
 * - 保留五层真 3D 挤出效果
 * - 修复：禁用拖拽平移（用户反馈手感奇怪），改为滚轮缩放（以鼠标为焦点）+ 点击飞行
 * - 点击标点：镜头平滑飞至该点（flyTo 补间动画）
 * - 点击空白省份：飞至该省中心（china.js 自带 centroid）
 * - 顶面显示白色省份名 / 国名
 * - 已打卡目的地：金色光环 + 发光图标点亮
 * - 支持路线层（AI 规划：按 Day 分色连线 + 起点旗标）
 * 依赖：echarts 4.9 + data.js + core.js
 * ========================================================= */
const CHARTS={};let mapMode='cn';
function loadECharts(cb){
  const urls=[
   ['https://cdn.jsdelivr.net/npm/echarts@4.9.0/dist/echarts.min.js','https://unpkg.com/echarts@4.9.0/dist/echarts.min.js','https://registry.npmmirror.com/echarts/4.9.0/files/dist/echarts.min.js'],
   ['https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/js/china.js','https://unpkg.com/echarts@4.9.0/map/js/china.js','https://registry.npmmirror.com/echarts/4.9.0/files/map/js/china.js'],
   ['https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/js/world.js','https://unpkg.com/echarts@4.9.0/map/js/world.js','https://registry.npmmirror.com/echarts/4.9.0/files/map/js/world.js']
  ];
  let i=0;
  (function next(){
    if(i>=urls.length){cb(true);return}
    const list=urls[i];let j=0;
    (function tryOne(){
      if(j>=list.length){ if(i===0){cb(false);return} i++;next();return }
      const s=document.createElement('script');s.src=list[j++];
      s.onload=()=>{i++;next()};s.onerror=()=>{s.remove();tryOne()};
      document.head.appendChild(s);
    })();
  })();
}
const GEO_PAL=['#f6d186','#9fc5e8','#b7e0b2','#f2b8c6','#c9b2e8','#a2ded8','#f0c890','#8fbfe0','#e8d9a0','#b0d0a8'];
function hexShade(hex,amt){
  const n=parseInt(hex.slice(1),16);let r=n>>16,g=(n>>8)&255,b=n&255;
  const t=amt<0?0:255,p=Math.abs(amt);
  r=Math.round(r+(t-r)*p);g=Math.round(g+(t-g)*p);b=Math.round(b+(t-b)*p);
  return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
function regionColors(map){
  try{
    const feats=echarts.getMap(map).geoJson.features;
    return feats.map(f=>{
      const n=f.properties.name||'';let h=0;for(let i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))>>>0;
      const base=GEO_PAL[h%GEO_PAL.length];
      return {name:n,itemStyle:{areaColor:{type:'linear',x:0,y:0,x2:0,y2:1,
        colorStops:[{offset:0,color:hexShade(base,.3)},{offset:.55,color:base},{offset:1,color:hexShade(base,-.24)}]},
        borderColor:'rgba(255,255,255,.5)',borderWidth:1}};
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
  return {type:'effectScatter',coordinateSystem:'geo',geoIndex:4,rippleEffect:{brushType:'stroke',scale:3.4},
    symbolSize:9,itemStyle:{color:'#ff6b57',shadowBlur:12,shadowColor:'rgba(255,107,87,.7)'},
    data:list.map(s=>({name:s.n,value:[s.lng,s.lat],id:s.id})),zlevel:2};
}
function iconSeries(list,litIds){
  litIds=litIds||new Set();
  return {type:'scatter',coordinateSystem:'geo',geoIndex:4,zlevel:3,symbolSize:27,cursor:'pointer',
    emphasis:{scale:1.35},
    symbol:(v,p)=>litIds.has(p.data.id)?litIconURL(ICO[p.data.id]||'📍'):mkIcon(ICO[p.data.id]||'📍'),
    data:list.map(s=>({name:s.n,value:[s.lng,s.lat],id:s.id}))};
}
/* 点亮金环涟漪层 */
function litSeries(list,litIds){
  litIds=litIds||new Set();
  const data=list.filter(s=>litIds.has(s.id)).map(s=>({name:s.n,value:[s.lng,s.lat],id:s.id}));
  return {type:'effectScatter',coordinateSystem:'geo',geoIndex:4,zlevel:2.5,rippleEffect:{brushType:'stroke',scale:5.2,period:3.2},
    symbolSize:16,itemStyle:{color:'#ffd76a',shadowBlur:22,shadowColor:'rgba(255,205,88,.9)'},
    data,z:5};
}
function lineSeries(list){
  return {type:'lines',coordinateSystem:'geo',geoIndex:4,zlevel:1,
    effect:{show:true,period:4.2,trailLength:.55,symbol:'arrow',symbolSize:5,color:'#f0d488'},
    lineStyle:{color:'#e7c76d',width:1.1,opacity:.32,curveness:.28},
    data:list.map(s=>({coords:[[116.40,39.90],[s.lng,s.lat]],id:s.id}))};
}
function baseGeo(map){
  return {map:map,roam:'scale',scaleLimit:{min:.8,max:8},   /* 仅滚轮缩放，禁拖拽平移 */
    zoom:map==='china'?1.18:1.06,center:map==='china'?[104.5,36.5]:[8,26],
    layoutCenter:['50%','50%'],layoutSize:'88%'};
}
/* 真 3D：4 层侧壁由深到浅向下挤出 + 顶面白色地名标注 */
function geoLayers(map,opts){
  opts=opts||{};
  map=map==='cn'?'china':map;   /* ECharts 注册名：china.js → 'china'，world.js → 'world' */
  const top=baseGeo(map);
  top.regions=regionColors(map);
  top.itemStyle={areaColor:'rgba(126,146,200,.12)',borderColor:'rgba(255,255,255,.55)',borderWidth:1,shadowColor:'rgba(0,0,0,.4)',shadowBlur:12,shadowOffsetY:6};
  top.emphasis={label:{show:false},itemStyle:{areaColor:'rgba(255,220,130,.45)'}};
  /* 白色省份名 / 国名（用户需求：地图上要能看清「新疆」「山西」等） */
  top.label={show:opts.labelShow!==false,color:'#ffffff',fontWeight:600,
    fontSize:map==='china'?10:8,opacity:.92,
    textBorderColor:'rgba(8,14,28,.78)',textBorderWidth:2,
    padding:[2,4],textShadowColor:'rgba(0,0,0,.55)',textShadowBlur:4};
  const SIDES=[{y:52.9,c:'#0c1424'},{y:52.2,c:'#111d36'},{y:51.5,c:'#182747'},{y:50.8,c:'#203154'}];
  const arr=SIDES.map(s=>{
    const g=JSON.parse(JSON.stringify(top));
    g.regions=[];g.silent=true;g.emphasis={label:{show:false}};g.label={show:false};
    g.layoutCenter=['50%',s.y+'%'];
    g.itemStyle={areaColor:s.c,borderColor:'rgba(0,0,0,.4)',borderWidth:1,shadowColor:'rgba(0,0,0,.5)',shadowBlur:18,shadowOffsetY:12};
    return g;
  });
  arr.push(top);return arr;
}
/* ================= 镜头飞行（五层同步补间） ================= */
function flyTo(chart,target,targetZoom,dur){
  dur=dur||950;
  const o=chart.getOption(),top=o.geo&&o.geo[o.geo.length-1];if(!top)return;
  const fromC=(top.center&&top.center[0]!=null)?top.center.slice():[104.5,36.5];
  const fromZ=top.zoom||1;
  const t0=performance.now();
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  function frame(now){
    const k=Math.min(1,(now-t0)/dur),e=ease(k);
    const c=[fromC[0]+(target[0]-fromC[0])*e,fromC[1]+(target[1]-fromC[1])*e];
    const z=fromZ+(targetZoom-fromZ)*e;
    chart.setOption({geo:o.geo.map(()=>({center:c,zoom:z}))},{notMerge:false,lazyUpdate:true});
    if(k<1)requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
function syncMapGeo(c){
  if(!c)return;const o=c.getOption(),t=o.geo&&o.geo[o.geo.length-1];
  c.resize();
  if(t&&t.zoom!=null)c.setOption({geo:o.geo.map(()=>({zoom:t.zoom,center:t.center}))});
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
  const series=[];
  if(opts.flights)series.push(lineSeries(opts.flights===true?(opts.spots||[]):opts.flights));
  if(opts.route)series.push(...routeSeries(opts.route));
  if(opts.spots){series.push(spotSeries(opts.spots));series.push(iconSeries(opts.spots,opts.litIds));series.push(litSeries(opts.spots,opts.litIds))}
  c.setOption({backgroundColor:'transparent',
    tooltip:{trigger:'item',backgroundColor:'rgba(15,23,42,.92)',borderColor:'rgba(231,199,109,.4)',textStyle:{color:'#fff',fontSize:12},
      formatter:p=>p.data&&p.data.id?('<b>'+p.data.name+'</b><br>'+(opts.litIds&&opts.litIds.has(p.data.id)?'✨ 已点亮 · ':'')+'点击标点查看详情'):(p.name||'')},
    geo:geoLayers(mode,opts),series});
  c.on('click',p=>{
    if(p.data&&p.data.id){ /* 标点：详情 + 镜头飞过去 */
      flyTo(c,[p.data.value[0],p.data.value[1]],Math.max(c.getOption().geo[c.getOption().geo.length-1].zoom||1,2.6));
      if(opts.onSpot)opts.onSpot(p.data.id);
    }else if(p.componentType==='geo'&&p.name){ /* 空白省份：飞到省中心 */
      try{
        const f=echarts.getMap(mode==='cn'?'china':mode).geoJson.features.find(f=>(f.properties.name||'')===p.name);
        const cp=f&&f.properties&&f.properties.cp;
        if(cp)flyTo(c,[cp[0],cp[1]],2.4);
      }catch(e){}
    }
  });
  c.on('georoam',()=>{const o=c.getOption(),t=o.geo&&o.geo[o.geo.length-1];if(!t)return;
    c.setOption({geo:o.geo.map(()=>({zoom:t.zoom,center:t.center}))})});
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
      series.push({type:'lines',coordinateSystem:'geo',geoIndex:4,zlevel:4,
        effect:{show:true,period:3.6,trailLength:.4,symbol:'arrow',symbolSize:6,color:col},
        lineStyle:{color:col,width:2.6,opacity:.85,curveness:.15},
        data:[{coords}]});
    }
  });
  if(allPts.length){
    series.push({type:'scatter',coordinateSystem:'geo',geoIndex:4,zlevel:6,symbolSize:30,cursor:'pointer',
      symbol:(v,p)=>mkIcon(ICO[p.data.id]||'📍'),
      data:allPts.map(p=>({name:p.n,value:[p.lng,p.lat],id:p.id}))});
    series.push({type:'effectScatter',coordinateSystem:'geo',geoIndex:4,zlevel:5,
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
  if(!chart)return;const o=chart.getOption(),t=o.geo&&o.geo[o.geo.length-1];if(!t)return;
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
const RT_BLUE='#3a7bfd';
const RT_MODES={
 drive:{label:'🚗 自驾/打车',speed:42,line:{color:'#3a7bfd',width:4.5,type:'solid',opacity:.95}},
 transit:{label:'🚌 公交/地铁',speed:22,line:{color:'#00a870',width:4,type:'dashed',opacity:.95}},
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
/* 区域聚焦：由全部点位 bbox 反推 center + zoom，让行程区域充满视野 */
function rtFitView(pts,mode){
  const lngs=pts.map(p=>p.lng),lats=pts.map(p=>p.lat);
  const c=[(Math.min.apply(null,lngs)+Math.max.apply(null,lngs))/2,(Math.min.apply(null,lats)+Math.max.apply(null,lats))/2];
  const spanLng=Math.max.apply(null,lngs)-Math.min.apply(null,lngs);
  const spanLat=Math.max.apply(null,lats)-Math.min.apply(null,lats);
  const span=Math.max(spanLat,spanLng*.45,.5);   /* 容器宽扁，lat 方向通常先受限 */
  const base=mode==='china'?30:120;
  const zoom=Math.min(22,Math.max(1.25,base/(span*2.4)));
  return {center:c,zoom};
}
function liteGeo(map){
  return {map:map,roam:true,scaleLimit:{min:.8,max:60},zoom:1.2,center:[104.5,36.5],
    layoutCenter:['50%','50%'],layoutSize:'88%',
    label:{show:true,color:'#9aa7ba',fontSize:9},
    itemStyle:{areaColor:'#eff3f9',borderColor:'#ffffff',borderWidth:1.2},
    emphasis:{label:{show:false},itemStyle:{areaColor:'#e2ebff'}}};
}
/**
 * 创建浅色路线图
 * opts: {segs:[{day,points:[{id,lng,lat,n}]}], stays:[{n,lng,lat,price}], eats:[{n,lng,lat,kind2}],
 *        mode:'drive', onSpot(id)}
 * 返回 {chart,setMode,setEatFilter,segs}
 */
function createLiteRouteMap(elId,mode,opts){
  opts=opts||{};
  const el=document.getElementById(elId);if(!el||!window.echarts)return null;
  const c=echarts.init(el);
  const segs=(opts.segs||[]).slice().sort((a,b)=>a.day-b.day);
  const stays=opts.stays||[],eats=opts.eats||[];
  let curMode=opts.mode||'drive',eatFilter='';
  function orderedPts(){const arr=[];segs.forEach(sg=>sg.points.forEach(p=>arr.push({...p,day:sg.day})));return arr}
  function seriesOf(){
    const series=[],m=RT_MODES[curMode]||RT_MODES.drive;
    const all=orderedPts();
    if(all.length>=2){
      series.push({type:'lines',coordinateSystem:'geo',zlevel:3,
        effect:{show:true,period:4.5,trailLength:.35,symbol:'arrow',symbolSize:7,color:m.line.color},
        lineStyle:m.line,silent:true,
        data:[{coords:all.map(p=>[p.lng,p.lat])}]});
    }
    if(all.length){
      series.push({type:'scatter',coordinateSystem:'geo',zlevel:6,symbolSize:27,cursor:'pointer',
        symbol:'circle',
        itemStyle:{color:RT_BLUE,borderColor:'#fff',borderWidth:2,shadowBlur:8,shadowColor:'rgba(58,123,253,.45)'},
        label:{show:true,position:'inside',color:'#fff',fontSize:11,fontWeight:800,
          formatter:p=>all.length===1?'🚩':(p.dataIndex===0?'起':p.dataIndex===all.length-1?'终':String(p.dataIndex))},
        data:all.map(p=>({name:p.n,value:[p.lng,p.lat],id:p.id,__rt:{kind:'spot',day:p.day}}))});
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
    if(all.length){const fit=rtFitView(all,mode);Object.assign(gOpt,{center:fit.center,zoom:fit.zoom})}
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
  }
  c.on('click',p=>{
    const r=p.data&&p.data.__rt;
    if(r&&r.kind==='spot'&&p.data.id&&opts.onSpot)opts.onSpot(p.data.id);
  });
  render();
  return {chart:c,segs:segs,
    setMode(k){curMode=k;render()},
    setEatFilter(k){eatFilter=k;render()},
    resize(){c.resize()}};
}
