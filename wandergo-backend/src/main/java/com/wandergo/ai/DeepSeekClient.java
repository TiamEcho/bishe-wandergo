package com.wandergo.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * DeepSeek 大模型客户端（OpenAI 兼容 /chat/completions 协议）。
 *
 * 密钥只从后端配置（环境变量 DEEPSEEK_API_KEY）读取，绝不下发前端：
 * 前端拿到的永远是 /api/ai/status 里的 configured 布尔值。
 *
 * 所有方法在「未配置 Key / 网络异常 / 返回非 JSON」时返回 null，
 * 由调用方（AiService）降级为规则实现，保证接口始终可用。
 */
@Component
public class DeepSeekClient {
    private static final Logger log = LoggerFactory.getLogger(DeepSeekClient.class);

    private final String base;
    private final String model;
    private final String apiKey;
    private final int timeoutMs;
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10)).build();

    public DeepSeekClient(@Value("${wandergo.ai.base:https://api.deepseek.com}") String base,
                          @Value("${wandergo.ai.model:deepseek-chat}") String model,
                          @Value("${wandergo.ai.api-key:}") String apiKey,
                          @Value("${wandergo.ai.timeout-ms:30000}") int timeoutMs) {
        this.base = base.replaceAll("/+$", "");
        this.model = model;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.timeoutMs = timeoutMs;
    }

    /** 是否已配置可用密钥 —— 前端只拿到这个布尔值 */
    public boolean configured() {
        return !apiKey.isEmpty();
    }

    public String model() {
        return model;
    }

    /**
     * 要求模型输出严格 JSON 对象。
     * @return 解析后的 JSON 树；任何失败返回 null
     */
    public JsonNode chatJson(String system, String user) {
        if (!configured()) return null;
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", model);
            body.put("temperature", 0.6);
            body.put("response_format", Map.of("type", "json_object"));
            List<Map<String, String>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content", system));
            messages.add(Map.of("role", "user", "content", user));
            body.put("messages", messages);

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(base + "/chat/completions"))
                    .timeout(Duration.ofMillis(timeoutMs))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(
                            mapper.writeValueAsString(body), StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> resp = http.send(req,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (resp.statusCode() != 200) {
                log.warn("[ai] HTTP {} {}", resp.statusCode(),
                        resp.statusCode() == 401 ? "（API Key 无效）" : "");
                return null;
            }
            JsonNode root = mapper.readTree(resp.body());
            JsonNode choices = root.path("choices");
            if (!choices.isArray() || choices.isEmpty()) return null;
            String content = choices.get(0).path("message").path("content").asText("");
            return parseLoose(content);
        } catch (Exception e) {
            log.warn("[ai] 调用失败: {}", e.toString());
            return null;
        }
    }

    /** 兼容模型偶尔用 ```json 包裹或前后带解释文字的情况 */
    private JsonNode parseLoose(String txt) {
        if (txt == null || txt.isBlank()) return null;
        String s = txt.trim();
        int a = s.indexOf('{');
        int b = s.lastIndexOf('}');
        if (a < 0 || b <= a) return null;
        try {
            return mapper.readTree(s.substring(a, b + 1));
        } catch (Exception e) {
            return null;
        }
    }
}
