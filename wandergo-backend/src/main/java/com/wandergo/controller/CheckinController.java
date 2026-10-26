package com.wandergo.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.wandergo.entity.CheckinRecord;
import com.wandergo.entity.RatingRecord;
import com.wandergo.mapper.CheckinRecordMapper;
import com.wandergo.mapper.RatingRecordMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** 打卡与评分接口 */
@RestController
public class CheckinController {
    @Autowired private CheckinRecordMapper checkinMapper;
    @Autowired private RatingRecordMapper ratingMapper;

    /** 打卡上报：前端「我的打卡」提交时调用 */
    @PostMapping("/api/checkin/add")
    public Map<String, Object> add(@RequestBody Map<String, Object> body) {
        CheckinRecord r = new CheckinRecord();
        r.setNick(String.valueOf(body.getOrDefault("nick", "匿名")));
        r.setSpotName(String.valueOf(body.getOrDefault("spot", "")));
        r.setCity(String.valueOf(body.getOrDefault("city", "")));
        r.setCheckinDate(String.valueOf(body.getOrDefault("date", "")));
        r.setText(String.valueOf(body.getOrDefault("text", "")));
        r.setMood(String.valueOf(body.getOrDefault("mood", "")));
        Object total = body.get("total");
        r.setTotalCost(total == null ? 0 : Double.parseDouble(total.toString()));
        r.setCreatedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        checkinMapper.insert(r);
        Map<String, Object> resp = new HashMap<>();
        resp.put("ok", true); resp.put("id", r.getId());
        return resp;
    }

    /** 评分上报：写入协同过滤评分矩阵 */
    @PostMapping("/api/rating/add")
    public Map<String, Object> rate(@RequestBody Map<String, Object> body) {
        String nick = String.valueOf(body.getOrDefault("nick", "游客"));
        String spotId = String.valueOf(body.getOrDefault("spotId", ""));
        int score = Integer.parseInt(body.getOrDefault("score", 5).toString());
        RatingRecord old = ratingMapper.selectOne(new LambdaQueryWrapper<RatingRecord>()
                .eq(RatingRecord::getNick, nick).eq(RatingRecord::getSpotId, spotId));
        if (old != null) {
            old.setScore(score);
            ratingMapper.updateById(old);
        } else {
            RatingRecord r = new RatingRecord();
            r.setNick(nick); r.setSpotId(spotId); r.setScore(score);
            r.setCreatedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
            ratingMapper.insert(r);
        }
        return Map.of("ok", true);
    }

    /** 排行榜：全国 / 同城打卡榜（按打卡次数聚合） */
    @GetMapping("/api/rank")
    public Map<String, Object> rank(@RequestParam(defaultValue = "nation") String scope,
                                    @RequestParam(defaultValue = "") String city) {
        List<CheckinRecord> all = checkinMapper.selectList(null);
        Map<String, Long> cnt = new HashMap<>();
        for (CheckinRecord r : all) {
            boolean match = "nation".equals(scope)
                    || ("city".equals(scope) && r.getCity() != null && r.getCity().contains(city));
            if (match) cnt.merge(r.getNick(), 1L, Long::sum);
        }
        List<Map<String, Object>> list = cnt.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(10)
                .map(e -> Map.<String, Object>of("u", e.getKey(), "n", e.getValue()))
                .toList();
        return Map.of("ok", true, "list", list);
    }
}
