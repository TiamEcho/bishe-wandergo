/* =========================================================
 * WANDERGO PLATFORM · 共享核心 core.js
 * 主题 / 侧栏 / 登录注册 / 弹窗 / BGM / 视频播放器 / 景点详情
 * 全站搜索（跨页跳转）/ 深度链接 / 打卡点亮
 * 依赖：data.js
 * ========================================================= */
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
let toastTimer;
function toast(m,t){const e=$('#toast');e.textContent=m;e.className='toast show '+(t||'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),2500)}
function fmt(n){return '¥ '+Number(n||0).toLocaleString('zh-CN')}
/* ---- 页面跳转助手 ---- */
const WGO={
  go(page,params){const q=params?Object.entries(params).filter(([,v])=>v!=null&&v!=='').map(([k,v])=>k+'='+encodeURIComponent(v)).join('&'):'';location.href=page+(q?'?'+q:'')},
  q(k){return new URLSearchParams(location.search).get(k)},
  /* 各页面注册的深度链接处理器：如 {spot:id=>..., post:pid=>...} */
  link(handlers){
    document.addEventListener('DOMContentLoaded',()=>{
      for(const k in handlers){const v=WGO.q(k);if(v){try{handlers[k](v)}catch(e){console.warn(e)}}}
    });
  },
  _rz:[],onResize(fn){WGO._rz.push(fn)},
  _fireResize(){WGO._rz.forEach(f=>{try{f()}catch(e){}})}
};
/* ================= 主题 ================= */
function setTheme(t){
  /* 切回预设主题时必须清掉自定义配色的行内变量，否则会一直覆盖预设 */
  if(t!=='custom'){
    const st=document.documentElement.style;
    ['--gold','--gold-deep','--gold-grad','--line-gold','--glass','--hero-a','--hero-b','--stars-op',
     '--bg','--bg-soft','--panel','--panel-2','--panel-3','--ink','--ink-2','--muted','--line',
     '--accent-ink','--shadow','--ok','--err','--blue'].forEach(k=>st.removeProperty(k));
    const dot=$('#fabDot');if(dot)dot.style.display='none';
  }
  document.documentElement.dataset.theme=t;localStorage.setItem('fmw_theme',t);
  $$('#themeDrop [data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
  toast('主题已切换 ✨');
}
/* ---- 主题样式（皮肤）：与主题颜色独立，可自由组合 ---- */
const SKINS={none:'默认',prince:'小王子',kitty:'Hello Kitty',anime:'动漫',guofeng:'中国风',minimal:'极简'};
function setSkin(k,silent){
  k=k||'none';
  document.documentElement.dataset.skin=k;
  localStorage.setItem('fmw_skin',k);
  $$('#skinRow [data-s]').forEach(b=>b.classList.toggle('on',b.dataset.s===k));
  if(!silent)toast('主题样式已切换 · '+(SKINS[k]||'默认'));
}
function initTheme(){
  $('#themeBtn').onclick=e=>{e.stopPropagation();$('#themeDrop').classList.toggle('show')};
  document.addEventListener('click',e=>{if(!e.target.closest('#themeFab'))$('#themeDrop').classList.remove('show')});
  $$('#themeDrop [data-t]').forEach(b=>b.onclick=()=>setTheme(b.dataset.t));
  const _st=localStorage.getItem('fmw_theme')||'night';
  document.documentElement.dataset.theme=_st;
  /* ---- 自定义配色引擎 ---- */
  window.cusH=210;window.cusS=62;window.cusL=54;window.cusMode='mono';window.cusBase='dark';
  const hsl=(h,s,l,a=1)=>`hsla(${((h%360)+360)%360},${Math.max(0,Math.min(100,s))}%,${Math.max(0,Math.min(100,l))}%,${a})`;
  function applyCustom(silent){
    const acH=cusMode==='comp'?cusH+180:cusMode==='ana'?cusH+26:cusH;
    const dpH=cusMode==='ana'?cusH-26:acH;
    /* 深浅基底：跟随系统 / 手动深色 / 手动浅色。基底决定整套中性色，
       主色亮度按基底反推，保证「文字色 / 面板色」永远有足够对比度 */
    const isDark=(cusBase==='auto'?!(window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches):cusBase==='dark');
    /* 主色亮度：深色底上要亮（58-84），浅色底上要深（26-48），否则文字看不见 */
    const safeL=isDark?Math.max(58,Math.min(84,cusL)):Math.max(26,Math.min(48,Math.round(cusL*.6)));
    const deepL=isDark?Math.max(42,Math.min(74,safeL-16)):Math.max(20,Math.min(42,safeL-10));
    const deep=hsl(dpH,cusS,deepL);
    const r=document.documentElement.style;
    r.setProperty('--gold',hsl(acH,cusS,safeL));
    r.setProperty('--gold-deep',deep);
    r.setProperty('--gold-grad',`linear-gradient(180deg,${hsl(acH,cusS,isDark?Math.min(88,safeL+10):Math.max(22,safeL-8))},${deep})`);
    r.setProperty('--line-gold',isDark?hsl(acH,70,60,.34):hsl(acH,55,40,.30));
    r.setProperty('--glass',isDark?hsl(acH,55,60,.08):hsl(acH,45,40,.06));
    r.setProperty('--hero-a',hsl(cusH,42,isDark?6:92));
    r.setProperty('--hero-b',hsl(cusMode==='comp'?acH:((cusH+dpH)/2),isDark?50:38,isDark?21:78));
    r.setProperty('--stars-op',isDark?1:0);
    if(isDark){
      r.setProperty('--bg',hsl(cusH,30,7));
      r.setProperty('--bg-soft',hsl(cusH,28,10));
      r.setProperty('--panel',hsl(cusH,26,12));
      r.setProperty('--panel-2',hsl(cusH,24,17));
      r.setProperty('--panel-3',hsl(cusH,22,23));
      r.setProperty('--ink',hsl(cusH,18,96));
      r.setProperty('--ink-2',hsl(cusH,16,82));
      r.setProperty('--muted',hsl(cusH,12,64));
      r.setProperty('--line','rgba(255,255,255,.10)');
      r.setProperty('--accent-ink',hsl(cusH,30,10));
      r.setProperty('--shadow','0 24px 60px -20px rgba(0,0,0,.6)');
      r.setProperty('--ok','#6cc47a');r.setProperty('--err','#e5695e');r.setProperty('--blue','#7ea6d9');
    }else{
      r.setProperty('--bg',hsl(cusH,30,97));
      r.setProperty('--bg-soft',hsl(cusH,28,99));
      r.setProperty('--panel','#ffffff');
      r.setProperty('--panel-2',hsl(cusH,34,95));
      r.setProperty('--panel-3',hsl(cusH,32,90));
      r.setProperty('--ink',hsl(cusH,32,12));
      r.setProperty('--ink-2',hsl(cusH,22,30));
      r.setProperty('--muted',hsl(cusH,14,46));
      r.setProperty('--line',hsl(cusH,30,30,.14));
      r.setProperty('--accent-ink','#ffffff');
      r.setProperty('--shadow',`0 20px 50px -18px ${hsl(cusH,30,40,.22)}`);
      r.setProperty('--ok','#2f8f52');r.setProperty('--err','#c9412f');r.setProperty('--blue','#3a6fb0');
    }
    document.documentElement.dataset.theme='custom';
    localStorage.setItem('fmw_theme','custom');
    localStorage.setItem('fmw_custom',JSON.stringify({h:cusH,s:cusS,l:cusL,m:cusMode,b:cusBase}));
    $$('#themeDrop [data-t]').forEach(b=>b.classList.remove('on'));
    const dot=$('#fabDot');if(dot){dot.style.display='block';dot.style.background=hsl(acH,cusS,cusL)}
    const cp=$('#cpPrev');if(cp)cp.innerHTML=[hsl(acH,cusS,cusL),deep,hsl(cusH,26,17),hsl(acH+180,42,55)].map(c=>`<i style="background:${c}"></i>`).join('');
    if(!silent)toast('自定义配色已应用 🎨');
  }
  function syncWheel(){
    const R=40,x=52+Math.sin(cusH*Math.PI/180)*R,y=52-Math.cos(cusH*Math.PI/180)*R;
    const k=$('#wheelKnob');if(!k)return;k.style.left=x+'px';k.style.top=y+'px';k.style.background=hsl(cusH,cusS,55);
    const s=$('#cusS'),l=$('#cusL');if(s)s.value=cusS;if(l)l.value=cusL;
  }
  function wheelPick(e){
    const b=$('#hueWheel').getBoundingClientRect();
    const x=e.clientX-(b.left+b.width/2),y=e.clientY-(b.top+b.height/2);
    cusH=(Math.atan2(x,-y)*180/Math.PI+360)%360;syncWheel();applyCustom(true);
  }
  let wheelDrag=false;
  const _hw=$('#hueWheel');
  if(_hw){
    _hw.addEventListener('pointerdown',e=>{wheelDrag=true;_hw.setPointerCapture(e.pointerId);wheelPick(e)});
    _hw.addEventListener('pointermove',e=>{if(wheelDrag)wheelPick(e)});
    _hw.addEventListener('pointerup',()=>{if(wheelDrag){wheelDrag=false;applyCustom()}});
    $('#cusS').oninput=e=>{cusS=+e.target.value;syncWheel();applyCustom(true)};
    $('#cusL').oninput=e=>{cusL=+e.target.value;syncWheel();applyCustom(true)};
    $$('#cpModes .mini').forEach(b=>b.onclick=()=>{cusMode=b.dataset.m;$$('#cpModes .mini').forEach(x=>x.classList.toggle('on',x===b));applyCustom()});
    $('#cusApply').onclick=()=>applyCustom();
    $('#aiPairBtn').onclick=()=>{
      const r=Math.random();
      if(r<.4){cusMode='comp';toast('🤖 AI 搭配：互补撞色')}
      else if(r<.75){cusH=(cusH+150)%360;cusMode='ana';toast('🤖 AI 搭配：分裂互补')}
      else{cusH=(cusH+120)%360;cusMode='mono';cusS=Math.min(88,cusS+16);toast('🤖 AI 搭配：三角和谐')}
      syncWheel();applyCustom();
    };
    const PALS={ins:[['奶油摩卡',28,44],['复古胶片',14,58],['海盐灰蓝',208,38],['鼠尾草',120,26]],gf:[['黛蓝',215,46],['朱砂红',2,66],['竹青',140,38],['藕荷',320,34]]};
    function palCard(p,kind){const[h,n,s]=p;return `<div class="pal-card" data-h="${h}" data-s="${s}"><div class="sw"><i style="background:${hsl(h,s,54)}"></i><i style="background:${hsl(h,Math.max(15,s-12),72)}"></i><i style="background:${hsl(h,s,30)}"></i><i style="background:${hsl(h+32,s-6,48)}"></i></div><b>${n}</b><p>${kind} · H${h} · S${s}%</p></div>`}
    const pi=$('#palIns'),pg=$('#palGf');
    if(pi)pi.innerHTML=PALS.ins.map(p=>palCard(p,'ins 风')).join('');
    if(pg)pg.innerHTML=PALS.gf.map(p=>palCard(p,'国风')).join('');
    $$('#palIns .pal-card,#palGf .pal-card').forEach(c=>c.onclick=()=>{
      cusH=+c.dataset.h;cusS=+c.dataset.s;cusMode='mono';
      $$('#cpModes .mini').forEach(x=>x.classList.toggle('on',x.dataset.m==='mono'));
      syncWheel();applyCustom();
    });
    $$('#baseRow [data-b]').forEach(b=>b.onclick=()=>{
      cusBase=b.dataset.b;
      $$('#baseRow [data-b]').forEach(x=>x.classList.toggle('on',x===b));
      applyCustom(true);toast(cusBase==='auto'?'跟随系统深浅 🌗':cusBase==='light'?'已切换浅色底 ☀️':'已切换深色底 🌙');
    });
    /* 主题样式（皮肤）独立于颜色，立即生效 */
    $$('#skinRow [data-s]').forEach(b=>b.onclick=()=>setSkin(b.dataset.s));
    setSkin(localStorage.getItem('fmw_skin')||'none',true);
  }
  if(_st==='custom'){try{const c=JSON.parse(localStorage.getItem('fmw_custom')||'{}');if(c.h!=null){cusH=c.h;cusS=c.s;cusL=c.l;cusMode=c.m||'mono';cusBase=c.b||'dark'}}catch(e){}syncWheel();
    $$('#baseRow [data-b]').forEach(x=>x.classList.toggle('on',x.dataset.b===cusBase));applyCustom(true)}
}
/* ================= 侧栏 ================= */
function initSidebar(){
  if(localStorage.getItem('fmw_sb')==='min')document.body.classList.add('sb-min');
  const tg=$('#sbToggle');
  if(tg)tg.onclick=()=>{const min=document.body.classList.toggle('sb-min');localStorage.setItem('fmw_sb',min?'min':'max');setTimeout(WGO._fireResize,360)};
  /* 当前页高亮 */
  const page=(location.pathname.split('/').pop()||'index.html').split('?')[0];
  $$('#navLinks a').forEach(a=>{
    const href=a.getAttribute('href')||'';
    if(href===page||(page==='index.html'&&href==='index.html'))a.classList.add('on');
    else a.classList.remove('on');
  });
}
/* ================= 登录 / 注册（后端优先，离线兜底） ================= */
let user=JSON.parse(localStorage.getItem('fmw_user')||'null');
function saveUser(u){user=u;localStorage.setItem('fmw_user',JSON.stringify(u));refreshUser()}
function refreshUser(){
  if(user){$('#navLoginBtn').style.display='none';$('#avatarChip').classList.add('show');$('#avatarTxt').textContent=user.nick[0];$('#avatarName').textContent=user.nick;}
  else{$('#navLoginBtn').style.display='';$('#avatarChip').classList.remove('show');}
  if(window.onUserRefresh)window.onUserRefresh();
}
function openAuth(tab){
  openModal(`<button class="mx" onclick="closeModal()">✕</button>
  <div style="padding:26px">
    <div class="auth-tabs"><button id="atL" class="on">登录</button><button id="atR">注册</button></div>
    <div id="authBody"></div>
  </div>`,false);
  let mode=tab||'login';
  function render(){
    $('#atL').classList.toggle('on',mode==='login');$('#atR').classList.toggle('on',mode==='register');
    $('#authBody').innerHTML=`
      <h3>${mode==='login'?'欢迎回来':'开启你的旅程'}</h3>
      <p class="as">${mode==='login'?'登录你的旅行空间，继续未完的旅程':'注册账号，收藏世界上的每一个角落'}</p>
      <div class="auth-field"><label>昵称</label><input id="auNick" placeholder="${mode==='login'?'你的昵称 / 邮箱':'给自己起一个旅行昵称'}"></div>
      <div class="auth-field"><label>密码</label><input id="auPwd" type="password" placeholder="至少 6 位"></div>
      ${mode==='register'?'<div class="auth-field"><label>确认密码</label><input id="auPwd2" type="password" placeholder="再输入一次"></div>':''}
      <div class="auth-err" id="auErr"></div>
      <button class="btn gold" id="auGo" style="width:100%;height:44px;font-size:15px">${mode==='login'?'登 录':'注册并进入'}</button>`;
    $('#auGo').onclick=async()=>{
      const nick=$('#auNick').value.trim(),pwd=$('#auPwd').value;
      if(!nick)return err('请输入昵称');
      if(pwd.length<6)return err('密码至少 6 位');
      if(mode==='register'&&$('#auPwd2').value!==pwd)return err('两次密码不一致');
      /* 优先请求 Spring Boot 后端，失败自动切换本地模式 */
      const r=await WGOAPI.auth(mode,{nick,pwd});
      if(r&&r.ok){saveUser({nick:r.nick||nick.split('@')[0]||nick,token:r.token||null,from:'api'});toast((mode==='login'?'欢迎回来，':'注册成功（已同步数据库），')+(r.nick||nick)+'！','ok')}
      else{saveUser({nick:nick.split('@')[0]||nick,from:'local'});toast((mode==='login'?'欢迎回来，':'注册成功（本地模式，后端未启动），')+user.nick+'！','ok')}
      closeModal();
    };
    function err(m){$('#auErr').textContent=m}
  }
  $('#atL').onclick=()=>{mode='login';render()};$('#atR').onclick=()=>{mode='register';render()};
  render();
}
function initUser(){
  $('#navLoginBtn').onclick=()=>openAuth();
  const _lb=$('#logoutBtn2');if(_lb)_lb.onclick=()=>{ if(!user){openAuth();return} user=null;localStorage.removeItem('fmw_user');refreshUser();toast('已退出登录，期待下一站再见 👋'); };
  $('#avatarChip').onclick=()=>WGO.go('me.html');
  refreshUser();
}
/* ================= 弹窗 ================= */
function openModal(html,wide){$('#modalBox').className='modal'+(wide?' wide':'');$('#modalBox').innerHTML=html;$('#ovl').classList.add('show')}
function closeModal(){$('#ovl').classList.remove('show');stopVSlide()}
document.addEventListener('click',e=>{if(e.target&&e.target.id==='ovl')closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
/* ================= BGM 引擎（WebAudio 合成） ================= */
const PRESET={
 fresh:{wave:'triangle',gain:.06,dur:.26,seq:[659.3,784,880,1046.5,880,784]},
 calm:{wave:'sine',gain:.07,dur:.5,seq:[261.6,329.6,392,523.3,392,329.6]},
 retro:{wave:'square',gain:.035,dur:.3,seq:[392,466.2,523.3,466.2,349.2,392]},
 city:{wave:'sine',gain:.055,dur:.24,seq:[523.3,587.3,659.3,587.3,523.3,392]},
 jazz:{wave:'triangle',gain:.05,dur:.34,seq:[392,415.3,466.2,392,349.2,311.1]},
 folk:{wave:'triangle',gain:.06,dur:.3,seq:[440,523.3,587.3,659.3,587.3,523.3]},
 lofi:{wave:'sine',gain:.045,dur:.42,seq:[261.6,311.1,349.2,311.1,293.7,261.6]},
 epic:{wave:'sawtooth',gain:.028,dur:.55,seq:[196,261.6,329.6,392,523.3,392]},
 elect:{wave:'square',gain:.03,dur:.2,seq:[440,554.4,659.3,880,659.3,554.4]}
};
const BGMI=n=>{const b=BGM_LIST.find(x=>x[0]===(n||'fresh'));return b?b[2]+' '+b[1]:'♪ BGM'};
let AC=null,bgmTimer=null,bgmName=null;
function note(f,wave,dur,gain){
  const o=AC.createOscillator(),g=AC.createGain();
  o.type=wave;o.frequency.value=f;o.connect(g);g.connect(AC.destination);
  const t=AC.currentTime;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.start(t);o.stop(t+dur+.05);
}
function toggleBgm(name){
  if(bgmName===name){stopBgm();return false}
  stopBgm();AC=AC||new (window.AudioContext||window.webkitAudioContext)();
  if(AC.state==='suspended')AC.resume();
  const p=PRESET[name]||PRESET.fresh;bgmName=name;let i=0;
  (function tick(){if(bgmName!==name)return;const f=p.seq[i%p.seq.length];note(f,p.wave,p.dur*.92,p.gain);i++;bgmTimer=setTimeout(tick,p.dur*1000)})();
  toast('♪ BGM 播放中 · '+name);
  return true;
}
function stopBgm(){bgmName=null;clearTimeout(bgmTimer)}
/* ================= 打卡视频播放器（含 BGM） ================= */
let vTimer=null,vProgTimer=null,vFrame=0,vData=null;
function openVideo(d){
  vData=d;vFrame=0;
  openModal(`<button class="mx" onclick="closeModal()">✕</button>
  <div class="vplayer">
    <div class="vstage" id="vStage">${d.imgs.map(k=>`<img src="${IMG(P[k],'landscape_16_9')}">`).join('')}
      <div class="vtitle"><h4>${d.t}</h4><p>📍 ${d.loc} · AI 精选打卡视频</p></div></div>
    <div class="vctl">
      <button id="vPlay" title="播放/暂停">⏸</button>
      <div class="vprog"><i id="vProg"></i></div>
      <span class="vtime" id="vTime">0:00</span>
      <button id="vBgm" title="BGM 配乐">♪</button>
    </div>
    <div class="bgm-chips" id="vBgmChips"></div>
  </div>`,true);
  startVSlide();
  $('#vPlay').onclick=toggleVSlide;
  $('#vBgm').onclick=()=>{const on=toggleBgm(d.bgm||'fresh');$('#vBgm').classList.toggle('bgm-on',on);syncBgmChips(on?d.bgm||'fresh':null)};
  if(d.bgm)setTimeout(()=>{const on=toggleBgm(d.bgm);$('#vBgm').classList.toggle('bgm-on',on)},300);
  $('#vBgmChips').innerHTML=BGM_LIST.map(b=>`<button class="bgm-chip ${b[0]===(d.bgm||'fresh')?'on':''}" data-b="${b[0]}">${b[2]} ${b[1]}</button>`).join('');
  $$('#vBgmChips .bgm-chip').forEach(ch=>ch.onclick=()=>{const on=toggleBgm(ch.dataset.b);syncBgmChips(on?ch.dataset.b:null)});
}
function syncBgmChips(active){
  $$('#vBgmChips .bgm-chip').forEach(x=>x.classList.toggle('on',x.dataset.b===active));
  $('#vBgm').classList.toggle('bgm-on',!!active);
}
function startVSlide(){
  stopVSlide();showFrame(vFrame);
  vTimer=setInterval(()=>{vFrame=(vFrame+1)%vData.imgs.length;showFrame(vFrame)},3200);
  vProgTimer=setInterval(()=>{const imgs=$$('#vStage img');if(!imgs.length)return;const cur=Math.floor((Date.now()/3200)%vData.imgs.length);$('#vProg').style.width=((cur+vPct())/vData.imgs.length*100)+'%';
    $('#vTime').textContent='0:'+String(Math.floor((Date.now()/1000)%60)).padStart(2,'0')},180);
}
function vPct(){return (Date.now()%3200)/3200}
function showFrame(i){$$('#vStage img').forEach((im,j)=>im.classList.toggle('on',j===i))}
function toggleVSlide(){
  if(vTimer){clearInterval(vTimer);vTimer=null;$('#vPlay').textContent='▶'}
  else{$('#vPlay').textContent='⏸';vTimer=setInterval(()=>{vFrame=(vFrame+1)%vData.imgs.length;showFrame(vFrame)},3200)}
}
function stopVSlide(){clearInterval(vTimer);vTimer=null;clearInterval(vProgTimer);vProgTimer=null;stopBgm()}
function openPlog(t,loc,img,txtEnc){
  openModal(`<button class="mx" onclick="closeModal()">✕</button>
  <div><div class="dhero" style="height:250px"><img src="${IMG(P[img],'landscape_16_9')}"><div class="dc"><h3>📷 ${t}</h3><div class="meta"><span>📍 ${loc}</span><span>AI 精选 Plog</span></div></div></div>
  <div class="dbody"><p class="desc" style="font-style:italic">${decodeURIComponent(txtEnc)}</p>
  <div class="dbtns"><button class="btn line" onclick="WGO.go('checkin.html')">📸 我也要写 Plog</button><button class="btn gold" onclick="WGO.go('community.html')">看更多真实 Plog</button></div></div></div>`,true);
}
/* ================= 景点详情（跨页跳转版） ================= */
function litSet(){
  const albums=JSON.parse(localStorage.getItem('fmw_albums')||'[]');
  const names=new Set(albums.map(a=>a.dest));
  const ids=new Set();SPOTS.forEach(s=>{if(names.has(s.n))ids.add(s.id)});
  return ids;
}
function openSpot(id){
  const s=spotById(id);if(!s)return;
  const lit=litSet().has(id);
  openModal(`<button class="mx" onclick="closeModal()">✕</button>
  <div class="dhero"><img src="${IMG(P[s.id])}"><div class="dc">
    <h3>${s.n} <span class="tagpill ${s.rg}" style="vertical-align:3px">${s.rg==='cn'?'国内':'国外'}</span>${lit?'<span class="tagpill lit">✨ 已点亮</span>':''}</h3>
    <div class="meta"><span>📍 ${s.city}</span><span>${s.tag}</span><span>⭐ ${s.rating}</span></div></div></div>
  <div class="dbody">
    <p class="desc">${s.desc}</p>
    <div class="kv">
      <div class="item">🏠 景点地址<b>${s.addr}</b></div>
      <div class="item">🌐 经纬度坐标<b class="gold">${s.lng.toFixed(3)}, ${s.lat.toFixed(3)}</b></div>
      <div class="item">⏱ 建议游玩时长<b>${s.hrs}</b></div>
      <div class="item">🚄 交通衔接<b>${s.traf}</b></div>
      <div class="item">💰 门票参考<b class="gold">${s.price}</b></div>
      <div class="item">📷 景点标签<b>${s.tag}</b></div>
    </div>
    <p class="coord-note">坐标获取方式：爬虫抓取公开地理数据 + 高德/百度坐标拾取器校准（demo 演示数据）。</p>
    <div class="dbtns">
      <button class="btn line" onclick="favSpot('${s.id}')">♥ 收藏</button>
      <button class="btn line" onclick="WGO.go('map.html',{spot:'${s.id}'})">🗺 在地图中查看</button>
      <button class="btn gold" onclick="WGO.go('ai.html',{dest:'${s.city}'})">🤖 让 AI 规划这里</button>
      <button class="btn gold" onclick="WGO.go('checkin.html',{dest:'${s.id}'})">📸 去打卡</button>
    </div>
  </div>`,true);
}
function favSpot(id){toast('已收藏「'+spotById(id).n+'」⭐')}
function askAI(city){WGO.go('ai.html',{dest:city})}
/* ================= 全站搜索（跨页） ================= */
const POST_TYPE={video:'🎬 视频/Vlog',vlog:'🎬 Vlog',plog:'📷 Plog',post:'📝 图文'};
const PT_Q={video:'视频 vlog video',vlog:'vlog',plog:'plog 图文',post:'图文'};
const PLAT_LBL={douyin:'🎵抖音',xhs:'📕小红书',kuaishou:'⚡快手',ins:'📸Instagram',yt:'▶️YouTube',go:'🧭站内'};
function hl(text,q){const i=text.toLowerCase().indexOf(q.toLowerCase());return i<0?text:text.slice(0,i)+'<mark>'+text.slice(i,i+q.length)+'</mark>'+text.slice(i+q.length)}
function doSearch(raw){
  const q=(raw||'').trim().toLowerCase();
  const R=$('#srResults');
  renderSugs(raw||'');
  if(!q){R.innerHTML='<div class="sr-empty">输入关键词，或点上方快捷标签开始探索 ✈️<br><span>试试：「洱海」「巴黎」「新疆」「vlog」「极光」</span></div>';return}
  const groups=[];
  const posts=POSTS.filter(p=>((p.txt||'')+' '+(p.loc||'')+' '+(p.u||'')+' '+(PT_Q[p.type]||'图文')).toLowerCase().includes(q)).slice(0,6);
  if(posts.length)groups.push({icon:'💬',name:'社区动态 · 视频 / Vlog / Plog / 图文',items:posts.map(p=>({icon:POST_TYPE[p.type||'post'],t:hl((p.txt||p.loc||'').slice(0,34),q),sub:`${PLAT_LBL[p.plat||'go']} · ${p.u} · 📍${p.loc||'未知'}`,run:()=>WGO.go('community.html',{post:p.id})}))});
  const books=NOVEL_LINKS.filter(b=>(b.t+' '+b.sub).toLowerCase().includes(q)).slice(0,5);
  if(books.length)groups.push({icon:'📖',name:'书籍与文学地点',items:books.map(b=>({icon:'📖',t:hl(b.t,q),sub:b.sub,run:()=>WGO.go(b.page,{spot:b.id})}))});
  const spots=SPOTS.filter(s=>((s.n||'')+' '+(s.city||'')+' '+(s.tag||'')+' '+(s.desc||'')).toLowerCase().includes(q)).slice(0,6);
  if(spots.length)groups.push({icon:'📍',name:'景点 · 攻略与坐标',items:spots.map(s=>({icon:s.tag?s.tag.split(' ')[0]:'📍',t:hl(s.n+' · '+s.city,q),sub:`${s.tag} · ⭐${s.rating}`,run:()=>WGO.go('map.html',{spot:s.id})}))});
  const tops=TOPICS.filter(t=>((t.name||'')+' '+(t.desc||'')).toLowerCase().includes(q)).slice(0,4);
  if(tops.length)groups.push({icon:'#',name:'话题社区',items:tops.map(t=>({icon:'🔥',t:hl('#'+t.name,q),sub:(t.desc||'').slice(0,30),run:()=>WGO.go('community.html',{topic:t.id})}))});
  const shops=SHOPS.filter(s=>((s.name||'')+' '+(s.city||'')+' '+(s.type||'')+' '+(s.feat||'')).toLowerCase().includes(q)).slice(0,5);
  if(shops.length)groups.push({icon:'🎨',name:'小众文创店铺',items:shops.map(s=>({icon:'☕',t:hl(s.name,q),sub:`${s.city} · ${s.type} · ${s.hours}`,run:()=>WGO.go('workbench.html',{shop:s.name})}))});
  const plans=Object.keys(PLANS).filter(k=>k.toLowerCase().includes(q)).slice(0,4);
  if(plans.length)groups.push({icon:'🤖',name:'AI 行程方案',items:plans.map(k=>({icon:'🧭',t:hl(PLANS[k].dest||k,q),sub:PLANS[k].days||'点击让 AI 生成',run:()=>WGO.go('ai.html',{dest:k})}))});
  if(!groups.length){R.innerHTML=`<div class="sr-empty">没有找到与「${raw}」相关的内容 😢<br><span>换个词试试，或去社区发布第一条笔记</span></div>`;return}
  R.innerHTML=groups.map(g=>`<div class="sr-group"><div class="sr-gtitle">${g.icon} ${g.name}</div>${g.items.map((it,i)=>`<button class="sr-item" data-g="${g.name}" data-i="${i}"><span class="sr-ic">${it.icon}</span><span class="sr-main"><b>${it.t}</b><i>${it.sub||''}</i></span><span class="sr-go">↵</span></button>`).join('')}</div>`).join('');
  $$('.sr-item').forEach(btn=>btn.onclick=()=>{
    const g=groups.find(x=>x.name===btn.dataset.g),it=g.items[+btn.dataset.i];
    closeSearch();setTimeout(it.run,120);
  });
}
/* 书籍与文学地点索引（供搜索与 novel/prince 页使用） */
const NOVEL_LINKS=[
 {id:'paris',t:'《悲惨世界》· 巴黎',sub:'雨果笔下的塞纳河与革命街垒',page:'novel.html'},
 {id:'inari',t:'《古都》· 京都',sub:'川端康成里的千年寂寂町屋',page:'novel.html'},
 {id:'sagrada',t:'《风之影》· 巴塞罗那',sub:'遗忘之书墓园与高迪的迷宫',page:'novel.html'},
 {id:'cp',t:'《了不起的盖茨比》· 纽约',sub:'爵士时代的绿灯与长岛夜宴',page:'novel.html'},
 {id:'oia',t:'一天看 44 次落日 🌅',sub:'伊亚小镇 · 忧伤时的专属浪漫',page:'prince.html'},
 {id:'ubud',t:'玫瑰与被驯服的花园 🌹',sub:'乌布梯田 · 「正因为你为玫瑰花费了时间」',page:'prince.html'},
 {id:'ice',t:'会说话的星空与狐狸 ❄️',sub:'黄金圈 · 极光夜是星星的悄悄话',page:'prince.html'},
 {id:'paris',t:'飞行员的起点 ✈️',sub:'巴黎 · 圣埃克苏佩里起飞的地方',page:'prince.html'}
];
/* 输入后出现的联想小词条：地点 / 词条 / 玩法；点一下填入，回车去独立搜索页 */
function renderSugs(raw){
  const box=$('#srSugs');if(!box)return;
  const q=(raw||'').trim();
  if(!q){box.innerHTML='';return}
  const hits=[];
  DEST_LIST.filter(d=>d[0].includes(q)||d[1].includes(q)).slice(0,4).forEach(d=>hits.push(d[0]));
  TOPICS.filter(t=>t.name.includes(q)).slice(0,3).forEach(t=>hits.push('#'+t.name));
  SPOTS.filter(s=>s.n.includes(q)||s.city.includes(q)).slice(0,3).forEach(s=>hits.push(s.n));
  const uniq=[...new Set(hits)].slice(0,9);
  box.innerHTML=uniq.map(k=>`<button class="sr-sug" data-k="${k.replace(/"/g,'')}">${k}</button>`).join('')
    +'<button class="sr-sug sr-more" data-full="1">🔎 看完整搜索结果 ↵</button>';
  box.querySelectorAll('.sr-sug').forEach(b=>b.onclick=()=>{
    if(b.dataset.full){WGO.go('search.html',{kw:$('#searchInput').value.trim()||q});closeSearch();return}
    $('#searchInput').value=b.dataset.k;doSearch(b.dataset.k);$('#searchInput').focus();
  });
}
function openSearch(){$('#searchOv').classList.add('show');$('#searchInput').value='';doSearch('');setTimeout(()=>$('#searchInput').focus(),60)}
function closeSearch(){$('#searchOv').classList.remove('show')}
function initSearch(){
  $('#searchOpen').onclick=openSearch;
  $('#searchClose').onclick=closeSearch;
  $('#searchOv').onclick=e=>{if(e.target.id==='searchOv')closeSearch()};
  $('#searchInput').oninput=e=>doSearch(e.target.value);
  $('#searchInput').onkeydown=e=>{
    if(e.key==='Enter'){e.preventDefault();const kw=$('#searchInput').value.trim();closeSearch();WGO.go('search.html',{kw})}
  };
  $$('#srQuick button').forEach(b=>b.onclick=()=>{$('#searchInput').value=b.dataset.q;doSearch(b.dataset.q)});
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}
    else if(e.key==='/'&&!/input|textarea|select/i.test(document.activeElement.tagName)){e.preventDefault();openSearch()}
    else if(e.key==='Escape'){closeSearch()}
  });
}
/* ================= 共享页面骨架（侧栏/主题工坊/搜索/页脚/弹窗） ================= */
const NAVS=[
 ['index.html','🏠','旅行首页'],['novel.html','📖','跟着小说去旅行'],['prince.html','👑','跟着小王子去旅行'],
 ['map.html','🌍','环球地图'],['ai.html','🤖','AI 旅行规划'],['search.html','🔍','全站搜索'],['community.html','💬','旅行社区'],['topic.html','🏷','词条广场'],
 ['checkin.html','📍','我的打卡'],['memories.html','🎬','旅行纪念视频'],['workbench.html','🧳','旅行工作台'],['guide.html','📘','模块导览'],
 ['recommend.html','🎯','猜你喜欢 · 推荐'],['wheel.html','🎡','旅行大转盘']
];
const LOGO_SVG='<svg viewBox="0 0 24 24"><path d="M21.5 5.6c-.5-1-1.8-1.4-2.8-.9l-4.3 2.3-8.1-3.4c-.5-.2-1.1-.1-1.5.2l-.9.8c-.5.4-.4 1.2.2 1.5l6.5 3.3-3.7 2-2.9-.6c-.4-.1-.8 0-1.1.3l-.7.6c-.4.4-.3 1 .2 1.2l3.3 1.9 1.9 3.3c.3.5 1 .6 1.3.2l.6-.7c.3-.3.4-.7.3-1.1l-.6-2.9 3.7-2 3.3 6.5c.3.5 1.1.6 1.5.2l.8-.9c.3-.4.4-1 .2-1.5l-3.4-8.1 2.3-4.3c.5-.9.3-2.1-.6-2.6z" transform="scale(.9) translate(1.3,1.3)"/></svg>';
function initChrome(){
  if(!document.querySelector('aside.sidebar')){
    document.body.insertAdjacentHTML('afterbegin',`
    <aside class="sidebar">
      <button class="sb-toggle" id="sbToggle" title="收起 / 展开导航">«</button>
      <a class="logo" href="index.html">
        <span class="tile">${LOGO_SVG}</span>
        <span><b>WANDERGO</b><i>你的故事旅行宇宙</i></span>
      </a>
      <button class="sb-search" id="searchOpen">🔍<span>搜索景点 / 视频 / 笔记…</span><kbd>Ctrl K</kbd></button>
      <div class="side-links" id="navLinks">
        ${NAVS.map(n=>`<a href="${n[0]}"><span class="ni">${n[1]}</span>${n[2]}</a>`).join('')}
      </div>
      <div class="side-foot">
        <div class="nav-tools">
          <span class="avatar-chip" id="avatarChip"><span class="av" id="avatarTxt">旅</span><span id="avatarName">旅行者</span></span>
          <button class="btn gold" id="navLoginBtn">登录 / 注册</button>
        </div>
      </div>
    </aside>`);
  }
  if(!document.getElementById('themeFab')){
    document.body.insertAdjacentHTML('beforeend',`
    <div class="theme-fab" id="themeFab">
      <div class="tf-panel" id="themeDrop">
        <h5>🎨 WANDERGO 主题工坊</h5>
        <div class="tf-sec">主题颜色 · 预设</div>
        <div class="tf-presets">
          <button data-t="night" class="on"><i class="dot" style="background:#16294e"></i>星夜蓝</button>
          <button data-t="dawn"><i class="dot" style="background:#e9ba5e"></i>晨曦暖阳</button>
          <button data-t="mint"><i class="dot" style="background:#3fc492"></i>薄荷旅途</button>
          <button data-t="sakura"><i class="dot" style="background:#f08cab"></i>樱粉列车</button>
          <button data-t="aurora"><i class="dot" style="background:#a8e2ff"></i>极光冰蓝</button>
        </div>
        <div class="tf-sec">主题颜色 · 深浅基底</div>
        <div class="base-row" id="baseRow">
          <button data-b="dark" class="on">🌙 深色</button>
          <button data-b="light">☀️ 浅色</button>
          <button data-b="auto">🌗 跟随系统</button>
        </div>
        <div class="tf-sec">主题颜色 · 灵感色卡 · INS 风</div>
        <div class="pal-cards" id="palIns"></div>
        <div class="tf-sec">主题颜色 · 灵感色卡 · 国风</div>
        <div class="pal-cards" id="palGf"></div>
        <div class="tf-sec">主题颜色 · 自定义色轮（点外圈取色）</div>
        <div class="tf-wheelrow">
          <div class="hue-wheel" id="hueWheel"><i id="wheelKnob"></i></div>
          <div class="tf-wheelctl">
            <label>饱和 <input type="range" id="cusS" min="15" max="100" value="62"></label>
            <label>亮度 <input type="range" id="cusL" min="28" max="85" value="54"></label>
            <div class="cp-modes" id="cpModes">
              <button class="mini on" data-m="mono">单色系</button>
              <button class="mini" data-m="comp">AI 互补</button>
              <button class="mini" data-m="ana">邻近渐变</button>
            </div>
            <div class="cp-prev" id="cpPrev"></div>
          </div>
        </div>
        <div class="tf-actions">
          <button class="btn gold" id="cusApply">应用配色</button>
          <button class="btn" id="aiPairBtn">🤖 AI 智能搭配</button>
        </div>
        <div class="tf-sec">主题样式 · 可与任意颜色组合</div>
        <div class="skin-row" id="skinRow">
          <button data-s="none" class="on">🪶 默认</button>
          <button data-s="prince">👑 小王子</button>
          <button data-s="kitty">🎀 Hello Kitty</button>
          <button data-s="anime">⚡ 动漫</button>
          <button data-s="guofeng">🏮 中国风</button>
          <button data-s="minimal">◻️ 极简</button>
        </div>
        <p class="tf-note">颜色与样式分开设置 · 任何配色都保证文字清晰可读</p>
      </div>
      <button class="fab-btn" id="themeBtn" title="主题工坊">🎨<i id="fabDot"></i></button>
    </div>
    <div class="search-ov" id="searchOv">
      <div class="search-box">
        <div class="search-bar"><span>🔍</span><input id="searchInput" placeholder="搜视频 / Vlog / Plog / 地点 / 景点 / 词条…（回车看完整搜索结果）"><button class="sr-esc" id="searchClose">ESC</button></div>
        <div class="sr-sugs" id="srSugs"></div>
        <div class="sr-quick" id="srQuick">
          <button data-q="视频">▶ 视频</button><button data-q="vlog">🎬 Vlog</button><button data-q="plog">📷 Plog</button><button data-q="书籍">📖 书籍地点</button><button data-q="极光">🌌 极光</button><button data-q="文创">🎨 文创店</button>
        </div>
        <div class="sr-results" id="srResults"><div class="sr-empty">输入关键词，或点上方快捷标签开始探索 ✈️<br><span>试试：「洱海」「巴黎」「vlog」「悲惨世界」「极光」</span></div></div>
      </div>
    </div>
    <footer>
      <div class="wrap">
        <div class="fb"><span class="tile" style="width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,#f3da96,#c8973f);display:inline-grid;place-items:center">✈️</span>WANDERGO · Fly Me to the World</div>
        <div class="fnote">让世界，成为你的下一站 · 原型演示 · 页面图片由 AI 生成 · 坐标来自高德坐标拾取器 · 主题可切换</div>
      </div>
    </footer>
    <div class="ovl" id="ovl"><div class="modal" id="modalBox"></div></div>
    <div class="toast" id="toast"></div>`);
  }
}
/* ================= 公共初始化 ================= */
document.addEventListener('DOMContentLoaded',()=>{
  initChrome();
  initTheme();initSidebar();initUser();initSearch();
  $$('[data-img]').forEach(el=>el.src=IMG(P[el.dataset.img],el.dataset.size||'landscape_4_3'));
});
