package com.wandergo.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.wandergo.entity.CheckinRecord;
import com.wandergo.entity.Comment;
import com.wandergo.entity.Spot;
import com.wandergo.entity.User;
import com.wandergo.mapper.CheckinRecordMapper;
import com.wandergo.mapper.CommentMapper;
import com.wandergo.mapper.RatingRecordMapper;
import com.wandergo.mapper.SpotMapper;
import com.wandergo.mapper.UserMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** 管理端接口：景点维护 / 用户管理 / 内容审核（需 admin 角色，JWT 鉴权） */
@RestController
@RequestMapping("/api/admin")
public class AdminController {
    @Autowired private UserMapper userMapper;
    @Autowired private SpotMapper spotMapper;
    @Autowired private CommentMapper commentMapper;
    @Autowired private CheckinRecordMapper checkinMapper;
    @Autowired private RatingRecordMapper ratingMapper;

    /** 校验当前请求者是否为管理员 */
    private boolean isAdmin(HttpServletRequest req) {
        Object name = req.getAttribute("username");
        if (name == null) return false;
        User u = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getUsername, name.toString()));
        return u != null && "admin".equalsIgnoreCase(u.getRole());
    }

    private Map<String, Object> deny() {
        Map<String, Object> m = new HashMap<>();
        m.put("ok", false);
        m.put("msg", "需要管理员权限，请用 admin 账号登录");
        return m;
    }

    @GetMapping("/overview")
    public Map<String, Object> overview(HttpServletRequest req) {
        if (!isAdmin(req)) return deny();
        Map<String, Object> resp = new HashMap<>();
        resp.put("ok", true);
        resp.put("spots", spotMapper.selectCount(null));
        resp.put("users", userMapper.selectCount(null));
        resp.put("checkins", checkinMapper.selectCount(null));
        resp.put("ratings", ratingMapper.selectCount(null));
        resp.put("pending", commentMapper.selectCount(new LambdaQueryWrapper<Comment>().eq(Comment::getStatus, 0)));
        return resp;
    }

    /* ---------------- 景点维护 ---------------- */
    @GetMapping("/spot/list")
    public Map<String, Object> spotList(@RequestParam(defaultValue = "") String kw, HttpServletRequest req) {
        if (!isAdmin(req)) return deny();
        LambdaQueryWrapper<Spot> qw = new LambdaQueryWrapper<Spot>().orderByDesc(Spot::getId);
        if (!kw.isBlank()) qw.like(Spot::getName, kw).or().like(Spot::getCity, kw);
        List<Spot> list = spotMapper.selectList(qw);
        Map<String, Object> resp = new HashMap<>();
        resp.put("ok", true); resp.put("list", list); resp.put("total", list.size());
        return resp;
    }

    @PostMapping("/spot/save")
    public Map<String, Object> spotSave(@RequestBody Spot body, HttpServletRequest req) {
        if (!isAdmin(req)) return deny();
        if (body.getId() == null) spotMapper.insert(body);
        else spotMapper.updateById(body);
        return Map.of("ok", true, "id", body.getId());
    }

    @PostMapping("/spot/delete")
    public Map<String, Object> spotDelete(@RequestBody Map<String, Object> body, HttpServletRequest req) {
        if (!isAdmin(req)) return deny();
        spotMapper.deleteById(Long.valueOf(String.valueOf(body.get("id"))));
        return Map.of("ok", true);
    }

    /* ---------------- 用户管理 ---------------- */
    @GetMapping("/user/list")
    public Map<String, Object> userList(HttpServletRequest req) {
        if (!isAdmin(req)) return deny();
        List<User> users = userMapper.selectList(new LambdaQueryWrapper<User>().orderByDesc(User::getId));
        users.forEach(u -> u.setPassword(null));
        Map<String, Object> resp = new HashMap<>();
        resp.put("ok", true); resp.put("list", users); resp.put("total", users.size());
        return resp;
    }

    @PostMapping("/user/status")
    public Map<String, Object> userStatus(@RequestBody Map<String, Object> body, HttpServletRequest req) {
        if (!isAdmin(req)) return deny();
        User u = new User();
        u.setId(Long.valueOf(String.valueOf(body.get("id"))));
        u.setStatus(Integer.parseInt(String.valueOf(body.getOrDefault("status", 1))));
        userMapper.updateById(u);
        return Map.of("ok", true);
    }

    /* ---------------- 内容审核 ---------------- */
    @GetMapping("/audit/list")
    public Map<String, Object> auditList(@RequestParam(defaultValue = "0") int status, HttpServletRequest req) {
        if (!isAdmin(req)) return deny();
        List<Comment> list = commentMapper.selectList(new LambdaQueryWrapper<Comment>()
                .eq(status < 0 ? null : Comment::getStatus, status < 0 ? null : status)
                .orderByDesc(Comment::getId));
        Map<String, Object> resp = new HashMap<>();
        resp.put("ok", true); resp.put("list", list); resp.put("total", list.size());
        return resp;
    }

    @PostMapping("/audit/handle")
    public Map<String, Object> auditHandle(@RequestBody Map<String, Object> body, HttpServletRequest req) {
        if (!isAdmin(req)) return deny();
        Comment c = new Comment();
        c.setId(Long.valueOf(String.valueOf(body.get("id"))));
        c.setStatus(Integer.parseInt(String.valueOf(body.getOrDefault("status", 1))));
        commentMapper.updateById(c);
        return Map.of("ok", true);
    }
}
