package com.wandergo.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.wandergo.config.JwtUtil;
import com.wandergo.config.Md5Util;
import com.wandergo.entity.User;
import com.wandergo.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** 用户接口：注册 / 登录（JWT） */
@RestController
@RequestMapping("/api/user")
public class UserController {
    @Autowired private UserMapper userMapper;
    @Autowired private JwtUtil jwtUtil;

    @PostMapping("/register")
    public Map<String, Object> register(@RequestBody Map<String, String> body) {
        String username = body.getOrDefault("username", "").trim();
        String password = body.getOrDefault("password", "");
        Map<String, Object> resp = new HashMap<>();
        if (username.isEmpty() || password.length() < 6) {
            resp.put("ok", false); resp.put("msg", "昵称不能为空，密码至少 6 位");
            return resp;
        }
        if (userMapper.selectCount(new LambdaQueryWrapper<User>().eq(User::getUsername, username)) > 0) {
            resp.put("ok", false); resp.put("msg", "该昵称已被注册");
            return resp;
        }
        User u = new User();
        u.setUsername(username);
        u.setPassword(Md5Util.md5(password));   // 与 wandergo-db 种子账号一致：MD5 存储
        u.setAvatar(username.substring(0, 1));
        u.setRole("user");
        u.setStatus(1);
        u.setCreatedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        userMapper.insert(u);
        resp.put("ok", true);
        resp.put("nick", username);
        resp.put("role", u.getRole());
        resp.put("token", jwtUtil.issue(username));
        return resp;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> body) {
        String username = body.getOrDefault("username", "").trim();
        String password = body.getOrDefault("password", "");
        User u = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getUsername, username));
        Map<String, Object> resp = new HashMap<>();
        if (u == null || !(Md5Util.md5(password).equals(u.getPassword()) || password.equals(u.getPassword()))) {
            resp.put("ok", false); resp.put("msg", "昵称或密码错误");
            return resp;
        }
        if (u.getStatus() != null && u.getStatus() == 0) {
            resp.put("ok", false); resp.put("msg", "该账号已被管理端封禁");
            return resp;
        }
        /* 兼容历史明文账号：登录成功后自动升级为 MD5 */
        if (!Md5Util.md5(password).equals(u.getPassword())) {
            u.setPassword(Md5Util.md5(password));
            userMapper.updateById(u);
        }
        resp.put("ok", true);
        resp.put("nick", u.getUsername());
        resp.put("role", u.getRole() == null ? "user" : u.getRole());
        resp.put("token", jwtUtil.issue(u.getUsername()));
        return resp;
    }

    /** 用户列表（个人中心探测用，演示环境开放） */
    @GetMapping("/list")
    public Map<String, Object> list() {
        List<User> users = userMapper.selectList(null);
        users.forEach(u -> u.setPassword(null));
        Map<String, Object> resp = new HashMap<>();
        resp.put("ok", true); resp.put("total", users.size()); resp.put("list", users);
        return resp;
    }
}
