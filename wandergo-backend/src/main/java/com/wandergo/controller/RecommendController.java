package com.wandergo.controller;

import com.wandergo.service.RecommendService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** 个性化推荐接口（UserCF + ItemCF 融合，MySQL 评分数据） */
@RestController
@RequestMapping("/api/recommend")
public class RecommendController {
    @Autowired private RecommendService recommendService;

    /** 推荐列表：入参为昵称（与前端一致），冷启动用户自动走热门兜底 */
    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) String nick,
                                    @RequestParam(defaultValue = "10") int topN) {
        return recommendService.recommend(nick == null ? "" : nick, topN);
    }
}
