package com.wandergo.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.wandergo.entity.RatingRecord;
import com.wandergo.entity.Spot;
import com.wandergo.mapper.RatingRecordMapper;
import com.wandergo.mapper.SpotMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 协同过滤推荐服务（与前端 recommend.js 同一套算法）
 *  1) UserCF：用户-景点评分矩阵按行做余弦相似度，取 Top-10 相似用户加权预测
 *  2) ItemCF：景点共现向量按列做余弦相似度，用已评高分的景点加权推算
 *  3) 融合：score = 0.5 * UserCF + 0.5 * ItemCF
 *  4) 冷启动：无评分行为时按「评分 × 热度」热门兜底
 */
@Service
public class RecommendService {
    @Autowired private RatingRecordMapper ratingMapper;
    @Autowired private SpotMapper spotMapper;

    public record RecItem(String id, String name, String city, double score, int match, String why) {}

    public Map<String, Object> recommend(String nick, int topN) {
        // 1. 构建评分矩阵：nick -> (spotId -> score)
        List<RatingRecord> all = ratingMapper.selectList(null);
        Map<String, Map<String, Double>> matrix = new HashMap<>();
        for (RatingRecord r : all) {
            matrix.computeIfAbsent(r.getNick(), k -> new HashMap<>()).put(r.getSpotId(), r.getScore().doubleValue());
        }
        Map<String, Double> mine = matrix.getOrDefault(nick, Collections.emptyMap());

        List<Spot> spots = spotMapper.selectList(null);
        Map<String, Spot> byId = spots.stream().collect(Collectors.toMap(Spot::getSpotId, s -> s));
        List<String> cands = spots.stream().map(Spot::getSpotId)
                .filter(id -> !mine.containsKey(id)).collect(Collectors.toList());

        Map<String, Map<String, Object>> result = new HashMap<>();

        if (mine.isEmpty()) {
            // 冷启动：热门兜底
            for (String id : cands) {
                Spot s = byId.get(id);
                if (s == null) continue;
                double heat = s.getHeat() == null ? 50 : s.getHeat();
                Map<String, Object> v = new HashMap<>();
                v.put("score", s.getRating() * 20 + heat / 10);
                v.put("why", "热门兜底 · 全站高分目的地（冷启动）");
                result.put(id, v);
            }
        } else {
            // 2a. UserCF
            record Sim(String u, double sim) {}
            List<Sim> sims = new ArrayList<>();
            for (var e : matrix.entrySet()) {
                if (e.getKey().equals(nick)) continue;
                double sim = cosine(mine, e.getValue());
                if (sim > 0.01) sims.add(new Sim(e.getKey(), sim));
            }
            sims.sort((a, b) -> Double.compare(b.sim(), a.sim()));
            List<Sim> top = sims.subList(0, Math.min(10, sims.size()));

            for (String id : cands) {
                double num = 0, den = 0; String bestBy = null; double bestVal = -1;
                for (Sim s : top) {
                    Double r = matrix.get(s.u()).get(id);
                    if (r != null) {
                        num += s.sim() * r; den += s.sim();
                        if (s.sim() * r > bestVal) { bestVal = s.sim() * r; bestBy = s.u(); }
                    }
                }
                if (den > 0) {
                    Map<String, Object> v = result.computeIfAbsent(id, k -> new HashMap<>());
                    v.put("ucf", num / den);
                    v.put("why", bestBy == null ? "相似用户推荐" : "与你口味相近的「" + bestBy + "」也爱这里");
                }
            }
            // 2b. ItemCF
            Map<String, Map<String, Double>> itemVec = new HashMap<>(); // spotId -> (nick -> score)
            for (var e : matrix.entrySet())
                for (var ie : e.getValue().entrySet())
                    itemVec.computeIfAbsent(ie.getKey(), k -> new HashMap<>()).put(e.getKey(), ie.getValue());

            for (String id : cands) {
                Map<String, Double> vi = itemVec.get(id);
                if (vi == null) continue;
                double num = 0, den = 0; String bestName = null; double bestSim = -1;
                for (var me : mine.entrySet()) {
                    Map<String, Double> vm = itemVec.get(me.getKey());
                    if (vm == null) continue;
                    double sim = cosine(vi, vm);
                    if (sim > 0.02) {
                        num += sim * me.getValue(); den += sim;
                        if (sim > bestSim) { bestSim = sim; bestName = me.getKey(); }
                    }
                }
                if (den > 0) {
                    Map<String, Object> v = result.computeIfAbsent(id, k -> new HashMap<>());
                    v.put("icf", num / den);
                    if (bestName != null && (!v.containsKey("why") || bestSim > 0.3))
                        v.put("why", "与你评过高分的「" + bestName + "」相似度 " + Math.round(bestSim * 100) + "%");
                }
            }
        }

        // 3. 融合 + 排序
        List<Map<String, Object>> list = new ArrayList<>();
        for (var e : result.entrySet()) {
            Spot s = byId.get(e.getKey());
            if (s == null) continue;
            double ucf = (Double) e.getValue().getOrDefault("ucf", 0.0);
            double icf = (Double) e.getValue().getOrDefault("icf", 0.0);
            double score = (ucf > 0 && icf > 0) ? ucf * .5 + icf * .5 : Math.max(ucf, icf);
            list.add(Map.of("id", e.getKey(), "score", score, "why", e.getValue().get("why")));
        }
        list.sort((a, b) -> Double.compare((Double) b.get("score"), (Double) a.get("score")));

        List<RecItem> out = list.subList(0, Math.min(topN, list.size())).stream()
                .map(m -> {
                    Spot s = byId.get(m.get("id"));
                    double score = (Double) m.get("score");
                    return new RecItem(m.get("id").toString(), s.getName(), s.getCity(),
                            Math.round(score * 100.0) / 100.0,
                            (int) Math.min(99, Math.round(score * 18 + 30)),
                            m.get("why").toString());
                }).collect(Collectors.toList());

        Map<String, Object> resp = new HashMap<>();
        resp.put("ok", true);
        resp.put("mode", mine.isEmpty() ? "热门兜底（冷启动）" : "UserCF + ItemCF 融合推荐（MySQL 评分数据）");
        resp.put("list", out);
        return resp;
    }

    /** 相似度最小共同阈值：共同评分项少于 2 个视为不可靠相似，直接判 0 */
    private static final int MIN_COMMON = 2;

    private double cosine(Map<String, Double> a, Map<String, Double> b) {
        double dot = 0, na = 0, nb = 0;
        int common = 0;
        for (var e : a.entrySet()) {
            na += e.getValue() * e.getValue();
            Double o = b.get(e.getKey());
            if (o != null) { dot += e.getValue() * o; common++; }
        }
        for (double v : b.values()) nb += v * v;
        if (na == 0 || nb == 0 || common < MIN_COMMON) return 0;
        return dot / Math.sqrt(na * nb);
    }
}
