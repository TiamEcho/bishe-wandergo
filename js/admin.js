/* =========================================================
 * WANDERGO 管理端 admin.js —— Vue 3 + Element Plus + Axios
 * 对接 Spring Boot /api/admin/*（JWT 鉴权，管理员账号 admin）
 * 后端未启动时可进入「离线演示模式」，用爬虫真实数据渲染表格
 * ========================================================= */
const { createApp } = Vue;
const { ElMessage, ElMessageBox } = ElementPlus;

const DEMO_AUDIT = [
  { id: 101, spotId: 'erhai', nick: '旅行者小林', content: '才村码头日出真的绝，六点半到刚好。', status: 0, createdAt: '演示数据' },
  { id: 102, spotId: 'gugong', nick: '橘子汽水', content: '建议从午门进，人少一半，别问我怎么知道的。', status: 0, createdAt: '演示数据' },
  { id: 103, spotId: 'erhai', nick: '阿柚', content: '环海西路骑行 12km，风大到怀疑人生，但值得。', status: 1, createdAt: '演示数据' },
  { id: 104, spotId: 'gugong', nick: '一只胖橘', content: '红墙黄瓦，随手一拍就是壁纸。', status: 2, createdAt: '演示数据' }
];

createApp({
  data() {
    return {
      token: localStorage.getItem('wgo_token') || '',
      nick: localStorage.getItem('wgo_nick') || 'admin',
      offline: false,
      loading: false,
      saving: false,
      tip: '默认管理员账号 admin / admin123（由 wandergo-db/upgrade_admin.sql 自动写入）',
      tipBad: false,
      form: { username: 'admin', password: '' },
      tab: 'spot',
      stats: [
        { k: '景点总数', v: '-', ic: '🏞' },
        { k: '注册用户', v: '-', ic: '👥' },
        { k: '打卡记录', v: '-', ic: '📍' },
        { k: '评分行为', v: '-', ic: '⭐' },
        { k: '待审核评论', v: '-', ic: '🛡' }
      ],
      spots: [], kw: '',
      users: [], audits: [], auditStatus: 0, pending: 0,
      /* 爬虫实时数据 tab：crawl 存后端统计，crawlLimit 是本次抓取条数，crawling 控制按钮 loading */
      crawl: { crawled: '-', manual: '-', lastCrawl: '', lastCrawlCount: 0 },
      crawlLimit: 5, crawling: false,
      /* 社区数据 tab：统计 + 帖子表 + 抓取条数 */
      community: { posts: '-', userPosts: '-', crawlPosts: '-', comments: '-', crawlComments: '-', topics: '-', lastCrawl: '' },
      communityList: [], communityLimit: 10, communityCrawling: false,
      /* 本地 Node + SQLite 后端（backend/）的真实统计，来自 GET /api/health */
      backend: { ok: false, guides: '-', checkins: '-', entities: '-', cities: '-', ai: '' },
      dlg: false, editing: {}
    };
  },
  computed: {
    /* 从全量景点里筛出「爬虫入库」的数据：source 以百度百科开头，或带 source_url 溯源链接。
       手工校准的 32 条这两者都为空，天然被排除，不用另开接口 */
    crawlList() {
      return this.spots.filter(s =>
        (s.source && String(s.source).indexOf('百度百科') === 0) || !!s.sourceUrl
      );
    }
  },
  mounted() {
    this.loadBackendStats();
    if (this.token) this.loadAll();
  },
  methods: {
    /* 本地 Node 后端统计：不依赖登录，直接用 /api/health 的真实计数 */
    async loadBackendStats() {
      const r = await WGOAPI.backendHealth();
      if (r && r.ok && r.stats) {
        this.backend = {
          ok: true,
          guides: r.stats.guides,
          checkins: r.stats.checkins,
          entities: r.stats.entities,
          cities: r.stats.cities,
          ai: (r.ai && r.ai.configured) ? `大模型已配置 · ${r.ai.model || ''}` : '大模型未配置 · 本地规则抽取'
        };
      } else {
        this.backend.ok = false;
      }
    },
    async doLogin() {
      if (!this.form.username || !this.form.password) { this.setTip('请输入账号与密码', true); return; }
      this.loading = true;
      const r = await WGOAPI.auth('login', { nick: this.form.username, pwd: this.form.password });
      this.loading = false;
      if (r && r.ok && r.role === 'admin') {
        this.token = r.token; this.nick = r.nick;
        localStorage.setItem('wgo_token', r.token);
        localStorage.setItem('wgo_nick', r.nick);
        this.setTip('登录成功，已连接 MySQL', false);
        this.loadAll();
      } else if (r && r.ok) {
        this.setTip('该账号不是管理员，请用 admin 登录', true);
      } else {
        this.setTip('后端未启动（localhost:8080）或账号密码错误，可先进入离线演示模式', true);
      }
    },
    demoMode() {
      this.offline = true;
      this.token = 'demo';
      this.nick = 'admin（演示）';
      this.loadDemo();
      this.loadBackendStats();
      ElMessage.success('已进入离线演示模式（数据来自爬虫抓取结果 spots_crawl.json）');
    },
    logout() {
      localStorage.removeItem('wgo_token');
      localStorage.removeItem('wgo_nick');
      this.token = ''; this.offline = false;
    },
    goHome(){ location.href = 'index.html'; },
    setTip(m, bad) { this.tip = m; this.tipBad = !!bad; },
    async loadAll() {
      await Promise.all([this.loadSpots(), this.loadUsers(), this.loadAudit(), this.loadStats()]);
    },
    onTab(name) {
      /* 切到「爬虫实时数据」时才拉统计，避免登录后一次性打太多接口；
         景点列表顺带刷新一次，保证表格里的 sourceUrl / crawlTime 是最新的 */
      if (name === 'crawl') { this.loadCrawlStats(); this.loadSpots(); }
      /* 社区数据：统计 + 帖子表一起拉，表格里 sourceUrl 可点开原视频 */
      if (name === 'community') { this.loadCommunityStats(); this.loadCommunityList(); }
    },
    /* 社区统计（帖子 / 站内发布 / B 站抓取 / 评论 / 词条数） */
    async loadCommunityStats() {
      if (this.offline) return;
      const r = await WGOAPI.adminCommunityStats();
      if (r && r.ok) this.community = r;
    },
    async loadCommunityList() {
      if (this.offline) return;
      const r = await WGOAPI.adminCommunityList(60);
      this.communityList = (r && r.ok) ? r.list : [];
    },
    /* 真实执行社区爬虫：后端同步阻塞几十秒，按钮 loading 并提示勿关页面 */
    async runCommunityCrawl() {
      if (this.offline) { ElMessage.warning('离线演示模式不执行真实爬虫'); return; }
      this.communityCrawling = true;
      try {
        const r = await WGOAPI.adminCommunityCrawl(this.communityLimit);
        if (r && r.ok) {
          ElMessage.success(`抓取完成：${r.total} 条视频，新增 ${r.inserted}、更新 ${r.updated}，评论 ${r.comments} 条（${r.seconds}s）`);
          await Promise.all([this.loadCommunityStats(), this.loadCommunityList()]);
        } else {
          ElMessage.error((r && (r.msg || r.log)) || '抓取失败，请查看后端日志');
        }
      } finally {
        this.communityCrawling = false;
      }
    },
    /* 爬虫统计（爬虫入库条数 / 手工校准条数 / 最近抓取时间） */
    async loadCrawlStats() {
      if (this.offline) return;
      const r = await WGOAPI.adminCrawlStats();
      if (r && r.ok) {
        this.crawl = {
          crawled: r.crawled, manual: r.manual,
          lastCrawl: r.lastCrawl || '', lastCrawlCount: r.lastCrawlCount || 0
        };
      }
    },
    /* 真实执行 Python 爬虫：后端同步阻塞几十秒，所以按钮 loading + 提示不要关页面 */
    async runCrawl() {
      if (this.offline) { ElMessage.warning('离线演示模式不执行真实爬虫'); return; }
      this.crawling = true;
      try {
        const r = await WGOAPI.adminCrawl(this.crawlLimit);
        if (r && r.ok) {
          ElMessage.success(`抓取完成：新增 ${r.inserted} 条，更新 ${r.updated} 条`);
          await Promise.all([this.loadCrawlStats(), this.loadSpots()]);
        } else {
          ElMessage.error((r && r.msg) || '抓取失败，请查看后端日志');
        }
      } finally {
        this.crawling = false;
      }
    },
    async loadStats() {
      if (this.offline) return;
      const r = await WGOAPI.adminOverview();
      if (r && r.ok) {
        this.stats[0].v = r.spots; this.stats[1].v = r.users; this.stats[2].v = r.checkins;
        this.stats[3].v = r.ratings; this.stats[4].v = r.pending; this.pending = r.pending;
      }
    },
    async loadSpots() {
      if (this.offline) return;
      const r = await WGOAPI.adminSpots(this.kw);
      this.spots = (r && r.ok) ? r.list : [];
    },
    async loadUsers() {
      if (this.offline) return;
      const r = await WGOAPI.adminUsers();
      this.users = (r && r.ok) ? r.list : [];
    },
    async loadAudit() {
      if (this.offline) {
        this.audits = DEMO_AUDIT.filter(a => a.status === this.auditStatus);
        this.pending = DEMO_AUDIT.filter(a => a.status === 0).length;
        return;
      }
      const r = await WGOAPI.adminAudit(this.auditStatus);
      this.audits = (r && r.ok) ? r.list : [];
    },
    openEdit(row) {
      this.editing = row ? JSON.parse(JSON.stringify(row)) : { region: 'cn', rating: 4.5, lng: 116.4, lat: 39.9 };
      this.dlg = true;
    },
    async saveSpot() {
      if (!this.editing.name || !this.editing.spotId) { ElMessage.warning('景点编码与名称必填'); return; }
      if (this.offline) {
        if (this.editing.id) {
          const i = this.spots.findIndex(s => s.id === this.editing.id);
          if (i > -1) this.spots.splice(i, 1, { ...this.editing });
        } else {
          this.editing.id = Date.now();
          this.spots.unshift({ ...this.editing });
        }
        this.dlg = false; ElMessage.success('已保存（离线演示，不写入 MySQL）');
        return;
      }
      this.saving = true;
      const r = await WGOAPI.adminSaveSpot(this.editing);
      this.saving = false;
      if (r && r.ok) { this.dlg = false; ElMessage.success('已保存到 MySQL'); this.loadSpots(); this.loadStats(); }
      else ElMessage.error('保存失败，请确认后端已启动');
    },
    async delSpot(row) {
      try { await ElMessageBox.confirm(`确定删除「${row.name}」？`, '删除确认', { type: 'warning' }); } catch (e) { return; }
      if (this.offline) { this.spots = this.spots.filter(s => s.id !== row.id); ElMessage.success('已删除（离线演示）'); return; }
      const r = await WGOAPI.adminDelSpot(row.id);
      if (r && r.ok) { ElMessage.success('已删除'); this.loadSpots(); this.loadStats(); }
      else ElMessage.error('删除失败');
    },
    async toggleUser(row, val) {
      if (this.offline) { row.status = val ? 1 : 0; ElMessage.success('已切换（离线演示）'); return; }
      const r = await WGOAPI.adminUserStatus(row.id, val ? 1 : 0);
      if (r && r.ok) { row.status = val ? 1 : 0; ElMessage.success(val ? '已解封' : '已封禁'); }
      else ElMessage.error('操作失败');
    },
    async handleAudit(row, status) {
      if (this.offline) {
        row.status = status;
        this.audits = DEMO_AUDIT.filter(a => a.status === this.auditStatus);
        this.pending = DEMO_AUDIT.filter(a => a.status === 0).length;
        ElMessage.success(status === 1 ? '已通过（离线演示）' : '已驳回（离线演示）');
        return;
      }
      const r = await WGOAPI.adminAuditHandle(row.id, status);
      if (r && r.ok) { ElMessage.success(status === 1 ? '已通过' : '已驳回'); this.loadAudit(); this.loadStats(); }
      else ElMessage.error('操作失败');
    },
    async loadDemo() {
      let crawl = [];
      try {
        const res = await fetch('js/spots_crawl.json');
        crawl = await res.json();
      } catch (e) { crawl = []; }
      this.spots = (Array.isArray(crawl) ? crawl : []).map((x, i) => ({
        id: i + 1,
        spotId: x.spot_id || x.id || ('crawl' + i),
        name: x.name || '',
        city: x.city || '',
        province: x.province || '',
        region: x.region || 'cn',
        lng: x.lng, lat: x.lat,
        rating: x.rating || 4.5,
        price: x.price || '—',
        hours: x.hours || '', traffic: x.traffic || '',
        address: x.address || '', description: x.desc || x.description || '',
        source: x.src || x.source || '', sourceUrl: x.source_url || '', crawlTime: x.crawl_time || ''
      }));
      const albums = JSON.parse(localStorage.getItem('fmw_albums') || '[]');
      const names = [...new Set(albums.map(a => a.city).filter(Boolean))].slice(0, 5);
      this.users = [
        { id: 1, username: 'admin', role: 'admin', status: 1, createdAt: '演示数据' },
        ...names.map((n, i) => ({ id: i + 2, username: '旅行者·' + n, role: 'user', status: 1, createdAt: '演示数据' }))
      ];
      this.stats[0].v = this.spots.length;
      this.stats[1].v = this.users.length;
      this.stats[2].v = albums.length;
      this.stats[3].v = Object.keys(getRatesSafe()).length;
      this.pending = DEMO_AUDIT.filter(a => a.status === 0).length;
      this.stats[4].v = this.pending;
      /* 离线演示时爬虫 tab 也给出条数，避免用户切过去看到三个「-」以为页面坏了 */
      this.crawl = { crawled: this.spots.length, manual: 0, lastCrawl: '演示数据', lastCrawlCount: this.spots.length };
      this.audits = DEMO_AUDIT.filter(a => a.status === this.auditStatus);
    }
  }
}).use(ElementPlus).mount('#adminApp');

function getRatesSafe() {
  try { return JSON.parse(localStorage.getItem('fmw_rates') || '{}'); } catch (e) { return {}; }
}
