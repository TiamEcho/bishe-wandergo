package com.wandergo.controller;

import com.wandergo.ai.AiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * AI 能力接口（Spring Boot 侧实现，调用 DeepSeek 大模型）。
 *
 * 接口清单与本项目 6 项 AI 功能对应：
 *   GET  /api/ai/status      AI 运行状态（是否已配置 Key，不返回密钥本身）
 *   POST /api/ai/need        功能 1：旅游需求识别
 *   POST /api/ai/plan        功能 2+3：模块化攻略生成（5 张卡片）+ 智能路线规划
 *   POST /api/ai/analyze     功能 5：攻略 / 打卡评价分析
 *   POST /api/ai/share       功能 6：AI 辅助分享（打卡文案 / 摘要 / 标签）
 *   GET  /api/ai/recommend   功能 4：协同过滤 + 兴趣增强推荐
 *
 * 所有响应都带 engine 字段：ai = 大模型真实生成，rule = 未配 Key/调用失败时的规则降级。
 * 密钥只在后端 application.properties / 环境变量 DEEPSEEK_API_KEY 中，前端永远拿不到。
 */
@RestController
@RequestMapping("/api/ai")
public class AiController {
    @Autowired private AiService aiService;

    @GetMapping("/status")
    public Map<String, Object> status() {
        return aiService.status();
    }

    /** 功能 1：需求识别。body: { text: "下个月想去成都玩3天，2个人，预算3000，喜欢美食和摄影" } */
    @PostMapping("/need")
    public Map<String, Object> need(@RequestBody Map<String, Object> body) {
        return aiService.parseNeed(str(body.get("text")));
    }

    /**
     * 功能 2+3：模块化攻略生成。body:
     *   { destination:"成都", days:3, people:2, budget:3000,
     *     interests:["美食探店","摄影出片"], pace:"适中" }
     * 也可以只传 text，内部先跑一次需求识别再生成。
     */
    @SuppressWarnings("unchecked")
    @PostMapping("/plan")
    public Map<String, Object> plan(@RequestBody Map<String, Object> body) {
        String dest = str(body.get("destination"));
        Integer days = num(body.get("days"));
        Integer people = num(body.get("people"));
        Integer budget = num(body.get("budget"));
        String pace = str(body.get("pace"));
        List<String> ints = new ArrayList<>();
        Object raw = body.get("interests");
        if (raw instanceof List<?> l) {
            for (Object o : l) if (o != null) ints.add(String.valueOf(o));
        } else if (raw instanceof String s) {
            for (String x : s.split("[,，、\\s]+")) if (!x.isBlank()) ints.add(x.trim());
        }

        /* 只给了一段话：先识别需求，再生成攻略 */
        if (dest == null) {
            String text = str(body.get("text"));
            if (text != null) {
                Map<String, Object> need = aiService.parseNeed(text);
                dest = str(need.get("destination"));
                if (days == null) days = num(need.get("days"));
                if (people == null) people = num(need.get("people"));
                if (budget == null) budget = num(need.get("budget"));
                if (pace == null) pace = str(need.get("pace"));
                if (ints.isEmpty() && need.get("interests") instanceof List<?> l2) {
                    for (Object o : l2) if (o != null) ints.add(String.valueOf(o));
                }
            }
        }
        return aiService.generatePlan(dest, days, people, budget, ints, pace);
    }

    /** 功能 5：内容分析。body: { text:"...", city:"大理" } */
    @PostMapping("/analyze")
    public Map<String, Object> analyze(@RequestBody Map<String, Object> body) {
        return aiService.analyzeText(str(body.get("text")), str(body.get("city")));
    }

    /** 功能 6：辅助分享。body: { spot, city, mood, story, tone } */
    @PostMapping("/share")
    public Map<String, Object> share(@RequestBody Map<String, Object> body) {
        return aiService.shareAssist(str(body.get("spot")), str(body.get("city")),
                str(body.get("mood")), str(body.get("story")), str(body.get("tone")));
    }

    /** 功能 4：AI 增强推荐。param nick, interests（逗号分隔）, topN */
    @GetMapping("/recommend")
    public Map<String, Object> recommend(@RequestParam(required = false) String nick,
                                         @RequestParam(required = false) String interests,
                                         @RequestParam(defaultValue = "12") int topN) {
        return aiService.enhancedRecommend(nick, interests, Math.min(Math.max(topN, 1), 50));
    }

    private String str(Object o) {
        return o == null ? null : String.valueOf(o).trim();
    }

    private Integer num(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        String s = String.valueOf(o).replaceAll("[^0-9]", "");
        return s.isEmpty() ? null : Integer.valueOf(s);
    }
}
