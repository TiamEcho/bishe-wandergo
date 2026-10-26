package com.wandergo.config;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

/** JWT 工具：登录成功后签发，请求头 Authorization: Bearer <token> 携带 */
@Component
public class JwtUtil {
    @Value("${wandergo.jwt.secret}")
    private String secret;
    @Value("${wandergo.jwt.expire-hours}")
    private long expireHours;

    private Key key() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String issue(String username) {
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expireHours * 3600_000L))
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }

    /** 校验并取出用户名；非法返回 null */
    public String verify(String token) {
        try {
            return Jwts.parserBuilder().setSigningKey(key()).build()
                    .parseClaimsJws(token).getBody().getSubject();
        } catch (Exception e) {
            return null;
        }
    }
}
