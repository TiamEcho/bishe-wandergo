package com.wandergo.controller;

import com.wandergo.service.RecommendService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** 协同过滤推荐接口 */
@RestController
@RequestMapping("/api/recommend")
public class RecommendController {
    @Autowired private RecommendService recommendService;

    @GetMapping
    public Map<String, Object> recommend(@RequestParam(defaultValue = "游客") String nick,
                                         @RequestParam(defaultValue = "8") int n) {
        return recommendService.recommend(nick, Math.min(20, Math.max(1, n)));
    }
}
