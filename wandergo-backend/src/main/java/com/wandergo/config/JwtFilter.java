package com.wandergo.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/** JWT 鉴权过滤器：白名单放行，其余需携带合法 token */
@Component
public class JwtFilter extends OncePerRequestFilter {
    @Autowired
    private JwtUtil jwtUtil;

    private static final List<String> WHITE = List.of(
            "/api/user/login", "/api/user/register", "/api/user/list",
            "/api/spot/list", "/api/rank", "/api/recommend", "/api/checkin/add",
            "/api/comment/list", "/api/like/count");

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse resp, FilterChain chain)
            throws ServletException, IOException {
        String uri = req.getRequestURI();
        if ("OPTIONS".equalsIgnoreCase(req.getMethod()) || WHITE.stream().anyMatch(uri::startsWith)) {
            chain.doFilter(req, resp);
            return;
        }
        String auth = req.getHeader("Authorization");
        String username = (auth != null && auth.startsWith("Bearer ")) ? jwtUtil.verify(auth.substring(7)) : null;
        if (username == null) {
            resp.setStatus(401);
            resp.setContentType("application/json;charset=UTF-8");
            resp.getWriter().write("{\"ok\":false,\"msg\":\"未登录或登录已过期\"}");
            return;
        }
        req.setAttribute("username", username);
        chain.doFilter(req, resp);
    }
}
