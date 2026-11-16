package com.wandergo.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT 工具：登录成功后签发 token，后续请求解析出用户名。
 * 密钥与有效期读 application.properties 的 wandergo.jwt.* 。
 */
@Component
public class JwtUtil {
    @Value("${wandergo.jwt.secret}")
    private String secret;

    @Value("${wandergo.jwt.expire-hours:72}")
    private long expireHours;

    /** 签发 token：subject 存用户名 */
    public String issue(String username) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + expireHours * 3600_000L);
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(now)
                .setExpiration(exp)
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }

    /** 校验并解析 token，失败（过期/签名不符/格式错误）返回 null */
    public String parse(String token) {
        if (token == null || token.isBlank()) return null;
        try {
            Claims c = Jwts.parserBuilder().setSigningKey(key()).build()
                    .parseClaimsJws(token).getBody();
            return c.getSubject();
        } catch (Exception e) {
            return null;
        }
    }

    private SecretKey key() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
}
