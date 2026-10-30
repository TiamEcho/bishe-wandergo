/* =========================================================
 * WANDERGO · 首页 3D 地球（Three.js 基础版）
 * 球体 + 自动旋转 + 金色标记 + 蓝色飞线 + 点击弹窗 + 拖拽/滚轮
 * Three.js 从 CDN 引入，加载失败时回退到纯 CSS 地球
 * ========================================================= */
(function(){
  const cv=document.getElementById('globeCv'),
        stage=document.getElementById('globeSec'),
        pop=document.getElementById('gPop'),
        hint=document.getElementById('globeHint'),
        fb=document.getElementById('globeFallback');
  if(!cv||!stage) return;

  const CDNS=[
    'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js',
    'https://unpkg.com/three@0.128.0/build/three.min.js',
    'https://registry.npmmirror.com/three/0.128.0/files/build/three.min.js'
  ];
  let ci=0;
  (function load(){
    if(window.THREE){init();return}
    if(ci>=CDNS.length){fallback();return}
    const s=document.createElement('script');
    s.src=CDNS[ci++];
    s.onload=()=>window.THREE?init():load();
    s.onerror=load;
    document.head.appendChild(s);
  })();

  function fallback(){
    cv.style.display='none';
    if(fb)fb.classList.add('on');
    if(hint)hint.textContent='3D 资源加载失败，已切换为静态地球';
  }

  function init(){
    let _gtex=null;
    const W=()=>stage.clientWidth||600, H=()=>stage.clientHeight||420;

    const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.setSize(W(),H(),false);

    const scene=new THREE.Scene();
    const cam=new THREE.PerspectiveCamera(42,W()/H(),.1,100);
    cam.position.set(0,0,3.1);

    /* ---------- 灯光 ---------- */
    scene.add(new THREE.AmbientLight(0x38506e,.55));
    const dl=new THREE.DirectionalLight(0xffe2a8,.8);dl.position.set(2.2,1.6,2.4);scene.add(dl);
    const rim=new THREE.DirectionalLight(0x2f6ea8,.35);rim.position.set(-2.4,-1.2,-2.2);scene.add(rim);

    /* ---------- 地球主体 ---------- */
    const tilt=new THREE.Group();
    tilt.rotation.z=-23.4*Math.PI/180;       // 地轴倾角
    scene.add(tilt);
    const globe=new THREE.Group();
    globe.rotation.y=Math.PI;                // 初始朝向：亚洲正对镜头
    tilt.add(globe);

    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(1,64,48),
      new THREE.MeshPhongMaterial({color:0x0b1a2e,emissive:0x061020,shininess:8,specular:0x1e3d5c})
    ));
    /* 经纬网 */
    const wire=new THREE.Mesh(
      new THREE.SphereGeometry(1.003,36,24),
      new THREE.MeshBasicMaterial({color:0x2b5a8c,wireframe:true,transparent:true,opacity:.14})
    );
    globe.add(wire);

    /* ---------- 大气光晕 ---------- */
    scene.add(makeGlow());

    /* ---------- 景点标记 ---------- */
    const spots=(typeof SPOTS!=='undefined'?[...SPOTS]:[]).slice().sort((a,b)=>b.rating-a.rating).slice(0,18);
    const markers=[],mks=[];
    const geoDot=new THREE.SphereGeometry(.028,12,12);
    const matDot=new THREE.MeshBasicMaterial({color:0xffd76a,depthTest:false,depthWrite:false});
    const geoHit=new THREE.SphereGeometry(.07,8,8);
    const matHit=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
    const geoRing=new THREE.RingGeometry(.040,.058,26);
    const matRing=new THREE.MeshBasicMaterial({color:0xffd76a,transparent:true,opacity:.55,side:THREE.DoubleSide,depthTest:false,depthWrite:false});
    const posOf=s=>latLng(s.lng,s.lat,1.012);

    spots.forEach(s=>{
      const p=posOf(s);
      const dot=new THREE.Mesh(geoDot,matDot);
      dot.position.copy(p);
      dot.userData.spot=s;
      dot.renderOrder=10;
      globe.add(dot);

      /* 金色光点 */
      const gs=new THREE.Sprite(new THREE.SpriteMaterial({map:goldTex(),color:0xffd76a,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending}));
      gs.position.copy(p);gs.scale.set(.105,.105,1);gs.renderOrder=11;
      globe.add(gs);

      /* 透明放大的命中球，便于点击 */
      const hit=new THREE.Mesh(geoHit,matHit);
      hit.position.copy(p);
      hit.userData.spot=s;
      globe.add(hit);markers.push(hit);

      const ring=new THREE.Mesh(geoRing,matRing.clone());
      ring.position.copy(p);
      ring.lookAt(0,0,0);
      ring.renderOrder=9;
      globe.add(ring);
      mks.push({dot,hit,ring,glow:gs});
    });

    /* ---------- 蓝色飞线（取高分景点两两连线） ---------- */
    const arcs=[];
    for(let a=0;a<Math.min(7,spots.length);a++){
      const b=(a+3)%spots.length;
      if(a===b)continue;
      const p1=posOf(spots[a]),p2=posOf(spots[b]);
      const m=p1.clone().add(p2).multiplyScalar(.5);
      m.normalize().multiplyScalar(1.32);
      const curve=new THREE.QuadraticBezierCurve3(p1,m,p2);
      const line=new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(56)),
        new THREE.LineBasicMaterial({color:0x7fc4ff,transparent:true,opacity:.5,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending})
      );
      line.renderOrder=5;
      globe.add(line);arcs.push(line);
    }

    /* ---------- 交互：拖拽旋转 ---------- */
    let dragging=false,lastX=0,lastY=0,moved=0;
    let velY=0;
    cv.addEventListener('pointerdown',e=>{
      dragging=true;moved=0;lastX=e.clientX;lastY=e.clientY;
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove',e=>{
      if(!dragging)return;
      const dx=e.clientX-lastX,dy=e.clientY-lastY;
      lastX=e.clientX;lastY=e.clientY;moved+=Math.abs(dx)+Math.abs(dy);
      globe.rotation.y+=dx*.0052;
      globe.rotation.x+=(dy*.0035);
      globe.rotation.x=Math.max(-.6,Math.min(.6,globe.rotation.x));
      velY=dx*.004;
    });
    cv.addEventListener('pointerup',e=>{
      dragging=false;
      if(moved<6) pick(e);
    });
    cv.addEventListener('pointercancel',()=>{dragging=false});

    /* ---------- 滚轮缩放 ---------- */
    cv.addEventListener('wheel',e=>{
      e.preventDefault();
      cam.position.z=Math.max(2.2,Math.min(4.6,cam.position.z+e.deltaY*.0012));
    },{passive:false});

    /* ---------- 点击标记 → 弹窗 ---------- */
    const ray=new THREE.Raycaster();
    const ndc=new THREE.Vector2();
    function pick(e){
      const r=cv.getBoundingClientRect();
      ndc.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);
      ray.setFromCamera(ndc,cam);
      const hit=ray.intersectObjects(markers,false)[0];
      if(hit)showPop(hit.object.userData.spot);else hidePop();
    }

    let popSpot=null;
    function showPop(s){
      popSpot=s;
      pop.innerHTML=`
        <div class="gp-top"><div><div class="gp-k">${s.rg==='cn'?'中国':'海外'} · ${s.city}</div><h4>${s.n}</h4></div>
        <button class="gp-x" type="button" aria-label="关闭">✕</button></div>
        <div class="gp-meta"><span>★ ${s.rating}</span><span>${s.price}</span><span>${s.hrs}</span></div>
        <button class="gp-btn" type="button">在地图中查看 →</button>`;
      pop.classList.add('on');
      pop.querySelector('.gp-x').onclick=hidePop;
      pop.querySelector('.gp-btn').onclick=()=>WGO.go('map.html?spot='+s.id);
    }
    function hidePop(){pop.classList.remove('on');popSpot=null}
    document.addEventListener('click',e=>{
      if(pop.classList.contains('on')&&!e.target.closest('#gPop')&&!e.target.closest('#globeCv'))hidePop();
    });

    /* ---------- 尺寸 ---------- */
    function resize(){
      const w=W(),h=H();
      renderer.setSize(w,h,false);
      cam.aspect=w/h;cam.updateProjectionMatrix();
    }
    if(window.ResizeObserver)new ResizeObserver(resize).observe(stage);
    window.addEventListener('resize',resize);

    /* ---------- 渲染循环 ---------- */
    let visible=true;
    if(window.IntersectionObserver){
      new IntersectionObserver(es=>{visible=es[0].isIntersecting},{threshold:.05}).observe(stage);
    }
    const clock=new THREE.Clock();
    (function loop(){
      requestAnimationFrame(loop);
      const t=clock.getElapsedTime();
      if(!visible)return;
      if(!dragging){
        globe.rotation.y+=.0022+velY*.02;
        velY*=.94;
        if(Math.abs(velY)<1e-4)velY=0;
      }
      /* 标记：按朝向裁剪（只显示面向镜头的一侧）+ 呼吸 + 外圈脉冲 */
      const camDir=cam.position.clone().normalize();
      const vtmp=new THREE.Vector3();
      mks.forEach((m,i)=>{
        const n=m.hit.getWorldPosition(vtmp).normalize();
        const show=n.dot(camDir)>0.10;
        m.dot.visible=m.hit.visible=m.glow.visible=m.ring.visible=show;
        if(!show)return;
        const k=1+Math.sin(t*2+i*.7)*.14;
        m.dot.scale.setScalar(k);
        m.glow.scale.setScalar(.105*k);
        const p=(t*.55+i*.3)%1;
        m.ring.scale.setScalar(1+p*1.4);
        m.ring.material.opacity=.55*(1-p);
      });
      /* 飞线呼吸 */
      arcs.forEach((l,i)=>{l.material.opacity=.32+Math.sin(t*1.6+i*.9)*.18});
      renderer.render(scene,cam);
    })();

    /* ---------- 工具函数 ---------- */
    function latLng(lng,lat,r){
      const phi=(90-lat)*Math.PI/180, theta=(lng+180)*Math.PI/180;
      return new THREE.Vector3(
        -r*Math.sin(phi)*Math.cos(theta),
         r*Math.cos(phi),
         r*Math.sin(phi)*Math.sin(theta)
      );
    }
    function makeGlow(){
      const c=document.createElement('canvas');c.width=c.height=256;
      const g=c.getContext('2d');
      const grd=g.createRadialGradient(128,128,0,128,128,128);
      grd.addColorStop(0,'rgba(0,0,0,0)');
      grd.addColorStop(.62,'rgba(0,0,0,0)');
      grd.addColorStop(.70,'rgba(110,170,240,.55)');
      grd.addColorStop(.84,'rgba(90,150,220,.20)');
      grd.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=grd;g.fillRect(0,0,256,256);
      const tex=new THREE.CanvasTexture(c);
      const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
      sp.scale.set(2.9,2.9,1);
      sp.material.opacity=.38;
      return sp;
    }
    function goldTex(){
      if(_gtex)return _gtex;
      const c=document.createElement('canvas');c.width=c.height=64;
      const g=c.getContext('2d');
      const grd=g.createRadialGradient(32,32,0,32,32,32);
      grd.addColorStop(0,'rgba(255,246,205,1)');
      grd.addColorStop(.28,'rgba(255,215,106,.85)');
      grd.addColorStop(1,'rgba(255,180,60,0)');
      g.fillStyle=grd;g.fillRect(0,0,64,64);
      _gtex=new THREE.CanvasTexture(c);
      return _gtex;
    }
  }
})();
