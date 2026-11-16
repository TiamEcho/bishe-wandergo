package com.wandergo.ai;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.wandergo.entity.CheckinRecord;
import com.wandergo.entity.Guide;
import com.wandergo.entity.RatingRecord;
import com.wandergo.entity.Spot;
import com.wandergo.entity.User;
import com.wandergo.mapper.CheckinRecordMapper;
import com.wandergo.mapper.GuideMapper;
import com.wandergo.mapper.RatingRecordMapper;
import com.wandergo.mapper.SpotMapper;
import com.wandergo.mapper.UserMapper;
import com.wandergo.service.RecommendService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * AI 能力服务 —— 本项目 6 项 AI 功能的统一实现。
 *
 * 设计原则（论文「AI 技术应用」章节与此一一对应）：
 *  1) 大模型（DeepSeek）只负责「语义理解 / 生成」，不做精确数值计算与硬约束；
 *  2) 凡是模型不可用（未配 Key、超时、返回不合法），一律降级到站内规则，
 *     并在响应的 engine 字段里如实标注 ai / rule，前端也据此显示标识；
 *  3) 景点、坐标、评分、公交时长等事实数据全部来自 MySQL，不采信模型编造。
 */
@Service
public class AiService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AiService.class);

    @Autowired private DeepSeekClient ai;
    @Autowired private SpotMapper spotMapper;
    @Autowired private RatingRecordMapper ratingMapper;
    @Autowired private CheckinRecordMapper checkinMapper;
    @Autowired private GuideMapper guideMapper;
    @Autowired private UserMapper userMapper;
    @Autowired private RecommendService recommendService;

    /* ================================================================
     * 通用：兴趣词典。模型不可用时用它对自由文本做关键词命中，
     * 是全站「兴趣识别」的降级依据，也用于给景点打兴趣标签
     * ================================================================ */
    private static final Map<String, String[]> INTEREST_LEX = new LinkedHashMap<>();
    static {
        INTEREST_LEX.put("自然风光", new String[]{"山", "湖", "海", "岛", "森林", "峡谷", "瀑布", "草原", "湿地", "江河", "冰川", "沙滩", "溪", "峰"});
        INTEREST_LEX.put("历史人文", new String[]{"古城", "古镇", "博物馆", "寺", "庙", "故宫", "遗址", "故居", "陵", "城墙", "石窟", "书院", "文物"});
        INTEREST_LEX.put("美食探店", new String[]{"美食", "吃", "小吃", "夜市", "餐厅", "火锅", "街", "菜", "烧烤", "咖啡", "甜品", "面"});
        INTEREST_LEX.put("摄影出片", new String[]{"拍照", "摄影", "出片", "机位", "日落", "日出", "夜景", "打卡", "网红"});
        INTEREST_LEX.put("亲子家庭", new String[]{"亲子", "孩子", "小孩", "儿童", "乐园", "动物园", "海洋馆", "科普"});
        INTEREST_LEX.put("休闲度假", new String[]{"度假", "温泉", "放松", "慢生活", "民宿", "躺平", "泡汤"});
        INTEREST_LEX.put("购物逛街", new String[]{"购物", "商场", "买", "免税", "集市", "步行街", "文创"});
        INTEREST_LEX.put("户外徒步", new String[]{"徒步", "登山", "露营", "骑行", "溯溪", "攀岩", "越野"});
    }

    /* ================================================================
     * 功能 1：AI 旅游需求识别
     *  输入：用户一段自然语言（如「下个月想去成都玩 3 天，两个人，预算 3000，喜欢美食和摄影」）
     *  输出：destination / days / people / budget / interests / month / pace
     *  实现：DeepSeek 结构化抽取 → 失败降级正则 + 词典
     * ================================================================ */
    public Map<String, Object> parseNeed(String text) {
        String q = text == null ? "" : text.trim();
        Map<String, Object> out = new LinkedHashMap<>();
        if (q.isEmpty()) {
            out.put("ok", false);
            out.put("message", "请输入旅行需求描述");
            return out;
        }

        String system = """
                你是旅游需求结构化解析器。从用户的话里抽取以下字段，无法判断的填 null：
                destination 目的地（只填城市或省份，不带「去/想」等词）
                days 出行天数（整数）
                people 人数（整数）
                budget 预算总额（人民币整数，没有则 null）
                interests 兴趣偏好数组，只能从这 8 个里选：
                  自然风光 / 历史人文 / 美食探店 / 摄影出片 / 亲子家庭 / 休闲度假 / 购物逛街 / 户外徒步
                month 出行月份（1-12 的整数）
                pace 节奏，只能是 轻松 / 适中 / 紧凑 之一
                只输出严格 JSON，不要解释、不要 markdown。格式：
                {"destination":"成都","days":3,"people":2,"budget":3000,
                 "interests":["美食探店","摄影出片"],"month":5,"pace":"适中"}""";

        JsonNode j = ai.chatJson(system, q);
        Map<String, Object> need = j == null ? null : normalizeNeed(j, q);
        boolean isAi = need != null;
        if (need == null) need = ruleNeed(q);

        out.put("ok", true);
        out.put("engine", isAi ? "ai" : "rule");
        out.put("engineLabel", isAi ? "DeepSeek 大模型识别" : "本地规则识别（未配置 AI Key 或调用失败）");
        out.put("model", isAi ? ai.model() : null);
        out.putAll(need);
        /* 把识别结果拼成一句可读回执，方便前端直接展示「我理解成了…」 */
        out.put("readback", readback(need));
        return out;
    }

    @SuppressWarnings("unchecked")
    private String readback(Map<String, Object> n) {
        StringBuilder sb = new StringBuilder("我理解为：");
        Object dest = n.get("destination");
        sb.append(dest == null ? "目的地待定" : "去 " + dest);
        Object days = n.get("days");
        if (days != null) sb.append("，玩 ").append(days).append(" 天");
        Object people = n.get("people");
        if (people != null) sb.append("，").append(people).append(" 人");
        Object budget = n.get("budget");
        if (budget != null) sb.append("，预算 ").append(budget).append(" 元");
        Object month = n.get("month");
        if (month != null) sb.append("，").append(month).append(" 月出行");
        List<String> ints = (List<String>) n.get("interests");
        if (ints != null && !ints.isEmpty()) sb.append("，偏好 ").append(String.join("、", ints));
        Object pace = n.get("pace");
        if (pace != null) sb.append("，节奏 ").append(pace);
        return sb.append("。").toString();
    }

    /** 模型结果归一化：类型纠错 + 兴趣限定在 8 类白名单内 */
    private Map<String, Object> normalizeNeed(JsonNode j, String raw) {
        Map<String, Object> m = new LinkedHashMap<>();
        String dest = txt(j, "destination");
        if (dest != null) {
            dest = dest.replaceAll("^(去|到|想去|准备去|打算去)", "").replaceAll("(市|省)$", "").trim();
            if (dest.isEmpty() || dest.length() > 12) dest = null;
        }
        m.put("destination", dest);
        m.put("days", intOrNull(j, "days", 1, 30));
        m.put("people", intOrNull(j, "people", 1, 50));
        m.put("budget", intOrNull(j, "budget", 100, 1_000_000));
        m.put("month", intOrNull(j, "month", 1, 12));

        List<String> ints = new ArrayList<>();
        JsonNode arr = j.path("interests");
        if (arr.isArray()) for (JsonNode n : arr) {
            String s = n.asText("").trim();
            if (INTEREST_LEX.containsKey(s) && !ints.contains(s)) ints.add(s);
        }
        /* 模型一个都没命中白名单时，用规则从原文再捞一次，避免兴趣整体丢失 */
        if (ints.isEmpty()) ints = ruleInterests(raw);
        m.put("interests", ints);

        String pace = txt(j, "pace");
        if (pace == null || !List.of("轻松", "适中", "紧凑").contains(pace)) {
            pace = guessPace(raw);
        }
        m.put("pace", pace);
        return m;
    }

    private String txt(JsonNode j, String key) {
        JsonNode n = j.path(key);
        if (n.isMissingNode() || n.isNull()) return null;
        String s = n.asText("").trim();
        return s.isEmpty() || "null".equalsIgnoreCase(s) ? null : s;
    }

    private Integer intOrNull(JsonNode j, String key, int min, int max) {
        JsonNode n = j.path(key);
        if (n.isMissingNode() || n.isNull()) return null;
        int v;
        if (n.isNumber()) v = n.asInt();
        else {
            String s = n.asText("").replaceAll("[^0-9]", "");
            if (s.isEmpty()) return null;
            v = Integer.parseInt(s);
        }
        return v >= min && v <= max ? v : null;
    }

    /* ---- 规则降级：正则 + 词典 ---- */
    private static final String[] CITY_HINTS = {
            "北京", "上海", "广州", "深圳", "成都", "重庆", "西安", "杭州", "南京", "苏州", "武汉", "长沙",
            "厦门", "青岛", "大连", "天津", "昆明", "大理", "丽江", "三亚", "桂林", "贵阳", "哈尔滨", "沈阳",
            "郑州", "济南", "合肥", "福州", "南昌", "南宁", "海口", "兰州", "西宁", "银川", "乌鲁木齐", "拉萨",
            "呼和浩特", "太原", "石家庄", "长春", "宁波", "无锡", "常州", "温州", "绍兴", "泉州", "珠海",
            "佛山", "东莞", "惠州", "洛阳", "开封", "敦煌", "张家界", "黄山", "婺源", "西双版纳", "香格里拉",
            "香港", "澳门", "台北", "东京", "大阪", "京都", "首尔", "曼谷", "清迈", "新加坡", "巴厘岛",
            "巴黎", "伦敦", "罗马", "冰岛", "瑞士", "土耳其", "埃及"
    };

    private Map<String, Object> ruleNeed(String q) {
        Map<String, Object> m = new LinkedHashMap<>();
        String dest = null;
        for (String c : CITY_HINTS) if (q.contains(c)) { dest = c; break; }
        if (dest == null) {
            var mt = java.util.regex.Pattern
                    .compile("(?:去|到|想去|目的地[:：]?)\\s*([\\u4e00-\\u9fa5]{2,6})").matcher(q);
            if (mt.find()) dest = mt.group(1).replaceAll("(玩|旅游|旅行|几天|天|市|省).*$", "");
        }
        m.put("destination", dest);

        Integer days = null;
        var md = java.util.regex.Pattern.compile("(\\d{1,2})\\s*[天日]").matcher(q);
        if (md.find()) days = Integer.parseInt(md.group(1));
        if (days == null) {
            if (q.contains("周末")) days = 2;
            else if (q.contains("小长假")) days = 3;
            else if (q.contains("一周") || q.contains("7天")) days = 7;
        }
        m.put("days", days != null && days >= 1 && days <= 30 ? days : null);

        Integer people = null;
        var mp = java.util.regex.Pattern.compile("(\\d{1,2})\\s*[个]?人").matcher(q);
        if (mp.find()) people = Integer.parseInt(mp.group(1));
        else if (q.contains("一个人") || q.contains("独自") || q.contains("单人")) people = 1;
        else if (q.contains("两个人") || q.contains("情侣") || q.contains("双人")) people = 2;
        else if (q.contains("一家") || q.contains("全家") || q.contains("带孩子")) people = 3;
        m.put("people", people);

        Integer budget = null;
        var mb = java.util.regex.Pattern.compile("预算[^0-9]{0,4}(\\d{2,7})").matcher(q);
        if (mb.find()) budget = Integer.parseInt(mb.group(1));
        else {
            var mb2 = java.util.regex.Pattern.compile("(\\d{2,7})\\s*(?:元|块|rmb|RMB)").matcher(q);
            if (mb2.find()) budget = Integer.parseInt(mb2.group(1));
        }
        m.put("budget", budget);

        Integer month = null;
        var mm = java.util.regex.Pattern.compile("(\\d{1,2})\\s*月").matcher(q);
        if (mm.find()) month = Integer.parseInt(mm.group(1));
        else if (q.contains("下个月")) month = java.time.LocalDate.now().plusMonths(1).getMonthValue();
        else if (q.contains("这个月") || q.contains("本月")) month = java.time.LocalDate.now().getMonthValue();
        m.put("month", month != null && month >= 1 && month <= 12 ? month : null);

        m.put("interests", ruleInterests(q));
        m.put("pace", guessPace(q));
        return m;
    }

    private List<String> ruleInterests(String q) {
        List<String> out = new ArrayList<>();
        for (var e : INTEREST_LEX.entrySet()) {
            for (String kw : e.getValue()) {
                if (q.contains(kw)) { out.add(e.getKey()); break; }
            }
        }
        return out;
    }

    private String guessPace(String q) {
        if (q.matches(".*(躺平|慢慢|悠闲|轻松|不赶).*")) return "轻松";
        if (q.matches(".*(特种兵|赶|紧凑|尽量多|全都).*")) return "紧凑";
        return "适中";
    }

    /* ================================================================
     * 功能 2 + 3：AI 模块化攻略生成 + 智能路线规划
     * 一次请求生成 5 张独立卡片：概览 / 景点推荐 / 每日路线 / 交通方式 / 费用预算
     * 景点一律以 MySQL 的 scenic_spot 为准（库里没有的模型提名会被丢弃并记录）
     * ================================================================ */
    public Map<String, Object> generatePlan(String destination, Integer days, Integer people,
                                            Integer budget, List<String> interests, String pace) {
        String city = destination == null ? "" : destination.trim();
        Map<String, Object> out = new LinkedHashMap<>();
        if (city.isEmpty()) {
            out.put("ok", false);
            out.put("message", "destination 不能为空");
            return out;
        }
        int d = days == null || days < 1 ? 3 : Math.min(days, 15);
        int p = people == null || people < 1 ? 2 : Math.min(people, 30);

        /* ① 站内候选景点池：只认同名城市，缺了就按全文模糊命中 */
        List<Spot> pool = spotMapper.selectList(new LambdaQueryWrapper<Spot>()
                .and(w -> w.eq(Spot::getCity, city).or().like(Spot::getCity, city))
                .orderByDesc(Spot::getHeat));
        if (pool.isEmpty()) {
            pool = spotMapper.selectList(new LambdaQueryWrapper<Spot>()
                    .like(Spot::getName, city).or().like(Spot::Province, city)
                    .orderByDesc(Spot::getHeat));
        }
        pool = pool.stream().filter(s -> s.getLng() != null && s.getLat() != null)
                .limit(60).collect(Collectors.toList());

        /* ② 让模型从站内池里挑点并排序（只能挑池内已有的，杜绝编造） */
        List<Spot> picked = null;
        JsonNode j = null;
        if (!pool.isEmpty()) {
            String poolNames = pool.stream().map(Spot::getName).collect(Collectors.joining("、"));
            String system = """
                    你是资深旅行规划师。用户给了候选景点清单，你只能从清单里挑选并分组，不得编造清单外的景点。
                    请按地理邻近与游玩节奏把景点分到每一天，并给出每天的交通方式与时间安排。
                    只输出严格 JSON，不要解释、不要 markdown。格式：
                    {"days":[{"day":1,"theme":"老城人文","spots":["景点A","景点B"],
                      "morning":"…","afternoon":"…","evening":"…","transport":"地铁 2 号线 + 步行"},
                     {"day":2,...}],
                     "summary":"一句话总结这条线路的特点",
                     "tips":["提示1","提示2"]}""";
            String user = "目的地：" + city + "\n天数：" + d + "\n人数：" + p
                    + "\n兴趣：" + (interests == null || interests.isEmpty() ? "无特别偏好" : String.join("、", interests))
                    + "\n节奏：" + pace + "\n候选景点：" + poolNames;
            j = ai.chatJson(system, user);
        }

        List<Map<String, Object>> dayCards = new ArrayList<>();
        List<String> usedNames = new ArrayList<>();
        List<String> dropped = new ArrayList<>();

        if (j != null && j.path("days").isArray()) {
            for (JsonNode dn : j.path("days")) {
                List<Spot> daySpots = new ArrayList<>();
                for (JsonNode sn : dn.path("spots")) {
                    String name = sn.asText("").trim();
                    if (name.isEmpty()) continue;
                    Spot hit = matchSpot(pool, name);
                    if (hit == null) {
                        if (!dropped.contains(name)) dropped.add(name);
                        continue;
                    }
                    if (usedNames.contains(hit.getName())) continue;
                    usedNames.add(hit.getName());
                    daySpots.add(hit);
                }
                if (daySpots.isEmpty()) continue;
                Map<String, Object> card = new LinkedHashMap<>();
                card.put("day", dn.path("day").asInt(dayCards.size() + 1));
                card.put("theme", clean(dn.path("theme").asText("")));
                card.put("spots", daySpots.stream().map(this::spotBrief).collect(Collectors.toList()));
                card.put("morning", clean(dn.path("morning").asText("")));
                card.put("afternoon", clean(dn.path("afternoon").asText("")));
                card.put("evening", clean(dn.path("evening").asText("")));
                card.put("transport", clean(dn.path("transport").asText("")));
                card.put("distanceKm", routeLengthKm(daySpots));
                card.put("estimatedHours", daySpots.size() * 2.5);
                dayCards.add(card);
            }
        }

        boolean aiOk = !dayCards.isEmpty();
        /* ③ 降级：模型不可用 / 挑点全被丢弃 → 按距离做贪心就近分组（确定性算法） */
        if (!aiOk && !pool.isEmpty()) {
            dayCards = ruleDays(city, pool, d, interests, pace);
            aiOk = false;
        }
        if (dayCards.isEmpty()) {
            out.put("ok", false);
            out.put("message", "站内暂未收录「" + city + "」的景点，无法生成攻略");
            out.put("engine", "none");
            return out;
        }

        /* ④ 费用预算模块：按人数、天数、节奏做区间估算（规则计算，不是模型编的） */
        Map<String, Object> cost = budgetCard(d, p, budget, pace);

        out.put("ok", true);
        out.put("engine", aiOk ? "ai" : "rule");
        out.put("engineLabel", aiOk ? "DeepSeek 大模型生成（景点均来自站内库）"
                : "站内库 + 规则算法生成（未配置 AI Key 或调用失败）");
        out.put("model", aiOk ? ai.model() : null);
        out.put("destination", city);
        out.put("days", d);
        out.put("people", p);
        out.put("interests", interests == null ? List.of() : interests);
        out.put("pace", pace == null ? "适中" : pace);

        /* 五张卡片，前端按 card.type 渲染不同模块 */
        List<Map<String, Object>> cards = new ArrayList<>();
        cards.add(overviewCard(city, d, p, interests, pace, dayCards, out.get("engineLabel").toString()));
        cards.add(spotCard(city, dayCards));
        cards.add(routeCard(dayCards));
        cards.add(transportCard(city, dayCards));
        cards.add(cost);
        out.put("cards", cards);
        out.put("dropped", dropped);       /* 模型提到但站内库没有的景点，如实回传便于核查 */
        out.put("tips", j != null && j.path("tips").isArray()
                ? jsonList(j.path("tips")) : ruleTips(city, pace));
        out.put("summary", j == null ? null : clean(j.path("summary").asText("")));
        return out;
    }

    private String clean(String s) {
        return s == null ? "" : s.trim();
    }

    private List<String> jsonList(JsonNode arr) {
        List<String> out = new ArrayList<>();
        for (JsonNode n : arr) {
            String s = n.asText("").trim();
            if (!s.isEmpty()) out.add(s);
        }
        return out;
    }

    /** 名称匹配：完全相等 → 互相包含（「武侯祠」↔「武侯祠·锦里」） */
    private Spot matchSpot(List<Spot> pool, String name) {
        for (Spot s : pool) if (s.getName() != null && s.getName().equals(name)) return s;
        for (Spot s : pool) {
            if (s.getName() == null) continue;
            if (s.getName().contains(name) || name.contains(s.getName())) return s;
        }
        return null;
    }

    private Map<String, Object> spotBrief(Spot s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getSpotId());
        m.put("name", s.getName());
        m.put("city", s.getCity());
        m.put("lng", s.getLng());
        m.put("lat", s.getLat());
        m.put("rating", s.getRating());
        m.put("heat", s.getHeat());
        m.put("price", s.getPrice());
        m.put("tags", s.getTags());
        m.put("poiType", s.getPoiType());
        m.put("cover", s.getCover());
        m.put("intro", s.getIntro() == null ? "" : s.getIntro());
        return m;
    }

    /** 单日线路长度（相邻景点球面距离累加） */
    private double routeLengthKm(List<Spot> list) {
        double sum = 0;
        for (int i = 1; i < list.size(); i++) sum += haversine(list.get(i - 1), list.get(i));
        return Math.round(sum * 10) / 10.0;
    }

    private double haversine(Spot a, Spot b) {
        double R = 6371.0, dLat = Math.toRadians(b.getLat() - a.getLat()),
                dLng = Math.toRadians(b.getLng() - a.getLng());
        double h = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(a.getLat())) * Math.cos(Math.toRadians(b.getLat()))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * R * Math.asin(Math.sqrt(h));
    }

    /** 规则降级：按热度取点 → 贪心最近邻排序 → 均匀切成 d 段，保证每天地理上连贯 */
    private List<Map<String, Object>> ruleDays(String city, List<Spot> pool, int d,
                                               List<String> interests, String pace) {
        int perDay = "轻松".equals(pace) ? 2 : 3;
        int need = Math.min(pool.size(), d * perDay);
        List<Spot> base = pool.stream().limit(Math.max(need, Math.min(pool.size(), d + 2)))
                .collect(Collectors.toList());
        /* 贪心最近邻：从第一个点出发，每次去最近的未访问点 */
        List<Spot> ordered = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        Spot cur = base.get(0);
        ordered.add(cur); seen.add(cur.getSpotId());
        while (ordered.size() < base.size()) {
            Spot next = null; double best = Double.MAX_VALUE;
            for (Spot s : base) {
                if (seen.contains(s.getSpotId())) continue;
                double dd = haversine(cur, s);
                if (dd < best) { best = dd; next = s; }
            }
            if (next == null) break;
            ordered.add(next); seen.add(next.getSpotId()); cur = next;
        }

        List<Map<String, Object>> out = new ArrayList<>();
        int n = ordered.size();
        int per = Math.max(1, (int) Math.ceil(n / (double) d));
        for (int i = 0; i < d; i++) {
            int from = i * per, to = Math.min(n, from + per);
            if (from >= n) break;
            List<Spot> seg = ordered.subList(from, to);
            Map<String, Object> card = new LinkedHashMap<>();
            card.put("day", i + 1);
            card.put("theme", "第 " + (i + 1) + " 天 · 就近串联");
            card.put("spots", seg.stream().map(this::spotBrief).collect(Collectors.toList()));
            card.put("morning", seg.isEmpty() ? "" : "游览 " + seg.get(0).getName());
            card.put("afternoon", seg.size() > 1 ? "前往 " + seg.get(1).getName() : "自由活动");
            card.put("evening", seg.size() > 2 ? "夜游 " + seg.get(2).getName() : "就近用晚餐");
            card.put("transport", "步行 / 地铁，相邻景点约 " + Math.round(routeLengthKm(seg)) + " 公里");
            card.put("distanceKm", routeLengthKm(seg));
            card.put("estimatedHours", seg.size() * 2.5);
            out.add(card);
        }
        return out;
    }

    /* ---------- 五张卡片 ---------- */
    private Map<String, Object> overviewCard(String city, int days, int people, List<String> ints,
                                             String pace, List<Map<String, Object>> dayCards, String engineLabel) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("type", "overview");
        c.put("title", city + " " + days + " 天行程概览");
        c.put("items", List.of(
                item("目的地", city),
                item("行程天数", days + " 天"),
                item("出行人数", people + " 人"),
                item("节奏偏好", pace == null ? "适中" : pace),
                item("兴趣偏好", ints == null || ints.isEmpty() ? "无特别偏好" : String.join("、", ints)),
                item("景点总数", dayCards.stream().mapToInt(dc -> ((List<?>) dc.get("spots")).size()).sum() + " 个")
        ));
        c.put("note", engineLabel);
        return c;
    }

    private Map<String, Object> spotCard(String city, List<Map<String, Object>> dayCards) {
        Set<String> names = new LinkedHashSet<>();
        List<Map<String, Object>> items = new ArrayList<>();
        for (Map<String, Object> dc : dayCards) {
            for (Object o : (List<?>) dc.get("spots")) {
                Map<?, ?> m = (Map<?, ?>) o;
                String name = String.valueOf(m.get("name"));
                if (names.add(name)) {
                    Map<String, Object> it = new LinkedHashMap<>();
                    it.put("name", name);
                    it.put("day", dc.get("day"));
                    it.put("rating", m.get("rating"));
                    it.put("price", m.get("price"));
                    it.put("tags", m.get("tags"));
                    it.put("poiType", m.get("poiType"));
                    it.put("intro", m.get("intro"));
                    it.put("cover", m.get("cover"));
                    items.add(it);
                }
            }
        }
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("type", "spots");
        c.put("title", city + " 推荐景点（" + items.size() + " 处）");
        c.put("items", items);
        c.put("note", "全部来自站内景点库 scenic_spot，含评分与门票参考价");
        return c;
    }

    private Map<String, Object> routeCard(List<Map<String, Object>> dayCards) {
        List<Map<String, Object>> items = new ArrayList<>();
        for (Map<String, Object> dc : dayCards) {
            Map<String, Object> it = new LinkedHashMap<>();
            it.put("day", dc.get("day"));
            it.put("theme", dc.get("theme"));
            List<String> path = new ArrayList<>();
            for (Object o : (List<?>) dc.get("spots")) path.add(String.valueOf(((Map<?, ?>) o).get("name")));
            it.put("path", String.join(" → ", path));
            it.put("distanceKm", dc.get("distanceKm"));
            it.put("morning", dc.get("morning"));
            it.put("afternoon", dc.get("afternoon"));
            it.put("evening", dc.get("evening"));
            items.add(it);
        }
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("type", "route");
        c.put("title", "每日路线");
        c.put("items", items);
        c.put("note", "景点顺序按地理邻近编排，distanceKm 为当日相邻景点球面距离累加");
        return c;
    }

    private Map<String, Object> transportCard(String city, List<Map<String, Object>> dayCards) {
        List<Map<String, Object>> items = new ArrayList<>();
        for (Map<String, Object> dc : dayCards) {
            double km = ((Number) dc.getOrDefault("distanceKm", 0)).doubleValue();
            Map<String, Object> it = new LinkedHashMap<>();
            it.put("day", dc.get("day"));
            it.put("suggestion", dc.get("transport"));
            /* 交通时长按城市道路经验速度换算：<5km 步行/地铁，5-15km 地铁/打车，>15km 建议包车 */
            String mode;
            int minutes;
            if (km < 5) { mode = "步行 + 地铁"; minutes = (int) Math.round(km / 4.5 * 60); }
            else if (km < 15) { mode = "地铁 / 网约车"; minutes = (int) Math.round(km / 22 * 60); }
            else { mode = "包车 / 城际大巴"; minutes = (int) Math.round(km / 45 * 60); }
            it.put("mode", mode);
            it.put("minutes", minutes);
            items.add(it);
        }
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("type", "transport");
        c.put("title", city + " 城内交通方式");
        c.put("items", items);
        c.put("note", "时长按步行 4.5km/h、城市道路 22km/h、城际 45km/h 的经验速度估算，仅供规划参考");
        return c;
    }

    /**
     * 费用预算模块：全部为可解释的规则计算，不使用模型臆测数值。
     * 人均住宿按节奏与城市档次取 220 元/晚（经济型），餐饮 120 元/天，门票按 45 元/景点。
     */
    private Map<String, Object> budgetCard(int days, int people, Integer budget, String pace) {
        int nights = Math.max(0, days - 1);
        double hotelPerNight = 220;
        double foodPerDay = "轻松".equals(pace) ? 150 : 120;
        double ticketPerSpot = 45;
        int spotsPerDay = "轻松".equals(pace) ? 2 : 3;

        double hotel = hotelPerNight * nights * Math.ceil(people / 2.0);
        double food = foodPerDay * days * people;
        double ticket = ticketPerSpot * spotsPerDay * days * people;
        double localTrans = 40.0 * days * people;
        double longTrans = 600.0 * people;          /* 往返大交通按人均 600 估算，实际以出发地为准 */
        double total = hotel + food + ticket + localTrans + longTrans;

        List<Map<String, Object>> items = new ArrayList<>();
        items.add(item("住宿", Math.round(hotel) + " 元", nights + " 晚 × " + hotelPerNight + " 元/间（2 人一间）"));
        items.add(item("餐饮", Math.round(food) + " 元", foodPerDay + " 元/人/天 × " + days + " 天 × " + people + " 人"));
        items.add(item("门票", Math.round(ticket) + " 元", ticketPerSpot + " 元/景点 × 约 " + (spotsPerDay * days) + " 个景点 × " + people + " 人"));
        items.add(item("市内交通", Math.round(localTrans) + " 元", "40 元/人/天 × " + days + " 天"));
        items.add(item("往返大交通", Math.round(longTrans) + " 元", "600 元/人 估算，实际以出发地为准"));
        items.add(item("合计", Math.round(total) + " 元", "人均约 " + Math.round(total / people) + " 元"));

        Map<String, Object> c = new LinkedHashMap<>();
        c.put("type", "budget");
        c.put("title", "费用预算");
        c.put("items", items);
        c.put("total", Math.round(total));
        c.put("perPerson", Math.round(total / people));
        if (budget != null && budget > 0) {
            c.put("userBudget", budget);
            c.put("fits", total <= budget * 1.1);
            c.put("advice", total <= budget
                    ? "按此方案总花费约 " + Math.round(total) + " 元，在你的预算 " + budget + " 元以内。"
                    : "按此方案总花费约 " + Math.round(total) + " 元，超出预算 " + Math.round(total - budget)
                    + " 元，可减少 1 晚住宿或压缩门票开销。");
        }
        c.put("note", "预算为规则估算（住宿/餐饮/门票/交通四项分项计算），不是模型生成的数字");
        return c;
    }

    private Map<String, Object> item(String k, String v) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("label", k); m.put("value", v);
        return m;
    }

    private Map<String, Object> item(String k, String v, String sub) {
        Map<String, Object> m = item(k, v);
        m.put("sub", sub);
        return m;
    }

    private List<String> ruleTips(String city, String pace) {
        List<String> t = new ArrayList<>();
        t.add("旺季热门景点建议提前 1-3 天在官方公众号预约");
        t.add("优先使用地铁出行，避开早晚高峰（7:30-9:00 / 17:30-19:00）");
        if ("轻松".equals(pace)) t.add("每天安排 2 个主景点即可，留出休息与用餐时间");
        else t.add("每天 3 个景点之间距离较近，可连续步行完成");
        t.add(city + " 部分景区周一会闭馆，出发前确认开放时间");
        return t;
    }

    /* ================================================================
     * 功能 5：旅游攻略 / 打卡评价分析（关键词 + 摘要 + 情感倾向）
     * ================================================================ */
    public Map<String, Object> analyzeText(String text, String cityHint) {
        String q = text == null ? "" : text.trim();
        Map<String, Object> out = new LinkedHashMap<>();
        if (q.length() < 10) {
            out.put("ok", false);
            out.put("message", "文本太短（至少 10 个字），无法分析");
            return out;
        }
        String system = """
                你是旅游内容分析引擎。对用户给出的攻略/评价文本做分析，只输出严格 JSON：
                {"summary":"80 字以内的内容摘要",
                 "keywords":["关键词1","关键词2","关键词3","关键词4","关键词5"],
                 "sentiment":"正面 / 中性 / 负面",
                 "highlights":["亮点1","亮点2"],
                 "issues":["不足或提醒1"],
                 "tags":["标签1","标签2","标签3"]}
                keywords 取文本真实出现过的名词性短语，不要编造；tags 是可用于内容分类的短标签。
                不要解释、不要 markdown。""";
        JsonNode j = ai.chatJson(system, "文本：\n" + q.substring(0, Math.min(q.length(), 3000)));

        boolean isAi = j != null;
        if (isAi) {
            out.put("summary", clean(j.path("summary").asText("")));
            out.put("keywords", jsonList(j.path("keywords")));
            out.put("sentiment", clean(j.path("sentiment").asText("中性")));
            out.put("highlights", jsonList(j.path("highlights")));
            out.put("issues", jsonList(j.path("issues")));
            out.put("tags", jsonList(j.path("tags")));
        } else {
            /* 降级：词频统计 + 词典情感判定（纯确定性算法） */
            out.put("keywords", ruleKeywords(q));
            out.put("summary", q.length() <= 80 ? q : q.substring(0, 78) + "…");
            String senti = "中性";
            int pos = countAny(q, new String[]{"好", "美", "赞", "推荐", "惊喜", "值得", "惊艳", "舒服", "nice", "棒"});
            int neg = countAny(q, new String[]{"差", "坑", "贵", "脏", "慢", "失望", "排队", "不值", "不推荐"});
            if (pos > neg + 1) senti = "正面";
            else if (neg > pos + 1) senti = "负面";
            out.put("sentiment", senti);
            out.put("highlights", List.of());
            out.put("issues", List.of());
            out.put("tags", out.get("keywords") instanceof List<?> l
                    ? ((List<String>) out.get("keywords")).stream().limit(3).collect(Collectors.toList()) : List.of());
        }
        out.put("ok", true);
        out.put("engine", isAi ? "ai" : "rule");
        out.put("engineLabel", isAi ? "DeepSeek 大模型分析" : "本地词频与词典分析（未配置 AI Key 或调用失败）");
        out.put("city", cityHint == null ? "" : cityHint);
        out.put("length", q.length());
        return out;
    }

    private int countAny(String q, String[] kws) {
        int n = 0;
        for (String k : kws) if (q.contains(k)) n++;
        return n;
    }

    /**
     * 关键词提取：按 2-4 字中文切片统计词频，过滤停用词与虚词，
     * 再按「词频 × 长度权重」排序取前 8 个。
     */
    private List<String> ruleKeywords(String q) {
        Set<String> stop = Set.of("我们", "这个", "那个", "可以", "就是", "还是", "然后", "以及", "因为",
                "所以", "但是", "非常", "真的", "有点", "一下", "这里", "那里", "什么", "怎么",
                "今天", "昨天", "感觉", "觉得", "已经", "还有", "而且", "时候", "地方", "一个");
        Map<String, Integer> freq = new HashMap<>();
        for (int n = 2; n <= 4; n++) {
            for (int i = 0; i + n <= q.length(); i++) {
                String w = q.substring(i, i + n);
                if (!w.matches("[\\u4e00-\\u9fa5]+")) continue;
                if (stop.contains(w)) continue;
                freq.merge(w, 1, Integer::sum);
            }
        }
        return freq.entrySet().stream()
                .filter(e -> e.getValue() >= 2)
                /* 长词优先：同样频次时 4 字词比 2 字词信息量更大 */
                .sorted((a, b) -> {
                    int wa = a.getValue() * a.getKey().length(), wb = b.getValue() * b.getKey().length();
                    return wb != wa ? wb - wa : a.getKey().compareTo(b.getKey());
                })
                .map(Map.Entry::getKey)
                .limit(8).collect(Collectors.toList());
    }

    /* ================================================================
     * 功能 6：AI 辅助分享（打卡文案 / 攻略摘要 / 内容标签）
     * ================================================================ */
    public Map<String, Object> shareAssist(String spot, String city, String mood,
                                           String story, String tone) {
        String sp = spot == null ? "" : spot.trim();
        Map<String, Object> out = new LinkedHashMap<>();
        if (sp.isEmpty() && (story == null || story.isBlank())) {
            out.put("ok", false);
            out.put("message", "请至少提供景点名或打卡故事");
            return out;
        }
        String t = "自然".equals(tone) ? "自然真实" : "文艺".equals(tone) ? "文艺抒情"
                : "幽默".equals(tone) ? "轻松幽默" : "简洁干练";
        String system = """
                你是社交媒体内容运营，帮用户写旅游打卡文案。只输出严格 JSON：
                {"copy":"打卡文案（60-120 字，可直接发朋友圈/小红书，可带 2-3 个 emoji）",
                 "title":"标题（15 字以内，吸引点击）",
                 "tags":["#话题标签1","#话题标签2","#话题标签3","#话题标签4"],
                 "summary":"一句话攻略摘要（30 字以内）"}
                文案要具体、有画面感，禁止空话套话，不要编造用户没提到的经历。
                不要解释、不要 markdown。""";
        String user = "景点：" + sp + "\n城市：" + (city == null ? "" : city)
                + "\n心情：" + (mood == null ? "" : mood)
                + "\n用户自述：" + (story == null || story.isBlank() ? "（无）" : story)
                + "\n语气风格：" + t;
        JsonNode j = ai.chatJson(system, user);

        boolean isAi = j != null;
        if (isAi) {
            out.put("copy", clean(j.path("copy").asText("")));
            out.put("title", clean(j.path("title").asText("")));
            List<String> tags = jsonList(j.path("tags"));
            out.put("tags", tags.stream().map(x -> x.startsWith("#") ? x : "#" + x)
                    .distinct().limit(6).collect(Collectors.toList()));
            out.put("summary", clean(j.path("summary").asText("")));
        } else {
            /* 降级：模板拼装，明确标注为规则生成 */
            String m = mood == null || mood.isBlank() ? "在路上" : mood;
            String cityS = city == null || city.isBlank() ? "" : city;
            out.put("title", (cityS + (sp.isEmpty() ? "" : " · " + sp)));
            out.put("copy", "今天打卡" + (cityS.isEmpty() ? "" : cityS + "的") + (sp.isEmpty() ? "旅程" : sp)
                    + "，心情" + m + "。" + (story == null || story.isBlank() ? "" : story)
                    + " 记录一下这个瞬间 ☀️");
            List<String> tags = new ArrayList<>();
            if (!cityS.isEmpty()) tags.add("#" + cityS);
            if (!sp.isEmpty()) tags.add("#" + sp.replaceAll("[·\\s]", ""));
            tags.add("#旅行打卡");
            tags.add("#" + m);
            out.put("tags", tags.stream().distinct().limit(6).collect(Collectors.toList()));
            out.put("summary", "在" + (cityS.isEmpty() ? "旅途中" : cityS) + (sp.isEmpty() ? "记录一次打卡" : "打卡" + sp) + "。");
        }
        out.put("ok", true);
        out.put("engine", isAi ? "ai" : "rule");
        out.put("engineLabel", isAi ? "DeepSeek 大模型生成" : "本地模板生成（未配置 AI Key 或调用失败）");
        return out;
    }

    /* ================================================================
     * 功能 4：AI 增强推荐
     *  UserCF + ItemCF 融合结果（RecommendService）与兴趣画像做加权融合：
     *    final = 0.7 × 协同过滤分 + 0.3 × 兴趣匹配分
     *  原因：协同过滤依赖评分矩阵，256 条评分对 1405 个景点极度稀疏，
     *        单独用它时冷门但契合兴趣的景点永远排不上来。
     * ================================================================ */
    public Map<String, Object> enhancedRecommend(String nick, String interestsCsv, int topN) {
        List<String> ints = interestsCsv == null || interestsCsv.isBlank() ? List.of()
                : Arrays.stream(interestsCsv.split("[,，、\\s]+"))
                .map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toList());

        Map<String, Object> cf = recommendService.recommend(nick == null ? "" : nick,
                Math.max(topN * 3, 30));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> base = (List<Map<String, Object>>) cf.getOrDefault("list", List.of());

        /* 只看推荐候选涉及的景点，避免全表扫描 */
        Set<String> ids = base.stream().map(m -> String.valueOf(m.get("id")))
                .collect(Collectors.toSet());
        Map<String, Spot> spotById = new HashMap<>();
        if (!ids.isEmpty()) {
            for (Spot s : spotMapper.selectBatchIds(ids)) spotById.put(s.getSpotId(), s);
        }

        List<Map<String, Object>> scored = new ArrayList<>();
        for (Map<String, Object> m : base) {
            Spot s = spotById.get(String.valueOf(m.get("id")));
            if (s == null) continue;
            double cfScore = ((Number) m.getOrDefault("score", 0.0)).doubleValue();
            double interestScore = interestMatch(s, ints);
            double finalScore = 0.7 * cfScore + 0.3 * interestScore * 5;
            Map<String, Object> it = new LinkedHashMap<>();
            it.put("id", s.getSpotId());
            it.put("name", s.getName());
            it.put("city", s.getCity());
            it.put("cover", s.getCover());
            it.put("rating", s.getRating());
            it.put("heat", s.getHeat());
            it.put("score", Math.round(finalScore * 100) / 100.0);
            it.put("cfScore", Math.round(cfScore * 100) / 100.0);
            it.put("interestScore", Math.round(interestScore * 100) / 100.0);
            it.put("match", (int) Math.min(99, Math.round(finalScore * 15 + 30)));
            StringBuilder why = new StringBuilder();
            if (m.get("why") != null) why.append(m.get("why"));
            List<String> hit = interestHits(s, ints);
            if (!hit.isEmpty()) why.append(why.length() > 0 ? "；" : "").append("契合你的「").append(String.join("/", hit)).append("」偏好");
            it.put("why", why.length() == 0 ? "综合评分推荐" : why.toString());
            scored.add(it);
        }
        scored.sort((a, b) -> Double.compare(
                ((Number) b.get("score")).doubleValue(), ((Number) a.get("score")).doubleValue()));
        if (scored.size() > topN) scored = new ArrayList<>(scored.subList(0, topN));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("ok", true);
        out.put("mode", cf.get("mode"));
        out.put("formula", "final = 0.7 × 协同过滤分(UserCF+ItemCF) + 0.3 × 兴趣匹配分");
        out.put("interests", ints);
        out.put("list", scored);
        out.put("engine", "rule");
        out.put("engineLabel", "协同过滤 + 兴趣画像融合（确定性算法，不依赖大模型）");
        return out;
    }

    /** 兴趣匹配度：景点 tags/poiType/intro 命中兴趣词典词的加权比例，0-1 */
    private double interestMatch(Spot s, List<String> ints) {
        if (ints.isEmpty()) return 0;
        List<String> hit = interestHits(s, ints);
        return Math.min(1.0, hit.size() / (double) Math.min(2, ints.size()));
    }

    private List<String> interestHits(Spot s, List<String> ints) {
        String corpus = ((s.getTags() == null ? "" : s.getTags()) + " "
                + (s.getPoiType() == null ? "" : s.getPoiType()) + " "
                + (s.getIntro() == null ? "" : s.getIntro()) + " "
                + (s.getName() == null ? "" : s.getName()));
        List<String> hit = new ArrayList<>();
        for (String in : ints) {
            String[] kws = INTEREST_LEX.get(in);
            if (kws == null) continue;
            for (String k : kws) if (corpus.contains(k)) { hit.add(in); break; }
        }
        return hit;
    }

    /* ================================================================
     * 状态：前端据此显示「AI 可用 / 降级运行」，不暴露 Key 本身
     * ================================================================ */
    public Map<String, Object> status() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("ok", true);
        out.put("configured", ai.configured());
        out.put("model", ai.model());
        out.put("mode", ai.configured() ? "ai" : "rule");
        out.put("message", ai.configured()
                ? "DeepSeek 大模型已接入，AI 功能为真实生成"
                : "未配置 DEEPSEEK_API_KEY，AI 功能降级为站内规则，结果会在 engine 字段标注 rule");
        out.put("features", List.of(
                Map.of("key", "need", "name", "AI 旅游需求识别", "endpoint", "POST /api/ai/need"),
                Map.of("key", "plan", "name", "AI 模块化攻略生成 + 路线规划", "endpoint", "POST /api/ai/plan"),
                Map.of("key", "analyze", "name", "旅游攻略内容分析", "endpoint", "POST /api/ai/analyze"),
                Map.of("key", "share", "name", "AI 辅助分享", "endpoint", "POST /api/ai/share"),
                Map.of("key", "recommend", "name", "协同过滤 + 兴趣增强推荐", "endpoint", "GET /api/ai/recommend")
        ));
        return out;
    }
}
