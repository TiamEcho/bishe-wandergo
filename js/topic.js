/* =========================================================
 * WANDERGO · 词条社区 topic.js
 * 词条广场（无 id 参数）/ 词条详情（?id=t1）
 * 数据全部来自 Spring Boot + MySQL，帖子含站内发布与 B 站爬虫抓取
 * ========================================================= */
const TOPIC_CODE = WGO.q('id') || '';
window.TW_TOPIC_NAMES = window.TW_TOPIC_NAMES || {};

const topicApp = Vue.createApp({
  data() {
    return {
      code: TOPIC_CODE,
      topics: [],
      topic: {},
      posts: [],
      recs: [],
      total: 0,
      sort: 'hot',
      kw: '',
      loading: true
    };
  },
  computed: {
    filteredTopics() {
      const k = this.kw.trim().toLowerCase();
      if (!k) return this.topics;
      return this.topics.filter(t => (t.name + (t.description || '')).toLowerCase().includes(k));
    },
    totalPosts() {
      return this.topics.reduce((s, t) => s + (t.postCount || 0), 0);
    },
    /* 关联景点用前端已有的目的地库，爬虫新增的 vlog / citywalk 没有关联景点就返回空 */
    spotChips() {
      const t = (typeof TOPICS !== 'undefined' ? TOPICS : []).find(x => x.id === this.code);
      if (!t) return [];
      return t.spots.map(id => (typeof SPOTS !== 'undefined' ? SPOTS.find(s => s.id === id) : null))
        .filter(Boolean).map(s => ({ id: s.id, n: s.n }));
    }
  },
  methods: {
    /* 后端字段 → 卡片字段：封面兜底、BGM 名称、词条名、时间裁剪 */
    deco(p) {
      const fallback = (typeof P !== 'undefined' && P[p.spotId]) ? IMG(P[p.spotId]) : IMG(P.erhai);
      const codes = (p.topics || '').split(',').filter(Boolean);
      return Object.assign({}, p, {
        _cover: TW.cover(p),
        _fallback: fallback,
        _bgm: TW.bgmName(p.bgm),
        _codes: codes,
        _chips: codes.map(c => window.TW_TOPIC_NAMES[c] || c),
        _time: (p.createdAt || '').slice(5, 16),
        _liked: false
      });
    },
    async loadTopics() {
      const r = await WGOAPI.topics();
      this.topics = (r && r.ok) ? r.list : [];
      this.topics.forEach(t => { window.TW_TOPIC_NAMES[t.code] = t.name; });
    },
    async loadTopic() {
      const r = await WGOAPI.topicDetail(this.code);
      if (r && r.ok) this.topic = r.topic;
      else { this.topic = { name: '词条不存在', description: '该词条可能已被合并或删除，返回广场看看其他词条。' }; }
    },
    async loadPosts() {
      const r = await WGOAPI.postList(this.code, this.sort, 0, 30);
      this.posts = (r && r.ok) ? r.list.map(this.deco) : [];
      this.total = (r && r.ok) ? r.total : 0;
    },
    async loadRecs() {
      const me = TW.me();
      const r = await WGOAPI.postRecommend(me ? me.nick : '', 4);
      this.recs = (r && r.ok) ? r.list.map(x => Object.assign(this.deco(x.post), { _reason: x.reason })) : [];
    },
    setSort(s) {
      if (this.sort === s) return;
      this.sort = s;
      this.loadPosts();
    },
    openTopic(code) {
      if (!code || code === this.code) return;
      WGO.go('topic.html', { id: code });
    },
    openPost(p) { openDbPost(p.id); },
    goPublish(code) { WGO.go('publish.html', { topic: code || this.code }); },
    goCommunity() { location.href = 'community.html'; },
    goMap(id) { WGO.go('map.html', { spot: id }); },
    /* 卡片上的点赞也走真实接口：成功才改数字，失败提示，不制造假互动 */
    async like(p) {
      if (!TW.requireLogin()) return;
      const r = await WGOAPI.postLike(p.id);
      if (!r || !r.ok) { toast((r && r.msg) || '点赞失败，请确认后端已启动'); return; }
      p._liked = r.liked;
      p.likeCount = r.count;
    }
  },
  async mounted() {
    window.TW_TOPIC_NAMES = window.TW_TOPIC_NAMES || {};
    this.loading = true;
    await this.loadTopics();
    if (this.code) { await Promise.all([this.loadTopic(), this.loadPosts()]); }
    await this.loadRecs();
    this.loading = false;
  }
});

/* 复用的帖子卡片：封面 / 类型 / B 站角标 / BGM / 词条 / 作者 / 点赞评论 */
topicApp.component('post-card', {
  props: { p: { type: Object, required: true } },
  emits: ['open', 'like', 'topic'],
  template: `
    <article class="tw-card" :class="{video:p.type==='video'}" @click="$emit('open',p)">
      <div class="tw-cover">
        <img :src="p._cover" :alt="p.title" loading="lazy" referrerpolicy="no-referrer" @error="imgErr">
        <span class="badge">{{ p.type==='video'?'🎬 视频':p.type==='plog'?'📷 Plog':'🖼 图文' }}</span>
        <span class="badge src" v-if="p.source==='bilibili'">📺 B站</span>
        <span class="bgm" v-if="p._bgm">♪ {{ p._bgm }}</span>
        <span class="vplay" v-if="p.type==='video'"><i>▶</i></span>
      </div>
      <div class="tw-body">
        <h4>{{ p.title }}</h4>
        <p class="txt" v-if="p.content">{{ p.content }}</p>
        <div class="tw-chips" v-if="p._codes.length">
          <span class="tw-chip" v-for="(c,i) in p._codes" :key="c" @click.stop="$emit('topic',c)"># {{ p._chips[i] }}</span>
        </div>
        <div class="tw-user">
          <span class="av">{{ (p.nick||'旅')[0] }}</span><b>{{ p.nick || '旅行者' }}</b>
          <span>{{ p.location || '' }}</span>
        </div>
        <div class="tw-foot">
          <span class="like" :class="{on:p._liked}" @click.stop="$emit('like',p)">{{ p._liked?'♥':'♡' }} {{ p.likeCount||0 }}</span>
          <span>💬 {{ p.commentCount||0 }}</span>
          <span class="sp">{{ p._time }}</span>
        </div>
        <span class="tw-reason" v-if="p._reason">✨ {{ p._reason }}</span>
      </div>
    </article>`,
  methods: {
    /* B 站封面带防盗链，失败时退回到站点图库，卡片不会出现破图 */
    imgErr(e) { e.target.onerror = null; if (this.p._fallback) e.target.src = this.p._fallback; }
  }
});

topicApp.mount('#topicApp');
