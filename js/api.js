/* =========================================================
 * WANDERGO PLATFORM · API 层 api.js
 * 技术栈：Axios（异步请求）+ JWT（Authorization: Bearer）
 * 优先请求 Spring Boot 后端 (http://localhost:8080)
 * 超时 / 失败自动降级本地模式（localStorage + data.js）
 * ========================================================= */
const WGOAPI=(()=>{
  /* ---- 接口地址自动切换 ----
   * 1) localStorage 的 wgo_api 优先级最高（手动覆盖，如临时指向别的服务器）
   *    在控制台执行：localStorage.setItem('wgo_api','http://1.2.3.4:8080') 后刷新
   * 2) 本地打开（localhost / 127.0.0.1 / file:// / GitHub Pages 预览）→ 本机 8080
   * 3) 部署在云服务器上（http/https 访问）→ 同主机 8080 端口
   * 失败会自动降级本地模式，不会白屏
   */
  const _host=location.hostname;
  const _isLocal=/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(_host)
    ||location.protocol==='file:';
  const _isGithubIO=/\.github\.io$/i.test(_host);
  /* Render 后端（占位）：等 Render 部署成功后，把双引号里换成你拿到的真实 URL。
   * 在 GitHub Pages 上也可以临时用 localStorage 覆盖：
   *   localStorage.setItem('wgo_api','https://真实后端URL.onrender.com')
   * 然后刷新页面。 */
  const RENDER_BACKEND='https://wandergo-backend.onrender.com';
  const _auto=_isLocal?'http://localhost:8080'
    :_isGithubIO?RENDER_BACKEND
    :(location.protocol==='https:'?location.origin:location.protocol+'//'+_host+':8080');
  const BASE=localStorage.getItem('wgo_api')||_auto;
  let backendUp=null; // null=未知 true=在线 false=离线
  /* Axios 实例（CDN 加载失败时回退原生 fetch，保证离线可用） */
  const ax=window.axios?window.axios.create({baseURL:BASE,timeout:1800}):null;
  /* 当前登录用户（前台走 core.js 的 user；管理端走 localStorage 的 wgo_token） */
  const curNick=()=>(typeof user!=='undefined'&&user&&user.nick)?user.nick:(localStorage.getItem('wgo_nick')||'游客');
  const curToken=()=>{
    if(typeof user!=='undefined'&&user&&user.token)return user.token;
    return localStorage.getItem('wgo_token')||null;
  };

  async function req(path,opts={},timeout=1800){
    const headers=Object.assign({'Content-Type':'application/json'},opts.headers||{});
    const tk=curToken();if(tk)headers['Authorization']='Bearer '+tk;
    try{
      let data;
      if(ax){
        ax.defaults.timeout=timeout;
        const r=await ax.request({url:path,method:opts.method||'GET',headers,data:opts.body});
        data=r.data;
      }else{
        const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),timeout);
        const r=await fetch(BASE+path,{method:opts.method||'GET',headers,body:opts.body?JSON.stringify(opts.body):undefined,signal:ctl.signal});
        clearTimeout(t);
        if(!r.ok)throw new Error('http '+r.status);
        data=await r.json();
      }
      backendUp=true;return data;
    }catch(e){backendUp=false;return null}
  }
  const status=()=>backendUp;
  return {
    req,status,base:BASE,
    auth(mode,body){return req('/api/user/'+(mode==='login'?'login':'register'),{method:'POST',body:{username:body.nick,password:body.pwd}})},
    /* 协同过滤推荐：后端优先，离线时返回 null 由前端本地算法兜底 */
    recommend(n=8){return req('/api/recommend?nick='+encodeURIComponent(curNick())+'&n='+n)},
    /* 打卡上报数据库（成功与否都不阻塞本地保存） */
    pushCheckin(rec){return req('/api/checkin/add',{method:'POST',body:rec},1500)},
    /* 评分上报：写入 MySQL 评分矩阵，反哺协同过滤 */
    rate(spotId,score){return req('/api/rating/add',{method:'POST',body:{nick:curNick(),spotId,score}},1500)},
    spots(){return req('/api/spot/list')},
    rank(scope,city){return req('/api/rank?scope='+scope+'&city='+encodeURIComponent(city||''))},
    /* 社区互动 */
    comments(spotId){return req('/api/comment/list?spotId='+encodeURIComponent(spotId))},
    addComment(spotId,content){return req('/api/comment/add',{method:'POST',body:{spotId,content}})},
    toggleLike(spotId){return req('/api/like/toggle',{method:'POST',body:{spotId}})},
    /* ---------- 社区 2.0：词条 / 帖子 / 评论 / 点赞 / BGM / 推荐 ---------- */
    topics(kw){return req('/api/topic/list?kw='+encodeURIComponent(kw||''))},
    topicDetail(code,offset){return req('/api/topic/detail?code='+encodeURIComponent(code)+'&offset='+(offset||0))},
    postList(topic,sort,offset,limit){return req('/api/post/list?topic='+encodeURIComponent(topic||'')
      +'&sort='+encodeURIComponent(sort||'hot')+'&offset='+(offset||0)+'&limit='+(limit||30))},
    postDetail(id,nick){return req('/api/post/detail?id='+encodeURIComponent(id)+'&nick='+encodeURIComponent(nick||''))},
    /* 发布作品：登录态由 Authorization 头带上，后端优先取 token 里的用户名 */
    postAdd(payload){return req('/api/post/add',{method:'POST',body:payload},8000)},
    postComment(postId,content){return req('/api/post/comment/add',{method:'POST',body:{postId,content}},8000)},
    postLike(postId){return req('/api/post/like/toggle',{method:'POST',body:{postId}},8000)},
    /* 「想去」地点收藏：后端在线时写 t_post_want，离线时前端 localStorage 兜底（data.js toggleWant） */
    wantToggle(name,from){return req('/api/post/want/toggle',{method:'POST',body:{place:name,from:from||''}},4000)},
    wantList(){return req('/api/post/want/list')},
    bgmList(kw){return req('/api/bgm/list?kw='+encodeURIComponent(kw||''))},
    postRecommend(nick,n){return req('/api/post/recommend?nick='+encodeURIComponent(nick||'')+'&n='+(n||6))},
    /* 管理端（需 admin JWT） */
    adminOverview(){return req('/api/admin/overview')},
    adminSpots(kw){return req('/api/admin/spot/list?kw='+encodeURIComponent(kw||''))},
    adminSaveSpot(spot){return req('/api/admin/spot/save',{method:'POST',body:spot})},
    adminDelSpot(id){return req('/api/admin/spot/delete',{method:'POST',body:{id}})},
    adminUsers(){return req('/api/admin/user/list')},
    adminUserStatus(id,status){return req('/api/admin/user/status',{method:'POST',body:{id,status}})},
    adminAudit(status){return req('/api/admin/audit/list?status='+status)},
    adminAuditHandle(id,status){return req('/api/admin/audit/handle',{method:'POST',body:{id,status}})},
    /* 爬虫统计：管理端「🕷 爬虫实时数据」顶部三块统计卡 */
    adminCrawlStats(){return req('/api/admin/crawl/stats')},
    /* 真实执行 Python 爬虫并回写 MySQL：后端同步阻塞最长 420 秒，
       全局默认 timeout 只有 1.8 秒，必须在这里单独放大到 480 秒，否则请求会被前端自己中断 */
    adminCrawl(limit){return req('/api/admin/crawl?limit='+encodeURIComponent(limit||5),{method:'POST'},480000)},
    /* 社区爬虫：B 站公开接口抓 Vlog 与评论，写库；同样需要放大超时 */
    adminCommunityStats(){return req('/api/admin/community/stats')},
    adminCommunityList(limit){return req('/api/admin/community/list?limit='+(limit||40))},
    adminCommunityCrawl(limit){return req('/api/admin/community/crawl?limit='+encodeURIComponent(limit||10),{method:'POST'},420000)},
    /* 本地 Node 后端健康检查：管理端用它展示 SQLite 真实统计（攻略 / 打卡 / 实体 / 城市） */
    backendHealth(){return req('/api/health',{},3000)}
  };
})();
