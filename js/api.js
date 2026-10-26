/* =========================================================
 * WANDERGO PLATFORM · API 层 api.js
 * 技术栈：Axios（异步请求）+ JWT（Authorization: Bearer）
 * 优先请求 Spring Boot 后端 (http://localhost:8080)
 * 超时 / 失败自动降级本地模式（localStorage + data.js）
 * ========================================================= */
const WGOAPI=(()=>{
  const BASE=localStorage.getItem('wgo_api')||'http://localhost:8080';
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
    req,status,
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
    /* 管理端（需 admin JWT） */
    adminOverview(){return req('/api/admin/overview')},
    adminSpots(kw){return req('/api/admin/spot/list?kw='+encodeURIComponent(kw||''))},
    adminSaveSpot(spot){return req('/api/admin/spot/save',{method:'POST',body:spot})},
    adminDelSpot(id){return req('/api/admin/spot/delete',{method:'POST',body:{id}})},
    adminUsers(){return req('/api/admin/user/list')},
    adminUserStatus(id,status){return req('/api/admin/user/status',{method:'POST',body:{id,status}})},
    adminAudit(status){return req('/api/admin/audit/list?status='+status)},
    adminAuditHandle(id,status){return req('/api/admin/audit/handle',{method:'POST',body:{id,status}})}
  };
})();
