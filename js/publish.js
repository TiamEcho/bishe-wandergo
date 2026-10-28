/* =========================================================
 * WANDERGO · 作品发布器 publish.js
 * 交互：类型切换 / 场景封面 / 词条多选 / BGM 搜索试听 / 定位联动
 * 提交：POST /api/post/add → 写入 MySQL → 跳转词条页
 * ========================================================= */
const PUB_TOPIC = WGO.q('topic') || '';

Vue.createApp({
  data() {
    return {
      type: 'img',
      title: '',
      content: '',
      cover: '',
      videoUrl: '',
      spotId: '',
      location: '',
      bgm: '',
      bgmKw: '',
      bgmList: [],
      topicPool: [],
      picked: PUB_TOPIC ? [PUB_TOPIC] : [],
      publishing: false,
      me: TW.me(),
      spots: (typeof SPOTS !== 'undefined' ? SPOTS : []).map(s => ({ id: s.id, n: s.n, city: s.city })),
      scenes: []
    };
  },
  computed: {
    preview() {
      if (this.cover) return this.cover;
      if (this.spotId && typeof P !== 'undefined' && P[this.spotId]) return IMG(P[this.spotId]);
      return '';
    },
    bvid() { return TW.bvid(this.videoUrl); },
    hotTopics() { return this.topicPool.slice(0, 5); }
  },
  methods: {
    /* 场景库：直接用前端图库的 12 个目的地，避免要求用户先上传图片 */
    buildScenes() {
      const keys = Object.keys(P).slice(0, 12);
      this.scenes = keys.map(k => {
        const s = this.spots.find(x => x.id === k);
        return { k, img: IMG(P[k]), name: s ? s.n : k, city: s ? s.city : '' };
      });
    },
    pickScene(s) {
      this.spotId = s.k;
      this.cover = '';
      this.location = s.city ? (s.city + ' · ' + s.name) : s.name;
    },
    onSpot() {
      const s = this.spots.find(x => x.id === this.spotId);
      if (s) this.location = s.city + ' · ' + s.n;
    },
    toggleTopic(code) {
      const i = this.picked.indexOf(code);
      if (i > -1) { this.picked.splice(i, 1); return; }
      if (this.picked.length >= 3) { toast('最多选 3 个词条'); return; }
      this.picked.push(code);
    },
    /* 输入即搜索：250ms 防抖，避免每敲一个字都打一次接口 */
    searchBgm() {
      clearTimeout(this._t);
      this._t = setTimeout(async () => {
        const r = await WGOAPI.bgmList(this.bgmKw.trim());
        this.bgmList = (r && r.ok) ? r.list : [];
      }, 250);
    },
    play(code) { TW.playBgm(code); },
    goCommunity() { location.href = 'community.html'; },
    async submit() {
      if (!this.me) {
        toast('发布前请先登录 ✈️');
        if (typeof openAuth === 'function') openAuth('login');
        return;
      }
      if (!this.title.trim() && !this.content.trim()) { toast('标题和正文至少填一个'); return; }
      if (this.type === 'video' && !this.videoUrl.trim()) { toast('视频类型需要填视频地址（B 站链接或 mp4 直链）'); return; }

      this.publishing = true;
      const payload = {
        title: this.title.trim(),
        content: this.content.trim(),
        type: this.type,
        cover: this.preview || '',
        videoUrl: this.videoUrl.trim(),
        bgm: this.bgm,
        topics: this.picked,
        spotId: this.spotId,
        location: this.location.trim()
      };
      const r = await WGOAPI.postAdd(payload);
      this.publishing = false;
      if (!r || !r.ok) {
        toast((r && r.msg) || '发布失败：请确认后端已启动且登录未过期');
        return;
      }
      toast('作品已发布，正在打开词条页…', 'ok');
      setTimeout(() => WGO.go('topic.html', { id: this.picked[0] || 'vlog' }), 600);
    }
  },
  async mounted() {
    this.buildScenes();
    /* 登录态可能在本页通过弹窗完成，轻度轮询保证「当前身份」卡片即时更新 */
    setInterval(() => { this.me = TW.me(); }, 1500);

    const [t, b] = await Promise.all([WGOAPI.topics(), WGOAPI.bgmList()]);
    this.topicPool = (t && t.ok) ? t.list : [];
    this.bgmList = (b && b.ok) ? b.list : [];
    this.topicPool.forEach(x => { window.TW_TOPIC_NAMES = window.TW_TOPIC_NAMES || {}; window.TW_TOPIC_NAMES[x.code] = x.name; });
    if (PUB_TOPIC && !this.topicPool.some(x => x.code === PUB_TOPIC)) this.picked = [];
  }
}).mount('#pubApp');
